# Báo cáo nâng cấp 2B.3 — Lưu, sao lưu và khôi phục danh sách

## Chẩn đoán

Danh sách của app đang được lưu trong workspace hiện có qua `saveAll/saveWorkspace` và `localStorage`; các thao tác nhập/sửa/xóa gọi lưu trực tiếp nhưng chưa có trạng thái, nút lưu lại, snapshot và xuất/nhập bản sao. Vì vậy giáo viên khó biết dữ liệu đã ghi thành công hay chưa và không có lớp phục hồi rõ ràng. Đợt này không xóa IndexedDB, không xóa cache và không thay đổi dữ liệu cũ.

## Đã triển khai trong `index.html`

- Thêm lớp persistence dùng chung cho màn hình Học sinh, bám theo khóa ổn định `userId + schoolYearId + gradeId + classId` của workspace.
- Dùng data layer workspace hiện có làm nguồn dữ liệu duy nhất; không tạo danh sách riêng cho Chia nhóm, Gọi tên hoặc trò chơi.
- Tự động lưu có debounce khoảng 700 ms khi phát hiện thay đổi; thao tác xác nhận nhập/thay thế vẫn lưu ngay.
- Thêm nút `Lưu danh sách` và trạng thái `Chưa có thay đổi`, `Đang lưu…`, `Đã lưu lúc HH:mm`, `Có thay đổi chưa lưu`, `Lưu thất bại – thử lại`.
- Chống lưu lặp khi đang có transaction lưu; nếu lưu lỗi vẫn giữ dữ liệu trên màn hình và báo tiếng Việt.
- Tạo tối đa 10 snapshot gần nhất cho từng lớp trước khi thêm, thay thế, nhập bản sao hoặc xóa tên tạm.
- Thêm mục `Bản sao lưu danh sách`, xem thời gian/sĩ số, xem trước, khôi phục và xóa có xác nhận.
- Khi danh sách rỗng nhưng có snapshot, chỉ đề nghị khôi phục; không tự động ghi đè.
- Thêm xuất bản sao JSON và nhập JSON có kiểm tra schema, xem trước rồi mới thay thế.
- Có cảnh báo khi rời trang nếu còn thay đổi chưa lưu.
- Dữ liệu học sinh không được gửi lên server, Gemini hoặc dịch vụ trực tuyến.

## Kiểm thử

- Biên dịch tĩnh 10 khối JavaScript bằng `vm.Script`: đạt.
- Mở app ở cổng kiểm thử không dùng cache cũ, vào Học sinh: panel lưu hiển thị đúng.
- Dán và phân tích danh sách nhiều cột, xác nhận thêm: trạng thái chuyển `Đã lưu`, snapshot xuất hiện.
- Mở khu vực bản sao: hiển thị thao tác, thời gian và sĩ số.
- Chuyển qua Gọi tên vui và Trò chơi sau khi thêm module: không có lỗi Console.
- Nút lưu ban đầu bị khóa khi chưa có thay đổi; không tạo thao tác lưu kép.
- Kiểm tra mã khởi tạo mới: `defaultStudents=[]`, không còn vòng lặp tự sinh `Học sinh N`.

## Giới hạn còn lại

Data layer hiện tại của app là workspace/localStorage đồng bộ, không phải IndexedDB cho bản ghi danh sách. Đây vẫn là data layer bền vững hiện có và phù hợp dữ liệu tên học sinh; nếu cần chịu lỗi dung lượng lớn hơn, bước sau nên chuyển riêng workspace sang IndexedDB trong một migration có kiểm thử và backup trước.

Đồng bộ xung đột giữa hai tab bằng BroadcastChannel chưa triển khai đầy đủ; hiện chưa tự động ghi đè giữa hai tab. Đây là SHOULD tiếp theo, không được giả mạo là đã hoàn thành.

## Phát hành

Commit GitHub dùng `[skip netlify]`. Không triển khai Netlify vì tài khoản hết credit; production không thay đổi trong đợt này.
