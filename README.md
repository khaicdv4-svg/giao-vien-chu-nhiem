# GIÁO VIÊN CHỦ NHIỆM · ThayKhaiEdu

Prototype V1.0 cho giáo viên tiểu học Việt Nam, nhận diện Trường Tiểu học Trần Văn Ơn.

## Chạy thử

Mở trực tiếp `index.html` bằng trình duyệt. Không cần cài đặt hoặc Internet cho các chức năng lớp học cốt lõi.

## Đã có trong prototype

- Dashboard với sidebar cố định, gradient tím–hồng–cam, card bo góc và banner lớn.
- Danh sách học sinh: tìm kiếm, thêm học sinh, lưu localStorage.
- Nhập danh sách từ file TXT/CSV/DOCX/XLSX/XLS hoặc dán trực tiếp; tự bỏ qua tên trùng. DOCX/XLSX/XLS cần Internet một lần để tải bộ đọc tài liệu.
- Xóa toàn bộ danh sách học sinh với xác nhận hai bước để tránh thao tác nhầm.
- Gọi tên ngẫu nhiên theo cả lớp hoặc tổ, kèm lịch sử lượt gọi.
- Vòng quay có hiệu ứng xoay, tên học sinh bật nổi khi dừng và âm thanh fanfare sinh động.
- Chia nhóm ngẫu nhiên theo 2–4 nhóm.
- Trò chơi lớp học, ngân hàng câu hỏi, thi đua và chuyên cần.
- AI trợ lý dạng mô phỏng online cho ba mức độ câu hỏi.
- Responsive cho máy tính, máy chiếu và màn hình nhỏ.
- Học sinh có thể sửa tên, xóa, chuyển tổ, nhập danh sách và xuất CSV.
- Điểm danh có thống kê Có mặt/Vắng/Có phép và xuất CSV.
- Thi đua có cộng/trừ điểm thật cho từng tổ và xuất tổng kết.
- Ngân hàng câu hỏi được lưu offline, có sửa/xóa và dùng trực tiếp trong trò chơi.
- Trò chơi có kiểm tra đáp án và cộng điểm cho tổ.
- Có sao lưu/khôi phục toàn bộ dữ liệu lớp bằng file JSON.
- Ngân hàng câu hỏi có bộ lọc, biểu mẫu tạo thủ công, tạo bộ 3 mức độ bằng AI, xem trước trước khi lưu và đưa câu hỏi sang trò chơi.
- Nhập ngân hàng câu hỏi từ Word `.docx`, Excel `.xlsx/.xls` và PDF; có vùng xem trước trước khi lưu.
- Giao diện ngân hàng câu hỏi mới theo dạng kho tập trung: bộ đếm, tìm kiếm, lọc ABCD/Đúng-Sai/Nhiều đáp án/Điền, AI, nhập file và xuất toàn bộ kho.
- Khu trò chơi ngay trong ngân hàng câu hỏi: Kéo co kiến thức, Đua thuyền tri thức, Hộp quà bí mật, Ô cửa bí mật, Dò mìn an toàn và Lật mảnh ghép; dùng chung câu hỏi và điểm 4 tổ.

## Kiến trúc mở rộng V1.0

Prototype hiện là một file tĩnh để dễ dùng và dễ kiểm thử. Khi phát triển thành sản phẩm, nên tách thành frontend component-based và thêm IndexedDB/PWA cho dữ liệu lớn, export/import JSON để sao lưu, cùng một API AI riêng cho các chức năng online.

## Kiểm thử nhanh

1. Mở `index.html`.
2. Vào **Học sinh**, thêm một học sinh và tải lại trang để kiểm tra lưu cục bộ.
3. Vào **Gọi tên vui**, thử các phạm vi và nút **QUAY NGAY**.
4. Vào **Chia nhóm**, đổi số nhóm và chia lại.
5. Vào **Chuyên cần**, đổi trạng thái rồi tải lại trang.
6. Vào **AI trợ lý**, nhập nội dung để xem bộ câu hỏi mẫu.
7. Vào **Thi đua**, bấm `Tổ 1 +1` rồi tải lại trang để kiểm tra dữ liệu được lưu.
8. Vào **Cài đặt và dữ liệu**, tải file sao lưu; có thể dùng file đó để khôi phục trên máy khác.
9. Vào **Câu hỏi**, nhập tên bài, bấm **Tạo câu hỏi**, xem trước rồi lưu câu hỏi phù hợp vào ngân hàng.
