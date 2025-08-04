-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS TEXT AS $$
  SELECT r.name 
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role(auth.uid()) = 'Admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role(auth.uid()) IN ('Edit & View', 'Admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;