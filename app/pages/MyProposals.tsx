import { useState, type ReactNode } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import { Link } from 'react-router';
import { useNavigate } from 'react-router';
import { PayloadUIButton as Button } from '../components/ui/payload-button';
import {
  Plus,
  Search,
  ChevronDown,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink,
  RotateCcw,
  ShoppingCart,
  Mail,
  Eye,
  FileText,
  ClipboardList,
} from 'lucide-react';

// --- Types ---

type ProposalStatus = 'Design request' | 'Draft' | 'Sent' | 'Approved' | 'Won' | 'Lost' | 'Expired' | 'Finance Review';

interface Proposal {
  id: string;
  ref: string;
  client: string;
  event: string;
  productCount: number;
  unitCount: number;
  totalValue: number;
  margin: number;
  marginFloor: number;
  status: ProposalStatus;
  dueDate: string;
  dueDateObj: Date;
  hasProposalOnly: boolean;
  createdBy: string;
}

type SortField = 'ref' | 'client' | 'event' | 'totalValue' | 'margin' | 'status' | 'dueDateObj';
type SortDirection = 'asc' | 'desc';

// --- Mock Data ---

const today = new Date(2026, 2, 13); // March 13, 2026

const proposals: Proposal[] = [
  {
    id: 'PRO-2024-0087',
    ref: 'PRO-2024-0087',
    client: 'Apex Financial',
    event: 'Q1 Staff Welcome Kit',
    productCount: 4,
    unitCount: 950,
    totalValue: 6820.0,
    margin: 38.2,
    marginFloor: 25,
    status: 'Draft',
    dueDate: 'Mar 20',
    dueDateObj: new Date(2026, 2, 20),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0086',
    ref: 'PRO-2024-0086',
    client: 'Bright Futures NGO',
    event: 'Volunteer Recognition',
    productCount: 2,
    unitCount: 200,
    totalValue: 2140.0,
    margin: 41.5,
    marginFloor: 25,
    status: 'Sent',
    dueDate: 'Mar 15',
    dueDateObj: new Date(2026, 2, 15),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0085',
    ref: 'PRO-2024-0085',
    client: 'Apex Financial',
    event: 'Christmas Gifting 2024',
    productCount: 6,
    unitCount: 1500,
    totalValue: 14200.0,
    margin: 22,
    marginFloor: 25,
    status: 'Finance Review',
    dueDate: 'Mar 18',
    dueDateObj: new Date(2026, 2, 18),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0084',
    ref: 'PRO-2024-0084',
    client: 'GreenCo Sustainability',
    event: 'Earth Day Event',
    productCount: 3,
    unitCount: 400,
    totalValue: 3960.0,
    margin: 36,
    marginFloor: 25,
    status: 'Won',
    dueDate: 'Mar 10',
    dueDateObj: new Date(2026, 2, 10),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0083',
    ref: 'PRO-2024-0083',
    client: 'Harbour Bridge Corp',
    event: 'ANZAC Day Pack',
    productCount: 5,
    unitCount: 800,
    totalValue: 9100.0,
    margin: 31,
    marginFloor: 25,
    status: 'Expired',
    dueDate: 'Feb 28',
    dueDateObj: new Date(2026, 1, 28),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0082',
    ref: 'PRO-2024-0082',
    client: 'TechVenture Labs',
    event: 'Hackathon Swag Packs',
    productCount: 7,
    unitCount: 350,
    totalValue: 5480.0,
    margin: 44.1,
    marginFloor: 25,
    status: 'Approved',
    dueDate: 'Mar 22',
    dueDateObj: new Date(2026, 2, 22),
    hasProposalOnly: true,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0081',
    ref: 'PRO-2024-0081',
    client: 'Metro City Council',
    event: 'Clean-up Day 2026',
    productCount: 3,
    unitCount: 600,
    totalValue: 4200.0,
    margin: 33.8,
    marginFloor: 25,
    status: 'Sent',
    dueDate: 'Mar 25',
    dueDateObj: new Date(2026, 2, 25),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0080',
    ref: 'PRO-2024-0080',
    client: 'Solaris Energy',
    event: 'Trade Show Melbourne',
    productCount: 8,
    unitCount: 1200,
    totalValue: 18750.0,
    margin: 29.4,
    marginFloor: 25,
    status: 'Won',
    dueDate: 'Mar 5',
    dueDateObj: new Date(2026, 2, 5),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0079',
    ref: 'PRO-2024-0079',
    client: 'BluePeak Insurance',
    event: 'Employee Onboarding Kit',
    productCount: 4,
    unitCount: 150,
    totalValue: 1890.0,
    margin: 37.2,
    marginFloor: 25,
    status: 'Draft',
    dueDate: 'Mar 28',
    dueDateObj: new Date(2026, 2, 28),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
  {
    id: 'PRO-2024-0078',
    ref: 'PRO-2024-0078',
    client: 'Coral Health Group',
    event: 'Nurses Week Appreciation',
    productCount: 5,
    unitCount: 500,
    totalValue: 7340.0,
    margin: 18.5,
    marginFloor: 25,
    status: 'Finance Review',
    dueDate: 'Mar 16',
    dueDateObj: new Date(2026, 2, 16),
    hasProposalOnly: false,
    createdBy: 'Sasha N.',
  },
];

const statusConfig: Record<ProposalStatus, { bg: string; text: string; borderColor?: string }> = {
  'Design request': { bg: '#F3E8FF', text: '#7C3AED' },
  Draft: { bg: '#F2F2F2', text: '#888888' },
  Sent: { bg: '#EBF3FB', text: '#1F5C9E' },
  Approved: { bg: '#E8F5E9', text: '#217346' },
  Won: { bg: '#E8F5E9', text: '#217346' },
  Lost: { bg: '#FFEBEE', text: '#C0392B' },
  Expired: { bg: '#F2F2F2', text: '#888888' },
  'Finance Review': { bg: '#FFF8E1', text: '#7B5800', borderColor: '#F0E0A0' },
};

const allStatusFilters = ['All', 'Design request', 'Draft', 'Sent', 'Approved', 'Won', 'Lost', 'Expired', 'Finance Review'];

// --- Helpers ---

function isDueNear(dueDate: Date): boolean {
  const diff = dueDate.getTime() - today.getTime();
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function isPast(dueDate: Date): boolean {
  return dueDate.getTime() < today.getTime();
}

// --- KPI Card ---

function KpiCard({
  label,
  value,
  color,
  sub,
  accentBorder,
}: {
  label: string;
  value: number | string;
  color: string;
  sub?: string;
  accentBorder?: boolean;
}) {
  return (
    <div
      className="flex-1 bg-white rounded p-5"
      style={{
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        border: '1px solid var(--jolly-border)',
        borderLeft: accentBorder ? `3px solid #7B5800` : '1px solid var(--jolly-border)',
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--jolly-text-disabled)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px',
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 700, color, lineHeight: '1.1' }}>{value}</p>
      {sub && (
        <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', marginTop: '4px' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// --- StatusBadge ---

function StatusBadge({ status }: { status: ProposalStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full"
      style={{
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: cfg.borderColor ? `1px solid ${cfg.borderColor}` : 'none',
        borderRadius: '12px',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// --- Main Component ---

export function MyProposals() {
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('This month');
  const [myOnly, setMyOnly] = useState(true);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('dueDateObj');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter proposals
  const filtered = proposals.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.event.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    if (sortBy === 'totalValue' || sortBy === 'margin') {
      return (a[sortBy] - b[sortBy]) * direction;
    }

    if (sortBy === 'dueDateObj') {
      return (a.dueDateObj.getTime() - b.dueDateObj.getTime()) * direction;
    }

    return String(a[sortBy]).localeCompare(String(b[sortBy])) * direction;
  });

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDirection('asc');
  }

  function getAriaSort(field: SortField): 'ascending' | 'descending' | 'none' {
    if (sortBy !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  const pendingApprovalCount = proposals.filter((p) => p.status === 'Finance Review').length;
  const proposalOnlyCount = proposals.filter((p) => p.hasProposalOnly).length;
  const wonThisMonth = proposals.filter((p) => p.status === 'Won');
  const wonValue = wonThisMonth.reduce((s, p) => s + p.totalValue, 0);

  return (
    <div
      className="flex h-screen payload-sales-root payload-project-screen projects-list-screen"
      style={{ backgroundColor: 'var(--jolly-bg)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <LeftSidebar currentRole={currentRole} />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden projects-list-main">
        {/* TOP BAR */}
        <div
          className="projects-list-header bg-white border-b px-8 py-5 flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--jolly-border)' }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--jolly-text-body)',
                lineHeight: '1.2',
                margin: 0,
              }}
            >
              My Proposals
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
              Manage and track your active client proposals.
            </p>
          </div>
          <div className="flex items-center gap-2 projects-list-header-actions">
            <Button buttonStyle="secondary" size="small" onClick={() => navigate('/proposals/design-request/new')}>
              <span className="inline-flex items-center gap-2"><Plus size={15} /> New Design Request</span>
            </Button>
            <Button buttonStyle="primary" size="small" onClick={() => navigate('/proposals/new')}>
              <span className="inline-flex items-center gap-2"><Plus size={15} /> New Proposal</span>
            </Button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 min-h-0 overflow-auto px-8 py-6 projects-list-content">
          {/* KPI ROW */}
          <div className="flex gap-4 mb-6 proposals-kpi-row">
            <KpiCard label="Active Proposals" value={12} color="var(--jolly-primary)" />
            <KpiCard
              label="Awaiting Response"
              value={5}
              color="#7B5800"
              sub="Sent to client"
            />
            <KpiCard
              label="Due This Week"
              value={3}
              color="var(--jolly-destructive)"
              sub="Need attention"
            />
            <KpiCard
              label="Won (this month)"
              value={7}
              color="var(--jolly-success)"
              sub={`$${wonValue > 0 ? wonValue.toLocaleString() : '48,200'} value`}
            />
            <KpiCard
              label="Pending Approval"
              value={pendingApprovalCount}
              color="#7B5800"
              sub="Finance review needed"
              accentBorder
            />
          </div>

          {/* CALLOUT BANNERS */}
          {pendingApprovalCount > 0 && (
            <div
              className="proposals-warning-banner flex items-start gap-3 p-4 rounded mb-3"
              style={{
                backgroundColor: 'var(--jolly-warning-bg)',
                border: '1px solid #F0E0A0',
                borderRadius: '6px',
              }}
            >
              <AlertTriangle
                size={16}
                style={{ color: 'var(--jolly-warning)', flexShrink: 0, marginTop: '1px' }}
              />
              <div className="flex-1">
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-warning)' }}>
                  {pendingApprovalCount} proposals contain line items below the margin floor and
                  require Finance approval before they can be sent to clients.
                </p>
              </div>
              <button
                className="flex items-center gap-1 flex-shrink-0"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--jolly-warning)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                  padding: 0,
                }}
              >
                Review with Finance →
              </button>
            </div>
          )}

          {proposalOnlyCount > 0 && (
            <div
              className="proposals-info-banner flex items-start gap-3 p-4 rounded mb-4"
              style={{
                backgroundColor: '#F8F0FF',
                border: '1px solid #E0D0F0',
                borderRadius: '6px',
              }}
            >
              <Info
                size={16}
                style={{ color: '#7C3AED', flexShrink: 0, marginTop: '1px' }}
              />
              <div className="flex-1">
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#7C3AED' }}>
                  {proposalOnlyCount} proposal includes Proposal-Only products. These will be
                  activated in the catalogue if the proposal is marked as Won.
                </p>
              </div>
              <button
                className="flex items-center gap-1 flex-shrink-0"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#7C3AED',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                  padding: 0,
                }}
              >
                View proposal →
              </button>
            </div>
          )}

          {/* FILTER / SEARCH BAR */}
          <div
            className="proposals-filter-bar bg-white rounded p-4 mb-4 flex items-center gap-4 flex-wrap"
            style={{
              borderRadius: '6px',
              border: '1px solid var(--jolly-border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {/* Search */}
            <div className="relative flex-1" style={{ minWidth: '260px' }}>
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--jolly-text-disabled)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search proposals by client, ref, or product…"
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid var(--jolly-border)',
                  borderRadius: '6px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '14px',
                  color: 'var(--jolly-text-body)',
                  outline: 'none',
                  backgroundColor: 'white',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--jolly-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(31,92,158,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--jolly-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={statusDropdownOpen}
                aria-label="Filter proposals by status"
                className="flex items-center gap-2"
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--jolly-border)',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--jolly-text-body)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Status: {statusFilter} <ChevronDown size={14} />
              </button>
              {statusDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setStatusDropdownOpen(false)}
                  />
                  <div
                    className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg z-40 py-1"
                    role="listbox"
                    aria-label="Status options"
                    style={{
                      border: '1px solid var(--jolly-border)',
                      borderRadius: '6px',
                      minWidth: '160px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    }}
                  >
                    {allStatusFilters.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setStatusDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2"
                        style={{
                          fontSize: '13px',
                          fontWeight: statusFilter === s ? 600 : 400,
                          color:
                            statusFilter === s
                              ? 'var(--jolly-primary)'
                              : 'var(--jolly-text-body)',
                          backgroundColor:
                            statusFilter === s ? 'var(--jolly-surface)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (statusFilter !== s) e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          if (statusFilter !== s) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Date range */}
            <button
              className="flex items-center gap-2"
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '6px',
                border: '1px solid var(--jolly-border)',
                backgroundColor: 'white',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--jolly-text-body)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {dateRange} <ChevronDown size={14} />
            </button>

            {/* My proposals toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMyOnly(!myOnly)}
                className="flex items-center gap-2"
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  border: myOnly
                    ? '1px solid var(--jolly-primary)'
                    : '1px solid var(--jolly-border)',
                  backgroundColor: myOnly ? 'var(--jolly-surface)' : 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: myOnly ? 'var(--jolly-primary)' : 'var(--jolly-text-body)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '18px',
                    borderRadius: '9px',
                    backgroundColor: myOnly ? 'var(--jolly-primary)' : '#DCDFE6',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: myOnly ? '16px' : '2px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
                My proposals
              </button>
            </div>
          </div>

          {/* PROPOSALS TABLE */}
          {sorted.length > 0 ? (
            <div
              className="proposals-table-wrap bg-white rounded overflow-hidden"
              style={{
                borderRadius: '6px',
                border: '1px solid var(--jolly-border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '1100px' }}>
                  <caption style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                    Proposals list with sorting, filtering, and row actions.
                  </caption>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                      <th aria-sort={getAriaSort('ref')} className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSort('ref')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit' }}>
                          Ref {sortBy === 'ref' ? (sortDirection === 'asc' ? '▲' : '▼') : '◇'}
                        </button>
                      </th>
                      <th aria-sort={getAriaSort('client')} className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSort('client')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit' }}>
                          Client {sortBy === 'client' ? (sortDirection === 'asc' ? '▲' : '▼') : '◇'}
                        </button>
                      </th>
                      <th aria-sort={getAriaSort('event')} className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSort('event')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit' }}>
                          Event / Project {sortBy === 'event' ? (sortDirection === 'asc' ? '▲' : '▼') : '◇'}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        Products
                      </th>
                      <th aria-sort={getAriaSort('totalValue')} className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSort('totalValue')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit' }}>
                          Total Value {sortBy === 'totalValue' ? (sortDirection === 'asc' ? '▲' : '▼') : '◇'}
                        </button>
                      </th>
                      <th aria-sort={getAriaSort('margin')} className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSort('margin')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit' }}>
                          Margin {sortBy === 'margin' ? (sortDirection === 'asc' ? '▲' : '▼') : '◇'}
                        </button>
                      </th>
                      <th aria-sort={getAriaSort('status')} className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSort('status')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit' }}>
                          Status {sortBy === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '◇'}
                        </button>
                      </th>
                      <th aria-sort={getAriaSort('dueDateObj')} className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => handleSort('dueDateObj')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'inherit' }}>
                          Due {sortBy === 'dueDateObj' ? (sortDirection === 'asc' ? '▲' : '▼') : '◇'}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p, idx) => {
                      const isBelowFloor = p.margin < p.marginFloor;
                      const isFinanceReview = p.status === 'Finance Review';
                      const isWon = p.status === 'Won';
                      const isExpired = p.status === 'Expired';
                      const nearDue = isDueNear(p.dueDateObj) && !isPast(p.dueDateObj);
                      const pastDue = isPast(p.dueDateObj) && p.status !== 'Won' && p.status !== 'Lost' && p.status !== 'Expired';

                      let rowBg = idx % 2 === 0 ? '#FFFFFF' : 'var(--jolly-row-alt)';
                      if (isWon) rowBg = '#F6FFF6';
                      if (isFinanceReview) rowBg = '#FFFDF5';

                      return (
                        <tr
                          key={p.id}
                          onMouseEnter={() => setHoveredRow(p.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderTop: '1px solid var(--jolly-border)',
                            borderLeft: isFinanceReview
                              ? '3px solid var(--jolly-warning)'
                              : isWon
                              ? '3px solid var(--jolly-success)'
                              : '3px solid transparent',
                            backgroundColor:
                              hoveredRow === p.id
                                ? 'var(--jolly-surface)'
                                : rowBg,
                            height: '56px',
                            opacity: isExpired ? 0.55 : 1,
                            transition: 'background-color 0.1s',
                          }}
                        >
                          {/* Ref */}
                          <td className="px-4 py-3">
                            <Link
                              to={`/proposals/${p.id}`}
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--jolly-primary)',
                                textDecoration: 'none',
                                fontFamily: 'monospace',
                              }}
                            >
                              {p.ref}
                            </Link>
                          </td>

                          {/* Client */}
                          <td className="px-4 py-3">
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'var(--jolly-text-body)',
                              }}
                            >
                              {p.client}
                            </p>
                          </td>

                          {/* Event */}
                          <td className="px-4 py-3">
                            <p
                              style={{
                                fontSize: '14px',
                                color: 'var(--jolly-text-secondary)',
                              }}
                            >
                              {p.event}
                            </p>
                          </td>

                          {/* Products */}
                          <td className="px-4 py-3">
                            <p style={{ fontSize: '13px', color: 'var(--jolly-text-body)' }}>
                              {p.productCount} products
                            </p>
                            <p
                              style={{
                                fontSize: '12px',
                                color: 'var(--jolly-text-disabled)',
                              }}
                            >
                              {p.unitCount.toLocaleString()} units
                            </p>
                          </td>

                          {/* Total Value */}
                          <td className="px-4 py-3">
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'var(--jolly-text-body)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              $
                              {p.totalValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </td>

                          {/* Margin */}
                          <td className="px-4 py-3">
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: isBelowFloor
                                  ? 'var(--jolly-destructive)'
                                  : 'var(--jolly-success)',
                              }}
                            >
                              {p.margin}%
                            </span>
                            {isBelowFloor && (
                              <p
                                className="flex items-center gap-0.5"
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--jolly-destructive)',
                                  fontWeight: 600,
                                  marginTop: '2px',
                                }}
                              >
                                <AlertTriangle size={10} /> Below floor
                              </p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={p.status} />
                          </td>

                          {/* Due */}
                          <td className="px-4 py-3">
                            <p
                              style={{
                                fontSize: '13px',
                                fontWeight: nearDue || pastDue ? 600 : 400,
                                color: pastDue
                                  ? 'var(--jolly-destructive)'
                                  : nearDue
                                  ? 'var(--jolly-warning)'
                                  : 'var(--jolly-text-body)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.dueDate}
                            </p>
                            {nearDue && (
                              <p
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--jolly-warning)',
                                  fontWeight: 500,
                                }}
                              >
                                Due soon
                              </p>
                            )}
                            {pastDue && (
                              <p
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--jolly-destructive)',
                                  fontWeight: 500,
                                }}
                              >
                                Overdue
                              </p>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Link
                                to={`/proposals/${p.id}`}
                                className="flex items-center gap-1 px-3 py-1.5 rounded"
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--jolly-primary)',
                                  textDecoration: 'none',
                                  border: '1px solid var(--jolly-border)',
                                  borderRadius: '4px',
                                  backgroundColor: 'white',
                                  whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                }}
                              >
                                <Eye size={12} /> Open
                              </Link>
                              <SecondaryAction status={p.status} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination hint */}
              <div
                className="px-6 py-3 flex items-center justify-between border-t"
                style={{ borderColor: 'var(--jolly-border)' }}
              >
                <p style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>
                  <span aria-live="polite">
                    Showing {sorted.length} of {proposals.length} proposals
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--jolly-border)',
                      backgroundColor: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--jolly-text-disabled)',
                      cursor: 'not-allowed',
                    }}
                    disabled
                  >
                    Previous
                  </button>
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--jolly-primary)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    1
                  </span>
                  <span
                    className="flex items-center justify-center cursor-pointer"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      border: '1px solid var(--jolly-border)',
                      color: 'var(--jolly-text-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    2
                  </span>
                  <button
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--jolly-border)',
                      backgroundColor: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--jolly-text-body)',
                      cursor: 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* EMPTY STATE */
            <div
              className="bg-white rounded flex flex-col items-center justify-center py-20"
              style={{
                borderRadius: '6px',
                border: '1px solid var(--jolly-border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div
                className="flex items-center justify-center mb-6"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--jolly-surface)',
                }}
              >
                <div className="relative">
                  <FileText size={32} style={{ color: 'var(--jolly-accent)' }} />
                  <Search
                    size={18}
                    style={{
                      color: 'var(--jolly-primary)',
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-8px',
                    }}
                  />
                </div>
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--jolly-text-body)',
                  marginBottom: '8px',
                }}
              >
                No proposals found.
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--jolly-text-secondary)',
                  marginBottom: '24px',
                }}
              >
                Try adjusting your filters or create a new proposal.
              </p>
              <Button buttonStyle="primary" size="small" onClick={() => navigate('/proposals/new')}>
                <span className="inline-flex items-center gap-2"><Plus size={15} /> New Proposal</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Secondary Action Button per status ---

function SecondaryAction({ status }: { status: ProposalStatus }) {
  const config: Record<
    ProposalStatus,
    { label: string; icon: ReactNode } | null
  > = {
    'Design request': { label: 'Open brief', icon: <ExternalLink size={12} /> },
    Draft: { label: 'Duplicate', icon: <Copy size={12} /> },
    Sent: { label: 'Follow up', icon: <Mail size={12} /> },
    Approved: { label: 'Create order', icon: <ShoppingCart size={12} /> },
    Won: { label: 'Create order', icon: <ShoppingCart size={12} /> },
    Lost: { label: 'Duplicate', icon: <Copy size={12} /> },
    Expired: { label: 'Reactivate', icon: <RotateCcw size={12} /> },
    'Finance Review': { label: 'View approval', icon: <ExternalLink size={12} /> },
  };

  const action = config[status];
  if (!action) return null;

  return (
    <button
      className="flex items-center gap-1 px-3 py-1.5 rounded"
      style={{
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--jolly-text-secondary)',
        border: '1px solid var(--jolly-border)',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
      }}
    >
      {action.icon} {action.label}
    </button>
  );
}
