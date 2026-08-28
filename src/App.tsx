/**
 * ⚠️ ROUTING RULES:
 * - Router is in main.tsx. Do NOT add another <BrowserRouter> here or anywhere.
 * - Use <Routes> + <Route> components ONLY. Do NOT use useRoutes().
 * - STATIC IMPORTS ONLY — no React.lazy() or dynamic import().
 * - Import from 'react-router' — NOT 'react-router-dom' (does not exist).
 */
import { Routes, Route, Navigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import Auth from '@/pages/Auth';
import HouseholdSetup from '@/pages/HouseholdSetup';
import Home from '@/pages/Home';
import Import from '@/pages/Import';
import Expenses from '@/pages/Expenses';
import Settings from '@/pages/Settings';
import Rules from '@/pages/Rules';
import Incomes from '@/pages/Incomes';
import ImportIncomes from '@/pages/ImportIncomes';

function ProtectedRoute({ children }: {children: React.ReactNode;}) {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  if (authLoading || householdLoading) {
    return (
      <div data-ev-id="ev_8fd76a0570" className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
				<div data-ev-id="ev_736c8a86b4" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
			</div>);

  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!household) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div data-ev-id="ev_1c5fc17c67" className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
				<div data-ev-id="ev_b7ce04cd50" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
			</div>);

  }

  return (
    <Routes>
			<Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
			<Route path="/setup" element={user ? <HouseholdSetup /> : <Navigate to="/auth" replace />} />
			<Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
			<Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
			<Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
			<Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
			<Route path="/incomes" element={<ProtectedRoute><Incomes /></ProtectedRoute>} />
			<Route path="/import-incomes" element={<ProtectedRoute><ImportIncomes /></ProtectedRoute>} />
			<Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
		</Routes>);

}