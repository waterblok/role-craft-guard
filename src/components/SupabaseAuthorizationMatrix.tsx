import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, LogOut, Users, Shield, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Action {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Permission {
  id: string;
  role_id: string;
  action_id: string;
  status: 'granted' | 'denied' | 'conditional';
  limit_value?: number;
  conditions?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role_id?: string;
}

export default function SupabaseAuthorizationMatrix() {
  const { user, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [rolesRes, actionsRes, permissionsRes, profilesRes] = await Promise.all([
        supabase.from('roles').select('*'),
        supabase.from('actions').select('*'),
        supabase.from('permissions').select('*'),
        supabase.from('profiles').select('*')
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (actionsRes.error) throw actionsRes.error;
      if (permissionsRes.error) throw permissionsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setRoles(rolesRes.data || []);
      setActions(actionsRes.data || []);
      setPermissions(permissionsRes.data || []);
      setProfiles(profilesRes.data || []);
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
        const { error } = await supabase
          .from('permissions')
          .update({ status })
          .eq('id', existingPermission.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
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

  const exportToCSV = () => {
    const csvData = [];
    csvData.push(['Role', 'Action', 'Status', 'Limit', 'Conditions', 'Category']);
    
    roles.forEach(role => {
      actions.forEach(action => {
        const permission = getPermission(role.id, action.id);
        csvData.push([
          role.name,
          action.name,
          permission?.status || 'denied',
          permission?.limit_value || '',
          permission?.conditions || '',
          action.category
        ]);
      });
    });

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `authorization-matrix-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Authorization matrix exported to CSV.",
    });
  };

  const getStatusBadge = (permission: Permission | undefined) => {
    if (!permission) {
      return <Badge variant="secondary">Denied</Badge>;
    }
    
    switch (permission.status) {
      case 'granted':
        return <Badge variant="default" className="bg-green-600">Granted</Badge>;
      case 'conditional':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Conditional</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="secondary">Denied</Badge>;
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    const matchesSearch = action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(actions.map(action => action.category)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
          </div>
          <div className="flex gap-4">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
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

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category-filter">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="search">Search Actions</Label>
                <Input
                  id="search"
                  placeholder="Search by action name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authorization Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Matrix</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click on permission badges to toggle between granted, denied, and conditional states
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Action</th>
                    {roles.map(role => (
                      <th key={role.id} className="text-center p-4 font-medium min-w-32">
                        <div className="flex flex-col items-center gap-2">
                          <span>{role.name}</span>
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          ></div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.map(action => (
                    <tr key={action.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{action.name}</div>
                          <div className="text-sm text-muted-foreground">{action.description}</div>
                          <Badge variant="outline" className="mt-1">{action.category}</Badge>
                        </div>
                      </td>
                      {roles.map(role => {
                        const permission = getPermission(role.id, action.id);
                        return (
                          <td key={role.id} className="p-4 text-center">
                            <button
                              onClick={() => {
                                const currentStatus = permission?.status || 'denied';
                                const nextStatus = currentStatus === 'denied' ? 'granted' : 
                                                 currentStatus === 'granted' ? 'conditional' : 'denied';
                                updatePermission(role.id, action.id, nextStatus);
                              }}
                              className="hover:scale-105 transition-transform"
                            >
                              {getStatusBadge(permission)}
                            </button>
                            {permission?.limit_value && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Limit: {permission.limit_value}
                              </div>
                            )}
                            {permission?.conditions && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {permission.conditions}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}