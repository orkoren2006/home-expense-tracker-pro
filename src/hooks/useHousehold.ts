import { useContext } from 'react';
import { HouseholdContext, type HouseholdContextType } from '@/contexts/householdContext';

export function useHousehold(): HouseholdContextType {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
