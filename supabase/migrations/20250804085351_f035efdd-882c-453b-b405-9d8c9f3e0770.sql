-- First, let's ensure we have the specific roles you want
INSERT INTO public.roles (name, description, color, is_system_role) VALUES
('View Only', 'Can only view the authorization matrix', '#6B7280', true),
('Edit & View', 'Can view and edit the authorization matrix', '#3B82F6', true),
('Admin', 'Can view, edit, manage all users and roles', '#DC2626', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_system_role = EXCLUDED.is_system_role;

-- Create a security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS TEXT AS $$
  SELECT r.name 
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to check if current user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role(auth.uid()) = 'Admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to check if current user can edit
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role(auth.uid()) IN ('Edit & View', 'Admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update permissions table RLS policies
DROP POLICY IF EXISTS "Permissions manageable by authenticated users" ON public.permissions;
DROP POLICY IF EXISTS "Permissions visible to authenticated users" ON public.permissions;

-- Only users with edit permissions can modify permissions
CREATE POLICY "Permissions manageable by editors" ON public.permissions
FOR ALL USING (public.can_edit());

-- All authenticated users can view permissions
CREATE POLICY "Permissions visible to authenticated users" ON public.permissions
FOR SELECT USING (true);

-- Update profiles table policies for admin management
DROP POLICY IF EXISTS "Profiles visible to authenticated users" ON public.profiles;

CREATE POLICY "Profiles visible to authenticated users" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Profiles manageable by admins" ON public.profiles
FOR ALL USING (public.is_admin());

-- Update roles table policies
DROP POLICY IF EXISTS "Roles visible to authenticated users" ON public.roles;

CREATE POLICY "Roles visible to authenticated users" ON public.roles
FOR SELECT USING (true);

CREATE POLICY "Roles manageable by admins" ON public.roles
FOR ALL USING (public.is_admin());