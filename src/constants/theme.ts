import type { ActivityCategory } from '@/types/domain';

export const palette = {
  canvas: '#F7F6F1',
  surface: '#FFFFFF',
  surfaceMuted: '#EFF2ED',
  surfaceRaised: '#FFFFFF',
  ink: '#19231E',
  inkMuted: '#667169',
  primary: '#EE6548',
  primaryDark: '#C8462D',
  primarySoft: '#FEF3EF',
  primaryTint: '#F9DDD4',
  forest: '#315C4C',
  forestSoft: '#DDE9E3',
  amber: '#F3B84B',
  warning: '#8A5C08',
  warningSoft: '#FFF0D2',
  border: '#DFE4DE',
  borderStrong: '#C8D0C9',
  error: '#B53932',
  errorSoft: '#FBEAE8',
  success: '#2E765A',
  successSoft: '#DDE9E3',
  info: '#315C4C',
  infoSoft: '#E8F0EC',
  white: '#FFFFFF',
  black: '#0C100E',
  overlay: 'rgba(12, 16, 14, 0.42)',
} as const;

export const feedbackColors = {
  info: { background: palette.infoSoft, foreground: palette.info, border: '#C9DDD3' },
  success: { background: palette.successSoft, foreground: palette.success, border: '#BED5C8' },
  warning: { background: palette.warningSoft, foreground: palette.warning, border: '#ECD6A0' },
  error: { background: palette.errorSoft, foreground: palette.error, border: '#F0C7C2' },
} as const;

export const categoryColors: Record<
  ActivityCategory,
  { background: string; foreground: string; accent: string }
> = {
  Coffee: { background: '#F5E5D5', foreground: '#694936', accent: '#D49A6A' },
  Food: { background: '#F6DDDA', foreground: '#713D39', accent: '#D97A71' },
  Outdoors: { background: '#DCECDD', foreground: '#31583B', accent: '#6EA979' },
  Sports: { background: '#DCE9F4', foreground: '#34556E', accent: '#6B9EC2' },
  Arts: { background: '#EBE0F2', foreground: '#5D436D', accent: '#A67DBA' },
  Games: { background: '#F3E9C9', foreground: '#665523', accent: '#C4A342' },
  Learning: { background: '#DFE7F7', foreground: '#3D5077', accent: '#7D94C4' },
  Wellness: { background: '#E4EADA', foreground: '#4B5E35', accent: '#8BA566' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 7,
  },
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '800' as const, letterSpacing: -1.2 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.6 },
  h2: { fontSize: 23, lineHeight: 29, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 23, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 14, lineHeight: 19, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '700' as const, letterSpacing: 0.2 },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const;

export const contentMaxWidth = 720;
