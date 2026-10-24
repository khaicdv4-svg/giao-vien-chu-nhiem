# LỆNH GIAO VIỆC CHO HERMES — Module "Ôn tập và Kiểm tra" của app HỌC MÀ VUI

Ngày giao: 24/10/2026. Người giao: thầy Võ Việt Khái ("thầy Khái"), tổ trưởng chuyên môn khối 4, Trường TH Trần Văn Ơn, TP.HCM.
Người làm trước: Claude. Từ nay Hermes làm tiếp và tự chạy hết các giai đoạn dưới đây. Không cần chờ thầy duyệt từng bước, trừ những việc ghi rõ ở mục 2.

---

## 1. Mục tiêu

Thầy muốn module "Ôn tập và Kiểm tra" trở thành công cụ có AI, làm được 3 việc:

1. **Nhập đề có sẵn** (PDF, Word, ảnh). AI đọc đề, tách câu, có đáp án thì giữ, thiếu đáp án thì tự giải, viết gợi ý. Kết quả là bài tương tác học sinh làm được ngay. Phần này đã chạy.
2. **Tạo mới không cần file**: bài ôn tập, bài kiểm tra theo ma trận, bài học tương tác. Thầy cô chỉ cần chọn lớp, môn, bài, số câu, mức độ.
3. **Xuất nhiều định dạng** từ cùng một học liệu: HTML tương tác (nhiều mẫu), gói SCORM cho QLMS, Word đề in theo mẫu trường kèm đáp án, Word ma trận, bản in PDF, JSON học liệu, và đưa câu hỏi vào Kho câu hỏi / trò chơi của app.

Tinh thần thầy chốt: **"AI làm tất cả. Người dùng xem qua chỗ nào cần sửa thì bấm sửa, lưu lại là xong."** Không thêm bước duyệt bắt buộc. Câu nào AI không chắc thì đánh dấu cho thầy cô nhìn thấy, nhưng không chặn luồng.

---

## 2. Luật cứng — không được vi phạm

- **Không đụng nhánh `main`, không deploy production.** Cả trường đang dùng `main`, và Vercel tự cập nhật website khi `main` thay đổi. Chỉ làm và push trên nhánh `feature/on-tap-kiem-tra`. Gộp vào `main` chỉ khi thầy Khái nói rõ là đồng ý.
- **Không đưa khóa bí mật vào code, commit hay log.** Khóa Gemini do người dùng tự nhập trên trình duyệt (bản web) hoặc để trong `CAI-DAT-AI\khoa-gemini.txt` (bản cài). Khóa publishable của Supabase là khóa công khai, được phép có trong code client.
- **SQL có `delete` hoặc `drop`, hay bất kỳ thay đổi nào trên Supabase thật** (project `hoc-ma-vui`, ref `lpoockzkplvtryahlyhf`): không tự chạy. Ghi câu lệnh vào báo cáo để thầy tự dán.
- **Không nhập dữ liệu học sinh thật.** Kiểm thử dùng dữ liệu giả và profile trình duyệt sạch.
- **Không đổi mẫu HTML pastel đang có** ("Phiếu luyện tập"). Thầy đã chốt đây là mẫu chuẩn: https://claude.ai/artifact/DPvhjKHWQBqzRp7A4aKb1b. Muốn có giao diện mới thì thêm mẫu mới.
- **Không phá các trò chơi đang có**: Kéo co, Ai nhanh hơn, Đường đua, Hộp quà, Lật mảnh ghép, Chinh phục tri thức, Bóng bay, Bình chọn, Bàn tay phép thuật, Giơ tay giành quyền, Quiz Nghiêng Đầu, Chế độ giấy, Vòng quay, Ống kính.
- **Giữ kiểu xuống dòng CRLF** ở những tệp đang dùng CRLF, trong đó có `review-*.js`. Sửa bằng script thì đọc bytes, đổi về LF, sửa xong đổi lại CRLF. Không để git diff báo đổi toàn bộ tệp.
- **Mỗi lần phát hành phải tăng `CACHE_NAME`** ở dòng 1 của `HOC-MA-VUI-BAN-CHINH/app/sw.js`. Nhãn hiện tại là `hmv-ban-chinh-2.45-on-tap-mau-doc-hieu-tv`; nhãn tiếp theo là `2.46-...`, mô tả ngắn bằng chữ không dấu. Tệp mới thêm phải được đưa vào `APP_SHELL`.
- **Không đánh dấu xong khi chỉ có giao diện hoặc mock.** Mỗi giai đoạn đi theo vòng: chạy → kiểm thử → sửa → kiểm thử lại.

