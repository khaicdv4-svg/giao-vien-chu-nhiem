param([switch]$NoBrowser)
# HOC MA VUI - BAN CHINH
# Chay may chu cuc bo tai http://127.0.0.1:8780/ va mo trinh duyet voi ho so rieng (khong dung du lieu lop that o cong 8765).
$ErrorActionPreference='Stop'
$previewRoot=$PSScriptRoot
$previewUrl='http://127.0.0.1:8780/'
$expected=(Get-FileHash -LiteralPath (Join-Path $previewRoot 'app\index.html') -Algorithm SHA256).Hash.ToLowerInvariant()

# Node.js: dung ban trong thu muc nay; neu chua co thi chep mot lan tu thu muc ban cu nam canh, hoac dung Node da cai tren may.
$node=Join-Path $previewRoot 'runtime\node.exe'
if(!(Test-Path -LiteralPath $node)){
  $parent=Split-Path -Parent $previewRoot
  $found=Get-ChildItem -LiteralPath $parent -Directory -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName 'runtime\node.exe' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if($found){
    New-Item -ItemType Directory -Force -Path (Join-Path $previewRoot 'runtime') | Out-Null
    Copy-Item -LiteralPath $found -Destination $node
    Write-Host ('Da chep node.exe tu: ' + $found)
  }else{
    $cmd=Get-Command node -ErrorAction SilentlyContinue
    if($cmd){$node=$cmd.Source}else{throw 'Khong tim thay runtime\node.exe. Hay chep thu muc "runtime" tu mot ban cu (vi du TRINH-DIEN-10-CHANG-7B-20261010) vao thu muc nay.'}
  }
}

$response=$null
$listener=Get-NetTCPConnection -LocalPort 8780 -State Listen -ErrorAction SilentlyContinue
if($listener){
  try{$response=Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 5}catch{throw 'Cong 8780 dang bi chuong trinh khac su dung; khong dung hay thay chuong trinh do.'}
  if([string]$response.Headers['X-Source-SHA256'] -ne $expected){throw 'Cong 8780 dang phuc vu mot ban khac; khong thay the.'}
}else{
  Start-Process -FilePath $node -ArgumentList @('"'+(Join-Path $previewRoot 'server.cjs')+'"') -WorkingDirectory $previewRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $previewRoot 'server.log') -RedirectStandardError (Join-Path $previewRoot 'server-error.log')
  for($i=0;$i -lt 30;$i++){try{$response=Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2;break}catch{Start-Sleep -Seconds 1}}
  if(!$response -or [string]$response.Headers['X-Source-SHA256'] -ne $expected){throw 'May chu khong khoi dong dung ban. Xem server-error.log.'}
}

if(!$NoBrowser){
  $candidates=@("$env:ProgramFiles\Google\Chrome\Application\chrome.exe","${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe","$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe","${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")
  $browser=$candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if(!$browser){throw 'Khong tim thay Google Chrome hoac Microsoft Edge.'}
  $userData=Join-Path $previewRoot 'profile-BAN-CHINH'
  Start-Process -FilePath $browser -ArgumentList @('--user-data-dir="'+$userData+'"','--no-first-run',$previewUrl)
}
Write-Host 'SAN SANG: http://127.0.0.1:8780/ - HMV-BAN-CHINH-2.13-20261014'
