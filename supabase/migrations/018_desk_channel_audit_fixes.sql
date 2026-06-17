-- ============================================================
-- Desk channel audit fixes
--
-- Adds safer Desk RPCs and centralizes payable total calculation so GST
-- inclusive orders are not charged or displayed as total + included GST.
-- ============================================================

create or replace function order_payable_amount(
  p_total_amount numeric,
  p_gst_amount numeric,
  p_gst_inclusive boolean
)
returns numeric
language sql
stable
as $$
  select round(
    case
      when coalesce(p_gst_inclusive, false)
        then coalesce(p_total_amount, 0)
      else coalesce(p_total_amount, 0) + coalesce(p_gst_amount, 0)
    end,
    2
  )
$$;

create or replace function open_table_session(
  p_table_id uuid,
  p_covers integer
)
returns table_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_table tables;
  v_session table_sessions;
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only staff can open table sessions';
  end if;

  select * into v_table
  from tables
  where id = p_table_id
  for update;

  if v_table.id is null then
    raise exception 'Table not found';
  end if;

  if p_covers is null or p_covers < 1 then
    raise exception 'Guest count must be at least 1';
  end if;

  if p_covers > v_table.capacity then
    raise exception 'Guest count exceeds table capacity';
  end if;

  insert into table_sessions(table_id, opened_by, covers, status)
  values (p_table_id, v_staff_id, p_covers, 'seated')
  returning * into v_session;

  insert into desk_audit_events(actor_id, event_type, session_id, payload)
  values (
    v_staff_id,
    'table_session_opened',
    v_session.id,
    jsonb_build_object(
      'table_id', p_table_id,
      'covers', p_covers,
      'table_label', v_table.label
    )
  );

  return v_session;
end;
$$;

revoke all on function open_table_session(uuid, integer) from public;
grant execute on function open_table_session(uuid, integer) to authenticated;

create or replace function advance_table_session(
  p_session_id uuid,
  p_next_status text
)
returns table_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_session table_sessions;
  v_current_idx integer;
  v_next_idx integer;
  v_order_count integer;
  v_statuses text[] := array['seated','ordered','eating','bill_requested','paying'];
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only staff can update table sessions';
  end if;

  if p_next_status is null or not p_next_status = any(v_statuses) then
    raise exception 'Invalid table session status';
  end if;

  select * into v_session
  from table_sessions
  where id = p_session_id
    and status <> 'closed'
  for update;

  if v_session.id is null then
    raise exception 'Table session is not active';
  end if;

  select count(*) into v_order_count
  from orders
  where session_id = p_session_id;

  v_current_idx := array_position(v_statuses, v_session.status);
  v_next_idx := array_position(v_statuses, p_next_status);

  if v_order_count > 0 and p_next_status = 'seated' then
    raise exception 'Cannot move an ordered table back to seated';
  end if;

  if v_next_idx < v_current_idx then
    raise exception 'Table lifecycle cannot move backward';
  end if;

  update table_sessions
  set status = p_next_status
  where id = p_session_id
  returning * into v_session;

  insert into desk_audit_events(actor_id, event_type, session_id, payload)
  values (
    v_staff_id,
    'table_session_status_changed',
    v_session.id,
    jsonb_build_object(
      'from_status', v_statuses[v_current_idx],
      'to_status', p_next_status
    )
  );

  return v_session;
end;
$$;

revoke all on function advance_table_session(uuid, text) from public;
grant execute on function advance_table_session(uuid, text) to authenticated;

create or replace function close_table_session(
  p_session_id uuid
)
returns table_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_session table_sessions;
  v_unpaid_count integer;
  v_active_count integer;
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only staff can close table sessions';
  end if;

  select * into v_session
  from table_sessions
  where id = p_session_id
    and status <> 'closed'
  for update;

  if v_session.id is null then
    raise exception 'Table session is not active';
  end if;

  select count(*) into v_unpaid_count
  from orders
  where session_id = p_session_id
    and payment_status = 'unpaid';

  if v_unpaid_count > 0 then
    raise exception '% unpaid order(s) still need settlement', v_unpaid_count;
  end if;

  select count(*) into v_active_count
  from orders
  where session_id = p_session_id
    and status not in ('completed', 'cancelled');

  if v_active_count > 0 then
    raise exception '% order(s) are still active', v_active_count;
  end if;

  update table_sessions
  set status = 'closed',
      closed_at = now()
  where id = p_session_id
  returning * into v_session;

  update tables
  set status = 'free'
  where id = v_session.table_id;

  insert into desk_audit_events(actor_id, event_type, session_id, payload)
  values (
    v_staff_id,
    'table_session_closed',
    v_session.id,
    jsonb_build_object('table_id', v_session.table_id)
  );

  return v_session;
end;
$$;

revoke all on function close_table_session(uuid) from public;
grant execute on function close_table_session(uuid) to authenticated;

