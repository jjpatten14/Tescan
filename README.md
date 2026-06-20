# Tescan

Local Tesla vehicle monitoring app for a 2018 Model 3. Reads directly from the car's vehicle CAN bus via an ESP32 BLE bridge. No cloud API, no internet dependency — all data comes from the CAN bus and is decoded on-device.

## Architecture

```
[Vehicle Bus OBD-II Pin 6/14]
    └─ vehicle bus (read/write, 500kbps)
            |
     [ESP32 TWAI controller]
       SN65HVD230 transceiver
            |
         BLE NUS
     (Nordic UART Service)
            |
     [React Native App]
       BLE Central + local CAN decode → VehicleSnapshot
```

Data path: ESP32 TWAI reads CAN frames → sends raw JSON frames over BLE NUS → React Native decodes locally → displays live dashboard.

---

## ⚠️ CRITICAL SAFETY WARNING: CHASSIS BUS

### DO NOT WRITE TO THE CHASSIS BUS. EVER.

The **chassis bus** controls safety-critical vehicle systems:
- **ABS** (Anti-lock Braking System)
- **Electronic Stability Control**
- **Steering Assist**
- **Airbag Deployment Systems**
- **Collision Avoidance**
- **Emergency Braking**

**Writing malformed or unexpected data to this bus can:**
- ⛔ **Disable your brakes** while driving
- ⛔ **Deploy airbags unexpectedly** causing injury or death
- ⛔ **Disable stability control** causing loss of vehicle control
- ⛔ **Lock steering** at highway speeds
- ⛔ **Brick safety-critical ECUs** requiring dealer service ($$$)
- ⛔ **Void your warranty** and potentially your insurance

### Chassis Bus Safety Architecture

A future satellite ESP32 will handle chassis bus **read-only monitoring** with hardware-enforced safety:

```
[Chassis Bus ESP32 — LISTEN ONLY]
    │
    ├── SN65HVD230 transceiver TX pin PHYSICALLY DISCONNECTED
    │   (cut the trace or leave unsoldered — no firmware can override)
    │
    ├── Separate power supply (not shared with vehicle bus ESP32)
    │
    └── Mounted under seat, away from OBD port
```

**Why physical disconnection?** Software bugs happen. Firmware can be corrupted. A misconfigured GPIO can go HIGH. The ONLY way to guarantee you cannot transmit on the chassis bus is to make transmission **physically impossible** at the hardware level.

This is not paranoia — it's basic functional safety engineering. Tesla's own engineering separates these buses for the same reason.

---

## Components

| Directory | Description |
|-----------|-------------|
| `rn/` | React Native app (iOS + Android) — BLE central, local CAN decode, dashboard |
| `esp32/` | ESP32 firmware — TWAI CAN reader, BLE NUS server |
| `backend/` | Python FastAPI server — legacy, not required for real-time data |
| `tools/` | SavvyCAN BLE bridge for signal reverse engineering |
| `docs/` | Documentation |

## Quick Start

### React Native App

Cross-platform React Native + TypeScript app. Requires Node.js 18+ and Android SDK.

```bash
cd rn
npm install

# Android
npx react-native run-android

# iOS (macOS only)
cd ios && pod install && cd ..
npx react-native run-ios
```

**Android Requirements:**
- Android 8.0+ (API 26+)
- Bluetooth Low Energy support
- Permissions: BLUETOOTH_SCAN, BLUETOOTH_CONNECT (Android 12+)

Open Settings in the app and verify the BLE device name matches the ESP32 (default: `TESCAN`).

### ESP32 Firmware

```bash
cd esp32
pio run                    # build only
pio run --target upload    # flash to connected ESP32
```

The firmware advertises as `TESCAN` over BLE. No WiFi credentials needed.

**Hardware:**
- ESP32 DevKit (any variant with TWAI/CAN peripheral)
- SN65HVD230 CAN transceiver
- OBD-II connector (pins 6, 14 for CAN, pin 16 for +12V)

## BLE Protocol (Nordic UART Service)

| Item | Value |
|------|-------|
| Service UUID | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| TX char (ESP32→phone, NOTIFY) | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` |
| RX char (phone→ESP32, WRITE) | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` |
| Frame format | Newline-delimited JSON: `{"id":599,"data":"0102030405060708","bus":"vehicle","ts":1.2}` |
| Write command | `{"action":"write","bus":"vehicle","id":291,"data":"0102..."}` |

## CAN Bus Access

The ESP32 connects to the OBD-II port (**vehicle bus only**):
- **Vehicle bus** (OBD pin 6/14): 500kbps, bidirectional, TWAI controller
- **Power** (OBD pin 16): +12V → 3A fuse → 1N5819 → LM2596 5V → ESP32 VIN

## Decoded Signals

| Frame ID | Signal | Description |
|----------|--------|-------------|
| `0x292` | SOC | State of charge (%) |
| `0x257` | Speed | Vehicle speed (mph/kmh) |
| `0x102` | Torque | Motor torque (Nm) |
| `0x2A4` | Battery Temp | Min/max pack temperature |
| `0x232` | Charging State | idle / ac / dc |
| `0x202` | Odometer | Total miles driven |
| `0x352` | Battery Health | Full pack kWh, energy remaining |

## SavvyCAN over Bluetooth

For discovering and validating CAN signal bit positions, connect [SavvyCAN](https://github.com/collin80/SavvyCAN) to the ESP32 **without WiFi or USB to the car**. `tools/savvycan_bridge.py` connects to the ESP32 over BLE and re-exposes the stream as a standard SLCAN/LAWICEL serial port.

```
[ESP32 BLE NUS]  --BLE-->  [savvycan_bridge.py]  --virtual serial-->  [SavvyCAN]
```

```bash
pip install -r tools/requirements.txt

# Linux / macOS — prints a pty path, point SavvyCAN at it
python3 tools/savvycan_bridge.py

# Windows — install com0com (virtual COM pair)
python3 tools/savvycan_bridge.py --port COM5
```

In SavvyCAN: **Connection → Add Device → Serial (LAWICEL/SLCAN)**, select the printed port.

## DBC Files

CAN signal definitions based on [commaai/opendbc](https://github.com/commaai/opendbc) (MIT license). The React Native `CanDecoder.ts` implements the same signal extractions locally. Validate bit positions against that source before use with real hardware.

## License

MIT — see LICENSE file.

**Disclaimer:** This software is provided as-is for educational purposes. Modifying vehicle systems can be dangerous and may void warranties. The authors are not responsible for any damage, injury, or legal issues resulting from use of this software. Use at your own risk.
