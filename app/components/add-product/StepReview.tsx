import { useState } from 'react';
import { Check, AlertTriangle, X as XIcon, ChevronDown, ChevronUp, Edit, Package, Tag, Printer, Image } from 'lucide-react';
import {
  ProductFormData,
  DEFAULT_APPA_FREIGHT,
  websiteStorefrontPackComplete,
  isProposalOnlyProduct,
  SUPPLIERS,
  CATEGORIES,
  SUBCATEGORIES,
  PRIMARY_DECORATION_METHODS,
} from './types';

interface StepReviewProps {
  formData: ProductFormData;
  onUpdate: (updates: Partial<ProductFormData>) => void;
  onNavigateToStep: (step: number) => void;
  onActivate: () => void;
  validationReport: ValidationReport;
  flowSteps: FlowStep[];
}

interface FlowStep {
  id: 'core' | 'decoration' | 'pricing' | 'assets' | 'review';
  label: string;
}

interface ValidationItem {
  field: string;
  step: number;
  status: 'pass' | 'warning' | 'error';
  message: string;
}

export interface ValidationReport {
  items: ValidationItem[];
  canActivate: boolean;
  totalRequired: number;
  totalComplete: number;
}

export function getValidationReport(formData: ProductFormData, flowSteps: FlowStep[]): ValidationReport {
  const items: ValidationItem[] = [];
  const getStepNumber = (id: FlowStep['id']) => flowSteps.findIndex((step) => step.id === id) + 1;
  const coreStep = getStepNumber('core');
  const decorationStep = getStepNumber('decoration');
  const pricingStep = getStepNumber('pricing');
  const assetsStep = getStepNumber('assets');

  // Step 1 validations
  if (coreStep) {
    if (formData.productName) {
      items.push({ field: 'Product Name', step: coreStep, status: 'pass', message: 'Provided' });
    } else {
      items.push({ field: 'Product Name', step: coreStep, status: 'error', message: 'Required — missing' });
    }

    if (formData.supplier) {
      items.push({ field: 'Supplier', step: coreStep, status: 'pass', message: 'Provided' });
    } else {
      items.push({ field: 'Supplier', step: coreStep, status: 'error', message: 'Required — missing' });
    }

    if (formData.supplierSku) {
      items.push({ field: 'Supplier SKU', step: coreStep, status: 'pass', message: 'Provided' });
    } else {
      items.push({ field: 'Supplier SKU', step: coreStep, status: 'error', message: 'Required — missing' });
    }

    if (formData.internalSku) {
      items.push({ field: 'Internal SKU', step: coreStep, status: 'pass', message: 'Provided' });
    } else {
      items.push({ field: 'Internal SKU', step: coreStep, status: 'error', message: 'Required — missing' });
    }

    if (formData.category) {
      items.push({ field: 'Category', step: coreStep, status: 'pass', message: formData.category });
    } else {
      items.push({ field: 'Category', step: coreStep, status: 'error', message: 'Required — missing' });
    }

    if (formData.description) {
      items.push({ field: 'Description', step: coreStep, status: 'pass', message: `${formData.description.length} chars` });
    } else {
      items.push({ field: 'Description', step: coreStep, status: 'error', message: 'Required — missing' });
    }
  }

  if (decorationStep) {
    if (formData.primaryDecorationMethod && formData.primaryDecoratorSupplier) {
      items.push({ field: 'Primary Decoration', step: decorationStep, status: 'pass', message: `${formData.primaryDecorationMethod} via ${formData.primaryDecoratorSupplier}` });
    } else if (formData.primaryDecorationMethod || formData.primaryDecoratorSupplier) {
      items.push({ field: 'Primary Decoration', step: decorationStep, status: 'warning', message: 'Method or supplier not fully selected' });
    } else {
      items.push({ field: 'Primary Decoration', step: decorationStep, status: 'warning', message: 'No decoration selected — recommended for activation' });
    }

    if (formData.decorationMethods.length > 0) {
      const preferred = formData.decorationMethods.find(d => d.preferred);
      items.push({ field: 'Decoration Detail', step: decorationStep, status: 'pass', message: `${formData.decorationMethods.length} method(s) — Preferred: ${preferred?.method || 'None'}` });
      const methodsWithoutDecorator = formData.decorationMethods.filter(d => !d.decorator);
      if (methodsWithoutDecorator.length > 0) {
        items.push({ field: 'Decorator Assignment', step: decorationStep, status: 'warning', message: `${methodsWithoutDecorator.length} method(s) missing decorator` });
      }
    }
  }

  if (pricingStep) {
    if (formData.variants.length > 0) {
      items.push({ field: 'Variants', step: pricingStep, status: 'pass', message: `${formData.variants.length} variant(s)` });
    } else {
      items.push({ field: 'Variants', step: pricingStep, status: 'error', message: 'At least one variant required' });
    }

    if (formData.pricingTiers.length > 0 && formData.pricingTiers.some(t => t.unitCost > 0)) {
      const decoratorRows = formData.pricingTiers.filter(t => t.source === 'decorator').length;
      const tierMsg = decoratorRows > 0
        ? `${formData.pricingTiers.length} tier(s) — ${decoratorRows} from rate card`
        : `${formData.pricingTiers.length} tier(s)`;
      items.push({ field: 'Pricing Tiers', step: pricingStep, status: 'pass', message: tierMsg });
    } else {
      items.push({ field: 'Pricing Tiers', step: pricingStep, status: 'error', message: 'At least one tier with cost required' });
    }

    if (formData.marginTarget > 0) {
      if (formData.marginTarget < formData.marginFloor) {
        items.push({ field: 'Margin Target', step: pricingStep, status: 'warning', message: `${formData.marginTarget}% — below floor (${formData.marginFloor}%)` });
      } else {
        items.push({ field: 'Margin Target', step: pricingStep, status: 'pass', message: `${formData.marginTarget}%` });
      }
    } else {
      items.push({ field: 'Margin Target', step: pricingStep, status: 'error', message: 'Required — missing' });
    }
  }

  if (assetsStep) {
    const blankImages = formData.assets.filter(a => a.category === 'blank' && a.status === 'complete');
    const proposalOnly = isProposalOnlyProduct(formData);
    if (blankImages.length > 0) {
      items.push({ field: 'Blank Product Images', step: assetsStep, status: 'pass', message: `${blankImages.length} image(s)` });
    } else if (proposalOnly) {
      items.push({ field: 'Blank Product Images', step: assetsStep, status: 'error', message: 'Required for proposal-only products' });
    } else {
      items.push({ field: 'Blank Product Images', step: assetsStep, status: 'warning', message: 'Recommended — no images uploaded' });
    }

    if (formData.liveOnWebsite) {
      const packOk = websiteStorefrontPackComplete(formData.assets);
      if (packOk) {
        items.push({ field: 'Website storefront images', step: assetsStep, status: 'pass', message: 'Tile, hover, and variant images present' });
      } else {
        const need: string[] = [];
        if (!formData.assets.some(a => a.category === 'website_tile' && a.status === 'complete')) need.push('tile');
        if (!formData.assets.some(a => a.category === 'website_hover' && a.status === 'complete')) need.push('hover');
        if (!formData.assets.some(a => a.category === 'website_variant' && a.status === 'complete')) need.push('variant');
        items.push({
          field: 'Website storefront images',
          step: assetsStep,
          status: 'error',
          message: `Live on website requires: ${need.join(', ')} image(s)`,
        });
      }
    }
  }

  const totalRequired = items.filter(i => i.status === 'error' || i.status === 'pass').length;
  const totalComplete = items.filter(i => i.status === 'pass').length;
  const canActivate = items.filter(i => i.status === 'error').length === 0;

  return { items, canActivate, totalRequired, totalComplete };
}

