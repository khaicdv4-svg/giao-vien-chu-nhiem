#!/bin/bash
# Kiểm thử phân quyền cơ sở dữ liệu trên PostgreSQL CỤC BỘ (không phải Supabase thật).
# Cách dùng: HMV_PG="-h <host> -p <port> -U postgres" bash chay-kiem-thu-db.sh
# Phần Supabase Auth được mô phỏng (auth-stub.sql); cần chạy lại trên Supabase thật trước khi dùng chính thức.
set -e
cd "$(dirname "$0")"; ROOT=../../..
: "${HMV_PG:?Đặt HMV_PG, ví dụ: -h /var/tmp/hmvpg -p 5544 -U postgres}"
psql $HMV_PG -tAc "select 1 from pg_roles where rolname='anon'" | grep -q 1 || psql $HMV_PG -qc "create role anon nologin; create role authenticated nologin;"
for t in rls-duyet-hoc-lieu rls-lop-hoc-sinh; do
  DB="hmv_test_${t//-/_}"
  psql $HMV_PG -qc "drop database if exists $DB" -c "create database $DB"
  psql $HMV_PG -d $DB -v ON_ERROR_STOP=1 -q -f auth-stub.sql -f extensions-stub.sql $(ls $ROOT/supabase/migrations/*.sql | sed 's/^/-f /')
  echo "== $t"; HMV_DB=$DB bash $t.sh | tail -1
done
