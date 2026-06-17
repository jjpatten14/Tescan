#pragma once
#include <Arduino.h>

//
// Chassis bus — READ ONLY via an MCP2515 SPI CAN controller.
//
// SAFETY: This module intentionally exposes NO transmit function. The MCP2515
// is held in listen-only mode, and the transceiver's TX pin is physically
// disconnected. There is no software path to write to the chassis bus.
//
namespace ChassisBus {

// Reset and configure the MCP2515 in LISTEN-ONLY mode at 500 kbps.
// Returns false on failure.
bool begin();

// Non-blocking receive. Returns true if a frame was read.
bool receive(uint32_t& id, uint8_t data[8], uint8_t& dlc);

}  // namespace ChassisBus
