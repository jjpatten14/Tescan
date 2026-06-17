package com.tescan.app.data

import com.tescan.app.data.model.RawCANFrame
import com.tescan.app.data.model.VehicleSnapshot
import kotlin.math.absoluteValue

class CanDecoder {

    private val state = mutableMapOf<String, Double>()

    fun decode(frame: RawCANFrame): VehicleSnapshot {
        val bytes = hex(frame.data)
        when (frame.id) {
            0x292 -> {
                // BMS_uiSoc: startBit=1, len=10, unsigned, scale=0.1
                state["soc"] = extractLE(bytes, 1, 10, false) * 0.1
            }
            0x257 -> {
                // UI_vehicleSpeed: startBit=12, len=9, unsigned, scale=0.1
                state["speed_mph"] = extractLE(bytes, 12, 9, false) * 0.1
            }
            0x102 -> {
                // DIF_torqueActual: startBit=0, len=13, signed, scale=0.25
                state["torque_nm"] = extractLE(bytes, 0, 13, true) * 0.25
            }
            0x2A4 -> {
                // BMS_minBattTemperature: startBit=0, len=9, signed, scale=0.5
                state["battery_temp_min"] = extractLE(bytes, 0, 9, true) * 0.5
                // BMS_maxBattTemperature: startBit=9, len=9, signed, scale=0.5
                state["battery_temp_max"] = extractLE(bytes, 9, 9, true) * 0.5
            }
            0x232 -> {
                // BMS_chargeStatus: startBit=0, len=2, unsigned (0=idle,1=ac,2/3=dc)
                val cs = extractLE(bytes, 0, 2, false).toInt()
                state["charging_state"] = when (cs) {
                    1 -> 1.0
                    2, 3 -> 2.0
                    else -> 0.0
                }
            }
            0x202 -> {
                // DI_odometer: startBit=0, len=32, unsigned, scale=0.001
                state["odometer_km"] = extractLE(bytes, 0, 32, false) * 0.001
            }
        }
        return buildSnapshot()
    }

    // Little-endian (Intel) bit extraction matching DBC @1 notation
    private fun extractLE(data: ByteArray, startBit: Int, length: Int, signed: Boolean): Long {
        var raw = 0L
        for (i in 0 until length) {
            val bitPos = startBit + i
            val byteIdx = bitPos / 8
            val bitIdx = bitPos % 8
            if (byteIdx < data.size) {
                val bit = (data[byteIdx].toInt() shr bitIdx) and 1
                raw = raw or (bit.toLong() shl i)
            }
        }
        if (signed && length > 0) {
            val signBit = 1L shl (length - 1)
            if (raw and signBit != 0L) raw -= (1L shl length)
        }
        return raw
    }

    private fun buildSnapshot(): VehicleSnapshot {
        val speedMph = state["speed_mph"]
        val torque = state["torque_nm"]
        // P(kW) = torque(Nm) × speed(m/s) × 9.034 / 0.334 / 1000
        val powerKw = if (torque != null && speedMph != null) {
            val speedMs = speedMph * 0.44704
            torque * speedMs * 9.034 / 0.334 / 1000.0
        } else null

        val soc = state["soc"]
        val rangeKm = soc?.let { it * 499.0 / 100.0 }

        val csRaw = state["charging_state"]?.toInt()
        val chargingState = when (csRaw) {
            1 -> "ac"
            2 -> "dc"
            else -> "idle"
        }

        return VehicleSnapshot(
            ts = System.currentTimeMillis() / 1000.0,
            soc = soc,
            speed_mph = speedMph,
            speed_kmh = speedMph?.let { it * 1.60934 },
            power_kw = powerKw,
            battery_temp_min = state["battery_temp_min"],
            battery_temp_max = state["battery_temp_max"],
            estimated_range_km = rangeKm,
            charging_state = chargingState,
            odometer_km = state["odometer_km"],
            torque_nm = torque,
        )
    }

    private fun hex(s: String): ByteArray {
        val clean = s.trim()
        return ByteArray(clean.length / 2) { i ->
            clean.substring(i * 2, i * 2 + 2).toInt(16).toByte()
        }
    }
}
