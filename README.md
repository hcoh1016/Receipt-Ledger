# ReceiptLedger — MP2107 통합 구현

## 현재 검증 상태
카메라/갤러리 입력, 권한 거절 안내, 온디바이스 OCR, 결과·처리 시간 표시, 자동 분석 이력 저장·목록·삭제, 텍스트 공유, 가계부·통계·CSV 구현.
2026-11-18: TypeScript 의미 검사 오류 0건, Node 테스트 32개 통과. 네이티브 Android 빌드 성공, 실기기 조작, 비행기 모드 OCR, 시스템 공유 시트는 아직 확인하지 않았습니다. screenshots의 실제 증거와 아래 측정표를 채우기 전에는 제출 준비 완료가 아닙니다.

## 실행 절차
Windows CMD에서 압축을 푼 앱 소스 디렉터리로 이동합니다. MP별 ZIP에서는 app 디렉터리입니다. 명령 앞의 프롬프트 경로나 실행 로그를 복사하지 마세요.

```bat
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run android -- --device
```

기기 목록에서 Medium_Phone_API_36.1을 선택합니다. emulator-5556 같은 ADB ID 대신 대화형 선택을 사용합니다. npm이 무응답이면 프로젝트 폴더에 0바이트 npm.cmd 파일이 있는지 확인하고 제거/이름 변경하세요. 설치 시 Gradle 9와 호환되지 않는 Foojay 0.5.0 선언은 postinstall에서 1.0.0으로 수정합니다.
SDK 경로 오류가 계속되면 android/local.properties에 자신의 경로를 슬래시로 입력합니다: sdk.dir=C:/Users/kmp05/AppData/Local/Android/Sdk. 이 기기별 파일은 제출하지 않습니다.

오프라인 시험용 release 빌드:
```bat
set "LEDGER_OFFLINE_RELEASE=1"
npx.cmd expo prebuild --platform android
npx.cmd expo run:android --variant release --device
```
기존 android 프로젝트가 있다면 plugin 변경 사항이 반영되도록 prebuild를 실행합니다. 비행기 모드 후 Wi-Fi도 끄고 앱을 완전히 종료/재실행하여 촬영 또는 갤러리 OCR을 시험합니다. Expo Go는 커스텀 네이티브 OCR 모듈을 포함하지 않아 사용할 수 없습니다.

## 버전 및 실행 기기
- Expo 55.0.32 / React Native 0.83.10 / React 19.2.0 / TypeScript 5.9.3
- expo-camera 55.0.23 / expo-image-picker 55.0.24 / expo-sqlite 55.0.20
- ML Kit bundled Korean text-recognition-korean 16.0.1 (모델 포함)
- 사용자 로그: Node 24.11.0, JDK 21.0.9, Gradle 9.0.0, compile/target SDK 36, min SDK 29
- 선택한 에뮬레이터: Medium_Phone_API_36.1. 실제 OS/API는 Android 설정에서 확인해 아래 실행 기록에 입력해야 합니다.
- 공지의 권장/필수 버전표는 작은 이미지로 정확히 판독되지 않았으므로 버전 규정 충족은 미확인입니다. 현재 설치한 버전을 고정한 lockfile을 제공합니다.

## 권한 처리와 예외
홈 → 지출 등록 → 카메라 열기 / 사진 선택이 별도 진입점입니다. 카메라는 필요 이유를 표시하고 권한 요청, 거절 안내, 다시 요청 또는 설정 이동을 제공합니다. 갤러리는 시스템 사진 선택기를 사용하므로 OS 버전에 따라 전체 사진 권한 대화상자가 표시되지 않을 수 있습니다. 선택 취소는 기존 화면으로 돌아옵니다. 문자가 없으면 재촬영/직접 입력 안내를 표시하고, OCR 실패/시간 초과/취소 시 임시 파일을 정리합니다.

## 분석 및 이력 데이터 구조
ReceiptService가 이미지 복사부터 OCR 및 영수증 해석까지 performance.now()로 ms 단위 측정합니다. 결과 화면에 원문과 시간이 표시됩니다. 성공한 분석은 가계부 저장 여부와 별개로 analysis_history(id, text, elapsedMs, createdAt)에 저장됩니다. 원본 이미지/URI는 저장하지 않습니다. 이력 저장 실패 시 성공으로 표시하지 않고 안내합니다. 가계부는 사용자의 입력 확인 후 별도로 저장합니다.

## 확인 방법
모든 시험 데이터는 실명·연락처 없는 가상 영수증(테스트상점, 합계 1000원)과 글자 없는 사물/빈 종이를 사용합니다. 입력 원본 사진은 제출하지 않습니다.

| 기준 | 입력 → 조작 → 기대 결과 | 네트워크 | 증거 파일 |
|---|---|---|---|
| MP1 카메라 | 가상 영수증 → 카메라 열기/촬영 → 사진 미리보기 | 온라인 또는 오프라인 | 01_camera.png |
| MP1 갤러리 | 가상 영수증 → 사진 선택 → 미리보기 | 동일 | 02_gallery.png |
| MP1 권한 | 권한 미허용 → 카메라 진입 → OS 요청; 거절 → 안내/설정 이동 | 동일 | 03_permission.png, 04_denied.png |
| MP1 취소 | 사진 선택기 → 뒤로 → 크래시 없이 입력 화면 | 동일 | 실행 기록 |
| MP2 OCR | 가상 영수증 → 분석 → 텍스트와 처리 시간 | 온라인 | 05_result.png |
| MP2 오프라인 | release 재실행 → 같은 입력 분석 → 결과 표시 | 비행기 모드, Wi-Fi 끔 | 06_offline.png |
| MP2 실패 | 빈 종이 → 분석 → 인식 불가 안내 | 오프라인 | 07_no_text.png |
| MP3 이력 | 분석 성공 → 분석 이력 탭 → 텍스트 목록 | 오프라인 | 08_history.png |
| MP3 재시작/삭제 | 앱 강제 종료/재실행 → 이력 유지; 삭제/재실행 → 해당 항목 없음 | 오프라인 | 09_restart.png, 11_deleted.png |
| MP3 공유 | 이력의 결과 공유 → 시스템 공유 시트 → 다른 앱에 텍스트 전달 | 오프라인 가능한 대상 앱 | 10_share.png |

## 실행 기록 및 처리 시간 측정값
실제 측정 전입니다. 아래 빈칸은 앱 결과 화면을 보고 작성하세요. 자동 단위 테스트 시간은 OCR 기기 측정값이 아닙니다.

| 기기/실제 API | 빌드 | 입력 | 네트워크 | 처리 시간(ms) | 실제 결과 |
|---|---|---|---|---|---|
| 미측정 | release | 가상 영수증 | 온라인 | 미측정 | 미검증 |
| 미측정 | release | 동일 가상 영수증 | 비행기 모드/Wi-Fi 끔 | 미측정 | 미검증 |

## 제출 점검
screenshots 폴더의 지침대로 실제 화면 PNG/JPG를 넣습니다(각 2MB 이하, ZIP당 최대 12장). 개인정보, 테스트 원본 사진, .env 실제 키, node_modules, build, .gradle, 로컬 SDK 경로 파일은 제외합니다. 단계별 ZIP은 동일한 누적 최종 소스이며 README의 단계별 점검 범위를 구분했습니다. 단계 이전으로 기능을 되돌린 버전은 아닙니다.
