import { type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { HouseholdProvider } from '@/contexts/HouseholdContext';

/**
 * ⚠️ App-wide providers. Add new providers here — they'll be available in all routes.
 * Providers MUST wrap <BrowserRouter> to be accessible everywhere.
 */
export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<AuthProvider>
			<HouseholdProvider>
				{children}
			</HouseholdProvider>
		</AuthProvider>
	);
}
