import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Minus, Plus, Snowflake, Disc, Wind, Armchair } from 'lucide-react-native';
import { Panel } from '../components/Panel';
import { ToggleCtl } from '../components/ToggleCtl';
import { useVehicleStore } from '../store/vehicleStore';
import { T, DISP, MONO } from '../theme';

const SEAT_COLORS = [T.lo, '#FF9F45', '#FF7A45', T.red] as const;

function SeatBtn({ label, level, onPress }: { label: string; level: number; onPress: () => void }) {
  const color = SEAT_COLORS[level] ?? T.lo;
  return (
    <Pressable onPress={onPress} style={s.seatWrap}>
      <View style={[s.seatIcon, level > 0 && { borderColor: color, backgroundColor: color + '22' }]}>
        <Armchair size={24} color={level > 0 ? color : T.mid} />
      </View>
      <Text style={s.seatLabel}>{label}</Text>
      <Text style={[s.seatLevel, { color: level ? color : T.lo }]}>
        {level === 0 ? 'off' : '·'.repeat(level)}
      </Text>
    </Pressable>
  );
}

export function ClimateScreen() {
  const { snap, sendClimateCmd } = useVehicleStore();
  const [climateOn, setClimate] = useState(false);
  const [target,    setTarget]  = useState(72);
  const [defrost,   setDefrost] = useState(false);
  const [wheel,     setWheel]   = useState(false);
  const [vent,      setVent]    = useState(false);
  const [seats,     setSeats]   = useState({ FL: 0, FR: 0, RL: 0, RR: 0 });

  const cabin = snap.cabin_temp !== null ? Math.round(snap.cabin_temp * 9 / 5 + 32) : 74;

  function cycleSeat(seat: keyof typeof seats) {
    setSeats(p => ({ ...p, [seat]: (p[seat]! + 1) % 4 }));
  }

  function toggleClimate() {
    const next = !climateOn;
    setClimate(next);
    sendClimateCmd(next, target);
  }

  function adjustTarget(delta: number) {
    const next = Math.max(60, Math.min(82, target + delta));
    setTarget(next);
    if (climateOn) sendClimateCmd(true, next);
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Panel style={s.tempPanel}>
        <Text style={s.targetLabel}>TARGET</Text>
        <View style={s.tempRow}>
          <Pressable onPress={() => adjustTarget(-1)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Minus size={28} color={T.cyan} />
          </Pressable>
          <Text style={s.tempBig}>{target}°</Text>
          <Pressable onPress={() => adjustTarget(1)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Plus size={28} color={T.cyan} />
          </Pressable>
        </View>
        <Text style={s.cabinTxt}>cabin now {cabin}°F</Text>
        <Pressable onPress={toggleClimate}
          style={[s.toggleBtn, climateOn && { backgroundColor: T.cyan, borderColor: 'transparent' }]}>
          <Text style={[s.toggleTxt, { color: climateOn ? T.ink : T.mid }]}>
            {climateOn ? 'Climate On' : 'Climate Off'}
          </Text>
        </Pressable>
      </Panel>

      <View style={s.seats}>
        {(['FL', 'FR', 'RL', 'RR'] as const).map(seat => (
          <SeatBtn key={seat} label={seat} level={seats[seat]!} onPress={() => cycleSeat(seat)} />
        ))}
      </View>

      <View style={s.extras}>
        <ToggleCtl icon={<Snowflake size={22} color={defrost ? T.cyan : T.mid} />}
          label="Defrost" active={defrost} onPress={() => setDefrost(d => !d)} />
        <ToggleCtl icon={<Disc size={22} color={wheel ? T.amber : T.mid} />}
          label="Wheel Heat" active={wheel} activeColor={T.amber} onPress={() => setWheel(w => !w)} />
        <ToggleCtl icon={<Wind size={22} color={vent ? T.cyan : T.mid} />}
          label="Vent" active={vent} onPress={() => setVent(v => !v)} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  tempPanel: { padding: 24, alignItems: 'center' },
  targetLabel: { fontFamily: DISP, fontSize: 12, letterSpacing: 2, color: T.lo },
  tempRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 8 },
  tempBig: { fontFamily: MONO, fontSize: 56, fontWeight: '700', color: T.hi },
  cabinTxt: { fontFamily: DISP, fontSize: 12, color: T.mid, marginTop: 4 },
  toggleBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.panel,
  },
  toggleTxt: { fontFamily: DISP, fontWeight: '600' },
  seats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  seatWrap: { alignItems: 'center', gap: 8 },
  seatIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatLabel: { fontFamily: DISP, fontSize: 11, color: T.mid },
  seatLevel: { fontFamily: MONO, fontSize: 11 },
  extras: { flexDirection: 'row', gap: 12, marginTop: 28 },
});
