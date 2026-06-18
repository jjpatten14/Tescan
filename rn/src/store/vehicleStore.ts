import { create } from 'zustand';
import { EMPTY_SNAPSHOT, VehicleSnapshot, ConnectionStatus } from '../types';
import { bleManager } from '../ble/BleManager';

interface Settings {
  deviceName: string;
  chargeLimit: number; // 50–100 %
  unitsMph: boolean;
}

interface VehicleStore {
  snap: VehicleSnapshot;
  status: ConnectionStatus;
  settings: Settings;

  // BLE
  startBle: () => void;
  stopBle: () => void;

  // Settings mutations
  setDeviceName: (n: string) => void;
  setChargeLimit: (v: number) => void;
  setUnitsMph: (v: boolean) => void;

  // UI-only controls (sent as BLE write commands)
  sendLockCmd: (lock: boolean) => void;
  sendClimateCmd: (on: boolean, targetF: number) => void;
  sendChargeCmd: (start: boolean) => void;
  sendPortCmd: (open: boolean) => void;
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  snap:   EMPTY_SNAPSHOT,
  status: 'disconnected',
  settings: {
    deviceName: 'TESCAN',
    chargeLimit: 80,
    unitsMph: true,
  },

  startBle() {
    const { deviceName } = get().settings;
    bleManager.connect(
      deviceName,
      (snap)   => set({ snap }),
      (status) => set({ status }),
    );
  },

  stopBle() {
    bleManager.disconnect();
  },

  setDeviceName(n) {
    set(s => ({ settings: { ...s.settings, deviceName: n } }));
  },

  setChargeLimit(v) {
    set(s => ({ settings: { ...s.settings, chargeLimit: v } }));
  },

  setUnitsMph(v) {
    set(s => ({ settings: { ...s.settings, unitsMph: v } }));
  },

  sendLockCmd(lock) {
    // Placeholder — CAN ID and payload for lock TBD via reverse engineering
    bleManager.send({ action: 'write', bus: 'vehicle', id: 0x2BF, data: lock ? '01' : '00' });
  },

  sendClimateCmd(on, targetF) {
    const targetC = Math.round((targetF - 32) * 5 / 9);
    bleManager.send({ action: 'write', bus: 'vehicle', id: 0x2E1,
      data: (on ? '01' : '00') + targetC.toString(16).padStart(2, '0') });
  },

  sendChargeCmd(start) {
    bleManager.send({ action: 'write', bus: 'vehicle', id: 0x1D8, data: start ? '01' : '00' });
  },

  sendPortCmd(open) {
    bleManager.send({ action: 'write', bus: 'vehicle', id: 0x2BF, data: open ? '11' : '10' });
  },
}));
