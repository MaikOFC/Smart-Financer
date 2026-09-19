import { Transaction } from "../types";

export interface ParsedReceiptData {
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  tableSection: "left" | "right" | "bottom_left";
  bank?: string;
  note?: string;
  rawText?: string;
  isInstallment?: boolean;
  installmentCount?: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentação: ["ifood", "restaurante", "supermercado", "mercado", "padaria", "açougue", "lanchonete", "pizza", "hambúrguer", "burger", "café", "almoço", "jantar", "refeição"],
  Transporte: ["uber", "99", "posto", "combustível", "gasolina", "etanol", "estacionamento", "pedágio", "metro", "ônibus", "passagem"],
  Moradia: ["aluguel", "condomínio", "enel", "luz", "energia", "sabesp", "água", "gás", "comgas", "internet", "claro", "vivo", "tim", "iptu"],
  Saúde: ["farmácia", "drogaria", "droga raia", "drogasil", "médico", "consulta", "exame", "hospital", "dentista", "laboratório", "remédio"],
  Lazer: ["cinema", "netflix", "spotify", "ingresso", "show", "viagem", "hotel", "hospedagem", "bar", "cervejaria", "steam", "playstation"],
  Tecnologia: ["apple", "google", "amazon", "mercado livre", "aliexpress", "kabum", "pichau", "hardware", "eletrônico", "informática", "celular", "computador"],
  Família: ["escola", "colégio", "faculdade", "curso", "mãe", "pai", "filho", "irmão", "pensão", "mesada"],
};

/**
 * Heurística instantânea e offline para textos de comprovantes bancários brasileiros
 * (Nubank, Itaú, Bradesco, Inter, Santander, C6, Caixa, BB, PicPay, etc.)
 */
export function parseReceiptTextOffline(text: string): ParsedReceiptData {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Extração do Valor
  let amount = 0;
  // Procura padrões como R$ 123,45 ou R$123.45 ou Valor: 123,45
  const amountMatch = normalized.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
                      normalized.match(/valor(?:\s*pago|\s*da\s*transfer[eê]ncia)?[:\s]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
                      normalized.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/);

  if (amountMatch && amountMatch[1]) {
    const rawVal = amountMatch[1].replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 2. Extração do Destinatário / Beneficiário / Descrição
  let recipient = "";
  const recipientMatch = normalized.match(/(?:para|destinat[áa]rio|favorecido|benefici[áa]rio|recebedor|pago a|nome)[:\s]+([^\n\r,]+)/i);
  if (recipientMatch && recipientMatch[1]) {
    recipient = recipientMatch[1].trim();
    // Limpeza de sufixos bancários
    recipient = recipient.replace(/\s*-\s*(?:cpf|cnpj).*$/i, "").trim();
  }

  // 3. Extração da Data
  let date = new Date().toISOString().split("T")[0]; // Fallback: hoje
  const dateMatch = normalized.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    date = `${year}-${month}-${day}`;
  }

  // 4. Identificação do Banco / Origem
  let bank = "";
  if (/nu\s*pagamentos|nubank/i.test(normalized)) bank = "Nubank";
  else if (/ita[úu]/i.test(normalized)) bank = "Itaú";
  else if (/bradesco/i.test(normalized)) bank = "Bradesco";
  else if (/banco\s*inter|inter\b/i.test(normalized)) bank = "Banco Inter";
  else if (/santander/i.test(normalized)) bank = "Santander";
  else if (/c6\s*bank|c6/i.test(normalized)) bank = "C6 Bank";
  else if (/caixa\s*econ[oô]mica/i.test(normalized)) bank = "Caixa";
  else if (/banco\s*do\s*brasil|bb\b/i.test(normalized)) bank = "Banco do Brasil";
  else if (/picpay/i.test(normalized)) bank = "PicPay";
  else if (/mercado\s*pago/i.test(normalized)) bank = "Mercado Pago";

  // 5. Descrição Final Amigável
  let finalDescription = recipient ? `Pix - ${recipient}` : "Pagamento / Pix";
  if (bank && !finalDescription.toLowerCase().includes(bank.toLowerCase())) {
    finalDescription = `${finalDescription} (${bank})`;
  }

  // Se o usuário compartilhou um comprovante com tipo de pagamento explícito
  if (/boleto/i.test(normalized)) {
    finalDescription = recipient ? `Boleto - ${recipient}` : "Pagamento de Boleto";
  } else if (/fatura|cart[aã]o/i.test(normalized)) {
    finalDescription = recipient ? `Fatura - ${recipient}` : `Fatura Cartão ${bank || ""}`.trim();
  }

  // 6. Categoria Sugerida
  let category = "Outros";
  const searchCorpus = (normalized + " " + recipient).toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => searchCorpus.includes(kw))) {
      category = cat;
      break;
    }
  }

  // 7. Checagem de Parcelamento
  const installmentMatch = normalized.match(/parcela(?:s|do)?\s*(?:em)?\s*(\d{1,2})\s*x/i) ||
                           normalized.match(/(\d{1,2})x\s*de\s*r\$/i);
  const isInstallment = !!installmentMatch;
  const installmentCount = installmentMatch ? parseInt(installmentMatch[1], 10) : undefined;

  return {
    description: finalDescription,
    amount,
    date,
    category,
    tableSection: isInstallment ? "bottom_left" : "left",
    bank: bank || undefined,
    note: lines.slice(0, 4).join(" • "),
    rawText: text,
    isInstallment,
    installmentCount,
  };
}

/**
 * Converte arquivo para base64
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Processa comprovante completo (imagem, PDF ou texto) usando o backend IA Gemini,
 * com fallback imediato para o parser heurístico local caso o servidor ou IA esteja offline.
 */
export async function parseSharedReceipt(
  text?: string,
  file?: File | Blob
): Promise<ParsedReceiptData> {
  // Se for texto puro sem arquivo, testa o parser local
  const offlineParsed = text ? parseReceiptTextOffline(text) : null;

  try {
    let payload: any = {};

    if (file) {
      const fileName = (file as any).name || "";
      const mimeType = (file as any).type || (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const base64 = await fileToBase64(file);
      payload = {
        fileBase64: base64,
        mimeType,
        text: text || "",
      };
    } else if (text) {
      payload = { text };
    } else {
      throw new Error("Nenhum dado de comprovante disponível.");
    }

    const response = await fetch("/api/parse-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.receipt) {
        return {
          description: result.receipt.description || offlineParsed?.description || "Comprovante Bancário",
          amount: typeof result.receipt.amount === "number" && result.receipt.amount > 0 ? result.receipt.amount : (offlineParsed?.amount || 0),
          date: result.receipt.date || offlineParsed?.date || new Date().toISOString().split("T")[0],
          category: result.receipt.category || offlineParsed?.category || "Outros",
          tableSection: result.receipt.tableSection || (result.receipt.isInstallment ? "bottom_left" : "left"),
          bank: result.receipt.bank || offlineParsed?.bank,
          note: result.receipt.note || offlineParsed?.note,
          rawText: text,
          isInstallment: result.receipt.isInstallment || offlineParsed?.isInstallment,
          installmentCount: result.receipt.installmentCount || offlineParsed?.installmentCount,
        };
      }
    }
  } catch (err) {
    console.warn("[ReceiptParser] Falha na chamada da IA, usando fallback local:", err);
  }

  // Fallback se tiver offlineParsed
  if (offlineParsed) {
    return offlineParsed;
  }

  return {
    description: "Comprovante Recebido",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    category: "Outros",
    tableSection: "left",
    rawText: text,
  };
}
