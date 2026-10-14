import Chart from 'chart.js/auto'

export { Chart }

// Curated modern color palettes matching the app's clean aesthetic
export const CHART_COLORS = {
  accent: '#245c4b',        // Primary forest emerald
  accentLight: '#34836a',
  accentSoft: 'rgba(36, 92, 75, 0.15)',
  emerald: '#10b981',       // Success / match chance
  emeraldSoft: 'rgba(16, 185, 129, 0.15)',
  indigo: '#6366f1',        // Pairing strength / tech
  indigoSoft: 'rgba(99, 102, 241, 0.15)',
  amber: '#f59e0b',         // Moderate / warning
  amberSoft: 'rgba(245, 158, 11, 0.15)',
  danger: '#e11d48',        // High risk / failure
  dangerSoft: 'rgba(225, 29, 72, 0.15)',
  cyan: '#06b6d4',          // Speed / secondary metric
  cyanSoft: 'rgba(6, 182, 212, 0.15)',
  purple: '#8b5cf6',        // Cluster group
  purpleSoft: 'rgba(139, 92, 246, 0.15)',
  rose: '#f43f5e',
  slate: '#64748b',
  line: '#e5e7e3',
  ink: '#1f2421',
  muted: '#68716b',
  surface: '#ffffff',
}

// Enterprise-grade curated color palette for behavioral groups
// 1. Power Shoppers (High Frequency VIPs) -> Deep Indigo (#4F46E5)
// 2. Engaged Fashion Explorers -> Teal Green (#0F9D78)
// 3. Selective Style Seekers -> Muted Amber (#D97706)
// 4. Occasional / Trial Users -> Slate Blue (#64748B)
// 5. At-Risk / Sensitive Users -> Muted Plum (#8B5CF6)
export const BEHAVIORAL_GROUPS = [
  {
    key: 'power_shoppers',
    name: 'Power Shoppers (High Frequency VIPs)',
    shortName: 'Power Shoppers',
    color: '#4F46E5',
    fill: '#4F46E5',
    pointFill: 'rgba(79, 70, 229, 0.68)',
    soft: 'rgba(79, 70, 229, 0.15)',
    border: '#4338CA',
    pointBorder: '#ffffff',
    badgeBg: 'rgba(79, 70, 229, 0.10)',
    badgeText: '#4338CA',
    badgeBorder: 'rgba(79, 70, 229, 0.25)',
  },
  {
    key: 'engaged_explorers',
    name: 'Engaged Fashion Explorers',
    shortName: 'Engaged Explorers',
    color: '#0F9D78',
    fill: '#0F9D78',
    pointFill: 'rgba(15, 157, 120, 0.68)',
    soft: 'rgba(15, 157, 120, 0.15)',
    border: '#0D8264',
    pointBorder: '#ffffff',
    badgeBg: 'rgba(15, 157, 120, 0.10)',
    badgeText: '#0D8264',
    badgeBorder: 'rgba(15, 157, 120, 0.25)',
  },
  {
    key: 'selective_seekers',
    name: 'Selective Style Seekers',
    shortName: 'Selective Seekers',
    color: '#D97706',
    fill: '#D97706',
    pointFill: 'rgba(217, 119, 6, 0.68)',
    soft: 'rgba(217, 119, 6, 0.15)',
    border: '#B45309',
    pointBorder: '#ffffff',
    badgeBg: 'rgba(217, 119, 6, 0.10)',
    badgeText: '#B45309',
    badgeBorder: 'rgba(217, 119, 6, 0.25)',
  },
  {
    key: 'occasional_trial',
    name: 'Occasional / Trial Users',
    shortName: 'Occasional / Trial',
    color: '#64748B',
    fill: '#64748B',
    pointFill: 'rgba(100, 116, 139, 0.68)',
    soft: 'rgba(100, 116, 139, 0.15)',
    border: '#475569',
    pointBorder: '#ffffff',
    badgeBg: 'rgba(100, 116, 139, 0.10)',
    badgeText: '#475569',
    badgeBorder: 'rgba(100, 116, 139, 0.25)',
  },
  {
    key: 'at_risk',
    name: 'At-Risk / Sensitive Users',
    shortName: 'At-Risk / Sensitive',
    color: '#8B5CF6',
    fill: '#8B5CF6',
    pointFill: 'rgba(139, 92, 246, 0.68)',
    soft: 'rgba(139, 92, 246, 0.15)',
    border: '#7C3AED',
    pointBorder: '#ffffff',
    badgeBg: 'rgba(139, 92, 246, 0.10)',
    badgeText: '#7C3AED',
    badgeBorder: 'rgba(139, 92, 246, 0.25)',
  },
]

// Centralized lookup map by stable key
export const BEHAVIORAL_GROUPS_BY_KEY = BEHAVIORAL_GROUPS.reduce((acc, g) => {
  acc[g.key] = g
  return acc
}, {})

/**
 * Resolve theme for a behavioral group using stable identifier or canonical alias
 * @param {Object|string|number} item Profile object, cluster name string, or key
 * @param {number} fallbackIndex Palette fallback index
 * @returns {typeof BEHAVIORAL_GROUPS[0]}
 */
export function getClusterTheme(item, fallbackIndex = 0) {
  if (!item && item !== 0) {
    return BEHAVIORAL_GROUPS[fallbackIndex % BEHAVIORAL_GROUPS.length]
  }

  // 1. Direct key match if present
  const keyCandidate = item?.cluster_key || item?.group_key || item?.key
  if (keyCandidate && BEHAVIORAL_GROUPS_BY_KEY[keyCandidate]) {
    return BEHAVIORAL_GROUPS_BY_KEY[keyCandidate]
  }

  // 2. Canonical name alias resolution
  const nameStr = (
    typeof item === 'string'
      ? item
      : item?.cluster_name || item?.name || ''
  ).toLowerCase()

  if (nameStr.includes('power') || nameStr.includes('vip')) {
    return BEHAVIORAL_GROUPS_BY_KEY.power_shoppers
  }
  if (nameStr.includes('engaged') || nameStr.includes('explorer')) {
    return BEHAVIORAL_GROUPS_BY_KEY.engaged_explorers
  }
  if (nameStr.includes('selective') || nameStr.includes('seeker')) {
    return BEHAVIORAL_GROUPS_BY_KEY.selective_seekers
  }
  if (nameStr.includes('occasional') || nameStr.includes('trial') || nameStr.includes('casual') || nameStr.includes('window')) {
    return BEHAVIORAL_GROUPS_BY_KEY.occasional_trial
  }
  if (nameStr.includes('risk') || nameStr.includes('sensitive') || nameStr.includes('dormant')) {
    return BEHAVIORAL_GROUPS_BY_KEY.at_risk
  }

  // 3. Fallback to index-based palette assignment
  const idx = typeof fallbackIndex === 'number' ? fallbackIndex : 0
  return BEHAVIORAL_GROUPS[idx % BEHAVIORAL_GROUPS.length]
}

// Backward-compatible alias used across charts
export const CLUSTER_PALETTE = BEHAVIORAL_GROUPS

export const defaultTooltipStyle = {
  backgroundColor: 'rgba(31, 36, 33, 0.94)',
  titleColor: '#ffffff',
  bodyColor: '#e5e7e3',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  titleFont: { family: 'Manrope, sans-serif', size: 12, weight: 'bold' },
  bodyFont: { family: 'Manrope, sans-serif', size: 11 },
  boxPadding: 6,
  usePointStyle: true,
}
