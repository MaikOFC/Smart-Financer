// Gerenciador de Atualização do Aplicativo (OTA - Over-The-Air Update)
// Permite que usuários do APK ou WebApp recebam e apliquem atualizações sem baixar novo APK

export const CURRENT_CLIENT_VERSION = "2.4.0";

export interface VersionInfo {
  version: string;
  buildTime?: string;
  timestamp: number;
  features?: string[];
}

export async function checkServerVersion(): Promise<{ hasUpdate: boolean; serverVersion: string; features: string[] }> {
  try {
    const res = await fetch(`/api/version?_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });

    if (!res.ok) {
      return { hasUpdate: false, serverVersion: CURRENT_CLIENT_VERSION, features: [] };
    }

    const data: VersionInfo = await res.json();
    const isNewer = data.version !== CURRENT_CLIENT_VERSION;
    return {
      hasUpdate: isNewer,
      serverVersion: data.version || CURRENT_CLIENT_VERSION,
      features: data.features || [],
    };
  } catch (err) {
    console.warn("Não foi possível verificar a versão do servidor:", err);
    return { hasUpdate: false, serverVersion: CURRENT_CLIENT_VERSION, features: [] };
  }
}

export async function forceReloadApp(): Promise<void> {
  try {
    // 1. Limpar Service Worker Caches se houver
    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
    }

    // 2. Desregistrar Service Workers antigos para garantir download dos novos arquivos
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
  } catch (e) {
    console.error("Erro ao limpar caches:", e);
  }

  // 3. Forçar recarregamento ignorando o cache local da WebView
  const baseUrl = window.location.href.split("#")[0].split("?")[0];
  window.location.replace(`${baseUrl}?v=${Date.now()}`);
}
