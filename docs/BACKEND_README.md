# ReceiptLedger — 공용 · 데이터 처리 · 온디바이스 OCR

오형채 담당 코드와 팀 공용 코드를 묶은 React Native 프로젝트입니다. AWS, Firebase, 서버 API, 로그인은 사용하지 않습니다. 데이터는 기기 SQLite에, 분석은 기기에 포함한 한국어 ML Kit 모델로 처리합니다.

**범위:** Android 10(API 29) 이상. React Native + Expo SDK 55 개발 빌드입니다. Expo Go 및 웹에서는 커스텀 OCR 모듈을 실행할 수 없습니다. iOS 연결은 포함하지 않았습니다. 프론트엔드의 최종 화면은 팀원이 구현하고, 현재 `examples/IntegrationScreen.tsx`는 연결 확인용입니다.

## 바로 실행하기 — Windows

1. Node.js 24 LTS, Android Studio, JDK 17을 설치합니다. Android Studio에서 Android SDK를 설치하고 `ANDROID_HOME` 환경 변수 및 `platform-tools` 경로를 설정합니다. SDK 세부 버전은 생성된 Android 프로젝트의 Gradle 설정에 맞춥니다.
2. 압축을 해제하고 **package.json이 있는 ReceiptLedger 폴더**를 VS Code로 엽니다.
3. 터미널에서 다음을 실행합니다.

```powershell
npm ci
npm run typecheck
npm test
npm run android
```

Android 에뮬레이터를 켜거나 USB 디버깅을 허용한 Android 기기를 연결한 상태에서 실행하세요. 최초 설치·Gradle 빌드에는 인터넷이 필요하지만 설치된 릴리스 앱의 가계부 기능은 네트워크 없이 동작하도록 설계했습니다. 개발 빌드는 Metro 접속용 인터넷 권한이 있습니다.

`npm run android`는 네이티브 프로젝트 생성과 앱 빌드를 진행합니다. QR을 Expo Go로 스캔하는 방식으로는 OCR을 사용할 수 없습니다. 기존 React Native 프로젝트에 `src`만 복사하면 Expo 및 네이티브 OCR 연결이 누락됩니다. 우선 이 프로젝트에서 실행한 후 화면 코드를 합치세요.

## 압축에 포함된 내용

| 위치 | 담당 | 내용 |
|---|---|---|
| App.tsx, src/bootstrap.ts, src/context/ | 공용 | 앱 초기화, DB·서비스 준비, React 연결 |
| src/types/, constants/, errors.ts | 공용 | 데이터 형식, 카테고리, 제한값, 오류 계약 |
| src/database/ | 오형채 | DB 생성, 트랜잭션, 지출·품목 CRUD, 통계 |
| src/services/ | 오형채 | OCR 흐름, 중복 저장 방지, CSV, 임시 파일 정리 |
| src/parsers/, classifiers/ | 오형채 | 정보 추출 규칙, 카테고리 제안 |
| src/validators/, utils/ | 오형채·공용 사용 | 입력 검증, 날짜·CSV 처리 |
| modules/receipt-ocr/ | 오형채 | Kotlin 한국어 ML Kit 연결, 이미지 실측 검증 |
| plugins/ | 공용 설정 | Android 백업 제외, 릴리스 인터넷 차단 |
| examples/ | 프론트 참고 | 서비스 호출 확인 화면 |
| tests/ | 오형채 | 자동 검증 코드 |
| docs/ | 공용 | 팀원 연결 방법·검증표·제약 |

별도 backend 폴더나 서버 실행 명령이 없는 이유는 데이터 처리 코드도 모바일 앱 안에서 실행되기 때문입니다.

## 기능

- 상호명·날짜·총액·품목 추출, 카테고리 제안. 정보 추출·분류는 규칙 기반이며 학습형 분류 모델이나 생성형 AI 호출은 없습니다.
- 총액 후보가 충돌하거나 없으면 빈 값. 받은 금액·거스름돈을 총액으로 사용하지 않습니다.
- 분석 결과는 저장되지 않는 초안이며 사용자가 확정해야 지출로 저장됩니다.
- 수동 입력 및 인식 결과에 동일 검증, 같은 저장 요청 ID에 대한 중복 방지.
- SQLite 지출·품목 트랜잭션, 조회·수정·삭제, 기간·카테고리 필터, 월별 통계.
- UTF-8 BOM CSV, 한글·따옴표·줄바꿈 보존, 결과 0건은 헤더만 생성.
- 분석 취소/30초 시간 초과, 늦은 결과 무시, 앱 소유 임시 복사 정리.
- Android 모델 번들링, 자동 백업·기기간 복원 제외 설정.

## 문서 읽는 순서

1. `docs/FRONTEND_HANDOFF.md`: 팀원에게 전달할 함수와 예시.
2. `docs/REQUIREMENTS.md`: 요구사항별 구현 범위 및 남은 UI 작업.
3. `docs/TEST_RESULTS.md`: 실제 실행한 검증과 기기에서 해야 할 검증.
4. `docs/OFFLINE_RELEASE.md`: 인터넷 권한을 제거한 릴리스 확인 빌드.

실기기 OCR 정확도·속도 및 Android APK 빌드는 이 작업 환경에서 검증하지 못했습니다. 코드와 자동 테스트를 제공한 상태이며 앱의 모든 인수 기준을 통과했다고 주장하지 않습니다.
