const CHAT_MANAGER_ENHANCED_SCOPE_MODES = {
    SINGLE_SCHOOL: 'single_school',
    NETWORK_SEARCH: 'network_search',
    GLOBAL_SEARCH: 'global_search'
};
const CHAT_MANAGER_ENHANCED_STORAGE = {
    selectedSchoolId: 'CHAT_MANAGER_SELECTED_SCHOOL_ID',
    selectedSchoolName: 'CHAT_MANAGER_SELECTED_SCHOOL_NAME'
};
const chatManagerEnhancedState = {
    scopeLoaded: false,
    scopePromise: null,
    scopeMode: CHAT_MANAGER_ENHANCED_SCOPE_MODES.SINGLE_SCHOOL,
    minSearchLength: 2,
    networkScope: null,
    currentSchool: null,
    selectedSchool: null,
    searchResults: [],
    searchDebounce: null,
    searchRequestId: 0
};

function getChatManagerRequestHeaders(extraHeaders = {}) {
    return {
        'x-user-role': sessionStorage.getItem('USER_ROLE') || '',
        'x-platform-role': sessionStorage.getItem('PLATFORM_ROLE') || '',
        'x-effective-role': sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('PLATFORM_ROLE') || sessionStorage.getItem('USER_ROLE') || '',
        ...extraHeaders
    };
}

async function getChatManagerAuthHeaders(extraHeaders = {}) {
    const headers = getChatManagerRequestHeaders(extraHeaders);
    if (typeof window.getAccessToken === 'function') {
        const token = await window.getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

async function getChatManagerScopedHeaders(extraHeaders = {}) {
    const headers = await getChatManagerAuthHeaders(extraHeaders);
    const selectedSchoolId = getChatManagerSelectedSchoolId();
    if (selectedSchoolId) headers['x-school-id'] = selectedSchoolId;
    return headers;
}

async function chatManagerRequest(url, options = {}) {
    const { scoped = false, headers = {}, ...fetchOptions } = options;
    const resolvedHeaders = scoped
        ? await getChatManagerScopedHeaders(headers)
        : await getChatManagerAuthHeaders(headers);
    const response = await fetch(url, { ...fetchOptions, headers: resolvedHeaders });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || `HTTP ${response.status}`);
    }
    return body;
}

function getChatManagerSelectedSchoolId() {
    return String(chatManagerEnhancedState.selectedSchool?.id || '').trim();
}

function getChatManagerSelectedSchoolName() {
    return String(chatManagerEnhancedState.selectedSchool?.name || '').trim();
}

function isChatManagerSchoolSelectionRequired() {
    return chatManagerEnhancedState.scopeMode !== CHAT_MANAGER_ENHANCED_SCOPE_MODES.SINGLE_SCHOOL;
}

function persistChatManagerSelectedSchool(school) {
    if (school?.id) {
        sessionStorage.setItem(CHAT_MANAGER_ENHANCED_STORAGE.selectedSchoolId, String(school.id));
        sessionStorage.setItem(CHAT_MANAGER_ENHANCED_STORAGE.selectedSchoolName, String(school.name || ''));
        return;
    }
    sessionStorage.removeItem(CHAT_MANAGER_ENHANCED_STORAGE.selectedSchoolId);
    sessionStorage.removeItem(CHAT_MANAGER_ENHANCED_STORAGE.selectedSchoolName);
}

function ensureChatManagerScopeStyles() {
    if (document.getElementById('chat-manager-enhanced-scope-style')) return;
    const style = document.createElement('style');
    style.id = 'chat-manager-enhanced-scope-style';
    style.textContent = `
        .chat-scope-card { border: 1px solid #e5e7eb; border-radius: 12px; background: linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%); padding: 12px; }
        .chat-scope-title { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; margin-bottom: 6px; }
        .chat-scope-copy { font-size: 0.88rem; color: #1f2937; line-height: 1.4; }
        .chat-scope-copy strong { color: #0f3d75; }
        .chat-selected-school-chip { margin-top: 8px; display: none; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #e0ecff; color: #0f3d75; font-size: 0.78rem; font-weight: 600; }
        .chat-selected-school-chip.is-visible { display: inline-flex; }
        .chat-school-picker[hidden] { display: none !important; }
        .chat-school-results { margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; max-height: 220px; overflow-y: auto; display: none; }
        .chat-school-results.is-open { display: block; }
        .chat-school-result, .chat-school-result-empty { width: 100%; border: 0; border-bottom: 1px solid #eef2f7; background: transparent; text-align: left; padding: 10px 12px; }
        .chat-school-result:last-child, .chat-school-result-empty:last-child { border-bottom: 0; }
        .chat-school-result { cursor: pointer; }
        .chat-school-result:hover { background: #f8fbff; }
        .chat-school-result-name { font-size: 0.9rem; font-weight: 600; color: #111827; }
        .chat-school-result-meta { font-size: 0.76rem; color: #6b7280; margin-top: 3px; }
        .chat-school-helper { display: block; font-size: 0.78rem; color: #6b7280; margin-top: 6px; line-height: 1.35; }
    `;
    document.head.appendChild(style);
}

