# HỌC MÀ VUI · BẢN CHÍNH 2.8

**Ngày:** 11/10/2026 · **Nhãn bản dựng:** `HMV-BAN-CHINH-2.8-20261011`

Đây là bản hợp nhất duy nhất. Nó gồm toàn bộ nội dung của các bản thử trước (03B → 09, Chặng 1 → 7B) cùng ba phần mới: Quiz Nghiêng Đầu hoàn chỉnh, Kho câu hỏi thiết kế lại và 140 câu hỏi mẫu.

**Trạng thái: ĐẠT kiểm thử phần mềm trên trình duyệt – CHỜ THẦY NGHIỆM THU.** Bản này chưa chạy trên Chrome của máy thầy và camera chưa thử với webcam thật (xem mục 5).

## 0. Cập nhật 2.8 (22 giờ ngày 11/10/2026) – Chuẩn bị đưa lên GitHub và Vercel

Thầy yêu cầu lưu bản chính lên GitHub (`khaicdv4-svg/giao-vien-chu-nhiem`, nhánh `main`) và để Vercel (`giao-vien-chu-nhiem.vercel.app`) lấy bản mới từ đó.

### 1. Bản trên web khác bản trên máy ở đâu
- Vercel chỉ phát các tệp trong `app\`. **Không có máy chủ nội bộ** (`server.cjs`, `ai-server.cjs`) nên trên web **không có AI Gemini**: không tạo câu hỏi bằng AI, không rà soát, không Trợ lý Sư phạm, không giọng đọc Gemini. Các phần đó chỉ có ở bản mở bằng `MO-HOC-MA-VUI.cmd` trên máy.
- Mọi phần khác chạy trên web: trò chơi, Kho câu hỏi và 7 bộ mẫu, camera (Bình chọn ngón tay, Bóng bay, Nghiêng Đầu – bộ nhận diện tải từ máy chủ chính thức của MediaPipe nên lần đầu cần mạng), âm thanh, Phân tích sau trò chơi, sao lưu. Đọc to câu hỏi dùng được nếu máy người xem có giọng tiếng Việt.
- Dữ liệu (học sinh, câu hỏi, điểm) vẫn chỉ nằm trong trình duyệt của từng máy; không có gì được gửi lên GitHub hay Vercel.

### 2. Thay đổi trong ứng dụng
- Khi ứng dụng mở từ địa chỉ web (không phải `localhost`/`127.0.0.1`) và không có máy chủ AI: mục Trợ lý AI ghi rõ **“Bản trên web chưa có AI Gemini… chỉ chạy ở bản cài trên máy tính”** thay cho lời nhắc “khởi động lại máy chủ”.
- Trên web **không hiện ô dán khóa Gemini** (không mời ai dán khóa vào một trang công khai). Cách soạn câu hỏi bằng dán ChatGPT vẫn còn.
- Bản trên máy thầy (cổng 8780) không đổi cách hoạt động.

### 3. Những gì đưa lên GitHub – và không đưa
- Đưa lên: thư mục `HOC-MA-VUI-BAN-CHINH\` gồm `app\`, `server.cjs`, `ai-server.cjs`, các tệp `.cmd`/`.ps1`, `DOC-TRUOC.md`, `SHA256SUMS.txt`, các bài kiểm thử trong `kiem-thu\`; ở gốc kho thêm `.gitignore`, `vercel.json` và một đoạn trong `README.md`.
- **Không đưa lên** (đã ghi trong `.gitignore`): `CAI-DAT-AI\` (khóa Gemini), `runtime\` (node.exe), `backups\`, nhật ký máy chủ, bộ nhận diện camera đã tải về (`app\vendor\`), các gói thử cũ, tệp `.zip`.
- Kho GitHub này **công khai**: ai cũng xem được mã nguồn và các tệp âm thanh, hình ảnh trong gói.
- Bản cũ “GIÁO VIÊN CHỦ NHIỆM V1.0” ở gốc kho được giữ nguyên; trang Netlify cũ (nếu còn nối) vẫn chạy bản cũ đó.

### 4. Địa chỉ Vercel đổi từ bản cũ sang bản mới
- `giao-vien-chu-nhiem.vercel.app` trước đây chạy bản cũ. Sau khi đẩy lên, cùng địa chỉ đó chạy HỌC MÀ VUI. Ai đã dùng trang cũ trên máy nào thì dữ liệu trong trình duyệt của máy đó được bản mới đọc tiếp.
- Đã thử trên máy chủ giả lập: lưu học sinh, điểm thi đua, câu hỏi ở bản cũ rồi đổi sang bản mới ở cùng địa chỉ → còn nguyên, không khóa dữ liệu nào bị xóa, mở lại lần đầu đã thấy bản mới.

### Tệp
- Thay đổi: `app\tro-ly-ai.js`, `app\doc-to.js` (lời báo trên web), `app\index.html` và `MO-HOC-MA-VUI.ps1` (nhãn), `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.8`). Mới: `kiem-thu\t-web.cjs`, `kiem-thu\static.cjs`. Bản trước nằm ở `backups\truoc-2.8\`.

### Kiểm thử bản 2.8 – và phần CHƯA kiểm
- `kiem-thu\t-web.cjs`: 16/16 – nâng cấp từ bản cũ ở cùng địa chỉ (8 phép thử), mở trang web lần đầu, lời báo AI, không có ô dán khóa, một trò chơi có tiếng đúng/sai, xin camera, chạy khi mất mạng. Đây là máy chủ tệp tĩnh **giả lập** trên máy thử, không phải Vercel thật.
- Chạy lại toàn bộ bài cũ trên bản 2.8: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, tên 55/55, AI 58/58, Bình chọn 43/43, Phân tích 28/28, Tiếng mừng 25/25, Đọc to 66/66, Bố cục 22/22, Tự chấm/tự đếm 18/18, Tiếng đúng/sai 26/26.
- **Chưa kiểm:** trang Vercel thật sau khi triển khai (chỉ kiểm được sau khi đẩy mã lên); camera và âm thanh thật trên trang web; tải bộ nhận diện camera từ mạng ở lớp học.

## 0-17. Cập nhật 2.7 (21 giờ ngày 11/10/2026) – Tiếng ĐÚNG / SAI khi chấm câu trả lời, ở mọi trò chơi

Thầy yêu cầu chọn trong thư mục `D:\THƯ VIỆN ÂM THANH\ÂM THANH HIEU ỨNG` một tiếng “đúng” và một tiếng “sai” rồi thêm vào tất cả trò chơi.

### 1. Hai tiếng được chọn
- **ĐÚNG:** `dung.mp3` của thầy → `app\assets\audio\tra-loi-dung.mp3`. **SAI:** `sai.mp3` của thầy → `app\assets\audio\tra-loi-sai.mp3`.
- **Tôi không nghe được âm thanh.** Tôi chọn theo tên tệp thầy đặt và theo số đo (độ dài, độ to, hình phổ), không theo cảm nhận bằng tai. Thầy cần nghe lại; không hợp thì báo, tôi đổi tệp khác.
- Hai tệp trong gói là **bản cắt gọn** (mỗi tệp khoảng 2,4 giây, cùng độ to), tệp gốc của thầy trong ổ D không bị đụng tới:
  - `dung.mp3` (dài 4,2 giây): bỏ 0,12 giây im lặng đầu, giữ 2,4 giây đầu, nhỏ dần ở cuối.
  - `sai.mp3` (dài 4,6 giây): phần đầu là gần 1 giây tiếng dạo nhỏ, tiếng chính tới sau khoảng 1,1 giây. Nếu để nguyên, học sinh chọn sai hơn 1 giây sau mới nghe thấy. Bản trong gói bắt đầu ngay trước tiếng chính, giữ 2,4 giây, nhỏ dần ở cuối.
- Không chọn: các tệp gắn thương hiệu (Discord, NFL, Mario), tệp lời nói trêu chọc (`đồ ngốc.mp3`, `Sai sai sai.mp3`, tiếng cười) vì không hợp để phát mỗi lần học sinh trả lời sai.
- Nguồn gốc và quyền sử dụng các tệp trong thư viện của thầy tôi không kiểm được.

### 2. Tiếng vang lên lúc nào
| Trò chơi | Lúc phát | Bật/tắt theo |
|---|---|---|
| Kéo co kiến thức | chọn đáp án (hoặc thầy xác nhận đúng/sai, hết giờ) | nút “Tiếng” của trò |
| Ai nhanh hơn | đội giành quyền trả lời đúng / sai / hết giờ | nút “Tiếng” của trò |
| Hộp quà bí mật | lúc máy chấm (gần 1 giây sau khi chọn) hoặc thầy xác nhận | công tắc âm thanh chung |
| Đường đua kiến thức | thầy xác nhận đúng / sai, hết giờ | công tắc âm thanh chung |
| Quiz Nghiêng Đầu | lúc ghi nhận đáp án | công tắc âm thanh chung |
| Ai là triệu phú | lúc công bố đáp án (2 giây sau khi chọn) | công tắc âm thanh chung |
| Bóng bay tri thức | chạm bóng đúng / sai, hết giờ | mục “Âm thanh” của trò |
| Bình chọn ngón tay | hết giờ đếm bằng camera, câu có đáp án: đáp án đúng nhiều phiếu nhất → ĐÚNG, ngược lại → SAI | mục “Âm thanh” của trò |

- Vòng quay kết nối không có câu trả lời nên không thêm. Bình chọn kiểu “Hỏi nhanh” (không có đáp án đúng) và khi thầy nhập phiếu bằng phím số: giữ tiếng báo cũ.
- Hộp quà và Đường đua phát cả khi ô “Tiếng hiệu ứng” của trò còn tắt theo mặc định (giống tiếng mừng chiến thắng ở bản 2.3).
- Tiếng “bíp” điện tử cũ lúc đúng/sai được thay bằng hai tệp này; không phát được tệp thì máy tự dùng lại tiếng bíp cũ.
- Không chồng tiếng: câu sau được chấm thì tiếng trước tắt; tiếng mừng chiến thắng vang lên thì tiếng đúng/sai nhường chỗ; máy cất giọng đọc câu kế tiếp thì tiếng đang ngân tự tắt.

### Tệp
- Mới: `app\dung-sai.js`, `app\assets\audio\tra-loi-dung.mp3`, `app\assets\audio\tra-loi-sai.mp3`, `kiem-thu\t-dung-sai.cjs`.
- Thay đổi: `app\index.html` (lời gọi ở 6 trò, không đổi cách chấm điểm), `app\bong-bay.js`, `app\binh-chon.js`, `app\mung-chien-thang.js`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.7`), `MO-HOC-MA-VUI.ps1` (nhãn). Bản trước nằm ở `backups\truoc-2.7\`.
- Hai tệp mp3 trên máy thầy lớn hơn bản trong kho thử vài nghìn byte vì công cụ chuyển tệp tự gắn nhãn nguồn gốc; phần âm thanh không đổi.

### Kiểm thử bản 2.7 – và phần CHƯA kiểm
- `kiem-thu\t-dung-sai.cjs`: 26/26 – từng trò phát đúng tệp vào đúng lúc, tắt tiếng của trò thì không phát, không chồng tiếng, phối hợp với tiếng mừng và giọng đọc, thiếu tệp thì dùng tiếng cũ, chạy được khi ngắt mạng. Camera, bàn tay và giọng đọc trong bài này là giả lập.
- Chạy lại toàn bộ bài cũ: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, tên 55/55, AI 58/58, Bình chọn 43/43, Phân tích 28/28, Tiếng mừng 25/25, Đọc to 66/66, Bố cục 22/22, Tự chấm/tự đếm 18/18.
- **Chưa kiểm:** tiếng thật qua loa (trình duyệt thử không có loa): hai tiếng nghe có hợp không, chỗ cắt có gọn không, độ to so với nhạc nền và giọng đọc. Chờ thầy nghe thử.

## 0-16. Cập nhật 2.6 (20 giờ 30 ngày 11/10/2026) – Bình chọn tự đếm sau khi đọc xong; Hộp quà tự chấm

### 1. Bình chọn ngón tay: máy đọc xong câu hỏi thì tự bắt đầu đếm ngược
- Khi máy đọc xong câu hỏi (thầy bấm nút loa, hoặc đang bật “Tự đọc khi sang câu mới”), trò chơi **tự bắt đầu đếm ngược** đủ số giây đã đặt, không cần bấm “Bắt đầu đếm”. Hết giờ tự chốt kết quả như cũ.
- Kết hợp “Tự đọc khi sang câu mới”: sang câu → máy đọc → tự đếm → hiện kết quả; thầy chỉ bấm “Câu tiếp theo”.
- Không tự đếm khi: thầy bấm dừng giữa chừng (máy chưa đọc xong); câu đó đã có kết quả; đang dùng cách “thầy cô nhập phiếu” (không có camera). Camera còn đang mở thì chờ tối đa 6 giây.
- Thiết lập của trò có thêm mục **“Sau khi máy đọc xong câu hỏi”**: *Tự bắt đầu đếm* (mặc định) / *Chờ thầy cô bấm*.

### 2. Hộp quà bí mật: tự chấm khi chọn đáp án
- Với câu có đáp án đúng (A–B–C–D, Đúng/Sai): bấm (hoặc gõ phím A–D) là chấm ngay. Phương án vừa chọn hiện **xanh ✓** nếu đúng, **đỏ ✗** nếu sai trong gần 1 giây để cả lớp kịp nhìn, rồi trò chơi tự chấm: đúng thì cộng điểm và mở phần quà; sai thì báo “Chưa đúng” (không lộ đáp án đúng, vì hộp chưa mở còn được chọn lại).
- Hai nút “Xác nhận đúng / Xác nhận sai” được thay bằng ghi chú “Tự chấm”. Nút “Chuyển quyền” vẫn còn.
- Câu không có đáp án đúng để so (trả lời ngắn, câu mở) vẫn do giáo viên bấm Xác nhận.
- Thiết lập của trò có ô **“Tự chấm khi chọn đáp án”** (mặc định bật); tắt đi thì như bản trước.
- Lượt tự chấm vẫn được ghi cho “Phân tích sau trò chơi”.
- **Đường đua kiến thức** vẫn chấm bằng nút Xác nhận như cũ (thầy chưa yêu cầu đổi).

### Tệp
- Thay đổi: `app\index.html` (hàm chọn đáp án của Hộp quà, ô thiết lập; không đổi cách tính điểm), `app\binh-chon.js`, `app\doc-to.js` (báo “đã đọc xong” cho trò chơi), `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.6`), `MO-HOC-MA-VUI.ps1` (nhãn). Bản trước nằm ở `backups\truoc-2.6\`.

### Kiểm thử bản 2.6 – và phần CHƯA kiểm
- `kiem-thu\t-tu-dong.cjs`: 18/18 – Hộp quà: chấm đúng, chấm sai, bấm thêm trong lúc chờ, đóng câu hỏi lúc đang chờ, tắt/bật tự chấm, bộ Đúng/Sai; Bình chọn: đọc xong tự đếm, dừng giữa chừng, đã có kết quả, tự đọc + tự đếm cả một câu, “Chờ thầy cô bấm”, không dùng camera. Giọng đọc, camera và bộ nhận diện bàn tay trong bài này đều là giả lập.
- Chạy lại toàn bộ bài cũ: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, tên 55/55, AI 58/58, Bình chọn 43/43, Phân tích 28/28, Tiếng mừng 25/25, Đọc to 66/66, Bố cục 22/22.
- **Chưa kiểm:** với giọng Gemini thật và webcam thật trên máy thầy (thời điểm bắt đầu đếm có khớp lúc giọng dứt không); chờ thầy thử.

## 0-15. Cập nhật 2.5 (19 giờ 45 ngày 11/10/2026) – Bố cục vừa màn hình: Hộp quà bí mật, Bình chọn ngón tay

Sửa hai lỗi thầy báo, và hai chỗ cùng nguyên nhân tôi thấy khi đo lại.

### 1. Hộp quà bí mật – toàn màn hình bị mất phần câu hỏi
- **Nguyên nhân:** 8 hộp quà lớn chiếm gần hết chiều cao, câu hỏi bị đẩy xuống dưới mép màn hình (chỉ màn hình cao từ khoảng 930 px mới thấy).
- **Đã sửa:** khi câu hỏi (hoặc phần quà, hoặc bảng kết quả) đang mở, các hộp quà **thu nhỏ thành một dải** nằm cạnh thẻ người chơi; câu hỏi, 4 phương án và nút Xác nhận nằm ngay bên dưới; các nút phụ (Hoàn tác, Mở thủ công, Kết thúc) chuyển xuống sau câu hỏi. Hộp đang mở được viền tím. Lúc chọn hộp, hộp quà vẫn lớn như cũ.
- Áp dụng cho cả chế độ thường (trước đây cũng phải cuộn xuống mới thấy câu hỏi).
- Lời nhắc “Chọn một hộp quà” không còn bị gắn nút loa (nó không phải câu hỏi).

### 2. Bình chọn ngón tay – chỉ hiện 3 lựa chọn, bị che mất 1
- **Nguyên nhân:** danh sách phương án nằm trong một vùng cuộn ẩn có chiều cao cố định; trên màn hình thấp, hàng thứ tư nằm ngoài vùng nhìn thấy.
- **Đã sửa:** bỏ vùng cuộn ẩn. Các hàng phương án **tự co theo chiều cao màn hình** (từ 84 px xuống còn khoảng 40 px; trên màn hình thấp biểu tượng bàn tay và chữ A–D xếp ngang, nút + − xếp ngang). Nếu câu hỏi rất dài trên màn hình rất thấp, khung tự cao thêm (trang cuộn) chứ không che phương án.

### 3. Cùng nguyên nhân, sửa luôn
- **Đường đua kiến thức:** khi có câu hỏi, mỗi làn đua gọn thành một hàng (tên đội – đường đua – thống kê) để câu hỏi nằm trong màn hình.
- **Ai nhanh hơn** trên màn hình thấp (cao dưới 720 px): thanh công cụ, thẻ đội, dải “Bấm chuông” và phương án gọn hơn. Màn hình cao hơn giữ nguyên như cũ.

### Còn lại, chưa sửa
- Ở chế độ thường (không bấm Toàn màn hình) trên màn hình thấp, Kéo co, Ai nhanh hơn và Bóng bay vẫn phải cuộn mới thấy hết, vì phần đầu trang của ứng dụng chiếm chỗ. Khi chơi nên bấm **⛶ Toàn màn hình**.
- Bóng bay toàn màn hình ở 1280×600: mép dưới quả bóng lệch khỏi màn hình khoảng 6 px.

### Tệp
- Thay đổi: `app\ban-chinh.css` (toàn bộ phần bố cục), `app\binh-chon.js` (cách tính chiều cao khung), `app\doc-to.js` (lời nhắc Hộp quà không gắn nút loa), `app\index.html` (chỉ đổi nhãn bản dựng), `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.5`), `MO-HOC-MA-VUI.ps1` (nhãn). Không đổi luật chơi, điểm số. Bản trước nằm ở `backups\truoc-2.5\`.

### Kiểm thử bản 2.5 – và phần CHƯA kiểm
- `kiem-thu\t-bo-cuc.cjs`: 22/22 – đo vị trí thật của câu hỏi, phương án, nút ở 5 cỡ màn hình (1280×600, 1366×650, 1536×730, 1774×934, 1920×950), chế độ thường và toàn màn hình, câu hỏi ngắn và dài, lúc chọn hộp / mở câu hỏi / phần quà / kết quả, lúc đếm / kết quả bình chọn.
- Chạy lại toàn bộ bài cũ: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, tên 55/55, AI 58/58, Bình chọn 43/43, Phân tích 28/28, Tiếng mừng 25/25, Đọc to 66/66. (Bài Bóng bay: thêm 0,2 giây chờ trước khi đo “nhạc đã tắt” vì bài đo quá sớm, không phải lỗi ứng dụng.)
- Màn hình máy thầy (đọc được qua khung trình duyệt của Claude): rộng 1280 × cao 800 điểm, phóng to 150%. Đã đo thêm ở 1280×620, 1280×665, 1280×720 (cửa sổ trình duyệt thường) và 1280×800 (toàn màn hình): ở chế độ toàn màn hình cả bảy trò có câu hỏi đều hiện đủ câu hỏi và phương án; Bình chọn ngón tay ở chế độ thường hiện đủ 4 phương án.
- **Chưa kiểm:** chưa xem bằng mắt trên Chrome của thầy (khung trình duyệt của Claude đang ẩn nên không đo bố cục trực tiếp trên máy thầy được); chờ thầy xem trên máy thật.

## 0-14. Cập nhật 2.4 (19 giờ 11/10/2026) – Đọc to: bỏ lời dẫn, chờ đọc xong mới tính giờ, chỉnh tốc độ ngay trong trò chơi

Thầy đã nối được Gemini bằng khóa dạng `AQ.` và nghe được giọng AI đọc câu hỏi. Bản này sửa theo ba góp ý của thầy.

### 1. Đọc thẳng nội dung câu hỏi, bỏ lời dẫn
- **Nguyên nhân:** máy chủ nội bộ gắn lời dặn “Đọc rõ ràng, chậm rãi, thân thiện bằng tiếng Việt cho học sinh tiểu học:” lên trước câu hỏi rồi mới gửi cho giọng AI, và giọng AI đọc luôn cả lời dặn. Lỗi của tôi.
- **Đã sửa:** chỉ gửi đúng nguyên câu đang hiện trên màn hình. Quiz Nghiêng Đầu cũng không còn đọc thêm “Đúng hay sai?”; “Nghe thử” không còn lời chào.
- Các câu AI đã đọc và lưu trên máy từ bản trước (còn lời dẫn) không được dùng lại; lần đầu đọc lại mỗi câu sẽ phải chờ như câu mới.
- Trang đã tự yêu cầu máy chủ không kèm lời dặn nên **tải lại trang (Ctrl+F5) là có hiệu lực**. Bản sửa gốc nằm trong `ai-server.cjs`; khi nào tiện thầy chạy `KHOI-DONG-LAI-MAY-CHU.cmd` một lần để máy chủ nạp bản này.

### 2. Chờ đọc xong mới tính giờ (mặc định BẬT)
- Trong lúc máy đang chuẩn bị giọng và đang đọc, **đồng hồ và việc tự chuyển câu của trò chơi tạm chờ**; đọc xong chạy tiếp từ đúng chỗ cũ. Đồng hồ mờ và nhấp nháy nhẹ để thầy biết đang chờ.
- Áp dụng: Kéo co (thời gian câu hỏi, đếm ngược tự sang câu), Ai nhanh hơn (thời gian chờ giành quyền, thời gian trả lời, tự sang câu; **khi bật “Tự đọc”, chuông chỉ mở sau khi máy đọc xong câu hỏi**), Hộp quà, Đường đua, Bóng bay, Bình chọn ngón tay (đếm ngược), Chinh phục tri thức, Quiz Nghiêng Đầu, Chế độ giấy (đồng hồ thời gian chơi).
- Bấm dừng đọc, sang câu khác hay rời trò chơi thì đồng hồ chạy lại ngay; không bao giờ giữ quá 2 phút. Học sinh vẫn chọn đáp án được trong lúc máy đọc.
- Tắt lựa chọn này thì đồng hồ chạy trong lúc đọc như bản 2.3.

### 3. Tốc độ đọc và các lựa chọn ngay trong trò chơi
- Cạnh nút loa có thêm **nút bánh răng**. Bấm vào hiện bảng nhỏ: **Tốc độ đọc Chậm / Vừa / Nhanh**, “Chờ đọc xong mới tính giờ”, “Tự đọc khi sang câu mới”, “Đọc cả phương án A, B, C, D”. Chọn xong có hiệu lực từ lần đọc kế tiếp và được ghi nhớ. Bấm ra ngoài hoặc Esc để đóng.
- Các lựa chọn này cũng có ở Trợ lý AI → Kết nối AI → “🔊 Đọc to câu hỏi”.
- Với giọng AI, tốc độ được chỉnh bằng cách phát nhanh/chậm hơn (0,85 – 1 – 1,2 lần, giữ nguyên cao độ); với giọng của máy là tốc độ đọc của chính giọng đó.

### Tệp
- Thay đổi: `app\doc-to.js`, `app\index.html` (thêm điều kiện “đang đọc thì chờ” trong vòng đồng hồ của Kéo co, Ai nhanh hơn, Hộp quà, Đường đua, Chinh phục tri thức, Quiz Nghiêng Đầu, Chế độ giấy; không đổi luật chơi, điểm số), `app\bong-bay.js`, `app\binh-chon.js`, `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.4`), `ai-server.cjs`, `MO-HOC-MA-VUI.ps1` (nhãn). Bản trước nằm ở `backups\truoc-2.4\`.

### Kiểm thử bản 2.4 – và phần CHƯA kiểm
- `kiem-thu\t-doc-to.cjs`: 66/66 (thêm 16 bài: bảng chọn nhanh, tốc độ, đồng hồ đứng yên trong lúc đọc ở từng trò, chuông Ai nhanh hơn chờ đọc xong, không giữ đồng hồ quên, nội dung gửi cho giọng AI đúng nguyên câu). Giọng đọc của trình duyệt và Gemini trong bài kiểm vẫn là giả.
- Chạy lại toàn bộ bài cũ, cả khi có và không có nút loa: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, tên 55/55, AI 58/58, Bình chọn 43/43, Phân tích 28/28, Tiếng mừng 25/25.
- **Chưa kiểm:** tôi không nghe được tiếng thật, nên việc giọng Gemini còn hay hết lời dẫn, tốc độ Chậm/Nhanh nghe có vừa tai không phải chờ thầy nghe thử.

## 0-13. Cập nhật 2.3 (17 giờ 30 ngày 11/10/2026) – Tiếng mừng chiến thắng

### Có gì mới
- Tệp âm thanh thầy gửi (`Mừng.mp3`, 8 giây, phần có tiếng dài khoảng 4 giây) được đưa vào ứng dụng với tên `app\assets\audio\mung-chien-thang.mp3`. Phần âm thanh giữ nguyên từng byte; khi chép vào máy, công cụ chuyển tệp tự gắn thêm một nhãn nguồn gốc ở đầu tệp nên tệp trong gói nặng 136 876 byte thay vì 131 074 byte.
- Tiếng này phát **lúc kết thúc, khi có chiến thắng**, ở sáu trò **chưa có tiếng mừng riêng**:
  - **Ai nhanh hơn** – khi trò kết thúc (thay tiếng “tin tin” ngắn trước đây).
  - **Đường đua kiến thức** – khi một đội về đích, hoặc hết câu hỏi và đội đi xa nhất thắng.
  - **Hộp quà bí mật** – khi đã mở hết hộp.
  - **Chinh phục tri thức** – khi trả lời đúng hết (màn “Xuất sắc!”); thua thì không phát.
  - **Quiz Nghiêng Đầu** – ở màn “Hoàn thành”.
  - **Bóng bay tri thức** – ở màn kết quả (thay tiếng “tin tin” ngắn trước đây).
- **Không đổi** ở các trò đã có tiếng mừng riêng: **Kéo co kiến thức** (`win.mp3`) và **Vòng quay kết nối** (tiếng thắng cuộc, cổ vũ). **Bình chọn ngón tay** và **Chế độ giấy** không có đội thắng nên không phát.
- Bấm **Chơi lại**, **Về thư viện** hoặc chuyển sang màn hình khác khi tiếng đang phát thì tiếng tự tắt.
- Nếu không phát được tệp (thiếu tệp, trình duyệt chặn) thì trò dùng lại tiếng cũ của mình; trò chơi không bị ảnh hưởng.

### Bật/tắt và âm lượng
- **Ai nhanh hơn:** theo nút “🔊 Tiếng: Bật/Tắt” và thanh âm lượng hiệu ứng của trò. **Bóng bay:** theo mục “Âm thanh” trong thiết lập.
- **Đường đua, Hộp quà:** ô “Tiếng hiệu ứng” của hai trò này mặc định đang **tắt**; tiếng mừng vẫn phát để lúc về đích không bị im lặng (ô bật thì âm lượng theo thanh trượt của trò). **Chinh phục tri thức, Quiz Nghiêng Đầu:** không có nút tiếng riêng. Bốn trò này chỉ im khi tắt âm thanh chung của ứng dụng (bảng âm thanh ở Vòng quay kết nối).
- Giáo viên bấm “Kết thúc” giữa chừng ở Đường đua và Hộp quà (chưa có đội thắng) thì không phát – giống Kéo co.

### Tệp
- Mới: `app\mung-chien-thang.js`, `app\assets\audio\mung-chien-thang.mp3`. Thay đổi: `app\index.html` (lời gọi tiếng mừng ở hàm kết thúc của năm trò; không đổi luật chơi, điểm số), `app\bong-bay.js`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.3`, có tệp âm thanh mới để dùng khi mất mạng), `MO-HOC-MA-VUI.ps1` (nhãn). Bản trước nằm ở `backups\truoc-2.3\`.
- Sửa `SHA256SUMS.txt`: hai dòng của `nhac-boc-tham.mp3` và `nhac-nghich-ngom.mp3` trước đây ghi mã của tệp gốc thầy gửi thay vì mã của tệp thực tế đang nằm trong gói từ bản 1.5 (khác ở nhãn nguồn gốc mà công cụ chuyển tệp tự gắn vào đầu tệp, phần âm thanh như nhau); nay ghi đúng theo tệp thực tế. Hai tệp nhạc không thay đổi.

### Sửa lỗi ngay sau đó (17 giờ 55): máy chủ không nhận khóa Gemini dạng mới
- Thầy dán khóa do Google AI Studio vừa cấp (bắt đầu bằng `AQ.`) thì ứng dụng báo “Khóa không đúng định dạng”. Lỗi của tôi: máy chủ nội bộ chỉ nhận dạng khóa cũ `AIza…`, không cho dấu chấm. Từ giữa năm 2026 AI Studio chỉ còn cấp khóa dạng `AQ.`.
- Đã sửa `ai-server.cjs`: nhận cả hai dạng (vẫn chặn khoảng trắng, kí tự lạ). Khi Google từ chối khóa hoặc mô hình, thông báo nay kèm nguyên văn lí do của Google (không chứa khóa) để dễ tìm nguyên nhân.
- **Phải chạy lại `KHOI-DONG-LAI-MAY-CHU.cmd` một lần nữa** thì bản sửa mới có hiệu lực (máy chủ chỉ nạp tệp này lúc khởi động). Bản cũ của tệp nằm ở `backups\truoc-2.3.1\`.
- Đã xác nhận trên máy thầy: tệp `KHOI-DONG-LAI-MAY-CHU.cmd` chạy được trên Windows (máy chủ khởi động lại lúc 17 giờ 48, không ghi lỗi).
- Kiểm thử: `kiem-thu\t-ai.cjs` 58/58 (thêm hai bài về khóa dạng mới) – vẫn với Gemini giả. **Chưa kiểm:** khóa `AQ.` thật với Google; trên diễn đàn của Google có người báo khóa `AQ.` bị từ chối (401) ở một số tài khoản, nên bước “Kiểm tra kết nối” của thầy mới cho biết chắc.

### Kiểm thử bản 2.3 – và phần CHƯA kiểm
- `kiem-thu\t-mung.cjs`: 25/25 – chơi thật từng trò tới lúc kết thúc và kiểm tệp được phát đúng một lần, đúng âm lượng; không phát khi thua, khi tắt tiếng, khi kết thúc giữa chừng; tự tắt khi Chơi lại/Về thư viện/đổi màn hình; Kéo co vẫn dùng `win.mp3`; thiếu tệp thì dùng tiếng cũ; ngắt mạng vẫn phát được.
- Chạy lại toàn bộ bài cũ: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, tên 55/55, AI 56/56, Bình chọn 43/43, Phân tích 28/28, Đọc to 50/50.
- **Chưa kiểm:** trình duyệt thử không có loa nên tôi chỉ kiểm được việc tệp ĐƯỢC PHÁT, chưa nghe tiếng thật trên loa lớp (to/nhỏ so với nhạc nền và tiếng reo của học sinh); Chrome của thầy. Chờ thầy nghe thử và nghiệm thu.

## 0-12. Cập nhật 2.2 (16 giờ 11/10/2026) – Đọc to câu hỏi

### Có gì mới
- **Nút loa ngay sau câu hỏi** trong Kéo co, Ai nhanh hơn, Hộp quà, Đường đua, Chinh phục tri thức, Quiz Nghiêng Đầu, Bóng bay, Bình chọn ngón tay (khi dùng bộ câu hỏi) và Chế độ giấy. Bấm để nghe câu hỏi rồi lần lượt A, B, C, D; bấm lần nữa để dừng. Sang câu khác hoặc rời trò chơi thì tự dừng.
- **Đọc thành lời các kí hiệu:** `27 + 15 = ?` → “27 cộng 15 bằng bao nhiêu?”, `5 m = ... cm` → “5 mét bằng bao nhiêu xăng-ti-mét”, phân số, phần trăm, ngày tháng, dấu so sánh. Câu chữ thường giữ nguyên.
- **Nhạc nền tự nhỏ lại** (còn một phần tư) trong lúc đọc, đọc xong trở về mức cũ – áp dụng cho nhạc của cả sáu trò có nhạc nền.
- **Hai nguồn giọng:** (1) giọng tiếng Việt có sẵn trong máy/trình duyệt – phát ngay, không cần mạng; (2) giọng AI Gemini qua máy chủ nội bộ – tự nhiên hơn, cần khóa và Internet, lần đầu đọc một câu phải chờ vài giây, câu đã đọc được lưu trên máy (tối đa 150 câu gần nhất) nên lần sau phát ngay và không tốn lượt. Mặc định dùng giọng của máy trước; nếu giọng của máy hỏng thì tự chuyển sang giọng AI.
- **Cài đặt:** Trợ lý AI → Kết nối AI → **🔊 Đọc to câu hỏi**: chọn nguồn giọng, giọng, tốc độ (Chậm/Vừa/Nhanh), có đọc phương án hay không, **tự đọc mỗi khi sang câu mới**, nút **Nghe thử**.
- Chỉ câu hỏi và phương án được đọc/gửi đi; tên học sinh, tên đội không được đọc và không được gửi.

### QUAN TRỌNG: máy của thầy hiện CHƯA có giọng đọc tiếng Việt
- Kiểm tra trực tiếp trên máy thầy (qua khung trình duyệt của Claude, 15 giờ 30 ngày 11/10): Windows chỉ có ba giọng tiếng Anh (David, Mark, Zira), không có giọng tiếng Việt; máy chủ nội bộ vẫn là tiến trình cũ, chưa có khóa Gemini.
- Vì vậy **nút loa chưa hiện** trong trò chơi (ứng dụng cố ý không hiện nút bấm mà không kêu). Mọi thứ khác chạy như bản 2.1.
- Bật bằng **một trong hai cách**:
  1. **Giọng AI Gemini:** chạy `KHOI-DONG-LAI-MAY-CHU.cmd`, rồi dán khóa ở Trợ lý AI → Kết nối AI (xem mục 0-9). Có khóa là nút loa tự hiện.
  2. **Giọng tiếng Việt của Windows** (miễn phí, không cần mạng khi dùng): Cài đặt Windows → Thời gian & ngôn ngữ → Giọng nói (Speech) → Thêm giọng nói (Add voices) → Tiếng Việt. Tải xong, đóng hẳn trình duyệt rồi mở lại ứng dụng. (Đường dẫn theo hướng dẫn của Windows; tôi không tự đổi cài đặt hệ thống của thầy và chưa thử được bước này trên máy thầy.)
- Sau khi bật, vào Trợ lý AI → Kết nối AI → **Nghe thử** để nghe giọng trước khi dùng trên lớp.

### Tệp
- Mới: `app\doc-to.js`. Thay đổi: `app\index.html` (nạp tệp mới; ba chỗ đặt âm lượng nhạc của Kéo co và Ai nhanh hơn nhân thêm hệ số “đang đọc”; không đổi luật chơi), `app\nhac-nen.js` (hai chỗ đặt âm lượng tương tự), `app\tro-ly-ai.js` (chỗ hiện phần cài đặt), `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.2`), `MO-HOC-MA-VUI.ps1` (nhãn). Bản trước nằm ở `backups\truoc-2.2\`.
- Giọng AI đã đọc được lưu trong một cơ sở dữ liệu riêng của trình duyệt (`hmv_doc_to_v1`), tách khỏi Kho câu hỏi và dữ liệu lớp.

### Kiểm thử bản 2.2 – và phần CHƯA kiểm
- `kiem-thu\t-doc-to.cjs`: 50/50. Trong bài này **giọng đọc của trình duyệt là giả** (ghi lại câu được đọc, không phát tiếng) và **Gemini là giả**: kiểm nút loa ở 9 trò, nội dung được đọc, dừng/đổi câu/rời trò, nhạc nền nhỏ lại, cài đặt được ghi nhớ, tự đọc, giọng AI có lưu đệm, hết lượt AI (429), giọng máy hỏng → chuyển giọng AI, máy không có giọng → không hiện nút, bố cục ở 1920/1366/1024/420, 22 mẫu chuyển kí hiệu thành lời.
- Chạy lại toàn bộ bài cũ ở hai trạng thái (không có giọng – như máy thầy hiện nay; có giọng – nút loa hiện trong trò): Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, tên 55/55, AI 56/56, Bình chọn 43/43, Phân tích 28/28.
- **Chưa kiểm (không thể kiểm trong môi trường thử):** tiếng thật phát ra loa; chất lượng giọng “Microsoft An” của Windows và giọng Gemini thật khi đọc tiếng Việt (nhất là số thập phân, đơn vị); thời gian chờ và giới hạn lượt miễn phí của giọng Gemini; Chrome của thầy. Chờ thầy nghe thử và nghiệm thu.

## 0-11. Cập nhật 2.1 (chiều 11/10/2026) – Phân tích sau trò chơi

### Có gì mới
- Mỗi khi một câu hỏi được chấm trong **Kéo co, Ai nhanh hơn, Hộp quà, Chinh phục tri thức, Quiz Nghiêng Đầu, Bóng bay, Bình chọn ngón tay**, ứng dụng ghi lại: câu nào, phương án được chọn, đúng hay sai (Bình chọn: số phiếu từng phương án). **Không ghi tên học sinh, tên đội.**
- **Trợ lý AI → thẻ “📈 Phân tích”:** số lượt trả lời, tỉ lệ đúng, bảng câu hỏi xếp từ yếu nhất kèm “hay chọn sai phương án nào”; lọc theo Hôm nay / 7 ngày / Tất cả, theo bộ câu hỏi, hoặc chỉ câu đúng dưới 60%.
- **📦 Tạo bộ “Ôn lại chỗ sai”** (không cần mạng, không cần AI): gom các câu đúng dưới 60% thành một bộ mới trong Kho → **Chơi ngay**.
- **✨ AI nhận xét và soạn câu tương tự** (cần Gemini): AI nêu chỗ lớp chưa vững, lỗi thường gặp, gợi ý dạy lại trong 5–10 phút, và soạn 5–10 câu ôn mới → chuyển sang thẻ Tạo câu hỏi nhanh để thầy duyệt, lưu, chơi. AI chỉ nhận câu hỏi và số lượt đúng/sai.
- Màn tổng kết của Bình chọn ngón tay có nút **📈 Xem phân tích**.

### Cần hiểu đúng số liệu
- Trong trò chơi theo đội, mỗi lượt là câu trả lời của **một đội hoặc một bạn**, không phải cả lớp; chỉ Bình chọn ngón tay mới là số phiếu của nhiều bạn. Đây là gợi ý để hỏi lại, **không phải điểm số** và không dùng để đánh giá học sinh.
- Số liệu nằm trong trình duyệt của máy này (tối đa 3000 lượt gần nhất). Nút **🗑 Xóa số liệu** (bấm xác nhận lần hai) chỉ xóa số liệu phân tích, không đụng Kho câu hỏi hay dữ liệu lớp.
- Kéo co với câu hỏi mở (giáo viên bấm đúng/sai) vẫn được ghi đúng/sai nhưng không có “phương án đã chọn”.

### Tệp
- Mới: `app\ket-qua.js`. Thay đổi: `app\index.html` (năm chỗ gọi ghi kết quả trong hàm chấm của năm trò cũ; không đổi luật chơi), `app\bong-bay.js`, `app\binh-chon.js`, `app\tro-ly-ai.js` (thêm thẻ Phân tích), `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.1`), `MO-HOC-MA-VUI.ps1`, tệp này. Bản cũ ở `backups\truoc-2.1\`. Không cần khởi động lại máy chủ cho bản này.

### Kiểm thử bản 2.1 – và phần CHƯA kiểm
- `kiem-thu\t-ket-qua.cjs`: 28/28 – chơi thật từng trò trong trình duyệt thử và kiểm lượt được ghi (7 trò), tổng hợp, lọc, bộ ôn, AI nhận xét (Gemini giả), không chứa tên học sinh, lưu bền, giới hạn 3000 lượt, xóa có xác nhận.
- Chạy lại toàn bộ bài cũ: phần AI 56/56, Bình chọn 43/43, tên 55/55, Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40.
- **Chưa kiểm:** AI nhận xét với Gemini thật; Chrome của thầy. Chờ thầy nghiệm thu.

## 0-10. Cập nhật 2.0 (chiều 11/10/2026) – Bình chọn ngón tay

### Có gì mới
- **Trò mới “🖐️ Bình chọn ngón tay”** (Hoạt động → thư viện; trang chủ → Chơi bằng camera; Kho → Chơi ngay): học sinh giơ **1, 2, 3, 4 ngón** để chọn **A, B, C, D**; camera AI đếm phiếu và vẽ biểu đồ.
- Hai cách hỏi: **Hỏi nhanh** (thầy cô đọc câu hỏi, 2–4 lựa chọn) hoặc **dùng bộ A–B–C–D, Đúng/Sai trong Kho** (hiện câu hỏi, tô đáp án đúng, báo “x/y bạn chọn đúng”; Đúng/Sai: 1 ngón = Đúng, 2 ngón = Sai).
- Bấm **Bắt đầu đếm** (hoặc phím cách) → đếm ngược 4–12 giây → tự chốt. **Đếm thêm nhóm khác** để cộng dồn từng tổ thành phiếu cả lớp; **Đếm lại**; sửa tay bằng nút **+ / −** hoặc phím 1–4 (Shift + số để trừ).
- **Kết thúc** → bảng tổng kết từng câu: số phiếu mỗi lựa chọn, tỉ lệ đúng, câu cần ôn nhất.
- Không có camera vẫn dùng được: thầy cô đếm tay giơ rồi bấm phím 1–4.

### Cách đếm và giới hạn cần biết
- Chỉ tính ngón trỏ, giữa, áp út, út; **không tính ngón cái**. Chỉ tính bàn tay **đang giơ thẳng lên**; tay để trên bàn, tay chúc xuống không tính. Nắm tay = không bỏ phiếu. Mỗi bàn tay là một phiếu (giơ hai tay là hai phiếu).
- Mỗi lượt dò: cả khung hình + 6 ô phóng to chồng mép, rồi gộp bàn tay trùng. Máy chậm (một lượt quá 1,1 giây) tự chuyển sang chỉ dò cả khung.
- **Camera đếm sót hoặc nhầm là chuyện có thể xảy ra**, nhất là khi tay ở xa, bị che, chụm sát nhau hoặc thiếu sáng. Vì vậy nên cho **từng nhóm 6–10 bạn đứng cách camera 1–2,5 mét**, tay giơ cao, tách xa nhau, rồi cộng dồn; và luôn có nút +/− để thầy cô sửa. Không nên dùng để chấm điểm.
- Lần đầu cần Internet để tải bộ nhận diện bàn tay (dùng chung với Bóng bay tri thức). Không lưu, không gửi hình ảnh.

### Tệp
- Mới: `app\binh-chon.js`. Thay đổi: `app\ban-tay-camera.js` (thêm chế độ dò ảnh tĩnh theo ô; chế độ video của Bóng bay giữ nguyên), `app\index.html`, `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-2.0.1`), `app\trang-chu.js` (thêm dòng thứ ba ở “Chơi bằng camera”, cột phải gọn lại), `app\kho-cau-hoi.js`, `app\question-quick-stage6.js`, `MO-HOC-MA-VUI.ps1`, tệp này. Bản cũ ở `backups\truoc-2.0\`. **Không cần khởi động lại máy chủ cho bản này.**

### Kiểm thử bản 2.0 – và phần CHƯA kiểm
- Chromium không giao diện, camera giả, **bộ nhận diện giả** (`kiem-thu\t-binh-chon.cjs`, `fake-hands.mjs`): 43/43 – đếm 1–4 ngón, bỏ nắm tay/tay chúc xuống/ngón cái, gộp bàn tay trùng giữa các ô, cộng dồn, sửa tay, 2 lựa chọn, Đúng/Sai, bộ trong Kho, tổng kết, máy chậm, không camera, tắt camera khi rời đi, vừa màn hình 1366×768 và 1774×934.
- Chạy lại toàn bộ bài cũ: tên 55/55, Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc 40/40, phần AI 56/56 (Gemini giả).
- **Mô hình MediaPipe thật, chạy trong trình duyệt trên máy thầy, với ảnh mẫu:** ảnh một bàn tay – chỉ một ngón → 1, chữ V → 2, hai bàn tay xòe → 4 và 4, giơ ngón cái lên/xuống → 0 (đúng cả 5 ảnh). Sau đó chạy đúng trò Bình chọn trên máy thầy với camera giả phát ảnh nhóm thật (ảnh công khai trên Wikimedia Commons, bàn tay chỉ cao 25–50 điểm ảnh, mỗi lượt dò khoảng 0,5–0,7 giây): ảnh ba bạn gái giơ chữ V → đúng 4/4 bàn tay, bàn tay cầm ô bị loại đúng; ảnh nhóm trẻ đứng chen nhau có 6 chữ V → đúng 4, nhầm 1 (chữ V bị đếm thành 3 ngón), sót 1, ba bàn tay không giơ bị loại đúng; ảnh lớp học giơ tay → thấy 3 bàn tay xòe (hai tay đếm 4, một tay đếm 3). Nghĩa là với tay nhỏ, chen nhau thì **vẫn có sót và nhầm**.
- **Chưa kiểm:** camera thật với học sinh thật trong lớp (khoảng cách, ánh sáng, tốc độ máy); bàn tay giơ 3 ngón trên ảnh thật. Chờ thầy nghiệm thu.

## 0-9. Cập nhật 1.9 (chiều 11/10/2026) – Trợ lý AI nối Gemini

### Việc thầy cần làm một lần để bật AI
1. Bấm đúp **`KHOI-DONG-LAI-MAY-CHU.cmd`** (trong thư mục này) để máy chủ nội bộ nạp phần AI, rồi tải lại trang (F5). Nếu tệp này báo lỗi: khởi động lại máy tính rồi bấm đúp `MO-HOC-MA-VUI.cmd` như thường lệ.
2. Vào **Trợ lý AI → Kết nối AI**, dán khóa Gemini (tạo ở aistudio.google.com → Get API key), bấm **Lưu khóa** rồi **Kiểm tra kết nối**.
   - Cách khác: mở `CAI-DAT-AI\khoa-gemini.txt` bằng Notepad, dán khóa vào một dòng riêng, lưu lại.
   - Khóa chỉ nằm trong tệp đó trên máy thầy; không nằm trong trang web, không nằm trong bản sao lưu. Đừng gửi tệp này cho ai.

### Có gì mới
- **Mục “✨ Trợ lý AI”** ở thanh bên và ở trang chủ, gồm ba thẻ:
  - **⚡ Tạo câu hỏi nhanh:** chọn lớp, môn, bài, số câu, dạng (A–B–C–D, Đúng/Sai, hỗn hợp, trả lời ngắn), mức độ theo Thông tư 27; có thể dán nội dung bài học hoặc thêm tối đa 4 ảnh trang sách. AI soạn → thầy sửa, bỏ bớt → **Lưu vào Kho** hoặc **Lưu và chơi ngay** (mở luôn hộp chọn trò chơi). Có nút **Soạn thêm** (tránh trùng câu đã có).
  - **🔎 AI rà soát** (ở bước duyệt): AI tự giải lại từng câu, gắn nhãn ổn / nên chỉnh / sai, nêu lý do, đề nghị bản sửa để thầy bấm **Áp dụng**. AI rà soát cũng có thể nhầm; thầy quyết định cuối cùng.
  - **💬 Trợ lý Sư phạm:** sáu thẻ việc – câu hỏi cho trò chơi; ma trận và đề kiểm tra; lời nhận xét học sinh; hoạt động khởi động/củng cố; góp ý tiết dạy theo nghiên cứu bài học (kèm dàn ý biên bản); hỏi tự do. Câu trả lời có nút **Sao chép** và **Tải tệp Word**.
  - **⚙️ Kết nối AI:** dán khóa, kiểm tra kết nối, xóa khóa; vẫn giữ **cách dán ChatGPT** (không cần khóa) làm dự phòng.
- **Bảo vệ thông tin học sinh:** họ tên có trong danh sách lớp được tự thay bằng bí danh `[HS1]`, `[HS2]`… trước khi gửi và trả lại tên trên màn hình. Chỉ nhận ra họ tên đầy đủ đúng như trong danh sách; tên gọi một chữ (“An”, “Hoa”) không được thay, nên thầy cô không nên gõ thông tin riêng tư của học sinh.
- **Với khóa miễn phí**, Google có thể dùng nội dung gửi đi để cải tiến sản phẩm và có giới hạn số lượt mỗi phút, mỗi ngày.

### Cấu trúc kỹ thuật
- `server.cjs` nạp thêm `ai-server.cjs`: nhận `/api/ai/status`, `/api/ai/key`, `/api/ai/generate`, `/api/ai/tts`; chỉ nhận yêu cầu từ chính trang ứng dụng trên máy này (chặn trang web khác); khóa gửi tới Google qua tiêu đề, không nằm trên đường dẫn.
- Mô hình mặc định `gemini-3.8-flash`, tự chuyển sang `gemini-3.5-flash-lite` khi hết lượt hoặc lỗi. Muốn đổi: ghi tên mô hình (mỗi dòng một tên) vào `CAI-DAT-AI\mo-hinh.txt`.
- Câu lệnh gửi AI nằm ở `app\tro-ly-ai.js` (sửa được mà không cần khởi động lại máy chủ).
- Tệp mới: `ai-server.cjs`, `KHOI-DONG-LAI-MAY-CHU.cmd`, `app\tro-ly-ai.js`. Tệp thay đổi: `server.cjs`, `app\index.html`, `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-1.9`, không lưu đệm `/api/`), `app\trang-chu.js`, `MO-HOC-MA-VUI.ps1`, tệp này. Bản cũ nằm ở `backups\truoc-1.9\`. Không đụng dữ liệu, không đổi mã trò chơi.

### Kiểm thử bản 1.9 – và phần CHƯA kiểm
Chromium không giao diện (Playwright) trên máy của trợ lý, **dùng Gemini giả** (`kiem-thu\mock-gemini.cjs`):
- Phần AI (`kiem-thu\t-ai.cjs`): 56/56 – 17 mục cho máy chủ (khóa, chặn trang lạ, chuyển mô hình dự phòng, lỗi khóa, lọc nội dung, tệp WAV), 39 mục cho giao diện (tạo – rà soát – sửa – lưu – chơi Kéo co bằng bộ vừa soạn; ẩn tên học sinh; ma trận hiển thị thành bảng; tải Word; máy chủ bản cũ).
- Chạy lại toàn bộ bài cũ: tên ứng dụng 55/55, Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc nền 40/40.
- **Chưa kiểm:** gọi Gemini thật (cần khóa của thầy) – tên mô hình, chất lượng câu hỏi tiếng Việt, tốc độ, giới hạn lượt; tệp `KHOI-DONG-LAI-MAY-CHU.cmd` trên Windows; Chrome của thầy. Chờ thầy nghiệm thu.

## 0-8. Cập nhật 1.8 (13 giờ 20 ngày 11/10/2026) – nhãn “Ngày hội Chuyển đổi số 2026”

- **Ảnh bìa:** thêm một nhãn nhỏ kiểu tem dán ở góc phải (dưới ô logo trường): “NGÀY HỘI · 2026 / CHUYỂN ĐỔI SỐ”, nền xanh ngọc – xanh dương, số 2026 trên nền vàng, hơi nghiêng. Nhãn không che tên trường, tên chính, dòng phụ và hai ô logo; không bắt chuột nên không cản thao tác.
- **Gỡ sau ngày hội:** mở `app\index.html`, tìm `cover-event` và xóa đúng thẻ `<div class="cover-event" …>…</div>`; hoặc tạm ẩn bằng cách thêm `display:none!important` vào quy tắc `.cover-event` ở cuối `app\ban-chinh.css` (đoạn “BAN-CHINH 1.8”).
- Tệp thay đổi: `app\index.html`, `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-1.8`), `MO-HOC-MA-VUI.ps1`, tệp này. Bản cũ nằm ở `backups\truoc-1.8\`. Không đụng dữ liệu, không đổi mã trò chơi.

### Kiểm thử bản 1.8
Chromium không giao diện (Playwright) trên máy của trợ lý:
- Tên ứng dụng + dòng phụ + nhãn sự kiện (`kiem-thu\t-ten-ung-dung.cjs`): 55/55 – ba cỡ màn hình 1366, 1774, 420.
- Chạy lại toàn bộ bài cũ: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc nền 40/40.
- Chưa kiểm trên Chrome của thầy; chờ thầy nghiệm thu.

## 0-7. Cập nhật 1.7 (13 giờ 11/10/2026) – dòng phụ chữ viết tay trên ảnh bìa

- **Ảnh bìa:** dưới tên chính “HỌC MÀ VUI” thêm dòng **“Nền tảng lớp học số thông minh Tiểu học”** bằng chữ viết tay nét cọ (phông Pacifico), màu cam, viền sáng, tô đậm thêm một chút; bên dưới có nét gạch chân vẽ tay hai màu xanh ngọc – vàng (cùng tông với logo). Cỡ chữ tự co theo bề rộng ảnh bìa nên luôn nằm trên một dòng.
- **Phông chữ:** `app\assets\fonts\Pacifico-Vietnamese.woff2` (33 KB) – phông Pacifico của Google Fonts, giấy phép SIL Open Font License, đã rút gọn còn bộ chữ tiếng Việt đầy đủ + chữ số + dấu câu; nằm trong gói và trong bộ nhớ đệm ngoại tuyến nên không cần mạng. Tệp được tải qua trình duyệt trên máy thầy rồi đối chiếu mã băm SHA-256 trước khi đưa vào gói.
- **Cột trái:** khôi phục khối logo như trước bản 1.6 (logo + “HỌC MÀ VUI / ThayKhaiEdu”). Các chỗ khác của bản 1.6 giữ nguyên (ảnh bìa không còn dòng tổ chuyên môn, tên thẻ trình duyệt là “HỌC MÀ VUI”).
- Muốn đổi câu chữ: sửa trong `app\index.html` (tìm `school-sub-text`); muốn đổi màu/cỡ: cuối tệp `app\ban-chinh.css` (đoạn “BAN-CHINH 1.7”).
- Tệp thay đổi: `app\index.html`, `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-1.7`), `MO-HOC-MA-VUI.ps1`, tệp này; tệp mới: phông chữ nói trên. Bản cũ nằm ở `backups\truoc-1.7\`. Không đụng dữ liệu, không đổi mã trò chơi.

### Kiểm thử bản 1.7
Chromium không giao diện (Playwright) trên máy của trợ lý:
- Tên ứng dụng + dòng phụ (`kiem-thu\t-ten-ung-dung.cjs`): 49/49 – ba cỡ màn hình 1366, 1774, 420.
- Chạy lại toàn bộ bài cũ: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc nền 40/40.
- Chưa kiểm trên Chrome của thầy; chờ thầy nghiệm thu.

## 0-6. Cập nhật 1.6 (đầu giờ chiều 11/10/2026) – tên sản phẩm

Sản phẩm đại diện Trường Tiểu học Trần Văn Ơn dự Ngày hội Chuyển đổi số nên bỏ phần nhận diện của tổ và của cá nhân:

- **Ảnh bìa:** bỏ dòng “📚 TỔ CHUYÊN MÔN KHỐI 4”; tên chỉ còn **HỌC MÀ VUI** (cho chữ lớn hơn vì tên đã ngắn). Dòng “TRƯỜNG TIỂU HỌC TRẦN VĂN ƠN” giữ nguyên.
- **Bỏ hậu tố “– ThayKhaiEdu”** ở mọi chỗ hiện chữ: ảnh bìa, cột trái, tên thẻ trình duyệt, hai thẻ “Nhận diện” trong Cài đặt (dòng phụ nay là “Trường Tiểu học Trần Văn Ơn”).
- **Chưa đổi (chờ thầy quyết định):** phần tên bổ sung sau “HỌC MÀ VUI” – chưa gắn cho tới khi thầy chọn; ảnh logo ở cột trái (`app\thaykhaiedu-logo.png`) vẫn là logo có chữ ThayKhaiEdu; ô “Logo Tổ 4” trong Cài đặt và mục “Tổ chuyên môn” trong hồ sơ giáo viên là dữ liệu của thầy nên giữ nguyên.
- Tệp thay đổi: `app\index.html`, `app\ban-chinh.css`, `app\sw.js` (bộ nhớ đệm `hmv-ban-chinh-1.6`), `MO-HOC-MA-VUI.ps1`, tệp này. Bản cũ nằm ở `backups\truoc-1.6\`. Không đụng dữ liệu (IndexedDB/localStorage), không đổi mã trò chơi.

### Kiểm thử bản 1.6
Chromium không giao diện (Playwright) trên máy của trợ lý, chạy đúng mã trong `app\`:
- Tên ứng dụng (mới, `kiem-thu\t-ten-ung-dung.cjs`): 34/34 – ba cỡ màn hình 1366, 1774, 420; đi qua 7 màn hình không còn chữ cũ đang hiển thị.
- Chạy lại toàn bộ bài cũ: Kho 70/70, Quiz 43/43, Kéo co 44/44, Vòng quay 63/63, toàn màn hình 52/52, Ai nhanh hơn 47/47 + nhạc 25/25, Bóng bay 50/50, trang chủ + nhạc nền 40/40.
- Chưa kiểm trên Chrome của thầy; chờ thầy nghiệm thu.

## 0-5. Cập nhật 1.5 (trưa 11/10/2026)

### 1) Nhạc nền cho các trò còn thiếu
| Trò chơi | Nhạc nền | Ghi chú |
|---|---|---|
| Kéo co kiến thức | nhạc nền của ứng dụng (`background.mp3`) | có từ bản 1.1 |
| Ai nhanh hơn | “Giai điệu trống vui nhộn” | có từ bản 1.3 |
| Hộp quà bí mật | **“Bốc thăm trúng thưởng”** (tệp thầy gửi) | mới |
| Chinh phục tri thức | **“Bốc thăm trúng thưởng”** | mới |
| Quiz Nghiêng Đầu | **“Vui vẻ nghịch ngợm”** (tệp thầy gửi) | mới |
| Bóng bay tri thức | “Giai điệu trống vui nhộn” | mới |

- Hai tệp mới có khoảng lặng ở đầu/cuối; ứng dụng phát lặp theo một đoạn đúng nhịp (120 nhịp/phút) nên không hở tiếng: “Bốc thăm” lặp 0,015 s → 12,015 s; “Nghịch ngợm” lặp 1,015 s → 17,015 s.
- Nhạc phát khi đang chơi, ngưng khi tạm dừng hoặc rời màn hình, tắt khi kết thúc. Mỗi trò có nút “🎵 Nhạc nền: Bật/Tắt”, lựa chọn được ghi nhớ.
- Mã nằm ở `app/nhac-nen.js`; tệp này chỉ quan sát màn hình trò chơi, không sửa mã của từng trò.
- Chưa gắn nhạc cho ba trò đang ẩn khỏi thư viện (Đường đua, Ống kính may mắn, Chế độ giấy).

### 2) Bỏ “Lật mảnh ghép”, thêm trò mới “🎈 Bóng bay tri thức”
- **Điểm nhấn công nghệ:** thực tế tăng cường (AR) + AI nhận diện bàn tay (MediaPipe Hand Landmarker, chạy ngay trên máy). Hình ảnh lớp hiện như tấm gương; đáp án là những quả bóng bay lơ lửng trên hình; học sinh **giơ tay chạm vào quả bóng trong không khí**, giữ khoảng 0,8 giây là bóng nổ.
- Ứng dụng tự chấm và tự chuyển câu; cuối lượt có bảng kết quả và sao.
- Cách chơi: cả lớp chung điểm, hoặc hai đội luân phiên. Số câu 5/10/tất cả; thời gian mỗi câu tùy chọn.
- Dùng câu A–B–C–D và Đúng/Sai trong Kho (Kho → “Chơi ngay” → Bóng bay tri thức), hoặc mở từ thư viện/trang chủ.
- **Không có camera vẫn chơi được:** bấm chuột, chạm màn hình tương tác, phím 1–4 hoặc A–D.
- Chống chọn nhầm: lướt tay qua không tính; câu mới hiện ra mà tay còn nằm trên bóng thì phải đưa tay ra ngoài trước.
- Riêng tư: camera chỉ dùng để tìm vị trí đầu ngón tay; không nhận diện danh tính, không lưu, không gửi hình. Rời trò chơi là camera tắt.
- Lần đầu cần Internet để tải bộ nhận diện bàn tay (7,8 MB), sau đó dùng offline; hoặc chạy `TAI-BO-NHAN-DIEN-CAMERA.cmd` (đã thêm tệp bàn tay; tệp .cmd này vẫn chưa được chạy thử).
- “Lật mảnh ghép” đã gỡ khỏi thư viện và khỏi danh sách “Chơi ngay” trong Kho. Mã cũ của trò vẫn nằm trong `index.html` nhưng không còn lối vào.
- Mã: `app/bong-bay.js`, `app/ban-tay-camera.js`.

### 3) Trang chủ thiết kế lại
- Bỏ các ký hiệu cờ vua và ký tự có sẵn; thay bằng **bộ 11 biểu tượng tự vẽ (SVG)**, mỗi chức năng một màu.
- Ba việc dùng nhiều nhất trong tiết học thành ô lớn: Vòng quay kết nối, Trò chơi học tập, Chia nhóm. Bốn ô nhỏ: Kho câu hỏi, Thi đua, AI tạo câu hỏi, Nốt nhạc vui.
- Cột phải: lớp đang chọn (số học sinh, số bộ và số câu trong Kho, lấy từ dữ liệu thật) và mục “Chơi bằng camera”.
- Bỏ dải tiêu đề lặp lại tên ứng dụng (ảnh bìa đã có).
- Mã: `app/trang-chu.js`. Các phần tử cũ được giữ lại và ẩn đi để phần mã cũ vẫn cập nhật bình thường.

### Kiểm thử bản 1.5
- Trong môi trường của trợ lý: Bóng bay tri thức **50/50** (`kiem-thu/bong-bay-results.json`, camera dùng điểm ngón tay giả lập); trang chủ và nhạc nền **40/40** (`kiem-thu/trang-chu-nhac-nen-results.json`); chạy lại Kho 70/70, Quiz 43/43, Kéo co 44/44, Ai nhanh hơn 47/47 và 25/25, Vòng quay 63/63, toàn màn hình 52/52.
- Trên máy thầy (qua khung trình duyệt của Claude): bộ nhận diện bàn tay thật tải được và tìm đúng 2 bàn tay trong ảnh mẫu, cả GPU lẫn CPU.
- **Chưa thử:** camera thật với học sinh thật ở khoảng cách lớp học; loa thật.

## 0-4. Cập nhật 1.4 (11 giờ 30 sáng 11/10/2026)

### Ai nhanh hơn: tương tác trực tiếp, tự chấm, tự chuyển câu
- **Chuông tự mở** khoảng 1 giây sau khi câu hỏi hiện (trước đây giáo viên phải bấm “Mở chuông” ở từng câu).
- **Giành quyền bằng hai cách:** bấm phím của đội (Q, P, Z, M như cũ) hoặc **chạm/bấm vào thẻ đội** trên màn hình. Đội bấm đầu tiên được trả lời.
- **Trả lời:** đội giành quyền chạm vào một đáp án (hoặc phím 1–4). **Ứng dụng tự chấm**: đúng thì tô xanh, cộng điểm; sai thì tô đỏ, đội đó mất quyền ở câu này và **chuông tự mở lại** cho đội còn lại.
- **Tự chuyển câu** sau 3 giây (đổi được 2/3/5/8 giây), có đếm ngược; bấm “Câu tiếp theo”, phím N hoặc Enter để chuyển ngay.
- Mọi đội đều sai, hết 15 giây trả lời, hoặc **không đội nào bấm chuông trong 20 giây** (đổi được): hiện đáp án đúng rồi tự chuyển câu. Giáo viên bấm N khi chưa ai trả lời để bỏ qua câu.
- Hết bộ câu hỏi: tự công bố đội thắng (hoặc hòa).
- Câu hỏi mở (không có phương án): giáo viên bấm ✓ Đúng / ✗ Sai, sau đó vẫn tự chuyển câu.
- Thiết lập có mục **“Chấm điểm”**: “Tự chấm, tự chuyển câu” (mặc định) hoặc “Giáo viên chấm tay” (cách chơi cũ).
- **Sửa lỗi cũ:** ở màn thiết lập, gõ phím nào cũng bị chặn nên không sửa được tên đội và phím chuông; bấm phím khi đội khác đang trả lời bị tính nhầm là “bấm sớm”; phím Esc làm ẩn câu hỏi.
- Màn chơi gọn lại để thẻ đội, câu hỏi và 4 đáp án nằm trong một màn hình 1366×768; chữ đáp án to hơn.
- Kiểm thử: **47/47 đạt** (`kiem-thu/ai-nhanh-hon-tu-cham-results.json`), nhạc nền 25/25; chạy lại Kéo co 44/44, Quiz 43/43, Kho 70/70, Vòng quay 63/63, toàn màn hình 52/52. Chưa thử trên màn hình cảm ứng thật.

## 0-3. Cập nhật 1.3 (11 giờ sáng 11/10/2026)

### Ai nhanh hơn: nhạc nền
- Dùng tệp thầy gửi **“nhạc nền video giai điệu trong vui nhộn lặp lại nhiều lần”**, lưu trong ứng dụng thành `app/assets/audio/ai-nhanh-hon.mp3` (chạy offline).
- Lý do chọn (đo bằng máy, trợ lý không nghe được nhạc): bản này đúng 120 nhịp/phút và lặp lại chính xác sau mỗi 4 giây, không có khoảng lặng ở đầu, âm lượng đều. Hai bản còn lại (“bốc thăm trúng thưởng”, “vui vẻ nghịch ngợm”) có 0,7 giây im lặng ở cuối nên phát lặp sẽ hở tiếng.
- Nhạc phát lặp đoạn 1 s → 13 s nên chỗ nối liền mạch, không giật nhịp.
- Nhạc phát khi vào trận; dừng khi tạm dừng, khi kết thúc, khi về thư viện hoặc rời màn hình trò chơi.
- Màn chơi có nút **“🎵 Nhạc nền”** và **“🔊 Tiếng”**; màn thiết lập có ô bật/tắt và thanh âm lượng riêng cho nhạc (mặc định 30%).
- Tiếng chuông và hiệu ứng bật sẵn, to hơn (trước đây mặc định tắt và rất nhỏ).
- Sửa kèm: sau khi lưu thiết lập, các ô chọn (số đội, thời gian…) hiện đúng giá trị đã lưu thay vì quay về mặc định.
- Kiểm thử: **25/25 đạt** (`kiem-thu/ai-nhanh-hon-results.json`); chạy lại Kéo co 44/44, Quiz 43/43, Kho 70/70, Vòng quay 63/63, toàn màn hình 52/52. Chưa nghe bằng loa thật.

## 0a. Cập nhật 1.2 (10 giờ sáng 11/10/2026)

### Vòng quay kết nối: bố cục hai cột
- **Bên trái chỉ còn vòng quay**, luôn nằm trọn trong màn hình và to hơn trước (ở màn 1366×768 toàn màn hình: 684 px thay cho 538 px).
- **Toàn bộ thẻ và nút nằm ở cột phải:** thẻ “Gọi tên vui” / “Nhiệm vụ bất ngờ”, nút ⚙ Kho nhiệm vụ, nút “QUAY NGAY”, số học sinh, “Âm thanh”, “Toàn màn hình”, “Kết quả gần đây”, “Bắt đầu lượt mới”, “Làm mới”.
- **Toàn màn hình không còn bị che:** trước đây nút “QUAY NGAY” và dòng số học sinh rơi ra ngoài mép dưới, cột kết quả bị ẩn. Nay cột phải vẫn hiện đầy đủ, trang không phải cuộn.
- Nút QUAY ở tâm vòng quay vẫn dùng được (tiện khi chạm trên màn hình tương tác).
- Chỉ sắp xếp lại giao diện; cách quay, cách chọn, dữ liệu học sinh và âm thanh giữ nguyên.

### Toàn màn hình cho mọi trò chơi
- Mọi trò trong mục Hoạt động (Kéo co, Hộp quà bí mật, Ai nhanh hơn, Quiz Nghiêng Đầu, Chinh phục tri thức, Lật mảnh ghép, Đường đua, Ống kính) đều có nút **“⛶ Toàn màn hình”** ở cả màn thiết lập lẫn màn đang chơi.
- Khi bật: ẩn thanh bên và thanh chọn lớp, trò chơi rộng hết màn hình. Hộp thiết lập và thông báo vẫn hiện bình thường.
- Thoát: bấm lại nút, nhấn Esc, hoặc rời trò chơi.

### Kiểm thử bản 1.2 (Chromium trong môi trường của trợ lý, ba cỡ màn 1366×768, 1657×1000, 1920×1080)
- Vòng quay: **63/63 đạt** (`kiem-thu/vong-quay-results.json`). Toàn màn hình trò chơi: **52/52 đạt** (`kiem-thu/toan-man-hinh-results.json`).
- Chạy lại: Kéo co 44/44, Quiz 43/43, Kho 70/70.

## 0b. Cập nhật 1.1 (9 giờ sáng 11/10/2026)

Sửa theo góp ý của thầy sau khi thử. Lưu ý: bản thầy đã thử ở địa chỉ `http://127.0.0.1:8778/` là bản cũ Chặng 7; bản hợp nhất chạy ở `http://127.0.0.1:8780/`.

