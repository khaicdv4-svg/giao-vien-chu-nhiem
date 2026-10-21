-- B2 – Lớp học, học sinh, mã PIN. DEVELOPMENT ONLY: chưa áp dụng vào cơ sở dữ liệu thật.
-- Phụ thuộc: 20261018231518_hmv_review_auth_foundation.sql (hmv_private.live_session)
-- và extension pgcrypto trong schema "extensions" (Supabase có sẵn).
-- Nguyên tắc:
--  * Chỉ giáo viên có trong bảng hmv_private.teachers (enabled, do quản trị cấp bằng SQL) mới tạo lớp.
--  * Giáo viên chỉ thấy/sửa lớp và học sinh của chính mình.
--  * PIN chỉ lưu dạng băm bcrypt; mã PIN rõ chỉ trả về MỘT lần khi tạo/đặt lại để in phiếu.
--  * Học sinh không có tài khoản: đăng nhập bằng mã lớp + chọn tên + PIN qua hàm SECURITY DEFINER,
--    nhập sai 5 lần thì khóa 15 phút; thành công nhận mã phiên (chỉ lưu dạng băm, hết hạn sau 12 giờ).
--  * Chỉ lưu họ tên, số thứ tự, lớp. Không lưu ngày sinh, số điện thoại.
begin;

-- Quyền dạy lưu ở bảng riêng (không sửa ràng buộc của bảng hmv_user_permissions).
-- Chỉ quản trị cấp/thu hồi bằng SQL; giáo viên không tự cấp được.
create table hmv_private.teachers (
  user_id uuid primary key references auth.users(id),
  enabled boolean not null default false,
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now()
);
alter table hmv_private.teachers enable row level security;
revoke all on hmv_private.teachers from public, anon, authenticated;

create function hmv_private.can_teach() returns boolean
language sql stable security definer set search_path = '' as $$
  select hmv_private.live_session() and exists(select 1 from hmv_private.teachers t
    where t.user_id = auth.uid() and t.enabled);
$$;
revoke all on function hmv_private.can_teach() from public, anon, authenticated;
grant execute on function hmv_private.can_teach() to authenticated;

-- Mã lớp 6 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/I/L).
create function hmv_private.new_join_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; code text; b bytea; i int;
begin
  loop
    b := extensions.gen_random_bytes(6); code := '';
    for i in 0..5 loop code := code || substr(alphabet, 1 + (get_byte(b, i) % length(alphabet)), 1); end loop;
    exit when not exists(select 1 from public.hmv_classes c where c.join_code = code);
  end loop;
  return code;
end;
$$;
create function hmv_private.new_pin() returns text
language sql volatile security definer set search_path = '' as $$
  select lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 10000))::text, 4, '0');
$$;
create function hmv_private.hash_secret(p text) returns text
language sql volatile security definer set search_path = '' as $$
  select extensions.crypt(p, extensions.gen_salt('bf', 8));
$$;
revoke all on function hmv_private.new_join_code(), hmv_private.new_pin(), hmv_private.hash_secret(text) from public, anon, authenticated;

