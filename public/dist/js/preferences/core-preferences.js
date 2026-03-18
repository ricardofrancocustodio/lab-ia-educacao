// js/preferences/core.js

// =========================================================
// VARIÁVEIS GLOBAIS
// =========================================================
_supabase = null;
let _schoolId = null;
let _userId = null;

document.addEventListener('DOMContentLoaded', () => {
    let tentativas = 0;

    // Aguarda configuração do Supabase e Sessão
    const wait = setInterval(async () => {
        const supabasePronto = window.supabaseClient;
        const temSchoolId = sessionStorage.getItem('SCHOOL_ID');

        if (supabasePronto && temSchoolId) {
            clearInterval(wait);

            _supabase = window.supabaseClient;
            _schoolId = temSchoolId;

            // Tenta obter User ID da sessão ou do Supabase
            _userId = sessionStorage.getItem('USER_ID');
            if (!_userId) {
                const { data } = await _supabase.auth.getUser();
                _userId = data?.user?.id;
            }

            console.log("✅ Core de Preferências carregado.");
            inicializarPagina();

        } else {
            tentativas++;
            // Timeout após 10 segundos
            if (tentativas > 50) {
                clearInterval(wait);
                console.error("❌ Erro: SCHOOL_ID ou Supabase não iniciaram.");
                if(typeof uiMostrarErro === 'function') uiMostrarErro("Não foi possível identificar a escola.");
            }
        }
    }, 200);
});

async function inicializarPagina() {
    // 1. Ativa o loader na UI
    uiAlternarLoader(true);

    try {
        // 2. Busca dados em paralelo (Segmentos disponíveis e Preferências salvas)
        const [todosSegmentos, segmentosSalvos, turmasSalvas] = await Promise.all([
            buscarSegmentosDaEscola(_schoolId),
            buscarPreferenciasUsuario(_userId, _schoolId),
            buscarTurmasSalvas(_schoolId)
        ]);

        // 3. Renderiza a tela
        uiRenderizarHierarquia(todosSegmentos, segmentosSalvos);

        // 4. NOVO: Preenche os numerozinhos nos inputs
        uiPreencherVagas(turmasSalvas);

        // 5. Configura os eventos (cliques e botão salvar)
        uiConfigurarEventos();

    } catch (erro) {
        console.error("Erro na inicialização:", erro);
        uiMostrarErro(erro.message);
    } finally {
        uiAlternarLoader(false);
    }
}