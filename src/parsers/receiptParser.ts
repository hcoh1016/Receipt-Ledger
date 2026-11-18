import type { ExpenseItem, ReceiptDraft } from "../types/expense";
import { classifyCategory } from "../classifiers/categoryClassifier";
import { isDate } from "../utils/dateUtils";
import { LIMITS } from "../constants/limits";
function unique<T>(values: T[]): T | null {
  const a = [...new Set(values)];
  return a.length === 1 ? a[0] : null;
}
export function parseReceipt(text: string): ReceiptDraft {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const warnings: string[] = [];
  const unsupported = /환불|승인\s*취소|취소\s*영수증|USD|EUR|\$|€/.test(text);
  const dates = [
    ...text.matchAll(
      /(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})(?:일)?/g,
    ),
  ]
    .map((m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`)
    .filter(isDate);
  const paidAt = unique(dates) ?? "";
  const amounts: number[] = [];
  const totalLabel =
    /^(?:총\s*합계|총\s*액|합\s*계|총\s*결제\s*금액|결제\s*금액|받을\s*금액|청구\s*금액)\s*[:：]?\s*/;
  lines.forEach((line, i) => {
    if (
      !totalLabel.test(line) ||
      /소계|할인|거스름|받은|과세|면세|부가세/.test(line)
    )
      return;
    const rest = line.replace(totalLabel, "").trim();
    const value = rest || lines[i + 1] || "";
    if (/^(?:₩\s*)?\d[\d,]*\s*원?$/.test(value)) {
      const n = Number(value.replace(/[,₩원\s]/g, ""));
      if (Number.isInteger(n) && n > 0 && n <= LIMITS.amount) amounts.push(n);
    }
  });
  const total = unsupported ? null : unique(amounts);
  const named = lines
    .filter((l) => /^(?:상호명?|가맹점명|매장명)\s*[:：]/.test(l))
    .map((l) => l.replace(/^[^:：]+[:：]\s*/, ""));
  // 상단의 글자를 무조건 사용처로 확정하지 않는다. 전화/주소/사업자번호/영수증 제목은 제외한다.
  const header = lines
    .slice(0, 3)
    .find(
      (l) =>
        /^[가-힣A-Za-z][가-힣A-Za-z0-9 ·&()_-]{1,49}$/.test(l) &&
        !/(영수증|전표|고객|사업자|대표|주소|전화|상품|품명|번호|TEL)/i.test(l),
    );
  const merchant = (
    unique(named) ?? (named.length ? "" : (header ?? ""))
  ).slice(0, 100);
  const items: ExpenseItem[] = [];
  for (const line of lines) {
    // P2: 명확한 '품목명 수량 행금액' 형식만 지원. 단가/수량/금액 4열은 추측하지 않는다.
    const m = line.match(
      /^([가-힣A-Za-z][가-힣A-Za-z ()·_-]{0,99})\s+(\d{1,4})\s+(\d[\d,]*)\s*원?$/,
    );
    if (
      m &&
      !/합계|총액|할인|세금|부가세|소계|결제|받은|거스름|과세|면세/.test(m[1])
    ) {
      const quantity = Number(m[2]),
        amount = Number(m[3].replace(/,/g, ""));
      if (quantity > 0 && amount <= LIMITS.amount)
        items.push({ name: m[1].trim(), quantity, amount });
    }
  }
  if (unsupported)
    warnings.push(
      "환불·취소 또는 외화 영수증은 자동 처리 대상이 아닙니다. 내용을 직접 확인해 주세요.",
    );
  if (
    items.length &&
    total !== null &&
    items.reduce((s, i) => s + (i.amount ?? 0), 0) !== total
  )
    warnings.push(
      "품목 금액 합계와 결제 총액이 다릅니다. 할인 등을 확인해 주세요.",
    );
  return {
    merchant,
    paidAt,
    total,
    category: classifyCategory(
      merchant + " " + items.map((i) => i.name).join(" "),
    ),
    memo: "",
    items,
    reviewFields: ["merchant", "paidAt", "total", "category"],
    warnings,
  };
}
