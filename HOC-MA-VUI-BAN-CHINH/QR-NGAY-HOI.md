# 14 mã QR – HỌC MÀ VUI · ThayKhaiEdu

Mở `app/qr.html` qua máy chủ ứng dụng để xem, tải từng ảnh SVG hoặc in mỗi mã một trang A4.
Bản PDF và ảnh tổng quan ở `qr-delivery/`. SVG gốc ở `app/assets/qr/`.

## Đường dẫn cố định

Mỗi mã dùng `https://giao-vien-chu-nhiem.vercel.app/#trai-nghiem/` kèm:

| Mã | Tên | Đuôi đường dẫn |
|---|---|---|
| 01 | HỌC MÀ VUI – ThayKhaiEdu | gioi-thieu |
| 02 | Vòng quay kết nối | vong-quay |
| 03 | Kéo co kiến thức | keo-co |
| 04 | Đường đua kiến thức | duong-dua |
| 05 | Chinh phục tri thức | chinh-phuc |
| 06 | Quiz Nghiêng Đầu | nghieng-dau |
| 07 | Bóng bay tri thức | bong-bay |
| 08 | Kho câu hỏi – Luyện tập | luyen-tap |
| 09 | Bình chọn ngón tay | binh-chon |
| 10 | Bàn tay phép thuật | ban-tay-phep-thuat |
| 11 | Giơ tay giành quyền | gio-tay |
| 12 | Hộp quà bí mật | hop-qua |
| 13 | Ai nhanh hơn | ai-nhanh-hon |
| 14 | Nốt nhạc vui | not-nhac |

## Trạng thái bàn giao

Bộ 8 QR (01–08) đã được xuất bản trên website chính thức ngày 16/10/2026. Giữ nguyên tất cả đường dẫn và ảnh QR đã phát hành. Mã 09–14 thêm ngày 20/10/2026 (bản 2.16), chỉ hoạt động trên web sau khi bản này được đưa lên Vercel.

Từ bản 2.16, mọi thẻ trong Thư viện trò chơi đều có QR; bấm thẻ mở cùng màn hình chính như khi quét QR (có thêm nút ← Thư viện trò chơi).

QR trò chơi mở màn hình chính riêng: tên, mô tả, Chơi ngay, Cài đặt, hướng dẫn thu gọn và QR chia sẻ. Chỉ mở cấu hình khi người dùng chọn Cài đặt. Chơi nhanh Quiz Nghiêng Đầu và Bóng bay dùng chạm; người dùng có thể bật camera sau đó.

Máy gian hàng cần dùng lớp/hồ sơ demo riêng. Khách truy cập lần đầu cần Internet; cache hỗ trợ truy cập lại.

## Xác minh

`kiem-thu/t-qr.cjs`: tám đường dẫn, QR trên thẻ, đóng hộp thoại, màn hình điện thoại, giải mã độc lập tám poster bằng jsQR, tạo PDF; kiểm tra truy cập offline sau khi cache hoàn tất.
Phụ thuộc kiểm thử ngoài ứng dụng: Playwright (Chrome), jsqr, pngjs; tạo lại ảnh cần qrcode. Có thể cấu hình đường dẫn module bằng `HMV_PLAYWRIGHT`, `HMV_JSQR`, `HMV_PNGJS`, `HMV_QRCODE`.
Không dùng dịch vụ QR từ xa; QR và poster là SVG tĩnh, giữ vùng trắng 4 mô-đun quanh mã.

Kiểm thử t-qr-entry.cjs: 5 trò ở 390px và 1440px; mở Cài đặt và Chơi ngay thực sự khởi động ván; kiểm tra 3 QR còn lại. Tài nguyên phục vụ từ tệp bằng Playwright request routing; không thay cho thử mạng, cache hoặc điện thoại thật.
