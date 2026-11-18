import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SCHEMA } from "../src/database/schema";
import { HISTORY_SCHEMA, HistoryRepository } from "../src/database/historyRepository";
import type { SqlDatabase, Param, SqlConnection } from "../src/database/port";
import { ExpenseRepository } from "../src/database/expenseRepository";
import { StatisticsRepository } from "../src/database/statisticsRepository";
import { ExpenseService } from "../src/services/expenseService";
import { ReceiptService } from "../src/services/receiptService";
import {
  validateExpense,
  parseAmountInput,
} from "../src/validators/expenseValidator";
import { validateFileName } from "../src/validators/fileNameValidator";
import { parseReceipt } from "../src/parsers/receiptParser";
import { isDate } from "../src/utils/dateUtils";
import { toCsv } from "../src/utils/csvUtils";
import type { ExpenseInput } from "../src/types/expense";
const input = (patch: Partial<ExpenseInput> = {}): ExpenseInput => ({
  merchant: "분식집",
  paidAt: "2026-11-16",
  total: 10000,
  category: "식비",
  memo: "",
  items: [],
  ...patch,
});
// 실제 SQLite 엔진으로 공통 Repository SQL을 실행한다. Expo 네이티브 연결은 기기 검증 대상이다.
class TestDB implements SqlDatabase {
  raw: DatabaseSync;
  constructor(path = ":memory:") {
    this.raw = new DatabaseSync(path);
    this.raw.exec("PRAGMA foreign_keys=ON;" + SCHEMA);
  }
  async execAsync(sql: string) {
    this.raw.exec(sql);
  }
  async runAsync(sql: string, ...params: Param[]) {
    const r = this.raw.prepare(sql).run(...params);
    return {
      changes: Number(r.changes),
      lastInsertRowId: Number(r.lastInsertRowid),
    };
  }
  async getFirstAsync<T>(sql: string, ...params: Param[]) {
    return (this.raw.prepare(sql).get(...params) ?? null) as T | null;
  }
  async getAllAsync<T>(sql: string, ...params: Param[]) {
    return this.raw.prepare(sql).all(...params) as T[];
  }
  async withExclusiveTransactionAsync(
    task: (tx: SqlConnection) => Promise<void>,
  ) {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      await task(this);
      this.raw.exec("COMMIT");
    } catch (e) {
      this.raw.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.raw.close();
  }
}
function setup() {
  const db = new TestDB();
  const repo = new ExpenseRepository(db, randomUUID);
  return {
    db,
    repo,
    service: new ExpenseService(repo),
    stats: new StatisticsRepository(db),
  };
}
test('분석 텍스트·시간 저장, 재시작 유지, 삭제 후 재시작 유지', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'receipt-history-'));
  const file = join(dir, 'history.db');
  let db = new TestDB(file);
  try {
    await db.execAsync(HISTORY_SCHEMA);
    const repo = new HistoryRepository(db);
    await repo.save({id:'a',text:'테스트 상점\n합계 1000',elapsedMs:123,createdAt:'2026-11-18T00:00:00Z'});
    await repo.save({id:'b',text:'합계 2000',elapsedMs:200,createdAt:'2026-11-18T00:00:01Z'});
    db.close(); db = new TestDB(file);
    const reopened = new HistoryRepository(db);
    const rows = await reopened.list();
    assert.deepEqual(rows.map(r=>r.id), ['b','a']);
    assert.equal(rows[1].elapsedMs,123);
    assert.deepEqual(Object.keys(rows[0]).sort(),['createdAt','elapsedMs','id','text']);
    await reopened.remove('a');
    db.close(); db = new TestDB(file);
    assert.deepEqual((await new HistoryRepository(db).list()).map(r=>r.id), ['b']);
  } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('OCR 결과에 원문·실측 시간 포함, 사진 URI 미포함', async () => {
  const service = new ReceiptService({recognize:async()=> '테스트\n합계 1000',cancel:()=>{}}, {createCopy:async()=> 'cache://copy',remove:async()=>{}},()=> 'analysis-id');
  const result = await service.analyze('private://original');
  assert.equal(result.text,'테스트\n합계 1000');
  assert.ok(Number.isInteger(result.elapsedMs) && result.elapsedMs >= 0);
  assert.equal(result.id,'analysis-id');
  assert.ok(!JSON.stringify(result).includes('private://'));
});
test('사용처 검색과 날짜·카테고리 조건 및 CSV 대상 일치', async()=>{
  const {db,service}=setup();
  try {
    await service.save(input({merchant:'서울 카페',category:'카페·간식',total:4500}),'search-a');
    await service.save(input({merchant:'서울 식당',category:'식비',total:9000}),'search-b');
    await service.save(input({merchant:'부산 카페',category:'카페·간식',total:5500}),'search-c');
    const rows=await service.list({search:'  서울  ',startDate:'2026-11-01',endDate:'2026-11-30',category:'카페·간식'});
    assert.equal(rows.length,1);assert.equal(rows[0].total,4500);
    const csv=toCsv(rows);assert.ok(csv.includes('서울 카페'));assert.ok(!csv.includes('서울 식당'));assert.ok(!csv.includes('부산 카페'));
  } finally {db.close();}
});
test('검색의 %, _, 따옴표는 SQL 패턴이나 명령이 아닌 문자',async()=>{
  const {db,service}=setup();
  try {
    await service.save(input({merchant:'100%_가게'}),'literal-a');
    await service.save(input({merchant:'일반 가게'}),'literal-b');
    assert.equal((await service.list({search:'%_'})).length,1);
    assert.equal((await service.list({search:"' OR 1=1 --"})).length,0);
    assert.equal((await service.list({search:'   '})).length,2);
    assert.throws(()=>service.list({search:'a'.repeat(101)}));
  } finally {db.close();}
});
test('영문 사용처 검색은 대소문자를 구분하지 않음',async()=>{
  const {db,service}=setup();
  try {await service.save(input({merchant:'Coffee Shop'}),'case-a');assert.equal((await service.list({search:'COFFEE'})).length,1);}finally{db.close();}
});
for (const amount of [0, -1, 1.5, 1e9, NaN, Infinity])
  test(`금액 차단 ${amount}`, () =>
    assert.throws(() => validateExpense(input({ total: amount }))));
