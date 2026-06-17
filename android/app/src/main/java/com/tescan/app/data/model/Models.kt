package com.tescan.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class VehicleSnapshot(
    val ts: Double = 0.0,
    val soc: Double? = null,
    val speed_mph: Double? = null,
    val speed_kmh: Double? = null,
    val power_kw: Double? = null,
    val battery_temp_min: Double? = null,
    val battery_temp_max: Double? = null,
    val estimated_range_km: Double? = null,
    val charging_state: String? = null,   // "idle" | "ac" | "dc"
    val charge_rate_kw: Double? = null,
    val odometer_km: Double? = null,
    val hvac_on: Boolean? = null,
    val cabin_temp: Double? = null,
    val doors: Map<String, Boolean>? = null,
    val torque_nm: Double? = null,
)

@Serializable
data class HistoryPoint(
    val ts: Double,
    val soc: Double? = null,
    val power_kw: Double? = null,
    val speed_mph: Double? = null,
    val battery_temp_max: Double? = null,
)

@Serializable
data class HealthStatus(
    val status: String,
    val mode: String,            // "mock" | "live"
    val esp32_connected: Boolean,
    val frames_received: Int,
)

enum class ConnectionStatus { CONNECTING, CONNECTED, DISCONNECTED }
