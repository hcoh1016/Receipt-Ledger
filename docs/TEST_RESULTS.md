# 검증 기록

작성일: 2026-11-16. 테스트 실행 환경: Linux, Node.js 24.22.1. 기기 OCR 대신 제어 가능한 테스트 엔진을 주입한 항목은 실제 ML Kit 정확도 시험이 아닙니다.

| 검증 | 결과 | 범위 |
|---|---|---|
| TypeScript strict 타입 검사 | 통과 | 공용·서비스·UI 예시·테스트 코드 |
| 자동 테스트 | 21/21 통과 | 입력 경계·파서·중복·필터·CRUD·통계·CSV·취소 |
| 실제 SQLite 테스트 | 통과 | Node SQLite에서 동일 schema/repository SQL 실행 |
| Expo Android prebuild | 통과 | Android 프로젝트 및 설정 생성 |
| Expo 모듈 자동 연결 | 확인 | ReceiptOcrModule이 Android 모듈 목록에 포함됨 |
| Android JS/Hermes 번들 생성 | 통과 | Metro가 앱 참조 모듈을 해석·번들링 |
| 오프라인 릴리스 manifest 설정 | 확인 | INTERNET 병합 제거, allowBackup=false, 백업 규칙 참조 |
| Kotlin/Gradle APK 빌드 | 미실행 | Android SDK가 이 환경에 없어 기기 빌드 필요 |
| Android 실기기 SQLite·OCR·권한·공유 | 미실행 | 실기기 검증 필요 |
| 인식 속도·정확도·360dp·저장 공간 부족 | 미실행 | 요구사항 인수 시험 필요 |

## 자동 테스트 내용

금액 0/음수/소수/상한 초과/NaN/Infinity 차단 6개, 선택 상호·윤년·날짜·메모 길이, 품목 경계, 총액과 받은금액/거스름돈 구별, 애매한 총액·환불, 동일 요청 동시 저장, 날짜 경계/카테고리/정렬, 통계 18000→20000→17000, 저장/수정 실패 rollback, 파일 DB 재연결 지속성, CSV 특수문자 및 파일명, 초안 반환·임시 복사 정리, timeout 후 늦은 결과 및 재시도, 취소·동시 분석 차단, 글자 없음 처리.

재실행:
```powershell
npm run typecheck
npm test
```

## 실기기 인수 시험 체크리스트

- [ ] Android 13 이상/RAM 4GB 이상 기준 기기 모델명·OS 고정
- [ ] 정상 영수증 20장(1~5MB, 1200만 화소 이하) 중 19장 10초 이내
- [ ] 분석 30초 제한, 취소 후 늦은 결과 미반영, 재시도
- [ ] 10개 이상 상호의 30장: 총액·결제일 27장 이상, 사용처 24장 이상
- [ ] 1000건에서 초기·목록·통계 각20회 (명세5초/시험자료2초 충돌 먼저 통일)
- [ ] 확정 저장 후 강제종료10회, 중단 시 일부 지출/품목 잔존 없음
- [ ] 10MB/2000만 화소 초과·손상 JPEG·PNG·HEIC·PDF 검증
- [ ] 권한 거부·저장 공간 부족·선택 취소·공유 취소
- [ ] 최초 설치 후 비행기 모드, 백업 제외, 외부 전송 0건
- [ ] 사진 원본 유지, 앱 임시 복사 및 ImagePicker 캐시 정리
- [ ] UI 필드별 오류, 360dp, 수동 입력, 품목 편집, 화면 갱신

## 구현 참고 문서

- https://developers.google.com/ml-kit/vision/text-recognition/v2/android — 번들 한국어 모델과 TextRecognizer
- https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/ — SQLite 및 exclusive transaction
- https://docs.expo.dev/versions/v55.0.0/sdk/filesystem/ — 파일 API
- https://docs.expo.dev/modules/module-config/ — 로컬 모듈 등록
- https://docs.expo.dev/modules/module-api/ — Kotlin Module/Promise

패키지 실제 버전은 package-lock.json으로 고정합니다. 버전을 바꿀 때 네이티브 prebuild·앱 재빌드·위 테스트를 다시 수행하세요.
