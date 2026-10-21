# Bối cảnh dự án HỌC MÀ VUI – THAYKHAIEDU

## Lệnh 06D — nối cặp, 20/10/2026

Tận dụng type MATCHING/pairs=[{left,right}]. Câu mới khi đổi loại ở editor có metadata.matchingScoring='per-pair'; 2–8 mục riêng biệt mỗi cột, mỗi hàng giáo viên nhập một cặp đúng. Thêm/bỏ cặp và lời giải; tối thiểu hai hàng, nút thêm khóa ở tám. MATCHING cũ không cờ vẫn giữ chấm trọn câu bằng mảng đối tượng left/right; không âm thầm đổi điểm cũ. Domain chỉ thêm nhánh per-pair với mảng chỉ số B/null theo thứ tự A, tính points × số cặp đúng / tổng cặp; không làm tròn dữ liệu. Chỉ số trùng B không được tính đúng cho các vị trí trùng. Các loại khác giữ nguyên.

HTML setupMatching dùng nút hai cột: chạm A rồi B, chạm A đã nối để bỏ/chọn lại, B đang dùng tự bỏ ghép trước để giữ một-một. Màu pastel và nhãn Cặp n chỉ biểu thị lựa chọn, không ám chỉ đúng/sai. Fisher–Yates xáo thứ tự B (nếu ngẫu nhiên vẫn nguyên thì xoay một vị trí), matchingOrder lưu trong snapshot nháp để reload không xáo lại. Khóa nút khi nộp, giữ bản sao/lượt làm theo cơ chế có sẵn. Điểm hiển thị hai số thập phân khi bài có matching per-pair, dữ liệu không bị làm tròn. Đáp án từng cặp, điểm và nút lời giải theo 05B.2/05C. Không đổi vở ô li/âm thanh/nhạc/backend.

26 unit matching/domain/exporter/FILL/TRUEFALSE/MULTI PASS; Chrome A–G PASS ở viewport 390px: đúng hết/1 phần/trống, B xáo và reload ổn định, đổi/bỏ cặp không trùng B, nộp khóa, ẩn đáp án/lời giải và ẩn điểm độc lập, editor sửa/thêm/lưu/xuất và mở file offline, SINGLE cũ, không HTTP/JS error hoặc tràn ngang. Chỉ kiểm thao tác browser mô phỏng, chưa thử thiết bị cảm ứng vật lý. Test unsupported cũ đổi MATCHING sang giá trị kiểm thử UNSUPPORTED (chỉ inject trong test, không thêm loại câu hỏi app). Bằng chứng `outputs/review-html-06d/results.json`, mẫu `tu-trinh-bien-tap-noi-cap.html` trong thư mục chat. File nguồn sửa app/review-domain.js, review-ui.js, review-html.js; thêm fixture và hai test review-matching, cập nhật hai test exporter cũ. Giới hạn một-một với nhãn riêng biệt, không kéo thả/vẽ dây, không chấm nội dung mở. Không ảnh/video, không commit/push/deploy. Dừng sau 06D.

## Lệnh 06C — điền khuyết, 20/10/2026

Tận dụng type FILL, thêm tùy chọn q.blanks=[{id:'1',answerText:'…',acceptedAnswers:[]}]. Nội dung chứa mỗi [[id]] đúng một lần; ID là chuỗi số nguyên dương, không cần liền nhau. Domain validateFillBlanks kiểm mã thiếu/trùng/sai cú pháp, thiếu khóa, cấu hình thừa/thiếu; có marker nhưng không có blanks cũng từ chối. FILL cũ không marker/không blanks vẫn chấm scalar theo hành vi cũ. Không đổi bộ chấm các loại khác.

submitAttempt chấm từng ô, điểm câu = points × số ô đúng / tổng ô, không làm tròn ở dữ liệu. So NFC, trim/gộp khoảng trắng và chữ thường tiếng Việt; không bỏ dấu hoặc đổi số/đơn vị. Chỉ nhận answerText và acceptedAnswers do giáo viên khai báo. Renderer chỉ làm tròn số hiển thị hai chữ số thập phân ở bài có FILL nhiều ô; dữ liệu điểm/JSON vẫn đầy đủ độ chính xác Number.

Editor thêm Điền khuyết, nút Cập nhật chỗ trống lấy mã từ nội dung và giữ đáp án theo ID, ô đáp án chuẩn và biến thể từng dòng, dùng lời giải 05C. Lưu kiểm riêng lỗi FILL trước ghi IndexedDB; xuất dùng validateDocument. HTML thay marker thành input ngay trong câu, escape văn bản, 390px không tràn, lưu nháp/reload/khóa sau nộp, JSON bản sao chỉ giữ ID ô và câu trả lời, không khóa. Phản hồi từng ô/điểm/lời giải tuân chính sách hiện có; ẩn đáp án không lộ đúng/sai/hướng dẫn, ẩn điểm vẫn được xem khóa nếu giáo viên cho phép. Đường bài học trong app cũng lưu câu trả lời theo ID. Không sửa âm thanh/nhạc/vở ô li/lượt/backend.

24 unit FILL/domain/exporter/MULTI/TRUEFALSE PASS; Chrome A–H PASS: một/nhiều ô, 2/3 giữ nguyên dữ liệu và hiển thị 0,67, dấu/NFD/hoa/thường/khoảng trắng, biến thể xác nhận, sai đơn vị/số/trống, sửa/lưu các dòng biến thể, thiếu/trùng mã chặn lưu/xuất, HTML tải thực offline, nháp reload/khóa, chính sách điểm/đáp án/lời giải, dạng SINGLE cũ. Các ca unsupported FILL trong test exporter cũ đổi sang MATCHING, vẫn kiểm không bỏ câu. Nguồn sửa: app/review-domain.js, review-ui.js, review-html.js; test/fixture mới review-fill*, hai test exporter cũ cập nhật loại unsupported. Bằng chứng `outputs/review-html-06c/results.json`, mẫu `tu-trinh-bien-tap-dien-khuyet.html` trong thư mục chat. Không ảnh/video, không commit/push/deploy. Dừng sau 06C; chưa kéo thả/nối cặp.

## Lệnh 06B — nhiều đáp án đúng, 20/10/2026

Tận dụng type MULTI/options/correctAnswers đã có. Domain chỉ nới validation MULTI từ tối thiểu hai khóa thành tối thiểu một khóa; vẫn từ chối khóa trùng/chuỗi/ngoài phạm vi. Thuật toán submitAttempt khớp tập hợp nguyên vẹn giữ nguyên: đủ đúng mới đủ điểm, thiếu/thừa/trống đều 0, không chấm từng phần. Các dạng cũ không đổi.

`review-ui.js` đặt nhãn Nhiều đáp án đúng, tái sử dụng checkbox khóa, thêm nút Thêm phương án cho MULTI và ô lời giải 05C. `review-html.js` nhận MULTI, checkbox với hướng dẫn Chọn tất cả đáp án đúng; đọc/lưu mảng chỉ số, khôi phục sau reload, khóa khi nộp. Phản hồi liệt kê đủ khóa đáp án, điểm đúng chính sách độc lập. Khi chưa được xem đáp án: không feedback/lời giải; khi ẩn điểm: không đúng/sai/điểm từng câu. Nút Vì sao em sai? chỉ khi câu đã trả lời sai, có lời giải và đủ quyền. Đề gốc không đổi khi xuất chưa lưu. Không sửa TRUEFALSE/vở ô li/lượt/âm thanh/backend.

Test mới review-multi.test.cjs, review-multi-browser.cjs và fixture review-multi4.json. 19 unit domain/MULTI/TRUEFALSE/mixed PASS; 7 unit exporter PASS. Các ca test cũ dùng MULTI làm loại chưa hỗ trợ được đổi sang FILL; không bỏ kiểm lỗi loại chưa hỗ trợ. Chrome A–G PASS: đủ/thiếu/thừa/trống, chọn/bỏ chọn, nháp reload/khóa, một khóa đúng trong MULTI, thêm E và sửa/lưu/xuất lời giải, HTML tải về offline, đề nguồn không bị ghi khi xuất, quyền điểm/đáp án/lời giải, SINGLE cũ và 390px không tràn/mạng/JS error. Bằng chứng `outputs/review-html-06b/results.json`, mẫu tải thực `tu-trinh-bien-tap-nhieu-dap-an.html` trong thư mục chat. Không ảnh/video, không commit/push/deploy. Dừng sau 06B; chưa có điểm từng phần.

## Lệnh 06A — Đúng/Sai, 20/10/2026

Tận dụng type TRUEFALSE đã có trong domain. Dạng cũ vẫn dùng options hai mục + correctAnswers chỉ số và đáp án học sinh kiểu số. Dạng nhóm bổ sung tùy chọn questions[].statements=[{text,answer:boolean}], học sinh trả lời mảng boolean/null theo thứ tự. normalizeDocument bảo toàn mảng, validateQuestion từ chối danh sách rỗng/nội dung rỗng/khóa thiếu hoặc không boolean. Không ép chuỗi 'true'/'false' thành đáp án hợp lệ. Cùng submitAttempt tính một lần points = điểm câu × số ý đúng / số ý, ghi correctCount/statementCount; không chia rồi làm tròn từng ý. Bỏ trống tính không đúng, tất cả đúng giữ nguyên điểm tối đa. Không sửa công thức chấm các loại cũ. Số thập phân tuần hoàn vẫn theo độ chính xác Number, chưa định dạng phân số giao diện.

