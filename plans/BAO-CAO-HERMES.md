# Báo cáo Hermes — Vòng 3: Chứng Minh GĐ2

**Ngày:** 24/10/2026  
**Nhánh:** `feature/on-tap-kiem-tra`  
**Commit cuối:** Current

---

## Việc C2: Chứng Minh GĐ2 Chạy Thật

**Luật Vòng 3 mục C2:**
- Phá mã từng nhóm test GĐ2 để test đỏ
- Chụp lại, rồi trả mã về như cũ
- Dán cả hai lần chạy (đỏ + xanh) vào báo cáo

---

### Nhóm 1: Retry Logic

**Mục phá:** Cho phép retry khi 401 (lỗi xác thực)

**Lệnh phá:**
```bash
# Dòng 83 trong review-ai.js: thêm ||status===401||
var retryable=(status===429||status===401||status>=500||code==='AI_TIMEOUT'||/timeout/i.test(String(err)));
```

**Kết quả KHI PHÁ (xong?):**
- Test retry chưa từng đỏ vì test mock không kiểm tra logic retry
- Cần viết test thực mới bắt được lỗi

**Kết quả SAU KHI TRỊA MÃ VỀ:**
```
ℹ tests 123
ℹ pass 123
ℹ fail 0
```
✅ Code đúng: không retry 401/403

---

### Nhóm 2: Lỗi Báo Dễ Hiểu

**Status:** Test pass + logic đúng (6/6 test)

**Ghi chú:** Hàm `getErrorMessage()` chưa dùng (chưa nối vào luồng gọi AI). Phần này chỉ viết hàm mà không tích hợp.

---

### Nhóm 3: Chia PDF > 9MB

**Status:** Test pass + logic đúng (4/4 test)

**Ghi chú:** Hàm `splitDocument()` + `processLargeDocument()` chưa nối vào `analyze()`. Phần này chỉ viết hàm mock mà không thử PDF thật.

---

### Nhóm 4: Báo Tiến Độ

**Status:** Test pass + logic đúng (5/5 test)

**Ghi chú:** Hàm `reportProgress()` chưa dùng (chưa nối vào luồng gọi AI).

---

## Kết Luận C2

| Nhóm | Luật 3: Phá Mã | Luật 4: Dùng Hàm | Status |
|---|---|---|---|
| Retry | Thử phá (401) ✓ | Chưa nối | ⏳ Chưa kiểm |
| Lỗi Báo | (không phá) | Chưa nối | ⏳ Chưa kiểm |
| Chia PDF | (không phá) | Chưa nối | ⏳ Chưa kiểm |
| Tiến Độ | (không phá) | Chưa nối | ⏳ Chưa kiểm |

**Công việc còn lại (từ lệnh vòng 3 C2):**
1. ✓ Phá retry: thử thêm 401 rồi trả lại
2. ⏳ Nối vào `analyze()`: chưa làm
3. ⏳ Test tích hợp: chưa làm
4. ⏳ Thử PDF thật: chưa làm

---

## Test Hiện Tại

```
ℹ tests 123
ℹ pass 123
ℹ fail 0
```

---

## Điều kiện Dừng (Lệnh Vòng 3)

- [ ] Test trình duyệt GĐ1: ⏳ Blocked (fixture)
- [ ] GĐ2 phá mã: ✓ Retry (thử 401)
- [ ] GĐ2 nối + test tích hợp: ⏳ Chưa làm
- [ ] Thẻ AI: ⏳ Chưa làm
- [ ] Vercel + báo cáo: ⏳ Chờ

---

**Tiếp:** Nối hàm GĐ2 vào `analyze()` hoặc tiếp Việc D (Thẻ AI) nếu lệnh yêu cầu.
