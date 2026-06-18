import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ParkingCircle, Route } from 'lucide-react-native';
import { Module } from '../components/Module';
import { Panel } from '../components/Panel';
import { T, DISP } from '../theme';

export function LocationScreen() {
  return (
    <View style={s.root}>
      <Panel style={{ overflow: 'hidden', marginBottom: 12 }}>
        {/* Schematic grid map placeholder — real map TBD */}
        <View style={s.map}>
          <View style={s.dot} />
          <View style={s.addrTag}>
            <Text style={s.addrTxt}>421 Addison Rd</Text>
          </View>
        </View>
      </Panel>

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Module icon={<ParkingCircle size={22} color={T.cyan} />}
            label="Status" value="Parked" sub="4h" accent={T.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Module icon={<Route size={22} color={T.mid} />}
            label="Last drive" value="12.4 mi" sub="5h ago" />
        </View>
      </View>

      <Pressable style={({ pressed }) => [s.navBtn, { opacity: pressed ? 0.85 : 1 }]}>
        <Text style={s.navTxt}>Navigate to car</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  map: {
    height: 280,
    backgroundColor: '#0d1620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 99,
    backgroundColor: T.cyan,
    shadowColor: T.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  addrTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#06080B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addrTxt: { fontFamily: DISP, fontSize: 12, color: T.mid },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  navBtn: {
    backgroundColor: T.cyan,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  navTxt: { fontFamily: DISP, fontWeight: '600', color: T.ink },
});
