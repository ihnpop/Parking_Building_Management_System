  -- ============================================================
  -- SEED (TRUNCATE/DELETE optional)
  -- Tip: run in a clean DB or remove the deletes if you want to keep existing data.
  -- ============================================================


  -- ============================================================
  -- 1) ROLE
  -- ============================================================
  INSERT INTO role (role_name, description) VALUES
  ('ADMIN', 'Quản trị hệ thống'),
  ('MANAGER', 'Quản lý bãi xe'),
  ('STAFF', 'Nhân viên bãi xe');


  -- ============================================================
  -- 2) PROFILES (Supabase Auth users)
  -- ============================================================
  -- You created profiles.id references auth.users(id).
  -- If you DON'T want to create auth.users here (recommended),
  -- you MUST provide existing auth.user ids.
  --
  -- Below uses placeholders: replace :user_id_x with actual UUIDs from auth.users.
  -- If you don't have those IDs, stop here and tell me how you create auth users.

  -- Example (replace with real IDs):
  -- INSERT INTO profiles (id, role_id, username, full_name, email, phone, status)
  -- SELECT
  --   :user_id_admin,
  --   r.role_id, 'admin01', 'System Administrator', 'admin@parking.com', '0901000001', 'Hoạt động'
  -- FROM role r WHERE r.role_name='SYSTEM_ADMI';

  -- For safety, we won't insert invalid auth.user ids automatically.
  -- Comment/uncomment once you have auth.user ids.


  -- ============================================================
  -- 3) VEHICLE TYPE
  -- ============================================================
  INSERT INTO vehicle_type (name, status) VALUES
  ('Xe máy', 'Hoạt động'),
  ('Ô tô', 'Hoạt động');

  -- ============================================================
  -- 4) BUILDING & PARKING
  -- ============================================================
  INSERT INTO building (name, address, status) VALUES
  -- ('Vinhome GrandPark', 'Quận 9, TP. Hồ Chí Minh', 'Hoạt động'),
  -- ('West Lake Parking Tower', 'Quận Tây Hồ, Hà Nội', 'Hoạt động');

  ('Vinhomes Grand Park - Tòa S1.01', 'Quận 9, TP. Hồ Chí Minh', 'Hoạt động'),
  ('Vinhomes Grand Park - Tòa S1.02', 'Quận 9, TP. Hồ Chí Minh', 'Hoạt động'),
  ('Vinhomes Grand Park - Tòa S1.03', 'Quận 9, TP. Hồ Chí Minh', 'Hoạt động');

  -- ============================================================
  -- 4) BUILDING -> PARKING
  -- Tạo 1 parking cho mỗi building Vinhome GrandPark
  -- ============================================================

  INSERT INTO parking (building_id, name, total_capacity, open_time, close_time, status)
  SELECT
    b.building_id,
    'Vinhomes GrandPark Main Parking - ' || b.name,   -- unique theo building
    1000,                                                -- bạn có thể đổi capacity mặc định
    '05:00'::time,
    '23:59'::time,
    'Hoạt động'
  FROM building b
  WHERE b.name ILIKE 'Vinhomes Grand Park - Tòa %'
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 5) PARKING -> FLOOR
  -- Mỗi parking tạo 3 tầng (1..3) cho nhanh + đồng bộ area/slot
  -- ============================================================

  INSERT INTO floor (parking_id, floor_number, name, status)
  SELECT
    p.parking_id,
    f.floor_number,
    f.name,
    'Hoạt động'
  FROM (
    VALUES
      ('Floor 1', 1),
      ('Floor 2', 2)
  ) AS f(name, floor_number)
  JOIN parking p
    ON p.name LIKE 'Vinhomes GrandPark Main Parking - %'
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 6) AREA (Chỉ Xe máy & Ô tô)
  -- ============================================================

  -- Xe máy: floors 1,2,3 => capacity 60
  INSERT INTO area (floor_id, vehicle_type_id, name, capacity, status)
  SELECT
    fl.floor_id,
    vt.vehicle_type_id,
    fl.name || ' - Khu Xe máy',
    600,
    'Hoạt động'
  FROM floor fl
  JOIN vehicle_type vt ON vt.name = 'Xe máy'
  WHERE fl.floor_number IN (1);

  -- Ô tô: floors 2,3 (vì bạn seed chỉ 3 tầng)
  INSERT INTO area (floor_id, vehicle_type_id, name, capacity, status)
  SELECT
    fl.floor_id,
    vt.vehicle_type_id,
    fl.name || ' - Khu Ô tô',
    300,
    'Hoạt động'
  FROM floor fl
  JOIN vehicle_type vt ON vt.name = 'Ô tô'
  WHERE fl.floor_number IN (2);

  -- ============================================================
  -- 7) SLOT (generate 25 slots per area)
  -- ============================================================
  -- DO $$
  -- DECLARE
  --   r RECORD;
  --   i int;
  --   prefix text;
  --   area_id uuid;
  -- BEGIN
  --   FOR r IN SELECT area_id, name FROM area LOOP
  --     area_id := r.area_id;

  --     prefix :=
  --       CASE
  --         WHEN r.name LIKE '%Xe máy%' THEN 'MB'
  --         WHEN r.name LIKE '%Ô tô%' THEN 'CAR'
  --         ELSE 'S'
  --       END;

  --     i := 1;
  --     WHILE i <= 25 LOOP
  --       INSERT INTO slot (area_id, slot_code, status, distance_to_gate, priority_score)
  --       VALUES (
  --         area_id,
  --         prefix || '-' || lpad(i::text, 3, '0'),
  --         CASE WHEN (i % 17) = 0 THEN 'MAINTENANCE' ELSE 'Sẵn sàng' END,
  --         10 + (i * 3),
  --         (100.0 - (i * 1.5))::numeric(10,2)
  --       );

  --       i := i + 1;
  --     END LOOP;
  --   END LOOP;
  -- END $$;

  -- DO $$
  -- DECLARE
  --     r RECORD;
  --     i INT;
  --     prefix TEXT;
  -- BEGIN
  --     FOR r IN
  --         SELECT a.area_id, a.name
  --         FROM area a
  --     LOOP

  --         prefix :=
  --             CASE
  --                 WHEN r.name LIKE '%Xe máy%' THEN 'MB'
  --                 WHEN r.name LIKE '%Ô tô%' THEN 'CAR'
  --             END;

  --         i := 1;

  --         WHILE i <= 25 LOOP

  --             INSERT INTO slot (
  --                 area_id,
  --                 slot_code,
  --                 status,
  --                 distance_to_gate,
  --                 priority_score
  --             )
  --             VALUES (
  --                 r.area_id,
  --                 prefix || '-' || LPAD(i::TEXT, 3, '0'),
  --                 CASE
  --                     WHEN (i % 17) = 0 THEN 'Bảo trì'
  --                     ELSE 'Sẵn sàng'
  --                 END,
  --                 10 + (i * 3),
  --                 (100 - i * 1.5)::NUMERIC(10,2)
  --             );

  --             i := i + 1;

  --         END LOOP;

  --     END LOOP;
  -- END $$;

  DO $$
