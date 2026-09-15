import { Transaction } from "../types";

export interface InstallmentMeta {
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
  startDate: string; // YYYY-MM alias for convenience
  endDate: string; // YYYY-MM alias for convenience
  totalInstallments: number;
}

/**
 * Calcula o mês inicial a partir do mês final e quantidade de parcelas.
 * Ex: término "2026-03", 3 parcelas -> início "2026-01" (Jan, Fev, Mar).
 */
export function calculateStartDateFromEndDate(endMonthYYYYMM: string, totalInstallments: number): string {
  try {
    const [yearStr, monthStr] = endMonthYYYYMM.substring(0, 7).split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed

    if (isNaN(year) || isNaN(month) || totalInstallments <= 1) {
      return endMonthYYYYMM.substring(0, 7);
    }

    const dateObj = new Date(year, month - 1 - (totalInstallments - 1), 1);
    const startYear = dateObj.getFullYear();
    const startMonth = String(dateObj.getMonth() + 1).padStart(2, "0");
    return `${startYear}-${startMonth}`;
  } catch {
    return endMonthYYYYMM.substring(0, 7);
  }
}

/**
 * Calcula a data de quitação (YYYY-MM-01) com base no mês de início e quantidade de parcelas.
 * Ex: início "2026-01", 3 parcelas -> término "2026-03-01".
 */
export function calculateEndDateFromInstallments(startMonthYYYYMM: string, totalInstallments: number): string {
  try {
    const [yearStr, monthStr] = startMonthYYYYMM.substring(0, 7).split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed

    if (isNaN(year) || isNaN(month) || totalInstallments <= 0) {
      return `${startMonthYYYYMM.substring(0, 7)}-01`;
    }

    // Soma (totalInstallments - 1) meses ao mês inicial
    const dateObj = new Date(year, month - 1 + (totalInstallments - 1), 1);
    const endYear = dateObj.getFullYear();
    const endMonth = String(dateObj.getMonth() + 1).padStart(2, "0");
    return `${endYear}-${endMonth}-01`;
  } catch {
    return `${startMonthYYYYMM.substring(0, 7)}-01`;
  }
}

/**
 * Extrai os metadados confiáveis de uma parcela (mês início, mês fim, total de parcelas).
 * Tolera ausência de campos explícitos deduzindo de notas ("3x", "6x", etc.) ou das datas.
 */
export function getInstallmentMeta(t: Transaction): InstallmentMeta {
  const noteStr = t.note || "";
  let totalInstallments = t.totalInstallments && t.totalInstallments > 0 ? t.totalInstallments : 0;
  let startMonth = t.startDate ? t.startDate.substring(0, 7) : "";
  let endMonth = t.date ? t.date.substring(0, 7) : "";

  // 1. Tenta extrair metadados codificados na nota: [meta:start=YYYY-MM,total=N]
  const metaMatch = noteStr.match(/\[meta:start=([0-9]{4}-[0-9]{2}),total=([0-9]+)\]/i);
  if (metaMatch) {
    if (!startMonth) startMonth = metaMatch[1];
    if (!totalInstallments) totalInstallments = parseInt(metaMatch[2], 10);
  }

  // 2. Se total não foi definido, tenta extrair da nota (ex: "3x parcelas", "6x", "10 parcelas")
  if (!totalInstallments) {
    const xMatch = noteStr.match(/(\d+)\s*x/i) || t.description.match(/(\d+)\s*x/i);
    if (xMatch) {
      const parsed = parseInt(xMatch[1], 10);
      if (parsed > 0 && parsed <= 120) totalInstallments = parsed;
    } else {
      const pMatch = noteStr.match(/(\d+)\s*parcela/i) || t.description.match(/(\d+)\s*parcela/i);
      if (pMatch) {
        const parsed = parseInt(pMatch[1], 10);
        if (parsed > 0 && parsed <= 120) totalInstallments = parsed;
      }
    }
  }

  // 3. Se temos startMonth e endMonth, podemos calcular o total
  if (startMonth && endMonth && !totalInstallments) {
    try {
      const [sY, sM] = startMonth.split("-").map(Number);
      const [eY, eM] = endMonth.split("-").map(Number);
      const diff = (eY - sY) * 12 + (eM - sM) + 1;
      if (diff > 0) totalInstallments = diff;
    } catch {}
  }

  // Fallback para totalInstallments se ainda for 0
  if (!totalInstallments) {
    totalInstallments = 1;
  }

  // 4. Se não temos startMonth, mas temos endMonth e totalInstallments: calcula regressivamente!
  if (!startMonth && endMonth) {
    startMonth = calculateStartDateFromEndDate(endMonth, totalInstallments);
  }

  // 5. Se não temos endMonth, mas temos startMonth e totalInstallments: calcula progressivamente!
  if (!endMonth && startMonth) {
    endMonth = calculateEndDateFromInstallments(startMonth, totalInstallments).substring(0, 7);
  }

  return {
    startMonth,
    endMonth,
    startDate: startMonth,
    endDate: endMonth,
    totalInstallments,
  };
}

