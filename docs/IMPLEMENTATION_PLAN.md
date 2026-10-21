# Tiến độ triển khai Ôn tập và Kiểm tra

Cập nhật: 19/10/2026. Nguồn bối cảnh: `PROJECT_CONTEXT.md`; quy tắc: `../AGENTS.md`. Mỗi phiên chỉ hoàn thành một nhiệm vụ nhỏ. Kế hoạch chi tiết cũ giữ nguyên ở `../plans/on-tap-kiem-tra.md`.

## Trạng thái

| ID | Trạng thái | Công việc | Bằng chứng / giới hạn |
|---|---|---|---|
| H06D | DONE | MATCHING 2–8 cặp một-một, chạm A/B, xáo B, lưu/đổi/bỏ cặp, điểm tỷ lệ | 26 unit matching/domain/exporter/06A–06C PASS; Chrome A–G offline/editor 390px PASS; `outputs/review-html-06d/results.json` trong thư mục chat. Không kéo thả/vẽ dây |
| H06C | DONE | FILL nhiều ô [[n]], khóa/biến thể riêng, chấm tỷ lệ và làm tròn khi hiển thị | 24 unit FILL/domain/exporter/MULTI/TRUEFALSE PASS; Chrome A–H offline/editor PASS; `outputs/review-html-06c/results.json` trong thư mục chat. Không suy đoán tương đương số/đơn vị/dấu |
| H06B | DONE | MULTI chọn nhiều, ít nhất một khóa đúng, checkbox HTML, lời giải và quyền xem | 19 unit domain/MULTI/TRUEFALSE/mixed + 7 exporter PASS; Chrome A–G offline/editor PASS; `outputs/review-html-06b/results.json` trong thư mục chat. Chấm khớp tập hợp, không điểm từng phần |
| H06A | DONE | TRUEFALSE một/nhiều nhận định, biên tập/lưu/xuất, điểm tỷ lệ và quyền lời giải | 17 unit domain/mixed/TRUEFALSE PASS; Chrome A–F offline/editor PASS; `outputs/review-html-06a/results.json` trong thư mục chat. Không đổi các dạng cũ hoặc âm thanh |
| H05E.1-code | DONE (cài đặt và mô phỏng) | Nhạc nền giáo viên chọn nguồn/quyền dùng, mặc định tắt/10%; học sinh bật/tắt/volume, dừng khi nộp/nghe nhận xét | 15 unit PASS; Chrome editor lưu/xuất, thiếu nguồn và đề cũ 10/10 PASS. `outputs/review-html-05e1/results.json` trong thư mục chat |
| H05E.1-audio | BLOCKED | Nghe nhạc thật online/offline | Chưa có tệp hoặc URL nhạc có quyền sử dụng được cung cấp; không tự tạo/tải nhạc. A–D điều khiển chỉ kiểm mô phỏng |
| H05D.2-code | DONE (cấu trúc và mô phỏng) | Catalog 8 nhóm dự thảo; audio online → offline đóng gói → giọng Việt cục bộ → chữ | 18 unit PASS; Chrome offline fallback/chấm/nhận xét PASS; `outputs/review-html-05d2/results.json` trong thư mục chat. Không URL/tệp âm thanh thật |
| H05D.2-assets | BLOCKED | Xác nhận lời đọc và cung cấp âm thanh giáo viên thật cho nhóm cần dùng | Catalog teacherConfirmed=false, nguồn null; chưa nghiệm thu nghe online/offline thật. Không tự tạo MP3/URL |
| H05D.1-code | DONE | Nhận xét chung ngắn, pending/ẩn kết quả phù hợp, dùng Web Speech sẵn có | 13 unit PASS; Chrome offline A–G PASS (TTS mô phỏng), hồi quy 05B.2/05C PASS. Bằng chứng `outputs/review-html-05d1/` trong thư mục chat |
| H05D.1-audio | BLOCKED | Kiểm nghe tiếng Việt thực trên thiết bị | Native Chrome chỉ có 3 giọng en-US cục bộ, không có giọng Việt; fallback chữ PASS, không kiểm nghe thật |
| H05C | DONE | Nút Vì sao em sai? mở/thu gọn lời giải giáo viên cho câu đã chấm sai | Chrome offline A–E + editor sửa/lưu/xuất PASS; 13 unit hồi quy PASS. `outputs/review-html-05c/results.json` trong thư mục chat. Chỉ hiện khi được xem cả đáp án và điểm; không xuất rubric OPEN/manual SHORT |
| H05B.2 | DONE (giao diện offline) | Hai cài đặt xem điểm/đáp án độc lập; mặc định đề mới immediate/after-attempts; giữ đề cũ | Chrome A–H PASS, 8 unit hồi quy PASS; `outputs/review-html-05b2/results.json` trong thư mục chat. Công bố từ xa BLOCKED, không có backend; không tự mở khi chờ |
| H05B.1 | DONE | Giới hạn lượt HTML luyện tập: 1/2/3/không giới hạn; đề mới mặc định 3, đề cũ giữ nguyên | 8 unit PASS; Chrome offline A–E PASS, editor lưu/xuất/default 3 và lỗi lưu không trừ lượt PASS; `outputs/review-html-05b1/results.json` trong thư mục chat. Chỉ dữ liệu trình duyệt/thiết bị; không ngăn xóa dữ liệu/đổi thiết bị |
| H05A.1 | DONE (mã và Chrome mô phỏng) | Giáo viên chọn vở ô li đặt tính, vở ô li viết tự luận hoặc ô văn bản; học sinh nhập theo ô, kẻ ngang/dọc, tẩy, hoàn tác, lưu và nộp | 16 unit PASS; 18 mục được kiểm bằng Chrome offline 390/1366px, editor thật và trắc nghiệm cũ PASS. Ảnh/HTML/JSON/log ở `outputs/review-html-05a1/` trong thư mục chat. Cảm ứng trên thiết bị vật lý chưa kiểm; video tùy chọn thiếu ffmpeg của công cụ test |
| H05A | DONE | Đề HTML hỗn hợp SINGLE/ABCD, SHORT, OPEN; biên tập, lưu bài, trạng thái chấm | 27 unit PASS; Chrome offline file thật 390/1366px và editor→tải HTML PASS; nháp/tải lại/khóa sau nộp/JSON PASS. Bằng chứng `outputs/review-html-05a/` trong thư mục chat. Chưa có chấm tay từ JSON hoặc đồng bộ máy chủ |
| H05B | TODO | Tiếp nhận bản sao bài làm và chấm thủ công có kiểm tra danh tính/phiên bản | Dùng `attemptId`, `submissionId`, `documentId`, `documentVersion`, câu hỏi/đáp án/kết quả trong JSON 05A; cần thiết kế nơi tiếp nhận, kiểm toàn vẹn và quyền giáo viên trước khi tính điểm tổng |
| H04C-code | DONE | Nhận xét theo kết quả và điều khiển Web Speech | 21 unit PASS; browser text/score offline và TTS mô phỏng PASS; không có nghĩa đã phát âm thanh Việt thật |
| H04C-audio | BLOCKED | Kiểm nghe tiếng Việt trên thiết bị thật | Chrome native có API nhưng voices=[]; chưa có giọng Việt local/kiểm loa, không dùng mock để báo PASS |
| H01 | DONE | Lệnh 01: dữ liệu Toán 4 → HTML độc lập → làm bài → chấm điểm offline | 5 unit HTML + 8 domain PASS; Chrome file URL offline desktop/mobile PASS; HTML và log tại outputs/review-html của thư mục chat hiện tại, xem PROJECT_CONTEXT.md. Không nghiệm thu toàn V1.0 |
| H02 | DONE | Lệnh 02: nối nút Xuất HTML tương tác vào trình biên tập | 15 unit PASS; A–H browser PASS, exit 0. Đọc nội dung chưa lưu, không ghi đề gốc, dùng một exporter chung Node/browser; xem nhật ký H02 |
| H03 | DONE | Lệnh 03: xuất từ PWA cache khi mất mạng | Chrome Service Worker thật, HTTP cache tắt, mạng trình duyệt tắt + server dừng; A–J và CACHE-SAFETY PASS sau 1 sửa sw.js. 19 unit PASS; không nghiệm thu mọi game/thiết bị |
| H04 | DONE | Lệnh 04: Mẫu A cũ, chỉ nghiệm thu kỹ thuật | Người dùng KHÔNG CHẤP NHẬN thẩm mỹ; được thay thế ở H04B. Các bằng chứng chức năng cũ giữ làm lịch sử, không coi là chấp thuận thiết kế |
| H04B | DONE | Lệnh 04B: theme pastel theo PDF thật | Đã xem đúng 5 trang PDF, triển khai SVG gốc nhúng + khung/nhãn nhiều màu. Editor A–H, design 390/1366px và 19 unit PASS; ảnh tải từ editor đã xem. Hoàn thành triển khai/kiểm chứng, chưa suy ra người dùng chấp thuận thẩm mỹ |
| A01 | DONE | Xác định repository, kiến trúc và các game hiện có | Khảo sát đã lưu trong plans; HEAD xác nhận lại 19/10 |
| A02 | DONE | Tạo quy tắc tiết kiệm và bảo vệ mã nguồn | `../AGENTS.md` tồn tại, đã đọc đầu phiên |
| A03 | DONE | Khôi phục hồ sơ tiếp tục qua hai tệp docs | Hai tệp được tạo, kiểm tra nội dung/đường dẫn và đối chiếu hash mã nguồn trong phiên 19/10; kết quả xác minh ghi dưới đây |
| A04 | DONE | Khảo sát giải pháp xác thực/quyền phía server | Đã đối chiếu đúng các tệp server, hồ sơ, lưu trữ và cấu hình; đề xuất dưới đây, chưa triển khai hoặc xác nhận deployment live |
| S01 | DONE | Tạo mã nền tảng Supabase dev, migration và unit test | 3 API, 4 module server, 1 migration CLI, 21 unit PASS; không có nghĩa đã apply SQL hoặc tích hợp thật |
| S02 | BLOCKED | Kiểm migration, Supabase Auth/RLS và quyền trên dự án thử thật | 1 integration suite SKIP vì chưa có cấu hình/tài khoản/fixture; SQL và advisors chưa chạy |
| I01 | IN_PROGRESS | Lát cắt lớp 4 cục bộ | Mã domain/import/storage/LMS/UI và test đã có; chưa nghiệm thu toàn luồng |
| I02 | BLOCKED | Kiểm chứng vòng biên tập → duyệt → xuất bản có phân quyền | E vẫn FAIL ở domain; audit E: 4 PASS, 3 FAIL, 1 BLOCKED. Chưa có backend xác thực/quyền; UI đã khóa tự duyệt/xuất bản. Chưa nghiệm thu |
| I02a | DONE | Sửa lưu loại học liệu và giữ nguyên bản đã xuất bản | Test browser trước/sau: metadata.purpose đúng, bản published không đổi; nháp mới có revisionOf/version tăng; lưu và duyệt trực tiếp đều được kiểm chứng |
| I02b | DONE | Khóa tạm luồng tự duyệt/xuất bản khi chưa có backend | Browser audit E: disabled và gọi handler với profile tự khai đều không ghi DB; không phải sửa phân quyền domain/server |
| E01 | BLOCKED | Sửa thực sự lỗi phân quyền E | Đã có API server/RLS đề xuất với unit PASS; chưa kiểm Supabase thật hoặc ghép frontend. Domain cũ vẫn không phải thẩm quyền; không dùng unit mock để báo E end-to-end PASS |
| I03 | IN_PROGRESS | Kiểm tra bảo toàn kho câu hỏi cũ | Lượt trước thất bại do so sánh thứ tự; harness đã sửa, chưa chạy lại |
| T01 | TODO | Kiểm chứng làm bài, hai kiểu xem và tiếp tục bài đã lưu | Chỉ thực hiện sau I02; không suy từ test domain rằng UI đã đạt |
| T02 | TODO | Kiểm chứng chấm tự luận và xuất kết quả trên UI | Có test logic lịch sử; phần UI chưa có bằng chứng đầu-cuối |
| T03 | TODO | Kiểm chứng một cầu nối game với bộ câu được chọn | Tái sử dụng luật hiện có; không kiểm thử mọi game trong cùng phiên |
| T04 | TODO | Sửa nền tương phản của phân hệ review | Yêu cầu đã xác định qua ảnh; tác vụ bị gián đoạn, không coi đã sửa |
| T05 | TODO | OCR scan/ảnh và duyệt trang nhập | Hiện chỉ lưu nguồn và báo cần OCR; chưa có engine hoạt động |
| T06 | TODO | Nghiệm thu launcher thử cục bộ | Đã có script; kiểm thử loopback từng bị sandbox chặn |
| B01 | BLOCKED | Auth, sync server và kết nối QLMS thật | Thiếu API/sandbox/quyền thử; chỉ có URL đăng nhập và hợp đồng local |
| T07 | TODO | Giao bài, thống kê và mở rộng nội dung nhiều lớp/môn | Chia nhỏ sau lát cắt lớp 4; không nằm trong phiên hiện tại |

