import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface AuthState {
  preMfaToken: string | null;
  accessToken: string | null;
}

interface AuthCtx extends AuthState {
  savePreMfaToken: (t: string) => void;
  saveAccessToken: (t: string) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function load(): AuthState {
  return {
    preMfaToken: sessionStorage.getItem('preMfaToken'),
    accessToken: sessionStorage.getItem('accessToken'),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(load);

  const savePreMfaToken = useCallback((t: string) => {
    sessionStorage.setItem('preMfaToken', t);
    setState(s => ({ ...s, preMfaToken: t }));
  }, []);

  const saveAccessToken = useCallback((t: string) => {
    sessionStorage.setItem('accessToken', t);
    sessionStorage.removeItem('preMfaToken');
    setState({ preMfaToken: null, accessToken: t });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setState({ preMfaToken: null, accessToken: null });
  }, []);

  return <Ctx.Provider value={{ ...state, savePreMfaToken, saveAccessToken, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

/** Decode JWT payload without verifying signature (display only). */
export function decodeEmail(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { email?: string };
    return payload.email ?? '';
  } catch {
    return '';
  }
}
