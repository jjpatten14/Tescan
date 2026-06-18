// Port of com.tescan.app.data.CanDecoder.kt
// Little-endian (Intel / DBC @1) bit extraction — identical algorithm to Kotlin.

import { RawCANFrame, VehicleSnapshot } from '../types';

// Persistent state across frames (same as Kotlin's mutableMapOf)
const state: Record<string, number> = {};

function hexToBytes(hex: string): number[] {
  const clean = hex.trim();
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    out.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

// Little-endian bit extraction matching DBC @1 notation
function extractLE(data: number[], startBit: number, length: number, signed: boolean): number {
  let raw = 0;
  for (let i = 0; i < length; i++) {
    const bitPos = startBit + i;
    const byteIdx = Math.floor(bitPos / 8);
    const bitIdx = bitPos % 8;
    if (byteIdx < data.length) {
      const bit = (data[byteIdx]! >> bitIdx) & 1;
      raw |= bit << i;
    }
  }
  if (signed && length > 0) {
    const signBit = 1 << (length - 1);
    if (raw & signBit) {
      raw -= 1 << length;
    }
  }
  return raw;
}

function buildSnapshot(): VehicleSnapshot {
  const speedMph = state['speed_mph'] ?? null;
  const torque   = state['torque_nm'] ?? null;

  // P(kW) = torque(Nm) × speed(m/s) × gear_ratio / wheel_radius / 1000
  // Model 3 LR: final drive ratio ≈ 9.034, wheel radius ≈ 0.334 m
  let powerKw: number | null = null;
  if (torque !== null && speedMph !== null) {
    const speedMs = speedMph * 0.44704;
    powerKw = (torque * speedMs * 9.034) / 0.334 / 1000;
  }

  const soc = state['soc'] ?? null;
  const rangeKm = soc !== null ? (soc * 499.0) / 100.0 : null;

  const csRaw = state['charging_state'] ?? null;
  let chargingState: 'idle' | 'ac' | 'dc' = 'idle';
  if (csRaw === 1) chargingState = 'ac';
  else if (csRaw === 2) chargingState = 'dc';

  return {
    ts: Date.now() / 1000,
    soc,
    speed_mph: speedMph,
    speed_kmh: speedMph !== null ? speedMph * 1.60934 : null,
    power_kw: powerKw,
    battery_temp_min: state['battery_temp_min'] ?? null,
    battery_temp_max: state['battery_temp_max'] ?? null,
    estimated_range_km: rangeKm,
    charging_state: chargingState,
    charge_rate_kw: null,
    odometer_km: state['odometer_km'] ?? null,
    hvac_on: null,
    cabin_temp: null,
    torque_nm: torque,
  };
}

export function decodeFrame(frame: RawCANFrame): VehicleSnapshot {
  const bytes = hexToBytes(frame.data);

  switch (frame.id) {
    case 0x292:
      // BMS_uiSoc: startBit=1, len=10, unsigned, scale=0.1
      state['soc'] = extractLE(bytes, 1, 10, false) * 0.1;
      break;
    case 0x257:
      // UI_vehicleSpeed: startBit=12, len=9, unsigned, scale=0.1
      state['speed_mph'] = extractLE(bytes, 12, 9, false) * 0.1;
      break;
    case 0x102:
      // DIF_torqueActual: startBit=0, len=13, signed, scale=0.25
      state['torque_nm'] = extractLE(bytes, 0, 13, true) * 0.25;
      break;
    case 0x2A4:
      // BMS_minBattTemperature: startBit=0, len=9, signed, scale=0.5
      state['battery_temp_min'] = extractLE(bytes, 0, 9, true) * 0.5;
      // BMS_maxBattTemperature: startBit=9, len=9, signed, scale=0.5
      state['battery_temp_max'] = extractLE(bytes, 9, 9, true) * 0.5;
      break;
    case 0x232:
      // BMS_chargeStatus: startBit=0, len=2, unsigned (0=idle, 1=ac, 2/3=dc)
      {
        const cs = extractLE(bytes, 0, 2, false);
        state['charging_state'] = cs === 1 ? 1 : cs >= 2 ? 2 : 0;
      }
      break;
    case 0x202:
      // DI_odometer: startBit=0, len=32, unsigned, scale=0.001
      state['odometer_km'] = extractLE(bytes, 0, 32, false) * 0.001;
      break;
  }

  return buildSnapshot();
}
