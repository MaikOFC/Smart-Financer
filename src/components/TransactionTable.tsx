import React, { useState } from "react";
import { Transaction } from "../types";
import { Plus, Trash2, Edit2, Check, X, Star } from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  onAddTransaction: (section: "left" | "right" | "bottom_left") => void;
  onUpdateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  selectedMonth: string; // YYYY-MM
  categories?: string[];
}

export default function TransactionTable({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  selectedMonth,
  categories,
}: TransactionTableProps) {
  // Local state for editing rows
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setEditDesc(t.description);
    setEditAmount(t.amount);
    setEditNote(t.note || "");
    setEditCategory(t.category || "Outros");
    setEditDate(t.date);
  };

  const saveEditing = (id: string) => {
    onUpdateTransaction(id, {
      description: editDesc,
      amount: editAmount,
      note: editNote,
      category: editCategory,
      date: editDate,
    });
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  // Filter transactions for the selected month
  const filterByMonth = (t: Transaction) => {
    if (t.tableSection === "bottom_left") return true; // Keep all receivables visible
    return t.date.startsWith(selectedMonth);
  };

  const leftTransactions = transactions.filter((t) => t.tableSection === "left" && filterByMonth(t));
  const rightTransactions = transactions.filter((t) => t.tableSection === "right" && filterByMonth(t));
  const bottomTransactions = transactions.filter((t) => t.tableSection === "bottom_left" && filterByMonth(t));

  // Compute Left Table Total
  const leftTotal = leftTransactions.reduce((acc, t) => {
    if (t.isDiscount) {
      return acc - t.amount;
    }
    return acc + t.amount;
  }, 0);

  // Compute Right Table Total
  const rightTotal = rightTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Categories list
  const defaultCategories = ["Moradia", "Alimentação", "Transporte", "Lazer", "Tecnologia", "Saúde", "Família", "Outros"];
  const finalCategories = categories && categories.length > 0 ? categories : defaultCategories;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* TABELA ESQUERDA - GASTOS MENSAL */}
      <div id="table-left-container" className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700/50 transition-all">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Despesas Mensais (Esquerda)</h3>
              <p className="text-xs text-slate-400">Contas regulares e de consumo do mês</p>
            </div>
            <button
              id="btn-add-left"
              onClick={() => onAddTransaction("left")}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-500/15 transition-all"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Produto</th>
                  <th className="py-3 px-2">Categoria</th>
                  <th className="py-3 px-2">Preço</th>
                  <th className="py-3 px-2 text-center">Destaque</th>
                  <th className="py-3 px-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leftTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-mono">
                      Nenhuma despesa mensal registrada para este mês.
                    </td>
                  </tr>
                ) : (
                  leftTransactions.map((t) => {
                    const isEditing = editingId === t.id;
                    const rowBg = t.isOrangeHighlight
                      ? "bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 border-l-4 border-amber-500"
                      : t.isDiscount
                      ? "bg-slate-800/40 hover:bg-slate-800/50 text-slate-400 italic border-l-4 border-slate-600"
                      : "hover:bg-slate-800/20 border-l-4 border-transparent text-slate-300";

                    return (
                      <tr key={t.id} className={`transition-all ${rowBg}`}>
                        {/* Descrição */}
                        <td className="py-3 px-2 font-medium">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span>{t.description}</span>
                              {t.isDiscount && (
                                <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded uppercase font-bold not-italic">
                                  Desconto
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                            >
                              {finalCategories.map((c) => (
                                <option key={c} value={c} className="bg-slate-900">
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/50 px-2 py-0.5 rounded-full font-medium">
                              {t.category || "Outros"}
                            </span>
                          )}
                        </td>

                        {/* Preço */}
                        <td className="py-3 px-2 font-bold font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-24 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          ) : (
                            <span className={t.isDiscount ? "text-slate-400 font-normal" : "text-slate-200"}>
                              {t.isDiscount ? "- " : ""}
                              R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Destaque (Estilo de Planilha) */}
                        <td className="py-3 px-2 text-center">
                          {!isEditing && (
                            <div className="flex justify-center gap-1.5">
                              {/* Orange Highlight Toggle */}
                              <button
                                onClick={() => onUpdateTransaction(t.id, { isOrangeHighlight: !t.isOrangeHighlight, isDiscount: false })}
                                title="Destacar Laranja"
                                className={`p-1.5 rounded-lg transition-all ${
                                  t.isOrangeHighlight ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700"
                                }`}
                              >
                                <Star className="w-3 h-3 fill-current" />
                              </button>
                              {/* Discount Toggle */}
                              <button
                                onClick={() => onUpdateTransaction(t.id, { isDiscount: !t.isDiscount, isOrangeHighlight: false })}
                                title="Marcar como Desconto"
                                className={`p-1.5 rounded-lg text-xs font-black transition-all ${
                                  t.isDiscount ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700"
                                }`}
                              >
                                %
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditing(t.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditing} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(t)}
                                  className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteTransaction(t.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total da Tabela Esquerda */}
        <div className="mt-6 border-t border-slate-800 pt-4 flex items-center justify-between">
          <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Total Despesas Esquerda:</span>
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-2xl text-base font-black font-mono">
            R$ {leftTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* TABELA DIREITA - COMPRAS ESPECIAIS / GASTOS DE TECNOLOGIA */}
      <div id="table-right-container" className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700/50 transition-all">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Planejamento & Compras Futuras (Direita)</h3>
              <p className="text-xs text-slate-400">Eletrônicos, desejos e itens futuros para planejamento visual</p>
            </div>
            <button
              id="btn-add-right"
              onClick={() => onAddTransaction("right")}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-500/15 transition-all"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Produto</th>
                  <th className="py-3 px-2">Preço Estimado (R$)</th>
                  <th className="py-3 px-2">Label / Nota</th>
                  <th className="py-3 px-2">Categoria</th>
                  <th className="py-3 px-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rightTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-mono">
                      Nenhum planejamento ou compra futura registrada.
                    </td>
                  </tr>
                ) : (
                  rightTransactions.map((t) => {
                    const isEditing = editingId === t.id;
                    const hasSpecialLabel = t.amount === 0 && t.note;

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/20 transition-all text-slate-300">
                        {/* Descrição */}
                        <td className="py-3 px-2 font-medium">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          ) : (
                            t.description
                          )}
                        </td>

                        {/* Preço */}
                        <td className="py-3 px-2 font-bold font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-24 text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <span className={hasSpecialLabel ? "text-slate-500 italic font-normal" : "text-slate-200"}>
                              {hasSpecialLabel
                                ? "—"
                                : `R$ ${t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                          )}
                        </td>

                        {/* Label / Nota */}
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none"
                              placeholder="Karinne, 3D, etc."
                            />
                          ) : (
                            t.note && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                {t.note}
                              </span>
                            )
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                            >
                              {finalCategories.map((c) => (
                                <option key={c} value={c} className="bg-slate-900">
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/50 px-2 py-0.5 rounded-full font-medium">
                              {t.category || "Outros"}
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditing(t.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditing} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(t)}
                                  className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteTransaction(t.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total da Tabela Direita */}
        <div className="mt-6 border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Total Planejado (Direita):</span>
            <span className="text-[10px] text-slate-500 font-medium font-sans">Valor meramente informativo (não diminui o saldo do mês)</span>
          </div>
          <div className="bg-slate-950/55 text-amber-400 border border-slate-800 px-4 py-2 rounded-2xl text-base font-black font-mono">
            R$ {rightTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR - PARCELAS / RECEBÍVEIS (BOTTOM LEFT) */}
      <div id="table-bottom-container" className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-6 hover:border-slate-700/50 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Parcelas, Reembolsos e Devedores (Bottom)</h3>
            <p className="text-xs text-slate-400">Controle de dinheiro emprestado ou a receber de parentes e amigos</p>
          </div>
          <button
            id="btn-add-bottom"
            onClick={() => onAddTransaction("bottom_left")}
            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-xl border border-emerald-500/15 transition-all"
          >
            <Plus className="w-4 h-4" /> Adicionar Parcela
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Valor Parcela</th>
                <th className="py-3 px-2">Mês Quitação</th>
                <th className="py-3 px-2 text-center">Parcelas Restantes</th>
                <th className="py-3 px-2">Saldo Devedor</th>
                <th className="py-3 px-2">Descrição / Detalhe</th>
                <th className="py-3 px-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bottomTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-mono">
                    Nenhuma parcela registrada.
                  </td>
                </tr>
              ) : (
                bottomTransactions.map((t) => {
                  const isEditing = editingId === t.id;

                  // Dynamic calculation of remaining installments based on selected month
                  const getRemainingInstallments = (endDateStr: string) => {
                    try {
                      const [selYear, selMonth] = selectedMonth.split("-").map(Number);
                      const [endYear, endMonth] = endDateStr.substring(0, 7).split("-").map(Number);
                      if (!selYear || !selMonth || !endYear || !endMonth) return 0;

                      const monthsDifference = (endYear - selYear) * 12 + (endMonth - selMonth);
                      return monthsDifference < 0 ? 0 : monthsDifference + 1;
                    } catch {
                      return 0;
                    }
                  };

                  const remainingCount = getRemainingInstallments(t.date);
                  const remainingAmount = t.amount * remainingCount;

                  const formatDateString = (ds: string) => {
                    try {
                      const d = new Date(ds + "T00:00:00");
                      const monthNames = [
                        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                      ];
                      return `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
                    } catch (e) {
                      return ds;
                    }
                  };

                  return (
                    <tr key={t.id} className={`hover:bg-slate-800/20 transition-all text-slate-300 ${remainingCount > 0 ? "bg-amber-500/[0.01]" : "opacity-40"}`}>
                      {/* Valor Parcela */}
                      <td className="py-3 px-2 font-black font-mono text-emerald-400">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                            className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-24 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          `R$ ${t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>

                      {/* Mês de Quitação */}
                      <td className="py-3 px-2 text-slate-400 font-medium">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          formatDateString(t.date)
                        )}
                      </td>

                      {/* Parcelas Restantes */}
                      <td className="py-3 px-2 text-center">
                        {remainingCount > 0 ? (
                          <span className="inline-block px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-full font-bold font-mono text-[10px]">
                            {remainingCount}x restantes
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full font-bold font-sans text-[10px]">
                            ✓ Quitada!
                          </span>
                        )}
                      </td>

                      {/* Saldo Restante */}
                      <td className="py-3 px-2 font-bold font-mono">
                        {remainingCount > 0 ? (
                          <span className="text-amber-400">
                            R$ {remainingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-500">R$ 0,00</span>
                        )}
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-2 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          t.description
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEditing(t.id)}
                                className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(t)}
                                className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteTransaction(t.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Total da Tabela de Parcelas (Saldo Devedor Restante) */}
        <div className="mt-6 border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Saldo Devedor Total Restante:</span>
            <span className="text-[10px] text-slate-500 font-medium font-sans">
              Soma de todas as parcelas ativas a vencer a partir de {
                new Date(selectedMonth + "-15").toLocaleString("pt-BR", { month: "long", year: "numeric" })
              }
            </span>
          </div>
          <div className="bg-slate-950/55 text-amber-400 border border-slate-800 px-4 py-2 rounded-2xl text-base font-black font-mono">
            R$ {
              bottomTransactions.reduce((acc, t) => {
                const getRemainingCount = (endDateStr: string) => {
                  try {
                    const [selYear, selMonth] = selectedMonth.split("-").map(Number);
                    const [endYear, endMonth] = endDateStr.substring(0, 7).split("-").map(Number);
                    if (!selYear || !selMonth || !endYear || !endMonth) return 0;
                    const monthsDifference = (endYear - selYear) * 12 + (endMonth - selMonth);
                    return monthsDifference < 0 ? 0 : monthsDifference + 1;
                  } catch {
                    return 0;
                  }
                };
                return acc + (t.amount * getRemainingCount(t.date));
              }, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }
          </div>
        </div>
      </div>
    </div>
  );
}
