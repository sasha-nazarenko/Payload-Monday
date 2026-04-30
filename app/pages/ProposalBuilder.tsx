import { useState, useRef, useEffect, Fragment, useMemo } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import { Link, useLocation, useNavigate } from 'react-router';
import { PayloadUIButton as Button } from '../components/ui/payload-button';
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Plus,
  Copy,
  Trash2,
  Search,
  Upload,
  AlertTriangle,
  Lock,
  ArrowLeft,
  FileText,
  Send,
  Paperclip,
  Bold,
  Italic,
  List,
  ClipboardList,
} from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import { consumePendingProposalState, ProposalNavigationState, ProposalSeedProduct } from '../utils/salesWorkflow';

// --- Types ---

type ProposalStatus = 'Design request' | 'Draft' | 'Sent' | 'Approved' | 'Won' | 'Lost';

type OpportunityTier = '' | 'Strategic $100K+' | 'Gold $50K+' | 'Silver $10K - $50K' | 'Bronze $2.5K - $10K' | 'Copper <$2.5K';
type ProposalTemplate = '' | 'Standard' | 'HLC - Items' | 'HLC - Product Collage';
type ProductDesignType = '' | 'Custom design' | 'Unbranded';
type DesignFilesType = '' | 'Provided' | 'Requested' | 'Not available';
type PricingSpreadsheetType = '' | 'Required' | 'Not Required';
type PriceBreak = '10' | '25' | '50' | '100' | '250' | '500' | '1000';
const DEFAULT_PRICE_BREAKS: PriceBreak[] = ['10', '25', '50', '100', '250', '500', '1000'];

interface LineItem {
  id: string;
  product: string;
  productLink: string;
  requiresSecondDecoration: boolean;
  priceBreak: number;
  quoteNotes: string;
  designNotes: string;
  supplier: string;
  sku: string;
  source: 'APPA' | 'Manual' | 'Proposal-Only';
  image: string;
  variant: string;
  variantOptions: string[];
  qty: number;
  moq: number;
  baseCost: number;
  decoCost: number;
  decoration: string;
  decorationOptions: string[];
  margin: number;
  marginFloor: number;
  tierPrices: Record<PriceBreak, number>;
}

function buildInitialTierPrices(baseCost: number, decoCost: number, margin: number): Record<PriceBreak, number> {
  const unitSell = computeSellPrice(baseCost + decoCost, margin);
  return DEFAULT_PRICE_BREAKS.reduce((acc, tier) => {
    acc[tier] = Number(unitSell.toFixed(2));
    return acc;
  }, {} as Record<PriceBreak, number>);
}

function normalizeLineItemTiers(
  item: Omit<LineItem, 'tierPrices'> & { tierPrices?: Partial<Record<PriceBreak, number>> }
): LineItem {
  const fallback = buildInitialTierPrices(item.baseCost, item.decoCost, item.margin);
  const merged = DEFAULT_PRICE_BREAKS.reduce((acc, tier) => {
    const candidate = item.tierPrices?.[tier];
    acc[tier] = typeof candidate === 'number' ? candidate : fallback[tier];
    return acc;
  }, {} as Record<PriceBreak, number>);

  return {
    ...item,
    tierPrices: merged,
  };
}

interface SearchProduct {
  id: string;
  name: string;
  supplier: string;
  price: number;
  image: string;
  source: 'APPA' | 'Manual' | 'Proposal-Only';
  category: string;
}

// --- Mock Data ---

const IMG = {
  tote: 'https://images.unsplash.com/photo-1761052677126-2c7138069d44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b3RlJTIwYmFnJTIwcHJvbW90aW9uYWwlMjBwcm9kdWN0fGVufDF8fHx8MTc3MzQyMTY0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  cap: 'https://images.unsplash.com/photo-1768765139114-65dec7022a68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbWJyb2lkZXJlZCUyMGJhc2ViYWxsJTIwY2FwfGVufDF8fHx8MTc3MzQyMTY0MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  bottle: 'https://images.unsplash.com/photo-1637905351378-67232a5f0c9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXRlciUyMGJvdHRsZSUyMHByb21vdGlvbmFsfGVufDF8fHx8MTc3MzQyMTY0MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  pen: 'https://images.unsplash.com/photo-1771868035704-4f0235c9083a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZW4lMjBzZXQlMjBzdGF0aW9uZXJ5fGVufDF8fHx8MTc3MzQyMTY0Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  usb: 'https://images.unsplash.com/photo-1760462787496-98fea13d2511?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxVU0IlMjBkcml2ZSUyMHRlY2glMjBhY2Nlc3Nvcnl8ZW58MXx8fHwxNzczNDIxNjQyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  notebook: 'https://images.unsplash.com/photo-1611473444663-dcd81eb16e66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxub3RlYm9vayUyMGpvdXJuYWx8ZW58MXx8fHwxNzczMzUzMzMwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  speaker: 'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVldG9vdGglMjBzcGVha2VyJTIwcG9ydGFibGV8ZW58MXx8fHwxNzczMzIyNzk5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  lanyard: 'https://images.unsplash.com/photo-1769142726489-6f40b1c575c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYW55YXJkJTIwYmFkZ2UlMjBob2xkZXJ8ZW58MXx8fHwxNzczNDIxNjQzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
};

const initialLineItems: LineItem[] = [
  {
    id: '1',
    product: 'Metro Tote Bag',
    productLink: '',
    requiresSecondDecoration: false,
    priceBreak: 100,
    quoteNotes: '',
    designNotes: '',
    supplier: 'AS Colour',
    sku: 'AS-CT001',
    source: 'APPA',
    image: IMG.tote,
    variant: 'Natural',
    variantOptions: ['Natural', 'Black', 'Navy', 'Grey Marle'],
    qty: 250,
    moq: 50,
    baseCost: 3.80,
    decoCost: 0.40,
    decoration: 'Screen Print — Print Co Melb',
    decorationOptions: ['Screen Print — Print Co Melb', 'DTG — DecoPrint Syd', 'Embroidery — ThreadWorks'],
    margin: 42,
    marginFloor: 25,
    tierPrices: buildInitialTierPrices(3.8, 0.4, 42),
  },
  {
    id: '2',
    product: 'Custom Embroidered Cap — Client X',
    productLink: '',
    requiresSecondDecoration: false,
    priceBreak: 100,
    quoteNotes: '',
    designNotes: '',
    supplier: 'Headwear Pros',
    sku: 'HP-EMB-042',
    source: 'Proposal-Only',
    image: IMG.cap,
    variant: 'Navy / White',
    variantOptions: ['Navy / White', 'Black / Red', 'Grey / Black'],
    qty: 200,
    moq: 25,
    baseCost: 6.50,
    decoCost: 1.80,
    decoration: 'Embroidery — ThreadWorks',
    decorationOptions: ['Embroidery — ThreadWorks', 'Screen Print — Print Co Melb'],
    margin: 38,
    marginFloor: 25,
    tierPrices: buildInitialTierPrices(6.5, 1.8, 38),
  },
  {
    id: '3',
    product: 'Slim Bottle 500ml',
    productLink: '',
    requiresSecondDecoration: true,
    priceBreak: 250,
    quoteNotes: '',
    designNotes: '',
    supplier: 'DrinkTech AU',
    sku: 'DT-SB500',
    source: 'APPA',
    image: IMG.bottle,
    variant: 'White',
    variantOptions: ['White', 'Black', 'Clear', 'Ocean Blue'],
    qty: 300,
    moq: 100,
    baseCost: 5.20,
    decoCost: 0.90,
    decoration: 'Pad Print — ProMark',
    decorationOptions: ['Pad Print — ProMark', 'Laser Engrave — EngraveIt', 'Full Wrap — WrapCo'],
    margin: 19,
    marginFloor: 25,
    tierPrices: buildInitialTierPrices(5.2, 0.9, 19),
  },
  {
    id: '4',
    product: 'Premium Pen Set',
    productLink: '',
    requiresSecondDecoration: false,
    priceBreak: 50,
    quoteNotes: '',
    designNotes: '',
    supplier: 'WriteFine Co',
    sku: 'WF-PPS-12',
    source: 'Manual',
    image: IMG.pen,
    variant: 'Silver / Blue',
    variantOptions: ['Silver / Blue', 'Black / Gold', 'Matte Black'],
    qty: 200,
    moq: 50,
    baseCost: 3.10,
    decoCost: 0.45,
    decoration: 'Laser Engrave — EngraveIt',
    decorationOptions: ['Laser Engrave — EngraveIt', 'Pad Print — ProMark'],
    margin: 44,
    marginFloor: 20,
    tierPrices: buildInitialTierPrices(3.1, 0.45, 44),
  },
];

