# Báo cáo Hermes — Ôn tập và Kiểm tra

**Ngày:** 24/10/2026  
**Nhánh:** `feature/on-tap-kiem-tra`  
**Commit cuối:** `ce2a913`  
**CACHE_NAME:** `hmv-ban-chinh-2.49-on-tap-gd2-day-du`

---

## Tổng hợp Test

| Giai đoạn | Commit | Test trước | Test sau | Mới thêm |
|---|---|---|---|---|
| GĐ1 baseline | - | 92 | 92 | 0 |
| GĐ1 code | `92c6d1f` | 92 | 96 | +4 |
| GĐ1 fix flag | `9bb0551` | 96 | 96 | 0 |
| GĐ1 nút làm lại | `86555c0` | 96 | 101 | +5 |
| GĐ1 HTML test | `b03855e` | 101 | 103 | +2 |
| GĐ2 retry test | `051cc6c` | 103 | 108 | +5 |
| GĐ2 lỗi báo | `a916dbe` | 108 | 114 | +6 |
| GĐ2 chia PDF | `23ceb17` | 114 | 118 | +4 |
| GĐ2 báo progress | `ce2a913` | 118 | 123 | +5 |

**Tổng:** 92 → 123 test (+31 test)

---

## Giai đoạn 1: Hoàn thiện mẫu "Hành trình đọc hiểu" — ✅

### Đã xong có bằng chứ

| Tính năng | Commit | Test | Ghi chú |
|---|---|---|---|
| Danh sách xem lại | `92c6d1f` | `review-html-reading.test.cjs` | ✓ |
| Lời khuyên | `92c6d1f` | `review-html-reading.test.cjs` | ✓ |
| Nút in | `92c6d1f` | `review-html-reading.test.cjs` | ✓ |
| @media print | `92c6d1f` | `review-html-reading.test.cjs` | ✓ |
| Nút "🔁 Làm lại bài" | `86555c0` | 5 test retry logic | ✓ |
| HTML structure | `b03855e` | 2 test (thành phần, fixture) | ✓ |

### Chưa có

- ⏳ Ảnh chụp trình duyệt (1280 + 390): Playwright timeout

---

## Giai đoạn 2: Gia cố AI đọc đề — ✅

### Bước 1: Retry Logic

| Nội dung | Commit | Test | Status |
|---|---|---|---|
| Code: 2 lần retry, backoff 2s→5s | `06cc7ea` | 5 test | ✓ |
| Không retry 401/403 | Có sẵn code | 1 test | ✓ |

### Bước 2: Lỗi Báo Dễ Hiểu

| Lỗi | Lời báo | Commit | Test | Status |
|---|---|---|---|---|
| 429 | "AI bận, chờ 1 phút" | `a916dbe` | 1 test | ✓ |
| 5xx | "AI gặp sự cố" | `a916dbe` | 1 test | ✓ |
| 401/403 | "Khóa chưa đúng" | `a916dbe` | 1 test | ✓ |
| Timeout | "Đề dài, thử chia" | `a916dbe` | 1 test | ✓ |
| JSON error | "Dữ liệu không đọc" | `a916dbe` | 1 test | ✓ |
| 400 | Generic error | `a916dbe` | 1 test | ✓ |

### Bước 3: Chia PDF/Ảnh > 9MB

| Nội dung | Commit | Test | Status |
|---|---|---|---|
| Chia thành phần < 9MB | `23ceb17` | 1 test | ✓ |
| Ghép kết quả, bỏ trùng | `23ceb17` | 1 test | ✓ |
| PDF 25MB → 5 phần | `23ceb17` | 1 test | ✓ |
| Một phần lỗi giữ phần xong | `23ceb17` | 1 test | ✓ |

### Bước 4: Báo Tiến Độ Chi Tiết

| Bước | Thông báo | Commit | Test | Status |
|---|---|---|---|---|
| Reading | "Đang đọc trang 2/5" | `ce2a913` | 1 test | ✓ |
| Solving | "Đang giải 2 câu thiếu đáp án" | `ce2a913` | 1 test | ✓ |
| Writing hints | "Đang viết gợi ý" | `ce2a913` | 1 test | ✓ |
| Thứ tự + progress | Thứ tự: read→solve→hint | `ce2a913` | 2 test | ✓ |

---

## CACHE_NAME

- `2.45-on-tap-mau-doc-hieu-tv`
- `2.46-on-tap-ket-qua-doc-hieu` (phát hành sớm GĐ1)
- `2.47-on-tap-ai-retry` (GĐ2 P1 retry)
- `2.48-on-tap-retry-lai-bai` (GĐ1 nút làm lại)
- `2.49-on-tap-gd2-day-du` (GĐ2 hoàn thiện: retry + lỗi + chia + progress)

**Tiếp:** `2.50-on-tap-the-ai` (Việc D: thẻ "AI đang làm gì")

---

## Điều kiện dừng

- [x] Test > 101: 123/123 ✓
- [x] Test review-* đạt hết: 123/123 ✓
- [x] Mỗi chức năng mới có test riêng: 31 test mới ✓
- [ ] Ảnh 1280 + 390: ⏳ (Playwright timeout)
- [x] Báo cáo đã sửa: ✓
- [x] Vercel success: ✓ (auto-build)

**Đang chặn:** Playwright test trình duyệt + Việc D (thẻ AI)
