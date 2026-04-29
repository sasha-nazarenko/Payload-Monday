import { Search, X } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { useNavigate } from 'react-router';
import { useRole } from '../context/RoleContext';
import { PayloadUIButton } from './ui/payload-button';

interface TopBarProps {
  productCount: number;
}

export function TopBar({ productCount }: TopBarProps) {
  const { filters, updateFilters, removeFilter, clearFilters } = useFilters();
  const { currentRole } = useRole();
  const navigate = useNavigate();

  const activeFilterChips: { label: string; filterType: keyof typeof filters; value?: string }[] = [];

  // Add category filters
  filters.categories.forEach(cat => {
    activeFilterChips.push({
      label: `Category: ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      filterType: 'categories',
      value: cat
    });
  });

  // Add supplier filters
  filters.suppliers.forEach(sup => {
    activeFilterChips.push({
      label: `Supplier: ${sup.charAt(0).toUpperCase() + sup.slice(1)}`,
      filterType: 'suppliers',
      value: sup
    });
  });

  // Add decoration method filters
  filters.decorationMethods.forEach(method => {
    const methodLabel = method === 'screen' ? 'Screen Print' :
                       method === 'embroidery' ? 'Embroidery' :
                       method === 'laser' ? 'Laser Engrave' :
                       method === 'digital' ? 'Digital Print' : method;
    activeFilterChips.push({
      label: `Decorator: ${methodLabel}`,
      filterType: 'decorationMethods',
      value: method
    });
  });

  // Add color filters
  filters.colors.forEach(color => {
    activeFilterChips.push({
      label: `Color: ${color.charAt(0).toUpperCase() + color.slice(1)}`,
      filterType: 'colors',
      value: color
    });
  });

  // Add availability filter
  if (filters.availability !== 'all') {
    activeFilterChips.push({
      label: `Availability: ${filters.availability === 'in-stock' ? 'In Stock' : 'Made to Order'}`,
      filterType: 'availability'
    });
  }

  return (
    <div className="bg-white border-b" style={{ borderColor: 'var(--jolly-border)' }}>
      {/* Page Title and Search Bar */}
      <div className="px-6 py-4">
        <h1 className="mb-4" style={{ color: 'var(--jolly-text-body)', fontSize: '24px', fontWeight: 700 }}>
          {currentRole === 'admin' ? 'Product Catalogue' : 'Product Catalogue'}
        </h1>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search 
              size={20} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--jolly-text-disabled)' }}
            />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              placeholder="Search by name, SKU, supplier, or keyword…"
              className="w-full pl-11 pr-4 border rounded"
              style={{
                borderColor: 'var(--jolly-border)',
                color: 'var(--jolly-text-body)',
                fontSize: '14px',
                height: '44px',
                borderRadius: '6px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--jolly-primary)';
                e.currentTarget.style.outlineOffset = '0px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            />
          </div>

          {/* Add Custom Product Button */}
          <PayloadUIButton
            buttonStyle="secondary"
            size="small"
            onClick={() => navigate('/products/new')}
            className="whitespace-nowrap"
          >
            Add Custom Product
          </PayloadUIButton>
        </div>
      </div>

      {/* Active Filter Chips Section */}
      {activeFilterChips.length > 0 && (
        <div 
          className="px-6 py-3 border-t"
          style={{ 
            borderColor: 'var(--jolly-border)',
            backgroundColor: 'var(--jolly-bg)'
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filters Label and Count */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--jolly-text-body)' }}>
                Filters
              </span>
              <span 
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{ 
                  backgroundColor: 'var(--jolly-primary)',
                  color: 'white'
                }}
              >
                {activeFilterChips.length} active
              </span>
            </div>

            {/* Clear All Filters Link */}
            <button 
              onClick={clearFilters}
              className="text-sm hover:underline"
              style={{ color: 'var(--jolly-primary)' }}
            >
              Clear all filters
            </button>

            {/* Filter Pills */}
            {activeFilterChips.map((chip, index) => (
              <div
                key={`${chip.filterType}-${chip.value || index}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-white border"
                style={{
                  borderColor: 'var(--jolly-primary)',
                  color: 'var(--jolly-primary)',
                  fontSize: '13px',
                  borderRadius: '4px'
                }}
              >
                <span>{chip.label}</span>
                <button
                  onClick={() => removeFilter(chip.filterType, chip.value)}
                  className="hover:opacity-70"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Count and Sort Bar */}
      <div 
        className="px-6 py-3 flex items-center justify-between border-t"
        style={{ borderColor: 'var(--jolly-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--jolly-text-secondary)' }}>
          Showing {productCount} product{productCount !== 1 ? 's' : ''}
        </p>
        
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--jolly-text-secondary)' }}>Sort:</span>
          <select 
            className="px-3 py-1.5 border rounded text-sm"
            style={{
              borderColor: 'var(--jolly-border)',
              color: 'var(--jolly-text-body)',
              borderRadius: '6px'
            }}
          >
            <option>Relevance</option>
            <option>Name (A-Z)</option>
            <option>Name (Z-A)</option>
            <option>Price (Low to High)</option>
            <option>Price (High to Low)</option>
            <option>Newest First</option>
          </select>
        </div>
      </div>
    </div>
  );
}