export function StepReview({ formData, onUpdate, onNavigateToStep, onActivate, validationReport, flowSteps }: StepReviewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(flowSteps.filter((step) => step.id !== 'review').map((step) => [step.id, true])),
  );
  const [editingStep, setEditingStep] = useState<FlowStep['id'] | null>(null);
  const stepNumberById = Object.fromEntries(flowSteps.map((step, index) => [step.id, index + 1])) as Record<FlowStep['id'], number | undefined>;

  const toggleSection = (step: FlowStep['id']) => {
    setExpandedSections(prev => ({ ...prev, [step]: !prev[step] }));
  };

  const getStepStatus = (step: number): 'complete' | 'warning' | 'error' => {
    const stepItems = validationReport.items.filter(i => i.step === step);
    if (stepItems.some(i => i.status === 'error')) return 'error';
    if (stepItems.some(i => i.status === 'warning')) return 'warning';
    return 'complete';
  };

  const StatusIcon = ({ status }: { status: 'complete' | 'warning' | 'error' }) => {
    if (status === 'complete') return <Check size={16} style={{ color: 'var(--jolly-success)' }} />;
    if (status === 'warning') return <AlertTriangle size={16} style={{ color: 'var(--jolly-warning)' }} />;
    return <XIcon size={16} style={{ color: 'var(--jolly-destructive)' }} />;
  };

  const StatusLabel = ({ status }: { status: 'complete' | 'warning' | 'error' }) => {
    const labels = { complete: 'Complete', warning: 'Incomplete', error: 'Missing required' };
    const colors = { complete: 'var(--jolly-success)', warning: 'var(--jolly-warning)', error: 'var(--jolly-destructive)' };
    return (
      <span style={{ fontSize: '12px', fontWeight: 600, color: colors[status] }}>
        {labels[status]}
      </span>
    );
  };

  const appaFreightReview = formData.source === 'appa' ? (formData.appaFreight ?? DEFAULT_APPA_FREIGHT) : null;
  const subcategories = formData.category ? SUBCATEGORIES[formData.category] || [] : [];

  const sectionMap: Record<Exclude<FlowStep['id'], 'review'>, { icon: React.ReactNode; content: React.ReactNode }> = {
    core: {
      icon: <Package size={18} />,
      content: (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <DetailRow label="Product Name" value={formData.productName || '—'} />
          <DetailRow label="Supplier" value={formData.supplier || '—'} />
          <DetailRow label="Supplier SKU" value={formData.supplierSku || '—'} />
          <DetailRow label="Internal SKU" value={formData.internalSku || '—'} />
          <DetailRow label="Category" value={formData.category || '—'} />
          <DetailRow label="Subcategory" value={formData.subcategory || '—'} />
          <DetailRow label="Source" value={formData.source} />
          <div className="col-span-2">
            <DetailRow label="Description" value={formData.description || '—'} />
          </div>
          {formData.productNote && (
            <div className="col-span-2">
              <DetailRow label="Note" value={formData.productNote} />
            </div>
          )}
        </div>
      ),
    },
    decoration: {
      icon: <Printer size={18} />,
      content: (
        <div className="space-y-3">
          <DetailRow label="Primary Decoration" value={formData.primaryDecorationMethod ? `${formData.primaryDecorationMethod} via ${formData.primaryDecoratorSupplier || '—'}` : '—'} />
          {formData.decorationMethods.map(method => (
            <div key={method.id} className="p-3 rounded border" style={{ borderColor: 'var(--jolly-border)', borderRadius: '6px' }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{method.method}</span>
                {method.preferred && (
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '11px', fontWeight: 600, borderRadius: '4px' }}>
                    Preferred
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                <DetailRow label="Decorator" value={method.decorator || '—'} small />
                <DetailRow label="Print Area" value={method.printAreaWidth && method.printAreaHeight ? `${method.printAreaWidth} × ${method.printAreaHeight} mm` : '—'} small />
                <DetailRow label="Max Colours" value={method.maxColors ? String(method.maxColors) : '—'} small />
                <DetailRow label="Setup Cost" value={method.setupCost ? `$${method.setupCost.toFixed(2)}` : '—'} small />
                <DetailRow label="Run Cost" value={method.runCost ? `$${method.runCost.toFixed(2)}/unit` : '—'} small />
              </div>
            </div>
          ))}
          {formData.decorationMethods.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)', fontStyle: 'italic' }}>No decoration methods added</p>
          )}
        </div>
      ),
    },
    pricing: {
      icon: <Tag size={18} />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <DetailRow label="Variants" value={`${formData.variants.length} variant(s)`} />
            <DetailRow label="Pricing Tiers" value={`${formData.pricingTiers.length} tier(s)`} />
            <DetailRow label="Margin Target" value={`${formData.marginTarget}%`} />
            <DetailRow label="Margin Floor" value={`${formData.marginFloor}%`} />
            {appaFreightReview ? (
              <>
                <DetailRow
                  label="Freight (APPA)"
                  value={`${appaFreightReview.lineLabel} — ${appaFreightReview.lineSubtitle}`}
                />
                <DetailRow
                  label="Shipping (per order)"
                  value={`$${appaFreightReview.perOrderAmount.toFixed(2)} × ${appaFreightReview.perOrderQuantity}`}
                />
              </>
            ) : (
              <>
                <DetailRow label="Supplier is Decorator" value={formData.supplierIsDecorator ? 'Yes' : 'No'} />
                {!formData.supplierIsDecorator && (
                  <DetailRow label="Freight — Supplier → Decorator" value={`$${formData.freightLeg1.toFixed(2)} / unit`} />
                )}
                <DetailRow
                  label={formData.supplierIsDecorator ? 'Freight — Supplier/Dec → Jolly HQ' : 'Freight — Decorator → Jolly HQ'}
                  value={`$${formData.freightLeg2.toFixed(2)} / unit`}
                />
              </>
            )}
            <DetailRow label="Rush Fee" value={`$${formData.rushFee.toFixed(2)} / unit`} />
            <DetailRow label="Min Order Qty" value={String(formData.minOrderQty)} />
            <DetailRow label="Max Order Qty" value={formData.maxOrderQty ? String(formData.maxOrderQty) : 'No limit'} />
          </div>
          {formData.pricingTiers.length > 0 && (
            <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--jolly-border)' }}>
              <table className="w-full" style={{ fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    <th className="text-left py-2 px-3" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Tier</th>
                    <th className="text-left py-2 px-3" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Range</th>
                    <th className="text-right py-2 px-3" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.pricingTiers.map((tier, i) => (
                    <tr key={tier.id} style={{ borderTop: '1px solid var(--jolly-border)' }}>
                      <td className="py-2 px-3" style={{ color: 'var(--jolly-text-disabled)' }}>T{i + 1}</td>
                      <td className="py-2 px-3" style={{ color: 'var(--jolly-text-body)' }}>{tier.minQty}–{tier.maxQty ?? '∞'}</td>
                      <td className="py-2 px-3 text-right" style={{ color: 'var(--jolly-text-body)', fontFamily: 'monospace' }}>${tier.unitCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },
    assets: {
      icon: <Image size={18} />,
      content: (
        <div className="space-y-3">
          <DetailRow label="Live on website" value={formData.liveOnWebsite ? 'Yes' : 'No'} />
          <DetailRow label="Website — Tile" value={`${formData.assets.filter(a => a.category === 'website_tile' && a.status === 'complete').length} file(s)`} />
          <DetailRow label="Website — Hover" value={`${formData.assets.filter(a => a.category === 'website_hover' && a.status === 'complete').length} file(s)`} />
          <DetailRow label="Website — Variants" value={`${formData.assets.filter(a => a.category === 'website_variant' && a.status === 'complete').length} file(s)`} />
          <DetailRow label="Blank Product Images" value={`${formData.assets.filter(a => a.category === 'blank' && a.status === 'complete').length} file(s)`} />
          <DetailRow label="Lifestyle Images" value={`${formData.assets.filter(a => a.category === 'lifestyle' && a.status === 'complete').length} file(s)`} />
          {formData.decorationMethods.map(method => (
            <DetailRow
              key={method.id}
              label={`${method.method} Assets`}
              value={`${formData.assets.filter(a => a.category === 'decoration' && a.decorationMethodId === method.id && a.status === 'complete').length} file(s)`}
            />
          ))}
        </div>
      ),
    },
  };

  const sections = flowSteps
    .filter((step): step is FlowStep & { id: Exclude<FlowStep['id'], 'review'> } => step.id !== 'review')
    .map((step) => ({
      id: step.id,
      step: stepNumberById[step.id] ?? 0,
      title: step.label,
      icon: sectionMap[step.id].icon,
      content: sectionMap[step.id].content,
    }));

  const errorCount = validationReport.items.filter(i => i.status === 'error').length;
  const warningCount = validationReport.items.filter(i => i.status === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Validation Report */}
      <div
        className="rounded p-5"
        style={{
          backgroundColor: errorCount > 0 ? 'var(--jolly-destructive-bg)' : warningCount > 0 ? 'var(--jolly-warning-bg)' : '#E8F5E9',
          border: `1px solid ${errorCount > 0 ? 'var(--jolly-destructive)' : warningCount > 0 ? '#E6C300' : 'var(--jolly-success)'}`,
          borderRadius: '6px',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
            {errorCount > 0 ? 'Validation Errors' : warningCount > 0 ? 'Validation Warnings' : 'All Checks Passed'}
          </h3>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: errorCount > 0 ? 'var(--jolly-destructive)' : warningCount > 0 ? 'var(--jolly-warning)' : 'var(--jolly-success)',
          }}>
            {validationReport.totalComplete} of {validationReport.totalRequired} required fields complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4 rounded-full overflow-hidden" style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <div
            style={{
              height: '100%',
              width: `${(validationReport.totalComplete / Math.max(validationReport.totalRequired, 1)) * 100}%`,
              backgroundColor: errorCount > 0 ? 'var(--jolly-destructive)' : warningCount > 0 ? 'var(--jolly-warning)' : 'var(--jolly-success)',
              transition: 'width 0.3s',
              borderRadius: '9999px',
            }}
          />
        </div>

        {/* Individual items */}
        <div className="space-y-1.5">
          {validationReport.items.filter(i => i.status !== 'pass').map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1.5 px-3 rounded"
              style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '4px' }}
            >
              <div className="flex items-center gap-2">
                {item.status === 'error' ? <XIcon size={14} style={{ color: 'var(--jolly-destructive)' }} /> : <AlertTriangle size={14} style={{ color: 'var(--jolly-warning)' }} />}
                <span style={{ fontSize: '13px', color: 'var(--jolly-text-body)' }}>{item.field}</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '12px', color: item.status === 'error' ? 'var(--jolly-destructive)' : 'var(--jolly-warning)' }}>{item.message}</span>
                <button
                  onClick={() => onNavigateToStep(item.step)}
                  style={{ fontSize: '12px', color: 'var(--jolly-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Fix →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Sections */}
      {sections.map(section => {
        const status = getStepStatus(section.step);
        const isExpanded = expandedSections[section.id];

        return (
          <div
            key={section.id}
            className="rounded"
            style={{
              backgroundColor: 'var(--jolly-card)',
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => toggleSection(section.id)}
              style={{ borderBottom: isExpanded ? '1px solid var(--jolly-border)' : 'none' }}
            >
              <div className="flex items-center gap-3">
                <StatusIcon status={status} />
                <div className="flex items-center gap-2">
                  {section.icon}
                  <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                    Step {section.step}: {section.title}
                  </span>
                </div>
                <StatusLabel status={status} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingStep(section.id); }}
                  className="flex items-center gap-1 px-2 py-1 rounded"
                  style={{
                    border: '1px solid var(--jolly-border)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--jolly-primary)',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <Edit size={12} />
                  Edit
                </button>
                {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--jolly-text-disabled)' }} /> : <ChevronDown size={18} style={{ color: 'var(--jolly-text-disabled)' }} />}
              </div>
            </div>

            {isExpanded && (
              <div className="p-6">
                {section.content}
              </div>
            )}
          </div>
        );
      })}

      {editingStep === 'core' && (
        <ReviewEditModal
          title="Edit Core Details"
          onClose={() => setEditingStep(null)}
          onOpenFullStep={() => {
            setEditingStep(null);
            onNavigateToStep(stepNumberById.core ?? 1);
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <ReviewField label="Product Name">
              <input value={formData.productName} onChange={(e) => onUpdate({ productName: e.target.value })} style={inputStyle()} />
            </ReviewField>
            <ReviewField label="Supplier">
              <select value={formData.supplier} onChange={(e) => onUpdate({ supplier: e.target.value })} style={inputStyle()}>
                <option value="">Select supplier</option>
                {SUPPLIERS.map((supplier) => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </ReviewField>
            <ReviewField label="Supplier SKU">
              <input value={formData.supplierSku} onChange={(e) => onUpdate({ supplierSku: e.target.value })} style={inputStyle()} />
            </ReviewField>
            <ReviewField label="Internal SKU">
              <input value={formData.internalSku} onChange={(e) => onUpdate({ internalSku: e.target.value })} style={inputStyle()} />
            </ReviewField>
            <ReviewField label="Category">
              <select value={formData.category} onChange={(e) => onUpdate({ category: e.target.value, subcategory: '' })} style={inputStyle()}>
                <option value="">Select category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </ReviewField>
            <ReviewField label="Subcategory">
              <select value={formData.subcategory} onChange={(e) => onUpdate({ subcategory: e.target.value })} style={inputStyle()}>
                <option value="">Select subcategory</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>{subcategory}</option>
                ))}
              </select>
            </ReviewField>
            <div className="col-span-2">
              <ReviewField label="Description">
                <textarea
                  value={formData.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  rows={5}
                  style={{ ...inputStyle(), resize: 'vertical' }}
                />
              </ReviewField>
            </div>
            <div className="col-span-2">
              <ReviewField label="Product Note (optional)">
                <textarea
                  value={formData.productNote}
                  onChange={(e) => onUpdate({ productNote: e.target.value })}
                  rows={3}
                  placeholder="Internal note for sales reps"
                  style={{ ...inputStyle(), resize: 'vertical' }}
                />
              </ReviewField>
            </div>
          </div>
        </ReviewEditModal>
      )}

      {editingStep === 'decoration' && (
        <ReviewEditModal
          title="Edit Decoration"
          onClose={() => setEditingStep(null)}
          onOpenFullStep={() => {
            setEditingStep(null);
            onNavigateToStep(stepNumberById.decoration ?? 1);
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <ReviewField label="Primary Decoration Method">
              <select value={formData.primaryDecorationMethod} onChange={(e) => onUpdate({ primaryDecorationMethod: e.target.value })} style={inputStyle()}>
                <option value="">Select method</option>
                {PRIMARY_DECORATION_METHODS.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </ReviewField>
            <ReviewField label="Primary Decorator Supplier">
              <input value={formData.primaryDecoratorSupplier} onChange={(e) => onUpdate({ primaryDecoratorSupplier: e.target.value })} style={inputStyle()} />
            </ReviewField>
            {formData.source === 'bespoke' && (
              <div className="col-span-2">
                <ReviewField label="Bespoke Decoration Details">
                  <textarea
                    value={formData.bespokeDecorationDescription}
                    onChange={(e) => onUpdate({ bespokeDecorationDescription: e.target.value })}
                    rows={4}
                    style={{ ...inputStyle(), resize: 'vertical' }}
                  />
                </ReviewField>
              </div>
            )}
          </div>
        </ReviewEditModal>
      )}

      {editingStep === 'pricing' && (
        <ReviewEditModal
          title="Edit Pricing Basics"
          onClose={() => setEditingStep(null)}
          onOpenFullStep={() => {
            setEditingStep(null);
            onNavigateToStep(stepNumberById.pricing ?? 1);
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <ReviewField label="Margin Target (%)">
              <input type="number" value={formData.marginTarget} onChange={(e) => onUpdate({ marginTarget: Number(e.target.value) || 0 })} style={inputStyle()} />
            </ReviewField>
            <ReviewField label="Margin Floor (%)">
              <input type="number" value={formData.marginFloor} onChange={(e) => onUpdate({ marginFloor: Number(e.target.value) || 0 })} style={inputStyle()} />
            </ReviewField>
            <ReviewField label="Rush Fee ($ / unit)">
              <input type="number" step="0.01" value={formData.rushFee} onChange={(e) => onUpdate({ rushFee: Number(e.target.value) || 0 })} style={inputStyle()} />
            </ReviewField>
            <ReviewField label="Min Order Qty">
              <input type="number" value={formData.minOrderQty} onChange={(e) => onUpdate({ minOrderQty: Number(e.target.value) || 0 })} style={inputStyle()} />
            </ReviewField>
            <ReviewField label="Max Order Qty">
              <input type="number" value={formData.maxOrderQty ?? ''} onChange={(e) => onUpdate({ maxOrderQty: e.target.value ? Number(e.target.value) : null })} style={inputStyle()} />
            </ReviewField>
            {!appaFreightReview && (
              <ReviewField label="Supplier is Decorator">
                <select value={formData.supplierIsDecorator ? 'yes' : 'no'} onChange={(e) => onUpdate({ supplierIsDecorator: e.target.value === 'yes' })} style={inputStyle()}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </ReviewField>
            )}
          </div>
        </ReviewEditModal>
      )}

      {editingStep === 'assets' && (
        <ReviewEditModal
          title="Edit Publication Settings"
          onClose={() => setEditingStep(null)}
          onOpenFullStep={() => {
            setEditingStep(null);
            onNavigateToStep(stepNumberById.assets ?? 1);
          }}
        >
          <div className="space-y-4">
            <ReviewField label="Live on website">
              <select value={formData.liveOnWebsite ? 'yes' : 'no'} onChange={(e) => onUpdate({ liveOnWebsite: e.target.value === 'yes' })} style={inputStyle()}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </ReviewField>
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
              Use the full Assets step to upload or replace website, blank, and decoration files.
            </p>
          </div>
        </ReviewEditModal>
      )}
    </div>
  );
}

function ReviewEditModal({
  title,
  onClose,
  children,
  onOpenFullStep,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  onOpenFullStep?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg"
        style={{
          backgroundColor: 'var(--jolly-card)',
          border: '1px solid var(--jolly-border)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--jolly-border)' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>{title}</h3>
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
              Changes save into the review summary immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jolly-text-secondary)', fontSize: '20px' }}
            aria-label="Close inline editor"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>

        <div className="flex items-center justify-between border-t px-5 py-4" style={{ borderColor: 'var(--jolly-border)' }}>
          {onOpenFullStep ? (
            <button
              type="button"
              onClick={onOpenFullStep}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jolly-primary)', fontWeight: 600, fontSize: '13px' }}
            >
              Open full step
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2"
            style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', marginBottom: '6px' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle() {
  return {
    width: '100%',
    border: '1px solid var(--jolly-border)',
    borderRadius: '6px',
    fontSize: '14px',
    padding: '10px 12px',
    backgroundColor: 'white',
    color: 'var(--jolly-text-body)',
  } as const;
}

function DetailRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <span style={{ fontSize: small ? '11px' : '12px', color: 'var(--jolly-text-secondary)', fontWeight: 500 }}>{label}</span>
      <p style={{ fontSize: small ? '13px' : '14px', color: 'var(--jolly-text-body)', marginTop: '1px' }}>{value}</p>
    </div>
  );
}