import * as XLSX from "xlsx";
import { Transaction } from "../types";

export interface ParsedSheetData {
  sheetName: string;
  rows: string[][];
}

/**
 * Converts a file to base64 data string.
 */
export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (err) => reject(err);
  });
}

function formatCellValue(cell: unknown): string {
  if (cell === undefined || cell === null) return "";
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(cell).replace(/\s+/g, " ").trim();
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectCsvDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 5).join("\n");
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;
  if (tabs > semicolons && tabs > commas) return "\t";
  if (semicolons >= commas && semicolons > 0) return ";";
  return ",";
}

/**
 * Parses an Excel (.xlsx/.xls) or CSV file and returns non-empty sheets with cleaned string rows.
 */
export function parseSpreadsheetSheets(file: File): Promise<ParsedSheetData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".csv") || file.type === "text/csv" || file.type === "application/csv") {
      reader.onload = (e) => {
        try {
          const rawText = ((e.target?.result as string) || "").replace(/^\uFEFF/, "");
          const rawLines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (rawLines.length === 0) {
            resolve([]);
            return;
          }
          const delimiter = detectCsvDelimiter(rawLines);
          const rows = rawLines
            .map((line) => parseCsvLine(line, delimiter).map((c) => c.trim()))
            .filter((row) => row.some((cell) => cell.length > 0));

          resolve([{ sheetName: "CSV", rows }]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file, "UTF-8");
    } else {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(buffer), {
            type: "array",
            cellDates: true,
          });

          const sheets: ParsedSheetData[] = [];
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;
            const rawRows = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              raw: true,
              defval: "",
            }) as unknown[][];

            const cleanedRows = rawRows
              .map((row) => {
                const formatted = row.map(formatCellValue);
                // Trim trailing empty cells per row
                while (formatted.length > 0 && formatted[formatted.length - 1] === "") {
                  formatted.pop();
                }
                return formatted;
              })
              .filter((row) => row.some((cell) => cell.length > 0));

            if (cleanedRows.length > 0) {
              sheets.push({ sheetName, rows: cleanedRows });
            }
          }

          resolve(sheets);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Legacy helper kept for compatibility.
 */
export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  const sheets = await parseSpreadsheetSheets(file);
  return sheets[0]?.rows || [];
}

/**
 * Helper to convert parsed sheets/rows into structured column-aware text readable by Gemini.
 */
export function formatSheetsForAI(sheets: ParsedSheetData[], maxRowsTotal = 450): string {
  const parts: string[] = [];
  let rowCount = 0;

  for (const sheet of sheets) {
    if (rowCount >= maxRowsTotal) break;
    parts.push(`=== Aba: ${sheet.sheetName} ===`);
    for (let idx = 0; idx < sheet.rows.length; idx++) {
      if (rowCount >= maxRowsTotal) break;
      const row = sheet.rows[idx];
      const prefix = idx === 0 ? "Linha 1 (Colunas/Cabeçalho)" : `Linha ${idx + 1}`;
      parts.push(`${prefix}: ${row.join(" | ")}`);
      rowCount++;
    }
  }

  return parts.join("\n");
}

export function formatTabularDataForAI(rows: unknown[][]): string {
  return rows
    .slice(0, 450)
    .map((row, idx) => {
      const rowStr = row.map(formatCellValue).join(" | ");
      return `Linha ${idx + 1}: ${rowStr}`;
    })
    .join("\n");
}

/**
 * High-level helper to process any spreadsheet (.xlsx, .xls, .csv) or image/print file using the AI backend.
 */
export async function processImportFile(
  file: File,
  onStepUpdate?: (step: string) => void,
  selectedMonth?: string
): Promise<Transaction[]> {
  const lowerName = file.name.toLowerCase();
  const isImage = file.type.startsWith("image/");
  const isSpreadsheet =
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    file.type === "text/csv" ||
    file.type === "application/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!isImage && !isSpreadsheet) {
    throw new Error("Formato não suportado. Envie uma planilha Excel (.xlsx, .xls), CSV (.csv) ou uma imagem.");
  }

  if (isImage) {
    onStepUpdate?.("Lendo arquivo de imagem...");
    const base64 = await convertFileToBase64(file);
    const mimeType = file.type;

    onStepUpdate?.("Analisando imagem com IA Gemini...");
    const response = await fetch("/api/parse-spreadsheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mimeType, selectedMonth, fileName: file.name }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Erro ao processar imagem.");
    }

    if (data.transactions && data.transactions.length > 0) {
      return data.transactions;
    } else {
      throw new Error("Nenhuma transação identificável encontrada na imagem.");
    }
  } else {
    onStepUpdate?.("Lendo colunas e linhas da planilha...");
    const sheets = await parseSpreadsheetSheets(file);
    if (sheets.length === 0) {
      throw new Error("A planilha está vazia ou não possui linhas legíveis.");
    }

    const formattedText = formatSheetsForAI(sheets);

    onStepUpdate?.("IA Gemini analisando colunas e extraindo gastos...");
    const response = await fetch("/api/parse-spreadsheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textData: formattedText, selectedMonth, fileName: file.name }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Erro ao processar planilha.");
    }

    if (data.transactions && data.transactions.length > 0) {
      return data.transactions;
    } else {
      throw new Error("Não foi possível mapear transações válidas a partir das colunas desta planilha.");
    }
  }
}