Không gộp trạng thái “đã có mã” với DONE. Kết quả 29 test logic phiên 18/10 là bằng chứng lịch sử, chưa xác nhận mọi chỉnh sửa UI sau đó.

## Nhiệm vụ hoàn thành trong phiên 19/10

**A03 — Tạo hồ sơ quản lý dự án từ công việc đã lưu.**

- Phạm vi: chỉ `docs/PROJECT_CONTEXT.md` và `docs/IMPLEMENTATION_PLAN.md`.
- Đầu vào: AGENTS, Git status, hai kế hoạch cũ, JSON kết quả browser và phần thay đổi CSS liên quan tác vụ gián đoạn. Không khảo sát lại toàn repository.
- Kiểm chứng: đọc lại hai tài liệu, xác nhận bốn trạng thái và đường dẫn tham chiếu; đối chiếu SHA-256 các tệp mã nguồn/test/cấu hình đang làm trước và sau thao tác.
- Không sửa app, không chạy lại bộ test, không commit/push/deploy hoặc truy cập database thật.

## Phiên kiểm chứng luồng xuất bản — 19/10/2026

Chỉ thay đổi `HOC-MA-VUI-BAN-CHINH/app/review-ui.js`, thêm `HOC-MA-VUI-BAN-CHINH/kiem-thu/review-publication.cjs` và cập nhật hai docs. Không sửa domain, game, cấu hình, schema database; không commit/push/deploy.

