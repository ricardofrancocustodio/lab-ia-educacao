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
    const providerSelect = document.getElementById('aiProviderSelect');
    const provider = 'groq';
    const fields = document.querySelectorAll('.ai-model-field');
    const hint = document.getElementById('ai-provider-model-hint');

    fields.forEach((field) => {
        const isActive = field.dataset.provider === provider;
        field.classList.toggle('d-none', !isActive);
    });

    if (providerSelect) {
        providerSelect.value = 'groq';
        providerSelect.setAttribute('disabled', 'disabled');
    }

    if (!hint) return;

    hint.textContent = 'Este ambiente opera apenas com Groq no atendimento institucional.';
    hint.classList.remove('d-none');
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
        document.getElementById('aiProviderSelect').value = 'groq';
        document.getElementById('groqChatModel').value = settings.groq_model || 'llama-3.3-70b-versatile';
        atualizarCamposModeloIA();

        const source = body.source === 'database' ? 'Banco de dados' : 'Variavel de ambiente';
        const updatedAt = settings.updated_at ? new Date(settings.updated_at).toLocaleString('pt-BR') : 'nao informado';
        const updatedBy = settings.updated_by || 'sistema';
        status.textContent = 'Ativo: groq | Origem: ' + source + ' | Atualizado por: ' + updatedBy + ' | Em: ' + updatedAt;
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
            active_provider: 'groq',
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
            text: 'A aplicacao passara a usar o modelo Groq configurado nas proximas chamadas.',
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
