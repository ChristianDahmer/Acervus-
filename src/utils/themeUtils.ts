import { ThemeConfig } from '../types';

export interface ColorPreset {
  name: string;
  hex: string;
  description: string;
}

export interface ThemeModePreset {
  id: ThemeConfig['themeMode'];
  name: string;
  bg: string;
  surface: string;
  card: string;
  border: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Ouro Dourado', hex: '#D4AF37', description: 'Nobreza e elegância festiva' },
  { name: 'Azul Safira', hex: '#3B82F6', description: 'Corporativo e moderno' },
  { name: 'Verde Boreal', hex: '#10B981', description: 'Vibrante e renovador' },
  { name: 'Rosa Imperial', hex: '#EC4899', description: 'Romântico e delicado' },
  { name: 'Ametista Vênus', hex: '#A855F7', description: 'Sofisticado e exclusivo' },
  { name: 'Laranja Pôr do Sol', hex: '#F97316', description: 'Acolhedor e energia festiva' },
  { name: 'Turquesa Mar', hex: '#06B6D4', description: 'Fresco e contemporâneo' },
  { name: 'Vermelho Rubim', hex: '#EF4444', description: 'Marcante e comemorativo' },
];

export const THEME_MODE_PRESETS: ThemeModePreset[] = [
  { id: 'obsidian', name: 'Obsidiana (Dark Gold)', bg: '#0A0A0B', surface: '#111113', card: '#18181B', border: '#27272A' },
  { id: 'midnight', name: 'Meia-Noite (Dark Blue)', bg: '#020617', surface: '#0F172A', card: '#1E293B', border: '#334155' },
  { id: 'charcoal', name: 'Grafite (Pure Dark)', bg: '#0F0F10', surface: '#1C1C1E', card: '#2C2C2E', border: '#3A3A3C' },
  { id: 'emerald_dark', name: 'Floresta Noturna', bg: '#022C22', surface: '#064E3B', card: '#065F46', border: '#047857' },
  { id: 'amethyst_dark', name: 'Púrpura Noturna', bg: '#0F0D1B', surface: '#1E1B2E', card: '#2E2A45', border: '#3B3561' },
];

/**
 * Calculates WCAG relative luminance to determine optimal contrast text color (black vs white).
 */
export function getContrastTextColor(hexColor: string): '#000000' | '#FFFFFF' {
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return '#FFFFFF';

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Relative luminance formula
  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const luminance = a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;

  // Lum > 0.45 means bright background -> use black text
  return luminance > 0.45 ? '#000000' : '#FFFFFF';
}

/**
 * Applies dynamic CSS variables to the document root element.
 */
export function applyThemeToDocument(theme: ThemeConfig) {
  const root = document.documentElement;
  const modeObj = THEME_MODE_PRESETS.find((m) => m.id === theme.themeMode) || THEME_MODE_PRESETS[0];

  const primaryColor = theme.primaryColor || '#D4AF37';
  const textColorOnPrimary = getContrastTextColor(primaryColor);

  root.style.setProperty('--app-primary', primaryColor);
  root.style.setProperty('--app-primary-text', textColorOnPrimary);
  root.style.setProperty('--app-bg', modeObj.bg);
  root.style.setProperty('--app-surface', modeObj.surface);
  root.style.setProperty('--app-surface-card', modeObj.card);
  root.style.setProperty('--app-border', modeObj.border);
}
