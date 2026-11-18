import { CATEGORIES } from "../constants/categories";
import { LIMITS } from "../constants/limits";
import { AppError } from "../errors";
import { isDate } from "../utils/dateUtils";
import type { ExpenseInput, ExpenseFilter } from "../types/expense";
export function validateExpense(input: ExpenseInput): ExpenseInput {
  const errors: Record<string, string> = {};
  const merchant =
    typeof input.merchant === "string" ? input.merchant.trim() : "";
  const memo = typeof input.memo === "string" ? input.memo : "";
  if (merchant.length > LIMITS.merchant)
    errors.merchant = "사용처는 100자 이내로 입력해 주세요.";
  if (!isDate(input.paidAt))
    errors.paidAt = "유효한 날짜를 YYYY-MM-DD로 입력해 주세요.";
  if (
    !Number.isInteger(input.total) ||
    input.total < 1 ||
    input.total > LIMITS.amount
  )
    errors.total = "총액은 1~999,999,999원의 정수여야 합니다.";
  if (!CATEGORIES.includes(input.category))
    errors.category = "목록에서 카테고리를 선택해 주세요.";
  if (memo.length > LIMITS.memo)
    errors.memo = "메모는 500자 이내로 입력해 주세요.";
  if (!Array.isArray(input.items))
    errors.items = "품목 목록 형식이 잘못되었습니다.";
  const items = (Array.isArray(input.items) ? input.items : []).map((i, n) => {
    const name = typeof i.name === "string" ? i.name.trim() : "";
    if (!name || name.length > 100)
      errors[`items.${n}.name`] = "품목명은 1~100자여야 합니다.";
    if (
      i.quantity !== null &&
      (!Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > LIMITS.quantity)
    )
      errors[`items.${n}.quantity`] =
        "수량은 빈 값 또는 1~9,999의 정수여야 합니다.";
    if (
      i.amount !== null &&
      (!Number.isInteger(i.amount) || i.amount < 0 || i.amount > LIMITS.amount)
    )
      errors[`items.${n}.amount`] =
        "품목 금액은 빈 값 또는 0~999,999,999원의 정수여야 합니다.";
    return { ...i, name };
  });
  if (Object.keys(errors).length)
    throw new AppError("VALIDATION", "입력값을 확인해 주세요.", errors);
  return { ...input, merchant, memo, items };
}
export function validateFilter(f: ExpenseFilter): ExpenseFilter {
  const errors: Record<string, string> = {};
  if (f.search !== undefined && (typeof f.search !== 'string' || f.search.trim().length > 100))
    errors.search = '사용처 검색어는 100자 이내로 입력해 주세요.';
  if (f.startDate && !isDate(f.startDate))
    errors.startDate = "시작일을 확인해 주세요.";
  if (f.endDate && !isDate(f.endDate))
    errors.endDate = "종료일을 확인해 주세요.";
  if (f.startDate && f.endDate && f.startDate > f.endDate)
    errors.endDate = "종료일은 시작일 이후여야 합니다.";
  if (f.category && !CATEGORIES.includes(f.category))
    errors.category = "카테고리를 확인해 주세요.";
  if (Object.keys(errors).length)
    throw new AppError("VALIDATION", "조회 조건을 확인해 주세요.", errors);
  return {...f, search:f.search?.trim() || undefined};
}
// 프론트의 빈 문자열을 Number('')로 바꾸면 0이 되므로 이 함수를 사용한다.
export function parseAmountInput(value: string): number {
  if (!/^\d+$/.test(value.trim()))
    throw new AppError("VALIDATION", "금액은 숫자만 입력해 주세요.", {
      total: "양의 정수를 입력해 주세요.",
    });
  return Number(value.trim());
}
