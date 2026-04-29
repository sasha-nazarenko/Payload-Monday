import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { X, Save, AlertTriangle, Info, Settings, TrendingDown, ChevronRight, Lock } from 'lucide-react';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import {
  PricingTier,
  getGlobalPriceCurve,
  saveGlobalPriceCurve,
} from '../components/add-product/types';
import { UserRole } from '../types';

const MAX_TIERS = 6;

function makeTier(last?: PricingTier): PricingTier {
  return {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    minQty: last ? (last.maxQty ? last.maxQty + 1 : 500) : 1,
    maxQty: null,
    unitCost: last ? Math.max(+(last.unitCost - 0.5).toFixed(2), 0.5) : 5.0,
  };
}

function tierWarnings(tiers: PricingTier[]): string[] {
  const w: string[] = [];
  for (let i = 0; i < tiers.length - 1; i++) {
    const cur = tiers[i];
    const next = tiers[i + 1];
    if (cur.maxQty !== null && next.minQty > cur.maxQty + 1) {
      w.push(`Gap between T${i + 1} and T${i + 2}: qty ${cur.maxQty + 1}–${next.minQty - 1} not covered`);
    }
    if (cur.maxQty !== null && next.minQty <= cur.maxQty) {
      w.push(`Overlap between T${i + 1} and T${i + 2}`);
    }
  }
  return w;
}

const inp: React.CSSProperties = {
  border: '1px solid var(--jolly-border)',
  borderRadius: '6px',
  fontSize: '14px',
  height: '36px',
  padding: '0 10px',
  outline: 'none',
  backgroundColor: 'white',
};