| Tình huống | Kết quả thực thi | Bằng chứng |
|---|---|---|
| A. Tạo/lưu DRAFT đúng loại học liệu | PASS sau sửa | Biểu mẫu tạo mới và đọc IndexedDB đúng tiêu đề, lớp, môn, loại |
| B. Giáo viên gửi duyệt | BLOCKED | Đọc mã/UI: không có thao tác gửi hoặc trạng thái chờ duyệt |
| C. Người có quyền phê duyệt | BLOCKED | Không có session/nguồn quyền được xác thực |
| D. Xuất bản sau phê duyệt đúng quyền | BLOCKED | Chỉ tự duyệt cục bộ thực thi PASS; chưa chứng minh C |
| E. Người không có quyền không thể duyệt | FAIL | Gọi domain với reviewer giả, role student vẫn chuyển thành reviewed |
| F. Chưa duyệt không xuất bản | PASS | UI từ chối, DB vẫn draft; test domain hiện có 1/1 PASS; bản sửa cũng bị chặn |
| G. Chỉnh không ghi đè published | PASS sau sửa | So sánh toàn bản gốc giữ nguyên; có nháp ID mới/revisionOf/version; duyệt trực tiếp cũng không ghi đè |
| Từ chối học liệu | BLOCKED | Đọc mã: chưa có thao tác hoặc trạng thái từ chối |

Bằng chứng trước/sau: xem hai JSON ở `../../evidence-publication-before/` và `../../evidence-publication-after/` tính từ docs. Sau sửa chỉ chạy lại đúng ca browser này; kết quả vẫn exit 1 vì E FAIL, không đánh dấu I02 DONE. Các kiểm tra A/F/G được sửa và kiểm chứng sau một vòng sửa; không có hai vòng sửa thất bại cùng lỗi.

## Điểm tiếp tục sau nhiệm vụ hiện tại

I02 cần cơ chế xác thực và cấp quyền duyệt đáng tin cậy trước khi hoàn thiện B/C/D/E và từ chối. Chưa có đầu vào này; không dùng nhãn role trên client để giả lập phân quyền thật. Nhiệm vụ nhỏ tiếp theo cần chốt nguồn xác thực/quyền duyệt và phạm vi backend thử, rồi mới triển khai theo phạm vi được giao. Không tự chuyển sang T01, game hoặc tính năng khác.

## Phiên riêng lỗi E — 19/10/2026

Chỉ sửa review-ui.js và review-publication.cjs, cập nhật hai docs. Không cài thư viện, không đổi domain/server/game/database/config, không deploy.

| Kiểm tra | Kết quả | Loại bằng chứng |
|---|---|---|
| Người có quyền duyệt hợp lệ | BLOCKED | Đọc cấu hình/server và hồ sơ; không có nguồn xác thực để thực thi ca hợp lệ |
| Người không có quyền bị từ chối | FAIL | Thực thi transitionDocument với reviewer giả, role student vẫn nhận reviewed |
| Người chưa đăng nhập bị từ chối | FAIL | Thực thi transitionDocument không có session, chỉ có reviewer, vẫn nhận reviewed |
| Vai trò/userId tự khai không được chấp nhận | FAIL | Thực thi domain với role admin/userId/verified tự khai vẫn được chấp nhận |
| Nháp chưa duyệt không xuất bản | PASS | Thực thi domain chặn chuyển trạng thái; không suy ra quyền đã an toàn |
| Bản đã xuất bản giữ nguyên | PASS | Browser lưu bản sửa từ fixture published: nguyên bản giữ nguyên, nháp mới/version tăng |
| Khóa UI và handler duyệt/xuất bản | PASS | Browser kiểm disabled; gọi handler khi localStorage tự khai admin không đổi tài liệu |

Script audit có thêm kiểm tra runtime PASS; tổng 4 PASS/3 FAIL/1 BLOCKED, exit 1. Bằng chứng: `../../evidence-approval-auth/publication-results.json`. Đây không phải kết quả xanh hoặc nghiệm thu lỗi E. HMV_AUTH_AUDIT_ONLY=1 chỉ chạy nhánh audit; không chạy lại toàn bộ game/import/đồng bộ. Các tệp đã sửa đã được kiểm tra cú pháp.

Chưa sửa E vì không có đủ cơ sở kỹ thuật cho kiểm tra quyền thật. Cần backend thử xác minh phiên và quản lý quyền server trước khi tiếp tục E01; không bật lại nút chỉ dựa vào role/userId client. Dừng sau nhiệm vụ này.

## Nhật ký xác minh

### H04C — 19/10/2026

Chỉ sửa app/review-html.js, thêm kiem-thu/review-feedback.test.cjs và review-feedback-browser.cjs dưới HOC-MA-VUI-BAN-CHINH, cập nhật hai docs. Không sửa scoring domain/editor/SW/game/backend/DB/quyền; hash bảo toàn đã kiểm. Không commit/push/deploy. Nhận xét và nút Nghe/Dừng/Nghe lại dựa engine hiện có, chỉ giọng Việt local, không remote/English/auto-play. Chủ đề có sẵn và lời giải có cờ xác nhận tường minh từng câu được dùng; thiếu lời giải không suy nguyên nhân sai. Ghi nhận hợp đồng flag trong PROJECT_CONTEXT.md, không thêm UI xác nhận hoặc tự xác nhận lời giải.

