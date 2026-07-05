-- Migration to support payments for monthly card registration and renewal,
-- and tracking payment types (CASUAL, MONTHLY_NEW, MONTHLY_RENEW).

-- 1. Make parking_order_id column nullable in payment table
ALTER TABLE IF EXISTS public.payment 
  ALTER COLUMN parking_order_id DROP NOT NULL;

-- 2. Add vehicle_package_id referencing vehicle_package
ALTER TABLE IF EXISTS public.payment 
  ADD COLUMN IF NOT EXISTS vehicle_package_id UUID REFERENCES public.vehicle_package(vehicle_package_id) ON DELETE SET NULL;

-- 2.1. Add session_id referencing parking_sessions
ALTER TABLE IF EXISTS public.payment 
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.parking_sessions(session_id) ON DELETE SET NULL;

-- 3. Add payment_type column
ALTER TABLE IF EXISTS public.payment 
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(30);

-- 4. Fill existing payments with default payment_type 'CASUAL'
UPDATE public.payment 
  SET payment_type = 'CASUAL' 
  WHERE payment_type IS NULL;

-- 5. Make payment_type NOT NULL after filling existing data
ALTER TABLE IF EXISTS public.payment 
  ALTER COLUMN payment_type SET NOT NULL;

-- 6. Add check constraint on payment_type
ALTER TABLE IF EXISTS public.payment 
  DROP CONSTRAINT IF EXISTS check_payment_type,
  ADD CONSTRAINT check_payment_type CHECK (payment_type IN ('CASUAL', 'MONTHLY_NEW', 'MONTHLY_RENEW'));

-- 7. Add note column
ALTER TABLE IF EXISTS public.payment 
  ADD COLUMN IF NOT EXISTS note TEXT;

-- 8. Add created_by column referencing profiles(id)
ALTER TABLE IF EXISTS public.payment 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 9. Optionally update default status to 'Đã thanh toán' or allow fallback
-- We keep 'Đã thanh toán' default or alter default, let's keep status varchar(50) and make it flexible
ALTER TABLE IF EXISTS public.payment
  ALTER COLUMN status SET DEFAULT 'Đã thanh toán';
