# AI bên ngoài qua ChatGPT

Ứng dụng không dùng OpenAI API, không cần API key, backend AI hoặc Vercel.

Quy trình:

1. Mở **Kho câu hỏi**, phần thiết lập trò chơi hoặc **Trợ lý soạn câu hỏi**.
2. Chọn khối, môn, bài, số câu và mức độ.
3. Bấm **Tạo câu lệnh** rồi **Sao chép câu lệnh**.
4. Bấm **Mở ChatGPT**, tự tải giáo án/PDF/DOCX/PPTX/ảnh lên ChatGPT và gửi câu lệnh.
5. Sao chép JSON ChatGPT trả về, dán lại vào app hoặc nhập file JSON.
6. Bấm **Kiểm tra câu hỏi**, sửa/loại câu nếu cần, rồi **Lưu vào kho** hoặc **Dùng ngay cho trò chơi**.

App không tự đọc tab ChatGPT và không tự gửi tệp ra ngoài. Tài liệu/ảnh chỉ được giáo viên chủ động tải lên ChatGPT.

Chạy app offline qua localhost nếu muốn:

```powershell
npm start
```

Sau đó mở `http://localhost:8787`. Chức năng quản lý lớp, học sinh, gọi tên, trò chơi, thi đua, chuyên cần và kho câu hỏi vẫn hoạt động khi mất Internet. Chỉ thao tác mở ChatGPT cần Internet.
