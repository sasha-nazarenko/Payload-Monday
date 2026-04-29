import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import { ArrowRight, RefreshCw, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

// --- Incomplete products (catalogue health queue) ---

type IncompleteFilterTab = 'all' | 'decoration' | 'images' | 'pricing' | 'assets';

interface IncompleteProduct {
  id: string;
  name: string;
  missing: string[];
  category: string;
  supplier: string;
  lastUpdated: string;
  type: IncompleteFilterTab[];
}

const incompleteProducts: IncompleteProduct[] = [
  { id: '1', name: 'Bamboo Pen Set', missing: ['Decoration specs', 'Assets'], category: 'Writing', supplier: "Leed's", lastUpdated: '3 days ago', type: ['decoration', 'assets'] },
  { id: '2', name: '5-Panel Cap Structured', missing: ['Decoration specs'], category: 'Headwear', supplier: 'Headwear AU', lastUpdated: '5 days ago', type: ['decoration'] },
  { id: '3', name: 'Classic Notebook A5', missing: ['Product image'], category: 'Stationery', supplier: 'JournalCo', lastUpdated: '1 week ago', type: ['images'] },
  { id: '4', name: 'Reusable Tote Natural', missing: ['Base pricing'], category: 'Bags', supplier: 'BagCo', lastUpdated: '2 days ago', type: ['pricing'] },
  { id: '5', name: 'Vacuum Flask 750ml', missing: ['Decoration specs', 'Product image'], category: 'Drinkware', supplier: 'DrinkTech', lastUpdated: '4 days ago', type: ['decoration', 'images'] },
  { id: '6', name: 'Cork Wireless Charger', missing: ['Assets', 'Pricing'], category: 'Tech', supplier: 'TechGear AU', lastUpdated: '6 days ago', type: ['assets', 'pricing'] },
  { id: '7', name: 'Recycled Lanyard 20mm', missing: ['Decoration specs'], category: 'Accessories', supplier: 'LanyardPro', lastUpdated: '1 week ago', type: ['decoration'] },
  { id: '8', name: 'Premium Metal Pen', missing: ['Product image', 'Assets'], category: 'Writing', supplier: "Leed's", lastUpdated: '3 days ago', type: ['images', 'assets'] },
];

const incompleteTabCounts = {
  all: 73,
  decoration: 41,
  images: 31,
  pricing: 18,
  assets: 12,
};

// --- APPA conflicts ---

interface ConflictRow {
  id: string;
  product: string;
  field: string;
  catalogueValue: string;
  appaValue: string;
  age: string;
  type: 'price' | 'stock' | 'discontinued';
}

const conflictsData: ConflictRow[] = [
  { id: '1', product: 'Metro Tote Bag (Natural)', field: 'Base Cost', catalogueValue: '$4.20', appaValue: '$4.55', age: '2 days', type: 'price' },
  { id: '2', product: 'Classic Cap', field: 'Lead Time', catalogueValue: '7 days', appaValue: '14 days', age: '3 days', type: 'price' },
  { id: '3', product: 'Slim Bottle 500ml', field: 'Stock', catalogueValue: 'In Stock', appaValue: 'Out of Stock', age: '1 day', type: 'stock' },
  { id: '4', product: 'Premium Pen Set', field: 'Unit Cost', catalogueValue: '$2.80', appaValue: '$3.10', age: '2 days', type: 'price' },
  { id: '5', product: 'Canvas Messenger', field: 'MOQ', catalogueValue: '50', appaValue: '100', age: '4 days', type: 'stock' },
  { id: '6', product: 'Recycled Notepad A5', field: 'Base Cost', catalogueValue: '$1.40', appaValue: '$1.55', age: '1 day', type: 'price' },
  { id: '7', product: 'Bamboo USB Drive', field: 'Status', catalogueValue: 'Active', appaValue: 'Discontinued', age: '1 day', type: 'discontinued' },
];

type ConflictFilterTab = 'all' | 'price' | 'stock' | 'discontinued';

/** Main work-queue switcher (segmented tabs; one table panel at a time). */
type QueueMainTab = 'appa-conflicts' | 'incomplete';

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const { currentRole } = useRole();
  const appaMonitoringRef = useRef<HTMLDivElement>(null);
  const workQueuesRef = useRef<HTMLDivElement>(null);

  const [queueMainTab, setQueueMainTab] = useState<QueueMainTab>('incomplete');

  const [incompleteTab, setIncompleteTab] = useState<IncompleteFilterTab>('all');
  const [incompletePage, setIncompletePage] = useState(1);

  const [conflictTab, setConflictTab] = useState<ConflictFilterTab>('all');
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (focus === 'conflicts') {
      setQueueMainTab('appa-conflicts');
      const target = workQueuesRef.current;
      if (target) window.requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    if (focus === 'incomplete') {
      setQueueMainTab('incomplete');
      const target = workQueuesRef.current;
      if (target) window.requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return;
    }
    if (focus === 'appa' || focus === 'sync') {
      const el = appaMonitoringRef.current;
      if (el) window.requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [searchParams]);

  const filteredIncomplete = incompleteProducts.filter((p) => {
    if (incompleteTab === 'all') return true;
    return p.type.includes(incompleteTab);
  });

  const unresolvedConflicts = useMemo(
    () => conflictsData.filter((c) => !resolvedConflicts.has(c.id)),
    [resolvedConflicts],
  );

  const conflictTabCounts = useMemo(() => {
    const u = unresolvedConflicts;
    return {
      all: u.length,
      price: u.filter((c) => c.type === 'price').length,
      stock: u.filter((c) => c.type === 'stock').length,
      discontinued: u.filter((c) => c.type === 'discontinued').length,
    };
  }, [unresolvedConflicts]);

  const filteredConflicts = unresolvedConflicts.filter((c) => {
    if (conflictTab === 'all') return true;
    return c.type === conflictTab;
  });

  const resolveConflict = (id: string) => {
    setResolvedConflicts((prev) => new Set(prev).add(id));
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2500);
  };

  const showConflictsTab = () => {
    setQueueMainTab('appa-conflicts');
    workQueuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showIncompleteTab = () => {
    setQueueMainTab('incomplete');
    workQueuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const incompleteTabs: { key: IncompleteFilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'decoration', label: 'Decoration' },
    { key: 'images', label: 'Images' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'assets', label: 'Assets' },
  ];

  const conflictTabs: { key: ConflictFilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'price', label: 'Price' },
    { key: 'stock', label: 'Stock' },
    { key: 'discontinued', label: 'Discontinued' },
  ];

  const cardShadow = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)';

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--jolly-bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <LeftSidebar currentRole={currentRole} />

      <div className="flex-1 overflow-auto">
        <div
          className="border-b bg-white px-8 py-5"
          style={{ borderColor: 'var(--jolly-border)' }}
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between xl:gap-8">
            <div className="min-w-0 xl:flex-1">
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Catalogue health
              </p>
              <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
                KPIs at a glance. In Work queues, use the two-way switch to open the incomplete-products queue or APPA conflicts — one table at a time.
              </p>
            </div>
            <div
              ref={appaMonitoringRef}
              id="appa-monitoring"
              className="flex w-full min-w-0 flex-shrink-0 flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between xl:w-auto xl:max-w-xl 2xl:max-w-2xl 2xl:flex-nowrap"
              style={{
                borderColor: 'var(--jolly-border)',
                backgroundColor: 'var(--jolly-bg)',
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                <div
                  className="flex items-center gap-2"
                  style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                >
                  <RefreshCw size={18} style={{ color: 'var(--jolly-primary)', flexShrink: 0 }} />
                  APPA Sync
                </div>
                <div className="flex items-center gap-1.5" style={{ fontSize: '13px', color: 'var(--jolly-success)' }}>
                  <CheckCircle size={16} style={{ flexShrink: 0 }} />
                  <span>Last run: Today, 06:00 AM · 4,821 products · 2m 14s</span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }} className="whitespace-nowrap sm:whitespace-normal">
                  Next scheduled: in ~18 hours
                </span>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex flex-shrink-0 items-center justify-center gap-2 self-center border px-4 transition-colors"
                style={{
                  borderColor: 'var(--jolly-primary)',
                  color: 'var(--jolly-primary)',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  height: '36px',
                  borderRadius: '6px',
                  opacity: isSyncing ? 0.6 : 1,
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing…' : 'Run manual sync'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-[1600px]">
          {/* KPI row — single horizontal strip */}
          <div
            className="flex flex-nowrap gap-4 mb-6 overflow-x-auto pb-1"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="bg-white rounded p-5 flex-1 min-w-[200px]" style={{ borderRadius: '6px', boxShadow: cardShadow }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Products
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--jolly-primary)', lineHeight: '1', marginTop: '8px' }}>
                5,254
              </p>
              <p style={{ fontSize: '12px', color: 'var(--jolly-success)', marginTop: '8px', fontWeight: 500 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>▲ +12 this week</span>
              </p>
            </div>

            <div className="bg-white rounded p-5 flex-1 min-w-[200px]" style={{ borderRadius: '6px', boxShadow: cardShadow }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending Review
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--jolly-warning)', lineHeight: '1', marginTop: '8px' }}>
                18
              </p>
              <p style={{ fontSize: '12px', color: 'var(--jolly-warning)', marginTop: '8px', fontWeight: 500 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>▲ +3 today</span>
              </p>
            </div>

            <div className="bg-white rounded p-5 flex-1 min-w-[200px]" style={{ borderRadius: '6px', boxShadow: cardShadow }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                APPA Conflicts
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--jolly-warning)', lineHeight: '1', marginTop: '8px' }}>
                {conflictTabCounts.all}
              </p>
              <button
                type="button"
                onClick={showConflictsTab}
                className="flex items-center gap-1 mt-2"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Review now <ArrowRight size={13} />
              </button>
            </div>

            <div className="bg-white rounded p-5 flex-1 min-w-[200px]" style={{ borderRadius: '6px', boxShadow: cardShadow }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Products Quoted (7d)
              </p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--jolly-text-disabled)', lineHeight: '1', marginTop: '8px' }}>
                412
              </p>
              <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', marginTop: '8px', fontWeight: 400 }}>
                Informational
              </p>
            </div>
          </div>

          {/* Work queues — unified card + segmented tabs */}
          <div ref={workQueuesRef} id="work-queues">
            <div
              className="mb-8 flex flex-col overflow-hidden rounded-lg bg-white"
              style={{
                borderRadius: '8px',
                boxShadow: cardShadow,
                border: '1px solid var(--jolly-border)',
              }}
            >
              <div className="px-5 pt-5 pb-4">
                <h2
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'var(--jolly-text-body)',
                  }}
                >
                  Work queues
                </h2>
                <p
                  style={{
                    margin: '8px 0 0',
                    maxWidth: '40rem',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: 'var(--jolly-text-secondary)',
                  }}
                >
                  Resolve APPA feed mismatches or finish incomplete catalogue records. Tabs keep counts visible; only the selected queue is shown below.
                </p>

                <div
                  role="tablist"
                  aria-label="Choose review queue"
                  className="mt-5 flex w-full gap-1 rounded-[10px] p-1"
                  style={{
                    backgroundColor: 'var(--jolly-bg)',
                    border: '1px solid var(--jolly-border)',
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={queueMainTab === 'appa-conflicts'}
                    id="tab-queue-appa-conflicts"
                    onClick={showConflictsTab}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 outline-none transition-[background,box-shadow,color,font-weight] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--jolly-primary)] focus-visible:ring-offset-2"
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: queueMainTab === 'appa-conflicts' ? 600 : 500,
                      backgroundColor: queueMainTab === 'appa-conflicts' ? 'white' : 'transparent',
                      color: queueMainTab === 'appa-conflicts' ? 'var(--jolly-text-body)' : 'var(--jolly-text-secondary)',
                      boxShadow: queueMainTab === 'appa-conflicts' ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
                    }}
                  >
                    <span>APPA conflicts</span>
                    <span
                      aria-label={`${conflictTabCounts.all} open`}
                      className="tabular-nums"
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        lineHeight: 1,
                        padding: '4px 9px',
                        borderRadius: '999px',
                        backgroundColor:
                          conflictTabCounts.all > 0 ? 'var(--jolly-warning-bg)' : 'var(--jolly-row-alt)',
                        color: conflictTabCounts.all > 0 ? 'var(--jolly-warning)' : 'var(--jolly-text-disabled)',
                      }}
                    >
                      {conflictTabCounts.all}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={queueMainTab === 'incomplete'}
                    id="tab-queue-incomplete"
                    onClick={showIncompleteTab}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 outline-none transition-[background,box-shadow,color,font-weight] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--jolly-primary)] focus-visible:ring-offset-2"
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: queueMainTab === 'incomplete' ? 600 : 500,
                      backgroundColor: queueMainTab === 'incomplete' ? 'white' : 'transparent',
                      color: queueMainTab === 'incomplete' ? 'var(--jolly-text-body)' : 'var(--jolly-text-secondary)',
                      boxShadow: queueMainTab === 'incomplete' ? '0 1px 3px rgba(0,0,0,0.07)' : 'none',
                    }}
                  >
                    <span>Incomplete products</span>
                    <span
                      aria-label={`${incompleteTabCounts.all} in queue`}
                      className="tabular-nums"
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        lineHeight: 1,
                        padding: '4px 9px',
                        borderRadius: '999px',
                        backgroundColor:
                          queueMainTab === 'incomplete' ? 'var(--jolly-surface)' : 'var(--jolly-row-alt)',
                        color:
                          queueMainTab === 'incomplete' ? 'var(--jolly-primary)' : 'var(--jolly-text-disabled)',
                      }}
                    >
                      {incompleteTabCounts.all}
                    </span>
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--jolly-border)' }}>
            {queueMainTab === 'appa-conflicts' && (
            <div id="appa-conflicts" className="flex flex-col flex-1 min-h-0" role="tabpanel" aria-labelledby="tab-queue-appa-conflicts">
            <div className="px-5 pt-5 pb-4 flex-shrink-0">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                APPA conflicts requiring review{' '}
                <span style={{ color: 'var(--jolly-text-disabled)', fontWeight: 400 }}>({conflictTabCounts.all})</span>
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
                Resolve field differences between catalogue and Promodata feed.
              </p>

              <div className="flex gap-1 mt-4 flex-wrap" style={{ borderBottom: '1px solid var(--jolly-border)', marginBottom: '-1px' }}>
                {conflictTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setConflictTab(tab.key)}
                    className="px-3 pb-2 transition-colors"
                    style={{
                      fontSize: '13px',
                      fontWeight: conflictTab === tab.key ? 600 : 400,
                      color: conflictTab === tab.key ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
                      borderBottom: conflictTab === tab.key ? '2px solid var(--jolly-primary)' : '2px solid transparent',
                      background: 'none',
                      cursor: 'pointer',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                    }}
                  >
                    {tab.label} ({conflictTabCounts[tab.key]})
                  </button>
                ))}
              </div>
            </div>

            <div
              className="overflow-auto flex-1 min-h-0 border-t"
              style={{ borderColor: 'var(--jolly-border)', maxHeight: 'min(520px, 58vh)' }}
            >
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Product</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Field</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Catalogue Value</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>APPA Value</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Age</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConflicts.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? '#FFFFFF' : 'var(--jolly-row-alt)',
                        borderTop: '1px solid var(--jolly-border)',
                      }}
                    >
                      <td className="px-4 py-3" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)' }}>{row.product}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            backgroundColor: row.type === 'price' ? 'var(--jolly-warning-bg)' : row.type === 'stock' ? 'var(--jolly-surface)' : 'var(--jolly-destructive-bg)',
                            color: row.type === 'price' ? 'var(--jolly-warning)' : row.type === 'stock' ? 'var(--jolly-primary)' : 'var(--jolly-destructive)',
                          }}
                        >
                          {row.field}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: '14px', color: 'var(--jolly-text-body)' }}>{row.catalogueValue}</td>
                      <td className="px-4 py-3" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-warning)' }}>{row.appaValue}</td>
                      <td className="px-4 py-3" style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>{row.age}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => resolveConflict(row.id)}
                            className="px-3 py-1 rounded transition-colors"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: 'var(--jolly-primary)',
                              color: 'white',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Accept APPA
                          </button>
                          <button
                            type="button"
                            onClick={() => resolveConflict(row.id)}
                            className="px-3 py-1 rounded border transition-colors"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: 'white',
                              color: 'var(--jolly-text-secondary)',
                              borderColor: 'var(--jolly-border)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Keep Catalogue
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredConflicts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--jolly-text-disabled)', fontSize: '14px' }}>
                        No conflicts to review in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
            )}

            {queueMainTab === 'incomplete' && (
            <div id="incomplete-products" className="flex flex-col flex-1 min-h-0" role="tabpanel" aria-labelledby="tab-queue-incomplete">
            <div className="px-5 pt-5 pb-4 flex-shrink-0">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Incomplete products — priority fields
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
                Products missing required fields that may affect quoting or production.
              </p>

              <div className="flex gap-1 mt-4 flex-wrap" style={{ borderBottom: '1px solid var(--jolly-border)', marginBottom: '-1px' }}>
                {incompleteTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setIncompleteTab(tab.key)}
                    className="px-3 pb-2 transition-colors"
                    style={{
                      fontSize: '13px',
                      fontWeight: incompleteTab === tab.key ? 600 : 400,
                      color: incompleteTab === tab.key ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
                      borderBottom: incompleteTab === tab.key ? '2px solid var(--jolly-primary)' : '2px solid transparent',
                      background: 'none',
                      cursor: 'pointer',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                    }}
                  >
                    {tab.label} ({incompleteTabCounts[tab.key]})
                  </button>
                ))}
              </div>
            </div>

            <div
              className="overflow-auto flex-1 min-h-0 border-t"
              style={{ borderColor: 'var(--jolly-border)', maxHeight: 'min(520px, 58vh)' }}
            >
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Product Name</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Missing</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Category</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Supplier</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Last Updated</th>
                    <th className="sticky top-0 z-[1] px-4 py-3 text-left border-b" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-header-bg)', borderColor: 'var(--jolly-border)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomplete.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? '#FFFFFF' : 'var(--jolly-row-alt)',
                        borderTop: '1px solid var(--jolly-border)',
                        height: '48px',
                      }}
                    >
                      <td className="px-4 py-3" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)' }}>
                        {row.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.missing.map((m) => (
                            <span
                              key={m}
                              className="px-2 py-0.5"
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                backgroundColor: 'var(--jolly-warning-bg)',
                                color: 'var(--jolly-warning)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>{row.category}</td>
                      <td className="px-4 py-3" style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>{row.supplier}</td>
                      <td className="px-4 py-3" style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>{row.lastUpdated}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="flex items-center gap-1 px-3 py-1 rounded transition-colors"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: 'var(--jolly-primary)',
                            color: 'white',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                        >
                          Complete <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t px-5 py-3"
              style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'var(--jolly-bg)' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>
                  Page {incompletePage} of 10
                </span>
                <button
                  type="button"
                  onClick={() => setIncompletePage((p) => Math.max(1, p - 1))}
                  disabled={incompletePage === 1}
                  className="p-1 rounded border"
                  style={{
                    borderColor: 'var(--jolly-border)',
                    backgroundColor: 'white',
                    cursor: incompletePage === 1 ? 'not-allowed' : 'pointer',
                    opacity: incompletePage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={16} style={{ color: 'var(--jolly-text-secondary)' }} />
                </button>
                <button
                  type="button"
                  onClick={() => setIncompletePage((p) => Math.min(10, p + 1))}
                  disabled={incompletePage === 10}
                  className="p-1 rounded border"
                  style={{
                    borderColor: 'var(--jolly-border)',
                    backgroundColor: 'white',
                    cursor: incompletePage === 10 ? 'not-allowed' : 'pointer',
                    opacity: incompletePage === 10 ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={16} style={{ color: 'var(--jolly-text-secondary)' }} />
                </button>
              </div>
            </div>
            </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
