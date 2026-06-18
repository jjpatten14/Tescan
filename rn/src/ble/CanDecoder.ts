// Port of com.tescan.app.data.CanDecoder.kt + new battery health signals
// Little-endian (Intel / DBC @1) bit extraction — identical algorithm to Kotlin.
//
// New frame 0x352 (BMS_energyStatus) — 2018 Model 3 legacy non-multiplexed format:
//   BMS_nominalFullPackEnergy  : startBit=0,  len=10, scale=0.1 kWh
//   BMS_nominalEnergyRemaining : startBit=10, len=10, scale=0.1 kWh
// Reference: commaai/opendbc tesla_model3.dbc + DBCTools sample
// VALIDATE bit positions against real hardware before trusting values.

import { RawCANFrame, VehicleSnapshot } from '../types';

// Full pack capacity when new for 2018 Model 3 Long Range (community consensus via ScanMyTesla)
const FULL_PACK_WHEN_NEW_KWH = 77.8;

// Persistent signal state across frames
const state: Record<string, number> = {};

// ── Rolling 30-mile efficiency tracker ────────────────────────────────────────
let effWhConsumed = 0;  // Wh in current window
let effMilesDriven = 0; // miles in current window
let prevTs = 0;

function updateEfficiency(snap: VehicleSnapshot): number | null {
  if (!snap.speed_mph || snap.speed_mph <= 0 || snap.power_kw === null) return null;
  if (prevTs === 0) { prevTs = snap.ts; return null; }

  const dt = (snap.ts - prevTs) / 3600; // hours
  prevTs = snap.ts;

  const dMiles = snap.speed_mph * dt;
  // Only count discharge (positive power = motors consuming energy)
  const dWh = Math.max(0, snap.power_kw * 1000 * dt);

  effWhConsumed  += dWh;
  effMilesDriven += dMiles;

  // Slide window: keep only last 30 miles
  if (effMilesDriven > 30) {
    const factor   = 30 / effMilesDriven;
    effWhConsumed  *= factor;
    effMilesDriven *= factor;
  }

  return effMilesDriven > 0.5 ? effWhConsumed / effMilesDriven : null;
}

// Temperature correction: cold degrades effective range
// Based on real-world data: −20% below 0°C, −10% at 10°C, −5% at 20°C
function tempCorrectionFactor(tempMinC: number | null, tempMaxC: number | null): number {
  if (tempMinC === null) return 1.0;
  const avgC = tempMaxC !== null ? (tempMinC + tempMaxC) / 2 : tempMinC;
  if (avgC < 0)   return 0.80;
  if (avgC < 10)  return 0.90;
  if (avgC < 20)  return 0.95;
  return 1.0;
}

// ── Bit extraction ─────────────────────────────────────────────────────────────
function hexToBytes(hex: string): number[] {
  const clean = hex.trim();
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    out.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

function extractLE(data: number[], startBit: number, length: number, signed: boolean): number {
  let raw = 0;
  for (let i = 0; i < length; i++) {
    const bitPos = startBit + i;
    const byteIdx = Math.floor(bitPos / 8);
    const bitIdx  = bitPos % 8;
    if (byteIdx < data.length) {
      const bit = (data[byteIdx]! >> bitIdx) & 1;
      raw |= bit << i;
    }
  }
  if (signed && length > 0) {
    const signBit = 1 << (length - 1);
    if (raw & signBit) raw -= 1 << length;
  }
  return raw;
}

// ── Snapshot builder ───────────────────────────────────────────────────────────
function buildSnapshot(): VehicleSnapshot {
  const speedMph = state['speed_mph'] ?? null;
  const torque   = state['torque_nm'] ?? null;

  let powerKw: number | null = null;
  if (torque !== null && speedMph !== null) {
    const speedMs = speedMph * 0.44704;
    powerKw = (torque * speedMs * 9.034) / 0.334 / 1000;
  }

  const soc       = state['soc'] ?? null;
  const fullPackKwh = state['full_pack_kwh'] ?? null;
  const energyRemKwh = state['energy_remaining_kwh'] ?? null;

  // Range from BMS energy if available, else SOC × rated
  const rangeKm = energyRemKwh !== null && state['avg_wh_per_mile']
    ? null  // will be set via predictive_range_miles below
    : soc !== null ? (soc * 499.0) / 100.0 : null;

  const csRaw = state['charging_state'] ?? null;
  let chargingState: 'idle' | 'ac' | 'dc' = 'idle';
  if (csRaw === 1) chargingState = 'ac';
  else if (csRaw === 2) chargingState = 'dc';

  const healthPct = fullPackKwh !== null
    ? Math.min(100, (fullPackKwh / FULL_PACK_WHEN_NEW_KWH) * 100)
    : null;

  const avgWhMi = state['avg_wh_per_mile'] ?? null;
  const tempFactor = tempCorrectionFactor(state['battery_temp_min'] ?? null, state['battery_temp_max'] ?? null);

  let predictiveRange: number | null = null;
  if (avgWhMi !== null && avgWhMi > 0) {
    // Prefer BMS energy remaining; fall back to SOC × current full pack
    const energyKwh = energyRemKwh
      ?? (soc !== null ? (soc / 100) * (fullPackKwh ?? FULL_PACK_WHEN_NEW_KWH * 0.9) : null);
    if (energyKwh !== null) {
      predictiveRange = (energyKwh * 1000 / avgWhMi) * tempFactor;
    }
  }

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
    full_pack_kwh: fullPackKwh,
    energy_remaining_kwh: energyRemKwh,
    avg_wh_per_mile: avgWhMi,
    predictive_range_miles: predictiveRange,
    battery_health_pct: healthPct,
  };
}

// ── Public decoder ─────────────────────────────────────────────────────────────
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
      // DI_odometer: startBit=0, len=32, unsigned, scale=0.001 km
      state['odometer_km'] = extractLE(bytes, 0, 32, false) * 0.001;
      break;

    case 0x352:
      // BMS_energyStatus — 2018 Model 3 legacy non-multiplexed format
      // BMS_nominalFullPackEnergy:  startBit=0,  len=10, scale=0.1 kWh
      // BMS_nominalEnergyRemaining: startBit=10, len=10, scale=0.1 kWh
      // VALIDATE against real hardware — bit positions from DBCTools sample DBC
      state['full_pack_kwh']        = extractLE(bytes, 0,  10, false) * 0.1;
      state['energy_remaining_kwh'] = extractLE(bytes, 10, 10, false) * 0.1;
      break;
  }

  const snap = buildSnapshot();

  // Update rolling efficiency after snapshot is built (needs power_kw + speed_mph)
  const avgWhMi = updateEfficiency(snap);
  if (avgWhMi !== null) {
    state['avg_wh_per_mile'] = avgWhMi;
    // Rebuild with updated efficiency (one extra call, cheap)
    return buildSnapshot();
  }

  return snap;
}
