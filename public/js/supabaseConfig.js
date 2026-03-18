// public/js/supabaseConfig.js

const CONFIG = {
    SUPABASE_URL: "https://daervzofihzytmvynkpi.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZXJ2em9maWh6eXRtdnlua3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTIyMDYsImV4cCI6MjA4OTI2ODIwNn0.raA68qFf0Pnj2kzNXCOfKEAdNKwSkW166QDrgpzhts4"
};

// Verifica se a biblioteca do Supabase foi carregada pelo HTML
if (typeof window.supabase !== 'undefined') {
    const _supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

    window.supabaseClient = _supabase;
    window._supabase = _supabase;

    console.log("Cliente Supabase (Frontend) iniciado.");
    console.log("Configuracao: Supabase carregado e anexado ao window.");
} else {
    console.error("Erro: A biblioteca do Supabase (CDN) nao foi encontrada.");
    console.error("Verifique se o script do Supabase foi carregado antes deste arquivo.");
}
