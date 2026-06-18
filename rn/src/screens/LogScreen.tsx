import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Activity, ParkingCircle, Route, Zap, Lock } from 'lucide-react-native';
import { useVehicleStore } from '../store/vehicleStore';
import { T, DISP, MONO } from '../theme';

const STATIC_EVENTS = [
  { icon: Activity,      label: 'Sleeping',                   time: 'now',   color: T.mid },
  { icon: ParkingCircle, label: 'Parked at 421 Addison Rd',   time: '4h ago', color: T.cyan },
  { icon: Route,         label: 'Drove 12.4 mi · 24 min',     time: '5h ago', color: T.cyan },
  { icon: Zap,           label: 'Charged to 80% · +14.2 kWh', time: '17h ago', color: T.amber },
  { icon: Lock,          label: 'Locked',                     time: '18h ago', color: T.mid },
];

export function LogScreen() {
  const { status } = useVehicleStore();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Live connection event at top when connected */}
      {status === 'connected' && (
        <View style={[s.row, s.rowBorder]}>
          <View style={[s.iconWrap, { borderColor: T.green }]}>
            <Activity size={18} color={T.green} />
          </View>
          <Text style={s.label}>BLE connected — live data</Text>
          <Text style={s.time}>now</Text>
        </View>
      )}

      {STATIC_EVENTS.map((e, i) => {
        const Icon = e.icon;
        return (
          <View key={i} style={[s.row, i < STATIC_EVENTS.length - 1 && s.rowBorder]}>
            <View style={[s.iconWrap, { borderColor: T.border }]}>
              <Icon size={18} color={e.color} />
            </View>
            <Text style={s.label}>{e.label}</Text>
            <Text style={s.time}>{e.time}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: T.panel,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: DISP, fontSize: 14, color: T.hi, flex: 1 },
  time:  { fontFamily: MONO, fontSize: 12, color: T.lo },
});
