-- Enable RLS on payment tables
ALTER TABLE IF EXISTS public.student_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_payment_progress ENABLE ROW LEVEL SECURITY;

-- Policies for student_payment
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment' AND policyname = 'Users can insert their own payment requests'
  ) THEN
    CREATE POLICY "Users can insert their own payment requests"
    ON public.student_payment
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id AND auth.uid() = created_by
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment' AND policyname = 'Users can view their own payments'
  ) THEN
    CREATE POLICY "Users can view their own payments"
    ON public.student_payment
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment' AND policyname = 'Admins can view all payments'
  ) THEN
    CREATE POLICY "Admins can view all payments"
    ON public.student_payment
    FOR SELECT
    USING (is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment' AND policyname = 'Admins can update any payments'
  ) THEN
    CREATE POLICY "Admins can update any payments"
    ON public.student_payment
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- Policies for student_payment_progress
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment_progress' AND policyname = 'Users can view their own payment progress'
  ) THEN
    CREATE POLICY "Users can view their own payment progress"
    ON public.student_payment_progress
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment_progress' AND policyname = 'Admins can view all payment progress'
  ) THEN
    CREATE POLICY "Admins can view all payment progress"
    ON public.student_payment_progress
    FOR SELECT
    USING (is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment_progress' AND policyname = 'Admins can insert payment progress'
  ) THEN
    CREATE POLICY "Admins can insert payment progress"
    ON public.student_payment_progress
    FOR INSERT
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_payment_progress' AND policyname = 'Admins can update payment progress'
  ) THEN
    CREATE POLICY "Admins can update payment progress"
    ON public.student_payment_progress
    FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END $$;

-- Triggers
DROP TRIGGER IF EXISTS trg_notify_admins_new_payment_request ON public.student_payment;
CREATE TRIGGER trg_notify_admins_new_payment_request
AFTER INSERT ON public.student_payment
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_payment_request();

DROP TRIGGER IF EXISTS trg_update_student_payment_progress ON public.student_payment;
CREATE TRIGGER trg_update_student_payment_progress
AFTER INSERT OR UPDATE ON public.student_payment
FOR EACH ROW
EXECUTE FUNCTION public.update_student_payment_progress();