DECLARE
  r RECORD;
  i INT;
  prefix TEXT;
BEGIN
  -- Lấy capacity trực tiếp từ area
  FOR r IN
    SELECT a.area_id, a.name, a.capacity
    FROM area a
  LOOP
    prefix :=
      CASE
        WHEN r.name LIKE '%Xe máy%' THEN 'MB'
        WHEN r.name LIKE '%Ô tô%' THEN 'CAR'
      END;

    i := 1;

    WHILE i <= r.capacity LOOP
      INSERT INTO slot (
        area_id,
        slot_code,
        status
      )
      VALUES (
        r.area_id,
        prefix || '-' || LPAD(i::TEXT, 3, '0'),
        'Sẵn sàng'
      );

      i := i + 1;
    END LOOP;
  END LOOP;
END $$;

  -- ============================================================
  -- 8) PARKING -> GATE
  -- Mỗi parking tạo 3 cổng (I / OUT / BOTH)
  -- ============================================================

  INSERT INTO gate (parking_id, name, gate_type, status)
  SELECT
    p.parking_id,
    g.name,
    g.gate_type,
    'Hoạt động'
  FROM (
    VALUES
      ('Làn xe vào', 'Vào'),
      ('Làn xe ra', 'Ra')
  ) AS g(name, gate_type)
  JOIN parking p
    ON p.name LIKE 'Vinhomes GrandPark Main Parking - %'
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 9a) PARKING -> PRICE_TABLE
  -- ============================================================

  INSERT INTO price_table (parking_id, name, description, status)
  SELECT
    p.parking_id,
    'Vinhomes GrandPark Price Table',
    'Bảng giá tiêu chuẩn Vinhomes GrandPark',
    'Hoạt động'
  FROM parking p
  WHERE p.name LIKE 'Vinhomes GrandPark Main Parking - %'
  ON CONFLICT DO NOTHING;


  -- ============================================================
  -- 9b) PRICE_TABLE -> PRICE_ITEM (Chỉ Xe máy & Ô tô)
  -- ============================================================

  WITH pt AS (
      SELECT price_table_id
      FROM price_table
      WHERE name = 'Vinhomes GrandPark Price Table'
  ),
  vt AS (
      SELECT vehicle_type_id, name
      FROM vehicle_type
      WHERE name IN ('Xe máy', 'Ô tô')
  )
  INSERT INTO price_item (
      price_table_id,
      vehicle_type_id,
      min_hour,
      max_hour,
      price
  )
  SELECT
      pt.price_table_id,
      vt.vehicle_type_id,
      x.min_hour,
      x.max_hour,
      x.price
  FROM pt
  CROSS JOIN vt
  JOIN (
      VALUES
          ('Xe máy', 0, 2, 5000::numeric),
          ('Xe máy', 3, 8, 10000::numeric),
          ('Xe máy', 9, NULL, 20000::numeric),

          ('Ô tô', 0, 2, 30000::numeric),
          ('Ô tô', 3, 8, 60000::numeric),
          ('Ô tô', 9, NULL, 120000::numeric)
  ) AS x(vt_name, min_hour, max_hour, price)
  ON vt.name = x.vt_name;
  -- ============================================================
  -- 10) PACKAGE (Chỉ Xe máy & Ô tô)
  -- ============================================================

  -- 
  WITH pt AS (
    SELECT
        price_table_id
    FROM price_table
),
vt AS (
    SELECT
        vehicle_type_id,
        name
    FROM vehicle_type
)