`review-ui.js` tận dụng mục Đúng/Sai, khi đổi loại mới tạo danh sách nhận định, cho thêm/bỏ/sửa từng nhận định và chọn Đúng/Sai rõ ràng, dùng trường lời giải 05C và điểm chung. TRUEFALSE cũ vẫn có editor một nhận định; nút Soạn dạng nhiều nhận định chỉ đổi khi giáo viên chủ động. Đường thực hành trong app cũng đọc/lưu từng ý. `review-html.js` xuất radio riêng từng ý, khôi phục nháp/khóa sau nộp, tính tiến độ hoàn thành khi mọi ý đã được chọn; cảnh báo bài còn thiếu khi bỏ trống một ý. Phản hồi từng ý/điểm/lời giải tuân quyền 05B.2; sai một phần có lời giải và đã được phép xem thì có Vì sao em sai?; tất cả bỏ trống không hiện nút lời giải. JSON bài làm giữ nội dung nhận định, không thêm khóa đáp án. Vở ô li/lượt làm/âm thanh/nhạc giữ nguyên.

File nguồn thay đổi: app/review-domain.js, review-ui.js, review-html.js. Test mới review-truefalse.test.cjs, review-truefalse-browser.cjs và fixture review-truefalse4.json. 17 unit domain/mixed/TRUEFALSE PASS; Chrome A–F PASS: một/nhiều ý, đổi chọn, 2/3 và 1/3, trống, nháp reload/khóa nộp, editor sửa/thêm/lưu/xuất, ẩn đáp án/lời giải/ẩn điểm độc lập, dạng TRUEFALSE/SINGLE cũ và file offline 390px không tràn hoặc mạng/JS error. Lỗi đầu tiên chỉ là selector test thiếu dấu nháy quanh số, đã sửa; không lỗi sản phẩm trong lần chạy nghiệm thu. Bằng chứng `outputs/review-html-06a/results.json`, HTML tải thực `tu-trinh-bien-tap-dung-sai.html` trong thư mục chat. Không ảnh/video, không backend/game/Auth/Supabase, không commit/push/deploy. Dừng sau 06A.

## Lệnh 05E.1 — nhạc nền luyện tập, 20/10/2026

Chỉ sửa `app/review-ui.js`, `app/review-html.js`, thêm `kiem-thu/review-music.test.cjs`/`review-music-browser.cjs`. Giáo viên cấu hình metadata.backgroundMusic: enabled mặc định false, onlineUrl HTTPS công khai không credentials/query/fragment, offlineSrc là data audio MP3/OGG/WAV do FileReader từ tệp chủ động chọn tối đa 1 MB, fileName, volume mặc định .1, rightsConfirmed. Có nút bỏ tệp, thanh âm lượng và xác nhận quyền dùng nhạc không lời. Cấu hình chỉ hiện/áp dụng bài luyện tập. Thiếu xác nhận hoặc nguồn không hợp lệ: không xuất nguồn, học sinh thấy nút khóa kèm lý do. Khi tắt, renderer chỉ xuất enabled:false, không đưa URL/tệp vào HTML. Đề cũ thiếu cấu hình không thêm panel hoặc tự phát.

HTML tạo Audio chỉ khi bấm Bật nhạc, preload none, loop true, volume theo cài đặt và thanh điều chỉnh học sinh. Ưu tiên URL rồi tệp nhúng; lỗi/timeout khởi động 6 giây thử nguồn sau. Không dùng cache tùy biến/Service Worker; URL offline chỉ có thể chạy nếu cache trình duyệt thực sự có tài nguyên, không tuyên bố chắc chắn. Dừng khi nộp/rời trang; sự kiện nghe nhận xét tạm dừng/giải phóng nhạc, không tự bật lại để tránh chồng tiếng. Token chặn callback cũ. Không sửa chấm điểm/nhận xét/vở ô li/lượt/quyền xem/lời giải.

15 unit PASS (music mô phỏng + audio nhận xét + feedback). A bật/tắt, C dừng nộp, D nhường nhận xét PASS mô phỏng; B volume PASS mô phỏng và editor thật lưu .25; E thiếu nguồn và F HTML không nhạc/10/10/nhận xét cũ PASS Chrome offline. Editor mặc định tắt/10%, bật/lưu/xuất PASS. Chưa thử phát nhạc thật, chưa có nguồn nhạc có phép được cung cấp: H05E.1-audio BLOCKED. Không tạo/tải nhạc AI hoặc không rõ bản quyền. Bằng chứng `outputs/review-html-05e1/results.json`; mẫu `tu-trinh-bien-tap-nhac-nen.html` hiện không có nguồn nên nút nhạc khóa (không giả vờ có nhạc). Không ảnh/video/báo cáo dài, không commit/push/deploy. Dừng sau 05E.1.

## Lệnh 05D.2 — audio online first/offline ready, 20/10/2026

Chỉ sửa renderer `app/review-html.js` và thêm hai test review-audio. Tái sử dụng khung nhận xét/chữ/quyền hiện có. `feedbackAudioGroups` có 8 ID ổn định excellent/good/satisfactory/effort/review/unanswered/pending/neutral. Toàn bộ lời đọc hiện là DỰ THẢO chưa được giáo viên xác nhận, teacherConfirmed=false, onlineUrl/offlineSrc=null. Chưa có nguồn âm thanh thật; không tạo/tải MP3 hoặc tự gán URL. Cần giáo viên duyệt lời đọc và cung cấp file/URL có quyền dùng trước khi nghiệm thu nghe.

Dữ liệu cấu hình tối thiểu qua `metadata.feedbackAudio` là mảng theo ID, text đúng lời trong catalog, teacherConfirmed=true, onlineUrl HTTPS công khai (không credentials/query/fragment) và/hoặc offlineSrc data:audio/mpeg|mp3|ogg|wav;base64 thực. normalizeFeedbackAudio chỉ nhận các nhóm đã xác nhận với text khớp. Nhúng dự phòng chỉ khi có nguồn được cung cấp, giới hạn chuỗi ~2,8 triệu ký tự mỗi nguồn; không tự đóng gói hay tải cả danh mục. Chưa thêm màn hình cài đặt. Cờ xác nhận là cấu hình nội dung, không phải xác thực backend hoặc chứng minh file khớp lời đọc; giáo viên phải nghe/đối chiếu tài nguyên thật.

Khi bấm Nghe: HTMLAudioElement tải nguồn online riêng nhóm, lỗi/từ chối play hoặc chờ 6 giây (kể cả stalled/waiting) thử nguồn offline, rồi giọng Việt localService=true; thiếu hết thông báo và giữ chữ. Không tự phát/preload danh mục; dùng cache HTTP mặc định, không đổi Service Worker. Dừng/nghe lại/rời trang hủy timer, pause/giải phóng audio, cancel speech; generation guard chặn callback cũ. Nhóm trung tính luôn ưu tiên khi điểm hoặc đáp án ẩn; pending rồi bỏ trống, sau đó phân nhóm theo kết quả đã chấm. Audio nhóm không đọc điểm/số câu/nguyên nhân sai hoặc thông tin cá nhân. Chữ cá nhân hóa vẫn giữ nguyên 05D.1. Khả năng phát file/giọng khi offline chưa được chứng minh vì chưa có tài nguyên thật.

18 unit PASS (audio mô phỏng + nhận xét + exporter); Chrome offline thực PASS fallback chữ, 10/10/nhận xét cũ, không HTTP/JS error. Audio mô phỏng dùng nguồn ký hiệu chỉ trong bộ nhớ test, không có URL/tệp giả trong HTML mẫu. A nghe online thật BLOCKED; B chuỗi dự phòng PASS mô phỏng, nghe offline thật BLOCKED; C PASS Chrome; D PASS mô phỏng; E/F PASS unit và F Chrome; G PASS hồi quy trọng tâm, không chạy toàn bộ 05A–05C. Bằng chứng `outputs/review-html-05d2/results.json`, `nhan-xet-online-first.html` trong thư mục chat. Native chỉ có ba giọng en-US, không dùng thay giọng Việt. Không AI/TTS backend, không commit/push/deploy. Dừng sau 05D.2 ở trạng thái thiếu nguồn âm thanh thật.

## Lệnh 05D.1 — nhận xét chung và nghe, 19/10/2026

Tái sử dụng createFeedback/setupSpeech trong `app/review-html.js`, không đổi chấm điểm/vở ô li/lượt/quyền đáp án/lời giải. Nhận xét 2–4 câu: dựa results đúng/sai/trống; SHORT chỉ khoảng trắng được tính trống. Chỉ dùng chủ đề câu hỏi khi metadata.topicConfirmed===true; không suy từ chủ đề đề chung. Không trích lời giải câu sai vào nhận xét chung hay giọng đọc. Bài pending-manual nhận lời cảm ơn và thông báo chưa có kết quả toàn bài. Khi một trong quyền điểm/đáp án chưa mở, chỉ hiện/đọc hai câu trung tính, không số câu/điểm/đúng sai/chủ đề sai. Khung nhận xét giờ hiện sau nộp cả ở hai trường hợp này; quyền hiển thị điểm/đáp án và nút lời giải vẫn giữ nguyên. Đây là bổ sung được yêu cầu ở 05D.1, thay thế việc ẩn cả khung nhận xét ở các phiên trước.

