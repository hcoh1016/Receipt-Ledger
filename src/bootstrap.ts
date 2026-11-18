import { Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import { openDatabase } from "./database/database";
import { ExpenseRepository } from "./database/expenseRepository";
import { StatisticsRepository } from "./database/statisticsRepository";
import { ExpenseService } from "./services/expenseService";
import { ExportService } from "./services/exportService";
import { ReceiptService } from "./services/receiptService";
import { ocrEngine } from "./services/ocrService";
import { tempFiles } from "./services/tempFileService";
import { AppError } from "./errors";
import { cleanPickerCacheOnStartup } from "./services/pickerCacheService";
export type LedgerServices = Awaited<ReturnType<typeof initialize>>;
async function initialize() {
  if (Platform.OS !== "android")
    throw new AppError("UNSUPPORTED", "현재 배포 대상은 Android입니다.");
  await tempFiles.cleanupOnStartup();
  await cleanPickerCacheOnStartup();
  const db = await openDatabase();
  const expenses = new ExpenseService(new ExpenseRepository(db, randomUUID));
  const exports = new ExportService(expenses);
  await exports.cleanupOnStartup();
  return {
    expenses,
    statistics: new StatisticsRepository(db),
    receipts: new ReceiptService(ocrEngine, tempFiles, randomUUID),
    exports,
    newRequestKey: randomUUID,
  };
}
let ready: Promise<LedgerServices> | undefined;
export function initializeLedger() {
  if (!ready)
    ready = initialize().catch((e) => {
      ready = undefined;
      throw e;
    });
  return ready;
}
