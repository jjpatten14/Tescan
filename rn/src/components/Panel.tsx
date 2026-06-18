import React from 'react';
import { View, ViewStyle, Pressable } from 'react-native';
import { T } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Panel({ children, style, onPress }: Props) {
  const base: ViewStyle = {
    backgroundColor: T.panel,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    ...style,
  };
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}
