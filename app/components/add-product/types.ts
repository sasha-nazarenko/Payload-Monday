export interface Variant {
  id: string;
  name: string;
  sku: string;
  supplierSku: string;
  status: 'active' | 'inactive';
  source: 'appa' | 'manual';
}

export interface PricingTier {
  id: string;
  minQty: number;
  maxQty: number | null;
  unitCost: number;
  /** Tracks how the row was populated so the Pricing step can badge auto-filled rows. */
  source?: 'decorator' | 'template' | 'manual';
}

export interface DecorationMethod {
  id: string;
  method: string;
  preferred: boolean;
  printAreaWidth: number;
  printAreaHeight: number;
  maxColors: number;
  positionX: number;
  positionY: number;
  decorator: string;
  setupCost: number;
  runCost: number;
  notes: string;
}

export interface AssetFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'complete' | 'error';
  progress: number;
  category: 'blank' | 'lifestyle' | 'decoration';
  decorationMethodId?: string;
}

export interface ProductFormData {
  // Step 1 — Core Details
  productName: string;
  supplier: string;
  supplierSku: string;
  internalSku: string;
  category: string;
  subcategory: string;
  source: 'standard' | 'appa' | 'proposal-only' | 'bespoke';
  description: string;
  isNonPublic: boolean;
  isProposalOnly: boolean;

  // Step 2 — Decoration
  /** Primary decoration method selected in Step 2 — drives rate-card lookup in Step 3. */
  primaryDecorationMethod: string;
  /** Primary decorator supplier selected in Step 2 — drives rate-card lookup in Step 3. */
  primaryDecoratorSupplier: string;
  /** Optional bespoke decoration description (shown when source === 'bespoke'). */
  bespokeDecorationDescription: string;
  /** Bespoke add-ons configured in Step 2. */
  bespokeAddons: { id: string; name: string; unitCost: number }[];
  decorationMethods: DecorationMethod[];

  // Step 3 — Variants & Pricing
  variants: Variant[];
  pricingTiers: PricingTier[];
  marginTarget: number;
  marginFloor: number;
  rushFee: number;
  minOrderQty: number;
  maxOrderQty: number | null;
  // Freight legs
  supplierIsDecorator: boolean;
  freightLeg1: number;  // Supplier → Decorator (only when supplierIsDecorator = false)
  freightLeg2: number;  // Decorator → Jolly HQ (always; or Supplier/Decorator → Jolly HQ)
  // MOQ availability & below-MOQ settings
  moqAvailable: boolean;
  allowBelowMoq: boolean;
  belowMoqSurchargeType: 'none' | 'flat' | 'percent';
  belowMoqSurchargeValue: number;
  belowMoqNote: string;

  // Step 4 — Assets
  assets: AssetFile[];
}

export interface StepInfo {
  number: number;
  label: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'complete-with-warning' | 'error';
}

export type StepStatus = StepInfo['status'];

// ─── Global Price Curve (persisted in localStorage) ───────────────────────────

export const DEFAULT_PRICE_CURVE: PricingTier[] = [
  { id: 'default-1', minQty: 1,   maxQty: 49,  unitCost: 6.80 },
  { id: 'default-2', minQty: 50,  maxQty: 99,  unitCost: 5.20 },
  { id: 'default-3', minQty: 100, maxQty: 249, unitCost: 4.20 },
  { id: 'default-4', minQty: 250, maxQty: null, unitCost: 3.80 },
];

export const INITIAL_FORM_DATA: ProductFormData = {
  productName: '',
  supplier: '',
  supplierSku: '',
  internalSku: '',
  category: '',
  subcategory: '',
  source: 'standard',
  description: '',
  isNonPublic: false,
  isProposalOnly: false,
  primaryDecorationMethod: '',
  primaryDecoratorSupplier: '',
  bespokeDecorationDescription: '',
  bespokeAddons: [],
  variants: [],
  pricingTiers: DEFAULT_PRICE_CURVE,
  marginTarget: 42,
  marginFloor: 25,
  rushFee: 0.50,
  minOrderQty: 50,
  maxOrderQty: null,
  supplierIsDecorator: false,
  freightLeg1: 0.50,
  freightLeg2: 0.30,
  moqAvailable: true,
  allowBelowMoq: false,
  belowMoqSurchargeType: 'none',
  belowMoqSurchargeValue: 0,
  belowMoqNote: '',
  decorationMethods: [],
  assets: [],
};

export const SUPPLIERS = [
  'AS Colour', 'Biz Collection', 'JB\'s Wear', 'Winning Spirit',
  'Ramo', 'Stencil', 'Grace Collection', 'Legend Life',
  'Headwear Professionals', 'Adcraft'
];

export const CATEGORIES = [
  'Bags & Totes', 'Drinkware', 'Apparel', 'Headwear',
  'Technology', 'Stationery', 'Outdoor & Leisure',
  'Health & Wellness', 'Home & Living', 'Eco & Sustainable'
];

