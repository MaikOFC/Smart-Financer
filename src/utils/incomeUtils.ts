import { EmploymentType, IncomeConfig, WorkScheduleType } from "../types";

export const DEFAULT_INCOME_CONFIG: IncomeConfig = {
  mode: "monthly",
  hourlyRate: 7.37,
  hoursPerDay: 5,
  weeklyHours: 25,
  paidDaysOff: true,
  scheduleType: "5x2",
  workWeekDays: [1, 2, 3, 4, 5], // Segunda a Sexta
  customWorkDays: 22,
  customOffDays: 8,
  employmentType: "apprentice",
  applyInssDiscount: false,
  showFgtsInfo: false,
  fixedDiscount: 0,
};

// Tabela oficial INSS 2026 (CLT - alíquotas progressivas)
// Para salários até R$ 1.621,00 (como Jovem Aprendiz), resulta exatamente em bruto * 0.075.
const INSS_2026_BRACKETS = [
  { upTo: 1621.0, rate: 0.075 },
  { upTo: 2902.84, rate: 0.09 },
  { upTo: 4354.27, rate: 0.12 },
  { upTo: 8475.55, rate: 0.14 },
];

export const INSS_2026_CEILING_SALARY = 8475.55;
export const FGTS_RATE_CLT = 0.08; // 8% (informativo - depositado pela empresa)
export const FGTS_RATE_APPRENTICE = 0.02; // 2% (informativo - Jovem Aprendiz)

export interface PayrollDiscountsBreakdown {
  grossSalary: number;
  employmentType: EmploymentType;
  inssBaseAmount: number;
  inssEffectiveRate: number;
  inssMaxedAtCeiling: boolean;
  inssDiscount: number;
  fixedDiscount: number;
  totalDiscounts: number;
  netSalary: number;
  fgtsRate: number;
  fgtsInformative: number;
}

export interface HourlyBreakdown {
  yearMonth: string;
  daysInMonth: number;
  workDays: number;
  offDays: number;
  paidOffDays: number;
  totalPaidDays: number;
  hoursPerDay: number;
  weeklyHours: number;
  hourlyRate: number;
  dailyEarnings: number;
  workedHours: number;
  paidOffHours: number;
  exactPaidHours: number;
  totalPaidHours: number;
  usesCltDsrFormula: boolean;
  workedEarnings: number;
  offDaysEarnings: number;
  totalMonthly: number;
}

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const WEEK_DAYS_PT: { day: number; short: string; label: string }[] = [
  { day: 0, short: "Dom", label: "Domingo" },
  { day: 1, short: "Seg", label: "Segunda" },
  { day: 2, short: "Ter", label: "Terça" },
  { day: 3, short: "Qua", label: "Quarta" },
  { day: 4, short: "Qui", label: "Quinta" },
  { day: 5, short: "Sex", label: "Sexta" },
  { day: 6, short: "Sáb", label: "Sábado" },
];

function round2(value: number): number {
  return Number((Number(value) || 0).toFixed(2));
}

export function formatMonthLabel(yearMonth: string): string {
  const parts = (yearMonth || "").split("-");
  if (parts.length !== 2) return yearMonth;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (isNaN(year) || isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return yearMonth;
  }
  return `${MONTH_NAMES_PT[monthIdx]} de ${year}`;
}

export function getDaysInYearMonth(yearMonth: string): number {
  const parts = (yearMonth || "").split("-");
  if (parts.length !== 2) return 30;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return 30;
  return new Date(year, month, 0).getDate();
}

export function getScheduleWeekDays(schedule: WorkScheduleType): number[] {
  if (schedule === "5x2") return [1, 2, 3, 4, 5];
  if (schedule === "6x1") return [1, 2, 3, 4, 5, 6];
  return [1, 2, 3, 4, 5];
}

