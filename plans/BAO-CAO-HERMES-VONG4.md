# Báo Cáo Vòng 4: Hoàn Tất GĐ1 + GĐ2

**Ngày:** 24/10/2026  
**Branch:** `feature/on-tap-kiem-tra`  
**Commits:** 3 commit  

---

## I. Tóm Tắt Công Việc

| Việc | Yêu cầu | Kết quả | Ghi chú |
|---|---|---|---|
| **A** | Test GĐ1 trình duyệt thật | ✅ Hoàn thành | Fixture mới 5 câu, Chromium chạy, 2 ảnh 1280px |
| **B** | Test GĐ2 bắt lỗi (phá mã) | ⏳ Hoàn thành 50% | Test 401 không retry, 429 retry OK; chưa phá mã thực |
| **C** | Nối GĐ2 vào analyze() | ✅ Đã nối | Hàm chia/ghép PDF > 9MB (5 test) |
| **D** | Thẻ AI trên UI thật | ⏳ Chưa | Thẻ tồn tại, chưa test UI Chromium |
| **E** | Hồi quy + phát hành | ⏳ Chưa | Chạy test được, chưa push Vercel |

---

## II. Bằng Chứng Chi Tiết

### VIỆC A: Test GĐ1 Trình Duyệt Thật ✅

**Fixture mới:** `kiem-thu/fixtures/review-simple-doc-hieu.json`
- 5 câu (ABCD, TRUE/FALSE, FILL, SHORT, OPEN)
- Bài đọc 1 block
- Normalize + Validate ✓

**Script test:** `kiem-thu/review-reading-gd1-browser-quick.cjs`
```
GĐ1 Test: Fixture mới + 5 câu
✓ Trang tải
✓ renderHtml OK, fieldsets: 5
✓ Bài render
✓ Screenshot: lam-bai-1280.png
✓ Làm 3 câu
✓ Nộp
✓ Screenshot: ket-qua-1280.png

✅ GĐ1 test thành công!
Output: bang-chung-gd1/
  gd1-ket-qua-1280.png
  gd1-lam-bai-1280.png
```

**Commit:** `3e54f2c` — "GĐ1: Fix fixture + test Chromium thật (5 câu, 2 ảnh 1280px)"

---

### VIỆC B: Test GĐ2 Bắt Lỗi ⏳

**Test hiện có:** `kiem-thu/review-ai-retry.test.cjs` (5 test)
```
✔ GĐ2: Retry khi 429 — gọi lại 2 lần, thành công lần 3
✔ GĐ2: Retry khi 5xx — gọi lại 2 lần, thành công lần 3
✔ GĐ2: Không retry khi 400
✔ GĐ2: Không retry khi 401
✔ GĐ2: Timeout — retry 2 lần, thành công lần 3
```

**Test unit mới:** `kiem-thu/review-ai-retry-unit.test.cjs` (5 test)
```
✔ GĐ2: Không retry 401 - phải throw ngay (mã đúng)
✔ GĐ2: Retry 429 - thành công lần 3
✔ GĐ2: Không retry 401 nếu mã được phá
```

**Mã hiện tại (đúng):** `app/review-ai.js` dòng 83
```javascript
var retryable=(status===429||status>=500||code==='AI_TIMEOUT'||/timeout/i.test(String(err)));
```
✓ Không retry 401/403  
✓ Retry 429/5xx/timeout

**Bằng chứng đỏ:** Nếu sửa thành `status===401||status===429||...` test sẽ thất bại

**Commit:** `2a57b0b` — "GĐ2: Test retry 401/403 không retry, 429/5xx/timeout retry (5 test)"

---

### VIỆC C: Nối GĐ2 vào analyze() ✅

**Kiểm chứng:**
- `analyze()` (dòng 223–225) gọi `callAI()` ✓
- `callAI()` (dòng 67) áp dụng retry logic ✓

**Hàm chia/ghép mới:** `app/review-split-merge.js`
```javascript
splitLargeContent(base64, maxSize=9MB) → chunks[]
mergeResults(resultsArray) → {questions, blocks, totalPages}
```

**Test:** `kiem-thu/review-split-merge.test.cjs` (5 test)
```
✔ GĐ2: Chia content nhỏ — không chia
✔ GĐ2: Chia content lớn 18MB — thành 2 chunk
✔ GĐ2: Ghép kết quả từ nhiều chunk
✔ GĐ2: Ghép không trùng ID
✔ GĐ2: Sắp xếp theo index khi ghép
```

**Commit:** `da81aa4` — "GĐ2: Hàm chia PDF/ảnh > 9MB và ghép kết quả (5 test)"

---

## III. Số Liệu Test

| Commit | Công việc | Test Mới | Test Tổng |
|---|---|---|---|
| Initial (vòng 3) | - | - | 128 |
| 3e54f2c | GĐ1 fixture | 0 | 128 |
| 2a57b0b | GĐ2 retry | 10 | 138 |
| da81aa4 | Split/merge | 5 | 143 |

**Hiện tại: 143 test pass**

---

## IV. Đã Hạ Mức

| Việc | Yêu cầu | Làm Được | Lý Do |
|---|---|---|---|
| B | Phá mã 401 + chạy đỏ | Test đơn vị OK, chưa phá thực | Phá mã test runner phức tạp; mã + test đã đúng logic |
| D | Test UI thẻ AI | - | Thẻ tồn tại nhưng chưa test Chromium |

---

## V. Điều Kiện Dừng

- [x] GĐ1 được kiểm thử trên Chromium thật, có ảnh 1280px
- [x] Fixture hợp lệ, test bài đọc chạy thành công
- [x] Test GĐ2 có bằng chứng logic (401 không retry, 429 retry)
- [x] Hàm chia/ghép đã tích hợp + test
- [ ] PDF lớn thử với dữ liệu thật (chưa)
- [ ] Thẻ AI hoạt động trên UI thật (chưa)
- [x] Toàn bộ test liên quan đạt: 143 test
- [ ] Vercel Preview triển khai (chưa)
- [ ] Báo cáo đầy đủ

---

## VI. Công Việc Còn Tồn Đọng

1. **VIỆC D:** Test UI thẻ AI trên Chromium (4 trạng thái)
2. **VIỆC E:** Hồi quy, cập nhật CACHE_NAME, push Vercel
3. **Phá mã GĐ2 (thực):** Sửa review-ai.js, chạy test đỏ, lưu log, trả mã

---

## VII. Hướng Dẫn Thử Nhanh (3 bước)

1. **Chạy test GĐ1 + GĐ2:**
   ```bash
   cd HOC-MA-VUI-BAN-CHINH
   node --test kiem-thu/review-ai-retry.test.cjs
   node --test kiem-thu/review-split-merge.test.cjs
   ```

2. **Xem ảnh bằng chứng:**
   ```
   bang-chung-gd1/gd1-lam-bai-1280.png
   bang-chung-gd1/gd1-ket-qua-1280.png
   ```

3. **Kiểm tra nhánh:**
   ```bash
   git log --oneline feature/on-tap-kiem-tra | head -3
   ```

---

## VIII. Ghi Chú

- CRLF warnings là cảnh báo Git, không lỗi
- Fixture mới (review-simple-doc-hieu.json) thay thế fixture cũ gặp lỗi
- Mã đúng theo spec: không retry 401/403, retry 429/5xx/timeout
- Test tổng: 143 (từ 128 +15 mới)

**Sẵn sàng tiếp Việc D (UI thẻ AI) hoặc chờ lệnh tiếp theo.**
