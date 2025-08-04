import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DatabaseRole {
  id: string;
  name: string;
  description: string;
  color: string;
  is_system_role: boolean;
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

interface UserManagementProps {
  roles: DatabaseRole[];
  onDataChange: () => void;
}

export default function UserManagement({ roles, onDataChange }: UserManagementProps) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<DatabaseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    roleId: ''
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load user profiles.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.roleId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await (supabase as any)
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: newUser.email,
            full_name: newUser.fullName,
            role_id: newUser.roleId
          });

        if (profileError) throw profileError;

        toast({
          title: "Success",
          description: "User created successfully.",
        });

        setNewUser({ email: '', password: '', fullName: '', roleId: '' });
        loadProfiles();
        onDataChange();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive"
      });
    }
  };

  const updateUserRole = async (profileId: string, newRoleId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ role_id: newRoleId })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully.",
      });

      loadProfiles();
      onDataChange();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive"
      });
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'No Role';
  };

  const getRoleColor = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.color || '#6B7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New User */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={newUser.fullName}
                onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={newUser.roleId} onValueChange={(value) => setNewUser(prev => ({ ...prev, roleId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={createUser} className="w-full md:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <p className="text-sm text-muted-foreground">
            View and manage all users in the system
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(profile => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.full_name || 'N/A'}</TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    {profile.role_id ? (
                      <Badge 
                        variant="outline" 
                        style={{ 
                          borderColor: getRoleColor(profile.role_id),
                          color: getRoleColor(profile.role_id)
                        }}
                      >
                        {getRoleName(profile.role_id)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No Role</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={profile.role_id || ''} 
                      onValueChange={(value) => updateUserRole(profile.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Change role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}