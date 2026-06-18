import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { Panel } from './Panel';
import { T, MONO, DISP } from '../theme';

interface Props {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  onPress?: () => void;
}

export function Module({ icon, label, value, sub, accent = T.mid, onPress }: Props) {
  return (
    <Panel onPress={onPress} style={{ minHeight: 118, padding: 16 }}>
      <View style={s.header}>
        <View style={{ color: accent } as any}>{icon}</View>
        {onPress && <ArrowUpRight size={16} color={T.lo} />}
      </View>
      <View style={s.body}>
        <Text style={s.value}>{value}</Text>
        <Text style={s.label}>{label}{sub ? ` · ${sub}` : ''}</Text>
      </View>
    </Panel>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: { marginTop: 16 },
  value: {
    fontFamily: MONO,
    fontSize: 19,
    fontWeight: '700',
    color: T.hi,
  },
  label: {
    fontFamily: DISP,
    fontSize: 12,
    color: T.mid,
    marginTop: 2,
  },
});
