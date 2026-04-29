import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image, FileText, Eye, RotateCcw, Info } from 'lucide-react';
import { ProductFormData, AssetFile, websiteStorefrontPackComplete, isProposalOnlyProduct } from './types';
import { YesNoToggle } from '../YesNoToggle';

interface StepAssetsProps {
  formData: ProductFormData;
  onUpdate: (updates: Partial<ProductFormData>) => void;
  errors: Record<string, string>;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={20} style={{ color: 'var(--jolly-primary)' }} />;
  return <FileText size={20} style={{ color: 'var(--jolly-text-secondary)' }} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepAssets({ formData, onUpdate }: StepAssetsProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [lightboxAsset, setLightboxAsset] = useState<AssetFile | null>(null);
  const [liveWebsiteHint, setLiveWebsiteHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadCategory, setCurrentUploadCategory] = useState<AssetFile['category']>('blank');
  const [currentDecorationMethodId, setCurrentDecorationMethodId] = useState<string | undefined>();

  const { assets, decorationMethods, liveOnWebsite } = formData;
  const liveOnWebsiteBool = Boolean(liveOnWebsite);
  const proposalOnly = isProposalOnlyProduct(formData);

  const liveOnWebsiteRef = useRef(liveOnWebsiteBool);
  liveOnWebsiteRef.current = liveOnWebsiteBool;

  // Only react to asset list changes — not to flipping Live on — so turning Yes on cannot be
  // undone by an effect pass that runs in the same transition as `onUpdate({ liveOnWebsite: true })`.
  useEffect(() => {
    if (!liveOnWebsiteRef.current) return;
    if (!websiteStorefrontPackComplete(assets)) {
      onUpdate({ liveOnWebsite: false });
    }
  }, [assets, onUpdate]);

  const decorationAssets = (methodId: string) => assets.filter(a => a.category === 'decoration' && a.decorationMethodId === methodId);

  const simulateUpload = useCallback((file: { name: string; size: number; type: string }, category: AssetFile['category'], decorationMethodId?: string) => {
    const newAsset: AssetFile = {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
      category,
      decorationMethodId,
    };

    onUpdate({ assets: [...formData.assets, newAsset] });

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        onUpdate({
          assets: formData.assets.map(a =>
            a.id === newAsset.id ? { ...a, status: 'complete' as const, progress: 100 } : a
          ).concat(newAsset.status === 'uploading' ? [] : [{ ...newAsset, status: 'complete' as const, progress: 100 }]),
        });
      }
    }, 500);

