#include "can_chassis.h"
#include "config.h"
#include <mcp2515.h>

//
// Uses the autowp MCP2515 library (lib_deps: autowp/autowp-mcp2515).
// Listen-only mode means the controller never asserts ACK or transmits,
// so the car's ECUs are never aware of its presence.
//
namespace ChassisBus {

static MCP2515 mcp(CHASSIS_CS_GPIO);

bool begin() {
    if (mcp.reset() != MCP2515::ERROR_OK) {
        Serial.println("[ChassisBus] MCP2515 reset failed (check wiring/SPI)");
        return false;
    }
    mcp.setBitrate(CAN_500KBPS, CHASSIS_MCP_CRYSTAL);

    // SAFETY redundancy layer 1: listen-only mode.
    mcp.setListenOnlyMode();

    Serial.println("[ChassisBus] MCP2515 ready (LISTEN-ONLY, 500 kbps)");
    Serial.println("[ChassisBus] Reminder: transceiver TX pin must be left disconnected.");
    return true;
}

bool receive(uint32_t& id, uint8_t data[8], uint8_t& dlc) {
    struct can_frame frame;
    if (mcp.readMessage(&frame) != MCP2515::ERROR_OK) return false;

    id = frame.can_id & CAN_EFF_MASK;  // strip flag bits
    dlc = frame.can_dlc > 8 ? 8 : frame.can_dlc;
    for (uint8_t i = 0; i < dlc; i++) data[i] = frame.data[i];
    return true;
}

}  // namespace ChassisBus
