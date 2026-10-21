# Tích hợp Ôn tập và Kiểm tra — Học Mà Vui

Ngày: 18/10/2026. Phạm vi được người dùng giao: triển khai theo giai đoạn, thử lớp 4, mở cho lớp 1–5; chỉ làm trong bản sao riêng. Không triển khai production, nhập dữ liệu thật, sửa nhánh main hoặc thay đổi cấu hình dịch vụ thật khi chưa phê duyệt.

## Căn cứ khảo sát

- Repository đúng: `khaicdv4-svg/giao-vien-chu-nhiem`; mốc khảo sát `a229bfddf0d321a4e82eda9fd6aa4d797fa367f8`.
- App đang được phát hành từ `HOC-MA-VUI-BAN-CHINH/app`, theo `vercel.json`. Push vào main có thể làm website tự cập nhật. Nhánh thực hiện: `feature/review-assessment`, bản clone riêng, không push.
- README ghi 2.8 và đầu DOC-TRUOC ghi 2.15 nhưng service worker mang nhãn 2.27. Không dùng tiêu đề tài liệu để suy đoán phiên bản chạy; dùng commit và nội dung tệp.
- Frontend HTML/JavaScript thuần, nhiều phần mở rộng IIFE; không cần thay framework. `index.html` chứa state lớp học, điều hướng và các game; dữ liệu hiện hữu trong localStorage/IndexedDB.
- `question-bank-stage7.js`: đọc DOCX/TXT/CSV/JSON/XLSX cục bộ, parser 7 dạng; nhánh nhập PDF hiện từ chối vì chưa đóng gói bộ đọc. Không nhầm hàm PDF CDN cũ trong index với luồng nhập đang được sử dụng.
- `kho-cau-hoi.js`: kho phân loại và luyện tập; `question-quick-stage6.js`: `hmvC6QuestionErrors`, `hmvC6PlayBankSet` dùng cho cầu nối trò chơi. Tái sử dụng luật tương thích thay vì tạo kho câu hỏi thứ hai độc lập với game.
- Các game/hoạt động cần bảo toàn: Kéo co, Ai nhanh hơn, Đường đua, Hộp quà, Lật mảnh ghép, Chinh phục tri thức, Bóng bay, Bình chọn, Bàn tay phép thuật, Giơ tay giành quyền, Quiz Nghiêng Đầu, Chế độ giấy; Vòng quay và Ống kính chọn học sinh có nội dung/luật riêng.
- Hai PDF đính kèm đọc được đầy đủ: mỗi tệp 5 trang, không có lớp chữ. Đã xem cả 10 trang. PDF đề: trang 1–2 Toán, trang 3–4 Tiếng Việt gồm bài đọc dùng chung, trang 5 quảng bá/QR. PDF LTVC: trang 1 lý thuyết, trang 2–4 bài tập (trang 2 và 4 trùng nội dung), trang 5 quảng bá/QR. Không đưa trang quảng bá vào ngân hàng câu hỏi, không truy cập QR, không tự gán đáp án từ các lựa chọn.
- QLMS được người dùng chỉ định: https://truong.qlms.vn/dang-nhap. Đã đọc trang công khai và tìm tài liệu công khai; chưa có tài liệu API, tài khoản thử hoặc cấu hình SSO. URL đăng nhập không đủ để triển khai kết nối điểm/giao bài.

## Quyết định sản phẩm

Chọn ADAPT + INTEGRATE app hiện có. BUILD chỉ cho phần quản lý tài liệu/bài làm chưa có; không viết lại game hay đăng nhập giả. Không gắn việc dùng cục bộ với đăng nhập bắt buộc. Phạm vi mọi môn được cấu hình bằng metadata, không viết nhánh riêng cho Toán/Tiếng Việt.

Cấu trúc: năm học → khối 1–5 → môn → chủ đề/bài → học liệu/đề → phiên bản → khối nội dung/câu hỏi. Phân biệt học liệu tham khảo, ôn thường xuyên và bài kiểm tra; bài đọc, ví dụ, hình minh họa có thể được nhiều câu hỏi tham chiếu. Thí điểm lớp 4; lớp khác dùng cùng schema.

