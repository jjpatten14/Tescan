import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: number | string | null;
  unit?: string;
  precision?: number;
  color?: string;
}

export const MetricCard: React.FC<Props> = ({
  label,
  value,
  unit = '',
  precision = 1,
  color = '#ffffff',
}) => {
  const displayValue =
    value === null || value === undefined
      ? '--'
      : typeof value === 'number'
      ? value.toFixed(precision)
      : value;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{displayValue}</Text>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minWidth: 90,
    margin: 6,
  },
  label: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
  },
  unit: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
});
