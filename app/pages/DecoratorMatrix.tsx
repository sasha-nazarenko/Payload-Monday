import { useState, useMemo, useEffect } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { AddDecoratorModal } from '../components/AddDecoratorModal';
import { useRole } from '../context/RoleContext';
import { useDecoratorReview } from '../context/DecoratorReviewContext';
import {
  INITIAL_DECORATORS,
  type Decorator,
  type DecorationMethod,
  type DecoratorStatus,
} from '../data/decoratorsSeed';
import {
  getDecoratorReviewState,
  computeNextReviewDueDisplay,
  type ReviewFrequencyMonths,
} from '../utils/decoratorReview';
import { PricingMatrix } from '../components/decorator/PricingMatrix';
import { getDecoratorPricing, DecoratorPricingData } from '../data/pricingMatrixStore';
import {
  Plus,
  Search,
  ChevronDown,
  Star,
  MapPin,
  Clock,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Phone,
  Mail,
  Globe,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Printer,
  Palette,
  Stamp,
  Layers,
  Zap,
  RefreshCw,
  Grid,
  CalendarClock,
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<DecoratorStatus, { bg: string; text: string; dot: string }> = {
  Active: { bg: '#E8F5E9', text: '#217346', dot: '#217346' },
  Onboarding: { bg: '#EBF3FB', text: '#1F5C9E', dot: '#1F5C9E' },
  Inactive: { bg: '#F2F2F2', text: '#888888', dot: '#888888' },
  Suspended: { bg: '#FFEBEE', text: '#C0392B', dot: '#C0392B' },
};

const methodIcons: Record<string, React.ReactNode> = {
  'Screen Print': <Printer size={11} />,
  'Embroidery': <Layers size={11} />,
  'DTG': <Palette size={11} />,
  'Laser Engrave': <Zap size={11} />,
  'Pad Print': <Stamp size={11} />,
  'Sublimation': <Palette size={11} />,
  'Deboss': <Stamp size={11} />,
  'UV Print': <Zap size={11} />,
  'Heat Transfer': <Printer size={11} />,
};

const priceLevelConfig: Record<string, { bg: string; text: string }> = {
  Budget: { bg: '#E8F5E9', text: '#217346' },
  Standard: { bg: '#EBF3FB', text: '#1F5C9E' },
  Premium: { bg: '#FFF8E1', text: '#7B5800' },
};

const allStatuses = ['All', 'Active', 'Onboarding', 'Inactive', 'Suspended'];
const allMethods = ['All Methods','Screen Print','Embroidery','DTG','Laser Engrave','Pad Print','Sublimation','Deboss','UV Print','Heat Transfer'];
const allStates = ['All States','VIC','NSW','QLD','SA','WA','TAS','NT','ACT'];

// ─── Shared sub-components ────────────────────────────────────────────────────

function SourceBadge({ isAppaLinked, appaLastSync, size = 'sm' }: { isAppaLinked: boolean; appaLastSync?: string; size?: 'sm' | 'md' }) {
  const p = size === 'md' ? '3px 10px' : '2px 7px';
  const fs = size === 'md' ? '11px' : '10px';
  if (isAppaLinked) {
    return (
      <span
        title={`Pricing synced from APPA — last sync ${appaLastSync ?? '—'}. Manual edits will be overwritten on next sync.`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: fs, fontWeight: 700, backgroundColor: '#EBF3FB', color: 'var(--jolly-primary)', border: '1px solid #BFDBF7', borderRadius: '10px', padding: p, whiteSpace: 'nowrap', cursor: 'help' }}
      >
        <RefreshCw size={size === 'md' ? 11 : 9} />
        APPA Synced
      </span>
    );
  }
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: fs, fontWeight: 700, backgroundColor: 'var(--jolly-bg)', color: 'var(--jolly-text-disabled)', border: '1px solid var(--jolly-border)', borderRadius: '10px', padding: p, whiteSpace: 'nowrap' }}
    >
      Manual
    </span>
  );
}

