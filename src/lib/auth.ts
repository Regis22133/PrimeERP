import { create } from 'zustand';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (data: {
    companyName?: string;
    cnpj?: string;
    cep?: string;
    address?: string;
    city?: string;
    state?: string;
    neighborhood?: string;
  }) => Promise<void>;
  getProfile: () => Promise<{
    companyName?: string;
    cnpj?: string;
    cep?: string;
    address?: string;
    city?: string;
    state?: string;
    neighborhood?: string;
  } | null>;
}

// Store last password reset request time
let lastPasswordResetRequest = 0;
const RESET_REQUEST_DELAY = 60000; // 60 seconds in milliseconds to be safe

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      set({ user: data.user });

      if (data.session) {
        localStorage.setItem('sb-session', JSON.stringify(data.session));
        await supabase.auth.setSession(data.session);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  signUp: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'http://localhost:5173/update-password',
          data: {
            email_verified: true
          }
        }
      });
      
      if (error) throw error;
      if (data.user) {
        set({ user: data.user });
        if (data.session) {
          localStorage.setItem('sb-session', JSON.stringify(data.session));
          await supabase.auth.setSession(data.session);
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      localStorage.removeItem('sb-session');
      localStorage.removeItem('supabase.auth.token');
      set({ user: null });
      
      window.location.reload();
    } catch (error) {
      console.error('Signout error:', error);
      throw error;
    }
  },
  checkAuth: async () => {
    try {
      const storedSession = localStorage.getItem('sb-session');
      if (storedSession) {
        try {
          const { data: { session }, error } = await supabase.auth.setSession(JSON.parse(storedSession));
          if (!error && session) {
            set({ user: session.user });
          } else {
            localStorage.removeItem('sb-session');
            localStorage.removeItem('supabase.auth.token');
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Session recovery failed:', error);
          localStorage.removeItem('sb-session');
          localStorage.removeItem('supabase.auth.token');
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      set({ 
        user: session?.user || null,
        loading: false 
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user || null });
        if (session) {
          localStorage.setItem('sb-session', JSON.stringify(session));
        } else {
          localStorage.removeItem('sb-session');
          localStorage.removeItem('supabase.auth.token');
        }
      });
    } catch (error) {
      console.error('Auth check error:', error);
      set({ user: null, loading: false });
    }
  },
  requestPasswordReset: async (email: string) => {
    try {
      // Check if enough time has passed since last request
      const now = Date.now();
      if (now - lastPasswordResetRequest < RESET_REQUEST_DELAY) {
        const remainingTime = Math.ceil((RESET_REQUEST_DELAY - (now - lastPasswordResetRequest)) / 1000);
        throw new Error(`Por favor, aguarde ${remainingTime} segundos antes de tentar novamente.`);
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://primegestao01.com/update-password'
      });
      
      if (error) throw error;

      // Update last request time
      lastPasswordResetRequest = now;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  },
  resetPassword: async (token: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password reset error:', error);
      throw new Error('Could not change password. Please try again.');
    }
  },
  updatePassword: async (_currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  },
  updateProfile: async (data) => {
    try {
      const { user } = get();
      if (!user) throw new Error('User not found');

      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email,
            company_name: data.companyName,
            cnpj: data.cnpj,
            cep: data.cep,
            address: data.address,
            city: data.city,
            state: data.state,
            neighborhood: data.neighborhood
          }]);

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            company_name: data.companyName,
            cnpj: data.cnpj,
            cep: data.cep,
            address: data.address,
            city: data.city,
            state: data.state,
            neighborhood: data.neighborhood,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  },
  getProfile: async () => {
    try {
      const { user } = get();
      if (!user) return null;

      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('company_name, cnpj, cep, address, city, state, neighborhood')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingProfile) {
        return {
          companyName: '',
          cnpj: '',
          cep: '',
          address: '',
          city: '',
          state: '',
          neighborhood: ''
        };
      }

      return {
        companyName: existingProfile.company_name || '',
        cnpj: existingProfile.cnpj || '',
        cep: existingProfile.cep || '',
        address: existingProfile.address || '',
        city: existingProfile.city || '',
        state: existingProfile.state || '',
        neighborhood: existingProfile.neighborhood || ''
      };
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }
}));