function ensureChatManagerScopeUI() {
    ensureChatManagerScopeStyles();
    if (document.getElementById('chat-scope-summary')) return;

    const sidebarHeader = document.querySelector('.chat-sidebar .p-3.border-bottom');
    const searchInput = document.getElementById('search-chat');
    if (!sidebarHeader || !searchInput) return;

    const scopeCard = document.createElement('div');
    scopeCard.className = 'chat-scope-card';
    scopeCard.innerHTML = `
        <div class="chat-scope-title">Escopo do Atendimento</div>
        <div id="chat-scope-summary" class="chat-scope-copy">Carregando contexto institucional...</div>
        <div id="chat-selected-school-chip" class="chat-selected-school-chip"></div>
    `;

    const picker = document.createElement('div');
    picker.id = 'chat-school-picker';
    picker.className = 'chat-school-picker mt-3';
    picker.hidden = true;
    picker.innerHTML = `
        <label for="school-search" class="small font-weight-bold mb-1">Escolher escola da rede</label>
        <div class="input-group input-group-sm">
            <input type="text" class="form-control" id="school-search" placeholder="Digite o nome da escola" autocomplete="off">
            <div class="input-group-append">
                <button type="button" class="btn btn-outline-secondary" id="btn-clear-school" disabled>Limpar</button>
            </div>
        </div>
        <small id="chat-school-helper" class="chat-school-helper">Digite pelo menos 2 caracteres para localizar a escola antes de abrir as conversas.</small>
        <div id="school-search-results" class="chat-school-results"></div>
    `;

    const searchLabel = document.createElement('label');
    searchLabel.className = 'small font-weight-bold mb-1';
    searchLabel.htmlFor = 'search-chat';
    searchLabel.textContent = 'Buscar nas conversas da escola';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'mt-3';

    sidebarHeader.insertBefore(scopeCard, searchInput);
    sidebarHeader.insertBefore(picker, searchInput);
    sidebarHeader.insertBefore(searchWrap, searchInput);
    searchWrap.appendChild(searchLabel);
    searchWrap.appendChild(searchInput);

    const schoolSearchInput = document.getElementById('school-search');
    const clearButton = document.getElementById('btn-clear-school');
    const resultsContainer = document.getElementById('school-search-results');

    if (schoolSearchInput && schoolSearchInput.dataset.bound !== '1') {
        schoolSearchInput.dataset.bound = '1';
        schoolSearchInput.addEventListener('input', () => {
            window.clearTimeout(chatManagerEnhancedState.searchDebounce);
            chatManagerEnhancedState.searchDebounce = window.setTimeout(() => {
                pesquisarEscolasChatManager(schoolSearchInput.value);
            }, 250);
        });
        schoolSearchInput.addEventListener('focus', () => {
            if (chatManagerEnhancedState.searchResults.length) {
                renderizarResultadosEscolasChatManager(chatManagerEnhancedState.searchResults, schoolSearchInput.value);
            }
        });
    }

    if (clearButton && clearButton.dataset.bound !== '1') {
        clearButton.dataset.bound = '1';
        clearButton.addEventListener('click', async () => {
            if (!isChatManagerSchoolSelectionRequired()) return;
            aplicarEscolaSelecionadaChatManager(null);
            if (schoolSearchInput) schoolSearchInput.value = '';
            esconderResultadosEscolasChatManager();
            renderizarEstadoAguardandoEscola();
        });
    }

    if (resultsContainer && resultsContainer.dataset.bound !== '1') {
        resultsContainer.dataset.bound = '1';
        resultsContainer.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-school-id]');
            if (!button) return;
            const school = {
                id: button.getAttribute('data-school-id') || '',
                name: button.getAttribute('data-school-name') || '',
                parent_name: button.getAttribute('data-parent-name') || '',
                institution_type: button.getAttribute('data-institution-type') || ''
            };
            aplicarEscolaSelecionadaChatManager(school);
            await carregarConversas();
        });
    }
}

