import type { SqlDatabase, SqlConnection, Param } from "./port";
import type {
  Expense,
  ExpenseInput,
  ExpenseFilter,
  ExpenseItem,
} from "../types/expense";
import { AppError } from "../errors";
export function whereFilter(f: ExpenseFilter) {
  const clauses: string[] = [],
    params: Param[] = [];
  if (f.search) {
    clauses.push('instr(lower(merchant), lower(?)) > 0');
    params.push(f.search);
  }
  if (f.startDate) {
    clauses.push("paid_at >= ?");
    params.push(f.startDate);
  }
  if (f.endDate) {
    clauses.push("paid_at <= ?");
    params.push(f.endDate);
  }
  if (f.category) {
    clauses.push("category = ?");
    params.push(f.category);
  }
  return {
    sql: clauses.length ? " WHERE " + clauses.join(" AND ") : "",
    params,
  };
}
const SELECT =
  "SELECT id,merchant,paid_at AS paidAt,total,category,memo,created_at AS createdAt,updated_at AS updatedAt FROM expenses";
export class ExpenseRepository {
  constructor(
    private db: SqlDatabase,
    private uuid: () => string,
    private now: () => string = () => new Date().toISOString(),
  ) {}
  private async detail(tx: SqlConnection, id: string): Promise<Expense> {
    const row = await tx.getFirstAsync<Omit<Expense, "items">>(
      SELECT + " WHERE id=?",
      id,
    );
    if (!row) throw new AppError("NOT_FOUND", "내역을 찾을 수 없습니다.");
    return {
      ...row,
      items: await tx.getAllAsync<ExpenseItem>(
        "SELECT name,quantity,amount FROM expense_items WHERE expense_id=? ORDER BY id",
        id,
      ),
    };
  }
  async get(id: string) {
    return this.detail(this.db, id);
  }
  async list(filter: ExpenseFilter = {}) {
    const f = whereFilter(filter);
    // 목록에는 품목이 필요 없으므로 상세에서 별도로 가져온다.
    return this.db.getAllAsync<Omit<Expense, "items">>(
      SELECT + f.sql + " ORDER BY paid_at DESC,seq DESC",
      ...f.params,
    );
  }
  private async items(tx: SqlConnection, id: string, input: ExpenseInput) {
    for (const item of input.items)
      await tx.runAsync(
        "INSERT INTO expense_items(expense_id,name,quantity,amount) VALUES(?,?,?,?)",
        id,
        item.name,
        item.quantity,
        item.amount,
      );
  }
  async create(input: ExpenseInput, key: string): Promise<Expense> {
    let result!: Expense;
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const old = await tx.getFirstAsync<{ id: string }>(
        "SELECT id FROM expenses WHERE request_key=?",
        key,
      );
      if (old) {
        result = await this.detail(tx, old.id);
        return;
      }
      const id = this.uuid(),
        now = this.now();
      await tx.runAsync(
        "INSERT INTO expenses(id,request_key,merchant,paid_at,total,category,memo,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        id,
        key,
        input.merchant,
        input.paidAt,
        input.total,
        input.category,
        input.memo,
        now,
        now,
      );
      await this.items(tx, id, input);
      result = await this.detail(tx, id);
    });
    return result;
  }
  async update(id: string, input: ExpenseInput): Promise<Expense> {
    let result!: Expense;
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const old = await this.detail(tx, id);
      const now = new Date(
        Math.max(Date.parse(this.now()), Date.parse(old.updatedAt) + 1),
      ).toISOString();
      await tx.runAsync(
        "UPDATE expenses SET merchant=?,paid_at=?,total=?,category=?,memo=?,updated_at=? WHERE id=?",
        input.merchant,
        input.paidAt,
        input.total,
        input.category,
        input.memo,
        now,
        id,
      );
      await tx.runAsync("DELETE FROM expense_items WHERE expense_id=?", id);
      await this.items(tx, id, input);
      result = await this.detail(tx, id);
    });
    return result;
  }
  async remove(id: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      // exclusive 연결의 foreign_keys 설정에 의존하지 않고 두 삭제를 같은 트랜잭션에서 수행한다.
      await tx.runAsync("DELETE FROM expense_items WHERE expense_id=?", id);
      const result = await tx.runAsync("DELETE FROM expenses WHERE id=?", id);
      if (!result.changes)
        throw new AppError("NOT_FOUND", "이미 삭제된 내역입니다.");
    });
  }
}