Thực thi 21 unit PASS, exit 0. Browser test file offline exit 0: A/B/C/D text phản ánh 10/8/0/2 điểm, không tự đọc; F/G/H/I PASS ở chế độ mô phỏng TTS (lang/rate/voice, stop/replay không chồng, end/error, voiceschanged, pagehide, thiếu local VI/remote EN bị loại); J/K/L offline/scoring/no app HTTP đạt, thêm API không hỗ trợ vẫn giữ chữ. E không bịa khi thiếu metadata và confirmed explanation kiểm bằng unit. Lượt test đầu thiếu metadata topic vướng validator sẵn có; sửa harness nhận graded snapshot không có metadata để kiểm riêng feedback, không sửa validator. Ảnh kết quả ở 390/1366px đã xem.

Native API được kiểm riêng, không mock: speechSynthesis có, getVoices() trả []; không voice Việt được kiểm nghe thật. H04C-audio BLOCKED; H04C-code DONE, chưa nghiệm thu âm thanh. Cần thiết bị có giọng Việt cục bộ và thử nghe offline thực; không tự cài hệ thống/giọng ngoài. Bằng chứng ở outputs/review-html-04c/ trong thư mục chat hiện tại: HTML mẫu, tests.log, browser.log, browser-results.json, native-voices.json, ảnh kết quả và REPORT.md. Không API/TTS ngoài hoặc key. localService dựa báo cáo browser; chưa audit driver/OS network, không tuyên bố âm thanh luôn chạy offline. Dừng sau 04C.

### Thay SVG học sinh bằng minh họa đã duyệt — 19/10/2026

DONE: người dùng đã duyệt ảnh tạo mới theo kiểu PDF bằng “ok”. app/review-html.js dùng ảnh WebP 640×320 alpha (55254 bytes) nhúng base64, CSP img-src data:, thay SVG học sinh cũ; tài nguyên gốc dự án tại app/assets/review/children-reading-approved.webp. CSS 230px desktop/185px mobile, không che tiêu đề. Không sửa SW/model/runtime/chấm/đáp án, không mạng khi làm bài. 7 unit PASS; editor A–H PASS; design browser 390/1366px PASS, ảnh decoded thật, chấm 10/10, ảnh đã xem. Kiểm XSS trong review-html-browser.cjs/review-html-editor.cjs được điều chỉnh để cho phép img trang trí tin cậy, vẫn chặn payload src=x và window.pwned; design test xác nhận ảnh load offline. Hai docs cập nhật. Mẫu tải từ editor, ảnh và log ở C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-approved/. Không commit/push/deploy, không mở xuất bản. Dừng sau thay minh họa này.

### Bổ sung sau H04B — 19/10/2026

DONE: theo yêu cầu thêm hình bé trai–bé gái trên tiêu đề. Chỉ sửa app/review-html.js (SVG tự vẽ hai học sinh cầm sách và vị trí responsive 190/150px), cập nhật hai docs. Cùng renderer cũ, không đổi engine/đáp án/nghiệp vụ/SW. 7 unit exporter PASS; review-html-design.cjs Chrome file offline 390×900/1366×900 PASS, chấm 10/10, không tràn/HTTP/JS error; ảnh header thực tế đã xem. Bằng chứng C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-children/: toan-4-phieu-luyen-tap-v1.html, 390-questions.png, 1366-questions.png, design-results.json, tests.log. Không chạy lại toàn app/game; không commit/push/deploy. Dừng sau bổ sung nhỏ này.

### H04B — 19/10/2026: thiết kế lại theo PDF thật

Tham chiếu đúng tệp D:/06_Nam_hoc/2026 - 2027/KHBD-SGK-SGV-TAI LIEU KHAC/LH- Đề thi GK1 lớp 4 mới.pdf (637723 bytes, 5 trang). Đã render/xem cả 5 trang: trang 1 viền xanh/vàng, nhãn nhiều màu, bút/mặt trời/sách/hoa; trang 2 khung bài màu dịu; trang 3–4 viền và hoa lá góc/chân; trang 5 quảng bá/QR, không dùng. Mỗi trang là raster phẳng (1–4 chỉ khoảng 501–562px rộng), không có tài nguyên rời sạch hoặc chứng cứ quyền dùng nhân vật. Không crop/tái sử dụng hình phức tạp, không lấy trang làm nền.

Sửa app/review-html.js dưới HOC-MA-VUI-BAN-CHINH: viền kép xanh/vàng, header gọn nền nhẹ với khung hồng, tiêu đề hồng đậm, nhãn/viền câu luân phiên xanh trời/hồng/xanh lá/vàng, 2 cụm SVG gốc có mảng tô: school (sách/bút/mặt trời/sao) và garden (hoa/lá/sách mở) ở đầu/chân. Dải chân chỉ 55px desktop/39px mobile. Không emoji, không quảng bá/QR/CDN/ảnh nguyên PDF, không nhân vật sao chép. SVG nhúng trực tiếp nên không sửa Service Worker. Tài nguyên gốc xuất riêng để xem trong ASSETS.md/school-scene.svg/footer-garden.svg ở thư mục bằng chứng; Recraft không có trong tool roster nên dựng SVG trực tiếp theo lựa chọn người dùng cho phép.

Test helper kiem-thu/review-html-design.cjs thêm tùy chọn nhận file tải thật từ editor. Không sửa nghiệp vụ exporter hoặc runtime: đã đối chiếu byte nguồn toàn hàm runtime và createPractice nguyên, hash domain/UI/SW nguyên. 19 unit PASS; editor thật A–H PASS (gồm đổi câu/key, thiếu key/OPEN, file offline 10/10, kho gốc không đổi và published fixture nguyên). Design test dùng chính file tải thật, Chrome file URL offline ở 390×900/1366×900 PASS; ảnh đầu trang, trọn câu và kết quả đã xem, chữ dài không tràn, bàn phím/focus, progress và chấm giữ nguyên. Không có HTTP/pageerror trong file HTML. Không chạy lại toàn bộ game hoặc PWA full suite vì SW/runtime/domain/UI không đổi; không suy rộng thành test mọi game.

Dung lượng HTML Toán 4 trước 24084 bytes, mới 28948 bytes (+4864), 2 SVG, không font/tài nguyên ngoài. Chỉ sửa renderer, test helper và 2 docs. Không commit/push/deploy/DB/quyền hoặc mở xuất bản. Bằng chứng C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-04b/: toan-4-pastel-theo-pdf.html là bản tải từ editor; ảnh 390/1366 questions/question-detail/result; design-results.json, editor-export/editor-results.json, tests.log, preservation-and-size.json, reference/page-1..5.png, comparison.html, ASSETS.md và REPORT.md.

