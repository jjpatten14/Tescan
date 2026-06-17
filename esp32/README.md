# Tescan ESP32 CAN Bridge

Reads the Model 3's two CAN buses and streams frames to the backend over a
WebSocket. The vehicle bus is bidirectional; the chassis bus is strictly
read-only.

## ⚠ Chassis bus is READ ONLY

The chassis bus carries safety-critical traffic (ABS, steering, airbags,
stability control). **Never transmit on it.** Two independent protections
enforce this:

1. **Software** — the MCP2515 is held in listen-only mode (`setListenOnlyMode()`),
   so it never asserts ACK or transmits. The firmware also refuses any write
   command whose `bus` is `"chassis"`.
2. **Hardware** — the chassis CAN transceiver's **TX pin is left physically
   disconnected** from the ESP32. Even a firmware bug cannot put a signal on
   the bus, because there is no wire to do it.

Do not "fix" the disconnected TX pin. It is disconnected on purpose.

## Hardware

| Function            | Part                          | ESP32 pin        |
|---------------------|-------------------------------|------------------|
| Vehicle bus TX      | SN65HVD230 (or similar)       | GPIO 21          |
| Vehicle bus RX      | SN65HVD230                    | GPIO 22          |
| Chassis bus RX      | MCP2515 + TJA1050/SN65HVD230  | GPIO 5 (CS), SPI |
| Chassis bus TX      | **not connected** (safety)    | —                |

Both buses are 500 kbps. SPI for the MCP2515 uses the default ESP32 pins
(SCK 18, MISO 19, MOSI 23). Set the crystal in `config.h`
(`CHASSIS_MCP_CRYSTAL`) to match your module (8 MHz or 16 MHz).

The 2018 Model 3 exposes both buses on the OBD-II / diagnostic connector.
Use a proper Tesla CAN harness adapter; do not improvise on the connector.

## Configure & flash

1. Edit `src/config.h` — WiFi SSID/password, pins, MCP crystal.
2. Build & upload with [PlatformIO](https://platformio.org/):

   ```bash
   cd esp32
   pio run                  # compile
   pio run --target upload  # flash
   pio device monitor       # serial logs @ 115200
   ```

3. Note the IP printed on the serial monitor and enter it in the app's
   Settings screen (or `backend/config.yaml` under `esp32.host`).

## Protocol

WebSocket on port 81. Frames are JSON.

**ESP32 → backend** (one per CAN frame):

```json
{ "id": 599, "data": "0102030405060708", "bus": "vehicle", "ts": 12.345 }
```

**backend → ESP32** (write a frame; vehicle bus only):

```json
{ "action": "write", "bus": "vehicle", "id": 291, "data": "0100000000000000" }
```

Write commands targeting `"bus": "chassis"` are ignored.

## Files

| File                          | Responsibility                                |
|-------------------------------|-----------------------------------------------|
| `src/main.cpp`                | Wiring, WiFi, main loop                        |
| `src/config.h`                | Pins, WiFi, bus settings                        |
| `src/can_vehicle.{h,cpp}`     | TWAI vehicle bus — read + write                 |
| `src/can_chassis.{h,cpp}`     | MCP2515 chassis bus — read only                 |
| `src/ws_server.{h,cpp}`       | WebSocket server + JSON framing                 |
