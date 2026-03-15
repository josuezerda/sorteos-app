import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for public operations (RLS enforced)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Client for Admin operations (bypasses RLS). ONLY USE IN SERVER ACTIONS/APIS!
export const getServiceRoleClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  return createClient(supabaseUrl, serviceRoleKey);
};