### Yêu cầu chuyên môn (áp dụng cho mọi nội dung AI sinh ra)

- Chỉ dùng **sách Kết nối tri thức với cuộc sống, bản mới nhất** (SGK thống nhất năm học 2026–2027). Không trộn bộ sách khác. Bản mới khác bản 2023 chủ yếu ở môn Lịch sử và Địa lí 4.
- **Đề kiểm tra** phải dựa trên ma trận:
  - câu hỏi theo Mức 1/2/3;
  - điểm chia bước 0,5;
  - chỉ hỏi những gì học sinh đã học;
  - câu chữ ngắn, rõ, dùng từ quen thuộc với học sinh miền Nam;
  - không hỏi mẹo, đáp án cụ thể.
- **Đề in (Word)**:
  - trắng đen, Times New Roman cỡ 13, giãn dòng 1,2–1,5;
  - điểm ("…/0,5đ") ở cột trái, nội dung ở cột phải, ngăn bằng một đường dọc;
  - dòng chấm kẻ hết bề ngang;
  - đầu đề giữ nguyên mẫu trường;
  - chỉ ghi "Lớp 4", không ghi 4/1, 4/2;
  - có 2 kiểu trình bày: Gọn (vừa đúng số trang) và Thoáng.
- **Bài đọc Tiếng Việt**:
  - đúng chủ đề và đủ số tiếng theo thể loại (sai số ±5 tiếng với đọc thành tiếng, ±10 tiếng với đọc hiểu);
  - có tác giả và nguồn;
  - không lấy bài đã có trong SGK đang dùng;
  - AI không được bịa nguồn. Không chắc thì ghi "cần thầy cô kiểm tra nguồn".
- **Lời văn hiển thị cho giáo viên và học sinh**: tự nhiên như người thật viết, không sáo rỗng kiểu máy.

---

## 3. Lấy mã nguồn và chạy

```bash
git clone https://github.com/khaicdv4-svg/giao-vien-chu-nhiem.git
cd giao-vien-chu-nhiem
git checkout feature/on-tap-kiem-tra      # commit mới nhất lúc giao: 4d030de
```

- **Cấu trúc**: app tĩnh (PWA, HTML/JS thuần, không framework, không bước build). Vercel phục vụ thư mục `HOC-MA-VUI-BAN-CHINH/app` (xem `vercel.json`).
- **Link thử** của nhánh, cố định, Vercel tự dựng lại sau mỗi lần push:
  https://giao-vien-chu-nhiem-git-feature-cb2347-khaicdv4-9703s-projects.vercel.app/
- **Xem trạng thái deploy** (khi Vercel API trả lỗi 403):
  ```bash
  id=$(gh api "repos/khaicdv4-svg/giao-vien-chu-nhiem/deployments?sha=$(git rev-parse HEAD)" --jq '.[0].id')
  gh api repos/khaicdv4-svg/giao-vien-chu-nhiem/deployments/$id/statuses --jq '.[0].state'
  ```
- **Chạy trên máy**: `node HOC-MA-VUI-BAN-CHINH/server.cjs`, hoặc `MO-HOC-MA-VUI.cmd` trên Windows. AI chạy qua `ai-server.cjs`.
- **Kiểm thử**: Node 22 và Playwright có Chromium. Lệnh chạy:
  ```bash
  cd HOC-MA-VUI-BAN-CHINH
  node --test kiem-thu/review-*.test.cjs                      # lúc giao: 92/92 đạt
  HMV_EVIDENCE_DIR=/tmp/ev node kiem-thu/review-ai-word-browser.cjs
  HMV_EVIDENCE_DIR=/tmp/ev node kiem-thu/review-import-school-docx-browser.cjs
  HMV_EVIDENCE_DIR=/tmp/ev node kiem-thu/review-combined-browser.cjs
  # các tệp kiem-thu/review-*-browser.cjs khác chạy cùng cách
  ```
  - Các bài kiểm thử trình duyệt bắt buộc có biến `HMV_EVIDENCE_DIR`.
  - `review-html-offline.cjs` đang lỗi từ trước: Chromium headless đặt tên file tải về là "download" thay cho tên tiếng Việt. Lỗi này không do thay đổi mới. Sửa được thì tốt, không thì ghi chú lại.
  - `review-online-submit` cần tệp `google-apps-script/NhanBai.gs`.
