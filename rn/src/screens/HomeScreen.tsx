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

// ── Efficiency delta bar ──────────────────────────────────────────────────────
// Shows how many miles your driving habits are adding or costing vs. rated range.
// Bar extends RIGHT (green) for gains, LEFT (amber) for losses from a center zero line.
const MAX_DELTA_MI = 40; // ± 40 miles = full bar extent

function EfficiencyDeltaBar({ predictiveMiles, ratedMiles }: {
  predictiveMiles: number;
  ratedMiles: number;
}) {
  const delta      = predictiveMiles - ratedMiles;
  const isGain     = delta >= 0;
  const absDelta   = Math.abs(delta);
  const fillPct    = Math.min(1, absDelta / MAX_DELTA_MI) * 100;
  const barColor   = isGain ? T.green : T.amber;
  const sign       = isGain ? '+' : '−';
  const verb       = isGain ? 'habits adding range' : 'habits costing range';

  return (
    <View style={d.wrap}>
      {/* Zero-centered bar */}
      <View style={d.track}>
        {/* Left half — fills from right edge toward center when losing */}
        <View style={d.half}>
          {!isGain && (
            <View style={[d.fill, {
              width: `${fillPct}%` as any,
              backgroundColor: barColor,
              alignSelf: 'flex-end',
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
            }]} />
          )}
        </View>

        {/* Center divider */}
        <View style={d.center} />

        {/* Right half — fills from left edge toward right when gaining */}
        <View style={d.half}>
          {isGain && (
            <View style={[d.fill, {
              width: `${fillPct}%` as any,
              backgroundColor: barColor,
              alignSelf: 'flex-start',
              borderTopRightRadius: 3,
              borderBottomRightRadius: 3,
            }]} />
          )}
        </View>
      </View>

      {/* Text below */}
      <View style={d.row}>
        <Text style={[d.delta, { color: barColor }]}>
          {sign}{Math.round(absDelta)} mi
        </Text>
        <Text style={d.verb}> · {verb}</Text>
      </View>
    </View>
  );
}

const d = StyleSheet.create({
  wrap: { width: '85%', alignSelf: 'center', marginTop: 2, marginBottom: 6, gap: 6 },
  track: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    gap: 0,
  },
  half: {
    flex: 1,
    backgroundColor: T.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  center: { width: 2, backgroundColor: T.mid },
  fill:   { height: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
  delta: { fontFamily: MONO, fontSize: 12, fontWeight: '700' },
  verb:  { fontFamily: DISP, fontSize: 11, color: T.lo },
});

// ── Home screen ───────────────────────────────────────────────────────────────
export function HomeScreen({ navigation }: any) {
  const { snap, settings, sendLockCmd, sendClimateCmd, sendChargeCmd, sendPortCmd } = useVehicleStore();
  const [locked,    setLocked]  = useState(true);
  const [climateOn, setClimate] = useState(false);
  const [portOpen,  setPort]    = useState(false);
  const [showMiles, setShowMiles] = useState(true);

  const soc      = snap.soc ?? 0;
  const charging = snap.charging_state !== 'idle' && snap.charging_state !== null;
  const low      = soc < 15;
  const ratedMiles = Math.round((soc / 100) * RATED_MILES);

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
    ? `${snap.battery_health_pct.toFixed(1)}%` : '—';

  const healthColor = snap.battery_health_pct === null ? T.mid
    : snap.battery_health_pct > 90 ? T.green
    : snap.battery_health_pct > 80 ? T.amber : T.red;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Hero — tap gauge to flip miles ↔ % ── */}
      <Pressable onPress={() => setShowMiles(m => !m)} style={s.hero}>
        <Gauge270
          level={soc}
          limit={settings.chargeLimit}
          charging={charging}
          low={low}
          showMiles={showMiles}
          predictiveMiles={snap.predictive_range_miles}
        />
      </Pressable>

      {/* ── Efficiency delta bar — only shown once rolling window has data ── */}
      {snap.predictive_range_miles !== null && (
        <EfficiencyDeltaBar
          predictiveMiles={Math.round(snap.predictive_range_miles)}
          ratedMiles={ratedMiles}
        />
      )}

      {/* Mini stats */}
      <View style={s.miniStats}>
        <Text style={s.miniTxt}>{snap.power_kw !== null ? `${snap.power_kw.toFixed(1)} kW` : '—'}</Text>
        <Text style={s.miniTxt}>{snap.avg_wh_per_mile !== null ? `${Math.round(snap.avg_wh_per_mile)} Wh/mi` : '—'}</Text>
        <Text style={s.miniTxt}>{tempStr}</Text>
        {energyStr && <Text style={s.miniTxt}>{energyStr}</Text>}
      </View>

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
            sub={energyStr ?? `${ratedMiles} mi`}
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
  hero:    { alignItems: 'center', paddingTop: 8 },
  miniStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  miniTxt: { fontFamily: MONO, fontSize: 12, color: T.mid },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 4,
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
