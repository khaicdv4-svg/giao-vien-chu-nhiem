# Báo cáo Hermes — Ôn tập và Kiểm tra

**Ngày:** 24/10/2026  
**Nhánh:** `feature/on-tap-kiem-tra`  
**Commit cuối:** `9bb0551`  
**CACHE_NAME:** `hmv-ban-chinh-2.46-on-tap-ket-qua-doc-hieu`

---

## Giai đoạn 1: Hoàn thiện mẫu "Hành trình đọc hiểu" — ✅ HOÀN THÀNH

### Công việc đã xong

| Chức năng | Nơi test | Bằng chứng |
|---|---|---|
| Danh sách xem lại từng câu (Câu 1…11) | HTML mẫu reading | `reading-review-section`, tạo qua DOM, test ✓ |
| Lời khuyên từ `metadata.hint` cho câu OPEN | Câu 5-7, 10-11 | `.reading-hint` div, test ✓ |
| Nút "🖨️ In kết quả" | Phần export | Button có event `window.print()`, test ✓ |
| CSS @media print (trắng đen, ẩn nút) | Bản in | `display:none!important`, test ✓ |
| `data-question-index` trên fieldset | Scroll | Đánh dấu mỗi câu, test ✓ |
| HTML đúng 2 thẻ `<script>` | Validation | Script count = 2, test ✓ |
| Flag `attempt.reading` được đặt | Script thứ hai | `attempt.reading=true`, test ✓ |

### Kiểm thử

- **Unit test:** 96/96 pass (92 cũ + 4 reading)
- **Kiểm tra code:** `review-reading-gd1-check.cjs` — 10/10 ✓

### Commit

- `9bb0551`: Sửa lỗi flag `attempt.reading`

---

## Giai đoạn 2: Gia cố AI đọc đề — CHƯA LÀM

(Mục tiêu: retry, timeout, báo tiến độ, xử lý lỗi)

---

**Branch:** `feature/on-tap-kiem-tra` (không gộp vào `main`)
