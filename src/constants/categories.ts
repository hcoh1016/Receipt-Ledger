export const CATEGORIES = [
  "식비",
  "카페·간식",
  "교통",
  "쇼핑",
  "생활",
  "의료",
  "문화·여가",
  "기타",
] as const;
export type Category = (typeof CATEGORIES)[number];
