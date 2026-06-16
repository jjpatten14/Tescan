/**
 * Tescan ESP32 CAN Bridge
 *
 * Vehicle bus  : bidirectional, TWAI normal mode, GPIO 21 (TX) / 22 (RX)
 * Chassis bus  : READ ONLY — MCP2515 SPI in listen-only mode via software,
 *                and TX pin of the CAN transceiver PHYSICALLY DISCONNECTED.
 *
 * ⚠ SAFETY: Never write to the chassis bus. It carries ABS, steering, airbags,
 *   and stability control signals. Two independent redundancies enforce read-only:
 *   1. MCP2515 configured in listen-only mode (no ACK transmitted)
 *   2. TX wire from transceiver to ESP32 GPIO is left open / not soldered
 *
 * Protocol (WebSocket, port 81):
 *   Outbound: {"id":599,"data":"0102030405060708","bus":"vehicle","ts":12345.678}
 *   Inbound:  {"action":"write","bus":"vehicle","id":291,"data":"0100000000000000"}
 *             (chassis writes are silently dropped with a warning log)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <driver/twai.h>
#include <SPI.h>

// ── MCP2515 register definitions (chassis bus) ──────────────────────────────
// Using raw SPI to keep dependencies minimal; swap to mcp2515 library if preferred.
#define MCP_CS_PIN    5
#define MCP_RESET     0xC0
#define MCP_CANCTRL   0x0F
#define MCP_REQOP_LISTENONLY 0x60  // listen-only mode, no ACK

// ── Globals ──────────────────────────────────────────────────────────────────
WebSocketsServer webSocket(WEBSOCKET_PORT);
static uint8_t connectedClient = 0xFF;  // 0xFF = none
static char jsonBuf[192];

// ── WiFi ─────────────────────────────────────────────────────────────────────
void connectWiFi() {
    Serial.printf("[WiFi] Connecting to %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    uint8_t attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print('.');
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected — IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Failed — rebooting in 5s");
        delay(5000);
        ESP.restart();
    }
}

// ── Vehicle bus (TWAI — bidirectional) ───────────────────────────────────────
void initVehicleBus() {
    twai_general_config_t g = {
        .mode           = TWAI_MODE_NORMAL,
        .tx_io          = (gpio_num_t)CAN_VEHICLE_TX_PIN,
        .rx_io          = (gpio_num_t)CAN_VEHICLE_RX_PIN,
        .clkout_io      = TWAI_IO_UNUSED,
        .bus_off_io     = TWAI_IO_UNUSED,
        .tx_queue_len   = 10,
        .rx_queue_len   = 64,
        .alerts_enabled = TWAI_ALERT_NONE,
        .clkout_divider = 0,
    };
    twai_timing_config_t t = TWAI_TIMING_CONFIG_500KBITS();
    twai_filter_config_t f = TWAI_FILTER_CONFIG_ACCEPT_ALL();

    if (twai_driver_install(&g, &t, &f) != ESP_OK ||
        twai_start() != ESP_OK) {
        Serial.println("[TWAI] Vehicle bus init failed — rebooting");
        delay(3000);
        ESP.restart();
    }
    Serial.println("[TWAI] Vehicle bus ready (bidirectional, 500kbps)");
}

// ── Chassis bus (MCP2515 — listen-only) ──────────────────────────────────────
void mcp2515Write(uint8_t reg, uint8_t val) {
    digitalWrite(MCP_CS_PIN, LOW);
    SPI.transfer(0x02);  // WRITE instruction
    SPI.transfer(reg);
    SPI.transfer(val);
    digitalWrite(MCP_CS_PIN, HIGH);
}

void initChassisBus() {
    pinMode(MCP_CS_PIN, OUTPUT);
    digitalWrite(MCP_CS_PIN, HIGH);
    SPI.begin();

    // Reset MCP2515
    digitalWrite(MCP_CS_PIN, LOW);
    SPI.transfer(MCP_RESET);
    digitalWrite(MCP_CS_PIN, HIGH);
    delay(10);

    // Configure 500kbps (8MHz crystal: CNF1=0x00, CNF2=0x90, CNF3=0x02)
    mcp2515Write(0x2A, 0x00);  // CNF1
    mcp2515Write(0x29, 0x90);  // CNF2
    mcp2515Write(0x28, 0x02);  // CNF3

    // Set listen-only mode — MCP2515 will not ACK or transmit anything
    mcp2515Write(MCP_CANCTRL, MCP_REQOP_LISTENONLY);
    delay(5);
    Serial.println("[MCP2515] Chassis bus ready (LISTEN-ONLY, 500kbps)");
    Serial.println("[MCP2515] ⚠ TX pin physically disconnected — chassis write impossible");
}

bool mcp2515ReadFrame(uint32_t& id, uint8_t data[8], uint8_t& dlc) {
    // Check CANINTF (RX0IF or RX1IF)
    digitalWrite(MCP_CS_PIN, LOW);
    SPI.transfer(0x03);  // READ
    SPI.transfer(0x2C);  // CANINTF
    uint8_t intf = SPI.transfer(0x00);
    digitalWrite(MCP_CS_PIN, HIGH);

    if (!(intf & 0x03)) return false;

    uint8_t rxbuf = (intf & 0x01) ? 0x61 : 0x71;  // RXB0SIDH or RXB1SIDH offset
    digitalWrite(MCP_CS_PIN, LOW);
    SPI.transfer(0x90 | ((intf & 0x01) ? 0x00 : 0x04));  // READ RX BUFFER command
    uint8_t sidh = SPI.transfer(0);
    uint8_t sidl = SPI.transfer(0);
    SPI.transfer(0); SPI.transfer(0);  // EID8, EID0 (unused for standard frames)
    uint8_t dlc_reg = SPI.transfer(0);
    dlc = dlc_reg & 0x0F;
    for (int i = 0; i < dlc && i < 8; i++) data[i] = SPI.transfer(0);
    digitalWrite(MCP_CS_PIN, HIGH);

    id = ((uint32_t)sidh << 3) | ((sidl >> 5) & 0x07);

    // Clear interrupt flag
    mcp2515Write(0x2C, intf & ~0x03);
    return true;
}

// ── WebSocket events ──────────────────────────────────────────────────────────
void onWebSocketEvent(uint8_t clientNum, WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
    case WStype_CONNECTED:
        connectedClient = clientNum;
        Serial.printf("[WS] Client #%d connected\n", clientNum);
        break;

    case WStype_DISCONNECTED:
        if (connectedClient == clientNum) connectedClient = 0xFF;
        Serial.printf("[WS] Client #%d disconnected\n", clientNum);
        break;

    case WStype_TEXT: {
        // Inbound: write command from backend
        StaticJsonDocument<128> doc;
        if (deserializeJson(doc, payload, length) != DeserializationError::Ok) break;

        const char* action = doc["action"] | "";
        if (strcmp(action, "write") != 0) break;

        const char* bus = doc["bus"] | "";
        if (strcmp(bus, "chassis") == 0) {
            // SAFETY: silently refuse chassis writes
            Serial.printf("[WS] ⛔ Chassis write refused (id=0x%X)\n", (uint32_t)doc["id"]);
            break;
        }
        if (strcmp(bus, "vehicle") != 0) break;

        uint32_t frame_id = doc["id"] | 0;
        const char* hex_data = doc["data"] | "";
        uint8_t data[8] = {};
        uint8_t dlc = 0;
        while (*hex_data && dlc < 8) {
            char byte_str[3] = { hex_data[0], hex_data[1], '\0' };
            data[dlc++] = (uint8_t)strtol(byte_str, nullptr, 16);
            hex_data += 2;
        }

        twai_message_t msg = {};
        msg.identifier = frame_id;
        msg.data_length_code = dlc;
        memcpy(msg.data, data, dlc);
        if (twai_transmit(&msg, pdMS_TO_TICKS(10)) == ESP_OK) {
            Serial.printf("[TWAI] Sent id=0x%X dlc=%d\n", frame_id, dlc);
        } else {
            Serial.printf("[TWAI] Transmit failed id=0x%X\n", frame_id);
        }
        break;
    }
    default: break;
    }
}

// ── Broadcast helper ──────────────────────────────────────────────────────────
void broadcastFrame(uint32_t id, const uint8_t* data, uint8_t dlc, const char* bus, float ts) {
    // Build hex string
    char hex[17] = {};
    for (int i = 0; i < dlc && i < 8; i++) sprintf(&hex[i * 2], "%02x", data[i]);

    StaticJsonDocument<192> doc;
    doc["id"]   = id;
    doc["data"] = hex;
    doc["bus"]  = bus;
    doc["ts"]   = ts;
    serializeJson(doc, jsonBuf, sizeof(jsonBuf));
    webSocket.broadcastTXT(jsonBuf);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("[Tescan] ESP32 CAN Bridge starting");

    connectWiFi();
    initVehicleBus();
    initChassisBus();

    webSocket.begin();
    webSocket.onEvent(onWebSocketEvent);
    Serial.printf("[WS] Server listening on port %d\n", WEBSOCKET_PORT);
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
    webSocket.loop();

    float ts = millis() / 1000.0f;

    // ── Vehicle bus receive ───────────────────────────────────────────────────
    twai_message_t msg;
    if (twai_receive(&msg, 0) == ESP_OK) {
        broadcastFrame(msg.identifier, msg.data, msg.data_length_code, "vehicle", ts);
    }

    // ── Chassis bus receive (MCP2515) ─────────────────────────────────────────
    uint32_t chassis_id;
    uint8_t chassis_data[8];
    uint8_t chassis_dlc;
    if (mcp2515ReadFrame(chassis_id, chassis_data, chassis_dlc)) {
        broadcastFrame(chassis_id, chassis_data, chassis_dlc, "chassis", ts);
    }
}
