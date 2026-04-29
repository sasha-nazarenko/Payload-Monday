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
  /** Tier-specific target margin percentage for sell-price calculation. */
  marginTargetPct?: number;
  /** Tier-specific minimum margin floor percentage. */
  marginFloorPct?: number;
  /** Tracks how the row was populated so the Pricing step can badge auto-filled rows. */
  source?: 'decorator' | 'template' | 'manual';
}

export interface BespokeAddon {
  id: string;
  name: string;
  /** Add-on $/unit at each product pricing tier (keys = `PricingTier.id`). */
  tierCosts: Record<string, number>;
}

/** Ensure `tierCosts` has an entry for every tier; migrates legacy flat `unitCost` if present. */
export function normalizeBespokeAddon(
  raw: { id: string; name: string; tierCosts?: Record<string, number>; unitCost?: number },
  tierIds: string[],
): BespokeAddon {
  const fallback = typeof raw.unitCost === 'number' ? raw.unitCost : 0;
  const tierCosts: Record<string, number> = {};
  for (const tid of tierIds) {
    const v = raw.tierCosts?.[tid];
    tierCosts[tid] = typeof v === 'number' ? v : fallback;
  }
  return { id: raw.id, name: raw.name, tierCosts };
}

export function sumBespokeAddonsForTier(addons: BespokeAddon[], tierId: string | undefined): number {
  if (!tierId) return 0;
  return addons.reduce((sum, a) => sum + (a.tierCosts[tierId] ?? 0), 0);
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
  category: 'blank' | 'lifestyle' | 'decoration' | 'website_tile' | 'website_hover' | 'website_variant';
  decorationMethodId?: string;
}

/** At least one complete asset in each website slot (tile, hover, variant). */
export function websiteStorefrontPackComplete(assets: AssetFile[]): boolean {
  const ok = (cat: AssetFile['category']) =>
    assets.some(a => a.category === cat && a.status === 'complete');
  return ok('website_tile') && ok('website_hover') && ok('website_variant');
}

// ── APPA Pricing Data Model ────────────────────────────────────────────────────

export interface AppaPriceBreak {
  qty: number;
  price: number;
}

export interface AppaSupplierNotes {
  sCode?: string;
  sComment?: string;
  sDec_Note?: string;
  maxDecArea?: string;
  sDecorator?: string;
  decorationTitle?: string | null;
  sPre_Production_Sample?: string;
}

export interface AppaBasePrice {
  key: string;
  type: string;
  setup: number;
  indent: boolean;
  currency: string;
  lead_time: string | null;
  description: string;
  undecorated: boolean;
  price_breaks: AppaPriceBreak[];
  tags?: string[];
  promodata_decoration?: string;
}

export interface AppaAddition {
  key: string;
  free?: boolean;
  tags?: string[];
  type: string;
  setup: number;
  currency: string;
  lead_time: string | null;
  description: string;
  undecorated: boolean;
  price_breaks: AppaPriceBreak[];
  supplier_notes?: AppaSupplierNotes;
  price_on_application?: boolean;
  promodata_decoration?: string;
  details?: string;
}

export interface AppaPriceGroup {
  base_price: AppaBasePrice;
  additions: AppaAddition[];
  promodata_decoration?: string;
}

export interface AppaPriceTags {
  decorator?: string[];
  decoration?: string[];
  website_group?: string[];
}

export interface AppaPricesPayload {
  addons: unknown[];
  price_tags: AppaPriceTags;
  price_groups: AppaPriceGroup[];
  price_disclaimer: string | null;
  currency_options: string;
}

/** Which addition keys the admin has toggled on for catalogue inclusion. */
export type AppaAdditionSelections = Record<string, boolean>;

// ── Freight/shipping lines ─────────────────────────────────────────────────────

/** Freight/shipping lines supplied by APPA (read-only in wizard; prototype uses defaults until feed API). */
export interface AppaFreightFromFeed {
  lineLabel: string;
  lineSubtitle: string;
  /** Charge per order (e.g. domestic handling), not per unit. */
  perOrderAmount: number;
  /** Line quantity in supplier UI (usually 1 per order). */
  perOrderQuantity: number;
}