INSERT INTO package (
    price_table_id,
    vehicle_type_id,
    name,
    duration_month,
    price,
    status
)
SELECT
    pt.price_table_id,
    vt.vehicle_type_id,
    p.name,
    p.duration_month,
    p.price,
    'Hoạt động'
FROM pt
CROSS JOIN vt
JOIN (
    VALUES
        -- ===========================
        -- Xe máy
        -- ===========================
        ('Xe máy', 'Gói xe máy 1 tháng', 1, 300000::numeric),
        ('Xe máy', 'Gói xe máy 3 tháng', 3, 850000::numeric),
        ('Xe máy', 'Gói xe máy 6 tháng', 6, 1700000::numeric),
        ('Xe máy', 'Gói xe máy 12 tháng',12, 3300000::numeric),

        -- ===========================
        -- Ô tô
        -- ===========================
        ('Ô tô', 'Gói ô tô 1 tháng', 1, 2500000::numeric),
        ('Ô tô', 'Gói ô tô 3 tháng', 3, 7000000::numeric),
        ('Ô tô', 'Gói ô tô 6 tháng', 6,14000000::numeric),
        ('Ô tô', 'Gói ô tô 12 tháng',12,26000000::numeric)

) AS p(
    vehicle_type_name,
    name,
    duration_month,
    price
)
ON vt.name = p.vehicle_type_name

