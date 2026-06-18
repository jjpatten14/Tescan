// Port of com.tescan.app.data.remote.BleManager.kt
// Uses react-native-ble-plx. Characteristic values are base64-encoded.

import { BleManager as RNBleManager, Device, BleError } from 'react-native-ble-plx';
import { decodeFrame } from './CanDecoder';
import { ConnectionStatus, RawCANFrame, VehicleSnapshot } from '../types';

const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // ESP32 → phone (NOTIFY)
const NUS_RX      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // phone → ESP32 (WRITE)

export type SnapshotCb = (snap: VehicleSnapshot) => void;
export type StatusCb   = (s: ConnectionStatus) => void;

class BleManager {
  private manager = new RNBleManager();
  private device: Device | null = null;
  private lineBuf = '';
  private active = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onSnapshot: SnapshotCb = () => {};
  private onStatus: StatusCb = () => {};
  private deviceName = 'TESCAN';

  connect(name: string, onSnapshot: SnapshotCb, onStatus: StatusCb) {
    this.deviceName = name;
    this.onSnapshot = onSnapshot;
    this.onStatus   = onStatus;
    this.active     = true;
    this.startScan();
  }

  disconnect() {
    this.active = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.manager.stopDeviceScan();
    if (this.device) {
      this.device.cancelConnection().catch(() => {});
      this.device = null;
    }
    this.onStatus('disconnected');
  }

  async send(payload: object) {
    if (!this.device) return;
    try {
      const json = JSON.stringify(payload);
      const b64  = btoa(json);
      await this.device.writeCharacteristicWithoutResponseForService(NUS_SERVICE, NUS_RX, b64);
    } catch (e) {
      console.warn('[ble] write failed:', e);
    }
  }

  private startScan() {
    if (!this.active) return;
    this.onStatus('connecting');
    this.lineBuf = '';
    this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        console.warn('[ble] scan error:', error.message);
        return;
      }
      if (device?.name === this.deviceName) {
        this.manager.stopDeviceScan();
        this.connectDevice(device);
      }
    });
  }

  private async connectDevice(device: Device) {
    try {
      const connected = await device.connect({ autoConnect: false });
      await connected.discoverAllServicesAndCharacteristics();
      this.device = connected;
      this.onStatus('connected');
      this.subscribeNotifications(connected);
      connected.onDisconnected((_error, _dev) => this.handleDisconnect());
    } catch (e) {
      console.warn('[ble] connect failed:', e);
      this.handleDisconnect();
    }
  }

  private subscribeNotifications(device: Device) {
    device.monitorCharacteristicForService(
      NUS_SERVICE,
      NUS_TX,
      (error: BleError | null, char) => {
        if (error) return;
        if (!char?.value) return;
        // value is base64; decode to UTF-8 string
        try {
          const text = atob(char.value);
          this.handleText(text);
        } catch {}
      },
    );
  }

  private handleText(text: string) {
    this.lineBuf += text;
    let nl = this.lineBuf.indexOf('\n');
    while (nl >= 0) {
      const line = this.lineBuf.slice(0, nl).trim();
      this.lineBuf = this.lineBuf.slice(nl + 1);
      if (line) this.parseLine(line);
      nl = this.lineBuf.indexOf('\n');
    }
  }

  private parseLine(line: string) {
    try {
      const frame: RawCANFrame = JSON.parse(line);
      const snap = decodeFrame(frame);
      this.onSnapshot(snap);
    } catch {}
  }

  private handleDisconnect() {
    this.device = null;
    this.onStatus('disconnected');
    if (this.active) {
      this.reconnectTimer = setTimeout(() => this.startScan(), 3000);
    }
  }
}

// Singleton — one BLE connection for the whole app
export const bleManager = new BleManager();
