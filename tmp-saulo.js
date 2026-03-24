const { createClient } = require('@supabase/supabase-js');
const url = 'https://daervzofihzytmvynkpi.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZXJ2em9maWh6eXRtdnlua3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTIyMDYsImV4cCI6MjA4OTI2ODIwNn0.raA68qFf0Pnj2kzNXCOfKEAdNKwSkW166QDrgpzhts4';
const supabase = createClient(url, key);

(async () => {
  const search = 'saulo';
  const out = {};

  out.platform_name = await supabase.from('platform_members').select('*').ilike('name', `%${search}%`);
  out.platform_email = await supabase.from('platform_members').select('*').ilike('email', `%${search}%`);

  out.school_name = await supabase.from('school_members').select('*').ilike('name', `%${search}%`);
  out.school_email = await supabase.from('school_members').select('*').ilike('email', `%${search}%`);

  console.log(JSON.stringify(out, null, 2));
})();
