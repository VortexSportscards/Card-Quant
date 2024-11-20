import { ViewType } from '@/lib/types';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { Button } from '@/components/ui/button';
import UserManagement from '@/components/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { users, updateUsers, hasPermission } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { BoxIcon, BarChart3Icon, ClipboardCheckIcon } from 'lucide-react';

interface DashboardProps {
  totalValue: string;
  totalStreams: number;
  onViewChange: (view: ViewType) => void;
  onStartInventoryCheck: () => void;
}

export default function Dashboard({
  totalValue,
  totalStreams,
  onViewChange,
  onStartInventoryCheck,
}: DashboardProps) {
  const { user } = useAuth();
  const canManageUsers = hasPermission(user, 'manage_users');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back</h1>
        <p className="text-muted-foreground">Here's an overview of your inventory management system.</p>
      </div>

      <StatsCards totalValue={totalValue} totalStreams={totalStreams} />

      <div className="grid grid-cols-3 gap-4">
        <Card 
          className="hover:border-primary/50 transition-colors cursor-pointer p-4 flex items-center space-x-4" 
          onClick={() => onViewChange('inventory')}
        >
          <BoxIcon className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold">Inventory</h3>
            <p className="text-sm text-muted-foreground">Manage products</p>
          </div>
        </Card>

        <Card 
          className="hover:border-primary/50 transition-colors cursor-pointer p-4 flex items-center space-x-4" 
          onClick={() => onViewChange('streams')}
        >
          <BarChart3Icon className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold">Streams</h3>
            <p className="text-sm text-muted-foreground">Track sessions</p>
          </div>
        </Card>

        <Card 
          className="hover:border-primary/50 transition-colors cursor-pointer p-4 flex items-center space-x-4" 
          onClick={onStartInventoryCheck}
        >
          <ClipboardCheckIcon className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold">Check</h3>
            <p className="text-sm text-muted-foreground">Verify stock</p>
          </div>
        </Card>
      </div>

      {canManageUsers && (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <UserManagement
              users={users}
              onUpdateUsers={updateUsers}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}