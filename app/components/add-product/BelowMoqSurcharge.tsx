import { useState, useRef, useEffect } from 'react';
import {
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Info,
  StickyNote,
  HelpCircle,
} from 'lucide-react';
import { YesNoToggle } from '../YesNoToggle';

export interface BelowMoqValues {
  allowBelowMoq: boolean;
  belowMoqSurchargeType: 'none' | 'flat' | 'percent';
  belowMoqSurchargeValue: number;
  belowMoqNote: string;
}

interface BelowMoqSurchargeProps {
  values: BelowMoqValues;
  t1MinQty: number;
  onUpdate: (updates: Partial<BelowMoqValues>) => void;
  /** If false, the whole block is shown in a read-only dimmed state */
  editable?: boolean;
}

// Surcharge type options — live ones are selectable; TBD ones are shown but disabled.
const LIVE_OPTIONS: { value: 'none' | 'flat' | 'percent'; label: string; sub: string }[] = [
  { value: 'none',    label: 'None',        sub: 'Allow below MOQ with no surcharge' },
  { value: 'flat',    label: 'Fixed Fee',   sub: '$ per unit below MOQ' },
  { value: 'percent', label: 'Percentage',  sub: '% of unit cost' },
];

const TBD_OPTIONS: { label: string; sub: string }[] = [
  { label: 'Minimum Order Value', sub: 'surcharge if order total < $X' },
  { label: 'Fixed Setup Fee',     sub: 'one-time fee per below-MOQ order' },
  { label: 'Tiered Surcharge',    sub: 'graduated by qty shortfall' },
  { label: 'Custom Formula',      sub: 'rule-based expression (admin)' },
];

