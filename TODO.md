# Tescan — Feature Tracker

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` built · `[✓]` built + verified

---

## Hardware / ESP32

- [x] Vehicle bus CAN reader (TWAI normal mode, 500kbps, GPIO 21/22)
- [x] Chassis bus CAN reader (MCP2515 SPI, listen-only, TX pin disconnected)
- [x] WebSocket server on port 81
- [x] Broadcast vehicle bus frames as JSON `{id, data, bus, ts}`
- [x] Broadcast chassis bus frames as JSON `{id, data, bus, ts}`
- [x] Accept write commands from backend (vehicle bus only)
- [x] Refuse chassis bus write commands in firmware (software guard)
- [x] WiFi connection with reboot-on-fail recovery
- [ ] `pio run` compiles clean (needs PlatformIO + internet)
- [ ] Tested on bench with 2018 Model 3 OBD-II port

---

## Backend — Core

- [ ] CAN decoder with Tesla Model 3 2018 DBC signals
- [ ] Mock data source (simulate drive + charge cycle without hardware)
- [ ] ESP32 WebSocket client with auto-reconnect
- [ ] SQLite storage (snapshots + raw frames)
- [ ] Snapshot logger (1 snapshot/sec to DB)
- [ ] Data retention / purge (configurable, default 30 days)
- [ ] Config file (YAML) for ESP32 IP, mock mode, DB path

---

## Backend — Vehicle Monitoring

- [ ] Battery SOC (`BMS_uiSoc`)
- [ ] Vehicle speed (`UI_vehicleSpeed` / `DI_vehicleSpeed`)
- [ ] Instantaneous power (derived from torque + speed or discharge signal)
- [ ] Drive torque (`DIF_torqueActual`)
- [ ] Battery temp min/max (`BMS_thermalStatus`)
- [ ] Estimated range (SOC × rated range fallback)
- [ ] Charging state: idle / AC / DC (`BMS_chargeStatus`)
- [ ] Charge rate kW
- [ ] Odometer (`DI_odometer`)
- [ ] HVAC on/off (`VCFRONT_hvacOn`)
- [ ] Cabin temperature (`VCFRONT_cabinTemp`)
- [ ] Door status — all 6 positions (chassis bus)

---

## Backend — Battery Health

- [ ] Record capacity measurement after each charge > 5 kWh
- [ ] Track full charge cycle count
- [ ] Calculate degradation % vs. rated new capacity
- [ ] Store health history in SQLite for trend graph
- [ ] REST endpoint: `GET /api/v1/battery/health`

---

## Backend — Trip History

- [ ] Detect drive start / end (speed transitions)
- [ ] Log trip: start time, end time, distance, energy used, avg efficiency
- [ ] Map route: store GPS or reconstruct from odometer + heading if available
- [ ] REST endpoint: `GET /api/v1/trips`
- [ ] REST endpoint: `GET /api/v1/trips/{id}`

---

## Backend — Charging History

- [ ] Detect charge session start / end
- [ ] Log session: start SOC, end SOC, kWh added, duration, location tag
- [ ] Per-location electricity rate (set in config or via API)
- [ ] Calculate cost per session
- [ ] REST endpoint: `GET /api/v1/charges`

---

## Backend — Profiler (Real-Time CAN Dashboard)

- [ ] Stream all decoded signals to WebSocket subscribers in real time
- [ ] Organize signals into categories: Performance, Charging, Climate, Safety
- [ ] REST endpoint: `GET /api/v1/profiler/signals` (list available signals)
- [ ] WebSocket: `WS /ws/profiler` (high-frequency raw signal stream)
- [ ] Signal metadata: name, unit, min, max, last value, last update time

---

## Backend — Vehicle Controls (Vehicle Bus Writes)

- [ ] Wake car from sleep
- [ ] Lock / unlock doors
- [ ] Climate on/off
- [ ] Set climate temperature
- [ ] Defrost front / rear
- [ ] Flash lights
- [ ] Honk horn
- [ ] Open / close charge port
- [ ] Vent / close windows
- [ ] Enable / disable Sentry Mode
- [ ] Enable / disable Valet Mode
- [ ] POST endpoint: `POST /api/v1/command/{action}`

---

## Backend — Sentry Mode

- [ ] Detect Sentry events from chassis bus
- [ ] Log event: timestamp, type (motion / alarm)
- [ ] Push notification on Sentry trigger
- [ ] REST endpoint: `GET /api/v1/sentry/events`

---

## Backend — Notifications & Alerts

- [ ] Charge complete notification
- [ ] Charge level threshold alert (configurable %)
- [ ] Low battery warning
- [ ] Sentry event alert
- [ ] Drive started / ended
- [ ] Notification delivery mechanism (push to Android app)

---

## Backend — Automations

- [ ] Automation engine (cloud-side, runs without phone)
- [ ] Trigger: schedule (time + day of week)
- [ ] Trigger: charge started / stopped
- [ ] Trigger: SOC threshold crossed
- [ ] Trigger: Sentry event
- [ ] Action: climate on/off / set temp
- [ ] Action: lock / unlock
- [ ] Action: Sentry Mode on/off
- [ ] Action: flash lights / honk
- [ ] Action: send notification
- [ ] CRUD endpoints: `GET/POST/PUT/DELETE /api/v1/automations`

---

## Backend — History / Statistics

- [ ] `GET /api/v1/history` (time-series SOC, power, speed — downsampled)
- [ ] `GET /api/v1/stats/energy` (total kWh driven, charged, phantom drain)
- [ ] `GET /api/v1/stats/efficiency` (avg Wh/km over date range)

---

## Backend — API & WebSocket

- [x] `GET  /api/v1/health` — status, mode (mock/live), ESP32 connected
- [x] `GET  /api/v1/status` — current VehicleSnapshot
- [x] `GET  /api/v1/history` — historical snapshots (downsampled)
- [x] `POST /api/v1/write` — send CAN frame to vehicle bus
- [x] `POST /api/v1/settings` — update ESP32 host/port
- [x] `WS   /ws/live` — broadcast VehicleSnapshot every 200ms

---

## Android App

**Stack:** Native Kotlin + Jetpack Compose + Gradle (Android Studio project).
compileSdk 35, minSdk 26. Networking via OkHttp + kotlinx.serialization.
DataStore for settings. (Replaced the earlier React Native prototype.)

- [ ] `./gradlew assembleDebug` builds clean (needs internet for Maven — build in Android Studio)
- [ ] Verified running on device / emulator against mock backend

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

## Android App — History Screen

- [x] Time range selector (1h / 6h / 24h / 7d)
- [x] SOC over time chart (Compose Canvas line chart)
- [x] Power over time chart
- [ ] Speed over time chart
- [ ] Trip list view
- [ ] Charging session list

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
- [ ] Live value streaming via WebSocket
- [ ] Signal detail view (min/max/current/unit)

---

## Android App — Sentry Screen

- [ ] Sentry event list (not yet built)
- [ ] Event detail with map pin and timestamp

---

## Android App — Settings Screen

- [x] Backend IP/port input
- [x] Save & reconnect
- [x] Test connection button
- [x] WebSocket status display
- [x] Chassis bus safety warning
- [ ] Notification preferences
- [ ] Automation management (basic)
- [ ] Electricity rate per location

---

## DBC / Signal Validation

- [ ] Validate `BMS_uiSoc` bit position against opendbc
- [ ] Validate `UI_vehicleSpeed` bit position
- [ ] Validate `BMS_thermalStatus` (min/max temp) bit positions
- [ ] Validate `BMS_status` charge state enum values
- [ ] Validate `DIF_torqueActual` bit position and sign
- [ ] Validate `DI_odometer` scale and offset
- [ ] Validate chassis bus signal bit positions
- [ ] End-to-end test: mock encode → decode → correct values
- [ ] End-to-end test: real ESP32 frames → correct decoded values

---

## Infrastructure

- [x] Project directory structure
- [x] `.gitignore`
- [x] `README.md`
- [x] `backend/requirements.txt`
- [x] `backend/config.yaml`
- [x] ESP32 PlatformIO project (modular: main/config/can_vehicle/can_chassis/ws_server)
- [x] Android native Gradle project + wrapper (opens in Android Studio)
- [ ] `backend/requirements.txt` — pip install verified clean
- [ ] Android `./gradlew assembleDebug` — compiles without errors
- [ ] ESP32 `pio run` — compiles without errors
