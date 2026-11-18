package expo.modules.receiptocr

import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

class ReceiptOcrModule : Module() {
  private class Job(val recognizer: TextRecognizer, val promise: Promise) {
    val settled = AtomicBoolean(false)
  }
  private val jobs = ConcurrentHashMap<String, Job>()
  override fun definition() = ModuleDefinition {
    Name("ReceiptOcr")
    // ML Kit Task 자체에는 cancel API가 없다. 결과 전달을 즉시 차단하고 자원을 닫는다.
    Function("cancel") { id: String ->
      jobs.remove(id)?.let { job ->
        if (job.settled.compareAndSet(false, true)) job.promise.reject("CANCELLED", "분석 취소", null)
        job.recognizer.close()
      }
    }
    AsyncFunction("recognize") { uri: String, id: String, promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw IllegalStateException("Context unavailable")
        val parsed = Uri.parse(uri)
        require(parsed.scheme == "file") { "앱 임시 파일만 허용합니다." }
        val file = File(parsed.path ?: "").canonicalFile
        val owned = File(context.cacheDir, "receipt-ledger-images").canonicalFile
        require(file.parentFile == owned) { "앱 임시 폴더 밖의 파일입니다." }
        require(file.exists() && file.length() in 1..(10L * 1024 * 1024)) { "10MB 이하 이미지를 선택해 주세요." }
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.path, options)
        require(options.outMimeType in listOf("image/jpeg", "image/png")) { "JPEG/PNG만 지원합니다." }
        require(options.outWidth > 0 && options.outHeight > 0 && options.outWidth.toLong() * options.outHeight <= 20000000) { "2000만 화소 이하 이미지를 선택해 주세요." }
        val image = InputImage.fromFilePath(context, parsed)
        val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        val job = Job(recognizer, promise)
        require(jobs.putIfAbsent(id, job) == null) { "중복 요청 ID" }
        recognizer.process(image)
          .addOnSuccessListener { result ->
            if (job.settled.compareAndSet(false, true)) {
              val lines = result.textBlocks.flatMap { it.lines }.sortedWith(
                compareBy({ it.boundingBox?.top ?: 0 }, { it.boundingBox?.left ?: 0 })
              )
              promise.resolve(lines.joinToString("\n") { it.text })
            }
          }
          .addOnFailureListener { error ->
            if (job.settled.compareAndSet(false, true)) promise.reject("OCR_FAILED", "문자 인식 실패", error)
          }
          .addOnCompleteListener { jobs.remove(id, job); recognizer.close() }
      } catch (error: Exception) {
        jobs.remove(id)?.recognizer?.close()
        promise.reject("IMAGE", error.message ?: "이미지 오류", error)
      }
    }
    OnDestroy {
      jobs.values.forEach { job ->
        if (job.settled.compareAndSet(false, true)) job.promise.reject("CANCELLED", "모듈 종료", null)
        job.recognizer.close()
      }
      jobs.clear()
    }
  }
}
