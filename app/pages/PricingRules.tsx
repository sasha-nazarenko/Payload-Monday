import { useState, Fragment } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import {
  ArrowRight,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';

// --- Types ---

interface MarginFloorRow {
  category: string;
  marginFloor: number;
  marginTarget: number;
  products: number;
  atRisk: number;
  atRiskSeverity: 'none' | 'amber' | 'red';
  lastChanged: string;
}

interface AtRiskProduct {
  id: string;
  name: string;
  category: string;
  floor: number;
  currentMargin: number;
  diff: number;
  costTrigger: string;
  severity: 'red' | 'amber';
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  target: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  isSystem: boolean;
}

// --- Mock Data ---

const marginFloorData: MarginFloorRow[] = [
  { category: 'Bags', marginFloor: 25, marginTarget: 42, products: 1240, atRisk: 3, atRiskSeverity: 'amber', lastChanged: 'Mar 10 by Maria F.' },
  { category: 'Apparel', marginFloor: 28, marginTarget: 45, products: 1050, atRisk: 0, atRiskSeverity: 'none', lastChanged: 'Feb 28' },
  { category: 'Drinkware', marginFloor: 22, marginTarget: 38, products: 890, atRisk: 1, atRiskSeverity: 'amber', lastChanged: 'Mar 08' },
  { category: 'Writing', marginFloor: 20, marginTarget: 35, products: 620, atRisk: 0, atRiskSeverity: 'none', lastChanged: 'Mar 01' },
  { category: 'Tech', marginFloor: 30, marginTarget: 48, products: 510, atRisk: 7, atRiskSeverity: 'red', lastChanged: 'Today' },
  { category: 'Headwear', marginFloor: 25, marginTarget: 40, products: 440, atRisk: 0, atRiskSeverity: 'none', lastChanged: 'Feb 14' },
];

const atRiskProducts: AtRiskProduct[] = [
  { id: '1', name: 'USB-C Hub 4-Port', category: 'Tech', floor: 30, currentMargin: 28, diff: -2, costTrigger: 'APPA cost \u2191 $1.20', severity: 'red' },
  { id: '2', name: 'Wireless Earbuds Pro', category: 'Tech', floor: 30, currentMargin: 29, diff: -1, costTrigger: 'APPA cost \u2191 $2.40', severity: 'red' },
  { id: '3', name: 'Bluetooth Speaker Mini', category: 'Tech', floor: 30, currentMargin: 27, diff: -3, costTrigger: 'APPA cost \u2191 $0.85', severity: 'red' },
  { id: '4', name: 'Wireless Mouse Slim', category: 'Tech', floor: 30, currentMargin: 29.5, diff: -0.5, costTrigger: 'APPA cost \u2191 $0.50', severity: 'red' },
  { id: '5', name: 'Metro Tote Bag', category: 'Bags', floor: 25, currentMargin: 25.5, diff: 0.5, costTrigger: 'Near floor', severity: 'amber' },
  { id: '6', name: 'Canvas Duffle Large', category: 'Bags', floor: 25, currentMargin: 25.2, diff: 0.2, costTrigger: 'Near floor', severity: 'amber' },
  { id: '7', name: 'Recycled Shoulder Bag', category: 'Bags', floor: 25, currentMargin: 25.8, diff: 0.8, costTrigger: 'Near floor', severity: 'amber' },
  { id: '8', name: 'Sports Bottle 500ml', category: 'Drinkware', floor: 22, currentMargin: 22.3, diff: 0.3, costTrigger: 'Near floor', severity: 'amber' },
  { id: '9', name: 'Webcam HD 1080p', category: 'Tech', floor: 30, currentMargin: 28.5, diff: -1.5, costTrigger: 'APPA cost \u2191 $1.80', severity: 'red' },
  { id: '10', name: 'Power Bank 10000mAh', category: 'Tech', floor: 30, currentMargin: 29, diff: -1, costTrigger: 'APPA cost \u2191 $0.95', severity: 'red' },
  { id: '11', name: 'LED Desk Lamp', category: 'Tech', floor: 30, currentMargin: 28, diff: -2, costTrigger: 'APPA cost \u2191 $1.10', severity: 'red' },
];

const auditLogData: AuditLogEntry[] = [
  { id: '1', timestamp: 'Today 09:14', target: 'Tech (category)', fieldChanged: 'Margin Floor', oldValue: '28%', newValue: '30%', changedBy: 'Maria F.', isSystem: false },
  { id: '2', timestamp: 'Mar 10 16:22', target: 'Metro Tote Bag', fieldChanged: 'Base Cost', oldValue: '$4.10', newValue: '$4.20', changedBy: 'System (APPA Sync)', isSystem: true },
  { id: '3', timestamp: 'Mar 10 16:22', target: 'Metro Tote Bag', fieldChanged: 'Decorator Cost', oldValue: '$2.00', newValue: '$2.10', changedBy: 'Maria F.', isSystem: false },
  { id: '4', timestamp: 'Mar 08 11:45', target: 'Drinkware (category)', fieldChanged: 'Margin Target', oldValue: '35%', newValue: '38%', changedBy: 'Maria F.', isSystem: false },
  { id: '5', timestamp: 'Mar 07 09:30', target: 'USB-C Hub 4-Port', fieldChanged: 'Base Cost', oldValue: '$8.50', newValue: '$9.70', changedBy: 'System (APPA Sync)', isSystem: true },
  { id: '6', timestamp: 'Mar 06 14:10', target: 'Bags (category)', fieldChanged: 'Margin Floor', oldValue: '23%', newValue: '25%', changedBy: 'Maria F.', isSystem: false },
  { id: '7', timestamp: 'Mar 05 10:00', target: 'Wireless Earbuds Pro', fieldChanged: 'Base Cost', oldValue: '$11.20', newValue: '$13.60', changedBy: 'System (APPA Sync)', isSystem: true },
  { id: '8', timestamp: 'Mar 04 16:45', target: 'Writing (category)', fieldChanged: 'Margin Floor', oldValue: '18%', newValue: '20%', changedBy: 'Maria F.', isSystem: false },
];

// --- Inline Edit Panel ---

function InlineEditPanel({
  product,
  onClose,
}: {
  product: AtRiskProduct;
  onClose: () => void;
}) {
  const [newCost, setNewCost] = useState('');
  const [newMargin, setNewMargin] = useState('');

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div
          className="px-6 py-5 border-t border-b"
          style={{
            backgroundColor: 'var(--jolly-surface)',
            borderColor: 'var(--jolly-accent)',
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Update Pricing — {product.name}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
                Adjust cost or sell price to bring margin above the {product.floor}% floor.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/60 transition-colors"
              style={{ border: 'none', cursor: 'pointer', background: 'none' }}
            >
              <X size={18} style={{ color: 'var(--jolly-text-secondary)' }} />
            </button>
          </div>
          <div className="flex gap-6 items-end">
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--jolly-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                New Base Cost ($)
              </label>
              <input
                type="text"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                placeholder="e.g. 8.50"
                style={{
                  height: '36px',
                  width: '160px',
                  borderRadius: '6px',
                  border: '1px solid var(--jolly-border)',
                  padding: '0 12px',
                  fontSize: '14px',
                  color: 'var(--jolly-text-body)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--jolly-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(31,92,158,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--jolly-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--jolly-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Target Margin (%)
              </label>
              <input
                type="text"
                value={newMargin}
                onChange={(e) => setNewMargin(e.target.value)}
                placeholder={`min ${product.floor}%`}
                style={{
                  height: '36px',
                  width: '160px',
                  borderRadius: '6px',
                  border: '1px solid var(--jolly-border)',
                  padding: '0 12px',
                  fontSize: '14px',
                  color: 'var(--jolly-text-body)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--jolly-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(31,92,158,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--jolly-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div
              className="flex-1 px-4 py-2 rounded"
              style={{
                backgroundColor: 'white',
                border: '1px solid var(--jolly-border)',
                borderRadius: '6px',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Preview
              </p>
              <p style={{ fontSize: '14px', color: 'var(--jolly-text-body)', marginTop: '2px' }}>
                {newCost && newMargin ? (
                  <>
                    Sell: <span style={{ fontWeight: 600 }}>${(parseFloat(newCost) / (1 - parseFloat(newMargin) / 100)).toFixed(2)}</span>
                    {' '}&middot;{' '}Margin: <span style={{ fontWeight: 600, color: parseFloat(newMargin) >= product.floor ? 'var(--jolly-success)' : 'var(--jolly-destructive)' }}>{newMargin}%</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--jolly-text-disabled)' }}>Enter values to preview</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--jolly-border)',
                  backgroundColor: 'white',
                  color: 'var(--jolly-text-body)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--jolly-primary)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// --- At Risk Badge ---

function AtRiskBadge({ count, severity }: { count: number; severity: 'none' | 'amber' | 'red' }) {
  if (severity === 'none') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5"
        style={{
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '4px',
          backgroundColor: '#E8F5E9',
          color: 'var(--jolly-success)',
        }}
      >
        <Check size={12} /> None
      </span>
    );
  }

  const isRed = severity === 'red';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5"
      style={{
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '4px',
        backgroundColor: isRed ? 'var(--jolly-destructive-bg)' : 'var(--jolly-warning-bg)',
        color: isRed ? 'var(--jolly-destructive)' : 'var(--jolly-warning)',
      }}
    >
      {count} {isRed ? 'urgent' : 'at risk'}
    </span>
  );
}

// --- Main Component ---

export function PricingRules() {
  const { currentRole } = useRole();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);

  const totalProducts = marginFloorData.reduce((sum, r) => sum + r.products, 0);
  const totalAtRisk = marginFloorData.reduce((sum, r) => sum + r.atRisk, 0);

  const auditPageSize = 8;
  const auditTotalPages = Math.ceil(auditLogData.length / auditPageSize);
  const paginatedAudit = auditLogData.slice(
    (auditPage - 1) * auditPageSize,
    auditPage * auditPageSize
  );

  return (
    <div
      className="flex h-screen"
      style={{
        backgroundColor: 'var(--jolly-bg)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <LeftSidebar currentRole={currentRole} />

      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div
          className="bg-white border-b px-8 py-5 flex items-center justify-between"
          style={{ borderColor: 'var(--jolly-border)' }}
        >
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--jolly-text-body)', lineHeight: '1.2' }}>
              Pricing Rules
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
              Control margin floors, targets, and cost overrides across the catalogue.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>
              Last updated: Today, 09:14 AM by Maria F.
            </span>
            <button
              className="flex items-center gap-2"
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '6px',
                border: '1px solid var(--jolly-border)',
                backgroundColor: 'white',
                color: 'var(--jolly-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
                e.currentTarget.style.borderColor = 'var(--jolly-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = 'var(--jolly-border)';
              }}
            >
              <Download size={14} /> Export audit log
            </button>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-6">
          {/* SECTION 1: Margin Floors by Category */}
          <div
            className="bg-white rounded"
            style={{
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid var(--jolly-border)',
            }}
          >
            <div className="px-6 pt-5 pb-4 flex items-start justify-between">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Margin Floors by Category
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
                  The pricing engine enforces these floors. No quote can be generated below these values.
                </p>
              </div>
              <button
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--jolly-border)',
                  backgroundColor: 'white',
                  color: 'var(--jolly-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
                  e.currentTarget.style.borderColor = 'var(--jolly-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = 'var(--jolly-border)';
                }}
              >
                Edit floors
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    {['Category', 'Margin Floor (%)', 'Margin Target (%)', 'Products', 'At Risk', 'Last Changed'].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--jolly-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {marginFloorData.map((row, i) => (
                    <tr
                      key={row.category}
                      style={{
                        backgroundColor: i % 2 === 0 ? '#FFFFFF' : 'var(--jolly-row-alt)',
                        borderTop: '1px solid var(--jolly-border)',
                        height: '48px',
                      }}
                    >
                      <td
                        className="px-6 py-3"
                        style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)' }}
                      >
                        {row.category}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5"
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--jolly-text-body)',
                            backgroundColor: 'var(--jolly-surface)',
                            borderRadius: '4px',
                          }}
                        >
                          {row.marginFloor}%
                        </span>
                      </td>
                      <td
                        className="px-6 py-3"
                        style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)' }}
                      >
                        {row.marginTarget}%
                      </td>
                      <td
                        className="px-6 py-3"
                        style={{ fontSize: '14px', color: 'var(--jolly-text-body)' }}
                      >
                        {row.products.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <AtRiskBadge count={row.atRisk} severity={row.atRiskSeverity} />
                      </td>
                      <td
                        className="px-6 py-3"
                        style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}
                      >
                        {row.lastChanged}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr
                    style={{
                      borderTop: '2px solid var(--jolly-border)',
                      backgroundColor: 'var(--jolly-header-bg)',
                      height: '48px',
                    }}
                  >
                    <td
                      className="px-6 py-3"
                      style={{ fontSize: '14px', fontWeight: 700, color: 'var(--jolly-text-body)' }}
                    >
                      All categories
                    </td>
                    <td className="px-6 py-3" style={{ fontSize: '14px', color: 'var(--jolly-text-disabled)' }}>
                      &mdash;
                    </td>
                    <td className="px-6 py-3" style={{ fontSize: '14px', color: 'var(--jolly-text-disabled)' }}>
                      &mdash;
                    </td>
                    <td
                      className="px-6 py-3"
                      style={{ fontSize: '14px', fontWeight: 700, color: 'var(--jolly-text-body)' }}
                    >
                      {totalProducts.toLocaleString()}
                    </td>
                    <td
                      className="px-6 py-3"
                      style={{ fontSize: '14px', fontWeight: 700, color: 'var(--jolly-warning)' }}
                    >
                      {totalAtRisk} at risk
                    </td>
                    <td className="px-6 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Alert Banner */}
            <div
              className="mx-6 mb-5 mt-4 px-5 py-4 flex items-center justify-between rounded"
              style={{
                backgroundColor: 'var(--jolly-warning-bg)',
                borderRadius: '6px',
                border: '1px solid #F0E0A0',
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  style={{ color: 'var(--jolly-warning)', flexShrink: 0, marginTop: '1px' }}
                />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-warning)' }}>
                    {totalAtRisk} products have margins at or below their floor due to recent APPA cost updates.
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--jolly-warning)', opacity: 0.8, marginTop: '2px' }}>
                    Review and reprice before these products are quoted.
                  </p>
                </div>
              </div>
              <button
                className="flex items-center gap-1.5 flex-shrink-0"
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--jolly-primary)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Review at-risk products <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* SECTION 2: At-Risk Products */}
          <div
            className="bg-white rounded"
            style={{
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid var(--jolly-border)',
            }}
          >
            <div className="px-6 pt-5 pb-4">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                At-Risk Products &mdash; Margin at or Below Floor
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
                These products require immediate pricing attention to maintain margin compliance.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    {['Product', 'Category', 'Floor', 'Current Margin', 'Cost Trigger', 'Action'].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--jolly-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {atRiskProducts.map((product) => (
                    <Fragment key={product.id}>
                      <tr
                        style={{
                          backgroundColor:
                            product.severity === 'red'
                              ? 'var(--jolly-destructive-bg)'
                              : 'var(--jolly-warning-bg)',
                          borderTop: '1px solid var(--jolly-border)',
                          height: '48px',
                        }}
                      >
                        <td
                          className="px-6 py-3"
                          style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)' }}
                        >
                          {product.name}
                        </td>
                        <td
                          className="px-6 py-3"
                          style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}
                        >
                          {product.category}
                        </td>
                        <td className="px-6 py-3" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                          {product.floor}%
                        </td>
                        <td className="px-6 py-3">
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color:
                                product.diff < 0
                                  ? 'var(--jolly-destructive)'
                                  : 'var(--jolly-warning)',
                            }}
                          >
                            {product.currentMargin}%
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              marginLeft: '6px',
                              color:
                                product.diff < 0
                                  ? 'var(--jolly-destructive)'
                                  : 'var(--jolly-warning)',
                            }}
                          >
                            ({product.diff > 0 ? '+' : ''}
                            {product.diff}%)
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              backgroundColor:
                                product.severity === 'red'
                                  ? 'rgba(192,57,43,0.1)'
                                  : 'rgba(123,88,0,0.1)',
                              color:
                                product.severity === 'red'
                                  ? 'var(--jolly-destructive)'
                                  : 'var(--jolly-warning)',
                            }}
                          >
                            {product.costTrigger}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() =>
                              setEditingProductId(
                                editingProductId === product.id ? null : product.id
                              )
                            }
                            style={{
                              height: '30px',
                              padding: '0 14px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor:
                                product.severity === 'red'
                                  ? 'var(--jolly-primary)'
                                  : 'white',
                              color:
                                product.severity === 'red'
                                  ? 'white'
                                  : 'var(--jolly-primary)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              ...(product.severity === 'amber'
                                ? {
                                    border: '1px solid var(--jolly-border)',
                                  }
                                : {}),
                            }}
                          >
                            {product.severity === 'red'
                              ? 'Update pricing'
                              : 'Review'}
                          </button>
                        </td>
                      </tr>
                      {editingProductId === product.id && (
                        <InlineEditPanel
                          key={`edit-${product.id}`}
                          product={product}
                          onClose={() => setEditingProductId(null)}
                        />
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: Audit Log */}
          <div
            className="bg-white rounded"
            style={{
              borderRadius: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid var(--jolly-border)',
            }}
          >
            <div className="px-6 pt-5 pb-4 flex items-center justify-between">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Pricing Change Audit Log
              </h2>
              <button
                className="flex items-center gap-1"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--jolly-primary)',
                  padding: 0,
                }}
              >
                View full audit <ArrowRight size={13} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    {['Timestamp', 'Product / Category', 'Field Changed', 'Old Value', 'New Value', 'Changed By'].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--jolly-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAudit.map((entry, i) => (
                    <tr
                      key={entry.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? '#FFFFFF' : 'var(--jolly-row-alt)',
                        borderTop: '1px solid var(--jolly-border)',
                        height: '48px',
                      }}
                    >
                      <td className="px-6 py-3">
                        <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)', fontVariantNumeric: 'tabular-nums' }}>
                          {entry.timestamp}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)' }}>
                          {entry.target}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            backgroundColor: 'var(--jolly-surface)',
                            color: 'var(--jolly-primary)',
                          }}
                        >
                          {entry.fieldChanged}
                        </span>
                      </td>
                      <td className="px-6 py-3" style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)' }}>
                        {entry.oldValue}
                      </td>
                      <td className="px-6 py-3" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                        {entry.newValue}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                            {entry.changedBy}
                          </span>
                          {entry.isSystem && (
                            <span
                              className="px-2 py-0.5"
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                borderRadius: '4px',
                                backgroundColor: 'var(--jolly-surface)',
                                color: 'var(--jolly-primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              APPA
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              className="px-6 py-3 flex items-center justify-between border-t"
              style={{ borderColor: 'var(--jolly-border)', backgroundColor: 'var(--jolly-bg)' }}
            >
              <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>
                Showing {(auditPage - 1) * auditPageSize + 1}&ndash;{Math.min(auditPage * auditPageSize, auditLogData.length)} of {auditLogData.length} entries
              </span>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>
                  Page {auditPage} of {auditTotalPages}
                </span>
                <button
                  onClick={() => setAuditPage(Math.max(1, auditPage - 1))}
                  disabled={auditPage === 1}
                  className="p-1 rounded border"
                  style={{
                    borderColor: 'var(--jolly-border)',
                    backgroundColor: 'white',
                    cursor: auditPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: auditPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={16} style={{ color: 'var(--jolly-text-secondary)' }} />
                </button>
                <button
                  onClick={() => setAuditPage(Math.min(auditTotalPages, auditPage + 1))}
                  disabled={auditPage === auditTotalPages}
                  className="p-1 rounded border"
                  style={{
                    borderColor: 'var(--jolly-border)',
                    backgroundColor: 'white',
                    cursor: auditPage === auditTotalPages ? 'not-allowed' : 'pointer',
                    opacity: auditPage === auditTotalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={16} style={{ color: 'var(--jolly-text-secondary)' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}