import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

interface Props {
  chargingState: 'idle' | 'ac' | 'dc' | null;
  rateKw: number | null;
}

export const ChargingIndicator: React.FC<Props> = ({ chargingState, rateKw }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  const isCharging = chargingState === 'ac' || chargingState === 'dc';
  const color = chargingState === 'dc' ? '#00BCD4' : '#8BC34A';

  useEffect(() => {
    if (isCharging) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    } else {
      opacity.setValue(0.25);
    }
  }, [isCharging]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity }}>
        <Svg width={28} height={44}>
          {/* Lightning bolt */}
          <Polygon
            points="16,2 6,24 14,24 12,42 22,20 14,20"
            fill={isCharging ? color : '#444'}
          />
        </Svg>
      </Animated.View>
      <View style={styles.textGroup}>
        <Text style={[styles.state, { color: isCharging ? color : '#555' }]}>
          {chargingState === 'dc'
            ? 'DC Fast'
            : chargingState === 'ac'
            ? 'AC Charging'
            : 'Not Charging'}
        </Text>
        {isCharging && rateKw !== null && (
          <Text style={styles.rate}>{rateKw.toFixed(1)} kW</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginHorizontal: 6,
  },
  textGroup: {
    marginLeft: 10,
  },
  state: {
    fontSize: 14,
    fontWeight: '600',
  },
  rate: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
});