export const DEFAULT_APPA_FREIGHT: AppaFreightFromFeed = {
  lineLabel: 'Shipping & Handling',
  lineSubtitle: 'Per domestic address',
  perOrderAmount: 15,
  perOrderQuantity: 1,
};

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
  productNote: string;
  isNonPublic: boolean;
  isProposalOnly: boolean;
  /** When true, storefront requires tile, hover, and variant images before staying on. */
  liveOnWebsite: boolean;

  // Step 2 — Decoration
  /** Primary decoration method selected in Step 2 — drives rate-card lookup in Step 3. */
  primaryDecorationMethod: string;
  /** Primary decorator supplier selected in Step 2 — drives rate-card lookup in Step 3. */
  primaryDecoratorSupplier: string;
  /** Optional bespoke decoration description (shown when source === 'bespoke'). */
  bespokeDecorationDescription: string;
  /** Bespoke add-ons configured in Step 2; per-tier $/unit aligned with `pricingTiers` (edit in Step 3). */
  bespokeAddons: BespokeAddon[];
  decorationMethods: DecorationMethod[];

  // Step 3 — Variants & Pricing
  variants: Variant[];
  pricingTiers: PricingTier[];
  marginTarget: number;
  marginFloor: number;
  /** @deprecated use freightLeg1 + freightLeg2 instead */
  freightAllocation: number;
  rushFee: number;
  minOrderQty: number;
  maxOrderQty: number | null;
  // Freight legs (non-APPA — admin-configured)
  supplierIsDecorator: boolean;
  freightLeg1: number;  // Supplier → Decorator (only when supplierIsDecorator = false)
  freightLeg2: number;  // Decorator → Jolly HQ (always; or Supplier/Decorator → Jolly HQ)
  /** When source === 'appa', shipping is read-only from feed; null for other sources. */
  appaFreight: AppaFreightFromFeed | null;
  /** Raw APPA price_groups payload imported from the feed. Only set when source === 'appa'. */
  appaPrices: AppaPricesPayload | null;
  /** Admin selection of which APPA additions to include in the catalogue listing. */
  appaAdditionSelections: AppaAdditionSelections;
  // MOQ availability & below-MOQ settings
  moqAvailable: boolean;
  allowBelowMoq: boolean;
  belowMoqSurchargeType: 'none' | 'flat' | 'percent';
  belowMoqSurchargeValue: number;
  belowMoqNote: string;

  // Step 4 — Assets
  assets: AssetFile[];
}

export function isProposalOnlyProduct(formData: Pick<ProductFormData, 'source' | 'isProposalOnly'>): boolean {
  return formData.source === 'proposal-only' || formData.isProposalOnly;
}

export interface StepInfo {
  number: number;
  label: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'complete-with-warning' | 'error';
}

export type StepStatus = StepInfo['status'];

