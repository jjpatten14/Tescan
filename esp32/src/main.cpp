#include <Arduino.h>
#include <ArduinoJson.h>

#include "config.h"
#include "can_vehicle.h"
#include "ble_server.h"

static uint8_t hexNibble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return 0;
}

static void onBleWrite(const uint8_t* bytes, size_t len) {
    JsonDocument doc;
    if (deserializeJson(doc, bytes, len)) return;
    if (strcmp(doc["action"] | "", "write") != 0) return;

    const char* bus = doc["bus"] | "";
    if (strcmp(bus, "vehicle") != 0) {
        Serial.printf("[SAFETY] refused non-vehicle write bus=%s\n", bus);
        return;
    }

    uint32_t id = doc["id"] | 0;
    const char* hex = doc["data"] | "";
    uint8_t data[8] = {};
    uint8_t dlc = 0;
    for (; hex[0] && hex[1] && dlc < 8; hex += 2)
        data[dlc++] = (hexNibble(hex[0]) << 4) | hexNibble(hex[1]);

    if (VehicleBus::transmit(id, data, dlc))
        Serial.printf("[VehicleBus] wrote id=0x%X dlc=%u\n", id, dlc);
    else
        Serial.printf("[VehicleBus] write FAILED id=0x%X\n", id);
}

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println("[Tescan] starting");

    if (!VehicleBus::begin()) {
        Serial.println("[Tescan] vehicle bus init failed — rebooting");
        delay(2000);
        ESP.restart();
    }

    BleServer::begin(BLE_DEVICE_NAME, onBleWrite);
    Serial.println("[Tescan] ready");
}

void loop() {
    uint32_t id;
    uint8_t data[8];
    uint8_t dlc;

    while (VehicleBus::receive(id, data, dlc))
        BleServer::sendFrame(id, data, dlc);
}
