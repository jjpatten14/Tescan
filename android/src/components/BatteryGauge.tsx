import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';

interface Props {
  soc: number | null;
  size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

const START_DEG = 135;   // bottom-left
const END_DEG = 405;     // = 45, bottom-right (270° total arc)

export const BatteryGauge: React.FC<Props> = ({ soc, size = 200 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.08;

  const pct = soc !== null ? Math.max(0, Math.min(100, soc)) : 0;
  const fillDeg = START_DEG + (pct / 100) * 270;

  const trackPath = arcPath(cx, cy, r, START_DEG, END_DEG);
  const fillPath = arcPath(cx, cy, r, START_DEG, fillDeg);

  const color = pct > 50 ? '#4CAF50' : pct > 20 ? '#FF9800' : '#F44336';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Path
          d={trackPath}
          stroke="#2a2a2a"
          strokeWidth={strokeW}
          fill="none"
          strokeLinecap="round"
        />
        {/* Fill */}
        <Path
          d={fillPath}
          stroke={color}
          strokeWidth={strokeW}
          fill="none"
          strokeLinecap="round"
        />
        {/* Center text */}
        <SvgText
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={size * 0.22}
          fontWeight="bold"
        >
          {soc !== null ? Math.round(pct) : '--'}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + size * 0.12}
          textAnchor="middle"
          fill="#888888"
          fontSize={size * 0.1}
        >
          %
        </SvgText>
      </Svg>
    </View>
  );
};
