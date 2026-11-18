import * as FS from "expo-file-system/legacy";
import { randomUUID } from "expo-crypto";
import { AppError } from "../errors";
function directory() {
  if (!FS.cacheDirectory)
    throw new AppError("STORAGE", "임시 저장소를 사용할 수 없습니다.");
  return FS.cacheDirectory + "receipt-ledger-images/";
}
export const tempFiles = {
  async createCopy(source: string) {
    const dir = directory();
    await FS.makeDirectoryAsync(dir, { intermediates: true });
    const uri = dir + randomUUID() + ".img";
    await FS.copyAsync({ from: source, to: uri });
    return uri;
  },
  async remove(uri: string) {
    if (
      !uri.startsWith(directory()) ||
      uri.slice(directory().length).includes("/")
    )
      throw new AppError("IMAGE", "앱 임시 이미지 외에는 삭제할 수 없습니다.");
    await FS.deleteAsync(uri, { idempotent: true });
  },
  async cleanupOnStartup() {
    await FS.deleteAsync(directory(), { idempotent: true });
  },
};
