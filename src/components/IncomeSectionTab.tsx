import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  Briefcase,
  Check,
  Calendar,
  TrendingUp,
  Plus,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { IncomeConfig, IncomeMode, Transaction, WorkScheduleType } from "../types";
import {
  WEEK_DAYS_PT,
  calculateHourlyIncomeForMonth,
  formatMonthLabel,
  getDaysInYearMonth,
  getScheduleWeekDays,
  parseDecimalInput,
} from "../utils/incomeUtils";
import AnimatedNumber from "./AnimatedNumber";
import TransactionDetailModal from "./TransactionDetailModal";

interface IncomeSectionTabProps {
  selectedMonth: string;
  activeBudget: number;
  defaultSalary: number;
  incomeConfig: IncomeConfig;
  currentMonthGains: Transaction[];
  categories?: string[];
  onSaveIncomeConfig: (
    nextConfig: IncomeConfig,
    targetMonthAmount: number,
    applyToFutureMonths: boolean
  ) => Promise<void> | void;
  onBackToHome: () => void;
  onAddExtraGain: () => void;
  onUpdateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
}

const SCHEDULE_OPTIONS: { id: WorkScheduleType; label: string; hint: string }[] = [
  { id: "6x1", label: "6x1", hint: "1 folga/sem" },
  { id: "5x2", label: "5x2", hint: "Seg a Sex" },
  { id: "12x36", label: "12x36", hint: "Dia sim/não" },
  { id: "custom", label: "Personalizado", hint: "Definir dias" },
];

