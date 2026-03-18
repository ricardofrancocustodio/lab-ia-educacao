// app.js
let _supabase = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabaseClient) {
    console.error('Supabase não inicializado');
    return;
  }

  _supabase = window.supabaseClient;

  const session = await initSession();
  if (!session) return;

  applyPermissions();
  
  if (typeof initPage === 'function') {
  initPage();
}
});