test("경계 금액·선택 사용처·날짜 검증", () => {
  for (const total of [1, 999999999])
    assert.equal(
      validateExpense(input({ merchant: "   ", total })).merchant,
      "",
    );
  assert.ok(isDate("2024-02-29"));
  assert.ok(!isDate("2026-02-29"));
  assert.ok(!isDate("2026-04-31"));
  assert.throws(() => parseAmountInput(""));
  assert.throws(() => parseAmountInput("1.5"));
  assert.throws(() => validateExpense(input({ memo: "a".repeat(501) })));
});
test("품목 수량·금액 경계", () => {
  assert.throws(() =>
    validateExpense(input({ items: [{ name: "", quantity: 0, amount: -1 }] })),
  );
  assert.equal(
    validateExpense(
      input({ items: [{ name: "물", quantity: null, amount: 0 }] }),
    ).items.length,
    1,
  );
});
test("총액과 거스름돈 구분, 품목 분류", () => {
  const r = parseReceipt(
    "상호: 커피가게\n2026.11.16\n아메리카노 2 9,000\n합계 9,000\n받은 금액 10,000\n거스름돈 1,000",
  );
  assert.equal(r.total, 9000);
  assert.equal(r.category, "카페·간식");
  assert.equal(r.items.length, 1);
  assert.equal(r.paidAt, "2026-11-16");
});
test("총액 후보 충돌·결측·환불은 빈값", () => {
  assert.equal(parseReceipt("합계 10,000\n결제금액 9,000").total, null);
  assert.equal(parseReceipt("받은금액 10000\n거스름돈 1000").total, null);
  assert.equal(parseReceipt("환불\n합계 10000").total, null);
  assert.equal(parseReceipt("2026-02-30").paidAt, "");
});
test("동일 저장의 연속·동시 요청은 1건, 다른 요청은 2건", async () => {
  const { db, service } = setup();
  try {
    const [a, b] = await Promise.all([
      service.save(input(), "key"),
      service.save(input(), "key"),
    ]);
    assert.equal(a.id, b.id);
    await service.save(input(), "key");
    assert.equal((await service.list()).length, 1);
    await service.save(input(), "new");
    assert.equal((await service.list()).length, 2);
  } finally {
    db.close();
  }
});
test("날짜 경계·카테고리 AND·같은 날 생성 역순", async () => {
  const { db, service } = setup();
  try {
    await service.save(input({ paidAt: "2026-11-01" }), "a");
    const b = await service.save(input({ paidAt: "2026-11-30" }), "b");
    const c = await service.save(
      input({ paidAt: "2026-11-30", category: "교통" }),
      "c",
    );
    assert.deepEqual((await service.list()).map((r) => r.id).slice(0, 2), [
      c.id,
      b.id,
    ]);
    assert.equal(
      (
        await service.list({
          startDate: "2026-11-01",
          endDate: "2026-11-30",
          category: "식비",
        })
      ).length,
      2,
    );
    assert.throws(() =>
      service.list({ startDate: "2026-11-30", endDate: "2026-11-01" }),
    );
  } finally {
    db.close();
  }
});
test("인수 시나리오 통계 18000→20000→17000", async () => {
  const { db, service, stats } = setup();
  try {
    await service.save(input(), "a");
    const b = await service.save(input({ total: 5000 }), "b");
    const c = await service.save(
      input({
        total: 3000,
        category: "교통",
        items: [{ name: "택시", quantity: 1, amount: 3000 }],
      }),
      "c",
    );
    assert.equal((await stats.monthly("2026-11")).total, 18000);
    const updated = await service.update(b.id, input({ total: 7000 }));
    assert.ok(updated.updatedAt > b.updatedAt);
    assert.equal((await stats.monthly("2026-11")).total, 20000);
    await service.remove(c.id);
    assert.equal((await stats.monthly("2026-11")).total, 17000);
    assert.equal(
      (
        await db.getFirstAsync<{ n: number }>(
          "SELECT COUNT(*) AS n FROM expense_items",
        )
      )?.n,
      0,
    );
    assert.ok(
      (await stats.monthly("2026-12")).categories.every(
        (c) => c.percentage === 0,
      ),
    );
  } finally {
    db.close();
  }
});
test("품목 삽입 실패 시 지출 전체 rollback", async () => {
  const { db, repo } = setup();
  try {
    await assert.rejects(
      repo.create(
        input({ items: [{ name: "품목", quantity: -1, amount: 100 }] }),
        "bad",
      ),
    );
    assert.equal((await repo.list()).length, 0);
  } finally {
    db.close();
  }
});
test("수정 실패 시 이전 품목과 금액 보존", async () => {
  const { db, repo } = setup();
  try {
    const old = await repo.create(
      input({ items: [{ name: "음식", quantity: 1, amount: 10000 }] }),
      "a",
    );
    await assert.rejects(
      repo.update(
        old.id,
        input({
          total: 20000,
          items: [{ name: "잘못된 값", quantity: 0, amount: 20000 }],
        }),
      ),
    );
    const same = await repo.get(old.id);
    assert.equal(same.total, 10000);
    assert.equal(same.items[0].name, "음식");
  } finally {
    db.close();
  }
});
test("DB 종료·재연결 후 기록 유지", async () => {
  const dir = mkdtempSync(join(tmpdir(), "receipt-test-"));
  const path = join(dir, "test.db");
  let db = new TestDB(path);
  try {
    await new ExpenseRepository(db, randomUUID).create(input(), "key");
    db.close();
    db = new TestDB(path);
    assert.equal(
      (await new ExpenseRepository(db, randomUUID).list()).length,
      1,
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("CSV 한글·따옴표·쉼표·줄바꿈 및 빈 헤더", () => {
  const csv = toCsv([
    {
      ...input({ merchant: '한글,"상점"', memo: "첫째\n둘째" }),
      id: "1",
      createdAt: "",
      updatedAt: "",
    },
  ]);
  assert.ok(csv.includes('"한글,""상점"""'));
  assert.ok(csv.includes('"첫째\n둘째"'));
  assert.equal(toCsv([]).split("\r\n").length, 2);
  assert.throws(() => validateFileName("../x"));
  assert.equal(validateFileName("가계부"), "가계부.csv");
});
test("분석 결과는 초안만 반환하고 임시 복사만 삭제", async () => {
  const removed: string[] = [];
  const service = new ReceiptService(
    {
      recognize: async () => "상호: 식당\n2026-11-16\n합계 10000",
      cancel: () => {},
    },
    {
      createCopy: async () => "owned-copy",
      remove: async (uri) => {
        removed.push(uri);
      },
    },
    randomUUID,
  );
  const d = await service.analyze("gallery-original");
  assert.equal(d.total, 10000);
  assert.deepEqual(removed, ["owned-copy"]);
});
test("OCR 시간 초과 후 늦은 결과 폐기 및 재시도", async () => {
  let resolve: (s: string) => void = () => {};
  let cancelled = 0;
  const removed: string[] = [];
  const engine = {
    recognize: () =>
      new Promise<string>((r) => {
        resolve = r;
      }),
    cancel: () => {
      cancelled++;
    },
  };
  const service = new ReceiptService(
    engine,
    {
      createCopy: async () => "owned",
      remove: async (uri) => {
        removed.push(uri);
      },
    },
    randomUUID,
    10,
  );
  await assert.rejects(
    service.analyze("original"),
    (e: any) => e.code === "TIMEOUT",
  );
  resolve("합계 1000");
  assert.equal(cancelled, 1);
  assert.deepEqual(removed, ["owned"]);
  engine.recognize = async () => "합계 2000";
  assert.equal((await service.analyze("original")).total, 2000);
});
test("취소·동시 분석 차단", async () => {
  const control = new AbortController();
  const service = new ReceiptService(
    { recognize: () => new Promise(() => {}), cancel: () => {} },
    { createCopy: async () => "owned", remove: async () => {} },
    randomUUID,
  );
  const pending = service.analyze("original", control.signal);
  await assert.rejects(
    service.analyze("second"),
    (e: any) => e.code === "BUSY",
  );
  control.abort();
  await assert.rejects(pending, (e: any) => e.code === "CANCELLED");
});
test("글자 없는 사진·인식 실패 정리", async () => {
  let cleaned = 0;
  const service = new ReceiptService(
    { recognize: async () => "", cancel: () => {} },
    {
      createCopy: async () => "owned",
      remove: async () => {
        cleaned++;
      },
    },
    randomUUID,
  );
  await assert.rejects(
    service.analyze("original"),
    (e: any) => e.code === "NO_TEXT",
  );
  assert.equal(cleaned, 1);
});