Khác PDF chủ đích: không mô phỏng trang A4 hay chỗ điền họ tên/lời phê/đường viết tự luận, không dùng cô giáo/nhân vật bản gốc hoặc dải hoa dày; chỉ giữ mô típ và bảng màu, dùng tương tác responsive. Nội dung mẫu vẫn 5 câu cũ, không chép đề trong PDF. Chưa ảnh câu hỏi/ngữ liệu liên kết, thiết bị vật lý hoặc xác nhận thẩm mỹ cuối từ người dùng. H04B DONE cho triển khai và kiểm chứng trực quan, không tuyên bố đã được người dùng chấp thuận. Dừng sau H04B; S02/E01/I02 vẫn BLOCKED.

### H04 — 19/10/2026: Mẫu A – Phiếu học tập sinh động

Chỉ sửa app/review-html.js dưới HOC-MA-VUI-BAN-CHINH: CSS tokens, markup và listener tiến độ trình bày. Thêm kiem-thu/review-html-design.cjs; cập nhật hai docs. Giữ một renderer Node/browser. Nền kem/giấy trắng, xanh ngọc, điểm nhấn cam pastel; minh họa quyển vở nhỏ bằng CSS (ẩn trên điện thoại), không emoji/animation/CDN. Option hai cột ở desktop, một cột ở mobile; focus, hướng dẫn, tiến độ và kết quả rõ. Tokens font 22/20/18px cho nhóm lớp 1–2/3/4–5, khoảng cách tương ứng. Có data-theme=worksheet và CSS variables để mở rộng Mẫu B sau; chưa tạo Mẫu B.

Bằng chứng: 19 unit PASS, exit 0. Chrome file URL offline ở 390×900 và 1366×900 PASS: text/options giữ nguyên, chọn bằng phím mũi tên + focus, tiến độ 0→1→5, hủy/xác nhận nộp không đổi, 10/10, nội dung rất dài không tràn, age tokens đúng, không network/pageerror. OS dark vẫn dùng palette light chủ đích; giảm chuyển động qua media query, không hiệu ứng động. Ảnh câu hỏi và kết quả cả hai viewport đã xem trực tiếp. Contrast các cặp text chính >=5.61:1 (không phải audit WCAG toàn diện). Test mới từng vướng giả định khoảng trắng cuối văn bản; sửa expected.trim vì normalizeDocument có trim từ trước, không đổi dữ liệu/nghiệp vụ.

Đối chiếu source trước/sau: createPractice và nguyên listener submit không đổi; hash sw.js/domain/UI không đổi. Không sửa engine/đáp án/chính sách nộp. Chạy lại PWA thật trên loopback: A–J và CACHE-SAFETY PASS, mạng context tắt/server dừng, 10/10, nháp nguyên. Không chạy mọi game; chỉ xác nhận không sửa mã game/PWA và hồi quy luồng liên quan đạt. Không push/commit/deploy.

HTML và bằng chứng: C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-v1/ gồm toan-4-phieu-luyen-tap-v1.html, 390-questions.png, 1366-questions.png, 390-result.png, 1366-result.png, design-results.json, tests.log, preservation-and-contrast.json và pwa-regression/results.json. REPORT.md tóm tắt. Chưa thử thiết bị vật lý/screen reader. Hai PDF không được mở lại trực tiếp ở phiên này; dùng định hướng bố cục phiếu và trang trí tiết chế đã chốt, không tuyên bố đối chiếu ảnh PDF mới.

Giới hạn: chỉ câu SINGLE/ABCD văn bản độc lập như trước; có CSS giới hạn kích thước ảnh để không tràn khi mở rộng nhưng chưa có đầu vào/render ảnh câu hỏi hoặc ngữ liệu liên kết. Không tuyên bố đã hỗ trợ ảnh thực tế. Chưa cấu hình đồng hồ hoặc chính sách đáp án mới; giữ feedback sau nộp theo luyện tập hiện tại. Không thêm nghiệp vụ ảnh/timer trong phiên giao diện này. Mẫu B, ảnh và thời gian cần nhiệm vụ riêng khi được giao. S02/E01/I02 vẫn BLOCKED, UI xuất bản khóa. Dừng sau H04.

### H03 — 19/10/2026: PWA offline thực thi

Nhánh feature/review-assessment, repository cũ work/hoc-ma-vui; giữ thay đổi chưa commit. Chỉ sửa HOC-MA-VUI-BAN-CHINH/app/sw.js và hai docs; thêm kiem-thu/review-html-offline.cjs, kiem-thu/review-offline-cache.test.cjs cùng thư mục ứng dụng. Không sửa bộ xuất/editor/domain/game/quyền/DB; không commit/push/deploy.

Lượt trước sửa: A–J PASS nhưng CACHE-SAFETY FAIL, tổng exit 1. Nguyên nhân xác định từ thực thi: runtime cache lưu mọi GET thành công/opaque trừ /api/, nên /auth/v1/user, JSON đề riêng và URL chứa thông tin xác thực giả lập có thể vào CacheStorage. Chỉ dùng response marker tổng hợp trên server thử, không token/dữ liệu thật. Bằng chứng trước sửa: outputs/review-html-offline-before/results.json trong thư mục chat hiện tại.

Sửa lần 1 tại sw.js: cache version mới hmv-review-20261019-offline-safe; chỉ cache GET cùng origin thuộc APP_SHELL đã khai báo, không query, không header Authorization/apikey. Runtime không ghi phản hồi no-store/private, redirect hoặc lỗi. Không cache API/CDN/JSON đề; không xóa cache cũ vì có thể chứa công việc người dùng. Việc giữ cache cũ không phải chứng minh các cache lịch sử sạch; phiên này chỉ profile thử mới, không truy cập profile thật. Tài nguyên ngoài APP_SHELL không còn được tự cache; muốn offline phải khai báo tài nguyên công khai phù hợp sau, không thêm dữ liệu đề vào shell.

Lượt sau sửa exit 0: Service Worker bật thật (không route.fulfill), profile mới/origin loopback mới; kiểm reg.active=activated và CacheStorage đủ index, domain, html-exporter, storage, UI, CSS; HTTP cache tắt qua CDP. Ngắt mạng context (navigator.onLine=false), dừng server loopback, reload. Ghi response.fromServiceWorker cho HTML và JS cần thiết. Mở đề mẫu Toán 4 đã nằm IndexedDB, sửa text/option/key chưa lưu trong editor thật, bấm xuất/tải. File được mở trong context offline riêng, trả lời 5 câu, chấm 10/10 theo key sửa. Reload thêm lần nữa xác nhận IndexedDB gốc không đổi; không mất bản đã lưu, không tự lưu chỉnh sửa chưa lưu. Nút duyệt/xuất bản tiếp tục disabled. Không API bắt buộc/CDN cho luồng xuất. App có thử gọi AI status cũ nhưng endpoint không có ở server thử, không ảnh hưởng xuất; không cache phản hồi đó.