Hai cách trình bày dùng chung dữ liệu: Phiếu học tập (xem nhiều câu và bài đọc), Thẻ tương tác (từng câu, cỡ chữ lớn). Không lưu câu hỏi khác nhau cho từng giao diện. Mẫu PDF định hướng màu pastel, vùng nội dung trắng, khung rõ, chữ Việt dễ đọc; không sao chép nguyên trang trang trí thành giao diện quản trị. Giáo viên có màn hình biên tập riêng với màn hình làm bài.

## Hợp đồng dữ liệu

- Document: schemaVersion, id, version, title, metadata(grade,subject,topic,schoolYear), purpose, status(draft/reviewed/published), source(name,mime,blob,pages), blocks và questions. Mỗi câu giữ tham chiếu trang nguồn; dữ liệu nhập chưa rõ ở trạng thái nháp.
- Question: id,type,text,options,correctAnswers/answerText/pairs,points,metadata; dạng OPEN cần giáo viên chấm. Bổ sung dạng tương tác phức tạp bằng renderer đăng ký sau, không đổi core câu hỏi.
- Attempt: id, documentId/documentVersion, snapshot câu hỏi, mode, answers, submissionId, results, pendingManual, score/maxScore. Snapshot giữ kết quả ổn định khi giáo viên sửa tài liệu. Chưa chấm xong tự luận thì chưa có điểm tổng kết cuối cùng.
- Tách DB `hmv-review-v1` khỏi DB và khóa cũ. Lưu nguồn lớn/ảnh/bài làm trong IndexedDB; transaction hoàn tất mới báo đã lưu. Không tự di chuyển hay ghi đè dữ liệu lớp học cũ.
- Cầu nối game chuyển schema tại ranh giới, báo số câu dùng được/bị loại và lý do. Không ép bài tự luận vào ABCD; không mất đoạn đọc. Phiên game và bài kiểm tra là các hoạt động khác nhau, không tự coi điểm thi đua là điểm học tập chính thức.
- Đồng bộ: session được nhà cung cấp xác thực, phân quyền theo trường/lớp/người dùng tại server; outbox giữ operationId ổn định, xác nhận từng thao tác, retry không nhân đôi; lỗi/xung đột giữ dữ liệu để xử lý. Không coi tên/hồ sơ local là bằng chứng đăng nhập. Guest không tự gửi dữ liệu; liên kết guest với tài khoản phải có lựa chọn rõ của chủ dữ liệu.
- Kiểm tra chính thức: đáp án/chấm điểm phải ở server khi kết nối online; offline chỉ là bài luyện/phiên kết quả tạm, không tuyên bố chống gian lận hoặc điểm chính thức. Cần đồng hồ server, deadline, quyền xem đáp án và audit log ở giai đoạn máy chủ.

## Giai đoạn và tiêu chí nghiệm thu

| Giai đoạn | Công việc / tệp dự kiến | Điều kiện chuyển giai đoạn | Kiểm chứng |
|---|---|---|---|
| 0. Khảo sát | kế hoạch này, báo cáo PDF, đọc repository | xác định đúng app, commit, điểm tích hợp và chức năng cần bảo toàn | đối chiếu tree, parser, router, game API, 10 trang PDF |
| 1. Lát cắt lớp 4 cục bộ | review-domain.js, review-storage.js, review-ui.js, review.css, review-import.js, index.html, sw.js | nhập → biên tập → duyệt → xuất bản cục bộ → 2 kiểu xem → làm bài → lưu/chấm → game tương thích | node --test kiem-thu/review-*.test.cjs; test trình duyệt review-browser.cjs |
| 2. Nhập tài liệu đầy đủ | review-import.js, vendor/review-pdf, bộ OCR và màn hình duyệt vùng nguồn | PDF chữ/DOCX/ảnh lưu nguồn; scan báo cần OCR; OCR thực tế phải được thầy duyệt, đánh dấu trang bỏ qua/trùng, không đoán đáp án | PDF chữ/scan/hỏng, DOCX, ảnh, tiếng Việt, giới hạn dung lượng; fixture 2 PDF mẫu |
| 3. Bộ chuyển từng game | bộ chuyển domain + cầu nối UI | kiểm thử từng game có loại câu tương thích, tự luận/bài đọc không mất nghĩa; thoát/đổi game không rò timer/camera | chơi từng game đầu-cuối + hồi quy; camera thật nghiệm thu riêng |
| 4. Guest/auth trên môi trường thử | auth adapter + backend thử + phân quyền | khách dùng offline, tài khoản thật xác thực, chuyển tài khoản không lộ dữ liệu, liên kết guest có xác nhận, logout dừng sync | server/emulator integration: 401/403, khác lớp/trường, token hết hạn, chuyển tài khoản |
| 5. Offline/online sync | outbox + API version/ack/conflict + cache | mất mạng không mất bài, reconnect không trùng, xử lý xung đột, offline reload, backup/restore gồm nguồn | contract tests + 2 máy thử; mất mạng trước/sau ack, quota, SW update |
| 6. Chấm điểm / QLMS | adapter theo API QLMS được cung cấp | giao bài, mapping lớp/môn/học sinh, nhận bài, điểm và retry được kiểm thử trên sandbox; không ghi dữ liệu thật | fixture/hợp đồng QLMS + sandbox end-to-end, sửa điểm có audit, thử quyền sai |
| 7. Nghiệm thu | báo cáo kết quả, gói thử riêng, hướng dẫn rollback | mọi MUST có bằng chứng, không lỗi nghiêm trọng, hồi quy kho/game, thầy duyệt trước production | desktop/mobile/máy chiếu, bàn phím, offline, restore, toàn luồng |

