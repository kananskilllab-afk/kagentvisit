// client/src/design/tokens.js
// Runtime tokens for Meridian design system. Static styling lives in tailwind.config.js;
// this file is for runtime consumers (charts, dynamic colors, status maps).
// Source of truth: newui/meridian/shared.jsx (do not drift).

export const M = {
  navy:    '#1E1B4B',
  blue:    '#3B82F6',
  gold:    '#F59E0B',
  green:   '#10B981',
  red:     '#EF4444',
  sky:     '#0EA5E9',
  purple:  '#8B5CF6',
  bg:      '#F1F5F9',
  white:   '#FFFFFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  sub:     '#64748B',
  muted:   '#94A3B8',
  rowHov:  '#F8FAFC',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)',
};

export const VISIT_STATUS = {
  draft:           { bg:'#F1F5F9', text:'#475569', label:'Draft' },
  submitted:       { bg:'#FFFBEB', text:'#D97706', label:'Pending' },
  reviewed:        { bg:'#EFF6FF', text:'#2563EB', label:'Reviewed' },
  action_required: { bg:'#FEF2F2', text:'#DC2626', label:'Action Req.' },
  closed:          { bg:'#F0FDF4', text:'#15803D', label:'Closed' },
};

export const EXPENSE_STATUS = {
  draft:               { bg:'#F1F5F9', text:'#475569', label:'Draft' },
  submitted:           { bg:'#FFFBEB', text:'#D97706', label:'Submitted' },
  under_review:        { bg:'#EFF6FF', text:'#2563EB', label:'Under Review' },
  needs_justification: { bg:'#FEF2F2', text:'#DC2626', label:'Needs Justification' },
  approved:            { bg:'#F0FDF4', text:'#15803D', label:'Approved' },
  paid:                { bg:'#ECFDF5', text:'#059669', label:'Paid' },
  rejected:            { bg:'#FEF2F2', text:'#6B7280', label:'Rejected' },
};

// Includes ALL 7 roles in this app (CONTEXT.md preserves home_visit / accounts / hod /
// regional_bdm; PROJECT.md confirms hod is a real role). Newui only had 6 — we add hod.
export const ROLE_META = {
  superadmin:   { label:'Super Admin',   bg:'#EDE9FE', text:'#7C3AED' },
  admin:        { label:'Admin',         bg:'#EFF6FF', text:'#2563EB' },
  user:         { label:'Field Agent',   bg:'#F0FDF4', text:'#15803D' },
  home_visit:   { label:'Home Visit',    bg:'#FFF7ED', text:'#C2410C' },
  accounts:     { label:'Accounts',      bg:'#FFFBEB', text:'#D97706' },
  hod:          { label:'HOD',           bg:'#EFF6FF', text:'#1D4ED8' },
  regional_bdm: { label:'Regional BDM',  bg:'#F0FDF4', text:'#059669' },
};

export const CAT_META = {
  flight: { label:'Flight', color:'#2563EB' },
  train:  { label:'Train',  color:'#15803D' },
  bus:    { label:'Bus',    color:'#C2410C' },
  cab:    { label:'Cab',    color:'#D97706' },
  hotel:  { label:'Hotel',  color:'#9333EA' },
  food:   { label:'Food',   color:'#DC2626' },
  other:  { label:'Other',  color:'#475569' },
};

export const MONTHS_SHORT = ['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'];

export const CHART_DATA = [28,35,22,41,38,47,53,45,62,58,71,65];
