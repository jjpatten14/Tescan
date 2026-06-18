import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  Lock, Unlock, Fan, Zap, ZapOff, CircleDot, Disc,
  MapPin, Thermometer, Battery, ShieldCheck, Route, Gauge,
} from 'lucide-react-native';
import { Gauge270 } from '../components/Gauge270';
import { ToggleCtl } from '../components/ToggleCtl';
import { Module } from '../components/Module';
import { useVehicleStore } from '../store/vehicleStore';
import { T, DISP, MONO, RATED_MILES } from '../theme';

function cToF(c: number) { return Math.round(c * 9 / 5 + 32); }

export function HomeScreen({ navigation }: any) {
  const { snap, settings, sendLockCmd, sendClimateCmd, sendChargeCmd, sendPortCmd } = useVehicleStore();
  const [locked,    setLocked]  = useState(true);
  const [climateOn, setClimate] = useState(false);
  const [portOpen,  setPort]    = useState(false);
  // Default: show predicted miles. Tap gauge to flip to SOC %.
  const [showMiles, setShowMiles] = useState(true);

  const soc      = snap.soc ?? 0;
  const charging = snap.charging_state !== 'idle' && snap.charging_state !== null;
  const low      = soc < 15;

  const energyStr = snap.energy_remaining_kwh !== null
    ? `${snap.energy_remaining_kwh.toFixed(1)} kWh`
    : snap.full_pack_kwh !== null
      ? `~${((soc / 100) * snap.full_pack_kwh).toFixed(1)} kWh`
      : null;

  const odomStr = snap.odometer_km !== null
    ? `${Math.round(snap.odometer_km / 1.60934).toLocaleString()} mi`
    : '—';

  const tempStr = snap.battery_temp_min !== null && snap.battery_temp_max !== null
    ? `${cToF(snap.battery_temp_min)}–${cToF(snap.battery_temp_max)}°F`
    : '—';

  const healthStr = snap.battery_health_pct !== null
    ? `${snap.battery_health_pct.toFixed(1)}%`
    : '—';

  const healthColor = snap.battery_health_pct === null ? T.mid
    : snap.battery_health_pct > 90 ? T.green
    : snap.battery_health_pct > 80 ? T.amber
    : T.red;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Hero — tap anywhere on gauge to flip miles ↔ % ── */}
      <Pressable onPress={() => setShowMiles(m => !m)} style={s.hero}>
        <Gauge270
          level={soc}
          limit={settings.chargeLimit}
          charging={charging}
          low={low}
          showMiles={showMiles}
          predictiveMiles={snap.predictive_range_miles}
        />
        {/* Mini stats row below gauge */}
        <View style={s.miniStats}>
          <Text style={s.miniTxt}>{snap.power_kw !== null ? `${snap.power_kw.toFixed(1)} kW` : '—'}</Text>
          <Text style={s.miniTxt}>{snap.avg_wh_per_mile !== null ? `${Math.round(snap.avg_wh_per_mile)} Wh/mi` : '—'}</Text>
          <Text style={s.miniTxt}>{tempStr}</Text>
        </View>
        {energyStr && (
          <Text style={s.energyTxt}>{energyStr}</Text>
        )}
      </Pressable>

      {/* ── Quick controls ── */}
      <View style={s.controls}>
        <ToggleCtl
          icon={locked ? <Lock size={22} color={T.cyan} /> : <Unlock size={22} color={T.mid} />}
          label={locked ? 'Locked' : 'Unlocked'} active={locked}
          onPress={() => { sendLockCmd(!locked); setLocked(l => !l); }} />
        <ToggleCtl
          icon={<Fan size={22} color={climateOn ? T.cyan : T.mid} />}
          label="Climate" active={climateOn}
          onPress={() => { sendClimateCmd(!climateOn, 72); setClimate(c => !c); }} />
        <ToggleCtl
          icon={charging ? <ZapOff size={22} color={T.amber} /> : <Zap size={22} color={T.mid} />}
          label={charging ? 'Stop' : 'Charge'} active={charging} activeColor={T.amber}
          onPress={() => sendChargeCmd(!charging)} />
        <ToggleCtl
          icon={portOpen ? <CircleDot size={22} color={T.amber} /> : <Disc size={22} color={T.mid} />}
          label="Port" active={portOpen} activeColor={T.amber}
          onPress={() => { sendPortCmd(!portOpen); setPort(p => !p); }} />
      </View>

      {/* ── Address strip ── */}
      <View style={s.addrRow}>
        <MapPin size={18} color={T.cyan} />
        <Text style={s.addr}>421 Addison Rd</Text>
        <Text style={s.addrSub}>Parked</Text>
      </View>

      {/* ── Module grid ── */}
      <View style={s.grid}>
        <View style={s.gridCol}>
          <Module icon={<Thermometer size={22} color={climateOn ? T.cyan : T.mid} />}
            label="Climate" value={`${snap.cabin_temp !== null ? cToF(snap.cabin_temp) : '74'}°F`}
            sub={climateOn ? 'On' : 'Off'} accent={climateOn ? T.cyan : T.mid}
            onPress={() => navigation.navigate('Climate')} />
          <Module icon={<ShieldCheck size={22} color={healthColor} />}
            label="Batt. Health" value={healthStr} accent={healthColor}
            onPress={() => navigation.navigate('BatteryHealth')} />
          <Module icon={<Zap size={22} color={charging ? T.amber : T.mid} />}
            label="Charges" value={charging ? snap.charging_state!.toUpperCase() : '17h ago'}
            accent={charging ? T.amber : T.mid}
            onPress={() => navigation.navigate('Battery')} />
        </View>
        <View style={s.gridCol}>
          <Module icon={<Battery size={22} color={charging ? T.amber : T.cyan} />}
            label="Battery" value={`${Math.round(soc)}%`}
            sub={energyStr ?? `${Math.round((soc / 100) * RATED_MILES)} mi`}
            accent={charging ? T.amber : T.cyan}
            onPress={() => navigation.navigate('Battery')} />
          <Module icon={<Route size={22} color={T.mid} />}
            label="Drives" value="5h ago"
            onPress={() => navigation.navigate('Log')} />
          <Module icon={<Gauge size={22} color={T.mid} />}
            label="Odometer" value={odomStr} />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { paddingBottom: 8 },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  miniStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: -4,
  },
  miniTxt: {
    fontFamily: MONO,
    fontSize: 12,
    color: T.mid,
  },
  energyTxt: {
    fontFamily: MONO,
    fontSize: 13,
    color: T.lo,
    marginTop: 4,
    marginBottom: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
  },
  addr:    { fontFamily: DISP, fontSize: 15, color: T.hi, flex: 1 },
  addrSub: { fontFamily: DISP, fontSize: 12, color: T.lo },
  grid:    { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 12 },
  gridCol: { flex: 1, gap: 12 },
});
