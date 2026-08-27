# Cấu hình AI trực tiếp (Giai đoạn 2B.1)

Ứng dụng giữ nguyên **Cách 2A offline** (tạo prompt → dùng ChatGPT → dán JSON). Cách 1 dùng Gemini qua Netlify Function và chỉ hoạt động khi có Internet.

## Cấu hình trên Netlify

1. Mở đúng site Netlify đang liên kết với repository `khaicdv4-svg/giao-vien-chu-nhiem`.
2. Vào **Project configuration → Environment variables**.
3. Thêm biến cho scope **Functions**:
   - `GEMINI_API_KEY`: khóa do quản trị viên tạo trong Google AI Studio.
   - `AI_ACCESS_CODE`: mã truy cập riêng để giáo viên dùng trong ứng dụng.
   - `GEMINI_MODEL` (không bắt buộc): mặc định là `gemini-3.5-flash-lite`.
4. Lưu biến, sau đó vào **Deploys → Trigger deploy → Deploy site**.
5. Không đưa khóa Gemini vào GitHub, HTML, `netlify.toml`, biểu mẫu hoặc ảnh chụp màn hình. Không yêu cầu giáo viên nhập khóa Gemini; giáo viên chỉ nhập mã truy cập AI.

## Sử dụng

Trong **AI trợ lý**, nhập nguồn bài học rồi chọn **Tạo trực tiếp bằng Gemini AI**. Kết quả được đưa vào bước xem trước; giáo viên phải kiểm tra và bấm lưu vào **Kho câu hỏi**. Nếu mất mạng hoặc Function chưa cấu hình, chọn **Chuyển sang cách tạo bằng ChatGPT**.

Tệp bài học không được tự động gửi nếu chưa bấm nút. Không đưa danh sách học sinh hoặc thông tin cá nhân vào nguồn gửi AI.

## Giới hạn an toàn

Function chỉ nhận POST JSON, tối đa 30 câu, nguồn tối đa 12.000 ký tự, thân request tối đa 50 KB và timeout 25 giây. Giới hạn lượt hiện là best-effort theo IP trên từng instance Netlify (6 lượt/phút); nếu cần hạn mức phân tán mạnh hơn sẽ bổ sung Netlify Blobs/Edge hoặc dịch vụ rate-limit riêng.