/**
 * Remove a tag [meta:start=...,total=...] do campo note para exibição limpa ao usuário.
 */
export function stripMetaFromNote(note?: string): string {
  if (!note) return "";
  return note.replace(/\[meta:start=[^,]+,total=[0-9]+\]/gi, "").trim();
}

/**
 * Verifica se uma parcela está estritamente ATIVA no mês selecionado:
 * - Deve ser da seção de parcelas (bottom_left)
 * - Mês selecionado deve estar dentro do intervalo [startMonth, endMonth] inclusive.
 * - Retorna false para qualquer mês antes do início ou depois do término.
 */
export function isInstallmentActiveInMonth(t: Transaction, selectedMonth?: string): boolean {
  if (t.tableSection !== "bottom_left" || !selectedMonth) return false;

  const selM = selectedMonth.substring(0, 7);
  const meta = getInstallmentMeta(t);

  if (!meta.startMonth || !meta.endMonth) return false;

  // Ativa estritamente entre o mês de início e o mês de término
  return selM >= meta.startMonth && selM <= meta.endMonth;
}

/**
 * Calcula quantas parcelas restam a partir do mês selecionado até o mês de quitação.
 * Retorna 0 se a parcela já foi quitada OU se ela ainda não começou no mês selecionado.
 */
export function getRemainingInstallments(
  tOrEndDate?: Transaction | string,
  selectedMonth?: string,
  totalInstallmentsHint?: number,
  startDateHint?: string
): number {
  if (!tOrEndDate || !selectedMonth) return 0;

  const selM = selectedMonth.substring(0, 7);

  // Se receber uma Transaction completa:
  if (typeof tOrEndDate === "object") {
    const meta = getInstallmentMeta(tOrEndDate);
    if (!meta.startMonth || !meta.endMonth) return 0;

    // Se o mês selecionado é anterior ao início da parcela -> 0 restantes (não iniciou)
    if (selM < meta.startMonth) return 0;

    // Se o mês selecionado é posterior ao fim da parcela -> 0 restantes (já quitada)
    if (selM > meta.endMonth) return 0;

    try {
      const [selYear, selMonthNum] = selM.split("-").map(Number);
      const [endYear, endMonthNum] = meta.endMonth.split("-").map(Number);
      const diff = (endYear - selYear) * 12 + (endMonthNum - selMonthNum);
      const remaining = diff + 1;
      return Math.min(meta.totalInstallments, Math.max(0, remaining));
    } catch {
      return 0;
    }
  }

  // Se receber uma string de data final (endDateStr):
  try {
    const endM = tOrEndDate.substring(0, 7);
    const [selYear, selMonthNum] = selM.split("-").map(Number);
    const [endYear, endMonthNum] = endM.split("-").map(Number);
    if (!selYear || !selMonthNum || !endYear || !endMonthNum) return 0;

    // Se passou do fim
    const diff = (endYear - selYear) * 12 + (endMonthNum - selMonthNum);
    if (diff < 0) return 0;

    // Se temos hint de início
    if (startDateHint && selM < startDateHint.substring(0, 7)) {
      return 0;
    }

    // Se temos hint de total de parcelas, podemos verificar se o mês é anterior ao início
    if (totalInstallmentsHint && totalInstallmentsHint > 0) {
      const deducedStart = calculateStartDateFromEndDate(endM, totalInstallmentsHint);
      if (selM < deducedStart) return 0;
      return Math.min(totalInstallmentsHint, diff + 1);
    }

    return diff + 1;
  } catch {
    return 0;
  }
}

/**
 * Retorna o número da parcela correspondente ao mês selecionado (ex: Parcela 1 de 3).
 * Retorna 0 se inativa no mês selecionado.
 */
export function getInstallmentCurrentNumber(t: Transaction, selectedMonth: string): number {
  if (!isInstallmentActiveInMonth(t, selectedMonth)) return 0;
  const meta = getInstallmentMeta(t);
  const remaining = getRemainingInstallments(t, selectedMonth);
  if (remaining <= 0) return 0;
  return meta.totalInstallments - remaining + 1;
}

/**
 * Retorna todas as parcelas ativas para o mês selecionado.
 */
export function getActiveInstallmentsForMonth(transactions: Transaction[], selectedMonth: string): Transaction[] {
  if (!Array.isArray(transactions) || !selectedMonth) return [];
  return transactions.filter((t) => isInstallmentActiveInMonth(t, selectedMonth));
}

/**
 * Calcula a soma dos valores de parcelas devidos no mês selecionado.
 */
export function getMonthlyInstallmentsTotal(transactions: Transaction[], selectedMonth: string): number {
  const active = getActiveInstallmentsForMonth(transactions, selectedMonth);
  return active.reduce((sum, t) => {
    const val = typeof t.amount === "number" && !isNaN(t.amount) ? t.amount : 0;
    return sum + val;
  }, 0);
}

/**
 * Retorna o número total de parcelas configurado ou estimado.
 */
export function getTotalInstallmentCount(t: Transaction): number {
  return getInstallmentMeta(t).totalInstallments;
}

