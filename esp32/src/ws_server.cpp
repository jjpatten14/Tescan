#include "ws_server.h"
#include "config.h"
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

namespace WsServer {

static WebSocketsServer server(WS_PORT);
static WriteHandler writeHandler = nullptr;
static uint8_t clientCount = 0;
static char txBuf[192];

static uint8_t hexToByte(const char* p) {
    auto nib = [](char c) -> uint8_t {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'a' && c <= 'f') return c - 'a' + 10;
        if (c >= 'A' && c <= 'F') return c - 'A' + 10;
        return 0;
    };
    return (nib(p[0]) << 4) | nib(p[1]);
}

static void onEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t len) {
    switch (type) {
        case WStype_CONNECTED:
            clientCount++;
            Serial.printf("[WS] client #%u connected (%u total)\n", num, clientCount);
            break;
        case WStype_DISCONNECTED:
            if (clientCount) clientCount--;
            Serial.printf("[WS] client #%u disconnected (%u total)\n", num, clientCount);
            break;
        case WStype_TEXT: {
            JsonDocument doc;
            if (deserializeJson(doc, payload, len)) return;
            if (strcmp(doc["action"] | "", "write") != 0) return;

            const char* bus = doc["bus"] | "";
            uint32_t id = doc["id"] | 0;
            const char* hex = doc["data"] | "";

            uint8_t data[8] = {};
            uint8_t dlc = 0;
            for (; hex[0] && hex[1] && dlc < 8; hex += 2)
                data[dlc++] = hexToByte(hex);

            if (writeHandler) writeHandler(bus, id, data, dlc);
            break;
        }
        default:
            break;
    }
}

void begin(WriteHandler handler) {
    writeHandler = handler;
    server.begin();
    server.onEvent(onEvent);
    Serial.printf("[WS] server listening on port %d\n", WS_PORT);
}

void loop() {
    server.loop();
}

void broadcastFrame(uint32_t id, const uint8_t* data, uint8_t dlc,
                    const char* bus, float ts) {
    if (!clientCount) return;

    char hex[17] = {};
    for (uint8_t i = 0; i < dlc && i < 8; i++) sprintf(&hex[i * 2], "%02x", data[i]);

    JsonDocument doc;
    doc["id"] = id;
    doc["data"] = hex;
    doc["bus"] = bus;
    doc["ts"] = ts;
    size_t n = serializeJson(doc, txBuf, sizeof(txBuf));
    server.broadcastTXT(txBuf, n);
}

bool hasClients() {
    return clientCount > 0;
}

}  // namespace WsServer
