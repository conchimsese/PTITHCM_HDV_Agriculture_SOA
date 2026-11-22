import React, { createContext, useContext, useState, useEffect } from 'react';

// Pre-generated standard dev token signed with the system RS256 key for Farmer
export const DEFAULT_FARMER_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJyb2xlIjoiRkFSTUVSIiwiaWF0IjoxNzk0NTg2MzMxLCJleHAiOjE3OTUxOTExMzEsImF1ZCI6InNvYS1hcGkiLCJpc3MiOiJ1cm46c29hOnVzZXItc2VydmljZSJ9.p7I5Xj8HbPO8-6n0vtP49Sg-izUb5TMNVzLxIVPZc3chb1KxEQN-Ll3wytH1mhKRvkMFwYeTr06ljvtoE6RMeh1lvZ0ZSFZtQc88ikEAUn0W_gb0kBV6Pacm1NAu8DSByyPkZQ2heemmPJYwcYH-42ml1iRTfKIBWQGqln6jrJj_oQFDmb5AVTVCViODOo74XNJjAQFHNsHzXRm7KByoBmvMJRhqBuNHvj31dR1zrlMsz_mchKLk_PqGG9pdrEQxq-9csWadh44NotVRNph0BXTGmURNkJu2BnWk38IjRxbpyETa9wusZcHcFBxX3VBcYpiEF7brIRgmdT8MmTbvIw';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('farming_token') || DEFAULT_FARMER_TOKEN;
  });

  const [user, setUser] = useState({
    accountId: '11111111-1111-1111-1111-111111111111',
    role: 'FARMER',
    name: 'Nguyễn Văn An (Nông dân)'
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('farming_token', token);
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setUser({
            accountId: payload.sub,
            role: payload.role,
            name: 'Nguyễn Văn An (Nông dân)'
          });
        }
      } catch {
        // keep fallback user
      }
    } else {
      localStorage.removeItem('farming_token');
    }
  }, [token]);

  const updateToken = (newToken) => {
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{ token, user, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
