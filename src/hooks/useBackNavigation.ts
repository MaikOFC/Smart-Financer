import { useEffect, useRef } from "react";

/**
 * Hook para interceptar o botão físico/gesto de "Voltar" do celular (e navegador)
 * e fechar o modal ou aba aberta em vez de sair do aplicativo ou fechar a página.
 * 
 * Suporta múltiplos modais/abas sobrepostos de forma empilhada (LIFO - Last In, First Out)
 * e evita fechamentos indevidos em cascata durante transições entre telas.
 */

interface ModalStackEntry {
  id: string;
  modalIdentifier: string;
  onClose: () => void;
}

// Pilha global única de modais/drawers abertos
const modalStack: ModalStackEntry[] = [];
let isProgrammaticBack = false;
let globalListenerAttached = false;

function initGlobalPopstateListener() {
  if (typeof window === "undefined" || globalListenerAttached) return;
  globalListenerAttached = true;

  window.addEventListener("popstate", () => {
    // Se o evento foi gerado pelo nosso próprio history.back() durante fechamento via UI, ignoramos
    if (isProgrammaticBack) {
      isProgrammaticBack = false;
      return;
    }

    // Se o usuário apertou o botão "Voltar" do celular ou navegador:
    if (modalStack.length > 0) {
      const topModal = modalStack.pop();
      if (topModal) {
        try {
          topModal.onClose();
        } catch (e) {
          console.error("Erro ao fechar modal via botão voltar:", e);
        }
      }
    }
  });
}

export function useModalBackHandler(
  isOpen: boolean,
  onClose: () => void,
  modalIdentifier: string
) {
  const modalIdRef = useRef<string>("");
  const isRegisteredRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    initGlobalPopstateListener();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (isRegisteredRef.current) {
        const idToRemove = modalIdRef.current;
        isRegisteredRef.current = false;

        const index = modalStack.findIndex((m) => m.id === idToRemove);
        const wasTop = index === modalStack.length - 1;
        if (index !== -1) {
          modalStack.splice(index, 1);
        }

        try {
          if (wasTop && window.history.state && window.history.state.__app_modal === idToRemove) {
            isProgrammaticBack = true;
            window.history.back();
            setTimeout(() => {
              isProgrammaticBack = false;
            }, 150);
          }
        } catch {
          isProgrammaticBack = false;
        }
      }
      return;
    }

    // Modal abriu: cria identificador único e registra no topo da pilha
    const uniqueId = `${modalIdentifier}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    modalIdRef.current = uniqueId;
    isRegisteredRef.current = true;

    modalStack.push({
      id: uniqueId,
      modalIdentifier,
      onClose: () => onCloseRef.current(),
    });

    try {
      window.history.pushState(
        { __app_modal: uniqueId, modalName: modalIdentifier },
        ""
      );
    } catch {
      // Ignora restrições de sandbox
    }

    return () => {
      if (isRegisteredRef.current) {
        const idToRemove = modalIdRef.current;
        isRegisteredRef.current = false;

        const index = modalStack.findIndex((m) => m.id === idToRemove);
        const wasTop = index === modalStack.length - 1;
        if (index !== -1) {
          modalStack.splice(index, 1);
        }

        try {
          if (wasTop && window.history.state && window.history.state.__app_modal === idToRemove) {
            isProgrammaticBack = true;
            window.history.back();
            setTimeout(() => {
              isProgrammaticBack = false;
            }, 150);
          }
        } catch {
          isProgrammaticBack = false;
        }
      }
    };
  }, [isOpen, modalIdentifier]);
}

