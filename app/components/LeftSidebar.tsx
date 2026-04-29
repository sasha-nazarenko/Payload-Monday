import { LayoutDashboard, Search, FileText, Settings, User, Package, Printer, DollarSign, ShieldCheck, BarChart3, ClipboardList, ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react';
import { UserRole } from '../types';
import { Link, useLocation } from 'react-router';
import { useState, useEffect } from 'react';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'jolly-sidebar-collapsed';

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
}

export function LeftSidebar({ currentRole }: LeftSidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setIsMobileOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const navItems: NavItem[] = currentRole === 'admin'
    ? [
        { name: 'Catalogue health', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Products', icon: <Package size={18} />, active: location.pathname === '/' || location.pathname.startsWith('/product'), path: '/' },
        { name: 'My Proposals', icon: <ClipboardList size={18} />, active: location.pathname.startsWith('/proposals'), badge: 3, path: '/proposals' },
        { name: 'Decorators', icon: <Printer size={18} />, active: location.pathname === '/decorators', path: '/decorators' },
        { name: 'Settings', icon: <Settings size={18} />, active: location.pathname === '/settings', path: '/settings' },
      ]
    : currentRole === 'finance'
    ? [
        { name: 'Catalogue health', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Pricing Rules', icon: <DollarSign size={18} />, active: location.pathname === '/pricing-rules', path: '/pricing-rules' },
        { name: 'Margin Audit', icon: <ShieldCheck size={18} />, active: location.pathname === '/margin-audit', path: '/margin-audit' },
        { name: 'Reports', icon: <BarChart3 size={18} />, active: location.pathname === '/reports', path: '/reports' },
        { name: 'Settings', icon: <Settings size={18} />, active: location.pathname === '/settings', path: '/settings' },
      ]
    : currentRole === 'sales'
    ? [
        { name: 'Catalogue health', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Product Catalogue', icon: <Search size={18} />, active: location.pathname === '/' || location.pathname.startsWith('/product'), path: '/' },
        { name: 'My Proposals', icon: <ClipboardList size={18} />, active: location.pathname.startsWith('/proposals'), badge: 3, path: '/proposals' },
        { name: 'My Quotes', icon: <FileText size={18} />, active: location.pathname === '/quotes', path: '/quotes' },
      ]
    : [
        { name: 'Catalogue health', icon: <LayoutDashboard size={18} />, active: location.pathname === '/dashboard', path: '/dashboard' },
        { name: 'Product Catalogue', icon: <Search size={18} />, active: location.pathname === '/' || location.pathname.startsWith('/product'), path: '/' },
        { name: 'My Proposals', icon: <ClipboardList size={18} />, active: location.pathname.startsWith('/proposals'), badge: 3, path: '/proposals' },
        { name: 'My Quotes', icon: <FileText size={18} />, active: location.pathname === '/quotes', path: '/quotes' },
      ];

  const visibleItems = navItems.filter(item => !(item.adminOnly && currentRole !== 'admin'));

  const collapsed = !isMobile && isCollapsed;
  const sidebarWidth = collapsed ? 64 : 240;

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100dvh',
        width: 240,
        zIndex: 50,
        backgroundColor: 'white',
        borderRight: '1px solid var(--jolly-border)',
        transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100vh',
        backgroundColor: 'white',
        borderRight: '1px solid var(--jolly-border)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      };

  const NavLink = ({ item }: { item: NavItem }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    return (
      <div style={{ position: 'relative' }}>
        <Link
          to={item.path || '/'}
          aria-current={item.active ? 'page' : undefined}
          className="w-full flex items-center rounded transition-colors"
          style={{
            gap: collapsed ? 0 : '12px',
            padding: collapsed ? '0' : '0 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            backgroundColor: item.active ? 'var(--jolly-primary)' : 'transparent',
            color: item.active ? 'white' : 'var(--jolly-text-body)',
            height: '40px',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'flex',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (!item.active) e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
            if (collapsed) setShowTooltip(true);
          }}
          onMouseLeave={(e) => {
            if (!item.active) e.currentTarget.style.backgroundColor = 'transparent';
            setShowTooltip(false);
          }}
        >
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
          {!collapsed && (
            <span className="flex-1 text-left" style={{ fontSize: '14px', fontWeight: item.active ? 600 : 500 }}>
              {item.name}
            </span>
          )}
          {!collapsed && item.badge && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center"
              style={{
                backgroundColor: item.active ? 'rgba(255,255,255,0.25)' : 'var(--jolly-primary)',
                color: 'white',
                fontSize: '12px',
              }}
            >
              {item.badge}
            </span>
          )}
          {collapsed && item.badge && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--jolly-primary)',
              }}
            />
          )}
        </Link>
        {/* Tooltip for collapsed desktop */}
        {collapsed && showTooltip && (
          <div
            style={{
              position: 'absolute',
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginLeft: '8px',
              backgroundColor: 'var(--jolly-text-body)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '5px',
              fontSize: '13px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            {item.name}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            zIndex: 49,
          }}
        />
      )}

      {/* Mobile hamburger button (shown when drawer is closed) */}
      {isMobile && !isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open navigation menu"
          style={{
            position: 'fixed',
            top: '14px',
            left: '14px',
            zIndex: 48,
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: 'white',
            border: '1px solid var(--jolly-border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Menu size={18} style={{ color: 'var(--jolly-text-body)' }} />
        </button>
      )}

      {/* Sidebar panel */}
      <div style={sidebarStyle}>

        {/* Header */}
        <div
          className="border-b"
          style={{
            borderColor: 'var(--jolly-border)',
            padding: collapsed ? '16px 0' : '16px 20px 16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: 'var(--jolly-primary)', fontSize: '20px', fontWeight: 700, lineHeight: '1.2', margin: 0 }}>
                Jolly Catalogue
              </h1>
              <p style={{ color: 'var(--jolly-text-secondary)', fontSize: '13px', margin: '2px 0 0' }}>
                {currentRole === 'admin' ? 'Catalogue Admin' : currentRole === 'finance' ? 'Finance Console' : currentRole === 'sales' ? 'Sales Console' : 'Product Management'}
              </p>
            </div>
          )}

          {/* Desktop collapse toggle */}
          {!isMobile && (
            <button
              type="button"
              aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              onClick={() => setIsCollapsed(prev => !prev)}
              style={{
                border: '1px solid var(--jolly-border)',
                background: 'white',
                cursor: 'pointer',
                borderRadius: '6px',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          )}

          {/* Mobile close button */}
          {isMobile && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setIsMobileOpen(false)}
              style={{
                border: '1px solid var(--jolly-border)',
                background: 'white',
                cursor: 'pointer',
                borderRadius: '6px',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav
          className="flex-1"
          aria-label="Primary navigation"
          style={{ padding: collapsed ? '12px 8px' : '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}
        >
          {visibleItems.map(item => <NavLink key={item.name} item={item} />)}
        </nav>

        {/* User Info */}
        <div style={{ padding: collapsed ? '8px' : '8px 12px 16px', borderTop: `1px solid var(--jolly-border)` }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : '12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '8px 0' : '8px 12px',
              borderRadius: '6px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--jolly-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={18} style={{ color: 'var(--jolly-primary)' }} />
            </div>
            {!collapsed && (
              <>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  Sarah Mitchell
                </p>
                <button style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
                  <Settings size={16} style={{ color: 'var(--jolly-text-disabled)' }} />
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  );
}