from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class RawCANFrame(BaseModel):
    id: int
    data: str       # hex string, e.g. "0102030405060708"
    bus: str        # "vehicle" | "chassis"
    ts: float       # Unix timestamp with ms precision


class WriteCANCommand(BaseModel):
    bus: str        # only "vehicle" accepted
    id: int
    data: str       # hex string


class DecodedSignal(BaseModel):
    name: str
    value: float
    unit: str
    ts: float


class VehicleSnapshot(BaseModel):
    ts: float
    soc: Optional[float] = None               # %
    speed_mph: Optional[float] = None
    speed_kmh: Optional[float] = None
    power_kw: Optional[float] = None          # positive = discharge, negative = regen
    battery_temp_min: Optional[float] = None  # degC
    battery_temp_max: Optional[float] = None  # degC
    estimated_range_km: Optional[float] = None
    charging_state: Optional[str] = None      # "idle" | "ac" | "dc"
    charge_rate_kw: Optional[float] = None
    odometer_km: Optional[float] = None
    hvac_on: Optional[bool] = None
    cabin_temp: Optional[float] = None        # degC
    doors: Optional[dict] = None
    torque_nm: Optional[float] = None


class HistoryPoint(BaseModel):
    ts: float
    soc: Optional[float] = None
    power_kw: Optional[float] = None
    speed_mph: Optional[float] = None
    battery_temp_max: Optional[float] = None


class HealthStatus(BaseModel):
    status: str
    mode: str           # "mock" | "live"
    esp32_connected: bool
    frames_received: int
