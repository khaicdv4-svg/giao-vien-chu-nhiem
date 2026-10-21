$ErrorActionPreference = 'Stop'
try {
    $runtime = Join-Path $PSScriptRoot 'runtime\node.exe'
    if (-not (Test-Path -LiteralPath $runtime)) {
        $available = Get-Command node -ErrorAction SilentlyContinue
        if ($available) { $runtime = $available.Source }
        else { $runtime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
    }
    if (-not (Test-Path -LiteralPath $runtime)) { throw 'Chưa tìm thấy bộ chạy. Vui lòng cài Node.js hoặc đặt node.exe vào thư mục runtime cạnh tệp mở bản thử.' }
    $previewPort = 8796
    if ($env:HMV_PREVIEW_PORT) { $previewPort = [int]$env:HMV_PREVIEW_PORT }
    if ($previewPort -lt 1024 -or $previewPort -gt 65535) { throw 'Cổng xem thử không hợp lệ.' }
    $previewLog = Join-Path $env:TEMP 'HmvReviewPreview'
    New-Item -ItemType Directory -Force -Path $previewLog | Out-Null
    $previewScript = Join-Path $PSScriptRoot 'preview-server.cjs'
    $previewProcess = Start-Process -FilePath $runtime -ArgumentList ('"' + $previewScript + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewLog 'preview.log') -RedirectStandardError (Join-Path $previewLog 'preview-error.log') -PassThru
    $previewReady = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($previewProcess.HasExited) { throw 'Không mở được bản thử. Cổng có thể đang được sử dụng; hãy đóng bản thử cũ rồi mở lại.' }
        try {
            $probe = Invoke-WebRequest -Uri ('http://127.0.0.1:' + $previewPort + '/') -UseBasicParsing -TimeoutSec 1
            if ($probe.StatusCode -eq 200 -and $probe.Headers['X-Hmv-Preview'] -eq 'review-local-v1') { $previewReady = $true; break }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $previewReady) { throw 'Bản thử chưa sẵn sàng. Vui lòng mở lại sau ít giây.' }
    Start-Process ('http://127.0.0.1:' + $previewPort + '/')
} catch {
    Write-Host ('Không thể mở bản thử: ' + $_.Exception.Message) -ForegroundColor Red
    Read-Host 'Nhấn Enter để đóng'
    exit 1
}
