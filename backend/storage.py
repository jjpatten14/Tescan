from __future__ import annotations
import asyncio
import logging
import time
import aiosqlite

from models import VehicleSnapshot, HistoryPoint

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS vehicle_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ts              REAL    NOT NULL,
    soc             REAL,
    speed_mph       REAL,
    power_kw        REAL,
    battery_temp_min REAL,
    battery_temp_max REAL,
    charging_state  TEXT,
    charge_rate_kw  REAL,
    odometer_km     REAL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON vehicle_snapshots(ts);

CREATE TABLE IF NOT EXISTS raw_frames (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      REAL    NOT NULL,
    can_id  INTEGER NOT NULL,
    data    TEXT    NOT NULL,
    bus     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_frames_ts ON raw_frames(ts);
"""


class Storage:
    def __init__(self, db_path: str, retention_days: int = 30):
        self._path = db_path
        self._retention_days = retention_days
        self._db: aiosqlite.Connection | None = None
        self._last_snapshot_ts: float = 0.0
        self._snapshot_interval: float = 1.0  # write at most 1 snapshot/sec

    async def init(self):
        self._db = await aiosqlite.connect(self._path)
        self._db.row_factory = aiosqlite.Row
        await self._db.executescript(_SCHEMA)
        await self._db.commit()
        logger.info(f"Storage initialized: {self._path}")

    async def log_snapshot(self, snap: VehicleSnapshot):
        now = time.time()
        if now - self._last_snapshot_ts < self._snapshot_interval:
            return
        self._last_snapshot_ts = now

        await self._db.execute(
            """INSERT INTO vehicle_snapshots
               (ts, soc, speed_mph, power_kw, battery_temp_min, battery_temp_max,
                charging_state, charge_rate_kw, odometer_km)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (snap.ts, snap.soc, snap.speed_mph, snap.power_kw,
             snap.battery_temp_min, snap.battery_temp_max,
             snap.charging_state, snap.charge_rate_kw, snap.odometer_km),
        )
        await self._db.commit()

    async def query_history(
        self, start: float, end: float, resolution: int = 60
    ) -> list[HistoryPoint]:
        """Return downsampled history points between start and end (Unix timestamps)."""
        async with self._db.execute(
            """SELECT ts, soc, power_kw, speed_mph, battery_temp_max
               FROM vehicle_snapshots
               WHERE ts BETWEEN ? AND ?
               ORDER BY ts ASC""",
            (start, end),
        ) as cursor:
            rows = await cursor.fetchall()

        if not rows:
            return []

        # Downsample: keep one point per `resolution` seconds
        result: list[HistoryPoint] = []
        last_kept_ts = -float("inf")
        for row in rows:
            if row["ts"] - last_kept_ts >= resolution:
                result.append(HistoryPoint(
                    ts=row["ts"],
                    soc=row["soc"],
                    power_kw=row["power_kw"],
                    speed_mph=row["speed_mph"],
                    battery_temp_max=row["battery_temp_max"],
                ))
                last_kept_ts = row["ts"]

        return result

    async def purge_old_data(self):
        cutoff = time.time() - self._retention_days * 86400
        await self._db.execute("DELETE FROM vehicle_snapshots WHERE ts < ?", (cutoff,))
        await self._db.execute("DELETE FROM raw_frames WHERE ts < ?", (cutoff,))
        await self._db.commit()
        logger.info("Old data purged")

    async def close(self):
        if self._db:
            await self._db.close()
