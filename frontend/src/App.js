import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Home from './pages/Home';
import DmManagement from './pages/DmManagement';
import ScriptManagement from './pages/ScriptManagement';
import SessionManagement from './pages/SessionManagement';
import SalaryCalculation from './pages/SalaryCalculation';
import ReimbursementManagement from './pages/ReimbursementManagement';
import CashflowManagement from './pages/CashflowManagement';
import Login from './pages/Login';

function ProtectedApp() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dm" element={<DmManagement />} />
        <Route path="/script" element={<ScriptManagement />} />
        <Route path="/session" element={<SessionManagement />} />
        <Route path="/salary" element={<SalaryCalculation />} />
        <Route path="/reimbursement" element={<ReimbursementManagement />} />
        <Route path="/cashflow" element={<CashflowManagement />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
