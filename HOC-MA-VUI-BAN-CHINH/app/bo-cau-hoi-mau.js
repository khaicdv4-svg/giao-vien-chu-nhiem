/* BAN-CHINH 1.0 · Bộ câu hỏi mẫu Toán lớp 1–5: 7 dạng × 20 câu (mỗi lớp 4 câu mỗi dạng).
 * Kho câu hỏi nạp các bộ này một lần ở lần chạy đầu; xóa rồi thì không tự nạp lại (dùng nút "Nạp bộ câu hỏi mẫu").
 * Mỗi dòng dữ liệu: [lớp, chủ đề, nội dung, ...]. Đáp án đã được kiểm tra bằng máy trong bộ kiểm thử.
 */
(function (root) {
  'use strict';

  /* A–B–C–D: [lớp, chủ đề, câu hỏi, [A, B, C, D], vị trí đáp án đúng (0 = A)] */
  var ABCD = [
    [1, 'Phép cộng, phép trừ trong phạm vi 10', '3 + 4 = ?', ['6', '7', '8', '9'], 1],
    [1, 'Phép cộng, phép trừ trong phạm vi 10', '9 − 5 = ?', ['4', '3', '5', '6'], 0],
    [1, 'Các số đến 100', 'Số liền sau của 19 là:', ['18', '21', '20', '29'], 2],
    [1, 'Các số đến 100', 'Số lớn nhất trong các số 7, 12, 9, 10 là:', ['7', '9', '10', '12'], 3],
    [2, 'Phép cộng, phép trừ có nhớ', '35 + 27 = ?', ['52', '62', '63', '512'], 1],
    [2, 'Phép nhân, phép chia', '5 × 4 = ?', ['9', '15', '20', '25'], 2],
    [2, 'Đo độ dài', '1 dm = … cm', ['10', '100', '1', '1 000'], 0],
    [2, 'Các số đến 1 000', 'Số liền trước của 100 là:', ['101', '90', '110', '99'], 3],
    [3, 'Bảng nhân, bảng chia', '7 × 8 = ?', ['54', '56', '63', '48'], 1],
    [3, 'Bảng nhân, bảng chia', '63 : 9 = ?', ['7', '8', '6', '9'], 0],
    [3, 'Đo độ dài', '1 km = … m', ['10', '100', '1 000', '10 000'], 2],
    [3, 'Chu vi hình vuông', 'Hình vuông có cạnh 5 cm. Chu vi hình vuông đó là:', ['10 cm', '15 cm', '25 cm', '20 cm'], 3],
    [4, 'Số có nhiều chữ số', 'Số gồm 5 chục nghìn, 3 nghìn, 2 trăm và 4 đơn vị là:', ['53 240', '53 204', '50 324', '5 324'], 1],
    [4, 'Trung bình cộng', 'Trung bình cộng của 12, 15 và 18 là:', ['15', '14', '16', '45'], 0],
    [4, 'Góc', 'Góc có số đo 90° là:', ['góc nhọn', 'góc tù', 'góc vuông', 'góc bẹt'], 2],
    [4, 'Đo khối lượng', '3 tấn 5 tạ = … kg', ['350', '3 050', '35 000', '3 500'], 3],
    [5, 'Số thập phân', 'Số thập phân 0,5 viết dưới dạng phân số là:', ['1/5', '1/2', '5/1', '1/4'], 1],
    [5, 'Tỉ số phần trăm', '25% của 80 là:', ['20', '25', '40', '55'], 0],
    [5, 'Diện tích hình tam giác', 'Hình tam giác có đáy 6 cm, chiều cao 4 cm. Diện tích hình tam giác đó là:', ['24 cm²', '10 cm²', '12 cm²', '20 cm²'], 2],
    [5, 'Phép tính với số thập phân', '2,5 + 3,75 = ?', ['5,25', '6,75', '5,75', '6,25'], 3]
  ];

  /* Đúng/Sai: [lớp, chủ đề, mệnh đề, true/false] */
  var TF = [
    [1, 'Phép cộng, phép trừ trong phạm vi 10', '5 + 3 = 8.', true],
    [1, 'Phép cộng, phép trừ trong phạm vi 10', '10 − 4 = 5.', false],
    [1, 'Các số đến 100', 'Số 15 lớn hơn số 51.', false],
    [1, 'Các số đến 100', 'Số 20 gồm 2 chục và 0 đơn vị.', true],
    [2, 'Phép cộng, phép trừ có nhớ', '46 + 38 = 84.', true],
    [2, 'Phép nhân, phép chia', '2 × 9 = 16.', false],
    [2, 'Đo độ dài', '1 m = 100 cm.', true],
    [2, 'Các số đến 1 000', 'Số 305 đọc là "ba trăm linh năm".', true],
    [3, 'Bảng nhân, bảng chia', '6 × 7 = 42.', true],
    [3, 'Bảng nhân, bảng chia', '72 : 8 = 8.', false],
    [3, 'Đo thời gian', '1 giờ = 60 phút.', true],
    [3, 'Hình chữ nhật', 'Hình chữ nhật có 4 góc vuông.', true],
    [4, 'Số chẵn, số lẻ', 'Số 2 024 là số chẵn.', true],
    [4, 'Góc', 'Góc tù bé hơn góc vuông.', false],
    [4, 'Đo thời gian', '1 thế kỉ = 100 năm.', true],
    [4, 'Trung bình cộng', 'Trung bình cộng của 4 và 10 là 8.', false],
    [5, 'Số thập phân', '0,25 = 1/4.', true],
    [5, 'Phép tính với số thập phân', '3,5 × 2 = 6.', false],
    [5, 'Đo thể tích', '1 m³ = 1 000 dm³.', true],
    [5, 'Tỉ số phần trăm', '20% của 50 là 5.', false]
  ];

  /* Nhiều đáp án: [lớp, chủ đề, câu hỏi, [A, B, C, D], [các vị trí đúng]] */
  var MULTI = [
    [1, 'Các số đến 10', 'Những số nào lớn hơn 5?', ['3', '7', '9', '4'], [1, 2]],
    [1, 'Phép cộng, phép trừ trong phạm vi 10', 'Những phép tính nào có kết quả bằng 6?', ['2 + 4', '5 + 2', '3 + 3', '9 − 4'], [0, 2]],
    [1, 'Các số đến 100', 'Những số nào bé hơn 10?', ['12', '8', '15', '6'], [1, 3]],
    [1, 'Hình phẳng', 'Những hình nào có 4 cạnh?', ['Hình vuông', 'Hình tam giác', 'Hình tròn', 'Hình chữ nhật'], [0, 3]],
    [2, 'Các số đến 1 000', 'Những số nào là số tròn chục?', ['30', '45', '70', '81'], [0, 2]],
    [2, 'Phép nhân, phép chia', 'Những phép tính nào có kết quả bằng 10?', ['2 × 4', '2 × 5', '5 × 3', '5 × 2'], [1, 3]],
    [2, 'Các số đến 1 000', 'Những số nào lớn hơn 500?', ['498', '505', '650', '399'], [1, 2]],
    [2, 'Đo độ dài', 'Những đơn vị nào dùng để đo độ dài?', ['cm', 'kg', 'lít', 'm'], [0, 3]],
    [3, 'Phép chia hết', 'Những số nào chia hết cho 3?', ['12', '14', '27', '20'], [0, 2]],
    [3, 'Bảng nhân, bảng chia', 'Những phép tính nào có kết quả bằng 24?', ['5 × 5', '6 × 4', '7 × 3', '3 × 8'], [1, 3]],
    [3, 'Hình chữ nhật, hình vuông', 'Những hình nào có 4 góc vuông?', ['Hình tam giác', 'Hình vuông', 'Hình chữ nhật', 'Hình tròn'], [1, 2]],
    [3, 'Các số đến 10 000', 'Những số nào là số có bốn chữ số?', ['1 000', '999', '10 000', '4 567'], [0, 3]],
    [4, 'Số chẵn, số lẻ', 'Những số nào là số chẵn?', ['128', '345', '2 020', '999'], [0, 2]],
    [4, 'Góc', 'Những góc nào bé hơn góc vuông?', ['Góc tù', 'Góc nhọn', 'Góc bẹt', 'Góc 45°'], [1, 3]],
    [4, 'Phân số', 'Những phân số nào bằng 1/2?', ['2/3', '2/4', '3/6', '3/5'], [1, 2]],
    [4, 'Đo khối lượng', 'Những số đo nào bằng 2 kg?', ['2 000 g', '200 g', '20 g', '1 kg + 1 000 g'], [0, 3]],
    [5, 'Số thập phân', 'Những số thập phân nào lớn hơn 0,5?', ['0,6', '0,45', '0,75', '0,09'], [0, 2]],
    [5, 'Tỉ số phần trăm', 'Những cách viết nào có giá trị bằng 50%?', ['0,05', '1/2', '1/5', '0,5'], [1, 3]],
    [5, 'Đo độ dài', 'Những số đo nào bằng 1,5 m?', ['15 cm', '150 cm', '15 dm', '1 500 cm'], [1, 2]],
    [5, 'Phép tính với số thập phân', 'Những phép tính nào có kết quả bằng 1?', ['0,5 + 0,5', '0,2 + 0,7', '1,5 − 0,6', '0,25 × 4'], [0, 3]]
  ];

  /* Điền khuyết: [lớp, chủ đề, câu có chỗ trống …, đáp án] */
  var FILL = [
    [1, 'Phép cộng, phép trừ trong phạm vi 10', '4 + … = 9', '5'],
    [1, 'Phép cộng, phép trừ trong phạm vi 10', '10 − … = 7', '3'],
    [1, 'Các số đến 100', 'Số liền trước của 30 là …', '29'],
    [1, 'Các số đến 100', 'Điền số còn thiếu: 12, 13, …, 15', '14'],
    [2, 'Phép cộng, phép trừ có nhớ', '45 + 18 = …', '63'],
    [2, 'Phép nhân, phép chia', '2 × … = 14', '7'],
    [2, 'Đo độ dài', '1 m = … cm', '100'],
    [2, 'Các số đến 1 000', 'Số gồm 3 trăm, 5 chục và 2 đơn vị là …', '352'],
    [3, 'Bảng nhân, bảng chia', '8 × … = 48', '6'],
    [3, 'Bảng nhân, bảng chia', '81 : 9 = …', '9'],
    [3, 'Đo khối lượng', '1 kg = … g', '1 000'],
    [3, 'Chu vi hình chữ nhật', 'Hình chữ nhật có chiều dài 8 cm, chiều rộng 5 cm. Chu vi hình chữ nhật đó là … cm', '26'],
    [4, 'Đo khối lượng', '1 tấn = … kg', '1 000'],
    [4, 'Trung bình cộng', 'Trung bình cộng của 20 và 30 là …', '25'],
    [4, 'Đo thời gian', '5 phút = … giây', '300'],
    [4, 'Số có nhiều chữ số', 'Số liền sau của 99 999 là …', '100 000'],
    [5, 'Tỉ số phần trăm', '0,75 = … %', '75'],
    [5, 'Phép tính với số thập phân', '3,2 × 10 = …', '32'],
    [5, 'Đo thời gian', '1,5 giờ = … phút', '90'],
    [5, 'Diện tích hình vuông', 'Hình vuông có cạnh 1,2 m. Diện tích hình vuông đó là … m²', '1,44']
  ];

  /* Trả lời ngắn: [lớp, chủ đề, câu hỏi, đáp án] */
  var SHORT = [
    [1, 'Các số đến 100', 'Số bé nhất có hai chữ số là số nào?', '10'],
    [1, 'Phép cộng, phép trừ trong phạm vi 10', '6 + 3 bằng bao nhiêu?', '9'],
    [1, 'Hình phẳng', 'Hình vuông có mấy cạnh?', '4'],
    [1, 'Thời gian', 'Một tuần lễ có mấy ngày?', '7'],
    [2, 'Phép cộng, phép trừ có nhớ', '100 − 36 bằng bao nhiêu?', '64'],
    [2, 'Phép nhân, phép chia', '5 × 7 bằng bao nhiêu?', '35'],
    [2, 'Thời gian', 'Một giờ có bao nhiêu phút?', '60'],
    [2, 'Các số đến 1 000', 'Số lớn nhất có ba chữ số là số nào?', '999'],
    [3, 'Bảng nhân, bảng chia', '9 × 9 bằng bao nhiêu?', '81'],
    [3, 'Thời gian', 'Một năm có bao nhiêu tháng?', '12'],
    [3, 'Bảng nhân, bảng chia', 'Số nào nhân với 6 thì được 54?', '9'],
    [3, 'Diện tích hình vuông', 'Hình vuông có cạnh 4 cm. Diện tích hình vuông đó là bao nhiêu xăng-ti-mét vuông?', '16'],
    [4, 'Số chẵn, số lẻ', 'Số chẵn lớn nhất có hai chữ số là số nào?', '98'],
    [4, 'Góc', 'Góc bẹt có số đo bao nhiêu độ?', '180'],
    [4, 'Trung bình cộng', 'Trung bình cộng của 10, 20 và 30 là bao nhiêu?', '20'],
    [4, 'Đo thời gian', '1 phút 30 giây bằng bao nhiêu giây?', '90'],
    [5, 'Tỉ số phần trăm', '15% của 200 là bao nhiêu?', '30'],
    [5, 'Phép tính với số thập phân', '4,8 : 2 bằng bao nhiêu?', '2,4'],
    [5, 'Thể tích hình lập phương', 'Hình lập phương có cạnh 3 cm. Thể tích hình lập phương đó là bao nhiêu xăng-ti-mét khối?', '27'],
    [5, 'Chuyển động đều', 'Một ô tô đi được 120 km trong 2 giờ. Vận tốc của ô tô là bao nhiêu km/giờ?', '60']
  ];

  /* Ghép đôi: [lớp, chủ đề, yêu cầu, [[trái, phải], …]] */
  var MATCH = [
    [1, 'Phép cộng, phép trừ trong phạm vi 10', 'Ghép mỗi phép cộng, phép trừ với kết quả đúng.', [['2 + 3', '5'], ['4 + 4', '8'], ['6 + 1', '7'], ['10 − 1', '9']]],
    [1, 'Các số đến 100', 'Ghép mỗi số có hai chữ số với cách đọc đúng.', [['11', 'mười một'], ['15', 'mười lăm'], ['20', 'hai mươi'], ['14', 'mười bốn']]],
    [1, 'Các số đến 100', 'Ghép mỗi số với số liền sau của nó.', [['9', '10'], ['19', '20'], ['29', '30'], ['39', '40']]],
    [1, 'Phép cộng, phép trừ trong phạm vi 10', 'Ghép mỗi phép trừ với kết quả đúng.', [['10 − 3', '7'], ['8 − 5', '3'], ['9 − 4', '5'], ['6 − 0', '6']]],
    [2, 'Phép nhân, phép chia', 'Ghép mỗi phép nhân trong bảng nhân 2 và bảng nhân 5 với kết quả đúng.', [['2 × 6', '12'], ['5 × 3', '15'], ['2 × 9', '18'], ['5 × 8', '40']]],
    [2, 'Đo độ dài', 'Ghép hai số đo độ dài bằng nhau.', [['1 m', '100 cm'], ['1 dm', '10 cm'], ['1 km', '1 000 m'], ['2 m', '20 dm']]],
    [2, 'Phép cộng, phép trừ có nhớ', 'Ghép mỗi phép tính có nhớ với kết quả đúng.', [['37 + 25', '62'], ['80 − 45', '35'], ['46 + 46', '92'], ['71 − 19', '52']]],
    [2, 'Các số đến 1 000', 'Ghép mỗi số có ba chữ số với cách đọc đúng.', [['105', 'một trăm linh năm'], ['150', 'một trăm năm mươi'], ['501', 'năm trăm linh một'], ['510', 'năm trăm mười']]],
    [3, 'Bảng nhân, bảng chia', 'Ghép mỗi phép chia với kết quả đúng.', [['56 : 7', '8'], ['45 : 9', '5'], ['36 : 6', '6'], ['28 : 4', '7']]],
    [3, 'Các đơn vị đo', 'Ghép hai số đo bằng nhau.', [['1 kg', '1 000 g'], ['1 giờ', '60 phút'], ['1 l', '1 000 ml'], ['1 năm', '12 tháng']]],
    [3, 'Chu vi hình vuông', 'Ghép mỗi hình vuông với chu vi của nó.', [['Cạnh 2 cm', '8 cm'], ['Cạnh 3 cm', '12 cm'], ['Cạnh 5 cm', '20 cm'], ['Cạnh 10 cm', '40 cm']]],
    [3, 'Bảng nhân, bảng chia', 'Ghép mỗi phép nhân với kết quả đúng.', [['7 × 6', '42'], ['8 × 8', '64'], ['9 × 4', '36'], ['6 × 9', '54']]],
    [4, 'Góc', 'Ghép mỗi loại góc với một số đo phù hợp.', [['Góc nhọn', '60°'], ['Góc vuông', '90°'], ['Góc tù', '120°'], ['Góc bẹt', '180°']]],
    [4, 'Đo khối lượng', 'Ghép hai số đo khối lượng bằng nhau.', [['1 tấn', '1 000 kg'], ['1 tạ', '100 kg'], ['1 yến', '10 kg'], ['5 tạ', '500 kg']]],
    [4, 'Phân số', 'Ghép hai phân số bằng nhau.', [['1/2', '2/4'], ['1/3', '2/6'], ['3/4', '6/8'], ['2/5', '4/10']]],
    [4, 'Số có nhiều chữ số', 'Ghép mỗi số với giá trị của chữ số 5 trong số đó.', [['5 432', '5 000'], ['1 520', '500'], ['2 357', '50'], ['6 785', '5']]],
    [5, 'Số thập phân', 'Ghép mỗi phân số với số thập phân bằng nó.', [['1/2', '0,5'], ['1/4', '0,25'], ['3/4', '0,75'], ['1/5', '0,2']]],
    [5, 'Tỉ số phần trăm', 'Ghép mỗi số thập phân với tỉ số phần trăm bằng nó.', [['0,1', '10%'], ['0,25', '25%'], ['0,5', '50%'], ['1,2', '120%']]],
    [5, 'Đo diện tích, thể tích', 'Ghép hai số đo diện tích hoặc thể tích bằng nhau.', [['1 m³', '1 000 dm³'], ['1 dm³', '1 000 cm³'], ['1 ha', '10 000 m²'], ['1 km²', '100 ha']]],
    [5, 'Phép tính với số thập phân', 'Ghép mỗi phép tính số thập phân với kết quả đúng.', [['1,5 + 2,5', '4'], ['3,6 − 1,2', '2,4'], ['0,4 × 5', '2'], ['4,5 : 5', '0,9']]]
  ];

  /* Câu hỏi mở: [lớp, chủ đề, câu hỏi, gợi ý đáp án cho giáo viên] */
  var OPEN = [
    [1, 'Các số đến 100', 'Em hãy đếm to từ 1 đến 20.', 'Đếm đủ, đúng thứ tự từ 1 đến 20.'],
    [1, 'Hình phẳng', 'Hãy kể tên 3 đồ vật có dạng hình tròn.', 'Ví dụ: mặt đồng hồ, cái đĩa, bánh xe.'],
    [1, 'Phép cộng, phép trừ trong phạm vi 10', 'Hãy nêu một phép cộng có kết quả bằng 10.', 'Ví dụ: 6 + 4, 7 + 3, 5 + 5.'],
    [1, 'Các số đến 10', 'So sánh số 8 và số 5 rồi nói cách em so sánh.', '8 lớn hơn 5 vì khi đếm, 8 đứng sau 5.'],
    [2, 'Phép cộng, phép trừ có nhớ', 'Nêu cách em tính nhẩm 9 + 6.', 'Tách 6 thành 1 và 5: 9 + 1 = 10; 10 + 5 = 15.'],
    [2, 'Đo độ dài', 'Hãy kể tên 3 đồ vật dài khoảng 1 mét.', 'Ví dụ: cái bàn học, cánh cửa sổ, sải tay của em.'],
    [2, 'Phép nhân, phép chia', 'Hãy đặt một đề toán có phép tính 5 × 3 rồi nói kết quả.', 'Ví dụ: Mỗi đĩa có 5 quả cam. Hỏi 3 đĩa có bao nhiêu quả cam? (15 quả)'],
    [2, 'Thời gian', 'Lúc 3 giờ 30 phút, kim giờ và kim phút của đồng hồ chỉ vào đâu?', 'Kim phút chỉ số 6, kim giờ ở giữa số 3 và số 4.'],
    [3, 'Chu vi hình chữ nhật', 'Nêu cách tính chu vi hình chữ nhật.', 'Lấy chiều dài cộng chiều rộng (cùng đơn vị đo) rồi nhân với 2.'],
    [3, 'Giải toán', 'Hãy đặt một bài toán giải bằng hai bước tính rồi nêu cách giải.', 'Bài toán hợp lí, có hai phép tính liên tiếp và lời giải rõ ràng.'],
    [3, 'Phép nhân', 'Vì sao số nào nhân với 0 cũng bằng 0? Nêu ví dụ.', 'Ví dụ: 0 × 5 = 0 + 0 + 0 + 0 + 0 = 0.'],
    [3, 'Thời gian', 'Kể tên các tháng có 31 ngày trong năm.', 'Tháng 1, 3, 5, 7, 8, 10, 12.'],
    [4, 'Trung bình cộng', 'Nêu cách tìm trung bình cộng của nhiều số.', 'Tính tổng các số rồi chia tổng đó cho số các số hạng.'],
    [4, 'Số chẵn, số lẻ', 'Thế nào là số chẵn, số lẻ? Cho ví dụ.', 'Số chẵn có chữ số tận cùng là 0, 2, 4, 6, 8; số lẻ có chữ số tận cùng là 1, 3, 5, 7, 9.'],
    [4, 'Làm tròn số', 'Hãy nêu một tình huống thực tế cần làm tròn số.', 'Ví dụ: ước lượng số tiền cần trả khi mua hàng, số người dự một buổi lễ.'],
    [4, 'Phân số', 'So sánh hai phân số 2/3 và 3/4, giải thích cách làm.', 'Quy đồng mẫu số: 2/3 = 8/12, 3/4 = 9/12 nên 2/3 < 3/4.'],
    [5, 'Diện tích hình tam giác', 'Nêu cách tính diện tích hình tam giác.', 'Lấy độ dài đáy nhân với chiều cao (cùng đơn vị đo) rồi chia cho 2.'],
    [5, 'Tỉ số phần trăm', 'Tỉ số phần trăm được dùng trong những tình huống nào? Nêu ví dụ.', 'Ví dụ: giảm giá khi mua hàng, lãi suất tiết kiệm, tỉ lệ học sinh đạt yêu cầu.'],
    [5, 'Số thập phân', 'Giải thích vì sao 0,5 = 50%.', '0,5 = 5/10 = 50/100 = 50%.'],
    [5, 'Chuyển động đều', 'Một xe đi quãng đường 90 km hết 2 giờ. Nêu cách tính vận tốc của xe.', 'Lấy quãng đường chia cho thời gian: 90 : 2 = 45 (km/giờ).']
  ];

  var SOURCE = 'Bộ câu hỏi mẫu HỌC MÀ VUI';
  function base(id, row, kind) {
    return { id: id, text: row[2], question: row[2], kind: kind, type: kind, answers: [], options: [], optionLabels: [], correct: null, correctAnswers: [], correctAnswer: '', answerText: '', explanation: '', pairs: [],
      grade: 'Lớp ' + row[0], subject: 'Toán', topic: row[1], lesson: row[1], difficulty: 'Mức 1', level: 'Mức 1', source: SOURCE,
      answerStatus: kind === 'OPEN' ? 'Cần giáo viên chấm' : 'Hợp lệ', reviewStatus: 'Hợp lệ', classificationStatus: 'Có căn cứ đã nhập', reviewErrors: [], answerKeyValid: kind !== 'OPEN' };
  }
  function choice(q, answers, keys, labels) { q.answers = answers.slice(); q.options = answers.slice(); q.optionLabels = labels || answers.map(function (_, i) { return String.fromCharCode(65 + i); }); q.correctAnswers = keys.slice(); q.correct = keys.length === 1 ? keys[0] : null; q.correctAnswer = keys.map(function (i) { return answers[i]; }).join(' / '); return q; }
  function makeSet(order, slug, name, description, questions) {
    return { id: 'mau-' + order + '-' + slug, name: name, setTitle: name, description: description, grade: 'Lớp 1–5', schoolYear: 'Chưa xác định năm học', subject: 'Toán', topic: 'Tổng hợp lớp 1–5', lesson: 'Tổng hợp lớp 1–5', difficulty: 'Mức 1', source: SOURCE, purpose: 'Luyện tập', questions: questions, games: [] };
  }
  var sets = [
    makeSet(1, 'abcd', 'Mẫu 1 · Trắc nghiệm A–B–C–D · Toán lớp 1–5', 'Bốn lựa chọn, một đáp án đúng. Dùng cho mọi trò chơi trắc nghiệm.', ABCD.map(function (r, i) { return choice(base('mau-abcd-' + (i + 1), r, 'ABCD'), r[3], [r[4]]); })),
    makeSet(2, 'dung-sai', 'Mẫu 2 · Đúng/Sai · Toán lớp 1–5', 'Mệnh đề Đúng hoặc Sai. Dùng cho Quiz Nghiêng Đầu và các trò theo đội.', TF.map(function (r, i) { return choice(base('mau-ds-' + (i + 1), r, 'TRUEFALSE'), ['Đúng', 'Sai'], [r[3] ? 0 : 1], ['Đúng', 'Sai']); })),
    makeSet(3, 'nhieu-dap-an', 'Mẫu 3 · Nhiều đáp án · Toán lớp 1–5', 'Mỗi câu có từ hai đáp án đúng. Dùng ở Luyện tập.', MULTI.map(function (r, i) { return choice(base('mau-nda-' + (i + 1), r, 'MULTI'), r[3], r[4]); })),
    makeSet(4, 'dien-khuyet', 'Mẫu 4 · Điền khuyết · Toán lớp 1–5', 'Điền số thích hợp vào chỗ trống. Dùng ở Luyện tập.', FILL.map(function (r, i) { var q = base('mau-dk-' + (i + 1), r, 'FILL'); q.answerText = r[3]; q.correctAnswer = r[3]; return q; })),
    makeSet(5, 'tra-loi-ngan', 'Mẫu 5 · Trả lời ngắn · Toán lớp 1–5', 'Trả lời bằng một số. Dùng ở Luyện tập.', SHORT.map(function (r, i) { var q = base('mau-tln-' + (i + 1), r, 'SHORT'); q.answerText = r[3]; q.correctAnswer = r[3]; return q; })),
    makeSet(6, 'ghep-doi', 'Mẫu 6 · Ghép đôi · Toán lớp 1–5', 'Ghép mỗi ý bên trái với một ý bên phải. Dùng ở Luyện tập.', MATCH.map(function (r, i) { var q = base('mau-gd-' + (i + 1), r, 'MATCHING'); q.pairs = r[3].map(function (p) { return { left: p[0], right: p[1] }; }); q.answerStatus = 'Hợp lệ · cặp rõ'; return q; })),
    makeSet(7, 'cau-hoi-mo', 'Mẫu 7 · Câu hỏi mở · Toán lớp 1–5', 'Học sinh trả lời miệng, giáo viên nhận xét. Dùng cho trò chơi theo đội và Luyện tập.', OPEN.map(function (r, i) { var q = base('mau-mo-' + (i + 1), r, 'OPEN'); q.answerText = r[3]; return q; }))
  ];

  var api = { version: 1, sets: sets };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HMV_DEMO = api;
})(typeof window !== 'undefined' ? window : null);
