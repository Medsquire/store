import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchDutyStatus, updateDutyStatus } from '../api/duty';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isOnDuty, setIsOnDutyState] = useState(false);
  const [dutyLoading, setDutyLoading] = useState(true);
  const [dutySaving, setDutySaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await fetchDutyStatus();
        if (mounted) {
          setIsOnDutyState(data.active === 1 || data.isOnDuty === true);
        }
      } catch {
        if (mounted) {
          setIsOnDutyState(false);
        }
      } finally {
        if (mounted) {
          setDutyLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setIsOnDuty = useCallback(async (nextValue) => {
    const shouldEnable = Boolean(nextValue);

    if (!shouldEnable) {
      const confirmed = window.confirm('Are you sure to log off?');
      if (!confirmed) {
        return false;
      }
    }

    setDutySaving(true);
    try {
      const data = await updateDutyStatus(shouldEnable ? 1 : 0);
      setIsOnDutyState(data.active === 1 || data.isOnDuty === true);
      return true;
    } catch {
      return false;
    } finally {
      setDutySaving(false);
    }
  }, []);

  return (
    <AppContext.Provider value={{ isOnDuty, setIsOnDuty, dutyLoading, dutySaving }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
