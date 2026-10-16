# QR: âm thanh kết quả — 16/10/2026

Tiếng đúng/sai và tiếng dừng vòng quay dùng Web Audio được mở bằng thao tác chạm/phím của người chơi. Giải mã và giữ sẵn các MP3 đi kèm ứng dụng, tránh tạo phần tử media mới tại thời điểm kết quả hoặc sau bộ đếm thời gian.

Giữ âm lượng, nút tắt tiếng, âm thanh vòng quay người dùng tải lên và thứ tự thắng cuộc → cổ vũ. Khi thoát hoặc hủy, vô hiệu hóa cả yêu cầu tải đang chờ để không phát muộn. Nếu không tải/giải mã được, dùng cơ chế dự phòng có sẵn.

Kiểm thử: `kiem-thu/t-qr-audio.cjs` chặn HTMLMediaElement.play để mô phỏng chính sách media trên điện thoại; chọn đúng/sai trong Bóng bay, quay đủ lượt, kiểm tra phát MP3 qua AudioContext, hủy tiếng, tắt tiếng và dùng Blob âm thanh tự nhập. Đã thấy bài thử thất bại trước khi thêm bộ phát mới.

Chưa nghiệm thu loa hoặc iPhone/Android thật. Bộ nhớ đệm mới: `hmv-ban-chinh-2.26-qr-audio`. Không thay đổi URL của các mã QR.
