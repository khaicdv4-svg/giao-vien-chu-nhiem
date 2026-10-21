#!/bin/bash
P="psql $HMV_PG -d $HMV_DB -q -t -A"
T=aaaaaaaa-0000-4000-8000-000000000001; T2=aaaaaaaa-0000-4000-8000-000000000002; N=aaaaaaaa-0000-4000-8000-000000000003
S=bbbbbbbb-0000-4000-8000-000000000001
sid(){ echo "dddddddd-0000-4000-8000-00000000000${1: -1}"; }
$P -v ON_ERROR_STOP=1 >/dev/null <<SQL
insert into auth.users values ('$T'),('$T2'),('$N');
insert into auth.sessions values ('$(sid $T)','$T'),('$(sid $T2)','$T2'),('$(sid $N)','$N');
insert into hmv_private.teachers(user_id,enabled) values ('$T',true),('$T2',true),('$N',false);
SQL
pass=0; fail=0
as(){ local claims="{\"sub\":\"$1\",\"session_id\":\"$2\",\"is_anonymous\":false}"
  $P <<SQL 2>&1
begin; select set_config('request.jwt.claims','$claims',true) \g /dev/null
set local role authenticated;
$3
commit;
SQL
}
anon(){ $P <<SQL 2>&1
begin; set local role anon;
$1
commit;
SQL
}
expect(){ if echo "$3" | grep -qE "$2"; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1 :: $3"; fail=$((fail+1)); fi; }
o=$(as $T $(sid $T) "select join_code from hmv_create_class('4A','2026-2027');"); CODE=$(echo "$o"|tail -1); expect "1 GV có quyền tạo lớp, mã 6 ký tự" "^[A-HJKMNP-Z2-9]{6}$" "$CODE"
CID=$($P -c "select id from hmv_classes where join_code='$CODE'")
o=$(as $N $(sid $N) "select * from hmv_create_class('4B','2026-2027');"); expect "2 tài khoản Google chưa được cấp quyền dạy -> từ chối" "Teacher permission required" "$o"
o=$(as $T $(sid $T) "select roll_no||':'||full_name||':'||pin from hmv_add_students('$CID', array['Nguyễn Văn  An','Trần Thị Bình','Lê Minh Châu']);"); expect "3 thêm 3 HS, mã PIN 4 số, chuẩn hóa khoảng trắng" "^1:Nguyễn Văn An:[0-9]{4}$" "$(echo "$o"|head -1)"
PIN1=$(echo "$o"|head -1|cut -d: -f3); SID1=$($P -c "select id from hmv_students where roll_no=1")
o=$($P -c "select count(*) from hmv_students where pin_hash like '\$2a\$08\$%'"); expect "4 PIN lưu dạng băm bcrypt" "^3$" "$o"
o=$(as $T $(sid $T) "select count(*) from hmv_students;"); expect "5 GV thấy HS lớp mình" "^3$" "$o"
o=$(as $T $(sid $T) "select pin_hash from hmv_students;"); expect "6 GV không đọc được cột PIN băm" "permission denied" "$o"
o=$(as $T2 $(sid $T2) "select count(*) from hmv_students; select count(*) from hmv_classes;"); expect "7 GV khác không thấy lớp/HS" "^0
0$" "$o"
o=$(as $T2 $(sid $T2) "select * from hmv_add_students('$CID', array['Kẻ Lạ']);"); expect "8 GV khác thêm HS vào lớp người khác -> từ chối" "Class not found" "$o"
o=$(as $T2 $(sid $T2) "select hmv_reset_student_pin('$SID1');"); expect "9 GV khác đặt lại PIN -> từ chối" "Student not found" "$o"
o=$(as $T $(sid $T) "update hmv_classes set join_code='AAAAAA' where id='$CID';"); expect "10 không sửa được mã lớp" "permission denied" "$o"
o=$(anon "select count(*) from hmv_class_roster('${CODE,,}');"); expect "11 học sinh nhập mã lớp (chữ thường) thấy danh sách tên" "^3$" "$o"
o=$(anon "select count(*) from hmv_class_roster('ZZZZZZ');"); expect "12 mã lớp sai -> không thấy gì" "^0$" "$o"
o=$(anon "select count(*) from hmv_students;"); expect "13 khách không đọc trực tiếp bảng HS" "permission denied" "$o"
o=$(anon "select status from hmv_student_login('$CODE','$SID1','$PIN1');"); expect "14 đăng nhập đúng PIN" "^ok$" "$o"
WRONG=$(printf "%04d" $(( (10#$PIN1 + 1) % 10000 )))
for i in 1 2 3 4; do o=$(anon "select status from hmv_student_login('$CODE','$SID1','$WRONG');"); done; expect "15 sai 4 lần -> failed (số lần sai được ghi lại)" "^failed$" "$o"
o=$($P -c "select failed_attempts from hmv_students where id='$SID1'"); expect "16 đếm số lần sai không bị hoàn tác" "^4$" "$o"
o=$(anon "select status from hmv_student_login('$CODE','$SID1','$WRONG');"); expect "17 sai lần 5 -> khóa" "^locked$" "$o"
o=$(anon "select status from hmv_student_login('$CODE','$SID1','$PIN1');"); expect "18 đang khóa thì PIN đúng cũng không vào" "^locked$" "$o"
NEWPIN=$(as $T $(sid $T) "select hmv_reset_student_pin('$SID1');"|tail -1)
o=$(anon "select status from hmv_student_login('$CODE','$SID1','$NEWPIN');"); expect "19 GV đặt lại PIN -> mở khóa, PIN mới vào được" "^ok$" "$o"
o=$(anon "select status from hmv_student_login('$CODE','$SID1','$PIN1');"); expect "20 PIN cũ hết hiệu lực" "^failed$|^locked$" "$o"
TOK=$(anon "select session_token from hmv_student_login('$CODE','$SID1','$NEWPIN');"|tail -1)
o=$($P -c "select hmv_private.student_from_token('$TOK')='$SID1', hmv_private.student_from_token('abc') is null"); expect "21 mã phiên đúng -> đúng HS; sai -> không" "^t\|t$" "$o"
o=$($P -c "select count(*) from hmv_private.student_sessions where token_hash='$TOK'"); expect "22 mã phiên không lưu dạng rõ" "^0$" "$o"
o=$(anon "select hmv_private.student_from_token('$TOK');"); expect "23 khách không gọi được hàm nội bộ" "permission denied" "$o"
o=$(anon "select status from hmv_student_login('$CODE','$SID1','12a4');"); expect "24 PIN không hợp lệ -> failed" "^failed$" "$o"
SID2=$($P -c "select id from hmv_students where roll_no=2")
o=$(anon "select status from hmv_student_login('ZZZZZZ','$SID2','0000');"); expect "25 mã lớp sai -> failed chung" "^failed$" "$o"
as $T $(sid $T) "update hmv_classes set active=false where id='$CID';" >/dev/null
o=$(anon "select count(*) from hmv_class_roster('$CODE');"); expect "26 lớp tắt -> không hiện danh sách" "^0$" "$o"
o=$(as $T dddddddd-0000-4000-8000-000000000009 "select * from hmv_create_class('4C','2026-2027');"); expect "27 phiên GV đã đăng xuất -> từ chối" "Teacher permission required" "$o"
o=$(as $T $(sid $T) "select * from hmv_create_class('4D','2026');"); expect "28 năm học sai định dạng -> lỗi" "violates check constraint" "$o"
o=$(as $T $(sid $T) "select * from hmv_add_students('$CID', array['X']);"); expect "29 tên quá ngắn -> lỗi" "Invalid student name" "$o"
echo "TOTAL pass=$pass fail=$fail"
