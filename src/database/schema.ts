export const SCHEMA = `
CREATE TABLE IF NOT EXISTS expenses (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 request_key TEXT NOT NULL UNIQUE,
 merchant TEXT NOT NULL CHECK(length(merchant)<=100),
 paid_at TEXT NOT NULL,
 total INTEGER NOT NULL CHECK(typeof(total)='integer' AND total BETWEEN 1 AND 999999999),
 category TEXT NOT NULL CHECK(category IN ('식비','카페·간식','교통','쇼핑','생활','의료','문화·여가','기타')),
 memo TEXT NOT NULL CHECK(length(memo)<=500),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS expense_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
 quantity INTEGER CHECK(quantity IS NULL OR (typeof(quantity)='integer' AND quantity BETWEEN 1 AND 9999)),
 amount INTEGER CHECK(amount IS NULL OR (typeof(amount)='integer' AND amount BETWEEN 0 AND 999999999))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(paid_at DESC,seq DESC);
CREATE INDEX IF NOT EXISTS idx_items_expense ON expense_items(expense_id);
PRAGMA user_version = 1;
`;