- **Gọi AI trong kiểm thử**: luôn dùng AI giả lập. `review-ai-word-browser.cjs` có sẵn mock cho `/api/ai/generate` và `/api/ai/status`. Chỉ gọi Gemini thật khi người dùng cung cấp khóa qua biến môi trường, và không lưu khóa vào đâu cả.

**Tài liệu nên đọc trước**:
- `HOC-MA-VUI-BAN-CHINH/DOC-TRUOC.md` (nhật ký phiên bản);
- `plans/on-tap-kiem-tra.md` (hợp đồng dữ liệu và các giai đoạn gốc);
- `plans/qlms-integration-contract.md`;
- `docs/PROJECT_CONTEXT.md` và `docs/IMPLEMENTATION_PLAN.md`.

---

## 4. Hiện trạng (đến commit 4d030de)

| Tệp (trong `HOC-MA-VUI-BAN-CHINH/app`) | Vai trò |
|---|---|
| `review-domain.js` | Hợp đồng học liệu: `normalizeDocument`, `validateQuestion`, `validateDocument`, chấm bài `submitAttempt`. 8 dạng câu: ABCD, SINGLE, MULTI, TRUEFALSE (`statements`), FILL (chỗ trống `[[n]]`), SHORT, OPEN (`metadata.answerLayout`, ví dụ vở ô li `grid-calculation`), MATCHING (`pairs`). |
| `review-import.js` | Đọc DOCX/TXT/PDF chữ, mẫu đề trường (`schoolTemplate`). Dùng làm đường lui khi AI lỗi. |
| `review-ai.js` (`window.HmvReviewAi`) | `analyze`: gửi tệp cho Gemini và nhận JSON theo `SCHEMA`, rồi `toDocument`. Sau đó `fillMissing` giải câu thiếu đáp án (lô 12 câu) và `generateHints` viết gợi ý (lô 15 câu, tier `fast`). Trạng thái đáp án lưu ở `metadata.aiAnswer` (key/suggested/missing/none/checked). `decorate` gắn nhãn "✨ AI giải", "Chưa có đáp án", "Cần hình vẽ". |
| `review-word.js` (`window.HmvReviewWord`) | `renderDocx(doc,{layout:'compact'\|'roomy',minutes})`: đề in mẫu trường và trang đáp án. OOXML viết tay, nén bằng `zipStore`. |
| `review-html.js` | `createPractice` và `renderHtml`: bài HTML một tệp, chạy offline. Hai mẫu: `worksheet` (Phiếu luyện tập pastel, mặc định) và `reading` (Hành trình đọc hiểu, dựng theo file BoCongAnh.html). Chọn mẫu qua `metadata.htmlTheme`; nếu để trống thì môn Tiếng Việt có bài đọc tự dùng `reading`. Có nghe đọc đề và bài đọc (Web Speech), nút gợi ý (`metadata.hint`, không lộ đáp án), "📖 Hướng dẫn làm bài". `renderScormPackage` tạo gói SCORM. Ràng buộc: tệp HTML xuất ra chỉ có **đúng 2 thẻ `<script>`**, có test kiểm tra chống XSS. Hàm phụ phải nhúng vào script thứ hai, đặt trước `(${runtime})(data)`. |
| `review-ui.js` | Trình biên tập: khung tải đề (kéo thả, ô "✨ Dùng AI đọc đề"), nút "AI đọc lại đề", "AI điền đáp án còn thiếu", "AI viết gợi ý". Khung **"✅ Bài tương tác đã sẵn sàng"** (`showReady`) nhúng bài làm thử và có các nút tải HTML / SCORM / Word / Sửa. Ô chọn mẫu `#rv-html-theme`, ô thời gian `#rv-duration` (`metadata.duration`). |
| `ai-tren-web.js`, `tro-ly-ai.js`, `../ai-server.cjs` | Đường gọi AI `./api/ai/generate`, body `{system, contents, json, schema, tier, temperature, maxOutputTokens, timeoutMs}`. Trên web dùng `hmvAiFetch` với khóa của từng trình duyệt; trên máy dùng ai-server. |
| `kho-cau-hoi.js`, `question-quick-stage6.js` | Kho câu hỏi và cầu nối sang trò chơi (`hmvC6PlayBankSet`). Tái sử dụng, không tạo kho thứ hai. |