ORDER BY
    pt.price_table_id,
    vt.name,
    p.duration_month;

  -- ============================================================
  -- 11) CUSTOMER + VEHICLE
  -- ============================================================
  -- Your earlier data had 120 customers/vehicles, but inserting all 120 here is long.
  -- I’ll seed a smaller, representative set (10). Tell me if you want all 120 and I’ll generate it.

  INSERT INTO customer (full_name, phone, email, status)
  VALUES
  ('Vo Minh Linh 001', '0999416372', 'customer001@gmail.com', 'Hoạt động'),
  ('Mai Duc Binh 002', '0976411477', 'customer002@gmail.com', 'Hoạt động'),
  ('Pham Quoc Trang 003', '0962197062', 'customer003@gmail.com', 'Hoạt động'),
  ('Do Thi Vy 004', '0964638782', 'customer004@gmail.com', 'Hoạt động'),
  ('Do Gia Khanh 005', '0965209286', 'customer005@gmail.com', 'Hoạt động'),
  ('Bui Thi Binh 006', '0957185046', 'customer006@gmail.com', 'Hoạt động'),
  ('Dang Gia Vy 007', '0946272804', 'customer007@gmail.com', 'Hoạt động'),
  ('Ly Quoc Tuan 008', '0995047721', 'customer008@gmail.com', 'Hoạt động'),
  ('Bui Duc Phuc 009', '0965904978', 'customer009@gmail.com', 'Hoạt động'),
  ('Bui Quoc Khanh 010', '0966664675', 'customer010@gmail.com', 'Hoạt động');

  -- create vehicles (mapping by vehicle type name)
  INSERT INTO vehicle (customer_id, vehicle_type_id, plate_number, brand, color, status)
  SELECT
    c.customer_id,
    vt.vehicle_type_id,
    v.plate_number,
    v.brand,
    v.color,
    'Hoạt động'
  FROM (
    VALUES
      ('Vo Minh Linh 001', 'Xe máy', '59X2-00001', 'Yamaha', 'Red'),
      ('Mai Duc Binh 002', 'Xe máy', '59X3-00002', 'Piaggio', 'Black'),
      ('Pham Quoc Trang 003', 'Xe máy', '59X4-00003', 'Honda', 'Blue'),
      ('Do Thi Vy 004', 'Xe máy', '59X5-00004', 'Suzuki', 'Silver'),
      ('Do Gia Khanh 005', 'Ô tô',   '51A-00005', 'Kia', 'Yellow'),
      ('Bui Thi Binh 006', 'Xe máy', '59X7-00006', 'Piaggio', 'Green'),
      ('Dang Gia Vy 007', 'Xe máy', '59X8-00007', 'Dat Bike', 'Red'),
      ('Ly Quoc Tuan 008', 'Xe máy', '59X9-00008', 'Yamaha', 'Yellow'),
      ('Bui Duc Phuc 009', 'Xe máy', '59X1-00009', 'Piaggio', 'White'),
      ('Bui Quoc Khanh 010', 'Ô tô', '51A-00010', 'VinFast', 'Silver')
  ) AS v(customer_name, vehicle_type_name, plate_number, brand, color)
  JOIN customer c ON c.full_name = v.customer_name
  JOIN vehicle_type vt ON vt.name = v.vehicle_type_name;

  -- ============================================================
  -- 12) CARD (Optional but your schema requires type)
  -- ============================================================
  -- Your card table requires: code, status, type, expired_date, deleted_by...
  -- We'll set minimal required fields.
  -- INSERT INTO card (code, status, type, expired_date)
  -- SELECT
  --   'CARD' || lpad(g.i::text, 4, '0'),
  --   'Hoạt động',
  --   'RFID',
  --   (CURRENT_DATE + ((g.i % 90) || ' days')::interval)::date
  -- FROM generate_series(1, 200) g(i);

  -- INSERT INTO card (
  --     code,
  --     type,
  --     expired_date,
  --     status,
  --     created_at
  -- )
  -- SELECT
  --     'CARD' || LPAD(gs::TEXT, 4, '0'),
  --     'Thẻ lượt',
  --     NULL,
  --     CASE
  --         WHEN random() < 0.1 THEN 'Đã khóa'
  --         ELSE 'Đang chờ'
  --     END,
  --     NOW() - ((random() * 180)::INT * INTERVAL '1 day')
  -- FROM generate_series(1, 50) AS gs;

  -- -- 50 thẻ tháng
  -- INSERT INTO card (
  --     code,
  --     type,
  --     expired_date,
  --     status,
  --     created_at
  -- )
  -- SELECT
  --     'MONTH' || LPAD(gs::TEXT, 4, '0'),
  --     'Thẻ tháng',
  --     CURRENT_DATE + ((gs % 12) + 1) * INTERVAL '30 day',
  --     case
  --     when random() < 0.1 then 'Đã khóa'
  --     else 'Đang chờ'
  --   end,
  --     NOW() - ((random() * 180)::INT * INTERVAL '1 day')
  -- FROM generate_series(1, 50) gs;

-- 50 thẻ lượt
INSERT INTO card (
    code,
    type,
    expired_date,
    status,
    created_at
)
SELECT
    'CARD' || LPAD(gs::TEXT, 4, '0'),
    'Thẻ lượt',
    NULL,
    'Đang chờ',
    NOW() - ((random() * 180)::INT * INTERVAL '1 day')
FROM generate_series(1, 50) AS gs;

-- 50 thẻ tháng
INSERT INTO card (
    code,
    type,
    expired_date,
    status,
    created_at
)
SELECT
    'MONTH' || LPAD(gs::TEXT, 4, '0'),
    'Thẻ tháng',
    CURRENT_DATE + ((gs % 12) + 1) * INTERVAL '30 day',
    'Đang chờ',
    NOW() - ((random() * 180)::INT * INTERVAL '1 day')
FROM generate_series(1, 100) gs;

  -- ============================================================
  -- 13) card_registrations (link cards to vehicles)
  -- ============================================================
  INSERT INTO card_registrations (card_id, vehicle_id, status)
  SELECT
    c.card_id,
    v.vehicle_id,
    'Hoạt động'
  FROM (
    SELECT card_id, row_number() over (order by code) rn
    FROM card
    LIMIT 10
  ) c
  JOIN (
    SELECT vehicle_id, row_number() over (order by plate_number) rn
    FROM vehicle
    LIMIT 10
  ) v ON v.rn = c.rn;



  -- ============================================================
  -- DONE: If you want parking_order/payment/etc., we need profiles auth.user ids
  -- because staff_in_id/staff_out_id reference profiles(id) (and profiles(id) references auth.users).
  -- ============================================================