import type { SqlDatabase } from './port';
export interface AnalysisRecord { id: string; text: string; elapsedMs: number; createdAt: string }
export const HISTORY_SCHEMA = 'CREATE TABLE IF NOT EXISTS analysis_history (id TEXT PRIMARY KEY, text TEXT NOT NULL, elapsedMs INTEGER NOT NULL, createdAt TEXT NOT NULL);';
export class HistoryRepository {
  constructor(private db: SqlDatabase) {}
  async save(record: AnalysisRecord) { await this.db.runAsync('INSERT INTO analysis_history(id,text,elapsedMs,createdAt) VALUES(?,?,?,?)',record.id,record.text,record.elapsedMs,record.createdAt); }
  list() { return this.db.getAllAsync<AnalysisRecord>('SELECT id,text,elapsedMs,createdAt FROM analysis_history ORDER BY createdAt DESC, rowid DESC'); }
  async remove(id: string) { await this.db.runAsync('DELETE FROM analysis_history WHERE id=?',id); }
}
