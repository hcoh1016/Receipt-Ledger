# 오프라인 릴리스 빌드

모델은 `com.google.mlkit:text-recognition-korean:16.0.1`로 앱에 포함됩니다. 동적 모델 다운로드용 play-services 의존성은 사용하지 않습니다.

개발 빌드는 Metro 연결 때문에 인터넷 권한을 사용합니다. 오프라인 검증용 릴리스 앱은 다음 순서로 생성합니다. 아래 명령은 PowerShell 기준입니다.

```powershell
$env:LEDGER_OFFLINE_RELEASE = '1'
try {
    npx expo prebuild --platform android
    if ($LASTEXITCODE -ne 0) { throw 'Android 프로젝트 생성 실패' }
    npx expo run:android --variant release
    if ($LASTEXITCODE -ne 0) { throw '릴리스 빌드 실패' }
} finally {
    Remove-Item Env:LEDGER_OFFLINE_RELEASE -ErrorAction SilentlyContinue
}
```

`prebuild --clean`은 생성된 네이티브 폴더의 직접 수정을 삭제하므로 직접 변경한 내용이 있다면 실행 전 확인이 필요합니다. Android 빌드 및 Gradle 의존성 다운로드에는 개발 PC의 인터넷이 필요합니다. 기기에서 실행될 릴리스 앱은 JS 번들이 포함되며 Metro 없이 동작합니다. 로컬 release는 개발용 서명이 사용될 수 있으므로 스토어 출시는 별도 서명 설정이 필요합니다.

`withPrivateStorage`는 main manifest에서 INTERNET을 병합 제거하고 allowBackup=false, fullBackupContent=false 및 Android 12+ cloud-backup/device-transfer 제외 규칙을 설정합니다. 최종 병합 manifest 및 APK에서도 적용을 확인해야 합니다.

개발 빌드로 돌아갈 때 환경 변수를 제거한 후 `npx expo prebuild --platform android`를 다시 실행합니다.

## 검증 항목

- [ ] APK 설치 후 최초 실행부터 비행기 모드에서 촬영/선택/OCR/저장/목록/통계/CSV가 되는지.
- [ ] 앱 종료 후 재실행해 기록이 남는지.
- [ ] OS 백업 및 기기간 전송 대상에 DB와 파일이 포함되지 않는지.
- [ ] 네트워크 관찰 시 영수증/텍스트/지출 전송 0건인지.

공유는 사용자가 선택한 외부 앱 동작이므로 앱 자체의 네트워크 동작과 구분합니다.
