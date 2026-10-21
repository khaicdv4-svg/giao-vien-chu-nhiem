# QLMS: đầu vào cần thiết trước kết nối thật

Người dùng chỉ định https://truong.qlms.vn/dang-nhap ngày 18/10/2026. Đây là trang đăng nhập trường; chưa xác nhận đây là môi trường thử. Website công khai https://qlms.vn/ mô tả học liệu, giao bài và báo cáo. Chưa tìm được tài liệu API trong lượt kiểm tra công khai. Không suy ra có REST API/SCORM/LTI từ trang này.

## Cách tiến hành khi nhận được tài liệu

1. Xác minh sandbox thuộc đơn vị được phép và dữ liệu là giả. Đọc tài liệu API/chuẩn tích hợp do quản trị QLMS cung cấp.
2. Xác nhận phương thức nhận dạng học sinh, lớp, môn, năm học và bài giao; không dùng tên hiển thị để nối bản ghi.
3. Đặt secret tại server môi trường thử, không trong JavaScript hay localStorage. Đăng nhập qua luồng được nhà cung cấp hỗ trợ; không tự động điền mật khẩu trong app.
4. Dùng adapter backend để ánh xạ học liệu, giao bài, bài nộp, điểm. Kiểm tra phạm vi trường/lớp/giáo viên ở server trên mọi yêu cầu.
5. Ánh xạ điểm chỉ khi chấm hoàn tất; chuyển thang điểm theo quy tắc được thống nhất; giữ bản ghi điểm gốc và revision. Không tự gửi điểm thi đua game thành điểm chính thức.
6. Kiểm tra retry bằng idempotency key ổn định, lỗi mạng sau khi server đã ghi, tài khoản hết phiên, bài đã khóa, học sinh đổi lớp, điểm bị chỉnh sửa, nội dung trùng và xung đột phiên bản.
7. Chạy trên sandbox trước, ghi bằng chứng request/response đã loại thông tin nhạy cảm. Trình thầy duyệt gói thay đổi cuối cùng trước mọi triển khai thật.

## Hợp đồng phía Học Mà Vui

Mọi tên dưới đây là giao diện nội bộ dự kiến, không phải endpoint QLMS đã biết:

- Auth adapter cấp session đã xác thực và userId ổn định. Mặc định guest, không có token giả, không dùng hồ sơ tự nhập làm chứng cứ đăng nhập.
- Transport nhận thao tác `{id,userId,entityId,type,payload,baseVersion}` và trả ack theo cùng operationId hoặc conflict. Thao tác không được xóa khỏi outbox khi chưa có ack đúng.
- Danh tính ngoài: externalStudentId, externalClassId, externalAssignmentId, externalSubjectId. Ánh xạ có kiểm tra trùng; không tự đoán bằng tên.
- Bản xuất JSON/CSV trung gian chỉ phục vụ kiểm tra/trao đổi; chưa khẳng định QLMS nhập được. Cần đối chiếu định dạng thật trước triển khai.

## Trạng thái hiện tại

Chưa gọi API QLMS, chưa đăng nhập QLMS, chưa đọc danh sách học sinh, chưa giao bài và chưa ghi điểm. Chờ sandbox/tài liệu và cơ chế cấp quyền phù hợp; không yêu cầu người dùng dán mật khẩu/secret vào chat.
