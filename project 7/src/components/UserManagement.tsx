import { useState } from 'react';
import { User, UserRole, Permission } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Shield } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { defaultPermissions } from '@/lib/auth';

interface UserManagementProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
}

const allPermissions: Permission[] = [
  'view',
  'edit',
  'delete',
  'manage_users',
  'view_costs',
  'view_all_streams',
  'view_own_streams',
  'add_stream',
  'edit_stream',
  'delete_stream',
  'manage_inventory',
  'view_inventory',
  'edit_inventory',
  'delete_inventory',
  'perform_inventory_check',
  'view_reports',
  'export_data'
];

const permissionGroups = {
  'General Access': ['view', 'edit', 'delete'],
  'User Management': ['manage_users'],
  'Financial': ['view_costs'],
  'Streams': ['view_all_streams', 'view_own_streams', 'add_stream', 'edit_stream', 'delete_stream'],
  'Inventory': ['manage_inventory', 'view_inventory', 'edit_inventory', 'delete_inventory', 'perform_inventory_check'],
  'Reports': ['view_reports', 'export_data']
};

const formatPermissionName = (permission: string) => {
  return permission
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function UserManagement({ users, onUpdateUsers }: UserManagementProps) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    email: '',
    password: '',
    role: 'streamer',
    name: '',
    emailVerified: true,
    permissions: []
  });

  const handleAddUser = () => {
    if (!newUser.email || !newUser.password || !newUser.name) return;

    const user: User = {
      id: generateId('user-'),
      ...newUser,
      permissions: newUser.permissions.length ? newUser.permissions : defaultPermissions[newUser.role]
    };

    onUpdateUsers([...users, user]);
    setNewUser({
      email: '',
      password: '',
      role: 'streamer',
      name: '',
      emailVerified: true,
      permissions: []
    });
    setShowAddUser(false);
  };

  const handleUpdateUser = () => {
    if (!editingUser || !editingUser.email || !editingUser.name) return;

    onUpdateUsers(
      users.map(user => (user.id === editingUser.id ? editingUser : user))
    );
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    onUpdateUsers(users.filter(user => user.id !== id));
    setUserToDelete(null);
  };

  const handleRoleChange = (role: UserRole, isNewUser: boolean = false) => {
    if (isNewUser) {
      setNewUser(prev => ({
        ...prev,
        role,
        permissions: defaultPermissions[role]
      }));
    } else if (editingUser) {
      setEditingUser(prev => ({
        ...prev!,
        role,
        permissions: defaultPermissions[role]
      }));
    }
  };

  const handlePermissionChange = (permission: Permission, checked: boolean, user: User) => {
    const updatedPermissions = checked
      ? [...user.permissions, permission]
      : user.permissions.filter(p => p !== permission);

    if (editingUser && user.id === editingUser.id) {
      setEditingUser({ ...editingUser, permissions: updatedPermissions });
    } else {
      onUpdateUsers(
        users.map(u => (u.id === user.id ? { ...u, permissions: updatedPermissions } : u))
      );
    }
  };

  const renderPermissionsDialog = (user: User) => (
    <Dialog key={`permissions-${user.id}`} open={showPermissions === user.id} onOpenChange={() => setShowPermissions(null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Permissions for {user.name}</DialogTitle>
          <DialogDescription>
            Manage user permissions and access levels
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {Object.entries(permissionGroups).map(([group, permissions]) => (
            <div key={group} className="space-y-4">
              <h3 className="font-semibold text-lg">{group}</h3>
              <div className="grid grid-cols-2 gap-4">
                {permissions.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${user.id}-${permission}`}
                      checked={user.permissions.includes(permission as Permission)}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(permission as Permission, checked as boolean, user)
                      }
                    />
                    <Label htmlFor={`${user.id}-${permission}`}>
                      {formatPermissionName(permission)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => setShowPermissions(null)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">User Management</h2>
        <Button onClick={() => setShowAddUser(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPermissions(user.id)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserToDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: UserRole) => handleRoleChange(value, true)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="streamer">Streamer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Permissions</Label>
              {Object.entries(permissionGroups).map(([group, permissions]) => (
                <div key={group} className="space-y-2">
                  <h4 className="text-sm font-medium">{group}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {permissions.map((permission) => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-${permission}`}
                          checked={newUser.permissions.includes(permission as Permission)}
                          onCheckedChange={(checked) => {
                            const updatedPermissions = checked
                              ? [...newUser.permissions, permission as Permission]
                              : newUser.permissions.filter(p => p !== permission);
                            setNewUser({ ...newUser, permissions: updatedPermissions });
                          }}
                        />
                        <Label htmlFor={`new-${permission}`}>
                          {formatPermissionName(permission)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: UserRole) => handleRoleChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="streamer">Streamer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label>Permissions</Label>
                {Object.entries(permissionGroups).map(([group, permissions]) => (
                  <div key={group} className="space-y-2">
                    <h4 className="text-sm font-medium">{group}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${permission}`}
                            checked={editingUser.permissions.includes(permission as Permission)}
                            onCheckedChange={(checked) => {
                              handlePermissionChange(permission as Permission, checked as boolean, editingUser);
                            }}
                          />
                          <Label htmlFor={`edit-${permission}`}>
                            {formatPermissionName(permission)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {users.map(user => renderPermissionsDialog(user))}
    </div>
  );
}