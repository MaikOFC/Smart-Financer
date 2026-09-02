// Gerenciador de Tema (Claro, Escuro e Sistema / Padrão do Celular)
export type ThemeMode = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

const THEME_STORAGE_KEY = "smartfinancer_theme_mode";

export function getStoredThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
  } catch (e) {
    console.error("Erro ao ler tema salvo:", e);
  }
  // Padrão solicitado pelo usuário: Padrão do celular (Sistema)
  return "system";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }

  // Atualizar a meta tag theme-color para a barra de status do celular
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const targetColor = resolved === "dark" ? "#0c1015" : "#f8fafc";
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", targetColor);
  }

  return resolved;
}

export function saveThemeMode(mode: ThemeMode): ResolvedTheme {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    console.error("Erro ao salvar tema:", e);
  }
  return applyTheme(mode);
}