Kết quả: A–J PASS + CACHE-SAFETY PASS, không pageerror. 19 unit PASS (4 cache mới + 7 exporter + 8 domain), exit 0. Unit bổ sung kiểm API/auth/data/cross-origin/query, header Auth/apikey, asset shell hợp lệ, no-store/private/lỗi. Unit không thay thế lượt PWA thật. Chrome viewport 390×844, ảnh editor đã xem; chưa điện thoại vật lý/cửa sổ PWA cài OS/production hoặc toàn bộ game. Không ngắt Wi-Fi hệ điều hành; mạng môi trường test đã bị cắt ở browser và server đã dừng, không dùng dữ liệu giả để thay module/editor/cache thật.

Bằng chứng: C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-offline/ gồm results.json, cache-before.json, offline-responses.json, browser.log, tests.log, toan-4-xuat-tu-pwa-offline.html, editor-offline.png, result-offline.png, REPORT.md. Phân biệt rõ: CacheStorage chứa mã/tài nguyên shell; IndexedDB chứa nháp và đáp án luyện tập giả, không phải cache ứng dụng. Không có đề bảo mật thật trong thử nghiệm. Dừng sau H03; S02/E01/I02 vẫn BLOCKED.

### H02 — 19/10/2026: nút xuất trong trình biên tập thật

Repository/nhánh vẫn work/hoc-ma-vui / feature/review-assessment. Giữ thay đổi chưa commit trước phiên. Không commit/push/deploy hoặc ghi DB thật.

Tệp sửa: HOC-MA-VUI-BAN-CHINH/review-html.cjs (wrapper CLI dùng chung), app/review-ui.js (nút, đọc snapshot không mutate, MIME HTML), app/index.html (nạp module), app/sw.js (cache module và đổi version), kiem-thu/review-html.test.cjs. Tệp mới: app/review-html.js (chuyển nguyên bộ sinh HTML H01 sang UMD Node/browser), kiem-thu/review-html-editor.cjs. Hai docs được cập nhật; không sửa domain/game/server/schema.

Nút cạnh Lưu bản nháp trong editor, nhãn Xuất HTML tương tác và HTML luyện tập – tự chấm offline. Đọc input đang sửa gồm thay đổi chưa lưu; không gọi save/transitionDocument, không dùng fixture cố định. Bộ xuất dùng normalize/validate/submitAttempt hiện có, chỉ SINGLE/ABCD văn bản độc lập; báo số câu thiếu khóa hoặc loại chưa hỗ trợ; ngữ liệu liên kết bị từ chối. File HTML chỉ lấy các trường nội dung cần thiết, không xuất source hoặc metadata ngoài danh sách cho phép. Tên tải được làm sạch, MIME text/html;charset=utf-8. Trình duyệt đọc mã domain tĩnh cùng ứng dụng để nhúng tự chứa; tệp đầu ra không gọi API/mạng.

Bằng chứng unit: node --test kiem-thu/review-html.test.cjs kiem-thu/review-domain.test.cjs (đường dẫn tương đối HOC-MA-VUI-BAN-CHINH), 15/15 PASS (7 exporter + 8 domain), exit 0. Có test parity Node/browser, filename, bỏ metadata ngoài phạm vi, XSS và test domain cũ. Đã quan sát red thông báo chưa chỉ số câu trước sửa.

Bằng chứng browser: Chrome headless mở toàn app thật trên origin loopback mới, IndexedDB giả và profile mới, chặn mạng ngoài, service worker bị tắt để cô lập dữ liệu. A–H đều PASS: A mẫu 5 câu 10/10; B sửa text/options/title chưa lưu phản ánh trong file, XSS không chạy; C đổi key: đáp án cũ 8/10, đáp án mới 10/10; D thiếu đáp án Câu 1 không tải; E Câu 3 OPEN bị từ chối, không tải/chuyển loại; F file tải thật mở file URL; G context offline, mobile viewport 390×844 làm/chấm được; H không ghi đề khi export, lưu/mở lại nháp/version hoạt động, tải bằng nút mobile, published fixture vẫn nguyên và lưu tạo draft revision mới. Không dùng published fixture làm chứng cứ xác thực quyền.

Lượt đầu bị sandbox chặn loopback; chạy lại được cấp quyền. Hai lỗi harness đã xác định/sửa: VM thiếu structuredClone; giả định version chỉ tăng một lần và options còn nguyên sau đổi OPEN. App hiện có tăng version khi collect/đổi loại và xóa options khi đổi OPEN; không sửa hành vi đó ngoài phạm vi. Lượt cuối exit 0, không pageerror; không chạy toàn bộ game/regression.

Bằng chứng tại C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-editor/: editor-results.json, browser.log, tests.log, editor-mobile.png, các HTML tải thật. Chi tiết và danh sách file trong REPORT.md. Chưa thử điện thoại vật lý hoặc export khi toàn app offline/PWA; chỉ file tải về offline đã kiểm. UI duyệt/xuất bản vẫn khóa, S02/E01/I02 BLOCKED. Dừng sau H02.

### H01 — 19/10/2026: HTML luyện tập độc lập

Theo Lệnh 01, ưu tiên lát cắt HTML dù I02/E01 còn BLOCKED; không tiếp tục sửa E hoặc backend. Đặc tả V1.0 dài hạn đã chốt trong PROJECT_CONTEXT.md, chưa thực hiện toàn bộ. Giữ công việc cũ chưa commit.

Tệp mới trong HOC-MA-VUI-BAN-CHINH: review-html.cjs; kiem-thu/fixtures/review-math4.json; kiem-thu/review-html.test.cjs; kiem-thu/review-html-browser.cjs. Chỉ sửa thêm hai docs quản lý hiện có. Không sửa file app/game/server/production.

Đã quan sát test đỏ vì exporter ban đầu trả chuỗi rỗng (assert HTML), sau triển khai test xanh. Lệnh thực thi: `node --test HOC-MA-VUI-BAN-CHINH/kiem-thu/review-html.test.cjs HOC-MA-VUI-BAN-CHINH/kiem-thu/review-domain.test.cjs`: **13 PASS/0 FAIL**, exit 0. Các ca đúng/sai/trống, tổng điểm/nộp lặp, escape chèn script, từ chối dữ liệu không hỗ trợ đều đạt. Tái sử dụng bộ chấm cũ, không AI.

