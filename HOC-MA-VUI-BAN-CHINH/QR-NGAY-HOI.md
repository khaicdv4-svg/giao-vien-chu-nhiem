# 8 mã QR – HỌC MÀ VUI · ThayKhaiEdu

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

## Trạng thái bàn giao

Đây là bản sửa trên nhánh riêng; chưa xuất bản lên website. Không in dùng chính thức trước khi cập nhật website và quét thử đường dẫn trên điện thoại thật.
Khách truy cập lần đầu cần Internet. Cơ chế cache hỗ trợ truy cập lại, không thay thế kết nối lần đầu.
QR mở màn hình chức năng/thiết lập có sẵn; người dùng bấm Bắt đầu hoặc chọn Luyện tập. Không tự bật camera, tự gọi AI hay tự ghi đè dữ liệu lớp.
Không tạo môi trường lưu trữ demo cách ly: các thao tác chơi vẫn theo cơ chế lưu dữ liệu hiện có của app trên thiết bị người dùng. Máy gian hàng cần dùng lớp/hồ sơ demo riêng.
Nguồn câu hỏi và thiết lập có sẵn được giữ nguyên. Với máy mới, dùng bộ mẫu có sẵn. Máy từng dùng app cần kiểm tra lại nguồn câu hỏi trước khi trình diễn.

## Xác minh

`kiem-thu/t-qr.cjs`: tám đường dẫn, QR trên thẻ, đóng hộp thoại, màn hình điện thoại, giải mã độc lập tám poster bằng jsQR, tạo PDF; kiểm tra truy cập offline sau khi cache hoàn tất.
Phụ thuộc kiểm thử ngoài ứng dụng: Playwright (Chrome), jsqr, pngjs; tạo lại ảnh cần qrcode. Có thể cấu hình đường dẫn module bằng `HMV_PLAYWRIGHT`, `HMV_JSQR`, `HMV_PNGJS`, `HMV_QRCODE`.
Không dùng dịch vụ QR từ xa; QR và poster là SVG tĩnh, giữ vùng trắng 4 mô-đun quanh mã.