Web Speech cũ tiếp tục chọn giọng Việt localService=true, ưu tiên vi-VN; nút Dừng nghe, không tự phát, cancel khi nghe lại/rời trang, xử lý voiceschanged/onend/onerror. Chỉ đọc teacher-comment, không đọc chi tiết câu. Không AI/TTS online/khóa API. Native Chrome hiện có Microsoft David/Mark/Zira (en-US local), không có vi: nút nghe khóa và thông báo, chữ vẫn hiện. TTS mô phỏng PASS không chứng minh nghe âm thanh thật. H05D.1-audio BLOCKED cho đến khi thiết bị có giọng Việt cục bộ và được kiểm nghe thực.

13 unit nhận xét/mixed PASS; Chrome offline nhận xét đúng hết/sai/trống/pending/ẩn kết quả PASS, TTS mô phỏng Nghe/Dừng/Nghe lại/không chồng/end/error/pagehide/voiceschanged/fallback PASS; hồi quy 05B.2 A–H và 05C A–E/editor PASS. Các test cũ chỉ đổi kỳ vọng từ khung nhận xét ẩn sang chữ trung tính, không nới kiểm đáp án/điểm. Bằng chứng `outputs/review-html-05d1/` trong thư mục chat: HTML `toan-4-nhan-xet-va-giong-doc.html`, browser-results.json, native-voices.json; không ảnh/video/báo cáo dài. Không commit/push/deploy. Dừng sau 05D.1.

## Lệnh 05C — lời giải câu sai, 19/10/2026

`review-ui.js` tái sử dụng trường explanation, bổ sung ô Lời giải chi tiết cho SINGLE/ABCD; SHORT dùng cùng ô, OPEN giữ hướng dẫn/tiêu chí chấm. `review-html.js` xuất studentExplanation cho câu tự chấm hợp lệ trong bài luyện tập; không đưa explanation/answerText tham khảo của OPEN hoặc hướng dẫn SHORT chờ chấm vào bản HTML. Lời giải là văn bản giáo viên nhập, không tạo nội dung bằng AI, không thêm âm thanh từng câu.

Sau nộp, câu đã trả lời và được engine chấm 0 điểm có lời giải mới hiện details Vì sao em sai?, nhãn Cách làm đúng và nguyên văn lời giải xuống dòng (giáo viên có thể ghi các bước/kiến thức cần nhớ trong trường này). Không đoán nguyên nhân sai. Chỉ hiện khi quyền xem đáp án và xem điểm đều cho phép: nút cũng tiết lộ đúng/sai nên không hiện khi điểm bị ẩn. Không nút cho câu đúng/trống/không lời giải/tự luận đang chờ. Nội dung gắn bằng textContent, không diễn giải HTML/script. Không đổi scoring/vở ô li/lượt làm/backend.

13 unit exporter/mixed PASS; Chrome file offline A–E và editor sửa/lưu/xuất trạng thái hiện tại PASS; không HTTP/JS error. Test có lời giải chứa markup độc hại và rubric tự luận có cờ confirmed để chứng minh không lọt vào HTML. Bằng chứng `outputs/review-html-05c/results.json`; mẫu tải từ editor `tu-trinh-bien-tap-loi-giai.html` dùng lời giải giả phục vụ test, không phải nội dung học liệu đã được giáo viên duyệt. Không ảnh/video/báo cáo dài, không commit/push/deploy. Dừng sau 05C. Công bố từ xa vẫn BLOCKED như 05B.2; HTML offline chỉ kiểm soát giao diện.

## Lệnh 05B.2 — xem điểm và đáp án, 19/10/2026

Cùng repository/nhánh, giữ mã chưa commit. `review-ui.js` lưu riêng `metadata.scoreVisibility` (immediate/teacher/never) và `answerVisibility` (immediate/after-attempts/teacher/never). Bài mới tạo bằng nút Tạo học liệu mặc định immediate/after-attempts, cùng 3 lượt đã có. Đề cũ thiếu từng cấu hình tiếp tục hành vi cũ, không tự thêm khi lưu. Chỉ hiện cài đặt cho bài luyện tập; renderer bỏ qua ở Đề kiểm tra.

`review-html.js` dùng cấu hình ban đầu của file để hiển thị: ẩn điểm chỉ báo Đã nộp bài; ẩn đáp án cũng ẩn đúng/sai, điểm từng câu và nhận xét/lời giải có thể gợi đáp án. Nhận xét chỉ hiện khi cả điểm và đáp án được xem. JSON tải về không đưa điểm khi bị ẩn, không đưa results từng câu nếu một trong hai quyền bị ẩn; vẫn giữ bài làm để giáo viên tiếp nhận. Không đổi engine/đáp án gốc/vở ô li/cơ chế đếm lượt. after-attempts dùng điều kiện hết lượt 05B.1; nếu không có giới hạn hữu hạn thì không tự mở đáp án và thông báo rõ. Tự luận tiếp tục tách điểm đã chấm/chờ chấm, không tạo điểm tổng giả.

teacher chỉ lưu cấu hình và báo Chờ giáo viên công bố; công bố từ xa BLOCKED do chưa có backend phù hợp. Đây chỉ là kiểm soát hiển thị offline: đáp án và kết quả vẫn có trong mã hoặc dữ liệu trình duyệt, không phải bảo mật kiểm tra chính thức. Không API/key/công bố giả.

Test: 8 unit exporter/lượt làm PASS; Chrome offline A–H PASS và editor thật mặc định/lưu/HTML tải về PASS; không request mạng hoặc JS error ở các file offline. Bằng chứng `outputs/review-html-05b2/results.json`, mẫu tải thực `tu-trinh-bien-tap-xem-dap-an-sau-2-luot.html` trong thư mục chat. Không ảnh/video/báo cáo dài, không commit/push/deploy. Dừng sau 05B.2; chưa làm 05C.

## Lệnh 05B.1 — số lần làm bài, 19/10/2026

`app/review-ui.js` lưu `metadata.attemptLimit`: 1, 2, 3 hoặc `'unlimited'`; bài mới tạo bằng nút Tạo học liệu mặc định 3. Đề cũ thiếu cấu hình giữ nguyên thuộc tính và hành vi khi mở/lưu; giáo viên có thể chủ động chọn mức mới. Chỉ hiện cài đặt cho Bài tập thường xuyên. `app/review-html.js` chỉ áp dụng cấu hình cho bài luyện tập (purpose thiếu hoặc Bài tập thường xuyên); Đề kiểm tra không áp dụng, không đổi quy trình chính thức.

HTML dùng cùng bản lưu localStorage, thêm `submissions` chứa riêng từng bài đã nộp (id, answers, results, score). Lượt chỉ tăng sau engine nộp thành công và lưu thành công; lỗi lưu giữ bài dở. Nút Làm lại tạo attempt mới, giữ lịch sử; hết lượt ẩn nút và báo hết lượt. Reload khôi phục số lượt. Đề cũ không cấu hình tiếp tục một bài khóa sau nộp như trước, không tự thêm hạn mức hoặc nút mới. Không thay scoring hoặc vở ô li. Bộ nhớ chỉ ràng buộc cùng trình duyệt/thiết bị/đường dẫn/nội dung đề, có thể bị xóa hoặc đổi thiết bị; không phải giới hạn bảo mật server.

Bằng chứng `outputs/review-html-05b1/` trong thư mục chat: `luyen-tap-2-luot.html`, `tu-trinh-bien-tap-2-luot.html`, `results.json`. 8 unit PASS; browser A–E PASS (2 lượt khóa; reload; bài dở/cancel; unlimited 4 lượt; đề cũ), kết quả 10/10 và 0/10 lưu riêng, lỗi lưu không trừ lượt, editor mặc định 3/lưu/xuất 2/ẩn khi chuyển Đề kiểm tra PASS. Không ảnh/video/báo cáo mới, không commit/push/deploy. Dừng sau 05B.1; không thực hiện 05B.2.

## Lệnh 05A.1 — vở ô li tương tác, 19/10/2026

Giữ nhánh `feature/review-assessment` và mã chưa commit. Thêm `metadata.answerLayout` cho câu OPEN: `grid-calculation`, `grid-text`, `plain` (mặc định cho đề cũ). Trình biên tập đang có chọn chế độ và xuất chính dữ liệu chưa lưu; renderer duy nhất `app/review-html.js` tạo HTML offline. Đề gốc không đổi khi xem trước/xuất. Không sửa scoring/domain, Auth, game, Service Worker hay production.

Vở đặt tính lưu câu trả lời dạng `grid-v1`: kích thước, dấu trong từng ô, tọa độ, danh sách nét kẻ ngang/dọc, lịch sử hoàn tác tối đa 30 bước. Số được nhập/dán theo ô đơn vị được chọn, vẫn sửa/đặt lệch cột thủ công; không tự tính. Ô li văn bản dùng textarea nền kẻ, giữ dấu và xuống dòng. Dữ liệu dùng cùng localStorage/attempt của 05A, khôi phục khi reload, khóa sau nộp và nằm trong JSON tải về. OPEN luôn chờ giáo viên chấm, không tự cấp điểm.

Mẫu và bằng chứng: `outputs/review-html-05a1/` trong thư mục chat gồm `toan-4-vo-o-li.html`, HTML tải từ trình biên tập, ảnh 390px/1366px cho 3 và 9 chữ số, `bai-lam-o-li.json`, `browser-results.json`, bản trắc nghiệm hồi quy. 16 unit PASS; Chrome offline file thật, kẻ chuột, pointer/touch mô phỏng, chạm hai điểm, tẩy/undo, số 9–10 chữ số, nháp/reload/nộp/JSON, editor và trắc nghiệm cũ PASS. Ảnh đã xem trực quan. Chưa thử cảm ứng trên thiết bị vật lý; video tùy chọn chưa tạo vì bản Playwright hiện có thiếu ffmpeg. Không coi sự kiện cảm ứng mô phỏng là nghiệm thu thiết bị thật. Dừng sau 05A.1.

