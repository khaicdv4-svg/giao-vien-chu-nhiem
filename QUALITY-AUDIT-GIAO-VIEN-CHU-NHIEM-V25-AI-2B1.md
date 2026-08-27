# Báo cáo kiểm tra — GIAO VIÊN CHỦ NHIỆM V25 · Giai đoạn 2B.1

## Phạm vi và kết luận

Đã giữ nguyên ứng dụng HTML hiện có và lớp AI offline 2A. Bổ sung Cách 1 tạo câu hỏi trực tiếp bằng Gemini theo kiến trúc:

`Trình duyệt → /api/generate-questions → Netlify Function → Gemini API`

Trình duyệt không chứa `GEMINI_API_KEY` và không gọi trực tiếp miền Gemini.

## Tệp thay đổi

- `index.html`: thêm thẻ Cách 1, mã truy cập AI, trạng thái online/offline, khóa request trùng, chuyển fallback sang 2A; giữ bước xem trước/kiểm tra/lưu chung.
- `netlify/functions/generate-questions.mjs`: Function POST-only, kiểm tra đầu vào, access code, giới hạn kích thước, timeout, rate limit best-effort, gọi structured JSON và chuẩn hóa schema.
- `netlify.toml`: khai báo publish root, thư mục Function và route `/api/generate-questions`.
- `AI-GEMINI-SETUP.md`: hướng dẫn cấu hình biến môi trường an toàn.

Model mặc định là `gemini-3.5-flash-lite`, có thể đổi bằng biến `GEMINI_MODEL`. Có thể xem danh sách model hiện hành tại [Google Gemini API Models](https://ai.google.dev/gemini-api/docs/models).

## Kiểm thử đã thực hiện

| Kiểm tra | Kết quả |
|---|---|
| Compile toàn bộ JavaScript inline trong HTML | PASS |
| Không có URL Gemini/API key trong bundle frontend | PASS |
| Function thiếu biến môi trường | PASS — 503 an toàn |
| Sai mã truy cập | PASS — 403 |
| GET / sai phương thức | PASS — 405 |
| JSON/content/type không hợp lệ | PASS — 400 |
| Mock Gemini structured JSON | PASS — 200 và chuẩn hóa câu hỏi |
| Vượt giới hạn body/nguồn/số câu | PASS — 413/400 |
| 2A prompt → JSON → xem trước → lưu | PASS ở V25 trước khi ghép 2B.1 |
| Gọi API trực tiếp từ frontend | PASS — không có; chỉ gọi endpoint cùng-origin |

API thật chưa thể xác nhận trong môi trường phát triển vì không có secret Gemini. Sau khi thêm biến môi trường trên Netlify, cần bấm tạo thử một bộ nhỏ 1–2 câu để xác nhận kết nối thật.

## Cấu hình bắt buộc để AI trực tiếp chạy

Trên Netlify thêm `GEMINI_API_KEY` và `AI_ACCESS_CODE` trong **Environment variables** với scope Functions, tùy chọn `GEMINI_MODEL`, rồi deploy lại. Không tải secret lên GitHub và không gửi secret qua trò chuyện.

## Giới hạn còn lại

Rate limit hiện best-effort theo IP trong một instance Function; chưa phải bộ đếm phân tán tuyệt đối. Cách 2A vẫn là fallback offline đầy đủ. Âm thanh, dữ liệu lớp và các trò chơi hiện có không bị thay đổi bởi 2B.1.
