import * as SQLite from "expo-sqlite";
import type { SqlDatabase } from "./port";
import { HISTORY_SCHEMA } from './historyRepository';
import { SCHEMA } from "./schema";
let ready: Promise<SqlDatabase> | undefined;
export function openDatabase(): Promise<SqlDatabase> {
  if (!ready)
    ready = (async () => {
      const db = await SQLite.openDatabaseAsync("receipt-ledger.db");
      await db.execAsync(
        "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
      );
      const version = await db.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      if ((version?.user_version ?? 0) > 1)
        throw new Error("지원하지 않는 DB 버전입니다.");
      if (!version?.user_version)
        await db.withExclusiveTransactionAsync(async (tx) => {
          await tx.execAsync(SCHEMA);
        });
      await db.execAsync(HISTORY_SCHEMA);
      return db;
    })().catch((e) => {
      ready = undefined;
      throw e;
    });
  return ready;
}
