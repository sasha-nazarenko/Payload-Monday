import { useState } from 'react';
import { Info, Sparkles, Loader2 } from 'lucide-react';
import { ProductFormData, SUPPLIERS, CATEGORIES, SUBCATEGORIES, DEFAULT_APPA_FREIGHT } from './types';

interface StepCoreDetailsProps {
  formData: ProductFormData;
  onUpdate: (updates: Partial<ProductFormData>) => void;
  errors: Record<string, string>;
  onChangeType?: () => void;
}

const TYPE_LABELS: Record<ProductFormData['source'], string> = {
  'standard': 'Standard Product',
  'appa': 'APPA Product',
  'proposal-only': 'Proposal Only',
  'bespoke': 'Bespoke Product',
};

export function StepCoreDetails({ formData, onUpdate, errors, onChangeType }: StepCoreDetailsProps) {
  const [appaLoading, setAppaLoading] = useState(false);
  const [appaFilled, setAppaFilled] = useState(false);

  const handleAppaLookup = () => {
    if (!formData.supplier || !formData.supplierSku) return;
    setAppaLoading(true);
    // Simulate APPA pre-fill
    setTimeout(() => {
      onUpdate({
        source: 'appa',
        appaFreight: DEFAULT_APPA_FREIGHT,
        productName: 'Metro Canvas Tote Bag',
        category: 'Bags & Totes',
        subcategory: 'Tote Bags',
        description: 'Premium 12oz canvas tote bag with reinforced handles and internal pocket. Available in Natural and Black. OEKO-TEX certified cotton.',
        internalSku: 'AS-CT001',
      });
      setAppaLoading(false);
      setAppaFilled(true);
    }, 1800);
  };

  const subcategories = formData.category ? SUBCATEGORIES[formData.category] || [] : [];

  const inputStyle = (fieldName: string) => ({
    border: `1px solid ${errors[fieldName] ? 'var(--jolly-destructive)' : 'var(--jolly-border)'}`,
    fontSize: '14px',
    height: '36px',
    borderRadius: '6px',
    backgroundColor: 'white',
  });

  const AppaChip = () => (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
      style={{
        backgroundColor: 'var(--jolly-surface)',
        color: 'var(--jolly-primary)',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      <Sparkles size={10} />
      APPA
    </span>
  );

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
              maxWidth: '220px',
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
    <div className="space-y-4">
      {/* APPA Lookup Banner */}
      {formData.source === 'appa' && (
        <div
          className="flex items-center justify-between p-4 rounded border-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--jolly-primary) 6%, var(--jolly-card))',
            borderColor: 'var(--jolly-primary)',
            borderRadius: '8px',
          }}
        >
          <div className="flex items-start gap-3 flex-1">
            <Sparkles size={22} style={{ color: 'var(--jolly-primary)', marginTop: '0px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                🔍 Lookup from APPA
              </p>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
                Enter supplier and SKU, then lookup to auto-populate product details, variants, and pricing from the APPA feed.
              </p>
            </div>
          </div>
          <button
            onClick={handleAppaLookup}
            disabled={!formData.supplier || !formData.supplierSku || appaLoading}
            className="flex items-center gap-2 px-5 py-2 rounded whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: formData.supplier && formData.supplierSku && !appaLoading ? 'var(--jolly-primary)' : 'var(--jolly-bg)',
              color: formData.supplier && formData.supplierSku && !appaLoading ? 'white' : 'var(--jolly-text-disabled)',
              fontSize: '14px',
              fontWeight: 600,
              height: '40px',
              border: 'none',
              cursor: formData.supplier && formData.supplierSku && !appaLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {appaLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {appaLoading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>
      )}

      {formData.source !== 'appa' && !appaFilled && (
        <div
          className="flex items-center gap-3 p-4 rounded"
          style={{
            backgroundColor: 'var(--jolly-surface)',
            borderRadius: '6px',
            border: '1px solid var(--jolly-accent)',
          }}
        >
          <Sparkles size={18} style={{ color: 'var(--jolly-primary)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              APPA Auto-Fill Available
            </p>
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '1px' }}>
              Select a supplier and enter a supplier SKU, then click &quot;Lookup&quot; to auto-fill product details from APPA.
            </p>
          </div>
        </div>
      )}

      {appaFilled && (
        <div
          className="flex items-center gap-2 p-3 rounded"
          style={{ backgroundColor: '#E8F5E9', borderRadius: '6px', fontSize: '14px', color: 'var(--jolly-success)' }}
        >
          <Info size={16} />
          APPA pre-fill complete. Fields marked with the APPA chip were auto-populated. Review and adjust as needed.
        </div>
      )}

      {/* Single flat form card */}
      <div
        className="rounded"
        style={{
          backgroundColor: 'var(--jolly-card)',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div className="p-6 space-y-5">

          {/* Product Name */}
          <div>
            <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Product Name <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
              {appaFilled && <AppaChip />}
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => onUpdate({ productName: e.target.value })}
              placeholder="e.g. Metro Canvas Tote Bag"
              className="w-full px-4 py-2"
              style={inputStyle('productName')}
            />
            {errors.productName && (
              <p style={{ fontSize: '12px', color: 'var(--jolly-destructive)', marginTop: '4px' }}>{errors.productName}</p>
            )}
          </div>

          {/* Supplier & Supplier SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Supplier <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
              </label>
              <select
                value={formData.supplier}
                onChange={(e) => onUpdate({ supplier: e.target.value })}
                className="w-full px-4 py-2"
                style={inputStyle('supplier')}
              >
                <option value="">Select supplier</option>
                {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.supplier && (
                <p style={{ fontSize: '12px', color: 'var(--jolly-destructive)', marginTop: '4px' }}>{errors.supplier}</p>
              )}
            </div>
            <div>
              <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Supplier SKU <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.supplierSku}
                onChange={(e) => onUpdate({ supplierSku: e.target.value })}
                placeholder="e.g. AS-1001"
                className="w-full px-4 py-2"
                style={inputStyle('supplierSku')}
              />
              {errors.supplierSku && (
                <p style={{ fontSize: '12px', color: 'var(--jolly-destructive)', marginTop: '4px' }}>{errors.supplierSku}</p>
              )}
            </div>
          </div>

          {/* Internal SKU */}
          <div>
            <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Internal SKU <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
              {appaFilled && <AppaChip />}
            </label>
            <input
              type="text"
              value={formData.internalSku}
              onChange={(e) => onUpdate({ internalSku: e.target.value })}
              placeholder="Auto-generated or enter manually"
              className="w-full px-4 py-2"
              style={inputStyle('internalSku')}
            />
            {errors.internalSku && (
              <p style={{ fontSize: '12px', color: 'var(--jolly-destructive)', marginTop: '4px' }}>{errors.internalSku}</p>
            )}
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Category <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
                {appaFilled && <AppaChip />}
              </label>
              <select
                value={formData.category}
                onChange={(e) => onUpdate({ category: e.target.value, subcategory: '' })}
                className="w-full px-4 py-2"
                style={inputStyle('category')}
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && (
                <p style={{ fontSize: '12px', color: 'var(--jolly-destructive)', marginTop: '4px' }}>{errors.category}</p>
              )}
            </div>
            <div>
              <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Subcategory
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => onUpdate({ subcategory: e.target.value })}
                disabled={!formData.category}
                className="w-full px-4 py-2"
                style={{
                  ...inputStyle('subcategory'),
                  backgroundColor: !formData.category ? 'var(--jolly-bg)' : 'white',
                  cursor: !formData.category ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="">Select subcategory</option>
                {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Product Type */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', marginBottom: '8px', display: 'block' }}>
              Product Type
            </label>
            <div className="flex items-center gap-3">
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  backgroundColor: 'var(--jolly-surface)',
                  border: '1px solid var(--jolly-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--jolly-text-body)',
                }}
              >
                {TYPE_LABELS[formData.source]}
              </span>
              {onChangeType && (
                <button
                  onClick={onChangeType}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--jolly-primary)',
                    color: 'var(--jolly-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--jolly-primary) 8%, transparent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  Change type
                </button>
              )}
            </div>
            {formData.source === 'proposal-only' && (
              <div
                className="flex items-start gap-2 p-3 rounded mt-3"
                style={{ backgroundColor: 'var(--jolly-warning-bg)', borderRadius: '6px', fontSize: '13px', color: 'var(--jolly-warning)' }}
              >
                <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Proposal-only products are excluded from storefront publishing and catalogue browsing.</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--jolly-border)' }} />

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Product Description <span style={{ color: 'var(--jolly-destructive)' }}>*</span>
              {appaFilled && <AppaChip />}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Enter a product description visible to sales reps and on the public website (if enabled)"
              rows={4}
              className="w-full px-4 py-3"
              style={{
                border: `1px solid ${errors.description ? 'var(--jolly-destructive)' : 'var(--jolly-border)'}`,
                fontSize: '14px',
                borderRadius: '6px',
                resize: 'vertical',
              }}
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p style={{ fontSize: '12px', color: 'var(--jolly-destructive)' }}>{errors.description}</p>
              ) : (
                <span />
              )}
              <span style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)' }}>
                {formData.description.length}/500
              </span>
            </div>
          </div>

          {/* Product Note (optional) */}
          <div>
            <label className="flex items-center gap-2 mb-1" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Product Note
              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--jolly-text-secondary)' }}>optional</span>
            </label>
            <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '8px' }}>
              Internal note for sales reps — not shown to clients or on the public website.
            </p>
            <textarea
              value={formData.productNote}
              onChange={(e) => onUpdate({ productNote: e.target.value })}
              placeholder="e.g. Preferred for conference packs; check stock levels before quoting large runs"
              rows={3}
              className="w-full px-4 py-3"
              style={{
                border: '1px solid var(--jolly-border)',
                fontSize: '14px',
                borderRadius: '6px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Bespoke decoration field */}
          {formData.source === 'bespoke' && (
            <div>
              <label className="flex items-center gap-2 mb-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Bespoke Decoration Details
              </label>
              <textarea
                value={formData.bespokeDecorationDescription}
                onChange={(e) => onUpdate({ bespokeDecorationDescription: e.target.value })}
                placeholder="Describe the custom decoration specifications, materials, and any special requirements for this bespoke product"
                rows={3}
                className="w-full px-4 py-3"
                style={{ border: '1px solid var(--jolly-border)', fontSize: '14px', borderRadius: '6px', resize: 'vertical' }}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
