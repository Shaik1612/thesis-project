-- Dedicated paid-cash refund path for Desk.
-- Unlike cancel_paid_cash_order, this supports completed orders: completed
-- tickets stay completed, while active tickets are cancelled after refund.

create or replace function refund_paid_cash_order(
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
  v_pre_discount_due numeric(10,2);
  v_total_due numeric(10,2);
  v_already_refunded numeric(10,2);
  v_remaining numeric(10,2);
  v_refund numeric(10,2);
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only desk staff can refund paid cash orders';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Refund reason is required';
  end if;

  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'Order is already cancelled';
  end if;

  if v_order.payment_method <> 'cash' or v_order.payment_status <> 'paid' then
    raise exception 'Only paid cash orders can be refunded here';
  end if;

  select * into v_settings from restaurant_settings limit 1;
  v_pre_discount_due := order_payable_amount(
    v_order.total_amount,
    v_order.gst_amount,
    coalesce(v_settings.gst_inclusive, false)
  );
  v_total_due := round(greatest(0, v_pre_discount_due - coalesce(v_order.discount_amount, 0)), 2);

  select coalesce(sum(amount), 0)::numeric(10,2) into v_already_refunded
  from refunds
  where order_id = v_order.id
    and status = 'processed';

  v_remaining := round(greatest(0, v_total_due - v_already_refunded), 2);
  v_refund := coalesce(p_refund_amount, v_remaining);

  if v_remaining <= 0 then
    raise exception 'Order is already fully refunded';
  end if;

  if v_refund <= 0 or v_refund > v_remaining then
    raise exception 'Invalid refund amount';
  end if;

  if v_order.status <> 'completed' then
    update orders
    set status = 'cancelled'
    where id = v_order.id
    returning * into v_order;
  end if;

  insert into refunds(order_id, amount, reason, status, initiated_by)
  values (v_order.id, v_refund, p_reason, 'processed', v_staff_id);

  if v_refund >= v_remaining then
    update payments
    set status = 'refunded'
    where order_id = v_order.id
      and method = 'cash'
      and status = 'paid';
  end if;

  insert into desk_audit_events(actor_id, event_type, order_id, payload)
  values (
    v_staff_id,
    'paid_cash_order_refunded',
    v_order.id,
    jsonb_build_object(
      'reason', p_reason,
      'total_due', v_total_due,
      'already_refunded', v_already_refunded,
      'refund_amount', v_refund,
      'remaining_after_refund', greatest(0, v_remaining - v_refund)
    )
  );

  return v_order;
end;
$$;

revoke all on function refund_paid_cash_order(uuid, text, numeric) from public;
grant execute on function refund_paid_cash_order(uuid, text, numeric) to authenticated;