## Lệnh 05A — đề HTML hỗn hợp, 19/10/2026

Nhánh `feature/review-assessment`, giữ mọi thay đổi chưa commit. Một renderer `app/review-html.js` giờ nhận SINGLE/ABCD, SHORT, OPEN. Trình biên tập `app/review-ui.js` thêm đáp án tương đương mỗi dòng, lựa chọn tự chấm khi đáp án xác định, lời giải/tiêu chí, sắp xếp câu, xem trước HTML; lưu bản nháp IndexedDB theo kiến trúc cũ. Xuất lấy trạng thái đang sửa, không ghi ngược đề gốc. Loại ngoài 3 dạng hoặc ngữ liệu liên kết vẫn báo lỗi rõ. `app/review.css` chỉ thêm khung xem trước.

Scoring `app/review-domain.js` giữ nguyên trắc nghiệm và SHORT cũ trong app. SHORT của HTML mới dùng `metadata.shortScoring='exact'` khi giáo viên đánh dấu đáp án xác định: so NFC và khoảng trắng, không tự đổi chữ hoa/đơn vị/cách viết số; `acceptedAnswers` là danh sách tương đương tường minh. Nếu thiếu cờ thì HTML xuất `manual`, chờ giáo viên chấm. OPEN luôn chờ chấm. `gradeManual` cho phép chấm câu SHORT đang chờ nhưng 05A chưa tạo luồng giáo viên nhập điểm vào file HTML. Mẫu mới `kiem-thu/fixtures/review-mixed4.json` có 2+2 điểm đã chấm và 6 điểm chờ; `score=null` cho tới khi mọi câu được chấm. Không hiện 4/10 là điểm tổng.

HTML tự lưu bài làm vào localStorage theo nội dung đề và đường dẫn file, có `attempt.id` riêng; phục hồi nháp/trạng thái nộp sau reload và khóa ô đã nộp. Sau nộp tải JSON chỉ gồm định danh đề/bài, câu hỏi, bài làm, trạng thái/điểm từng câu; không xuất khóa trắc nghiệm hay tiêu chí giáo viên trong bản sao. Chưa có server tiếp nhận, xác thực giáo viên hoặc đồng bộ; dữ liệu phụ thuộc lưu trữ của trình duyệt/thiết bị. File HTML vẫn chứa khóa chấm trắc nghiệm và câu ngắn nên chỉ dùng luyện tập, không dùng thi bảo mật. Lời giải/tiêu chí giữ ở đề gốc để 05B tra theo documentId/version. Mã 04C đã tồn tại trước 05A, chỉ giữ nguyên; âm thanh Việt thật vẫn BLOCKED, không thêm giọng đọc mới.

27 unit PASS (domain/export/feedback/05A); Chrome offline file:// PASS: nhập nhiều dòng, reload nháp, nộp/khóa/reload, 4/4 + tối đa 6 chờ, tải JSON, không HTTP, ảnh 390/1366px đã xem. Browser editor dùng dữ liệu giả PASS: sửa đáp án, sắp xếp, xem trước, xuất file tải thật rồi mở/chấm offline, thêm/lưu câu tự luận, kho nguồn không đổi khi xuất. Bộ browser editor trắc nghiệm cũ A–H PASS sau đổi ca không hỗ trợ từ OPEN sang MULTI. Lỗi `serviceWorker` trong iframe sandbox là do tùy chọn `serviceWorkers:'block'` của Playwright; bỏ riêng tùy chọn test, giữ iframe sandbox không cùng origin. Bằng chứng `outputs/review-html-05a/` gồm `toan-4-tu-trinh-bien-tap.html`, `toan-4-de-hon-hop.html`, `390-draft.png`, `390-result.png`, `1366-draft.png`, JSON bài làm, log/results. Không commit/push/deploy/DB production hoặc mở duyệt/xuất bản. H05A DONE, dừng ở đây.

## Lệnh 04C — nhận xét và Web Speech, 19/10/2026

Đã triển khai trong app/review-html.js: createFeedback dựa điểm/results/answers của engine cũ, phân biệt đúng/sai/trống, 2–5 câu khích lệ, không bịa nguyên nhân; chủ đề lấy dữ liệu có sẵn. Lời giải chỉ lấy khi raw.questions[i].metadata.explanationConfirmed===true, không kế thừa cờ xác nhận ở cấp đề. Đây là cờ nội dung, không phải kiểm chứng danh tính người duyệt; editor chưa có thao tác đánh dấu xác nhận mới trong phiên này. Export chỉ giữ topic và confirmedExplanation cần dùng, không xuất metadata tùy ý. Scoring engine/domain không đổi.

Màn hình kết quả có Lời nhận xét của thầy cô, Nghe/Dừng/Nghe lại, tốc độ .8/.95/1.1; mặc định .95, lang vi-VN, volume 1. Chỉ chọn voice tiếng Việt có localService===true, ưu tiên vi-VN; loại remote/English/không rõ. Không tự phát; cancel trước phát lại, xử lý voiceschanged/end/error/stale callback/pagehide/beforeunload. Không có API/AI/TTS ngoài, không đổi backend/RLS/SW/game hoặc mở xuất bản. localService chỉ là thông tin browser cung cấp, không phải đo lưu lượng OS hay bảo đảm phát âm thanh thực tế.

21 unit PASS (6 feedback/voice mới +7 exporter+8 domain). Browser file offline: nhận xét/điểm thật A–D và J/K/L PASS; F–I/lifecycle PASS bằng SpeechSynthesis mô phỏng, thêm ca API không hỗ trợ. E thiếu metadata kiểm bằng unit, không giả chẩn đoán. Chrome native có API nhưng getVoices()=[] (native-voices.json), fallback chữ đúng; âm thanh tiếng Việt thật BLOCKED, chưa nghe/kiểm chất lượng hoặc loa trên thiết bị. Không suy PASS audio từ mock. Ảnh 390/1366px đã xem. Hash domain/editor/SW nguyên, không commit/push/deploy.

Bằng chứng C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-04c/: toan-4-nhan-xet-va-giong-doc.html, browser-results.json, native-voices.json, tests.log, browser.log, 390-result-correct.png, 1366-result-one-wrong.png, 390-native-voice-fallback.png, REPORT.md. Tests mới kiem-thu/review-feedback.test.cjs và review-feedback-browser.cjs. H04C-code DONE; H04C-audio BLOCKED cần thiết bị có giọng Việt local và kiểm nghe thật; không cài giọng hoặc đổi cấu hình máy trong phiên. Dừng sau 04C.

## Minh họa học sinh được duyệt — 19/10/2026

Người dùng chê SVG học sinh cũ, chọn kiểu gần PDF và trả lời “ok” duyệt ảnh tạo mới hai học sinh đọc sách. Đã thay artwork children trong app/review-html.js bằng ảnh đó, bản tối ưu RGBA WebP 640×320, 55254 bytes, nguồn tại app/assets/review/children-reading-approved.webp. Ảnh nhúng data:image/webp;base64 trong module/HTML, không fetch ảnh ngoài, không sửa SW; CSP chỉ mở img-src data:, vẫn chặn kết nối mạng. Không đổi runtime/model/nộp/chấm. Không còn dùng SVG hai học sinh cũ.

7 unit exporter PASS; editor thật A–H PASS; design Chrome 390/1366px file offline PASS, xác nhận ảnh decode naturalWidth=640, 10/10, không tràn/mạng/JS error, ảnh thực tế đã xem. Hai browser test cũ đổi kiểm XSS từ “không có bất kỳ img” sang “không có img src=x do payload chèn”; vẫn kiểm window.pwned không tồn tại, không bỏ kiểm chèn script. Design test thêm kiểm ảnh nhúng decode. Bằng chứng outputs/review-html-approved/ trong thư mục chat hiện tại, HTML tải từ editor là toan-4-minh-hoa-da-duyet.html. Không commit/push/deploy hoặc thay game/Auth/DB; cập nhật xong thì dừng.

## Bổ sung bé trai–bé gái trên tiêu đề — 19/10/2026

Theo yêu cầu sau 04B, app/review-html.js thêm một SVG gốc hai học sinh cầm sách ở trên nhãn/tiêu đề, trong khung header. Không copy nhân vật PDF; 190px desktop/150px mobile, nhúng trực tiếp nên offline và không sửa SW. Hiện có 3 cụm SVG (thêm children, giữ school/garden). Chỉ sửa artwork/CSS/markup, không runtime/model/chấm. Chrome offline 390/1366px PASS, ảnh đã xem, 10/10, 7 unit exporter PASS. Mẫu và ảnh: outputs/review-html-children/ tại thư mục chat hiện tại; HTML toan-4-phieu-luyen-tap-v1.html. Không commit/push/deploy; dừng sau bổ sung này.

## Lệnh 04B — thay thế thẩm mỹ H04, 19/10/2026

Người dùng không chấp nhận thẩm mỹ H04 cũ; kết quả kỹ thuật H04 không phải chấp thuận giao diện. Đã truy cập/xem đúng 5 trang LH- Đề thi GK1 lớp 4 mới.pdf tại D:/06_Nam_hoc/2026 - 2027/KHBD-SGK-SGV-TAI LIEU KHAC/ (637723 bytes). Trang 1–4 tham chiếu màu pastel, nhãn nhiều màu và họa tiết học đường/hoa lá; trang 5 quảng bá/QR bỏ hoàn toàn. Các trang đều raster phẳng, không có hình rời sạch. Dựng mới SVG có mảng tô, không trích/copy nhân vật/hình phức tạp hoặc dùng ảnh nguyên trang làm nền.

