#include "ble_server.h"
#include <NimBLEDevice.h>
#include <ArduinoJson.h>

// Nordic UART Service UUIDs
#define NUS_SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_TX_UUID      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
#define NUS_RX_UUID      "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

namespace BleServer {

static NimBLECharacteristic* txChar = nullptr;
static NimBLECharacteristic* rxChar = nullptr;
static NimBLEServer* bleServer      = nullptr;
static WriteCallback writeCallback;

class ServerCB : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* s) override {
        Serial.println("[BLE] client connected");
    }
    void onDisconnect(NimBLEServer* s) override {
        Serial.println("[BLE] client disconnected — restarting advertising");
        NimBLEDevice::startAdvertising();
    }
};

class RxCB : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* c) override {
        const std::string& val = c->getValue();
        if (writeCallback && !val.empty())
            writeCallback(reinterpret_cast<const uint8_t*>(val.data()), val.size());
    }
};

static ServerCB serverCB;
static RxCB rxCB;

void begin(const char* deviceName, WriteCallback onWrite) {
    writeCallback = onWrite;

    NimBLEDevice::init(deviceName);
    bleServer = NimBLEDevice::createServer();
    bleServer->setCallbacks(&serverCB);

    NimBLEService* svc = bleServer->createService(NUS_SERVICE_UUID);

    txChar = svc->createCharacteristic(
        NUS_TX_UUID,
        NIMBLE_PROPERTY::NOTIFY
    );

    rxChar = svc->createCharacteristic(
        NUS_RX_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    rxChar->setCallbacks(&rxCB);

    svc->start();

    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    adv->addServiceUUID(NUS_SERVICE_UUID);
    adv->setScanResponse(true);
    NimBLEDevice::startAdvertising();
    Serial.printf("[BLE] advertising as \"%s\"\n", deviceName);
}

void sendFrame(uint32_t id, const uint8_t* data, uint8_t len) {
    if (!bleServer || !bleServer->getConnectedCount()) return;

    char hex[17] = {};
    for (uint8_t i = 0; i < len && i < 8; i++)
        sprintf(&hex[i * 2], "%02x", data[i]);

    JsonDocument doc;
    doc["id"]   = id;
    doc["data"] = hex;
    doc["bus"]  = "vehicle";
    doc["ts"]   = millis() / 1000.0;

    char buf[128];
    size_t n = serializeJson(doc, buf, sizeof(buf) - 1);
    buf[n++] = '\n';

    txChar->setValue(reinterpret_cast<uint8_t*>(buf), n);
    txChar->notify();
}

bool connected() {
    return bleServer && bleServer->getConnectedCount() > 0;
}

}  // namespace BleServer
