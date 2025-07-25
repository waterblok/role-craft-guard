import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Shield, Users, Settings, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Role {
  id: string;
  name: string;
  department: string;
  level: number;
  color: string;
}

interface Action {
  id: string;
  name: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface Permission {
  roleId: string;
  actionId: string;
  status: 'allowed' | 'denied' | 'conditional';
  conditions?: string;
  limit?: number;
}

const defaultRoles: Role[] = [
  { id: '1', name: 'CEO', department: 'Executive', level: 5, color: 'bg-purple-100 text-purple-800' },
  { id: '2', name: 'CFO', department: 'Finance', level: 4, color: 'bg-blue-100 text-blue-800' },
  { id: '3', name: 'Finance Manager', department: 'Finance', level: 3, color: 'bg-green-100 text-green-800' },
  { id: '4', name: 'HR Manager', department: 'HR', level: 3, color: 'bg-orange-100 text-orange-800' },
  { id: '5', name: 'Department Head', department: 'Operations', level: 3, color: 'bg-indigo-100 text-indigo-800' },
  { id: '6', name: 'Team Lead', department: 'Operations', level: 2, color: 'bg-teal-100 text-teal-800' },
  { id: '7', name: 'Employee', department: 'Operations', level: 1, color: 'bg-gray-100 text-gray-800' },
];

const defaultActions: Action[] = [
  { id: '1', name: 'Approve Purchase Orders', category: 'Procurement', riskLevel: 'medium', description: 'Authorize company purchases and expenditures' },
  { id: '2', name: 'Hire Staff', category: 'HR', riskLevel: 'high', description: 'Recruit and onboard new employees' },
  { id: '3', name: 'Sign Contracts', category: 'Legal', riskLevel: 'critical', description: 'Execute legal agreements on behalf of company' },
  { id: '4', name: 'Access Financial Records', category: 'Finance', riskLevel: 'high', description: 'View sensitive financial information' },
  { id: '5', name: 'Approve Time Off', category: 'HR', riskLevel: 'low', description: 'Authorize employee leave requests' },
  { id: '6', name: 'Budget Allocation', category: 'Finance', riskLevel: 'critical', description: 'Allocate and modify department budgets' },
  { id: '7', name: 'System Administration', category: 'IT', riskLevel: 'high', description: 'Manage IT systems and security' },
  { id: '8', name: 'Performance Reviews', category: 'HR', riskLevel: 'medium', description: 'Conduct employee evaluations' },
];

const defaultPermissions: Permission[] = [
  { roleId: '1', actionId: '1', status: 'allowed' },
  { roleId: '1', actionId: '2', status: 'allowed' },
  { roleId: '1', actionId: '3', status: 'allowed' },
  { roleId: '1', actionId: '4', status: 'allowed' },
  { roleId: '1', actionId: '5', status: 'allowed' },
  { roleId: '1', actionId: '6', status: 'allowed' },
  { roleId: '1', actionId: '7', status: 'conditional', conditions: 'With IT approval' },
  { roleId: '1', actionId: '8', status: 'allowed' },
  
  { roleId: '2', actionId: '1', status: 'allowed', limit: 50000 },
  { roleId: '2', actionId: '2', status: 'conditional', conditions: 'Executive roles only' },
  { roleId: '2', actionId: '3', status: 'allowed', limit: 100000 },
  { roleId: '2', actionId: '4', status: 'allowed' },
  { roleId: '2', actionId: '5', status: 'denied' },
  { roleId: '2', actionId: '6', status: 'allowed' },
  { roleId: '2', actionId: '7', status: 'denied' },
  { roleId: '2', actionId: '8', status: 'conditional', conditions: 'Finance team only' },
  
  { roleId: '3', actionId: '1', status: 'allowed', limit: 10000 },
  { roleId: '3', actionId: '2', status: 'denied' },
  { roleId: '3', actionId: '3', status: 'conditional', conditions: 'Up to $25,000' },
  { roleId: '3', actionId: '4', status: 'allowed' },
  { roleId: '3', actionId: '5', status: 'denied' },
  { roleId: '3', actionId: '6', status: 'conditional', conditions: 'Department budget only' },
  { roleId: '3', actionId: '7', status: 'denied' },
  { roleId: '3', actionId: '8', status: 'denied' },
];

export default function AuthorizationMatrix() {
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [actions, setActions] = useState<Action[]>(defaultActions);
  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...new Set(actions.map(action => action.category))];

