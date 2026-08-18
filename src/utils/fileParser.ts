import * as XLSX from "xlsx";
import { Transaction } from "../types";

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

/**
 * Parses an Excel (.xlsx/.xls) or CSV file and returns raw tabular data as a list of lists of strings.
 */
export function parseSpreadsheetFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.name.endsWith(".csv")) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split("\n").map((line) => {
            // Handle basic comma or semicolon separated values
            const delimiter = line.includes(";") ? ";" : ",";
            return line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ""));
          });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file, "UTF-8");
    } else {
      // Excel files
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Get raw rows including empty cells
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    }
  });
}

/**
 * Helper to convert raw row data into structured text that is readable by Gemini.
 */
export function formatTabularDataForAI(rows: any[][]): string {
  return rows
    .map((row, idx) => {
      const rowStr = row.map((cell) => (cell !== undefined && cell !== null ? String(cell) : "")).join(" | ");
      return `Linha ${idx + 1}: ${rowStr}`;
    })
    .join("\n");
}

/**
 * High-level helper to process any spreadsheet or image/print file using the AI backend.
 */
export async function processImportFile(
  file: File,
  onStepUpdate?: (step: string) => void
): Promise<Transaction[]> {
  const isImage = file.type.startsWith("image/");
  const isSpreadsheet =
    file.name.endsWith(".csv") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!isImage && !isSpreadsheet) {
    throw new Error("Formato não suportado. Por favor, envie uma planilha (.csv, .xlsx) ou uma imagem/print.");
  }

  if (isImage) {
    onStepUpdate?.("Lendo arquivo de imagem...");
    const base64 = await convertFileToBase64(file);
    const mimeType = file.type;

    onStepUpdate?.("Analisando comprovante/print com IA Gemini...");
    const response = await fetch("/api/parse-spreadsheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
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
    onStepUpdate?.("Lendo dados da planilha...");
    const rawRows = await parseSpreadsheetFile(file);
    const formattedText = formatTabularDataForAI(rawRows);

    onStepUpdate?.("Estruturando transações com IA Gemini...");
    const response = await fetch("/api/parse-spreadsheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textData: formattedText }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Erro ao processar planilha.");
    }

    if (data.transactions && data.transactions.length > 0) {
      return data.transactions;
    } else {
      throw new Error("Não foi possível mapear transações válidas a partir desta planilha.");
    }
  }
}
