import { createContext, useMemo, useState } from 'react';

export const AuthContext = createContext({
  user: null,
  token: null,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const value = useMemo(
    () => ({
      user,
      token,
      signIn: ({ user: u, token: t }) => {
        setUser(u);
        setToken(t);
      },
      signOut: () => {
        setUser(null);
        setToken(null);
      },
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
