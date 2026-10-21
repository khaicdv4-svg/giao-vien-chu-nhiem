#!/bin/bash
P="psql $HMV_PG -d $HMV_DB -q -t -A"
A=aaaaaaaa-0000-4000-8000-000000000001; R=aaaaaaaa-0000-4000-8000-000000000002; X=aaaaaaaa-0000-4000-8000-000000000003; R2=aaaaaaaa-0000-4000-8000-000000000004
S=bbbbbbbb-0000-4000-8000-000000000001; S2=bbbbbbbb-0000-4000-8000-000000000002; M=cccccccc-0000-4000-8000-000000000001
sid(){ echo "dddddddd-0000-4000-8000-00000000000${1: -1}"; }
$P -v ON_ERROR_STOP=1 <<SQL >/dev/null
insert into auth.users values ('$A'),('$R'),('$X'),('$R2');
insert into auth.sessions values ('$(sid $A)','$A'),('$(sid $R)','$R'),('$(sid $X)','$X'),('$(sid $R2)','$R2');
insert into hmv_user_permissions values ('$A','$S','submit',true),('$R','$S','review',true),('$R2','$S2','review',true),('$X','$S','submit',false);
SQL
pass=0; fail=0
as(){ # user sid sql
  local claims="{\"sub\":\"$1\",\"session_id\":\"$2\",\"is_anonymous\":false,\"role\":\"authenticated\"}"
  $P <<SQL 2>&1
begin; select set_config('request.jwt.claims','$claims',true) \g /dev/null
set local role authenticated;
$3
commit;
SQL
}
expect(){ # name pattern output
  if echo "$3" | grep -qE "$2"; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1 :: $3"; fail=$((fail+1)); fi; }
SNAP='{"schemaVersion":1}'
o=$(as $A $(sid $A) "select (hmv_create_review_request('$S','$M',1,'$SNAP'::jsonb)).status;"); expect "1 tác giả có quyền submit tạo yêu cầu" "pending" "$o"
o=$(as $X $(sid $X) "select (hmv_create_review_request('$S','$M',1,'$SNAP'::jsonb)).status;"); expect "2 quyền submit bị tắt -> từ chối" "row-level security|violates" "$o"
o=$(as $A dddddddd-0000-4000-8000-000000000009 "select (hmv_create_review_request('$S','$M',2,'$SNAP'::jsonb)).status;"); expect "3 phiên đã thu hồi -> từ chối" "row-level security|violates" "$o"
o=$(as $A $(sid $A) "insert into hmv_review_requests(school_id,material_id,material_version,snapshot,author_id) values('$S','$M',3,'{}','$R');"); expect "4 giả mạo author_id -> từ chối" "permission denied|row-level security" "$o"
o=$(as $X $(sid $X) "select count(*) from hmv_review_requests;"); expect "5 người ngoài không thấy yêu cầu" "^0$" "$o"
o=$(as $R2 $(sid $R2) "select count(*) from hmv_review_requests;"); expect "6 reviewer trường khác không thấy" "^0$" "$o"
o=$(as $R $(sid $R) "select count(*) from hmv_review_requests;"); expect "7 reviewer cùng trường thấy" "^1$" "$o"
ID=$($P -c "select id from hmv_review_requests limit 1")
o=$(as $A $(sid $A) "select (hmv_decide_review_request('$ID',1,'approved','')).status;"); expect "8 tác giả tự duyệt -> từ chối" "stale|forbidden|42501|Not visible" "$o"
o=$(as $R2 $(sid $R2) "select (hmv_decide_review_request('$ID',1,'approved','')).status;"); expect "9 reviewer trường khác duyệt -> từ chối" "Not visible|forbidden" "$o"
o=$(as $R $(sid $R) "select (hmv_decide_review_request('$ID',1,'rejected','  ')).status;"); expect "10 từ chối không lý do -> lỗi" "Invalid decision" "$o"
o=$(as $R $(sid $R) "update hmv_review_requests set snapshot='{\"x\":1}' where id='$ID';"); expect "11 sửa nội dung đã gửi -> từ chối" "permission denied" "$o"
o=$(as $R $(sid $R) "update hmv_review_requests set status='approved',row_version=2,review_note='',author_id='$R' where id='$ID';"); expect "12 PATCH đổi author_id -> từ chối" "permission denied" "$o"
o=$(as $R $(sid $R) "select (hmv_decide_review_request('$ID',1,'approved','Đạt')).status;"); expect "13 reviewer duyệt đúng" "approved" "$o"
o=$(as $R $(sid $R) "select (hmv_decide_review_request('$ID',2,'rejected','x')).status;"); expect "14 không duyệt lại lần 2" "Not visible|stale|forbidden" "$o"
o=$($P -c "select count(*)||':'||max(actor_id::text) from hmv_private.review_events"); expect "15 ghi nhật ký người duyệt" "^1:$R$" "$o"
o=$(as $R $(sid $R) "insert into hmv_user_permissions values('$R','$S2','review',true);"); expect "16 tự cấp quyền -> từ chối" "permission denied" "$o"
o=$($P <<SQL 2>&1
begin; set local role anon; select count(*) from hmv_review_requests; commit;
SQL
); expect "17 khách ẩn danh không đọc được" "permission denied" "$o"
o=$(psql $HMV_PG -d $HMV_DB -q -t -A -c "begin" -c "select set_config('request.jwt.claims','{\"sub\":\"$A\",\"session_id\":\"$(sid $A)\",\"is_anonymous\":true}',true)" -c "set local role authenticated" -c "select (hmv_create_review_request('$S','$M',5,'{}'::jsonb)).status" 2>&1); expect "18 tài khoản ẩn danh -> từ chối" "row-level security|violates" "$o"
echo "TOTAL pass=$pass fail=$fail"
