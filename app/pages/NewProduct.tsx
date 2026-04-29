import { useState, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Package,
  RefreshCw,
  FileText,
  Paintbrush,
  AlertCircle,
} from 'lucide-react';
import { LeftSidebar } from '../components/LeftSidebar';
import { useRole } from '../context/RoleContext';
import { ProductFormData, INITIAL_FORM_DATA, getGlobalPriceCurve } from '../components/add-product/types';
import { StepCoreDetails } from '../components/add-product/StepCoreDetails';
import { StepVariantsPricing } from '../components/add-product/StepVariantsPricing';
import { StepAppaPricing } from '../components/add-product/StepAppaPricing';
import { StepDecoration } from '../components/add-product/StepDecoration';
import { StepAssets } from '../components/add-product/StepAssets';
import { getValidationReport } from '../components/add-product/StepReview';
import { ActivationModal } from '../components/add-product/ActivationModal';

type ProductSource = ProductFormData['source'];
type WizardStepId = 'core' | 'decoration' | 'pricing' | 'assets';

interface WizardStepDef {
  id: WizardStepId;
  label: string;
  description: string;
}

interface ProductTypeOption {
  source: ProductSource;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PRODUCT_TYPE_OPTIONS: ProductTypeOption[] = [
  {
    source: 'standard',
    label: 'Standard Product',
    description: 'A manually created product sourced from a supplier catalogue. You control all details.',
    icon: <Package size={28} />,
  },
  {
    source: 'appa',
    label: 'APPA Product',
    description: 'Sourced from the APPA feed. Variants, SKUs, and freight are auto-populated from the feed.',
    icon: <RefreshCw size={28} />,
  },
  {
    source: 'proposal-only',
    label: 'Proposal Only',
    description: 'Not listed publicly. Used for quoting and proposals. Hidden from the main catalogue.',
    icon: <FileText size={28} />,
  },
  {
    source: 'bespoke',
    label: 'Bespoke Product',
    description: 'A custom or one-off product with bespoke decoration and pricing. Fully configurable.',
    icon: <Paintbrush size={28} />,
  },
];

const PRODUCT_FLOW_STEPS: Record<ProductSource, WizardStepDef[]> = {
  standard: [
    { id: 'core', label: 'Core Details', description: 'Establish the product identity, supplier details, category, and product description.' },
    { id: 'decoration', label: 'Decoration', description: 'Select the primary decoration setup and capture production-ready decoration details.' },
    { id: 'pricing', label: 'Pricing & Tiers', description: 'Define variants, pricing tiers, freight, and margin targets for the standard product.' },
    { id: 'assets', label: 'Assets', description: 'Upload product imagery and supporting decoration assets for catalogue and website use.' },
  ],
  appa: [
    { id: 'core', label: 'APPA Sync', description: 'Link the supplier SKU to APPA and confirm the imported product identity fields.' },
    { id: 'pricing', label: 'APPA Pricing', description: 'Review imported variants, APPA freight, and pricing tiers before activation.' },
    { id: 'assets', label: 'Assets', description: 'Add supporting catalogue and website assets for the APPA sourced product.' },
  ],
  'proposal-only': [
    { id: 'core', label: 'Proposal Details', description: 'Capture the product identity and proposal-specific product notes used in quoting.' },
    { id: 'pricing', label: 'Quote Pricing', description: 'Configure the pricing structure needed for proposal building and quote approval.' },
  ],
  bespoke: [
    { id: 'core', label: 'Bespoke Details', description: 'Establish the bespoke product identity, supplier data, and custom product notes.' },
    { id: 'decoration', label: 'Bespoke Decoration', description: 'Capture bespoke decoration methods, suppliers, and any custom production requirements.' },
    { id: 'pricing', label: 'Bespoke Pricing', description: 'Build the bespoke pricing model, MOQ rules, and custom add-on costs.' },
  ],
};

/** Stable tier ids for new wizard state (`getGlobalPriceCurve` shapes the ladder; ids match form conventions). */
function initialPricingTiersFromSettings(): ProductFormData['pricingTiers'] {
  return getGlobalPriceCurve().map((t, i) => ({ ...t, id: String(i + 1) }));
}

export function NewProduct() {
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const [selectedType, setSelectedType] = useState<ProductSource | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>(() => ({
    ...INITIAL_FORM_DATA,
    pricingTiers: initialPricingTiersFromSettings(),
  }));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('12:34 PM');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [activated, setActivated] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const flowSteps = useMemo(
    () => PRODUCT_FLOW_STEPS[selectedType ?? 'standard'],
    [selectedType],
  );
  const currentStepDef = flowSteps[currentStep - 1];

  const handleFormUpdate = useCallback((updates: Partial<ProductFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const updateKeys = Object.keys(updates);
    setErrors(prev => {
      const next = { ...prev };
      updateKeys.forEach(key => delete next[key]);
      return next;
    });
    // Trigger auto-save
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }));
      // Show toast
      setShowToast(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setShowToast(false), 2000);
    }, 1200);
  }, []);

  // Validation report
  const validationReport = useMemo(
    () => getValidationReport(formData, flowSteps),
    [formData, flowSteps],
  );

  const getStepStatus = useCallback((step: number): 'complete' | 'warning' | 'error' | 'pending' => {
    const stepItems = validationReport.items.filter(i => i.step === step);
    if (stepItems.length === 0) return 'pending';
    if (stepItems.some(i => i.status === 'error')) return 'error';
    if (stepItems.some(i => i.status === 'warning')) return 'warning';
    return 'complete';
  }, [validationReport.items]);

  // Completeness
  const completedFields = validationReport.totalComplete;
  const totalFields = validationReport.totalRequired;
  const completenessPercent = Math.round((completedFields / Math.max(totalFields, 1)) * 100);
  const completenessColor = completenessPercent >= 80 ? 'var(--jolly-success)' : completenessPercent >= 50 ? 'var(--jolly-warning)' : 'var(--jolly-destructive)';

  const stepCompletion = useMemo(() => {
    return flowSteps.map((step, i) => {
      const stepNumber = i + 1;
      const items = validationReport.items.filter((item) => item.step === stepNumber);
      const required = items.filter((item) => item.status === 'pass' || item.status === 'error').length;
      const complete = items.filter((item) => item.status === 'pass').length;
      const ratio = required > 0 ? Math.round((complete / required) * 100) : 0;
      return {
        step,
        stepNumber,
        required,
        complete,
        ratio,
        status: getStepStatus(stepNumber),
      };
    });
  }, [flowSteps, validationReport.items, getStepStatus]);

  const handleNavigateStep = (step: number) => {
    if (step < 1 || step > flowSteps.length) return;
    setCurrentStep(step);
    // Focus management: scroll to top
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinue = () => {
    // Warn about empty required fields but don't block
    if (currentStep < flowSteps.length) {
      handleNavigateStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      handleNavigateStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }));
    }, 800);
  };

  const handleActivate = () => {
    if (validationReport.canActivate) {
      setShowActivationModal(true);
    }
  };

  const handleConfirmActivation = () => {
    setShowActivationModal(false);
    setActivated(true);
    // Redirect after a brief moment
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleSelectType = (source: ProductSource) => {
    setSelectedType(source);
    setCurrentStep(1);
    handleFormUpdate({ source });
  };

  // Type selection screen
  if (!selectedType) {
    return (
      <div
        className="flex h-screen overflow-hidden"
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          backgroundColor: 'var(--jolly-bg)',
        }}
      >
        <LeftSidebar currentRole={currentRole} />

        <div className="flex-1 flex flex-col overflow-y-auto">
          <header
            className="shrink-0 border-b px-6 py-4"
            style={{ backgroundColor: 'var(--jolly-card)', borderColor: 'var(--jolly-border)' }}
          >
            <Link
              to="/"
              className="text-[12px] hover:underline"
              style={{ color: 'var(--jolly-text-secondary)', textDecoration: 'none' }}
            >
              ← Products
            </Link>
            <h1
              className="mt-1 text-[1.125rem] font-semibold leading-tight tracking-tight"
              style={{ color: 'var(--jolly-text-body)' }}
            >
              New Product
            </h1>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
            <div className="w-full max-w-[760px]">
              <div className="mb-8 text-center">
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--jolly-text-body)', marginBottom: '8px' }}>
                  Select a product type
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)' }}>
                  Choose how this product will be sourced and managed before configuring its details.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {PRODUCT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.source}
                    type="button"
                    onClick={() => handleSelectType(opt.source)}
                    className="text-left rounded-xl border p-6 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--jolly-primary)] focus-visible:ring-offset-2"
                    style={{
                      backgroundColor: 'var(--jolly-card)',
                      borderColor: 'var(--jolly-border)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--jolly-primary)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 1px var(--jolly-primary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--jolly-border)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    }}
                  >
                    <div
                      className="mb-4 flex items-center justify-center rounded-lg"
                      style={{
                        width: '52px',
                        height: '52px',
                        backgroundColor: 'color-mix(in srgb, var(--jolly-primary) 12%, transparent)',
                        color: 'var(--jolly-primary)',
                      }}
                    >
                      {opt.icon}
                    </div>
                    <div
                      style={{ fontSize: '16px', fontWeight: 700, color: 'var(--jolly-text-body)', marginBottom: '6px' }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--jolly-text-secondary)', lineHeight: '1.5' }}>
                      {opt.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state after activation
  if (activated) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', backgroundColor: 'var(--jolly-bg)' }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#E8F5E9' }}
          >
            <CheckCircle2 size={32} style={{ color: 'var(--jolly-success)' }} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
            Product Activated!
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)', marginTop: '8px' }}>
            {formData.productName || 'Your product'} is now live in the catalogue. Redirecting…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        backgroundColor: 'var(--jolly-bg)',
      }}
    >
      <LeftSidebar currentRole={currentRole} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Compact header: title row + single slim toolbar (step + draft + progress + save) */}
        <header
          className="shrink-0 border-b"
          style={{ backgroundColor: 'var(--jolly-card)', borderColor: 'var(--jolly-border)' }}
        >
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <Link
                to="/"
                className="text-[12px] hover:underline"
                style={{ color: 'var(--jolly-text-secondary)', textDecoration: 'none' }}
              >
                ← Products
              </Link>
              <h1
                className="mt-1 truncate text-[1.125rem] font-semibold leading-tight tracking-tight"
                style={{ color: 'var(--jolly-text-body)' }}
              >
                New product
                {selectedType && (
                  <span
                    className="ml-2 text-[12px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--jolly-primary) 12%, transparent)',
                      color: 'var(--jolly-primary)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {PRODUCT_TYPE_OPTIONS.find(o => o.source === selectedType)?.label}
                  </span>
                )}
              </h1>
            </div>
            <div
              className="flex shrink-0 items-center gap-1.5 text-[12px] max-md:pr-0"
              style={{ color: 'var(--jolly-text-secondary)' }}
              aria-live="polite"
            >
              {saveStatus === 'saving' && (
                <>
                  <Loader2 size={14} className="animate-spin" style={{ color: 'var(--jolly-text-disabled)' }} />
                  <span className="hidden sm:inline" style={{ color: 'var(--jolly-text-disabled)' }}>
                    Saving…
                  </span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check size={14} style={{ color: 'var(--jolly-success)' }} />
                  <span className="hidden sm:inline" style={{ color: 'var(--jolly-success)' }}>
                    Saved {lastSavedTime}
                  </span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <XCircle size={14} style={{ color: 'var(--jolly-destructive)' }} />
                  <span className="hidden sm:inline" style={{ color: 'var(--jolly-destructive)' }}>
                    Save failed
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Step Tabs */}
          <div
            className="border-t flex items-stretch overflow-x-auto"
            style={{
              borderColor: 'var(--jolly-border)',
              backgroundColor: 'color-mix(in srgb, var(--jolly-bg) 65%, var(--jolly-card))',
              scrollbarWidth: 'none',
            }}
            aria-label="Wizard steps"
          >
            {flowSteps.map((step, i) => {
              const stepNum = i + 1;
              const status = getStepStatus(stepNum);
              const isActive = currentStep === stepNum;
              const statusColor =
                status === 'complete' ? 'var(--jolly-success)' :
                status === 'warning' ? 'var(--jolly-warning)' :
                status === 'error' ? 'var(--jolly-destructive)' : 'var(--jolly-text-disabled)';
              const StatusIcon =
                status === 'complete' ? Check :
                status === 'warning' ? AlertCircle :
                status === 'error' ? XCircle : null;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleNavigateStep(stepNum)}
                  className="flex items-center gap-2 px-4 py-3 shrink-0 border-b-2 text-[13px] font-medium transition-colors outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--jolly-primary)]"
                  style={{
                    borderBottomColor: isActive ? 'var(--jolly-primary)' : 'transparent',
                    color: isActive ? 'var(--jolly-primary)' : 'var(--jolly-text-secondary)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    className="flex items-center justify-center rounded-full text-[11px] font-bold shrink-0"
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: isActive
                        ? 'var(--jolly-primary)'
                        : status === 'complete' ? 'var(--jolly-success)'
                        : status === 'error' ? 'var(--jolly-destructive)'
                        : 'var(--jolly-border)',
                      color: (isActive || status === 'complete' || status === 'error') ? 'white' : 'var(--jolly-text-secondary)',
                    }}
                  >
                    {status === 'complete' && !isActive ? <Check size={11} /> : stepNum}
                  </span>
                  <span>{step.label}</span>
                  {StatusIcon && !isActive && (
                    <StatusIcon size={13} style={{ color: statusColor }} />
                  )}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-2 px-4 shrink-0">
              <span
                className="text-[12px] font-medium whitespace-nowrap"
                style={{ color: completenessColor }}
              >
                {completedFields}/{totalFields}
              </span>
              <div
                className="overflow-hidden rounded-full"
                style={{ width: '72px', height: '4px', backgroundColor: 'var(--jolly-border)' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${completenessPercent}%`,
                    backgroundColor: completenessColor,
                    transition: 'width 0.3s',
                    borderRadius: '9999px',
                  }}
                />
              </div>
              <span
                className="w-8 text-right text-[11px] tabular-nums shrink-0"
                style={{ color: 'var(--jolly-text-disabled)' }}
              >
                {completenessPercent}%
              </span>
            </div>
          </div>
        </header>

        {/* Main Form Area */}
        <div className="flex-1 overflow-y-auto" ref={mainContentRef}>
          <div className="max-w-[1200px] mx-auto py-8 px-6">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_290px] gap-6 items-start">
              <div>
            {/* Step Title */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: 'var(--jolly-primary)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  {currentStep}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                  {currentStepDef?.label}
                </h2>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--jolly-text-secondary)', marginLeft: '41px' }}>
                {currentStepDef?.description}
              </p>
            </div>

            {/* Step Content */}
            {currentStepDef?.id === 'core' && (
              <StepCoreDetails
                formData={formData}
                onUpdate={handleFormUpdate}
                errors={errors}
                onChangeType={() => setSelectedType(null)}
              />
            )}
            {currentStepDef?.id === 'decoration' && (
              <StepDecoration
                formData={formData}
                onUpdate={handleFormUpdate}
                errors={errors}
              />
            )}
            {currentStepDef?.id === 'pricing' && selectedType === 'appa' && (
              <StepAppaPricing
                formData={formData}
                onUpdate={handleFormUpdate}
                errors={errors}
              />
            )}
            {currentStepDef?.id === 'pricing' && selectedType !== 'appa' && (
              <StepVariantsPricing
                formData={formData}
                onUpdate={handleFormUpdate}
                currentRole={currentRole}
                errors={errors}
              />
            )}
            {currentStepDef?.id === 'assets' && (
              <StepAssets
                formData={formData}
                onUpdate={handleFormUpdate}
                errors={errors}
              />
            )}

            {/* Inline Step Navigation */}
            <div
              className="flex items-center justify-between mt-8 pt-6"
              style={{ borderTop: '1px solid var(--jolly-border)' }}
            >
              <div>
                {currentStep === 1 ? (
                  <button
                    onClick={() => setSelectedType(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded"
                    style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--jolly-text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <ChevronLeft size={16} />
                    Change product type
                  </button>
                ) : (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 rounded"
                    style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--jolly-text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <ChevronLeft size={16} />
                    Back to {flowSteps[currentStep - 2]?.label}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 rounded"
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--jolly-border)', color: 'var(--jolly-text-body)', fontSize: '14px', fontWeight: 600, height: '40px', cursor: 'pointer' }}
                >
                  Save Draft
                </button>
                {currentStep < flowSteps.length ? (
                  <button
                    onClick={handleContinue}
                    className="flex items-center gap-2 px-5 py-2 rounded"
                    style={{ backgroundColor: 'var(--jolly-primary)', color: 'white', fontSize: '14px', fontWeight: 600, height: '40px', border: 'none', cursor: 'pointer' }}
                  >
                    Continue to {flowSteps[currentStep]?.label}
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleActivate}
                    disabled={!validationReport.canActivate}
                    className="flex items-center gap-2 px-5 py-2 rounded"
                    style={{
                      backgroundColor: validationReport.canActivate ? 'var(--jolly-success)' : 'var(--jolly-bg)',
                      color: validationReport.canActivate ? 'white' : 'var(--jolly-text-disabled)',
                      fontSize: '14px', fontWeight: 600, height: '40px', border: 'none',
                      cursor: validationReport.canActivate ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Activate Product
                  </button>
                )}
              </div>
            </div>
              </div>

              <aside className="xl:sticky xl:top-4">
                <div
                  className="rounded border p-4"
                  style={{
                    backgroundColor: 'var(--jolly-card)',
                    borderColor: 'var(--jolly-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} style={{ color: 'var(--jolly-text-secondary)' }} />
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--jolly-text-secondary)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Completion
                      </span>
                    </div>
                    <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--jolly-text-body)' }}>
                      {completedFields}/{totalFields}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {stepCompletion.map(({ step, stepNumber, required, complete, ratio, status }) => {
                      const stepIcon =
                        step.id === 'core' ? <Package size={13} /> :
                        step.id === 'decoration' ? <Paintbrush size={13} /> :
                        step.id === 'pricing' ? <FileText size={13} /> :
                        <ClipboardList size={13} />;

                      const statusColor =
                        status === 'complete' ? 'var(--jolly-success)' :
                        status === 'error' ? 'var(--jolly-destructive)' :
                        status === 'warning' ? 'var(--jolly-warning)' : 'var(--jolly-text-disabled)';

                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => handleNavigateStep(stepNumber)}
                          className="w-full text-left rounded border px-3 py-2"
                          style={{
                            borderColor: currentStep === stepNumber ? 'var(--jolly-primary)' : 'var(--jolly-border)',
                            backgroundColor: currentStep === stepNumber
                              ? 'color-mix(in srgb, var(--jolly-primary) 5%, white)'
                              : 'white',
                            cursor: 'pointer',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--jolly-text-body)' }}>
                              <span style={{ color: statusColor }}>{stepIcon}</span>
                              {step.label}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--jolly-text-secondary)', fontWeight: 600 }}>
                              {complete}/{required || 0}
                            </span>
                          </div>
                          <div
                            className="overflow-hidden rounded-full"
                            style={{ height: '4px', backgroundColor: 'var(--jolly-border)' }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${ratio}%`,
                                backgroundColor: statusColor,
                                transition: 'width 0.2s ease',
                              }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg"
          style={{
            backgroundColor: 'var(--jolly-success)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 9999,
            animation: 'fadeInOut 2s ease-in-out',
          }}
        >
          <Check size={16} />
          Saved successfully
        </div>
      )}

      {/* Activation Modal */}
      {showActivationModal && (
        <ActivationModal
          formData={formData}
          onConfirm={handleConfirmActivation}
          onCancel={() => setShowActivationModal(false)}
        />
      )}
    </div>
  );
}

// Toast animation styles
const toastStyles = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(8px); }
    10% { opacity: 1; transform: translateY(0); }
    90% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(8px); }
  }
`;