export default function IncomeSectionTab({
  selectedMonth,
  activeBudget,
  defaultSalary,
  incomeConfig,
  currentMonthGains,
  categories = [],
  onSaveIncomeConfig,
  onBackToHome,
  onAddExtraGain,
  onUpdateTransaction,
  onDeleteTransaction,
}: IncomeSectionTabProps) {
  const [mode, setMode] = useState<IncomeMode>(incomeConfig.mode);
  const [monthlyInput, setMonthlyInput] = useState<string>(() =>
    String(activeBudget || incomeConfig.monthlySalary || defaultSalary || 0)
  );
  const [hourlyRateInput, setHourlyRateInput] = useState<string>(() =>
    String(incomeConfig.hourlyRate ?? 15)
  );
  const [hoursPerDayInput, setHoursPerDayInput] = useState<string>(() =>
    String(incomeConfig.hoursPerDay ?? 8)
  );
  const [paidDaysOff, setPaidDaysOff] = useState<boolean>(incomeConfig.paidDaysOff ?? true);
  const [scheduleType, setScheduleType] = useState<WorkScheduleType>(
    incomeConfig.scheduleType || "6x1"
  );
  const [workWeekDays, setWorkWeekDays] = useState<number[]>(
    incomeConfig.workWeekDays && incomeConfig.workWeekDays.length > 0
      ? incomeConfig.workWeekDays
      : [1, 2, 3, 4, 5, 6]
  );
  const [customWorkDaysInput, setCustomWorkDaysInput] = useState<string>(() =>
    String(incomeConfig.customWorkDays ?? 22)
  );
  const [customOffDaysInput, setCustomOffDaysInput] = useState<string>(() =>
    String(incomeConfig.customOffDays ?? 8)
  );
  const [applyToFutureMonths, setApplyToFutureMonths] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedGainForDetail, setSelectedGainForDetail] = useState<Transaction | null>(null);

  // Sync draft when month or saved config changes externally
  useEffect(() => {
    setMode(incomeConfig.mode);
    setMonthlyInput(
      String(
        incomeConfig.mode === "monthly"
          ? activeBudget
          : incomeConfig.monthlySalary ?? activeBudget ?? defaultSalary ?? 0
      )
    );
    setHourlyRateInput(String(incomeConfig.hourlyRate ?? 15));
    setHoursPerDayInput(String(incomeConfig.hoursPerDay ?? 8));
    setPaidDaysOff(incomeConfig.paidDaysOff ?? true);
    setScheduleType(incomeConfig.scheduleType || "6x1");
    setWorkWeekDays(
      incomeConfig.workWeekDays && incomeConfig.workWeekDays.length > 0
        ? incomeConfig.workWeekDays
        : getScheduleWeekDays(incomeConfig.scheduleType || "6x1")
    );
    setCustomWorkDaysInput(String(incomeConfig.customWorkDays ?? 22));
    setCustomOffDaysInput(String(incomeConfig.customOffDays ?? 8));
  }, [selectedMonth, incomeConfig, activeBudget, defaultSalary]);

  useEffect(() => {
    setJustSaved(false);
  }, [selectedMonth]);

  const daysInMonth = useMemo(() => getDaysInYearMonth(selectedMonth), [selectedMonth]);
  const monthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

  const draftConfig: IncomeConfig = useMemo(
    () => ({
      mode,
      monthlySalary: parseDecimalInput(monthlyInput),
      hourlyRate: parseDecimalInput(hourlyRateInput),
      hoursPerDay: parseDecimalInput(hoursPerDayInput),
      paidDaysOff,
      scheduleType,
      workWeekDays,
      customWorkDays: Math.min(31, Math.max(0, Math.round(parseDecimalInput(customWorkDaysInput)))),
      customOffDays: Math.min(31, Math.max(0, Math.round(parseDecimalInput(customOffDaysInput)))),
    }),
    [
      mode,
      monthlyInput,
      hourlyRateInput,
      hoursPerDayInput,
      paidDaysOff,
      scheduleType,
      workWeekDays,
      customWorkDaysInput,
      customOffDaysInput,
    ]
  );

  const hourlyBreakdown = useMemo(
    () => calculateHourlyIncomeForMonth(draftConfig, selectedMonth),
    [draftConfig, selectedMonth]
  );

  const gainsTotal = useMemo(
    () => currentMonthGains.reduce((sum, g) => sum + (g.amount || 0), 0),
    [currentMonthGains]
  );

  const previewBaseIncome =
    mode === "hourly" ? hourlyBreakdown.totalMonthly : parseDecimalInput(monthlyInput);
  const previewTotalIncome = previewBaseIncome + gainsTotal;

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatHours = (val: number) =>
    Number.isInteger(val)
      ? `${val}h`
      : `${val.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}h`;

  const handleSelectSchedule = (nextSchedule: WorkScheduleType) => {
    setScheduleType(nextSchedule);
    setJustSaved(false);
    if (nextSchedule === "5x2" || nextSchedule === "6x1") {
      setWorkWeekDays(getScheduleWeekDays(nextSchedule));
    } else if (nextSchedule === "custom") {
      const currentWork = hourlyBreakdown.workDays;
      const currentOff = Math.max(0, daysInMonth - currentWork);
      setCustomWorkDaysInput(String(currentWork));
      setCustomOffDaysInput(String(currentOff));
    }
  };

  const handleToggleWeekDay = (day: number) => {
    setJustSaved(false);
    setWorkWeekDays((prev) => {
      const exists = prev.includes(day);
      if (exists && prev.length <= 1) return prev; // Keep at least 1 workday
      const next = exists ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b);
      return next;
    });
  };

  const handleCustomWorkDaysChange = (value: string) => {
    setCustomWorkDaysInput(value);
    setJustSaved(false);
    const parsed = Math.min(daysInMonth, Math.max(0, Math.round(parseDecimalInput(value))));
    if (value.trim() !== "") {
      setCustomOffDaysInput(String(Math.max(0, daysInMonth - parsed)));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalConfig: IncomeConfig = {
        ...draftConfig,
        monthlySalary:
          mode === "monthly"
            ? previewBaseIncome
            : incomeConfig.monthlySalary ?? defaultSalary,
      };
      await onSaveIncomeConfig(finalConfig, previewBaseIncome, applyToFutureMonths);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section id="income-section-tab" className="space-y-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-800/80 p-4 sm:p-6 shadow-xl space-y-6">
        {/* CABEÇALHO DA ABA RECEITA */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToHome}
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
              title="Voltar para o Início"
              aria-label="Voltar para o Início"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white truncate">
                Receita do Mês
              </h2>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span>{monthLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{mode === "hourly" ? "Horista" : "Mensalista"}</span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 block leading-tight">
              Receita total
            </span>
            <div className="text-lg sm:text-2xl font-black font-mono tabular-nums text-emerald-400 leading-tight mt-0.5">
              R$ <AnimatedNumber value={previewTotalIncome} decimals={2} />
            </div>
            {gainsTotal > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-slate-400 block mt-0.5">
                Base R$ {formatMoney(previewBaseIncome)} + Extras R$ {formatMoney(gainsTotal)}
              </span>
            )}
          </div>
        </div>

        {/* FORMULÁRIO PRINCIPAL */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* SELETOR DE REGIME: MENSALISTA vs HORISTA */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Modelo de remuneração
            </label>
            <div
              role="tablist"
              aria-label="Modelo de remuneração"
              className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950 rounded-2xl border border-slate-800"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "monthly"}
                onClick={() => {
                  setMode("monthly");
                  setJustSaved(false);
                }}
                className={`min-h-[48px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  mode === "monthly"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Briefcase className="w-4 h-4 shrink-0" />
                <span>Mensalista</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === "hourly"}
                onClick={() => {
                  setMode("hourly");
                  setJustSaved(false);
                }}
                className={`min-h-[48px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  mode === "hourly"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Horista</span>
              </button>
            </div>
          </div>

          {mode === "monthly" ? (
            /* ================= MODO MENSALISTA ================= */
            <div className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="input-monthly-salary"
                  className="text-xs font-semibold text-slate-300 block"
                >
                  Salário / Receita fixa mensal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-slate-400 pointer-events-none">
                    R$
                  </span>
                  <input
                    id="input-monthly-salary"
                    type="text"
                    inputMode="decimal"
                    value={monthlyInput}
                    onChange={(e) => {
                      setMonthlyInput(e.target.value);
                      setJustSaved(false);
                    }}
                    placeholder="2500,00"
                    className="w-full min-h-[52px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 rounded-2xl pl-12 pr-4 py-3 text-lg font-mono font-bold tabular-nums text-white transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Informe o valor líquido previsto para {monthLabel.toLowerCase()}.
                </p>
              </div>
            </div>
          ) : (
            /* ================= MODO HORISTA ================= */
            <div className="space-y-6">
              {/* CAMPOS PRINCIPAIS: VALOR/HORA E HORAS/DIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="input-hourly-rate"
                    className="text-xs font-semibold text-slate-300 block"
                  >
                    Quanto recebe por hora
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-slate-400 pointer-events-none">
                      R$
                    </span>
                    <input
                      id="input-hourly-rate"
                      type="text"
                      inputMode="decimal"
                      value={hourlyRateInput}
                      onChange={(e) => {
                        setHourlyRateInput(e.target.value);
                        setJustSaved(false);
                      }}
                      placeholder="15,00"
                      className="w-full min-h-[52px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 rounded-2xl pl-12 pr-14 py-3 text-lg font-mono font-bold tabular-nums text-white transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400 pointer-events-none">
                      /hora
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="input-hours-per-day"
                    className="text-xs font-semibold text-slate-300 block"
                  >
                    Quantas horas trabalha por dia
                  </label>
                  <div className="relative">
                    <input
                      id="input-hours-per-day"
                      type="text"
                      inputMode="decimal"
                      value={hoursPerDayInput}
                      onChange={(e) => {
                        setHoursPerDayInput(e.target.value);
                        setJustSaved(false);
                      }}
                      placeholder="8"
                      className="w-full min-h-[52px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 rounded-2xl pl-4 pr-16 py-3 text-lg font-mono font-bold tabular-nums text-white transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400 pointer-events-none">
                      h/dia
                    </span>
                  </div>
                </div>
              </div>

              {/* RECEBE NA FOLGA? (SIM / NÃO) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Você recebe na folga?
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {paidDaysOff
                      ? `+ R$ ${formatMoney(hourlyBreakdown.offDaysEarnings)} (${hourlyBreakdown.offDays} folgas)`
                      : `${hourlyBreakdown.offDays} folgas não pagas`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidDaysOff(true);
                      setJustSaved(false);
                    }}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      paidDaysOff
                        ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold block">
                        Sim, recebo
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        Folgas remuneradas
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        paidDaysOff
                          ? "bg-emerald-500 border-emerald-500 text-slate-950"
                          : "border-slate-700"
                      }`}
                    >
                      {paidDaysOff && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaidDaysOff(false);
                      setJustSaved(false);
                    }}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      !paidDaysOff
                        ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold block">
                        Não recebo
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        Só dias trabalhados
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        !paidDaysOff
                          ? "bg-emerald-500 border-emerald-500 text-slate-950"
                          : "border-slate-700"
                      }`}
                    >
                      {!paidDaysOff && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* ESCALA E DIAS DE TRABALHO / FOLGA */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Escala de trabalho
                  </span>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {monthLabel}: {daysInMonth} dias
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SCHEDULE_OPTIONS.map((opt) => {
                    const isActive = scheduleType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectSchedule(opt.id)}
                        className={`min-h-[46px] px-3 py-2 rounded-xl border text-center transition-colors cursor-pointer ${
                          isActive
                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <span className="text-xs font-bold block whitespace-nowrap">
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block whitespace-nowrap">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* SELETOR DE DIAS DA SEMANA (PARA 6x1 E 5x2) */}
                {(scheduleType === "6x1" || scheduleType === "5x2") && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] text-slate-400 block">
                      Toque para marcar seus dias de trabalho (desmarcados contam como folga):
                    </span>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEK_DAYS_PT.map(({ day, short, label }) => {
                        const isWorkDay = workWeekDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleToggleWeekDay(day)}
                            title={`${label}: ${isWorkDay ? "Dia trabalhado" : "Folga"}`}
                            className={`min-h-[44px] rounded-xl border text-xs font-bold transition-colors cursor-pointer flex flex-col items-center justify-center ${
                              isWorkDay
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <span>{short}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ENTRADA MANUAL (PERSONALIZADO) */}
                {scheduleType === "custom" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="input-custom-work-days"
                        className="text-[11px] font-semibold text-slate-400 block"
                      >
                        Dias trabalhados no mês
                      </label>
                      <input
                        id="input-custom-work-days"
                        type="number"
                        min={0}
                        max={31}
                        value={customWorkDaysInput}
                        onChange={(e) => handleCustomWorkDaysChange(e.target.value)}
                        className="w-full min-h-[46px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold tabular-nums text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="input-custom-off-days"
                        className="text-[11px] font-semibold text-slate-400 block"
                      >
                        Folgas no mês
                      </label>
                      <input
                        id="input-custom-off-days"
                        type="number"
                        min={0}
                        max={31}
                        value={customOffDaysInput}
                        onChange={(e) => {
                          setCustomOffDaysInput(e.target.value);
                          setJustSaved(false);
                        }}
                        className="w-full min-h-[46px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold tabular-nums text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RESUMO TRANSPARENTE DO CÁLCULO HORISTA */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 block">
                  Demonstrativo de {monthLabel}
                </span>

                <div className="divide-y divide-slate-800/80 text-xs sm:text-sm">
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-400">
                      Valor por dia ({formatHours(hourlyBreakdown.hoursPerDay)} × R$ {formatMoney(hourlyBreakdown.hourlyRate)})
                    </span>
                    <span className="font-mono font-bold tabular-nums text-slate-200">
                      R$ {formatMoney(hourlyBreakdown.dailyEarnings)}
                    </span>
                  </div>

                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-400">
                      Dias trabalhados ({hourlyBreakdown.workDays} dias · {formatHours(hourlyBreakdown.workedHours)})
                    </span>
                    <span className="font-mono font-bold tabular-nums text-white">
                      R$ {formatMoney(hourlyBreakdown.workedEarnings)}
                    </span>
                  </div>

                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-400">
                      Folgas no mês ({hourlyBreakdown.offDays} dias ·{" "}
                      {paidDaysOff ? "remuneradas" : "não remuneradas"})
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        paidDaysOff ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {paidDaysOff
                        ? `+ R$ ${formatMoney(hourlyBreakdown.offDaysEarnings)}`
                        : "R$ 0,00"}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="font-bold text-white">
                      Salário base calculado ({hourlyBreakdown.totalPaidDays} dias ·{" "}
                      {formatHours(hourlyBreakdown.totalPaidHours)})
                    </span>
                    <span className="font-mono font-black tabular-nums text-base text-emerald-400">
                      R$ {formatMoney(hourlyBreakdown.totalMonthly)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APLICAR AOS PRÓXIMOS MESES */}
          <label className="flex items-start gap-3 pt-2 border-t border-slate-800/80 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyToFutureMonths}
              onChange={(e) => {
                setApplyToFutureMonths(e.target.checked);
                setJustSaved(false);
              }}
              className="sr-only peer"
            />
            <div className="mt-0.5 w-5 h-5 rounded-md border border-slate-700 bg-slate-950 flex items-center justify-center peer-checked:border-emerald-500 peer-checked:bg-emerald-500 text-transparent peer-checked:text-slate-950 transition-colors shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-slate-200 block">
                Aplicar também para os próximos 12 meses
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {mode === "hourly"
                  ? "Calcula automaticamente os dias úteis e folgas reais de cada mês."
                  : "Atualiza seu salário base padrão para este mês e os próximos meses."}
              </span>
            </div>
          </label>

          {/* BOTÃO SALVAR */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full min-h-[50px] px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-60 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando receita...</span>
              </>
            ) : justSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Receita salva com sucesso!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  Salvar como {mode === "hourly" ? "Horista" : "Mensalista"} (R${" "}
                  {formatMoney(previewBaseIncome)})
                </span>
              </>
            )}
          </button>
        </form>

        {/* GANHOS EXTRAS DO MÊS */}
        <div className="pt-5 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Ganhos extras em {monthLabel}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Horas extras avulsas, bônus ou rendas adicionais somam na receita total.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddExtraGain}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ganho extra</span>
            </button>
          </div>

          {currentMonthGains.length === 0 ? (
            <p className="text-xs text-slate-500 py-3">
              Nenhum ganho extra registrado neste mês.
            </p>
          ) : (
            <div className="divide-y divide-slate-800/80 border-t border-slate-800/60">
              {currentMonthGains.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedGainForDetail(g)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-white block truncate">
                      {g.description}
                    </span>
                    <span className="text-xs text-slate-400 block truncate">
                      {g.category || "Outros"}
                      {g.note ? ` · ${g.note}` : ""}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono tabular-nums text-emerald-400 shrink-0">
                    + R$ {formatMoney(g.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHE DO GANHO EXTRA */}
      <TransactionDetailModal
        transaction={selectedGainForDetail}
        isOpen={Boolean(selectedGainForDetail)}
        onClose={() => setSelectedGainForDetail(null)}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransaction={onDeleteTransaction}
        categories={categories}
        selectedMonth={selectedMonth}
      />
    </section>
  );
}
