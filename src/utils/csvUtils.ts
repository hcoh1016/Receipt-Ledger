import type { Expense } from "../types/expense";
const cell = (s: unknown) => '"' + String(s ?? "").replace(/"/g, '""') + '"';
export function toCsv(rows: Omit<Expense, "items">[]): string {
  const header = ["사용처", "결제일", "총액", "카테고리", "메모"];
  return (
    "\uFEFF" +
    [
      header.map(cell).join(","),
      ...rows.map((r) =>
        [r.merchant, r.paidAt, r.total, r.category, r.memo].map(cell).join(","),
      ),
    ].join("\r\n") +
    "\r\n"
  );
}
