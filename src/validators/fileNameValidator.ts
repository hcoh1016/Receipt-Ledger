import { AppError } from "../errors";
export function validateFileName(name: string): string {
  const n = name.trim().replace(/\.csv$/i, "");
  if (
    !n ||
    n.length > 80 ||
    /[<>:"/\\|?*\x00-\x1f]/.test(n) ||
    /[. ]$/.test(n) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(n)
  )
    throw new AppError(
      "VALIDATION",
      "파일명은 특수문자 없이 1~80자로 입력해 주세요.",
      { fileName: "파일명을 확인해 주세요." },
    );
  return n + ".csv";
}
