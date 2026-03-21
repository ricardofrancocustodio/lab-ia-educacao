document.addEventListener('DOMContentLoaded', () => {
    const providerSelect = document.getElementById('aiProviderSelect');
    if (providerSelect) {
        providerSelect.addEventListener('change', atualizarCamposModeloIA);
    }

    const wait = setInterval(() => {
        if (window.supabaseClient && sessionStorage.getItem('SCHOOL_ID')) {
            clearInterval(wait);
            carregarConfiguracaoIA();
        }
    }, 300);
});

async function getAuthenticatedHeaders(extraHeaders = {}) {
    const token = await window.getAccessToken();
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...extraHeaders
    };
}

function atualizarCamposModeloIA() {
    const provider = (document.getElementById('aiProviderSelect') || {}).value || 'openai';
    const fields = document.querySelectorAll('.ai-model-field');
    const hint = document.getElementById('ai-provider-model-hint');

    fields.forEach((field) => {
        const isActive = field.dataset.provider === provider;
        field.classList.toggle('d-none', !isActive);
    });

    if (!hint) return;

    if (provider === 'gemini') {
        hint.textContent = 'O provedor Gemini nao tem campo de modelo configurado neste painel no momento.';
        hint.classList.remove('d-none');
        return;
    }

    hint.classList.add('d-none');
    hint.textContent = '';
}

async function carregarConfiguracaoIA() {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const status = document.getElementById('ai-provider-status');
    if (!schoolId || !status) return;

    status.textContent = 'Carregando configuracao atual...';

    try {
        const res = await fetch('/api/preferences/ai-provider', {
            headers: await getAuthenticatedHeaders()
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Falha ao carregar configuracao de IA.');

        const settings = body.settings || {};
        document.getElementById('aiProviderSelect').value = settings.active_provider || 'openai';
        document.getElementById('openaiChatModel').value = settings.openai_chat_model || 'gpt-4o-mini';
        document.getElementById('groqChatModel').value = settings.groq_model || 'llama-3.3-70b-versatile';
        atualizarCamposModeloIA();

        const source = body.source === 'database' ? 'Banco de dados' : 'Variavel de ambiente';
        const updatedAt = settings.updated_at ? new Date(settings.updated_at).toLocaleString('pt-BR') : 'nao informado';
        const updatedBy = settings.updated_by || 'sistema';
        status.textContent = 'Ativo: ' + (settings.active_provider || 'openai') + ' | Origem: ' + source + ' | Atualizado por: ' + updatedBy + ' | Em: ' + updatedAt;
    } catch (error) {
        console.error(error);
        status.textContent = 'Nao foi possivel carregar a configuracao de IA.';
    }
}

async function salvarConfiguracaoIA() {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    const button = document.getElementById('btn-save-ai-provider');
    const status = document.getElementById('ai-provider-status');
    if (!schoolId || !button || !status) return;

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Salvando...';

    try {
        const payload = {
            active_provider: document.getElementById('aiProviderSelect').value,
            openai_chat_model: document.getElementById('openaiChatModel').value.trim(),
            groq_model: document.getElementById('groqChatModel').value.trim(),
            updated_by: sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Operador institucional'
        };

        const res = await fetch('/api/preferences/ai-provider', {
            method: 'POST',
            headers: await getAuthenticatedHeaders(),
            body: JSON.stringify(payload)
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Falha ao salvar configuracao de IA.');

        Swal.fire({
            icon: 'success',
            title: 'Provedor de IA atualizado',
            text: 'A aplicacao passara a usar o provider selecionado nas proximas chamadas.',
            timer: 2200,
            showConfirmButton: false
        });

        await carregarConfiguracaoIA();
    } catch (error) {
        console.error(error);
        Swal.fire('Erro', error.message || 'Nao foi possivel salvar a configuracao de IA.', 'error');
        status.textContent = 'Falha ao salvar configuracao de IA.';
    } finally {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
}
