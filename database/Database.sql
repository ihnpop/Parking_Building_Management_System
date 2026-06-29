CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- ROLE
-- ==========================================

CREATE TABLE role (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- ==========================================
-- CUSTOMER
-- ==========================================

CREATE TABLE customer (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name VARCHAR(255),

    phone VARCHAR(50),

    email VARCHAR(255),

    status VARCHAR(50) DEFAULT 'Hoạt động'
);

-- ==========================================
-- VEHICLE TYPE
-- ==========================================

CREATE TABLE vehicle_type (
    vehicle_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,


    status VARCHAR(50) DEFAULT 'Hoạt động'
);

-- ==========================================
-- VEHICLE
-- ==========================================

CREATE TABLE vehicle (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_id UUID REFERENCES customer(customer_id),

    vehicle_type_id UUID NOT NULL REFERENCES vehicle_type(vehicle_type_id),

    plate_number VARCHAR(50) UNIQUE NOT NULL,

    brand VARCHAR(100),

    color VARCHAR(50),

    status VARCHAR(50) DEFAULT 'Hoạt động'
);

-- ==========================================
-- BUILDING
-- ==========================================

CREATE TABLE building (
    building_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,

    address TEXT,

    status VARCHAR(50) DEFAULT 'Hoạt động'
);


-- ==========================================
-- PROFILES (Supabase Auth)
-- ==========================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    role_id UUID
        REFERENCES role(role_id),

    username VARCHAR(100) UNIQUE NOT NULL,

    full_name VARCHAR(255) NOT NULL,

    email VARCHAR(255) UNIQUE,

    phone VARCHAR(50),

    status VARCHAR(50) NOT NULL DEFAULT 'Hoạt động',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    building_id UUID
        REFERENCES building(building_id)
);

-- ==========================================
-- PARKING
-- ==========================================

CREATE TABLE parking (
    parking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    building_id UUID NOT NULL REFERENCES building(building_id),

    name VARCHAR(255) NOT NULL,

    total_capacity INT DEFAULT 0,

    open_time TIME,

    close_time TIME,

    status VARCHAR(50) DEFAULT 'Hoạt động'
);

-- ==========================================
-- FLOOR
-- ==========================================

CREATE TABLE floor (
    floor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_id UUID NOT NULL REFERENCES parking(parking_id),

    floor_number INT NOT NULL,

    name VARCHAR(255),

    status VARCHAR(50) DEFAULT 'Hoạt động',

    UNIQUE(parking_id, floor_number)
);

-- ==========================================
-- AREA
-- ==========================================

CREATE TABLE area (
    area_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    floor_id UUID NOT NULL REFERENCES floor(floor_id),

    vehicle_type_id UUID NOT NULL REFERENCES vehicle_type(vehicle_type_id),

    name VARCHAR(255) NOT NULL,

    capacity INT DEFAULT 0,

    status VARCHAR(50) DEFAULT 'Hoạt động'
);

-- ==========================================
-- SLOT
-- ==========================================

CREATE TABLE slot (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    area_id UUID NOT NULL REFERENCES area(area_id),

    slot_code VARCHAR(100) NOT NULL,

    status VARCHAR(50) DEFAULT 'Sẵn sàng',

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

    status VARCHAR(50) DEFAULT 'Hoạt động'
);

-- ==========================================
-- CARD
-- ==========================================
CREATE TABLE card (
    card_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(100) UNIQUE NOT NULL,

    status VARCHAR(50) DEFAULT 'Đang chờ',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    type VARCHAR(50) NOT NULL,

    expired_date DATE,

    deleted_at TIMESTAMPTZ,

    deleted_by UUID
);


CREATE TABLE card_registrations (

    registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    card_id UUID NOT NULL,

    vehicle_id UUID NOT NULL,

    status VARCHAR(20) DEFAULT 'Hoạt động',

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

    status VARCHAR(50) DEFAULT 'Hoạt động'
);

