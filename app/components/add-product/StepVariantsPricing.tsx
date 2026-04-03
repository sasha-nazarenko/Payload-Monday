import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, Edit, Trash2, Info, AlertTriangle, Ban, Truck, Link2, Pencil } from 'lucide-react';
import { ProductFormData, Variant, PricingTier, DECORATION_METHODS_LIST } from './types';
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

  const { variants, pricingTiers, marginTarget, marginFloor, rushFee, minOrderQty, maxOrderQty,
    moqAvailable, allowBelowMoq, belowMoqSurchargeType, belowMoqSurchargeValue,
    decorationMethods } = formData;
  const isBespoke = formData.source === 'bespoke';
  const bespokeAddons = formData.bespokeAddons ?? [];

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
    onUpdate({ pricingTiers: pricingTiers.filter(t => t.id !== id) });
  };

  const handleAddTier = () => {
    const lastTier = pricingTiers[pricingTiers.length - 1];
    const newMin = lastTier ? (lastTier.maxQty ? lastTier.maxQty + 1 : 500) : 1;
    const newTier: PricingTier = {
      id: String(Date.now()),
      minQty: newMin,
      maxQty: null,
      unitCost: lastTier ? Math.max(lastTier.unitCost - 0.50, 0.50) : 5.00,
      source: 'manual',
    };
    onUpdate({ pricingTiers: [...pricingTiers, newTier] });
  };

  const handleTierChange = (id: string, field: keyof PricingTier, value: number | null) => {
    onUpdate({
      pricingTiers: pricingTiers.map(t =>
        t.id === id ? { ...t, [field]: value, source: 'manual' as const } : t
      ),
    });
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

  // Decoration cost: use run cost of preferred (or first) method; 0 if none configured yet.
  const decorationConfigured = decorationMethods.length > 0;
  const preferredMethod = decorationMethods.find(d => d.preferred) ?? decorationMethods[0];
  const decorationCost = decorationConfigured ? (preferredMethod?.runCost ?? 1.20) : 0;

  // Freight: two legs when supplier ≠ decorator; single leg when supplier IS decorator.
  const totalFreight = supplierIsDecorator ? freightLeg2 : (freightLeg1 + freightLeg2);
  const totalLandedCost = baseCost + decorationCost + totalFreight;
  const marginPct = marginTarget;
  const sellPrice = marginPct < 100 ? totalLandedCost / (1 - marginPct / 100) : 0;
  const isBelowFloor = marginPct < marginFloor;

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
                moqAvailable,
                allowBelowMoq,
                belowMoqSurchargeType,
                belowMoqSurchargeValue,
                belowMoqNote: formData.belowMoqNote,
              }}
              t1MinQty={pricingTiers[0]?.minQty ?? 1}
              onUpdate={(updates) => onUpdate(updates as Partial<ProductFormData>)}
            />

            {/* ── MOQ = No: locked-tier banner ── */}
            {!moqAvailable && (
              <div
                className="flex items-start gap-3 mb-3 px-4 py-3 rounded"
                style={{
                  backgroundColor: '#FFF8EC',
                  border: '1px solid var(--jolly-warning)',
                  borderRadius: '6px',
                }}
              >
                <Ban size={16} style={{ color: 'var(--jolly-warning)', marginTop: '1px', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-warning)', marginBottom: '2px' }}>
                    Tier pricing is paused — MOQ marked as unavailable
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                    This product cannot be ordered at its stated minimum quantity, so quantity-based tiers don't apply.
                    Set <strong>MOQ Availability</strong> to <strong>Yes</strong> above to re-enable tier configuration.
                  </p>
                </div>
              </div>
            )}

            {/* Tier table */}
            <div
              className="border rounded overflow-hidden"
              style={{
                borderColor: !moqAvailable ? 'var(--jolly-warning)' : 'var(--jolly-border)',
                opacity: moqAvailable ? 1 : 0.45,
                pointerEvents: moqAvailable ? 'auto' : 'none',
                position: 'relative',
              }}
            >
              <table className="w-full" style={{ fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', width: '80px' }}>Tier</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Min Qty</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Max Qty</th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>
                      {isBespoke ? 'Base Unit Cost (AUD)' : 'Unit Cost (AUD)'}
                    </th>
                    <th className="text-left py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', width: '160px' }}>Source</th>
                    <th className="text-right py-3 px-4" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTiers.map((tier, index) => {
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
                        {isLocked ? (
                          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)', padding: '0 4px' }}>{tier.minQty}</span>
                        ) : (
                        <input
                          type="number"
                          value={tier.minQty}
                          onChange={(e) => handleTierChange(tier.id, 'minQty', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5"
                          style={{ ...inputStyle, height: '32px', width: '120px' }}
                        />
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {isLocked ? (
                          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)', padding: '0 4px' }}>{tier.maxQty ?? '∞'}</span>
                        ) : (
                        <input
                          type="number"
                          value={tier.maxQty ?? ''}
                          onChange={(e) => handleTierChange(tier.id, 'maxQty', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="No limit"
                          className="w-full px-3 py-1.5"
                          style={{ ...inputStyle, height: '32px', width: '120px' }}
                        />
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {isLocked ? (
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                              ${tier.unitCost.toFixed(2)}
                            </span>
                          </div>
                        ) : (
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

            {isBespoke && (
              <div
                className="mt-3 p-3 rounded"
                style={{ backgroundColor: '#F3E8FF', border: '1px solid #DDD6FE' }}
              >
                <p style={{ fontSize: '12px', color: '#5B21B6', margin: 0, lineHeight: 1.5 }}>
                  <strong>Add-ons:</strong>{' '}
                  {bespokeAddons.length === 0
                    ? 'None configured in Step 2.'
                    : bespokeAddons.map((opt) => `${opt.name || 'Unnamed option'} (+$${(opt.unitCost ?? 0).toFixed(2)})`).join(', ')}
                </p>
              </div>
            )}

            {/* Tier warnings */}
            {moqAvailable && tierWarnings.map((warning, i) => (
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
                color: moqAvailable ? 'var(--jolly-primary)' : 'var(--jolly-text-disabled)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: moqAvailable ? 'pointer' : 'not-allowed',
                background: 'none',
                border: 'none',
                opacity: moqAvailable ? 1 : 0.4,
                pointerEvents: moqAvailable ? 'auto' : 'none',
              }}
              title={moqAvailable ? undefined : 'Set MOQ Availability to Yes to add tiers'}
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
                <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Margin Target (%) <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
                </label>
                <input
                  type="number"
                  value={marginTarget}
                  onChange={(e) => onUpdate({ marginTarget: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Margin Floor (%)
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

            {/* ── Supplier is Decorator toggle ────────────────────────── */}
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

            {/* ── Freight fields ───────────────────────────────────────── */}
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
                {/* Leg 1 — only shown when supplier ≠ decorator */}
                {!supplierIsDecorator && (
                  <div>
                    <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                      Leg 1: Supplier → Decorator ($ / unit)
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

                {/* Leg 2 — always shown */}
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                    {supplierIsDecorator
                      ? 'Supplier/Decorator → Jolly HQ ($ / unit)'
                      : 'Leg 2: Decorator → Jolly HQ ($ / unit)'}
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

              {/* Combined freight callout when 2 legs */}
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

                    {supplierIsDecorator ? (
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
                        = Cost so far (excl. decoration)
                      </td>
                      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--jolly-text-body)', fontWeight: 700, fontFamily: 'monospace' }}>
                        ${(baseCost + totalFreight).toFixed(2)}
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
                    Complete <strong>Step 3 — Decoration</strong> to unlock the full sell price preview and margin check.
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

                    {supplierIsDecorator ? (
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