create table public.hmv_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 40),
  school_year text not null check (school_year ~ '^\d{4}-\d{4}$'),
  join_code text not null unique check (join_code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.hmv_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.hmv_classes(id) on delete cascade,
  roll_no integer not null check (roll_no between 1 and 99),
  full_name text not null check (length(trim(full_name)) between 2 and 80),
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_id, roll_no)
);
create table hmv_private.student_sessions (
  token_hash text primary key,
  student_id uuid not null references public.hmv_students(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index hmv_students_by_class on public.hmv_students(class_id, roll_no);
create index hmv_student_sessions_by_student on hmv_private.student_sessions(student_id);

alter table public.hmv_classes enable row level security;
alter table public.hmv_students enable row level security;
alter table hmv_private.student_sessions enable row level security;
revoke all on public.hmv_classes, public.hmv_students from public, anon, authenticated;
revoke all on hmv_private.student_sessions from public, anon, authenticated;

-- Giáo viên: đọc lớp/học sinh của mình (KHÔNG có cột pin_hash), sửa tên lớp / trạng thái / họ tên học sinh.
grant select (id, teacher_id, name, school_year, join_code, active, created_at) on public.hmv_classes to authenticated;
grant update (name, active) on public.hmv_classes to authenticated;
grant select (id, class_id, roll_no, full_name, failed_attempts, locked_until, active, created_at) on public.hmv_students to authenticated;
grant update (full_name, active) on public.hmv_students to authenticated;

create policy hmv_classes_owner_read on public.hmv_classes for select to authenticated
  using ((select hmv_private.can_teach()) and teacher_id = (select auth.uid()));
create policy hmv_classes_owner_update on public.hmv_classes for update to authenticated
  using ((select hmv_private.can_teach()) and teacher_id = (select auth.uid()))
  with check ((select hmv_private.can_teach()) and teacher_id = (select auth.uid()));
create policy hmv_students_owner_read on public.hmv_students for select to authenticated
  using ((select hmv_private.can_teach()) and exists(select 1 from public.hmv_classes c
    where c.id = hmv_students.class_id and c.teacher_id = (select auth.uid())));
create policy hmv_students_owner_update on public.hmv_students for update to authenticated
  using ((select hmv_private.can_teach()) and exists(select 1 from public.hmv_classes c
    where c.id = hmv_students.class_id and c.teacher_id = (select auth.uid())))
  with check ((select hmv_private.can_teach()) and exists(select 1 from public.hmv_classes c
    where c.id = hmv_students.class_id and c.teacher_id = (select auth.uid())));

-- ===== Hàm cho giáo viên =====
create function public.hmv_create_class(p_name text, p_school_year text)
returns table(id uuid, name text, school_year text, join_code text)
language plpgsql security definer set search_path = '' as $$
begin
  if not hmv_private.can_teach() then raise exception 'Teacher permission required' using errcode = '42501'; end if;
  return query insert into public.hmv_classes(teacher_id, name, school_year, join_code)
    values (auth.uid(), trim(p_name), trim(p_school_year), hmv_private.new_join_code())
    returning hmv_classes.id, hmv_classes.name, hmv_classes.school_year, hmv_classes.join_code;
end;
$$;

-- Thêm danh sách học sinh (theo thứ tự). Trả về PIN rõ MỘT lần để in phiếu.
create function public.hmv_add_students(p_class_id uuid, p_names text[])
returns table(student_id uuid, roll_no integer, full_name text, pin text)
language plpgsql security definer set search_path = '' as $$
declare n text; next_no integer; p text; sid uuid;
begin
  if not hmv_private.can_teach() or not exists(select 1 from public.hmv_classes c where c.id = p_class_id and c.teacher_id = auth.uid()) then
    raise exception 'Class not found' using errcode = '42501';
  end if;
  if p_names is null or cardinality(p_names) = 0 or cardinality(p_names) > 60 then
    raise exception 'From 1 to 60 students per request' using errcode = '22023';
  end if;
  select coalesce(max(s.roll_no), 0) into next_no from public.hmv_students s where s.class_id = p_class_id;
  foreach n in array p_names loop
    n := regexp_replace(trim(coalesce(n, '')), '\s+', ' ', 'g');
    if length(n) < 2 or length(n) > 80 then raise exception 'Invalid student name' using errcode = '22023'; end if;
    next_no := next_no + 1; p := hmv_private.new_pin();
    insert into public.hmv_students(class_id, roll_no, full_name, pin_hash)
      values (p_class_id, next_no, n, hmv_private.hash_secret(p)) returning id into sid;
    student_id := sid; roll_no := next_no; full_name := n; pin := p; return next;
  end loop;
end;
$$;

-- Đặt lại PIN (học sinh quên PIN); mở khóa và hủy mọi phiên cũ của học sinh đó.
create function public.hmv_reset_student_pin(p_student_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare p text;
begin
  if not hmv_private.can_teach() or not exists(select 1 from public.hmv_students s join public.hmv_classes c on c.id = s.class_id
      where s.id = p_student_id and c.teacher_id = auth.uid()) then
    raise exception 'Student not found' using errcode = '42501';
  end if;
  p := hmv_private.new_pin();
  update public.hmv_students set pin_hash = hmv_private.hash_secret(p), failed_attempts = 0, locked_until = null where id = p_student_id;
  delete from hmv_private.student_sessions where student_id = p_student_id;
  return p;
end;
$$;

-- ===== Hàm cho học sinh (không đăng nhập) =====
-- Danh sách tên để chọn: chỉ trả về khi mã lớp đúng và lớp đang hoạt động.
create function public.hmv_class_roster(p_join_code text)
returns table(student_id uuid, roll_no integer, full_name text, class_name text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.roll_no, s.full_name, c.name from public.hmv_classes c
    join public.hmv_students s on s.class_id = c.id
   where c.join_code = upper(trim(p_join_code)) and c.active and s.active
   order by s.roll_no;
$$;

-- Đăng nhập học sinh. Không dùng RAISE cho sai PIN (RAISE sẽ hoàn tác cả việc đếm số lần sai),
-- mà trả về status: 'ok' | 'failed' | 'locked'. Thông báo chung, không tiết lộ học sinh/mã lớp có tồn tại hay không.
create function public.hmv_student_login(p_join_code text, p_student_id uuid, p_pin text)
returns table(status text, session_token text, expires_at timestamptz, full_name text, class_name text)
language plpgsql volatile security definer set search_path = '' as $$
declare s public.hmv_students; cname text; tok text; exp timestamptz;
begin
  select st.* into s from public.hmv_students st join public.hmv_classes c on c.id = st.class_id
   where st.id = p_student_id and c.join_code = upper(trim(coalesce(p_join_code, ''))) and c.active and st.active
   for update of st;
  if not found then status := 'failed'; return next; return; end if;
  if s.locked_until is not null and s.locked_until > now() then status := 'locked'; return next; return; end if;
  if p_pin is null or p_pin !~ '^\d{4}$' or extensions.crypt(p_pin, s.pin_hash) <> s.pin_hash then
    update public.hmv_students st2 set failed_attempts = st2.failed_attempts + 1,
      locked_until = case when st2.failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
      where st2.id = s.id;
    status := case when s.failed_attempts + 1 >= 5 then 'locked' else 'failed' end; return next; return;
  end if;
  update public.hmv_students st3 set failed_attempts = 0, locked_until = null where st3.id = s.id;
  delete from hmv_private.student_sessions ss where ss.student_id = s.id and ss.expires_at < now();
  tok := encode(extensions.gen_random_bytes(32), 'hex'); exp := now() + interval '12 hours';
  insert into hmv_private.student_sessions(token_hash, student_id, expires_at)
    values (encode(extensions.digest(tok, 'sha256'), 'hex'), s.id, exp);
  select c.name into cname from public.hmv_classes c where c.id = s.class_id;
  status := 'ok'; session_token := tok; expires_at := exp; full_name := s.full_name; class_name := cname; return next;
end;
$$;

-- Dùng nội bộ ở bước B3: đổi mã phiên thành học sinh (null nếu sai/hết hạn).
create function hmv_private.student_from_token(p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
  select ss.student_id from hmv_private.student_sessions ss join public.hmv_students s on s.id = ss.student_id
   where ss.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and ss.expires_at > now() and s.active;
$$;
revoke all on function hmv_private.student_from_token(text) from public, anon, authenticated;

revoke all on function public.hmv_create_class(text,text), public.hmv_add_students(uuid,text[]),
  public.hmv_reset_student_pin(uuid), public.hmv_class_roster(text), public.hmv_student_login(text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.hmv_create_class(text,text), public.hmv_add_students(uuid,text[]),
  public.hmv_reset_student_pin(uuid) to authenticated;
grant execute on function public.hmv_class_roster(text), public.hmv_student_login(text,uuid,text) to anon, authenticated;

commit;
