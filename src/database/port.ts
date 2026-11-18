export type Param = string | number | null;
export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    ...params: Param[]
  ): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(sql: string, ...params: Param[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: Param[]): Promise<T[]>;
}
export interface SqlDatabase extends SqlConnection {
  withExclusiveTransactionAsync(
    task: (tx: SqlConnection) => Promise<void>,
  ): Promise<void>;
}
