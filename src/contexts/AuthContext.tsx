import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check local storage for existing user session
    const storedUser = localStorage.getItem('sei-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('sei-user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Only accept specific credentials
    const validEmail = 'fenix.gadsesau@gmail.com';
    const validPassword = '123456';
    
    if (email === validEmail && password === validPassword) {
      const newUser = {
        id: '1',
        name: 'Fenix GAD SESAU',
        email: email
      };
      
      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('sei-user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('sei-user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