function atualizarResumoEscopoChatManager() {
    const summary = document.getElementById('chat-scope-summary');
    const chip = document.getElementById('chat-selected-school-chip');
    const picker = document.getElementById('chat-school-picker');
    const helper = document.getElementById('chat-school-helper');
    const networkName = chatManagerEnhancedState.networkScope?.name || chatManagerEnhancedState.currentSchool?.name || 'Rede atual';
    const selectedSchoolName = getChatManagerSelectedSchoolName();

    if (summary) {
        if (chatManagerEnhancedState.scopeMode === CHAT_MANAGER_ENHANCED_SCOPE_MODES.SINGLE_SCHOOL) {
            const currentName = chatManagerEnhancedState.currentSchool?.name || 'Unidade escolar';
            summary.innerHTML = `<strong>${escapeHtml(currentName)}</strong><br>As conversas desta unidade sao carregadas automaticamente neste painel.`;
        } else if (selectedSchoolName) {
            summary.innerHTML = `<strong>${escapeHtml(networkName)}</strong><br>Chats filtrados pela escola escolhida dentro da rede.`;
        } else if (chatManagerEnhancedState.scopeMode === CHAT_MANAGER_ENHANCED_SCOPE_MODES.GLOBAL_SEARCH) {
            summary.innerHTML = '<strong>Visao institucional ampliada</strong><br>Escolha uma escola para carregar apenas as conversas daquela unidade.';
        } else {
            summary.innerHTML = `<strong>${escapeHtml(networkName)}</strong><br>Escolha a escola da rede para carregar as conversas e manter a lista leve mesmo com muitas unidades.`;
        }
    }

    if (chip) {
        if (selectedSchoolName) {
            chip.textContent = `Escola ativa: ${selectedSchoolName}`;
            chip.classList.add('is-visible');
        } else {
            chip.textContent = '';
            chip.classList.remove('is-visible');
        }
    }

    if (picker) {
        picker.hidden = chatManagerEnhancedState.scopeMode === CHAT_MANAGER_ENHANCED_SCOPE_MODES.SINGLE_SCHOOL;
    }

    if (helper) {
        if (chatManagerEnhancedState.scopeMode === CHAT_MANAGER_ENHANCED_SCOPE_MODES.SINGLE_SCHOOL) {
            helper.textContent = '';
        } else if (selectedSchoolName) {
            helper.textContent = 'Troque a escola para recarregar imediatamente as conversas daquele contexto.';
        } else {
            helper.textContent = `Digite pelo menos ${chatManagerEnhancedState.minSearchLength} caracteres para localizar a escola antes de abrir as conversas.`;
        }
    }
}

function atualizarBuscaConversasChatManager() {
    const searchInput = document.getElementById('search-chat');
    const clearButton = document.getElementById('btn-clear-school');
    if (!searchInput) return;

    const hasSchool = Boolean(getChatManagerSelectedSchoolId());
    searchInput.disabled = !hasSchool;
    if (!hasSchool) searchInput.value = '';
    searchInput.placeholder = hasSchool
        ? `Buscar conversa em ${getChatManagerSelectedSchoolName() || 'escola selecionada'}`
        : 'Selecione uma escola para buscar conversas';

    if (clearButton) {
        clearButton.disabled = !isChatManagerSchoolSelectionRequired() || !hasSchool;
    }
}

function aplicarEscolaSelecionadaChatManager(school) {
    chatManagerEnhancedState.selectedSchool = school?.id ? school : null;
    persistChatManagerSelectedSchool(chatManagerEnhancedState.selectedSchool);
    knownConversationIds = new Set();
    conversas = [];
    contatoAtivoId = null;
    conversaAtiva = null;
    auditMessageAtivoId = null;

    const schoolSearchInput = document.getElementById('school-search');
    if (schoolSearchInput) {
        schoolSearchInput.value = school?.name || '';
    }

    atualizarResumoEscopoChatManager();
    atualizarBuscaConversasChatManager();
    esconderResultadosEscolasChatManager();
    updateDocumentTitle();
    updateExportButtons();
}

