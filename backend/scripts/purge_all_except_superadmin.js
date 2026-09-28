import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const SUPER_ADMIN_EMAIL = 'krithickrajs.cs25@bitsathy.ac.in';

async function purgeDatabase() {
  console.log('=== STARTING DATABASE PURGE (RETAINING ONLY SUPER ADMIN) ===');
  console.log(`Target Super Admin: ${SUPER_ADMIN_EMAIL}`);

  // 1. Delete all test submissions
  try {
    const { error } = await supabase.from('test_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared test_submissions table:', error ? error.message : 'OK');
  } catch (e) {
    console.warn('test_submissions note:', e.message);
  }

  // 2. Delete all tests
  try {
    const { error } = await supabase.from('tests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared tests table:', error ? error.message : 'OK');
  } catch (e) {
    console.warn('tests note:', e.message);
  }

  // 3. Delete all staff requests
  try {
    const { error } = await supabase.from('staff_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared staff_requests table:', error ? error.message : 'OK');
  } catch (e) {
    console.warn('staff_requests note:', e.message);
  }

  // 4. List all Auth Users
  const { data: { users: authUsers }, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listErr) {
    console.error('Failed to list auth users:', listErr);
  } else {
    console.log(`Found ${authUsers.length} total auth users.`);
    for (const u of authUsers) {
      const email = (u.email || '').toLowerCase().trim();
      if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
        console.log(`--> PRESERVING Super Admin Auth user: ${email} (${u.id})`);
        continue;
      }

      console.log(`Deleting auth user: ${email} (${u.id})`);
      // Delete child records first
      try {
        await supabase.from('students').delete().eq('id', u.id);
        await supabase.from('staff').delete().eq('id', u.id);
        await supabase.from('users').delete().eq('id', u.id);
      } catch (err) {
        console.warn(`Error deleting child records for ${email}:`, err.message);
      }

      // Delete from auth.users
      try {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) console.warn(`Auth delete warning for ${email}:`, delErr.message);
        else console.log(`Deleted auth user ${email} successfully.`);
      } catch (err) {
        console.warn(`Auth delete exception for ${email}:`, err.message);
      }
    }
  }

  // 5. Clean up any remaining records in public.users, public.students, public.staff
  try {
    const { data: dbUsers } = await supabase.from('users').select('id, mailid');
    if (Array.isArray(dbUsers)) {
      for (const u of dbUsers) {
        const email = (u.mailid || '').toLowerCase().trim();
        if (email !== SUPER_ADMIN_EMAIL.toLowerCase()) {
          console.log(`Deleting orphaned public.users row: ${email} (${u.id})`);
          await supabase.from('students').delete().eq('id', u.id);
          await supabase.from('staff').delete().eq('id', u.id);
          await supabase.from('users').delete().eq('id', u.id);
        }
      }
    }
  } catch (e) {
    console.warn('Public users cleanup note:', e.message);
  }

  // 6. Ensure Super Admin is properly registered in public.users with UserType = 'admin'
  try {
    const superAdminAuth = authUsers?.find(u => (u.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    const adminId = superAdminAuth?.id || 'd2b30b29-9225-4730-86bc-5f797ea71454';

    const { error: upsertErr } = await supabase.from('users').upsert({
      id: adminId,
      name: 'Krithick Raj S',
      mailid: SUPER_ADMIN_EMAIL,
      UserType: 'admin'
    });

    if (upsertErr) {
      console.warn('Super Admin upsert note:', upsertErr.message);
    } else {
      console.log(`--> Super Admin (${SUPER_ADMIN_EMAIL}) verified and secured as 'admin' in public.users!`);
    }
  } catch (e) {
    console.warn('Super Admin setup exception:', e.message);
  }

  // 7. Reset all backend/data files
  const dataDir = path.join(__dirname, '..', 'data');
  if (fs.existsSync(dataDir)) {
    fs.writeFileSync(path.join(dataDir, 'tests_data.json'), '[]\n', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'submissions.json'), '[]\n', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'staff_requests.json'), '[]\n', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'test_assignments.json'), '{}\n', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'staff_student_mapping.json'), '{}\n', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'staff_profiles.json'), '{}\n', 'utf8');
    console.log('Reset all backend/data JSON persistence files to fresh empty state.');
  }

  console.log('=== PURGE COMPLETE! FRESH DATABASE READY WITH ONLY SUPER ADMIN ===');
}

purgeDatabase().then(() => process.exit(0)).catch(err => {
  console.error('Fatal purge error:', err);
  process.exit(1);
});
