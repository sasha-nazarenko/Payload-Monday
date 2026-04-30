import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronRight, PackageCheck, ShoppingCart } from 'lucide-react';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import { OrderNavigationState } from '../utils/salesWorkflow';

export function OrderBuilder() {
  const { currentRole } = useRole();
  const location = useLocation();
  const state = (location.state ?? null) as OrderNavigationState | null;
  const orderSeed = state?.orderSeed ?? {
    proposalId: 'PRO-2024-0084',
    proposalTitle: 'PRO-2024-0084',
    clientName: 'GreenCo Sustainability',
    eventName: 'Earth Day Event',
    dueDate: 'Mar 10',
    status: 'Won',
    totalValue: 3960,
    productCount: 3,
    unitCount: 400,
    lineItems: [
      { id: 'fallback-1', name: 'Imported proposal line items', supplier: 'Mixed suppliers', qty: 400, unitPrice: 9.9, source: 'Proposal carry-forward' },
    ],
  };

  const [finalQuantities, setFinalQuantities] = useState<Record<string, number>>(
    Object.fromEntries(orderSeed.lineItems.map((item) => [item.id, item.qty]))
  );
  const [deliveryAddress, setDeliveryAddress] = useState('Level 4, 120 Collins Street, Melbourne VIC 3000');
  const [shippingMethod, setShippingMethod] = useState('Standard freight');

  const finalUnitCount = useMemo(
    () => Object.values(finalQuantities).reduce((sum, qty) => sum + qty, 0),
    [finalQuantities]
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--jolly-bg)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <LeftSidebar currentRole={currentRole} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="border-b bg-white px-8 py-4" style={{ borderColor: 'var(--jolly-border)' }}>
          <nav className="mb-2 flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link to="/proposals" style={{ fontSize: '13px', color: 'var(--jolly-primary)', fontWeight: 500, textDecoration: 'none' }}>
              My Proposals
            </Link>
            <ChevronRight size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
            <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>New Order Shell</span>
          </nav>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                Order Shell from {orderSeed.proposalTitle}
              </h1>
              <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                Carry-forward review before final order creation.
              </p>
            </div>
            <button
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--jolly-primary)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span className="inline-flex items-center gap-2"><ShoppingCart size={14} /> Create Order Shell</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,2fr)_360px] gap-6 px-8 py-6">
          <div className="space-y-6">
            <section className="rounded border bg-white p-5" style={{ borderColor: 'var(--jolly-border)' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Carry-forward details</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Client</p>
                  <p style={{ marginTop: '4px', fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{orderSeed.clientName}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Event</p>
                  <p style={{ marginTop: '4px', fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{orderSeed.eventName}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Proposal status</p>
                  <p style={{ marginTop: '4px', fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{orderSeed.status}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Original due date</p>
                  <p style={{ marginTop: '4px', fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{orderSeed.dueDate}</p>
                </div>
              </div>
            </section>

            <section className="rounded border bg-white p-5" style={{ borderColor: 'var(--jolly-border)' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Final quantity lock-in</h2>
              <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                Review transferred line items and confirm the final production quantities.
              </p>
              <div className="mt-4 overflow-hidden rounded border" style={{ borderColor: 'var(--jolly-border)' }}>
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Product</th>
                      <th className="px-4 py-3 text-left" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Supplier</th>
                      <th className="px-4 py-3 text-left" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Source</th>
                      <th className="px-4 py-3 text-left" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Final Qty</th>
                      <th className="px-4 py-3 text-left" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderSeed.lineItems.map((item) => (
                      <tr key={item.id} style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <td className="px-4 py-3" style={{ fontSize: '14px', color: 'var(--jolly-text-body)', fontWeight: 600 }}>{item.name}</td>
                        <td className="px-4 py-3" style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>{item.supplier}</td>
                        <td className="px-4 py-3" style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>{item.source}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={finalQuantities[item.id] ?? item.qty}
                            onChange={(e) => setFinalQuantities((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value) || 1) }))}
                            style={{ width: '96px', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 10px', fontSize: '13px' }}
                          />
                        </td>
                        <td className="px-4 py-3" style={{ fontSize: '13px', color: 'var(--jolly-text-body)' }}>${item.unitPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded border bg-white p-5" style={{ borderColor: 'var(--jolly-border)' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Fulfilment shell</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>Delivery address</label>
                  <textarea
                    rows={3}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    style={{ width: '100%', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>Shipping method</label>
                  <input
                    value={shippingMethod}
                    onChange={(e) => setShippingMethod(e.target.value)}
                    style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 10px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>Decoration spec handoff</label>
                  <input
                    value="Use approved proposal artwork and decoration notes"
                    readOnly
                    style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 10px', fontSize: '13px', backgroundColor: '#F9FAFB', color: 'var(--jolly-text-secondary)' }}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded border bg-white p-5" style={{ borderColor: 'var(--jolly-border)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--jolly-text-body)', fontWeight: 600 }}>
                <PackageCheck size={16} style={{ color: 'var(--jolly-primary)' }} />
                Order summary
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>Products</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{orderSeed.productCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>Original units</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{orderSeed.unitCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>Final units</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{finalUnitCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>Proposal value</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>${orderSeed.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}