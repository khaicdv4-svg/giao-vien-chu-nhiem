# Báo cáo Hermes — Ôn tập và Kiểm tra

**Ngày:** 24/10/2026  
**Nhánh:** `feature/on-tap-kiem-tra`  
**CACHE_NAME:** `hmv-ban-chinh-2.48-on-tap-retry-lai-bai`

---

## Giai đoạn 1: Hoàn thiện mẫu "Hành trình đọc hiểu"

### Commit & Test

| Commit | Nội dung | Test sau | Mới |
|---|---|---|---|
| `92c6d1f` | Code GĐ1 (danh sách, lời khuyên, nút in) | 96 | +4 |
| `9bb0551` | Fix `attempt.reading` flag | 96 | 0 |
| `86555c0` | Nút "🔁 Làm lại bài" + 5 test | 101 | +5 |
| `b03855e` | Test HTML structure + fixture | 103 | +2 |

**Tổng:** 92 → 103 test (+11)  
**Status:** ✅ Code + unit test xong

### Đã xong có bằng chứng

- ✓ Danh sách xem lại + data-question-index
- ✓ Lời khuyên từ metadata.hint
- ✓ Nút "🖨️ In kết quả"
- ✓ CSS @media print
- ✓ Nút "🔁 Làm lại bài" — form.reset(), scrollIntoView, không reload
- ✓ HTML structure đủ thành phần

### Chưa có bằng chứ

- ⏳ Ảnh chụp trình duyệt (1280 + 390): Playwright timeout

---

## Giai đoạn 2: Gia cố AI đọc đề — PART 1

| Commit | Nội dung | Test |
|---|---|---|
| `06cc7ea` | Retry code (2 lần, backoff 2s→5s, callback) | 96 |
| `338b7b7` | Báo cáo | 96 |

**Status:** ✅ Code xong, ⏳ **chưa có test retry**

**Lỗi báo cáo trước:**
- Báo "101/101" ở 06cc7ea → thực tế vẫn 96
- Báo "+9 test" → thực tế +5 test (ở 86555c0)

**Sắp làm (Việc C):**
- Thêm test mock retry (429, 5xx, timeout)
- Sửa: không retry 401/403 (hiện chỉ check 400)

---

## CACHE_NAME History

- `2.45-on-tap-mau-doc-hieu-tv` (ban đầu)
- `2.46-on-tap-ket-qua-doc-hieu` (GĐ1 lần 1)
- `2.47-on-tap-ai-retry` (GĐ2 P1)
- `2.48-on-tap-retry-lai-bai` (GĐ1 nút làm lại)
- Tiếp: `2.49-on-tap-gd2-test-retry`

**Lý do:** Phát hành 2.46 khi GĐ1 chưa hoàn (thiếu nút "Làm lại"), cần +2 bước cache.

---

## Tiến độ

- Test: 92 → 103 (+11) ✅
- Code GĐ1: ✅
- Test GĐ1: ✅
- Ảnh chụp GĐ1: ⏳ (Playwright timeout)
- Test retry: ⏳
- GĐ2 full: ⏳
- Thẻ AI: ⏳
