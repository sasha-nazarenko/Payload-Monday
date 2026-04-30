import { ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Product } from '../types';
import { useFilters } from '../context/FilterContext';
import { PayloadUIButton } from './ui/payload-button';

interface ProductGridProps {
  products: Product[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  selectedIds?: string[];
  onToggleSelect?: (productId: string) => void;
  shortlistIds?: string[];
  onToggleShortlist?: (product: Product) => void;
  onAddToProposal?: (product: Product) => void;
}

export function ProductGrid({
  products,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  selectedIds = [],
  onToggleSelect,
  shortlistIds = [],
  onToggleShortlist,
  onAddToProposal,
}: ProductGridProps) {
  const { clearFilters } = useFilters();
  
  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--jolly-bg)' }}
        >
          <PackageOpen size={48} style={{ color: 'var(--jolly-text-disabled)' }} />
        </div>
        <h3 className="mb-2" style={{ color: 'var(--jolly-text-body)', fontSize: '18px', fontWeight: 600 }}>
          No products found
        </h3>
        <p className="mb-4 text-center" style={{ color: 'var(--jolly-text-secondary)', fontSize: '14px' }}>
          No products match your current filters.
        </p>
        <PayloadUIButton buttonStyle="secondary" size="small" onClick={clearFilters}>
          Clear filters
        </PayloadUIButton>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Product Grid */}
      <div className="grid grid-cols-3 gap-2 px-6 mb-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isSelected={selectedIds.includes(product.id)}
            onToggleSelect={onToggleSelect}
            isInShortlist={shortlistIds.includes(product.id)}
            onToggleShortlist={onToggleShortlist}
            onAddToProposal={onAddToProposal}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 py-6 border-t" style={{ borderColor: 'var(--jolly-border)' }}>
        <PayloadUIButton
          buttonStyle="secondary"
          size="small"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-2"
        >
          <ChevronLeft size={16} />
          Previous
        </PayloadUIButton>

        <span style={{ color: 'var(--jolly-text-body)', fontSize: '14px' }}>
          Page {currentPage} of {totalPages}
        </span>

        <PayloadUIButton
          buttonStyle="secondary"
          size="small"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight size={16} />
        </PayloadUIButton>
      </div>
    </div>
  );
}