#!/usr/bin/env python3
"""
Tescan — SavvyCAN BLE Bridge

Connects to the TESCAN ESP32 over Bluetooth LE (Nordic UART Service), reads the
newline-delimited JSON CAN frames it broadcasts, and re-exposes them to SavvyCAN
(or any tool) as a standard SLCAN / LAWICEL serial device. No WiFi, no USB to
the car — the ESP32 stays purely BLE.

    [ESP32 BLE NUS]  --BLE-->  [this bridge]  --virtual serial-->  [SavvyCAN]

The ESP32 firmware is unchanged: it already emits
    {"id":599,"data":"0102...","bus":"vehicle","ts":1234.5}\\n
This bridge translates each frame to SLCAN  (t<id><dlc><data>\\r)  and translates
SavvyCAN transmit commands back into the JSON write the firmware already accepts.

------------------------------------------------------------------------------
USAGE
------------------------------------------------------------------------------
Linux / macOS — creates a pseudo-terminal and prints its path:
    python3 savvycan_bridge.py
    -> "SLCAN port ready: /dev/pts/7"
    In SavvyCAN: Connection > Add Device > Serial Connection (LAWICEL/SLCAN),
    pick /dev/pts/7, any baud.

Windows — install com0com (creates a linked virtual COM pair, e.g. COM5<->COM6).
Bind the bridge to one end, point SavvyCAN at the other:
    python3 savvycan_bridge.py --port COM5
    In SavvyCAN: Serial Connection (LAWICEL/SLCAN) > COM6.

Requirements:
    pip install bleak pyserial
------------------------------------------------------------------------------
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys

from bleak import BleakClient, BleakScanner

# Nordic UART Service — must match esp32/src/ble_server.cpp
NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
NUS_TX      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  # ESP32 -> host (NOTIFY)
NUS_RX      = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  # host  -> ESP32 (WRITE)

DEFAULT_NAME = "TESCAN"


class HostPort:
    """Abstracts the SavvyCAN-facing serial endpoint (pty on Unix, COM on Windows)."""

    def __init__(self, loop: asyncio.AbstractEventLoop, on_data):
        self.loop = loop
        self.on_data = on_data
        self._master_fd = None     # Unix pty master
        self._serial = None        # pyserial handle (Windows / explicit --port)
        self._stop = False

    # ── Unix pseudo-terminal ──────────────────────────────────────────────────
    def open_pty(self) -> str:
        import os, tty
        master_fd, slave_fd = os.openpty()
        tty.setraw(master_fd)
        tty.setraw(slave_fd)
        self._master_fd = master_fd
        self.loop.add_reader(master_fd, self._pty_readable)
        return os.ttyname(slave_fd)

    def _pty_readable(self):
        import os
        try:
            data = os.read(self._master_fd, 4096)
        except OSError:
            return
        if data:
            self.on_data(data)

    # ── Explicit serial port (Windows com0com, or a real port) ────────────────
    def open_serial(self, port: str, baud: int = 115200):
        import threading
        import serial  # pyserial
        self._serial = serial.Serial(port, baud, timeout=0.05)
        t = threading.Thread(target=self._serial_thread, daemon=True)
        t.start()

    def _serial_thread(self):
        while not self._stop:
            try:
                n = self._serial.in_waiting or 1
                data = self._serial.read(n)
            except Exception:
                break
            if data:
                self.loop.call_soon_threadsafe(self.on_data, data)

    # ── Write back to SavvyCAN ────────────────────────────────────────────────
    def write(self, data: bytes):
        if self._master_fd is not None:
            import os
            try:
                os.write(self._master_fd, data)
            except OSError:
                pass
        elif self._serial is not None:
            try:
                self._serial.write(data)
            except Exception:
                pass

    def close(self):
        self._stop = True
        if self._master_fd is not None:
            self.loop.remove_reader(self._master_fd)
        if self._serial is not None:
            self._serial.close()


class Bridge:
    def __init__(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop
        self.client: BleakClient | None = None
        self.host = HostPort(loop, self._on_host_data)
        self._ble_buf = bytearray()
        self._cmd_buf = bytearray()

    # ── BLE -> SavvyCAN ───────────────────────────────────────────────────────
    def _on_notify(self, _char, data: bytearray):
        """ESP32 NUS TX: newline-delimited JSON frames."""
        self._ble_buf += data
        while b"\n" in self._ble_buf:
            line, _, self._ble_buf = self._ble_buf.partition(b"\n")
            line = line.strip()
            if line:
                self._json_to_slcan(line)

    def _json_to_slcan(self, line: bytes):
        try:
            obj = json.loads(line)
            can_id = int(obj["id"])
            data = bytes.fromhex(obj["data"])
        except (ValueError, KeyError, TypeError):
            return
        dlc = len(data)
        hexd = data.hex().upper()
        if can_id <= 0x7FF:
            frame = f"t{can_id:03X}{dlc}{hexd}\r"
        else:
            frame = f"T{can_id:08X}{dlc}{hexd}\r"
        self.host.write(frame.encode())

    # ── SavvyCAN -> ESP32 ─────────────────────────────────────────────────────
    def _on_host_data(self, data: bytes):
        self._cmd_buf += data
        while b"\r" in self._cmd_buf:
            cmd, _, self._cmd_buf = self._cmd_buf.partition(b"\r")
            if cmd:
                self._handle_cmd(bytes(cmd))

    def _handle_cmd(self, cmd: bytes):
        """Answer the SLCAN handshake locally; forward transmits to the ESP32.

        The ESP32 runs fixed at 500 kbps and is always 'open', so open/close
        and bitrate commands are simply acknowledged.
        """
        c = chr(cmd[0])
        if c == "V":            # firmware version
            self.host.write(b"V1013\r")
        elif c == "v":
            self.host.write(b"v1013\r")
        elif c == "N":          # serial number
            self.host.write(b"N0001\r")
        elif c == "F":          # status flags (no errors)
            self.host.write(b"F00\r")
        elif c == "t":          # transmit, 11-bit
            self._tx(cmd, extended=False)
        elif c == "T":          # transmit, 29-bit
            self._tx(cmd, extended=True)
        else:                   # O/C/S/l/L/Z/W/m/M/... — ack
            self.host.write(b"\r")

    def _tx(self, cmd: bytes, extended: bool):
        try:
            s = cmd.decode("ascii", errors="ignore")
            if extended:
                can_id = int(s[1:9], 16)
                dlc = int(s[9], 16)
                data_hex = s[10:10 + dlc * 2]
            else:
                can_id = int(s[1:4], 16)
                dlc = int(s[4], 16)
                data_hex = s[5:5 + dlc * 2]
        except (ValueError, IndexError):
            self.host.write(b"\a")  # bell = error
            return
        self.loop.create_task(self._ble_write(can_id, data_hex))
        self.host.write(b"Z\r" if extended else b"z\r")

    async def _ble_write(self, can_id: int, data_hex: str):
        if not (self.client and self.client.is_connected):
            return
        payload = json.dumps({
            "action": "write",
            "bus": "vehicle",
            "id": can_id,
            "data": data_hex.lower(),
        }).encode()
        try:
            await self.client.write_gatt_char(NUS_RX, payload, response=False)
        except Exception as e:
            print(f"[ble] write failed: {e}", file=sys.stderr)

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    async def run(self, name: str, address: str | None, port: str | None):
        if port:
            self.host.open_serial(port)
            print(f"SLCAN port ready: {port}")
        else:
            path = self.host.open_pty()
            print(f"SLCAN port ready: {path}")
            print("  In SavvyCAN: Add Device > Serial (LAWICEL/SLCAN) > that path")

        if address is None:
            print(f"[ble] scanning for \"{name}\" ...")
            dev = await BleakScanner.find_device_by_name(name, timeout=15.0)
            if dev is None:
                print(f"[ble] device \"{name}\" not found", file=sys.stderr)
                return
            address = dev.address

        print(f"[ble] connecting to {address} ...")
        async with BleakClient(address) as client:
            self.client = client
            await client.start_notify(NUS_TX, self._on_notify)
            print("[ble] connected — streaming frames to SavvyCAN. Ctrl-C to stop.")
            try:
                while client.is_connected:
                    await asyncio.sleep(1.0)
            finally:
                self.host.close()
        print("[ble] disconnected")


def main():
    ap = argparse.ArgumentParser(description="Bridge TESCAN ESP32 BLE to SavvyCAN (SLCAN).")
    ap.add_argument("--name", default=DEFAULT_NAME, help="BLE device name (default: TESCAN)")
    ap.add_argument("--address", default=None, help="BLE MAC/UUID (skip scan)")
    ap.add_argument("--port", default=None,
                    help="Existing serial port to use instead of a pty (Windows com0com)")
    args = ap.parse_args()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    bridge = Bridge(loop)
    try:
        loop.run_until_complete(bridge.run(args.name, args.address, args.port))
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
