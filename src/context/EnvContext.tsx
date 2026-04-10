'use client';
import {
  createContext,
  useContext,
  FunctionComponent,
  PropsWithChildren,
} from 'react';

type AuthContextType = {
  BACKEND_URL: string;
  FRONTEND_URL?: string;
  STRIPE_PUBLISHABLE_KEY: string;
  PAYPAL_CLIENT_ID: string;
};

const EnvContext = createContext<AuthContextType | undefined>(undefined);

export const EnvProvider: FunctionComponent<
  PropsWithChildren<AuthContextType>
> = ({ BACKEND_URL, STRIPE_PUBLISHABLE_KEY, PAYPAL_CLIENT_ID, children }) => {
  return (
    <EnvContext.Provider
      value={{ BACKEND_URL, STRIPE_PUBLISHABLE_KEY, PAYPAL_CLIENT_ID }}
    >
      {children}
    </EnvContext.Provider>
  );
};

export const useEnv = () => {
  const context = useContext(EnvContext);
  if (!context) throw new Error('useEnv must be used within an EnvProvider');
  return context;
};
