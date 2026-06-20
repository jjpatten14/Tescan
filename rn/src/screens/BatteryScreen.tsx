import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import {
  Battery, Route, Zap, ZapOff, Thermometer, Activity, Power, TrendingUp, Ghost,
} from 'lucide-react-native';
import { Gauge270 } from '../components/Gauge270';
import { Stat } from '../components/Stat';
import { Panel } from '../components/Panel';
import { useVehicleStore } from '../store/vehicleStore';
import { T, DISP, MONO, RATED_MILES } from '../theme';

function cToF(c: number) { return Math.round(c * 9 / 5 + 32); }

export function BatteryScreen() {
  const { snap, settings, setChargeLimit, sendChargeCmd } = useVehicleStore();

  const soc      = snap.soc ?? 0;
  const charging = snap.charging_state !== 'idle' && snap.charging_state !== null;
  const low      = soc < 15;
  const rangeMi  = snap.estimated_range_km !== null
    ? Math.round(snap.estimated_range_km / 1.60934)
    : Math.round((soc / 100) * RATED_MILES);
  const limitMi  = Math.round((settings.chargeLimit / 100) * RATED_MILES);

  const tempStr = snap.battery_temp_min !== null && snap.battery_temp_max !== null
    ? `${cToF(snap.battery_temp_min)}–${cToF(snap.battery_temp_max)}°F`
    : '—°F';

  const ampsStr = '—'; // Amperage not available via CAN

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.gaugeWrap}>
        <Gauge270 level={soc} limit={settings.chargeLimit} charging={charging} low={low}
          showMiles={false} predictiveMiles={snap.predictive_range_miles} />
      </View>

      <View style={s.grid}>
        <Stat icon={<Battery size={20} color={T.cyan} />} label="LEVEL"
          value={`${Math.round(soc)}%`} accent={T.cyan} />
        <Stat icon={<Route size={20} color={T.mid} />} label="RANGE"
          value={`${rangeMi} mi`} />
        <Stat icon={<Ghost size={20} color={T.mid} />} label="DRAIN"
          value="—" />
        <Stat icon={<Zap size={20} color={charging ? T.amber : T.mid} />} label="POWER"
          value={snap.power_kw !== null ? `${snap.power_kw.toFixed(1)} kW` : '— kW'}
          accent={charging ? T.amber : T.mid} />
        <Stat icon={<Thermometer size={20} color={T.mid} />} label="TEMPERATURE"
          value={tempStr} />
        <Stat icon={<Activity size={20} color={charging ? T.amber : T.mid} />} label="AMPERAGE"
          value={ampsStr} accent={charging ? T.amber : T.mid} />
        <Stat icon={<Power size={20} color={T.mid} />} label="TORQUE"
          value={snap.torque_nm !== null ? `${Math.round(snap.torque_nm)} Nm` : '— Nm'} />
        <Stat icon={<TrendingUp size={20} color={T.mid} />} label="ODOMETER"
          value={snap.odometer_km !== null
            ? `${Math.round(snap.odometer_km / 1.60934).toLocaleString()} mi`
            : '—'} />
      </View>

      <Panel style={s.limitPanel}>
        <View style={s.limitRow}>
          <Text style={s.limitLabel}>CHARGE LIMIT</Text>
          <Text style={s.limitVal}>{limitMi} mi · {settings.chargeLimit}%</Text>
        </View>
        <Slider
          style={{ width: '100%', marginTop: 16 }}
          minimumValue={50} maximumValue={100} step={1}
          value={settings.chargeLimit}
          onValueChange={setChargeLimit}
          minimumTrackTintColor={T.cyan}
          maximumTrackTintColor={T.border}
          thumbTintColor={T.cyan}
        />
      </Panel>

      <Pressable onPress={() => sendChargeCmd(!charging)}
        style={({ pressed }) => [s.chargeBtn, pressed && { opacity: 0.85 },
          charging && { backgroundColor: T.panel, borderWidth: 1, borderColor: T.amber }]}>
        {charging
          ? <><ZapOff size={20} color={T.amber} /><Text style={[s.chargeTxt, { color: T.amber }]}>  Stop charging</Text></>
          : <><Zap   size={20} color={T.ink}   /><Text style={[s.chargeTxt, { color: T.ink }]}>  Start charging</Text></>
        }
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  gaugeWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  grid: { gap: 20, marginBottom: 24 },
  limitPanel: { padding: 20, marginBottom: 20 },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limitLabel: { fontFamily: DISP, fontSize: 13, color: T.mid },
  limitVal:   { fontFamily: MONO, color: T.hi },
  chargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.cyan,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  chargeTxt: { fontFamily: DISP, fontWeight: '600', fontSize: 16 },
});
