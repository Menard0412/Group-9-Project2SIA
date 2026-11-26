export const colors = {
  primary: '#2F5BEA',
  primaryDark: '#1E3FAE',
  primarySoft: '#EEF3FF',
  primaryMid: '#D9E4FF',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#E6EBF4',
  text: '#0F1B33',
  textMuted: '#62708A',
  danger: '#DC2626',
  dangerSoft: '#FEF1F1',
  accent: '#F97316',
  accentSoft: '#FFF3E8',
  success: '#16A34A',
  successSoft: '#EAF8EF',
  white: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 } as const;

/** Soft shadows used for cards, raised buttons and the tab bar. */
export const shadows = {
  card: {
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#2F5BEA',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tabBar: {
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
} as const;
