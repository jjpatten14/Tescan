import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, G, Line, Text as ST } from 'react-native-svg';
import { T, RATED_MILES } from '../theme';

const SIZE  = 248;
const R     = 100;
const CX    = SIZE / 2;
const CY    = SIZE / 2;
const C     = 2 * Math.PI * R;
const SWEEP = 0.75; // 270 degrees

function polar(rad: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + rad * Math.cos(a), CY + rad * Math.sin(a)];
}

interface Props {
  level: number;           // SOC 0–100 — always drives the arc fill
  limit: number;           // charge limit tick 0–100
  charging: boolean;
  low: boolean;
  // Display mode — tap on HomeScreen toggles this
  showMiles: boolean;      // true = show predicted miles in centre; false = show SOC%
  predictiveMiles: number | null; // null until 30-mile efficiency window fills
}

export function Gauge270({ level, limit, charging, low, showMiles, predictiveMiles }: Props) {
  const arcColor  = charging ? T.amber : low ? T.red : T.cyan;
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

  // Centre readout
  const ratedMiles = Math.round((level / 100) * RATED_MILES);
  const hasPredicted = predictiveMiles !== null;

  // Miles mode: show predicted if available, rated as fallback
  const milesValue  = hasPredicted ? Math.round(predictiveMiles!) : ratedMiles;
  const milesColor  = hasPredicted ? T.green : arcColor;
  const milesLabel  = hasPredicted ? 'PREDICTED RANGE' : 'RATED RANGE';

  // What goes in the big number slot
  const bigText   = showMiles ? `${milesValue}` : `${Math.round(level)}`;
  const bigColor  = showMiles ? milesColor : T.hi;
  const topLabel  = showMiles ? milesLabel : 'STATE OF CHARGE';
  const topColor  = showMiles ? milesColor : T.mid;

  // Sub-line below the big number
  const subText   = showMiles ? `${Math.round(level)}% · tap for %` : `${ratedMiles} mi · tap for miles`;
  const subColor  = T.lo;

  return (
    <Animated.View style={{ opacity: charging ? fadeAnim : 1 }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <G rotation={135} origin={`${CX}, ${CY}`}>
          {/* track */}
          <Circle cx={CX} cy={CY} r={R} fill="none"
            stroke={T.border} strokeWidth={12}
            strokeLinecap="round" strokeDasharray={trackDash} />
          {/* fill — always based on SOC */}
          <Circle cx={CX} cy={CY} r={R} fill="none"
            stroke={arcColor} strokeWidth={12}
            strokeLinecap="round" strokeDasharray={fillDash} />
        </G>

        {/* charge limit tick */}
        <Line x1={t1x} y1={t1y} x2={t2x} y2={t2y}
          stroke={T.hi} strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />

        {/* top label */}
        <ST x={CX} y={CY - 46} textAnchor="middle"
          fill={topColor} fontSize={11} letterSpacing={2}>
          {topLabel}
        </ST>

        {/* big centre number */}
        <ST x={CX} y={CY + 6} textAnchor="middle"
          fill={bigColor} fontSize={52} fontWeight="700">
          {bigText}
        </ST>

        {/* unit label just below big number */}
        <ST x={CX} y={CY + 30} textAnchor="middle"
          fill={bigColor} fontSize={13} fontWeight="500">
          {showMiles ? 'miles' : '%'}
        </ST>

        {/* sub-line hint */}
        <ST x={CX} y={CY + 52} textAnchor="middle"
          fill={subColor} fontSize={10} letterSpacing={1}>
          {subText}
        </ST>

        {charging && (
          <ST x={CX} y={CY + 70} textAnchor="middle"
            fill={T.amber} fontSize={11} letterSpacing={2}>
            ⚡ CHARGING
          </ST>
        )}
      </Svg>
    </Animated.View>
  );
}
