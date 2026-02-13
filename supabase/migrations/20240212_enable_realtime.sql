begin;
  -- Enable Realtime for specific tables
  alter publication supabase_realtime add table events;
  alter publication supabase_realtime add table ticket_types;
commit;