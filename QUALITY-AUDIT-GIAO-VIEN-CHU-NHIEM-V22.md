# QUALITY AUDIT — GIÁO VIÊN CHỦ NHIỆM

## Product contract

- Core outcome: giáo viên tiểu học tổ chức lớp, gọi tên, chia nhóm, chơi game, quản lý câu hỏi/thi đua/chuyên cần mà không phụ thuộc Internet.
- Protected features: danh sách học sinh, lớp 1–5 và lớp 1.1–5.9, Gọi tên vui, 9 trò chơi, Kho câu hỏi, 4 MP3 tích hợp, lưu dữ liệu cục bộ, PWA/offline.
- Online-only: AI và đọc một số định dạng tài liệu bằng thư viện tải động; không chặn luồng lớp học cốt lõi.

## Audit findings and changes

- Fixed a high-risk render routing problem caused by several game modules wrapping `gameSetup()`/`renderGames()` in sequence.
- Added lightweight entry routing for `Ống kính may mắn`, `Quiz Nghiêng Đầu` and `Ai là triệu phú` so opening a game cannot invoke the heavy legacy renderer prematurely.
- Consolidated duplicate `visibilitychange` audio handlers into one lifecycle path; background audio is paused/resumed only when the previous state was active.
- Replaced smooth navigation scrolling with immediate scroll-to-top to avoid queued animation work during rapid teacher navigation.
- Release package excludes checkpoints and generated WAV duplicates; bundled MP3 files remain available offline.

## Evidence

- Inline JavaScript compilation: 3 script blocks compile successfully.
- Local HTTP resources: `index.html`, service worker, local font and 4 MP3 files returned HTTP 200.
- Browser: dashboard opened with no Console errors; navigation reached the main sections; Gọi tên vui completed a real spin and displayed a winner; no more than one audio settings button was present.
- Independent game opening checks: Kéo co, Ống kính, Lật mảnh ghép, Hộp quà, Đường đua, Ai nhanh hơn, Chế độ giấy, Quiz Nghiêng Đầu and Ai là triệu phú all produced a responsive game screen; Ai là triệu phú reached Câu 1/10.
- Layout check: no horizontal overflow at the tested browser viewport; local Vietnamese font is loaded.

## Remaining limits

- Camera-based features require browser permission and HTTPS/localhost; they were not granted during automated checks.
- AI endpoint and Word/Excel/PDF dynamic readers require network/API configuration and are intentionally outside the offline core.
- A simultaneous nine-tab stress run exceeded the browser automation time budget; the independent per-game checks are the reliable evidence.

## Status

RELEASE CANDIDATE, not ACCEPTED: core flows are usable and the known game-routing hang is addressed, but a full classroom device matrix and real audio listening test still require human confirmation.
