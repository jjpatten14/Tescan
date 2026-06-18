// Battery Health screen
// Baseline: 77.8 kWh — what ScanMyTesla reports as "full pack when new"
// for the 2018 Tesla Model 3 Long Range (community consensus).
// Source: https://teslamotorsclub.com/tmc/threads/smt-nominal-full-pack-tracking.186847/

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, G, Text as ST, Line } from 'react-native-svg';
import { Battery, Zap, Thermometer, TrendingDown, Activity, Shield } from 'lucide-react-native';
import { Panel } from '../components/Panel';
import { Stat } from '../components/Stat';
import { useVehicleStore } from '../store/vehicleStore';
import { T, MONO, DISP } from '../theme';

const FULL_PACK_WHEN_NEW = 77.8; // kWh — 2018 Model 3 LR baseline

// Community degradation reference points (TMC forum data, ~1000 vehicles)
const COMMUNITY_CURVE = [
  { miles: 0,      pct: 100 },
  { miles: 10000,  pct: 97  },
  { miles: 30000,  pct: 95  },
  { miles: 50000,  pct: 93  },
  { miles: 75000,  pct: 91  },
  { miles: 100000, pct: 89  },
  { miles: 150000, pct: 86  },
];

function healthColor(pct: number | null): string {
  if (pct === null) return T.mid;
  if (pct > 90) return T.green;
  if (pct > 80) return T.amber;
  return T.red;
}

function healthLabel(pct: number | null): string {
  if (pct === null) return 'Unknown';
  if (pct > 95) return 'Excellent';
  if (pct > 90) return 'Good';
  if (pct > 85) return 'Fair';
  if (pct > 80) return 'Degraded';
  return 'Poor';
}

function cToF(c: number) { return Math.round(c * 9 / 5 + 32); }

// Simple bar chart showing health % vs community average at same mileage
function HealthBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(1, value / max);
  return (
    <View style={bs.barWrap}>
      <Text style={bs.barLabel}>{label}</Text>
      <View style={bs.barTrack}>
        <View style={[bs.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[bs.barVal, { color }]}>{value.toFixed(1)} kWh</Text>
    </View>
  );
}

