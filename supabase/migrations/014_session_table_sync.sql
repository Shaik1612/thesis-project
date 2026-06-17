-- ============================================================
-- Keep tables.status in sync with table_sessions lifecycle
--
-- 008_triggers.sql:133 already frees the table when the last unpaid
-- order in a session is settled. But it only fires through an orders
-- update — it doesn't cover manual session open/close from the desk
-- floor map. These triggers close that gap.
-- ============================================================

create or replace function mark_table_occupied_on_session_open()
returns trigger language plpgsql as $$
begin
  update tables
  set status = 'occupied'
  where id = new.table_id
    and status <> 'occupied';
  return new;
end;
$$;

create trigger mark_table_occupied
  after insert on table_sessions
  for each row
  when (new.status <> 'closed')
  execute function mark_table_occupied_on_session_open();

create or replace function free_table_on_session_close()
returns trigger language plpgsql as $$
begin
  if new.status = 'closed' and old.status <> 'closed' then
    update tables
    set status = 'free'
    where id = new.table_id;
  end if;
  return new;
end;
$$;

create trigger free_table_on_session_close
  after update on table_sessions
  for each row execute function free_table_on_session_close();
