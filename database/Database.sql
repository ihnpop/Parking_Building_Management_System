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
-- PROFILES (Supabase Auth)
-- ==========================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    role_id UUID REFERENCES role(role_id),

    username VARCHAR(100) UNIQUE,

    full_name VARCHAR(255),

    email VARCHAR(255),

    phone VARCHAR(50),

    status VARCHAR(50) DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- CUSTOMER
-- ==========================================

CREATE TABLE customer (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    profile_id UUID REFERENCES profiles(id),

    full_name VARCHAR(255),

    phone VARCHAR(50),

    email VARCHAR(255),

    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- ==========================================
-- VEHICLE TYPE
-- ==========================================

CREATE TABLE vehicle_type (
    vehicle_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,

    description TEXT,

    status VARCHAR(50) DEFAULT 'ACTIVE'
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

    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- ==========================================
-- BUILDING
-- ==========================================

CREATE TABLE building (
    building_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,

    address TEXT,

    status VARCHAR(50) DEFAULT 'ACTIVE'
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

    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- ==========================================
-- FLOOR
-- ==========================================

CREATE TABLE floor (
    floor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_id UUID NOT NULL REFERENCES parking(parking_id),

    floor_number INT NOT NULL,

    name VARCHAR(255),

    status VARCHAR(50) DEFAULT 'ACTIVE',

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

    status VARCHAR(50) DEFAULT 'ACTIVE'
);

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

    status VARCHAR(50) DEFAULT 'AVAILABLE',

    created_at TIMESTAMP DEFAULT NOW()
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
);

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

-- ==========================================
-- PAYMENT
-- ==========================================

CREATE TABLE payment (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parking_order_id UUID NOT NULL REFERENCES parking_order(parking_order_id),

    amount NUMERIC(18,2) NOT NULL,

    payment_method VARCHAR(50),

    payment_time TIMESTAMP DEFAULT NOW(),

    status VARCHAR(50) DEFAULT 'PAID'
);

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

    created_at TIMESTAMP DEFAULT NOW()
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

    status VARCHAR(50) DEFAULT 'NEW',

    created_at TIMESTAMP DEFAULT NOW()
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

CREATE INDEX idx_reservation_slot ON reservation(slot_id);

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