export function deriveWeeklyHours(
  hoursPerDay: number,
  scheduleType: WorkScheduleType,
  workWeekDays: number[]
): number {
  const safeHours = Math.max(0, Number(hoursPerDay) || 0);
  if (scheduleType === "12x36") {
    return round2(safeHours * 3.5);
  }
  const daysPerWeek =
    Array.isArray(workWeekDays) && workWeekDays.length > 0
      ? workWeekDays.length
      : scheduleType === "6x1"
      ? 6
      : 5;
  return round2(safeHours * daysPerWeek);
}

export function sanitizeIncomeConfig(raw: any, fallbackSalary?: number): IncomeConfig {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_INCOME_CONFIG,
      monthlySalary:
        typeof fallbackSalary === "number" && !isNaN(fallbackSalary) ? fallbackSalary : undefined,
    };
  }

  const mode = raw.mode === "hourly" ? "hourly" : "monthly";
  const validSchedules: WorkScheduleType[] = ["6x1", "5x2", "12x36", "custom"];
  const scheduleType: WorkScheduleType = validSchedules.includes(raw.scheduleType)
    ? raw.scheduleType
    : "5x2";

  const hourlyRate = Number(raw.hourlyRate);
  const hoursPerDay = Number(raw.hoursPerDay);
  const monthlySalary = raw.monthlySalary !== undefined ? Number(raw.monthlySalary) : fallbackSalary;
  const customWorkDays = raw.customWorkDays !== undefined ? Number(raw.customWorkDays) : 22;
  const customOffDays = raw.customOffDays !== undefined ? Number(raw.customOffDays) : 8;
  const fixedDiscount = raw.fixedDiscount !== undefined ? Number(raw.fixedDiscount) : 0;

  const workWeekDays: number[] = Array.isArray(raw.workWeekDays)
    ? Array.from(
        new Set<number>(
          raw.workWeekDays
            .map((d: any) => Number(d))
            .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
        )
      )
    : getScheduleWeekDays(scheduleType);

  const safeWorkWeekDays = workWeekDays.length > 0 ? workWeekDays : getScheduleWeekDays(scheduleType);
  const safeHoursPerDay =
    !isNaN(hoursPerDay) && hoursPerDay >= 0 ? hoursPerDay : DEFAULT_INCOME_CONFIG.hoursPerDay;

  const rawWeeklyHours = raw.weeklyHours !== undefined ? Number(raw.weeklyHours) : NaN;
  const weeklyHours =
    !isNaN(rawWeeklyHours) && rawWeeklyHours >= 0
      ? rawWeeklyHours
      : deriveWeeklyHours(safeHoursPerDay, scheduleType, safeWorkWeekDays);

  const employmentType: EmploymentType =
    raw.employmentType === "apprentice" || raw.employmentType === "clt"
      ? raw.employmentType
      : "clt";

  const showFgtsInfo =
    typeof raw.showFgtsInfo === "boolean"
      ? raw.showFgtsInfo
      : Boolean(raw.applyFgtsDiscount || raw.applyInssDiscount);

  return {
    mode,
    monthlySalary:
      typeof monthlySalary === "number" && !isNaN(monthlySalary) && monthlySalary >= 0
        ? monthlySalary
        : undefined,
    hourlyRate: !isNaN(hourlyRate) && hourlyRate >= 0 ? hourlyRate : DEFAULT_INCOME_CONFIG.hourlyRate,
    hoursPerDay: safeHoursPerDay,
    weeklyHours,
    paidDaysOff: typeof raw.paidDaysOff === "boolean" ? raw.paidDaysOff : true,
    scheduleType,
    workWeekDays: safeWorkWeekDays,
    customWorkDays:
      !isNaN(customWorkDays) && customWorkDays >= 0 ? Math.min(31, Math.round(customWorkDays)) : 22,
    customOffDays:
      !isNaN(customOffDays) && customOffDays >= 0 ? Math.min(31, Math.round(customOffDays)) : 8,
    employmentType,
    applyInssDiscount: Boolean(raw.applyInssDiscount),
    showFgtsInfo,
    fixedDiscount: !isNaN(fixedDiscount) && fixedDiscount >= 0 ? round2(fixedDiscount) : 0,
  };
}

