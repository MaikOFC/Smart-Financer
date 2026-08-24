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
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  income: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  defaultSalary?: number;
}
