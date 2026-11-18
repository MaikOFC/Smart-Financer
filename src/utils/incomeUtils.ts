import { IncomeConfig, WorkScheduleType } from "../types";

export const DEFAULT_INCOME_CONFIG: IncomeConfig = {
  mode: "monthly",
  hourlyRate: 15,
  hoursPerDay: 8,
  paidDaysOff: true,
  scheduleType: "6x1",
  workWeekDays: [1, 2, 3, 4, 5, 6], // Segunda a Sábado (folga no Domingo)
  customWorkDays: 22,
  customOffDays: 8,
};

export interface HourlyBreakdown {
  yearMonth: string;
  daysInMonth: number;
  workDays: number;
  offDays: number;
  paidOffDays: number;
  totalPaidDays: number;
  hoursPerDay: number;
  hourlyRate: number;
  dailyEarnings: number;
  workedHours: number;
  paidOffHours: number;
  totalPaidHours: number;
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
  return [1, 2, 3, 4, 5, 6];
}

export function sanitizeIncomeConfig(raw: any, fallbackSalary?: number): IncomeConfig {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_INCOME_CONFIG,
      monthlySalary: typeof fallbackSalary === "number" && !isNaN(fallbackSalary) ? fallbackSalary : undefined,
    };
  }

  const mode = raw.mode === "hourly" ? "hourly" : "monthly";
  const validSchedules: WorkScheduleType[] = ["6x1", "5x2", "12x36", "custom"];
  const scheduleType: WorkScheduleType = validSchedules.includes(raw.scheduleType)
    ? raw.scheduleType
    : "6x1";

  const hourlyRate = Number(raw.hourlyRate);
  const hoursPerDay = Number(raw.hoursPerDay);
  const monthlySalary = raw.monthlySalary !== undefined ? Number(raw.monthlySalary) : fallbackSalary;
  const customWorkDays = raw.customWorkDays !== undefined ? Number(raw.customWorkDays) : 22;
  const customOffDays = raw.customOffDays !== undefined ? Number(raw.customOffDays) : 8;

  const workWeekDays: number[] = Array.isArray(raw.workWeekDays)
    ? Array.from(
        new Set<number>(
          raw.workWeekDays
            .map((d: any) => Number(d))
            .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
        )
      )
    : getScheduleWeekDays(scheduleType);

  return {
    mode,
    monthlySalary: typeof monthlySalary === "number" && !isNaN(monthlySalary) && monthlySalary >= 0 ? monthlySalary : undefined,
    hourlyRate: !isNaN(hourlyRate) && hourlyRate >= 0 ? hourlyRate : DEFAULT_INCOME_CONFIG.hourlyRate,
    hoursPerDay: !isNaN(hoursPerDay) && hoursPerDay >= 0 ? hoursPerDay : DEFAULT_INCOME_CONFIG.hoursPerDay,
    paidDaysOff: typeof raw.paidDaysOff === "boolean" ? raw.paidDaysOff : true,
    scheduleType,
    workWeekDays: workWeekDays.length > 0 ? workWeekDays : getScheduleWeekDays(scheduleType),
    customWorkDays: !isNaN(customWorkDays) && customWorkDays >= 0 ? Math.min(31, Math.round(customWorkDays)) : 22,
    customOffDays: !isNaN(customOffDays) && customOffDays >= 0 ? Math.min(31, Math.round(customOffDays)) : 8,
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
    const workSet = new Set(
      Array.isArray(config.workWeekDays) && config.workWeekDays.length > 0
        ? config.workWeekDays
        : getScheduleWeekDays(config.scheduleType)
    );
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
  const dailyEarnings = Math.round(hourlyRate * hoursPerDay * 100) / 100;

  const paidOffDays = config.paidDaysOff ? offDays : 0;
  const totalPaidDays = workDays + paidOffDays;

  const workedHours = Math.round(workDays * hoursPerDay * 100) / 100;
  const paidOffHours = Math.round(paidOffDays * hoursPerDay * 100) / 100;
  const totalPaidHours = Math.round(totalPaidDays * hoursPerDay * 100) / 100;

  const workedEarnings = Math.round(workDays * hoursPerDay * hourlyRate * 100) / 100;
  const offDaysEarnings = Math.round(paidOffDays * hoursPerDay * hourlyRate * 100) / 100;
  const totalMonthly = Math.round((workedEarnings + offDaysEarnings) * 100) / 100;

  return {
    yearMonth,
    daysInMonth,
    workDays,
    offDays,
    paidOffDays,
    totalPaidDays,
    hoursPerDay,
    hourlyRate,
    dailyEarnings,
    workedHours,
    paidOffHours,
    totalPaidHours,
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
