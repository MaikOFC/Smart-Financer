import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { processImportFile } from "../utils/fileParser";
import { Transaction } from "../types";

interface SpreadsheetUploadProps {
  onImportTransactions: (imported: Transaction[]) => void;
  className?: string;
  hideHeader?: boolean;
  isCompact?: boolean;
}

export default function SpreadsheetUpload({
  onImportTransactions,
  className = "",
  hideHeader = false,
  isCompact = false,
}: SpreadsheetUploadProps) {
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

    try {
      const imported = await processImportFile(file, (step) => setLoadingStep(step));
      onImportTransactions(imported);
      setSuccess(`Sucesso! Foram importadas ${imported.length} transações processadas com IA!`);
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

  return (
    <div id="upload-panel" className={className || "bg-slate-900 rounded-3xl border border-slate-800 p-6 mb-8 relative overflow-hidden"}>
      {!hideHeader && (
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <div>
            <h3 className="font-bold text-white text-base">Importação Inteligente de Planilhas e Prints</h3>
            <p className="text-xs text-slate-400">Arraste sua planilha (.xlsx, .csv) ou um PRINT/IMAGEM da sua tabela para migração automática por IA</p>
          </div>
        </div>
      )}

      <div
        id="drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl ${
          isCompact ? "p-5" : "p-8"
        } flex flex-col items-center justify-center cursor-pointer transition-all ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/30"
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
            <Loader2 className="w-9 h-9 text-indigo-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-200">{loadingStep}</p>
            <p className="text-xs text-slate-500 font-mono">Por favor, aguarde alguns instantes enquanto a IA organiza suas finanças...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="flex gap-2.5 text-slate-500 items-center">
              <FileSpreadsheet className={`${isCompact ? "w-7 h-7" : "w-9 h-9"} text-emerald-400`} />
              <Upload className="w-4 h-4 text-indigo-400" />
              <ImageIcon className={`${isCompact ? "w-7 h-7" : "w-9 h-9"} text-indigo-400`} />
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-300">
              <span className="text-indigo-400 font-bold">Clique para selecionar</span> ou arraste o arquivo aqui
            </p>
            <p className="text-[11px] text-slate-500 max-w-md">
              Suporta planilhas Excel (.xlsx, .xls), arquivos CSV ou capturas de tela/fotos de extratos e contas
            </p>
          </div>
        )}
      </div>

      {error && (
        <div id="upload-error" className="mt-3.5 flex items-start gap-2.5 p-3.5 bg-rose-500/10 text-rose-300 rounded-xl border border-rose-500/20 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
          <div>
            <span className="font-bold">Erro de importação: </span>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div id="upload-success" className="mt-3.5 flex items-start gap-2.5 p-3.5 bg-emerald-500/10 text-emerald-300 rounded-xl border border-emerald-500/20 text-xs">
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