Đã xuất file HTML thật bằng CLI; Chrome headless mở file URL, context offline, profile mới. Desktop 1280×900 và mobile viewport 390×844 đều PASS: 5 câu trả lời, 10/10, ca sai/trống 2/10, xác nhận và hủy nộp, nộp lặp, XSS inert, không tràn ngang, không HTTP/JS errors. Ảnh đã lưu, ảnh mobile đã xem. Không phải thử trên điện thoại vật lý, không kiểm toàn bộ trò chơi/app.

Bằng chứng lưu ngoài repo tại `C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html/`: toan-lop-4-luyen-tap.html, browser-results.json, tests.log, desktop.png, mobile.png. Chưa có nút tải trên app; dùng CLI. Câu có ngữ liệu liên kết/dạng khác bị từ chối rõ. Không có lưu điểm/LMS/ZIP/thời gian/lượt thi; không tuyên bố đã triển khai các mục này. H01 DONE theo phạm vi mẫu offline; S02/E01/I02 vẫn BLOCKED và UI chính thức khóa. Dừng sau H01.

### Khảo sát giải pháp server — 19/10/2026

**Lịch sử, đã được thay thế bởi quyết định mới:** Supabase Auth + PostgreSQL, không tự xây Google OIDC; xem cập nhật nền tảng dưới đây. Giữ phần khảo sát này làm căn cứ, không triển khai theo phương án OIDC cũ.

Phạm vi chỉ đọc mã/cấu hình cần thiết; không chạy hệ thống, không đọc giá trị biến môi trường/tệp khóa, không cài thư viện, không mở UI, không sửa mã nguồn hay production. Kết luận khảo sát không phải bằng chứng phân quyền thực thi đã an toàn; E01 vẫn BLOCKED.

**Repository xác nhận:** `C:/Users/DELL/Documents/Codex/2026-10-18/referenced-chatgpt-conversation-this-is-an/work/hoc-ma-vui`; origin `https://github.com/khaicdv4-svg/giao-vien-chu-nhiem.git`, nhánh `feature/review-assessment`. App theo cấu hình phát hành nằm trong `HOC-MA-VUI-BAN-CHINH/app`. Đây là bản sao phát triển đã xác minh qua Git; chưa truy vấn deployment live để khẳng định bản trên web đang trùng mã local.

**Thành phần thực tế và khả năng tái sử dụng:**

| Thành phần | Kết quả đọc đúng tệp | Tái sử dụng |
|---|---|---|
| Backend local | `HOC-MA-VUI-BAN-CHINH/server.cjs`: Node.js http, static loopback; chuyển /api sang ai-server.cjs | Dùng kinh nghiệm/router/validate hiện có, không đổi server AI local thành hệ thống duyệt công khai |
| API AI local | `ai-server.cjs`: sameOrigin/host, giới hạn request, JSON; không có endpoint hoặc middleware duyệt học liệu xác thực người dùng | Các tiện ích request/response có thể tham khảo; sameOrigin và khóa AI không thay thế session/role |
| Hosting web | `vercel.json`: app tĩnh, không khai báo API duyệt/auth trong cấu hình đã kiểm tra | Giữ frontend Vercel; đề xuất thêm Node Functions ở nhiệm vụ được duyệt sau |
| Nhánh cấu hình Netlify cũ | `netlify.toml`, `netlify/functions/generate-questions.mjs`: chỉ tạo câu hỏi AI; AI_ACCESS_CODE là mã dùng chung, không phải đăng nhập hay danh sách quyền | Không dùng mã truy cập chung làm quyền duyệt; chưa xác minh cấu hình này có còn được deploy |
| Danh tính/vai trò | `app/index.html`: saveAccountProfile/setGoogleAccount nhận input/đối tượng client, ghi localStorage; không thấy xác minh token trong các đường này | Có thể giữ màn hình hồ sơ; không tái sử dụng userId/profile như bằng chứng danh tính hoặc quyền |
| Database | `app/review-storage.js`: IndexedDB hmv-review-v1; index.html dùng localStorage và IndexedDB cho dữ liệu cục bộ | Giữ nháp/offline/backup; không dùng DB trình duyệt làm nguồn quyền hoặc bản xuất bản chính thức |
| Domain | `app/review-domain.js`: kiểm tra nội dung/trạng thái/snapshot, reviewer chỉ là tên tự khai | Tái sử dụng validate/state logic phía server sau kiểm tra quyền; không gọi thẳng từ client làm quyết định chính thức |
| Cấu hình môi trường | Chỉ đọc tên tham chiếu trong mã: HMV_PREVIEW_PORT, HMV_AI_DIR, HMV_GEMINI_BASE, HMV_AI_LIMIT, GEMINI_API_KEY; Netlify thêm AI_ACCESS_CODE/GEMINI_MODEL | Đây là cấu hình AI/local, không thấy cấu hình OAuth/session/DB server trong phần đã kiểm tra; không đọc giá trị thực |

Không có package.json/firebase.json/firestore.rules tại gốc repo hoặc gốc HOC-MA-VUI-BAN-CHINH trong các vị trí đã kiểm tra. Không suy ra có thể dùng hệ thống Firebase của repository ThayKhaiEdu khác. Không quét toàn bộ thư mục hay kiểm tra tài khoản dịch vụ ngoài.

**Đề xuất tối thiểu, chưa cài đặt:** giữ nguyên frontend; bổ sung một backend Node.js cho phân hệ. Ưu tiên Node Functions trên Vercel nếu thầy xác nhận tiếp tục dùng hosting này; database PostgreSQL quản lý riêng do thầy phê duyệt. Không lưu DB/quyền/session chỉ trong bộ nhớ function hoặc tệp local. Chỉ đổi lựa chọn hosting/DB nếu nhà trường có backend phù hợp được cấp quyền.

