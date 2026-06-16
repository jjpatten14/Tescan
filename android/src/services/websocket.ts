import { useVehicleStore, VehicleSnapshot } from '../store/vehicleStore';

class TescanWebSocket {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = false;

  connect(baseUrl: string) {
    this.shouldReconnect = true;
    this.url = `ws://${baseUrl}/ws/live`;
    this._connect();
  }

  private _connect() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
    }

    useVehicleStore.getState().setConnectionStatus('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      useVehicleStore.getState().setConnectionStatus('connected');
      // Keep-alive ping every 30s so the server detects broken connections
      this.pingTimer = setInterval(() => {
        try { this.ws?.send('ping'); } catch {}
      }, 30_000);
    };

    this.ws.onmessage = (e) => {
      try {
        const snap = JSON.parse(e.data) as VehicleSnapshot;
        useVehicleStore.getState().setSnapshot(snap);
      } catch {}
    };

    this.ws.onclose = () => {
      useVehicleStore.getState().setConnectionStatus('disconnected');
      if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._connect(), 3_000);
      }
    };

    this.ws.onerror = () => {
      // onclose fires immediately after onerror, handles reconnect
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const tescanWS = new TescanWebSocket();