create table public.card_lost_log (
  lost_report_id uuid not null default gen_random_uuid (),
  card_id uuid not null,
  vehicle_id uuid null,
  reported_at timestamp without time zone null default now(),
  status character varying null default 'Đang chờ'::character varying,
  handled_by uuid null,
  description text null,
  constraint card_lost_log_pkey primary key (lost_report_id),
  constraint card_lost_log_card_id_fkey foreign KEY (card_id) references card (card_id) on delete CASCADE,
  constraint card_lost_log_handled_by_fkey foreign KEY (handled_by) references profiles (id) on delete set null,
  constraint card_lost_log_vehicle_id_fkey foreign KEY (vehicle_id) references vehicle (vehicle_id) on delete set null
) TABLESPACE pg_default;

-- ==========================================
-- PRICE ITEM
-- ==========================================

CREATE TABLE price_item (
    price_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    price_table_id UUID NOT NULL REFERENCES price_table(price_table_id),

    vehicle_type_id UUID NOT NULL REFERENCES vehicle_type(vehicle_type_id),

    min_hour INT NOT NULL,

    max_hour INT,

    price NUMERIC(18,2) NOT NULL
);

-- ==========================================
-- PACKAGE
-- ==========================================

CREATE TABLE package (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_type_id UUID NOT NULL REFERENCES vehicle_type(vehicle_type_id),

    name VARCHAR(255) NOT NULL,

    duration_month INT NOT NULL,

    price NUMERIC(18,2) NOT NULL,

    status VARCHAR(50) DEFAULT 'Hoạt động'
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

    status VARCHAR(50) DEFAULT 'Hoạt động'
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

    time_in TIMESTAMPTZ DEFAULT NOW(),

    time_out TIMESTAMPTZ,

    estimated_fee NUMERIC(18,2) DEFAULT 0,

    final_fee NUMERIC(18,2) DEFAULT 0,

    status VARCHAR(50) DEFAULT 'Đang gửi xe'
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
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMPTZ,

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
        CHECK (status IN ('Đang gửi xe', 'Hoàn thành', 'Mất thẻ', 'Đã hủy')),\

    -- created_at TIMESTAMPTZ DEFAULT NOW(),
    -- updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PAYMENT
-- ==========================================

CREATE TABLE payment (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_order_id UUID NOT NULL REFERENCES parking_order(parking_order_id),

    amount NUMERIC(18,2) NOT NULL,

    payment_method VARCHAR(50),

    payment_time TIMESTAMPTZ DEFAULT NOW(),

    status VARCHAR(50) DEFAULT 'Đã trả'
);

-----------------------------------

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

    status VARCHAR(50) DEFAULT 'Đang xử lý',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    resolved_at TIMESTAMPTZ
);

-- ==========================================
-- SLOT ALLOCATION LOG
-- ==========================================

