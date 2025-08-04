import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DatabaseRole {
  id: string;
  name: string;
  description: string;
  color: string;
  is_system_role: boolean;
}

interface DatabaseAction {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface DatabasePermission {
  id: string;
  role_id: string;
  action_id: string;
  status: 'granted' | 'denied' | 'conditional';
  limit_value?: number;
  conditions?: string;
}

interface AuthorizationMatrixViewProps {
  roles: DatabaseRole[];
  actions: DatabaseAction[];
  permissions: DatabasePermission[];
  userRole: string;
  onPermissionUpdate: (roleId: string, actionId: string, status: 'granted' | 'denied' | 'conditional') => void;
}

export default function AuthorizationMatrixView({ 
  roles, 
  actions, 
  permissions, 
  userRole, 
  onPermissionUpdate 
}: AuthorizationMatrixViewProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const canEdit = userRole === 'Edit & View' || userRole === 'Admin';

  const getPermission = (roleId: string, actionId: string) => {
    return permissions.find(p => p.role_id === roleId && p.action_id === actionId);
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

  const getStatusBadge = (permission: DatabasePermission | undefined) => {
    if (!permission) {
      return <Badge variant="secondary">Denied</Badge>;
    }
    
    switch (permission.status) {
      case 'granted':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Granted</Badge>;
      case 'conditional':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-50">Conditional</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="secondary">Denied</Badge>;
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    const matchesSearch = action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(actions.map(action => action.category)));

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
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
            {canEdit 
              ? "Click on permission badges to toggle between granted, denied, and conditional states"
              : "You have view-only access to the authorization matrix"
            }
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
                          {canEdit ? (
                            <button
                              onClick={() => {
                                const currentStatus = permission?.status || 'denied';
                                const nextStatus = currentStatus === 'denied' ? 'granted' : 
                                                 currentStatus === 'granted' ? 'conditional' : 'denied';
                                onPermissionUpdate(role.id, action.id, nextStatus);
                              }}
                              className="hover:scale-105 transition-transform"
                            >
                              {getStatusBadge(permission)}
                            </button>
                          ) : (
                            getStatusBadge(permission)
                          )}
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
  );
}