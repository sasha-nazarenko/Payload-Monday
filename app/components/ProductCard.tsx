import { Heart, Printer, Scissors, Zap, Sparkles, Pencil, Eye, Globe, EyeOff, AlertTriangle, Check, Bookmark, FolderPlus } from 'lucide-react';
import { useState, useRef } from 'react';
import { Link } from 'react-router';
import { Product } from '../types';
import { useRole } from '../context/RoleContext';
import { useStorefront } from '../context/StorefrontContext';
import { canPublishProduct, getMissingFields } from '../utils/storefrontRequirements';

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  onToggleSelect?: (productId: string) => void;
  isInShortlist?: boolean;
  onToggleShortlist?: (product: Product) => void;
  onAddToProposal?: (product: Product) => void;
}

const decorationIcons: Record<string, React.ReactNode> = {
  'Screen Print': <Printer size={14} />,
  'Embroidery': <Scissors size={14} />,
  'Laser Engrave': <Zap size={14} />,
  'Digital Print': <Sparkles size={14} />,
};

export function ProductCard({
  product,
  isSelected = false,
  onToggleSelect,
  isInShortlist = false,
  onToggleShortlist,
  onAddToProposal,
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showMissingTooltip, setShowMissingTooltip] = useState(false);
  const { currentRole } = useRole();
  const { getStatus, setStatus } = useStorefront();
  const isAdmin = currentRole === 'admin';
  const tooltipRef = useRef<HTMLDivElement>(null);

  const storefrontStatus = getStatus(product.id);
  const canPublish = canPublishProduct(product);
  const missingFields = getMissingFields(product);

  // Derive display status for badge
  const displayStatus: 'published' | 'unpublished' | 'draft' =
    canPublish && storefrontStatus === 'published'
      ? 'published'
      : !canPublish
        ? 'draft'
        : 'unpublished';

  const storefrontBadge = {
    published:   { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7', label: 'Live on site',  icon: <Globe size={11} /> },
    unpublished: { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB', label: 'Hidden',         icon: <EyeOff size={11} /> },
    draft:       { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', label: 'Draft',           icon: <AlertTriangle size={11} /> },
  }[displayStatus];

  // Non-admin status styles (keep existing behaviour)
  const statusStyles = {
    active:       { bg: 'var(--jolly-success)', text: 'white', label: 'Active' },
    'non-public': { bg: 'var(--jolly-warning-bg)', text: 'var(--jolly-warning)', label: 'Non-public' },
    proposal:     { bg: 'var(--jolly-surface)', text: 'var(--jolly-primary)', label: 'Proposal-Only' },
  };
  const status = statusStyles[product.status];

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canPublish) {
      setShowMissingTooltip(v => !v);
      return;
    }
    // Toggle between published/unpublished
    setStatus(product.id, storefrontStatus === 'published' ? 'unpublished' : 'published');
    setShowMissingTooltip(false);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.(product.id);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleShortlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleShortlist?.(product);
  };

  const handleAddToProposalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToProposal?.(product);
  };

  const salesActions = (
    <div className="grid grid-cols-2 gap-2 mt-auto">
      <button
        className="flex items-center justify-center gap-1.5 py-2 rounded border transition-colors"
        style={{
          borderColor: isInShortlist ? 'var(--jolly-primary)' : 'var(--jolly-border)',
          color: isInShortlist ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
          backgroundColor: isInShortlist ? 'var(--jolly-surface)' : 'white',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: '6px',
          height: '36px',
          cursor: 'pointer',
        }}
        onClick={handleShortlistClick}
      >
        <Bookmark size={13} />
        {isInShortlist ? 'Shortlisted' : 'Shortlist'}
      </button>
      <button
        className="flex items-center justify-center gap-1.5 py-2 rounded border transition-colors"
        style={{
          borderColor: 'var(--jolly-primary)',
          color: 'var(--jolly-primary)',
          backgroundColor: 'white',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: '6px',
          height: '36px',
          cursor: 'pointer',
        }}
        onClick={handleAddToProposalClick}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--jolly-surface)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
      >
        <FolderPlus size={13} />
        Add to Proposal
      </button>
    </div>
  );

  return (
    <Link
      to={`/product/${product.id}`}
      className="bg-white rounded overflow-hidden flex flex-col h-full"
      style={{
        borderRadius: '6px',
        boxShadow: isSelected
          ? '0 0 0 2px var(--jolly-primary), 0 1px 3px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        position: 'relative',
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: 'var(--jolly-bg)' }}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        {/* Top-left: checkbox (admin) or heart (non-admin) */}
        {isAdmin ? (
          <button
            onClick={handleCheckboxClick}
            className="absolute top-2 left-2 flex items-center justify-center rounded transition-all"
            style={{
              width: '22px',
              height: '22px',
              backgroundColor: isSelected ? 'var(--jolly-primary)' : 'white',
              border: isSelected ? '2px solid var(--jolly-primary)' : '2px solid var(--jolly-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              zIndex: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            {isSelected && <Check size={13} style={{ color: 'white' }} strokeWidth={3} />}
          </button>
        ) : (
          <button
            onClick={handleHeartClick}
            className="absolute top-2 left-2 p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
          >
            <Heart
              size={16}
              fill={isFavorite ? '#C0392B' : 'none'}
              style={{ color: isFavorite ? '#C0392B' : 'var(--jolly-text-disabled)' }}
            />
          </button>
        )}

        {/* Top-right: storefront badge (admin) or internal status badge (non-admin) */}
        {isAdmin ? (
          <div className="absolute top-2 right-2" style={{ zIndex: 2 }} ref={tooltipRef}>
            <button
              onClick={handleBadgeClick}
              className="flex items-center gap-1 px-2 py-1 rounded"
              style={{
                backgroundColor: storefrontBadge.bg,
                color: storefrontBadge.text,
                border: `1px solid ${storefrontBadge.border}`,
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1.3,
              }}
              title={
                canPublish
                  ? `Click to ${storefrontStatus === 'published' ? 'remove from' : 'publish to'} storefront`
                  : 'Complete required storefront fields before publishing'
              }
            >
              {storefrontBadge.icon}
              {storefrontBadge.label}
            </button>

            {/* Missing fields popover */}
            {showMissingTooltip && missingFields.length > 0 && (
              <div
                className="absolute right-0 mt-1 rounded shadow-lg"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid var(--jolly-border)',
                  borderRadius: '6px',
                  width: '220px',
                  zIndex: 50,
                  padding: '10px 12px',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Missing required fields
                </p>
                {missingFields.map(f => (
                  <div key={f.key} className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={11} style={{ color: '#D97706', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--jolly-text-body)' }}>{f.label}</span>
                  </div>
                ))}
                <p style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--jolly-border)' }}>
                  Edit the product to add missing content.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold"
            style={{
              backgroundColor: status.bg,
              color: status.text,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {status.label}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        {/* Product Name */}
        <h3
          className="font-semibold mb-1 line-clamp-2"
          style={{
            color: 'var(--jolly-text-body)',
            fontSize: '14px',
            fontWeight: 600,
            minHeight: '2.5rem',
          }}
        >
          {product.name}
        </h3>

        {/* Supplier */}
        <p
          className="mb-2"
          style={{
            color: 'var(--jolly-text-disabled)',
            fontSize: '12px',
          }}
        >
          {product.supplier}
        </p>

        {/* Category Tag */}
        <div className="mb-3">
          <span
            className="inline-block px-2 py-0.5 rounded text-xs"
            style={{
              backgroundColor: 'var(--jolly-bg)',
              color: 'var(--jolly-text-secondary)',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            {product.category}
          </span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <span
            className="font-semibold"
            style={{
              color: 'var(--jolly-primary)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            From ${product.price.toFixed(2)} / unit
          </span>
        </div>

        {/* Decoration Icons */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {product.decorationMethods.map((method) => (
            <div
              key={method}
              className="p-1.5 rounded"
              style={{
                backgroundColor: 'var(--jolly-surface)',
                color: 'var(--jolly-primary)',
              }}
              title={method}
            >
              {decorationIcons[method]}
            </div>
          ))}
        </div>

        {/* View Pricing / Manage Listing Button */}
        {isAdmin ? (
          <div className="mt-auto space-y-2">
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded border transition-colors"
                style={{
                  borderColor: 'var(--jolly-primary)',
                  color: 'var(--jolly-primary)',
                  backgroundColor: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  height: '36px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--jolly-surface)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
              >
                <Pencil size={13} />
                Manage Listing
              </button>
              <button
                className="flex items-center justify-center gap-1 px-3 py-2 rounded border transition-colors"
                style={{
                  borderColor: 'var(--jolly-border)',
                  color: 'var(--jolly-text-secondary)',
                  backgroundColor: 'white',
                  fontSize: '13px',
                  borderRadius: '6px',
                  height: '36px',
                  cursor: 'pointer',
                }}
                title="Preview on Storefront"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--jolly-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
              >
                <Eye size={14} />
              </button>
            </div>
            {salesActions}
          </div>
        ) : (
          salesActions
        )}
      </div>
    </Link>
  );
}
