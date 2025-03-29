import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'sb-session',
    flowType: 'pkce'
  }
});

// Storage bucket for invoice attachments
export const INVOICE_BUCKET = 'invoices';

// Initialize storage bucket
export const initStorage = async () => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    if (!session) {
      console.log('No active session, skipping storage initialization');
      return;
    }

    // Set session in Supabase client
    await supabase.auth.setSession(session);

    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }

    const bucketExists = buckets?.some(b => b.id === INVOICE_BUCKET);
    if (!bucketExists) {
      console.log('Storage bucket not found, skipping creation as it should be created via migrations');
    }
  } catch (error) {
    console.error('Error checking storage:', error);
    // Don't throw error to prevent app from crashing
  }
};

// Initialize storage on app start, but don't block rendering
initStorage().catch(console.error);