const searchProducts: SearchProduct[] = [
  { id: 's1', name: 'Canvas Messenger Bag', supplier: 'AS Colour', price: 8.50, image: IMG.tote, source: 'APPA', category: 'Bags' },
  { id: 's2', name: 'Sports Cap Adjustable', supplier: 'Headwear Pros', price: 4.20, image: IMG.cap, source: 'APPA', category: 'Headwear' },
  { id: 's3', name: 'Bamboo USB Drive 16GB', supplier: 'TechPromo', price: 5.80, image: IMG.usb, source: 'APPA', category: 'Tech' },
  { id: 's4', name: 'Recycled Notepad A5', supplier: 'EcoPrint AU', price: 2.10, image: IMG.notebook, source: 'Manual', category: 'Stationery' },
  { id: 's5', name: 'Mini Bluetooth Speaker', supplier: 'SoundGear', price: 12.50, image: IMG.speaker, source: 'APPA', category: 'Tech' },
  { id: 's6', name: 'Branded Lanyard 20mm', supplier: 'LanyardKing', price: 1.40, image: IMG.lanyard, source: 'APPA', category: 'Accessories' },
  { id: 's7', name: 'Insulated Travel Mug', supplier: 'DrinkTech AU', price: 7.90, image: IMG.bottle, source: 'APPA', category: 'Drinkware' },
  { id: 's8', name: 'Custom Tee — Proposal', supplier: 'AS Colour', price: 9.20, image: IMG.cap, source: 'Proposal-Only', category: 'Apparel' },
];

const statusColors: Record<ProposalStatus, { bg: string; text: string }> = {
  'Design request': { bg: '#F3E8FF', text: '#7C3AED' },
  Draft: { bg: '#F2F2F2', text: '#888888' },
  Sent: { bg: '#EBF3FB', text: '#1F5C9E' },
  Approved: { bg: '#E8F5E9', text: '#217346' },
  Won: { bg: '#E8F5E9', text: '#217346' },
  Lost: { bg: '#FFEBEE', text: '#C0392B' },
};

const allStatuses: ProposalStatus[] = ['Design request', 'Draft', 'Sent', 'Approved', 'Won', 'Lost'];
const searchCategories = ['All', 'Bags', 'Headwear', 'Drinkware', 'Tech', 'Stationery', 'Accessories', 'Apparel'];
const allPriceBreaks: PriceBreak[] = DEFAULT_PRICE_BREAKS;

// --- Helpers ---

function computeSellPrice(unitCost: number, margin: number): number {
  return unitCost / (1 - margin / 100);
}

function computeLineTotal(item: LineItem): number {
  return computeUnitSell(item) * item.qty;
}

function resolveTierForQty(qty: number): PriceBreak {
  let selected: PriceBreak = DEFAULT_PRICE_BREAKS[0];
  for (const tier of DEFAULT_PRICE_BREAKS) {
    if (qty >= parseInt(tier, 10)) {
      selected = tier;
    }
  }
  return selected;
}

function computeUnitSell(item: LineItem): number {
  const resolvedTier = resolveTierForQty(item.qty);
  return item.tierPrices?.[resolvedTier] ?? computeSellPrice(item.baseCost + item.decoCost, item.margin);
}

function createLineItemFromSeed(product: ProposalSeedProduct): LineItem {
  return {
    id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product: product.name,
    productLink: '',
    requiresSecondDecoration: false,
    priceBreak: 100,
    quoteNotes: '',
    designNotes: '',
    supplier: product.supplier,
    sku: product.sku,
    source: product.source,
    image: product.image,
    variant: 'Default',
    variantOptions: ['Default'],
    qty: 100,
    moq: 25,
    baseCost: product.price,
    decoCost: 0.4,
    decoration: 'Screen Print — Print Co Melb',
    decorationOptions: ['Screen Print — Print Co Melb', 'DTG — DecoPrint Syd'],
    margin: 35,
    marginFloor: 25,
    tierPrices: buildInitialTierPrices(product.price, 0.4, 35),
  };
}

function createSeedFromLineItem(item: LineItem): ProposalSeedProduct {
  return {
    id: item.id,
    name: item.product,
    supplier: item.supplier,
    price: item.baseCost,
    image: item.image,
    source: item.source,
    category: 'Proposal',
    sku: item.sku,
  };
}

// --- Sub Components ---

function SourceBadge({ source }: { source: 'APPA' | 'Manual' | 'Proposal-Only' }) {
  const colors = {
    APPA: { bg: 'var(--jolly-surface)', text: 'var(--jolly-primary)' },
    Manual: { bg: '#F2F2F2', text: '#888888' },
    'Proposal-Only': { bg: '#F3E8FF', text: '#7C3AED' },
  };
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5"
      style={{
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '4px',
        backgroundColor: colors[source].bg,
        color: colors[source].text,
      }}
    >
      {source === 'Proposal-Only' && <Lock size={9} />}
      {source}
    </span>
  );
}

