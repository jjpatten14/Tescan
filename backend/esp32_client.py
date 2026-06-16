from __future__ import annotations
import asyncio
import json
import logging
from typing import Callable, Awaitable

import websockets
import websockets.exceptions

from models import RawCANFrame, WriteCANCommand

logger = logging.getLogger(__name__)

FrameCallback = Callable[[RawCANFrame], Awaitable[None]]


class ESP32Client:
    """
    Maintains a persistent WebSocket connection to the ESP32 CAN bridge.
    Receives raw CAN frames and forwards write commands to the vehicle bus.

    Protocol (JSON over WebSocket):
      Inbound:  {"id": 0x257, "data": "0102...", "bus": "vehicle", "ts": 1234.5}
      Outbound: {"action": "write", "bus": "vehicle", "id": 0x123, "data": "0102..."}
    """

    def __init__(
        self,
        host: str,
        port: int,
        frame_callback: FrameCallback,
        reconnect_interval: int = 5,
    ):
        self._uri = f"ws://{host}:{port}"
        self._callback = frame_callback
        self._reconnect_interval = reconnect_interval
        self._running = False
        self._connected = False
        self._ws = None
        self._frame_count = 0

    async def run(self):
        self._running = True
        while self._running:
            try:
                async with websockets.connect(
                    self._uri,
                    ping_interval=20,
                    ping_timeout=10,
                    open_timeout=10,
                ) as ws:
                    self._ws = ws
                    self._connected = True
                    logger.info(f"Connected to ESP32 at {self._uri}")
                    async for message in ws:
                        await self._handle_message(message)
            except (
                ConnectionRefusedError,
                OSError,
                asyncio.TimeoutError,
                websockets.exceptions.WebSocketException,
            ) as e:
                self._connected = False
                self._ws = None
                logger.warning(
                    f"ESP32 disconnected ({type(e).__name__}: {e}). "
                    f"Retry in {self._reconnect_interval}s"
                )
                await asyncio.sleep(self._reconnect_interval)

    async def _handle_message(self, message: str):
        try:
            data = json.loads(message)
            frame = RawCANFrame(**data)
            self._frame_count += 1
            await self._callback(frame)
        except Exception as e:
            logger.debug(f"Bad frame from ESP32: {e} — raw: {message[:80]}")

    async def send_write_command(self, cmd: WriteCANCommand):
        """Send a CAN write command to the ESP32 (vehicle bus only)."""
        if cmd.bus != "vehicle":
            raise ValueError("Write commands are only permitted on the vehicle bus")
        if not self._connected or self._ws is None:
            raise RuntimeError("Not connected to ESP32")
        payload = json.dumps({
            "action": "write",
            "bus": cmd.bus,
            "id": cmd.id,
            "data": cmd.data,
        })
        await self._ws.send(payload)
        logger.debug(f"Sent write: id=0x{cmd.id:X} data={cmd.data} bus={cmd.bus}")

    def stop(self):
        self._running = False

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def frame_count(self) -> int:
        return self._frame_count
