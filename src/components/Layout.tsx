import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Home, Upload, Settings, List, FileText, Wallet } from 'lucide-react';
import { useHousehold } from '@/hooks/useHousehold';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { household } = useHousehold();
  const location = useLocation();

  const navItems = [
  { path: '/', icon: Home, label: 'בית' },
  { path: '/expenses', icon: List, label: 'הוצאות' },
  { path: '/incomes', icon: Wallet, label: 'הכנסות' },
  { path: '/rules', icon: FileText, label: 'כללי הוצאות' },
  { path: '/income-rules', icon: FileText, label: 'כללי הכנסות' },
  { path: '/import', icon: Upload, label: 'ייבוא הוצאות' },
  { path: '/import-incomes', icon: Upload, label: 'ייבוא הכנסות' },
  { path: '/settings', icon: Settings, label: 'הגדרות' }];


  return (
    <div data-ev-id="ev_e7212edf2c" className="min-h-screen bg-background" dir="rtl">
      {/* Compact top bar - just household name */}
      {household &&
      <div data-ev-id="ev_aa487c4dcb" className="bg-card/80 backdrop-blur-sm border-b border-border py-2 px-4 text-center">
          <span data-ev-id="ev_da6a2f87e5" className="text-sm font-medium text-primary">{household.name}</span>
        </div>
      }

      {/* Main content */}
      <main data-ev-id="ev_b3a6af0b40" className="max-w-7xl mx-auto px-4 py-4">{children}</main>

      {/* Bottom navigation - mobile */}
      <nav data-ev-id="ev_814ff2bdde" className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50">
        <div data-ev-id="ev_3a9ec4de1c" className="flex justify-around py-2">
          {navItems.slice(0, 5).map(({ path, icon: Icon, label }) =>
          <Link data-ev-id="ev_bd07b2118e"
          key={path}
          to={path}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
          location.pathname === path ?
          'text-primary' :
          'text-muted-foreground hover:text-foreground'}`
          }>

              <Icon className="w-5 h-5" />
              <span data-ev-id="ev_628eb4fe9f" className="text-xs">{label}</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav data-ev-id="ev_bd3be7dd0b" className="hidden md:flex fixed right-4 top-4 flex-col gap-2 bg-card p-3 rounded-xl border border-border shadow-sm">
        {navItems.map(({ path, icon: Icon, label }) =>
        <Link data-ev-id="ev_cac7fea111"
        key={path}
        to={path}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
        location.pathname === path ?
        'bg-primary text-primary-foreground' :
        'text-muted-foreground hover:bg-muted hover:text-foreground'}`
        }>

            <Icon className="w-5 h-5" />
            <span data-ev-id="ev_c327f526d2">{label}</span>
          </Link>
        )}
      </nav>
    </div>);

}