export function calculateHourlyIncomeForMonth(
  config: IncomeConfig,
  yearMonth: string
): HourlyBreakdown {
  const daysInMonth = getDaysInYearMonth(yearMonth);
  const parts = (yearMonth || "").split("-");
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || new Date().getMonth() + 1;

  let workDays = 0;
  let offDays = 0;

  const safeWorkWeekDays =
    Array.isArray(config.workWeekDays) && config.workWeekDays.length > 0
      ? config.workWeekDays
      : getScheduleWeekDays(config.scheduleType);

  if (config.scheduleType === "custom") {
    workDays = Math.max(0, Math.min(31, Math.round(Number(config.customWorkDays) || 0)));
    offDays =
      config.customOffDays !== undefined && !isNaN(Number(config.customOffDays))
        ? Math.max(0, Math.min(31, Math.round(Number(config.customOffDays))))
        : Math.max(0, daysInMonth - workDays);
  } else if (config.scheduleType === "12x36") {
    workDays = Math.ceil(daysInMonth / 2);
    offDays = daysInMonth - workDays;
  } else {
    const workSet = new Set(safeWorkWeekDays);
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(year, month - 1, day).getDay();
      if (workSet.has(dow)) {
        workDays += 1;
      } else {
        offDays += 1;
      }
    }
  }

  const hourlyRate = Math.max(0, Number(config.hourlyRate) || 0);
  const hoursPerDay = Math.max(0, Number(config.hoursPerDay) || 0);
  const weeklyHours =
    config.weeklyHours !== undefined && !isNaN(Number(config.weeklyHours)) && Number(config.weeklyHours) >= 0
      ? Number(config.weeklyHours)
      : deriveWeeklyHours(hoursPerDay, config.scheduleType, safeWorkWeekDays);

  const dailyEarnings = round2(hourlyRate * hoursPerDay);
  const paidOffDays = config.paidDaysOff ? offDays : 0;
  const totalPaidDays = config.paidDaysOff && config.scheduleType !== "custom"
    ? daysInMonth
    : workDays + paidOffDays;

  // Fórmula oficial CLT / Jovem Aprendiz para horista com DSR (recebe na folga):
  // horasPagas = (horasSemanais / 6) * diasMes
  // bruto = Number((horasPagas * valorHora).toFixed(2))
  const usesCltDsrFormula = config.paidDaysOff && config.scheduleType !== "custom";

  let exactPaidHours: number;
  let workedHours: number;
  let paidOffHours: number;
  let totalMonthly: number;
  let workedEarnings: number;
  let offDaysEarnings: number;

  if (usesCltDsrFormula) {
    exactPaidHours = (weeklyHours / 6) * daysInMonth;
    totalMonthly = round2(exactPaidHours * hourlyRate);
    workedHours = round2(workDays * hoursPerDay);
    paidOffHours = round2(Math.max(0, exactPaidHours - workDays * hoursPerDay));
    workedEarnings = round2(workedHours * hourlyRate);
    offDaysEarnings = round2(Math.max(0, totalMonthly - workedEarnings));
  } else {
    exactPaidHours = totalPaidDays * hoursPerDay;
    workedHours = round2(workDays * hoursPerDay);
    paidOffHours = round2(paidOffDays * hoursPerDay);
    workedEarnings = round2(workDays * hoursPerDay * hourlyRate);
    offDaysEarnings = round2(paidOffDays * hoursPerDay * hourlyRate);
    totalMonthly = round2(exactPaidHours * hourlyRate);
  }

  return {
    yearMonth,
    daysInMonth,
    workDays,
    offDays,
    paidOffDays,
    totalPaidDays,
    hoursPerDay,
    weeklyHours,
    hourlyRate,
    dailyEarnings,
    workedHours,
    paidOffHours,
    exactPaidHours,
    totalPaidHours: round2(exactPaidHours),
    usesCltDsrFormula,
    workedEarnings,
    offDaysEarnings,
    totalMonthly,
  };
}

