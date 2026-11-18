// expo-image-picker가 만든 앱 전용 복사본만 정리한다. 갤러리 content:// 원본은 건드리지 않는다.
import * as FS from "expo-file-system/legacy";
export async function cleanPickerCopy(uri: string) {
  const root = FS.cacheDirectory;
  if (
    root &&
    uri.startsWith(root + "ImagePicker/") &&
    !uri.slice((root + "ImagePicker/").length).includes("/")
  )
    await FS.deleteAsync(uri, { idempotent: true });
}
export async function cleanPickerCacheOnStartup() {
  if (FS.cacheDirectory)
    await FS.deleteAsync(FS.cacheDirectory + "ImagePicker/", {
      idempotent: true,
    });
}
