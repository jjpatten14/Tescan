/**
 * Tescan ESP32 CAN Bridge
 * ------------------------
 * Bridges a 2018 Tesla Model 3's two CAN buses to the backend over WiFi.
 *
 *   Vehicle bus  : bidirectional (read + write) via built-in TWAI controller
 *   Chassis bus  : READ ONLY via MCP2515 (listen-only + TX pin disconnected)
 *
 * ⚠ SAFETY: Never write to the chassis bus. It carries ABS, steering, airbag
 *   and stability-control traffic. Writes here are refused in firmware AND made
 *   electrically impossible by leaving the transceiver TX pin unconnected.
 *
 * See esp32/README.md for wiring and the safety rationale.
 */
#include <Arduino.h>
#include <WiFi.h>

#include "config.h"
#include "can_vehicle.h"
#include "can_chassis.h"
#include "ws_server.h"

static bool chassisAvailable = false;

// ── WiFi ─────────────────────────────────────────────────────────────────────
static void connectWiFi() {
    Serial.printf("[WiFi] connecting to \"%s\"\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    uint8_t attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts++ < WIFI_MAX_ATTEMPTS) {
        delay(500);
        Serial.print('.');
    }
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\n[WiFi] failed — rebooting");
        delay(2000);
        ESP.restart();
    }
    Serial.printf("\n[WiFi] connected — IP %s\n", WiFi.localIP().toString().c_str());
}

// ── Inbound write command from the backend ───────────────────────────────────
static void onWriteCommand(const char* bus, uint32_t id,
                           const uint8_t* data, uint8_t dlc) {
    // SAFETY redundancy (firmware guard): chassis is read-only.
    if (strcmp(bus, "chassis") == 0) {
        Serial.printf("[SAFETY] refused chassis write id=0x%X\n", id);
        return;
    }
    if (strcmp(bus, "vehicle") != 0) return;

    if (VehicleBus::transmit(id, data, dlc))
        Serial.printf("[VehicleBus] wrote id=0x%X dlc=%u\n", id, dlc);
    else
        Serial.printf("[VehicleBus] write FAILED id=0x%X\n", id);
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println("\n[Tescan] ESP32 CAN bridge starting");

    connectWiFi();

    if (!VehicleBus::begin()) {
        Serial.println("[Tescan] vehicle bus init failed — rebooting");
        delay(2000);
        ESP.restart();
    }

    // Chassis bus is optional: if the MCP2515 isn't wired up yet, keep running
    // so the vehicle bus still works during bring-up.
    chassisAvailable = ChassisBus::begin();
    if (!chassisAvailable)
        Serial.println("[Tescan] chassis bus unavailable — continuing vehicle-only");

    WsServer::begin(onWriteCommand);
    Serial.println("[Tescan] ready");
}

// ── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
    WsServer::loop();

    const float ts = millis() / 1000.0f;
    uint32_t id;
    uint8_t data[8];
    uint8_t dlc;

    // Drain a bounded number of frames per pass so neither bus starves the
    // WebSocket service loop.
    for (uint8_t i = 0; i < 16 && VehicleBus::receive(id, data, dlc); i++)
        WsServer::broadcastFrame(id, data, dlc, "vehicle", ts);

    if (chassisAvailable)
        for (uint8_t i = 0; i < 16 && ChassisBus::receive(id, data, dlc); i++)
            WsServer::broadcastFrame(id, data, dlc, "chassis", ts);
}
