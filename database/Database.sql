-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.role (
  role_name character varying NOT NULL UNIQUE,
  description text,
  role_id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT role_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.customer (
  full_name character varying,
  phone character varying,
  email character varying,
  customer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT customer_pkey PRIMARY KEY (customer_id)
);
<<<<<<< HEAD

-- ==========================================
-- VEHICLE TYPE
-- ==========================================

CREATE TABLE vehicle_type (
    vehicle_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,

    description TEXT,

    status VARCHAR(50) DEFAULT 'ACTIVE'
=======
CREATE TABLE public.vehicle_type (
  name character varying NOT NULL,
  vehicle_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT vehicle_type_pkey PRIMARY KEY (vehicle_type_id)
>>>>>>> deploy-backup
);
CREATE TABLE public.vehicle (
  customer_id uuid,
  vehicle_type_id uuid NOT NULL,
  plate_number character varying NOT NULL UNIQUE,
  brand character varying,
  color character varying,
  vehicle_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT vehicle_pkey PRIMARY KEY (vehicle_id),
  CONSTRAINT vehicle_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT vehicle_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
<<<<<<< HEAD

-- ==========================================
-- BUILDING
-- ==========================================

CREATE TABLE building (
    building_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,

    address TEXT,

    status VARCHAR(50) DEFAULT 'ACTIVE'
=======
CREATE TABLE public.building (
  name character varying NOT NULL,
  address text,
  building_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT building_pkey PRIMARY KEY (building_id)
>>>>>>> deploy-backup
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role_id uuid,
  username character varying NOT NULL UNIQUE,
  full_name character varying NOT NULL,
  email character varying UNIQUE,
  phone character varying,
  building_id uuid,
  status character varying NOT NULL DEFAULT 'Hoạt động'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id),
  CONSTRAINT profiles_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(building_id)
);
CREATE TABLE public.parking (
  building_id uuid NOT NULL,
  name character varying NOT NULL,
  open_time time without time zone,
  close_time time without time zone,
  parking_id uuid NOT NULL DEFAULT gen_random_uuid(),
  total_capacity integer DEFAULT 0,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT parking_pkey PRIMARY KEY (parking_id),
  CONSTRAINT parking_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(building_id)
);
CREATE TABLE public.floor (
  parking_id uuid NOT NULL,
  floor_number integer NOT NULL,
  name character varying,
  floor_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT floor_pkey PRIMARY KEY (floor_id),
  CONSTRAINT floor_parking_id_fkey FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id)
);
CREATE TABLE public.area (
  floor_id uuid NOT NULL,
  vehicle_type_id uuid NOT NULL,
  name character varying NOT NULL,
  area_id uuid NOT NULL DEFAULT gen_random_uuid(),
  capacity integer DEFAULT 0,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT area_pkey PRIMARY KEY (area_id),
  CONSTRAINT area_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floor(floor_id),
  CONSTRAINT area_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
<<<<<<< HEAD

-- ==========================================
-- SLOT
-- ==========================================

CREATE TABLE slot (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    area_id UUID NOT NULL REFERENCES area(area_id),

    slot_code VARCHAR(100) NOT NULL,

    status VARCHAR(50) DEFAULT 'AVAILABLE',

    distance_to_gate INT,

    priority_score NUMERIC(10,2) DEFAULT 0,

    UNIQUE(area_id, slot_code)
);

-- ==========================================
-- GATE
-- ==========================================

CREATE TABLE gate (
    gate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_id UUID NOT NULL REFERENCES parking(parking_id),

    name VARCHAR(255) NOT NULL,

    gate_type VARCHAR(50) NOT NULL,

    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- ==========================================
-- CARD
-- ==========================================
CREATE TABLE card (
    card_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(100) UNIQUE NOT NULL,

    type VARCHAR(50) NOT NULL,

    expired_date DATE,

    status VARCHAR(50) DEFAULT 'Đang chờ',

    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE card_registrations (

    registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    vehicle_id UUID NOT NULL,

    status VARCHAR(20) DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_card_registrations_card
        FOREIGN KEY (card_id)
        REFERENCES card(card_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_card_registrations_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicle(vehicle_id)
        ON DELETE CASCADE

);


-- ==========================================
-- PRICE TABLE
-- ==========================================

CREATE TABLE price_table (
    price_table_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_id UUID NOT NULL REFERENCES parking(parking_id),

    name VARCHAR(255) NOT NULL,

    description TEXT,

    status VARCHAR(50) DEFAULT 'ACTIVE'
=======
CREATE TABLE public.slot (
  area_id uuid NOT NULL,
  slot_code character varying NOT NULL,
  distance_to_gate integer,
  slot_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Sẵn sàng'::character varying,
  priority_score numeric DEFAULT 0,
  CONSTRAINT slot_pkey PRIMARY KEY (slot_id),
  CONSTRAINT slot_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.area(area_id)
);
CREATE TABLE public.gate (
  parking_id uuid NOT NULL,
  name character varying NOT NULL,
  gate_type character varying NOT NULL,
  gate_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT gate_pkey PRIMARY KEY (gate_id),
  CONSTRAINT gate_parking_id_fkey FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id)
);
CREATE TABLE public.price_table (
  parking_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  price_table_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT price_table_pkey PRIMARY KEY (price_table_id),
  CONSTRAINT price_table_parking_id_fkey FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id)
);
CREATE TABLE public.price_item (
  price_table_id uuid NOT NULL,
  vehicle_type_id uuid NOT NULL,
  min_hour integer NOT NULL,
  max_hour integer,
  price numeric NOT NULL,
  price_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT price_item_pkey PRIMARY KEY (price_item_id),
  CONSTRAINT price_item_price_table_id_fkey FOREIGN KEY (price_table_id) REFERENCES public.price_table(price_table_id),
  CONSTRAINT price_item_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.package (
  vehicle_type_id uuid NOT NULL,
  name character varying NOT NULL,
  duration_month integer NOT NULL,
  price numeric NOT NULL,
  package_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT package_pkey PRIMARY KEY (package_id),
  CONSTRAINT package_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
>>>>>>> deploy-backup
);
CREATE TABLE public.vehicle_package (
  previous_vehicle_package_id uuid,
  renewal_type character varying NOT NULL DEFAULT 'Đăng ký mới'::character varying CHECK (renewal_type::text = ANY (ARRAY['Đăng ký mới'::character varying, 'Gia hạn nối tiếp'::character varying]::text[])),
  vehicle_id uuid NOT NULL,
  package_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  vehicle_package_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT vehicle_package_pkey PRIMARY KEY (vehicle_package_id),
  CONSTRAINT vehicle_package_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT vehicle_package_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.package(package_id),
  CONSTRAINT vehicle_package_previous_vehicle_package_id_fkey FOREIGN KEY (previous_vehicle_package_id) REFERENCES public.vehicle_package(vehicle_package_id)
);
<<<<<<< HEAD

-- ==========================================
-- PACKAGE
-- ==========================================

CREATE TABLE package (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_type_id UUID NOT NULL REFERENCES vehicle_type(vehicle_type_id),

    name VARCHAR(255) NOT NULL,

    duration_month INT NOT NULL,

    price NUMERIC(18,2) NOT NULL,

    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- ==========================================
-- VEHICLE PACKAGE
-- ==========================================

CREATE TABLE vehicle_package (
    vehicle_package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_id UUID NOT NULL REFERENCES vehicle(vehicle_id),

    package_id UUID NOT NULL REFERENCES package(package_id),

    start_date DATE NOT NULL,

    end_date DATE NOT NULL,

    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- ==========================================
-- PARKING ORDER
-- ==========================================

CREATE TABLE parking_order (
    parking_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_id UUID NOT NULL REFERENCES vehicle(vehicle_id),

    card_id UUID REFERENCES card(card_id),

    slot_id UUID REFERENCES slot(slot_id),

    gate_in_id UUID NOT NULL REFERENCES gate(gate_id),

    gate_out_id UUID REFERENCES gate(gate_id),

    staff_in_id UUID REFERENCES profiles(id),

    staff_out_id UUID REFERENCES profiles(id),

    time_in TIMESTAMP DEFAULT NOW(),

    time_out TIMESTAMP,

    estimated_fee NUMERIC(18,2) DEFAULT 0,

    final_fee NUMERIC(18,2) DEFAULT 0,

    status VARCHAR(50) DEFAULT 'PARKING'
);

CREATE TABLE parking_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 

    -- RFID được sử dụng
    card_id UUID REFERENCES card(card_id),

    -- Xe vào bãi
    vehicle_id UUID NOT NULL REFERENCES vehicle(vehicle_id),

    -- Snapshot biển số tại thời điểm vào bãi
    plate_number VARCHAR(20) NOT NULL,

    -- Thời gian
    entry_time TIMESTAMP NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMP,

    -- Ảnh khi vào
    entry_vehicle_image TEXT,
    entry_plate_image TEXT,

    -- Ảnh khi ra
    exit_vehicle_image TEXT,
    exit_plate_image TEXT,

    -- Cổng vào / cổng ra
    entry_gate_id UUID,
    exit_gate_id UUID,

    -- -- Nhân viên xử lý
    -- created_by UUID,
    -- closed_by UUID,

    -- Phí gửi xe
    -- total_fee NUMERIC(12,2) DEFAULT 0,

    -- -- Thanh toán
    -- payment_status VARCHAR(20)
    --     DEFAULT 'UNPAID'
    --     CHECK (payment_status IN ('UNPAID', 'PAID', 'FREE')),

    -- Trạng thái phiên gửi xe
    status VARCHAR(20)
        DEFAULT 'Đang gửi xe'
        CHECK (status IN ('Đang gửi xe', 'Hoàn thành', 'Mất thẻ', 'Đã hủy'))

    -- created_at TIMESTAMPTZ DEFAULT NOW(),
    -- updated_at TIMESTAMPTZ DEFAULT NOW()
=======
CREATE TABLE public.parking_sessions (
  slot_id uuid,
  staff_in_id uuid,
  staff_out_id uuid,
  estimated_fee numeric DEFAULT 0,
  final_fee numeric DEFAULT 0,
  card_id uuid,
  vehicle_id uuid NOT NULL,
  plate_number character varying NOT NULL,
  exit_time timestamp with time zone,
  entry_vehicle_image text,
  entry_plate_image text,
  exit_vehicle_image text,
  exit_plate_image text,
  entry_gate_id uuid,
  exit_gate_id uuid,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  entry_time timestamp with time zone NOT NULL DEFAULT now(),
  status character varying DEFAULT 'Đang gửi xe'::character varying CHECK (status::text = ANY (ARRAY['Đang gửi xe'::text, 'Chờ thanh toán'::text, 'Hoàn thành'::text, 'Mất thẻ'::text, 'Đã hủy'::text])),
  CONSTRAINT parking_sessions_pkey PRIMARY KEY (session_id),
  CONSTRAINT parking_sessions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT parking_sessions_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slot(slot_id),
  CONSTRAINT parking_sessions_staff_in_id_fkey FOREIGN KEY (staff_in_id) REFERENCES public.profiles(id),
  CONSTRAINT parking_sessions_staff_out_id_fkey FOREIGN KEY (staff_out_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.payment (
  vehicle_package_id uuid,
  session_id uuid,
  payment_type character varying NOT NULL CHECK (payment_type::text = ANY (ARRAY['Vé lượt'::character varying, 'Đăng ký vé tháng'::character varying, 'Gia hạn vé tháng'::character varying, 'Phí cấp lại thẻ'::character varying]::text[])),
  note text,
  created_by uuid,
  provider character varying DEFAULT 'VNPay'::character varying,
  order_code character varying UNIQUE,
  transaction_no character varying,
  bank_code character varying,
  paid_at timestamp with time zone,
  raw_response jsonb,
  amount numeric NOT NULL,
  payment_method character varying CHECK (payment_method::text = ANY (ARRAY['Tiền mặt'::text, 'VNPay'::text])),
  payment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_time timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'Đã thanh toán'::character varying CHECK (status::text = ANY (ARRAY['Chờ thanh toán'::character varying, 'Đã thanh toán'::character varying, 'Thất bại'::character varying, 'Hết hạn'::character varying]::text[])),
  CONSTRAINT payment_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payment_vehicle_package_id_fkey FOREIGN KEY (vehicle_package_id) REFERENCES public.vehicle_package(vehicle_package_id),
  CONSTRAINT payment_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id),
  CONSTRAINT payment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.incident_report (
  session_id uuid NOT NULL,
  incident_type character varying NOT NULL,
  description text,
  handled_by uuid,
  resolved_at timestamp with time zone,
  incident_id uuid NOT NULL DEFAULT gen_random_uuid(),
  penalty_fee numeric DEFAULT 0,
  status character varying DEFAULT 'Đang xử lý'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_report_pkey PRIMARY KEY (incident_id),
  CONSTRAINT incident_report_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.profiles(id),
  CONSTRAINT incident_report_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id)
);
CREATE TABLE public.slot_allocation_log (
  session_id uuid NOT NULL,
  suggested_slot_id uuid NOT NULL,
  actual_slot_id uuid,
  vehicle_type_id uuid NOT NULL,
  algorithm_name character varying,
  reason text,
  allocation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  distance_score numeric DEFAULT 0,
  occupancy_score numeric DEFAULT 0,
  priority_score numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT slot_allocation_log_pkey PRIMARY KEY (allocation_id),
  CONSTRAINT slot_allocation_log_suggested_slot_id_fkey FOREIGN KEY (suggested_slot_id) REFERENCES public.slot(slot_id),
  CONSTRAINT slot_allocation_log_actual_slot_id_fkey FOREIGN KEY (actual_slot_id) REFERENCES public.slot(slot_id),
  CONSTRAINT slot_allocation_log_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id),
  CONSTRAINT slot_allocation_log_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id)
>>>>>>> deploy-backup
);
CREATE TABLE public.feedback (
  session_id uuid,
  customer_id uuid,
  content text,
  rating integer,
  feedback_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Mới'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id),
  CONSTRAINT feedback_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT feedback_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id)
);
<<<<<<< HEAD

-- ==========================================
-- RESERVATION
-- ==========================================

CREATE TABLE reservation (
    reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_id UUID NOT NULL REFERENCES vehicle(vehicle_id),

    slot_id UUID NOT NULL REFERENCES slot(slot_id),

    start_time TIMESTAMP NOT NULL,

    end_time TIMESTAMP NOT NULL,

    status VARCHAR(50) DEFAULT 'RESERVED',

    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- INCIDENT REPORT
-- ==========================================

CREATE TABLE incident_report (
    incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_order_id UUID NOT NULL REFERENCES parking_order(parking_order_id),

    incident_type VARCHAR(100) NOT NULL,

    description TEXT,

    penalty_fee NUMERIC(18,2) DEFAULT 0,

    handled_by UUID REFERENCES profiles(id),

    status VARCHAR(50) DEFAULT 'OPEN',

    created_at TIMESTAMP DEFAULT NOW(),

    resolved_at TIMESTAMP
=======
CREATE TABLE public.customer_kyc (
  customer_id uuid NOT NULL UNIQUE,
  cccd_number character varying UNIQUE,
  face_match_score numeric,
  front_cccd_url text,
  back_cccd_url text,
  selfie_url text,
  verified_at timestamp with time zone,
  kyc_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ekyc_status character varying NOT NULL DEFAULT 'Chờ xử lý'::character varying CHECK (ekyc_status::text = ANY (ARRAY['Chờ xử lý'::character varying, 'Đã xác thực'::character varying, 'Từ chối'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_kyc_pkey PRIMARY KEY (kyc_id),
  CONSTRAINT customer_kyc_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id)
>>>>>>> deploy-backup
);
CREATE TABLE public.card (
  active_vehicle_package_id uuid,
  code character varying NOT NULL UNIQUE,
  type character varying NOT NULL,
  expired_date date,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  card_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'Đang chờ'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT card_pkey PRIMARY KEY (card_id),
  CONSTRAINT card_active_vehicle_package_id_fkey FOREIGN KEY (active_vehicle_package_id) REFERENCES public.vehicle_package(vehicle_package_id)
);
CREATE TABLE public.card_lost_log (
  card_id uuid NOT NULL,
  vehicle_id uuid,
  handled_by uuid,
  description text,
  lost_report_id uuid NOT NULL DEFAULT gen_random_uuid(),
  reported_at timestamp without time zone DEFAULT now(),
  status character varying DEFAULT 'Đang chờ'::character varying,
  CONSTRAINT card_lost_log_pkey PRIMARY KEY (lost_report_id),
  CONSTRAINT card_lost_log_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(card_id),
  CONSTRAINT card_lost_log_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.profiles(id),
  CONSTRAINT card_lost_log_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id)
);
CREATE TABLE public.card_registrations (
  registration_id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  status character varying DEFAULT 'Hoạt động'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT card_registrations_pkey PRIMARY KEY (registration_id),
  CONSTRAINT fk_card_registrations_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT fk_card_registrations_card FOREIGN KEY (card_id) REFERENCES public.card(card_id)
);
CREATE TABLE public.entry_exit_log (
  session_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  card_id uuid,
  building_id uuid NOT NULL,
  parking_id uuid NOT NULL,
  gate_id uuid NOT NULL,
  staff_id uuid,
  direction character varying NOT NULL CHECK (direction::text = ANY (ARRAY['Xe vào'::character varying, 'Xe ra'::character varying]::text[])),
  vehicle_type_id uuid,
  plate_number character varying NOT NULL,
  ticket_type character varying NOT NULL CHECK (ticket_type::text = ANY (ARRAY['Thẻ lượt'::character varying, 'Thẻ tháng'::character varying, 'Mất thẻ'::character varying]::text[])),
  applied_price numeric,
  note text,
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_time timestamp without time zone NOT NULL DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT entry_exit_log_pkey PRIMARY KEY (log_id),
  CONSTRAINT fk_log_session FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id),
  CONSTRAINT fk_log_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT fk_log_card FOREIGN KEY (card_id) REFERENCES public.card(card_id),
  CONSTRAINT fk_log_building FOREIGN KEY (building_id) REFERENCES public.building(building_id),
  CONSTRAINT fk_log_parking FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id),
  CONSTRAINT fk_log_gate FOREIGN KEY (gate_id) REFERENCES public.gate(gate_id),
  CONSTRAINT fk_log_staff FOREIGN KEY (staff_id) REFERENCES public.profiles(id),
  CONSTRAINT fk_log_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.card_activity_logs (
  card_id uuid NOT NULL,
  registration_id uuid,
  action character varying NOT NULL,
  plate_number character varying,
  customer_name character varying,
  duration_months integer,
  amount numeric,
  expired_date_before date,
  expired_date_after date,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid,
  note text,
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT card_activity_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT card_activity_logs_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(card_id),
  CONSTRAINT card_activity_logs_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.card_registrations(registration_id),
  CONSTRAINT card_activity_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.login_logs (
  profiles_id uuid,
  username character varying NOT NULL,
  ip_address character varying,
  device_browser text,
  location character varying,
  status character varying NOT NULL,
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  login_time timestamp with time zone DEFAULT now(),
  CONSTRAINT login_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT login_logs_profiles_id_fkey FOREIGN KEY (profiles_id) REFERENCES public.profiles(id)
);
<<<<<<< HEAD

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_vehicle_customer ON vehicle(customer_id);
CREATE INDEX idx_vehicle_type ON vehicle(vehicle_type_id);

CREATE INDEX idx_parking_building ON parking(building_id);

CREATE INDEX idx_floor_parking ON floor(parking_id);

CREATE INDEX idx_area_floor ON area(floor_id);

CREATE INDEX idx_slot_area ON slot(area_id);
CREATE INDEX idx_slot_status ON slot(status);

CREATE INDEX idx_gate_parking ON gate(parking_id);

CREATE INDEX idx_order_vehicle ON parking_order(vehicle_id);
CREATE INDEX idx_order_slot ON parking_order(slot_id);
CREATE INDEX idx_order_status ON parking_order(status);
CREATE INDEX idx_order_timein ON parking_order(time_in);

CREATE INDEX idx_payment_order ON payment(parking_order_id);

CREATE INDEX idx_incident_order ON incident_report(parking_order_id);

CREATE INDEX idx_allocation_order ON slot_allocation_log(parking_order_id);

-- ==========================================
-- SEED ROLE
-- ==========================================

INSERT INTO role(role_name, description)
VALUES
('ADMIN', 'Administrator'),
('MANAGER', 'Parking Manager'),
('STAFF', 'Parking Staff');
=======
CREATE TABLE public.contract (
  registration_id uuid NOT NULL,
  contract_no text NOT NULL UNIQUE,
  sign_token text NOT NULL UNIQUE,
  token_expires_at timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  signed_at timestamp with time zone,
  signed_ip text,
  contract_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'Chờ ký'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contract_pkey PRIMARY KEY (contract_id),
  CONSTRAINT contract_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.card_registrations(registration_id)
);
>>>>>>> deploy-backup