export const INITIAL_FORM_DATA: ProductFormData = {
  productName: '',
  supplier: '',
  supplierSku: '',
  internalSku: '',
  category: '',
  subcategory: '',
  source: 'standard',
  description: '',
  productNote: '',
  isNonPublic: false,
  isProposalOnly: false,
  liveOnWebsite: false,
  primaryDecorationMethod: '',
  primaryDecoratorSupplier: '',
  bespokeDecorationDescription: '',
  bespokeAddons: [],
  variants: [
    { id: '1', name: 'Natural', sku: 'AS-CT001-NAT', supplierSku: '(auto from APPA)', status: 'active', source: 'appa' },
    { id: '2', name: 'Black', sku: 'AS-CT001-BLK', supplierSku: '(auto from APPA)', status: 'active', source: 'appa' },
  ],
  pricingTiers: [
    { id: '1', minQty: 1, maxQty: 49, unitCost: 6.80, marginTargetPct: 42, marginFloorPct: 25 },
    { id: '2', minQty: 50, maxQty: 99, unitCost: 5.20, marginTargetPct: 42, marginFloorPct: 25 },
    { id: '3', minQty: 100, maxQty: 249, unitCost: 4.20, marginTargetPct: 42, marginFloorPct: 25 },
    { id: '4', minQty: 250, maxQty: null, unitCost: 3.80, marginTargetPct: 42, marginFloorPct: 25 },
  ],
  marginTarget: 42,
  marginFloor: 25,
  freightAllocation: 0.80,
  rushFee: 0.50,
  minOrderQty: 50,
  maxOrderQty: null,
  supplierIsDecorator: false,
  freightLeg1: 0.50,
  freightLeg2: 0.30,
  appaFreight: null,
  appaPrices: {
    addons: [],
    price_tags: {
      decorator: ['NI Printshop'],
      decoration: ['Print - Rotary One Colour', 'Laser Engrave', 'Print - Rotary Full Colour'],
      website_group: ['Rotary Digital Print - One Colour', 'Laser Engrave', 'Rotary Digital Print - Full Colour'],
    },
    price_groups: [
      {
        base_price: {
          key: 'base-1',
          type: 'Screen Print',
          setup: 0,
          indent: false,
          currency: 'AUD',
          lead_time: '2 week',
          description: '2 week, 512MB, Screen Print, 1 colour/1 position',
          undecorated: false,
          price_breaks: [
            { qty: 50, price: 4.43 },
            { qty: 100, price: 3.54 },
            { qty: 250, price: 3.02 },
            { qty: 500, price: 2.86 },
            { qty: 1000, price: 2.75 },
          ],
        },
        additions: [
          {
            key: 'g1-screen-extra-position',
            free: false,
            tags: ['Screen Print'],
            type: 'Screen Print',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'Additional 1 colour / 1 position Print',
            undecorated: false,
            price_breaks: [
              { qty: 50, price: 0.20 },
              { qty: 100, price: 0.14 },
              { qty: 250, price: 0.12 },
              { qty: 500, price: 0.10 },
              { qty: 1000, price: 0.08 },
            ],
            price_on_application: false,
            promodata_decoration: 'Direct Print: Screen Print',
          },
          {
            key: 'g1-data-upload-200-500',
            free: false,
            tags: ['Addition', 'Data Upload'],
            type: 'Addition',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'ADD: Data Upload From 200 To 500MB',
            undecorated: false,
            price_breaks: [
              { qty: 50, price: 0.30 },
              { qty: 100, price: 0.30 },
              { qty: 250, price: 0.30 },
              { qty: 500, price: 0.30 },
              { qty: 1000, price: 0.30 },
            ],
            price_on_application: false,
            promodata_decoration: 'Addition: Data Upload',
          },
          {
            key: 'g1-upgrade-8gb',
            free: false,
            tags: ['Addition', 'Upgrade'],
            type: 'Addition',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'ADD: Upgrade 8GB 3.0 COB',
            undecorated: false,
            price_breaks: [
              { qty: 50, price: 1.60 },
              { qty: 100, price: 1.60 },
              { qty: 250, price: 1.60 },
              { qty: 500, price: 1.60 },
              { qty: 1000, price: 1.60 },
            ],
            price_on_application: false,
            promodata_decoration: 'Addition: Other',
          },
        ],
        promodata_decoration: 'Direct Print: Screen Print',
      },
      {
        base_price: {
          key: 'base-2',
          type: 'Digital UV Print',
          setup: 0,
          indent: false,
          currency: 'AUD',
          lead_time: '2 week',
          description: '2 week, 512MB, Digital UV Print, 1 position',
          undecorated: false,
          price_breaks: [
            { qty: 50, price: 4.99 },
            { qty: 100, price: 3.78 },
            { qty: 250, price: 3.26 },
            { qty: 500, price: 3.10 },
            { qty: 1000, price: 2.99 },
          ],
        },
        additions: [
          {
            key: 'g2-uv-extra-position',
            free: false,
            tags: ['Digital UV Print'],
            type: 'Digital UV Print',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'Additional 1 position',
            undecorated: false,
            price_breaks: [
              { qty: 50, price: 0.76 },
              { qty: 100, price: 0.38 },
              { qty: 250, price: 0.36 },
              { qty: 500, price: 0.34 },
              { qty: 1000, price: 0.32 },
            ],
            price_on_application: false,
            promodata_decoration: 'Direct Print: UV Print',
          },
          {
            key: 'g2-pms-matching',
            free: false,
            tags: ['Addition', 'Service'],
            type: 'Addition',
            setup: 35,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'ADD: Pms Matching Service',
            undecorated: false,
            price_breaks: [],
            price_on_application: true,
            promodata_decoration: 'Addition: Other',
          },
          {
            key: 'g2-upgrade-16gb',
            free: false,
            tags: ['Addition', 'Upgrade'],
            type: 'Addition',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'ADD: Upgrade 16GB 3.0 COB',
            undecorated: false,
            price_breaks: [
              { qty: 50, price: 2.15 },
              { qty: 100, price: 2.15 },
              { qty: 250, price: 2.15 },
              { qty: 500, price: 2.15 },
              { qty: 1000, price: 2.15 },
            ],
            price_on_application: false,
            promodata_decoration: 'Addition: Other',
          },
        ],
        promodata_decoration: 'Direct Print: UV Print',
      },
      {
        base_price: {
          key: 'base-3',
          type: 'Screen Print',
          setup: 0,
          indent: false,
          currency: 'AUD',
          lead_time: '2 week',
          description: '2 week, 1GB, Screen Print, 1 colour/1 position',
          undecorated: false,
          price_breaks: [
            { qty: 50, price: 5.07 },
            { qty: 100, price: 4.12 },
            { qty: 250, price: 3.68 },
            { qty: 500, price: 3.48 },
            { qty: 1000, price: 3.35 },
          ],
        },
        additions: [
          {
            key: 'g3-screen-extra-position',
            free: false,
            tags: ['Screen Print'],
            type: 'Screen Print',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'Additional 1 colour / 1 position Print',
            undecorated: false,
            price_breaks: [
              { qty: 50, price: 0.20 },
              { qty: 100, price: 0.14 },
              { qty: 250, price: 0.12 },
              { qty: 500, price: 0.10 },
              { qty: 1000, price: 0.08 },
            ],
            price_on_application: false,
            promodata_decoration: 'Direct Print: Screen Print',
          },
          {
            key: 'g3-data-protection',
            free: false,
            tags: ['Addition', 'Service'],
            type: 'Addition',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'ADD: Data Protection',
            undecorated: false,
            price_breaks: [],
            price_on_application: true,
            promodata_decoration: 'Addition: Personalisation',
          },
          {
            key: 'g3-upgrade-32gb',
            free: false,
            tags: ['Addition', 'Upgrade'],
            type: 'Addition',
            setup: 0,
            currency: 'AUD',
            lead_time: '2 week',
            description: 'ADD: Upgrade 32GB 3.0 COB',
            undecorated: false,
            price_breaks: [
              { qty: 50, price: 2.54 },
              { qty: 100, price: 2.54 },
              { qty: 250, price: 2.54 },
              { qty: 500, price: 2.54 },
              { qty: 1000, price: 2.54 },
            ],
            price_on_application: false,
            promodata_decoration: 'Addition: Other',
          },
        ],
        promodata_decoration: 'Direct Print: Screen Print',
      },
    ],
    price_disclaimer: null,
    currency_options: 'AUD',
  },
  appaAdditionSelections: {},
  moqAvailable: true,
  allowBelowMoq: false,
  belowMoqSurchargeType: 'none',
  belowMoqSurchargeValue: 0,
  belowMoqNote: '',
  decorationMethods: [
    {
      id: 'dm1',
      method: 'Screen Print',
      preferred: true,
      printAreaWidth: 280,
      printAreaHeight: 200,
      maxColors: 4,
      positionX: 50,
      positionY: 80,
      decorator: 'PromoLine Decorators',
      setupCost: 45.00,
      runCost: 1.20,
      notes: 'Full front print area. Max 4 spot colours.',
    },
  ],
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
export const PRIMARY_DECORATION_METHODS = [
  'Screen Print', 'Pad Print', 'Laser Engraving', 'Embroidery', 'Deboss', 'Digital Print',
];

export const DECORATORS = [
  'Print Co Melbourne', 'BrandPrint Sydney', 'EmbroidMe Brisbane',
  'LaserEdge Engraving', 'SubliMax Perth', 'FullSpectrum Digital',
  'PromoLine Decorators', 'StitchMaster Embroidery', 'InkWorks Australia',
];

// ─── Global Price Curve (persisted in localStorage) ───────────────────────────

export const DEFAULT_PRICE_CURVE: PricingTier[] = [
  { id: 'default-1', minQty: 1,   maxQty: 49,  unitCost: 6.80 },
  { id: 'default-2', minQty: 50,  maxQty: 99,  unitCost: 5.20 },
  { id: 'default-3', minQty: 100, maxQty: 249, unitCost: 4.20 },
  { id: 'default-4', minQty: 250, maxQty: null, unitCost: 3.80 },
];

/** Legacy multi-template storage (pre–single-tier Settings). Migrated once into `jolly_price_curve`. */
const LEGACY_TEMPLATES_KEY = 'jolly_price_curve_templates';

export function getGlobalPriceCurve(): PricingTier[] {
  try {
    const stored = localStorage.getItem('jolly_price_curve');
    if (stored) {
      const parsed = JSON.parse(stored) as PricingTier[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => ({ ...t }));
      }
    }
    const legacy = localStorage.getItem(LEGACY_TEMPLATES_KEY);
    if (legacy) {
      const arr = JSON.parse(legacy) as { isDefault?: boolean; tiers?: PricingTier[] }[];
      if (Array.isArray(arr)) {
        const def = arr.find((x) => x.isDefault) ?? arr[0];
        if (def?.tiers && def.tiers.length > 0) {
          const tiers = def.tiers.map((t) => ({ ...t }));
          saveGlobalPriceCurve(tiers);
          return tiers;
        }
      }
    }
  } catch {}
  return DEFAULT_PRICE_CURVE.map((t) => ({ ...t }));
}

export function saveGlobalPriceCurve(tiers: PricingTier[]): void {
  try {
    localStorage.setItem('jolly_price_curve', JSON.stringify(tiers));
  } catch {}
}