export function BelowMoqSurcharge({ values, t1MinQty, onUpdate, editable = true }: BelowMoqSurchargeProps) {
  const { allowBelowMoq, belowMoqSurchargeType, belowMoqSurchargeValue, belowMoqNote } = values;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const selectedLabel = LIVE_OPTIONS.find(o => o.value === belowMoqSurchargeType)?.label ?? 'None';

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
    <div style={{ opacity: editable ? 1 : 0.65 }}>
      {/* ── Allow Below MOQ ────────────────────────────────────────────────── */}
      <div
        className="rounded"
        style={{
          border: '1px solid var(--jolly-border)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        {/* Toggle row */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            backgroundColor: allowBelowMoq ? 'var(--jolly-surface)' : 'var(--jolly-bg)',
            borderBottom: allowBelowMoq ? '1px solid var(--jolly-border)' : 'none',
          }}
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {allowBelowMoq
                ? <ToggleRight size={18} style={{ color: 'var(--jolly-primary)' }} />
                : <ToggleLeft  size={18} style={{ color: 'var(--jolly-text-disabled)' }} />
              }
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Allow Below MOQ
              </span>
              <Tooltip text="Turn this on when you want to accept smaller orders than the standard minimum quantity, with optional compensation rules.">
                <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
              </Tooltip>
            </div>
            {/* Always-visible one-liner helper */}
            <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', marginLeft: '26px', lineHeight: 1.4 }}>
              Applies when a client orders below the minimum quantity — a surcharge is added to compensate for lower volume efficiency.
            </p>
          </div>
          <YesNoToggle
            value={allowBelowMoq}
            onChange={(v) => editable && onUpdate({ allowBelowMoq: v })}
            disabled={!editable}
            size="sm"
          />
        </div>

        {/* ── Expanded surcharge config ─────────────────────────────────── */}
        {allowBelowMoq && (
          <div className="px-4 py-4" style={{ backgroundColor: 'var(--jolly-surface)' }}>

            {/* Contextual intro sentence */}
            <p
              className="mb-4"
              style={{
                fontSize: '13px',
                color: 'var(--jolly-text-secondary)',
                lineHeight: 1.5,
                paddingBottom: '12px',
                borderBottom: '1px solid var(--jolly-border)',
              }}
            >
              Configure how the surcharge is calculated when a client orders fewer than{' '}
              <strong style={{ color: 'var(--jolly-text-body)' }}>{t1MinQty} units</strong> (T1 minimum).
              The surcharge is applied per unit and shown transparently on quotes and proposals.
            </p>

            <div className="grid grid-cols-2 gap-6">

              {/* Surcharge Type — custom dropdown */}
              <div>
                <label
                  className="flex items-center gap-2 mb-2"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                >
                  Surcharge Type
                  <Tooltip text="Choose how the below-MOQ charge should be calculated: none, a fixed dollar amount, or a percentage of unit cost.">
                    <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                  </Tooltip>
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => editable && setDropdownOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded"
                    style={{
                      border: `1px solid ${dropdownOpen ? 'var(--jolly-primary)' : 'var(--jolly-border)'}`,
                      backgroundColor: 'white',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--jolly-text-body)',
                      cursor: editable ? 'pointer' : 'default',
                      height: '36px',
                      borderRadius: '6px',
                    }}
                  >
                    <span>{selectedLabel}</span>
                    <ChevronDown
                      size={14}
                      style={{
                        color: 'var(--jolly-text-secondary)',
                        transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s',
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute left-0 right-0 mt-1 rounded border shadow-lg"
                      style={{
                        top: '100%',
                        zIndex: 60,
                        backgroundColor: 'var(--jolly-card)',
                        borderColor: 'var(--jolly-border)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Live options */}
                      <div
                        style={{
                          padding: '4px 12px 3px',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: 'var(--jolly-text-disabled)',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid var(--jolly-border)',
                          backgroundColor: 'var(--jolly-bg)',
                        }}
                      >
                        Available
                      </div>
                      {LIVE_OPTIONS.map((opt) => {
                        const active = belowMoqSurchargeType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              onUpdate({ belowMoqSurchargeType: opt.value });
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5"
                            style={{
                              background: active ? 'var(--jolly-surface)' : 'none',
                              border: 'none',
                              borderBottom: '1px solid var(--jolly-border)',
                              cursor: 'pointer',
                              display: 'block',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: active ? 'var(--jolly-primary)' : 'var(--jolly-text-body)',
                              }}
                            >
                              {opt.label}
                              {active && (
                                <span
                                  className="ml-2 px-1.5 py-0.5 rounded"
                                  style={{
                                    fontSize: '10px',
                                    backgroundColor: 'var(--jolly-primary)',
                                    color: 'white',
                                    verticalAlign: 'middle',
                                  }}
                                >
                                  selected
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', marginTop: '1px' }}>
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}

                      {/* TBD options */}
                      <div
                        style={{
                          padding: '4px 12px 3px',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: '#C0392B',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #F5C6CB',
                          backgroundColor: '#FFF5F5',
                        }}
                      >
                        Coming soon
                      </div>
                      {TBD_OPTIONS.map((opt) => (
                        <div
                          key={opt.label}
                          className="px-4 py-2.5 flex items-start justify-between gap-2"
                          style={{
                            backgroundColor: '#FFF5F5',
                            borderBottom: '1px solid #F5C6CB',
                            cursor: 'not-allowed',
                          }}
                          title="Not yet available — coming in a future release"
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#AAAAAA' }}>
                              {opt.label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#BBBBBB', marginTop: '1px' }}>
                              {opt.sub}
                            </div>
                          </div>
                          {/* TBD badge */}
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: '9px',
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              color: '#C0392B',
                              backgroundColor: '#FDECEA',
                              border: '1px solid #F5C6CB',
                              borderRadius: '3px',
                              padding: '2px 6px',
                              marginTop: '3px',
                              lineHeight: '14px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            TBD
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Surcharge Value */}
              <div>
                <label
                  className="flex items-center gap-2 mb-2"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                >
                  Surcharge Value
                  <Tooltip text="Enter the amount applied per unit when the order falls below MOQ. The meaning changes based on the selected surcharge type.">
                    <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                  </Tooltip>
                  <span
                    className="ml-1"
                    style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', fontWeight: 400 }}
                  >
                    ({belowMoqSurchargeType === 'flat' ? '$ per unit' : belowMoqSurchargeType === 'percent' ? '% of unit cost' : 'No surcharge'})
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex items-center justify-center rounded"
                    style={{
                      width: '32px',
                      height: '36px',
                      border: '1px solid var(--jolly-border)',
                      borderRight: 'none',
                      backgroundColor: 'var(--jolly-bg)',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '14px',
                      color: 'var(--jolly-text-secondary)',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {belowMoqSurchargeType === 'flat' ? '$' : belowMoqSurchargeType === 'percent' ? '%' : '—'}
                  </div>
                  <input
                    type="number"
                    step={belowMoqSurchargeType === 'flat' ? '0.01' : '1'}
                    min="0"
                    value={belowMoqSurchargeValue}
                    disabled={belowMoqSurchargeType === 'none'}
                    readOnly={!editable}
                    onChange={(e) =>
                      onUpdate({ belowMoqSurchargeValue: parseFloat(e.target.value) || 0 })
                    }
                    style={{
                      border: '1px solid var(--jolly-border)',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '14px',
                      height: '36px',
                      padding: '0 12px',
                      width: '120px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Internal Note */}
            <div className="mt-4">
              <label
                className="flex items-center gap-1.5 mb-2"
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
              >
                <StickyNote size={13} style={{ color: 'var(--jolly-text-secondary)' }} />
                Internal Note
                <Tooltip text="Use this for approval rules or edge-case guidance. It is internal only and does not show on customer-facing outputs.">
                  <HelpCircle size={14} style={{ cursor: 'pointer', color: 'var(--jolly-text-secondary)' }} />
                </Tooltip>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: 'var(--jolly-bg)',
                    color: 'var(--jolly-text-disabled)',
                    border: '1px solid var(--jolly-border)',
                  }}
                >
                  optional
                </span>
              </label>
              <textarea
                value={belowMoqNote}
                readOnly={!editable}
                onChange={(e) => onUpdate({ belowMoqNote: e.target.value })}
                placeholder="e.g. 'Below-MOQ orders need manager sign-off before sending to supplier. Applies to direct corporate clients only.'"
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid var(--jolly-border)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: 'var(--jolly-text-body)',
                  backgroundColor: editable ? 'white' : 'var(--jolly-bg)',
                  resize: 'vertical',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  lineHeight: 1.5,
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--jolly-text-disabled)', marginTop: '4px' }}>
                Visible to admins and managers only. Not shown to sales reps or on quotes.
              </p>
            </div>

            {/* Info note */}
            <div
              className="flex items-start gap-2 mt-3 p-3 rounded"
              style={{
                backgroundColor: 'var(--jolly-card)',
                border: '1px solid var(--jolly-border)',
                borderRadius: '6px',
              }}
            >
              <Info size={14} style={{ color: 'var(--jolly-primary)', marginTop: '1px', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                This surcharge applies when the ordered quantity falls below the T1 minimum (
                <strong style={{ color: 'var(--jolly-text-body)' }}>{t1MinQty} units</strong>).
                It will appear on quotes and proposals — sales reps are notified at the proposal stage.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}