function esconderResultadosEscolasChatManager() {
    const resultsContainer = document.getElementById('school-search-results');
    if (!resultsContainer) return;
    resultsContainer.classList.remove('is-open');
    resultsContainer.innerHTML = '';
}

function renderizarResultadosEscolasChatManager(items = [], searchTerm = '') {
    const resultsContainer = document.getElementById('school-search-results');
    if (!resultsContainer) return;

    if (!Array.isArray(items) || !items.length) {
        resultsContainer.innerHTML = `<div class="chat-school-result-empty text-muted small">${searchTerm ? 'Nenhuma escola encontrada para esse termo.' : 'Nenhum resultado para exibir.'}</div>`;
    } else {
        resultsContainer.innerHTML = items.map((item) => {
            const parent = String(item.parent_name || '').trim();
            const meta = parent ? `Unidade escolar | ${escapeHtml(parent)}` : 'Contexto institucional';
            return `
                <button type="button" class="chat-school-result" data-school-id="${escapeHtml(item.id || '')}" data-school-name="${escapeHtml(item.name || '')}" data-parent-name="${escapeHtml(parent)}" data-institution-type="${escapeHtml(item.institution_type || '')}">
                    <div class="chat-school-result-name">${escapeHtml(item.name || 'Escola')}</div>
                    <div class="chat-school-result-meta">${meta}</div>
                </button>
            `;
        }).join('');
    }

    resultsContainer.classList.add('is-open');
}

async function pesquisarEscolasChatManager(term = '') {
    if (!isChatManagerSchoolSelectionRequired()) return;
    const normalizedTerm = String(term || '').trim();
    const resultsContainer = document.getElementById('school-search-results');

    if (normalizedTerm.length < chatManagerEnhancedState.minSearchLength) {
        chatManagerEnhancedState.searchResults = [];
        if (resultsContainer) resultsContainer.classList.remove('is-open');
        return;
    }

    const requestId = ++chatManagerEnhancedState.searchRequestId;
    try {
        const params = new URLSearchParams();
        params.set('q', normalizedTerm);
        params.set('limit', '20');
        const body = await chatManagerRequest(`/api/chat-manager/schools?${params.toString()}`);
        if (requestId !== chatManagerEnhancedState.searchRequestId) return;
        chatManagerEnhancedState.searchResults = Array.isArray(body?.schools) ? body.schools : [];
        renderizarResultadosEscolasChatManager(chatManagerEnhancedState.searchResults, normalizedTerm);
    } catch (_error) {
        if (requestId !== chatManagerEnhancedState.searchRequestId) return;
        renderizarResultadosEscolasChatManager([], normalizedTerm);
    }
}

async function ensureChatManagerScopeLoaded(forceReload = false) {
    if (forceReload) {
        chatManagerEnhancedState.scopeLoaded = false;
        chatManagerEnhancedState.scopePromise = null;
    }
    if (chatManagerEnhancedState.scopeLoaded) {
        ensureChatManagerScopeUI();
        atualizarResumoEscopoChatManager();
        atualizarBuscaConversasChatManager();
        return;
    }
    if (chatManagerEnhancedState.scopePromise) {
        await chatManagerEnhancedState.scopePromise;
        return;
    }

    chatManagerEnhancedState.scopePromise = (async () => {
        ensureChatManagerScopeUI();
        const params = new URLSearchParams();
        const persistedSchoolId = String(sessionStorage.getItem(CHAT_MANAGER_ENHANCED_STORAGE.selectedSchoolId) || '').trim();
        if (persistedSchoolId) params.set('selected_school_id', persistedSchoolId);
        const body = await chatManagerRequest(`/api/chat-manager/schools${params.toString() ? `?${params.toString()}` : ''}`);
        chatManagerEnhancedState.scopeMode = body?.scope_mode || CHAT_MANAGER_ENHANCED_SCOPE_MODES.SINGLE_SCHOOL;
        chatManagerEnhancedState.minSearchLength = Number(body?.min_search_length || 2);
        chatManagerEnhancedState.networkScope = body?.network_scope || null;
        chatManagerEnhancedState.currentSchool = body?.current_school || null;

        if (body?.selected_school?.id) {
            aplicarEscolaSelecionadaChatManager(body.selected_school);
        } else if (chatManagerEnhancedState.scopeMode === CHAT_MANAGER_ENHANCED_SCOPE_MODES.SINGLE_SCHOOL && body?.current_school?.id) {
            aplicarEscolaSelecionadaChatManager(body.current_school);
        } else {
            aplicarEscolaSelecionadaChatManager(null);
        }

        chatManagerEnhancedState.scopeLoaded = true;
        chatManagerEnhancedState.scopePromise = null;
    })().catch((error) => {
        chatManagerEnhancedState.scopePromise = null;
        throw error;
    });

    await chatManagerEnhancedState.scopePromise;
}

