
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking notifications table ---');
  const { data, error } = await supabase.from('notifications').select('*').limit(5);
  if (error) {
    console.error('Error selecting:', error);
  } else {
    console.log('Notifications sample:', data);
  }

  console.log('--- Checking enum types (if possible) ---');
  // Usually this requires SQL but let's try to see a row's type
  if (data && data.length > 0) {
    console.log('First notification type:', data[0].type);
  } else {
    console.log('No notifications found to check type.');
  }

  // Try to insert a dummy one
  console.log('--- Attempting to insert dummy notification ---');
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  if (profiles && profiles.length > 0) {
    const { data: insData, error: insError } = await supabase.from('notifications').insert({
      user_id: profiles[0].id,
      type: 'system',
      title: 'DUMMY TEST',
      content: 'Testing from script',
      is_read: false
    });
    if (insError) {
      console.error('Insert error (type = system):', insError);
    } else {
      console.log('Insert success (type = system)!');
    }

    // Try new type
    const { data: insData2, error: insError2 } = await supabase.from('notifications').insert({
      user_id: profiles[0].id,
      type: 'offer_assigned',
      title: 'DUMMY ASSIGNED TEST',
      content: 'Testing from script',
      is_read: false
    });
    if (insError2) {
      console.error('Insert error (type = offer_assigned):', insError2);
    } else {
      console.log('Insert success (type = offer_assigned)!');
    }
  } else {
    console.log('No profiles found to use as user_id');
  }
}

check();
