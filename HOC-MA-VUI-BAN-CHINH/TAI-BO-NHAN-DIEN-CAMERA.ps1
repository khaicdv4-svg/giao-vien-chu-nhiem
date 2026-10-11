# Tai 5 tep cua MediaPipe (nhan dien khuon mat va ban tay) tu nguon chinh thuc vao app\vendor\mediapipe.
#   - Thu vien @mediapipe/tasks-vision 0.10.14 (qua jsDelivr, kho npm chinh thuc cua Google MediaPipe)
#   - Mo hinh face_landmarker.task va hand_landmarker.task (may chu mediapipe-models cua Google)
# Chi can chay mot lan khi may co Internet. Sau do Quiz Nghieng Dau va Bong bay tri thuc dung camera hoan toan offline.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$dest=Join-Path $PSScriptRoot 'app\vendor\mediapipe'
New-Item -ItemType Directory -Force -Path (Join-Path $dest 'wasm') | Out-Null
$pkg='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
$files=@(
  @{u="$pkg/vision_bundle.mjs";f='vision_bundle.mjs';min=50000},
  @{u="$pkg/wasm/vision_wasm_internal.js";f='wasm\vision_wasm_internal.js';min=50000},
  @{u="$pkg/wasm/vision_wasm_internal.wasm";f='wasm\vision_wasm_internal.wasm';min=1000000},
  @{u='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';f='face_landmarker.task';min=1000000},
  @{u='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';f='hand_landmarker.task';min=1000000}
)
foreach($x in $files){
  $out=Join-Path $dest $x.f
  Write-Host ('Dang tai: ' + $x.f)
  Invoke-WebRequest -Uri $x.u -OutFile $out -UseBasicParsing
  $size=(Get-Item -LiteralPath $out).Length
  if($size -lt $x.min){throw ('Tep tai ve qua nho, co the bi loi: ' + $x.f + ' (' + $size + ' byte)')}
  Write-Host ('  xong: ' + $size + ' byte')
}
Write-Host ''
Write-Host 'HOAN TAT. Bo nhan dien da nam trong app\vendor\mediapipe. Mo lai ung dung va bat camera trong Quiz Nghieng Dau hoac Bong bay tri thuc.'
