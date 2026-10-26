import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testBroadcast() {
  console.log('Testing Supabase Realtime Broadcast...');
  const listener = createClient(supabaseUrl, anonKey);
  const sender = createClient(supabaseUrl, serviceRoleKey);

  let received = false;

  const channel = listener
    .channel('task-broadcast-test')
    .on('broadcast', { event: 'test_event' }, (payload) => {
      console.log('>>> BROADCAST RECEIVED SUCCESSFULLY!', payload);
      received = true;
    })
    .subscribe(async (status) => {
      console.log('Listener status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Sending broadcast from sender...');
        const sendChannel = sender.channel('task-broadcast-test');
        sendChannel.subscribe(async (sendStat) => {
          if (sendStat === 'SUBSCRIBED') {
            await sendChannel.send({
              type: 'broadcast',
              event: 'test_event',
              payload: { message: 'Hello from Taskflow Creative Realtime!' },
            });
            console.log('Broadcast message sent!');
          }
        });
      }
    });

  // Wait 6 seconds
  await new Promise((r) => setTimeout(r, 6000));

  if (received) {
    console.log('TEST PASSED: Broadcast works 100%!');
  } else {
    console.log('TEST FAILED: Broadcast did not arrive.');
  }

  process.exit(received ? 0 : 1);
}

testBroadcast().catch(console.error);
