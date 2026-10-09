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

// Distinct cluster color assignment for up to 6 customer groups
export const CLUSTER_PALETTE = [
  { fill: '#6366f1', soft: 'rgba(99, 102, 241, 0.22)', border: '#4f46e5', label: 'Group 1' },
  { fill: '#10b981', soft: 'rgba(16, 185, 129, 0.22)', border: '#059669', label: 'Group 2' },
  { fill: '#f59e0b', soft: 'rgba(245, 158, 11, 0.22)', border: '#d97706', label: 'Group 3' },
  { fill: '#06b6d4', soft: 'rgba(6, 182, 212, 0.22)', border: '#0891b2', label: 'Group 4' },
  { fill: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.22)', border: '#7c3aed', label: 'Group 5' },
  { fill: '#f43f5e', soft: 'rgba(244, 63, 94, 0.22)', border: '#e11d48', label: 'Group 6' },
]

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