export const SUBCATEGORIES: Record<string, string[]> = {
  'Bags & Totes': ['Tote Bags', 'Backpacks', 'Duffel Bags', 'Cooler Bags', 'Drawstring Bags'],
  'Drinkware': ['Mugs', 'Water Bottles', 'Travel Cups', 'Wine Glasses', 'Tumblers'],
  'Apparel': ['T-Shirts', 'Polo Shirts', 'Hoodies', 'Jackets', 'Workwear'],
  'Headwear': ['Caps', 'Beanies', 'Bucket Hats', 'Visors', 'Trucker Caps'],
  'Technology': ['USB Drives', 'Power Banks', 'Speakers', 'Earbuds', 'Phone Accessories'],
  'Stationery': ['Pens', 'Notebooks', 'Folders', 'Desk Accessories', 'Calendars'],
  'Outdoor & Leisure': ['Umbrellas', 'Towels', 'Picnic Sets', 'Sports Equipment', 'Beach Items'],
  'Health & Wellness': ['Hand Sanitiser', 'First Aid', 'Stress Balls', 'Lip Balm', 'Sunscreen'],
  'Home & Living': ['Candles', 'Coasters', 'Kitchen Items', 'Blankets', 'Photo Frames'],
  'Eco & Sustainable': ['Bamboo Products', 'Recycled Items', 'Organic Cotton', 'Reusable Bags', 'Seed Kits'],
};

export const DECORATION_METHODS_LIST = [
  // Primary 6 (per spec — shown in Step 2 primary dropdown)
  'Screen Print', 'Pad Print', 'Laser Engraving', 'Embroidery', 'Deboss', 'Digital Print',
  // Additional methods available in decoration detail cards
  'Sublimation', 'Heat Transfer', 'UV Print',
];

/** The six primary decoration methods shown in the Step 2 primary dropdown. */
export const PRIMARY_DECORATION_METHODS = DECORATION_METHODS_LIST.slice(0, 6);

export const DECORATORS = [
  'Print Co Melbourne', 'BrandPrint Sydney', 'EmbroidMe Brisbane',
  'LaserEdge Engraving', 'SubliMax Perth', 'FullSpectrum Digital',
  'PromoLine Decorators', 'StitchMaster Embroidery', 'InkWorks Australia',
];

// ─── Price Curve Template ─────────────────────────────────────────────────────

export interface PriceCurveTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
  tiers: PricingTier[];
}

const SEED_TEMPLATES: PriceCurveTemplate[] = [
  {
    id: 'tpl-standard',
    name: 'Standard Price Curve',
    description: 'Default 4-tier curve for general promotional products.',
    isDefault: true,
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    tiers: DEFAULT_PRICE_CURVE.map((t, i) => ({ ...t, id: `s${i + 1}` })),
  },
  {
    id: 'tpl-high-volume',
    name: 'High Volume',
    description: 'Aggressive 5-tier pricing for large-run corporate orders.',
    isDefault: false,
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    tiers: [
      { id: 'h1', minQty: 1,    maxQty: 99,   unitCost: 7.50 },
      { id: 'h2', minQty: 100,  maxQty: 249,  unitCost: 5.80 },
      { id: 'h3', minQty: 250,  maxQty: 499,  unitCost: 4.50 },
      { id: 'h4', minQty: 500,  maxQty: 999,  unitCost: 3.60 },
      { id: 'h5', minQty: 1000, maxQty: null, unitCost: 2.90 },
    ],
  },
  {
    id: 'tpl-premium',
    name: 'Premium Products',
    description: 'Higher unit costs for premium branded items with fewer tiers.',
    isDefault: false,
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    tiers: [
      { id: 'p1', minQty: 1,   maxQty: 49,  unitCost: 18.00 },
      { id: 'p2', minQty: 50,  maxQty: 199, unitCost: 14.50 },
      { id: 'p3', minQty: 200, maxQty: null, unitCost: 12.00 },
    ],
  },
  {
    id: 'tpl-economy',
    name: 'Economy Range',
    description: '6-tier curve with graduated volume discounts for low-cost items.',
    isDefault: false,
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    tiers: [
      { id: 'e1', minQty: 1,   maxQty: 24,  unitCost: 3.20 },
      { id: 'e2', minQty: 25,  maxQty: 49,  unitCost: 2.60 },
      { id: 'e3', minQty: 50,  maxQty: 99,  unitCost: 2.10 },
      { id: 'e4', minQty: 100, maxQty: 249, unitCost: 1.75 },
      { id: 'e5', minQty: 250, maxQty: 499, unitCost: 1.40 },
      { id: 'e6', minQty: 500, maxQty: null, unitCost: 1.10 },
    ],
  },
];

const TEMPLATES_KEY = 'jolly_price_curve_templates';

export function getTemplates(): PriceCurveTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    if (stored) return JSON.parse(stored) as PriceCurveTemplate[];
  } catch {}
  return SEED_TEMPLATES;
}

export function saveTemplates(templates: PriceCurveTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    // Keep legacy key in sync with the default template
    const def = templates.find(t => t.isDefault) ?? templates[0];
    if (def) localStorage.setItem('jolly_price_curve', JSON.stringify(def.tiers));
  } catch {}
}

export function getGlobalPriceCurve(): PricingTier[] {
  try {
    const stored = localStorage.getItem('jolly_price_curve');
    if (stored) return JSON.parse(stored) as PricingTier[];
  } catch {}
  return DEFAULT_PRICE_CURVE;
}

export function saveGlobalPriceCurve(tiers: PricingTier[]): void {
  try {
    localStorage.setItem('jolly_price_curve', JSON.stringify(tiers));
  } catch {}
}