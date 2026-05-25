import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import RevenuePage from './pages/Revenue';
import ExpensesPage from './pages/Expenses';
import SuppliersPage from './pages/Suppliers';
import ProductsPage from './pages/Products';
import EmployeesPage from './pages/Employees';
import SalariesPage from './pages/Salaries';
import ReportsPage from './pages/Reports';
import BriefingPage from './pages/Briefing';
import SettingsPage from './pages/Settings';
import VoiceInputPage from './pages/VoiceInput';
import OcrInputPage from './pages/OcrInput';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  if (!token) return <Navigate to="/login" replace />;
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
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/expenses/voice" element={<VoiceInputPage />} />
                <Route path="/expenses/ocr" element={<OcrInputPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/salaries" element={<SalariesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/briefing" element={<BriefingPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