create or replace function settle_cash_order(
  p_order_id uuid,
  p_tendered_amount numeric
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_order orders;
  v_settings record;
  v_total_due numeric(10,2);
  v_tendered numeric(10,2) := coalesce(p_tendered_amount, 0);
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only desk staff can settle cash orders';
  end if;

  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception 'Order is already paid';
  end if;

  if v_order.payment_method is not null and v_order.payment_method <> 'cash' then
    raise exception 'Only cash orders can be settled at Desk';
  end if;

  select * into v_settings from restaurant_settings limit 1;
  v_total_due := order_payable_amount(
    v_order.total_amount,
    v_order.gst_amount,
    coalesce(v_settings.gst_inclusive, false)
  );

  if v_tendered < v_total_due then
    raise exception 'Cash tendered is less than total due';
  end if;

  insert into payments (
    order_id,
    method,
    amount,
    tendered_amount,
    change_amount,
    status,
    staff_id
  )
  values (
    v_order.id,
    'cash',
    v_total_due,
    v_tendered,
    v_tendered - v_total_due,
    'paid',
    v_staff_id
  );

  update orders
  set payment_method = 'cash',
      payment_status = 'paid'
  where id = v_order.id
  returning * into v_order;

  insert into desk_audit_events(actor_id, event_type, order_id, session_id, payload)
  values (
    v_staff_id,
    'cash_order_settled',
    v_order.id,
    v_order.session_id,
    jsonb_build_object(
      'channel', v_order.channel,
      'total_due', v_total_due,
      'tendered_amount', v_tendered,
      'change_amount', v_tendered - v_total_due
    )
  );

  return v_order;
end;
$$;

revoke all on function settle_cash_order(uuid, numeric) from public;
grant execute on function settle_cash_order(uuid, numeric) to authenticated;

create or replace function cancel_paid_cash_order(
  p_order_id uuid,
  p_reason text,
  p_refund_amount numeric default null
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_order orders;
  v_settings record;
  v_total_due numeric(10,2);
  v_refund numeric(10,2);
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only desk staff can cancel paid cash orders';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Cancellation reason is required';
  end if;

  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.status in ('completed', 'cancelled') then
    raise exception 'Order is already closed';
  end if;

  if v_order.payment_method <> 'cash' or v_order.payment_status <> 'paid' then
    raise exception 'Only paid cash orders use this cancellation path';
  end if;

  select * into v_settings from restaurant_settings limit 1;
  v_total_due := order_payable_amount(
    v_order.total_amount,
    v_order.gst_amount,
    coalesce(v_settings.gst_inclusive, false)
  );
  v_refund := coalesce(p_refund_amount, v_total_due);

  if v_refund < 0 or v_refund > v_total_due then
    raise exception 'Invalid refund amount';
  end if;

  update orders
  set status = 'cancelled'
  where id = v_order.id
  returning * into v_order;

  if v_refund > 0 then
    insert into refunds(order_id, amount, reason, status, initiated_by)
    values (v_order.id, v_refund, p_reason, 'processed', v_staff_id);
  end if;

  update payments
  set status = case when v_refund >= v_total_due then 'refunded' else status end
  where order_id = v_order.id
    and method = 'cash'
    and status = 'paid';

  insert into desk_audit_events(actor_id, event_type, order_id, session_id, payload)
  values (
    v_staff_id,
    'paid_cash_order_cancelled',
    v_order.id,
    v_order.session_id,
    jsonb_build_object(
      'reason', p_reason,
      'total_due', v_total_due,
      'refund_amount', v_refund
    )
  );

  return v_order;
end;
$$;

revoke all on function cancel_paid_cash_order(uuid, text, numeric) from public;
grant execute on function cancel_paid_cash_order(uuid, text, numeric) to authenticated;

create or replace function reprint_order_invoice(
  p_order_id uuid
)
returns print_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_order orders;
  v_job print_jobs;
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only staff can reprint invoices';
  end if;

  select * into v_order
  from orders
  where id = p_order_id;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status <> 'paid' then
    raise exception 'Only paid orders can be reprinted';
  end if;

  insert into print_jobs(type, order_id, payload)
  select
    'invoice',
    v_order.id,
    jsonb_build_object(
      'order_id',        v_order.id,
      'reprint',         true,
      'channel',         v_order.channel,
      'payment_method',  v_order.payment_method,
      'total_amount',    v_order.total_amount,
      'discount_amount', v_order.discount_amount,
      'gst_rate',        v_order.gst_rate,
      'gst_amount',      v_order.gst_amount,
      'created_at',      v_order.created_at,
      'items',           (
        select jsonb_agg(jsonb_build_object(
          'name',       mi.name,
          'quantity',   oi.quantity,
          'unit_price', oi.unit_price,
          'subtotal',   oi.subtotal
        ))
        from order_items oi
        join menu_items mi on mi.id = oi.menu_item_id
        where oi.order_id = v_order.id
      )
    )
  returning * into v_job;

  insert into desk_audit_events(actor_id, event_type, order_id, session_id, payload)
  values (
    v_staff_id,
    'invoice_reprint_requested',
    v_order.id,
    v_order.session_id,
    jsonb_build_object('print_job_id', v_job.id)
  );

  return v_job;
end;
$$;

revoke all on function reprint_order_invoice(uuid) from public;
grant execute on function reprint_order_invoice(uuid) to authenticated;
