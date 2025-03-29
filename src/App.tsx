import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, LineChart, CalendarRange, Wallet, Users, PieChart, ListTree, Building2, TrendingUp } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ContasPagar from './components/ContasPagar';
import ContasReceber from './components/ContasReceber';
import FluxoCaixa from './components/FluxoCaixa';
import FluxoCaixaAnual from './components/FluxoCaixaAnual';
import FluxoCaixaCategoria from './components/FluxoCaixaCategoria';
import ConciliacaoBancaria from './components/ConciliacaoBancaria';
import SaldosBancarios from './components/SaldosBancarios';
import DRE from './components/DRE';
import Contatos from './components/Contatos';
import Categorias from './components/Categorias';
import Profile from './components/Profile';
import Auth from './components/Auth';
import UpdatePassword from './pages/update-password';
import WhatsAppSupport from './components/WhatsAppSupport';
import { useAuth } from './lib/auth';
import { useRealtimeSubscription } from './lib/realtime';
import { useInitializeStore } from './lib/store';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contas-pagar', label: 'Contas a Pagar', icon: Receipt },
  { id: 'contas-receber', label: 'Contas a Receber', icon: Receipt },
  { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: LineChart },
  { id: 'fluxo-caixa-anual', label: 'Fluxo de Caixa Anual', icon: TrendingUp },
  { id: 'fluxo-categoria', label: 'Fluxo por Categoria', icon: PieChart },
  { id: 'conciliacao', label: 'Conciliação Bancária', icon: CalendarRange },
  { id: 'saldos', label: 'Saldos Bancários', icon: Wallet },
  { id: 'dre', label: 'DRE', icon: Building2 },
  { id: 'contatos', label: 'Contatos', icon: Users },
  { id: 'categorias', label: 'Plano de Contas', icon: ListTree }
];

function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const { user, loading: authLoading, checkAuth } = useAuth();
  const { initialized, loading: storeLoading, error } = useInitializeStore();

  useRealtimeSubscription();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (authLoading || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-red-600">
          Erro ao carregar dados: {error}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
        <Route path="/*" element={
          !user ? <Auth /> : !initialized ? (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-xl font-semibold text-gray-600">Inicializando...</div>
            </div>
          ) : (
            <div className="flex h-screen bg-[#f8fafc]">
              <Sidebar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
              <main className="flex-1 overflow-auto">
                <div className="p-6">
                  {renderContent()}
                </div>
              </main>
              <WhatsAppSupport />
            </div>
          )
        } />
      </Routes>
    </Router>
  );

  function renderContent() {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'contas-pagar':
        return <ContasPagar />;
      case 'contas-receber':
        return <ContasReceber />;
      case 'fluxo-caixa':
        return <FluxoCaixa />;
      case 'fluxo-caixa-anual':
        return <FluxoCaixaAnual />;
      case 'fluxo-categoria':
        return <FluxoCaixaCategoria />;
      case 'conciliacao':
        return <ConciliacaoBancaria />;
      case 'saldos':
        return <SaldosBancarios />;
      case 'dre':
        return <DRE />;
      case 'contatos':
        return <Contatos />;
      case 'categorias':
        return <Categorias />;
      default:
        return <Navigate to="/dashboard" />;
    }
  }
}

export default App;