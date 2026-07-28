/**
 * design.ts — Single source of truth for all design tokens.
 * Import from here instead of hardcoding values in components.
 */

// ─── Raw color palette ────────────────────────────────────────────────────────
export const COLOR = {
  // Cyan / terminal accent (login page)
  cyan:           '#22d3ee',
  cyanDim:        'rgba(34,211,238,0.6)',
  cyanFaint:      'rgba(34,211,238,0.3)',
  cyanGhost:      'rgba(34,211,238,0.1)',
  cyanBorder:     'rgba(34,211,238,0.2)',
  cyanBorderFaint:'rgba(34,211,238,0.1)',

  // Matrix rain
  matrixBlue:     '#0ea5e9',

  // Login card / surfaces
  loginBg:        'rgba(15,23,42,0.9)',
  loginInput:     'rgba(30,41,59,0.8)',
  loginText:      '#e2e8f0',

  // Error
  errorBorder:    'rgba(239,68,68,0.4)',
  errorGlow:      'rgba(239,68,68,0.1)',
  errorRed:       '#ef4444',
  errorRedBg:     'rgba(239,68,68,0.1)',

  // Success / brand
  brandGradStart: '#0369a1',
  brandGradEnd:   '#0e7490',
  brandGlow:      'rgba(14,116,144,0.35)',
  brandBorder:    'rgba(37,99,235,0.2)',
  brandBorderMid: 'rgba(37,99,235,0.3)',

  // Glow orbs (login background)
  orbBlue:        'rgba(14,116,144,0.12)',
  orbCyan:        'rgba(6,182,212,0.10)',

  // Scanline overlay
  scanline:       'rgba(0,0,0,0.04)',

  // Muted text
  mutedText:      'rgba(148,163,184,0.5)',
  mutedTextBright:'rgba(148,163,184,0.8)',

  // Toast (Providers)
  toastBg:        '#1e293b',
  toastText:      '#f1f5f9',
  toastBorder:    '#334155',
  toastSuccess:   '#10b981',
  toastError:     '#ef4444',
  toastWhite:     '#fff',

  // Theme toggle ripple
  ripple:         'rgba(99,102,241,0.5)',
  rippleFade:     'rgba(99,102,241,0)',

  // Holiday stats
  holidayUsed:    '#f87171',
  holidayLeft:    '#34d399',

  // Magic key page
  magicBg:        'radial-gradient(ellipse at center, #0f0a1e 0%, #050510 100%)',
  magicCard:      'rgba(15, 10, 40, 0.85)',
  magicAccent:    '#a78bfa',
  magicAccentBg:  'rgba(139, 92, 246, 0.1)',
  magicGradient:  'linear-gradient(135deg, #7c3aed, #4f46e5)',
  magicError:     '#ef4444',
  magicStars:     ['#fbbf24', '#a78bfa', '#60a5fa', '#f472b6'] as string[],
} as const

// ─── Composed style objects ───────────────────────────────────────────────────
export const STYLES = {
  // Login page
  scanlineOverlay: {
    background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${COLOR.scanline} 2px, ${COLOR.scanline} 4px)`,
  },
  orbLeft: {
    background: `radial-gradient(circle, ${COLOR.orbBlue} 0%, transparent 70%)`,
    filter: 'blur(40px)',
  },
  orbRight: {
    background: `radial-gradient(circle, ${COLOR.orbCyan} 0%, transparent 70%)`,
    filter: 'blur(40px)',
  },
  loginCard: {
    backgroundColor: COLOR.loginBg,
    backdropFilter: 'blur(24px)',
    borderColor: COLOR.cyanBorder,
    boxShadow: `0 0 40px ${COLOR.cyanGhost}, inset 0 1px 0 rgba(255,255,255,0.05)`,
  },
  loginCardError: {
    backgroundColor: COLOR.loginBg,
    backdropFilter: 'blur(24px)',
    borderColor: COLOR.errorBorder,
    boxShadow: `0 0 40px ${COLOR.errorGlow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
  },
  loginInput: {
    backgroundColor: COLOR.loginInput,
    border: `1px solid ${COLOR.cyanBorder}`,
    color: COLOR.loginText,
    caretColor: COLOR.cyan,
  },
  loginButton: {
    background: `linear-gradient(135deg, ${COLOR.brandGradStart}, ${COLOR.brandGradEnd})`,
    color: 'white',
    boxShadow: `0 0 24px ${COLOR.brandGlow}`,
  },

  // Shared brand-bordered card (shift swap form, holiday summary)
  brandCard: {
    borderColor: COLOR.brandBorderMid,
  },
  brandSummary: {
    backgroundColor: 'var(--brand-subtle)',
    border: `1px solid ${COLOR.brandBorder}`,
  },
  brandInfo: {
    backgroundColor: 'var(--brand-subtle)',
    color: 'var(--brand-text)',
    border: `1px solid ${COLOR.brandBorder}`,
  },

  // Magic key page
  magicPage: {
    background: COLOR.magicBg,
  },
  magicCard: {
    background: COLOR.magicCard,
    backdropFilter: 'blur(20px)',
  },
  magicButton: {
    background: COLOR.magicGradient,
  },
  magicDigitActive: {
    boxShadow: `0 0 20px ${COLOR.magicAccent}`,
    borderColor: COLOR.magicAccent,
  },
  magicSuccess: {
    boxShadow: `0 0 60px ${COLOR.magicAccent}`,
  },
} as const
