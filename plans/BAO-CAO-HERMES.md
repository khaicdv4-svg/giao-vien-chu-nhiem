# Báo cáo Hermes — Ôn tập và Kiểm tra

**Ngày:** 24/10/2026  
**Nhánh:** `feature/on-tap-kiem-tra`  
**Commit cuối:** `86555c0`  
**CACHE_NAME:** `hmv-ban-chinh-2.48-on-tap-retry-lai-bai`

---

## Giai đoạn 1: Hoàn thiện mẫu "Hành trình đọc hiểu" — ✅

**Commit:** `92c6d1f`, `9bb0551`, `86555c0`  
**Test:** 101/101 pass (92 baseline + 9 mới cho GĐ1)

### Đã xong có bằng chứng

- ✓ Danh sách xem lại câu với `data-question-index`
- ✓ Lời khuyên từ `metadata.hint` cho câu OPEN
- ✓ Nút "🖨️ In kết quả"
- ✓ CSS @media print ẩn nút, danh sách
- ✓ Nút "🔁 Làm lại bài" — reset form, scroll câu 1, không tải lại trang
- ✓ Attempt.reading + attempt.theme gán từ lúc tạo HTML

### Chưa kiểm

- Kiểm thử trình duyệt (1280 + 390px): Playwright không cài ⏭️

---

## Giai đoạn 2: Gia cố AI đọc đề — ✅ PART 1

**Commit:** `06cc7ea`, `338b7b7`  
**Test:** 101/101 pass

- ✓ Retry logic (2 lần khi 429/5xx/timeout)
- ✓ Backoff: 2s, 5s
- ✓ Progress callback
- ✓ Không retry khi 400/parse error

### Còn dở (GĐ2 PART 2)

- Chia PDF > 9MB theo trang
- Xử lý khóa API
- Test mock lỗi
- Lời báo dễ hiểu

---

**Branch:** `feature/on-tap-kiem-tra`
