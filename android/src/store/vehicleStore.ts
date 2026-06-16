import { create } from 'zustand';

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
  doors: Record<string, boolean> | null;
  torque_nm: number | null;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface VehicleStore {
  snapshot: VehicleSnapshot | null;
  connectionStatus: ConnectionStatus;
  backendUrl: string;
  setSnapshot: (s: VehicleSnapshot) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setBackendUrl: (url: string) => void;
}

export const useVehicleStore = create<VehicleStore>((set) => ({
  snapshot: null,
  connectionStatus: 'disconnected',
  backendUrl: '192.168.4.2:8000',
  setSnapshot: (snapshot) => set({ snapshot }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setBackendUrl: (backendUrl) => set({ backendUrl }),
}));
