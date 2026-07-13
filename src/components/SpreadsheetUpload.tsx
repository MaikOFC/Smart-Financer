import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { parseSpreadsheetFile, formatTabularDataForAI } from "../utils/fileParser";
import { Transaction } from "../types";

interface SpreadsheetUploadProps {
  onImportTransactions: (imported: Transaction[]) => void;
}

export default function SpreadsheetUpload({ onImportTransactions }: SpreadsheetUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const isImage = file.type.startsWith("image/");
    const isSpreadsheet =
      file.name.endsWith(".csv") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.type === "text/csv" ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!isImage && !isSpreadsheet) {
      setError("Formato não suportado. Por favor, envie uma planilha (.csv, .xlsx) ou um print/imagem de planilha.");
      setLoading(false);
      return;
    }

    try {
      if (isImage) {
        setLoadingStep("Lendo arquivo de imagem...");
        const base64 = await convertFileToBase64(file);
        const mimeType = file.type;

        setLoadingStep("Enviando para a IA Gemini analisar o print...");
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
          onImportTransactions(data.transactions);
          setSuccess(`Sucesso! Foram importadas ${data.transactions.length} transações identificadas por IA no seu print!`);
        } else {
          throw new Error("Nenhuma transação identificável encontrada no print.");
        }
      } else {
        setLoadingStep("Lendo dados da planilha...");
        const rawRows = await parseSpreadsheetFile(file);
        const formattedText = formatTabularDataForAI(rawRows);

        setLoadingStep("Enviando dados estruturados para a IA mapear...");
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
          onImportTransactions(data.transactions);
          setSuccess(`Sucesso! Importamos ${data.transactions.length} transações diretamente da sua planilha!`);
        } else {
          throw new Error("Não foi possível mapear transações válidas a partir desta planilha.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro inesperado ao ler o arquivo. Certifique-se de que é um formato válido.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  return (
    <div id="upload-panel" className="bg-slate-900 rounded-3xl border border-slate-800 p-6 mb-8 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
        <div>
          <h3 className="font-bold text-white text-base">Importação Inteligente de Planilhas e Prints</h3>
          <p className="text-xs text-slate-400">Arraste sua planilha (.xlsx, .csv) ou um PRINT/IMAGEM da sua tabela para migração automática por IA</p>
        </div>
      </div>

      <div
        id="drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/30"
        } ${loading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls, image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {loading ? (
          <div className="flex flex-col items-center text-center space-y-3">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-200">{loadingStep}</p>
            <p className="text-xs text-slate-500 font-mono">Por favor, aguarde alguns instantes enquanto a IA organiza suas finanças...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex gap-3 text-slate-500">
              <FileSpreadsheet className="w-10 h-10 text-slate-400" />
              <Upload className="w-5 h-5 self-end text-indigo-400" />
              <ImageIcon className="w-10 h-10 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-300">
              <span className="text-indigo-400 font-semibold">Clique para fazer upload</span> ou arraste e solte o arquivo aqui
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              Suporta planilhas Excel (.xlsx, .xls), arquivos CSV ou imagens de tabelas (capturas de tela)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div id="upload-error" className="mt-4 flex items-start gap-2.5 p-4 bg-rose-500/10 text-rose-300 rounded-2xl border border-rose-500/20 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
          <div>
            <span className="font-bold">Erro de importação: </span>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div id="upload-success" className="mt-4 flex items-start gap-2.5 p-4 bg-emerald-500/10 text-emerald-300 rounded-2xl border border-emerald-500/20 text-xs">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <div>
            <span className="font-bold">Importação concluída! </span>
            {success}
          </div>
        </div>
      )}
    </div>
  );
}