function StatusDropdown({
  status,
  onChange,
  statuses,
}: {
  status: ProposalStatus;
  onChange: (s: ProposalStatus) => void;
  statuses: ProposalStatus[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
        style={{
          backgroundColor: statusColors[status].bg,
          color: statusColors[status].text,
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {status}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg z-50 py-1"
          style={{
            border: '1px solid var(--jolly-border)',
            borderRadius: '6px',
            minWidth: '140px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 flex items-center gap-2"
              style={{
                fontSize: '13px',
                fontWeight: status === s ? 600 : 400,
                color: statusColors[s].text,
                backgroundColor: status === s ? statusColors[s].bg : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (status !== s) e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                if (status !== s) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColors[s].text }}
              />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Product Search Slide-Over ---

function ProductSearchSlideOver({
  open,
  onClose,
  onAdd,
  onRequestAppa,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (product: SearchProduct) => void;
  onRequestAppa: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filtered = searchProducts.filter((p) => {
    const matchesQuery =
      !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.supplier.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesQuery && matchesCategory;
  });

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col bg-white"
        style={{
          width: '480px',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          borderLeft: '1px solid var(--jolly-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--jolly-border)' }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
            Add Product to Proposal
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            style={{ border: 'none', cursor: 'pointer', background: 'none' }}
          >
            <X size={20} style={{ color: 'var(--jolly-text-secondary)' }} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--jolly-text-disabled)' }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                border: '1px solid var(--jolly-border)',
                borderRadius: '6px',
                paddingLeft: '36px',
                paddingRight: '12px',
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
          {/* Category pills */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {searchCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-2.5 py-1 rounded-full"
                style={{
                  fontSize: '12px',
                  fontWeight: category === cat ? 600 : 400,
                  backgroundColor: category === cat ? 'var(--jolly-primary)' : 'var(--jolly-surface)',
                  color: category === cat ? 'white' : 'var(--jolly-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {!query && (
            <div className="px-6 pt-4 pb-2">
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Suggested Products
              </p>
            </div>
          )}
          {filtered.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 px-6 py-3 border-b"
              style={{ borderColor: '#F2F2F2' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--jolly-surface)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <img
                src={product.image}
                alt={product.name}
                className="rounded flex-shrink-0 object-cover"
                style={{ width: '40px', height: '40px', borderRadius: '4px' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className="truncate"
                    style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)' }}
                  >
                    {product.name}
                  </p>
                  {product.source === 'Proposal-Only' && <SourceBadge source="Proposal-Only" />}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)' }}>
                  {product.supplier}
                </p>
              </div>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--jolly-text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                From ${product.price.toFixed(2)}
              </p>
              <button
                onClick={() => onAdd(product)}
                className="flex items-center gap-1 px-3 py-1.5 rounded flex-shrink-0"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'var(--jolly-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={12} /> Add
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p style={{ fontSize: '14px', color: 'var(--jolly-text-disabled)' }}>
                No products found matching "{query}"
              </p>
              <button
                onClick={() => onRequestAppa(query)}
                className="mt-3"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--jolly-border)',
                  backgroundColor: 'white',
                  color: 'var(--jolly-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Request from APPA
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Main Component ---

export function ProposalBuilder({
  flow = 'proposal',
}: {
  flow?: 'proposal' | 'design-request';
}) {
  const isDesignRequestFlow = flow === 'design-request';
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingNavState] = useState<ProposalNavigationState | null>(() => consumePendingProposalState());
  const navState = ((location.state as ProposalNavigationState | null) ?? pendingNavState);
  const seededProducts = useMemo(() => navState?.prefillProducts ?? [], [navState]);
  const draftSeed = navState?.draftSeed;
  const isNewEntity = location.pathname.endsWith('/new');
  const statusOptions: ProposalStatus[] = isDesignRequestFlow
    ? allStatuses
    : ['Draft', 'Sent', 'Approved', 'Won', 'Lost'];
  const { currentRole } = useRole();
  const [status, setStatus] = useState<ProposalStatus>(
    isDesignRequestFlow ? 'Design request' : 'Draft'
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(
    () => (isDesignRequestFlow && isNewEntity ? [] : initialLineItems).map(normalizeLineItemTiers)
  );
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [internalNotes, setInternalNotes] = useState(isDesignRequestFlow && isNewEntity ? '' : '');
  const [clientNotes, setClientNotes] = useState(isDesignRequestFlow && isNewEntity ? '' : '');
  const [attachments, setAttachments] = useState<string[]>(
    isDesignRequestFlow && isNewEntity ? [] : ['Apex_Brand_Guidelines_v3.pdf', 'Cap_Mockup_v2.png']
  );
  const [opportunityTier, setOpportunityTier] = useState<OpportunityTier>(
    isDesignRequestFlow && isNewEntity ? '' : 'Silver $10K - $50K'
  );
  const [proposalTemplate, setProposalTemplate] = useState<ProposalTemplate>(
    isDesignRequestFlow && isNewEntity ? '' : 'Standard'
  );
  const [productDesign, setProductDesign] = useState<ProductDesignType>(
    isDesignRequestFlow && isNewEntity ? '' : 'Custom design'
  );
  const [designFiles, setDesignFiles] = useState<DesignFilesType>(
    isDesignRequestFlow && isNewEntity ? '' : 'Requested'
  );
  const [pricingSpreadsheet, setPricingSpreadsheet] = useState<PricingSpreadsheetType>(
    isDesignRequestFlow && isNewEntity ? '' : 'Required'
  );
  const [requiredPriceBreaks, setRequiredPriceBreaks] = useState<PriceBreak[]>(
    isDesignRequestFlow && isNewEntity ? [] : ['10', '25', '50', '100', '250', '500', '1000']
  );
  type TabKey =
    | 'details'
    | 'design-request'
    | 'assets'
    | 'line-items'
    | 'inventory-items'
    | 'quantities'
    | 'shipments'
    | 'billing';
  const [activeTab, setActiveTab] = useState<TabKey>(
    isDesignRequestFlow ? 'design-request' : 'details'
  );
  const [isEditing, setIsEditing] = useState(isNewEntity);
  const [entityId] = useState(isNewEntity ? '' : 'HTFWTM20');
  const [entityTitle, setEntityTitle] = useState(isNewEntity ? '' : 'Metro Merch Pack — Apex Financial');
  const [customerName, setCustomerName] = useState(isNewEntity ? '' : 'Apex Financial');
  const [contactName, setContactName] = useState(isNewEntity ? '' : 'James Wren');
  const [contactEmail, setContactEmail] = useState(isNewEntity ? '' : 'james.wren@apex.com.au');
  const [eventName, setEventName] = useState(isNewEntity ? '' : 'Q1 Staff Welcome Kit');
  const [dueDate, setDueDate] = useState(isNewEntity ? '' : '2026-03-20');
  const [mondayCardUrl, setMondayCardUrl] = useState(
    isNewEntity ? '' : 'https://monday.com/boards/123456/pulses/987654321'
  );
  const [creativeDirection, setCreativeDirection] = useState(
    isNewEntity ? '' : 'Modern and clean aesthetic, focus on sustainability messaging.'
  );
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(isNewEntity ? '#1F5C9E' : '#1F5C9E');
  const [brandSecondaryColor, setBrandSecondaryColor] = useState(isNewEntity ? '#7C3AED' : '#7C3AED');
  const [exportPptType, setExportPptType] = useState<'quote' | 'proposal'>('quote');

  const hasMarginIssue = lineItems.some((item) => item.margin < item.marginFloor);
  const hasCoreDetails = Boolean(customerName.trim() && eventName.trim() && dueDate && lineItems.length > 0);
  const hasDesignBriefFields = Boolean(
    proposalTemplate && productDesign && designFiles && creativeDirection.trim() && dueDate
  );
  const proposalType = isDesignRequestFlow
    ? 'design-request'
    : hasDesignBriefFields
    ? 'custom-proposal'
    : 'quick-quote';
  const proposalTypeLabel =
    proposalType === 'custom-proposal' ? 'Custom Proposal' : proposalType === 'quick-quote' ? 'Quick Quote' : 'Design Request';
  const hasDesignerAssets = attachments.length > 0;
  const canExportQuotePpt = hasCoreDetails;
  const canExportProposalPpt = hasCoreDetails && hasDesignerAssets;
  const canExportSelectedPpt = exportPptType === 'quote' ? canExportQuotePpt : canExportProposalPpt;

  const draftStorageKey = `upc-prototype-draft:${flow}:${entityId || 'new'}`;

  useEffect(() => {
    if (!isNewEntity || typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<{
        status: ProposalStatus;
        lineItems: LineItem[];
        internalNotes: string;
        clientNotes: string;
        attachments: string[];
        opportunityTier: OpportunityTier;
        proposalTemplate: ProposalTemplate;
        productDesign: ProductDesignType;
        designFiles: DesignFilesType;
        pricingSpreadsheet: PricingSpreadsheetType;
        requiredPriceBreaks: PriceBreak[];
        entityTitle: string;
        customerName: string;
        contactName: string;
        contactEmail: string;
        eventName: string;
        dueDate: string;
        mondayCardUrl: string;
        creativeDirection: string;
        brandPrimaryColor: string;
        brandSecondaryColor: string;
      }>;

      if (parsed.status) setStatus(parsed.status);
      if (parsed.lineItems) {
        setLineItems(
          parsed.lineItems.map((lineItem) =>
            normalizeLineItemTiers(lineItem as Omit<LineItem, 'tierPrices'> & { tierPrices?: Partial<Record<PriceBreak, number>> })
          )
        );
      }
      if (typeof parsed.internalNotes === 'string') setInternalNotes(parsed.internalNotes);
      if (typeof parsed.clientNotes === 'string') setClientNotes(parsed.clientNotes);
      if (parsed.attachments) setAttachments(parsed.attachments);
      if (parsed.opportunityTier) setOpportunityTier(parsed.opportunityTier);
      if (parsed.proposalTemplate) setProposalTemplate(parsed.proposalTemplate);
      if (parsed.productDesign) setProductDesign(parsed.productDesign);
      if (parsed.designFiles) setDesignFiles(parsed.designFiles);
      if (parsed.pricingSpreadsheet) setPricingSpreadsheet(parsed.pricingSpreadsheet);
      if (parsed.requiredPriceBreaks) setRequiredPriceBreaks(parsed.requiredPriceBreaks);
      if (typeof parsed.entityTitle === 'string') setEntityTitle(parsed.entityTitle);
      if (typeof parsed.customerName === 'string') setCustomerName(parsed.customerName);
      if (typeof parsed.contactName === 'string') setContactName(parsed.contactName);
      if (typeof parsed.contactEmail === 'string') setContactEmail(parsed.contactEmail);
      if (typeof parsed.eventName === 'string') setEventName(parsed.eventName);
      if (typeof parsed.dueDate === 'string') setDueDate(parsed.dueDate);
      if (typeof parsed.mondayCardUrl === 'string') setMondayCardUrl(parsed.mondayCardUrl);
      if (typeof parsed.creativeDirection === 'string') setCreativeDirection(parsed.creativeDirection);
      if (typeof parsed.brandPrimaryColor === 'string') setBrandPrimaryColor(parsed.brandPrimaryColor);
      if (typeof parsed.brandSecondaryColor === 'string') setBrandSecondaryColor(parsed.brandSecondaryColor);
    } catch {
      // Ignore invalid local draft payload.
    }
  }, [draftStorageKey, isNewEntity]);

  useEffect(() => {
    if (!isNewEntity || seededProducts.length === 0) return;

    setLineItems((items) => {
      const existingNames = new Set(items.map((item) => item.product));
      const additions = seededProducts
        .filter((product) => !existingNames.has(product.name))
        .map((product) => createLineItemFromSeed(product));

      return additions.length > 0 ? [...items, ...additions] : items;
    });

    if (!entityTitle && navState?.sourceLabel === 'shortlist') {
      setEntityTitle('Shortlisted Product Proposal');
    }
  }, [entityTitle, isNewEntity, navState?.sourceLabel, seededProducts]);

  useEffect(() => {
    if (!isNewEntity || !draftSeed) return;

    if (draftSeed.entityTitle) setEntityTitle(draftSeed.entityTitle);
    if (draftSeed.customerName) setCustomerName(draftSeed.customerName);
    if (draftSeed.contactName) setContactName(draftSeed.contactName);
    if (draftSeed.contactEmail) setContactEmail(draftSeed.contactEmail);
    if (draftSeed.eventName) setEventName(draftSeed.eventName);
    if (draftSeed.dueDate) setDueDate(draftSeed.dueDate);
    if (typeof draftSeed.internalNotes === 'string') setInternalNotes(draftSeed.internalNotes);
    if (typeof draftSeed.clientNotes === 'string') setClientNotes(draftSeed.clientNotes);
    if (draftSeed.attachments) setAttachments(draftSeed.attachments);
    if (draftSeed.opportunityTier) setOpportunityTier(draftSeed.opportunityTier as OpportunityTier);
    if (draftSeed.proposalTemplate) setProposalTemplate(draftSeed.proposalTemplate as ProposalTemplate);
    if (draftSeed.productDesign) setProductDesign(draftSeed.productDesign as ProductDesignType);
    if (draftSeed.designFiles) setDesignFiles(draftSeed.designFiles as DesignFilesType);
    if (draftSeed.pricingSpreadsheet) setPricingSpreadsheet(draftSeed.pricingSpreadsheet as PricingSpreadsheetType);
    if (draftSeed.mondayCardUrl) setMondayCardUrl(draftSeed.mondayCardUrl);
    if (draftSeed.creativeDirection) setCreativeDirection(draftSeed.creativeDirection);
    if (draftSeed.brandPrimaryColor) setBrandPrimaryColor(draftSeed.brandPrimaryColor);
    if (draftSeed.brandSecondaryColor) setBrandSecondaryColor(draftSeed.brandSecondaryColor);
  }, [draftSeed, isNewEntity]);

  useEffect(() => {
    if (exportPptType === 'proposal' && !hasDesignerAssets) {
      setExportPptType('quote');
    }
  }, [exportPptType, hasDesignerAssets]);

  useEffect(() => {
    if (!isNewEntity || typeof window === 'undefined') return;
    const payload = {
      status,
      lineItems,
      internalNotes,
      clientNotes,
      attachments,
      opportunityTier,
      proposalTemplate,
      productDesign,
      designFiles,
      pricingSpreadsheet,
      requiredPriceBreaks,
      entityTitle,
      customerName,
      contactName,
      contactEmail,
      eventName,
      dueDate,
      mondayCardUrl,
      creativeDirection,
      brandPrimaryColor,
      brandSecondaryColor,
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [
    isNewEntity,
    draftStorageKey,
    status,
    lineItems,
    internalNotes,
    clientNotes,
    attachments,
    opportunityTier,
    proposalTemplate,
    productDesign,
    designFiles,
    pricingSpreadsheet,
    requiredPriceBreaks,
    entityTitle,
    customerName,
    contactName,
    contactEmail,
    eventName,
    dueDate,
    mondayCardUrl,
    creativeDirection,
    brandPrimaryColor,
    brandSecondaryColor,
  ]);

  // Totals
  const totalItems = lineItems.length;
  const totalUnits = lineItems.reduce((s, i) => s + i.qty, 0);
  const totalLandedCost = lineItems.reduce((s, i) => s + (i.baseCost + i.decoCost) * i.qty, 0);
  const totalSellValue = lineItems.reduce((s, i) => s + computeLineTotal(i), 0);
  const avgMargin =
    lineItems.length > 0
      ? lineItems.reduce((s, i) => s + i.margin, 0) / lineItems.length
      : 0;

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  function duplicateLineItem(id: string) {
    const item = lineItems.find((i) => i.id === id);
    if (item) {
      const newItem = { ...item, id: `${Date.now()}` };
      const idx = lineItems.findIndex((i) => i.id === id);
      const next = [...lineItems];
      next.splice(idx + 1, 0, newItem);
      setLineItems(next);
    }
  }

  function deleteLineItem(id: string) {
    setLineItems((items) => items.filter((i) => i.id !== id));
  }

  function addFromSearch(product: SearchProduct) {
    const newItem: LineItem = {
      id: `${Date.now()}`,
      product: product.name,
      productLink: '',
      requiresSecondDecoration: false,
      priceBreak: 100,
      quoteNotes: '',
      designNotes: '',
      supplier: product.supplier,
      sku: `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      source: product.source,
      image: product.image,
      variant: 'Default',
      variantOptions: ['Default'],
      qty: 100,
      moq: 25,
      baseCost: product.price,
      decoCost: 0.40,
      decoration: 'Screen Print — Print Co Melb',
      decorationOptions: ['Screen Print — Print Co Melb', 'DTG — DecoPrint Syd'],
      margin: 35,
      marginFloor: 25,
    };
    setLineItems((items) => [...items, newItem]);
    setSearchOpen(false);
  }

  function requestFromAppa(query: string) {
    const fallbackName = query.trim() ? query.trim() : 'Requested APPA Product';
    addFromSearch({
      id: `appa-${Date.now()}`,
      name: fallbackName,
      supplier: 'APPA Pending Match',
      price: 0,
      image: IMG.notebook,
      source: 'APPA',
      category: 'Pending',
    });
  }

  function removeAttachment(name: string) {
    setAttachments((a) => a.filter((f) => f !== name));
  }

  function addAttachments(fileList: FileList | null) {
    if (!fileList) return;
    const uploadedNames = Array.from(fileList).map((file) => file.name);
    setAttachments((existing) => Array.from(new Set([...existing, ...uploadedNames])));
  }

  function toggleRequiredPriceBreak(value: PriceBreak) {
    setRequiredPriceBreaks((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }

  async function getImageDataUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function exportAsPpt(audience: 'client' | 'design') {
    if (audience === 'client' && !canExportQuotePpt) return;
    if (audience === 'design' && !canExportProposalPpt) return;

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Jolly UPC';
    pptx.company = 'Jolly';
    const entityKind = isDesignRequestFlow ? 'Design Request' : 'Proposal';

    const cover = pptx.addSlide();
    cover.background = { color: 'F7FAFD' };
    cover.addText(entityTitle || `Untitled ${entityKind}`, {
      x: 0.7,
      y: 0.9,
      w: 12,
      h: 0.6,
      fontSize: 30,
      bold: true,
      color: '1F2937',
    });
    cover.addText(`${entityKind} Ref: ${entityId || 'Draft'}\nClient: ${customerName || '-'}\nEvent: ${eventName || '-'}\nDue: ${dueDate || '-'}`, {
      x: 0.7,
      y: 1.8,
      w: 8,
      h: 1.5,
      fontSize: 14,
      color: '374151',
      valign: 'top',
      breakLine: true,
    });
    cover.addText(`Created for: ${audience === 'client' ? 'Client-facing' : 'Design team'} output`, {
      x: 0.7,
      y: 4.2,
      w: 8,
      h: 0.3,
      fontSize: 12,
      color: '6B7280',
    });

    function addStandardSlide(item: LineItem) {
      const slide = pptx.addSlide();
      slide.addText(item.product, {
        x: 0.6,
        y: 0.5,
        w: 7.5,
        h: 0.5,
        fontSize: 24,
        bold: true,
        color: '111827',
      });
      slide.addText(`SKU: ${item.sku}   Supplier: ${item.supplier}`, {
        x: 0.6,
        y: 1.0,
        w: 9,
        h: 0.3,
        fontSize: 11,
        color: '6B7280',
      });

      return slide;
    }

    function getTierRows(item: LineItem) {
      return [25, 50, 100, 250].map((qty) => {
        const unitCost = item.baseCost + item.decoCost;
        const sell = computeSellPrice(unitCost, item.margin);
        return [`${qty}+`, `$${unitCost.toFixed(2)}`, `$${sell.toFixed(2)}`];
      });
    }

    for (const item of lineItems) {
      const slide = addStandardSlide(item);

      const imageData = await getImageDataUrl(item.image);
      const tiers = getTierRows(item);

      if (proposalTemplate === 'HLC - Items') {
        slide.background = { color: 'F8FAFF' };
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5,
          y: 1.25,
          w: 12.3,
          h: 4.6,
          fill: { color: 'FFFFFF' },
          line: { color: 'DBE4F0', pt: 1 },
          radius: 0.08,
        });
        if (imageData) {
          slide.addImage({ data: imageData, x: 0.9, y: 1.7, w: 2.5, h: 2.0 });
        }
        slide.addText(
          `Item summary\nVariant: ${item.variant}\nMOQ: ${item.moq}\nDecoration: ${item.decoration}\nSource: ${item.source}`,
          {
            x: 3.8,
            y: 1.7,
            w: 3.8,
            h: 2.0,
            fontSize: 10,
            color: '334155',
            breakLine: true,
          }
        );
        slide.addTable([
          ['Qty', 'Unit Cost', 'Sell'],
          ...tiers,
        ], {
          x: 7.9,
          y: 1.7,
          w: 4.5,
          h: 2.4,
          border: { color: 'CBD5E1', pt: 1 },
          fill: 'FFFFFF',
          fontSize: 10,
        });
        slide.addText(`Quote notes: ${item.quoteNotes || '-'}\nDesign notes: ${item.designNotes || '-'}`, {
          x: 0.9,
          y: 4.2,
          w: 11.4,
          h: 1.3,
          fontSize: 10,
          color: '475569',
          breakLine: true,
        });
      } else if (proposalTemplate === 'HLC - Product Collage') {
        slide.background = { color: 'F4F7FB' };
        const cardCoords = [
          { x: 0.8, y: 1.4 },
          { x: 3.95, y: 1.4 },
          { x: 7.1, y: 1.4 },
          { x: 10.25, y: 1.4 },
        ];
        cardCoords.forEach((c, idx) => {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: c.x,
            y: c.y,
            w: 2.7,
            h: 2.5,
            fill: { color: 'FFFFFF' },
            line: { color: 'D7E0EA', pt: 1 },
            radius: 0.08,
          });
          if (imageData) {
            slide.addImage({ data: imageData, x: c.x + 0.2, y: c.y + 0.2, w: 2.3, h: 1.6 });
          }
          slide.addText(`Option ${idx + 1}`, {
            x: c.x + 0.2,
            y: c.y + 1.9,
            w: 2.2,
            h: 0.2,
            fontSize: 9,
            bold: true,
            color: '475569',
          });
          slide.addText(`$${computeUnitSell(item).toFixed(2)}/unit`, {
            x: c.x + 0.2,
            y: c.y + 2.1,
            w: 2.2,
            h: 0.2,
            fontSize: 9,
            color: '1F5C9E',
          });
        });
        slide.addTable([
          ['Qty Tier', 'Unit Cost', 'Sell Price'],
          ...tiers,
        ], {
          x: 0.8,
          y: 4.25,
          w: 6.2,
          h: 1.6,
          border: { color: 'CBD5E1', pt: 1 },
          fill: 'FFFFFF',
          fontSize: 9,
        });
        slide.addText(`Decoration positions: ${item.decoration}\nVariant: ${item.variant}\nMOQ: ${item.moq}`, {
          x: 7.3,
          y: 4.25,
          w: 5.2,
          h: 1.4,
          fontSize: 10,
          color: '334155',
          breakLine: true,
        });
      } else {
        if (imageData) {
          slide.addImage({ data: imageData, x: 0.6, y: 1.4, w: 3.0, h: 2.4 });
        } else {
          slide.addShape(pptx.ShapeType.rect, {
            x: 0.6,
            y: 1.4,
            w: 3.0,
            h: 2.4,
            line: { color: 'CBD5E1', pt: 1 },
            fill: { color: 'F8FAFC' },
          });
          slide.addText('Image unavailable', {
            x: 1.2,
            y: 2.45,
            w: 2.0,
            h: 0.2,
            fontSize: 10,
            color: '64748B',
          });
        }

        slide.addTable([
          ['Qty Tier', 'Unit Cost', 'Sell Price'],
          ...tiers,
        ], {
          x: 3.9,
          y: 1.4,
          w: 4.8,
          h: 2.4,
          border: { color: 'CBD5E1', pt: 1 },
          fill: 'FFFFFF',
          fontSize: 10,
        });

        slide.addText(
          `Decoration position: ${item.decoration}\nVariant: ${item.variant}\nMOQ: ${item.moq}\nQuote notes: ${item.quoteNotes || '-'}\nDesign notes: ${item.designNotes || '-'}`,
          {
            x: 0.6,
            y: 4.0,
            w: 8.8,
            h: 1.8,
            fontSize: 11,
            color: '334155',
            valign: 'top',
            breakLine: true,
          }
        );
      }

      if (audience === 'design') {
        slide.addShape(pptx.ShapeType.rect, {
          x: 9.1,
          y: 4.0,
          w: 3.8,
          h: 1.8,
          fill: { color: 'FFF7ED' },
          line: { color: 'FDBA74', pt: 1 },
        });
        slide.addText(`Design Team\nMargin: ${item.margin}%\nMargin floor: ${item.marginFloor}%`, {
          x: 9.3,
          y: 4.2,
          w: 3.3,
          h: 1.2,
          fontSize: 11,
          bold: true,
          color: '9A3412',
          breakLine: true,
        });
      }
    }

    if (audience === 'design') {
      const designSlide = pptx.addSlide();
      designSlide.addText('Design Brief', {
        x: 0.6,
        y: 0.6,
        w: 6,
        h: 0.5,
        fontSize: 24,
        bold: true,
        color: '111827',
      });
      designSlide.addText(
        `Template: ${proposalTemplate || '-'}\nProduct Design: ${productDesign || '-'}\nDesign Files: ${designFiles || '-'}\nPricing Spreadsheet: ${pricingSpreadsheet || '-'}\nPrimary Color: ${brandPrimaryColor}\nSecondary Color: ${brandSecondaryColor}\nMonday Card: ${mondayCardUrl || '-'}`,
        {
          x: 0.6,
          y: 1.4,
          w: 6,
          h: 2.3,
          fontSize: 12,
          color: '374151',
          breakLine: true,
        }
      );
      designSlide.addText(`Creative direction\n${creativeDirection || '-'}`, {
        x: 0.6,
        y: 3.9,
        w: 8,
        h: 1.7,
        fontSize: 12,
        color: '1F2937',
        breakLine: true,
      });
      designSlide.addText(`Attached files\n${attachments.length ? attachments.join('\n') : 'None uploaded'}`, {
        x: 8.8,
        y: 1.4,
        w: 4.0,
        h: 4.2,
        fontSize: 11,
        color: '475569',
        breakLine: true,
      });
    }

    const suffix = audience === 'design' ? 'Design-Team' : 'Client';
    const fileEntity = (entityTitle || entityKind).replace(/\s+/g, '_');
    await pptx.writeFile({ fileName: `${fileEntity}_${suffix}.pptx` });
  }

  const minMarginFloor = lineItems.length > 0 ? Math.max(...lineItems.map((i) => i.marginFloor)) : 25;

  return (
    <div
      className="flex min-h-screen payload-sales-root payload-project-screen project-detail-screen"
      style={{ backgroundColor: 'var(--jolly-bg)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <LeftSidebar currentRole={currentRole} />

      <div className="flex-1 min-h-0 flex flex-col overflow-auto project-detail-main">
        {/* TOP BAR */}
        <div
          className="project-detail-header bg-white border-b px-8 py-3 flex-shrink-0"
          style={{ borderColor: 'var(--jolly-border)' }}
        >
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-2" aria-label="Breadcrumb">
            <Link to="/proposals" style={{ fontSize: '13px', color: 'var(--jolly-primary)', fontWeight: 500, textDecoration: 'none' }}>
              My Proposals
            </Link>
            <ChevronRight size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
            <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>
              {entityId
                ? `${isDesignRequestFlow ? 'Design Request' : 'Proposal'} #${entityId}`
                : `New ${isDesignRequestFlow ? 'Design Request' : 'Proposal'}`}
            </span>
          </nav>
          {/* Title row */}
          <div className="flex items-center justify-between project-detail-title-row">
            <div className="flex items-center gap-4 project-detail-title-group">
              {isEditing ? (
                <input
                  value={entityTitle}
                  onChange={(e) => setEntityTitle(e.target.value)}
                  placeholder={
                    isDesignRequestFlow ? 'New Design Request title' : 'New Proposal title'
                  }
                  style={{ height: '38px', width: '100%', maxWidth: '420px', minWidth: '220px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 12px', fontSize: '22px', fontWeight: 700 }}
                />
              ) : (
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--jolly-text-body)', lineHeight: '1.2', margin: 0 }}>
                  {entityTitle || 'Untitled'}
                </h1>
              )}
              {!isDesignRequestFlow && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '24px',
                    padding: '0 10px',
                    borderRadius: '999px',
                    border: '1px solid var(--jolly-border)',
                    backgroundColor: proposalType === 'custom-proposal' ? '#ECFDF3' : '#EEF2FF',
                    color: proposalType === 'custom-proposal' ? '#065F46' : '#3730A3',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  title="Detected from entered content"
                >
                  {proposalTypeLabel}
                </span>
              )}
              <StatusDropdown status={status} onChange={setStatus} statuses={statusOptions} />
            </div>
            <div className="flex items-center gap-3 project-detail-actions">
              <Button buttonStyle="secondary" size="small" onClick={() => setIsEditing((prev) => !prev)}>
                {isEditing ? 'Save' : 'Edit'}
              </Button>
              <div className="flex items-center gap-2">
                <select
                  value={exportPptType}
                  onChange={(e) => setExportPptType(e.target.value as 'quote' | 'proposal')}
                  style={{
                    height: '32px',
                    border: '1px solid var(--jolly-border)',
                    borderRadius: '6px',
                    padding: '0 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--jolly-text-body)',
                    backgroundColor: 'white',
                  }}
                >
                  <option value="quote">export PPT for quote</option>
                  <option value="proposal" disabled={!hasDesignerAssets}>export PPT for proposal</option>
                </select>
              </div>
              <Button
                buttonStyle="secondary"
                size="small"
                onClick={() => exportAsPpt(exportPptType === 'quote' ? 'client' : 'design')}
                disabled={!canExportSelectedPpt}
                title={exportPptType === 'proposal' && !hasDesignerAssets ? 'Upload designer assets in the Assets tab first' : undefined}
              >
                <span className="inline-flex items-center gap-2"><ClipboardList size={14} /> Export PPT</span>
              </Button>
              <div className="relative group">
                <button
                  className="flex items-center gap-2"
                  style={{
                    height: '36px',
                    padding: '0 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: hasMarginIssue ? '#A0A0A0' : 'var(--jolly-primary)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: hasMarginIssue ? 'not-allowed' : 'pointer',
                    opacity: hasMarginIssue ? 0.7 : 1,
                  }}
                  disabled={hasMarginIssue}
                >
                  <Send size={14} /> Send to Client
                  <ChevronRight size={14} />
                </button>
                {hasMarginIssue && (
                  <div
                    className="absolute right-0 top-full mt-2 px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      backgroundColor: '#1A1A1A',
                      color: 'white',
                      fontSize: '12px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      zIndex: 99,
                    }}
                  >
                    Resolve pricing issues before sending
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b px-8 project-detail-tabsbar">
          <div className="flex items-center gap-6 project-detail-tabs-inner" role="tablist" aria-label="Proposal sections">
            {(isDesignRequestFlow
              ? [
                  { key: 'design-request', label: 'Design Request' },
                  { key: 'line-items', label: 'Products' },
                ]
              : [
                  { key: 'details', label: 'Details' },
                  { key: 'line-items', label: 'Products' },
                  { key: 'assets', label: 'Assets' },
                ]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                role="tab"
                aria-selected={activeTab === tab.key}
                style={{
                  height: '42px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? 'var(--jolly-text-body)' : 'var(--jolly-text-secondary)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--jolly-primary)' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT: Two column */}
        <fieldset disabled={!isEditing && activeTab !== 'assets'} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
        <div className="flex-1 min-w-0 flex project-detail-body">
          {/* LEFT SUMMARY PANEL */}
          {(activeTab === 'details' || activeTab === 'design-request') && (
          <div
            className="project-detail-left-panel min-h-0 flex-shrink-0 overflow-visible p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 items-start"
            style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', backgroundColor: 'var(--jolly-bg)' }}
          >
            <div
              className="bg-white rounded p-3 lg:col-span-2"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                    {isDesignRequestFlow ? 'Design Request Setup' : 'Proposal Setup'}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                    Capture essentials first, then complete design context for smoother handoff.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      border: '1px solid var(--jolly-border)',
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: hasCoreDetails ? 'var(--jolly-success)' : 'var(--jolly-text-secondary)',
                      backgroundColor: hasCoreDetails ? '#ECFDF3' : 'white',
                    }}
                  >
                    Core details {hasCoreDetails ? 'complete' : 'incomplete'}
                  </span>
                  <span
                    style={{
                      border: '1px solid var(--jolly-border)',
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: hasDesignBriefFields ? 'var(--jolly-success)' : 'var(--jolly-text-secondary)',
                      backgroundColor: hasDesignBriefFields ? '#ECFDF3' : 'white',
                    }}
                  >
                    Design brief {hasDesignBriefFields ? 'complete' : 'incomplete'}
                  </span>
                </div>
              </div>
            </div>

            {/* Client Block */}
            {!isDesignRequestFlow && (
            <div
              className="bg-white rounded p-2.5 lg:col-span-1"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--jolly-text-disabled)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Client
                </span>
                <button
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <Pencil size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Customer
                  </label>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer" style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Contact name
                  </label>
                  <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
                </div>
                <div className="sm:col-span-2">
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Contact email
                  </label>
                  <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
                </div>
              </div>
            </div>
            )}

            {/* Proposal Meta */}
            {!isDesignRequestFlow && (
            <div
              className="bg-white rounded p-2.5 lg:col-span-1"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--jolly-text-disabled)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Proposal Details
                </span>
                <button
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}
                >
                  <Pencil size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
                </button>
              </div>
              {[
                { label: 'Ref', value: entityId || '-' },
                { label: 'Created', value: '24 Apr 2026' },
                { label: 'Due date', value: dueDate || '-', warn: true },
                { label: 'Event', value: eventName || '-' },
                { label: 'Created by', value: 'Sasha N.' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-1"
                  style={{ borderBottom: '1px solid #F2F2F2' }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)' }}>
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: row.warn ? 'var(--jolly-warning)' : 'var(--jolly-text-body)',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
                <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Event / Project" style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
                <input value={mondayCardUrl} onChange={(e) => setMondayCardUrl(e.target.value)} placeholder="Monday card URL (Phase 2 reference link)" className="sm:col-span-2" style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }} />
              </div>
            </div>
            )}

            {/* Design Request Details */}
            {(isDesignRequestFlow || activeTab === 'details') && (
            <div
              className="bg-white rounded p-2.5 lg:col-span-2"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--jolly-text-disabled)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {isDesignRequestFlow ? 'Design Request' : 'Design Brief'}
              </span>
              <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Opportunity / account tier
                  </label>
                  <select value={opportunityTier} onChange={(e) => setOpportunityTier(e.target.value as OpportunityTier)} style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 8px', fontSize: '13px', backgroundColor: 'white' }}>
                    <option value="">Select account tier</option>
                    <option>Strategic $100K+</option>
                    <option>Gold $50K+</option>
                    <option>Silver $10K - $50K</option>
                    <option>Bronze $2.5K - $10K</option>
                    <option>Copper &lt;$2.5K</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Proposal template
                  </label>
                  <select value={proposalTemplate} onChange={(e) => setProposalTemplate(e.target.value as ProposalTemplate)} style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 8px', fontSize: '13px', backgroundColor: 'white' }}>
                    <option value="">Select template</option>
                    <option>Standard</option>
                    <option>HLC - Items</option>
                    <option>HLC - Product Collage</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Product design
                  </label>
                  <select value={productDesign} onChange={(e) => setProductDesign(e.target.value as ProductDesignType)} style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 8px', fontSize: '13px', backgroundColor: 'white' }}>
                    <option value="">Select design mode</option>
                    <option>Custom design</option>
                    <option>Unbranded</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Design files
                  </label>
                  <select value={designFiles} onChange={(e) => setDesignFiles(e.target.value as DesignFilesType)} style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 8px', fontSize: '13px', backgroundColor: 'white' }}>
                    <option value="">Select files status</option>
                    <option>Provided</option>
                    <option>Requested</option>
                    <option>Not available</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Primary brand color
                  </label>
                  <input
                    type="color"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', backgroundColor: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Secondary brand color
                  </label>
                  <input
                    type="color"
                    value={brandSecondaryColor}
                    onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', backgroundColor: 'white' }}
                  />
                </div>
                <div className="xl:col-span-1">
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Creative direction
                  </label>
                  <textarea
                    value={creativeDirection}
                    onChange={(e) => setCreativeDirection(e.target.value)}
                    rows={3}
                    placeholder="Describe the visual direction for the design team"
                    className="md:col-span-2 xl:col-span-3"
                    style={{ width: '100%', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '8px', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                    Pricing spreadsheet
                  </label>
                  <select value={pricingSpreadsheet} onChange={(e) => setPricingSpreadsheet(e.target.value as PricingSpreadsheetType)} style={{ width: '100%', height: '32px', border: '1px solid var(--jolly-border)', borderRadius: '6px', padding: '0 8px', fontSize: '13px', backgroundColor: 'white' }}>
                    <option value="">Select requirement</option>
                    <option>Required</option>
                    <option>Not Required</option>
                  </select>
                </div>
                {pricingSpreadsheet === 'Required' && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '6px' }}>
                      Price breaks required
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allPriceBreaks.map((breakValue) => {
                        const selected = requiredPriceBreaks.includes(breakValue);
                        return (
                          <button
                            key={breakValue}
                            type="button"
                            onClick={() => toggleRequiredPriceBreak(breakValue)}
                            style={{
                              border: selected ? '1px solid var(--jolly-primary)' : '1px solid var(--jolly-border)',
                              backgroundColor: selected ? 'var(--jolly-surface)' : 'white',
                              color: selected ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
                              borderRadius: '999px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {breakValue}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Totals Block */}
            {!isDesignRequestFlow && (
            <div
              className="rounded p-2.5 lg:col-span-1"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
                backgroundColor: 'var(--jolly-surface)',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--jolly-text-disabled)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Order Summary
              </span>
              <div className="mt-3 space-y-0">
                {[
                  { label: 'Products', value: `${totalItems} items` },
                  { label: 'Total units', value: `${totalUnits.toLocaleString()} units` },
                  {
                    label: 'Total landed cost',
                    value: `$${totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-1"
                  >
                    <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                      {row.label}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--jolly-text-body)' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="my-3"
                style={{ height: '1px', backgroundColor: 'var(--jolly-accent)' }}
              />
              <div className="flex items-center justify-between py-1">
                <span style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                  Avg. margin
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: avgMargin >= minMarginFloor ? 'var(--jolly-success)' : 'var(--jolly-destructive)',
                  }}
                >
                  {avgMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between py-1 mt-1">
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Total sell value
                </span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--jolly-primary)' }}>
                  ${totalSellValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {/* Margin health bar */}
              <div className="mt-3">
                <div
                  className="w-full rounded-full overflow-hidden flex"
                  style={{ height: '6px', backgroundColor: '#DCDFE6', borderRadius: '3px' }}
                >
                  <div
                    style={{
                      width: `${Math.min(avgMargin * 2, 100)}%`,
                      backgroundColor: avgMargin >= minMarginFloor ? 'var(--jolly-success)' : 'var(--jolly-warning)',
                      borderRadius: '3px',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span style={{ fontSize: '10px', color: 'var(--jolly-text-disabled)' }}>0%</span>
                  <span style={{ fontSize: '10px', color: 'var(--jolly-text-disabled)' }}>
                    Floor: {minMarginFloor}%
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--jolly-text-disabled)' }}>50%</span>
                </div>
              </div>


            </div>
            )}

            {/* Internal Notes */}
            {!isDesignRequestFlow && (
            <div
              className="bg-white rounded p-2.5 lg:col-span-1"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--jolly-text-disabled)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Internal Notes
              </span>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add internal notes for this proposal..."
                rows={2}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  border: '1px solid var(--jolly-border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: 'var(--jolly-text-body)',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'Inter, system-ui, sans-serif',
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
              <p style={{ fontSize: '11px', color: 'var(--jolly-text-disabled)', marginTop: '4px' }}>
                Internal use only - not included in client-safe export.
              </p>
            </div>
            )}
          </div>
          )}

          {/* RIGHT MAIN AREA */}
          <div
            className={`project-detail-right-panel min-h-0 flex-1 overflow-auto p-6 pb-24 ${
              activeTab === 'details' || activeTab === 'design-request' ? 'hidden' : ''
            } ${
              activeTab === 'line-items' ? 'is-line-items' : ''
            }`}
          >
            {!isDesignRequestFlow && activeTab !== 'details' && activeTab !== 'line-items' && activeTab !== 'assets' && (
              <div className="bg-white rounded p-6" style={{ border: '1px solid var(--jolly-border)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  {activeTab.replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)', marginTop: '8px' }}>
                  This tab is ready for entity-specific fields.
                </p>
              </div>
            )}
            {/* Line Items Section */}
            {activeTab === 'line-items' && (
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
                  Line Items
                </h2>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-1.5"
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
                  }}
                >
                  <Plus size={14} /> Add product
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '1000px' }}>
                  <caption style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                    Editable proposal line items with quantity, margin, and pricing controls.
                  </caption>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--jolly-header-bg)' }}>
                      {['#', 'Product', 'Variant', 'Qty', 'Decoration', 'Unit Cost', 'Margin', 'Sell Price', 'Total', ''].map(
                        (col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--jolly-text-secondary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => {
                      const isBelowFloor = item.margin < item.marginFloor;
                      const unitCost = item.baseCost + item.decoCost;
                      const activeTier = resolveTierForQty(item.qty);
                      const unitSell = computeUnitSell(item);
                      const lineTotal = computeLineTotal(item);
                      const isHovered = hoveredRow === item.id;

                      return (
                        <Fragment key={item.id}>
                          <tr
                            onMouseEnter={() => setHoveredRow(item.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{
                              borderTop: '1px solid var(--jolly-border)',
                              borderLeft: isBelowFloor ? '3px solid var(--jolly-warning)' : '3px solid transparent',
                              backgroundColor: isBelowFloor
                                ? '#FFFBF0'
                                : index % 2 === 0
                                ? '#FFFFFF'
                                : 'var(--jolly-row-alt)',
                              height: '72px',
                              verticalAlign: 'top',
                            }}
                          >
                          {/* # */}
                          <td
                            className="px-4 py-3"
                            style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)', width: '40px' }}
                          >
                            {index + 1}
                          </td>

                          {/* Product */}
                          <td className="px-4 py-3" style={{ minWidth: '200px' }}>
                            <div className="flex items-start gap-3">
                              <img
                                src={item.image}
                                alt={item.product}
                                className="flex-shrink-0 object-cover"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '4px',
                                  marginTop: '2px',
                                }}
                              />
                              <div>
                                <p
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: 'var(--jolly-text-body)',
                                    lineHeight: '1.3',
                                  }}
                                >
                                  {item.product}
                                </p>
                                <p
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--jolly-text-disabled)',
                                    marginTop: '2px',
                                  }}
                                >
                                  {item.supplier} &middot; SKU: {item.sku}
                                </p>
                                <div className="mt-1">
                                  <SourceBadge source={item.source} />
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Variant */}
                          <td className="px-4 py-3" style={{ minWidth: '120px' }}>
                            <select
                              value={item.variant}
                              onChange={(e) =>
                                updateLineItem(item.id, { variant: e.target.value })
                              }
                              style={{
                                height: '30px',
                                border: '1px solid var(--jolly-border)',
                                borderRadius: '4px',
                                padding: '0 8px',
                                fontSize: '13px',
                                color: 'var(--jolly-text-body)',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                outline: 'none',
                                maxWidth: '120px',
                              }}
                            >
                              {item.variantOptions.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Qty */}
                          <td className="px-4 py-3" style={{ width: '100px' }}>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) =>
                                updateLineItem(item.id, {
                                  qty: Math.max(1, parseInt(e.target.value) || 0),
                                })
                              }
                              style={{
                                width: '80px',
                                height: '30px',
                                border: '1px solid var(--jolly-border)',
                                borderRadius: '4px',
                                padding: '0 8px',
                                fontSize: '13px',
                                color: 'var(--jolly-text-body)',
                                textAlign: 'right',
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
                            <p style={{ fontSize: '11px', color: 'var(--jolly-text-disabled)', marginTop: '3px' }}>
                              MOQ: {item.moq}
                            </p>
                          </td>

                          {/* Decoration */}
                          <td className="px-4 py-3" style={{ minWidth: '180px' }}>
                            <select
                              value={item.decoration}
                              onChange={(e) =>
                                updateLineItem(item.id, { decoration: e.target.value })
                              }
                              style={{
                                height: '30px',
                                border: '1px solid var(--jolly-border)',
                                borderRadius: '4px',
                                padding: '0 8px',
                                fontSize: '12px',
                                color: 'var(--jolly-text-body)',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                outline: 'none',
                                maxWidth: '180px',
                              }}
                            >
                              {item.decorationOptions.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Unit Cost */}
                          <td className="px-4 py-3">
                            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--jolly-text-body)' }}>
                              ${unitCost.toFixed(2)}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--jolly-text-disabled)', marginTop: '3px' }}>
                              Base ${item.baseCost.toFixed(2)} + deco ${item.decoCost.toFixed(2)}
                            </p>
                          </td>

                          {/* Margin */}
                          <td className="px-4 py-3" style={{ width: '100px' }}>
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={item.margin}
                                onChange={(e) =>
                                  updateLineItem(item.id, {
                                    margin: Math.max(0, Math.min(99, parseFloat(e.target.value) || 0)),
                                  })
                                }
                                style={{
                                  width: '54px',
                                  height: '30px',
                                  border: `1px solid ${isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-border)'}`,
                                  borderRadius: '4px',
                                  padding: '0 6px',
                                  fontSize: '13px',
                                  color: isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-text-body)',
                                  fontWeight: 600,
                                  textAlign: 'right',
                                  outline: 'none',
                                  backgroundColor: isBelowFloor ? '#FFF5F5' : 'white',
                                }}
                                onFocus={(e) => {
                                  e.currentTarget.style.borderColor = isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-primary)';
                                  e.currentTarget.style.boxShadow = isBelowFloor
                                    ? '0 0 0 2px rgba(192,57,43,0.15)'
                                    : '0 0 0 2px rgba(31,92,158,0.15)';
                                }}
                                onBlur={(e) => {
                                  e.currentTarget.style.borderColor = isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-border)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              />
                              <span style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)', marginLeft: '2px' }}>%</span>
                            </div>
                            <p
                              style={{
                                fontSize: '11px',
                                marginTop: '3px',
                                fontWeight: 600,
                                color: isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-success)',
                              }}
                            >
                              {isBelowFloor && (
                                <span className="inline-flex items-center gap-0.5">
                                  <AlertTriangle size={10} /> Below floor
                                </span>
                              )}
                              {!isBelowFloor && `Floor: ${item.marginFloor}%`}
                            </p>
                          </td>

                          {/* Sell Price */}
                          <td
                            className="px-4 py-3"
                            style={{
                              backgroundColor: isBelowFloor ? 'rgba(192,57,43,0.06)' : undefined,
                            }}
                          >
                            <p
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: isBelowFloor ? 'var(--jolly-destructive)' : 'var(--jolly-text-body)',
                              }}
                            >
                              ${unitSell.toFixed(2)}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--jolly-text-disabled)', marginTop: '3px' }}>
                              Tier @ {activeTier}
                            </p>
                          </td>

                          {/* Total */}
                          <td className="px-4 py-3">
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)', whiteSpace: 'nowrap' }}>
                              ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3" style={{ width: '70px' }}>
                            <div
                              className="flex items-center gap-1"
                              style={{
                                opacity: isHovered ? 1 : 0,
                                transition: 'opacity 0.15s',
                              }}
                            >
                              <button
                                onClick={() => duplicateLineItem(item.id)}
                                className="p-1.5 rounded hover:bg-gray-100"
                                style={{ border: 'none', cursor: 'pointer', background: 'none' }}
                                title="Duplicate"
                              >
                                <Copy size={14} style={{ color: 'var(--jolly-text-disabled)' }} />
                              </button>
                              <button
                                onClick={() => deleteLineItem(item.id)}
                                className="p-1.5 rounded hover:bg-red-50"
                                style={{ border: 'none', cursor: 'pointer', background: 'none' }}
                                title="Delete"
                              >
                                <Trash2 size={14} style={{ color: 'var(--jolly-destructive)' }} />
                              </button>
                            </div>
                          </td>
                          </tr>
                          {!isDesignRequestFlow && (
                          <tr
                            style={{
                              borderTop: '1px dashed #E5E7EB',
                              backgroundColor: '#F8FAFC',
                            }}
                          >
                            <td colSpan={10} className="px-4 py-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                                  Tier pricing for {item.product}
                                </p>
                                <p style={{ fontSize: '11px', color: 'var(--jolly-text-secondary)' }}>
                                  Set per-tier sell prices exactly as needed for this proposal.
                                </p>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                {allPriceBreaks.map((tier) => (
                                  <div key={tier}>
                                    <label
                                      style={{ display: 'block', fontSize: '11px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}
                                    >
                                      Qty {tier}
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      value={item.tierPrices?.[tier] ?? computeSellPrice(item.baseCost + item.decoCost, item.margin)}
                                      onChange={(e) =>
                                        updateLineItem(item.id, {
                                          tierPrices: {
                                            ...(item.tierPrices ?? buildInitialTierPrices(item.baseCost, item.decoCost, item.margin)),
                                            [tier]: Number.parseFloat(e.target.value || '0'),
                                          },
                                        })
                                      }
                                      style={{
                                        width: '100%',
                                        height: '30px',
                                        border: '1px solid var(--jolly-border)',
                                        borderRadius: '4px',
                                        padding: '0 8px',
                                        fontSize: '12px',
                                        color: 'var(--jolly-text-body)',
                                        backgroundColor: 'white',
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                          )}
                          {isDesignRequestFlow && (
                          <tr
                            style={{
                              borderTop: '1px dashed #E5E7EB',
                              backgroundColor: '#FBFCFE',
                            }}
                          >
                            <td colSpan={10} className="px-4 py-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                                    Product link
                                  </label>
                                  <input
                                    type="url"
                                    placeholder="https://"
                                    value={item.productLink}
                                    onChange={(e) => updateLineItem(item.id, { productLink: e.target.value })}
                                    style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                                    Price break
                                  </label>
                                  <select
                                    value={item.priceBreak}
                                    onChange={(e) => updateLineItem(item.id, { priceBreak: parseInt(e.target.value, 10) })}
                                    style={{ width: '100%', height: '30px', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '0 8px', fontSize: '13px', backgroundColor: 'white' }}
                                  >
                                    {allPriceBreaks.map((priceBreak) => (
                                      <option key={priceBreak} value={priceBreak}>
                                        {priceBreak}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <label className="inline-flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={item.requiresSecondDecoration}
                                      onChange={(e) => updateLineItem(item.id, { requiresSecondDecoration: e.target.checked })}
                                    />
                                    Does it require 2nd decoration?
                                  </label>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                                    Quote notes
                                  </label>
                                  <textarea
                                    value={item.quoteNotes}
                                    onChange={(e) => updateLineItem(item.id, { quoteNotes: e.target.value })}
                                    rows={2}
                                    style={{ width: '100%', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '8px', fontSize: '13px', resize: 'vertical' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--jolly-text-secondary)', marginBottom: '4px' }}>
                                    Design notes
                                  </label>
                                  <textarea
                                    value={item.designNotes}
                                    onChange={(e) => updateLineItem(item.id, { designNotes: e.target.value })}
                                    rows={2}
                                    style={{ width: '100%', border: '1px solid var(--jolly-border)', borderRadius: '4px', padding: '8px', fontSize: '13px', resize: 'vertical' }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                          )}
                        </Fragment>
                      );
                    })}

                    {/* Add row */}
                    <tr>
                      <td colSpan={10} className="p-0">
                        <button
                          onClick={() => setSearchOpen(true)}
                          className="w-full flex items-center justify-center gap-2 py-4"
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            borderTop: '2px dashed var(--jolly-border)',
                            fontSize: '13px',
                            color: 'var(--jolly-text-disabled)',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
                            e.currentTarget.style.color = 'var(--jolly-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--jolly-text-disabled)';
                          }}
                        >
                          <Plus size={14} /> Click to add a product or custom item
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Proposal Notes for Client */}
            {activeTab === 'details' && !isDesignRequestFlow && (
            <div
              className="bg-white rounded mt-6"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              <div className="px-6 pt-5 pb-3">
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Proposal Notes for Client
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', marginTop: '4px' }}>
                  This text appears in the client-safe PowerPoint export. Keep it professional.
                </p>
              </div>
              <div className="px-6 pb-5">
                {/* Simple formatting toolbar */}
                <div
                  className="flex items-center gap-1 px-2 py-1.5 border border-b-0 rounded-t"
                  style={{
                    borderColor: 'var(--jolly-border)',
                    borderRadius: '6px 6px 0 0',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <button
                    className="p-1.5 rounded hover:bg-gray-200"
                    style={{ border: 'none', cursor: 'pointer', background: 'none' }}
                  >
                    <Bold size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-gray-200"
                    style={{ border: 'none', cursor: 'pointer', background: 'none' }}
                  >
                    <Italic size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-gray-200"
                    style={{ border: 'none', cursor: 'pointer', background: 'none' }}
                  >
                    <List size={14} style={{ color: 'var(--jolly-text-secondary)' }} />
                  </button>
                </div>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Add any notes, terms, or custom messaging to include in the client-safe PowerPoint export..."
                  rows={4}
                  style={{
                    width: '100%',
                    border: '1px solid var(--jolly-border)',
                    borderRadius: '0 0 6px 6px',
                    padding: '12px',
                    fontSize: '14px',
                    color: 'var(--jolly-text-body)',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'Inter, system-ui, sans-serif',
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
            </div>
            )}

            {/* Attachments */}
            {activeTab === 'assets' && !isDesignRequestFlow && (
            <div
              className="bg-white rounded"
              style={{
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid var(--jolly-border)',
              }}
            >
              <div className="px-6 pt-5 pb-3">
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  Designer Assets for PPT
                </h2>
                <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--jolly-text-secondary)' }}>
                  Upload files that should be included in proposal-ready PPT output.
                </p>
              </div>
              <div className="px-6 pb-5">
                {/* Upload zone */}
                <label
                  htmlFor="proposal-assets-upload"
                  className="border-2 border-dashed rounded flex items-center justify-center py-6 mb-4"
                  style={{
                    borderColor: 'var(--jolly-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--jolly-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--jolly-surface)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--jolly-border)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={20} style={{ color: 'var(--jolly-text-disabled)' }} />
                    <p style={{ fontSize: '13px', color: 'var(--jolly-text-disabled)' }}>
                      Click to upload files (spec sheets, mockups, brand assets)
                    </p>
                  </div>
                </label>
                <input
                  id="proposal-assets-upload"
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => addAttachments(e.target.files)}
                />

                {/* Attached files */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file) => (
                      <div
                        key={file}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded"
                        style={{
                          backgroundColor: 'var(--jolly-surface)',
                          borderRadius: '20px',
                          fontSize: '13px',
                          color: 'var(--jolly-text-body)',
                          fontWeight: 500,
                        }}
                      >
                        <Paperclip size={12} style={{ color: 'var(--jolly-primary)' }} />
                        {file}
                        <button
                          onClick={() => removeAttachment(file)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                          }}
                        >
                          <X size={13} style={{ color: 'var(--jolly-text-disabled)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
        </fieldset>

        {/* BOTTOM ACTION BAR */}
        {!isDesignRequestFlow && (
          <div
            className="flex-shrink-0 bg-white border-t px-8 py-3 flex items-center justify-between"
            style={{ borderColor: 'var(--jolly-border)' }}
          >
            <button
              className="flex items-center gap-1.5"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--jolly-text-disabled)',
                padding: 0,
              }}
            >
              <ArrowLeft size={14} /> Discard changes
            </button>
            <div className="flex items-center gap-3">
              <button
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
                Save Draft
              </button>
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
                  cursor: canExportSelectedPpt ? 'pointer' : 'not-allowed',
                  opacity: canExportSelectedPpt ? 1 : 0.55,
                }}
                onClick={() => exportAsPpt(exportPptType === 'quote' ? 'client' : 'design')}
                disabled={!canExportSelectedPpt}
              >
                <ClipboardList size={14} /> Export PPT ({exportPptType === 'quote' ? 'Quote' : 'Proposal'})
              </button>
              <button
                className="flex items-center gap-2"
                style={{
                  height: '36px',
                  padding: '0 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: hasMarginIssue ? '#A0A0A0' : 'var(--jolly-primary)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: hasMarginIssue ? 'not-allowed' : 'pointer',
                  opacity: hasMarginIssue ? 0.7 : 1,
                }}
                disabled={hasMarginIssue}
              >
                <Send size={14} /> Send to Client
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Search Slide-Over */}
      <ProductSearchSlideOver
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAdd={addFromSearch}
        onRequestAppa={requestFromAppa}
      />
    </div>
  );
}
