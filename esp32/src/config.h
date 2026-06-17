#pragma once

#define BLE_DEVICE_NAME  "TESCAN"

// Vehicle bus — TWAI peripheral (bidirectional, 500 kbps)
// Seeed XIAO ESP32C6: D2 = GPIO4, D3 = GPIO5
// CTX pin of SN65HVD230 module → D2 (GPIO4)
// CRX pin of SN65HVD230 module → D3 (GPIO5)
#define VEH_TX_GPIO   4
#define VEH_RX_GPIO   5
