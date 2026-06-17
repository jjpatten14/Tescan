#pragma once
#include <cstdint>
#include <functional>

namespace BleServer {
    using WriteCallback = std::function<void(const uint8_t*, size_t)>;

    void begin(const char* deviceName, WriteCallback onWrite);
    void sendFrame(uint32_t id, const uint8_t* data, uint8_t len);
    bool connected();
}
