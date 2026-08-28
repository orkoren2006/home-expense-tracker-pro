import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Home, Upload, Settings, List, LogOut, FileText, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();
  const { household } = useHousehold();
  const location = useLocation();

  const navItems = [
  { path: '/', icon: Home, label: 'בית' },
  { path: '/import', icon: Upload, label: 'ייבוא הוצאות' },
  { path: '/import-incomes', icon: Upload, label: 'ייבוא הכנסות' },
  { path: '/expenses', icon: List, label: 'הוצאות' },
  { path: '/incomes', icon: Wallet, label: 'הכנסות' },
  { path: '/rules', icon: FileText, label: 'כללים' },
  { path: '/settings', icon: Settings, label: 'הגדרות' }];


  return (
    <div data-ev-id="ev_dc295bf4b7" className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header data-ev-id="ev_4c75166794" className="bg-card border-b border-border sticky top-0 z-50">
        <div data-ev-id="ev_2bd99c6969" className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div data-ev-id="ev_87b7cc91bc" className="flex items-center gap-3">
            <h1 data-ev-id="ev_1da2d9525f" className="text-xl font-bold text-primary">ניהול תקציב</h1>
            {household &&
            <span data-ev-id="ev_d2261cf5bd" className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {household.name}
              </span>
            }
          </div>
          <button data-ev-id="ev_ea9f98f9bc"
          onClick={signOut}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">

            <LogOut className="w-5 h-5" />
            <span data-ev-id="ev_89cac645c8" className="hidden sm:inline">יציאה</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main data-ev-id="ev_630cc50b5d" className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom navigation */}
      <nav data-ev-id="ev_1654e16349" className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden">
        <div data-ev-id="ev_f289ed2217" className="flex justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) =>
          <Link data-ev-id="ev_6f7dac975b"
          key={path}
          to={path}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
          location.pathname === path ?
          'text-primary' :
          'text-muted-foreground hover:text-foreground'}`
          }>

              <Icon className="w-5 h-5" />
              <span data-ev-id="ev_c41b0d432a" className="text-xs">{label}</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav data-ev-id="ev_ca298844ea" className="hidden md:flex fixed right-4 top-20 flex-col gap-2 bg-card p-3 rounded-xl border border-border shadow-sm">
        {navItems.map(({ path, icon: Icon, label }) =>
        <Link data-ev-id="ev_35b4c13b93"
        key={path}
        to={path}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
        location.pathname === path ?
        'bg-primary text-primary-foreground' :
        'text-muted-foreground hover:bg-muted hover:text-foreground'}`
        }>

            <Icon className="w-5 h-5" />
            <span data-ev-id="ev_176eae31a1">{label}</span>
          </Link>
        )}
      </nav>
    </div>);

}