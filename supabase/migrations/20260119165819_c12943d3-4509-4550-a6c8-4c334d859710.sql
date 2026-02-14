/* =========================================================
   1. app_role ENUM (SAFE)
   ========================================================= */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END
$$;


/* =========================================================
   2. user_roles TABLE
   ========================================================= */
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);


/* =========================================================
   3. ENABLE RLS
   ========================================================= */
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


/* =========================================================
   4. ROLE CHECK FUNCTION
   ========================================================= */
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id uuid,
  _role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;


/* =========================================================
   5. USER ROLE VIEW POLICY
   ========================================================= */
DROP POLICY IF EXISTS "Users can view their own roles"
ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());


/* =========================================================
   6. DOMAIN TABLES
   ========================================================= */
CREATE TABLE IF NOT EXISTS public.early_access_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback text NOT NULL,
  created_at timestamptz DEFAULT now()
);


/* =========================================================
   7. ENABLE RLS ON DOMAIN TABLES
   ========================================================= */
ALTER TABLE public.early_access_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;


/* =========================================================
   8. ADMIN READ POLICIES (SAFE RE-RUN)
   ========================================================= */
DROP POLICY IF EXISTS "Admins can view early access signups"
ON public.early_access_signups;

CREATE POLICY "Admins can view early access signups"
ON public.early_access_signups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


DROP POLICY IF EXISTS "Admins can view interaction events"
ON public.interaction_events;

CREATE POLICY "Admins can view interaction events"
ON public.interaction_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


DROP POLICY IF EXISTS "Admins can view feedback"
ON public.feedback_responses;

CREATE POLICY "Admins can view feedback"
ON public.feedback_responses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
