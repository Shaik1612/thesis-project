# Class Diagram

This codebase is a React/Vite application with Supabase as the durable domain model. It does not define many JavaScript classes, so this diagram models:

- database tables as domain classes/entities,
- React hooks and helper modules as services,
- route-level pages as boundary/controllers,
- Supabase Edge Functions/RPCs as application services.

## Domain Model

```mermaid
classDiagram
  direction LR

  class RestaurantSettings {
    +uuid id
    +boolean kiosk_enabled
    +boolean web_ordering_enabled
    +boolean loyalty_enabled
    +boolean desk_enabled
    +boolean cash_enabled
    +jsonb theme_config
    +text gstin
    +numeric gst_rate
    +boolean gst_inclusive
    +timestamptz updated_at
  }

  class Category {
    +uuid id
    +text name
    +integer sort_order
    +timestamptz created_at
  }

  class MenuItem {
    +uuid id
    +text name
    +text description
    +numeric price
    +uuid category_id
    +text photo_url
    +boolean available
    +integer sort_order
    +timestamptz created_at
    +timestamptz updated_at
  }

  class MenuItemVariant {
    +uuid id
    +uuid menu_item_id
    +text name
    +numeric price
    +integer sort_order
    +boolean available
  }

  class Ingredient {
    +uuid id
    +text name
    +text unit
    +numeric stock_qty
    +numeric low_stock_threshold
    +boolean auto_disable
  }

  class MenuItemIngredient {
    +uuid menu_item_id
    +uuid ingredient_id
    +numeric qty_used
    +boolean customer_removable
  }

  class Coupon {
    +uuid id
    +text code
    +text discount_type
    +numeric discount_value
    +numeric min_order_amount
    +numeric max_discount
    +boolean active
    +timestamptz expires_at
  }

  class Order {
    +uuid id
    +text order_type
    +text channel
    +text status
    +text payment_method
    +text payment_status
    +text razorpay_order_id
    +text customer_phone
    +numeric total_amount
    +numeric discount_amount
    +text coupon_code
    +numeric gst_rate
    +numeric gst_amount
    +integer priority
    +integer loyalty_points_redeemed
    +timestamptz created_at
    +timestamptz updated_at
  }

  class OrderItem {
    +uuid id
    +uuid order_id
    +uuid menu_item_id
    +uuid variant_id
    +text variant_name
    +jsonb customizations
    +integer quantity
    +numeric unit_price
    +numeric subtotal
  }

  class PendingCart {
    +text razorpay_order_id
    +text channel
    +text order_type
    +text customer_phone
    +jsonb items
    +numeric subtotal
    +numeric gst_rate
    +numeric gst_amount
    +numeric total_amount
    +text coupon_code
    +numeric coupon_discount
    +timestamptz consumed_at
  }

  class Payment {
    +uuid id
    +uuid order_id
    +text method
    +numeric amount
    +numeric tendered_amount
    +numeric change_amount
    +text status
    +uuid staff_id
    +timestamptz created_at
  }

  class Refund {
    +uuid id
    +uuid order_id
    +text razorpay_refund_id
    +numeric amount
    +text reason
    +text status
    +uuid initiated_by
  }

  class LoyaltyAccount {
    +uuid id
    +text phone
    +integer points
    +integer visit_count
    +numeric total_spend
  }

  class PrintJob {
    +uuid id
    +text type
    +uuid order_id
    +jsonb payload
    +text status
  }

  class Expense {
    +uuid id
    +text category
    +text description
    +numeric amount
    +date date
  }

  class OrderItemVoid {
    +uuid id
    +uuid order_item_id
    +uuid order_id
    +uuid voided_by
    +text reason
    +integer quantity_voided
    +numeric amount_voided
  }

  class DeskAuditEvent {
    +uuid id
    +uuid actor_id
    +text event_type
    +uuid order_id
    +jsonb payload
    +timestamptz created_at
  }

  class ZReport {
    +uuid id
    +date report_date
    +integer total_orders
    +numeric total_gross
    +numeric total_discounts
    +numeric total_net
    +numeric total_gst
    +numeric total_cash
    +numeric total_upi
    +numeric total_refunds
    +integer total_voids
    +numeric closing_cash_balance
    +uuid generated_by
    +boolean is_locked
  }

  Category "0..1" <-- "0..*" MenuItem : categorizes
  MenuItem "1" *-- "0..*" MenuItemVariant : offers
  MenuItem "1" -- "0..*" MenuItemIngredient : uses
  Ingredient "1" -- "0..*" MenuItemIngredient : maps
  Coupon "0..1" <-- "0..*" Order : applies
  Order "1" *-- "1..*" OrderItem : contains
  MenuItem "1" <-- "0..*" OrderItem : snapshots
  MenuItemVariant "0..1" <-- "0..*" OrderItem : selected
  Order "1" o-- "0..*" Payment : paid_by
  Order "1" o-- "0..*" Refund : refunded_by
  Order "1" o-- "0..*" PrintJob : produces
  Order "1" o-- "0..*" DeskAuditEvent : audited_by
  Order "1" o-- "0..*" OrderItemVoid : voids
  OrderItem "1" <-- "0..*" OrderItemVoid : voids_line
  PendingCart "1" ..> Order : becomes_after_payment
  LoyaltyAccount "0..1" ..> Order : phone_based_rewards
  ZReport "1" ..> Order : summarizes
  ZReport "1" ..> Payment : summarizes
  ZReport "1" ..> Refund : summarizes
  Expense "0..*" ..> ZReport : operating_cost_context
```

