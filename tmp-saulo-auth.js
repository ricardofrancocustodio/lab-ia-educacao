const { createClient } = require('@supabase/supabase-js');
const url = 'https://daervzofihzytmvynkpi.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZXJ2em9maWh6eXRtdnlua3BpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY5MjIwNiwiZXhwIjoyMDg5MjY4MjA2fQ.-f0Sr3rzZV4za51mE5Gr-Pq5wuMki964Rqh4UypGvJ8';
const supabase = createClient(url, key);
(async () => {
  try {
    const response = await supabase.auth.admin.listUsers();
    console.log('users count', response?.data?.users?.length);
    const found = response?.data?.users?.filter(u => u.email?.toLowerCase().includes('saulo'));
    console.log('saulo users', found);
  } catch (err) {
    console.error('err', err);
  }
})();
