-- Seed file for Parking Building Management System (PBMS)
-- Target: Supabase PostgreSQL (v15+)
-- Purpose: Bootstrapping baseline configurations, admin roles, and sample transactional logs for demo presentations.

-- 1. SEED VEHICLE TYPES CATALOG
INSERT INTO public.vehicle_types (code, display_name) VALUES
('MOTORBIKE', 'Motorbike / Scooter'),
('SEDAN', 'Sedan / Hatchback (4-5 Seats)'),
('SUV', 'SUV / Minivan (7 Seats)'),
('TRUCK', 'Light Cargo Truck')
ON CONFLICT (code) DO NOTHING;

-- 2. SEED ACTIVE PRICING POLICIES (TARIFF RULES)
-- Motorbike: $2.00 first hour, $1.00/hr extra, $10.00 cap, 10 min grace
INSERT INTO public.pricing_policies (vehicle_type_id, base_price, hourly_rate, day_cap, grace_period_minutes, is_active)
SELECT id, 2.00, 1.00, 10.00, 10, true FROM public.vehicle_types WHERE code = 'MOTORBIKE'
ON CONFLICT DO NOTHING;

-- Sedan: $5.00 first hour, $3.00/hr extra, $30.00 cap, 15 min grace
INSERT INTO public.pricing_policies (vehicle_type_id, base_price, hourly_rate, day_cap, grace_period_minutes, is_active)
SELECT id, 5.00, 3.00, 30.00, 15, true FROM public.vehicle_types WHERE code = 'SEDAN'
ON CONFLICT DO NOTHING;

-- SUV: $8.00 first hour, $5.00/hr extra, $50.00 cap, 15 min grace
INSERT INTO public.pricing_policies (vehicle_type_id, base_price, hourly_rate, day_cap, grace_period_minutes, is_active)
SELECT id, 8.00, 5.00, 50.00, 15, true FROM public.vehicle_types WHERE code = 'SUV'
ON CONFLICT DO NOTHING;

-- Truck: $15.00 first hour, $10.00/hr extra, $100.00 cap, 15 min grace
INSERT INTO public.pricing_policies (vehicle_type_id, base_price, hourly_rate, day_cap, grace_period_minutes, is_active)
SELECT id, 15.00, 10.00, 100.00, 15, true FROM public.vehicle_types WHERE code = 'TRUCK'
ON CONFLICT DO NOTHING;

-- 3. SEED PHYSICAL INFRASTRUCTURE
-- Buildings
INSERT INTO public.buildings (name, address) VALUES
('Central Plaza Parking', '123 Capstone Avenue, District 1'),
('Annex Block Garage', '456 Innovation Boulevard, District 3')
ON CONFLICT (name) DO NOTHING;

-- Floors (Central Plaza Parking)
INSERT INTO public.floors (building_id, floor_number, floor_name) 
SELECT id, -1, 'Basement Floor (B1)' FROM public.buildings WHERE name = 'Central Plaza Parking'
ON CONFLICT DO NOTHING;

INSERT INTO public.floors (building_id, floor_number, floor_name) 
SELECT id, 1, 'Ground Floor (G1)' FROM public.buildings WHERE name = 'Central Plaza Parking'
ON CONFLICT DO NOTHING;

-- Floors (Annex Block Garage)
INSERT INTO public.floors (building_id, floor_number, floor_name) 
SELECT id, 1, 'Main Annex Floor' FROM public.buildings WHERE name = 'Annex Block Garage'
ON CONFLICT DO NOTHING;

-- Zones
-- Basement Floor (B1) Zones
INSERT INTO public.zones (floor_id, name)
SELECT f.id, 'Zone B-VIP' FROM public.floors f JOIN public.buildings b ON f.building_id = b.id 
WHERE b.name = 'Central Plaza Parking' AND f.floor_number = -1
ON CONFLICT DO NOTHING;

-- Ground Floor (G1) Zones
INSERT INTO public.zones (floor_id, name)
SELECT f.id, 'Zone A-Regular' FROM public.floors f JOIN public.buildings b ON f.building_id = b.id 
WHERE b.name = 'Central Plaza Parking' AND f.floor_number = 1
ON CONFLICT DO NOTHING;

-- Annex Zones
INSERT INTO public.zones (floor_id, name)
SELECT f.id, 'Zone West (Trucks)' FROM public.floors f JOIN public.buildings b ON f.building_id = b.id 
WHERE b.name = 'Annex Block Garage' AND f.floor_number = 1
ON CONFLICT DO NOTHING;

-- 4. SEED SLOTS
-- Zone B-VIP Slots (Basement)
INSERT INTO public.slots (zone_id, slot_code, type, status)
SELECT id, 'V-101', 'VIP'::slot_type, 'AVAILABLE'::slot_status FROM public.zones WHERE name = 'Zone B-VIP'
ON CONFLICT DO NOTHING;

INSERT INTO public.slots (zone_id, slot_code, type, status)
SELECT id, 'V-102', 'VIP'::slot_type, 'OCCUPIED'::slot_status FROM public.zones WHERE name = 'Zone B-VIP'
ON CONFLICT DO NOTHING;

INSERT INTO public.slots (zone_id, slot_code, type, status)
SELECT id, 'E-101', 'ELECTRIC'::slot_type, 'AVAILABLE'::slot_status FROM public.zones WHERE name = 'Zone B-VIP'
ON CONFLICT DO NOTHING;

-- Zone A-Regular Slots (Ground)
INSERT INTO public.slots (zone_id, slot_code, type, status)
SELECT id, 'A-201', 'REGULAR'::slot_type, 'AVAILABLE'::slot_status FROM public.zones WHERE name = 'Zone A-Regular'
ON CONFLICT DO NOTHING;

INSERT INTO public.slots (zone_id, slot_code, type, status)
SELECT id, 'A-202', 'REGULAR'::slot_type, 'OCCUPIED'::slot_status FROM public.zones WHERE name = 'Zone A-Regular'
ON CONFLICT DO NOTHING;

-- Zone West Slots (Annex Trucks)
INSERT INTO public.slots (zone_id, slot_code, type, status)
SELECT id, 'L-301', 'LARGE'::slot_type, 'AVAILABLE'::slot_status FROM public.zones WHERE name = 'Zone West (Trucks)'
ON CONFLICT DO NOTHING;