## Application Modules

```mermaid
classDiagram
  direction TB

  class SupabaseClient {
    +from(table)
    +rpc(name, params)
    +channel(name)
    +auth
  }

  class AuthContext {
    +user
    +profile
    +role
    +signIn()
    +signOut()
  }

  class SettingsContext {
    +settings
    +loading
    +refresh()
  }

  class UseMenu {
    +categories
    +items
    +loading
    +error
    +displayPrice(item)
    +hasMultipleVariants(item)
  }

  class UseCart {
    +items
    +subtotal
    +gstAmount
    +grandTotal
    +totalItems
    +add(menuItem, config)
    +remove(keyOrMenuItemId)
    +removeLine(lineKey)
    +updateLineNote(lineKey, note)
    +clear()
    +quantityFor(menuItemId)
  }

  class UseOrders {
    +orders
    +loading
    +refetch()
  }

  class OrderTotals {
    +payableAmount(order, gstInclusive)
    +paidRevenueOrder(order)
    +orderCode(orderOrId)
  }

  class Recommendations {
    +fetchRecommendations(cartItemIds, cartCategoryIds, limit)
  }

  class CustomerOrderingPages {
    <<boundary>>
    +WebOrderPage
    +KioskPage
    +MenuLayout
    +PaymentScreen
    +CartPage
  }

  class StaffPages {
    <<boundary>>
    +KitchenPage
    +DeskPage
    +NewSale
    +OrdersPanel
    +PendingPayments
  }

  class AdminPages {
    <<boundary>>
    +Dashboard
    +MenuAdmin
    +OrdersAdmin
    +CouponsAdmin
    +IngredientsAdmin
    +RefundsAdmin
    +ReportsAdmin
    +SettingsAdmin
  }

  class EdgeFunctions {
    <<service>>
    +createRazorpayOrder()
    +verifyRazorpayPayment()
    +razorpayWebhook()
    +razorpayRefundWebhook()
    +notifyOrderReady()
  }

  class DatabaseRPC {
    <<service>>
    +create_desk_cash_order()
    +settle_cash_order()
    +refund_paid_cash_order()
    +validate_coupon()
  }

  AuthContext --> SupabaseClient
  SettingsContext --> SupabaseClient
  UseMenu --> SupabaseClient
  UseOrders --> SupabaseClient
  Recommendations --> SupabaseClient
  UseCart --> OrderTotals

  CustomerOrderingPages --> UseMenu
  CustomerOrderingPages --> UseCart
  CustomerOrderingPages --> SettingsContext
  CustomerOrderingPages --> Recommendations
  CustomerOrderingPages --> EdgeFunctions

  StaffPages --> UseMenu
  StaffPages --> UseOrders
  StaffPages --> SettingsContext
  StaffPages --> DatabaseRPC

  AdminPages --> AuthContext
  AdminPages --> SettingsContext
  AdminPages --> SupabaseClient
  AdminPages --> DatabaseRPC

  EdgeFunctions --> SupabaseClient
  DatabaseRPC --> Order
  DatabaseRPC --> Payment
  DatabaseRPC --> Refund
  DatabaseRPC --> DeskAuditEvent
```

## Notes

- `tables`, `table_sessions`, and `staff_requests` exist in earlier migrations but are dropped by `020_drop_tables_waiter_qr.sql`; they are not part of the current schema diagram.
- `OrderItem.variant_name` and `OrderItem.customizations` intentionally snapshot the customer-visible line configuration so kitchen tickets and invoices remain stable even if the menu changes later.
- `PendingCart` is an Edge Function staging table for Razorpay checkout. It is consumed into a real `Order` after payment capture.
- `LoyaltyAccount` is linked by `customer_phone`, not a foreign key, so the diagram shows it as a dependency rather than a strict association.
