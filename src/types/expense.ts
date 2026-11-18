import type { Category } from "../constants/categories";
export interface ExpenseItem {
  name: string;
  quantity: number | null;
  amount: number | null;
}
export interface ExpenseInput {
  merchant: string;
  paidAt: string;
  total: number;
  category: Category;
  memo: string;
  items: ExpenseItem[];
}
export interface Expense extends ExpenseInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface ExpenseFilter {
  search?: string;
  startDate?: string;
  endDate?: string;
  category?: Category;
}
export interface MonthlyStatistics {
  month: string;
  total: number;
  count: number;
  categories: { category: Category; amount: number; percentage: number }[];
}
export interface ReceiptDraft {
  merchant: string;
  paidAt: string;
  total: number | null;
  category: Category;
  memo: string;
  items: ExpenseItem[];
  reviewFields: string[];
  warnings: string[];
}
export interface ImageInput {
  uri: string;
}
