-- Twenty fixed-price menu items. These intentionally have no rows in
-- menu_item_variants and no customer-removable ingredient mappings.
insert into menu_items (
  id, name, description, price, category_id, photo_url, available, sort_order
) values
  -- Starters
  ('33333333-3333-3333-3333-000000000019', 'Veg Spring Rolls', 'Crisp vegetable rolls served with sweet chilli dip', 149.00, '11111111-1111-1111-1111-000000000001', 'https://images.unsplash.com/photo-1548507200-9f064b993c4e?auto=format&fit=crop&w=900&q=80', true, 30),
  ('33333333-3333-3333-3333-00000000001a', 'Chilli Paneer', 'Crispy paneer tossed with peppers and chilli sauce', 239.00, '11111111-1111-1111-1111-000000000001', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=80', true, 40),
  ('33333333-3333-3333-3333-00000000001b', 'Crispy Chicken Wings', 'Spiced chicken wings with a smoky house dip', 279.00, '11111111-1111-1111-1111-000000000001', 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=80', true, 50),
  ('33333333-3333-3333-3333-00000000001c', 'Fish Fingers', 'Golden crumb-fried fish fingers with tartar dip', 299.00, '11111111-1111-1111-1111-000000000001', 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=900&q=80', true, 60),
  -- Mains
  ('33333333-3333-3333-3333-00000000001d', 'Chicken Biryani', 'Aromatic basmati rice layered with spiced chicken', 299.00, '11111111-1111-1111-1111-000000000002', 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=900&q=80', true, 50),
  ('33333333-3333-3333-3333-00000000001e', 'Dal Makhani', 'Slow-cooked black lentils finished with butter and cream', 229.00, '11111111-1111-1111-1111-000000000002', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80', true, 60),
  ('33333333-3333-3333-3333-00000000001f', 'Kadai Paneer', 'Paneer and peppers in a bold kadai masala', 289.00, '11111111-1111-1111-1111-000000000002', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80', true, 70),
  ('33333333-3333-3333-3333-000000000020', 'Chicken Fried Rice', 'Wok-tossed rice with chicken, vegetables, and spring onion', 249.00, '11111111-1111-1111-1111-000000000002', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80', true, 80),
  ('33333333-3333-3333-3333-000000000021', 'Hakka Noodles', 'Wok-tossed noodles with crunchy vegetables', 219.00, '11111111-1111-1111-1111-000000000002', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80', true, 90),
  -- Burgers
  ('33333333-3333-3333-3333-000000000022', 'Tandoori Chicken Burger', 'Tandoori chicken patty, mint mayo, onion, and lettuce', 249.00, '11111111-1111-1111-1111-000000000006', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80', true, 40),
  ('33333333-3333-3333-3333-000000000023', 'Paneer Stack Burger', 'Spiced paneer patty, cheese, lettuce, and house sauce', 219.00, '11111111-1111-1111-1111-000000000006', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80', true, 50),
  ('33333333-3333-3333-3333-000000000024', 'BBQ Chicken Burger', 'Grilled chicken, smoky barbecue sauce, slaw, and pickles', 269.00, '11111111-1111-1111-1111-000000000006', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=80', true, 60),
  -- Sides
  ('33333333-3333-3333-3333-000000000025', 'Classic Salted Fries', 'Golden fries seasoned with sea salt', 119.00, '11111111-1111-1111-1111-000000000007', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80', true, 40),
  ('33333333-3333-3333-3333-000000000026', 'Onion Rings', 'Crisp battered onion rings with creamy dip', 139.00, '11111111-1111-1111-1111-000000000007', 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=900&q=80', true, 50),
  ('33333333-3333-3333-3333-000000000027', 'Garlic Bread', 'Toasted bread with garlic butter and herbs', 129.00, '11111111-1111-1111-1111-000000000007', 'https://images.unsplash.com/photo-1619531040576-f9416740661f?auto=format&fit=crop&w=900&q=80', true, 60),
  -- Beverages
  ('33333333-3333-3333-3333-000000000028', 'Fresh Lime Soda', 'Fresh lime, soda, and a touch of sweetness', 99.00, '11111111-1111-1111-1111-000000000003', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80', true, 70),
  ('33333333-3333-3333-3333-000000000029', 'Cold Coffee', 'Chilled creamy coffee blended until frothy', 159.00, '11111111-1111-1111-1111-000000000003', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80', true, 80),
  -- Desserts
  ('33333333-3333-3333-3333-00000000002a', 'Brownie with Ice Cream', 'Warm chocolate brownie topped with vanilla ice cream', 189.00, '11111111-1111-1111-1111-000000000004', 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=900&q=80', true, 40),
  ('33333333-3333-3333-3333-00000000002b', 'Rasmalai', 'Soft cottage-cheese dumplings in saffron milk', 129.00, '11111111-1111-1111-1111-000000000004', 'https://images.unsplash.com/photo-1605197161470-5d2a9af568af?auto=format&fit=crop&w=900&q=80', true, 50),
  ('33333333-3333-3333-3333-00000000002c', 'Malai Kulfi', 'Traditional dense milk dessert with cardamom and nuts', 119.00, '11111111-1111-1111-1111-000000000004', 'https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=900&q=80', true, 60)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  category_id = excluded.category_id,
  photo_url = excluded.photo_url,
  available = excluded.available,
  sort_order = excluded.sort_order;
