import { ExpenseRepository } from "../database/expenseRepository";
import {
  validateExpense,
  validateFilter,
} from "../validators/expenseValidator";
import type { ExpenseInput, ExpenseFilter, Expense } from "../types/expense";
import { AppError } from "../errors";
export class ExpenseService {
  private writes: Promise<unknown> = Promise.resolve();
  private inFlight = new Map<string, Promise<Expense>>();
  constructor(private repo: ExpenseRepository) {}
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.writes.then(fn).catch((e) => {
      if (e instanceof AppError) throw e;
      throw new AppError(
        "STORAGE",
        "저장에 실패했습니다. 기기 저장 공간을 확인하고 다시 시도해 주세요.",
      );
    });
    this.writes = next.catch(() => {});
    return next;
  }
  save(input: ExpenseInput, requestKey: string): Promise<Expense> {
    if (!requestKey.trim() || requestKey.length > 100)
      return Promise.reject(
        new AppError("VALIDATION", "저장 요청 ID가 필요합니다."),
      );
    const existing = this.inFlight.get(requestKey);
    if (existing) return existing;
    let clean: ExpenseInput;
    try {
      clean = validateExpense(input);
    } catch (e) {
      return Promise.reject(e);
    }
    const pending = this.enqueue(() => this.repo.create(clean, requestKey));
    this.inFlight.set(requestKey, pending);
    void pending.then(
      () => this.inFlight.delete(requestKey),
      () => this.inFlight.delete(requestKey),
    );
    return pending;
  }
  update(id: string, input: ExpenseInput) {
    const clean = validateExpense(input);
    return this.enqueue(() => this.repo.update(id, clean));
  }
  remove(id: string) {
    return this.enqueue(() => this.repo.remove(id));
  }
  list(filter: ExpenseFilter = {}) {
    return this.repo.list(validateFilter(filter));
  }
  get(id: string) {
    return this.repo.get(id);
  }
}
