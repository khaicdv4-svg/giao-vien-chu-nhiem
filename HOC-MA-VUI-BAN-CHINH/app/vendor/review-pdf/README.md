# PDF.js cho bản thử Ôn tập và Kiểm tra

Mozilla PDF.js 5.6.205, lấy từ dependency runtime có sẵn, Apache-2.0 (LICENSE kèm theo).

`pdf.mjs` và `pdf.worker.mjs` là bản minified phân phối chính thức, đổi tên từ `pdf.min.mjs` và `pdf.worker.min.mjs`. Không chỉnh nội dung. Đóng gói cục bộ để không tải script CDN khi giáo viên nhập PDF.

Chỉ trích lớp văn bản; không có OCR tích hợp. PDF scan được lưu làm nguồn và đánh dấu cần OCR/nhập tay. Renderer nguồn hiện tại dùng trình xem PDF của trình duyệt; không giả định đọc được văn bản từ ảnh.

Tài liệu API: https://mozilla.github.io/pdf.js/examples/
