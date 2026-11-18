import type { Category } from '../constants/categories';
import type { ExpenseInput, ReceiptDraft } from '../types/expense';
import { AppError } from '../errors';
import { validateExpense } from '../validators/expenseValidator';
import { today } from '../utils/dateUtils';
export type Form = {
  merchant: string;
  paidAt: string;
  total: string;
  category: Category;
  memo: string;
  items: {
    name: string;
    quantity: string;
    amount: string;
  }[];
};
export function makeForm(value?: ExpenseInput | ReceiptDraft): Form { return { merchant: value?.merchant ?? '', paidAt: value?.paidAt ?? today(), total: value?.total == null ? '' : String(value.total), category: value?.category ?? '기타', memo: value?.memo ?? '', items: (value?.items ?? []).map(i => ({ name: i.name, quantity: i.quantity == null ? '' : String(i.quantity), amount: i.amount == null ? '' : String(i.amount) })) }; }
export function formInput(form: Form): ExpenseInput {
  const errors: Record<string, string> = {};
  const numeric = (value: string, key: string, optional = false): number | null => {
    if (optional && !value.trim())
      return null; if (!/^\d+$/.test(value.trim())) {
        errors[key] = '정수 숫자만 입력해 주세요.';
        return NaN;
      } return Number(value);
  };
  const input = { ...form, total: numeric(form.total, 'total')!, items: form.items.map((i, n) => ({ name: i.name, quantity: numeric(i.quantity, `items.${n}.quantity`, true), amount: numeric(i.amount, `items.${n}.amount`, true) })) };
  try {
    validateExpense(input);
  }
  catch (e) {
    if (e instanceof AppError)
      Object.assign(errors, e.fields);
    else
      throw e;
  }
  if (Object.keys(errors).length)
    throw new AppError('VALIDATION', '입력값을 확인해 주세요.', errors);
  return validateExpense(input);
}
export function shiftMonth(month: string, delta: number) { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
