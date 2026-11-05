// Gerenciador de Fontes do Aplicativo (Outfit, Plus Jakarta Sans, Inter)
export type AppFontKey = "outfit" | "plus-jakarta-sans" | "inter";

export interface FontOption {
  id: AppFontKey;
  name: string;
  tagline: string;
  family: string;
  previewSample: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  {
    id: "outfit",
    name: "Outfit",
    tagline: "Geométrica, moderna e ultra legível em números",
    family: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    previewSample: "R$ 1.000,00 • Entradas do Mês",
  },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    tagline: "Sofisticada, elegante e equilibrada",
    family: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    previewSample: "R$ 1.000,00 • Entradas do Mês",
  },
  {
    id: "inter",
    name: "Inter",
    tagline: "Clássica e neutra, padrão de sistemas e fintechs",
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    previewSample: "R$ 1.000,00 • Entradas do Mês",
  },
];

const FONT_STORAGE_KEY = "smartfinancer_app_font";

export function getStoredFontKey(): AppFontKey {
  try {
    const saved = localStorage.getItem(FONT_STORAGE_KEY) as AppFontKey | null;
    if (saved && AVAILABLE_FONTS.some((f) => f.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error("Erro ao ler fonte salva:", e);
  }
  // Padrão: Outfit como solicitado para testar, ou Plus Jakarta Sans
  return "outfit";
}

export function getFontFamilyValue(fontKey: AppFontKey): string {
  const font = AVAILABLE_FONTS.find((f) => f.id === fontKey);
  return font ? font.family : AVAILABLE_FONTS[0].family;
}

export function applyAppFont(fontKey: AppFontKey): void {
  if (typeof document === "undefined") return;
  const fontVal = getFontFamilyValue(fontKey);
  const root = document.documentElement;

  root.style.setProperty("--app-font-family", fontVal);
  root.style.fontFamily = fontVal;
  if (document.body) {
    document.body.style.fontFamily = fontVal;
  }
  const appRoot = document.getElementById("root");
  if (appRoot) {
    appRoot.style.fontFamily = fontVal;
  }

  // Notificar outros ouvintes se houver
  window.dispatchEvent(new CustomEvent("app-font-changed", { detail: { fontKey } }));
}

export function saveAppFont(fontKey: AppFontKey): void {
  try {
    localStorage.setItem(FONT_STORAGE_KEY, fontKey);
  } catch (e) {
    console.error("Erro ao salvar preferência de fonte:", e);
  }
  applyAppFont(fontKey);
}