app/review-html.js đổi theme: khung ngoài xanh/vàng, header hồng và tiêu đề nổi bật gọn hơn, nhãn/viền câu xanh trời/hồng/xanh lá/vàng luân phiên. Hai cụm SVG gốc nhúng trực tiếp (sách+bút+mặt trời+sao ở header; hoa/lá+sách ở chân 55px desktop, 39px mobile), không emoji/CDN/font ngoài. CSS/tokens tuổi và một renderer giữ nguyên nguyên tắc; runtime và createPractice không đổi. Không sửa SW/domain/UI/game/server/quyền. Test helper review-html-design.cjs nhận tùy chọn đường dẫn file tải từ editor để chụp đúng sản phẩm xuất thật.

Kiểm chứng: 19 unit PASS, editor A–H PASS, design file tải thật Chrome offline 390×900 và 1366×900 PASS; ảnh đầu/trọn câu/kết quả đã xem và đối chiếu PDF. Dung lượng 24084→28948 bytes (+4864), 2 SVG; các hash protected và toàn runtime/model nguyên. Không chạy lại mọi game/PWA khi source các phần đó không đổi. Bằng chứng ở C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-04b/ (toan-4-pastel-theo-pdf.html, ảnh, reference/, comparison.html, ASSETS.md, REPORT.md, log/json). HTML mẫu này lấy từ download editor thật, không chỉ CLI.

H04B DONE cho triển khai và kiểm tra ảnh thực tế; chưa coi là người dùng đã chấp thuận. Khác PDF: SVG mới thay nhân vật, không trang A4/đường tự luận/họ tên/lời phê/QR/quảng bá; giữ tương tác và 5 câu mẫu gốc, không chép nội dung đề PDF. Các giới hạn về câu hỏi ảnh/ngữ liệu, Auth/LMS vẫn giữ; chưa thiết bị vật lý. Không commit/push/deploy, xuất bản vẫn khóa. Dừng sau H04B.

## Lệnh 04 — giao diện HTML Mẫu A, 19/10/2026

H04 DONE cho phần trình bày các dạng văn bản hiện được hỗ trợ. app/review-html.js tiếp tục là renderer duy nhất: nền sáng trung tính/xanh ngọc/cam pastel, tokens CSS theo nhóm lớp (22/20/18px), khoảng cách và nút lớn, options desktop hai cột/mobile một cột, focus rõ, một minh họa vở nhỏ bằng CSS (ẩn mobile), tiến độ trả lời và khung kết quả tích cực. Chỉ listener change cho tiến độ được thêm; createPractice, cấu trúc đáp án và listener submit/chấm không đổi (đã đối chiếu source). Mẫu B chưa triển khai, có data-theme và token nền tảng để mở rộng sau. Không phụ thuộc CDN, không animation, hỗ trợ reduced-motion; OS dark vẫn giữ theme sáng chủ đích.

Test mới kiem-thu/review-html-design.cjs kiểm file URL offline và ảnh ở 390×900/1366×900; nội dung/option chính xác, keyboard/focus, tiến độ, xác nhận/hủy, điểm 10/10, văn bản dài không tràn, size theo lớp, không network/JS error. 19 unit PASS, PWA A–J/cache-safety chạy lại PASS. Ảnh câu hỏi/kết quả cả hai viewport đã xem. Contrast text chính 5.61:1 trở lên, chưa audit WCAG hoặc screen reader đầy đủ. Hash SW/domain/editor không đổi; không sửa code game/server/quyền/DB hoặc commit/push/deploy.

Bằng chứng tại C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-v1/ (HTML mẫu, bốn ảnh viewport, design-results.json, tests.log, preservation-and-contrast.json, pwa-regression/results.json, REPORT.md). Chạy test mới với HMV_EVIDENCE_DIR và runtime/browser env như trước; PWA regression là script H03 đã có, chỉ đổi thư mục bằng chứng. Giới hạn giữ nguyên: SINGLE/ABCD văn bản độc lập, chưa render ảnh/ngữ liệu liên kết hoặc cấu hình thời gian; CSS ảnh chỉ chuẩn bị responsive, chưa phải hỗ trợ ảnh thật. Không mở lại PDF mẫu trong phiên; áp dụng chỉ dẫn thẩm mỹ đã chốt, chưa đối chiếu trực tiếp hai PDF. Chưa thiết bị vật lý. S02/E01/I02 vẫn BLOCKED. Dừng sau H04.

## Lệnh 03 — PWA xuất offline đã kiểm chứng, 19/10/2026

H03 DONE: test mới kiem-thu/review-html-offline.cjs chạy Service Worker thật và app thật trên Chrome origin thử mới, cache HTTP tắt, browser offline + server dừng; reload và mở IndexedDB nháp, sửa câu/key trong editor, tải HTML, mở/chấm file offline 10/10. Bản nháp gốc nguyên sau export và reload tiếp. CacheStorage chỉ tài nguyên ứng dụng, IndexedDB là dữ liệu nháp; chỉnh sửa chưa lưu không được tự lưu. Ảnh viewport mobile đã xem. A–J + CACHE-SAFETY PASS, 19 unit PASS; xem nhật ký H03 trong kế hoạch và outputs/review-html-offline/ tại thư mục chat hiện tại.

Đã phát hiện rồi sửa 1 lần lỗi cache quá rộng trong app/sw.js. Chỉ cache APP_SHELL cùng origin không query/Authorization/apikey; runtime bỏ qua no-store/private/redirect/lỗi. Version hmv-review-20261019-offline-safe. Không tự cache CDN/endpoint auth/JSON học liệu. Tài nguyên ngoài shell phải được khai báo công khai riêng nếu cần offline sau. Không xóa cache lịch sử hoặc dữ liệu thật; profile cũ chưa audit, không tuyên bố sạch cache lịch sử. Không sửa exporter/editor/game/quyền. Unit mới kiem-thu/review-offline-cache.test.cjs, không thêm dependency.

Chạy: node HOC-MA-VUI-BAN-CHINH/kiem-thu/review-html-offline.cjs với HMV_PLAYWRIGHT_PATH/HMV_CHROME_PATH như trước và HMV_EVIDENCE_DIR trỏ thư mục bằng chứng mới. Test mở loopback, cần quyền môi trường phù hợp; không production. Dùng context.setOffline(true), xác nhận navigator.onLine=false, tắt HTTP cache và dừng server; không tắt Wi-Fi máy người dùng. Không route.fulfill tài nguyên hoặc tắt SW. Đã chứng minh PWA offline trong môi trường trình duyệt test, chưa thiết bị vật lý/cửa sổ PWA cài OS/toàn bộ game/production. Trạng thái AI cũ gọi endpoint không có trên server thử nhưng xuất không phụ thuộc endpoint này. S02/E01/I02 vẫn BLOCKED, UI vẫn khóa. Dừng H03.

## Lệnh 02 — tích hợp HTML trong editor, 19/10/2026

H02 DONE, đã có bằng chứng thực thi A–H. Trong app/review-ui.js, nút “Xuất HTML tương tác” cạnh “Lưu bản nháp”, kèm “HTML luyện tập – tự chấm offline”. readEditorDocument đọc bản sao từ ô đang biên tập kể cả chưa lưu; export không thay doc/status/version hoặc ghi IndexedDB. collect dùng lại reader cho luồng lưu cũ; bảo toàn published đã test trên fixture riêng.

Chỉ một bộ xuất: app/review-html.js là phần sinh HTML H01 chuyển thành UMD, dùng chung Node/browser; review-html.cjs chỉ còn adapter đọc mã domain tĩnh + CLI. UI gọi module chung và tải mã review-domain.js cùng origin để nhúng vào HTML. index.html nạp module mới, sw.js cache module và tăng cache version; không đổi game/backend. Mã chấm hiện có giữ nguyên. Không thêm dependency. Chỉ SINGLE/ABCD độc lập; báo số câu khi thiếu đáp án/loại chưa hỗ trợ, không bỏ câu. Không đưa source/metadata tùy ý vào file; sanitize tên file, escape nội dung, MIME UTF-8 HTML.

Test: 15 unit PASS (7 exporter + 8 domain), A–H Chrome loopback editor thật PASS, exit 0. Đã tải/mở file URL và chấm trong context offline 390×844; đổi nội dung/key chưa lưu phản ánh đúng; thiếu key/OPEN không tạo file; lưu/mở lại, version, published immutability và khóa duyệt/xuất bản PASS. Chưa thử điện thoại vật lý, toàn bộ game hoặc xuất từ PWA khi mất mạng. Tệp HTML đã tải không cần backend/Internet; đáp án nằm trong HTML nên chỉ luyện tập, không LMS/thi bảo mật.

Bằng chứng: C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html-editor/ (REPORT.md, editor-results.json, tests.log, browser.log, HTML tải thực, ảnh). Chạy browser test: node HOC-MA-VUI-BAN-CHINH/kiem-thu/review-html-editor.cjs với HMV_PLAYWRIGHT_PATH/HMV_CHROME_PATH như tài liệu cũ và HMV_EVIDENCE_DIR trỏ thư mục bằng chứng; cần quyền loopback nếu sandbox chặn. Repository/branch giữ nguyên, không commit/push/deploy. S02/E01/I02 vẫn BLOCKED; H03 sau đó đã được thực hiện, xem cập nhật phía trên.

