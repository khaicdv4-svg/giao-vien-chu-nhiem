# Báo cáo Hermes — Ôn tập và Kiểm tra

**Ngày:** 24/10/2026  
**Nhánh:** `feature/on-tap-kiem-tra`  
**Commit cuối:** `06cc7ea`  
**CACHE_NAME:** `hmv-ban-chinh-2.47-on-tap-ai-retry`

---

## Giai đoạn 1: Hoàn thiện mẫu "Hành trình đọc hiểu" — ✅

**Commit:** `92c6d1f` · **Test:** 96/96 pass

---

## Giai đoạn 2: Gia cố AI đọc đề — ✅ PART 1

**Commit:** `06cc7ea` · **Test:** 96/96 pass

**Đã làm:**
- ✓ Retry logic (tối đa 2 lần khi 429/5xx/timeout)
- ✓ Backoff: 2s, 5s
- ✓ Báo tiến độ qua onProgress()
- ✓ Không retry khi 400/parse error

**Còn dở:**
- Chia PDF lớn theo trang
- Xử lý khóa API sai

---

**Branch:** `feature/on-tap-kiem-tra`
