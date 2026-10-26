import { createAdminClient } from '../src/lib/supabase/admin';

async function main() {
  const supabase = createAdminClient() as any;
  
  // Check publications
  const { data, error } = await supabase.rpc('execute_sql_query', {
    sql: "SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
  });

  console.log('Publication tables RPC:', { data, error });

  // Direct query check on notifications and tasks
  const { data: notifs, error: notifErr } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent notifications:', { notifs, notifErr });
}

main().catch(console.error);
