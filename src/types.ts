export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  tableSection: "left" | "right" | "bottom_left";
  category?: string;
  isOrangeHighlight?: boolean;
  isDiscount?: boolean;
  note?: string;
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
