-- ============================================================
-- Move auth_role() to read app_metadata.role instead of user_metadata.role
--
-- Supabase's user_metadata is editable by the end user via the auth API:
-- a signed-in employee could call supabase.auth.updateUser({ data: { role:
-- 'admin' } }) and escalate their own privileges. app_metadata can only be
-- written by the service role (server-side), so it's the correct home for
-- authorization claims.
--
-- All existing policies in 009_rls.sql call auth_role() — replacing the
-- function body propagates automatically.
-- ============================================================

create or replace function auth_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'anonymous'
  );
$$;

-- A convenience for the application layer: check whether the current
-- session has any staff role at all. Useful for UI gating that doesn't
-- care which staff role.
create or replace function auth_is_staff()
returns boolean language sql stable as $$
  select auth_role() in ('admin', 'employee', 'kitchen');
$$;
