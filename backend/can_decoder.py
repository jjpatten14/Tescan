from __future__ import annotations
import asyncio
import time
import logging
from typing import Optional
import cantools

from models import RawCANFrame, DecodedSignal, VehicleSnapshot

logger = logging.getLogger(__name__)

# Rated range for 2018 Model 3 Long Range in km (used for range estimation fallback)
_MODEL3_RATED_RANGE_KM = 499.0

# BMS_chargeStatus enum values
_CHARGE_STATUS = {0: "idle", 1: "ac", 2: "dc", 3: "dc"}


class CANDecoder:
    def __init__(self, dbc_paths: list[str]):
        self.db = cantools.db.Database()
        for path in dbc_paths:
            try:
                self.db.add_dbc_file(path)
                logger.info(f"Loaded DBC: {path} ({len(self.db.messages)} messages)")
            except Exception as e:
                logger.error(f"Failed to load DBC {path}: {e}")
                raise

        # Mutable signal state: signal_name -> (value, timestamp)
        self._state: dict[str, tuple[float, float]] = {}
        self._lock = asyncio.Lock()
        self._frame_count = 0

    async def decode_frame(self, frame: RawCANFrame) -> list[DecodedSignal]:
        try:
            data_bytes = bytes.fromhex(frame.data)
        except ValueError:
            logger.warning(f"Invalid hex data in frame id=0x{frame.id:X}: {frame.data}")
            return []

        try:
            msg = self.db.get_message_by_frame_id(frame.id)
        except KeyError:
            return []  # unknown frame, silently drop

        try:
            decoded = msg.decode(data_bytes, decode_choices=False)
        except Exception as e:
            logger.debug(f"Decode error frame 0x{frame.id:X}: {e}")
            return []

        signals: list[DecodedSignal] = []
        async with self._lock:
            self._frame_count += 1
            for name, value in decoded.items():
                try:
                    fval = float(value)
                except (TypeError, ValueError):
                    continue
                self._state[name] = (fval, frame.ts)
                sig_def = msg.get_signal_by_name(name)
                unit = sig_def.unit or ""
                signals.append(DecodedSignal(name=name, value=fval, unit=unit, ts=frame.ts))

        return signals

    async def get_snapshot(self) -> VehicleSnapshot:
        async with self._lock:
            return self._build_snapshot()

    def _build_snapshot(self) -> VehicleSnapshot:
        def g(key: str) -> Optional[float]:
            entry = self._state.get(key)
            return entry[0] if entry else None

        soc = g("BMS_uiSoc")
        speed_mph = g("UI_vehicleSpeed") or g("DI_vehicleSpeed")
        speed_kmh = round(speed_mph * 1.60934, 1) if speed_mph is not None else None
        torque = g("DIF_torqueActual")
        batt_min = g("BMS_minBattTemperature")
        batt_max = g("BMS_maxBattTemperature")
        odometer = g("DI_odometer")
        hvac_raw = g("VCFRONT_hvacOn")
        cabin_temp = g("VCFRONT_cabinTemp")
        charge_status_raw = g("BMS_chargeStatus")
        max_discharge = g("BMS_maxDischargePower")

        # Instantaneous power: P(kW) = T(Nm) × ω_motor(rad/s) / 1000
        # ω_motor = v_vehicle(m/s) × gear_ratio / r_wheel
        # Model 3 LR single-motor: gear_ratio=9.034, r_wheel=0.334 m
        # Positive torque = drive/discharge; negative = regen
        power_kw: Optional[float] = None
        if torque is not None and speed_mph is not None:
            speed_ms = speed_mph * 0.44704
            omega_motor = speed_ms * 9.034 / 0.334
            power_kw = torque * omega_motor / 1000.0

        # Range estimation: use rated range × SOC if no direct signal
        estimated_range_km: Optional[float] = None
        if soc is not None:
            estimated_range_km = round(_MODEL3_RATED_RANGE_KM * soc / 100.0, 1)

        # Charging state — charge_rate_kw requires a dedicated charging power signal
        # not present in this DBC revision; left as None until validated signal is added
        charging_state: Optional[str] = None
        charge_rate_kw: Optional[float] = None
        if charge_status_raw is not None:
            charging_state = _CHARGE_STATUS.get(int(charge_status_raw), "idle")

        # Door status
        doors: Optional[dict] = None
        door_signals = {
            "front_left": g("VCLEFT_frontDoorOpen"),
            "rear_left": g("VCLEFT_rearDoorOpen"),
            "trunk": g("VCLEFT_trunkOpen"),
            "front_right": g("VCRIGHT_frontDoorOpen"),
            "rear_right": g("VCRIGHT_rearDoorOpen"),
            "frunk": g("VCRIGHT_frunkOpen"),
        }
        if any(v is not None for v in door_signals.values()):
            doors = {k: bool(v) for k, v in door_signals.items() if v is not None}

        return VehicleSnapshot(
            ts=time.time(),
            soc=round(soc, 1) if soc is not None else None,
            speed_mph=round(speed_mph, 1) if speed_mph is not None else None,
            speed_kmh=speed_kmh,
            power_kw=round(power_kw, 2) if power_kw is not None else None,
            battery_temp_min=round(batt_min, 1) if batt_min is not None else None,
            battery_temp_max=round(batt_max, 1) if batt_max is not None else None,
            estimated_range_km=estimated_range_km,
            charging_state=charging_state,
            charge_rate_kw=round(charge_rate_kw, 2) if charge_rate_kw is not None else None,
            odometer_km=round(odometer, 1) if odometer is not None else None,
            hvac_on=bool(hvac_raw) if hvac_raw is not None else None,
            cabin_temp=round(cabin_temp, 1) if cabin_temp is not None else None,
            doors=doors,
            torque_nm=round(torque, 1) if torque is not None else None,
        )

    @property
    def frame_count(self) -> int:
        return self._frame_count
