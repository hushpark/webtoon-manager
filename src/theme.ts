import type { ThemeType } from './types';

export interface ThemeStyle {
  bg: string;
  headerBg: string;
  primaryBtn: string;
  secondaryBtn: string;
  accentText: string;
  cardBorder: string;
  highlightBadge: string;
}

export const THEME_STYLES: Record<ThemeType, ThemeStyle> = {
  COBALT: {
    bg: 'bg-slate-900', // 👈 세련된 딥 코발트 차콜 배경
    headerBg: 'bg-blue-600',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700',
    secondaryBtn: 'bg-teal-600 hover:bg-teal-700',
    accentText: 'text-blue-600',
    cardBorder: 'border-slate-800',
    highlightBadge: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  VIOLET: {
    bg: 'bg-[#120f24]', // 👈 깊이감 있는 다크 바이올렛 배경
    headerBg: 'bg-violet-600',
    primaryBtn: 'bg-violet-600 hover:bg-violet-700',
    secondaryBtn: 'bg-fuchsia-600 hover:bg-fuchsia-700',
    accentText: 'text-violet-600',
    cardBorder: 'border-purple-950/60',
    highlightBadge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
  },
  NATURE: {
    bg: 'bg-[#0f1914]', // 👈 눈이 편안한 딥 포레스트 그린 배경
    headerBg: 'bg-emerald-800',
    primaryBtn: 'bg-emerald-800 hover:bg-emerald-900',
    secondaryBtn: 'bg-amber-700 hover:bg-amber-800',
    accentText: 'text-emerald-800',
    cardBorder: 'border-emerald-950/60',
    highlightBadge: 'bg-stone-200/80 text-stone-800 border-stone-300'
  },
  CHARCOAL: {
    bg: 'bg-zinc-950', // 👈 시크하고 매트한 리니어 블랙 배경
    headerBg: 'bg-slate-900',
    primaryBtn: 'bg-slate-900 hover:bg-black',
    secondaryBtn: 'bg-emerald-700 hover:bg-emerald-800',
    accentText: 'text-slate-900',
    cardBorder: 'border-zinc-800',
    highlightBadge: 'bg-slate-200 text-slate-800 border-slate-300'
  }
};