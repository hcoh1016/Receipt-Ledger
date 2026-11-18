param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
New-Item -ItemType Directory -Force 'logs' | Out-Null
$log=Join-Path (Get-Location) ('logs/setup-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.log')
Start-Transcript -Path $log
try {
  if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js 24 LTS is required.'}
  $major=[int]((& node -p 'process.versions.node.split(".")[0]') | Select-Object -Last 1)
  if($major -lt 24){throw 'Install Node.js 24 LTS or newer before continuing.'}
  & npm.cmd install --no-audit --no-fund
  if($LASTEXITCODE -ne 0){throw 'Dependency installation failed. See the npm network error above.'}
  & npm.cmd run typecheck
  if($LASTEXITCODE -ne 0){throw 'Type checking failed.'}
  & npm.cmd test
  if($LASTEXITCODE -ne 0){throw 'Tests failed.'}
  if($CheckOnly){Write-Host 'Dependency install, type checking and tests passed.';return}
  if(-not $env:ANDROID_HOME){$sdk=Join-Path $env:LOCALAPPDATA 'Android\Sdk';if(Test-Path $sdk){$env:ANDROID_HOME=$sdk}}
  if(-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)){throw 'Android SDK not found. Install it in Android Studio.'}
  $env:Path=(Join-Path $env:ANDROID_HOME 'platform-tools')+';'+$env:Path
  if(-not $env:JAVA_HOME){
    $studioJdk=Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
    if(Test-Path (Join-Path $studioJdk 'bin\java.exe')){$env:JAVA_HOME=$studioJdk}
  }
  if($env:JAVA_HOME){$env:Path=(Join-Path $env:JAVA_HOME 'bin')+';'+$env:Path}
  if(-not (Get-Command java -ErrorAction SilentlyContinue)){throw 'JDK 17 or an Android Studio JDK is required.'}
  & java -version
  & adb devices
  if($LASTEXITCODE -ne 0){throw 'Android device connection failed.'}
  & npm.cmd run android
  if($LASTEXITCODE -ne 0){throw 'Android build or launch failed. Review the Gradle output above.'}
} finally {Stop-Transcript}
