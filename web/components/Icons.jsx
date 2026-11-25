// Icon SVG nét viền (không emoji), lấy từ ICON trong public/js/main.js.
const base = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const IconLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
);
export const IconSearch = () => (
  <svg {...base} width="18" height="18" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
export const IconOut = () => (
  <svg {...base} width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></svg>
);
export const IconHome = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" /></svg>
);
export const IconBrief = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2" /></svg>
);
export const IconInfo = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>
);
export const IconUser = ({ size = 22 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
);
export const IconShop = ({ size = 22 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 10l1.5-5h15L21 10" /><path d="M4 10v10h16V10" /><path d="M10 20v-6h4v6" /></svg>
);
export const IconCal = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconClose = () => (
  <svg {...base} width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
