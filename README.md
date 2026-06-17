# Tescan

Local Tesla vehicle monitoring app for a 2018 Model 3 that reads directly from the car's CAN buses via an ESP32 WiFi bridge. No cloud API, no internet dependency — all data comes from the CAN bus.

## Architecture

```
[Model 3 CAN buses]
    └─ vehicle bus (read/write, 500kbps)  ─┐
    └─ chassis bus (READ ONLY, 500kbps)   ─┤
                                            ▼
                                   [ESP32 CAN Bridge]
                                      WiFi (WS :81)
                                            │
                                    [Python Backend]
                                      localhost:8000
                                            │
                                   [Android App (RN)]
```

## ⚠️ CHASSIS BUS WARNING

**DO NOT WRITE TO THE CHASSIS BUS.** It carries ABS, steering, airbag, and stability control signals. Writing to it can cause loss of vehicle control. Hardware and software redundancies enforce read-only access — do not modify them.

## Components

| Directory | Description |
|-----------|-------------|
| `backend/` | Python FastAPI server — CAN decode, SQLite storage, WebSocket broadcast |
| `android/` | React Native app — real-time dashboard, history charts, settings |
| `esp32/`   | ESP32 firmware — TWAI CAN reader, WebSocket server |

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py          # runs in mock mode by default
```

Endpoints:
- `GET  http://localhost:8000/api/v1/health`   — status + mode
- `GET  http://localhost:8000/api/v1/status`   — current vehicle snapshot
- `GET  http://localhost:8000/api/v1/history`  — historical data
- `WS   ws://localhost:8000/ws/live`           — real-time stream (200ms)

To connect to a real ESP32, set `mock.enabled: false` and update `esp32.host` in `config.yaml`.

### Android App

Native Kotlin + Jetpack Compose project. Open the `android/` folder in
Android Studio (Ladybug or newer) and let Gradle sync, then Run. Or from the
command line:

```bash
cd android
./gradlew assembleDebug          # build APK
./gradlew installDebug           # build + install on connected device
```

compileSdk 35 / minSdk 26. First sync downloads dependencies from Google's
Maven and Maven Central, so it needs internet.

Open the Settings screen in the app and set the backend IP to the machine
running `main.py`.

### ESP32 Firmware

```bash
cd esp32
pio run              # build only (no hardware required)
pio run --target upload   # flash to connected ESP32
```

Configure WiFi SSID/password in `platformio.ini` build flags before uploading.

## CAN Bus Access

The ESP32 connects to the OBD-II port which provides access to both buses:
- **Vehicle bus** (OBD pin 6/14): 500kbps, bidirectional
- **Chassis bus** (OBD pin 3/11 on Model 3): 500kbps, read-only

For the chassis bus, the TX pin of the CAN transceiver **must be physically disconnected** (hardware redundancy on top of firmware LISTEN_ONLY mode).

## DBC Files

CAN signal definitions in `backend/dbc/tesla_model3.dbc` are based on the [commaai/opendbc](https://github.com/commaai/opendbc) project (MIT license). Validate signal bit positions against that source before use with real hardware.