## Đặc tả V1.0 và lát cắt HTML — 19/10/2026

Quyết định người dùng tại Lệnh 01: ưu tiên HTML tương tác; chỉ triển khai lát cắt luyện tập offline trong phiên này, độc lập với I02/E01 đang BLOCKED. Không triển khai các yêu cầu dài hạn dưới đây trong cùng phiên.

- Phạm vi V1.0: đa môn CTGDPT 2018 lớp 1–5, thí điểm lớp 4; bài tập thường xuyên và đề luyện tập/kiểm tra định kỳ. Phân loại theo trường, năm học, khối, môn, bộ sách, học kỳ, đợt, chủ đề/mạch, bài/tuần, loại, tác giả, trạng thái, phạm vi chia sẻ. Các đợt GHKI/CHKI/GHKII/CN và quy tắc môn/khối phải cấu hình được; quy định kiểm tra cần đối chiếu nguồn chính thức khi triển khai, không coi đoạn này là xác minh pháp lý.
- Chung một nguồn câu hỏi/đáp án cho hai kiểu: gần bố cục PDF và hiện đại từng câu. Các chế độ dài hạn: luyện tập, kiểm tra, trình chiếu. Dạng câu đầu tiên: chọn một đáp án; các dạng khác mở rộng sau qua bộ chấm domain hiện có; tự luận chờ giáo viên, không tự cho điểm bằng AI.
- Biên tập trực tiếp nội dung/đáp án/điểm/hình/bảng/công thức/thứ tự câu; AI chỉ đề xuất, có so sánh và giáo viên xác nhận rồi kiểm lại đáp án/điểm/ma trận. Xuất ưu tiên HTML5, sau đó DOCX/PDF/JSON và ZIP tài nguyên; tách nội dung khỏi mẫu trình bày. Import PDF/DOCX/ảnh giữ theo kế hoạch đã có.
- Mặc định nháp cá nhân; khi hoàn tất chọn giữ riêng hoặc chia sẻ cùng khối. Kho chung có lọc, xem trước, xuất theo quyền và sao chép về cá nhân; không ghi đè bản gốc đã xuất bản. Quyền chia sẻ giáo viên tách quyền phát hành học sinh; đề chính thức phải duyệt, bài ôn tập theo chính sách trường. Chưa mở chia sẻ/phát hành chính thức khi server/RLS chưa nghiệm thu.
- Game giữ nguyên; tích hợp sau khi kho ổn định, chọn nguồn hiện tại hoặc câu ôn tập, chỉ câu tương thích, không lộ đáp án đề bảo mật. LMS chỉ chia sẻ/nhúng nếu đích cho phép; chưa tuyên bố đồng bộ điểm. Kiểm tra giới hạn lượt/thời gian cần triển khai sau; HTML có đáp án chỉ là luyện tập.

### Kết quả H01: DONE cho lát cắt độc lập, không phải toàn V1.0

Repository thực tế vẫn `C:/Users/DELL/Documents/Codex/2026-10-18/referenced-chatgpt-conversation-this-is-an/work/hoc-ma-vui`, nhánh `feature/review-assessment`; thư mục chat hiện tại đã đổi nhưng không chuyển sang checkout cũ. Git còn nhiều thay đổi trước phiên; không commit/push/deploy. Đã được cấp quyền đúng repository trong phiên.

- Mới: `HOC-MA-VUI-BAN-CHINH/review-html.cjs` xuất HTML tự chứa CSS/JS, UTF-8, responsive, xác nhận nộp/cảnh báo bỏ trống, phản hồi và điểm; không mạng/backend. Tận dụng normalizeDocument/validateDocument/submitAttempt, không gọi transitionDocument hoặc giả xuất bản. Chuẩn dữ liệu tương đương: examId→id, grade/subject→metadata, questionId→questions[].id, questionText→text, correctAnswer→correctAnswers (mảng chỉ số từ 0, đúng một phần tử), score→points. Không thêm schema song song; các tên bên phải là đầu vào thực tế.
- Fixture: `HOC-MA-VUI-BAN-CHINH/kiem-thu/fixtures/review-math4.json`, 5 câu Toán lớp 4, mỗi câu 2 điểm. Hiện chỉ hỗ trợ SINGLE/ABCD dạng văn bản độc lập; từ chối ngữ liệu liên kết và dạng chưa hiển thị, không âm thầm bỏ nội dung.
- Cách xuất: `node HOC-MA-VUI-BAN-CHINH/review-html.cjs <đề.json> <bài.html>` tại gốc repo. Không ghi đè tệp đầu ra đã có (flag wx). Không thêm nút xuất trên app ở lát cắt này.
- Tests mới: `kiem-thu/review-html.test.cjs` (5 unit), `kiem-thu/review-html-browser.cjs` (Chrome file URL offline, hai viewport). Chạy kèm 8 domain test cũ: 13/13 PASS, exit 0. Trình duyệt 1280×900 và 390×844 PASS: 5 câu đúng 10/10, sai/bỏ trống 2/10, xác nhận/hủy, nộp lặp không đổi điểm, nội dung độc hại không thực thi, không tràn ngang/HTTP/JS error. Ảnh mobile đã xem trực tiếp. Đây là Chrome mô phỏng viewport điện thoại, chưa chạy thiết bị vật lý.
- Bằng chứng và HTML: `C:/Users/DELL/Documents/ChatGPT/MỖI NGÀY ĐẾN TRƯỜNG LÀ MỘT NGÀY VUI/outputs/review-html/` gồm toan-lop-4-luyen-tap.html, browser-results.json, desktop.png, mobile.png, tests.log. Có escape-test.html chỉ dùng kiểm thử XSS.
- Phạm vi bảo toàn: không sửa app/domain/UI/game/backend/config; không chạy toàn bộ app regression, không suy rộng 13 test thành nghiệm thu mọi module. UI duyệt/xuất bản vẫn khóa; S02/E01 tiếp tục BLOCKED. HTML không lưu lượt qua lần mở lại, không có giới hạn kỳ thi, không đồng bộ LMS, đáp án có trong tệp.
- Tiếp theo tại thời điểm H01: nối nút tải HTML luyện tập; đã hoàn thành H02 ở cập nhật phía trên. Duyệt/xuất bản vẫn khóa.

Cập nhật: 19/10/2026. Đọc tệp này và `IMPLEMENTATION_PLAN.md` đầu mỗi phiên; tuân thủ `../AGENTS.md`. Chỉ làm một nhiệm vụ nhỏ rồi dừng.

## Repository và trạng thái làm việc

- Repository: `khaicdv4-svg/giao-vien-chu-nhiem`.
- Bản sao đang làm: `work/hoc-ma-vui` trong thư mục chat Codex ngày 18/10/2026; gốc Git chính là thư mục chứa tệp AGENTS.md này.
- Nhánh: `feature/review-assessment`; HEAD đã xác minh: `a229bfddf0d321a4e82eda9fd6aa4d797fa367f8`.
- Có nhiều thay đổi chưa commit từ phiên trước. Không reset, xóa, ghi đè hoặc tự coi chúng đã nghiệm thu. Chưa push/deploy trong các phiên này.
- App được phát hành từ `HOC-MA-VUI-BAN-CHINH/app` theo `vercel.json`; main có cơ chế tự triển khai. Không push/main/deploy khi chưa phê duyệt.
- Checkout cũ ở `C:/Users/DELL/Documents/Codex/2026-08-21/files-mentioned-by-the-user-codex-3/giao-vien-chu-nhiem-git` có công việc riêng chưa commit; không dùng hoặc sửa checkout đó.

## Kiến trúc đã khảo sát

App dùng HTML/JavaScript thuần và các module IIFE; giữ cấu trúc hiện hữu. Đường dẫn sau tương đối với `HOC-MA-VUI-BAN-CHINH/`:

| Tệp | Vai trò |
|---|---|
| `app/index.html` | Điều hướng `openView`, dữ liệu lớp và nhiều game hiện có |
| `app/question-bank-stage7.js` | Parser và nhập câu hỏi DOCX/TXT/CSV/JSON/XLSX; luồng PDF cũ đang dùng từ chối PDF offline |
| `app/kho-cau-hoi.js` | Kho câu hỏi, kiểm tra hợp lệ và luyện tập |
| `app/question-quick-stage6.js` | `hmvC6QuestionErrors`, `hmvC6PlayBankSet`: kiểm tra tương thích và chọn câu cho game |
| `app/sw.js` | Cache và tải lại offline |

Các game/hoạt động có câu hỏi đã nhận diện: Kéo co, Ai nhanh hơn, Đường đua, Hộp quà, Lật mảnh ghép, Chinh phục tri thức, Bóng bay, Bình chọn ngón tay, Bàn tay phép thuật, Giơ tay giành quyền, Quiz Nghiêng Đầu, Chế độ giấy. Vòng quay và Ống kính chọn học sinh có luật riêng. Danh sách này là kết quả đọc nguồn, không phải bằng chứng mọi game đã được kiểm thử đầu-cuối trong bản mới.

## Mã thử nghiệm từ phiên trước

Các tệp dưới đây đã có trên đĩa nhưng toàn luồng chưa nghiệm thu:

