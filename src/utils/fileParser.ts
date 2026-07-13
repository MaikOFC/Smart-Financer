import * as XLSX from "xlsx";

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
