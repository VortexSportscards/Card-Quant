import { ReactNode } from 'react';
import { ThemePicker } from './ThemePicker';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  LogOut, 
  LayoutDashboard, 
  Package, 
  Radio, 
  ClipboardCheck,
  Users,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ViewType } from '@/lib/types';
import { hasPermission } from '@/lib/auth';

interface LayoutProps {
  children: ReactNode;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
}

function SidebarItem({ icon, label, onClick, active }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className={cn(
        "h-4 w-4 transition-transform",
        active && "transform rotate-90"
      )} />
    </button>
  );
}

export default function Layout({ children, currentView, onViewChange }: LayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return children;
  }

  const canManageUsers = hasPermission(user, 'manage_users');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border/40 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border/40">
          <h1 className="brand-title text-2xl">CardQuant</h1>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 space-y-2">
          <SidebarItem
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Dashboard"
            onClick={() => onViewChange('dashboard')}
            active={currentView === 'dashboard'}
          />
          <SidebarItem
            icon={<Package className="h-4 w-4" />}
            label="Inventory"
            onClick={() => onViewChange('inventory')}
            active={currentView === 'inventory'}
          />
          <SidebarItem
            icon={<Radio className="h-4 w-4" />}
            label="Streams"
            onClick={() => onViewChange('streams')}
            active={currentView === 'streams'}
          />
          <SidebarItem
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="Inventory Check"
            onClick={() => onViewChange('inventoryCheck')}
            active={currentView === 'inventoryCheck'}
          />
          {canManageUsers && (
            <SidebarItem
              icon={<Users className="h-4 w-4" />}
              label="User Management"
              onClick={() => onViewChange('users')}
              active={currentView === 'users'}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
            <ThemePicker />
          </div>
          <Separator />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={logout}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 py-8 px-8">
          <div className="relative max-w-6xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 blur-3xl opacity-20" />
            <div className="relative">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}