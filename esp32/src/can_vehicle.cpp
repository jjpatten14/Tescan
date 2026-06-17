#include "can_vehicle.h"
#include "config.h"
#include <driver/twai.h>

namespace VehicleBus {

bool begin() {
    twai_general_config_t g = TWAI_GENERAL_CONFIG_DEFAULT(
        VEH_TX_GPIO, VEH_RX_GPIO, TWAI_MODE_NORMAL);
    g.rx_queue_len = 64;
    g.tx_queue_len = 16;

    twai_timing_config_t t = TWAI_TIMING_CONFIG_500KBITS();
    twai_filter_config_t f = TWAI_FILTER_CONFIG_ACCEPT_ALL();

    if (twai_driver_install(&g, &t, &f) != ESP_OK) {
        Serial.println("[VehicleBus] driver_install failed");
        return false;
    }
    if (twai_start() != ESP_OK) {
        Serial.println("[VehicleBus] start failed");
        return false;
    }
    Serial.println("[VehicleBus] TWAI ready (normal mode, 500 kbps)");
    return true;
}

bool receive(uint32_t& id, uint8_t data[8], uint8_t& dlc) {
    twai_message_t msg;
    if (twai_receive(&msg, 0) != ESP_OK) return false;
    if (msg.rtr) return false;  // ignore remote-request frames

    id = msg.identifier;
    dlc = msg.data_length_code > 8 ? 8 : msg.data_length_code;
    for (uint8_t i = 0; i < dlc; i++) data[i] = msg.data[i];
    return true;
}

bool transmit(uint32_t id, const uint8_t* data, uint8_t dlc) {
    if (dlc > 8) dlc = 8;
    twai_message_t msg = {};
    msg.identifier = id;
    msg.data_length_code = dlc;
    msg.extd = (id > 0x7FF) ? 1 : 0;
    for (uint8_t i = 0; i < dlc; i++) msg.data[i] = data[i];

    return twai_transmit(&msg, pdMS_TO_TICKS(10)) == ESP_OK;
}

}  // namespace VehicleBus
