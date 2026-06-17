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
     [Android App]
       BLE Central + local CAN decode → VehicleSnapshot
```

Data path: ESP32 TWAI reads CAN frames → sends raw JSON frames over BLE NUS → Android decodes locally → displays live dashboard.

**Chassis bus** (ABS, steering, airbag, stability control) is deferred to a future satellite ESP32 mounted under the seat. It will never share the vehicle bus ESP32, keeping safety isolation intact.

## ⚠ CHASSIS BUS

**DO NOT WRITE TO THE CHASSIS BUS.** A future satellite ESP32 will handle chassis bus reads in listen-only mode with the transceiver TX pin physically disconnected.

## Components

| Directory | Description |
|-----------|-------------|
| `backend/` | Python FastAPI server — legacy, not required for real-time data |
| `android/` | Native Kotlin + Jetpack Compose app — BLE central, local CAN decode, dashboard |
| `esp32/`   | ESP32 firmware — TWAI CAN reader, BLE NUS server |

## Quick Start

### Android App

Native Kotlin + Jetpack Compose project. Open the `android/` folder in Android Studio (Ladybug or newer) and let Gradle sync, then Run. Or from the command line:

```bash
cd android
./gradlew assembleDebug          # build APK
./gradlew installDebug           # build + install on connected device
```

compileSdk 35 / minSdk 26. Requires Android 12+ for BLUETOOTH_SCAN / BLUETOOTH_CONNECT runtime permissions (requested automatically on first launch).

Open the Settings screen in the app and verify the BLE device name matches what the ESP32 advertises (default: `TESCAN`).

### ESP32 Firmware

```bash
cd esp32
pio run              # build only
pio run --target upload   # flash to connected ESP32
```

The firmware advertises as `TESCAN` over BLE. No WiFi credentials needed.

## BLE Protocol (Nordic UART Service)

| Item | Value |
|------|-------|
| Service UUID | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| TX char (ESP32→phone, NOTIFY) | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` |
| RX char (phone→ESP32, WRITE) | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` |
| Frame format | Newline-delimited JSON: `{"id":599,"data":"0102030405060708","bus":"vehicle","ts":1.2}` |
| Write command | `{"action":"write","bus":"vehicle","id":291,"data":"0102..."}` |

## CAN Bus Access

The ESP32 connects to the OBD-II port (vehicle bus only):
- **Vehicle bus** (OBD pin 6/14): 500kbps, bidirectional, TWAI controller
- **Power** (OBD pin 16): +12V → 3A fuse → 1N5819 → LM2596 5V → ESP32 VIN

## DBC Files

CAN signal definitions in `backend/dbc/tesla_model3.dbc` are based on the [commaai/opendbc](https://github.com/commaai/opendbc) project (MIT license). The Android `CanDecoder.kt` implements the same signal extractions locally. Validate bit positions against that source before use with real hardware.
