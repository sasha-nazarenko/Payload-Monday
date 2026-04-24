import { UserRole, UserRoleInfo } from '../types';
import { Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const roleInfo: Record<UserRole, UserRoleInfo> = {
  sales: {
    role: 'sales',
    label: 'Sales Rep',
    description: 'View products, pricing, and create quotes',
    permissions: ['view_products', 'view_pricing', 'create_quotes']
  },
  designer: {
    role: 'designer',
    label: 'Graphic Designer',
    description: 'View decoration specs and download assets',
    permissions: ['view_products', 'view_decoration', 'download_assets']
  },
  finance: {
    role: 'finance',
    label: 'Finance Manager',
    description: 'Control pricing, margins, and audit data',
    permissions: ['view_products', 'view_pricing', 'edit_pricing', 'audit']
  },
  admin: {
    role: 'admin',
    label: 'Catalogue Admin',
    description: 'Full access to manage all product data',
    permissions: ['all']
  }
};

const roleLandingPage: Record<UserRole, string> = {
  sales: '/proposals',
  designer: '/',
  finance: '/dashboard',
  admin: '/dashboard',
};

export function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // stage-1 preview supports sales + admin.
  const isStagePreview = true;
  const selectableRoles = isStagePreview
    ? (['sales', 'admin'] as UserRole[])
    : (Object.keys(roleInfo) as UserRole[]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentRoleInfo = roleInfo[currentRole];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold" style={{ color: 'var(--jolly-text-body)' }}>View Mode</p>
          <p 
            className="text-xs mt-0.5 px-2 py-0.5 rounded inline-block"
            style={{ 
              backgroundColor: 'var(--jolly-surface)', 
              color: 'var(--jolly-primary)',
              fontWeight: 600
            }}
          >
            {currentRoleInfo.label}
          </p>
        </div>
        <ChevronDown 
          size={16} 
          style={{ color: 'var(--jolly-text-disabled)' }}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded shadow-lg border overflow-hidden"
          style={{ 
            borderColor: 'var(--jolly-border)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)'
          }}
        >
          {selectableRoles.map((roleKey) => {
            const role = roleInfo[roleKey];
            return (
            <button
              key={role.role}
              onClick={() => {
                onRoleChange(role.role);
                setIsOpen(false);
                navigate(roleLandingPage[role.role]);
              }}
              className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-start gap-2"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--jolly-text-body)' }}>
                    {role.label}
                  </p>
                  {currentRole === role.role && (
                    <Check size={14} style={{ color: 'var(--jolly-primary)' }} />
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--jolly-text-secondary)' }}>
                  {role.description}
                </p>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}