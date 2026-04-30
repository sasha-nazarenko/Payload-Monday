import { Product } from '../types';

export type ProposalSeedSource = 'APPA' | 'Manual' | 'Proposal-Only';

export interface ProposalSeedProduct {
  id: string;
  name: string;
  supplier: string;
  price: number;
  image: string;
  source: ProposalSeedSource;
  category: string;
  sku: string;
}

export interface ProposalNavigationState {
  prefillProducts?: ProposalSeedProduct[];
  sourceLabel?: string;
  draftSeed?: {
    entityTitle?: string;
    customerName?: string;
    contactName?: string;
    contactEmail?: string;
    eventName?: string;
    dueDate?: string;
    internalNotes?: string;
    clientNotes?: string;
    attachments?: string[];
    opportunityTier?: string;
    proposalTemplate?: string;
    productDesign?: string;
    designFiles?: string;
    pricingSpreadsheet?: string;
    mondayCardUrl?: string;
    creativeDirection?: string;
    brandPrimaryColor?: string;
    brandSecondaryColor?: string;
  };
}

export interface OrderSeedLine {
  id: string;
  name: string;
  supplier: string;
  qty: number;
  unitPrice: number;
  source: string;
}

export interface OrderNavigationState {
  orderSeed?: {
    proposalId: string;
    proposalTitle: string;
    clientName: string;
    eventName: string;
    dueDate: string;
    status: string;
    totalValue: number;
    productCount: number;
    unitCount: number;
    lineItems: OrderSeedLine[];
  };
}

const SHORTLIST_STORAGE_KEY = 'upc-sales-shortlist';
const PENDING_PROPOSAL_STATE_KEY = 'upc-pending-proposal-state';

export function buildProposalSeedFromProduct(product: Product): ProposalSeedProduct {
  return {
    id: product.id,
    name: product.name,
    supplier: product.supplier,
    price: product.price,
    image: product.image,
    source: product.status === 'proposal' ? 'Proposal-Only' : 'Manual',
    category: product.category,
    sku: product.sku,
  };
}

export function readSalesShortlist(): ProposalSeedProduct[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProposalSeedProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSalesShortlist(items: ProposalSeedProduct[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(items));
}

export function toggleShortlistProduct(product: ProposalSeedProduct): ProposalSeedProduct[] {
  const current = readSalesShortlist();
  const exists = current.some((item) => item.id === product.id);
  const next = exists ? current.filter((item) => item.id !== product.id) : [...current, product];
  writeSalesShortlist(next);
  return next;
}

export function clearSalesShortlist() {
  writeSalesShortlist([]);
}

export function writePendingProposalState(state: ProposalNavigationState) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PENDING_PROPOSAL_STATE_KEY, JSON.stringify(state));
}

export function consumePendingProposalState(): ProposalNavigationState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(PENDING_PROPOSAL_STATE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_PROPOSAL_STATE_KEY);
    return JSON.parse(raw) as ProposalNavigationState;
  } catch {
    window.sessionStorage.removeItem(PENDING_PROPOSAL_STATE_KEY);
    return null;
  }
}