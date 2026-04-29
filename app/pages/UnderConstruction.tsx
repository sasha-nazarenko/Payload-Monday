import { useNavigate, useLocation } from 'react-router';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import { Wrench, ArrowLeft } from 'lucide-react';

export function UnderConstruction() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole } = useRole();

  return (
    <div
      className="flex h-screen"
      style={{
        backgroundColor: 'var(--jolly-bg)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <LeftSidebar currentRole={currentRole} />

      <div className="flex-1 overflow-auto flex items-center justify-center">
        <div className="flex flex-col items-center text-center px-8" style={{ maxWidth: '480px' }}>
          {/* Icon */}
          <div
            className="flex items-center justify-center"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              backgroundColor: 'var(--jolly-surface)',
              marginBottom: '24px',
            }}
          >
            <Wrench size={32} style={{ color: 'var(--jolly-primary)' }} />
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--jolly-text-body)',
              lineHeight: '1.3',
              marginBottom: '12px',
            }}
          >
            We're building this page
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '14px',
              color: 'var(--jolly-text-secondary)',
              lineHeight: '1.6',
              marginBottom: '32px',
            }}
          >
            This section is currently under development and will be available soon.
            Our team is working hard to bring you a polished experience.
          </p>

          {/* Go Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
            style={{
              height: '40px',
              padding: '0 24px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--jolly-primary)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>

          {/* Subtle meta */}
          <p
            style={{
              fontSize: '12px',
              color: 'var(--jolly-text-disabled)',
              marginTop: '40px',
            }}
          >
            Requested path: <code style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', backgroundColor: 'var(--jolly-surface)', padding: '2px 6px', borderRadius: '4px' }}>{location.pathname}</code>
          </p>
        </div>
      </div>
    </div>
  );
}