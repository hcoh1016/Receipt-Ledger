export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return (
    d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
  );
}
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function monthRange(month: string): {
  startDate: string;
  endDate: string;
} {
  if (!/^\d{4}-\d{2}$/.test(month) || !isDate(month + "-01"))
    throw new Error("월 형식은 YYYY-MM입니다.");
  let last = 31;
  while (!isDate(`${month}-${last}`)) last--;
  return { startDate: month + "-01", endDate: `${month}-${last}` };
}
