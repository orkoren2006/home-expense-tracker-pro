import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Wallet } from 'lucide-react';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = isLogin ?
    await signIn(email, password) :
    await signUp(email, password, displayName);

    if (result.error) {
      setError(result.error.message);
    }
    setLoading(false);
  };

  return (
    <div data-ev-id="ev_04f780a357" className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <div data-ev-id="ev_3e3669a295" className="flex flex-col items-center gap-4 mb-8">
          <div data-ev-id="ev_526a84477e" className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 data-ev-id="ev_8293287345" className="text-2xl font-bold text-foreground">ניהול תקציב</h1>
          <p data-ev-id="ev_3e85dec4de" className="text-muted-foreground text-center">
            {isLogin ? 'התחבר לחשבון שלך' : 'צור חשבון חדש'}
          </p>
        </div>

        <form data-ev-id="ev_06c53ba0d0" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin &&
          <Input
            label="שם מלא"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="איך קוראים לך?"
            required />

          }

          <Input
            label="אימייל"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required />


          <Input
            label="סיסמא"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required />


          {error &&
          <p data-ev-id="ev_75882b6147" className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </p>
          }

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? 'אנא המתן...' : isLogin ? 'התחברות' : 'הרשמה'}
          </Button>
        </form>

        <div data-ev-id="ev_ca223f6aaf" className="mt-6 text-center">
          <button data-ev-id="ev_be6f1c24d8"
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-primary hover:underline">

            {isLogin ? 'אין לך חשבון? הירשם עכשיו' : 'כבר יש לך חשבון? התחבר'}
          </button>
        </div>
      </Card>
    </div>);

}