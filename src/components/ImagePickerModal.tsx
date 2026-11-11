import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Search,
  Upload,
  Globe,
  Loader2,
  Check,
  Image as ImageIcon,
  Trash2,
  Sparkles,
} from "lucide-react";

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
  initialQuery?: string;
  currentImageUrl?: string;
}

interface ImageResult {
  id: string;
  title: string;
  thumbnail: string;
  fullUrl: string;
  source: string;
}

const QUICK_SUGGESTIONS = [
  "iPhone",
  "Notebook",
  "Carro",
  "Moto",
  "Viagem",
  "PlayStation",
  "Apartamento",
  "Smart TV",
  "Relógio",
  "Tênis",
];

export default function ImagePickerModal({
  isOpen,
  onClose,
  onSelectImage,
  initialQuery = "",
  currentImageUrl = "",
}: ImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "upload">("search");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<ImageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImageUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preenche a busca inicial quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const q = initialQuery.trim();
      setSearchQuery(q);
      setSelectedUrl(currentImageUrl);
      setUploadError(null);
      if (q) {
        handleSearch(q);
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }
  }, [isOpen, initialQuery, currentImageUrl]);

  const handleSearch = async (termToSearch: string) => {
    const q = termToSearch.trim();
    if (!q) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Erro ao buscar imagens:", err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const maxDim = 400; // alta resolução para miniatura de 48px
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            setSelectedUrl(dataUrl);
          }
        } catch (err) {
          console.error("Erro ao processar imagem:", err);
          setUploadError("Não foi possível carregar esta imagem. Tente outra.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    onSelectImage(selectedUrl);
    onClose();
  };

  const handleRemove = () => {
    setSelectedUrl("");
    onSelectImage("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Foto do Item de Planejamento</h3>
                <p className="text-xs text-slate-400">Escolha da internet ou envie do seu dispositivo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas: Pesquisa na Web vs Fazer Upload */}
          <div className="flex border-b border-slate-800 px-5 pt-3 gap-4 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "search"
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="w-4 h-4" /> Pesquisar na Web (Google / Bing)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Upload className="w-4 h-4" /> Enviar do Dispositivo
            </button>
          </div>

          {/* Conteúdo da Aba */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {activeTab === "search" ? (
              <div className="space-y-4">
                {/* Campo de pesquisa estilo WhatsApp */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch(searchQuery);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Pesquise o nome do item (ex: iPhone, Carro, PS5)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !searchQuery.trim()}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Buscar
                  </button>
                </form>

                {/* Sugestões rápidas */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500 font-semibold mr-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-400" /> Sugestões:
                  </span>
                  {QUICK_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setSearchQuery(sug);
                        handleSearch(sug);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>

                {/* Resultados da busca */}
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                    <p className="text-xs">Buscando fotos na internet...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {searchResults.map((img) => {
                      const isSelected = selectedUrl === img.thumbnail;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setSelectedUrl(img.thumbnail)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group bg-slate-950 ${
                            isSelected
                              ? "border-orange-500 ring-2 ring-orange-500/30 scale-95"
                              : "border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <img
                            src={img.thumbnail}
                            alt={img.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-orange-500/25 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center shadow-lg">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : hasSearched ? (
                  <div className="py-10 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800 p-4 space-y-1">
                    <p className="text-xs font-bold text-slate-300">Nenhuma imagem encontrada</p>
                    <p className="text-[11px] text-slate-500">
                      Tente buscar com outro termo ou faça upload de um arquivo do seu dispositivo.
                    </p>
                  </div>
                ) : (
                  <div className="py-10 text-center text-slate-500 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800 p-4">
                    <p className="text-xs">Digite o nome do produto acima para pesquisar fotos reais.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Aba de Upload */
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-orange-500 bg-slate-950/50 hover:bg-slate-950 p-8 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 group-hover:bg-orange-500/20 text-orange-400 flex items-center justify-center transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                      Clique aqui para escolher uma foto
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      JPG, PNG ou WebP do seu celular ou computador
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400 font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    {uploadError}
                  </p>
                )}
              </div>
            )}

            {/* Preview da Imagem Selecionada */}
            {selectedUrl && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedUrl}
                    alt="Selecionada"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider block">
                      Foto Selecionada
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      Esta foto ficará à esquerda do título
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUrl("")}
                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                  title="Remover imagem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2">
            <div>
              {currentImageUrl && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover Imagem
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-orange-400 hover:bg-orange-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-orange-500/10"
              >
                <Check className="w-4 h-4 stroke-[3]" /> Concluir
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