  const filteredActions = selectedCategory === 'all' 
    ? actions 
    : actions.filter(action => action.category === selectedCategory);

  const getPermission = (roleId: string, actionId: string): Permission | undefined => {
    return permissions.find(p => p.roleId === roleId && p.actionId === actionId);
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'medium': return <Clock className="h-4 w-4 text-warning" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getPermissionBadge = (permission: Permission | undefined) => {
    if (!permission) {
      return <Badge variant="secondary" className="text-xs">Not Set</Badge>;
    }

    switch (permission.status) {
      case 'allowed':
        return (
          <Badge className="bg-success text-success-foreground text-xs">
            Allowed
            {permission.limit && <span className="ml-1">(${permission.limit.toLocaleString()})</span>}
          </Badge>
        );
      case 'denied':
        return <Badge variant="destructive" className="text-xs">Denied</Badge>;
      case 'conditional':
        return <Badge className="bg-warning text-warning-foreground text-xs">Conditional</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Authorization Matrix
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage roles, permissions, and access controls across your organization
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Manage Roles
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Role Management</DialogTitle>
                  <DialogDescription>
                    Add, edit, or remove organizational roles
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Badge className={cn("mb-2", role.color)}>{role.name}</Badge>
                        <p className="text-sm text-muted-foreground">{role.department} • Level {role.level}</p>
                      </div>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                  ))}
                  <Button className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Role
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configure Actions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Action Configuration</DialogTitle>
                  <DialogDescription>
                    Define actions and their risk levels
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {actions.map(action => (
                    <div key={action.id} className="p-4 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRiskIcon(action.riskLevel)}
                          <h4 className="font-medium">{action.name}</h4>
                        </div>
                        <Badge variant="outline">{action.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  ))}
                  <Button className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Action
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="category">Filter by Category:</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Authorization Matrix */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Authorization Matrix</CardTitle>
            <CardDescription>
              Review and manage permissions across all roles and actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Action</th>
                    {roles.map(role => (
                      <th key={role.id} className="text-center p-4 min-w-32">
                        <Badge className={cn("text-xs", role.color)}>
                          {role.name}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.map(action => (
                    <tr key={action.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {getRiskIcon(action.riskLevel)}
                          <div>
                            <div className="font-medium">{action.name}</div>
                            <div className="text-sm text-muted-foreground">{action.category}</div>
                          </div>
                        </div>
                      </td>
                      {roles.map(role => {
                        const permission = getPermission(role.id, action.id);
                        return (
                          <td key={role.id} className="p-4 text-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="hover:scale-105 transition-transform">
                                  {getPermissionBadge(permission)}
                                </button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    {role.name} - {action.name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Configure permission settings for this role-action combination
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Permission Status</Label>
                                    <Select defaultValue={permission?.status || 'denied'}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="allowed">Allowed</SelectItem>
                                        <SelectItem value="denied">Denied</SelectItem>
                                        <SelectItem value="conditional">Conditional</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Approval Limit ($)</Label>
                                    <Input 
                                      type="number" 
                                      placeholder="Enter amount limit"
                                      defaultValue={permission?.limit}
                                    />
                                  </div>
                                  <div>
                                    <Label>Conditions</Label>
                                    <Textarea 
                                      placeholder="Specify any conditions or restrictions"
                                      defaultValue={permission?.conditions}
                                    />
                                  </div>
                                  <Button className="w-full">Save Changes</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{roles.length}</p>
                  <p className="text-sm text-muted-foreground">Total Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{actions.length}</p>
                  <p className="text-sm text-muted-foreground">Total Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">
                    {permissions.filter(p => p.status === 'allowed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Allowed Permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">
                    {actions.filter(a => a.riskLevel === 'critical').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Critical Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}