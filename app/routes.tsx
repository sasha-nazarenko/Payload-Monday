import { createBrowserRouter } from 'react-router';
import { ProductCatalogue } from './pages/ProductCatalogue';
import { ProductDetail } from './pages/ProductDetail';
import { NewProduct } from './pages/NewProduct';
import { AppaSyncDashboard } from './pages/AppaSyncDashboard';
import { Dashboard } from './pages/Dashboard';
import { PricingRules } from './pages/PricingRules';
import { MyProposals } from './pages/MyProposals';
import { ProposalBuilder } from './pages/ProposalBuilder';
import { DecoratorMatrix } from './pages/DecoratorMatrix';
import { PriceCurveSettings } from './pages/PriceCurveSettings';
import { ReactAdminView } from './pages/ReactAdminView';
import { UnderConstruction } from './pages/UnderConstruction';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProductCatalogue />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/product/:productId',
    element: <ProductDetail />,
  },
  {
    path: '/products/new',
    element: <NewProduct />,
  },
  {
    path: '/appa-sync',
    element: <AppaSyncDashboard />,
  },
  {
    path: '/decorators',
    element: <DecoratorMatrix />,
  },
  {
    path: '/pricing-rules',
    element: <PricingRules />,
  },
  {
    path: '/proposals',
    element: <MyProposals />,
  },
  {
    path: '/proposals/new',
    element: <ProposalBuilder />,
  },
  {
    path: '/proposals/:proposalId',
    element: <ProposalBuilder />,
  },
  {
    path: '/settings',
    element: <PriceCurveSettings />,
  },
  {
    path: '/settings/price-curve',
    element: <PriceCurveSettings />,
  },
  {
    path: '/admin-react',
    element: <ReactAdminView />,
  },
  {
    path: '*',
    element: <UnderConstruction />,
  },
]);