# Tescan — Feature Tracker

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` built · `[✓]` built + verified

---

## Hardware / ESP32

- [x] Vehicle bus CAN reader (TWAI normal mode, 500kbps, GPIO 21/22)
- [x] BLE NUS server (NimBLE-Arduino, Nordic UART Service)
- [x] Broadcast vehicle bus frames as JSON `{id, data, bus, ts}` over BLE NOTIFY
- [x] Accept write commands from Android (vehicle bus only)
- [x] Refuse non-vehicle bus write commands in firmware (safety guard)
- [ ] Chassis bus CAN reader — deferred, satellite ESP32 under seat
- [ ] `pio run` compiles clean (needs PlatformIO + internet)
- [ ] Tested on bench with 2018 Model 3 OBD-II port

---

## Android App — BLE & CAN Decode

- [x] BleManager: scan by device name, GATT connect, NUS service discovery
- [x] Enable NOTIFY on TX characteristic (CCCD descriptor write)
- [x] Buffer incoming BLE bytes, split on newline, parse JSON frames
- [x] CanDecoder: local CAN signal extraction (little-endian bit extraction)
- [x] Decode BMS_uiSoc (0x292) → SOC %
- [x] Decode UI_vehicleSpeed (0x257) → speed mph/kmh
- [x] Decode DIF_torqueActual (0x102) → torque Nm
- [x] Decode BMS_thermalStatus (0x2A4) → battery temp min/max
- [x] Decode BMS_chargeStatus (0x232) → idle/AC/DC
- [x] Decode DI_odometer (0x202) → odometer km
- [x] Derive power kW from torque + speed (Model 3 LR gear/wheel constants)
- [x] Estimate range from SOC × 499 km
- [x] Auto-reconnect BLE on disconnect (3s delay, re-scan)
- [x] Send write commands to ESP32 via BLE RX characteristic
- [x] BLE runtime permissions (Android 12+: BLUETOOTH_SCAN + BLUETOOTH_CONNECT)
- [ ] `./gradlew assembleDebug` builds clean
- [ ] Verified running on device against real ESP32

---

## Android App — Dashboard

- [x] Battery gauge (Compose Canvas arc, animated, color-coded by SOC)
- [x] MetricCard component (label / value / unit)
- [x] ChargingIndicator (animated lightning bolt, AC vs DC color)
- [x] Speed, power, torque row
- [x] Battery temp min/max, cabin temp row
- [x] Odometer, HVAC status row
- [x] Door status badges
- [x] Connection status indicator (live dot)
- [ ] Verified on real Android device / emulator

---

## Android App — Settings Screen

- [x] BLE device name input (replaces backend IP)
- [x] Save & Reconnect
- [x] Check Status button (shows BLE connection state)
- [x] BLE connection status indicator
- [x] Chassis bus deferred notice
- [ ] Notification preferences

---

## Android App — History Screen

- [x] Time range selector (1h / 6h / 24h / 7d)
- [x] SOC over time chart (Compose Canvas line chart)
- [x] Power over time chart
- [ ] History backed by local SQLite (currently returns empty list)
- [ ] Speed over time chart
- [ ] Trip list view

---

## Android App — Controls Screen

- [ ] Controls screen (not yet built)
- [ ] Wake button
- [ ] Lock / Unlock
- [ ] Climate toggle + temp slider
- [ ] Defrost buttons
- [ ] Flash / Honk
- [ ] Charge port open/close
- [ ] Confirmation dialog before sending commands

---

## Android App — Profiler Screen

- [ ] Profiler screen (not yet built)
- [ ] Signal list grouped by category
- [ ] Live value display

---

## Chassis Bus (Satellite ESP32) — Deferred

- [ ] Deferred — satellite ESP32 under seat
- [ ] MCP2515 SPI CAN controller, listen-only mode, TX pin disconnected
- [ ] Chassis bus CANH/CANL: OBD pin 3/11
- [ ] Bridge chassis frames to Android over BLE (second NUS connection or same device)
- [ ] Door status — all 6 positions (chassis bus signal)
- [ ] Sentry events from chassis bus

---

## DBC / Signal Validation

- [ ] Validate `BMS_uiSoc` bit position against opendbc
- [ ] Validate `UI_vehicleSpeed` bit position
- [ ] Validate `BMS_thermalStatus` (min/max temp) bit positions
- [ ] Validate `BMS_status` charge state enum values
- [ ] Validate `DIF_torqueActual` bit position and sign
- [ ] Validate `DI_odometer` scale and offset
- [ ] End-to-end test: mock encode → CanDecoder → correct values
- [ ] End-to-end test: real ESP32 BLE frames → correct decoded values

---

## Backend — Core (Legacy / Future)

The Python backend is not required for real-time data (Android decodes locally).
Retained for potential future use: trip storage, remote access, notifications.

- [x] CAN decoder with Tesla Model 3 2018 DBC signals
- [x] Mock data source
- [x] SQLite storage
- [ ] Migrate to BLE-based ESP32 client if reconnected

---

## Infrastructure

- [x] Project directory structure
- [x] `.gitignore`
- [x] `README.md`
- [x] ESP32 PlatformIO project (main / config / can_vehicle / ble_server)
- [x] Android native Gradle project + wrapper (opens in Android Studio)
- [ ] `backend/requirements.txt` — pip install verified clean
- [ ] Android `./gradlew assembleDebug` — compiles without errors
- [ ] ESP32 `pio run` — compiles without errors
