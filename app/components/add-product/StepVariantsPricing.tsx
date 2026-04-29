import { useState, useMemo, useEffect } from 'react';
import { Plus, X, Edit, Trash2, Info, AlertTriangle, Truck, Link2, Pencil, HelpCircle } from 'lucide-react';
import {
  ProductFormData, Variant, PricingTier, DECORATION_METHODS_LIST, DEFAULT_APPA_FREIGHT,
  normalizeBespokeAddon, sumBespokeAddonsForTier,
} from './types';
import { BelowMoqSurcharge } from './BelowMoqSurcharge';
import { YesNoToggle } from '../YesNoToggle';

interface StepVariantsPricingProps {
  formData: ProductFormData;
  onUpdate: (updates: Partial<ProductFormData>) => void;
  currentRole: string;
  errors: Record<string, string>;
}

export function StepVariantsPricing({ formData, onUpdate, currentRole, errors }: StepVariantsPricingProps) {
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantSku, setNewVariantSku] = useState('');
  const [previewQtyIndex, setPreviewQtyIndex] = useState(0);
  const [previewDecorator, setPreviewDecorator] = useState('Screen Print');
  const [showTip, setShowTip] = useState<string | null>(null);

  // Tooltip component
  const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {showTip === text && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '220px',
            zIndex: 1000,
            whiteSpace: 'normal',
            marginBottom: '8px',
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );

  const { variants, pricingTiers, marginTarget, marginFloor, rushFee, minOrderQty, maxOrderQty,
    allowBelowMoq, belowMoqSurchargeType, belowMoqSurchargeValue,
    decorationMethods } = formData;

  useEffect(() => {
    if (pricingTiers.length === 0) return;
    setPreviewQtyIndex((i) => Math.min(i, Math.max(0, pricingTiers.length - 1)));
  }, [pricingTiers.length]);
  const isBespoke = formData.source === 'bespoke';
  const isAppaSource = formData.source === 'appa';
  const bespokeAddons = formData.bespokeAddons ?? [];

  const normalizedBespokeAddons = useMemo(
    () => bespokeAddons.map(a => normalizeBespokeAddon(a, pricingTiers.map(t => t.id))),
    [bespokeAddons, pricingTiers],
  );

  const handleBespokeAddonTierCost = (addonId: string, tierId: string, value: number) => {
    onUpdate({
      bespokeAddons: bespokeAddons.map((raw) => {
        const norm = normalizeBespokeAddon(raw, pricingTiers.map(t => t.id));
        if (norm.id !== addonId) return norm;
        return { ...norm, tierCosts: { ...norm.tierCosts, [tierId]: value } };
      }),
    });
  };

  // Guard new fields against undefined (e.g. when loaded from older persisted state)
  const supplierIsDecorator: boolean = formData.supplierIsDecorator ?? false;
  const freightLeg1: number = typeof formData.freightLeg1 === 'number' ? formData.freightLeg1 : 0.50;
  const freightLeg2: number = typeof formData.freightLeg2 === 'number' ? formData.freightLeg2 : 0.30;

  const handleDeleteVariant = (id: string) => {
    onUpdate({ variants: variants.filter(v => v.id !== id) });
  };

  const handleAddVariant = () => {
    if (!newVariantName.trim()) return;
    const newVariant: Variant = {
      id: String(Date.now()),
      name: newVariantName,
      sku: newVariantSku || `JC-${String(Date.now()).slice(-4)}`,
      supplierSku: 'Manual entry',
      status: 'active',
      source: 'manual',
    };
    onUpdate({ variants: [...variants, newVariant] });
    setNewVariantName('');
    setNewVariantSku('');
    setShowAddVariant(false);
  };

  const handleDeleteTier = (id: string) => {
    if (pricingTiers.length <= 1) return;
    const nextTiers = pricingTiers.filter(t => t.id !== id);
    const nextIds = nextTiers.map(t => t.id);
    onUpdate({
      pricingTiers: nextTiers,
      bespokeAddons: bespokeAddons.map((raw) => {
        const norm = normalizeBespokeAddon(raw, pricingTiers.map(t => t.id));
        const { [id]: _removed, ...rest } = norm.tierCosts;
        return normalizeBespokeAddon({ ...norm, tierCosts: rest }, nextIds);
      }),
    });
  };

  const handleAddTier = () => {
    const lastTier = pricingTiers[pricingTiers.length - 1];
    const newMin = lastTier ? (lastTier.maxQty ? lastTier.maxQty + 1 : 500) : 1;
    const newTier: PricingTier = {
      id: String(Date.now()),
      minQty: newMin,
      maxQty: null,
      unitCost: lastTier ? Math.max(lastTier.unitCost - 0.50, 0.50) : 5.00,
      marginTargetPct: lastTier?.marginTargetPct ?? marginTarget,
      marginFloorPct: lastTier?.marginFloorPct ?? marginFloor,
      source: 'manual',
    };
    const currentTierIds = pricingTiers.map(t => t.id);
    onUpdate({
      pricingTiers: [...pricingTiers, newTier],
      bespokeAddons: bespokeAddons.map((raw) => {
        const norm = normalizeBespokeAddon(raw, currentTierIds);
        const seed = lastTier?.id != null ? norm.tierCosts[lastTier.id] ?? 0 : 0;
        return {
          ...norm,
          tierCosts: { ...norm.tierCosts, [newTier.id]: seed },
        };
      }),
    });
  };

  const handleTierChange = (id: string, field: keyof PricingTier, value: number | null) => {
    onUpdate({
      pricingTiers: pricingTiers.map(t =>
        t.id === id ? { ...t, [field]: value, source: 'manual' as const } : t
      ),
    });
  };

  const getTierFreight = (tierId: string | undefined) => {
    if (isAppaSource) return appaShippingPerUnit;
    return supplierIsDecorator ? freightLeg2 : (freightLeg1 + freightLeg2);
  };

  const getTierBespoke = (tierId: string | undefined) => {
    return isBespoke && tierId ? sumBespokeAddonsForTier(normalizedBespokeAddons, tierId) : 0;
  };

  const getTierTotalCost = (tier: PricingTier | undefined) => {
    if (!tier) return 0;
    const freight = getTierFreight(tier.id);
    const bespoke = getTierBespoke(tier.id);
    return (tier.unitCost || 0) + decorationCost + freight + bespoke;
  };

  const getTierTargetMargin = (tier: PricingTier) => {
    return typeof tier.marginTargetPct === 'number' ? tier.marginTargetPct : marginTarget;
  };

  const getTierMarginFloor = (tier: PricingTier) => {
    return typeof tier.marginFloorPct === 'number' ? tier.marginFloorPct : marginFloor;
  };

  const getTierSellPrice = (tier: PricingTier) => {
    const target = getTierTargetMargin(tier);
    const cost = getTierTotalCost(tier);
    return target < 100 ? cost / (1 - target / 100) : 0;
  };

  const handleTierMarginTargetChange = (tierId: string, nextMargin: number) => {
    handleTierChange(tierId, 'marginTargetPct', Math.min(Math.max(nextMargin, 0), 99.9));
  };

  const handleTierMarginFloorChange = (tierId: string, nextFloor: number) => {
    handleTierChange(tierId, 'marginFloorPct', Math.max(nextFloor, 0));
  };

  const handleTierSellPriceChange = (tierId: string, nextSellPrice: number) => {
    const tier = pricingTiers.find(t => t.id === tierId);
    if (!tier) return;
    const cost = getTierTotalCost(tier);
    const margin = nextSellPrice > 0 ? (1 - (cost / nextSellPrice)) * 100 : 0;
    handleTierMarginTargetChange(tierId, Number.isFinite(margin) ? margin : 0);
  };

  // Check for tier gaps
  const tierWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (let i = 0; i < pricingTiers.length - 1; i++) {
      const current = pricingTiers[i];
      const next = pricingTiers[i + 1];
      if (current.maxQty !== null && next.minQty > current.maxQty + 1) {
        warnings.push(`Gap between tiers ${i + 1} and ${i + 2}: quantities ${current.maxQty + 1}–${next.minQty - 1} are not covered`);
      }
      if (current.maxQty !== null && next.minQty <= current.maxQty) {
        warnings.push(`Overlap between tiers ${i + 1} and ${i + 2}`);
      }
    }
    return warnings;
  }, [pricingTiers]);

  // ── Sell Price Preview calculation ────────────────────────────────────────────
  const previewTier = pricingTiers[previewQtyIndex] || pricingTiers[0];
  const baseCost = previewTier?.unitCost || 0;

  const previewOrderQty = useMemo(() => {
    const t = previewTier;
    if (!t) return 1;
    if (t.maxQty != null) return Math.max(1, Math.floor((t.minQty + t.maxQty) / 2));
    return Math.max(t.minQty, 1);
  }, [previewTier]);

  const appaFreightResolved = isAppaSource ? (formData.appaFreight ?? DEFAULT_APPA_FREIGHT) : null;
  const appaOrderChargeTotal = appaFreightResolved
    ? appaFreightResolved.perOrderAmount * appaFreightResolved.perOrderQuantity
    : 0;
  const appaShippingPerUnit =
    isAppaSource && appaFreightResolved ? appaOrderChargeTotal / previewOrderQty : 0;

  // Decoration cost: use run cost of preferred (or first) method; 0 if none configured yet.
  const decorationConfigured = decorationMethods.length > 0;
  const preferredMethod = decorationMethods.find(d => d.preferred) ?? decorationMethods[0];
  const decorationCost = decorationConfigured ? (preferredMethod?.runCost ?? 1.20) : 0;

  // Freight: APPA = amortized per-order shipping from feed; otherwise leg(s) entered by admin.
  const totalFreight = isAppaSource
    ? appaShippingPerUnit
    : (supplierIsDecorator ? freightLeg2 : (freightLeg1 + freightLeg2));
  const bespokePerUnit =
    isBespoke && previewTier?.id
      ? sumBespokeAddonsForTier(normalizedBespokeAddons, previewTier.id)
      : 0;
  const totalLandedCost = baseCost + decorationCost + totalFreight + bespokePerUnit;
  const marginPct = previewTier ? getTierTargetMargin(previewTier) : marginTarget;
  const sellPrice = marginPct < 100 ? totalLandedCost / (1 - marginPct / 100) : 0;
  const isBelowFloor = marginPct < (previewTier ? getTierMarginFloor(previewTier) : marginFloor);

  // Freight label helpers
  const leg1Label = `+ Freight: Supplier → Decorator`;
  const leg2Label = supplierIsDecorator
    ? `+ Freight: Supplier/Decorator → Jolly HQ`
    : `+ Freight: Decorator → Jolly HQ`;

  const inputStyle = {
    border: '1px solid var(--jolly-border)',
    fontSize: '14px',
    height: '36px',
    borderRadius: '6px',
  };

  return (
    <div className="space-y-6">
      {/* VARIANTS SECTION */}
      <div
        className="rounded"
        style={{
          backgroundColor: 'var(--jolly-card)',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Variants</h2>
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
              {variants.length} variant{variants.length !== 1 ? 's' : ''} defined
            </p>
          </div>
          <button
            onClick={() => setShowAddVariant(true)}
            className="flex items-center gap-2 px-3 py-2 rounded"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--jolly-primary)',
              color: 'var(--jolly-primary)',
              fontSize: '14px',
              fontWeight: 600,
              height: '36px',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Add variant
          </button>
        </div>

        <div className="p-6">
          {variants.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--jolly-text-disabled)' }}>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>No variants added yet</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>A product must have at least one variant to be activated.</p>
            </div>
          ) : (
            <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--jolly-border)' }}>
              <table className="w-full" style={{ fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Variant Name</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>SKU</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Supplier SKU</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Source</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Status</th>
                    <th className="text-right py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr
                      key={variant.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? 'white' : 'var(--jolly-row-alt)',
                        borderTop: '1px solid var(--jolly-border)',
                      }}
                    >
                      <td className="py-3 px-4" style={{ color: 'var(--jolly-text-body)', fontWeight: 500 }}>{variant.name}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--jolly-text-body)', fontFamily: 'monospace', fontSize: '13px' }}>{variant.sku}</td>
                      <td className="py-3 px-4" style={{ color: 'var(--jolly-text-secondary)', fontStyle: variant.source === 'appa' ? 'italic' : 'normal' }}>{variant.supplierSku}</td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: variant.source === 'appa' ? 'var(--jolly-surface)' : 'var(--jolly-bg)',
                            color: variant.source === 'appa' ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {variant.source === 'appa' ? 'APPA' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded"
                          style={{
                            backgroundColor: variant.status === 'active' ? 'var(--jolly-success)' : 'var(--jolly-text-disabled)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '4px',
                          }}
                        >
                          {variant.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 rounded hover:bg-gray-100" title="Edit variant">
                            <Edit size={16} style={{ color: 'var(--jolly-text-secondary)' }} />
                          </button>
                          <button
                            onClick={() => handleDeleteVariant(variant.id)}
                            className="p-1.5 rounded hover:bg-gray-100"
                            title="Delete variant"
                          >
                            <Trash2 size={16} style={{ color: 'var(--jolly-destructive)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Variant Inline Form */}
          {showAddVariant && (
            <div
              className="mt-4 p-4 rounded border"
              style={{ borderColor: 'var(--jolly-primary)', backgroundColor: 'var(--jolly-surface)', borderRadius: '6px' }}
            >
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block mb-1" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Variant Name *</label>
                  <input
                    type="text"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                    placeholder="e.g. Red, Large, Style A"
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block mb-1" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>SKU Override</label>
                  <input
                    type="text"
                    value={newVariantSku}
                    onChange={(e) => setNewVariantSku(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddVariant}
                  className="px-3 py-1.5 rounded"
                  style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddVariant(false); setNewVariantName(''); setNewVariantSku(''); }}
                  className="px-3 py-1.5 rounded"
                  style={{ backgroundColor: 'transparent', color: 'var(--jolly-text-secondary)', fontSize: '14px', fontWeight: 600, border: '1px solid var(--jolly-border)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* APPA Note */}
          <div
            className="flex items-start gap-2 mt-4 p-3 rounded"
            style={{ backgroundColor: 'var(--jolly-surface)', fontSize: '14px' }}
          >
            <Info size={16} style={{ color: 'var(--jolly-primary)', marginTop: '2px', flexShrink: 0 }} />
            <span style={{ color: 'var(--jolly-text-body)' }}>
              Variants synced from APPA are marked accordingly. Manually added variants are marked Manual.
            </span>
          </div>
        </div>
      </div>

      {/* PRICING SECTION */}
      <div
        className="rounded"
        style={{
          backgroundColor: 'var(--jolly-card)',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Pricing</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* MOQ Tiers */}
          <div>
            {/* ── Section header ── */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  MOQ Tiers & Base Cost
                </h3>
              </div>
            </div>

            <div
              className="flex items-start gap-3 px-4 py-3 rounded mb-3"
              style={{
                backgroundColor: 'var(--jolly-bg)',
                border: '1px solid var(--jolly-border)',
                borderRadius: '6px',
              }}
            >
              <Pencil size={15} style={{ color: 'var(--jolly-text-secondary)', marginTop: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                <strong>Stage mode: Manual tier entry</strong> — define all pricing tiers directly in this step during product creation.
              </p>
            </div>

            {/* MOQ Availability + Allow Below MOQ */}
            <BelowMoqSurcharge
              values={{
                allowBelowMoq,
                belowMoqSurchargeType,
                belowMoqSurchargeValue,
                belowMoqNote: formData.belowMoqNote,
              }}
              t1MinQty={pricingTiers[0]?.minQty ?? 1}
              onUpdate={(updates) => onUpdate(updates as Partial<ProductFormData>)}
            />

            {/* Tier table */}
            <div
              className="border rounded overflow-x-auto"
              style={{
                borderColor: 'var(--jolly-border)',
                position: 'relative',
              }}
            >
              <table className="w-full" style={{ fontSize: '14px', minWidth: '1280px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', width: '80px' }}>Tier</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Min Qty</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Max Qty</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>
                      {isBespoke ? 'Base Unit Cost (AUD)' : 'Unit Cost (AUD)'}
                    </th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Target Margin %</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Margin Floor %</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Sell Price (AUD)</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', width: '160px' }}>Source</th>
                    <th className="text-right py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTiers.map((tier, index) => {
                    const tierTarget = getTierTargetMargin(tier);
                    const tierFloor = getTierMarginFloor(tier);
                    const tierSell = getTierSellPrice(tier);
                    const tierWarn = tierTarget < tierFloor;
                    return (
                    <tr
                      key={tier.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? 'white' : 'var(--jolly-row-alt)',
                        borderTop: '1px solid var(--jolly-border)',
                      }}
                    >
                      <td className="py-2 px-4" style={{ color: 'var(--jolly-text-disabled)', fontWeight: 600 }}>
                        T{index + 1}
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          value={tier.minQty}
                          onChange={(e) => handleTierChange(tier.id, 'minQty', parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-1.5"
                          style={{ ...inputStyle, height: '32px', width: '120px' }}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="number"
                          value={tier.maxQty ?? ''}
                          onChange={(e) => handleTierChange(tier.id, 'maxQty', e.target.value ? parseInt(e.target.value, 10) : null)}
                          placeholder="No limit"
                          className="w-full px-3 py-1.5"
                          style={{ ...inputStyle, height: '32px', width: '120px' }}
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-1">
                          <span style={{ color: 'var(--jolly-text-disabled)', fontSize: '14px' }}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.unitCost}
                            onChange={(e) => handleTierChange(tier.id, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5"
                            style={{ ...inputStyle, height: '32px', width: '120px' }}
                          />
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="99.9"
                            value={Number(tierTarget.toFixed(1))}
                            onChange={(e) => handleTierMarginTargetChange(tier.id, parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5"
                            style={{ ...inputStyle, height: '32px', width: '112px' }}
                          />
                          <span style={{ color: 'var(--jolly-text-disabled)', fontSize: '12px' }}>%</span>
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={Number(tierFloor.toFixed(1))}
                            onChange={(e) => handleTierMarginFloorChange(tier.id, parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5"
                            style={{ ...inputStyle, height: '32px', width: '112px' }}
                          />
                          <span style={{ color: 'var(--jolly-text-disabled)', fontSize: '12px' }}>%</span>
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-1">
                          <span style={{ color: 'var(--jolly-text-disabled)', fontSize: '14px' }}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={Number(tierSell.toFixed(2))}
                            onChange={(e) => handleTierSellPriceChange(tier.id, parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5"
                            style={{ ...inputStyle, height: '32px', width: '128px', borderColor: tierWarn ? 'var(--jolly-warning)' : 'var(--jolly-border)' }}
                          />
                        </div>
                        {tierWarn && (
                          <div style={{ fontSize: '10px', color: 'var(--jolly-warning)', marginTop: '3px' }}>
                            Below floor
                          </div>
                        )}
                      </td>
                      {/* Source badge */}
                      <td className="py-2 px-4">
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--jolly-bg)', border: '1px solid var(--jolly-border)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-disabled)', whiteSpace: 'nowrap', display: 'inline-flex' }}
                        >
                          <Pencil size={9} />
                          Manual
                        </span>
                      </td>

                      <td className="py-2 px-4">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDeleteTier(tier.id)}
                            disabled={pricingTiers.length <= 1}
                            className="p-1.5 rounded hover:bg-gray-100"
                            title={pricingTiers.length <= 1 ? 'Cannot delete the only tier' : 'Delete tier'}
                            style={{ cursor: pricingTiers.length <= 1 ? 'not-allowed' : 'pointer', opacity: pricingTiers.length <= 1 ? 0.3 : 1 }}
                          >
                            <X size={16} style={{ color: 'var(--jolly-destructive)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {isBespoke && normalizedBespokeAddons.length > 0 && (
              <div
                className="mt-3 rounded overflow-hidden"
                style={{ border: '1px solid #DDD6FE', backgroundColor: 'white' }}
              >
                <div
                  className="px-4 py-2 flex flex-wrap items-center justify-between gap-2"
                  style={{ backgroundColor: '#F3E8FF', borderBottom: '1px solid #DDD6FE' }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#5B21B6' }}>
                    Bespoke add-on $/unit by tier
                  </span>
                  <span style={{ fontSize: '11px', color: '#6D28D9' }}>
                    Aligns with the quantity breaks above — costs can differ per volume band.
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                        <th className="text-left py-2 px-3" style={{ fontWeight: 600, color: 'var(--jolly-text-secondary)', minWidth: '140px' }}>
                          Add-on
                        </th>
                        {pricingTiers.map((t, i) => (
                          <th key={t.id} className="text-right py-2 px-2" style={{ fontWeight: 600, color: 'var(--jolly-text-secondary)', whiteSpace: 'nowrap' }}>
                            T{i + 1}
                            <span className="block font-normal" style={{ fontSize: '10px', color: 'var(--jolly-text-disabled)' }}>
                              {t.minQty}–{t.maxQty ?? '∞'}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedBespokeAddons.map((a, rowIdx) => (
                        <tr
                          key={a.id}
                          style={{
                            borderTop: '1px solid var(--jolly-border)',
                            backgroundColor: rowIdx % 2 === 0 ? 'white' : 'var(--jolly-row-alt)',
                          }}
                        >
                          <td className="py-2 px-3" style={{ color: 'var(--jolly-text-body)', fontWeight: 500 }}>
                            {a.name || 'Unnamed option'}
                          </td>
                          {pricingTiers.map((t) => (
                            <td key={t.id} className="py-2 px-2 text-right">
                              <div className="inline-flex items-center gap-0.5 justify-end">
                                <span style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)' }}>$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={a.tierCosts[t.id] ?? 0}
                                  onChange={(e) => handleBespokeAddonTierCost(a.id, t.id, parseFloat(e.target.value) || 0)}
                                  className="px-2 py-1"
                                  style={{ ...inputStyle, height: '30px', width: '88px', textAlign: 'right' as const }}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isBespoke && (
              <div
                className="mt-3 p-3 rounded space-y-2"
                style={{ backgroundColor: '#F3E8FF', border: '1px solid #DDD6FE' }}
              >
                {normalizedBespokeAddons.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#5B21B6', margin: 0, lineHeight: 1.5 }}>
                    <strong>Add-ons:</strong> None configured — add options in Step 2 (Decoration).
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p style={{ fontSize: '12px', color: '#5B21B6', margin: 0, fontWeight: 600 }}>
                        Add-on total at selected preview tier
                      </p>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '11px', color: '#6D28D9' }}>Tier</span>
                        <select
                          value={previewQtyIndex}
                          onChange={(e) => setPreviewQtyIndex(parseInt(e.target.value, 10))}
                          className="px-2 py-1 rounded"
                          style={{ ...inputStyle, height: '28px', fontSize: '12px', width: 'auto' }}
                        >
                          {pricingTiers.map((tier, i) => (
                            <option key={tier.id} value={i}>
                              T{i + 1}: {tier.minQty}–{tier.maxQty ?? '∞'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#5B21B6', margin: 0, lineHeight: 1.5 }}>
                      <strong>At this break:</strong>{' '}
                      {normalizedBespokeAddons.map((opt) => {
                        const tid = previewTier?.id;
                        const amt = tid ? opt.tierCosts[tid] ?? 0 : 0;
                        return `${opt.name || 'Unnamed'} (+$${amt.toFixed(2)}/unit)`;
                      }).join(' · ')}
                      {' — '}
                      <strong>combined ${bespokePerUnit.toFixed(2)}/unit</strong>
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Tier warnings */}
            {tierWarnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-center gap-2 mt-2 p-2 rounded"
                style={{ backgroundColor: 'var(--jolly-warning-bg)', fontSize: '13px', color: 'var(--jolly-warning)' }}
              >
                <AlertTriangle size={14} />
                {warning}
              </div>
            ))}

            <button
              onClick={handleAddTier}
              className="flex items-center gap-2 mt-3"
              style={{
                color: 'var(--jolly-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                opacity: 1,
              }}
            >
              <Plus size={16} />
              Add tier
            </button>
          </div>

          {/* Margin & Floor */}
          <div>
            <h3 className="mb-4" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Margin & Floor
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Default Margin Target (%)
                  <Tooltip text="Target profit margin % for all products at this level. Sell price calculated as: total cost / (1 - margin%)">
                    <HelpCircle
                      size={16}
                      style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }}
                      onMouseEnter={() => setShowTip('Target profit margin % for all products at this level. Sell price calculated as: total cost / (1 - margin%)')}
                      onMouseLeave={() => setShowTip(null)}
                    />
                  </Tooltip>
                </label>
                <input
                  type="number"
                  value={marginTarget}
                  onChange={(e) => onUpdate({ marginTarget: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2"
                  style={inputStyle}
                />
                <p className="mt-1.5" style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)' }}>
                  Used as fallback/default for tiers. Each tier can override in the table above.
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Default Margin Floor (%)
                  <Tooltip text="Minimum acceptable margin threshold. Pricing below this level should be reviewed or approved by Finance.">
                    <HelpCircle
                      size={16}
                      style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }}
                      onMouseEnter={() => setShowTip('Minimum acceptable margin threshold. Pricing below this level should be reviewed or approved by Finance.')}
                      onMouseLeave={() => setShowTip(null)}
                    />
                  </Tooltip>
                </label>
                <input
                  type="number"
                  value={marginFloor}
                  disabled={currentRole !== 'finance'}
                  onChange={(e) => onUpdate({ marginFloor: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2"
                  style={{
                    ...inputStyle,
                    backgroundColor: currentRole !== 'finance' ? 'var(--jolly-bg)' : 'white',
                    color: currentRole !== 'finance' ? 'var(--jolly-text-disabled)' : 'var(--jolly-text-body)',
                    cursor: currentRole !== 'finance' ? 'not-allowed' : 'text',
                  }}
                />
                <div className="flex items-start gap-2 mt-2" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                  <Info size={14} style={{ marginTop: '1px', flexShrink: 0 }} />
                  <span>{currentRole === 'finance' ? 'Editable by Finance role.' : 'Set by Finance. Contact finance@jolly.com.au to change.'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Costs */}
          <div>
            <h3 className="mb-1" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Additional Costs
            </h3>
            <p className="mb-4" style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
              Per-unit cost allocations that feed into the landed cost and sell price calculation.
            </p>

            {/* ── APPA freight (feed) vs manual legs ───────────────────── */}
            {isAppaSource && appaFreightResolved && (
              <div
                className="mb-4 rounded p-4"
                style={{
                  border: '1px solid var(--jolly-accent)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--jolly-surface)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Truck size={14} style={{ color: 'var(--jolly-primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                    Shipping &amp; freight (APPA)
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      fontSize: '10px', fontWeight: 700,
                      backgroundColor: 'var(--jolly-primary)',
                      color: 'white',
                      borderRadius: '4px',
                    }}
                  >
                    From feed
                  </span>
                </div>
                <div
                  className="rounded overflow-hidden"
                  style={{ border: '1px solid var(--jolly-border)', backgroundColor: 'white' }}
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    style={{ borderBottom: '1px solid var(--jolly-border)' }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                        {appaFreightResolved.lineLabel}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
                        {appaFreightResolved.lineSubtitle}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <div style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', fontWeight: 600 }}>Per order</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--jolly-text-body)' }}>
                          ${appaFreightResolved.perOrderAmount.toFixed(2)}
                        </div>
                      </div>
                      <div
                        className="text-center px-3 py-1.5 rounded"
                        style={{ backgroundColor: 'var(--jolly-bg)', minWidth: '48px', border: '1px solid var(--jolly-border)' }}
                      >
                        <div style={{ fontSize: '10px', color: 'var(--jolly-text-secondary)', fontWeight: 600 }}>Qty</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>{appaFreightResolved.perOrderQuantity}</div>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex items-start gap-2" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', backgroundColor: 'var(--jolly-bg)' }}>
                    <Info size={14} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--jolly-primary)' }} />
                    <span>
                      Sourced from APPA / supplier catalogue (read-only here). Sell-price preview amortizes this per-order charge over
                      ~{previewOrderQty} units (tier midpoint when the tier has a max quantity).
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!isAppaSource && (
              <>
                <div
                  className="mb-4 rounded"
                  style={{
                    border: '1px solid var(--jolly-border)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ backgroundColor: supplierIsDecorator ? 'var(--jolly-surface)' : 'var(--jolly-bg)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link2 size={14} style={{ color: supplierIsDecorator ? 'var(--jolly-primary)' : 'var(--jolly-text-disabled)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                          Supplier is Decorator
                        </span>
                        <Tooltip text="Turn this on when the supplier also handles decoration, so only one freight leg is needed in landed cost calculations.">
                          <HelpCircle
                            size={14}
                            style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }}
                            onMouseEnter={() => setShowTip('Turn this on when the supplier also handles decoration, so only one freight leg is needed in landed cost calculations.')}
                            onMouseLeave={() => setShowTip(null)}
                          />
                        </Tooltip>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', marginLeft: '22px' }}>
                        {supplierIsDecorator
                          ? 'One freight leg — product ships directly from supplier/decorator to Jolly HQ.'
                          : 'Two freight legs — product routes from supplier to a separate decorator, then to Jolly HQ.'}
                      </p>
                    </div>
                    <div style={{ marginLeft: '16px' }}>
                      <YesNoToggle
                        value={supplierIsDecorator}
                        onChange={(v) => onUpdate({ supplierIsDecorator: v })}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="mb-4 rounded p-4"
                  style={{ border: '1px solid var(--jolly-border)', borderRadius: '6px', backgroundColor: 'var(--jolly-bg)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={14} style={{ color: 'var(--jolly-primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                      Freight Allocation
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        fontSize: '10px', fontWeight: 700,
                        backgroundColor: 'var(--jolly-surface)',
                        color: 'var(--jolly-primary)',
                        border: '1px solid var(--jolly-border)',
                      }}
                    >
                      {supplierIsDecorator ? '1 leg' : '2 legs'}
                    </span>
                  </div>

                  <div className={`grid gap-4 ${supplierIsDecorator ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {!supplierIsDecorator && (
                      <div>
                        <label className="flex items-center gap-2 mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                          Leg 1: Supplier → Decorator ($ / unit)
                          <Tooltip text="Cost to ship from supplier to the decoration facility per unit.">
                            <HelpCircle
                              size={14}
                              style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }}
                              onMouseEnter={() => setShowTip('Cost to ship from supplier to the decoration facility per unit.')}
                              onMouseLeave={() => setShowTip(null)}
                            />
                          </Tooltip>
                        </label>
                        <div className="flex items-center">
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '30px', height: '36px',
                            border: '1px solid var(--jolly-border)', borderRight: 'none',
                            borderRadius: '6px 0 0 6px',
                            backgroundColor: 'white', fontSize: '14px', color: 'var(--jolly-text-secondary)',
                          }}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={freightLeg1}
                            onChange={(e) => onUpdate({ freightLeg1: parseFloat(e.target.value) || 0 })}
                            style={{ ...inputStyle, borderRadius: '0 6px 6px 0', width: '100%' }}
                          />
                        </div>
                        <p className="mt-1.5 flex items-start gap-1" style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)' }}>
                          <Info size={11} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--jolly-text-disabled)' }} />
                          Cost to ship from the supplier to the decoration facility per unit.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="flex items-center gap-2 mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                        {supplierIsDecorator
                          ? 'Supplier/Decorator → Jolly HQ ($ / unit)'
                          : 'Leg 2: Decorator → Jolly HQ ($ / unit)'}
                        <Tooltip text={supplierIsDecorator
                          ? 'Cost to ship finished decorated goods to Jolly HQ per unit.'
                          : 'Cost to ship finished decorated goods from the decorator to Jolly HQ per unit.'}>
                          <HelpCircle
                            size={14}
                            style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }}
                            onMouseEnter={() => setShowTip(supplierIsDecorator
                              ? 'Cost to ship finished decorated goods to Jolly HQ per unit.'
                              : 'Cost to ship finished decorated goods from the decorator to Jolly HQ per unit.')}
                            onMouseLeave={() => setShowTip(null)}
                          />
                        </Tooltip>
                      </label>
                      <div className="flex items-center">
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '30px', height: '36px',
                          border: '1px solid var(--jolly-border)', borderRight: 'none',
                          borderRadius: '6px 0 0 6px',
                          backgroundColor: 'white', fontSize: '14px', color: 'var(--jolly-text-secondary)',
                        }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={freightLeg2}
                          onChange={(e) => onUpdate({ freightLeg2: parseFloat(e.target.value) || 0 })}
                          style={{ ...inputStyle, borderRadius: '0 6px 6px 0', width: '100%' }}
                        />
                      </div>
                      <p className="mt-1.5 flex items-start gap-1" style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)' }}>
                        <Info size={11} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--jolly-text-disabled)' }} />
                        {supplierIsDecorator
                          ? 'Cost to ship finished decorated goods to Jolly HQ per unit.'
                          : 'Cost to ship finished decorated goods from the decorator to Jolly HQ per unit.'}
                      </p>
                    </div>
                  </div>

                  {!supplierIsDecorator && (
                    <div
                      className="flex items-center justify-between mt-3 px-3 py-2 rounded"
                      style={{ backgroundColor: 'white', border: '1px solid var(--jolly-border)', borderRadius: '6px' }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', fontWeight: 500 }}>
                        Combined freight (Leg 1 + Leg 2)
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jolly-text-body)', fontFamily: 'monospace' }}>
                        ${(freightLeg1 + freightLeg2).toFixed(2)} / unit
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Rush Fee + MOQ fields ────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Rush Fee ($ / unit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rushFee}
                  onChange={(e) => onUpdate({ rushFee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2"
                  style={inputStyle}
                />
                <p className="mt-1.5 flex items-start gap-1" style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)' }}>
                  <Info size={11} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--jolly-text-disabled)' }} />
                  Applied when a client requests faster turnaround than the standard lead time.
                </p>
              </div>
              <div>{/* intentional spacer */}</div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Minimum Order Quantity
                </label>
                <input
                  type="number"
                  value={minOrderQty}
                  onChange={(e) => onUpdate({ minOrderQty: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Maximum Order Quantity
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-bg)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', border: '1px solid var(--jolly-border)' }}>optional</span>
                </label>
                <input
                  type="number"
                  value={maxOrderQty || ''}
                  onChange={(e) => onUpdate({ maxOrderQty: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="No limit"
                  className="w-full px-4 py-2"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ── Cost Snapshot (decoration not yet configured) ─────────────── */}
          {!decorationConfigured && (
            <div
              className="rounded p-5"
              style={{
                backgroundColor: 'var(--jolly-bg)',
                border: '1px solid var(--jolly-border)',
                borderRadius: '6px',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                    Cost Snapshot
                  </h3>
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700,
                      color: 'var(--jolly-text-secondary)',
                      backgroundColor: 'var(--jolly-header-bg)',
                      border: '1px solid var(--jolly-border)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                    }}
                  >
                    Partial — awaiting decoration
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Tier:</span>
                  <select
                    value={previewQtyIndex}
                    onChange={(e) => setPreviewQtyIndex(parseInt(e.target.value))}
                    className="px-2 py-1 rounded"
                    style={{ ...inputStyle, height: '28px', fontSize: '13px', width: 'auto' }}
                  >
                    {pricingTiers.map((tier, i) => (
                      <option key={tier.id} value={i}>
                        {tier.minQty}–{tier.maxQty ?? '∞'} units
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'white' }}>
                <table className="w-full" style={{ fontSize: '14px' }}>
                  <tbody>
                    <tr>
                      <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>Base cost</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                        ${baseCost.toFixed(2)}
                      </td>
                    </tr>

                    {isAppaSource && appaFreightResolved ? (
                      <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>
                          <div>+ {appaFreightResolved.lineLabel} (APPA)</div>
                          <div style={{ fontSize: '11px', color: 'var(--jolly-text-disabled)', marginTop: '2px' }}>
                            ${appaOrderChargeTotal.toFixed(2)} per order ÷ ~{previewOrderQty} units
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                          ${appaShippingPerUnit.toFixed(2)}
                        </td>
                      </tr>
                    ) : supplierIsDecorator ? (
                      <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>{leg2Label}</td>
                        <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                          ${freightLeg2.toFixed(2)}
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                          <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>{leg1Label}</td>
                          <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                            ${freightLeg1.toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                          <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>{leg2Label}</td>
                          <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                            ${freightLeg2.toFixed(2)}
                          </td>
                        </tr>
                      </>
                    )}

                    {isBespoke && normalizedBespokeAddons.length > 0 && (
                      <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>
                          + Bespoke add-ons (selected tier)
                        </td>
                        <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                          ${bespokePerUnit.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    <tr style={{ borderTop: '2px solid var(--jolly-border)' }}>
                      <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)', fontWeight: 600 }}>
                        = Cost so far (excl. decoration)
                      </td>
                      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 700, fontFamily: 'monospace' }}>
                        ${(baseCost + totalFreight + bespokePerUnit).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Locked sell price placeholder */}
              <div
                className="flex items-center gap-3 mt-3 px-4 py-3 rounded"
                style={{
                  backgroundColor: 'var(--jolly-header-bg)',
                  border: '1px dashed var(--jolly-border)',
                  borderRadius: '6px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--jolly-text-disabled)' }}>
                  <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-secondary)', margin: 0 }}>
                    Sell price unavailable until decoration is configured
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', margin: '2px 0 0' }}>
                    Complete <strong>Step 2 — Decoration</strong> to unlock the full sell price preview and margin check.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Full Sell Price Preview (decoration configured) ───────────── */}
          {decorationConfigured && (
            <div
              className="rounded p-5"
              style={{
                backgroundColor: isBelowFloor ? 'var(--jolly-destructive-bg)' : 'var(--jolly-surface)',
                border: `1px solid ${isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-accent)'}`,
                borderRadius: '6px',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Sell Price Preview
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Tier:</span>
                    <select
                      value={previewQtyIndex}
                      onChange={(e) => setPreviewQtyIndex(parseInt(e.target.value))}
                      className="px-2 py-1 rounded"
                      style={{ ...inputStyle, height: '28px', fontSize: '13px', width: 'auto' }}
                    >
                      {pricingTiers.map((tier, i) => (
                        <option key={tier.id} value={i}>
                          {tier.minQty}–{tier.maxQty ?? '∞'} units
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Method:</span>
                    <select
                      value={previewDecorator}
                      onChange={(e) => setPreviewDecorator(e.target.value)}
                      className="px-2 py-1 rounded"
                      style={{ ...inputStyle, height: '28px', fontSize: '13px', width: 'auto' }}
                    >
                      {DECORATION_METHODS_LIST.slice(0, 4).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {isBelowFloor && (
                <div
                  className="flex items-center gap-2 mb-3 p-2 rounded"
                  style={{ backgroundColor: 'rgba(192,57,43,0.1)', fontSize: '13px', color: 'var(--jolly-destructive)', fontWeight: 600 }}
                >
                  <AlertTriangle size={14} />
                  Below margin floor — current margin ({marginTarget}%) is below the floor ({marginFloor}%)
                </div>
              )}

              <div className="border rounded overflow-hidden" style={{ borderColor: isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-border)', backgroundColor: 'white' }}>
                <table className="w-full" style={{ fontSize: '14px' }}>
                  <tbody>
                    <tr>
                      <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>Base cost</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                        ${baseCost.toFixed(2)}
                      </td>
                    </tr>

                    <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                      <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>
                        + Decoration cost ({preferredMethod?.method ?? previewDecorator})
                      </td>
                      <td className="py-2.5 px-4 text-right" style={{ fontWeight: 500, color: 'var(--jolly-text-body)', fontFamily: 'monospace' }}>
                        ${decorationCost.toFixed(2)}
                      </td>
                    </tr>

                    {isBespoke && normalizedBespokeAddons.length > 0 && (
                      <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>
                          + Bespoke add-ons (combined)
                        </td>
                        <td className="py-2.5 px-4 text-right" style={{ fontWeight: 500, color: 'var(--jolly-text-body)', fontFamily: 'monospace' }}>
                          ${bespokePerUnit.toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {isAppaSource && appaFreightResolved ? (
                      <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>
                          <div>+ {appaFreightResolved.lineLabel} (APPA)</div>
                          <div style={{ fontSize: '11px', color: 'var(--jolly-text-disabled)', marginTop: '2px' }}>
                            ${appaOrderChargeTotal.toFixed(2)} per order ÷ ~{previewOrderQty} units
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                          ${appaShippingPerUnit.toFixed(2)}
                        </td>
                      </tr>
                    ) : supplierIsDecorator ? (
                      <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>{leg2Label}</td>
                        <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                          ${freightLeg2.toFixed(2)}
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                          <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>{leg1Label}</td>
                          <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                            ${freightLeg1.toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                          <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>{leg2Label}</td>
                          <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                            ${freightLeg2.toFixed(2)}
                          </td>
                        </tr>
                      </>
                    )}

                    <tr style={{ borderTop: '2px solid var(--jolly-border)' }}>
                      <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)', fontWeight: 600 }}>
                        = Total landed cost
                      </td>
                      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 700, fontFamily: 'monospace' }}>
                        ${totalLandedCost.toFixed(2)}
                      </td>
                    </tr>

                    <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                      <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)' }}>Margin</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-text-body)', fontWeight: 500, fontFamily: 'monospace' }}>
                        {marginPct.toFixed(1)}%
                      </td>
                    </tr>

                    <tr style={{ borderTop: '1px solid var(--jolly-border)' }}>
                      <td className="py-2.5 px-4" style={{ color: 'var(--jolly-text-secondary)', fontWeight: 600 }}>Sell price / unit</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-primary)', fontWeight: 700, fontFamily: 'monospace', fontSize: '15px' }}>
                        ${sellPrice.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}