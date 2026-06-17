#pragma once
#include <Arduino.h>

//
// Vehicle bus — bidirectional CAN via the ESP32 built-in TWAI controller.
// Reads frames and can transmit control commands sent from the backend.
//
namespace VehicleBus {

// Install and start the TWAI driver in NORMAL mode at 500 kbps.
// Returns false on failure (caller should reboot).
bool begin();

// Non-blocking receive. Returns true if a frame was read.
bool receive(uint32_t& id, uint8_t data[8], uint8_t& dlc);

// Transmit a frame onto the vehicle bus. Returns true on success.
bool transmit(uint32_t id, const uint8_t* data, uint8_t dlc);

}  // namespace VehicleBus
