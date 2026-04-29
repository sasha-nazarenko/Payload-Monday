import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ChevronRight, ChevronDown, Check, Download, Flag, Minus, Plus, ArrowRight, X, AlertTriangle, Pencil, Eye, Globe, EyeOff, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import { LeftSidebar } from '../components/LeftSidebar';
import { mockProducts } from '../data/mockProducts';
import { useRole } from '../context/RoleContext';
import { useStorefront } from '../context/StorefrontContext';
import { PricingTier } from '../components/add-product/types';
import { BelowMoqSurcharge, BelowMoqValues } from '../components/add-product/BelowMoqSurcharge';
import { YesNoToggle } from '../components/YesNoToggle';
import { canPublishProduct, getMissingFields } from '../utils/storefrontRequirements';

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { currentRole } = useRole();
  const { getStatus, setStatus } = useStorefront();
  const [selectedVariant, setSelectedVariant] = useState('Natural');
  const [activeTab, setActiveTab] = useState<'specs' | 'pricing' | 'assets' | 'notes'>('specs');
  const [selectedQuantity, setSelectedQuantity] = useState(100);
  const [selectedDecorator, setSelectedDecorator] = useState('screen-print-preferred');
  const [margin, setMargin] = useState(38);
  const [rushFee, setRushFee] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [isSecondaryDecorationExpanded, setIsSecondaryDecorationExpanded] = useState(false);
  const [visibilitySaved, setVisibilitySaved] = useState(false);
  const [showMissingFieldsPanel, setShowMissingFieldsPanel] = useState(false);
  const [headerToggleSaved, setHeaderToggleSaved] = useState(false);

  // Local pending state for the right-panel YesNoToggle.
  // Seeded from StorefrontContext and kept in sync whenever the context value
  // changes (e.g. after using the header pill toggle or a bulk action).
  const [pendingVisible, setPendingVisible] = useState(false);

  // Sync pendingVisible whenever the context status for this product changes.
  // Must be called before any early returns so React hook order stays stable.
  const _statusForSync = getStatus(productId ?? '');
  useEffect(() => {
    setPendingVisible(_statusForSync === 'published');
    setVisibilitySaved(false);
  }, [_statusForSync]);

  // Pricing tab editable state
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([
    { id: 'p1', minQty: 1,   maxQty: 49,  unitCost: 6.80 },
    { id: 'p2', minQty: 50,  maxQty: 99,  unitCost: 5.20 },
    { id: 'p3', minQty: 100, maxQty: 249, unitCost: 4.20 },
    { id: 'p4', minQty: 250, maxQty: null, unitCost: 3.80 },
  ]);
  const [tierSaveMsg, setTierSaveMsg] = useState('');
  const [moqFields, setMoqFields] = useState<BelowMoqValues>({
    allowBelowMoq: false,
    belowMoqSurchargeType: 'flat',
    belowMoqSurchargeValue: 0,
    belowMoqNote: '',
  });

  const canEditPricing = currentRole === 'admin' || currentRole === 'finance';

  const handleTierChange = (id: string, field: keyof PricingTier, value: number | null) => {
    setPricingTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    setTierSaveMsg('');
  };
  const handleAddTier = () => {
    const last = pricingTiers[pricingTiers.length - 1];
    setPricingTiers(prev => [...prev, {
      id: String(Date.now()),
      minQty: last ? (last.maxQty ? last.maxQty + 1 : 500) : 1,
      maxQty: null,
      unitCost: last ? Math.max(last.unitCost - 0.5, 0.5) : 5,
    }]);
    setTierSaveMsg('');
  };
  const handleDeleteTier = (id: string) => {
    if (pricingTiers.length <= 1) return;
    setPricingTiers(prev => prev.filter(t => t.id !== id));
    setTierSaveMsg('');
  };
  const handleSavePricing = () => {
    setTierSaveMsg('saved');
    setTimeout(() => setTierSaveMsg(''), 3000);
  };

  // Find the product (in real app, this would be an API call)
  const product = mockProducts.find(p => p.id === productId);

  if (!product) {
    return <div>Product not found</div>;
  }

  // Storefront state (derived from context)
  const storefrontStatus = getStatus(product.id);
  const isPublished = storefrontStatus === 'published';
  const canPublish = canPublishProduct(product);
  const missingFields = getMissingFields(product);
  const storefrontRequired = [
    { label: 'Key Feature 1', done: true, tab: 'specs' as const },
    { label: 'Key Feature 2', done: true, tab: 'specs' as const },
    { label: 'Public product name', done: !!product.name, tab: 'specs' as const },
    { label: 'Product images (min 1)', done: !!product.image, tab: 'assets' as const },
  ];
  const productionRequired = [
    { label: 'Supplier / source', done: !!product.supplier, tab: 'specs' as const },
    { label: 'Country of production', done: false, tab: 'specs' as const },
    { label: 'Materials', done: false, tab: 'specs' as const },
    { label: 'MOQ', done: !!pricingTiers[0]?.minQty, tab: 'pricing' as const },
    { label: 'Lead time', done: true, tab: 'specs' as const },
  ];
  const storefrontDone = storefrontRequired.filter((x) => x.done).length;
  const productionDone = productionRequired.filter((x) => x.done).length;

  // Convenience alias: always reflects the *saved* context state, not the
  // pending toggle value. Used by the status banner in the right panel.
  const storefrontVisible = isPublished;

  const handleHeaderToggle = () => {
    if (!canPublish) {
      setShowMissingFieldsPanel(v => !v);
      return;
    }
    const next = isPublished ? 'unpublished' : 'published';
    setStatus(product.id, next);
    setHeaderToggleSaved(true);
    setTimeout(() => setHeaderToggleSaved(false), 2500);
    setShowMissingFieldsPanel(false);
  };

  // Mock data for variants
  const variants = [
    { name: 'Natural', color: '#F5F1E8', sku: 'AS-CT001-NAT', stock: 'in-stock', leadTime: '7–10 business days' },
    { name: 'Black', color: '#1A1A1A', sku: 'AS-CT001-BLK', stock: 'in-stock', leadTime: '7–10 business days' },
    { name: 'Navy', color: '#1F3A5F', sku: 'AS-CT001-NAV', stock: 'low-stock', leadTime: '10–14 business days' },
    { name: 'Red', color: '#C0392B', sku: 'AS-CT001-RED', stock: 'in-stock', leadTime: '7–10 business days' },
    { name: 'Forest', color: '#217346', sku: 'AS-CT001-FOR', stock: 'in-stock', leadTime: '7–10 business days' },
  ];

  const currentVariant = variants.find(v => v.name === selectedVariant) || variants[0];

  // Mock images
  const thumbnails = [
    product.image,
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=400&h=400&fit=crop',
  ];

  // Pricing calculation
  const quantityTiers = [50, 100, 250, 500, 1000];
  const baseCost = 4.20;
  const decorationCost = 2.10;
  const freightCost = 0.80;
  const landedCost = baseCost + decorationCost + freightCost;
  const rushFeeAmount = rushFee ? 0.50 : 0;
  const totalLandedCost = landedCost + rushFeeAmount;

  // Calculate sell price from margin
  const sellPrice = totalLandedCost / (1 - margin / 100);
  const totalOrderValue = sellPrice * selectedQuantity;

  const marginFloor = 25;
  const isBelowFloor = margin < marginFloor;

  const handleMarginChange = (newMargin: number) => {
    setMargin(Math.max(0, Math.min(100, newMargin)));
  };

  const tabStyle = (tab: string): React.CSSProperties => ({
    fontSize: '13px',
    fontWeight: 600,
    color: activeTab === tab ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
    marginBottom: '-1px',
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--jolly-primary)' : '2px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  });

  const cellInput: React.CSSProperties = {
    border: '1px solid var(--jolly-border)',
    borderRadius: '4px',
    fontSize: '13px',
    height: '28px',
    padding: '0 8px',
    width: '72px',
    outline: 'none',
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        backgroundColor: 'var(--jolly-bg)'
      }}
    >
      {/* Left Sidebar Navigation */}
      <LeftSidebar currentRole={currentRole} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link
              to="/"
              className="hover:underline"
              style={{ color: 'var(--jolly-text-secondary)', fontSize: '14px' }}
            >
              {currentRole === 'admin' ? 'Products' : 'Product Search'}
            </Link>
            <ChevronRight size={14} style={{ color: 'var(--jolly-text-disabled)' }} />
            <Link
              to="/"
              className="hover:underline"
              style={{ color: 'var(--jolly-text-secondary)', fontSize: '14px' }}
            >
              {product.category}
            </Link>
            <ChevronRight size={14} style={{ color: 'var(--jolly-text-disabled)' }} />
            <span style={{ color: 'var(--jolly-text-body)', fontSize: '14px' }}>{product.name}</span>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-[40%_60%] gap-8">
            {/* LEFT COLUMN - Product Info */}
            <div>
              {/* Product Header */}
              <h1 className="mb-3" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                {product.name}
              </h1>

              {/* Supplier & Status */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded"
                  style={{ backgroundColor: 'var(--jolly-surface)', fontSize: '12px' }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--jolly-primary)' }}>{product.supplier}</span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded"
                  style={{ backgroundColor: 'var(--jolly-surface)', fontSize: '11px', color: 'var(--jolly-primary)' }}
                >
                  <Check size={12} />
                  <span>APPA synced 2h ago</span>
                </div>
                {product.status === 'active' && (
                  <div
                    className="px-3 py-1 rounded"
                    style={{
                      backgroundColor: 'var(--jolly-success)',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    Active
                  </div>
                )}
                {product.status === 'non-public' && (
                  <div
                    className="px-3 py-1 rounded"
                    style={{
                      backgroundColor: 'var(--jolly-warning-bg)',
                      color: 'var(--jolly-warning)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    Internal only — not on website
                  </div>
                )}
              </div>

              {/* ── Storefront Status Toggle (Admin only) ─────────────── */}
              {currentRole === 'admin' && (
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5" style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', fontWeight: 500 }}>
                      <Globe size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
                      Storefront:
                    </div>

                    {canPublish ? (
                      <button
                        onClick={handleHeaderToggle}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
                        style={{
                          backgroundColor: isPublished ? '#E8F5E9' : '#F3F4F6',
                          color: isPublished ? '#2E7D32' : '#6B7280',
                          border: `1.5px solid ${isPublished ? '#A5D6A7' : '#D1D5DB'}`,
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          height: '30px',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isPublished ? '#22C55E' : '#9CA3AF', flexShrink: 0, display: 'inline-block' }} />
                        {isPublished ? 'Live on site' : 'Hidden'}
                      </button>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={handleHeaderToggle}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                          style={{
                            backgroundColor: '#FFFBEB',
                            color: '#92400E',
                            border: '1.5px solid #FDE68A',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            height: '30px',
                          }}
                          title="Complete required storefront fields before publishing"
                        >
                          <AlertTriangle size={13} style={{ color: '#D97706' }} />
                          Draft — fields missing
                        </button>

                        {showMissingFieldsPanel && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '100%',
                              marginTop: '8px',
                              backgroundColor: 'white',
                              border: '1px solid var(--jolly-border)',
                              borderRadius: '8px',
                              width: '260px',
                              zIndex: 30,
                              padding: '12px 14px',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: 0 }}>
                                Required before publishing
                              </p>
                              <button onClick={() => setShowMissingFieldsPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jolly-text-disabled)', padding: 0 }}>
                                <X size={13} />
                              </button>
                            </div>
                            {missingFields.map(f => (
                              <div key={f.key} className="flex items-center gap-2 py-1">
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <AlertTriangle size={9} style={{ color: '#D97706' }} />
                                </div>
                                <span style={{ fontSize: '13px', color: 'var(--jolly-text-body)' }}>{f.label}</span>
                              </div>
                            ))}
                            <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--jolly-border)' }}>
                              <button
                                onClick={() => {
                                  setActiveTab('specs');
                                  setShowMissingFieldsPanel(false);
                                }}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--jolly-primary)', fontSize: '12px', fontWeight: 600 }}
                              >
                                Complete now →
                              </button>
                            </div>
                            <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--jolly-border)' }}>
                              <p style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)', margin: 0 }}>Complete all required fields then publish from the Listing Management panel.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {headerToggleSaved && (
                      <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--jolly-success)', fontWeight: 600 }}>
                        <CheckCircle2 size={13} />
                        {isPublished ? 'Published' : 'Hidden'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image Gallery */}
              <div
                className="rounded mb-4"
                style={{
                  backgroundColor: 'var(--jolly-card)',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {/* Main Image */}
                <div
                  className="flex items-center justify-center overflow-hidden"
                  style={{
                    width: '100%',
                    height: '340px',
                    backgroundColor: '#F5F7FA',
                    borderTopLeftRadius: '6px',
                    borderTopRightRadius: '6px'
                  }}
                >
                  <img
                    src={thumbnails[selectedThumbnail]}
                    alt={product.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '24px'
                    }}
                  />
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 p-3">
                  {thumbnails.map((thumb, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedThumbnail(index)}
                      className="rounded overflow-hidden"
                      style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#F5F7FA',
                        border: selectedThumbnail === index ? '2px solid var(--jolly-primary)' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <img
                        src={thumb}
                        alt={`View ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </button>
                  ))}
                </div>

                {/* Download Link */}
                <div className="px-4 pb-4">
                  <button
                    className="flex items-center gap-2"
                    style={{
                      color: 'var(--jolly-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={16} />
                    Download blank image
                  </button>
                </div>
              </div>

              {/* Variant Selector */}
              <div
                className="p-4 rounded mb-4"
                style={{
                  backgroundColor: 'var(--jolly-card)',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <label
                  className="block mb-3"
                  style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                >
                  Colour / Variant
                </label>

                {/* Color Swatches */}
                <div className="flex gap-2 mb-4">
                  {variants.map((variant) => (
                    <button
                      key={variant.name}
                      onClick={() => setSelectedVariant(variant.name)}
                      className="rounded-full"
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: variant.color,
                        border: selectedVariant === variant.name
                          ? '2px solid var(--jolly-primary)'
                          : '1px solid var(--jolly-border)',
                        cursor: 'pointer',
                        outline: selectedVariant === variant.name ? '2px solid var(--jolly-primary)' : 'none',
                        outlineOffset: '2px'
                      }}
                      title={variant.name}
                    />
                  ))}
                </div>

                {/* Selected Variant Info */}
                <div className="mb-3">
                  <div style={{ fontSize: '14px', color: 'var(--jolly-text-body)', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{currentVariant.name}</span>
                    <span style={{ color: 'var(--jolly-text-secondary)' }}> — SKU: {currentVariant.sku}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: currentVariant.stock === 'in-stock'
                          ? 'var(--jolly-success)'
                          : 'var(--jolly-warning)'
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                      {currentVariant.stock === 'in-stock' ? 'In stock' : 'Low stock'} · Lead time: {currentVariant.leadTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div
                className="rounded overflow-hidden"
                style={{
                  backgroundColor: 'var(--jolly-card)',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {/* Tab Headers */}
                <div
                  className="flex border-b overflow-x-auto"
                  style={{ borderColor: 'var(--jolly-border)' }}
                >
                  <button onClick={() => setActiveTab('specs')} style={tabStyle('specs')}>
                    Decoration Specs
                  </button>
                  <button onClick={() => setActiveTab('pricing')} style={tabStyle('pricing')}>
                    Pricing
                  </button>
                  <button onClick={() => setActiveTab('assets')} style={tabStyle('assets')}>
                    Design Assets
                  </button>
                  <button onClick={() => setActiveTab('notes')} style={tabStyle('notes')}>
                    Product Notes
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4">

                  {/* ── DECORATION SPECS ──────────────────────────────────── */}
                  {activeTab === 'specs' && (
                    <div>
                      {/* Primary Decoration Method */}
                      <table className="w-full" style={{ fontSize: '14px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                            <td className="py-2" style={{ color: 'var(--jolly-text-secondary)', width: '40%' }}>
                              Decoration Method
                            </td>
                            <td className="py-2" style={{ color: 'var(--jolly-text-body)', fontWeight: 600 }}>
                              Screen Print (preferred)
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                            <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                              Print Area
                            </td>
                            <td className="py-2" style={{ color: 'var(--jolly-text-body)' }}>
                              280mm × 240mm
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                            <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                              Placement
                            </td>
                            <td className="py-2" style={{ color: 'var(--jolly-text-body)' }}>
                              Centre chest, 30mm from top seam
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                            <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                              Max Colours
                            </td>
                            <td className="py-2" style={{ color: 'var(--jolly-text-body)' }}>
                              6
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                            <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                              Preferred Decorator
                            </td>
                            <td className="py-2">
                              <a href="#" style={{ color: 'var(--jolly-primary)', textDecoration: 'underline' }}>
                                Print Co Melbourne
                              </a>
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                            <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                              Alt. Decorator
                            </td>
                            <td className="py-2">
                              <a href="#" style={{ color: 'var(--jolly-primary)', textDecoration: 'underline' }}>
                                BrandPrint Sydney
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                              Minimum Order
                            </td>
                            <td className="py-2" style={{ color: 'var(--jolly-text-body)' }}>
                              50 units
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Secondary Decoration Method (Collapsible) */}
                      <div className="mt-4">
                        <button
                          onClick={() => setIsSecondaryDecorationExpanded(!isSecondaryDecorationExpanded)}
                          className="flex items-center justify-between w-full p-3 rounded"
                          style={{
                            backgroundColor: 'var(--jolly-bg)',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--jolly-text-body)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <span>Embroidery (alternative)</span>
                          <ChevronDown
                            size={16}
                            style={{
                              transform: isSecondaryDecorationExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s'
                            }}
                          />
                        </button>

                        {isSecondaryDecorationExpanded && (
                          <div className="mt-2">
                            <table className="w-full" style={{ fontSize: '14px' }}>
                              <tbody>
                                <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                                  <td className="py-2" style={{ color: 'var(--jolly-text-secondary)', width: '40%' }}>
                                    Print Area
                                  </td>
                                  <td className="py-2" style={{ color: 'var(--jolly-text-body)' }}>
                                    100mm × 100mm
                                  </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                                  <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                                    Max Colours
                                  </td>
                                  <td className="py-2" style={{ color: 'var(--jolly-text-body)' }}>
                                    4
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-2" style={{ color: 'var(--jolly-text-secondary)' }}>
                                    Minimum Order
                                  </td>
                                  <td className="py-2" style={{ color: 'var(--jolly-text-body)' }}>
                                    25 units
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── PRICING TAB ───────────────────────────────────────── */}
                  {activeTab === 'pricing' && (
                    <div className="space-y-4">

                      {/* MOQ Availability + Below MOQ surcharge */}
                      <BelowMoqSurcharge
                        values={moqFields}
                        t1MinQty={pricingTiers[0]?.minQty ?? 1}
                        onUpdate={(u) => setMoqFields(prev => ({ ...prev, ...u }))}
                        editable={canEditPricing}
                      />

                      {/* MOQ Tier table */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                            MOQ Tiers & Base Cost
                          </h4>
                          {canEditPricing && (
                            <button
                              onClick={handleSavePricing}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded"
                              style={{
                                backgroundColor: 'var(--jolly-primary)',
                                color: 'white',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                height: '30px',
                              }}
                            >
                              Save pricing
                            </button>
                          )}
                        </div>

                        {tierSaveMsg === 'saved' && (
                          <div
                            className="flex items-center gap-2 mb-2 px-3 py-2 rounded"
                            style={{
                              backgroundColor: '#E8F5E9',
                              border: '1px solid var(--jolly-success)',
                              fontSize: '13px',
                              color: 'var(--jolly-success)',
                              fontWeight: 600,
                            }}
                          >
                            <Check size={13} />
                            Pricing saved successfully.
                          </div>
                        )}

                        <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--jolly-border)' }}>
                          <table className="w-full" style={{ fontSize: '13px' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                                <th className="text-left py-2 px-3" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', width: '48px' }}>Tier</th>
                                <th className="text-left py-2 px-3" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Min Qty</th>
                                <th className="text-left py-2 px-3" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Max Qty</th>
                                <th className="text-left py-2 px-3" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>Unit Cost (AUD)</th>
                                {canEditPricing && <th className="py-2 px-3" style={{ width: '36px' }} />}
                              </tr>
                            </thead>
                            <tbody>
                              {pricingTiers.map((tier, index) => (
                                <tr
                                  key={tier.id}
                                  style={{
                                    backgroundColor: index % 2 === 0 ? 'white' : 'var(--jolly-row-alt)',
                                    borderTop: '1px solid var(--jolly-border)',
                                  }}
                                >
                                  <td className="py-2 px-3">
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '20px',
                                        backgroundColor: 'var(--jolly-surface)',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: 'var(--jolly-primary)',
                                      }}
                                    >
                                      T{index + 1}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3">
                                    {canEditPricing ? (
                                      <input type="number" value={tier.minQty} style={cellInput}
                                        onChange={e => handleTierChange(tier.id, 'minQty', parseInt(e.target.value) || 0)} />
                                    ) : (
                                      <span style={{ color: 'var(--jolly-text-body)' }}>{tier.minQty}</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {canEditPricing ? (
                                      <input type="number" value={tier.maxQty ?? ''} placeholder="∞" style={cellInput}
                                        onChange={e => handleTierChange(tier.id, 'maxQty', e.target.value ? parseInt(e.target.value) : null)} />
                                    ) : (
                                      <span style={{ color: 'var(--jolly-text-body)' }}>{tier.maxQty ?? '∞'}</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {canEditPricing ? (
                                      <div className="flex items-center gap-1">
                                        <span style={{ color: 'var(--jolly-text-disabled)', fontSize: '13px' }}>$</span>
                                        <input type="number" step="0.01" value={tier.unitCost}
                                          style={{ ...cellInput, width: '68px' }}
                                          onChange={e => handleTierChange(tier.id, 'unitCost', parseFloat(e.target.value) || 0)} />
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--jolly-text-body)', fontFamily: 'monospace' }}>${tier.unitCost.toFixed(2)}</span>
                                    )}
                                  </td>
                                  {canEditPricing && (
                                    <td className="py-2 px-3">
                                      <button
                                        onClick={() => handleDeleteTier(tier.id)}
                                        disabled={pricingTiers.length <= 1}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          cursor: pricingTiers.length <= 1 ? 'not-allowed' : 'pointer',
                                          opacity: pricingTiers.length <= 1 ? 0.3 : 1,
                                          padding: '4px',
                                        }}
                                      >
                                        <X size={14} style={{ color: 'var(--jolly-destructive)' }} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {canEditPricing && (
                          <button
                            onClick={handleAddTier}
                            className="flex items-center gap-1.5 mt-2"
                            style={{
                              color: 'var(--jolly-primary)',
                              fontSize: '13px',
                              fontWeight: 600,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Plus size={14} />
                            Add tier
                          </button>
                        )}

                        {!canEditPricing && (
                          <div
                            className="flex items-center gap-2 mt-3 p-2 rounded"
                            style={{
                              backgroundColor: 'var(--jolly-bg)',
                              border: '1px solid var(--jolly-border)',
                              fontSize: '12px',
                              color: 'var(--jolly-text-secondary)',
                            }}
                          >
                            <AlertTriangle size={12} style={{ color: 'var(--jolly-warning)', flexShrink: 0 }} />
                            Pricing is view-only for your role. Contact Admin or Finance to edit.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── DESIGN ASSETS ─────────────────────────────────────── */}
                  {activeTab === 'assets' && (
                    <div className="space-y-3">
                      {[
                        { name: 'Metro Tote — Screen Print Template.ai', size: '2.4 MB' },
                        { name: 'Metro Tote — Dieline.pdf', size: '856 KB' },
                        { name: 'Print Spec Sheet.pdf', size: '1.2 MB' },
                      ].map((asset) => (
                        <div
                          key={asset.name}
                          className="flex items-center justify-between p-3 rounded"
                          style={{ backgroundColor: 'var(--jolly-bg)' }}
                        >
                          <div>
                            <div style={{ fontSize: '14px', color: 'var(--jolly-text-body)', marginBottom: '2px' }}>
                              {asset.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                              {asset.size}
                            </div>
                          </div>
                          <button
                            className="flex items-center gap-2 px-3 py-1.5 rounded"
                            style={{
                              backgroundColor: 'var(--jolly-card)',
                              border: '1px solid var(--jolly-border)',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: 'var(--jolly-primary)',
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── PRODUCT NOTES ─────────────────────────────────────── */}
                  {activeTab === 'notes' && (
                    <div style={{ fontSize: '14px', color: 'var(--jolly-text-body)', lineHeight: '1.6' }}>
                      <p className="mb-3">
                        Popular item for conferences and trade shows. Natural variant is the best seller.
                      </p>
                      <p>
                        Note: Large orders (500+) may require extended lead times during peak season (Oct-Dec).
                        Contact supplier for availability.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Flag Data Issue */}
              <button
                className="flex items-center gap-2 mt-4"
                style={{
                  fontSize: '12px',
                  color: 'var(--jolly-text-disabled)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Flag size={14} />
                Flag data issue
              </button>
            </div>

            {/* RIGHT COLUMN — role-conditional */}
            <div>
              <div
                className="rounded sticky top-6"
                style={{
                  backgroundColor: 'var(--jolly-card)',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {currentRole === 'admin' ? (
                  /* ── CMS Listing Management Panel ─────────────────────── */
                  <div className="p-6 space-y-5">
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)', marginBottom: '2px' }}>
                        Listing Management
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                        Control how this product appears on the customer storefront.
                      </p>
                    </div>

                    {/* Storefront status */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded" style={{ backgroundColor: storefrontVisible ? '#E8F5E9' : 'var(--jolly-header-bg)', border: `1px solid ${storefrontVisible ? 'var(--jolly-success)' : 'var(--jolly-border)'}`, borderRadius: '6px' }}>
                      {storefrontVisible
                        ? <Globe size={15} style={{ color: 'var(--jolly-success)', flexShrink: 0 }} />
                        : <EyeOff size={15} style={{ color: 'var(--jolly-text-disabled)', flexShrink: 0 }} />}
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: storefrontVisible ? 'var(--jolly-success)' : 'var(--jolly-text-secondary)', margin: 0 }}>
                          {storefrontVisible ? 'Live on Storefront' : 'Hidden from Storefront'}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: '1px 0 0' }}>
                          {storefrontVisible ? 'Visible to customers at jolly.com.au/shop' : 'Not visible to customers — internal use only'}
                        </p>
                      </div>
                    </div>

                    {/* Visibility toggle */}
                    <div className="p-4 rounded" style={{ border: '1px solid var(--jolly-border)', borderRadius: '6px', backgroundColor: 'var(--jolly-bg)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', margin: 0 }}>Storefront Visibility</p>
                          <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', margin: '2px 0 0' }}>Show or hide on the customer website.</p>
                        </div>
                        <YesNoToggle
                          value={pendingVisible}
                          onChange={(v) => {
                            setPendingVisible(v);
                            setVisibilitySaved(false);
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--jolly-border)' }}>
                        <button
                          onClick={() => {
                            // Block publishing if storefront requirements aren't met
                            if (pendingVisible && !canPublish) {
                              setShowMissingFieldsPanel(true);
                              return;
                            }
                            setStatus(product.id, pendingVisible ? 'published' : 'unpublished');
                            setVisibilitySaved(true);
                            setTimeout(() => setVisibilitySaved(false), 3000);
                          }}
                          style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, height: '34px', cursor: 'pointer', borderRadius: '6px', padding: '0 16px' }}
                        >
                          Save visibility
                        </button>
                        {visibilitySaved && (
                          <div className="flex items-center gap-1.5" style={{ fontSize: '13px', color: 'var(--jolly-success)', fontWeight: 600 }}>
                            <CheckCircle2 size={14} /> Saved
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Readiness widgets */}
                    <div className="rounded overflow-hidden" style={{ border: '1px solid var(--jolly-border)', borderRadius: '6px' }}>
                      <div className="px-4 py-2.5" style={{ backgroundColor: 'var(--jolly-header-bg)', borderBottom: '1px solid var(--jolly-border)' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--jolly-text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 }}>Readiness</p>
                      </div>
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: 0 }}>
                          Storefront readiness: {storefrontDone} / {storefrontRequired.length} fields complete
                        </p>
                        <div className="mt-2 space-y-1">
                          {storefrontRequired.filter((x) => !x.done).map((item) => (
                            <button
                              key={item.label}
                              onClick={() => setActiveTab(item.tab)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: 'var(--jolly-primary)', textDecoration: 'underline' }}
                            >
                              Complete now: {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--jolly-text-body)', margin: 0 }}>
                          Production readiness: {productionDone} / {productionRequired.length} fields complete
                        </p>
                        <div className="mt-2 space-y-1">
                          {productionRequired.filter((x) => !x.done).map((item) => (
                            <button
                              key={item.label}
                              onClick={() => setActiveTab(item.tab)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: 'var(--jolly-primary)', textDecoration: 'underline' }}
                            >
                              Complete now: {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Primary CTA — Edit Product */}
                    <Link
                      to={`/products/${product.id}/edit`}
                      className="w-full flex items-center justify-center gap-2 px-6 rounded"
                      style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '15px', fontWeight: 600, height: '44px', textDecoration: 'none', borderRadius: '6px', display: 'flex' }}
                    >
                      <Pencil size={16} />
                      Edit Product
                    </Link>

                    {/* Secondary CTA — Preview on Storefront */}
                    <button
                      className="w-full flex items-center justify-center gap-2 px-6 rounded"
                      style={{ backgroundColor: 'white', color: 'var(--jolly-text-body)', fontSize: '14px', fontWeight: 600, height: '40px', border: '1px solid var(--jolly-border)', cursor: 'pointer', borderRadius: '6px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--jolly-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <Eye size={15} />
                      Preview on Storefront
                      <ExternalLink size={12} style={{ color: 'var(--jolly-text-disabled)', marginLeft: '2px' }} />
                    </button>

                    {/* Utility links */}
                    <div className="flex items-center justify-center gap-3">
                      <button className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--jolly-text-disabled)' }}>
                        <RefreshCw size={12} /> Force APPA re-sync
                      </button>
                      <span style={{ color: 'var(--jolly-border)' }}>·</span>
                      <button className="flex items-center gap-1.5" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--jolly-text-disabled)' }}>
                        <Flag size={14} /> Flag data issue
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Sales / Designer Pricing Matrix ───────────────────── */
                  <div className="p-6">
                  {/* Header */}
                  <div className="mb-6">
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)', marginBottom: '4px' }}>
                      Pricing Matrix
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)' }}>
                      Prices include decoration. Adjust margin below.
                    </p>
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-6">
                    <label
                      className="block mb-3"
                      style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                    >
                      Quantity
                    </label>
                    <div className="flex gap-2">
                      {quantityTiers.map((qty) => (
                        <button
                          key={qty}
                          onClick={() => setSelectedQuantity(qty)}
                          className="flex-1 px-4 py-2 rounded"
                          style={{
                            backgroundColor: selectedQuantity === qty ? 'var(--jolly-primary)' : 'transparent',
                            color: selectedQuantity === qty ? 'white' : 'var(--jolly-text-body)',
                            border: selectedQuantity === qty ? 'none' : '1px solid var(--jolly-border)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {qty >= 1000 ? `${qty / 1000}k+` : qty}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Decoration Selector */}
                  <div className="mb-6">
                    <label
                      className="block mb-3"
                      style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                    >
                      Decoration Method
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: 'screen-print-preferred', label: 'Screen Print — Print Co Melbourne', tag: 'Preferred' },
                        { id: 'screen-print-alt', label: 'Screen Print — BrandPrint Sydney', tag: 'Alternative' },
                        { id: 'embroidery', label: 'Embroidery — EmbroidMe Brisbane', tag: null },
                      ].map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center gap-3 p-3 rounded cursor-pointer"
                          style={{
                            border: selectedDecorator === option.id
                              ? '2px solid var(--jolly-primary)'
                              : '1px solid var(--jolly-border)',
                            backgroundColor: selectedDecorator === option.id
                              ? 'var(--jolly-surface)'
                              : 'transparent'
                          }}
                        >
                          <input
                            type="radio"
                            name="decorator"
                            checked={selectedDecorator === option.id}
                            onChange={() => setSelectedDecorator(option.id)}
                            className="w-4 h-4"
                            style={{ accentColor: 'var(--jolly-primary)' }}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span style={{ fontSize: '14px', color: 'var(--jolly-text-body)' }}>
                              {option.label}
                            </span>
                            {option.tag && (
                              <span
                                className="px-2 py-0.5 rounded"
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: 'var(--jolly-surface)',
                                  color: 'var(--jolly-primary)'
                                }}
                              >
                                {option.tag}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Table */}
                  <div className="mb-6">
                    <table className="w-full" style={{ fontSize: '14px' }}>
                      <thead>
                        <tr
                          style={{
                            backgroundColor: 'var(--jolly-header-bg)',
                            borderBottom: '1px solid var(--jolly-border)'
                          }}
                        >
                          <th
                            className="text-left py-3 px-3"
                            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}
                          >
                            Cost Component
                          </th>
                          <th
                            className="text-right py-3 px-3"
                            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}
                          >
                            Unit Cost
                          </th>
                          <th
                            className="text-right py-3 px-3"
                            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}
                          >
                            Total (×{selectedQuantity} units)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                          <td className="py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            Base unit cost
                          </td>
                          <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            ${baseCost.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            ${(baseCost * selectedQuantity).toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                          <td className="py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            Decoration cost
                          </td>
                          <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            ${decorationCost.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            ${(decorationCost * selectedQuantity).toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                          <td className="py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            Freight allocation
                          </td>
                          <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            ${freightCost.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                            ${(freightCost * selectedQuantity).toFixed(2)}
                          </td>
                        </tr>
                        {rushFee && (
                          <tr style={{ borderBottom: '1px solid var(--jolly-border)' }}>
                            <td className="py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                              Rush fee
                            </td>
                            <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                              ${rushFeeAmount.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-3" style={{ color: 'var(--jolly-text-body)' }}>
                              ${(rushFeeAmount * selectedQuantity).toFixed(2)}
                            </td>
                          </tr>
                        )}
                        <tr style={{ borderTop: '2px solid var(--jolly-border)' }}>
                          <td className="py-3 px-3" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                            Total landed cost
                          </td>
                          <td className="text-right py-3 px-3" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                            ${totalLandedCost.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-3" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                            ${(totalLandedCost * selectedQuantity).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Margin Control Panel */}
                  <div
                    className="p-4 rounded mb-6"
                    style={{ backgroundColor: 'var(--jolly-surface)', borderRadius: '8px' }}
                  >
                    {/* Margin Input */}
                    <div className="mb-4">
                      <label
                        className="block mb-2"
                        style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                      >
                        Margin
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarginChange(margin - 1)}
                          className="p-2 rounded"
                          style={{
                            backgroundColor: 'var(--jolly-card)',
                            border: '1px solid var(--jolly-border)',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={margin}
                          onChange={(e) => handleMarginChange(parseFloat(e.target.value))}
                          className="flex-1 px-4 py-2 rounded text-center"
                          style={{
                            backgroundColor: 'var(--jolly-card)',
                            border: '1px solid var(--jolly-border)',
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'var(--jolly-text-body)',
                            height: '44px'
                          }}
                        />
                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>%</span>
                        <button
                          onClick={() => handleMarginChange(margin + 1)}
                          className="p-2 rounded"
                          style={{
                            backgroundColor: 'var(--jolly-card)',
                            border: '1px solid var(--jolly-border)',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Sell Price Display */}
                    <div className="mb-4">
                      <label
                        className="block mb-2"
                        style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}
                      >
                        Sell Price
                      </label>
                      <div
                        className="p-4 rounded text-center"
                        style={{
                          backgroundColor: 'var(--jolly-card)',
                          fontSize: '24px',
                          fontWeight: 700,
                          color: 'var(--jolly-primary)'
                        }}
                      >
                        ${sellPrice.toFixed(2)} / unit
                      </div>
                    </div>

                    {/* Total Order Value */}
                    <div
                      className="text-center"
                      style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)' }}
                    >
                      Total order value: <span style={{ fontWeight: 600, color: 'var(--jolly-text-body)' }}>${totalOrderValue.toFixed(2)}</span>
                    </div>

                    {/* Margin Floor Indicator */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                          Floor: {marginFloor}%
                        </span>
                        <span style={{ fontSize: '12px', color: isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-success)' }}>
                          {isBelowFloor ? 'Below floor' : 'Above floor'}
                        </span>
                      </div>
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--jolly-border)' }}
                      >
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.min(100, (margin / 100) * 100)}%`,
                            backgroundColor: isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-success)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Below Floor Warning */}
                    {isBelowFloor && (
                      <div
                        className="mt-3 p-3 rounded"
                        style={{
                          backgroundColor: 'var(--jolly-destructive-bg)',
                          border: '1px solid var(--jolly-destructive)',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--jolly-destructive)'
                        }}
                      >
                        Below margin floor — Finance approval required
                      </div>
                    )}
                  </div>

                  {/* Rush Fee Toggle */}
                  <label
                    className="flex items-center justify-between p-4 rounded mb-6 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--jolly-bg)',
                      border: '1px solid var(--jolly-border)'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                      Add rush fee (+$0.50/unit)
                    </span>
                    <div
                      onClick={() => setRushFee(!rushFee)}
                      className="relative inline-block"
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: rushFee ? 'var(--jolly-primary)' : 'var(--jolly-border)',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: rushFee ? '22px' : '2px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          transition: 'left 0.2s'
                        }}
                      />
                    </div>
                  </label>

                  <button
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded"
                    style={{
                      backgroundColor: 'var(--jolly-primary)',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 600,
                      height: '44px',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                  >
                    Add to Proposal
                    <ArrowRight size={20} />
                  </button>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}