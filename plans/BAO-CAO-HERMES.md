# Báo cáo Hermes — Ôn tập và Kiểm tra

**Ngày bắt đầu:** 24/10/2026 (15:30 UTC+07)
**Nhánh:** `feature/on-tap-kiem-tra` (commit `ae43665`)
**Link thử:** https://giao-vien-chu-nhiem-git-feature-cb2347-khaicdv4-9703s-projects.vercel.app/

---

## Giai đoạn 1: Hoàn thiện mẫu "Hành trình đọc hiểu" — PHÂN TÍCH & CHỜ THẦY

**Trạng thái:** Đã phân tích tình hình, chờ xác nhận thiết kế từ thầy.

### Điểm mạnh hiện tại
- Test đơn vị: 3/3 đạt — mẫu `reading` tự động kích hoạt cho Tiếng Việt có bài đọc.
- CSS reading hoàn thiện: serif font (Times New Roman), pastel color, bố cục phù hợp.
- Runtime chấm điểm offline: tính điểm, hiển thị kết quả câu hỏi, lời nhận xét chung.
- Nút "Làm lại" đã có, chức năng dữ liệu offline hoạt động.
- Fixture: 11 câu hỏi (4 trắc nghiệm + 7 tự luận), 7 câu tự luận có `metadata.hint`.

### Thiếu để hoàn tất GĐ1
1. **Danh sách xem lại từng câu** — Học sinh không thể quay lại xem câu cụ thể sau nộp bài.
2. **Lời khuyên cho tự luận** — `metadata.hint` chưa hiển thị ở màn kết quả.
3. **Nút in (In kết quả)** — Không có, cần CSS `@media print`.
4. **File mẫu từ thầy** — Không tìm thấy trong repo để so sánh.

### Thiết kế đề xuất (chờ xác nhận)
- Điểm lớn + tóm tắt kết quả (X/Y câu đúng, Z câu chờ chấm).
- Nút "Câu 1", "Câu 2"… với màu khác nhau (xanh=đúng, đỏ=sai, vàng=chờ chấm).
- Bấm câu → scroll đến vị trí câu hỏi.
- Hiển thị lời khuyên từ `metadata.hint` dưới mỗi câu tự luận.
- Nút "🔁 Làm lại" + "🖨️ In kết quả".

---

## Trạng thái hiện tại

- **Unit tests:** 92/92 đạt (full suite).
- **Reading tests:** 3/3 đạt — mẫu `reading` kích hoạt đúng.
- **Vercel deploy:** Branch auto-build hoạt động.
- **CACHE_NAME:** Hiện tại `hmv-ban-chinh-2.45-on-tap-mau-doc-hieu-tv`.
- **Code review:** Chưa chạy, chờ xác nhận thiết kế.

---

## Ghi chú kỹ thuật

- **CSS reading:** `/app/review-html.js` dòng 685–691, đã hoàn thiện (serif, pastel, responsive).
- **Runtime:** Hàm `runtime()` (dòng 345) khởi tạo attempt, `showSubmitted()` (dòng 382) hiển thị kết quả.
- **Dữ liệu câu tự luận:** `q.metadata.hint` sẵn có trong fixture, chưa dùng ở màn kết quả.
- **Nút hiện tại:** `#retry` (làm lại) đã có; `#export-submission` (tải bản sao) đã có.
- **Fixture chi tiết:** 11 câu = 4 ABCD + 7 OPEN, có `blockIds` liên kết bài đọc.

## Cần thầy làm / quyết định

**1. Xác nhận file mẫu kết quả:**
   - Nếu có file mẫu (HTML, ảnh, PDF): vui lòng cung cấp để tôi so sánh.
   - Nếu không: tôi dùng thiết kế đề xuất trên để sửa code.

**2. Ưu tiên các nút & chức năng:**
   - Danh sách xem lại câu có cần ngay không?
   - Lời khuyên tự luận có cần hiển thị luôn hay phải click?
   - Nút in có cần ngay không?

**3. Thiết kế chi tiết:**
   - Nút xem lại: hiển thị theo dòng ngang (mặc định) hay cột dọc?
   - Lời khuyên: font chữ, màu sắc có yêu cầu gì không?
   - In kết quả: chỉ điểm + đáp án hay cả quá trình làm bài?

---

## Cách thầy xác nhận

Ghi vào chat/email:
- "OK, dùng thiết kế trên. Ưu tiên: [danh sách/lời khuyên/in]."
- Hoặc: "File mẫu: [link/đính kèm]."
- Hoặc: "Muốn sửa [chi tiết] như thế này [mô tả]."

Tôi sẽ chờ phản hồi trước khi tiếp tục code.



