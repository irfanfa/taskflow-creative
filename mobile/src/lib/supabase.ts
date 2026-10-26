import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ainvhrztvrftlybefwih.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbnZocnp0dnJmdGx5YmVmd2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3OTE4NDQsImV4cCI6MjEwODM2Nzg0NH0.EL71Dy8MytNhDj3FKrAdS51Cp9LrrpA0JGHL-63ineg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
