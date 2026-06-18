// Mirrors com.tescan.app.data.model.Models.kt

export interface VehicleSnapshot {
  ts: number;
  soc: number | null;
  speed_mph: number | null;
  speed_kmh: number | null;
  power_kw: number | null;
  battery_temp_min: number | null;
  battery_temp_max: number | null;
  estimated_range_km: number | null;
  charging_state: 'idle' | 'ac' | 'dc' | null;
  charge_rate_kw: number | null;
  odometer_km: number | null;
  hvac_on: boolean | null;
  cabin_temp: number | null;
  torque_nm: number | null;
}

export interface RawCANFrame {
  id: number;
  data: string; // hex string e.g. "0102030405060708"
  bus: string;
  ts: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export const EMPTY_SNAPSHOT: VehicleSnapshot = {
  ts: 0,
  soc: null,
  speed_mph: null,
  speed_kmh: null,
  power_kw: null,
  battery_temp_min: null,
  battery_temp_max: null,
  estimated_range_km: null,
  charging_state: null,
  charge_rate_kw: null,
  odometer_km: null,
  hvac_on: null,
  cabin_temp: null,
  torque_nm: null,
};