function StatusBadge({ status }: { status: DecoratorStatus }) {
  const cfg = statusConfig[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, backgroundColor: cfg.bg, color: cfg.text, borderRadius: '12px', whiteSpace: 'nowrap' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function QualityStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={12} fill={i < full ? '#F59E0B' : 'none'} stroke={i < full || (i === full && hasHalf) ? '#F59E0B' : '#DCDFE6'} />
        ))}
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{rating.toFixed(1)}</span>
    </div>
  );
}

function MethodBadge({ method, isPreferred }: { method: DecorationMethod; isPreferred: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', fontSize: '11px', fontWeight: 600, backgroundColor: isPreferred ? 'var(--jolly-primary)' : 'var(--jolly-surface)', color: isPreferred ? 'white' : 'var(--jolly-primary)', borderRadius: '4px', whiteSpace: 'nowrap', border: isPreferred ? 'none' : '1px solid var(--jolly-accent)' }}>
      {methodIcons[method]}{method}{isPreferred && <Star size={9} fill="white" stroke="white" />}
    </span>
  );
}

function KpiCard({ label, value, color, sub, icon }: { label: string; value: number | string; color: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid var(--jolly-border)', padding: '20px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
        <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'var(--jolly-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
      <p style={{ fontSize: '28px', fontWeight: 700, color, lineHeight: '1.1', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', marginTop: '4px', marginBottom: 0 }}>{sub}</p>}
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 14px', borderRadius: '6px', border: '1px solid var(--jolly-border)', backgroundColor: 'white', fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {label}: {value} <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--jolly-border)', minWidth: '180px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 40, padding: '4px 0' }}>
            {options.map((opt) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px', fontWeight: value === opt ? 600 : 400, color: value === opt ? 'var(--jolly-primary)' : 'var(--jolly-text-body)', backgroundColor: value === opt ? 'var(--jolly-surface)' : 'transparent', border: 'none', cursor: 'pointer', display: 'block' }}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RowActions({ decorator, onOpenPricing }: { decorator: Decorator; onOpenPricing: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ width: '30px', height: '30px', borderRadius: '4px', border: '1px solid var(--jolly-border)', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoreHorizontal size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--jolly-border)', minWidth: '188px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 40, padding: '4px 0' }}>
            {[
              { icon: <Eye size={14} />, label: 'View Profile', color: 'var(--jolly-text-body)', action: () => setOpen(false) },
              { icon: <Grid size={14} />, label: 'Edit Pricing Matrix', color: 'var(--jolly-primary)', action: () => { setOpen(false); onOpenPricing(); } },
              { icon: <Pencil size={14} />, label: 'Edit Decorator', color: 'var(--jolly-text-body)', action: () => setOpen(false) },
              { icon: <Copy size={14} />, label: 'Duplicate', color: 'var(--jolly-text-body)', action: () => setOpen(false) },
              null,
              { icon: <Trash2 size={14} />, label: decorator.status === 'Suspended' ? 'Reactivate' : 'Suspend', color: decorator.status === 'Suspended' ? 'var(--jolly-success)' : 'var(--jolly-destructive)', action: () => setOpen(false) },
            ].map((item, i) =>
              item === null ? (
                <div key={`sep-${i}`} style={{ height: '1px', backgroundColor: 'var(--jolly-border)', margin: '4px 0' }} />
              ) : (
                <button key={item.label} onClick={item.action} style={{ width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: '13px', fontWeight: 500, color: item.color, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.icon} {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Decorator Drawer (tabbed, 780px) ─────────────────────────────────────────

type DrawerTab = 'profile' | 'pricing';

function DecoratorDrawer({
  decorator, onClose, initialTab = 'profile',
}: {
  decorator: Decorator; onClose: () => void; initialTab?: DrawerTab;
}) {
  const { updateReview } = useDecoratorReview();
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);
  const [pricingData, setPricingData] = useState<DecoratorPricingData | null>(() =>
    getDecoratorPricing(decorator.name),
  );
  const [editFrequency, setEditFrequency] = useState<ReviewFrequencyMonths>(
    decorator.reviewFrequencyMonths ?? 12,
  );
  const [editLastReviewed, setEditLastReviewed] = useState<string>(
    decorator.lastReviewedDate ?? '',
  );
  const [reviewSaved, setReviewSaved] = useState(false);

  useEffect(() => {
    setEditFrequency(decorator.reviewFrequencyMonths ?? 12);
    setEditLastReviewed(decorator.lastReviewedDate ?? '');
    setReviewSaved(false);
  }, [decorator.id, decorator.reviewFrequencyMonths, decorator.lastReviewedDate]);

  const reviewState = getDecoratorReviewState(
    decorator.isAppaLinked,
    editLastReviewed || undefined,
    editFrequency,
  );
  const nextReviewDate = computeNextReviewDueDisplay(
    editLastReviewed || undefined,
    editFrequency,
  );

  const tabBtn = (tab: DrawerTab, label: React.ReactNode): React.CSSProperties => ({
    padding: '10px 22px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: activeTab === tab ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
    borderBottom: activeTab === tab ? '2px solid var(--jolly-primary)' : '2px solid transparent',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  });

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '800px', backgroundColor: 'white', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', borderLeft: '1px solid var(--jolly-border)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--jolly-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'var(--jolly-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--jolly-primary)', flexShrink: 0 }}>
              {decorator.code}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: 0 }}>{decorator.name}</h2>
                <SourceBadge isAppaLinked={decorator.isAppaLinked} appaLastSync={decorator.appaLastSync} size="md" />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', margin: 0 }}>
                {decorator.code} · {decorator.location}, {decorator.state} · {decorator.priceLevel} pricing
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--jolly-border)', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'var(--jolly-text-secondary)', flexShrink: 0 }}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--jolly-border)', backgroundColor: 'var(--jolly-bg)', flexShrink: 0 }}>
          <button style={tabBtn('profile', null)} onClick={() => setActiveTab('profile')}>
            Profile & Operations
          </button>
          <button style={tabBtn('pricing', null)} onClick={() => setActiveTab('pricing')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Grid size={13} />
              Pricing Matrix
              {pricingData && (
                <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'var(--jolly-primary)', color: 'white', borderRadius: '8px', padding: '1px 6px' }}>
                  {pricingData.rows.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <StatusBadge status={decorator.status} />
                <span style={{ fontSize: '12px', fontWeight: 600, backgroundColor: priceLevelConfig[decorator.priceLevel].bg, color: priceLevelConfig[decorator.priceLevel].text, borderRadius: '4px', padding: '4px 10px' }}>
                  {decorator.priceLevel}
                </span>
                <QualityStars rating={decorator.qualityRating} />
              </div>

              {/* Contact */}
              <div style={{ padding: '16px', border: '1px solid var(--jolly-border)', borderRadius: '6px', backgroundColor: 'var(--jolly-bg)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', marginTop: 0 }}>Contact</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--jolly-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--jolly-primary)' }}>{decorator.contactName.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', margin: 0 }}>{decorator.contactName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}>Primary Contact</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
                    <a href={`mailto:${decorator.contactEmail}`} style={{ fontSize: '13px', color: 'var(--jolly-primary)', textDecoration: 'none' }}>{decorator.contactEmail}</a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
                    <span style={{ fontSize: '13px', color: 'var(--jolly-text-body)' }}>{decorator.contactPhone}</span>
                  </div>
                  {decorator.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
                      <a href={`https://${decorator.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--jolly-primary)', textDecoration: 'none' }}>{decorator.website}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Methods */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', marginTop: 0 }}>Decoration Methods</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {decorator.methods.map(m => <MethodBadge key={m} method={m} isPreferred={decorator.preferredFor.includes(m)} />)}
                </div>
              </div>

              {/* Categories */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', marginTop: 0 }}>Product Categories</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {decorator.productCategories.map(c => (
                    <span key={c} style={{ fontSize: '12px', fontWeight: 500, backgroundColor: 'var(--jolly-row-alt)', color: 'var(--jolly-text-body)', borderRadius: '4px', border: '1px solid var(--jolly-border)', padding: '4px 10px' }}>{c}</span>
                  ))}
                </div>
              </div>

              {/* Ops grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Min Order', value: `${decorator.minOrder} units` },
                  { label: 'Avg Lead Time', value: `${decorator.avgLeadDays} days` },
                  { label: 'Rush Available', value: decorator.rushAvailable ? `Yes (${decorator.rushLeadDays}d)` : 'No' },
                  { label: 'On-Time Rate', value: `${decorator.onTimeRate}%` },
                  { label: 'Total Orders', value: decorator.totalOrders.toString() },
                  { label: 'Last Order', value: decorator.lastOrderDate },
                ].map(item => (
                  <div key={item.label} style={{ padding: '12px', border: '1px solid var(--jolly-border)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', marginTop: 0 }}>{item.label}</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {decorator.notes && (
                <div style={{ padding: '14px', backgroundColor: 'var(--jolly-warning-bg)', border: '1px solid #F0E0A0', borderRadius: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--jolly-warning)', marginTop: '1px', flexShrink: 0 }} />
                  <p style={{ fontSize: '13px', color: 'var(--jolly-warning)', fontWeight: 500, margin: 0 }}>{decorator.notes}</p>
                </div>
              )}

              {/* Pricing CTA */}
              <div
                onClick={() => setActiveTab('pricing')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--jolly-surface)', border: '1px solid var(--jolly-border)', borderRadius: '6px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Grid size={20} style={{ color: 'var(--jolly-primary)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--jolly-primary)', margin: '0 0 2px' }}>Pricing Matrix</p>
                    <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}>
                      {pricingData
                        ? `${pricingData.rows.length} decoration type${pricingData.rows.length !== 1 ? 's' : ''} · ${pricingData.tiers.length} qty tiers · Updated ${pricingData.lastUpdated}`
                        : 'No pricing configured yet — click to set up'}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-primary)' }}>Open →</span>
              </div>

              {/* Pricing review cadence */}
              <div style={{ padding: '14px', border: '1px solid var(--jolly-border)', borderRadius: '6px', backgroundColor: 'white' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  Pricing Review
                </p>
                {decorator.isAppaLinked ? (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                    Pricing is synced from APPA — no manual review needed.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div>
                        <label htmlFor={`rev-freq-${decorator.id}`} style={{ display: 'block', margin: '0 0 4px', fontSize: '11px', color: 'var(--jolly-text-disabled)' }}>Review frequency</label>
                        <select
                          id={`rev-freq-${decorator.id}`}
                          value={editFrequency}
                          onChange={(e) => setEditFrequency(Number(e.target.value) as ReviewFrequencyMonths)}
                          style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--jolly-border)', padding: '0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)', backgroundColor: 'white' }}
                        >
                          <option value={6}>Every 6 months</option>
                          <option value={12}>Every 12 months</option>
                          <option value={24}>Every 24 months</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`rev-last-${decorator.id}`} style={{ display: 'block', margin: '0 0 4px', fontSize: '11px', color: 'var(--jolly-text-disabled)' }}>Last reviewed</label>
                        <input
                          id={`rev-last-${decorator.id}`}
                          type="date"
                          value={editLastReviewed}
                          onChange={(e) => setEditLastReviewed(e.target.value)}
                          style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--jolly-border)', padding: '0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                        />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--jolly-text-disabled)' }}>Next review due</p>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{nextReviewDate}</p>
                      </div>
                    </div>
                    {reviewState && (
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: reviewState.color, backgroundColor: reviewState.bg, border: `1px solid ${reviewState.color}33`, borderRadius: '999px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarClock size={12} />
                          {reviewState.label}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          updateReview(decorator.id, {
                            reviewFrequencyMonths: editFrequency,
                            lastReviewedDate: editLastReviewed || undefined,
                          });
                          setReviewSaved(true);
                          window.setTimeout(() => setReviewSaved(false), 2000);
                        }}
                        style={{ height: '36px', padding: '0 16px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Save review dates
                      </button>
                      {reviewSaved && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-success)' }}>Saved</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PRICING TAB ── */}
          {activeTab === 'pricing' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: '0 0 4px' }}>
                    Pricing Matrix
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Set per-unit decoration costs by method and quantity tier.
                    These values are pulled automatically into any product that uses this decorator.
                  </p>
                </div>
                {decorator.isAppaLinked && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#EBF3FB', border: '1px solid #BFDBF7', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--jolly-primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <RefreshCw size={12} />
                    APPA-Synced · {decorator.appaLastSync}
                  </span>
                )}
              </div>

              {pricingData ? (
                <PricingMatrix
                  decoratorName={decorator.name}
                  data={pricingData}
                  onDataChange={setPricingData}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--jolly-text-disabled)' }}>
                  <Grid size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>No pricing data</p>
                  <p style={{ fontSize: '13px' }}>This decorator is not yet in the pricing store.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--jolly-border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button style={{ height: '36px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pencil size={14} /> Edit Profile
          </button>
          <button style={{ height: '36px', padding: '0 20px', borderRadius: '6px', border: '1px solid var(--jolly-border)', backgroundColor: 'white', color: 'var(--jolly-text-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> Contact
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DecoratorMatrix() {
  const { currentRole } = useRole();
  const { mergeReview } = useDecoratorReview();
  const [decorators, setDecorators] = useState<Decorator[]>(INITIAL_DECORATORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [stateFilter, setStateFilter] = useState('All States');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedDecorator, setSelectedDecorator] = useState<Decorator | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('profile');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleDecoratorCreated = (newDec: Decorator) => setDecorators(prev => [newDec, ...prev]);

  const mergedDecorators = useMemo(() => decorators.map(mergeReview), [decorators, mergeReview]);

  const filtered = mergedDecorators.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.location.toLowerCase().includes(q) || d.contactName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesMethod = methodFilter === 'All Methods' || d.methods.includes(methodFilter as DecorationMethod);
    const matchesState = stateFilter === 'All States' || d.state === stateFilter;
    return matchesSearch && matchesStatus && matchesMethod && matchesState;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'location': cmp = a.state.localeCompare(b.state); break;
      case 'quality': cmp = a.qualityRating - b.qualityRating; break;
      case 'lead': cmp = a.avgLeadDays - b.avgLeadDays; break;
      case 'onTime': cmp = a.onTimeRate - b.onTimeRate; break;
      case 'orders': cmp = a.totalOrders - b.totalOrders; break;
      default: cmp = 0;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const activeCount = mergedDecorators.filter(d => d.status === 'Active').length;
  const suspendedCount = mergedDecorators.filter(d => d.status === 'Suspended').length;
  const uniqueMethods = new Set(mergedDecorators.flatMap(d => d.methods)).size;
  const avgLead = Math.round(mergedDecorators.filter(d => d.status === 'Active').reduce((s, d) => s + d.avgLeadDays, 0) / (activeCount || 1));
  const appaCount = mergedDecorators.filter(d => d.isAppaLinked).length;
  const manualReviewDecorators = mergedDecorators.filter(d => !d.isAppaLinked);
  const overdueReviews = manualReviewDecorators.filter(
    d => getDecoratorReviewState(d.isAppaLinked, d.lastReviewedDate, d.reviewFrequencyMonths)?.label === 'Review overdue',
  ).length;
  const dueSoonReviews = manualReviewDecorators.filter(
    d => getDecoratorReviewState(d.isAppaLinked, d.lastReviewedDate, d.reviewFrequencyMonths)?.label === 'Review due soon',
  ).length;

  const sortableCols = ['name','location','lead','quality','onTime','orders','status'];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--jolly-bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <LeftSidebar currentRole={currentRole} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid var(--jolly-border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--jolly-text-body)', lineHeight: '1.2', margin: '0 0 4px' }}>Decorator Matrix</h1>
            <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)', margin: 0 }}>
              Manage decoration suppliers, rate cards, and product assignments.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} /> Add Decorator
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <KpiCard label="Total Decorators" value={decorators.length} color="var(--jolly-primary)" sub={`${activeCount} active`} icon={<Printer size={16} style={{ color: 'var(--jolly-primary)' }} />} />
            <KpiCard label="Methods Available" value={uniqueMethods} color="var(--jolly-primary)" sub="Across all suppliers" icon={<Palette size={16} style={{ color: 'var(--jolly-primary)' }} />} />
            <KpiCard label="APPA Pricing" value={appaCount} color="var(--jolly-primary)" sub={`${decorators.length - appaCount} manual`} icon={<RefreshCw size={16} style={{ color: 'var(--jolly-primary)' }} />} />
            <KpiCard label="Pricing Reviews" value={overdueReviews + dueSoonReviews} color={overdueReviews > 0 ? 'var(--jolly-destructive)' : 'var(--jolly-warning)'} sub={overdueReviews > 0 ? `${overdueReviews} overdue` : `${dueSoonReviews} due soon`} icon={<CalendarClock size={16} style={{ color: overdueReviews > 0 ? 'var(--jolly-destructive)' : 'var(--jolly-warning)' }} />} />
          </div>

          {suspendedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', backgroundColor: 'var(--jolly-destructive-bg)', border: '1px solid #F5C6C0', borderRadius: '6px', marginBottom: '16px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--jolly-destructive)', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-destructive)', flex: 1, margin: 0 }}>
                {suspendedCount} decorator{suspendedCount > 1 ? 's are' : ' is'} currently suspended. Products assigned to suspended decorators will fall back to alternative suppliers.
              </p>
              <button style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-destructive)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap', padding: 0 }}>
                Review →
              </button>
            </div>
          )}

          {/* Filters */}
          <div style={{ backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--jolly-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--jolly-text-disabled)' }} />
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, code, location, or contact…"
                style={{ width: '100%', height: '36px', border: '1px solid var(--jolly-border)', borderRadius: '6px', paddingLeft: '36px', paddingRight: '12px', fontSize: '14px', outline: 'none', backgroundColor: 'white', color: 'var(--jolly-text-body)', boxSizing: 'border-box' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--jolly-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(31,92,158,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--jolly-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
            <FilterDropdown label="Status" value={statusFilter} options={allStatuses} onChange={setStatusFilter} />
            <FilterDropdown label="Method" value={methodFilter} options={allMethods} onChange={setMethodFilter} />
            <FilterDropdown label="State" value={stateFilter} options={allStates} onChange={setStateFilter} />
          </div>

          {/* Table */}
          {sorted.length > 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--jolly-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                      {[
                        { key: 'name', label: 'Decorator' },
                        { key: 'location', label: 'Location' },
                        { key: 'source', label: 'Pricing' },
                        { key: 'methods', label: 'Methods' },
                        { key: 'lead', label: 'Lead Time' },
                        { key: 'quality', label: 'Quality' },
                        { key: 'onTime', label: 'On-Time' },
                        { key: 'orders', label: 'Orders' },
                        { key: 'status', label: 'Status' },
                        { key: 'actions', label: '' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => sortableCols.includes(col.key) && handleSort(col.key)}
                          style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: sortableCols.includes(col.key) ? 'pointer' : 'default', userSelect: 'none', borderBottom: '1px solid var(--jolly-border)' }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {col.label}
                            {sortableCols.includes(col.key) && <ArrowUpDown size={11} style={{ color: sortField === col.key ? 'var(--jolly-primary)' : 'var(--jolly-text-disabled)', opacity: sortField === col.key ? 1 : 0.5 }} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d, idx) => {
                      const reviewBadge = getDecoratorReviewState(
                        d.isAppaLinked,
                        d.lastReviewedDate,
                        d.reviewFrequencyMonths,
                      );
                      const isSuspended = d.status === 'Suspended';
                      const isInactive = d.status === 'Inactive';
                      const rowBg = idx % 2 === 0 ? '#FFFFFF' : 'var(--jolly-row-alt)';
                      return (
                        <tr
                          key={d.id}
                          onMouseEnter={() => setHoveredRow(d.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={() => { setDrawerTab('profile'); setSelectedDecorator(d); }}
                          style={{
                            borderTop: '1px solid var(--jolly-border)',
                            borderLeft: isSuspended ? '3px solid var(--jolly-destructive)' : d.status === 'Onboarding' ? '3px solid var(--jolly-primary)' : '3px solid transparent',
                            backgroundColor: hoveredRow === d.id ? 'var(--jolly-surface)' : rowBg,
                            opacity: isSuspended || isInactive ? 0.65 : 1,
                            transition: 'background-color 0.1s',
                            cursor: 'pointer',
                          }}
                        >
                          {/* Decorator */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'var(--jolly-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--jolly-primary)', flexShrink: 0 }}>{d.code}</div>
                              <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', lineHeight: '1.2', margin: 0 }}>{d.name}</p>
                                <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', marginTop: '2px', marginBottom: 0 }}>{d.contactName}</p>
                              </div>
                            </div>
                          </td>
                          {/* Location */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} style={{ color: 'var(--jolly-text-disabled)' }} />
                              <span style={{ fontSize: '13px', color: 'var(--jolly-text-body)' }}>{d.location}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', marginTop: '2px', marginBottom: 0 }}>{d.state}</p>
                          </td>
                          {/* Pricing source */}
                          <td style={{ padding: '12px 16px' }}>
                            <SourceBadge isAppaLinked={d.isAppaLinked} appaLastSync={d.appaLastSync} />
                            {!d.isAppaLinked && reviewBadge && (
                              <div style={{ marginTop: '5px' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: reviewBadge.color,
                                    backgroundColor: reviewBadge.bg,
                                    borderRadius: '10px',
                                    padding: '2px 6px',
                                    border: `1px solid ${reviewBadge.color}33`,
                                  }}
                                >
                                  {reviewBadge.label}
                                </span>
                              </div>
                            )}
                            {d.isAppaLinked && d.appaLastSync && (
                              <p style={{ fontSize: '10px', color: 'var(--jolly-text-disabled)', marginTop: '4px', marginBottom: 0, whiteSpace: 'nowrap' }}>{d.appaLastSync}</p>
                            )}
                          </td>
                          {/* Methods */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                              {d.methods.map(m => <MethodBadge key={m} method={m} isPreferred={d.preferredFor.includes(m)} />)}
                            </div>
                          </td>
                          {/* Lead */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} style={{ color: 'var(--jolly-text-disabled)' }} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: d.avgLeadDays > 14 ? 'var(--jolly-warning)' : 'var(--jolly-text-body)' }}>{d.avgLeadDays}d</span>
                            </div>
                            {d.rushAvailable && <p style={{ fontSize: '11px', color: 'var(--jolly-success)', marginTop: '2px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '2px' }}><Zap size={10} fill="currentColor" /> Rush {d.rushLeadDays}d</p>}
                          </td>
                          {/* Quality */}
                          <td style={{ padding: '12px 16px' }}><QualityStars rating={d.qualityRating} /></td>
                          {/* On-time */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: d.onTimeRate >= 90 ? 'var(--jolly-success)' : d.onTimeRate >= 80 ? 'var(--jolly-warning)' : 'var(--jolly-destructive)' }}>{d.onTimeRate}%</span>
                          </td>
                          {/* Orders */}
                          <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{d.totalOrders}</span></td>
                          {/* Status */}
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={d.status} /></td>
                          {/* Actions */}
                          <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                            <RowActions
                              decorator={d}
                              onOpenPricing={() => { setDrawerTab('pricing'); setSelectedDecorator(d); }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'white', borderRadius: '6px', border: '1px solid var(--jolly-border)', padding: '64px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-disabled)', margin: '0 0 8px' }}>No decorators match your filters</p>
              <button onClick={() => { setSearchQuery(''); setStatusFilter('All'); setMethodFilter('All Methods'); setStateFilter('All States'); }} style={{ fontSize: '13px', color: 'var(--jolly-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedDecorator && (
        <DecoratorDrawer
          key={selectedDecorator.id}
          decorator={selectedDecorator}
          onClose={() => setSelectedDecorator(null)}
          initialTab={drawerTab}
        />
      )}

      {showAddModal && (
        <AddDecoratorModal onClose={() => setShowAddModal(false)} onCreated={handleDecoratorCreated} />
      )}
    </div>
  );
}