**Còn dở hoặc chưa có**:
- Chưa thử với khóa Gemini thật (mới chạy mock).
- Màn kết quả của mẫu `reading` còn là màn chung. Chưa có lời khuyên riêng cho từng câu tự luận, nút "Làm lại bài", nút "In kết quả" như file mẫu.
- Chưa có chức năng tạo bài từ chủ đề, tạo bài học, tạo ma trận.
- Phần B2b (trang giáo viên / học sinh trực tuyến, Google OAuth, Supabase) đang chờ thầy cấu hình OAuth. **Không làm phần này** khi chưa có cấu hình.

---

## 5. Lộ trình — làm tuần tự, tự chuyển giai đoạn khi đạt

### GĐ1. Hoàn thiện mẫu "Hành trình đọc hiểu"
- Màn kết quả giống file mẫu:
  - điểm lớn;
  - danh sách xem lại từng câu;
  - mỗi câu tự luận có lời khuyên ngắn (lấy từ `metadata.hint` hoặc `explanation`, AI viết sẵn lúc tạo);
  - nút "🔁 Làm lại bài" và "🖨️ In kết quả", có CSS `@media print` trắng đen.
- Kiểm thử trên khung desktop 1280 và mobile 390, có ảnh chụp làm bằng chứng. Fixture: `kiem-thu/fixtures/review-tiengviet4-doc-hieu.json`.

### GĐ2. Gia cố AI đọc đề
- Gọi lại tối đa 2 lần khi lỗi 429/5xx hoặc hết thời gian, giãn thời gian chờ giữa các lần.
- PDF hoặc ảnh nhiều trang quá giới hạn `MAX_INLINE` (9 MB): tự chia theo trang và ghép kết quả.
- Báo tiến độ theo bước: "Đang đọc trang 2/5", "Đang giải 8 câu thiếu đáp án".
- Lỗi phải nói bằng lời dễ hiểu và kèm cách xử lý. Ví dụ: hết lượt miễn phí thì đợi 1 phút, sai khóa thì bấm lấy khóa mới.
- Viết test cho từng trường hợp lỗi.

### GĐ3. "Tạo bài ôn tập / bài kiểm tra từ chủ đề" (không cần file)
- Thêm lựa chọn thứ hai bên cạnh khung tải đề.
- Thầy cô nhập:
  - lớp (mặc định 4), môn, bài hoặc chủ đề KNTT;
  - số câu, tỉ lệ Mức 1/2/3, các dạng câu, tổng điểm, thời gian;
  - có thể dán thêm nội dung bài học hoặc đính kèm file để AI bám theo.
- AI sinh học liệu đúng `SCHEMA` (đủ đáp án, gợi ý, hướng dẫn chấm cho câu tự luận) rồi đi vào luồng sẵn có: `decorate` → khung "Bài tương tác đã sẵn sàng".
- Tiếng Việt có bài đọc: AI tự soạn bài đọc mới hoặc thầy cô dán bài vào. Ghi rõ nguồn, đếm số tiếng, cảnh báo khi lệch chuẩn.
- Kiểm tra sau khi sinh (bằng code, không tin hoàn toàn vào AI):
  - tổng điểm khớp;
  - điểm chia bước 0,5;
  - số câu theo mức đúng tỉ lệ;
  - không có câu trùng;
  - câu trắc nghiệm có đúng một đáp án (trừ dạng MULTI).

### GĐ4. Ma trận → đề → đáp án
- Nhập ma trận chung của tổ (Word hoặc Excel, hoặc nhập tay trên bảng): mạch / chủ đề, số tiết, số câu và điểm theo mức và dạng.
- AI lập ma trận riêng cho đề, sau đó sinh đề khớp đúng ma trận, sau đó sinh đáp án và hướng dẫn chấm.
- Xuất Word:
  - bảng ma trận;
  - đề in mẫu trường (đã có, kiểu Gọn và Thoáng);
  - đáp án và hướng dẫn chấm.
- Có bảng đối chiếu ma trận ↔ đề, ô nào lệch thì tô đỏ.

