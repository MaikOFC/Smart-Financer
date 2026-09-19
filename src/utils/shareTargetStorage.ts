/**
 * Utilitário para gerenciar dados recebidos via Web Share Target (PWA / APK)
 * Suporta IndexedDB (compartilhamento com arquivos/POST) e URL Query Params (GET simples).
 */

export interface SharedPayloadItem {
  id: string;
  timestamp: number;
  title?: string;
  text?: string;
  url?: string;
  files?: File[] | Blob[];
}

function openShareDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB não suportado neste navegador."));
    }

    const request = window.indexedDB.open("smartfin_pwa_share_db", 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("shared_items")) {
        db.createObjectStore("shared_items", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Busca todos os itens pendentes que foram compartilhados para o SmartFin
 */
export async function getPendingSharedPayloads(): Promise<SharedPayloadItem[]> {
  const items: SharedPayloadItem[] = [];

  // 1. Checar parâmetros da URL caso o navegador tenha aberto diretamente com GET
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const title = urlParams.get("title");
    const text = urlParams.get("text") || urlParams.get("shared_text");
    const url = urlParams.get("url");

    if (text || title || url) {
      items.push({
        id: "url_share_" + Date.now(),
        timestamp: Date.now(),
        title: title || "",
        text: text || "",
        url: url || "",
        files: [],
      });

      // Limpar parâmetros da URL sem recarregar a página
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  // 2. Checar IndexedDB alimentado pelo Service Worker
  try {
    const db = await openShareDB();
    const dbItems = await new Promise<SharedPayloadItem[]>((resolve, reject) => {
      const tx = db.transaction("shared_items", "readonly");
      const store = tx.objectStore("shared_items");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (dbItems && dbItems.length > 0) {
      items.push(...dbItems);
    }
  } catch (err) {
    console.warn("[ShareStorage] Aviso ao acessar IndexedDB de compartilhamento:", err);
  }

  return items;
}

/**
 * Remove um item do IndexedDB após o usuário processar ou descartar
 */
export async function deleteSharedPayload(id: string): Promise<void> {
  if (id.startsWith("url_share_")) return;

  try {
    const db = await openShareDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("shared_items", "readwrite");
      const store = tx.objectStore("shared_items");
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ShareStorage] Erro ao deletar payload compartilhado:", err);
  }
}

/**
 * Limpa todos os itens compartilhados pendentes
 */
export async function clearAllSharedPayloads(): Promise<void> {
  try {
    const db = await openShareDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("shared_items", "readwrite");
      const store = tx.objectStore("shared_items");
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[ShareStorage] Erro ao limpar payloads compartilhados:", err);
  }
}
