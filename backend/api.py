from __future__ import annotations
import asyncio
import logging
import time
from typing import TYPE_CHECKING

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models import VehicleSnapshot, HistoryPoint, HealthStatus, WriteCANCommand

if TYPE_CHECKING:
    from can_decoder import CANDecoder
    from storage import Storage
    from esp32_client import ESP32Client

logger = logging.getLogger(__name__)

app = FastAPI(title="Tescan", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# These are set by main.py after initialization
_decoder: "CANDecoder | None" = None
_storage: "Storage | None" = None
_esp32: "ESP32Client | None" = None
_mock_mode: bool = True


def init(decoder: "CANDecoder", storage: "Storage", esp32: "ESP32Client | None", mock: bool):
    global _decoder, _storage, _esp32, _mock_mode
    _decoder = decoder
    _storage = storage
    _esp32 = esp32
    _mock_mode = mock


# ── WebSocket broadcast manager ────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self._clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._clients.append(ws)
        logger.info(f"WS client connected ({len(self._clients)} total)")

    def disconnect(self, ws: WebSocket):
        if ws in self._clients:
            self._clients.remove(ws)
        logger.info(f"WS client disconnected ({len(self._clients)} remaining)")

    async def broadcast(self, payload: str):
        dead: list[WebSocket] = []
        for ws in list(self._clients):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)


manager = ConnectionManager()


# ── Background broadcast task ───────────────────────────────────────────────

async def broadcast_loop(interval: float = 0.2):
    """Broadcast VehicleSnapshot to all connected WebSocket clients."""
    while True:
        if _decoder is not None and manager.client_count > 0:
            snap = await _decoder.get_snapshot()
            await manager.broadcast(snap.model_dump_json())
        await asyncio.sleep(interval)


# ── REST endpoints ──────────────────────────────────────────────────────────

@app.get("/api/v1/health", response_model=HealthStatus)
async def health():
    frames = (_decoder.frame_count if _decoder else 0)
    return HealthStatus(
        status="ok",
        mode="mock" if _mock_mode else "live",
        esp32_connected=(_esp32.connected if _esp32 else False),
        frames_received=frames,
    )


@app.get("/api/v1/status", response_model=VehicleSnapshot)
async def status():
    if _decoder is None:
        raise HTTPException(503, "Decoder not initialized")
    return await _decoder.get_snapshot()


@app.get("/api/v1/history", response_model=list[HistoryPoint])
async def history(
    start: float = Query(default=None, description="Unix timestamp start"),
    end: float = Query(default=None, description="Unix timestamp end"),
    resolution: int = Query(default=60, description="Seconds between points"),
):
    if _storage is None:
        raise HTTPException(503, "Storage not initialized")
    now = time.time()
    t_end = end if end else now
    t_start = start if start else now - 3600
    return await _storage.query_history(t_start, t_end, resolution)


@app.post("/api/v1/write")
async def write_can(cmd: WriteCANCommand):
    """Send a CAN frame to the vehicle bus. Chassis bus writes are refused."""
    if cmd.bus != "vehicle":
        raise HTTPException(400, "Writes to the chassis bus are not permitted")
    if _mock_mode:
        logger.info(f"Mock write: id=0x{cmd.id:X} data={cmd.data}")
        return {"ok": True, "mode": "mock"}
    if _esp32 is None or not _esp32.connected:
        raise HTTPException(503, "ESP32 not connected")
    await _esp32.send_write_command(cmd)
    return {"ok": True}


@app.post("/api/v1/settings")
async def update_settings(host: str, port: int = 81):
    """Update ESP32 connection settings at runtime (takes effect on next reconnect)."""
    if _esp32 is not None:
        _esp32.update_host(host, port)
    return {"ok": True}


# ── WebSocket endpoint ──────────────────────────────────────────────────────

@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; client sends periodic pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
