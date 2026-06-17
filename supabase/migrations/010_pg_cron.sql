-- Expire provisional UPI orders that never received webhook confirmation.
-- These are orders with razorpay_order_id set but status still 'pending'
-- and created more than 15 minutes ago. We cancel them to release any
-- ingredient holds and keep the order table clean.
--
-- Note: pg_cron requires the extension to be in the 'cron' schema.
-- Run this migration AFTER the pg_cron extension is enabled (001_extensions.sql).

select cron.schedule(
  'expire-provisional-upi-orders',
  '*/5 * * * *',
  $$
    update orders
    set status = 'cancelled'
    where status = 'pending'
      and razorpay_order_id is not null
      and payment_status = 'unpaid'
      and created_at < now() - interval '15 minutes';
  $$
);
