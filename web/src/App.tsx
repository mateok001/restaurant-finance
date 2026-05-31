import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import RevenuePage from './pages/Revenue';
import RevenueAnalysisPage from './pages/RevenueAnalysis';
import PurchaseManagementPage from './pages/PurchaseManagement';
import ExpenseManagementPage from './pages/ExpenseManagement';
import SuppliersPage from './pages/Suppliers';
import ProductsPage from './pages/Products';
import EmployeesPage from './pages/Employees';
import SalariesPage from './pages/Salaries';
import ProfitOverviewPage from './pages/ProfitOverview';
import ProductPurchaseReportPage from './pages/ProductPurchaseReport';
import SupplierPaymentReportPage from './pages/SupplierPaymentReport';
import BriefingPage from './pages/Briefing';
import SettingsPage from './pages/Settings';
import VoiceInputPage from './pages/VoiceInput';
import OcrInputPage from './pages/OcrInput';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/revenue" element={<RevenuePage />} />
                <Route path="/revenue/analysis" element={<RevenueAnalysisPage />} />
                <Route path="/purchases" element={<PurchaseManagementPage />} />
                <Route path="/expenses" element={<ExpenseManagementPage />} />
                <Route path="/expenses/voice" element={<VoiceInputPage />} />
                <Route path="/expenses/ocr" element={<OcrInputPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/salaries" element={<SalariesPage />} />
                <Route path="/reports" element={<Navigate to="/reports/profit" replace />} />
                <Route path="/reports/profit" element={<ProfitOverviewPage />} />
                <Route path="/reports/product" element={<ProductPurchaseReportPage />} />
                <Route path="/reports/supplier" element={<SupplierPaymentReportPage />} />
                <Route path="/briefing" element={<BriefingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