### GĐ5. "Bài học tương tác"
- Học liệu kiểu bài học: các khối nội dung (mục tiêu, lý thuyết ngắn, ví dụ, hình) xen với câu luyện tập, có nghe đọc và gợi ý.
- Thêm mẫu HTML thứ ba `lesson` vào `review-html.js` và ô chọn mẫu. Không đụng tới `worksheet` và `reading`.
- AI tạo bài học từ tên bài KNTT, hoặc từ file giáo án hay trang sách thầy cô tải lên.

### GĐ6. Xuất đủ định dạng từ một nút "Xuất"
Gom mọi định dạng vào một bảng chọn:
- HTML (chọn mẫu);
- SCORM 1.2 cho QLMS (kiểm tra mở được trong trình chạy SCORM);
- Word đề và đáp án;
- Word ma trận;
- PDF (in từ HTML bằng CSS in, không cần thư viện ngoài);
- JSON học liệu (để sao lưu hoặc chia sẻ giữa giáo viên);
- "Đưa vào Kho câu hỏi" để dùng ngay trong trò chơi. Qua cầu nối có sẵn, báo số câu dùng được và số câu bị loại kèm lý do.

### GĐ7. Hoàn thiện và bàn giao
- Chạy toàn bộ kiểm thử hồi quy, cả `review-*` và các test trò chơi trong `kiem-thu/`.
- Cập nhật `DOC-TRUOC.md` (mục cập nhật mới ở đầu) và `plans/on-tap-kiem-tra.md`.
- Viết `plans/BAO-CAO-HERMES.md` cho thầy (mẫu ở mục 7).
- **Dừng ở đây.** Không gộp vào `main`. Ghi trong báo cáo các việc cần thầy quyết: gộp `main` (main đã có thêm vài commit trò chơi sau khi tách nhánh, phải merge cẩn thận), cấu hình OAuth cho B2b.

---

## 6. Cách làm việc tự động

- Mỗi giai đoạn: đọc code liên quan, viết test trước (đỏ), làm cho đạt (xanh), chạy lại toàn bộ `node --test kiem-thu/review-*.test.cjs`, chạy kiểm thử trình duyệt liên quan, tăng `CACHE_NAME`, rồi commit và push lên `feature/on-tap-kiem-tra`, xác nhận Vercel dựng xong (`success`).
- **Commit**:
  - tác giả `Võ Việt Khái <khaicdv4@gmail.com>`;
  - thông điệp tiếng Việt, ngắn, bắt đầu bằng "Ôn tập và Kiểm tra: …";
  - mỗi giai đoạn là một hoặc vài commit nhỏ, không gộp lẫn.
- **Ghi nhật ký** sau mỗi giai đoạn vào `plans/BAO-CAO-HERMES.md`: đã làm gì, test nào đạt hoặc lỗi, commit nào, link thử. Thầy có thể mở xem bất cứ lúc nào.
- **Gặp vướng**:
  - Thiếu thông tin chuyên môn: chọn phương án hợp lý nhất theo mục 2, ghi rõ giả định trong báo cáo rồi làm tiếp.
  - Thiếu quyền hoặc dịch vụ (khóa Gemini thật, QLMS, OAuth): bỏ qua phần đó, ghi lại, chuyển sang việc khác.
  - Một lỗi sửa 3 lần không xong: ghi lại và chuyển tiếp, không lặp vô hạn.
- **Giao diện**:
  - chữ tiếng Việt có dấu đầy đủ;
  - nút to, rõ, dùng tốt trên điện thoại và máy chiếu lớp học;
  - mọi lời nhắn viết như cô giáo nói với học sinh hoặc đồng nghiệp, không dùng từ kỹ thuật.
- **Hai bản code**: thư mục `D:\DỰ ÁN HỌC MÀ VUI\hoc-ma-vui` trên máy thầy là bản cũ hơn. Không làm ở đó. Nhánh GitHub là bản duy nhất.

---

## 7. Mẫu báo cáo cuối (`plans/BAO-CAO-HERMES.md`)

```
# Báo cáo Hermes — Ôn tập và Kiểm tra (ngày …)
Link thử: …   Commit cuối: …   CACHE_NAME: …
## Đã xong (theo giai đoạn) — mỗi dòng: chức năng · thầy thử ở đâu · bằng chứng test
## Chưa xong / bỏ qua và lý do
## Giả định đã tự quyết
## Cần thầy làm / quyết định
## Cách thầy thử nhanh (3–5 bước)
```

Viết báo cáo ngắn gọn, tự nhiên, để thầy Khái đọc xong là biết ngay cần bấm vào đâu.