    // Immediately set to complete after a delay for demo purposes
    setTimeout(() => {
      onUpdate({
        assets: [...formData.assets, { ...newAsset, status: 'complete', progress: 100 }],
      });
    }, 1500);
  }, [formData.assets, onUpdate]);

  const handleFileSelect = (category: AssetFile['category'], decorationMethodId?: string) => {
    setCurrentUploadCategory(category);
    setCurrentDecorationMethodId(decorationMethodId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const newAsset: AssetFile = {
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'complete',
        progress: 100,
        category: currentUploadCategory,
        decorationMethodId: currentDecorationMethodId,
      };
      onUpdate({ assets: [...formData.assets, newAsset] });
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const trySetLiveOnWebsite = (next: boolean) => {
    if (!next) {
      setLiveWebsiteHint(null);
      onUpdate({ liveOnWebsite: false });
      return;
    }
    setLiveWebsiteHint(null);
    if (!websiteStorefrontPackComplete(assets)) {
      setLiveWebsiteHint('Add a tile image, hover image, and at least one variant image before turning on Live on website.');
      return;
    }
    onUpdate({ liveOnWebsite: true });
  };

  const addMockAsset = (category: AssetFile['category'], decorationMethodId?: string) => {
    const mockFiles: Record<string, { name: string; size: number; type: string }[]> = {
      blank: [
        { name: 'product-front-natural.png', size: 2458624, type: 'image/png' },
        { name: 'product-back-natural.png', size: 2156032, type: 'image/png' },
        { name: 'product-front-black.png', size: 2301952, type: 'image/png' },
      ],
      lifestyle: [
        { name: 'lifestyle-outdoor-shoot.jpg', size: 4521984, type: 'image/jpeg' },
        { name: 'lifestyle-office-flat-lay.jpg', size: 3847168, type: 'image/jpeg' },
      ],
      decoration: [
        { name: 'print-template.ai', size: 1572864, type: 'application/illustrator' },
        { name: 'dieline-spec.pdf', size: 819200, type: 'application/pdf' },
        { name: 'embroidery-area-guide.eps', size: 1048576, type: 'application/eps' },
      ],
      website_tile: [
        { name: 'web-tile-460.png', size: 182432, type: 'image/png' },
        { name: 'web-tile-920.png', size: 356000, type: 'image/png' },
      ],
      website_hover: [
        { name: 'web-hover-reveal.png', size: 298400, type: 'image/png' },
        { name: 'web-hover-alt.jpg', size: 412000, type: 'image/jpeg' },
      ],
      website_variant: [
        { name: 'web-variant-natural.png', size: 512000, type: 'image/png' },
        { name: 'web-variant-black.png', size: 498000, type: 'image/png' },
        { name: 'web-variant-white.png', size: 501200, type: 'image/png' },
      ],
    };

    const available = mockFiles[category] || mockFiles.blank;
    const existing = assets.filter(a => a.category === category && a.decorationMethodId === decorationMethodId);
    const nextFile = available[existing.length % available.length];

    const newAsset: AssetFile = {
      id: String(Date.now()),
      name: nextFile.name,
      size: nextFile.size,
      type: nextFile.type,
      status: 'complete',
      progress: 100,
      category,
      decorationMethodId,
    };
    onUpdate({ assets: [...assets, newAsset] });
  };

  const handleRemoveAsset = (id: string) => {
    onUpdate({ assets: assets.filter(a => a.id !== id) });
  };

  const UploadZone = ({ category, decorationMethodId, label, accept, maxSize }: {
    category: AssetFile['category'];
    decorationMethodId?: string;
    label: string;
    accept: string;
    maxSize: string;
  }) => {
    const zoneAssets =
      category === 'decoration' && decorationMethodId
        ? decorationAssets(decorationMethodId)
        : assets.filter(a => a.category === category);
    const isDragOver = dragOver === `${category}-${decorationMethodId || 'main'}`;

    return (
      <div>
        {/* Uploaded Files Grid */}
        {zoneAssets.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {zoneAssets.map(asset => (
              <div
                key={asset.id}
                className="relative group rounded border overflow-hidden"
                style={{
                  borderColor: asset.status === 'error' ? 'var(--jolly-destructive)' : 'var(--jolly-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--jolly-bg)',
                }}
              >
                {/* Thumbnail / File Icon */}
                <div className="flex items-center justify-center" style={{ height: '80px' }}>
                  {asset.type.startsWith('image/') ? (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--jolly-surface)' }}
                    >
                      <Image size={28} style={{ color: 'var(--jolly-primary)' }} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <FileText size={24} style={{ color: 'var(--jolly-text-secondary)' }} />
                      <span style={{ fontSize: '10px', color: 'var(--jolly-text-disabled)', textTransform: 'uppercase' }}>
                        {asset.name.split('.').pop()}
                      </span>
                    </div>
                  )}

                  {/* Upload Progress Overlay */}
                  {asset.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <div className="w-3/4 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--jolly-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${asset.progress}%`, backgroundColor: 'var(--jolly-primary)' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Hover Actions */}
                  {asset.status === 'complete' && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {asset.type.startsWith('image/') && (
                        <button
                          onClick={() => setLightboxAsset(asset)}
                          className="p-1.5 rounded bg-white/90 hover:bg-white"
                          title="View full size"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveAsset(asset.id)}
                        className="p-1.5 rounded bg-white/90 hover:bg-white"
                        title="Remove"
                      >
                        <X size={14} style={{ color: 'var(--jolly-destructive)' }} />
                      </button>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="p-2" style={{ borderTop: '1px solid var(--jolly-border)' }}>
                  <p className="truncate" style={{ fontSize: '11px', color: 'var(--jolly-text-body)', fontWeight: 500 }}>
                    {asset.name}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--jolly-text-disabled)' }}>
                    {formatFileSize(asset.size)}
                  </p>
                </div>

                {/* Error State */}
                {asset.status === 'error' && (
                  <div className="px-2 pb-2">
                    <p style={{ fontSize: '10px', color: 'var(--jolly-destructive)' }}>Upload failed</p>
                    <button className="flex items-center gap-1 mt-1" style={{ fontSize: '10px', color: 'var(--jolly-primary)', cursor: 'pointer', background: 'none', border: 'none' }}>
                      <RotateCcw size={10} /> Retry
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Drop Zone */}
        <div
          className="flex flex-col items-center justify-center py-8 px-4 rounded cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${isDragOver ? 'var(--jolly-primary)' : 'var(--jolly-border)'}`,
            backgroundColor: isDragOver ? 'var(--jolly-surface)' : 'transparent',
            borderRadius: '6px',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(`${category}-${decorationMethodId || 'main'}`); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            addMockAsset(category, decorationMethodId);
          }}
          onClick={() => addMockAsset(category, decorationMethodId)}
        >
          <Upload size={24} style={{ color: isDragOver ? 'var(--jolly-primary)' : 'var(--jolly-text-disabled)', marginBottom: '8px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
            {label}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
            Drag files here or click to browse
          </p>
          <p style={{ fontSize: '12px', color: 'var(--jolly-text-disabled)', marginTop: '8px' }}>
            Accepted: {accept} — Max size: {maxSize}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFileChange}
      />

      {/* Website storefront assets */}
      {!proposalOnly ? (
        <div
          className="rounded"
          style={{
            backgroundColor: 'var(--jolly-card)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <div className="p-6 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Website assets
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
              Tile, hover, and variant images are only required when this product should appear on the public website.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div
              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded"
              style={{ backgroundColor: 'var(--jolly-bg)', border: '1px solid var(--jolly-border)', borderRadius: '6px' }}
            >
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>Live on website</p>
                <p style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', marginTop: '4px', maxWidth: '480px' }}>
                  Turn on only when the storefront listing is active. You cannot enable this until tile, hover, and variant images are all uploaded.
                </p>
              </div>
              <YesNoToggle value={liveOnWebsiteBool} onChange={trySetLiveOnWebsite} />
            </div>

          {liveWebsiteHint && (
            <div
              className="flex items-start gap-2 p-3 rounded"
              style={{ backgroundColor: 'var(--jolly-destructive-bg)', fontSize: '13px', color: 'var(--jolly-destructive)', borderRadius: '6px' }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{liveWebsiteHint}</span>
            </div>
          )}

            <div
              className="flex items-start gap-2 p-3 rounded"
              style={{ backgroundColor: 'var(--jolly-surface)', fontSize: '13px', color: 'var(--jolly-text-body)', borderRadius: '6px', border: '1px solid var(--jolly-accent)' }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--jolly-primary)' }} />
              <span>
                <strong>When is each field required?</strong> Tile, hover, and variant images stay optional for catalogue-only or internal use.
                They become <strong>mandatory</strong> as soon as <strong>Live on website</strong> is Yes. If you remove an image while live is on, Live on website turns off automatically until requirements are met again.
              </span>
            </div>

            <div>
              <h3 className="flex flex-wrap items-center gap-2 mb-3" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Tile image (website grid)
                {liveOnWebsiteBool ? (
                  <span style={{ color: 'var(--jolly-destructive)', fontSize: '13px', fontWeight: 700 }}>* required</span>
                ) : (
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-bg)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', border: '1px solid var(--jolly-border)' }}>
                    optional unless live
                  </span>
                )}
              </h3>
              <UploadZone
                category="website_tile"
                label="Upload tile image"
                accept="PNG, JPG, WEBP"
                maxSize="10 MB per file"
              />
            </div>

            <div>
              <h3 className="flex flex-wrap items-center gap-2 mb-3" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Hover image
                {liveOnWebsiteBool ? (
                  <span style={{ color: 'var(--jolly-destructive)', fontSize: '13px', fontWeight: 700 }}>* required</span>
                ) : (
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-bg)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', border: '1px solid var(--jolly-border)' }}>
                    optional unless live
                  </span>
                )}
              </h3>
              <UploadZone
                category="website_hover"
                label="Upload hover image"
                accept="PNG, JPG, WEBP"
                maxSize="10 MB per file"
              />
            </div>

            <div>
              <h3 className="flex flex-wrap items-center gap-2 mb-3" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Variant images (website)
                {liveOnWebsiteBool ? (
                  <span style={{ color: 'var(--jolly-destructive)', fontSize: '13px', fontWeight: 700 }}>* required</span>
                ) : (
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-bg)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', border: '1px solid var(--jolly-border)' }}>
                    optional unless live
                  </span>
                )}
              </h3>
              <p className="mb-3" style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)' }}>
                Add one or more images for storefront variants (e.g. per colour). At least one file is required when Live on website is on.
              </p>
              <UploadZone
                category="website_variant"
                label="Upload variant images"
                accept="PNG, JPG, WEBP"
                maxSize="10 MB per file"
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded p-6"
          style={{
            backgroundColor: 'var(--jolly-card)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid var(--jolly-border)',
          }}
        >
          <div className="flex items-start gap-2">
            <Info size={16} style={{ marginTop: '2px', color: 'var(--jolly-primary)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                Website assets are hidden for Proposal-Only products
              </p>
              <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '4px' }}>
                Proposal-only products are not published to the storefront, so tile, hover, and variant website images are not needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section A: Product Images */}
      <div
        className="rounded"
        style={{
          backgroundColor: 'var(--jolly-card)',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
            Product Images
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
            {proposalOnly
              ? 'Proposal-only products must include at least one blank product image for proposals.'
              : 'Blank product images are used for quoting and mockups.'}
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Blank Product Images */}
          <div>
            <h3 className="mb-3 flex flex-wrap items-center gap-2" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Blank Product Images
              {proposalOnly ? (
                <span style={{ color: 'var(--jolly-destructive)', fontSize: '13px', fontWeight: 700 }}>* required for proposal-only</span>
              ) : (
                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-bg)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)', border: '1px solid var(--jolly-border)' }}>
                  recommended
                </span>
              )}
            </h3>
            <UploadZone
              category="blank"
              label="Upload blank product images"
              accept="PNG, JPG, WEBP"
              maxSize="10 MB per file"
            />
          </div>

          {/* Lifestyle Images */}
          <div>
            <h3 className="flex items-center gap-2 mb-3" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Lifestyle Images
              <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--jolly-bg)', fontSize: '11px', fontWeight: 600, color: 'var(--jolly-text-secondary)' }}>
                optional
              </span>
            </h3>
            <UploadZone
              category="lifestyle"
              label="Upload lifestyle images"
              accept="PNG, JPG, WEBP"
              maxSize="10 MB per file"
            />
          </div>
        </div>
      </div>

      {/* Section B: Decoration Method Assets */}
      {decorationMethods.length > 0 && (
        <div
          className="rounded"
          style={{
            backgroundColor: 'var(--jolly-card)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <div className="p-6 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
              Decoration Method Assets
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', marginTop: '2px' }}>
              Upload templates, dielines, and spec sheets for each decoration method.
            </p>
          </div>
          <div className="p-6 space-y-6">
            {decorationMethods.map(method => (
              <div key={method.id}>
                <h3 className="flex items-center gap-2 mb-3" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                  {method.method}
                  {method.preferred && (
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--jolly-primary)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '4px',
                      }}
                    >
                      Preferred
                    </span>
                  )}
                </h3>
                <UploadZone
                  category="decoration"
                  decorationMethodId={method.id}
                  label={`Upload files for ${method.method}`}
                  accept="AI, EPS, PDF, PNG, JPG"
                  maxSize="25 MB per file"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {decorationMethods.length === 0 && (
        <div
          className="rounded p-6 text-center"
          style={{
            backgroundColor: 'var(--jolly-card)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <p style={{ fontSize: '14px', color: 'var(--jolly-text-disabled)' }}>
            Add decoration methods in Step 3 to upload method-specific assets.
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxAsset && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setLightboxAsset(null)}
        >
          <div
            className="relative max-w-3xl max-h-[80vh] rounded overflow-hidden"
            style={{ backgroundColor: 'white', borderRadius: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--jolly-border)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                {lightboxAsset.name}
              </span>
              <button
                onClick={() => setLightboxAsset(null)}
                className="p-1.5 rounded hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center justify-center p-8" style={{ minHeight: '300px', backgroundColor: 'var(--jolly-bg)' }}>
              <div className="flex flex-col items-center gap-3">
                <Image size={64} style={{ color: 'var(--jolly-primary)' }} />
                <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)' }}>
                  {lightboxAsset.name} — {formatFileSize(lightboxAsset.size)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