export function getNextMonths(fromMonth: string, additionalMonths: number = 12): string[] {
  const parts = (fromMonth || "").split("-");
  const baseYear = parseInt(parts[0], 10);
  const baseMonth = parseInt(parts[1], 10);
  if (isNaN(baseYear) || isNaN(baseMonth)) return [fromMonth];

  const months: string[] = [];
  for (let i = 0; i <= additionalMonths; i++) {
    const d = new Date(baseYear, baseMonth - 1 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function parseDecimalInput(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\s+/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

export function calculateInss2026(grossSalary: number): {
  discount: number;
  effectiveRate: number;
  maxedAtCeiling: boolean;
} {
  const gross = Math.max(0, Number(grossSalary) || 0);
  if (gross <= 0) {
    return { discount: 0, effectiveRate: 0, maxedAtCeiling: false };
  }

  let total = 0;
  let previousLimit = 0;

  for (const bracket of INSS_2026_BRACKETS) {
    if (gross <= previousLimit) break;
    const taxableInBracket = Math.min(gross, bracket.upTo) - previousLimit;
    if (taxableInBracket > 0) {
      total += taxableInBracket * bracket.rate;
    }
    previousLimit = bracket.upTo;
  }

  const discount = round2(total);
  const effectiveRate = gross > 0 ? round2((discount / gross) * 100) : 0;

  return {
    discount,
    effectiveRate,
    maxedAtCeiling: gross >= INSS_2026_CEILING_SALARY,
  };
}

export function calculatePayrollDiscounts(
  grossSalary: number,
  options: {
    applyInss: boolean;
    fixedDiscount?: number;
    employmentType?: EmploymentType;
  }
): PayrollDiscountsBreakdown {
  const gross = round2(Math.max(0, Number(grossSalary) || 0));
  const employmentType: EmploymentType =
    options.employmentType === "apprentice" ? "apprentice" : "clt";
  const inssCalc = calculateInss2026(gross);
  const fgtsRate = employmentType === "apprentice" ? FGTS_RATE_APPRENTICE : FGTS_RATE_CLT;
  const fgtsInformative = round2(gross * fgtsRate);

  const inssDiscount = options.applyInss ? inssCalc.discount : 0;
  const fixedDiscount = round2(Math.max(0, Number(options.fixedDiscount) || 0));
  const totalDiscounts = round2(inssDiscount + fixedDiscount);
  const netSalary = round2(Math.max(0, gross - totalDiscounts));

  return {
    grossSalary: gross,
    employmentType,
    inssBaseAmount: inssCalc.discount,
    inssEffectiveRate: inssCalc.effectiveRate,
    inssMaxedAtCeiling: inssCalc.maxedAtCeiling,
    inssDiscount,
    fixedDiscount,
    totalDiscounts,
    netSalary,
    fgtsRate,
    fgtsInformative,
  };
}

export function calculateNetIncomeForMonth(
  config: IncomeConfig,
  yearMonth: string,
  fallbackSalary: number = 2500
): number {
  const gross =
    config.mode === "hourly"
      ? calculateHourlyIncomeForMonth(config, yearMonth).totalMonthly
      : typeof config.monthlySalary === "number" && !isNaN(config.monthlySalary)
      ? config.monthlySalary
      : fallbackSalary;

  const breakdown = calculatePayrollDiscounts(gross, {
    applyInss: Boolean(config.applyInssDiscount),
    fixedDiscount: Number(config.fixedDiscount) || 0,
    employmentType: config.employmentType || "clt",
  });
  return breakdown.netSalary;
}