function renderizarEstadoAguardandoEscola() {
    $('#contact-list').html('<div class="p-3 text-muted small">Escolha uma escola para carregar apenas as conversas daquela unidade.</div>');
    $('#chat-window').html('<div class="text-center text-muted py-5">Escolha uma escola da rede para iniciar o monitoramento das conversas.</div>');
    $('#chat-audit-panel').html('<div class="audit-empty">A trilha auditavel aparece depois que uma escola e uma conversa forem selecionadas.</div>');
    $('#active-contact-name').text('Escolha uma escola');
    $('#btn-resolve-chat').prop('disabled', true);
    updateExportButtons();
}

function renderizarEstadoSemConversaSelecionada() {
    $('#chat-window').html('<div class="text-center text-muted py-5">Clique em uma conversa para iniciar o acompanhamento.</div>');
    $('#chat-audit-panel').html('<div class="audit-empty">Selecione uma conversa para ver a trilha auditavel da resposta.</div>');
    $('#active-contact-name').text(getChatManagerSelectedSchoolName() || 'Selecione uma conversa');
    $('#btn-resolve-chat').prop('disabled', true);
    updateExportButtons();
}

async function carregarConversas() {
    try {
        await ensureChatManagerScopeLoaded();
        if (!getChatManagerSelectedSchoolId()) {
            renderizarEstadoAguardandoEscola();
            return;
        }

        const body = await chatManagerRequest('/api/webchat/conversations', { scoped: true });
        conversas = Array.isArray(body?.conversations) ? body.conversations.map(normalizarConversa) : [];
        updateKnownConversations(conversas, false);
        updateDocumentTitle();
        renderizarContatos(filtrarConversas($('#search-chat').val()));

        if (contatoAtivoId) {
            await selecionarChat(contatoAtivoId, true);
        } else {
            renderizarEstadoSemConversaSelecionada();
        }
    } catch (_error) {
        $('#contact-list').html('<div class="p-3 text-muted small">Nao foi possivel carregar as conversas da escola selecionada.</div>');
    }
}

async function carregarConversasSilencioso() {
    try {
        await ensureChatManagerScopeLoaded();
        if (!getChatManagerSelectedSchoolId()) return;
        const body = await chatManagerRequest('/api/webchat/conversations', { scoped: true });
        conversas = Array.isArray(body?.conversations) ? body.conversations.map(normalizarConversa) : [];
        updateKnownConversations(conversas, true);
        updateDocumentTitle();
        renderizarContatos(filtrarConversas($('#search-chat').val()));

        if (contatoAtivoId) {
            await selecionarChat(contatoAtivoId, true);
        }
    } catch (error) {
        console.error('Erro ao atualizar conversas silenciosamente:', error);
    }
}

function updateDocumentTitle() {
    const ativas = conversas.filter((item) => item.status === 'AI_ACTIVE').length;
    const selectedSchoolName = getChatManagerSelectedSchoolName();
    const titleBase = selectedSchoolName ? `${selectedSchoolName} | Gerenciador de Chats` : defaultDocumentTitle;
    document.title = ativas > 0 ? `(${ativas}) ${titleBase}` : titleBase;
}

