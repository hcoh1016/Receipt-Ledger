# ReceiptLedger

영수증 사진에서 지출 정보를 추출하고 기기 내부에 저장하는 가계부 앱입니다. 영수증이 없는 지출은 직접 입력할 수 있으며, 저장된 내역을 조회하거나 월별 통계와 CSV 파일로 확인할 수 있습니다.

별도 서버와 계정 없이 동작하는 구조입니다. 문자 인식에는 기기에 포함한 한국어 OCR 모델을 사용하고, 정보 추출과 카테고리 제안은 규칙 기반으로 처리합니다.

## 주요 기능

- 영수증 사진의 사용처·결제일·총액 추출
- 인식 결과 확인·수정 및 지출 직접 입력
- 지출·품목 저장, 조회, 수정, 삭제
- 기간·카테고리별 조회 및 월별 통계
- CSV 생성 및 OS 공유 연동
- 분석 취소·시간 초과 처리, 임시 이미지 정리

현재 `examples/IntegrationScreen.tsx`에서 기능 연결을 확인할 수 있습니다. 최종 UI와 실기기 검증은 진행 예정입니다. 품목 자동 추출은 명확한 3열 형식을 대상으로 하며, 인식 결과는 저장 전에 사용자가 확인합니다.

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 앱 | React Native, TypeScript, Expo SDK 55 |
| 문자 인식 | Google ML Kit 한국어 Text Recognition |
| 네이티브 연결 | Kotlin, Expo Modules API |
| 데이터 저장 | SQLite (`expo-sqlite`) |
| 정보 추출·분류 | 문자열 분석 및 키워드 규칙 |
| 테스트 | Node.js Test Runner, tsx, SQLite |

## 개발 환경

- Android 10(API 29) 이상
- Node.js 24 기준
- Android Studio, Android SDK, JDK 17
- Android 에뮬레이터 또는 USB 디버깅이 활성화된 Android 기기

현재 Android를 대상으로 구성되어 있습니다. 커스텀 OCR 모듈을 사용하므로 Expo Go로 실행할 수 없으며, 웹 및 iOS 연결은 포함되어 있지 않습니다.

## 설치 및 실행

저장소를 내려받은 뒤 `package.json`이 있는 폴더에서 실행합니다. Android SDK의 `ANDROID_HOME`과 `platform-tools` 경로를 먼저 설정합니다.

```powershell
npm ci
npm run android
```

`npm run android`는 Android 프로젝트 생성과 앱 빌드를 진행합니다. 최초 패키지 설치와 Gradle 빌드에는 인터넷이 필요합니다. 개발 빌드는 Metro 연결을 사용합니다.

## 테스트

```powershell
npm run typecheck
npm test
```

타입 검사와 자동 테스트는 Android 기기 없이 실행할 수 있습니다. 테스트 범위와 실기기 확인 항목은 [검증 기록](docs/TEST_RESULTS.md)에 정리되어 있습니다.

## 프로젝트 구성

| 경로 | 역할 |
|---|---|
| `App.tsx`, `src/bootstrap.ts`, `src/context/` | 앱 초기화 및 서비스 연결 |
| `src/types/`, `src/constants/`, `src/errors.ts` | 공통 타입·상수·오류 정의 |
| `src/database/` | DB 초기화, 지출·품목 관리, 통계 집계 |
| `src/services/` | 분석·저장·내보내기·임시 파일 처리 |
| `src/parsers/`, `src/classifiers/` | 영수증 정보 추출 및 카테고리 제안 |
| `src/validators/`, `src/utils/` | 입력값 검증 및 공통 처리 |
| `modules/receipt-ocr/` | Android 한국어 OCR 모듈 |
| `plugins/` | 백업 제외 및 오프라인 릴리스 설정 |
| `examples/` | 기능 연결 확인 화면 |
| `tests/` | 단위·통합 테스트 |
| `docs/` | 연동 방법, 요구사항, 검증 및 빌드 문서 |

## 데이터 처리

지출은 앱 전용 SQLite에 저장되며, OCR 결과는 사용자가 저장하기 전까지 통계에 반영되지 않습니다. 영수증 이미지를 지출 원본으로 영구 보관하지 않고, 분석에 사용한 앱 임시 복사본을 정리합니다.

자동 백업 제외와 릴리스 인터넷 권한 제거 설정이 포함되어 있습니다. 최종 APK에서의 적용 여부와 최초 실행 시 오프라인 동작은 실기기 검증 대상입니다. 앱 삭제·기기 초기화 시 기록이 소실될 수 있으므로 필요한 내역은 CSV로 별도 보관해야 합니다.

## 관련 문서

- [프론트엔드 연동](docs/FRONTEND_HANDOFF.md)
- [요구사항별 구현 현황](docs/REQUIREMENTS.md)
- [검증 기록](docs/TEST_RESULTS.md)
- [오프라인 릴리스 빌드](docs/OFFLINE_RELEASE.md)
