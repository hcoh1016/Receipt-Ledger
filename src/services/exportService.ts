import * as FS from "expo-file-system/legacy";
import { randomUUID } from "expo-crypto";
import type { ExpenseFilter } from "../types/expense";
import type { ExpenseService } from "./expenseService";
import { validateFileName } from "../validators/fileNameValidator";
import { toCsv } from "../utils/csvUtils";
import { AppError } from "../errors";
export class ExportService {
  constructor(private expenses: ExpenseService) {}
  async create(filter: ExpenseFilter, fileName: string) {
    const name = validateFileName(fileName),
      rows = await this.expenses.list(filter);
    if (!FS.cacheDirectory)
      throw new AppError("STORAGE", "파일 저장소를 사용할 수 없습니다.");
    const dir =
      FS.cacheDirectory + "receipt-ledger-exports/" + randomUUID() + "/";
    try {
      await FS.makeDirectoryAsync(dir, { intermediates: true });
      const uri = dir + name;
      await FS.writeAsStringAsync(uri, toCsv(rows), {
        encoding: FS.EncodingType.UTF8,
      });
      return { uri, fileName: name, count: rows.length };
    } catch {
      throw new AppError(
        "STORAGE",
        "CSV 생성에 실패했습니다. 저장 공간을 확인해 주세요.",
      );
    }
  }
  async cleanupOnStartup() {
    if (FS.cacheDirectory)
      await FS.deleteAsync(FS.cacheDirectory + "receipt-ledger-exports/", {
        idempotent: true,
      });
  }
}