function renderizarContatos(lista = conversas) {
    const container = $('#contact-list');
    container.empty();

    if (!getChatManagerSelectedSchoolId()) {
        container.html('<div class="p-3 text-muted small">Escolha uma escola para carregar apenas as conversas daquela unidade.</div>');
        return;
    }

    if (!lista.length) {
        container.html(`<div class="p-3 text-muted small">Nenhuma conversa automatizada registrada para ${escapeHtml(getChatManagerSelectedSchoolName() || 'a escola selecionada')}.</div>`);
        return;
    }

    lista.forEach((c) => {
        const badgeClass = c.origin_label === 'Webchat' ? 'badge-info' : 'badge-primary';
        const statusClass = c.status === 'AI_ACTIVE' ? 'badge-success' : 'badge-secondary';
        const governanceBadges = [];
        if (c.feedback_not_helpful > 0) governanceBadges.push('<span class="badge badge-warning governance-badge">Nao util</span>');
        if (c.feedback_incorrect > 0) governanceBadges.push(`<span class="badge badge-danger governance-badge">Incorreta ${escapeHtml(String(c.feedback_incorrect))}</span>`);
        if (c.incidents_open > 0) governanceBadges.push(`<span class="badge badge-dark governance-badge">Incidente ${escapeHtml(String(c.incidents_open))}</span>`);
        const html = `
            <div class="contact-item ${contatoAtivoId === c.id ? 'active' : ''}${c.governance_flagged && c.status === 'AI_ACTIVE' ? ' governance-flagged' : ''}" onclick="selecionarChat('${escapeHtml(c.id)}')">
                <div class="d-flex justify-content-between align-items-start">
                    <strong>${escapeHtml(c.display_name)}</strong>
                    <span class="badge ${badgeClass} origin-badge">${escapeHtml(c.origin_label)}</span>
                </div>
                <div class="small text-muted mt-1">${escapeHtml(c.area_label)}</div>
                <div class="text-muted small text-truncate mt-1">${escapeHtml((() => { const preview = String(c.last_message || c.summary || '').trim(); const normalized = preview.toLowerCase(); const normalizedArea = String(c.area_label || '').trim().toLowerCase(); if (!preview || normalized === normalizedArea) return 'Conversa com assistente institucional.'; if (normalized === 'auto-roteamento' || normalized === 'auto roteamento') return 'Triagem automatica em andamento.'; return preview; })())}</div>
                <div class="mt-2 d-flex flex-wrap" style="gap: 6px;">
                    <span class="badge ${statusClass}">${escapeHtml(c.status_label)}</span>
                    ${governanceBadges.join('')}
                </div>
            </div>
        `;
        container.append(html);
    });
}

async function selecionarChat(id, silent = false) {
    if (!getChatManagerSelectedSchoolId()) {
        renderizarEstadoAguardandoEscola();
        return;
    }

    contatoAtivoId = id;
    const previousAuditMessageId = auditMessageAtivoId;
    conversaAtiva = null;
    $('#msg-input, #btn-send').prop('disabled', true);
    updateExportButtons();

    if (!silent) {
        $('#chat-window').html('<div class="text-center text-muted small">Carregando historico...</div>');
        $('#chat-audit-panel').html('<div class="audit-empty">Montando trilha auditavel...</div>');
    }

    try {
        const body = await chatManagerRequest(`/api/webchat/conversations/${encodeURIComponent(id)}`, { scoped: true });
        const conversation = normalizarConversa(body?.conversation || {});
        conversaAtiva = conversation;
        sincronizarConversaNaLista(conversation);

        const stillExists = (conversation.transcript || []).some((message) => message.id === previousAuditMessageId && message.clickable_audit);
        auditMessageAtivoId = stillExists
            ? previousAuditMessageId
            : ((conversation.transcript || []).find((message) => message.clickable_audit)?.id || null);

        $('#active-contact-name').html(`
            <div>
                <div>${escapeHtml(conversation.display_name || 'Conversa')}</div>
                <div class="small text-muted mt-1">${escapeHtml(conversation.area_label)} | ${escapeHtml(conversation.status_label)}</div>
            </div>
        `);
        $('#btn-resolve-chat').prop('disabled', conversation.status !== 'AI_ACTIVE' || !(chatManagerCapabilities || getChatManagerCapabilities()).resolveConversation);
        updateExportButtons();
        renderizarHistorico(conversation);
        renderizarAuditoria(conversation);
        renderizarContatos(filtrarConversas($('#search-chat').val()));
    } catch (_error) {
        $('#chat-window').html('<div class="text-center text-danger small">Falha ao carregar a conversa.</div>');
        $('#chat-audit-panel').html('<div class="audit-empty">Falha ao montar a trilha auditavel.</div>');
        updateExportButtons();
    }
}

