import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return profile;
  } catch (err) {
    console.error('Error fetching current profile:', err);
    return null;
  }
}
