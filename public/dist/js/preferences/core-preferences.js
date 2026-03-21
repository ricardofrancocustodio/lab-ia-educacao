// js/preferences/core.js

// =========================================================
// VARIAVEIS GLOBAIS
// =========================================================
_supabase = null;
let _schoolId = null;
let _userId = null;

document.addEventListener('DOMContentLoaded', () => {
    let tentativas = 0;

    const wait = setInterval(async () => {
        const supabasePronto = window.supabaseClient;
        const temSchoolId = sessionStorage.getItem('SCHOOL_ID');

        if (supabasePronto && temSchoolId) {
            clearInterval(wait);

            _supabase = window.supabaseClient;
            _schoolId = temSchoolId;

            _userId = sessionStorage.getItem('USER_ID');
            if (!_userId) {
                const { data } = await _supabase.auth.getUser();
                _userId = data?.user?.id;
            }

            console.log('Core de Preferencias carregado.');
            inicializarPagina();
        } else {
            tentativas++;
            if (tentativas > 50) {
                clearInterval(wait);
                console.error('Erro: SCHOOL_ID ou Supabase nao iniciaram.');
                if (typeof uiMostrarErro === 'function') uiMostrarErro('Nao foi possivel identificar a escola.');
            }
        }
    }, 200);
});

async function inicializarPagina() {
    uiAlternarLoader(true);

    try {
        const todosSegmentos = await buscarSegmentosDaEscola(_schoolId);

        if (window.__legacyPreferencesSchemaAvailable === false) {
            if (typeof uiDesativarModuloLegado === 'function') {
                uiDesativarModuloLegado('O modulo de segmentos/vagas foi desativado porque este ambiente nao possui as tabelas legadas necessarias.');
            }
            return;
        }

        const resultados = await Promise.allSettled([
            Promise.resolve(todosSegmentos),
            buscarPreferenciasUsuario(_userId, _schoolId),
            buscarTurmasSalvas(_schoolId)
        ]);

        const segmentosSalvos = resultados[1].status === 'fulfilled' ? resultados[1].value : [];
        const turmasSalvas = resultados[2].status === 'fulfilled' ? resultados[2].value : [];

        uiRenderizarHierarquia(todosSegmentos, segmentosSalvos);
        uiPreencherVagas(turmasSalvas);
        uiConfigurarEventos();

        const houveFalha = resultados.slice(1).some((resultado) => resultado.status === 'rejected');
        if (houveFalha && typeof uiMostrarAviso === 'function') {
            uiMostrarAviso('Alguns recursos complementares da pagina nao estao disponiveis no schema atual.');
        }
    } catch (erro) {
        console.error('Erro na inicializacao:', erro);
        uiMostrarErro(erro.message);
    } finally {
        uiAlternarLoader(false);
    }
}
