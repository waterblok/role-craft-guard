-- Create enum types for better data integrity
CREATE TYPE public.permission_status AS ENUM ('granted', 'denied', 'conditional');

-- Create roles table
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create actions table
CREATE TABLE public.actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permissions table (junction table for roles and actions)
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  status public.permission_status NOT NULL DEFAULT 'denied',
  limit_value INTEGER,
  conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, action_id)
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role_id UUID REFERENCES public.roles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permission exclusions table for user-specific overrides
CREATE TABLE public.permission_exclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_id)
);

-- Enable Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_exclusions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing read for authenticated users, admin-only write)
CREATE POLICY "Anyone can view roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Anyone can view actions" ON public.actions FOR SELECT USING (true);
CREATE POLICY "Anyone can view permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can view exclusions" ON public.permission_exclusions FOR SELECT USING (true);

-- Admin policies (will be updated later when we implement proper role checking)
CREATE POLICY "Authenticated users can manage roles" ON public.roles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage actions" ON public.actions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage permissions" ON public.permissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Authenticated users can manage exclusions" ON public.permission_exclusions FOR ALL USING (auth.role() = 'authenticated');

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.roles (name, description, color) VALUES
  ('Administrator', 'Full system access', '#DC2626'),
  ('Manager', 'Department management access', '#D97706'),
  ('Employee', 'Basic employee access', '#059669'),
  ('Contractor', 'Limited contractor access', '#7C3AED');

INSERT INTO public.actions (name, description, category) VALUES
  ('Create User Account', 'Ability to create new user accounts', 'User Management'),
  ('Delete User Account', 'Ability to delete user accounts', 'User Management'),
  ('View User Profiles', 'Access to view user profile information', 'User Management'),
  ('Approve Expense Reports', 'Authority to approve expense reports', 'Financial'),
  ('Process Payroll', 'Access to payroll processing systems', 'Financial'),
  ('Access Financial Reports', 'View financial reports and analytics', 'Financial'),
  ('Manage Projects', 'Create and manage project workflows', 'Project Management'),
  ('Assign Tasks', 'Ability to assign tasks to team members', 'Project Management'),
  ('View Project Reports', 'Access to project status and reports', 'Project Management'),
  ('Access HR Records', 'View employee HR information', 'Human Resources'),
  ('Conduct Performance Reviews', 'Perform employee evaluations', 'Human Resources'),
  ('Manage Benefits', 'Administer employee benefits', 'Human Resources'),
  ('System Administration', 'Full system configuration access', 'System'),
  ('Database Access', 'Direct database query capabilities', 'System'),
  ('Security Configuration', 'Configure security settings', 'System');

-- Insert default permissions for Administrator role
INSERT INTO public.permissions (role_id, action_id, status)
SELECT r.id, a.id, 'granted'
FROM public.roles r, public.actions a
WHERE r.name = 'Administrator';

-- Insert default permissions for Manager role
INSERT INTO public.permissions (role_id, action_id, status, limit_value, conditions)
SELECT r.id, a.id, 
  CASE 
    WHEN a.name IN ('Create User Account', 'View User Profiles', 'Approve Expense Reports', 'Manage Projects', 'Assign Tasks', 'View Project Reports', 'Conduct Performance Reviews') THEN 'granted'
    WHEN a.name IN ('Access Financial Reports') THEN 'conditional'
    ELSE 'denied'
  END,
  CASE WHEN a.name = 'Approve Expense Reports' THEN 10000 ELSE NULL END,
  CASE WHEN a.name = 'Access Financial Reports' THEN 'Department level only' ELSE NULL END
FROM public.roles r, public.actions a
WHERE r.name = 'Manager';

-- Insert default permissions for Employee role
INSERT INTO public.permissions (role_id, action_id, status, conditions)
SELECT r.id, a.id,
  CASE 
    WHEN a.name IN ('View User Profiles', 'View Project Reports') THEN 'granted'
    WHEN a.name IN ('Assign Tasks') THEN 'conditional'
    ELSE 'denied'
  END,
  CASE WHEN a.name = 'Assign Tasks' THEN 'Within assigned projects only' ELSE NULL END
FROM public.roles r, public.actions a
WHERE r.name = 'Employee';

-- Insert default permissions for Contractor role
INSERT INTO public.permissions (role_id, action_id, status, conditions)
SELECT r.id, a.id,
  CASE 
    WHEN a.name IN ('View Project Reports') THEN 'conditional'
    ELSE 'denied'
  END,
  CASE WHEN a.name = 'View Project Reports' THEN 'Assigned projects only' ELSE NULL END
FROM public.roles r, public.actions a
WHERE r.name = 'Contractor';