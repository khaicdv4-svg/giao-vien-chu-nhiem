# Báo cáo nâng cấp 2B.2 — Nhận diện và nhập danh sách học sinh thông minh

## Phạm vi

Đợt này chỉ cập nhật luồng danh sách học sinh trong `index.html`. Không thay đổi các trò chơi, ngân hàng câu hỏi hoặc luồng AI đang hoạt động. Không triển khai Netlify theo yêu cầu `[skip netlify]` vì tài khoản đã hết credit.

## Nguyên nhân đã xử lý

Phiên bản cũ tự bù danh sách bằng mẫu `Học sinh N` khi chưa có dữ liệu. Ngoài ra, giao diện có nhiều luồng nhập cũ ghi trực tiếp vào danh sách, khiến giáo viên không có bước xem trước và dễ lưu nhầm cột. Luồng mới đặt một lớp xử lý chung trước khi lưu và không còn tự tạo tên giả.

## Thay đổi trong `index.html`

- Dữ liệu mới có `fullName`, `displayName`, `normalizedName`, `id`; trường `name` vẫn được đồng bộ để giữ tương thích với các trò chơi cũ.
- Không tạo `Học sinh 1`, `Học sinh 2`... khi lớp chưa có dữ liệu.
- Dán trực tiếp từ Excel/Google Sheets/Word, kể cả dữ liệu nhiều cột; tự bỏ STT và nhận diện cột Họ và tên.
- Cho phép giáo viên chọn lại cột họ và tên khi nhận diện tự động chưa đúng.
- Có chế độ hiển thị họ tên đầy đủ, tên gọi hoặc tên đệm + tên.
- Có bảng xem trước, thống kê dòng nhận diện/trùng/cần kiểm tra/bỏ qua, sửa và xóa từng dòng.
- Có hai thao tác rõ ràng: thêm vào danh sách hiện tại hoặc thay thế danh sách; thao tác thay thế tạo bản sao lưu local trước khi ghi.
- Bỏ tên trùng trong một lần nhập và bỏ tên đã có trong danh sách khi thêm.
- Tên tạm từ dữ liệu cũ được đánh dấu; có nút xóa riêng và xác nhận trước khi xóa.
- Đọc offline các định dạng TXT, CSV, TSV, DOCX và XLSX bằng mã tích hợp trong trang; không gọi CDN/API và không gửi danh sách học sinh ra Internet.

## Giới hạn cần biết

Phần mở rộng `.xls` được chấp nhận để nhận diện file, nhưng file XLS nhị phân đời cũ không có thư viện BIFF nhúng. Khi gặp file nhị phân, app báo rõ và yêu cầu lưu lại thành `.xlsx` hoặc `.csv` bằng Excel/LibreOffice. XLS dạng văn bản/CSV vẫn có thể đọc được. Đây là giới hạn kỹ thuật còn lại, không che giấu trong giao diện.

## Kiểm thử đã thực hiện

1. Biên dịch tĩnh toàn bộ các khối JavaScript trong `index.html` bằng `vm.Script`: đạt, không có lỗi cú pháp.
2. Dán bảng nhiều cột gồm STT, Họ và tên, Giới tính, Ngày sinh: nhận diện đúng tên, bỏ tiêu đề/dòng trống.
3. Kiểm tra dòng thiếu tên: đưa vào nhóm bỏ qua, không tạo tên giả.
4. Kiểm tra trùng trong cùng nguồn: hiển thị cảnh báo và chỉ lưu một bản ghi.
5. Kiểm tra chọn lại cột: danh sách cột xuất hiện sau phân tích và phân tích lại theo lựa chọn mới.
6. Kiểm tra DOCX: đọc nội dung offline và đưa vào xem trước, không có lỗi Console trong phiên kiểm thử.
7. Kiểm tra tệp quá 10 MB và định dạng không hỗ trợ: bị chặn với thông báo tiếng Việt.
8. Kiểm tra hiển thị tên đầy đủ/tên gọi/tên đệm + tên.
9. Kiểm tra tương thích dữ liệu cũ: trường `name`, tổ, điểm và trạng thái được giữ; tên mẫu cũ chỉ được đánh dấu tạm.
10. Kiểm tra không có vòng lặp tạo `Học sinh N` trong mã khởi tạo mới.

Các kiểm thử thao tác trình duyệt quy mô lớn, XLS nhị phân đời cũ và kiểm thử âm thanh/game cần được chạy bổ sung trên thiết bị người dùng sau khi tải commit này.

## Phát hành

- Commit GitHub phải dùng thông điệp có `[skip netlify]`.
- Không chạy deploy Netlify trong đợt này; production vẫn giữ phiên bản trước đó cho đến khi tài khoản có credit hoặc người quản trị chủ động triển khai.
