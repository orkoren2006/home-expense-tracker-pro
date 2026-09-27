import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Home, Upload, Settings, List, FileText, Wallet, TrendingDown, StickyNote, Calculator, Menu, X } from 'lucide-react';
import { useHousehold } from '@/hooks/useHousehold';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { household } = useHousehold();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
  { path: '/', icon: Home, label: 'בית' },
  { path: '/cash-flow', icon: TrendingDown, label: 'תזרים' },
  { path: '/expenses', icon: List, label: 'הוצאות' },
  { path: '/incomes', icon: Wallet, label: 'הכנסות' },
  { path: '/analytics', icon: Calculator, label: 'חישובים' },
  { path: '/rules', icon: FileText, label: 'כללי הוצאות' },
  { path: '/income-rules', icon: FileText, label: 'כללי הכנסות' },
  { path: '/notes', icon: StickyNote, label: 'הערות' },
  { path: '/settings', icon: Settings, label: 'הגדרות' }];


  return (
    <div data-ev-id="ev_e7212edf2c" className="min-h-screen bg-background" dir="rtl">
      {/* Top bar with hamburger menu on mobile */}
      {household &&
      <div data-ev-id="ev_aa487c4dcb" className="backdrop-blur-sm border-b bg-card/80 px-4 py-2 border-border flex items-center justify-between">
          <span data-ev-id="ev_da6a2f87e5" className="text-primary font-bold text-base">ניהול תקציב - משפחת קורן</span>
          <button data-ev-id="ev_8915e55f51"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label="תפריט">

            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      }

      {/* Mobile menu overlay */}
      {mobileMenuOpen &&
      <div data-ev-id="ev_61fd6f89b3"
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={() => setMobileMenuOpen(false)} />

      }

      {/* Mobile slide-in menu */}
      <nav data-ev-id="ev_434d7de4a7"
      className={`fixed top-0 right-0 h-full w-64 bg-card border-l border-border shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
      mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`
      }>

        <div data-ev-id="ev_1c2013d4c8" className="p-4 border-b border-border flex items-center justify-between">
          <span data-ev-id="ev_6779101d90" className="font-bold text-foreground">תפריט</span>
          <button data-ev-id="ev_fa987ab66c"
          onClick={() => setMobileMenuOpen(false)}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">

            <X className="w-5 h-5" />
          </button>
        </div>
        <div data-ev-id="ev_e5fb08c9b9" className="p-2 flex flex-col gap-1">
          {navItems.map(({ path, icon: Icon, label }) =>
          <Link data-ev-id="ev_b161a08365"
          key={path}
          to={path}
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          location.pathname === path ?
          'bg-primary text-primary-foreground' :
          'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }>

              <Icon className="w-5 h-5" />
              <span data-ev-id="ev_3c6705827c">{label}</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main data-ev-id="ev_b3a6af0b40" className="max-w-7xl mx-auto px-4 py-4">{children}</main>

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