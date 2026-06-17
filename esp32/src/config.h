#pragma once
//
// Tescan ESP32 CAN bridge — build-time configuration.
// Edit these to match your wiring and WiFi before flashing.
//

// ── WiFi ─────────────────────────────────────────────────────────────────────
#define WIFI_SSID "TescanBridge"
#define WIFI_PASS "tescan1234"
// Connection attempts before the board reboots and retries.
#define WIFI_MAX_ATTEMPTS 30

// ── WebSocket server ─────────────────────────────────────────────────────────
#define WS_PORT 81

// ── Vehicle bus (TWAI / built-in CAN controller) — BIDIRECTIONAL ─────────────
// Connected to an external 3.3V CAN transceiver (e.g. SN65HVD230).
#define VEH_TX_GPIO GPIO_NUM_21
#define VEH_RX_GPIO GPIO_NUM_22

// ── Chassis bus (MCP2515 over SPI) — READ ONLY ───────────────────────────────
// SAFETY: The chassis bus is strictly read-only. Two independent protections:
//   1. The MCP2515 is held in LISTEN-ONLY mode (never ACKs, never transmits).
//   2. The TX pin of the chassis CAN transceiver MUST be left physically
//      disconnected on the PCB — there is no wire from the ESP32 to TX.
// Do not bypass either protection. See esp32/README.md.
#define CHASSIS_CS_GPIO 5
// Crystal on YOUR MCP2515 module. Most blue breakout boards are 8MHz; some
// are 16MHz. Wrong value = garbage frames. Change here if needed.
#define CHASSIS_MCP_CRYSTAL MCP_8MHZ

// ── Both Tesla buses run at 500 kbps ─────────────────────────────────────────
// (TWAI uses its own macro; MCP2515 uses CAN_500KBPS, set in can_chassis.cpp.)
