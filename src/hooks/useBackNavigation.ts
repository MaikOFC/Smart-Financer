import { useEffect, useRef } from "react";

/**
 * Hook para interceptar o botão físico/gesto de "Voltar" do celular (e navegador)
 * e fechar o modal ou aba aberta em vez de sair do aplicativo ou fechar a página.
 * 
 * Suporta múltiplos modais/abas sobrepostos de forma empilhada (LIFO - Last In, First Out).
 */
export function useModalBackHandler(
  isOpen: boolean,
  onClose: () => void,
  modalIdentifier: string
) {
  const isPushedRef = useRef(false);
  const modalIdRef = useRef("");
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      // Se estava empilhado e foi fechado via UI (botão X, salvar, etc)
      if (isPushedRef.current) {
        isPushedRef.current = false;
        // Se a entrada atual do histórico ainda for a deste modal, desfazemos ela
        try {
          if (window.history.state && window.history.state.__app_modal === modalIdRef.current) {
            window.history.back();
          }
        } catch {
          // Ignora caso restrito por sandbox
        }
      }
      return;
    }

    // Modal acabou de abrir: criamos um identificador único
    const uniqueId = `${modalIdentifier}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    modalIdRef.current = uniqueId;

    try {
      window.history.pushState(
        { __app_modal: uniqueId, modalName: modalIdentifier },
        ""
      );
      isPushedRef.current = true;
    } catch {
      // Ignora caso restrito
    }

    const handlePopState = (event: PopStateEvent) => {
      // Se este modal estava aberto e o evento de popstate disparou
      if (isPushedRef.current) {
        // Marca que o fechamento veio do popstate do navegador/celular,
        // para que o cleanup NÃO chame history.back() em loop
        isPushedRef.current = false;
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (isPushedRef.current) {
        isPushedRef.current = false;
        try {
          if (window.history.state && window.history.state.__app_modal === modalIdRef.current) {
            window.history.back();
          }
        } catch {
          // Ignora caso restrito
        }
      }
    };
  }, [isOpen, modalIdentifier]);
}
