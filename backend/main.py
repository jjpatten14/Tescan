from __future__ import annotations
import asyncio
import logging
import sys
from pathlib import Path

import uvicorn
import yaml

from can_decoder import CANDecoder
from storage import Storage
from esp32_client import ESP32Client
from mock_data import MockCANSource
import api as app_module

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("tescan.main")


def load_config(path: str = "config.yaml") -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


async def _main():
    cfg = load_config()

    # ── Storage ──────────────────────────────────────────────────────────────
    storage = Storage(
        db_path=cfg["storage"]["db_path"],
        retention_days=cfg["storage"]["retention_days"],
    )
    await storage.init()

    # ── DBC + Decoder ────────────────────────────────────────────────────────
    dbc_paths = [str(Path(__file__).parent / p) for p in cfg["dbc"]["paths"]]
    decoder = CANDecoder(dbc_paths)

    async def on_frame(frame):
        await decoder.decode_frame(frame)

    # ── CAN Source ───────────────────────────────────────────────────────────
    mock_mode: bool = cfg["mock"]["enabled"]
    esp32_client: ESP32Client | None = None

    if mock_mode:
        logger.info("Starting in MOCK mode — no hardware required")
        mock_source = MockCANSource(decoder.db, tick_rate=cfg["mock"]["tick_rate"])
        asyncio.create_task(mock_source.run(on_frame))
    else:
        logger.info(f"Connecting to ESP32 at {cfg['esp32']['host']}:{cfg['esp32']['port']}")
        esp32_client = ESP32Client(
            host=cfg["esp32"]["host"],
            port=cfg["esp32"]["port"],
            frame_callback=on_frame,
            reconnect_interval=cfg["esp32"]["reconnect_interval"],
        )
        asyncio.create_task(esp32_client.run())

    # ── Wire into FastAPI ────────────────────────────────────────────────────
    app_module.init(decoder, storage, esp32_client, mock_mode)

    # ── Background: snapshot logger + WebSocket broadcast ────────────────────
    async def snapshot_loop():
        while True:
            snap = await decoder.get_snapshot()
            await storage.log_snapshot(snap)
            await asyncio.sleep(1.0)

    asyncio.create_task(snapshot_loop())
    asyncio.create_task(app_module.broadcast_loop(interval=0.2))

    # Daily cleanup
    async def purge_loop():
        while True:
            await asyncio.sleep(86400)
            await storage.purge_old_data()

    asyncio.create_task(purge_loop())

    # ── Serve ────────────────────────────────────────────────────────────────
    server_cfg = cfg["server"]
    config = uvicorn.Config(
        app=app_module.app,
        host=server_cfg["host"],
        port=server_cfg["port"],
        log_level="info",
    )
    server = uvicorn.Server(config)
    logger.info(f"Tescan backend starting on {server_cfg['host']}:{server_cfg['port']}")
    await server.serve()


if __name__ == "__main__":
    asyncio.run(_main())
