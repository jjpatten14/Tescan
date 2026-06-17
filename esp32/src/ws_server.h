#pragma once
#include <Arduino.h>

//
// WebSocket server that streams CAN frames to the backend and receives
// write commands. Frames are JSON-encoded.
//
//   Outbound: {"id":599,"data":"0102030405060708","bus":"vehicle","ts":12.345}
//   Inbound:  {"action":"write","bus":"vehicle","id":291,"data":"0100..."}
//
namespace WsServer {

// Callback invoked when the backend asks to write a frame to a bus.
// Implementations MUST refuse any bus other than "vehicle".
typedef void (*WriteHandler)(const char* bus, uint32_t id,
                             const uint8_t* data, uint8_t dlc);

void begin(WriteHandler handler);
void loop();

// Broadcast a received CAN frame to all connected clients.
void broadcastFrame(uint32_t id, const uint8_t* data, uint8_t dlc,
                    const char* bus, float ts);

bool hasClients();

}  // namespace WsServer
