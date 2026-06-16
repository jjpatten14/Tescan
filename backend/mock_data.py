from __future__ import annotations
import asyncio
import math
import time
import logging
from typing import Callable, Awaitable
import cantools

from models import RawCANFrame

logger = logging.getLogger(__name__)


class MockCANSource:
    """
    Generates synthetic raw CAN frames encoded with cantools so the full
    decode pipeline runs identically to real hardware. Simulates a drive
    cycle followed by a charge cycle.
    """

    def __init__(self, db: cantools.db.Database, tick_rate: float = 0.05):
        self._db = db
        self._tick = tick_rate
        self._running = False

        # Simulated vehicle state
        self._soc = 72.0          # %
        self._speed = 0.0         # mph
        self._torque = 0.0        # Nm
        self._batt_temp_min = 22.0
        self._batt_temp_max = 26.0
        self._odometer = 24500.0  # km
        self._hvac_on = True
        self._cabin_temp = 21.5
        self._charging = False
        self._charge_kw = 0.0
        self._cycle_t = 0.0       # seconds into current cycle

    async def run(self, callback: Callable[[RawCANFrame], Awaitable[None]]):
        self._running = True
        logger.info("Mock CAN source started")
        while self._running:
            self._update_simulation()
            frames = self._encode_current_state()
            for frame in frames:
                await callback(frame)
            await asyncio.sleep(self._tick)

    def stop(self):
        self._running = False

    def _update_simulation(self):
        self._cycle_t += self._tick
        t = self._cycle_t

        # 120s drive cycle then 60s charge cycle, repeat
        cycle_len = 180.0
        phase = t % cycle_len

        if phase < 120.0:
            # Drive: sinusoidal speed profile 0→60→0 mph
            self._charging = False
            self._charge_kw = 0.0
            self._speed = max(0.0, 60.0 * math.sin(math.pi * phase / 120.0))
            # Torque proportional to speed change
            self._torque = 150.0 * math.sin(math.pi * phase / 60.0)
            # SOC drains ~0.3% per tick at highway speed
            drain = 0.0003 * (self._speed / 60.0)
            self._soc = max(0.0, self._soc - drain)
            self._batt_temp_max = 26.0 + 8.0 * (self._speed / 60.0)
            self._odometer += self._speed * 1.60934 * self._tick / 3600.0
        else:
            # Charge phase
            self._speed = 0.0
            self._torque = 0.0
            self._charging = True
            self._charge_kw = 11.5  # AC Level 2
            self._soc = min(100.0, self._soc + 0.04)  # ~0.04% per tick
            self._batt_temp_max = max(26.0, self._batt_temp_max - 0.01)

    def _encode_current_state(self) -> list[RawCANFrame]:
        frames: list[RawCANFrame] = []
        ts = time.time()

        def encode(msg_name: str, signals: dict, bus: str = "vehicle") -> RawCANFrame | None:
            try:
                msg = self._db.get_message_by_name(msg_name)
                data = msg.encode(signals, padding=True)
                return RawCANFrame(id=msg.frame_id, data=data.hex(), bus=bus, ts=ts)
            except Exception as e:
                logger.debug(f"Mock encode failed for {msg_name}: {e}")
                return None

        candidates = [
            encode("BMS_socStatus", {"BMS_uiSoc": round(self._soc, 1), "BMS_hvacMaxV": 390.0}),
            encode("UI_vehicleSpeed", {
                "UI_vehicleSpeed": round(self._speed, 1),
                "UI_vehicleSpeedValid": 1,
                "UI_prndState": 4 if self._speed > 0 else 0,
            }),
            encode("BMS_thermalStatus", {
                "BMS_minBattTemperature": round(self._batt_temp_min, 1),
                "BMS_maxBattTemperature": round(self._batt_temp_max, 1),
                "BMS_battRawAvgTemperature": round((self._batt_temp_min + self._batt_temp_max) / 2, 1),
            }),
            encode("DIF_torque", {
                "DIF_torqueActual": round(self._torque, 1),
                "DIF_torqueDesired": round(self._torque, 1),
            }),
            encode("BMS_powerAvailable", {
                "BMS_maxRegenPower": 50.0,
                "BMS_maxDischargePower": round(self._charge_kw if self._charging else abs(self._torque * self._speed * 0.001), 2),
            }),
            encode("BMS_status", {
                "BMS_chargeStatus": 1 if self._charging else 0,
                "BMS_contactorState": 5 if not self._charging else 6,
                "BMS_chargeLineVoltage": 240.0 if self._charging else 0.0,
            }),
            encode("DI_odometer", {"DI_odometer": round(self._odometer, 3)}),
            # Chassis bus frames
            encode("VCFRONT_hvacRequest", {
                "VCFRONT_hvacOn": 1 if self._hvac_on else 0,
                "VCFRONT_cabinTemp": self._cabin_temp,
            }, bus="chassis"),
            encode("VCLEFT_doorStatus", {
                "VCLEFT_frontDoorOpen": 0,
                "VCLEFT_rearDoorOpen": 0,
                "VCLEFT_trunkOpen": 0,
            }, bus="chassis"),
            encode("VCRIGHT_doorStatus", {
                "VCRIGHT_frontDoorOpen": 0,
                "VCRIGHT_rearDoorOpen": 0,
                "VCRIGHT_frunkOpen": 0,
            }, bus="chassis"),
        ]

        frames = [f for f in candidates if f is not None]
        return frames
