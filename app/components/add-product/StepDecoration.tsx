import { useState } from 'react';
import {
  Plus, X, Star, GripVertical, AlertTriangle, ChevronDown, ChevronUp,
  Link2, CheckCircle2, Database, Pencil, Info, Wand2, ExternalLink, HelpCircle,
} from 'lucide-react';
import {
  ProductFormData, DecorationMethod, DECORATION_METHODS_LIST, DECORATORS,
  PRIMARY_DECORATION_METHODS, BespokeAddon,
} from './types';
import { getDecoratorsByMethod, getDecoratorRateCard } from '../../data/decoratorData';

interface StepDecorationProps {
  formData: ProductFormData;
  onUpdate: (updates: Partial<ProductFormData>) => void;
  errors: Record<string, string>;
}

export function StepDecoration({ formData, onUpdate, errors }: StepDecorationProps) {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [showDetailSection, setShowDetailSection] = useState(true);

  const { decorationMethods, primaryDecorationMethod, primaryDecoratorSupplier, source } = formData;
  const isBespoke = source === 'bespoke';

  // Derived: does the selected combo have a rate card?
  const hasRateCard = !!(
    primaryDecorationMethod &&
    primaryDecoratorSupplier &&
    getDecoratorRateCard(primaryDecoratorSupplier, primaryDecorationMethod)
  );

  // Decorators available for the selected primary method
  const availableDecorators = primaryDecorationMethod
    ? getDecoratorsByMethod(primaryDecorationMethod)
    : [];

  // ── Primary method change ─────────────────────────────────────────────────
  const handlePrimaryMethodChange = (method: string) => {
    // Reset supplier if it doesn't support the new method
    const stillValid = getDecoratorsByMethod(method).some(
      d => d.name === primaryDecoratorSupplier,
    );
    onUpdate({
      primaryDecorationMethod: method,
      primaryDecoratorSupplier: stillValid ? primaryDecoratorSupplier : '',
    });
  };

  // ── Detail card helpers (unchanged from original) ─────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddMethod = () => {
    const usedMethods = decorationMethods.map(d => d.method);
    const available = DECORATION_METHODS_LIST.filter(m => !usedMethods.includes(m));
    const methodName = available[0] || DECORATION_METHODS_LIST[0];
    const newMethod: DecorationMethod = {
      id: String(Date.now()),
      method: methodName,
      preferred: decorationMethods.length === 0,
      printAreaWidth: 0,
      printAreaHeight: 0,
      maxColors: 0,
      positionX: 0,
      positionY: 0,
      decorator: primaryDecoratorSupplier || '',
      setupCost: 0,
      runCost: 0,
      notes: '',
    };
    onUpdate({ decorationMethods: [...decorationMethods, newMethod] });
    setExpandedCards(prev => ({ ...prev, [newMethod.id]: true }));
  };

  const handleRemoveMethod = (id: string) => {
    const updated = decorationMethods.filter(d => d.id !== id);
    if (updated.length > 0 && !updated.some(d => d.preferred)) {
      updated[0].preferred = true;
    }
    onUpdate({ decorationMethods: updated });
    setShowRemoveConfirm(null);
  };

  const handleSetPreferred = (id: string) => {
    onUpdate({
      decorationMethods: decorationMethods.map(d => ({ ...d, preferred: d.id === id })),
    });
  };

  const handleMethodUpdate = (id: string, updates: Partial<DecorationMethod>) => {
    onUpdate({
      decorationMethods: decorationMethods.map(d =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    });
  };

  const handleAddBespokeOption = () => {
    const newAddon: BespokeAddon = {
      id: String(Date.now()),
      name: '',
      tierCosts: {},
    };
    onUpdate({
      bespokeAddons: [...(formData.bespokeAddons ?? []), newAddon],
    });
  };

  const handleUpdateBespokeOption = (id: string, updates: { name?: string }) => {
    onUpdate({
      bespokeAddons: (formData.bespokeAddons ?? []).map((opt) =>
        opt.id === id ? { ...opt, ...updates } : opt,
      ),
    });
  };

  const handleDeleteBespokeOption = (id: string) => {
    onUpdate({
      bespokeAddons: (formData.bespokeAddons ?? []).filter((opt) => opt.id !== id),
    });
  };

  // Decorator compatibility warnings
  const decoratorWarnings = decorationMethods
    .filter(d => d.decorator && d.method)
    .reduce((warnings: string[], method) => {
      const sameDecoratorMethods = decorationMethods.filter(
        m => m.id !== method.id && m.decorator === method.decorator,
      );
      if (sameDecoratorMethods.length > 0 && method.method === 'Embroidery') {
        warnings.push(`${method.decorator} may not support both ${method.method} and ${sameDecoratorMethods[0].method} — verify compatibility.`);
      }
      return warnings;
    }, []);

  const inputStyle = {
    border: '1px solid var(--jolly-border)',
    fontSize: '14px',
    height: '36px',
    borderRadius: '6px',
  };

  const { supplierIsDecorator, supplier } = formData;

  const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
    const [showTip, setShowTip] = useState(false);
    return (
      <div
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {children}
        {showTip && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '0',
              marginBottom: '8px',
              backgroundColor: 'var(--jolly-text-body)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '1.4',
              maxWidth: '240px',
              whiteSpace: 'normal',
              zIndex: 1000,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
            }}
          >
            {text}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── BESPOKE MODE ──────────────────────────────────────────────────── */}
      {isBespoke ? (
        <div
          className="rounded p-6 space-y-5"
          style={{
            backgroundColor: 'var(--jolly-card)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
            border: '2px solid #7C3AED22',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded"
              style={{ width: '32px', height: '32px', backgroundColor: '#F3E8FF' }}
            >
              <Wand2 size={16} style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: 0 }}>
                Bespoke Product — Custom Decoration
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', margin: '2px 0 0' }}>
                Bespoke products use custom or client-supplied decoration. Rate card auto-population is not available.
              </p>
            </div>
          </div>

          {/* Add-ons section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Product Add-ons
              </label>
              <button
                onClick={handleAddBespokeOption}
                className="flex items-center gap-1 px-3 py-1.5 rounded"
                style={{ border: '1px solid var(--jolly-primary)', color: 'var(--jolly-primary)', background: 'white', fontSize: '12px', fontWeight: 600 }}
              >
                <Plus size={12} />
                Add option
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '10px' }}>
              Bespoke add-ons vary per product. Name each option here; set <strong>volume-based $/unit</strong> for every quantity break in <strong>Step 3 — Pricing</strong>.
            </p>
            <div className="space-y-2">
              {(formData.bespokeAddons ?? []).map((opt) => (
                <div key={opt.id} className="grid grid-cols-[1fr_36px] gap-2 items-center">
                  <input
                    type="text"
                    value={opt.name}
                    onChange={(e) => handleUpdateBespokeOption(opt.id, { name: e.target.value })}
                    placeholder="Option name (e.g. Metal buckle)"
                    className="w-full px-3 py-2"
                    style={{ ...inputStyle, height: '36px' }}
                  />
                  <button
                    onClick={() => handleDeleteBespokeOption(opt.id)}
                    className="p-2 rounded"
                    style={{ border: '1px solid var(--jolly-border)', backgroundColor: 'white', color: 'var(--jolly-destructive)' }}
                    title="Remove option"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Description textarea */}
          <div>
            <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Decoration Description
              <span className="ml-2 px-2 py-0.5 rounded" style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--jolly-bg)', color: 'var(--jolly-text-secondary)', border: '1px solid var(--jolly-border)' }}>optional</span>
            </label>
            <textarea
              value={formData.bespokeDecorationDescription}
              onChange={(e) => onUpdate({ bespokeDecorationDescription: e.target.value })}
              placeholder="Describe the decoration arrangement — e.g. client-supplied artwork, custom die, multi-position print…"
              rows={4}
              className="w-full px-4 py-3"
              style={{
                border: '1px solid var(--jolly-border)',
                fontSize: '14px',
                borderRadius: '6px',
                resize: 'vertical',
                color: 'var(--jolly-text-body)',
              }}
            />
          </div>

          {/* Pricing notice */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded"
            style={{
              backgroundColor: '#F3E8FF',
              border: '1px solid #DDD6FE',
              borderRadius: '6px',
            }}
          >
            <Info size={15} style={{ color: '#7C3AED', marginTop: '1px', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: '#5B21B6' }}>Pricing will be entered manually in the next step.</span>
              <span style={{ color: '#6D28D9' }}>
                {' '}No decorator rate card will be applied — Step 3 uses base unit costs per tier plus bespoke add-on costs per tier.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ── PRIMARY DECORATION SELECTION CARD ─────────────────────────────── */
        <div
          className="rounded"
          style={{
            backgroundColor: 'var(--jolly-card)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          {/* Card header */}
          <div
            className="px-6 py-4 border-b"
            style={{
              borderColor: 'var(--jolly-border)',
              backgroundColor: hasRateCard ? '#EBF3FB' : 'var(--jolly-card)',
              borderRadius: hasRateCard ? '6px 6px 0 0' : undefined,
              transition: 'background-color 0.2s',
            }}
          >
            <div className="flex items-center gap-2">
              <Database size={16} style={{ color: 'var(--jolly-primary)', flexShrink: 0 }} />
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: 0 }}>
                Primary Decoration
              </h2>
              {hasRateCard && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full ml-1"
                  style={{
                    backgroundColor: 'var(--jolly-primary)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={10} />
                  Rate card found
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', margin: '4px 0 0' }}>
              Select the primary decoration method and supplier to auto-populate pricing tiers in Step 3.
            </p>
          </div>

          {/* Dropdowns */}
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              {/* Decoration Method */}
              <div>
                <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Decoration Method <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
                  <Tooltip text="Pick the primary decoration type that should drive rate-card lookup and default pricing in the next step.">
                    <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                  </Tooltip>
                </label>
                <select
                  value={primaryDecorationMethod}
                  onChange={(e) => handlePrimaryMethodChange(e.target.value)}
                  className="w-full px-3 py-2"
                  style={{
                    ...inputStyle,
                    height: '36px',
                    backgroundColor: 'white',
                    color: primaryDecorationMethod ? 'var(--jolly-text-body)' : 'var(--jolly-text-disabled)',
                  }}
                >
                  <option value="">Select method…</option>
                  {PRIMARY_DECORATION_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {errors.primaryDecorationMethod && (
                  <p style={{ fontSize: '12px', color: 'var(--jolly-destructive)', marginTop: '4px' }}>
                    {errors.primaryDecorationMethod}
                  </p>
                )}
              </div>

              {/* Decorator Supplier */}
              <div>
                <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Decorator Supplier <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
                  <Tooltip text="Choose the supplier/decorator that will actually produce this method. If a matrix rate card exists, pricing can auto-fill.">
                    <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                  </Tooltip>
                </label>
                <select
                  value={primaryDecoratorSupplier}
                  onChange={(e) => onUpdate({ primaryDecoratorSupplier: e.target.value })}
                  disabled={!primaryDecorationMethod}
                  className="w-full px-3 py-2"
                  style={{
                    ...inputStyle,
                    height: '36px',
                    backgroundColor: !primaryDecorationMethod ? 'var(--jolly-bg)' : 'white',
                    color: primaryDecoratorSupplier ? 'var(--jolly-text-body)' : 'var(--jolly-text-disabled)',
                    cursor: !primaryDecorationMethod ? 'not-allowed' : 'default',
                  }}
                >
                  <option value="">
                    {!primaryDecorationMethod ? 'Select a method first' : 'Select supplier…'}
                  </option>
                  {availableDecorators.map(d => (
                    <option key={d.name} value={d.name}>
                      {d.name} — {d.location} ({d.priceLevel})
                    </option>
                  ))}
                  {primaryDecorationMethod && availableDecorators.length === 0 && (
                    <option value="" disabled>No suppliers found for this method</option>
                  )}
                </select>
                {primaryDecorationMethod && availableDecorators.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--jolly-warning)', marginTop: '4px' }}>
                    No suppliers in the Decorator Matrix support {primaryDecorationMethod}. Add one first, or enter pricing manually.
                  </p>
                )}
              </div>
            </div>

            {/* ── Confirmation banner — shown when both are selected with a rate card ── */}
            {hasRateCard && (
              <div
                className="flex items-start gap-3 px-4 py-3 rounded"
                style={{
                  backgroundColor: '#E8F5E9',
                  border: '1px solid #A5D6A7',
                  borderRadius: '6px',
                }}
              >
                <CheckCircle2 size={16} style={{ color: 'var(--jolly-success)', marginTop: '1px', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: '#1B5E20' }}>Ready — </span>
                  <span style={{ color: '#2E7D32' }}>
                    Pricing tiers will be loaded from{' '}
                    <strong>{primaryDecoratorSupplier}</strong>'s{' '}
                    {primaryDecorationMethod} rate card in the next step.
                    You can override any value there.
                  </span>
                </div>
              </div>
            )}

            {/* ── Warning — method + supplier selected but no rate card found ── */}
            {primaryDecorationMethod && primaryDecoratorSupplier && !hasRateCard && (
              <div
                className="flex items-start gap-3 px-4 py-3 rounded"
                style={{
                  backgroundColor: 'var(--jolly-warning-bg)',
                  border: '1px solid #FDE68A',
                  borderRadius: '6px',
                }}
              >
                <AlertTriangle size={15} style={{ color: 'var(--jolly-warning)', marginTop: '1px', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: '#92400E' }}>No rate card found — </span>
                  <span style={{ color: '#78350F' }}>
                    {primaryDecoratorSupplier} doesn't have a rate card for {primaryDecorationMethod} in the Decorator Matrix.
                    You'll need to enter pricing tiers manually in the next step.
                  </span>
                </div>
              </div>
            )}

            {/* ── Prompt — neither selected yet ── */}
            {!primaryDecorationMethod && !primaryDecoratorSupplier && (
              <div
                className="flex items-start gap-3 px-4 py-3 rounded"
                style={{
                  backgroundColor: 'var(--jolly-surface)',
                  border: '1px solid var(--jolly-border)',
                  borderRadius: '6px',
                }}
              >
                <Info size={15} style={{ color: 'var(--jolly-primary)', marginTop: '1px', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Select a method and supplier above. If both have a matching rate card in the Decorator Matrix,
                  pricing tiers will auto-populate in <strong>Step 3 — Pricing &amp; Tiers</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUPPLIER IS DECORATOR notice ────────────────────────────────────── */}
      {supplierIsDecorator && !isBespoke && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded"
          style={{
            backgroundColor: '#EBF3FB',
            border: '1px solid #BFDBF7',
            borderRadius: '6px',
          }}
        >
          <Link2 size={15} style={{ color: 'var(--jolly-primary)', marginTop: '1px', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: 'var(--jolly-primary)' }}>Supplier is Decorator</span>
            <span style={{ color: 'var(--jolly-text-secondary)' }}>
              {' '}is enabled in the Pricing tab
              {supplier ? ` — ${supplier} handles both supply and decoration` : ''}.
              The Decorator field below should reference the same entity.
              Only one freight leg (Supplier/Decorator → Jolly HQ) applies.
            </span>
          </div>
        </div>
      )}

      {/* ── DECORATION DETAIL SECTION ────────────────────────────────────────── */}
      <div>
        {/* Section toggle header */}
        <button
          onClick={() => setShowDetailSection(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded"
          style={{
            backgroundColor: 'var(--jolly-card)',
            border: '1px solid var(--jolly-border)',
            borderRadius: showDetailSection ? '6px 6px 0 0' : '6px',
            cursor: 'pointer',
            borderBottom: showDetailSection ? '1px solid var(--jolly-border)' : undefined,
          }}
        >
          <div className="flex items-center gap-2">
            <Pencil size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Decoration Detail Configuration
            </span>
            <span
              className="px-2 py-0.5 rounded"
              style={{
                fontSize: '11px', fontWeight: 600,
                backgroundColor: 'var(--jolly-bg)',
                color: 'var(--jolly-text-secondary)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              {decorationMethods.length} method{decorationMethods.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
              Print areas, max colours, setup cost
            </span>
            {showDetailSection
              ? <ChevronUp size={16} style={{ color: 'var(--jolly-text-disabled)' }} />
              : <ChevronDown size={16} style={{ color: 'var(--jolly-text-disabled)' }} />}
          </div>
        </button>

        {showDetailSection && (
          <div
            className="p-6 space-y-5 rounded-b"
            style={{
              backgroundColor: 'var(--jolly-card)',
              border: '1px solid var(--jolly-border)',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
            }}
          >
            {/* Add method button */}
            <div className="flex items-center justify-between">
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                Configure print areas, colour limits, and cost details per decoration method.
                {decorationMethods.length === 0 && ' Add at least one method for activation.'}
              </p>
              <button
                onClick={handleAddMethod}
                className="flex items-center gap-2 px-3 py-2 rounded"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--jolly-primary)',
                  color: 'var(--jolly-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  height: '36px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Plus size={16} />
                Add method
              </button>
            </div>

            {/* Decorator compatibility warnings */}
            {decoratorWarnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded"
                style={{ backgroundColor: 'var(--jolly-warning-bg)', fontSize: '14px', color: 'var(--jolly-warning)', borderRadius: '6px' }}
              >
                <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{warning}</span>
              </div>
            ))}

            {/* Empty state */}
            {decorationMethods.length === 0 && (
              <div
                className="rounded text-center py-10"
                style={{ backgroundColor: 'var(--jolly-bg)', borderRadius: '6px', border: '1px dashed var(--jolly-border)' }}
              >
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-disabled)' }}>
                  No methods added yet
                </p>
                <p style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)', marginTop: '4px' }}>
                  Add at least one decoration method to define print areas and decorator assignments.
                </p>
                <button
                  onClick={handleAddMethod}
                  className="mt-4 px-4 py-2 rounded"
                  style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  <Plus size={16} className="inline mr-2" style={{ verticalAlign: 'text-bottom' }} />
                  Add first method
                </button>
              </div>
            )}

            {/* Decoration method cards */}
            {decorationMethods.map((method) => {
              const isExpanded = expandedCards[method.id] !== false;
              return (
                <div
                  key={method.id}
                  className="rounded group"
                  style={{
                    backgroundColor: 'var(--jolly-bg)',
                    borderRadius: '6px',
                    border: method.preferred
                      ? '2px solid var(--jolly-primary)'
                      : '1px solid var(--jolly-border)',
                  }}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleExpand(method.id)}
                    style={{ borderBottom: isExpanded ? '1px solid var(--jolly-border)' : 'none' }}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={18} style={{ color: 'var(--jolly-text-disabled)', cursor: 'grab' }} onClick={(e) => e.stopPropagation()} />
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                          {method.method || 'Untitled Method'}
                        </span>
                        {method.preferred ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '11px', fontWeight: 600, borderRadius: '4px' }}>
                            <Star size={10} fill="white" />Preferred
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-card)', color: 'var(--jolly-text-secondary)', fontSize: '11px', fontWeight: 600, borderRadius: '4px', border: '1px solid var(--jolly-border)' }}>
                            Alternative
                          </span>
                        )}
                        {method.decorator && (
                          <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                            · {method.decorator}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.preferred && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSetPreferred(method.id); }}
                          className="px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ border: '1px solid var(--jolly-border)', color: 'var(--jolly-text-secondary)', fontSize: '12px', cursor: 'pointer', background: 'white' }}
                        >
                          Set preferred
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(method.id); }}
                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                        title="Remove method"
                      >
                        <X size={16} style={{ color: 'var(--jolly-destructive)' }} />
                      </button>
                      {isExpanded
                        ? <ChevronUp size={18} style={{ color: 'var(--jolly-text-disabled)' }} />
                        : <ChevronDown size={18} style={{ color: 'var(--jolly-text-disabled)' }} />}
                    </div>
                  </div>

                  {/* Remove confirmation */}
                  {showRemoveConfirm === method.id && (
                    <div className="mx-4 mt-3 p-3 rounded flex items-center justify-between" style={{ backgroundColor: 'var(--jolly-destructive-bg)', borderRadius: '6px', fontSize: '14px' }}>
                      <span style={{ color: 'var(--jolly-destructive)' }}>Remove {method.method}?</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleRemoveMethod(method.id)} className="px-3 py-1 rounded" style={{ backgroundColor: 'var(--jolly-destructive)', color: 'white', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Remove</button>
                        <button onClick={() => setShowRemoveConfirm(null)} className="px-3 py-1 rounded" style={{ border: '1px solid var(--jolly-border)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'white', color: 'var(--jolly-text-body)' }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Card body */}
                  {isExpanded && (
                    <div className="p-5 space-y-5">
                      {/* Method + Decorator selects */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                            Decoration Method <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
                            <Tooltip text="Select the exact method variant for this detail card. This is useful when a product supports multiple decoration methods.">
                              <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                            </Tooltip>
                          </label>
                          <select
                            value={method.method}
                            onChange={(e) => handleMethodUpdate(method.id, { method: e.target.value })}
                            className="w-full px-4 py-2"
                            style={inputStyle}
                          >
                            {DECORATION_METHODS_LIST.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                            Decorator / Supplier <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
                            <Tooltip text="Assign the partner responsible for this decoration method. This should usually match the supplier used for production pricing.">
                              <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                            </Tooltip>
                          </label>
                          <select
                            value={method.decorator}
                            onChange={(e) => handleMethodUpdate(method.id, { decorator: e.target.value })}
                            className="w-full px-4 py-2"
                            style={inputStyle}
                          >
                            <option value="">Select decorator</option>
                            {DECORATORS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Print area */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Print Area Dimensions</h4>
                          <Tooltip text="Use the maximum printable area approved by the decorator. These dimensions guide artwork setup and production expectations.">
                            <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                          </Tooltip>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'Width (mm)', field: 'printAreaWidth' },
                            { label: 'Height (mm)', field: 'printAreaHeight' },
                          ].map(({ label, field }) => (
                            <div key={field}>
                              <label className="block mb-1" style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>{label}</label>
                              <input
                                type="number"
                                value={(method as any)[field] || ''}
                                onChange={(e) => handleMethodUpdate(method.id, { [field]: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2"
                                style={inputStyle}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Colours & costs */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                            Max Colours
                            <Tooltip text="Enter the maximum colour count supported for this method and print area before extra charges or method changes are required.">
                              <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                            </Tooltip>
                          </label>
                          <input type="number" value={method.maxColors || ''} onChange={(e) => handleMethodUpdate(method.id, { maxColors: parseInt(e.target.value) || 0 })} placeholder="e.g. 4" className="w-full px-4 py-2" style={inputStyle} />
                        </div>
                        <div>
                          <div
                            className="flex items-start gap-2 px-3 py-2 rounded"
                            style={{ backgroundColor: 'var(--jolly-surface)', border: '1px solid var(--jolly-border)', borderRadius: '6px', marginTop: '26px' }}
                          >
                            <Database size={13} style={{ color: 'var(--jolly-primary)', marginTop: '1px', flexShrink: 0 }} />
                            <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                              Decoration costs (setup fee &amp; per-unit rates) are set in the{' '}
                              <strong style={{ color: 'var(--jolly-primary)' }}>Decorator Matrix</strong>{' '}
                              and pulled automatically into pricing tiers.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                          Notes
                          <Tooltip text="Capture production or artwork instructions that the design team or decorator should know for this method.">
                            <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                          </Tooltip>
                        </label>
                        <textarea
                          value={method.notes}
                          onChange={(e) => handleMethodUpdate(method.id, { notes: e.target.value })}
                          placeholder="Special instructions for the design team or decorator"
                          rows={2}
                          className="w-full px-4 py-3"
                          style={{ border: '1px solid var(--jolly-border)', fontSize: '14px', borderRadius: '6px', resize: 'vertical' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}