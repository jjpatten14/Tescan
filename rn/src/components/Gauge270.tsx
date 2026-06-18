import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, G, Line, Text as ST } from 'react-native-svg';
import { T, RATED_MILES } from '../theme';

const SIZE = 248;
const R    = 100;
const CX   = SIZE / 2;
const CY   = SIZE / 2;
const C    = 2 * Math.PI * R;
const SWEEP = 0.75; // 270 degrees

function polar(rad: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + rad * Math.cos(a), CY + rad * Math.sin(a)];
}

interface Props {
  level: number;   // 0–100
  limit: number;   // charge limit 0–100
  charging: boolean;
  low: boolean;
}

export function Gauge270({ level, limit, charging, low }: Props) {
  const arcColor = charging ? T.amber : low ? T.red : T.cyan;
  const trackDash = `${SWEEP * C} ${(1 - SWEEP) * C}`;
  const fillDash  = `${(level / 100) * SWEEP * C} ${C}`;

  const tickDeg = 135 + (limit / 100) * 270;
  const [t1x, t1y] = polar(R - 16, tickDeg);
  const [t2x, t2y] = polar(R + 16, tickDeg);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (charging) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, { toValue: 0.55, duration: 800, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1.0,  duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      fadeAnim.stopAnimation();
      fadeAnim.setValue(1);
    }
  }, [charging, fadeAnim]);

  const rangeVal = Math.round((level / 100) * RATED_MILES);

  return (
    <Animated.View style={{ opacity: charging ? fadeAnim : 1 }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <G rotation={135} origin={`${CX}, ${CY}`}>
          {/* track */}
          <Circle cx={CX} cy={CY} r={R} fill="none"
            stroke={T.border} strokeWidth={12}
            strokeLinecap="round" strokeDasharray={trackDash} />
          {/* fill */}
          <Circle cx={CX} cy={CY} r={R} fill="none"
            stroke={arcColor} strokeWidth={12}
            strokeLinecap="round" strokeDasharray={fillDash} />
        </G>
        {/* charge limit tick */}
        <Line x1={t1x} y1={t1y} x2={t2x} y2={t2y}
          stroke={T.hi} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
        {/* SOC number */}
        <ST x={CX} y={CY - 6} textAnchor="middle"
          fill={T.hi} fontSize={52} fontWeight="700">
          {Math.round(level)}
        </ST>
        {/* label */}
        <ST x={CX} y={CY - 46} textAnchor="middle"
          fill={T.mid} fontSize={11} letterSpacing={2}>
          STATE OF CHARGE
        </ST>
        {/* range */}
        <ST x={CX} y={CY + 30} textAnchor="middle"
          fill={arcColor} fontSize={16} fontWeight="500">
          {rangeVal} mi
        </ST>
        {charging && (
          <ST x={CX} y={CY + 56} textAnchor="middle"
            fill={T.amber} fontSize={11} letterSpacing={2}>
            ⚡ CHARGING
          </ST>
        )}
      </Svg>
    </Animated.View>
  );
}
