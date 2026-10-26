import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testRealtimeBroadcast() {
  console.log('Connecting to Supabase Realtime:', supabaseUrl);
  const client = createClient(supabaseUrl, anonKey);

  let received = false;

  const channel = client
    .channel('test-realtime-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        console.log('>>> REALTIME EVENT RECEIVED!', payload);
        received = true;
      }
    )
    .subscribe((status, err) => {
      console.log('Subscription status:', status, err || '');
    });

  // Wait 3 seconds for subscription to be SUBSCRIBED
  await new Promise((r) => setTimeout(r, 3000));

  console.log('Inserting test notification row via admin client...');
  const { createAdminClient } = await import('../src/lib/supabase/admin');
  const adminClient = createAdminClient() as any;

  const { data, error } = await adminClient.from('notifications').insert({
    user_id: 'c0000000-0000-0000-0000-000000000099',
    tipe: 'test_realtime',
    judul: 'Test Broadcast Realtime',
    pesan: 'Uji konektivitas realtime',
    is_read: false,
  }).select();

  console.log('Insert result:', { data, error });

  // Wait 5 seconds to see if received
  await new Promise((r) => setTimeout(r, 5000));

  if (received) {
    console.log('SUCCESS: Realtime is working properly!');
  } else {
    console.log('FAILURE: Realtime did NOT receive the insert event!');
  }

  // Cleanup
  if (data && data[0]) {
    await client.from('notifications').delete().eq('id', data[0].id);
  }
  process.exit(received ? 0 : 1);
}

testRealtimeBroadcast().catch(console.error);
