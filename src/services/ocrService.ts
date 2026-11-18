import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import { AppError } from "../errors";
interface NativeOCR {
  recognize(uri: string, requestId: string): Promise<string>;
  cancel(requestId: string): void;
}
export interface OcrEngine {
  recognize(uri: string, id: string): Promise<string>;
  cancel(id: string): void;
}
function native(): NativeOCR {
  if (Platform.OS !== "android")
    throw new AppError(
      "UNSUPPORTED",
      "현재 OCR 연결은 Android 빌드에서 지원됩니다.",
    );
  const mod = requireOptionalNativeModule<NativeOCR>("ReceiptOcr");
  if (!mod)
    throw new AppError(
      "UNSUPPORTED",
      "OCR 모듈이 없습니다. Expo Go 대신 Android 개발 빌드를 설치해 주세요.",
    );
  return mod;
}
export const ocrEngine: OcrEngine = {
  recognize: (uri, id) => native().recognize(uri, id),
  cancel: (id) => native().cancel(id),
};