1. Đăng nhập Google OIDC, server xác minh token bằng thư viện chính thức: chữ ký, issuer, audience, hạn dùng và nonce/state theo luồng chọn. Khóa người dùng theo sub đã xác minh, không theo userId/email tự khai. Google chỉ xác thực danh tính; quyền ứng dụng do server quản lý.
2. Tạo session server, cookie HttpOnly/Secure/SameSite, kiểm tra CSRF cho thao tác ghi và thu hồi phiên khi đăng xuất. Không coi dữ liệu từ localStorage hoặc payload role/verified là quyền.
3. DB tối thiểu chứa users/memberships (phạm vi trường và vai trò giáo viên/người duyệt), sessions, materials/material_versions và audit_events. Quyền ban đầu cấp ngoài luồng client bởi quản trị được ủy quyền; không có tự nâng quyền. Tác giả được gửi nháp của mình; người duyệt đúng phạm vi được approve/reject/publish; mặc định không tự duyệt bài do mình tạo.
4. Endpoint nội bộ dự kiến `POST /api/materials/:id/submit`, `/approve`, `/reject`, `/publish`; tên này là đề xuất của app, không phải API QLMS. Mọi request nạp bản ghi từ DB, xác minh session, quyền và trạng thái phía server: 401 thiếu/phiên sai, 403 thiếu quyền, 409 xung đột phiên bản. Reject có lý do; thay đổi trạng thái và audit trong transaction; publish tạo phiên bản bất biến. Không chấp nhận reviewer/role/userId từ client làm nguồn quyền.
5. Giữ IndexedDB cho nháp offline; offline không approve hoặc xuất bản chính thức. Trạng thái chính thức lấy từ backend. Chỉ mở UI sau khi test server có/không quyền, thiếu phiên, claims giả và bảo toàn phiên bản đạt trên sandbox; không dùng mock làm bằng chứng xác thực thật.

**Tệp dự kiến cho nhiệm vụ triển khai sau (tương đối với gốc repo):** bổ sung `api/auth/[action].js`, `api/materials/[id]/[action].js`, `lib/server/auth.js`, `lib/server/authorization.js`, `lib/server/material-repository.js`, migration DB thử và manifest dependency nếu phương án được duyệt. Sửa đúng `HOC-MA-VUI-BAN-CHINH/app/review-domain.js`, `review-ui.js`/`review-storage.js` cùng thư mục app khi ghép server; bổ sung test server và cập nhật `HOC-MA-VUI-BAN-CHINH/kiem-thu/review-publication.cjs`. Chỉ sửa vercel.json nếu routing runtime thực tế yêu cầu. Không cần thay game hoặc ai-server.cjs cho chức năng duyệt. Danh sách là phạm vi dự kiến, không phải mã đã tạo hoặc lệnh thực hiện phiên này.

**Điều kiện phải có trước triển khai:** xác nhận hosting/sandbox, dự án OAuth và callback/origin hợp lệ, DB thử, người chịu trách nhiệm cấp quyền và hai tài khoản thử có/không quyền. Cần thống nhất quy tắc tự duyệt/phạm vi trường và nơi lưu dữ liệu. Secret cấp qua cấu hình server an toàn, không gửi trong chat. Chưa xác định dịch vụ DB, chi phí hay tài khoản thực, chưa đăng ký/cài gì. Cấu hình Netlify cũ dễ gây nhầm đường deploy; không bật lại UI dựa trên hồ sơ local hoặc một phép so role ở client.

Nguồn chính thức đã đối chiếu cho phương án (không phải kiểm chứng triển khai): Google OIDC https://developers.google.com/identity/openid-connect/openid-connect ; Node.js Functions https://vercel.com/docs/functions/runtimes/node-js . Chỉ lập đề xuất, chưa triển khai; nhiệm vụ khảo sát A04 dừng tại đây.

### Nền tảng Supabase dev — 19/10/2026

Theo yêu cầu mới, thực hiện S01 trong repository/nhánh cũ, không deploy. Tệp mới: api/session.js, api/review-requests.js, api/review-decision.js; lib/server/{http,supabase,authorization,review-api}.cjs; supabase/migrations/20261018231518_hmv_review_auth_foundation.sql; kiem-thu/review-server.test.cjs và review-server.integration.test.cjs dưới HOC-MA-VUI-BAN-CHINH. Chỉ cập nhật hai docs, không sửa frontend/domain/game/config cũ.

Migration tạo quyền theo người dùng/trường, yêu cầu duyệt snapshot, RLS/grants, live-session check và audit/immutability. File do Supabase CLI 2.121.0 tạo, **chưa áp dụng** vào DB. API sử dụng Supabase Auth server và quyền từ PostgreSQL, không tin user_metadata/role/userId tự khai, không dùng service_role. Request body không có actor parameter; DB tự lấy auth.uid. Chặn production, mặc định khóa ghi, không có publish API; UI tiếp tục khóa.

| Phần kiểm chứng | Kết quả | Bằng chứng/giới hạn |
|---|---|---|
| Từ chối thiếu/malformed bearer, phiên lỗi/anonymous/revoked | UNIT PASS | Gateway response injection; chưa chứng minh Auth thật |
| Không quyền/sai trường/quyền revoked/tự khai role/userId/user_metadata | UNIT PASS | Không có mutation call; actor từ phản hồi Auth test được kiểm soát |
| Tự duyệt, stale/approved version, reject thiếu lý do | UNIT PASS | 403/409/400 theo ca; reviewer hợp lệ ở mức contract |
| Thiếu config/production/ghi chưa bật | UNIT PASS | Mặc định từ chối, không gọi dịch vụ ngoài ở ca bị chặn |
| Mã nguồn migration | CREATED, chưa nghiệm thu SQL | CLI tạo file; chưa có database runner/project được phê duyệt |
| Supabase Auth, RLS, grants, trigger/advisors thật | BLOCKED | Integration SKIP, không dùng mock làm bằng chứng tích hợp |
| Xuất bản chính thức/frontend wiring | Chưa triển khai | UI khóa, không thêm endpoint publish |

Tổng test: **21 PASS, 0 FAIL, 1 SKIP/BLOCKED**, exit 0; log `../../evidence-review-server/tests.log`. Không chạy lại các bộ game/import/browser cũ. S01 DONE chỉ cho mã nguồn và unit evidence; S02/E01/I02 vẫn BLOCKED.

Điều kiện tiếp theo: cấp dự án Supabase dev đã phê duyệt, SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY/HMV_SUPABASE_DEV_PROJECT_REF, mode development; quản trị apply migration và seed quyền cho tài khoản Auth thử thật, chuẩn bị pending request dùng một lần. Sau đó bật ghi chỉ trên sandbox và chạy HMV_RUN_SUPABASE_INTEGRATION=1 với token thử được cấp qua môi trường an toàn. Hướng dẫn biến và giới hạn chi tiết ở PROJECT_CONTEXT.md; không gửi secret vào chat, không dùng production. Chưa kiểm tra advisors/SQL thật hoặc routing Vercel. Dừng sau S01; không tự tạo dự án, mở UI hay triển khai thêm.

- 19/10/2026: Git ở `feature/review-assessment`, HEAD `a229bfddf0d321a4e82eda9fd6aa4d797fa367f8`; có thay đổi chưa commit được giữ lại.
- 19/10/2026: hai docs trước đó chưa tồn tại; tạo mới, không ghi đè tài liệu cũ. Kiểm tra cuối phiên phải thành công trước khi báo A03 hoàn tất.