export function BatteryHealthScreen() {
  const { snap } = useVehicleStore();

  const fullPackKwh   = snap.full_pack_kwh;
  const energyRemKwh  = snap.energy_remaining_kwh;
  const healthPct     = snap.battery_health_pct;
  const odomMi        = snap.odometer_km !== null ? snap.odometer_km / 1.60934 : null;

  const degradedKwh   = fullPackKwh !== null ? FULL_PACK_WHEN_NEW - fullPackKwh : null;
  const color         = healthColor(healthPct);
  const label         = healthLabel(healthPct);

  // Find community expected health at current mileage
  let communityExpectedPct: number | null = null;
  if (odomMi !== null) {
    for (let i = 0; i < COMMUNITY_CURVE.length - 1; i++) {
      const a = COMMUNITY_CURVE[i]!;
      const b = COMMUNITY_CURVE[i + 1]!;
      if (odomMi >= a.miles && odomMi <= b.miles) {
        const t = (odomMi - a.miles) / (b.miles - a.miles);
        communityExpectedPct = a.pct + t * (b.pct - a.pct);
        break;
      }
    }
    if (communityExpectedPct === null && odomMi > 150000) communityExpectedPct = 85;
  }
  const communityExpectedKwh = communityExpectedPct !== null
    ? (communityExpectedPct / 100) * FULL_PACK_WHEN_NEW
    : null;

  // Wh/mile efficiency label
  const avgWh = snap.avg_wh_per_mile;
  const effLabel = avgWh !== null ? `${Math.round(avgWh)} Wh/mi` : '—';
  const effMiPerKwh = avgWh !== null ? (1000 / avgWh).toFixed(2) : '—';

  return (
    <ScrollView style={bs.scroll} contentContainerStyle={bs.content} showsVerticalScrollIndicator={false}>

      {/* ── Big health number ── */}
      <Panel style={bs.heroPanel}>
        <Text style={[bs.heroNum, { color }]}>
          {healthPct !== null ? `${healthPct.toFixed(1)}%` : '—'}
        </Text>
        <Text style={[bs.heroLabel, { color }]}>{label}</Text>
        <Text style={bs.heroSub}>
          {fullPackKwh !== null
            ? `${fullPackKwh.toFixed(2)} kWh of ${FULL_PACK_WHEN_NEW} kWh original`
            : 'Waiting for frame 0x352…'}
        </Text>
        {degradedKwh !== null && degradedKwh > 0 && (
          <Text style={bs.heroDeg}>
            −{degradedKwh.toFixed(2)} kWh lost ({((degradedKwh / FULL_PACK_WHEN_NEW) * 100).toFixed(1)}% degradation)
          </Text>
        )}
      </Panel>

      {/* ── Capacity bars ── */}
      {fullPackKwh !== null && (
        <Panel style={bs.barsPanel}>
          <Text style={bs.sectionTitle}>PACK CAPACITY</Text>
          <HealthBar label="New (2018)"    value={FULL_PACK_WHEN_NEW}      max={FULL_PACK_WHEN_NEW} color={T.mid} />
          {communityExpectedKwh !== null && (
            <HealthBar label={`Avg at ${Math.round(odomMi ?? 0).toLocaleString()} mi`}
              value={communityExpectedKwh} max={FULL_PACK_WHEN_NEW} color={T.amber} />
          )}
          <HealthBar label="Your car now"  value={fullPackKwh}             max={FULL_PACK_WHEN_NEW} color={color} />
          {energyRemKwh !== null && (
            <HealthBar label="Remaining now" value={energyRemKwh}          max={FULL_PACK_WHEN_NEW} color={T.cyan} />
          )}
        </Panel>
      )}

      {/* ── Stat grid ── */}
      <View style={bs.statGrid}>
        <Stat icon={<Shield   size={20} color={color} />}
          label="HEALTH"   value={healthPct !== null ? `${healthPct.toFixed(1)}%` : '—'} accent={color} />
        <Stat icon={<Battery  size={20} color={T.mid} />}
          label="FULL PACK NOW"  value={fullPackKwh !== null ? `${fullPackKwh.toFixed(2)} kWh` : '—'} />
        <Stat icon={<Zap      size={20} color={T.cyan} />}
          label="ENERGY REMAINING" value={energyRemKwh !== null ? `${energyRemKwh.toFixed(2)} kWh` : '—'} accent={T.cyan} />
        <Stat icon={<TrendingDown size={20} color={T.amber} />}
          label="DEGRADATION"  value={degradedKwh !== null && degradedKwh > 0 ? `−${degradedKwh.toFixed(2)} kWh` : 'None yet'} accent={T.amber} />
        <Stat icon={<Activity size={20} color={T.mid} />}
          label="EFFICIENCY (30 mi avg)" value={effLabel} />
        <Stat icon={<Activity size={20} color={T.mid} />}
          label="MILES / kWh"  value={effMiPerKwh} />
        <Stat icon={<Thermometer size={20} color={T.mid} />}
          label="BATTERY TEMP"
          value={snap.battery_temp_min !== null && snap.battery_temp_max !== null
            ? `${cToF(snap.battery_temp_min)}–${cToF(snap.battery_temp_max)}°F`
            : '—'} />
        <Stat icon={<Shield size={20} color={T.mid} />}
          label="ORIGINAL BASELINE" value={`${FULL_PACK_WHEN_NEW} kWh`} />
      </View>

      {/* ── Community context note ── */}
      <Panel style={bs.notePanel}>
        <Text style={bs.sectionTitle}>REFERENCE</Text>
        <Text style={bs.noteTxt}>
          Baseline is 77.8 kWh — what the BMS reports when new on a 2018 Model 3 Long Range,
          per ScanMyTesla community data. Typical degradation: 3–5% in the first 10k miles,
          5–8% by 50k miles, 10–15% by 100k miles.
        </Text>
        <Text style={bs.noteWarn}>
          Battery health requires frame 0x352 from the CAN bus. Validate bit positions
          against your specific firmware before trusting values.
        </Text>
      </Panel>
    </ScrollView>
  );
}

const bs = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },

  heroPanel: { padding: 24, alignItems: 'center', gap: 6 },
  heroNum:   { fontFamily: MONO, fontSize: 64, fontWeight: '700' },
  heroLabel: { fontFamily: DISP, fontSize: 18, fontWeight: '600' },
  heroSub:   { fontFamily: DISP, fontSize: 13, color: T.mid, textAlign: 'center' },
  heroDeg:   { fontFamily: MONO, fontSize: 12, color: T.amber, marginTop: 4 },

  barsPanel: { padding: 20, gap: 14 },
  sectionTitle: { fontFamily: DISP, fontSize: 11, letterSpacing: 2, color: T.lo, marginBottom: 4 },

  barWrap:  { gap: 6 },
  barLabel: { fontFamily: DISP, fontSize: 12, color: T.mid },
  barTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: T.border,
    overflow: 'hidden',
  },
  barFill:  { height: 8, borderRadius: 4 },
  barVal:   { fontFamily: MONO, fontSize: 12, textAlign: 'right' },

  statGrid: { gap: 20 },

  notePanel: { padding: 20, gap: 10 },
  noteTxt:   { fontFamily: DISP, fontSize: 13, color: T.mid, lineHeight: 20 },
  noteWarn:  { fontFamily: DISP, fontSize: 12, color: T.amber, lineHeight: 18 },
});