- `app/review-domain.js`: schema, duyệt/xuất bản, snapshot bài làm, chấm điểm và adapter game.
- `app/review-import.js`, `app/vendor/review-pdf/`: nhập cục bộ, PDF.js đóng gói; scan/ảnh báo cần OCR, chưa có nhận dạng chữ tự động.
- `app/review-storage.js`: IndexedDB riêng `hmv-review-v1`, sao lưu Blob và hợp đồng outbox/sync. Không phải kết nối đồng bộ thật.
- `app/review-lms.js`: xuất JSON/CSV trung gian; chưa xác minh QLMS nhận được định dạng này.
- `app/review-ui.js`, `app/review.css`: kho, biên tập, hai kiểu xem, bài làm và cầu nối game; cần tiếp tục kiểm chứng trình duyệt sau các chỉnh sửa cuối.
- `app/index.html`, `app/sw.js`, `.gitignore`: đã được chỉnh để ghép module/cache/vendor.
- `preview-server.cjs`, `MO-BAN-THU-ON-TAP.ps1/.cmd` và các tệp `kiem-thu/review-*`, `kiem-thu/preview-server.test.cjs`: công cụ thử cục bộ và kiểm thử đang có. Chưa nghiệm thu launcher.

Quyết định đã chốt: đa môn lớp 1–5, thử lớp 4; hai kiểu xem chung dữ liệu; không đoán đáp án; tự luận chờ giáo viên chấm; câu cần ngữ liệu không đưa vào game làm mất ngữ liệu. Không thay framework, viết lại game hoặc tự di chuyển dữ liệu cũ.

## Bằng chứng và giới hạn

- Phiên 18/10 đã chạy 29 kiểm thử logic, kết quả 29 đạt; bằng chứng là đầu ra công cụ trong hội thoại trước. Chưa chạy lại sau mọi chỉnh sửa cuối, không coi đây là xác nhận toàn bộ bản hiện tại.
- Tệp bằng chứng `../../evidence-review/browser-results.json` tính từ thư mục docs chứa 12 bước PASS được lưu trước khi lượt chạy thất bại ở phép so sánh bảo toàn kho cũ.
- Những bước đã ghi PASS gồm: mở app/kho, nhập PDF chữ/DOCX/TXT, PDF scan 5 trang báo cần OCR, từ chối tệp hỏng/SVG, giữ Blob qua sao lưu, reload, bố cục mobile và offline reload. Chỉ áp dụng cho bản tại lúc chạy.
- Lỗi cuối lượt trình duyệt: so sánh mảng bộ câu hỏi phụ thuộc thứ tự. Harness đã được đổi sang so sánh sau sắp xếp; **chưa chạy lại để xác nhận**. Không kết luận hồi quy kho đã đạt.
- Test trình duyệt được bổ sung luồng duyệt/làm bài/chấm/game nhưng phần bổ sung chưa có kết quả chạy.
- Đã xem 10 trang của hai PDF mẫu: đều là ảnh; có bài đọc dùng chung, trang bài tập lặp và trang quảng bá. Khảo sát đầy đủ ở `../plans/on-tap-kiem-tra.md`; không đọc lại PDF khi chưa cần.
- Tác vụ chỉnh nền tương phản của review UI bị gián đoạn vì hạn mức; chưa có bằng chứng đã sửa hoặc đã kiểm thử.

## Chạy và kiểm thử khi nhiệm vụ cần

Runtime đã dùng: `C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. Không cài lại thư viện nếu runtime này còn dùng được.

- Logic theo phạm vi: chạy `node --test` với đúng tệp cần thiết trong `HOC-MA-VUI-BAN-CHINH/kiem-thu/`; có các tệp `review-domain.test.cjs`, `review-import.test.cjs`, `review-storage.test.cjs`, `review-lms.test.cjs`.
- Browser: `kiem-thu/review-browser.cjs` có máy chủ loopback và profile sạch. Các biến cấu hình: `HMV_PLAYWRIGHT_PATH`, `HMV_CHROME_PATH`, `HMV_FIXTURE_DIR`, `HMV_SCAN_PDF`, `HMV_EVIDENCE_DIR`; `HMV_BASELINE_ONLY=1` chỉ chạy baseline.
- Chrome đã dùng: `C:/Program Files/Google/Chrome/Application/chrome.exe`. Playwright ở thư mục node_modules của runtime trên. Fixture ở `../../fixtures` tính từ docs.
- Sandbox từng chặn loopback dù Chrome khởi động được; không suy ra đây là lỗi app. Chỉ xin quyền chạy ngoài sandbox nếu nhiệm vụ cần kiểm thử trình duyệt.
- Phiên chỉ cập nhật tài liệu: kiểm tra nội dung, đường dẫn và bảo toàn mã nguồn; không chạy lại cả bộ test.

## Kết nối ngoài đang thiếu

Người dùng cung cấp `https://truong.qlms.vn/dang-nhap`; chưa có tài liệu API, sandbox được xác nhận hoặc quyền thử. Auth/sync thật/QLMS đang BLOCKED. Không đăng nhập giả, đoán endpoint, ghi điểm hay dùng dữ liệu học sinh thật. Xem `../plans/qlms-integration-contract.md` khi đến nhiệm vụ này.

## Điểm tiếp tục

**Cập nhật kiến trúc theo quyết định người dùng:** dùng Supabase Auth + PostgreSQL; không tự xây Google OIDC. Ưu tiên Vercel Node API, giữ frontend. Đề xuất OIDC riêng trước đó trong kế hoạch là lịch sử đã được thay thế.

Nền tảng phát triển đã được tạo trong phiên tiếp theo ngày 19/10; trạng thái chi tiết ở mục “Nền tảng Supabase phát triển” cuối tệp. UI vẫn khóa. Cần cấu hình và test tích hợp thật trước khi coi E đã sửa.

Ngày 19/10 đã thực thi riêng kiểm thử biên tập → duyệt → xuất bản với học liệu giả “Ôn tập Danh từ”, lớp 4, Tiếng Việt, Bài tập thường xuyên. Nhiệm vụ I02 chưa đạt toàn bộ tiêu chí mới, trạng thái BLOCKED. Không tự chuyển sang làm bài/game.

- `review-publication.cjs` dùng lại Playwright và module domain/storage hiện có; profile mới, IndexedDB của origin loopback mới, chặn mọi yêu cầu ra ngoài. Không truy cập database thật.
- Test domain hiện có `draft cannot publish` chạy riêng: 1/1 đạt.
- Lượt browser trước sửa: A thiếu loại học liệu; G lưu hoặc duyệt trực tiếp ghi đè bản published. E cũng FAIL vì không có kiểm tra quyền.
- Sửa đúng `app/review-ui.js`: trường Loại học liệu lưu trong metadata.purpose; trước khi lưu/duyệt từ một bản đã xuất bản, tạo ID nháp mới với revisionOf và phiên bản tăng, không ghi đè bản gốc. Bỏ dấu duyệt cũ khỏi nháp. Không đổi schema IndexedDB hoặc các game.
- Lượt sau sửa: A, F, G đạt; đường chỉnh rồi duyệt trực tiếp cũng giữ bản published; tự duyệt/xuất bản cục bộ chạy được. E vẫn FAIL khi gọi domain với tên reviewer và role student: nhận reviewed mà không kiểm tra quyền. Đây là lỗi còn tồn tại, không phải test quyền đã đạt.
- B/C/D theo luồng có phân quyền và thao tác từ chối BLOCKED: chưa có trạng thái chờ duyệt, xử lý từ chối, session hoặc vai trò được xác thực. Không thay bằng role giả ở client để tuyên bố an toàn.
- Lượt kiểm thử sau sửa trả exit code **1**, đúng vì E còn FAIL. Tổng bản ghi: 7 PASS, 4 BLOCKED, 1 FAIL; không suy ra bộ test hoàn toàn xanh. Không có lỗi JavaScript trong thao tác đã thực thi.
- Kiểm tra cú pháp review-ui.js đạt. Kiểm tra whitespace toàn diff còn báo ở các thay đổi cũ của index.html/sw.js; không sửa hai tệp ngoài phạm vi này và không báo kiểm tra diff toàn kho đã đạt.
- Bằng chứng JSON: `../../evidence-publication-before/publication-results.json` và `../../evidence-publication-after/publication-results.json`; ảnh sau sửa ở thư mục after. Đây là lượt mới, riêng biệt với evidence-review cũ.
- Chạy lại đúng ca khi có thay đổi liên quan: `node HOC-MA-VUI-BAN-CHINH/kiem-thu/review-publication.cjs` với HMV_PLAYWRIGHT_PATH, HMV_CHROME_PATH, HMV_EVIDENCE_DIR như môi trường đã ghi; không chạy toàn bộ review-browser để xác nhận ca này.

Việc tiếp tục cần giải quyết cơ chế xác thực và quyền duyệt đáng tin cậy, sau đó mới thực hiện trạng thái gửi duyệt/phê duyệt/từ chối và kiểm tra lại B–E. Không coi tên người dùng tự nhập hoặc role do client truyền là nguồn cấp quyền. Chưa thực hiện phần này trong phiên kiểm chứng.

## Kiểm tra riêng lỗi E — 19/10/2026

**Kết luận: E chưa sửa bảo mật; BLOCKED do thiếu backend xác thực/phân quyền.** Đã khóa luồng duyệt/xuất bản trên UI như biện pháp tạm thời, không coi đó là hàng rào bảo mật server.

Cơ chế thực tế đã đọc đúng phạm vi:

