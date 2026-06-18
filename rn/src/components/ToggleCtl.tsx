import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { T, DISP } from '../theme';

interface Props {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeColor?: string;
  onPress: () => void;
}

export function ToggleCtl({ icon, label, active, activeColor = T.cyan, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.root, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[
        s.icon,
        active && {
          backgroundColor: activeColor + '1f',
          borderColor: activeColor,
          shadowColor: activeColor,
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        },
      ]}>
        <View style={{ tintColor: active ? activeColor : T.mid }}>
          {icon}
        </View>
      </View>
      <Text style={[s.label, { color: active ? T.hi : T.lo }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: DISP,
    fontSize: 11,
    color: T.lo,
  },
});