async function registrarFeedbackAuditoria(tipo) {
    if (!(chatManagerCapabilities || getChatManagerCapabilities()).feedbackActions) {
        Swal.fire('Acesso restrito', 'Seu perfil nao pode registrar feedback institucional nesta tela.', 'info');
        return;
    }
    const audit = getSelectedAudit(conversaAtiva);
    if (!audit?.response_id) {
        Swal.fire('Informacao', 'Selecione uma resposta auditavel para registrar feedback.', 'info');
        return;
    }

    let comment = '';
    if (tipo !== 'helpful') {
        const result = await Swal.fire({
            title: tipo === 'incorrect' ? 'Registrar resposta incorreta' : 'Registrar feedback',
            input: 'textarea',
            inputLabel: 'Comentario opcional',
            inputPlaceholder: 'Descreva o problema observado...',
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
        comment = String(result.value || '').trim();
    }

    try {
        await chatManagerRequest('/api/webchat/responses/' + encodeURIComponent(audit.response_id) + '/feedback', {
            method: 'POST',
            scoped: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback_type: tipo, comment, created_by: getCurrentOperatorName() })
        });
        Swal.fire('Sucesso', 'Feedback registrado com sucesso.', 'success');
        await carregarConversasSilencioso();
    } catch (error) {
        Swal.fire('Erro', error.message || 'Falha ao registrar feedback.', 'error');
    }
}

async function registrarIncidenteAuditoria() {
    if (!(chatManagerCapabilities || getChatManagerCapabilities()).feedbackActions) {
        Swal.fire('Acesso restrito', 'Seu perfil nao pode abrir incidentes a partir desta tela.', 'info');
        return;
    }
    const audit = getSelectedAudit(conversaAtiva);
    if (!audit?.response_id) {
        Swal.fire('Informacao', 'Selecione uma resposta auditavel para registrar incidente.', 'info');
        return;
    }

    const result = await Swal.fire({
        title: 'Registrar incidente',
        html: '<input id="incident-type" class="swal2-input" placeholder="Tipo do incidente" value="governance_review">' +
            '<input id="incident-severity" class="swal2-input" placeholder="Severidade: LOW, MEDIUM, HIGH, CRITICAL" value="MEDIUM">' +
            '<textarea id="incident-description" class="swal2-textarea" placeholder="Descricao do incidente"></textarea>',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Registrar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => ({
            incident_type: document.getElementById('incident-type').value,
            severity: document.getElementById('incident-severity').value,
            description: document.getElementById('incident-description').value
        })
    });

    if (!result.isConfirmed) return;

    const payload = result.value || {};
    try {
        await chatManagerRequest('/api/webchat/responses/' + encodeURIComponent(audit.response_id) + '/incident', {
            method: 'POST',
            scoped: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                incident_type: String(payload.incident_type || 'governance_review').trim(),
                severity: String(payload.severity || 'MEDIUM').trim().toUpperCase(),
                description: String(payload.description || '').trim(),
                topic: audit.original_question || '',
                opened_by: getCurrentOperatorName()
            })
        });
        Swal.fire('Sucesso', 'Incidente registrado com sucesso.', 'success');
        await carregarConversasSilencioso();
    } catch (error) {
        Swal.fire('Erro', error.message || 'Falha ao registrar incidente.', 'error');
    }
}

async function encerrarConversaAtual() {
    if (!(chatManagerCapabilities || getChatManagerCapabilities()).resolveConversation) {
        Swal.fire('Acesso restrito', 'Seu perfil nao pode encerrar conversas nesta tela.', 'info');
        return;
    }
    if (!contatoAtivoId) return;

    const { value: finalText, isConfirmed } = await Swal.fire({
        title: 'Encerrar conversa',
        input: 'textarea',
        inputLabel: 'Observacao final opcional',
        inputPlaceholder: 'Ex.: Atendimento encerrado pela equipe de monitoramento.',
        showCancelButton: true,
        confirmButtonText: 'Encerrar',
        cancelButtonText: 'Cancelar'
    });
    if (!isConfirmed) return;

    try {
        await chatManagerRequest(`/api/webchat/conversations/${encodeURIComponent(contatoAtivoId)}/resolve`, {
            method: 'POST',
            scoped: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: String(finalText || '').trim() })
        });
        await selecionarChat(contatoAtivoId, true);
        await carregarConversasSilencioso();
    } catch (error) {
        Swal.fire('Erro', error.message || 'Nao foi possivel encerrar a conversa.', 'error');
    }
}

window.selecionarChat = selecionarChat;
window.registrarFeedbackAuditoria = registrarFeedbackAuditoria;
window.registrarIncidenteAuditoria = registrarIncidenteAuditoria;
