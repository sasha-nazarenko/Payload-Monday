import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Info,
  Tag,
  Clock,
  DollarSign,
  Layers,
  AlertCircle,
  Truck,
} from 'lucide-react';
import {
  ProductFormData,
  AppaPriceGroup,
  AppaAddition,
  AppaPriceBreak,
  DEFAULT_APPA_FREIGHT,
} from './types';

interface StepAppaPricingProps {
  formData: ProductFormData;
  onUpdate: (updates: Partial<ProductFormData>) => void;
  errors: Record<string, string>;
}

type AdditionBucket = 'decoration' | 'upgrade' | 'service';

interface GroupedAdditions {
  decoration: AppaAddition[];
  upgrade: AppaAddition[];
  service: AppaAddition[];
}

interface GroupAttribute {
  label: string;
  value: string;
  meaning: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

function deriveGroupAttributes(group: AppaPriceGroup): GroupAttribute[] {
  const desc = group.base_price.description || '';
  const specMatch = desc.match(/\b\d+\s?(MB|GB|TB)\b/i);
  const spec = specMatch ? specMatch[0].replace(/\s+/g, '') : 'Not specified';

  return [
    {
      label: 'Lead time',
      value: group.base_price.lead_time ?? 'Not provided',
      meaning: 'Supplier turnaround for this configuration.',
    },
    {
      label: 'Spec',
      value: spec,
      meaning: 'Capacity/spec variant for this configuration.',
    },
    {
      label: 'Method',
      value: group.base_price.type,
      meaning: 'Primary decoration/base type for this configuration.',
    },
    {
      label: 'Tiers',
      value: `${group.base_price.price_breaks.length}`,
      meaning: 'Number of quantity tiers in base pricing.',
    },
    {
      label: 'Currency',
      value: group.base_price.currency,
      meaning: 'Currency for all prices in this configuration.',
    },
    {
      label: 'Base setup',
      value: fmtPrice(group.base_price.setup),
      meaning: 'One-time setup cost for the base configuration.',
    },
  ];
}

function classifyAddition(addition: AppaAddition): AdditionBucket {
  const type = (addition.type || '').toLowerCase();
  const desc = (addition.description || '').toLowerCase();
  const promo = (addition.promodata_decoration || '').toLowerCase();
  const combined = `${type} ${desc} ${promo}`;

  if (/(upgrade|\bgb\b|\btb\b|memory|capacity)/.test(combined)) return 'upgrade';
  if (/(data upload|data protection|pms|screen pop|personalisation|service fee|handling)/.test(combined)) return 'service';
  if (/(direct print|engraving|laser|screen print|uv print|rotary|decoration)/.test(combined)) return 'decoration';

  if (type === 'addition') return 'service';
  return 'decoration';
}

function groupAdditions(additions: AppaAddition[]): GroupedAdditions {
  const grouped: GroupedAdditions = { decoration: [], upgrade: [], service: [] };
  additions.forEach((a) => {
    grouped[classifyAddition(a)].push(a);
  });
  return grouped;
}

function hasOwn(obj: Record<string, boolean>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getEffectiveSelection(
  bucket: AdditionBucket,
  additionKey: string,
  siblingKeys: string[],
  indexInBucket: number,
  selections: Record<string, boolean>,
): boolean {
  if (bucket !== 'decoration') {
    return selections[additionKey] !== false;
  }

  const explicitSelected = siblingKeys.find((k) => selections[k] === true);
  if (explicitSelected) return explicitSelected === additionKey;

  const hasAnyExplicit = siblingKeys.some((k) => hasOwn(selections, k));
  if (hasAnyExplicit) return selections[additionKey] === true;

  return indexInBucket === 0;
}

function PriceBreakTable({ breaks, setupCost, label }: { breaks: AppaPriceBreak[]; setupCost: number; label?: string }) {
  if (breaks.length === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
      >
        <AlertCircle size={10} />
        Price on application
      </span>
    );
  }
  return (
    <div>
      {label && (
        <p className="mb-1" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </p>
      )}
      <div className="overflow-x-auto">
        <table style={{ fontSize: '12px', borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
              {breaks.map((b) => (
                <th
                  key={b.qty}
                  className="px-3 py-1.5 text-right"
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', whiteSpace: 'nowrap', border: '1px solid var(--jolly-border)' }}
                >
                  {b.qty}+
                </th>
              ))}
              {setupCost > 0 && (
                <th
                  className="px-3 py-1.5 text-right"
                  style={{ fontSize: '11px', fontWeight: 600, color: '#B45309', whiteSpace: 'nowrap', border: '1px solid var(--jolly-border)' }}
                >
                  Setup
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: 'white' }}>
              {breaks.map((b) => (
                <td
                  key={b.qty}
                  className="px-3 py-1.5 text-right"
                  style={{ fontWeight: 500, color: 'var(--jolly-text-body)', border: '1px solid var(--jolly-border)', whiteSpace: 'nowrap' }}
                >
                  {fmtPrice(b.price)}
                </td>
              ))}
              {setupCost > 0 && (
                <td
                  className="px-3 py-1.5 text-right"
                  style={{ fontWeight: 600, color: '#B45309', border: '1px solid var(--jolly-border)', whiteSpace: 'nowrap' }}
                >
                  {fmtPrice(setupCost)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TagChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'var(--jolly-surface)', border: '1px solid var(--jolly-border)', fontSize: '11px', color: 'var(--jolly-text-secondary)', fontWeight: 500 }}
    >
      {label}
    </span>
  );
}

function AttributeChip({ attr }: { attr: GroupAttribute }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded"
      style={{
        border: '1px solid var(--jolly-border)',
        backgroundColor: 'var(--jolly-bg)',
        fontSize: '11px',
        color: 'var(--jolly-text-secondary)',
      }}
      title={attr.meaning}
    >
      <strong style={{ color: 'var(--jolly-text-body)', fontWeight: 600 }}>{attr.label}:</strong>
      <span>{attr.value}</span>
    </span>
  );
}

// ── Addition card ──────────────────────────────────────────────────────────────

interface AdditionCardProps {
  addition: AppaAddition;
  selected: boolean;
  selectionMode: 'single' | 'multiple';
  onToggle: () => void;
}

function AdditionCard({ addition, selected, selectionMode, onToggle }: AdditionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const notes = addition.supplier_notes;
  const hasPOA = (addition.price_on_application === true) || addition.price_breaks.length === 0;

  return (
    <div
      className="rounded-lg border transition-all"
      style={{
        borderColor: selected ? 'var(--jolly-primary)' : 'var(--jolly-border)',
        backgroundColor: selected ? 'color-mix(in srgb, var(--jolly-primary) 4%, white)' : 'white',
        boxShadow: selected ? '0 0 0 1px var(--jolly-primary)' : 'none',
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        {/* Selection toggle */}
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0 flex items-center justify-center rounded"
          style={{
            width: '18px',
            height: '18px',
            borderRadius: selectionMode === 'single' ? '9999px' : '4px',
            backgroundColor: selectionMode === 'single' ? 'white' : (selected ? 'var(--jolly-primary)' : 'white'),
            border: `2px solid ${selected ? 'var(--jolly-primary)' : 'var(--jolly-border)'}`,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {selected && selectionMode === 'single' && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: 'var(--jolly-primary)',
              }}
            />
          )}
          {selected && selectionMode === 'multiple' && <Check size={11} color="white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', margin: 0 }}>
                {addition.description}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span
                  className="inline-flex items-center gap-1"
                  style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}
                >
                  <Tag size={11} />
                  {addition.type}
                </span>
                {addition.lead_time && (
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}
                  >
                    <Clock size={11} />
                    {addition.lead_time}
                  </span>
                )}
                {addition.free && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: 600 }}
                  >
                    Free
                  </span>
                )}
              </div>
            </div>

            {/* Price summary pill */}
            <div className="shrink-0 text-right">
              {hasPOA ? (
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>POA</span>
              ) : (
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                    from {fmtPrice(Math.min(...addition.price_breaks.map(b => b.price)))}/unit
                  </span>
                  {addition.setup > 0 && (
                    <p style={{ fontSize: '11px', color: '#B45309', margin: '2px 0 0' }}>
                      + {fmtPrice(addition.setup)} setup
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Price break table (always visible when selected, collapsed otherwise) */}
          {selected && !hasPOA && (
            <div className="mt-3">
              <PriceBreakTable breaks={addition.price_breaks} setupCost={addition.setup} />
            </div>
          )}

          {/* Expandable supplier notes */}
          {notes && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="inline-flex items-center gap-1"
                style={{ fontSize: '12px', color: 'var(--jolly-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                Supplier notes
              </button>
              {expanded && (
                <div
                  className="mt-2 p-3 rounded-md space-y-1.5"
                  style={{ backgroundColor: 'var(--jolly-bg)', border: '1px solid var(--jolly-border)', fontSize: '12px' }}
                >
                  {notes.sCode && (
                    <p style={{ margin: 0, color: 'var(--jolly-text-body)' }}>
                      <span style={{ fontWeight: 600 }}>Code:</span> {notes.sCode}
                    </p>
                  )}
                  {notes.sDecorator && (
                    <p style={{ margin: 0, color: 'var(--jolly-text-body)' }}>
                      <span style={{ fontWeight: 600 }}>Decorator:</span> {notes.sDecorator}
                    </p>
                  )}
                  {notes.maxDecArea && (
                    <p style={{ margin: 0, color: 'var(--jolly-text-body)' }}>
                      <span style={{ fontWeight: 600 }}>Max dec. area:</span> {notes.maxDecArea}
                    </p>
                  )}
                  {notes.sDec_Note && (
                    <p style={{ margin: 0, color: 'var(--jolly-text-secondary)', lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: 'var(--jolly-text-body)' }}>Note:</span> {notes.sDec_Note}
                    </p>
                  )}
                  {notes.sPre_Production_Sample && (
                    <p style={{ margin: 0, color: 'var(--jolly-text-body)' }}>
                      <span style={{ fontWeight: 600 }}>Pre-production sample:</span> {notes.sPre_Production_Sample}
                    </p>
                  )}
                  {notes.sComment && (
                    <p style={{ margin: 0, color: 'var(--jolly-text-secondary)' }}>{notes.sComment}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Price group accordion ──────────────────────────────────────────────────────

interface PriceGroupPanelProps {
  group: AppaPriceGroup;
  groupIndex: number;
  totalGroups: number;
  selections: Record<string, boolean>;
  onToggleAddition: (key: string, bucket: AdditionBucket, siblingKeys: string[], currentlySelected: boolean) => void;
}

function PriceGroupPanel({ group, groupIndex, totalGroups, selections, onToggleAddition }: PriceGroupPanelProps) {
  const [open, setOpen] = useState(true);
  const { base_price, additions } = group;
  const grouped = useMemo(() => groupAdditions(additions), [additions]);
  const attributes = useMemo(() => deriveGroupAttributes(group), [group]);
  const selectedCount = (Object.keys(grouped) as AdditionBucket[]).reduce((sum, bucket) => {
    const siblingKeys = grouped[bucket].map((a) => a.key);
    const bucketSelected = grouped[bucket].filter((a, i) =>
      getEffectiveSelection(bucket, a.key, siblingKeys, i, selections),
    ).length;
    return sum + bucketSelected;
  }, 0);

  const groupLabel = totalGroups > 1
    ? `Configuration ${groupIndex + 1}: ${base_price.description}`
    : base_price.description;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'white' }}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{ width: '28px', height: '28px', backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '13px', fontWeight: 700 }}
          >
            {groupIndex + 1}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', margin: 0 }} className="truncate">
              {groupLabel}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: '2px 0 0' }}>
              {additions.length === 0
                ? 'Undecorated only'
                : `${selectedCount} of ${additions.length} option${additions.length !== 1 ? 's' : ''} included`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {base_price.lead_time && (
            <span className="hidden sm:flex items-center gap-1" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
              <Clock size={12} />
              {base_price.lead_time}
            </span>
          )}
          {open ? <ChevronUp size={18} style={{ color: 'var(--jolly-text-secondary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--jolly-text-secondary)' }} />}
        </div>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--jolly-border)' }}>
          <div className="px-5 py-3 flex flex-wrap gap-2" style={{ backgroundColor: 'white', borderBottom: '1px solid var(--jolly-border)' }}>
            {attributes.map((attr) => (
              <AttributeChip key={attr.label} attr={attr} />
            ))}
          </div>

          {/* Base price */}
          <div
            className="px-5 py-4"
            style={{ backgroundColor: 'var(--jolly-bg)', borderBottom: additions.length > 0 ? `1px solid var(--jolly-border)` : undefined }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Layers size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Base price
              </span>
              {base_price.undecorated && (
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--jolly-surface)', color: 'var(--jolly-text-secondary)', border: '1px solid var(--jolly-border)' }}
                >
                  Undecorated
                </span>
              )}
            </div>
            <PriceBreakTable breaks={base_price.price_breaks} setupCost={base_price.setup} />
          </div>

          {/* Additions */}
          {additions.length > 0 && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  APPA options
                </span>
              </div>
              {grouped.decoration.length > 0 && (
                <div className="space-y-2">
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', margin: 0 }}>
                    Decoration methods (single-select)
                  </p>
                  {grouped.decoration.map((addition, i) => {
                    const siblingKeys = grouped.decoration.map((a) => a.key);
                    const isSelected = getEffectiveSelection('decoration', addition.key, siblingKeys, i, selections);
                    return (
                      <AdditionCard
                        key={addition.key}
                        addition={addition}
                        selected={isSelected}
                        selectionMode="single"
                        onToggle={() => onToggleAddition(addition.key, 'decoration', siblingKeys, isSelected)}
                      />
                    );
                  })}
                </div>
              )}

              {grouped.upgrade.length > 0 && (
                <div className="space-y-2">
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', margin: 0 }}>
                    Product upgrades (multi-select)
                  </p>
                  {grouped.upgrade.map((addition, i) => {
                    const siblingKeys = grouped.upgrade.map((a) => a.key);
                    const isSelected = getEffectiveSelection('upgrade', addition.key, siblingKeys, i, selections);
                    return (
                      <AdditionCard
                        key={addition.key}
                        addition={addition}
                        selected={isSelected}
                        selectionMode="multiple"
                        onToggle={() => onToggleAddition(addition.key, 'upgrade', siblingKeys, isSelected)}
                      />
                    );
                  })}
                </div>
              )}

              {grouped.service.length > 0 && (
                <div className="space-y-2">
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', margin: 0 }}>
                    Service fees (multi-select)
                  </p>
                  {grouped.service.map((addition, i) => {
                    const siblingKeys = grouped.service.map((a) => a.key);
                    const isSelected = getEffectiveSelection('service', addition.key, siblingKeys, i, selections);
                    return (
                      <AdditionCard
                        key={addition.key}
                        addition={addition}
                        selected={isSelected}
                        selectionMode="multiple"
                        onToggle={() => onToggleAddition(addition.key, 'service', siblingKeys, isSelected)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main step component ────────────────────────────────────────────────────────

export function StepAppaPricing({ formData, onUpdate, errors: _errors }: StepAppaPricingProps) {
  const prices = formData.appaPrices;
  const selections = formData.appaAdditionSelections ?? {};
  const appaFreight = formData.appaFreight ?? DEFAULT_APPA_FREIGHT;

  const handleToggleAddition = (
    key: string,
    bucket: AdditionBucket,
    siblingKeys: string[],
    currentlySelected: boolean,
  ) => {
    if (bucket === 'decoration') {
      const next: Record<string, boolean> = { ...selections };
      siblingKeys.forEach((k) => {
        next[k] = false;
      });
      next[key] = !currentlySelected;
      onUpdate({ appaAdditionSelections: next });
      return;
    }

    onUpdate({ appaAdditionSelections: { ...selections, [key]: !currentlySelected } });
  };

  const totalAdditions = useMemo(() => {
    if (!prices) return 0;
    return prices.price_groups.reduce((sum, g) => sum + g.additions.length, 0);
  }, [prices]);

  const selectedAdditions = useMemo(() => {
    if (!prices) return 0;
    return prices.price_groups.reduce((sum, g) => {
      const grouped = groupAdditions(g.additions);
      const selectedInGroup = (Object.keys(grouped) as AdditionBucket[]).reduce((groupSum, bucket) => {
        const siblingKeys = grouped[bucket].map((a) => a.key);
        const selectedInBucket = grouped[bucket].filter((a, i) =>
          getEffectiveSelection(bucket, a.key, siblingKeys, i, selections),
        ).length;
        return groupSum + selectedInBucket;
      }, 0);
      return sum + selectedInGroup;
    }, 0);
  }, [prices, selections]);

  if (!prices) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 rounded-lg border"
        style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'var(--jolly-card)', color: 'var(--jolly-text-secondary)' }}
      >
        <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
        <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>No APPA pricing data</p>
        <p style={{ fontSize: '13px', margin: '6px 0 0' }}>
          Complete the APPA Sync step first to load pricing from the feed.
        </p>
      </div>
    );
  }

  const priceTags = prices.price_tags;
  const hasMultipleGroups = prices.price_groups.length > 1;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border"
        style={{ backgroundColor: 'color-mix(in srgb, var(--jolly-primary) 5%, white)', borderColor: 'color-mix(in srgb, var(--jolly-primary) 30%, var(--jolly-border))' }}
      >
        <div className="flex items-center gap-2">
          <Info size={15} style={{ color: 'var(--jolly-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--jolly-text-body)' }}>
            <strong>APPA feed data</strong> — pricing imported automatically.
            {hasMultipleGroups
              ? ` ${prices.price_groups.length} configurations available.`
              : ' 1 base price group.'}
            {' '}Select which decoration additions to include for the catalogue listing.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="px-2.5 py-1 rounded-full font-semibold"
            style={{ fontSize: '12px', backgroundColor: 'var(--jolly-primary)', color: 'white' }}
          >
            {selectedAdditions}/{totalAdditions} additions selected
          </span>
        </div>
      </div>

      {/* How to read groups */}
      <div
        className="rounded-lg border px-4 py-3"
        style={{ backgroundColor: 'white', borderColor: 'var(--jolly-border)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} style={{ color: 'var(--jolly-primary)' }} />
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: 0 }}>
            How to read a configuration group
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1.5">
          <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}><strong style={{ color: 'var(--jolly-text-body)' }}>Lead time:</strong> supplier turnaround for this exact setup.</p>
          <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}><strong style={{ color: 'var(--jolly-text-body)' }}>Spec:</strong> capacity/spec variant (for example 512MB, 1GB).</p>
          <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}><strong style={{ color: 'var(--jolly-text-body)' }}>Method:</strong> primary print/decoration style for this group.</p>
          <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}><strong style={{ color: 'var(--jolly-text-body)' }}>Tiers:</strong> how many quantity tiers are in base pricing.</p>
          <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}><strong style={{ color: 'var(--jolly-text-body)' }}>Currency:</strong> all prices in the group use this currency.</p>
          <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: 0 }}><strong style={{ color: 'var(--jolly-text-body)' }}>Base setup:</strong> one-time setup fee before add-ons.</p>
        </div>
      </div>

      {/* Price tags */}
      {(priceTags.decorator?.length || priceTags.decoration?.length || priceTags.website_group?.length) ? (
        <div
          className="px-4 py-3 rounded-lg border space-y-2"
          style={{ backgroundColor: 'white', borderColor: 'var(--jolly-border)' }}
        >
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Feed tags
          </p>
          {priceTags.decorator?.length ? (
            <div className="flex items-center flex-wrap gap-1.5">
              <span style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Decorator:</span>
              {priceTags.decorator.map(t => <TagChip key={t} label={t} />)}
            </div>
          ) : null}
          {priceTags.decoration?.length ? (
            <div className="flex items-center flex-wrap gap-1.5">
              <span style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Decoration:</span>
              {priceTags.decoration.map(t => <TagChip key={t} label={t} />)}
            </div>
          ) : null}
          {priceTags.website_group?.length ? (
            <div className="flex items-center flex-wrap gap-1.5">
              <span style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Website groups:</span>
              {priceTags.website_group.map(t => <TagChip key={t} label={t} />)}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Price groups */}
      {prices.price_groups.map((group, i) => (
        <PriceGroupPanel
          key={group.base_price.key}
          group={group}
          groupIndex={i}
          totalGroups={prices.price_groups.length}
          selections={selections}
          onToggleAddition={handleToggleAddition}
        />
      ))}

      {/* Freight — read-only from feed */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'white' }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'var(--jolly-bg)' }}>
          <Truck size={16} style={{ color: 'var(--jolly-text-secondary)' }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', margin: 0 }}>Freight</p>
            <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: '2px 0 0' }}>Read-only — supplied by APPA feed</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)', margin: 0 }}>{appaFreight.lineLabel}</p>
              <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: '2px 0 0' }}>{appaFreight.lineSubtitle}</p>
            </div>
            <div className="text-right">
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: 0 }}>
                {fmtPrice(appaFreight.perOrderAmount)}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', margin: '2px 0 0' }}>per order</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      {prices.price_disclaimer && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-lg"
          style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E' }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{prices.price_disclaimer}</span>
        </div>
      )}
    </div>
  );
}
