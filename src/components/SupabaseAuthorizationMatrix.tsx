import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, Shield, Activity, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import AuthorizationMatrixView from './AuthorizationMatrixView';
import UserManagement from './UserManagement';

// Using database schema types directly
interface DatabaseRole {
  id: string;
  name: string;
  description: string;
  color: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

interface DatabaseAction {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface DatabasePermission {
  id: string;
  role_id: string;
  action_id: string;
  status: 'granted' | 'denied' | 'conditional';
  limit_value?: number;
  conditions?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseProfile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  role_id?: string;
  created_at: string;
  updated_at: string;
}

export default function SupabaseAuthorizationMatrix() {
  const { user, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [roles, setRoles] = useState<DatabaseRole[]>([]);
  const [actions, setActions] = useState<DatabaseAction[]>([]);
  const [permissions, setPermissions] = useState<DatabasePermission[]>([]);
  const [profiles, setProfiles] = useState<DatabaseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState('matrix');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Use any type to bypass TypeScript type checking while types are updating
      const [rolesRes, actionsRes, permissionsRes, profilesRes, userRoleRes] = await Promise.all([
        (supabase as any).from('roles').select('*'),
        (supabase as any).from('actions').select('*'),
        (supabase as any).from('permissions').select('*'),
        (supabase as any).from('profiles').select('*'),
        (supabase as any).rpc('get_user_role', { user_uuid: user?.id })
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (actionsRes.error) throw actionsRes.error;
      if (permissionsRes.error) throw permissionsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setRoles(rolesRes.data || []);
      setActions(actionsRes.data || []);
      setPermissions(permissionsRes.data || []);
      setProfiles(profilesRes.data || []);
      setUserRole(userRoleRes.data || '');
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load authorization data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPermission = (roleId: string, actionId: string) => {
    return permissions.find(p => p.role_id === roleId && p.action_id === actionId);
  };

  const updatePermission = async (roleId: string, actionId: string, status: 'granted' | 'denied' | 'conditional') => {
    try {
      const existingPermission = getPermission(roleId, actionId);
      
      if (existingPermission) {
        const { error } = await (supabase as any)
          .from('permissions')
          .update({ status })
          .eq('id', existingPermission.id);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('permissions')
          .insert({ role_id: roleId, action_id: actionId, status });
        
        if (error) throw error;
      }
      
      await loadData();
      toast({
        title: "Success",
        description: "Permission updated successfully.",
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission.",
        variant: "destructive"
      });
    }
  };

  const isAdmin = userRole === 'Admin';
  const canEdit = userRole === 'Edit & View' || userRole === 'Admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-muted-foreground">Loading authorization matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Authorization Matrix</h1>
            <p className="text-muted-foreground mt-2">
              Manage roles and permissions for your organization
            </p>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">Your role: </span>
              <span className="text-sm font-medium text-primary">
                {userRole || 'No Role Assigned'}
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={signOut} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{actions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matrix">Authorization Matrix</TabsTrigger>
            <TabsTrigger value="admin" disabled={!isAdmin}>
              <Settings className="mr-2 h-4 w-4" />
              Admin Panel
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="matrix" className="mt-6">
            <AuthorizationMatrixView
              roles={roles}
              actions={actions}
              permissions={permissions}
              userRole={userRole}
              onPermissionUpdate={updatePermission}
            />
          </TabsContent>
          
          <TabsContent value="admin" className="mt-6">
            {isAdmin ? (
              <UserManagement
                roles={roles}
                onDataChange={loadData}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Access Denied</h3>
                    <p className="text-muted-foreground">
                      You need Admin privileges to access this section.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}