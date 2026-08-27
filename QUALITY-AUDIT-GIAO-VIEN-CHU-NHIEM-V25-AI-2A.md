# QUALITY AUDIT · GIÁO VIÊN CHỦ NHIỆM · V25 / GIAI ĐOẠN 2A

## Phạm vi

Đợt này bổ sung Trợ lý AI không cần API: tạo prompt trên thiết bị, sao chép sang công cụ AI do giáo viên chủ động mở, nhận JSON quay lại, kiểm tra an toàn, xem trước/chỉnh sửa và lưu vào Kho câu hỏi dùng chung.

## Nguyên nhân của gap trước đây

Màn AI cũ là luồng online/endpoint và có nút tạo bị khóa hoặc báo `Failed to fetch` khi không có API. Kho câu hỏi lại có nhiều điểm nhập khác nhau. V25 không cố sửa API cũ thành lõi: thêm một luồng offline rõ ràng, không gọi mạng, dùng cùng `questionData` và `saveAll()` của app.

## Đã triển khai

- `outputs/index.html`: thêm giao diện và logic `offline-ai-2a`.
- Cấu hình khối, môn, chủ đề, số câu 5–30, loại câu, mức độ, trò chơi dự kiến và nguồn bài học tùy chọn.
- Prompt yêu cầu JSON thuần, có schema tương thích Kho câu hỏi; không chèn danh sách/tên học sinh.
- Sao chép prompt, mở ChatGPT chỉ sau thao tác của giáo viên; khi offline vẫn tạo prompt và nhập JSON.
- Nhập tệp `.json`; parser nhận JSON thuần, fenced Markdown và JSON nằm trong lời dẫn; không dùng `eval`.
- Validate nội dung, số phương án, đáp án đúng, dạng câu và câu trùng; thông báo lỗi tiếng Việt.
- Preview có checkbox chọn câu, sửa nội dung/phương án/mức độ/đáp án chuẩn, xóa câu; lưu câu mới vào `questionData` và bộ câu hỏi hiện hành.
- Bản nháp cấu hình lưu nhỏ trong `localStorage`; không lưu dữ liệu học sinh và không lưu tệp lớn.
- `outputs/sw.js`: nâng cache lên `gvc-app-v25-ai-2a`, giữ precache app shell và 4 MP3.

## Kiểm thử đã thực hiện

- Biên dịch tĩnh: đạt, 7 khối script, 574054 bytes.
- Quét mô-đun AI 2A: không có `fetch(`, `eval(` hoặc URL API.
- HTTP local server: `index.html`, `sw.js`, manifest, font và 4 MP3 trả 200.
- Mở app trên localhost: màn hình AI 2A hiển thị, không có lỗi console.
- Tạo prompt: đạt, prompt sinh được 1043 ký tự ở cấu hình mặc định.
- JSON hợp lệ: 2/2 câu qua validate và hiển thị preview.
- Lưu kho: thêm 1 câu, Kho câu hỏi tăng từ 2 lên 3 câu; câu mới hiển thị trong danh sách.
- Tải lại trang: dữ liệu câu mới vẫn còn trong Kho câu hỏi.
- JSON sai: hiển thị thông báo lỗi tiếng Việt, không làm treo trang.
- Màn hình Trò chơi: mở được sau khi chuyển từ Kho câu hỏi; không có lỗi console.

## Giới hạn minh bạch

AI 2A không tự đọc DOCX/PDF và không tự gọi dịch vụ AI. Giáo viên cần tự đọc/tải nguồn trong công cụ AI đã chọn, sau đó dán JSON về app. Đây là chủ ý để không gửi dữ liệu ra ngoài và để lõi offline bền vững. Kiểm thử âm thanh thật và thao tác trên thiết bị di động vật lý cần thực hiện thêm ngoài trình duyệt kiểm thử hiện tại.

## Phát hành

Bản đóng gói: `GIAO-VIEN-CHU-NHIEM-PUBLISH-V25-AI-2A`.

