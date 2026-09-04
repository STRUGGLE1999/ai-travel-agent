export type BudgetCategory =
  | "TICKET"
  | "TRANSPORT"
  | "DINING"
  | "LODGING"
  | "OTHER";

export type BudgetItemSource = "MOCK" | "VERIFIED" | "ESTIMATED";

export interface BudgetItem {
  id: string;
  category: BudgetCategory;
  name: string;
  amount: number;
  unitPrice: number | null;
  quantity: number | null;
  unitLabel?: string;
  currency: string;
  isConfirmed: boolean;
  notes?: string;
  source: BudgetItemSource;
}

export interface BudgetCategorySummary {
  category: BudgetCategory;
  label: string;
  confirmed: number;
  estimated: number;
  total: number;
  items: BudgetItem[];
}

export interface BudgetSummary {
  currency: string;
  partySize: number;
  totalConfirmed: number;
  totalEstimated: number;
  totalAmount: number;
  budgetLimit: number | null;
  isOverBudget: boolean;
  overBudgetAmount: number;
  categories: BudgetCategorySummary[];
  items: BudgetItem[];
}
