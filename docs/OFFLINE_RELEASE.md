# 오프라인 릴리스 검증 빌드

모델은 `com.google.mlkit:text-recognition-korean:16.0.1`로 앱에 포함됩니다. 동적 모델 다운로드용 play-services 의존성은 사용하지 않습니다.

개발 빌드는 Metro 연결 때문에 인터넷 권한을 사용합니다. 제출/오프라인 검증용 앱은 아래 순서로 생성합니다. PowerShell 기준:

```powershell
$env:LEDGER_OFFLINE_RELEASE = '1'
npx expo prebuild --platform android
npx expo run:android --variant release
Remove-Item Env:LEDGER_OFFLINE_RELEASE
```

`prebuild --clean`은 생성된 네이티브 폴더의 직접 수정을 삭제하므로 필요 없으면 사용하지 마세요. Android 빌드 및 Gradle 의존성 다운로드에는 개발 PC의 인터넷이 필요합니다. 기기에서 실행될 릴리스 앱은 JS 번들이 포함되며 Metro 없이 동작합니다. 로컬 release는 개발용 서명이 사용될 수 있으므로 스토어 출시는 별도 서명 설정이 필요합니다.

`withPrivateStorage`는 main manifest에서 INTERNET을 병합 제거하고 allowBackup=false, fullBackupContent=false 및 Android 12+ cloud-backup/device-transfer 제외 규칙을 설정합니다. 최종 병합 manifest 및 APK에서도 적용을 확인해야 합니다.

개발 빌드로 돌아갈 때 환경 변수를 제거한 후 `npx expo prebuild --platform android`를 다시 실행하세요.

확인 항목:
- APK 설치 후 최초 실행부터 비행기 모드에서 촬영/선택/OCR/저장/목록/통계/CSV가 되는지.
- 앱 종료 후 재실행해 기록이 남는지.
- OS 백업 및 기기간 전송 대상에 DB와 파일이 포함되지 않는지.
- 네트워크 관찰 시 영수증/텍스트/지출 전송 0건인지.
- 공유는 사용자가 선택한 외부 앱 동작이므로 앱 자체 기능과 구분.
