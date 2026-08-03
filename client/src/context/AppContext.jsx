import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isOnDuty, setIsOnDuty] = useState(false);
  return (
    <AppContext.Provider value={{ isOnDuty, setIsOnDuty }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
