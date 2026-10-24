# Báo cáo Hermes — Ôn tập và Kiểm tra

**Ngày:** 24/10/2026  
**Nhánh:** `feature/on-tap-kiem-tra`  
**Commit cuối:** `3ca1cfe`  
**CACHE_NAME:** `hmv-ban-chinh-2.46-on-tap-ket-qua-doc-hieu`

---

## Giai đoạn 1: Hoàn thiện mẫu "Hành trình đọc hiểu" — ✅ HOÀN THÀNH

### Công việc đã xong

| Chức năng | Nơi test | Bằng chứng |
|---|---|---|
| Danh sách xem lại từng câu (Câu 1, Câu 2…) | HTML mẫu reading | `data-question-index`, `.reading-review-section`, test #4 ✓ |
| Cuộn mượt tới câu khi bấm | Hàm `scrollIntoView` | Inline event handler `addEventListener('click')` |
| Lời khuyên từ `metadata.hint` cho câu OPEN | Câu 5-11 (tự luận) | `.reading-hint`, hiển thị khi `q.type==='OPEN'&&q.metadata?.hint`, test #5 ✓ |
| Nút "🖨️ In kết quả" | Phần export | Button có `.textContent='🖨️ In kết quả'`, test #6 ✓ |
| CSS @media print (trắng đen, ẩn nút) | In từ trình duyệt | `@media print` với `display:none!important`, test #7 ✓ |
| Giữ nguyên mẫu worksheet | Fixture môn Toán | `data-theme="worksheet"` khi chọn tay, test #2 ✓ |
| HTML đúng 2 thẻ `<script>` | Validation | `(out.match(/<script/g)||[]).length === 2`, test ✓ |
| CRLF giữ nguyên | `app/review-html.js` + `app/sw.js` | File status: CRLF ✓ |

### Kiểm thử

- **Unit test:** 96/96 pass (cũ 92 + mới 4 cho GĐ1)
  - Test mẫu reading: 7/7 pass
  - Test khác: 89/89 pass
- **Code kiểm tra:** HTML có đủ danh sách xem lại, lời khuyên, nút in, CSS @media print ✓

### Commit và Deploy

- **Commit:** `3ca1cfe` — "Ôn tập và Kiểm tra: màn kết quả mẫu đọc hiểu có xem lại câu, lời khuyên, in kết quả"
- **Push:** Nhánh `feature/on-tap-kiem-tra` ✓
- **Link thử:** https://giao-vien-chu-nhiem-git-feature-cb2347-khaicdv4-9703s-projects.vercel.app/

### Chi tiết thực hiện

1. **Danh sách xem lại**: Thêm `.reading-review-section` vào hàm `showSubmitted()` (dòng 432-439). Mỗi câu có nút "Câu i" với màu trạng thái (xanh=đúng, vàng=chờ, đỏ=sai). Bấm cuộn tới `[data-question-index="i"]`.

2. **Lời khuyên tự luận**: Kiểm tra `q.type==='OPEN'&&q.metadata?.hint` rồi thêm `.reading-hint` div dưới phần feedback (dòng 439-441).

3. **Nút in**: Thêm button "🖨️ In kết quả" vào `.submission-export` (dòng 441-443), gọi `window.print()`.

4. **CSS @media print**: Thêm quy tắc toàn bộ (dòng 706). Ẩn header, nút, danh sách xem lại; giữ câu hỏi, đáp án, điểm. Nền trắng, chữ đen, `page-break-inside:avoid`.

5. **data-question-index**: Thêm vào fieldset ở dòng 693 để bộ chọn `querySelector()` tìm được khi bấm nút xem lại.

6. **Flag reading**: Thêm `attempt.reading=reading` vào `renderHtml()` (dòng 676) để hàm `showSubmitted()` biết khi nào thêm các tính năng.

### Fixture dùng để test

- **File:** `kiem-thu/fixtures/review-tiengviet4-doc-hieu.json`
- **Nội dung:** 11 câu (4 ABCD + 7 OPEN), tất cả có `metadata.hint`
- **Môn:** Tiếng Việt, lớp 4
- **Bài đọc:** "Chuyến đi của bé Linh"

### Quy tắc tuân thủ

✓ Không đụng `main`  
✓ Không deploy production (chỉ Vercel auto-build branch)  
✓ Không lộ khóa API  
✓ CRLF giữ nguyên  
✓ CACHE_NAME tăng từ 2.45 → 2.46  
✓ Test 96/96 pass  
✓ Commit tiếng Việt + Co-Authored-By  

---

## Tiếp theo

**Giai đoạn 2:** Gia cố AI đọc đề (retry, timeout, báo tiến độ, xử lý lỗi).  
**Giai đoạn 3:** Tạo bài ôn tập / kiểm tra từ chủ đề (không cần file).

---

**Link thử:** https://giao-vien-chu-nhiem-git-feature-cb2347-khaicdv4-9703s-projects.vercel.app/  
**Commit:** `3ca1cfe`  
**Branch:** `feature/on-tap-kiem-tra` (không gộp vào `main`)
