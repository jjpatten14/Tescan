import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T, MONO, DISP } from '../theme';

interface Props {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}

export function Stat({ icon, label, value, accent = T.mid }: Props) {
  return (
    <View style={s.row}>
      <View style={[s.iconWrap, { borderColor: T.border }]}>
        <View style={{ color: accent } as any}>{icon}</View>
      </View>
      <View>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: T.panel,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: DISP,
    fontSize: 11,
    letterSpacing: 1,
    color: T.lo,
  },
  value: {
    fontFamily: MONO,
    fontSize: 17,
    fontWeight: '700',
    color: T.hi,
  },
});
