import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useHousehold } from '@/hooks/useHousehold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Home, Users, ArrowLeft } from 'lucide-react';

export default function HouseholdSetup() {
  const navigate = useNavigate();
  const { household, createHousehold, joinHousehold } = useHousehold();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');

  // Redirect to home when household is set
  useEffect(() => {
    if (household) {
      navigate('/', { replace: true });
    }
  }, [household, navigate]);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await createHousehold(name);
    if (result.error) {
      setError(result.error.message);
    }
    setLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await joinHousehold(inviteCode);
    if (result.error) {
      setError(result.error.message);
    }
    setLoading(false);
  };

  return (
    <div data-ev-id="ev_5775daa4f3" className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        {mode === 'choose' &&
        <>
            <div data-ev-id="ev_0f538c34bc" className="text-center mb-8">
              <h1 data-ev-id="ev_e32b4a86f7" className="text-2xl font-bold text-foreground mb-2">ברוכים הבאים!</h1>
              <p data-ev-id="ev_569773707a" className="text-muted-foreground">
                בוא נגדיר את הבית שלך
              </p>
            </div>

            <div data-ev-id="ev_cda1b38057" className="flex flex-col gap-4">
              <button data-ev-id="ev_779c9dde14"
            onClick={() => setMode('create')}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-right">

                <div data-ev-id="ev_592c3e3524" className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <div data-ev-id="ev_47181fe2a7">
                  <h3 data-ev-id="ev_f8f0d76613" className="font-semibold text-foreground">צור בית חדש</h3>
                  <p data-ev-id="ev_dd7c645829" className="text-sm text-muted-foreground">
                    התחל לנהל תקציב והזמן בני משפחה
                  </p>
                </div>
              </button>

              <button data-ev-id="ev_ca78cf3f96"
            onClick={() => setMode('join')}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-right">

                <div data-ev-id="ev_926cb7863b" className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div data-ev-id="ev_672707f20b">
                  <h3 data-ev-id="ev_7ee4bd4d12" className="font-semibold text-foreground">הצטרף לבית קיים</h3>
                  <p data-ev-id="ev_4f5ffef677" className="text-sm text-muted-foreground">
                    יש לך קוד הזמנה מבן משפחה אחר?
                  </p>
                </div>
              </button>
            </div>
          </>
        }

        {mode === 'create' &&
        <>
            <button data-ev-id="ev_bd9cb40634"
          onClick={() => setMode('choose')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">

              <ArrowLeft className="w-4 h-4" />
              <span data-ev-id="ev_43920176e3">חזרה</span>
            </button>

            <h2 data-ev-id="ev_7e95fd9691" className="text-xl font-bold text-foreground mb-6">צור בית חדש</h2>

            <form data-ev-id="ev_b15fcfd8ef" onSubmit={handleCreate} className="flex flex-col gap-4">
              <Input
              label="שם הבית"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: משפחת כהן"
              required />


              {error &&
            <p data-ev-id="ev_16a39164c4" className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
            }

              <Button type="submit" disabled={loading}>
                {loading ? 'יוצר...' : 'צור בית'}
              </Button>
            </form>
          </>
        }

        {mode === 'join' &&
        <>
            <button data-ev-id="ev_35bba1032e"
          onClick={() => setMode('choose')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">

              <ArrowLeft className="w-4 h-4" />
              <span data-ev-id="ev_0504c419ff">חזרה</span>
            </button>

            <h2 data-ev-id="ev_900122f770" className="text-xl font-bold text-foreground mb-6">הצטרף לבית קיים</h2>

            <form data-ev-id="ev_a58e55f72b" onSubmit={handleJoin} className="flex flex-col gap-4">
              <Input
              label="קוד הזמנה"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="הכנס את הקוד שקיבלת"
              required />


              {error &&
            <p data-ev-id="ev_a88e25f940" className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>
            }

              <Button type="submit" disabled={loading}>
                {loading ? 'מצטרף...' : 'הצטרף'}
              </Button>
            </form>
          </>
        }
      </Card>
    </div>);

}