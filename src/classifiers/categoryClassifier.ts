import type { Category } from "../constants/categories";
const RULES: [Category, RegExp][] = [
  [
    "카페·간식",
    /카페|커피|스타벅스|투썸|메가커피|빽다방|베이커리|빵|아메리카노|라떼/,
  ],
  ["교통", /택시|주유|버스|지하철|철도|주차/],
  ["의료", /약국|병원|의원|치과/],
  ["문화·여가", /영화|서점|도서|공연|노래방/],
  ["식비", /식당|김밥|치킨|피자|분식|국밥|식사|한식|중식|일식/],
  ["생활", /세탁|생활용품|다이소|청소/],
  ["쇼핑", /백화점|의류|신발|아울렛/],
];
export function classifyCategory(text: string): Category {
  return RULES.find(([, re]) => re.test(text))?.[0] ?? "기타";
}
