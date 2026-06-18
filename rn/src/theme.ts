// Design tokens — ported from VoltLocal.jsx
export const T = {
  ink:     '#0E1218',
  panel:   '#161C25',
  panelHi: 'rgba(255,255,255,0.045)',
  border:  'rgba(255,255,255,0.07)',
  borderHi:'rgba(255,255,255,0.14)',
  hi:      '#ECF1F7',
  mid:     '#93A0B2',
  lo:      '#586273',
  cyan:    '#58C7F2',
  amber:   '#FFB257',
  green:   '#5FD0A0',
  red:     '#FF6B6B',
} as const;

export const RATED_MILES = 247; // rated range at 100% SOC (Model 3 LR)
export const RATED_KM    = RATED_MILES * 1.60934;

// Font families — React Native uses system fonts; JetBrains Mono and Space Grotesk
// must be bundled in the native project (android/app/src/main/assets/fonts/).
// These names match once fonts are added; app still works with system mono otherwise.
export const MONO = 'JetBrainsMono-Regular';
export const DISP = 'SpaceGrotesk-Medium';
