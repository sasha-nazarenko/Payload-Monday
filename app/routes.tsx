import { createBrowserRouter } from 'react-router';
import { ProductCatalogue } from './pages/ProductCatalogue';
import { ProductDetail } from './pages/ProductDetail';
import { NewProduct } from './pages/NewProduct';
import { AppaSyncDashboard } from './pages/AppaSyncDashboard';
import { Dashboard } from './pages/Dashboard';
import { PricingRules } from './pages/PricingRules';
import { MyProposals } from './pages/MyProposals';
import { ProposalBuilder } from './pages/ProposalBuilder';
import { OrderBuilder } from './pages/OrderBuilder';
import { DecoratorMatrix } from './pages/DecoratorMatrix';
import { ReactAdminView } from './pages/ReactAdminView';
import { UnderConstruction } from './pages/UnderConstruction';
import { PriceCurveSettings } from './pages/PriceCurveSettings';

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
    element: <ProposalBuilder key="proposal-new" />,
  },
  {
    path: '/proposals/design-request/new',
    element: <ProposalBuilder key="design-request-new" flow="design-request" />,
  },
  {
    path: '/proposals/:proposalId',
    element: <ProposalBuilder key="proposal-existing" />,
  },
  {
    path: '/orders/new',
    element: <OrderBuilder />,
  },
  {
    path: '/admin-react',
    element: <ReactAdminView />,
  },
  {
    path: '/settings',
    element: <PriceCurveSettings />,
  },
  {
    path: '*',
    element: <UnderConstruction />,
  },
]);