### Kéo co kiến thức
- **Tự chấm:** đội đến lượt bấm một đáp án (hoặc phím 1–4, A–D), ứng dụng chấm ngay: đáp án đúng tô xanh, đáp án chọn sai tô đỏ, dây tự kéo.
- **Tự chuyển câu** sau 3 giây (đổi được 2/3/5/8 giây), có đếm ngược; bấm “Câu tiếp theo” hoặc Enter để chuyển ngay. Hết giờ cũng tự chấm sai và tự chuyển.
- **Nhạc nền** phát khi vào trận, dừng khi tạm dừng, khi thắng hoặc khi rời màn hình trò chơi; có nút “🎵 Nhạc nền” và “🔊 Tiếng” ngay trên màn chơi. Nhạc dùng tệp nhạc nền của ứng dụng (tệp thầy đã chọn trong phần âm thanh của Vòng quay, nếu có), chạy offline.
- Tiếng hiệu ứng bật sẵn và to hơn (trước đây mặc định tắt và rất nhỏ).
- Đồng hồ đếm riêng cho từng câu (trước đây đếm theo cả trận nên câu sau bị thiếu giờ) và dừng thật khi tạm dừng.
- Câu hỏi mở (không có phương án): giáo viên bấm ✓ Đúng / ✗ Sai, sau đó vẫn tự chuyển câu.
- Hết bộ câu hỏi: đội đang dẫn thắng; hòa thì báo hòa (trước đây màn hình bị treo ở câu đầu).
- “Trả lời sai → Đội bạn được trả lời”: đội kia được trả lời chính câu đó một lần.
- Vẫn có chế độ “Giáo viên chấm tay” trong thiết lập. Bấm “Bắt đầu trận” tự lưu thiết lập đang chọn.
- Màn chơi gọn lại để câu hỏi và 4 đáp án nằm trong một màn hình 1366×768; chữ đáp án to hơn.

