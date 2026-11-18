import type { SqlDatabase } from "./port";
import { CATEGORIES } from "../constants/categories";
import type { MonthlyStatistics } from "../types/expense";
import { monthRange } from "../utils/dateUtils";
import { AppError } from "../errors";
export class StatisticsRepository {
  constructor(private db: SqlDatabase) {}
  async monthly(month: string): Promise<MonthlyStatistics> {
    let range;
    try {
      range = monthRange(month);
    } catch {
      throw new AppError("VALIDATION", "월은 YYYY-MM 형식으로 입력해 주세요.");
    }
    const rows = await this.db.getAllAsync<{
      category: string;
      amount: number;
      count: number;
    }>(
      "SELECT category,SUM(total) AS amount,COUNT(*) AS count FROM expenses WHERE paid_at>=? AND paid_at<=? GROUP BY category",
      range.startDate,
      range.endDate,
    );
    const total = rows.reduce((s, r) => s + r.amount, 0),
      count = rows.reduce((s, r) => s + r.count, 0);
    return {
      month,
      total,
      count,
      categories: CATEGORIES.map((category) => {
        const amount = rows.find((r) => r.category === category)?.amount ?? 0;
        return {
          category,
          amount,
          percentage: total ? Math.round((amount / total) * 1000) / 10 : 0,
        };
      }),
    };
  }
}
