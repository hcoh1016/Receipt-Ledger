import type { OcrEngine } from "./ocrService";
import { parseReceipt } from "../parsers/receiptParser";
import { LIMITS } from "../constants/limits";
import { AppError } from "../errors";
interface TempStore {
  createCopy(uri: string): Promise<string>;
  remove(uri: string): Promise<void>;
}
export class ReceiptService {
  private busy = false;
  constructor(
    private engine: OcrEngine,
    private files: TempStore,
    private uuid: () => string,
    private timeoutMs: number = LIMITS.analysisMs,
  ) {}
  async analyze(uri: string, signal?: AbortSignal) {
    if (this.busy) throw new AppError("BUSY", "이미 분석 중입니다.");
    if (signal?.aborted)
      throw new AppError("CANCELLED", "분석을 취소했습니다.");
    this.busy = true;
    let owned: string | undefined,
      timer: ReturnType<typeof setTimeout> | undefined;
    const id = this.uuid();
    let abort = () => {};
    try {
      const text = await new Promise<string>((resolve, reject) => {
        let stopped = false;
        const stop = (code: "TIMEOUT" | "CANCELLED") => {
          stopped = true;
          try {
            this.engine.cancel(id);
          } catch {}
          reject(
            new AppError(
              code,
              code === "TIMEOUT"
                ? "분석 시간이 30초를 초과했습니다. 사진을 다시 선택하거나 직접 입력해 주세요."
                : "분석을 취소했습니다.",
            ),
          );
        };
        abort = () => stop("CANCELLED");
        signal?.addEventListener("abort", abort, { once: true });
        timer = setTimeout(() => stop("TIMEOUT"), this.timeoutMs);
        void (async () => {
          const copy = await this.files.createCopy(uri);
          owned = copy;
          if (stopped) {
            await this.files.remove(copy);
            owned = undefined;
            return;
          }
          const result = await this.engine.recognize(copy, id);
          if (!stopped) resolve(result);
        })().catch(reject);
      });
      if (signal?.aborted)
        throw new AppError("CANCELLED", "분석을 취소했습니다.");
      if (!text.trim())
        throw new AppError(
          "NO_TEXT",
          "글자를 찾지 못했습니다. 다시 촬영하거나 직접 입력해 주세요.",
        );
      return parseReceipt(text);
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(
        "OCR_FAILED",
        "영수증을 분석하지 못했습니다. JPEG/PNG, 10MB·2,000만 화소 이하인지 확인해 주세요.",
      );
    } finally {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      try {
        if (owned) await this.files.remove(owned);
      } finally {
        this.busy = false;
      }
    }
  }
}
