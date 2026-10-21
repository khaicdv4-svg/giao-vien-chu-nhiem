
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users(id uuid primary key);
create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id));
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
