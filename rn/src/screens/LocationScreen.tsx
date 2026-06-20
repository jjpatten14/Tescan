import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPinOff } from 'lucide-react-native';
import { Panel } from '../components/Panel';
import { T, DISP } from '../theme';

export function LocationScreen() {
  return (
    <View style={s.root}>
      <Panel style={s.panel}>
        <MapPinOff size={48} color={T.mid} />
        <Text style={s.title}>No Location Data</Text>
        <Text style={s.sub}>GPS data is not available via CAN bus.{'\n'}Location features require additional hardware.</Text>
      </Panel>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  panel: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: { fontFamily: DISP, fontSize: 18, color: T.hi, fontWeight: '600' },
  sub: { fontFamily: DISP, fontSize: 13, color: T.mid, textAlign: 'center', lineHeight: 20 },
});
