import { LayoutDashboard, Search, FileText, FolderOpen, Settings, User, Package, Printer, RefreshCw, Users, DollarSign, ShieldCheck, BarChart3, ClipboardList, Plus } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';
import { UserRole } from '../types';
import { Link, useLocation } from 'react-router';

interface NavItem {
  name: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number;
  adminOnly?: boolean;
  path?: string;
}

interface LeftSidebarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export function LeftSidebar({ currentRole, onRoleChange }: LeftSidebarProps) {
  const location = useLocation();
  
  const navItems: NavItem[] = currentRole === 'admin' 
    ? [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Products', icon: <Package size={18} />, active: location.pathname === '/' || location.pathname.startsWith('/product'), path: '/' },
        { name: 'Add Product', icon: <Plus size={18} />, active: location.pathname === '/products/new', path: '/products/new' },
        { name: 'Decorators', icon: <Printer size={18} />, active: location.pathname === '/decorators', path: '/decorators' },
        { name: 'APPA Sync', icon: <RefreshCw size={18} />, active: location.pathname === '/appa-sync', path: '/appa-sync' },
        { name: 'Users', icon: <Users size={18} />, active: location.pathname === '/users', path: '/users' },
      ]
    : currentRole === 'finance'
    ? [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Pricing Rules', icon: <DollarSign size={18} />, active: location.pathname === '/pricing-rules', path: '/pricing-rules' },
        { name: 'Margin Audit', icon: <ShieldCheck size={18} />, active: location.pathname === '/margin-audit', path: '/margin-audit' },
        { name: 'Reports', icon: <BarChart3 size={18} />, active: location.pathname === '/reports', path: '/reports' },
        { name: 'Settings', icon: <Settings size={18} />, active: location.pathname === '/settings', path: '/settings' },
      ]
    : currentRole === 'sales'
    ? [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Product Catalogue', icon: <Search size={18} />, active: location.pathname === '/' || location.pathname.startsWith('/product'), path: '/' },
        { name: 'My Proposals', icon: <ClipboardList size={18} />, active: location.pathname.startsWith('/proposals'), badge: 3, path: '/proposals' },
        { name: 'My Quotes', icon: <FileText size={18} />, active: location.pathname === '/quotes', path: '/quotes' },
      ]
    : [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Product Catalogue', icon: <Search size={18} />, active: location.pathname === '/' || location.pathname.startsWith('/product'), path: '/' },
        { name: 'My Proposals', icon: <ClipboardList size={18} />, active: location.pathname.startsWith('/proposals'), badge: 3, path: '/proposals' },
        { name: 'My Quotes', icon: <FileText size={18} />, active: location.pathname === '/quotes', path: '/quotes' },
      ];

  // Filter items based on role
  const visibleItems = navItems.filter(item => {
    if (item.adminOnly && currentRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <div 
      className="h-screen flex flex-col" 
      style={{ 
        width: '240px',
        backgroundColor: 'white',
        borderRight: '1px solid var(--jolly-border)'
      }}
    >
      {/* Logo / Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
        <h1 
          className="font-bold mb-0.5" 
          style={{ 
            color: 'var(--jolly-primary)',
            fontSize: '20px',
            fontWeight: 700,
            lineHeight: '1.2'
          }}
        >
          Jolly Catalogue
        </h1>
        <p 
          className="text-xs" 
          style={{ 
            color: 'var(--jolly-text-secondary)',
            fontSize: '13px'
          }}
        >
          {currentRole === 'admin' ? 'Catalogue Admin' : currentRole === 'finance' ? 'Finance Console' : currentRole === 'sales' ? 'Sales Console' : 'Product Management'}
        </p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.name}
            to={item.path || '/'}
            className="w-full flex items-center gap-3 px-3 rounded transition-colors"
            style={{
              backgroundColor: item.active ? 'var(--jolly-primary)' : 'transparent',
              color: item.active ? 'white' : 'var(--jolly-text-body)',
              height: '40px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'flex'
            }}
            onMouseEnter={(e) => {
              if (!item.active) {
                e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
              }
            }}
            onMouseLeave={(e) => {
              if (!item.active) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {item.icon}
            <span 
              className="flex-1 text-left" 
              style={{ 
                fontSize: '14px',
                fontWeight: item.active ? 600 : 500
              }}
            >
              {item.name}
            </span>
            {item.badge && (
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center"
                style={{
                  backgroundColor: item.active ? 'rgba(255,255,255,0.25)' : 'var(--jolly-primary)',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Role Switcher */}
      <div className="px-3 pb-3 border-t pt-3" style={{ borderColor: 'var(--jolly-border)' }}>
        <RoleSwitcher currentRole={currentRole} onRoleChange={onRoleChange} />
      </div>

      {/* User Info */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" 
            style={{ backgroundColor: 'var(--jolly-surface)' }}
          >
            <User size={18} style={{ color: 'var(--jolly-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p 
              className="text-sm font-semibold truncate" 
              style={{ color: 'var(--jolly-text-body)' }}
            >
              Sarah Mitchell
            </p>
          </div>
          <button className="p-1.5 hover:bg-gray-50 rounded flex-shrink-0">
            <Settings size={16} style={{ color: 'var(--jolly-text-disabled)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}