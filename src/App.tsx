import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { CollectionPage } from './pages/CollectionPage';
import { InspectionPage } from './pages/InspectionPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/collection" replace />} />
        <Route path="/collection" element={<LayoutWrapper page="collection"><CollectionPage /></LayoutWrapper>} />
        <Route path="/inspection" element={<LayoutWrapper page="inspection"><InspectionPage /></LayoutWrapper>} />
        <Route path="/inspection/:resultId/banner/:bannerId" element={<InspectionDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function LayoutWrapper({ page, children }: { page: 'collection' | 'inspection'; children: React.ReactNode }) {
  return (
    <Layout currentPage={page} onPageChange={() => {}}>
      {children}
    </Layout>
  );
}

export default App;