function CurveChart({ tiers, height = 64 }: { tiers: PricingTier[]; height?: number }) {
  if (!tiers.length) return null;
  const maxCost = Math.max(...tiers.map((t) => t.unitCost));
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {tiers.map((tier, i) => {
        const pct = maxCost > 0 ? (tier.unitCost / maxCost) * 100 : 50;
        return (
          <div key={tier.id} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                color: 'var(--jolly-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              ${tier.unitCost.toFixed(2)}
            </span>
            <div
              style={{
                width: '100%',
                height: `${pct}%`,
                minHeight: '4px',
                backgroundColor: 'var(--jolly-primary)',
                borderRadius: '3px 3px 0 0',
                opacity: 0.55 + 0.45 * (1 - i / Math.max(tiers.length - 1, 1)),
              }}
            />
            <span style={{ fontSize: '9px', color: 'var(--jolly-text-disabled)' }}>T{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function cloneTiers(tiers: PricingTier[]): PricingTier[] {
  return tiers.map((t) => ({ ...t }));
}

export function PriceCurveSettings() {
  const { currentRole } = useRole();
  const isAdmin = currentRole === 'admin';

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    setTiers(cloneTiers(getGlobalPriceCurve()));
  }, []);

  const mutateTiers = (fn: (prev: PricingTier[]) => PricingTier[]) => {
    setTiers((prev) => fn(prev));
    setDirty(true);
  };

  const handleTierChange = (id: string, field: keyof PricingTier, value: number | null) => {
    mutateTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleAddTier = () => {
    if (tiers.length >= MAX_TIERS) return;
    mutateTiers((prev) => [...prev, makeTier(prev[prev.length - 1])]);
  };

  const handleDeleteTier = (id: string) => {
    if (tiers.length <= 1) return;
    mutateTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = () => {
    const normalized = tiers.map((t, i) => (i === tiers.length - 1 ? { ...t, maxQty: null } : t));
    setTiers(normalized);
    saveGlobalPriceCurve(normalized);
    setDirty(false);
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 3000);
  };

  const warnings = tierWarnings(tiers);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: 'var(--jolly-bg)' }}
    >
      <LeftSidebar currentRole={currentRole} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className="flex flex-shrink-0 items-center justify-between border-b px-6 py-4"
          style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'var(--jolly-card)' }}
        >
          <div className="flex items-center gap-1.5">
            <Settings size={14} style={{ color: 'var(--jolly-text-disabled)' }} />
            <span style={{ color: 'var(--jolly-text-body)', fontSize: '13px', fontWeight: 600 }}>Settings</span>
            <ChevronRight size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
            <span style={{ color: 'var(--jolly-text-body)', fontSize: '13px', fontWeight: 600 }}>Default price tiers</span>
          </div>
          {!isAdmin && (
            <div
              className="flex items-center gap-1.5 rounded px-3 py-1.5"
              style={{ backgroundColor: 'var(--jolly-warning-bg)', border: '1px solid var(--jolly-warning)' }}
            >
              <Lock size={13} style={{ color: 'var(--jolly-warning)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-warning)' }}>
                Read-only — switch to Admin to edit
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[780px] px-6 py-6">
            {saveFlash && (
              <div
                className="mb-4 flex items-center gap-2 rounded px-4 py-3"
                style={{
                  backgroundColor: '#E8F5E9',
                  border: '1px solid var(--jolly-success)',
                  borderRadius: '6px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-success)' }}>
                  Default tiers saved. New products start from this breakdown unless you change them in Add
                  Product.
                </span>
              </div>
            )}

            <div className="mb-6">
              <h1 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--jolly-text-body)' }}>
                Default price tiers
              </h1>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--jolly-text-secondary)' }}>
                One catalogue-wide MOQ / unit-cost ladder. Used as the starting point in{' '}
                <Link to="/products/new" style={{ color: 'var(--jolly-primary)', fontWeight: 600 }}>
                  Add Product
                </Link>{' '}
                → Pricing; changes here are not retroactive for existing products.
              </p>
              {dirty && (
                <p className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--jolly-warning)' }}>
                  Unsaved changes
                </p>
              )}
            </div>

            {warnings.length > 0 && (
              <div
                className="mb-4 flex gap-2 rounded px-4 py-3"
                style={{ backgroundColor: 'var(--jolly-warning-bg)', border: '1px solid var(--jolly-warning)' }}
              >
                <AlertTriangle size={18} style={{ color: 'var(--jolly-warning)', flexShrink: 0, marginTop: 2 }} />
                <ul className="m-0 list-disc pl-4 text-[13px]" style={{ color: 'var(--jolly-text-body)' }}>
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className="mb-4 rounded-lg border bg-white p-5"
              style={{ borderColor: 'var(--jolly-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <div className="mb-4 flex items-center gap-2">
                <TrendingDown size={16} style={{ color: 'var(--jolly-primary)' }} />
                <span className="text-[15px] font-semibold" style={{ color: 'var(--jolly-text-body)' }}>
                  Tier breakdown
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                      <th className="pb-3 pr-3 text-left text-[12px] font-semibold" style={{ color: 'var(--jolly-text-secondary)' }}>
                        Tier
                      </th>
                      <th className="pb-3 pr-3 text-left text-[12px] font-semibold" style={{ color: 'var(--jolly-text-secondary)' }}>
                        Min Qty
                      </th>
                      <th className="pb-3 pr-3 text-left text-[12px] font-semibold" style={{ color: 'var(--jolly-text-secondary)' }}>
                        Max Qty
                      </th>
                      <th className="pb-3 pr-3 text-left text-[12px] font-semibold" style={{ color: 'var(--jolly-text-secondary)' }}>
                        Default unit cost (AUD)
                      </th>
                      <th className="pb-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier, idx) => (
                      <tr key={tier.id} style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                        <td className="py-2 pr-3 text-[13px] font-semibold" style={{ color: 'var(--jolly-text-body)' }}>
                          T{idx + 1}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            disabled={!isAdmin}
                            min={1}
                            value={tier.minQty}
                            onChange={(e) =>
                              handleTierChange(tier.id, 'minQty', Number(e.target.value) || 1)
                            }
                            style={{ ...inp, width: '100px', opacity: isAdmin ? 1 : 0.7 }}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          {idx === tiers.length - 1 ? (
                            <span className="text-[13px]" style={{ color: 'var(--jolly-text-disabled)' }}>
                              No limit
                            </span>
                          ) : (
                            <input
                              type="number"
                              disabled={!isAdmin}
                              min={tier.minQty}
                              value={tier.maxQty ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleTierChange(tier.id, 'maxQty', v === '' ? null : Number(v));
                              }}
                              style={{ ...inp, width: '100px', opacity: isAdmin ? 1 : 0.7 }}
                            />
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            disabled={!isAdmin}
                            min={0}
                            step={0.01}
                            value={tier.unitCost}
                            onChange={(e) =>
                              handleTierChange(tier.id, 'unitCost', Number(e.target.value) || 0)
                            }
                            style={{ ...inp, width: '120px', opacity: isAdmin ? 1 : 0.7 }}
                          />
                        </td>
                        <td className="py-2 text-right">
                          {isAdmin && tiers.length > 1 && (
                            <button
                              type="button"
                              title="Remove tier"
                              onClick={() => handleDeleteTier(tier.id)}
                              style={{
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                color: 'var(--jolly-destructive)',
                              }}
                            >
                              <X size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && tiers.length < MAX_TIERS && (
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="mt-3 text-[13px] font-semibold"
                  style={{ color: 'var(--jolly-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  + Add tier (T{tiers.length + 1})
                </button>
              )}
            </div>

            <div
              className="mb-6 rounded-lg border bg-white p-5"
              style={{ borderColor: 'var(--jolly-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--jolly-text-body)' }}>
                Cost curve preview
              </p>
              <CurveChart tiers={initialTierOrder(tiers)} height={72} />
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded px-5 py-2"
                  style={{
                    backgroundColor: 'var(--jolly-primary)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    height: '40px',
                  }}
                >
                  <Save size={16} /> Save
                </button>
              </div>
            )}

            <div
              className="mt-8 flex gap-2 rounded-lg border px-4 py-3"
              style={{
                backgroundColor: 'var(--jolly-surface)',
                borderColor: 'var(--jolly-border)',
              }}
            >
              <Info size={16} className="shrink-0" style={{ color: 'var(--jolly-primary)', marginTop: 2 }} />
              <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--jolly-text-secondary)' }}>
                This is the <strong style={{ color: 'var(--jolly-text-body)' }}>single</strong> default tier set for the
                catalogue. There are no named templates or duplicates—adjust tiers here, save, and new drafts use these
                values as their starting point.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function initialTierOrder(tiers: PricingTier[]): PricingTier[] {
  return [...tiers].sort((a, b) => a.minQty - b.minQty);
}
