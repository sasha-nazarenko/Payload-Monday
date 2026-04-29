import { useState, useEffect } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { FilterSidebar } from '../components/FilterSidebar';
import { TopBar } from '../components/TopBar';
import { ProductGrid } from '../components/ProductGrid';
import { useFilters } from '../context/FilterContext';
import { useRole } from '../context/RoleContext';
import { useStorefront } from '../context/StorefrontContext';
import { mockProducts } from '../data/mockProducts';
import { filterProducts } from '../utils/filterProducts';
import { canPublishProduct, getMissingFields } from '../utils/storefrontRequirements';
import {
  Globe, EyeOff, X, AlertTriangle, Check, ChevronRight,
  ExternalLink, Square, CheckSquare
} from 'lucide-react';

export function ProductCatalogue() {
  const { filters } = useFilters();
  const { currentRole } = useRole();
  const { bulkSetStatus } = useStorefront();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'publish' | 'unpublish' | null>(null);
  const [bulkToast, setBulkToast] = useState<string | null>(null);
  const productsPerPage = 9;

  const isAdmin = false;

  // Apply filters to products
  const filteredProducts = filterProducts(mockProducts, filters);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Clear selection when role changes
  useEffect(() => {
    setSelectedIds([]);
  }, [currentRole]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      const contentArea = document.getElementById('product-grid-area');
      if (contentArea) contentArea.scrollTop = 0;
    }
  };

  const handleToggleSelect = (productId: string) => {
    setSelectedIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    const allOnPage = currentProducts.map(p => p.id);
    const allSelected = allOnPage.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allOnPage.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allOnPage])));
    }
  };

  const allOnPageSelected = currentProducts.length > 0 && currentProducts.every(p => selectedIds.includes(p.id));
  const someOnPageSelected = currentProducts.some(p => selectedIds.includes(p.id));

  // Bulk action handlers
  const selectedProducts = mockProducts.filter(p => selectedIds.includes(p.id));
  const readyToPublish = selectedProducts.filter(p => canPublishProduct(p));
  const notReady = selectedProducts.filter(p => !canPublishProduct(p));

  const handleBulkPublishClick = () => {
    setBulkAction('publish');
    setShowPublishModal(true);
  };

  const handleBulkUnpublishClick = () => {
    setBulkAction('unpublish');
    setShowPublishModal(true);
  };

  const handleConfirmBulkAction = () => {
    if (bulkAction === 'publish') {
      const idsToPublish = readyToPublish.map(p => p.id);
      bulkSetStatus(idsToPublish, 'published');
      setBulkToast(`${idsToPublish.length} product${idsToPublish.length !== 1 ? 's' : ''} published to storefront.`);
    } else if (bulkAction === 'unpublish') {
      bulkSetStatus(selectedIds, 'unpublished');
      setBulkToast(`${selectedIds.length} product${selectedIds.length !== 1 ? 's' : ''} removed from storefront.`);
    }
    setSelectedIds([]);
    setShowPublishModal(false);
    setBulkAction(null);
    setTimeout(() => setBulkToast(null), 4000);
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        backgroundColor: 'var(--jolly-bg)',
      }}
    >
      {/* Left Sidebar Navigation */}
      <LeftSidebar currentRole={currentRole} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar productCount={filteredProducts.length} />

        {/* Admin: Select-all bar */}
        {isAdmin && (
          <div
            className="flex items-center gap-3 px-6 py-2 border-b"
            style={{
              borderColor: 'var(--jolly-border)',
              backgroundColor: selectedIds.length > 0 ? 'var(--jolly-surface)' : 'white',
            }}
          >
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--jolly-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                padding: 0,
              }}
            >
              {allOnPageSelected
                ? <CheckSquare size={16} style={{ color: 'var(--jolly-primary)' }} />
                : someOnPageSelected
                  ? <CheckSquare size={16} style={{ color: 'var(--jolly-text-disabled)', opacity: 0.5 }} />
                  : <Square size={16} />
              }
              <span>
                {allOnPageSelected
                  ? `Deselect all on page (${currentProducts.length})`
                  : `Select all on page (${currentProducts.length})`}
              </span>
            </button>
            {selectedIds.length > 0 && (
              <span style={{ fontSize: '13px', color: 'var(--jolly-primary)', fontWeight: 600 }}>
                {selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
        )}

        {/* Content: Filter Sidebar + Product Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Filter Sidebar */}
          <FilterSidebar />

          {/* Product Grid Area */}
          <div id="product-grid-area" className="flex-1 overflow-y-auto">
            <div className="py-6">
              <ProductGrid
                products={currentProducts}
                currentPage={currentPage}
                totalPages={totalPages > 0 ? totalPages : 1}
                totalCount={filteredProducts.length}
                onPageChange={handlePageChange}
                selectedIds={selectedIds}
                onToggleSelect={isAdmin ? handleToggleSelect : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      {isAdmin && selectedIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl"
          style={{
            transform: 'translateX(-50%)',
            backgroundColor: '#1A202C',
            zIndex: 40,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            {selectedIds.length} selected
          </span>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

          {/* Publish */}
          <button
            onClick={handleBulkPublishClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              backgroundColor: '#22C55E',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              height: '34px',
            }}
          >
            <Globe size={14} />
            Publish to Storefront
          </button>

          {/* Remove */}
          <button
            onClick={handleBulkUnpublishClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              height: '34px',
            }}
          >
            <EyeOff size={14} />
            Remove from Storefront
          </button>

          {/* Deselect */}
          <button
            onClick={() => setSelectedIds([])}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: '34px',
              height: '34px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
            title="Deselect all"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Bulk Publish Summary Modal */}
      {showPublishModal && bulkAction && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPublishModal(false); setBulkAction(null); } }}
        >
          <div
            className="rounded-xl shadow-2xl"
            style={{
              backgroundColor: 'white',
              width: '480px',
              maxWidth: '90vw',
              padding: '28px',
              borderRadius: '10px',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--jolly-text-body)', marginBottom: '4px' }}>
                  {bulkAction === 'publish' ? 'Publish to Storefront' : 'Remove from Storefront'}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                  Reviewing {selectedIds.length} selected product{selectedIds.length !== 1 ? 's' : ''}…
                </p>
              </div>
              <button
                onClick={() => { setShowPublishModal(false); setBulkAction(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jolly-text-disabled)', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            {bulkAction === 'publish' ? (
              <>
                {/* Ready count */}
                <div
                  className="flex items-center gap-3 p-3 rounded-lg mb-3"
                  style={{ backgroundColor: '#F0FDF4', border: '1px solid #A7F3D0' }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: '28px', height: '28px', backgroundColor: '#22C55E', flexShrink: 0 }}
                  >
                    <Check size={14} style={{ color: 'white' }} strokeWidth={3} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#15803D', margin: 0 }}>
                      {readyToPublish.length} of {selectedIds.length} products are ready to publish
                    </p>
                    <p style={{ fontSize: '12px', color: '#16A34A', margin: '2px 0 0' }}>
                      All required storefront fields are complete.
                    </p>
                  </div>
                </div>

                {/* Not-ready count */}
                {notReady.length > 0 && (
                  <div
                    className="p-3 rounded-lg mb-4"
                    style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{ width: '28px', height: '28px', backgroundColor: '#F59E0B', flexShrink: 0 }}
                      >
                        <AlertTriangle size={14} style={{ color: 'white' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', margin: 0 }}>
                          {notReady.length} product{notReady.length !== 1 ? 's are' : ' is'} missing required fields
                        </p>
                        <p style={{ fontSize: '12px', color: '#B45309', margin: '2px 0 0' }}>
                          These will be skipped — complete their listings to publish.
                        </p>
                      </div>
                    </div>
                    <div className="pl-2">
                      {notReady.slice(0, 4).map(p => {
                        const missing = getMissingFields(p);
                        return (
                          <div key={p.id} className="flex items-start gap-2 mb-1.5">
                            <ChevronRight size={12} style={{ color: '#D97706', marginTop: '3px', flexShrink: 0 }} />
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>{p.name}</span>
                              <span style={{ fontSize: '12px', color: '#B45309' }}> — missing: {missing.map(f => f.label).join(', ')}</span>
                            </div>
                          </div>
                        );
                      })}
                      {notReady.length > 4 && (
                        <p style={{ fontSize: '12px', color: '#B45309', fontStyle: 'italic' }}>
                          …and {notReady.length - 4} more.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {readyToPublish.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginBottom: '20px' }}>
                    No selected products have all required fields complete. Edit the incomplete products first.
                  </p>
                ) : null}
              </>
            ) : (
              // Unpublish summary
              <div
                className="flex items-center gap-3 p-3 rounded-lg mb-4"
                style={{ backgroundColor: '#F9FAFB', border: '1px solid var(--jolly-border)' }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: '28px', height: '28px', backgroundColor: '#6B7280', flexShrink: 0 }}
                >
                  <EyeOff size={14} style={{ color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', margin: 0 }}>
                    {selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''} will be hidden from the storefront
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: '2px 0 0' }}>
                    Customers will no longer see these products at jolly.com.au/shop.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {bulkAction === 'publish' && notReady.length > 0 && readyToPublish.length > 0 && (
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--jolly-bg)',
                    color: 'var(--jolly-text-secondary)',
                    border: '1px solid var(--jolly-border)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '36px',
                  }}
                  onClick={() => { setShowPublishModal(false); setBulkAction(null); }}
                >
                  <ExternalLink size={13} />
                  Review incomplete
                </button>
              )}
              <button
                onClick={() => { setShowPublishModal(false); setBulkAction(null); }}
                style={{
                  backgroundColor: 'white',
                  color: 'var(--jolly-text-body)',
                  border: '1px solid var(--jolly-border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkAction}
                disabled={bulkAction === 'publish' && readyToPublish.length === 0}
                style={{
                  backgroundColor: bulkAction === 'publish' ? '#22C55E' : '#4B5563',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  height: '36px',
                  padding: '0 20px',
                  borderRadius: '6px',
                  cursor: (bulkAction === 'publish' && readyToPublish.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (bulkAction === 'publish' && readyToPublish.length === 0) ? 0.5 : 1,
                }}
              >
                {bulkAction === 'publish'
                  ? readyToPublish.length > 0
                    ? `Publish ${readyToPublish.length} product${readyToPublish.length !== 1 ? 's' : ''}`
                    : 'Nothing to publish'
                  : `Remove ${selectedIds.length} from storefront`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action toast */}
      {bulkToast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl"
          style={{
            backgroundColor: '#1A202C',
            color: 'white',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 60,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Check size={15} style={{ color: '#22C55E' }} />
          {bulkToast}
        </div>
      )}
    </div>
  );
}