CREATE TABLE slot_allocation_log (
    allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_order_id UUID NOT NULL REFERENCES parking_order(parking_order_id),

    suggested_slot_id UUID NOT NULL REFERENCES slot(slot_id),

    actual_slot_id UUID REFERENCES slot(slot_id),

    vehicle_type_id UUID NOT NULL REFERENCES vehicle_type(vehicle_type_id),

    algorithm_name VARCHAR(255),

    reason TEXT,

    distance_score NUMERIC(10,2) DEFAULT 0,

    occupancy_score NUMERIC(10,2) DEFAULT 0,

    priority_score NUMERIC(10,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- FEEDBACK
-- ==========================================

CREATE TABLE feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_id UUID REFERENCES customer(customer_id),

    parking_order_id UUID REFERENCES parking_order(parking_order_id),

    content TEXT,

    rating INT,

    status VARCHAR(50) DEFAULT 'Mới',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_kyc (
    kyc_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    customer_id UUID NOT NULL UNIQUE
        REFERENCES customer(customer_id) ON DELETE CASCADE,

    cccd_number VARCHAR(20) UNIQUE,

    face_match_score NUMERIC(5,2),

    ekyc_status VARCHAR(20) NOT NULL
        DEFAULT 'Chờ xử lý'
        CHECK (ekyc_status IN ('Chờ xử lý', 'Đã xác thực', 'Từ chối')),

    front_cccd_url TEXT,

    back_cccd_url TEXT,

    selfie_url TEXT,

    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW()
);

CREATE TABLE public.entry_exit_log (
    log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id uuid NOT NULL,

    vehicle_id uuid NOT NULL,

    card_id uuid,

    building_id uuid NOT NULL,

    parking_id uuid NOT NULL,

    gate_id uuid NOT NULL,

    staff_id uuid,

    direction varchar(10) NOT NULL
        CHECK (direction IN ('Xe vào','Xe ra')),

    event_time timestamp NOT NULL DEFAULT now(),

    vehicle_type_id uuid,

    plate_number varchar NOT NULL,

    ticket_type varchar(20) NOT NULL
        CHECK (ticket_type IN ('Thẻ lượt','Thẻ tháng','Mất thẻ')),

    applied_price numeric(12,2),

    note text,

    created_at timestamp DEFAULT now(),

    CONSTRAINT fk_log_session
        FOREIGN KEY(session_id)
        REFERENCES parking_sessions(session_id),

    CONSTRAINT fk_log_vehicle
        FOREIGN KEY(vehicle_id)
        REFERENCES vehicle(vehicle_id),

    CONSTRAINT fk_log_card
        FOREIGN KEY(card_id)
        REFERENCES card(card_id),

    CONSTRAINT fk_log_building
        FOREIGN KEY(building_id)
        REFERENCES building(building_id),

    CONSTRAINT fk_log_parking
        FOREIGN KEY(parking_id)
        REFERENCES parking(parking_id),

    CONSTRAINT fk_log_gate
        FOREIGN KEY(gate_id)
        REFERENCES gate(gate_id),

    CONSTRAINT fk_log_staff
        FOREIGN KEY(staff_id)
        REFERENCES profiles(id),

    CONSTRAINT fk_log_vehicle_type
        FOREIGN KEY(vehicle_type_id)
        REFERENCES vehicle_type(vehicle_type_id)
);

CREATE TABLE public.card_activity_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Liên kết đối tượng liên quan
    card_id UUID NOT NULL REFERENCES public.card(card_id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.card_registrations(registration_id) ON DELETE SET NULL,
    
    -- Phân loại hành động
    action VARCHAR(50) NOT NULL, -- Ví dụ: 'Cấp mới', 'Gia hạn', 'Khóa thẻ', 'Mở khóa', 'Thay đổi thông tin'
    
    -- Chụp lại thông tin lúc thực hiện (Snapshot để tránh lịch sử bị thay đổi khi chủ xe đổi tên/biển số)
    plate_number VARCHAR(20),
    customer_name VARCHAR(255),
    
    -- Dữ liệu tài chính & hạn dùng (Phục vụ trực tiếp cho tính năng Gia hạn/Cấp mới)
    duration_months INT,          -- Số tháng đăng ký/gia hạn (nếu có)
    amount NUMERIC(12, 2),        -- Số tiền đóng (nếu có)
    expired_date_before DATE,     -- Hạn dùng trước khi thao tác
    expired_date_after DATE,      -- Hạn dùng sau khi thao tác
    
    -- Chi tiết thay đổi dạng JSONB (Lưu vết thuộc tính chi tiết)
    old_data JSONB,               -- Trạng thái dữ liệu cũ (ví dụ: { phone: "090..." })
    new_data JSONB,               -- Trạng thái dữ liệu mới (ví dụ: { phone: "091..." })
    
    -- Thông tin vận hành
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Staff thực hiện
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                     -- Thời gian thực hiện
    note TEXT                                                            -- Ghi chú/Lý do
);

CREATE TABLE public.login_logs (

    log_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    profiles_id UUID,

    username VARCHAR(255) NOT NULL,

    ip_address VARCHAR(50),

    device_browser TEXT,

    location VARCHAR(255),

    status VARCHAR(50) NOT NULL,

    login_time TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_login_logs_profiles
        FOREIGN KEY (profiles_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE
);

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

