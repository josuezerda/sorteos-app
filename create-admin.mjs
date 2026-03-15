import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  console.log('Creating admin user...');
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@sorteosapp.com.ar',
    password: '030345@Sorteo@',
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already been registered')) {
        console.log('User already exists.');
    } else {
        console.error('Error creating user:', error);
    }
  } else {
    console.log('Admin user created successfully:', data.user.id);
  }
}

createAdminUser();