### Quiz Nghiêng Đầu
- **Camera tự bật khi bấm “▶ Bắt đầu”** (bản 1.0 phải bấm thêm nút “📷 Bật camera” nên dễ tưởng là chưa có camera). Lần đầu Chrome hỏi quyền dùng camera: chọn Cho phép.
- Vòng đo góc nghiêng không còn phụ thuộc việc cửa sổ đang được vẽ, nên không bị đứng khi cửa sổ bị che.
- **Đã thử trên chính máy của thầy (qua khung trình duyệt của Claude, 11/10):** bộ nhận diện MediaPipe thật tải được từ Internet (khoảng 10 giây lần đầu), chạy được cả GPU lẫn CPU; với ảnh chân dung mẫu xoay ±20° đo được −19,2° / +20,6°; chơi thử 3 câu bằng “camera giả” (ảnh chân dung xoay): nghiêng phải → ghi nhận ĐÚNG, nghiêng trái → ghi nhận SAI, về giữa → tự sang câu, nghiêng thoáng qua → bỏ qua. **Chưa thử với webcam thật và người thật.**

### Kho câu hỏi
- Thêm nút **“📄 Nhập từ tệp”** cạnh “＋ Thêm câu hỏi” để vào thẳng phần nhập bằng tệp (Word, Excel, CSV, TXT, JSON). Hai nút mở cùng một hộp thoại.
- Câu hỏi mở đưa vào trò chơi nay mang theo đáp án gợi ý.

