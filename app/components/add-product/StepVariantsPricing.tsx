import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, Edit, Trash2, Info, AlertTriangle, ChevronDown, LayoutList, Star, Sparkles, Ban, Truck, Link2, Database, Pencil } from 'lucide-react';
import { ProductFormData, Variant, PricingTier, getTemplates, PriceCurveTemplate } from './types';
import { BelowMoqSurcharge } from './BelowMoqSurcharge';
import { YesNoToggle } from '../YesNoToggle';
import { getDecoratorRateCard } from '../../data/decoratorData';

// Load all templates from localStorage on first render
function loadTemplates(): PriceCurveTemplate[] {
  return getTemplates();
}

/** Returns true when two tier arrays have the same qty breakpoints + unit costs */
function tiersMatchTemplate(tiers: PricingTier[], tpl: PriceCurveTemplate): boolean {
  if (tiers.length !== tpl.tiers.length) return false;
  return tiers.every((t, i) =>
    t.minQty === tpl.tiers[i].minQty && t.unitCost === tpl.tiers[i].unitCost,
  );
}

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
  // Track which tier rows the admin has unlocked for editing (overriding decorator values)
  const [tierOverrides, setTierOverrides] = useState<Record<string, boolean>>({});
  const [previewMethodId, setPreviewMethodId] = useState('');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [allTemplates] = useState<PriceCurveTemplate[]>(loadTemplates);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const lastDecoratorKeyRef = useRef<string>('');

  // Track which template was last applied so we can show the "pre-populated" badge.
  // Initialise by checking whether the current tiers already match the default template
  // (true when the form is brand-new and was seeded from the global default curve).
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(() => {
    const defTpl = loadTemplates().find(t => t.isDefault);
    if (!defTpl) return null;
    return tiersMatchTemplate(formData.pricingTiers, defTpl) ? defTpl.name : null;
  });

  // ── Auto-populate tiers from decorator rate card ────────────────────────
  // Fires when the primary method/supplier (Step 2) changes. Respects manual edits.
  useEffect(() => {
    const { primaryDecorationMethod, primaryDecoratorSupplier } = formData;
    const key = `${primaryDecoratorSupplier}::${primaryDecorationMethod}`;
    if (key === lastDecoratorKeyRef.current) return;
    lastDecoratorKeyRef.current = key;
    if (!primaryDecoratorSupplier || !primaryDecorationMethod) return;
    const rawTiers = getDecoratorRateCard(primaryDecoratorSupplier, primaryDecorationMethod);
    if (!rawTiers) return;
    // Respect manual overrides — don't clobber user edits
    const hasManualEdits = formData.pricingTiers.some(t => t.source === 'manual');
    if (hasManualEdits) return;
    const tiers: PricingTier[] = rawTiers.map((t, i) => ({
      ...t,
      id: String(Date.now() + i),
      source: 'decorator' as const,
    }));
    onUpdate({ pricingTiers: tiers });
    setAppliedTemplateName(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.primaryDecoratorSupplier, formData.primaryDecorationMethod]);

  // Close template menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplateMenu(false);
      }
    };
    if (showTemplateMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTemplateMenu]);

  const { variants, pricingTiers, marginTarget, marginFloor, rushFee, minOrderQty, maxOrderQty,
    moqAvailable, allowBelowMoq, belowMoqSurchargeType, belowMoqSurchargeValue,
    decorationMethods } = formData;
  const isBespoke = formData.source === 'bespoke';
  const bespokeAddons = formData.bespokeAddons ?? [];

  // Guard new fields against undefined (e.g. when loaded from older persisted state)
  const supplierIsDecorator: boolean = formData.supplierIsDecorator ?? false;
  const freightLeg1: number = typeof formData.freightLeg1 === 'number' ? formData.freightLeg1 : 0.50;
  const freightLeg2: number = typeof formData.freightLeg2 === 'number' ? formData.freightLeg2 : 0.30;

  const handleApplyTemplate = (tpl: PriceCurveTemplate) => {
    const tiers: PricingTier[] = tpl.tiers.map((t, i) => ({
      ...t,
      id: String(Date.now() + i),
    }));
    onUpdate({ pricingTiers: tiers });
    setAppliedTemplateName(tpl.name);
    setShowTemplateMenu(false);
  };

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
    setAppliedTemplateName(null);
  };

  const handleAddTier = () => {
    const lastTier = pricingTiers[pricingTiers.length - 1];
    const newMin = lastTier ? (lastTier.maxQty ? lastTier.maxQty + 1 : 500) : 1;
    const newTier: PricingTier = {
      id: String(Date.now()),
      minQty: newMin,
      maxQty: null,
      unitCost: lastTier ? Math.max(lastTier.unitCost - 0.50, 0.50) : 5.00,
    };
    onUpdate({ pricingTiers: [...pricingTiers, newTier] });
    setAppliedTemplateName(null);
  };

  const handleTierChange = (id: string, field: keyof PricingTier, value: number | null) => {
    onUpdate({
      pricingTiers: pricingTiers.map(t =>
        t.id === id ? { ...t, [field]: value, source: 'manual' as const } : t
      ),
    });
    setAppliedTemplateName(null);
  };

  const unlockTierRow = (id: string) => {
    setTierOverrides(prev => ({ ...prev, [id]: true }));
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

  // Decoration cost: use run cost of the selected preview method (or preferred/first if only one).
  const decorationConfigured = decorationMethods.length > 0;
  const preferredMethod = decorationMethods.find(d => d.preferred) ?? decorationMethods[0];
  const previewMethod = decorationMethods.find(d => d.id === previewMethodId) ?? preferredMethod;
  const decorationCost = decorationConfigured ? (previewMethod?.runCost ?? 0) : 0;

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

                {/* "Default price curve applied" badge — shown only when a template seeded the tiers */}
                {appliedTemplateName && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: '#EBF3FB',
                      border: '1px solid #BFDBF7',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--jolly-primary)',
                      borderRadius: '20px',
                      lineHeight: '18px',
                      whiteSpace: 'nowrap',
                    }}
                    title={`Tiers were pre-filled from the "${appliedTemplateName}" template. Edit any value to customise.`}
                  >
                    <Sparkles size={10} />
                    {appliedTemplateName} applied
                    {/* Dismiss */}
                    <button
                      onClick={() => setAppliedTemplateName(null)}
                      title="Dismiss"
                      style={{
                        marginLeft: '2px', padding: '0 1px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--jolly-primary)', display: 'flex', alignItems: 'center',
                        opacity: 0.6,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
              </div>

              {/* Apply Template dropdown */}
              <div className="relative" ref={templateMenuRef}>
                <button
                  onClick={() => setShowTemplateMenu(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded"
                  style={{
                    border: '1px solid var(--jolly-border)',
                    backgroundColor: showTemplateMenu ? 'var(--jolly-surface)' : 'transparent',
                    color: 'var(--jolly-text-secondary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    height: '32px',
                  }}
                  title="Apply a pricing template to pre-fill the tier table"
                >
                  <LayoutList size={14} />
                  Apply Template
                  <ChevronDown size={12} style={{ transform: showTemplateMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {showTemplateMenu && (
                  <div
                    className="absolute right-0 mt-1 rounded border shadow-lg"
                    style={{
                      top: '100%',
                      zIndex: 50,
                      backgroundColor: 'var(--jolly-card)',
                      borderColor: 'var(--jolly-border)',
                      minWidth: '260px',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '6px 12px 5px', fontSize: '10px', fontWeight: 700, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--jolly-border)', backgroundColor: 'var(--jolly-bg)' }}>
                      Saved templates ({allTemplates.length})
                    </div>
                    {allTemplates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => handleApplyTemplate(tpl)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'block', borderBottom: '1px solid var(--jolly-border)' }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontWeight: 600, color: 'var(--jolly-primary)', fontSize: '13px' }}>{tpl.name}</span>
                          {tpl.isDefault && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ fontSize: '9px', fontWeight: 700, backgroundColor: 'var(--jolly-primary)', color: 'white' }}>
                              <Star size={8} /> DEFAULT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
                          {tpl.tiers.length} tiers · {tpl.description || `${tpl.tiers[0]?.minQty}–${tpl.tiers[tpl.tiers.length-1]?.maxQty ?? tpl.tiers[tpl.tiers.length-1]?.minQty + '+'}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Decorator rate card banner ── */}
            {(() => {
              const hasDecoratorTiers = pricingTiers.some(t => t.source === 'decorator');
              const hasManualTiers = pricingTiers.some(t => t.source === 'manual');
              const { primaryDecoratorSupplier, primaryDecorationMethod } = formData;
              const rateCardExists = primaryDecoratorSupplier && primaryDecorationMethod &&
                !!getDecoratorRateCard(primaryDecoratorSupplier, primaryDecorationMethod);

              if (hasDecoratorTiers || rateCardExists) {
                return (
                  <div
                    className="flex items-start gap-3 px-4 py-3 rounded mb-3"
                    style={{
                      backgroundColor: hasManualTiers ? '#FFFBEB' : '#EBF3FB',
                      border: `1px solid ${hasManualTiers ? '#FDE68A' : '#BFDBF7'}`,
                      borderRadius: '6px',
                    }}
                  >
                    <Database size={15} style={{ color: hasManualTiers ? '#D97706' : 'var(--jolly-primary)', marginTop: '1px', flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                      {hasManualTiers ? (
                        <>
                          <span style={{ fontWeight: 700, color: '#92400E' }}>Partially overridden — </span>
                          <span style={{ color: '#78350F' }}>
                            Some tiers were edited manually. Rows marked{' '}
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#BFDBF7', color: 'var(--jolly-primary)', fontSize: '11px', fontWeight: 600 }}>From decorator matrix</span>
                            {' '}still reflect {primaryDecoratorSupplier}'s {primaryDecorationMethod} rate card.
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontWeight: 700, color: 'var(--jolly-primary)' }}>Auto-populated — </span>
                          <span style={{ color: 'var(--jolly-text-secondary)' }}>
                            Tiers loaded from <strong>{primaryDecoratorSupplier}</strong>'s{' '}
                            {primaryDecorationMethod} rate card. Edit any row to override.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              if (primaryDecorationMethod && primaryDecoratorSupplier && !rateCardExists) {
                return (
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
                      <strong>Manual entry</strong> — no rate card found for {primaryDecoratorSupplier} ({primaryDecorationMethod}).
                      Enter all costs directly below.
                    </p>
                  </div>
                );
              }

              if (!primaryDecorationMethod && !primaryDecoratorSupplier) {
                return (
                  <div
                    className="flex items-start gap-3 px-4 py-3 rounded mb-3"
                    style={{
                      backgroundColor: 'var(--jolly-bg)',
                      border: '1px solid var(--jolly-border)',
                      borderRadius: '6px',
                    }}
                  >
                    <Info size={15} style={{ color: 'var(--jolly-text-secondary)', marginTop: '1px', flexShrink: 0 }} />
                    <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      No decorator selected in Step 2. Enter pricing tiers manually, or{' '}
                      <strong>go back to Step 2 — Decoration</strong> to select a supplier and auto-load a rate card.
                    </p>
                  </div>
                );
              }

              return null;
            })()}

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
                    const isDecoratorRow = tier.source === 'decorator';
                    const isLocked = isDecoratorRow && !tierOverrides[tier.id];
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
                      {/* Source badge + override control */}
                      <td className="py-2 px-4">
                        {isDecoratorRow && isLocked && (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#EBF3FB', border: '1px solid #BFDBF7', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-primary)', whiteSpace: 'nowrap', display: 'inline-flex' }}
                              title="Auto-populated from the Decorator Matrix. Click Override to edit."
                            >
                              <Database size={9} />
                              From matrix
                            </span>
                            <button
                              onClick={() => unlockTierRow(tier.id)}
                              title="Override this rate-card value"
                              style={{ background: 'none', border: '1px solid var(--jolly-border)', borderRadius: '4px', cursor: 'pointer', padding: '1px 6px', fontSize: '10px', fontWeight: 600, color: 'var(--jolly-text-secondary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Pencil size={9} /> Override
                            </button>
                          </div>
                        )}
                        {isDecoratorRow && !isLocked && (
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '11px', fontWeight: 600, color: '#D97706', whiteSpace: 'nowrap', display: 'inline-flex' }}
                          >
                            <Pencil size={9} />
                            Overridden
                          </span>
                        )}
                        {tier.source === 'manual' && !isDecoratorRow && (
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--jolly-bg)', border: '1px solid var(--jolly-border)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-disabled)', whiteSpace: 'nowrap', display: 'inline-flex' }}
                          >
                            <Pencil size={9} />
                            Manual
                          </span>
                        )}
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
                    {decorationMethods.length > 1 ? (
                      <select
                        value={previewMethodId || preferredMethod?.id || ''}
                        onChange={(e) => setPreviewMethodId(e.target.value)}
                        className="px-2 py-1 rounded"
                        style={{ ...inputStyle, height: '28px', fontSize: '13px', width: 'auto' }}
                      >
                        {decorationMethods.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.method}{m.preferred ? ' ★' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '13px', color: 'var(--jolly-text-body)', fontWeight: 500 }}>
                        {previewMethod?.method ?? '—'}
                      </span>
                    )}
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
                        + Decoration cost ({previewMethod?.method ?? '—'})
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