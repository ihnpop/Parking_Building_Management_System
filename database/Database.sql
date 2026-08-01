-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.role (
  role_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name character varying NOT NULL UNIQUE,
  description text,
  CONSTRAINT role_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.customer (
  customer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying,
  phone character varying,
  email character varying,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT customer_pkey PRIMARY KEY (customer_id)
);
CREATE TABLE public.vehicle_type (
  vehicle_type_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT vehicle_type_pkey PRIMARY KEY (vehicle_type_id)
);
CREATE TABLE public.vehicle (
  vehicle_id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  vehicle_type_id uuid NOT NULL,
  plate_number character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'Hoạt động'::character varying,
  brand character varying,
  color character varying,
  CONSTRAINT vehicle_pkey PRIMARY KEY (vehicle_id),
  CONSTRAINT vehicle_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT vehicle_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.building (
  building_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  address text,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT building_pkey PRIMARY KEY (building_id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role_id uuid,
  username character varying NOT NULL UNIQUE,
  full_name character varying NOT NULL,
  email character varying UNIQUE,
  phone character varying,
  status character varying NOT NULL DEFAULT 'Hoạt động'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  building_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id),
  CONSTRAINT profiles_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(building_id)
);
CREATE TABLE public.parking (
  parking_id uuid NOT NULL DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  name character varying NOT NULL UNIQUE,
  total_capacity integer DEFAULT 0,
  open_time time without time zone,
  close_time time without time zone,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT parking_pkey PRIMARY KEY (parking_id),
  CONSTRAINT parking_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(building_id)
);
CREATE TABLE public.floor (
  floor_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parking_id uuid NOT NULL,
  floor_number integer NOT NULL,
  name character varying,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT floor_pkey PRIMARY KEY (floor_id),
  CONSTRAINT floor_parking_id_fkey FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id)
);
CREATE TABLE public.area (
  area_id uuid NOT NULL DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL,
  vehicle_type_id uuid NOT NULL,
  name character varying NOT NULL,
  capacity integer DEFAULT 0,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT area_pkey PRIMARY KEY (area_id),
  CONSTRAINT area_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floor(floor_id),
  CONSTRAINT area_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.slot (
  slot_id uuid NOT NULL DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL,
  slot_code character varying NOT NULL,
  status character varying DEFAULT 'Sẵn sàng'::character varying,
  CONSTRAINT slot_pkey PRIMARY KEY (slot_id),
  CONSTRAINT slot_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.area(area_id)
);
CREATE TABLE public.price_table (
  price_table_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parking_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  status character varying DEFAULT 'Hoạt động'::character varying,
  card_reissue_fee numeric DEFAULT 50000,
  CONSTRAINT price_table_pkey PRIMARY KEY (price_table_id),
  CONSTRAINT price_table_parking_id_fkey FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id)
);
CREATE TABLE public.price_item (
  price_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  price_table_id uuid NOT NULL,
  vehicle_type_id uuid NOT NULL,
  min_hour numeric NOT NULL,
  max_hour numeric,
  price numeric NOT NULL,
  CONSTRAINT price_item_pkey PRIMARY KEY (price_item_id),
  CONSTRAINT price_item_price_table_id_fkey FOREIGN KEY (price_table_id) REFERENCES public.price_table(price_table_id),
  CONSTRAINT price_item_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.package (
  package_id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_type_id uuid NOT NULL,
  name character varying NOT NULL,
  duration_month integer NOT NULL,
  price numeric NOT NULL,
  status character varying DEFAULT 'Hoạt động'::character varying,
  price_table_id uuid,
  CONSTRAINT package_pkey PRIMARY KEY (package_id),
  CONSTRAINT package_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id),
  CONSTRAINT monthly_package_price_table_id_fkey FOREIGN KEY (price_table_id) REFERENCES public.price_table(price_table_id)
);
CREATE TABLE public.vehicle_package (
  vehicle_package_id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  package_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status character varying DEFAULT 'Hoạt động'::character varying,
  previous_vehicle_package_id uuid,
  renewal_type character varying NOT NULL DEFAULT 'Đăng ký mới'::character varying CHECK (renewal_type::text = ANY (ARRAY['Đăng ký mới'::character varying, 'Gia hạn nối tiếp'::character varying]::text[])),
  CONSTRAINT vehicle_package_pkey PRIMARY KEY (vehicle_package_id),
  CONSTRAINT vehicle_package_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT vehicle_package_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.package(package_id),
  CONSTRAINT vehicle_package_previous_vehicle_package_id_fkey FOREIGN KEY (previous_vehicle_package_id) REFERENCES public.vehicle_package(vehicle_package_id)
);
CREATE TABLE public.parking_sessions (
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid,
  vehicle_id uuid NOT NULL,
  plate_number character varying NOT NULL,
  entry_time timestamp with time zone NOT NULL DEFAULT now(),
  exit_time timestamp with time zone,
  entry_plate_image text,
  exit_plate_image text,
  entry_gate_id uuid,
  exit_gate_id uuid,
  status character varying DEFAULT 'Đang gửi xe'::character varying CHECK (status::text = ANY (ARRAY['Đang gửi xe'::text, 'Chờ thanh toán'::text, 'Hoàn thành'::text, 'Mất thẻ'::text, 'Đã hủy'::text])),
  slot_id uuid,
  staff_in_id uuid,
  staff_out_id uuid,
  estimated_fee numeric DEFAULT 0,
  final_fee numeric DEFAULT 0,
  CONSTRAINT parking_sessions_pkey PRIMARY KEY (session_id),
  CONSTRAINT parking_sessions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT parking_sessions_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slot(slot_id),
  CONSTRAINT parking_sessions_staff_in_id_fkey FOREIGN KEY (staff_in_id) REFERENCES public.profiles(id),
  CONSTRAINT parking_sessions_staff_out_id_fkey FOREIGN KEY (staff_out_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.payment (
  payment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  payment_method character varying CHECK (payment_method::text = ANY (ARRAY['Tiền mặt'::text, 'VNPay'::text])),
  payment_time timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'Đã thanh toán'::character varying CHECK (status::text = ANY (ARRAY['Chờ thanh toán'::character varying, 'Đã thanh toán'::character varying, 'Thất bại'::character varying, 'Hết hạn'::character varying]::text[])),
  vehicle_package_id uuid,
  session_id uuid,
  payment_type character varying NOT NULL CHECK (payment_type::text = ANY (ARRAY['thẻ lượt'::character varying, 'Đăng ký thẻ tháng'::character varying, 'Gia hạn thẻ tháng'::character varying, 'Phí cấp lại thẻ'::character varying, 'Phí mất thẻ lượt'::character varying]::text[])),
  note jsonb,
  created_by uuid,
  provider character varying DEFAULT 'VNPay'::character varying,
  order_code character varying UNIQUE,
  transaction_no character varying,
  bank_code character varying,
  paid_at timestamp with time zone,
  raw_response jsonb,
  CONSTRAINT payment_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payment_vehicle_package_id_fkey FOREIGN KEY (vehicle_package_id) REFERENCES public.vehicle_package(vehicle_package_id),
  CONSTRAINT payment_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id),
  CONSTRAINT payment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.slot_allocation_log (
  allocation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  suggested_slot_id uuid NOT NULL,
  actual_slot_id uuid,
  vehicle_type_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  session_id uuid NOT NULL,
  CONSTRAINT slot_allocation_log_pkey PRIMARY KEY (allocation_id),
  CONSTRAINT slot_allocation_log_suggested_slot_id_fkey FOREIGN KEY (suggested_slot_id) REFERENCES public.slot(slot_id),
  CONSTRAINT slot_allocation_log_actual_slot_id_fkey FOREIGN KEY (actual_slot_id) REFERENCES public.slot(slot_id),
  CONSTRAINT slot_allocation_log_vehicle_type_id_fkey FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id),
  CONSTRAINT slot_allocation_log_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id)
);
CREATE TABLE public.customer_kyc (
  kyc_id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  cccd_number character varying,
  ekyc_status character varying NOT NULL DEFAULT 'Chờ xử lý'::character varying CHECK (ekyc_status::text = ANY (ARRAY['Chờ xử lý'::character varying, 'Đã xác thực'::character varying, 'Từ chối'::character varying]::text[])),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_kyc_pkey PRIMARY KEY (kyc_id),
  CONSTRAINT customer_kyc_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id)
);
CREATE TABLE public.card (
  card_id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  status character varying DEFAULT 'Đang chờ'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  type character varying NOT NULL,
  expired_date date,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  active_vehicle_package_id uuid,
  CONSTRAINT card_pkey PRIMARY KEY (card_id),
  CONSTRAINT card_active_vehicle_package_id_fkey FOREIGN KEY (active_vehicle_package_id) REFERENCES public.vehicle_package(vehicle_package_id)
);
CREATE TABLE public.card_lost_log (
  lost_report_id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  vehicle_id uuid,
  reported_at timestamp without time zone DEFAULT now(),
  status character varying DEFAULT 'Đang chờ'::character varying,
  handled_by uuid,
  description text,
  vehicle_registration_image_url text,
  id_card_image_url text,
  reissue_fee numeric,
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
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  card_id uuid,
  building_id uuid NOT NULL,
  parking_id uuid NOT NULL,
  gate_id uuid NOT NULL,
  staff_id uuid,
  direction character varying NOT NULL CHECK (direction::text = ANY (ARRAY['Xe vào'::character varying, 'Xe ra'::character varying]::text[])),
  event_time timestamp without time zone NOT NULL DEFAULT now(),
  vehicle_type_id uuid,
  plate_number character varying NOT NULL,
  ticket_type character varying NOT NULL CHECK (ticket_type::text = ANY (ARRAY['Thẻ lượt'::character varying, 'Thẻ tháng'::character varying, 'Mất thẻ'::character varying]::text[])),
  applied_price numeric,
  note text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT entry_exit_log_pkey PRIMARY KEY (log_id),
  CONSTRAINT fk_log_session FOREIGN KEY (session_id) REFERENCES public.parking_sessions(session_id),
  CONSTRAINT fk_log_vehicle FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(vehicle_id),
  CONSTRAINT fk_log_card FOREIGN KEY (card_id) REFERENCES public.card(card_id),
  CONSTRAINT fk_log_building FOREIGN KEY (building_id) REFERENCES public.building(building_id),
  CONSTRAINT fk_log_parking FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id),
  CONSTRAINT fk_log_staff FOREIGN KEY (staff_id) REFERENCES public.profiles(id),
  CONSTRAINT fk_log_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_type(vehicle_type_id)
);
CREATE TABLE public.card_activity_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  note text,
  CONSTRAINT card_activity_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT card_activity_logs_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card(card_id),
  CONSTRAINT card_activity_logs_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.card_registrations(registration_id),
  CONSTRAINT card_activity_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.login_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  profiles_id uuid,
  username character varying NOT NULL,
  status character varying NOT NULL,
  login_time timestamp with time zone DEFAULT now(),
  CONSTRAINT login_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT login_logs_profiles_id_fkey FOREIGN KEY (profiles_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.contract (
  contract_id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  contract_no text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Chờ ký'::text,
  sign_token text NOT NULL UNIQUE,
  token_expires_at timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  signed_at timestamp with time zone,
  signed_ip text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contract_pkey PRIMARY KEY (contract_id),
  CONSTRAINT contract_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.card_registrations(registration_id)
);
CREATE TABLE public.gate (
  gate_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parking_id uuid NOT NULL,
  name character varying NOT NULL,
  gate_type character varying NOT NULL,
  status character varying DEFAULT 'Hoạt động'::character varying,
  CONSTRAINT gate_pkey PRIMARY KEY (gate_id),
  CONSTRAINT gate_parking_id_fkey FOREIGN KEY (parking_id) REFERENCES public.parking(parking_id)
);