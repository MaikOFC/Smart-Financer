import { Transaction } from "../types";

/**
 * Calcula quantas parcelas restam a partir do mês selecionado até o mês de quitação/fim.
 * Retorna 0 se a parcela já foi quitada antes do mês selecionado.
 */
export function getRemainingInstallments(endDateStr?: string, selectedMonth?: string): number {
  if (!endDateStr || !selectedMonth) return 0;
  try {
    const [selYear, selMonth] = selectedMonth.substring(0, 7).split("-").map(Number);
    const [endYear, endMonth] = endDateStr.substring(0, 7).split("-").map(Number);
    if (!selYear || !selMonth || !endYear || !endMonth) return 0;

    const monthsDifference = (endYear - selYear) * 12 + (endMonth - selMonth);
    return monthsDifference < 0 ? 0 : monthsDifference + 1;
  } catch {
    return 0;
  }
}

/**
 * Verifica se uma parcela está ativa no mês selecionado:
 * - Deve ser da seção de parcelas (bottom_left)
 * - Mês selecionado deve ser >= mês de início (se informado)
 * - Restam 1 ou mais parcelas no mês selecionado (mês selecionado <= mês de quitação)
 */
export function isInstallmentActiveInMonth(t: Transaction, selectedMonth: string): boolean {
  if (t.tableSection !== "bottom_left") return false;
  
  if (t.startDate) {
    const startM = t.startDate.substring(0, 7);
    if (selectedMonth < startM) return false;
  }

  const remaining = getRemainingInstallments(t.date, selectedMonth);
  return remaining > 0;
}

/**
 * Retorna todas as parcelas ativas para o mês selecionado.
 */
export function getActiveInstallmentsForMonth(transactions: Transaction[], selectedMonth: string): Transaction[] {
  return transactions.filter((t) => isInstallmentActiveInMonth(t, selectedMonth));
}

/**
 * Calcula a soma dos valores de parcelas devidos no mês selecionado.
 */
export function getMonthlyInstallmentsTotal(transactions: Transaction[], selectedMonth: string): number {
  const active = getActiveInstallmentsForMonth(transactions, selectedMonth);
  return active.reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calcula a data de quitação (YYYY-MM-01) com base no mês de início e quantidade de parcelas.
 * Ex: início "2026-08", 5 parcelas -> término "2026-12-01".
 */
export function calculateEndDateFromInstallments(startMonthYYYYMM: string, totalInstallments: number): string {
  try {
    const [yearStr, monthStr] = startMonthYYYYMM.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed

    if (isNaN(year) || isNaN(month) || totalInstallments <= 0) {
      return `${startMonthYYYYMM}-01`;
    }

    // Soma (totalInstallments - 1) meses ao mês inicial
    const dateObj = new Date(year, month - 1 + (totalInstallments - 1), 1);
    const endYear = dateObj.getFullYear();
    const endMonth = String(dateObj.getMonth() + 1).padStart(2, "0");
    return `${endYear}-${endMonth}-01`;
  } catch {
    return `${startMonthYYYYMM}-01`;
  }
}

/**
 * Retorna o número total de parcelas estimado ou configurado.
 */
export function getTotalInstallmentCount(t: Transaction): number {
  if (t.totalInstallments && t.totalInstallments > 0) {
    return t.totalInstallments;
  }
  if (t.startDate && t.date) {
    try {
      const [sY, sM] = t.startDate.substring(0, 7).split("-").map(Number);
      const [eY, eM] = t.date.substring(0, 7).split("-").map(Number);
      const diff = (eY - sY) * 12 + (eM - sM) + 1;
      if (diff > 0) return diff;
    } catch {}
  }
  return 0;
}