### Kiểm thử bản 1.1 (trình duyệt Chromium trong môi trường của trợ lý)
- Kéo co: **44/44 đạt** (`kiem-thu/tug-results.json`).
- Chạy lại toàn bộ: Kho 70/70, Quiz 43/43, định dạng tệp 10/10 (PDF vẫn chưa hỗ trợ).
- Chưa kiểm: nghe nhạc bằng loa thật; camera thật (như mục 5).

## 1. Cách mở

1. Bấm đúp **`MO-HOC-MA-VUI.cmd`** trong thư mục này.
2. Chrome mở `http://127.0.0.1:8780/` bằng hồ sơ riêng `profile-BAN-CHINH`. Góc dưới phải hiện `HMV-BAN-CHINH-2.1-20261011`.
3. Lần chạy đầu, bộ khởi chạy tự chép `node.exe` (91 MB) từ một thư mục bản cũ nằm cạnh vào `runtime\`. Vì vậy **hãy chạy bản chính ít nhất một lần trước khi xóa các thư mục cũ.**

Bản chính dùng cổng và hồ sơ riêng nên **không đụng dữ liệu lớp thật** (danh sách học sinh, clip, âm thanh) ở cổng 8765.

## 2. Những gì đã làm

### Quiz Nghiêng Đầu
- **Nghiêng TRÁI = SAI, nghiêng PHẢI = ĐÚNG.** Thẻ SAI luôn ở bên trái, thẻ ĐÚNG bên phải; chấm điểm theo đúng quy ước này.
- **Camera nhận diện góc nghiêng của đầu** (góc giữa hai đuôi mắt, không dựa vào vị trí khuôn mặt): tự hiệu chỉnh tư thế thẳng, có nút Hiệu chỉnh lại, ngưỡng nghiêng 8–30°, thời gian giữ 0,6–1,2 giây.
- Trạng thái hiển thị: Đang tìm khuôn mặt → Đã nhận diện → Nghiêng trái / Nghiêng phải → Đã ghi nhận đáp án.
- Không có khuôn mặt hoặc có từ hai khuôn mặt thì không ghi nhận. Nghiêng thoáng qua thì hủy. Đã ghi nhận rồi thì phải đưa đầu về giữa mới sang câu tiếp (chống chọn lặp).
- Thoát trò chơi hoặc chuyển sang màn hình khác thì camera tắt hẳn và bộ nhận diện được giải phóng. Không lưu, không gửi hình ảnh.
- **Phím ← / → và chạm vào thẻ luôn dùng được**; Enter để sang câu.
- Quiz lấy câu từ bộ đã chọn trong Kho (trước đây chỉ đọc nguồn cũ và rơi về câu mẫu cứng). Hộp thiết lập gom về một trang; tiêu đề không còn chữ trắng trên nền trắng.

### Kho câu hỏi
- **Một hộp thoại thêm câu hỏi duy nhất**, mở bằng nút “＋ Thêm câu hỏi” (dán, tải tệp, nhập từng câu) hoặc nút “📄 Nhập từ tệp” (từ bản 1.1). Đã bỏ các nút trùng chức năng của bản cũ (“Tạo bộ”, “Nhập thông minh”, “Dùng cho trò chơi”).
- **Phân loại theo 7 dạng**, hiện thành hàng thẻ kèm số câu: A–B–C–D · Đúng/Sai · Nhiều đáp án · Điền khuyết · Trả lời ngắn · Ghép đôi · Câu hỏi mở. Bấm một thẻ để lọc.
- **Tự phân loại khi nhập:** bảng xem trước ghi “Tự phân loại: A–B–C–D: 12 · Đúng/Sai: 8 …”; tự gắn lớp và năm học theo lớp đang chọn.
- Mỗi bộ có **Chơi ngay** (vào thẳng trò chơi tương thích), **Luyện tập**, **Xem**, và menu ⋯ (Sửa, Sao chép, Xuất dữ liệu, Xóa).
- **Luyện tập (mới):** làm được cả 7 dạng ngay trong Kho, chấm tự động, hiện đáp án. Nhờ vậy các dạng chưa có trò chơi nhận vẫn dùng được ngay.
- So trùng khi nhập: giữ nguyên dấu phép tính (“25 + 15” khác “25 − 15”); không so với bộ mẫu để bộ của thầy luôn được nhập đủ câu.
- Kho chia hai nhóm: “Bộ câu hỏi của tôi” và “Bộ câu hỏi mẫu”.

### Bộ câu hỏi mẫu Toán lớp 1–5
7 bộ × 20 câu = **140 câu**, mỗi bộ một dạng, mỗi lớp 4 câu. Nạp sẵn ở lần chạy đầu. Xóa rồi thì không tự nạp lại; có nút “Nạp bộ câu hỏi mẫu”.

| Bộ | Dạng | Dùng được ở |
|---|---|---|
| Mẫu 1 | A–B–C–D | 6 trò chơi + Luyện tập |
| Mẫu 2 | Đúng/Sai | 6 trò chơi (có Quiz Nghiêng Đầu) + Luyện tập |
| Mẫu 3 | Nhiều đáp án | Luyện tập |
| Mẫu 4 | Điền khuyết | Luyện tập |
| Mẫu 5 | Trả lời ngắn | Luyện tập |
| Mẫu 6 | Ghép đôi | Luyện tập |
| Mẫu 7 | Câu hỏi mở | 5 trò chơi theo đội (giáo viên chấm) + Luyện tập |

Đáp án của 120 câu có đáp án duy nhất đã được tính lại độc lập bằng máy (229 phép kiểm, 0 lỗi). 20 câu hỏi mở chỉ có gợi ý cho giáo viên. Thầy nên đọc lướt nội dung trước khi dùng với học sinh.

## 3. Camera: việc cần làm một lần

Môi trường tôi làm việc bị chặn mạng ngoài nên **không đóng gói sẵn được bộ nhận diện khuôn mặt MediaPipe**. Thầy chọn một trong hai cách:

- **Cách 1 (nên dùng):** khi máy có Internet, bấm đúp **`TAI-BO-NHAN-DIEN-CAMERA.cmd`**. Tệp này tải 4 tệp từ nguồn chính thức (thư viện `@mediapipe/tasks-vision` 0.10.14 qua jsDelivr và mô hình `face_landmarker.task` từ máy chủ của Google) vào `app\vendor\mediapipe`. Sau đó camera chạy hoàn toàn offline.
- **Cách 2:** không làm gì. Lần đầu bật camera khi có Internet, ứng dụng tự tải và lưu lại trong hồ sơ Chrome để dùng offline.

Chưa có bộ nhận diện thì Quiz báo rõ lý do, tự tắt camera và vẫn chơi được bằng phím/chạm.

## 4. Kết quả kiểm thử

Môi trường: Chromium 141 không giao diện (Playwright 1.56) trên Linux, chạy đúng mã trong `app\` qua `server.cjs`, mỗi bài một hồ sơ trình duyệt mới.

| Bộ kiểm thử | Kết quả | Tệp kết quả |
|---|---|---|
| Quiz Nghiêng Đầu | **42/42 PASS** | `kiem-thu/quiz-results.json` |
| Kho câu hỏi, Luyện tập, Chơi ngay, offline, bố cục | **70/70 PASS** | `kiem-thu/kho-results.json` |
| Định dạng tệp (TXT, CSV, JSON, XLSX, DOCX, 5 kiểu trình bày Word) | **10/10 PASS**, PDF bị từ chối rõ ràng | `kiem-thu/formats-results.json` |
| Đáp án 140 câu mẫu | **229 phép kiểm, 0 lỗi** | `kiem-thu/verify-demo-result.json` |
| Ba bài kiểm tra sẵn có của Codex (cú pháp, bộ phân tích 100/100, đọc tệp) | PASS | — |

Một số điểm đã kiểm:
- Quiz: phím và chạm, trái = SAI/phải = ĐÚNG, chấm điểm, câu cuối, kết thúc, chơi lại, thoát.
- Camera (dùng **điểm mốc khuôn mặt giả lập**): không mặt, hai mặt, nghiêng thoáng qua, giữ nghiêng, chống lặp, tự sang câu, hiệu chỉnh ở tư thế lệch, dưới ngưỡng, tắt camera khi thoát và khi đổi màn hình, không có bộ nhận diện.
- Luyện tập: làm trọn cả 7 bộ mẫu theo đáp án → 20/20 mỗi bộ; trả lời sai; bỏ qua.
- Chơi ngay: bộ A–B–C–D vào thẳng 6 trò; bộ Đúng/Sai vào thẳng 5 trò và Quiz; Lật mảnh ghép chơi trọn một vòng.
- Ngắt mạng: tải lại, mở Kho, đọc tệp Word, Luyện tập, Đường đua.
- Bố cục 1366×768 và 1920×1080.

## 5. CHƯA KIỂM THỬ

- **MediaPipe thật với webcam thật.** Phần xử lý nghiêng đầu đã kiểm bằng dữ liệu giả lập; việc nạp thư viện thật, độ chính xác, ánh sáng, khoảng cách chỉ kiểm được trên máy thầy. Địa chỉ tải và số phiên bản 0.10.14 tôi viết theo tài liệu MediaPipe, chưa tải thử được.
- **Hai tệp `.ps1` (khởi chạy và tải bộ nhận diện).** Tôi không chạy được PowerShell. Bộ khởi chạy viết theo đúng mẫu `KHOI-DONG-THU.ps1` đã chạy trên máy thầy, thêm bước chép `node.exe`.
- Chrome trên Windows của máy thầy; ngắt Wi-Fi thật; loa; máy chiếu.
- Chơi trọn ván Kéo co, Hộp quà, Ai nhanh hơn, Đường đua, Chinh phục tri thức (mới kiểm vào chơi và câu đầu).
- Vòng quay kết nối, Nốt nhạc vui, Thi đua, Lớp học: không sửa, chỉ kiểm mở màn hình không lỗi.

## 6. Tồn tại

1. Các trò chơi chỉ nhận A–B–C–D, Đúng/Sai và câu hỏi mở. Nhiều đáp án, Điền khuyết, Trả lời ngắn, Ghép đôi dùng ở Luyện tập.
2. Số câu tối thiểu của trò chơi: Lật mảnh ghép 9, Hộp quà 8, Đường đua 10, Chinh phục tri thức 3/5/10. Bộ ít câu hơn sẽ dừng ở màn thiết lập kèm thông báo.
3. Trò chơi ghi nhớ bộ đã chọn cho lần mở sau.
4. Trong màn thiết lập của từng trò chơi vẫn còn bảng “Nguồn câu hỏi” và nút “⚙ Câu hỏi” của bản cũ. Tôi chưa gộp hai chỗ này vì chạm vào mã của từng trò.
5. PDF chưa đọc được.
6. Dữ liệu thầy nhập ở các bản thử (ví dụ hai bộ “Bộ nhập Chặng 7” ở cổng 8778) nằm trong hồ sơ Chrome của bản thử đó, không tự sang bản chính. Muốn chuyển: mở bản cũ → Kho → ⋯ → Xuất dữ liệu, rồi ở bản chính bấm ＋ Thêm câu hỏi → Tải tệp.
7. Mã nguồn ở thư mục gốc của kho Git (`index.html` ngoài cùng) chưa được cập nhật theo bản chính. Không commit, push hay deploy.

## 7. Dọn các bản cũ (thầy tự làm, tôi không xóa được)

Chỉ xóa **sau khi** đã chạy bản chính một lần và nghiệm thu xong.

| Thư mục / tệp | Đề nghị |
|---|---|
| `HOC-MA-VUI-BAN-CHINH` | **Giữ – bản chính** |
| `TRINH-DIEN-11-10-2026`, `HOC-MA-VUI-05B-WINDOWS-X64*.zip` | Giữ: bản 05B ổn định, gắn với dữ liệu lớp thật ở cổng 8765 |
| `TRINH-DIEN-09-11-10-2026` | Giữ đến hết ngày hội (bản trình diễn 09) |
| `TRINH-DIEN-10-CHANG-1`, `-2`, `-2B`, `-2C`, `-5`, `-6`, `-7`, `-7A`, `-7B` | Xóa được: nội dung đã nằm trong bản chính |
| `BAN-CHAY-THU-06-07-B`, `BAN-CHAY-THU-08-R`, `BAN-CHAY-THU-08-R1` | Xóa được |
| `qa-*`, các tệp `qa-c5-*`, `qa-c6-*` ở thư mục gốc | Xóa được nếu không cần giữ bằng chứng kiểm thử cũ |

Lưu ý: mỗi thư mục bản thử chứa hồ sơ Chrome riêng (`profile-…`). Xóa thư mục là mất dữ liệu đã nhập trong bản thử đó.

## 8. Việc thầy cần nghiệm thu

1. Bấm đúp `MO-HOC-MA-VUI.cmd`; kiểm tra nhãn `HMV-BAN-CHINH-2.1-20261011`.
2. **Kho câu hỏi:** thấy 7 bộ mẫu và hàng thẻ 7 dạng. Bấm **Luyện tập** ở vài bộ.
3. Bấm **＋ Thêm câu hỏi → Tải tệp**, chọn tệp Word 20 câu Đúng/Sai của thầy. Mong đợi: “Nhận 20 · hợp lệ 20 — Tự phân loại: Đúng/Sai: 20”.
4. **Chơi ngay** bộ Mẫu 2 → Quiz Nghiêng Đầu → Bắt đầu. Thử phím ← / →.
5. Chạy `TAI-BO-NHAN-DIEN-CAMERA.cmd` (có Internet), mở lại Quiz, bấm **Bật camera**, giữ đầu thẳng 1 giây rồi nghiêng trái/phải.
6. Thử trên loa và máy chiếu.

## 9. Tệp trong thư mục này

| Tệp | Vai trò |
|---|---|
| `MO-HOC-MA-VUI.cmd` / `.ps1` | Bộ khởi chạy duy nhất |
| `TAI-BO-NHAN-DIEN-CAMERA.cmd` / `.ps1` | Tải bộ nhận diện khuôn mặt (một lần) |
| `server.cjs` | Máy chủ cục bộ, cổng 8780 |
| `app\index.html` | Ứng dụng; phần Quiz Nghiêng Đầu đã viết lại |
| `app\kho-cau-hoi.js`, `app\ban-chinh.css` | Kho câu hỏi mới, Luyện tập (thay `question-bank-stage7b.*`) |
| `app\bo-cau-hoi-mau.js` | 140 câu hỏi mẫu |
| `app\quiz-camera.js` | Đo góc nghiêng bằng MediaPipe |
| `app\question-bank-stage7.js` | Hộp Thêm câu hỏi và bộ phân tích (đã sửa so trùng) |
| `app\question-quick-stage6.js` | Nối bộ câu hỏi với trò chơi |
| `app\sw.js` | Chạy offline; không còn lưu nhầm lỗi 404 |
| `kiem-thu\` | Kịch bản và kết quả kiểm thử, ảnh chụp |
| `SHA256SUMS.txt` | Mã băm các tệp |

Đã bỏ khỏi bản chính: `question-bank-stage7b.js`, `question-bank-stage7b.css`, `question-quick-stage7.js` (tệp không còn được nạp).
