import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
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
  Percent,
  Info,
} from "lucide-react";
import {
  EmploymentType,
  IncomeConfig,
  IncomeMode,
  Transaction,
  WorkScheduleType,
} from "../types";
import {
  WEEK_DAYS_PT,
  calculateHourlyIncomeForMonth,
  calculatePayrollDiscounts,
  deriveWeeklyHours,
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
  { id: "5x2", label: "5x2", hint: "Seg a Sex" },
  { id: "6x1", label: "6x1", hint: "1 folga/sem" },
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
  const resolveInitialGrossMonthly = (
    cfg: IncomeConfig,
    activeVal: number,
    fallbackSal: number
  ) => {
    const hasNetDeductions = Boolean(cfg.applyInssDiscount) || (Number(cfg.fixedDiscount) || 0) > 0;
    if (
      cfg.mode === "monthly" &&
      hasNetDeductions &&
      typeof cfg.monthlySalary === "number" &&
      !isNaN(cfg.monthlySalary)
    ) {
      return cfg.monthlySalary;
    }
    if (cfg.mode === "monthly") return activeVal;
    return cfg.monthlySalary ?? activeVal ?? fallbackSal ?? 0;
  };

  const formatInputNumber = (val: number) =>
    Number.isInteger(val) ? String(val) : String(val).replace(".", ",");

  const [mode, setMode] = useState<IncomeMode>(incomeConfig.mode);
  const [monthlyInput, setMonthlyInput] = useState<string>(() =>
    formatInputNumber(resolveInitialGrossMonthly(incomeConfig, activeBudget, defaultSalary))
  );
  const [hourlyRateInput, setHourlyRateInput] = useState<string>(() =>
    formatInputNumber(incomeConfig.hourlyRate ?? 7.37)
  );
  const [hoursPerDayInput, setHoursPerDayInput] = useState<string>(() =>
    formatInputNumber(incomeConfig.hoursPerDay ?? 5)
  );
  const [weeklyHoursInput, setWeeklyHoursInput] = useState<string>(() => {
    const initialSchedule = incomeConfig.scheduleType || "5x2";
    const initialDays =
      incomeConfig.workWeekDays && incomeConfig.workWeekDays.length > 0
        ? incomeConfig.workWeekDays
        : getScheduleWeekDays(initialSchedule);
    const derived =
      incomeConfig.weeklyHours !== undefined
        ? incomeConfig.weeklyHours
        : deriveWeeklyHours(incomeConfig.hoursPerDay ?? 5, initialSchedule, initialDays);
    return formatInputNumber(derived);
  });
  const [paidDaysOff, setPaidDaysOff] = useState<boolean>(incomeConfig.paidDaysOff ?? true);
  const [scheduleType, setScheduleType] = useState<WorkScheduleType>(
    incomeConfig.scheduleType || "5x2"
  );
  const [workWeekDays, setWorkWeekDays] = useState<number[]>(
    incomeConfig.workWeekDays && incomeConfig.workWeekDays.length > 0
      ? incomeConfig.workWeekDays
      : getScheduleWeekDays(incomeConfig.scheduleType || "5x2")
  );
  const [customWorkDaysInput, setCustomWorkDaysInput] = useState<string>(() =>
    String(incomeConfig.customWorkDays ?? 22)
  );
  const [customOffDaysInput, setCustomOffDaysInput] = useState<string>(() =>
    String(incomeConfig.customOffDays ?? 8)
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    incomeConfig.employmentType || "clt"
  );
  const [applyInssDiscount, setApplyInssDiscount] = useState<boolean>(
    Boolean(incomeConfig.applyInssDiscount)
  );
  const [showFgtsInfo, setShowFgtsInfo] = useState<boolean>(
    Boolean(incomeConfig.showFgtsInfo ?? incomeConfig.applyFgtsDiscount)
  );
  const [fixedDiscountInput, setFixedDiscountInput] = useState<string>(() => {
    const val = Number(incomeConfig.fixedDiscount) || 0;
    return val > 0 ? val.toFixed(2).replace(".", ",") : "0";
  });
  const [applyToFutureMonths, setApplyToFutureMonths] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedGainForDetail, setSelectedGainForDetail] = useState<Transaction | null>(null);

  // Sync draft when month or saved config changes externally
  useEffect(() => {
    const nextSchedule = incomeConfig.scheduleType || "5x2";
    const nextDays =
      incomeConfig.workWeekDays && incomeConfig.workWeekDays.length > 0
        ? incomeConfig.workWeekDays
        : getScheduleWeekDays(nextSchedule);
    const nextHoursPerDay = incomeConfig.hoursPerDay ?? 5;
    const nextWeekly =
      incomeConfig.weeklyHours !== undefined
        ? incomeConfig.weeklyHours
        : deriveWeeklyHours(nextHoursPerDay, nextSchedule, nextDays);

    setMode(incomeConfig.mode);
    setMonthlyInput(
      formatInputNumber(resolveInitialGrossMonthly(incomeConfig, activeBudget, defaultSalary))
    );
    setHourlyRateInput(formatInputNumber(incomeConfig.hourlyRate ?? 7.37));
    setHoursPerDayInput(formatInputNumber(nextHoursPerDay));
    setWeeklyHoursInput(formatInputNumber(nextWeekly));
    setPaidDaysOff(incomeConfig.paidDaysOff ?? true);
    setScheduleType(nextSchedule);
    setWorkWeekDays(nextDays);
    setCustomWorkDaysInput(String(incomeConfig.customWorkDays ?? 22));
    setCustomOffDaysInput(String(incomeConfig.customOffDays ?? 8));
    setEmploymentType(incomeConfig.employmentType || "clt");
    setApplyInssDiscount(Boolean(incomeConfig.applyInssDiscount));
    setShowFgtsInfo(Boolean(incomeConfig.showFgtsInfo ?? incomeConfig.applyFgtsDiscount));
    const savedFixed = Number(incomeConfig.fixedDiscount) || 0;
    setFixedDiscountInput(savedFixed > 0 ? savedFixed.toFixed(2).replace(".", ",") : "0");
  }, [selectedMonth, incomeConfig, activeBudget, defaultSalary]);

  useEffect(() => {
    setJustSaved(false);
  }, [selectedMonth]);

  const daysInMonth = useMemo(() => getDaysInYearMonth(selectedMonth), [selectedMonth]);
  const monthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

  const parsedFixedDiscount = useMemo(
    () => parseDecimalInput(fixedDiscountInput),
    [fixedDiscountInput]
  );

  const draftConfig: IncomeConfig = useMemo(
    () => ({
      mode,
      monthlySalary: parseDecimalInput(monthlyInput),
      hourlyRate: parseDecimalInput(hourlyRateInput),
      hoursPerDay: parseDecimalInput(hoursPerDayInput),
      weeklyHours: parseDecimalInput(weeklyHoursInput),
      paidDaysOff,
      scheduleType,
      workWeekDays,
      customWorkDays: Math.min(31, Math.max(0, Math.round(parseDecimalInput(customWorkDaysInput)))),
      customOffDays: Math.min(31, Math.max(0, Math.round(parseDecimalInput(customOffDaysInput)))),
      employmentType,
      applyInssDiscount,
      showFgtsInfo,
      fixedDiscount: parsedFixedDiscount,
    }),
    [
      mode,
      monthlyInput,
      hourlyRateInput,
      hoursPerDayInput,
      weeklyHoursInput,
      paidDaysOff,
      scheduleType,
      workWeekDays,
      customWorkDaysInput,
      customOffDaysInput,
      employmentType,
      applyInssDiscount,
      showFgtsInfo,
      parsedFixedDiscount,
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

  const previewGrossIncome =
    mode === "hourly" ? hourlyBreakdown.totalMonthly : parseDecimalInput(monthlyInput);

  const payrollDiscounts = useMemo(
    () =>
      calculatePayrollDiscounts(previewGrossIncome, {
        applyInss: applyInssDiscount,
        fixedDiscount: parsedFixedDiscount,
        employmentType,
      }),
    [previewGrossIncome, applyInssDiscount, parsedFixedDiscount, employmentType]
  );

  const hasAnyPayrollDiscount = applyInssDiscount || parsedFixedDiscount > 0;
  const bothPayrollEnabled = applyInssDiscount && showFgtsInfo;
  const previewBaseIncome = payrollDiscounts.netSalary;
  const previewTotalIncome = previewBaseIncome + gainsTotal;

  const formatMoney = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatHours = (val: number) =>
    Number.isInteger(val)
      ? `${val}h`
      : `${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}h`;

  const handleHoursPerDayChange = (val: string) => {
    setHoursPerDayInput(val);
    setJustSaved(false);
    const parsed = parseDecimalInput(val);
    if (scheduleType !== "custom") {
      const nextWeekly = deriveWeeklyHours(parsed, scheduleType, workWeekDays);
      setWeeklyHoursInput(formatInputNumber(nextWeekly));
    }
  };

  const handleWeeklyHoursChange = (val: string) => {
    setWeeklyHoursInput(val);
    setJustSaved(false);
    const parsed = parseDecimalInput(val);
    const divisor =
      scheduleType === "12x36"
        ? 3.5
        : workWeekDays.length > 0
        ? workWeekDays.length
        : 5;
    const nextDaily = Number((parsed / divisor).toFixed(2));
    setHoursPerDayInput(formatInputNumber(nextDaily));
  };

  const handleSelectSchedule = (nextSchedule: WorkScheduleType) => {
    setScheduleType(nextSchedule);
    setJustSaved(false);
    const currentDaily = parseDecimalInput(hoursPerDayInput);
    if (nextSchedule === "5x2" || nextSchedule === "6x1") {
      const nextDays = getScheduleWeekDays(nextSchedule);
      setWorkWeekDays(nextDays);
      setWeeklyHoursInput(formatInputNumber(deriveWeeklyHours(currentDaily, nextSchedule, nextDays)));
    } else if (nextSchedule === "12x36") {
      setWeeklyHoursInput(formatInputNumber(deriveWeeklyHours(currentDaily, "12x36", workWeekDays)));
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
      if (exists && prev.length <= 1) return prev;
      const next = exists ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b);
      const currentDaily = parseDecimalInput(hoursPerDayInput);
      setWeeklyHoursInput(formatInputNumber(deriveWeeklyHours(currentDaily, scheduleType, next)));
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

  const handleSelectEmploymentType = (nextType: EmploymentType) => {
    setEmploymentType(nextType);
    setJustSaved(false);
    if (nextType === "apprentice") {
      setApplyInssDiscount(true);
      setShowFgtsInfo(true);
      if (parseDecimalInput(fixedDiscountInput) === 0) {
        setFixedDiscountInput("0,01");
      }
    } else {
      if (parseDecimalInput(fixedDiscountInput) === 0.01) {
        setFixedDiscountInput("0");
      }
    }
  };

  const handleTogglePayrollDiscounts = () => {
    const nextState = !bothPayrollEnabled;
    setApplyInssDiscount(nextState);
    setShowFgtsInfo(nextState);
    if (nextState && employmentType === "apprentice" && parseDecimalInput(fixedDiscountInput) === 0) {
      setFixedDiscountInput("0,01");
    }
    if (!nextState && parseDecimalInput(fixedDiscountInput) === 0.01) {
      setFixedDiscountInput("0");
    }
    setJustSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalConfig: IncomeConfig = {
        ...draftConfig,
        monthlySalary:
          mode === "monthly"
            ? previewGrossIncome
            : incomeConfig.monthlySalary ?? defaultSalary,
      };
      await onSaveIncomeConfig(finalConfig, previewBaseIncome, applyToFutureMonths);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const fgtsPercentLabel = employmentType === "apprentice" ? "2%" : "8%";

  const sharedLayoutTransition = {
    layout: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <>
      <motion.section
        id="income-section-tab"
        layoutId="bento-card-income"
        transition={sharedLayoutTransition}
        style={{ borderRadius: 0, willChange: "transform, opacity" }}
        className="fixed inset-0 z-[35] bg-slate-950 overflow-y-auto overscroll-contain pb-32 sm:pb-36"
      >
        {/* Hairline superior e glow leve em verde esmeralda */}
        <div
          aria-hidden="true"
          className="fixed inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/65 to-transparent pointer-events-none z-20"
        />
        <div
          aria-hidden="true"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.16) 0%, transparent 70%)" }}
          className="pointer-events-none fixed -top-24 right-[-4rem] w-80 h-80 rounded-full"
        />

        <div className="relative max-w-4xl mx-auto px-3.5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-6">
          <div className="bg-slate-900 rounded-3xl border border-slate-800/80 p-4 sm:p-6 shadow-xl space-y-6">
            {/* CABEÇALHO DA ABA RECEITA */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
                  title="Voltar para o Início"
                  aria-label="Voltar para o Início"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="bento-icon-enter w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                </div>
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
                  {hasAnyPayrollDiscount ? "Receita líquida" : "Receita total"}
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

            <div className="tela-nova space-y-6">
              {/* FORMULÁRIO PRINCIPAL */}
              <form onSubmit={handleSave} className="space-y-6">
              {/* SELETOR DE REGIME: MENSALISTA vs HORISTA */}
              <div style={{ "--i": 0 } as React.CSSProperties} className="item space-y-2">
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
            <div style={{ "--i": 1 } as React.CSSProperties} className="item space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="input-monthly-salary"
                  className="text-xs font-semibold text-slate-300 block"
                >
                  {hasAnyPayrollDiscount
                    ? "Salário bruto mensal (antes dos descontos)"
                    : "Salário / Receita fixa mensal"}
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
                  {hasAnyPayrollDiscount
                    ? "Os descontos selecionados abaixo serão abatidos automaticamente deste valor bruto."
                    : `Informe o valor previsto para ${monthLabel.toLowerCase()}.`}
                </p>
              </div>
            </div>
          ) : (
            /* ================= MODO HORISTA ================= */
            <div style={{ "--i": 1 } as React.CSSProperties} className="item space-y-6">
              {/* CAMPOS PRINCIPAIS: VALOR/HORA, HORAS/DIA E HORAS/SEMANA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      placeholder="7,37"
                      className="w-full min-h-[52px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 rounded-2xl pl-11 pr-14 py-3 text-lg font-mono font-bold tabular-nums text-white transition-colors"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400 pointer-events-none">
                      /hora
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="input-hours-per-day"
                    className="text-xs font-semibold text-slate-300 block"
                  >
                    Horas por dia
                  </label>
                  <div className="relative">
                    <input
                      id="input-hours-per-day"
                      type="text"
                      inputMode="decimal"
                      value={hoursPerDayInput}
                      onChange={(e) => handleHoursPerDayChange(e.target.value)}
                      placeholder="5"
                      className="w-full min-h-[52px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 rounded-2xl pl-4 pr-14 py-3 text-lg font-mono font-bold tabular-nums text-white transition-colors"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400 pointer-events-none">
                      h/dia
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="input-weekly-hours"
                    className="text-xs font-semibold text-slate-300 block"
                  >
                    Horas por semana
                  </label>
                  <div className="relative">
                    <input
                      id="input-weekly-hours"
                      type="text"
                      inputMode="decimal"
                      value={weeklyHoursInput}
                      onChange={(e) => handleWeeklyHoursChange(e.target.value)}
                      placeholder="25"
                      className="w-full min-h-[52px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 rounded-2xl pl-4 pr-14 py-3 text-lg font-mono font-bold tabular-nums text-white transition-colors"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400 pointer-events-none">
                      h/sem
                    </span>
                  </div>
                </div>
              </div>

              {/* RECEBE NA FOLGA? (SIM / NÃO) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Você recebe na folga (DSR)?
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {paidDaysOff && hourlyBreakdown.usesCltDsrFormula
                      ? `(${hourlyBreakdown.weeklyHours}h ÷ 6) × ${daysInMonth}d = ${formatHours(hourlyBreakdown.totalPaidHours)}`
                      : `${hourlyBreakdown.workDays} dias trabalhados`}
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
                        Cálculo CLT com DSR
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

                {/* SELETOR DE DIAS DA SEMANA (PARA 5x2 E 6x1) */}
                {(scheduleType === "5x2" || scheduleType === "6x1") && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] text-slate-400 block">
                      Dias trabalhados na semana ({workWeekDays.length} dias · {hourlyBreakdown.weeklyHours}h/sem):
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
            </div>
          )}

          {/* DESCONTOS EM FOLHA (INSS / CESTA BÁSICA) E FGTS INFORMATIVO */}
          <div style={{ "--i": 2 } as React.CSSProperties} className="item space-y-3.5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-rose-400" />
                Descontos (INSS) e FGTS informativo
              </span>
              {hasAnyPayrollDiscount && (
                <span className="text-xs font-mono font-bold tabular-nums text-rose-400">
                  - R$ {formatMoney(payrollDiscounts.totalDiscounts)}
                </span>
              )}
            </div>

            {/* VÍNCULO: JOVEM APRENDIZ vs CLT PADRÃO */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectEmploymentType("apprentice")}
                className={`min-h-[46px] px-3.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                  employmentType === "apprentice"
                    ? "bg-indigo-500/15 border-indigo-500/50 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span className="text-xs font-bold block whitespace-nowrap">
                  Jovem Aprendiz
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  FGTS 2% info · Cesta R$ 0,01
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectEmploymentType("clt")}
                className={`min-h-[46px] px-3.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                  employmentType === "clt"
                    ? "bg-indigo-500/15 border-indigo-500/50 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span className="text-xs font-bold block whitespace-nowrap">
                  CLT Padrão
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  FGTS 8% informativo
                </span>
              </button>
            </div>

            {/* BOTÃO PRINCIPAL: ATIVAR INSS E FGTS INFORMATIVO */}
            <button
              type="button"
              id="btn-toggle-inss-fgts"
              onClick={handleTogglePayrollDiscounts}
              className={`w-full min-h-[52px] px-4 py-3 rounded-2xl border transition-colors cursor-pointer flex items-center justify-between gap-3 text-left ${
                bothPayrollEnabled
                  ? "bg-rose-500/15 border-rose-500/50 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
              }`}
            >
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold block">
                  {bothPayrollEnabled
                    ? "INSS descontado e FGTS informativo ativos"
                    : "Aplicar desconto do INSS e exibir FGTS"}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Desconta INSS ({payrollDiscounts.inssEffectiveRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%) do líquido · FGTS ({fgtsPercentLabel}) apenas informativo
                </span>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                  bothPayrollEnabled
                    ? "bg-rose-500 border-rose-500 text-white"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                {bothPayrollEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>

            {/* CONTROLES INDIVIDUAIS: INSS (DESCONTO) + FGTS (INFORMATIVO) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setApplyInssDiscount((prev) => !prev);
                  setJustSaved(false);
                }}
                className={`min-h-[50px] px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                  applyInssDiscount
                    ? "bg-rose-500/10 border-rose-500/40 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold block whitespace-nowrap">
                    INSS {payrollDiscounts.inssMaxedAtCeiling ? "(Teto)" : `(${payrollDiscounts.inssEffectiveRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-rose-400 block truncate">
                    - R$ {formatMoney(payrollDiscounts.inssBaseAmount)}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    applyInssDiscount
                      ? "bg-rose-500 border-rose-500 text-white"
                      : "border-slate-700"
                  }`}
                >
                  {applyInssDiscount && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFgtsInfo((prev) => !prev);
                  setJustSaved(false);
                }}
                className={`min-h-[50px] px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                  showFgtsInfo
                    ? "bg-indigo-500/10 border-indigo-500/40 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold block whitespace-nowrap">
                    FGTS ({fgtsPercentLabel} info)
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-indigo-300 block truncate">
                    R$ {formatMoney(payrollDiscounts.fgtsInformative)}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    showFgtsInfo
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "border-slate-700"
                  }`}
                >
                  {showFgtsInfo && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>

            {/* OUTROS DESCONTOS FIXOS EM FOLHA (EX: CESTA BÁSICA R$ 0,01) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="input-fixed-discount"
                  className="text-[11px] font-semibold text-slate-400"
                >
                  Outros descontos fixos em folha (ex: Cesta Básica)
                </label>
                {parsedFixedDiscount !== 0.01 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFixedDiscountInput("0,01");
                      setJustSaved(false);
                    }}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer whitespace-nowrap"
                  >
                    Usar R$ 0,01
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                  R$
                </span>
                <input
                  id="input-fixed-discount"
                  type="text"
                  inputMode="decimal"
                  value={fixedDiscountInput}
                  onChange={(e) => {
                    setFixedDiscountInput(e.target.value);
                    setJustSaved(false);
                  }}
                  placeholder="0,01"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl pl-10 pr-4 py-2 text-sm font-mono font-bold tabular-nums text-white"
                />
              </div>
            </div>
          </div>

          {/* DEMONSTRATIVO COMPLETO DO CONTRACHEQUE */}
          {(mode === "hourly" || hasAnyPayrollDiscount || showFgtsInfo) && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              <span className="text-xs font-semibold text-slate-300 block">
                Demonstrativo de {monthLabel}
              </span>

              <div className="divide-y divide-slate-800/80 text-xs sm:text-sm">
                {mode === "hourly" && hourlyBreakdown.usesCltDsrFormula && (
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-400">
                      Horas pagas com DSR ({hourlyBreakdown.weeklyHours}h ÷ 6 × {daysInMonth} dias)
                    </span>
                    <span className="font-mono font-bold tabular-nums text-slate-200">
                      {formatHours(hourlyBreakdown.totalPaidHours)}
                    </span>
                  </div>
                )}

                {mode === "hourly" && !hourlyBreakdown.usesCltDsrFormula && (
                  <>
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

                    {paidDaysOff && hourlyBreakdown.paidOffDays > 0 && (
                      <div className="py-2 flex items-center justify-between gap-3">
                        <span className="text-slate-400">
                          Folgas remuneradas ({hourlyBreakdown.paidOffDays} dias)
                        </span>
                        <span className="font-mono font-bold tabular-nums text-emerald-400">
                          + R$ {formatMoney(hourlyBreakdown.offDaysEarnings)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="py-2 flex items-center justify-between gap-3">
                  <span className="text-slate-300 font-semibold">
                    Salário bruto
                    {mode === "hourly"
                      ? ` (${formatHours(hourlyBreakdown.totalPaidHours)} × R$ ${formatMoney(hourlyBreakdown.hourlyRate)})`
                      : ""}
                  </span>
                  <span className="font-mono font-bold tabular-nums text-white">
                    R$ {formatMoney(payrollDiscounts.grossSalary)}
                  </span>
                </div>

                {applyInssDiscount && (
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-400">
                      Desconto INSS (
                      {payrollDiscounts.inssMaxedAtCeiling
                        ? "teto 2026"
                        : `${payrollDiscounts.inssEffectiveRate.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}%`}
                      )
                    </span>
                    <span className="font-mono font-bold tabular-nums text-rose-400">
                      - R$ {formatMoney(payrollDiscounts.inssDiscount)}
                    </span>
                  </div>
                )}

                {payrollDiscounts.fixedDiscount > 0 && (
                  <div className="py-2 flex items-center justify-between gap-3">
                    <span className="text-slate-400">
                      {payrollDiscounts.fixedDiscount === 0.01
                        ? "Cesta básica"
                        : "Outros descontos fixos"}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-rose-400">
                      - R$ {formatMoney(payrollDiscounts.fixedDiscount)}
                    </span>
                  </div>
                )}

                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="font-bold text-white">
                    {hasAnyPayrollDiscount ? "Salário líquido do mês" : "Salário base do mês"}
                  </span>
                  <span className="font-mono font-black tabular-nums text-base text-emerald-400">
                    R$ {formatMoney(previewBaseIncome)}
                  </span>
                </div>

                {showFgtsInfo && (
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-xs text-indigo-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      FGTS informativo ({fgtsPercentLabel} · depositado pela empresa, não desconta)
                    </span>
                    <span className="font-mono font-bold tabular-nums text-indigo-300 shrink-0">
                      R$ {formatMoney(payrollDiscounts.fgtsInformative)}
                    </span>
                  </div>
                )}
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
                  ? "Calcula cada mês pelo número exato de dias (28, 29, 30 ou 31) e aplica o INSS e descontos automaticamente."
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
        <div style={{ "--i": 3 } as React.CSSProperties} className="item pt-5 border-t border-slate-800/80 space-y-3">
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
              {currentMonthGains.map((g, index) => (
                <div
                  key={g.id}
                  style={{ "--i": index + 4 } as React.CSSProperties}
                  onClick={() => setSelectedGainForDetail(g)}
                  className="item py-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-xl transition-colors cursor-pointer"
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
          </div>
        </div>
      </motion.section>

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
    </>
  );
}