Mỗi giai đoạn phải RUN → TEST → FIX → RETEST trước khi mở rộng. Không đánh dấu hoàn thành nếu chỉ có giao diện hoặc mock.

## Thứ tự triển khai lát cắt

1. Khóa nguồn và kế hoạch; giữ nguyên checkout đang có thay đổi của thầy.
2. Test domain trước: thiếu khóa, tự luận chưa chấm, snapshot và nộp lặp, câu không tương thích.
3. Module nhập: giữ nguồn, báo scan; đóng gói PDF.js cục bộ cùng giấy phép. Không gọi OCR/cloud ngầm. Khi chưa có OCR dùng đọc nguồn và nhập/chỉnh tay, báo đúng giới hạn.
4. Lưu draft và bài làm bằng transaction; xuất/nhập sao lưu, kiểm tra dữ liệu trước restore.
5. Giao diện kho/biên tập/hai renderer/kết quả và cầu nối game; test browser trong profile sạch, không dùng dữ liệu lớp học trên máy thầy.
6. Outbox contract và định dạng xuất kết quả trung gian; chưa nối endpoint QLMS khi thiếu tài liệu/quyền thử.
7. Test hồi quy có trọng tâm, báo phần pass/fail/chưa chạy; đóng gói bản thử không publish.

## MUST / SHOULD / LATER

MUST: schema đa môn 1–5; nguồn truy vết; nháp/duyệt/xuất bản; không đoán đáp án; hai renderer; snapshot và chấm tự luận đúng; không ghi dữ liệu cũ; game adapter dùng luật thực; guest dùng offline; persistence/backup an toàn; phân biệt sync contract và sync thật; không đụng production.

SHOULD: bộ lọc đầy đủ, OCR theo vùng/trang và sửa đáp án trực quan, thống kê theo kỹ năng, tiện nghi máy chiếu và âm thanh game sẵn có.

LATER: mở rộng kho nội dung đã thẩm định cho tất cả khối/môn, phân tích kết quả nhiều lớp, tùy biến nhiều theme/renderer, QTI/SCORM/LTI nếu QLMS có hỗ trợ. Không khẳng định QLMS hỗ trợ các chuẩn này khi chưa có tài liệu.

## Điểm cần nhà trường/QLMS cung cấp

Tên/địa chỉ sandbox, tài liệu API hoặc chuẩn tích hợp được hỗ trợ, luồng xác thực được cấp phép, dữ liệu lớp/học sinh giả, vai trò tài khoản thử và quy tắc nhận điểm. Cấp bí mật qua cơ chế kết nối an toàn, không dán vào chat. Chưa có các đầu vào này thì tiếp tục phần cục bộ và contract test, chưa gọi API nội bộ đoán từ trang đăng nhập.

## Tiến độ

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Khảo sát repo / PDF | Hoàn tất đọc nguồn | commit nêu trên; ảnh 10 trang trong work |
| Kế hoạch | Đã lập theo phạm vi được giao | tệp này |
| Domain / storage / UI | Đang triển khai | chưa nghiệm thu |
| OCR scan tự động | Chưa triển khai | cần engine/bộ ngôn ngữ và kiểm thử |
| Auth/sync thật/QLMS | Chờ môi trường thử/API | người dùng đã cung cấp trang đăng nhập QLMS |
| Production | Chưa thay đổi | không push/deploy/migration |