- `review-domain.js: transitionDocument` chỉ kiểm tra trạng thái, tính hợp lệ nội dung và reviewer không rỗng; không đọc session, không kiểm tra quyền. Caller có thể tự khai reviewer, role, userId hoặc verified. Đây là nguyên nhân trực tiếp của E.
- `app/index.html: saveAccountProfile/setGoogleAccount` ghi hồ sơ/userId từ input hoặc đối tượng client vào localStorage. Đây là phân vùng dữ liệu/hồ sơ cục bộ, không chứng minh token đã xác minh hay vai trò duyệt.
- `server.cjs` phục vụ static và chuyển API AI sang `ai-server.cjs`; phần handle đã đọc chỉ có status/key/generate/tts cho AI. Kiểm tra host/origin API AI không phải xác thực người duyệt. Không có endpoint duyệt được bảo vệ trong đường xử lý này.
- `vercel.json` phát thư mục app tĩnh; cấu hình đã kiểm tra không khai báo backend duyệt. Không suy ra các dịch vụ khác ngoài phạm vi đã đọc cũng không có auth.

Thay đổi tối thiểu:

- `review-ui.js`: khóa cả rv-review/rv-publish, thay handler tự duyệt/xuất bản bằng thông báo thiếu máy chủ xác thực; giữ lưu bản nháp. Không gọi transitionDocument để tự duyệt, không đọc role/userId local làm quyền. Không thay server, domain, database schema hoặc game.
- `review-publication.cjs`: thêm nhánh audit E (`HMV_AUTH_AUDIT_ONLY=1`), tự chuyển sang audit khi UI đã khóa. Giữ mã ca kiểm chứng cũ để tra cứu, không tạo mock người duyệt hợp lệ.

Bằng chứng thực thi mới: `../../evidence-approval-auth/publication-results.json` (ảnh approval-locked.png cùng thư mục). Chạy đúng script review-publication.cjs với biến môi trường đã lưu, thêm HMV_AUTH_AUDIT_ONLY=1. Kết quả 4 PASS, 3 FAIL, 1 BLOCKED; exit code **1**:

- Người duyệt hợp lệ: BLOCKED, chưa có backend/tài khoản được xác minh để chạy.
- Domain: người thiếu quyền, chưa đăng nhập nhưng tự điền reviewer, tự khai role/userId/verified đều FAIL vì vẫn được chuyển reviewed. Không che hoặc đổi ba kết quả này thành PASS.
- Chặn draft → published, khóa UI/handler với profile local giả, bảo toàn bản published khi lưu nháp mới, không lỗi JavaScript: PASS. PASS khóa UI chỉ chứng minh không tự ghi qua handler, không ngăn người dùng sửa bộ nhớ/client/IndexedDB.
- Test bảo toàn phiên bản dùng một bản published giả có sẵn làm fixture, không dùng fixture này để chứng minh đã phê duyệt hợp lệ.

Điều kiện còn thiếu: backend thử với session/token được server xác minh; danh sách quyền duyệt được server quản lý theo phạm vi học liệu/trường; endpoint kiểm tra quyền mọi lần duyệt/xuất bản (thiếu phiên từ chối, thiếu quyền từ chối, bỏ qua claims tự khai), lưu/audit và kiểm tra phiên bản phía server. Chỉ sau khi có nguồn này mới sửa E thật và chạy ca reviewer hợp lệ. Không yêu cầu gửi secret vào chat. Phiên này không triển khai hoặc truy cập production.

## Nền tảng Supabase phát triển — 19/10/2026

Đã thực hiện mã nguồn và unit test, chưa kết nối/apply database hoặc deploy. Git vẫn `feature/review-assessment`; mã cũ chưa commit được giữ nguyên. Không cài dependency runtime ứng dụng; dùng fetch của Node để gọi REST chính thức của Supabase Auth và Data API, không tự giải mã JWT làm chứng cứ đăng nhập.

### Tệp mới, tương đối với gốc repository

- `api/session.js` (GET), `api/review-requests.js` (POST gửi snapshot yêu cầu duyệt), `api/review-decision.js` (POST approved/rejected).
- `lib/server/http.cjs`, `supabase.cjs`, `authorization.cjs`, `review-api.cjs`: xử lý request, gateway Supabase, xác minh danh tính/live session, kiểm quyền theo trường và middleware. Phiên bản server không dùng role/userId/verified hoặc user_metadata làm nguồn quyền.
- `supabase/migrations/20261018231518_hmv_review_auth_foundation.sql`: tên được CLI 2.121.0 sinh bằng `supabase migration new hmv_review_auth_foundation` (timestamp UTC), chỉ tạo tệp. Không chạy migration, không link/create project. Không có tài khoản hoặc quyền được seed.
- `HOC-MA-VUI-BAN-CHINH/kiem-thu/review-server.test.cjs` và `review-server.integration.test.cjs`.

### Ranh giới tin cậy và từ chối mặc định

Bearer được gửi tới `/auth/v1/user` của đúng dự án dev đã cấu hình. Chỉ dùng ID do Supabase Auth trả về, từ chối anonymous sign-in. RPC live-session đối chiếu auth.uid/session_id với auth.sessions để không chỉ tin JWT còn hạn sau thu hồi phiên. Mọi lần kiểm quyền đọc mới hmv_user_permissions qua JWT người dùng; không dùng service_role, không cache quyền từ token metadata/client.

Migration tạo bảng hmv_user_permissions và hmv_review_requests với RLS và grants tối thiểu. Người dùng chỉ đọc quyền của mình, không tự cấp quyền. Quyền submit/review phải được quản trị cấp phía DB. Người gửi không tự duyệt; trạng thái chỉ pending/approved/rejected, không có published chính thức. Snapshot và bản đã quyết định không sửa được qua grants/trigger; quyết định ghi audit trong hmv_private.review_events. Các RPC công khai SECURITY INVOKER; hai helper private SECURITY DEFINER chỉ phục vụ kiểm live-session/audit, search_path rỗng, có kiểm caller và quyền. Cần kiểm advisors và thực thi SQL trên sandbox để xác minh, chưa coi kiểm tra tĩnh là PASS RLS.

API kiểm quyền server và DB/RLS độc lập: 401 thiếu/phiên sai, 403 thiếu quyền/tự duyệt, 404 khi RLS giấu yêu cầu, 409 phiên bản cũ/đã quyết định. Chỉ bật khi HMV_REVIEW_BACKEND_MODE=development; VERCEL_ENV=production luôn bị chặn. POST mặc định khóa cho đến khi HMV_REVIEW_WRITES_ENABLED=true được cấu hình trên môi trường thử. Không có API publish, không mở UI, không sửa domain/game/storage hiện có hoặc vercel.json.

Đây là tiếp nhận snapshot yêu cầu duyệt, chưa đồng bộ kho học liệu canonical hoặc xuất bản chính thức. Domain cũ transitionDocument vẫn không phải nguồn thẩm quyền; test E legacy chưa được biến thành PASS bằng mock. Chỉ nền tảng API mới được unit test, luồng app đầu-cuối vẫn BLOCKED.

### Bằng chứng chạy và điều kiện tích hợp

- Chạy đúng hai tệp review-server bằng node --test: **21 unit PASS, 0 FAIL, 1 integration SKIP/BLOCKED**, exit 0. Unit dùng gateway injection có kiểm soát, không phải token/kết nối thật, không tạo bí mật giả hoặc giả chữ ký JWT. Log ở `../../evidence-review-server/tests.log` tính từ docs.
- Integration suite không dùng mock Auth/DB: cần tài khoản Supabase dev thật và fixture riêng; nếu không có điều kiện sẽ SKIP rõ lý do. Chưa chạy migration/SQL/RLS/advisors, chưa thử runtime routing Vercel, chưa chứng minh xác thực Supabase thật PASS. Không tự tạo account/project/DB hoặc thu thập secret từ môi trường.
- Cấu hình server cần: SUPABASE_URL (đúng project dev), SUPABASE_PUBLISHABLE_KEY, HMV_SUPABASE_DEV_PROJECT_REF (khớp host), HMV_REVIEW_BACKEND_MODE=development. Chỉ sau cấu hình sandbox hợp lệ mới bật HMV_REVIEW_WRITES_ENABLED=true. Không cần service_role/secret key trong API này. Không đặt biến này vào frontend.
- Trên dự án dev đã được phê duyệt: quản trị áp dụng migration, kiểm advisors/RLS, tạo hai tài khoản thử thực qua Supabase Auth và cấp quyền ở DB; tạo request pending dùng một lần, khác người duyệt. Không áp dụng vào production.
- Chạy integration bằng HMV_RUN_SUPABASE_INTEGRATION=1 cùng HMV_TEST_REVIEWER_TOKEN, HMV_TEST_NONREVIEWER_TOKEN, HMV_TEST_REVIEW_REQUEST_ID. Cấp giá trị an toàn trong môi trường chạy, không dán vào chat hoặc log. Non-reviewer phải không có quyền review; reviewer phải khác tác giả. Suite có thao tác approve fixture dev (không xóa/cleanup), vì vậy chỉ chạy với fixture được phép dùng một lần. Chưa có ca thu hồi session/RLS metadata thật ngoài sandbox; bổ sung xác minh đó trước nghiệm thu.

Nguồn API chính thức đã đối chiếu: https://supabase.com/docs/reference/javascript/auth-getuser ; https://supabase.com/docs/guides/auth/sessions ; https://supabase.com/docs/guides/api/securing-your-api ; https://supabase.com/docs/guides/database/postgres/row-level-security . Changelog markdown không tải được bằng công cụ hiện tại, đã dùng tài liệu hiện hành; không suy đoán API/CLI. Dừng ở nền tảng dev; nhiệm vụ tiếp theo là cấu hình dự án Supabase thử và kiểm migration/Auth/RLS thật, giữ UI khóa.
