import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVehicleStore } from '../store/vehicleStore';

const BACKEND_URL_KEY = 'tescan_backend_url';
const DEFAULT_URL = '192.168.4.2:8000';

export async function getBackendUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(BACKEND_URL_KEY);
    return saved ?? DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

export async function saveBackendUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(BACKEND_URL_KEY, url);
  useVehicleStore.getState().setBackendUrl(url);
}

async function baseUrl(): Promise<string> {
  return `http://${await getBackendUrl()}`;
}

export const api = {
  getHealth: async () => {
    const base = await baseUrl();
    return axios.get(`${base}/api/v1/health`, { timeout: 5000 });
  },

  getStatus: async () => {
    const base = await baseUrl();
    return axios.get(`${base}/api/v1/status`, { timeout: 5000 });
  },

  getHistory: async (
    start: number,
    end: number,
    resolution: number = 60,
  ) => {
    const base = await baseUrl();
    return axios.get(`${base}/api/v1/history`, {
      params: { start, end, resolution },
      timeout: 10_000,
    });
  },

  writeCanFrame: async (bus: string, id: number, data: string) => {
    const base = await baseUrl();
    return axios.post(`${base}/api/v1/write`, { bus, id, data }, { timeout: 5000 });
  },

  updateSettings: async (host: string, port: number) => {
    const base = await baseUrl();
    return axios.post(`${base}/api/v1/settings`, null, {
      params: { host, port },
      timeout: 5000,
    });
  },
};
