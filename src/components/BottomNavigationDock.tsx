import React from "react";
import { motion } from "motion/react";
import { Home, TrendingDown, Target, Layers, Plus } from "lucide-react";

export type AppNavTab = "home" | "expenses" | "planning" | "installments";

interface BottomNavigationDockProps {
  activeTab: AppNavTab;
  onTabChange: (tab: AppNavTab) => void;
  onOpenAddModal: () => void;
  expensesCount: number;
  planningCount: number;
  installmentsCount: number;
}

export default function BottomNavigationDock({
  activeTab,
  onTabChange,
  onOpenAddModal,
  expensesCount,
  planningCount,
  installmentsCount,
}: BottomNavigationDockProps) {
  return (
    <div className="fixed bottom-3 sm:bottom-5 inset-x-0 z-40 pointer-events-none flex flex-col items-center justify-end px-3">
      <div className="relative pointer-events-auto w-full max-w-md sm:max-w-lg">
        {/* BOTÃO FLUTUANTE DE ADIÇÃO (+) POSICIONADO ACIMA NO CENTRO DA BARRA */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50">
          <motion.button
            id="btn-dock-add"
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onOpenAddModal}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center font-black shadow-xl shadow-emerald-500/35 border-2 border-slate-900 cursor-pointer transition-colors group"
            title="Adicionar Novo Registro"
          >
            <Plus className="w-7 h-7 stroke-[3] text-slate-950 group-hover:rotate-90 transition-transform" />
          </motion.button>
        </div>

        {/* BARRA CINZA / DARK COM AS 4 ABAS DE NAVEGAÇÃO (APENAS ÍCONES) */}
        <nav
          aria-label="Navegação Principal"
          className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-950/80 px-3 py-2.5"
        >
          <div className="grid grid-cols-4 gap-2 items-center">
            {/* ABA 1: INÍCIO */}
            <button
              id="tab-btn-home"
              type="button"
              onClick={() => onTabChange("home")}
              title="Início"
              className={`flex items-center justify-center py-2.5 px-2 rounded-2xl transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-transform ${
                  activeTab === "home"
                    ? "bg-emerald-500 text-slate-950 scale-110 shadow-md shadow-emerald-500/25"
                    : "text-slate-400"
                }`}
              >
                <Home className="w-5 h-5 stroke-[2.5]" />
              </div>
            </button>

            {/* ABA 2: DESPESAS */}
            <button
              id="tab-btn-expenses"
              type="button"
              onClick={() => onTabChange("expenses")}
              title={`Despesas (${expensesCount})`}
              className={`flex items-center justify-center py-2.5 px-2 rounded-2xl transition-all cursor-pointer ${
                activeTab === "expenses"
                  ? "bg-rose-500/15 border border-rose-500/40 text-rose-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-transform ${
                  activeTab === "expenses"
                    ? "bg-rose-500 text-white scale-110 shadow-md shadow-rose-500/25"
                    : "text-slate-400"
                }`}
              >
                <TrendingDown className="w-5 h-5 stroke-[2.5]" />
              </div>
            </button>

            {/* ABA 3: METAS */}
            <button
              id="tab-btn-planning"
              type="button"
              onClick={() => onTabChange("planning")}
              title={`Metas (${planningCount})`}
              className={`flex items-center justify-center py-2.5 px-2 rounded-2xl transition-all cursor-pointer ${
                activeTab === "planning"
                  ? "bg-orange-500/15 border border-orange-500/40 text-orange-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-transform ${
                  activeTab === "planning"
                    ? "bg-orange-500 text-white scale-110 shadow-md shadow-orange-500/25"
                    : "text-slate-400"
                }`}
              >
                <Target className="w-5 h-5 stroke-[2.5]" />
              </div>
            </button>

            {/* ABA 4: PARCELAS */}
            <button
              id="tab-btn-installments"
              type="button"
              onClick={() => onTabChange("installments")}
              title={`Parcelas (${installmentsCount})`}
              className={`flex items-center justify-center py-2.5 px-2 rounded-2xl transition-all cursor-pointer ${
                activeTab === "installments"
                  ? "bg-purple-500/15 border border-purple-500/40 text-purple-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-transform ${
                  activeTab === "installments"
                    ? "bg-purple-500 text-white scale-110 shadow-md shadow-purple-500/25"
                    : "text-slate-400"
                }`}
              >
                <Layers className="w-5 h-5 stroke-[2.5]" />
              </div>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
