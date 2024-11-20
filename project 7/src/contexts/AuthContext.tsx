import { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, AuthProviderProps } from '@/lib/types';
import { users, updateUsers, generateVerificationToken, verifyEmailToken } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved user and users on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Reset database if there are any issues
        await storage.resetDatabase();

        const [savedUser, savedUsers] = await Promise.all([
          storage.loadCurrentUser(),
          storage.loadUsers(users)
        ]);
        
        setUser(savedUser);
        await updateUsers(savedUsers);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Add storage event listener to sync across tabs/windows
  useEffect(() => {
    const handleStorageChange = async (event: StorageEvent) => {
      if (event.key === 'cardquant_current_user') {
        const newUser = event.newValue ? JSON.parse(event.newValue) : null;
        setUser(newUser);
      } else if (event.key === 'cardquant_users') {
        const newUsers = event.newValue ? JSON.parse(event.newValue) : [];
        await updateUsers(newUsers);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string) => {
    const savedUsers = await storage.loadUsers(users);
    const user = savedUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in');
    }

    setUser(user);
    await storage.saveCurrentUser(user);
  };

  const logout = async () => {
    setUser(null);
    await storage.saveCurrentUser(null);
  };

  const sendVerificationEmail = async (email: string) => {
    const token = generateVerificationToken(email);
    
    // In a real app, you would send an email here
    // For demo purposes, we'll just log it
    console.log(`Verification link: /verify-email?token=${token}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const verifyEmail = async (token: string) => {
    const email = verifyEmailToken(token);
    if (!email) {
      throw new Error('Invalid or expired verification token');
    }

    const savedUsers = await storage.loadUsers(users);
    const updatedUsers = savedUsers.map(user =>
      user.email === email ? { ...user, emailVerified: true } : user
    );
    
    await storage.saveUsers(updatedUsers);
    await updateUsers(updatedUsers);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      sendVerificationEmail,
      verifyEmail
    }}>
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