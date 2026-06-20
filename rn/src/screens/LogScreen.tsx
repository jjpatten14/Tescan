import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Activity, History } from 'lucide-react-native';
import { useVehicleStore } from '../store/vehicleStore';
import { T, DISP, MONO } from '../theme';

export function LogScreen() {
  const { status } = useVehicleStore();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Live connection status */}
      <View style={[s.row, s.rowBorder]}>
        <View style={[s.iconWrap, { borderColor: status === 'connected' ? T.green : T.border }]}>
          <Activity size={18} color={status === 'connected' ? T.green : T.mid} />
        </View>
        <Text style={s.label}>
          {status === 'connected' ? 'BLE connected — live data' :
           status === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </Text>
        <Text style={s.time}>now</Text>
      </View>

      {/* Empty state */}
      <View style={s.empty}>
        <History size={40} color={T.border} />
        <Text style={s.emptyTitle}>No History</Text>
        <Text style={s.emptySub}>Drive and charge events will appear here once connected to your vehicle.</Text>
      </View>
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
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontFamily: DISP, fontSize: 16, color: T.mid, fontWeight: '600' },
  emptySub: { fontFamily: DISP, fontSize: 13, color: T.lo, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
