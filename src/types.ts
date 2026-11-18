export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD (Data do gasto ou Quitação da parcela)
  type: "income" | "expense";
  tableSection: "left" | "right" | "bottom_left";
  category?: string;
  isOrangeHighlight?: boolean;
  isDiscount?: boolean;
  note?: string;
  startDate?: string; // YYYY-MM ou YYYY-MM-DD
  totalInstallments?: number;
  imageUrl?: string;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  income: number;
}

export type IncomeMode = "monthly" | "hourly";

export type WorkScheduleType = "6x1" | "5x2" | "12x36" | "custom";

export interface IncomeConfig {
  mode: IncomeMode;
  monthlySalary?: number;
  hourlyRate: number;
  hoursPerDay: number;
  paidDaysOff: boolean;
  scheduleType: WorkScheduleType;
  workWeekDays: number[]; // 0=Dom .. 6=Sáb
  customWorkDays?: number;
  customOffDays?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  defaultSalary?: number;
  incomeConfig?: IncomeConfig;
}

