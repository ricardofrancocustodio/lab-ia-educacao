let contatoAtivoId = null;
let conversaAtiva = null;
let auditMessageAtivoId = null;
let conversas = [];
let refreshTimer = null;
let knownConversationIds = new Set();
const defaultDocumentTitle = document.title;
const statusLabels = {
    AI_ACTIVE: 'IA ativa',
    RESOLVED: 'Encerrada'
};

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeFileName(value) {
    return String(value || 'conversa')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'conversa';
}

function formatDateTime(value) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString('pt-BR');
    } catch (_error) {
        return value;
    }
}

function formatConfidence(value) {
    if (value === null || value === undefined || value === '') return '-';
    const number = Number(value);
    if (Number.isNaN(number)) return String(value);
    return number.toFixed(2);
}

function formatResponseMode(value) {
    const normalized = String(value || '').toUpperCase();
    if (normalized === 'AUTOMATIC') return 'Resposta automatica';
    if (normalized === 'CORRECTED') return 'Resposta corrigida';
    if (normalized === 'HUMAN_FALLBACK') return 'Fallback humano';
    return value || '-';
}

function csvEscape(value) {
    const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim();
    return `"${normalized.replace(/"/g, '""')}"`;
}

function downloadBlob(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getSelectedAudit(conversation = conversaAtiva) {
    if (!conversation) return null;
    const selectedMessage = (conversation.transcript || []).find((message) => message.id === auditMessageAtivoId && message.audit);
    return selectedMessage?.audit || conversation.audit_trail || null;
}

function getConversationFileBaseName(conversation = conversaAtiva) {
    const suffix = contatoAtivoId || conversation?.id || 'sem-id';
    const title = conversation?.display_name || 'conversa';
    return `${sanitizeFileName(title)}-${sanitizeFileName(suffix)}`;
}

function getConversationExportRows(conversation = conversaAtiva) {
    if (!conversation) return [];

    return (conversation.transcript || []).map((message, index) => {
        const audit = message.audit || {};
        const consultedSources = Array.isArray(audit.consulted_sources) ? audit.consulted_sources : [];
        const supportingSource = audit.supporting_source || {};
        return {
            conversation_id: conversation.id || '',
            status: conversation.status_label || conversation.status || '',
            requester_name: conversation.display_name || audit.requester_name || '',
            requester_id: audit.requester_id || conversation.user_id || '',
            channel: conversation.channel || audit.channel || '',
            requester_profile: audit.requester_profile || conversation.metadata?.requester_profile || '',
            assistant_area: conversation.area_label || '',
            opened_at: conversation.opened_at || conversation.created_at || '',
            resolved_at: conversation.resolved_at || '',
            message_order: index + 1,
            message_id: message.id || '',
            message_role: message.role || '',
            message_label: message.source || '',
            message_timestamp: message.created_at || message.timestamp || audit.delivered_at || '',
            message_text: message.text || '',
            original_question: audit.original_question || '',
            response_text: audit.response_text || '',
            assistant_name: audit.assistant_name || '',
            response_mode: formatResponseMode(audit.response_mode || ''),
            confidence_score: formatConfidence(audit.confidence_score),
            supporting_source_title: supportingSource.source_title || '',
            supporting_source_version: supportingSource.source_version_label || '',
            supporting_source_published_at: supportingSource.published_at || '',
            supporting_source_excerpt: supportingSource.source_excerpt || '',
            consulted_sources: consultedSources.map((source) => {
                const title = source.source_title || 'Fonte institucional';
                const version = source.source_version_label || 'sem versao';
                const excerpt = source.source_excerpt || '';
                return `${title} [${version}] ${excerpt}`.trim();
            }).join(' | '),
            delivered_at: audit.delivered_at || '',
            fallback_to_human: audit.fallback_to_human ? 'sim' : 'nao',
            corrected: audit.corrected ? 'sim' : 'nao',
            corrected_at: audit.corrected_at || '',
            corrected_by: audit.corrected_by || '',
            formal_events: Array.isArray(audit.formal_events)
                ? audit.formal_events.map((event) => `${event.event_type || 'EVENTO'} @ ${formatDateTime(event.created_at)} ${event.summary || ''}`.trim()).join(' | ')
                : ''
        };
    });
}

function buildConversationSummary(conversation = conversaAtiva) {
    const audit = getSelectedAudit(conversation) || {};
    return [
        ['Conversa', conversation?.display_name || '-'],
        ['ID da conversa', conversation?.id || contatoAtivoId || '-'],
        ['Status', conversation?.status_label || conversation?.status || '-'],
        ['Canal', conversation?.channel || audit.channel || '-'],
        ['Perfil', audit.requester_profile || conversation?.metadata?.requester_profile || '-'],
        ['Assistente principal', conversation?.area_label || audit.assistant_name || '-'],
        ['Solicitante', audit.requester_name || conversation?.display_name || '-'],
        ['Identificador do solicitante', audit.requester_id || conversation?.user_id || '-'],
        ['Aberta em', formatDateTime(conversation?.opened_at || conversation?.created_at)],
        ['Resolvida em', formatDateTime(conversation?.resolved_at)],
        ['Mensagem auditada', audit.response_text || '-'],
        ['Pergunta original', audit.original_question || '-']
    ];
}

function updateExportButtons() {
    const disabled = !conversaAtiva;
    $('#btn-export-csv').prop('disabled', disabled);
    $('#btn-export-xls').prop('disabled', disabled);
    $('#btn-export-pdf').prop('disabled', disabled);
}

function exportConversationCsv() {
    if (!conversaAtiva) return;
    const rows = getConversationExportRows(conversaAtiva);
    const headers = Object.keys(rows[0] || {
        conversation_id: '',
        status: '',
        requester_name: '',
        requester_id: '',
        channel: '',
        requester_profile: '',
        assistant_area: '',
        opened_at: '',
        resolved_at: '',
        message_order: '',
        message_id: '',
        message_role: '',
        message_label: '',
        message_timestamp: '',
        message_text: '',
        original_question: '',
        response_text: '',
        assistant_name: '',
        response_mode: '',
        confidence_score: '',
        supporting_source_title: '',
        supporting_source_version: '',
        supporting_source_published_at: '',
        supporting_source_excerpt: '',
        consulted_sources: '',
        delivered_at: '',
        fallback_to_human: '',
        corrected: '',
        corrected_at: '',
        corrected_by: '',
        formal_events: ''
    });
    const csv = [
        headers.map(csvEscape).join(';'),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';'))
    ].join('\n');
    downloadBlob(csv, `${getConversationFileBaseName(conversaAtiva)}.csv`, 'text/csv;charset=utf-8;');
}

function exportConversationXls() {
    if (!conversaAtiva) return;
    const summaryRows = buildConversationSummary(conversaAtiva);
    const dataRows = getConversationExportRows(conversaAtiva);
    const headers = Object.keys(dataRows[0] || {});
    const summaryTable = `
        <table border="1">
            <tr><th colspan="2">Resumo da Conversa</th></tr>
            ${summaryRows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}
        </table>
    `;
    const transcriptTable = `
        <table border="1">
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            ${dataRows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}
        </table>
    `;
    const html = `
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body>
            ${summaryTable}
            <br />
            ${transcriptTable}
        </body>
        </html>
    `;
    downloadBlob(html, `${getConversationFileBaseName(conversaAtiva)}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
}

function exportConversationPdf() {
    if (!conversaAtiva) return;
    if (!window.jspdf || !window.jspdf.jsPDF) {
        Swal.fire('Erro', 'A biblioteca de PDF nao foi carregada nesta pagina.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - (margin * 2);
    let y = margin;

    function ensureSpace(heightNeeded = 18) {
        if (y + heightNeeded > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    }

    function addLine(text, opts = {}) {
        const fontSize = opts.fontSize || 10;
        const gap = opts.gap || 14;
        const fontStyle = opts.fontStyle || 'normal';
        doc.setFont('helvetica', fontStyle);
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(String(text || '-'), maxWidth);
        const heightNeeded = lines.length * gap + 4;
        ensureSpace(heightNeeded);
        doc.text(lines, margin, y);
        y += lines.length * gap + 4;
    }

    addLine('Exportacao de Conversa Auditavel', { fontSize: 16, fontStyle: 'bold', gap: 18 });
    buildConversationSummary(conversaAtiva).forEach(([label, value]) => {
        addLine(`${label}: ${value}`);
    });

    y += 8;
    addLine('Historico e trilha por mensagem', { fontSize: 13, fontStyle: 'bold', gap: 16 });

    (conversaAtiva.transcript || []).forEach((message, index) => {
        const audit = message.audit || null;
        addLine(`${index + 1}. ${message.role === 'assistant' ? (message.source || 'Assistente') : message.role === 'user' ? 'Solicitante' : 'Sistema'}`, { fontSize: 11, fontStyle: 'bold' });
        addLine(`Horario: ${formatDateTime(message.created_at || message.timestamp)}`);
        addLine(`Texto: ${message.text || '-'}`);
        if (audit) {
            addLine(`Pergunta original: ${audit.original_question || '-'}`);
            addLine(`Resposta entregue: ${audit.response_text || '-'}`);
            addLine(`Assistente: ${audit.assistant_name || '-'}`);
            addLine(`Tipo: ${formatResponseMode(audit.response_mode)}`);
            addLine(`Confianca: ${formatConfidence(audit.confidence_score)}`);
            addLine(`Fonte principal: ${audit.supporting_source?.source_title || '-'}`);
            addLine(`Versao da fonte: ${audit.supporting_source?.source_version_label || '-'}`);
            addLine(`Trecho usado: ${audit.supporting_source?.source_excerpt || '-'}`);
            addLine(`Fallback humano: ${audit.fallback_to_human ? 'sim' : 'nao'}`);
            addLine(`Resposta corrigida depois: ${audit.corrected ? 'sim' : 'nao'}`);
            const consultedSources = Array.isArray(audit.consulted_sources) ? audit.consulted_sources : [];
            if (consultedSources.length) {
                addLine('Fontes consultadas:', { fontStyle: 'bold' });
                consultedSources.forEach((source) => {
                    addLine(`- ${source.source_title || 'Fonte institucional'} | ${source.source_version_label || 'sem versao'} | ${source.source_excerpt || 'sem trecho'}`);
                });
            }
            const formalEvents = Array.isArray(audit.formal_events) ? audit.formal_events : [];
            if (formalEvents.length) {
                addLine('Eventos auditaveis:', { fontStyle: 'bold' });
                formalEvents.forEach((event) => {
                    addLine(`- ${event.event_type || 'EVENTO'} | ${formatDateTime(event.created_at)} | ${event.summary || ''}`);
                });
            }
        }
        y += 6;
    });

    doc.save(`${getConversationFileBaseName(conversaAtiva)}.pdf`);
}

$(document).ready(function() {
    $('#msg-input').prop('disabled', true).attr('placeholder', 'Resposta humana desabilitada neste canal');
    $('#btn-send').prop('disabled', true).hide();
    updateExportButtons();
    carregarConversas();

    $('#search-chat').on('keyup', function() {
        renderizarContatos(filtrarConversas($(this).val()));
    });

    refreshTimer = window.setInterval(carregarConversasSilencioso, 3000);
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            carregarConversasSilencioso();
        }
    });

    $('#btn-resolve-chat').on('click', encerrarConversaAtual).text('Encerrar conversa');
    $('#btn-export-csv').on('click', exportConversationCsv);
    $('#btn-export-xls').on('click', exportConversationXls);
    $('#btn-export-pdf').on('click', exportConversationPdf);
});

function filtrarConversas(termo = '') {
    const busca = String(termo || '').toLowerCase().trim();
    if (!busca) return conversas;

    return conversas.filter((c) =>
        String(c.display_name || '').toLowerCase().includes(busca) ||
        String(c.summary || '').toLowerCase().includes(busca) ||
        String(c.last_message || '').toLowerCase().includes(busca)
    );
}

function normalizarConversa(conversation) {
    const metadata = conversation?.metadata || {};
    const audit = conversation?.audit_trail || {};
    return {
        ...conversation,
        display_name: conversation.display_name || metadata.parent_name || metadata.school_name || conversation.user_id,
        origin_label: conversation.channel === 'webchat' ? 'Webchat' : (conversation.channel || 'Canal'),
        area_label: audit.assistant_name || metadata.agent_title || metadata.routed_agent || metadata.agent_key || 'Assistente Publico',
        status_label: statusLabels[conversation.status] || conversation.status || 'Sem status'
    };
}

async function carregarConversas() {
    try {
        const res = await fetch('/api/webchat/conversations');
        const body = await res.json();
        conversas = Array.isArray(body?.conversations) ? body.conversations.map(normalizarConversa) : [];
        updateKnownConversations(conversas, false);
        updateDocumentTitle();
        renderizarContatos(filtrarConversas($('#search-chat').val()));

        if (contatoAtivoId) {
            await selecionarChat(contatoAtivoId, true);
        }
    } catch (_) {
        $('#contact-list').html('<div class="p-3 text-muted small">Nao foi possivel carregar as conversas.</div>');
    }
}

async function carregarConversasSilencioso() {
    try {
        const res = await fetch('/api/webchat/conversations');
        const body = await res.json();
        conversas = Array.isArray(body?.conversations) ? body.conversations.map(normalizarConversa) : [];
        updateKnownConversations(conversas, true);
        updateDocumentTitle();
        renderizarContatos(filtrarConversas($('#search-chat').val()));

        if (contatoAtivoId) {
            await selecionarChat(contatoAtivoId, true);
        }
    } catch (_) {}
}

function updateKnownConversations(lista, shouldNotify) {
    const nextIds = new Set(lista.map((item) => item.id));
    if (shouldNotify) {
        const novos = lista.filter((item) => !knownConversationIds.has(item.id));
        if (novos.length) {
            const maisRecente = novos[0];
            Swal.fire({
                toast: true,
                position: 'top-end',
                timer: 5000,
                timerProgressBar: true,
                showConfirmButton: false,
                icon: 'info',
                title: 'Nova conversa com IA',
                text: `${maisRecente.display_name || 'Solicitante'} iniciou atendimento`
            });
        }
    }
    knownConversationIds = nextIds;
}

function updateDocumentTitle() {
    const ativas = conversas.filter((item) => item.status === 'AI_ACTIVE').length;
    document.title = ativas > 0
        ? `(${ativas}) Gerenciador de Chats`
        : defaultDocumentTitle;
}

function renderizarContatos(lista = conversas) {
    const container = $('#contact-list');
    container.empty();

    if (!lista.length) {
        container.html('<div class="p-3 text-muted small">Nenhuma conversa automatizada registrada.</div>');
        return;
    }

    lista.forEach((c) => {
        const badgeClass = c.origin_label === 'Webchat' ? 'badge-info' : 'badge-primary';
        const statusClass = c.status === 'AI_ACTIVE' ? 'badge-success' : 'badge-secondary';
        const html = `
            <div class="contact-item ${contatoAtivoId === c.id ? 'active' : ''}" onclick="selecionarChat('${escapeHtml(c.id)}')">
                <div class="d-flex justify-content-between align-items-start">
                    <strong>${escapeHtml(c.display_name)}</strong>
                    <span class="badge ${badgeClass} origin-badge">${escapeHtml(c.origin_label)}</span>
                </div>
                <div class="small text-muted mt-1">${escapeHtml(c.area_label)}</div>
                <div class="text-muted small text-truncate mt-1">${escapeHtml(c.last_message || c.summary || 'Conversa com assistente institucional.')}</div>
                <div class="mt-2">
                    <span class="badge ${statusClass}">${escapeHtml(c.status_label)}</span>
                </div>
            </div>
        `;
        container.append(html);
    });
}

async function selecionarChat(id, silent = false) {
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
        const res = await fetch(`/api/webchat/conversations/${encodeURIComponent(id)}`);
        const body = await res.json();
        const conversation = normalizarConversa(body?.conversation || {});
        conversaAtiva = conversation;

        const stillExists = (conversation.transcript || []).some((message) => message.id === previousAuditMessageId && message.clickable_audit);
        if (stillExists) {
            auditMessageAtivoId = previousAuditMessageId;
        } else {
            const firstAuditableMessage = (conversation.transcript || []).find((message) => message.clickable_audit);
            auditMessageAtivoId = firstAuditableMessage?.id || null;
        }

        $('#active-contact-name').html(`
            <div>
                <div>${escapeHtml(conversation.display_name || 'Conversa')}</div>
                <div class="small text-muted mt-1">
                    ${escapeHtml(conversation.area_label)} · ${escapeHtml(conversation.status_label)}
                </div>
            </div>
        `);
        $('#btn-resolve-chat').prop('disabled', conversation.status !== 'AI_ACTIVE');
        updateExportButtons();
        renderizarHistorico(conversation);
        renderizarAuditoria(conversation);
        renderizarContatos(filtrarConversas($('#search-chat').val()));
    } catch (_) {
        $('#chat-window').html('<div class="text-center text-danger small">Falha ao carregar a conversa.</div>');
        $('#chat-audit-panel').html('<div class="audit-empty">Falha ao montar a trilha auditavel.</div>');
        updateExportButtons();
    }
}

function renderizarHistorico(conversation) {
    const transcriptHtml = (conversation.transcript || []).map((message) => {
        const cssClass = message.role === 'user' ? 'msg-in' : 'msg-out';
        const label = message.role === 'assistant'
            ? (message.source || 'Assistente')
            : message.role === 'system'
                ? 'Sistema'
                : 'Solicitante';
        const clickableClass = message.clickable_audit ? ' audit-clickable' : '';
        const activeClass = message.id === auditMessageAtivoId ? ' audit-selected' : '';
        const clickHandler = message.clickable_audit
            ? `onclick="selecionarAuditoriaMensagem('${escapeHtml(message.id)}')"`
            : '';
        return `
            <div class="message ${cssClass}${clickableClass}${activeClass}" ${clickHandler}>
                <div class="small font-weight-bold mb-1">${escapeHtml(label)}</div>
                <div>${escapeHtml(message.text)}</div>
            </div>
        `;
    }).join('');

    $('#chat-window').html(transcriptHtml || '<div class="text-center text-muted py-5">Sem mensagens nesta conversa.</div>');
    const chatWin = document.getElementById('chat-window');
    chatWin.scrollTop = chatWin.scrollHeight;
}

function renderizarAuditoria(conversation) {
    const selectedMessage = (conversation?.transcript || []).find((message) => message.id === auditMessageAtivoId && message.audit);
    const audit = selectedMessage?.audit || conversation.audit_trail || {};
    const supportingSource = audit.supporting_source || null;
    const consultedSources = Array.isArray(audit.consulted_sources) ? audit.consulted_sources : [];
    const events = Array.isArray(audit.formal_events) ? audit.formal_events : [];

    const consultedSourcesHtml = consultedSources.length
        ? consultedSources.map((source) => `
            <div class="audit-source-item">
                <div class="font-weight-bold mb-1">${escapeHtml(source.source_title || 'Fonte institucional')}</div>
                <div class="small text-muted mb-2">Versao: ${escapeHtml(source.source_version_label || 'sem versao')}</div>
                <div class="small">${escapeHtml(source.source_excerpt || 'Sem trecho registrado.')}</div>
            </div>
        `).join('')
        : '<div class="audit-empty">Nenhuma fonte consultada foi registrada para esta resposta.</div>';

    const eventsHtml = events.length
        ? events.map((event) => `
            <div class="audit-event-item">
                <div class="small font-weight-bold">${escapeHtml(event.event_type || 'EVENTO')}</div>
                <div class="small text-muted mb-1">${escapeHtml(formatDateTime(event.created_at))}</div>
                <div class="small">${escapeHtml(event.summary || '')}</div>
            </div>
        `).join('')
        : '<div class="audit-empty">Sem eventos adicionais de auditoria.</div>';

    $('#chat-audit-panel').html(`
        <div class="audit-section">
            <div class="audit-label">Pergunta Original</div>
            <div class="audit-box">${escapeHtml(audit.original_question || 'Pergunta original nao registrada.')}</div>
            <div class="small text-muted mt-2">${selectedMessage ? 'Painel vinculado a resposta clicada no historico.' : 'Selecione uma resposta da IA no historico para ver a trilha exata dela.'}</div>
        </div>

        <div class="audit-section">
            <div class="audit-label">Resposta da IA</div>
            <div class="audit-box">${escapeHtml(audit.response_text || 'Resposta nao registrada.')}</div>
        </div>

        <div class="audit-section">
            <div class="audit-label">Evidencias</div>
            <div class="audit-box mb-2">
                <div><strong>Fonte principal:</strong> ${escapeHtml(supportingSource?.source_title || 'Nao definida')}</div>
                <div><strong>Versao:</strong> ${escapeHtml(supportingSource?.source_version_label || 'Nao definida')}</div>
                <div><strong>Publicada em:</strong> ${escapeHtml(formatDateTime(supportingSource?.published_at))}</div>
                <div><strong>Trecho usado:</strong> ${escapeHtml(supportingSource?.source_excerpt || 'Nao registrado')}</div>
            </div>
            ${consultedSourcesHtml}
        </div>

        <div class="audit-section">
            <div class="audit-label">Auditoria</div>
            <div class="audit-meta mb-2">
                <div class="audit-box">
                    <div class="audit-label">Quem perguntou</div>
                    <div>${escapeHtml(audit.requester_name || '-')}</div>
                    <div class="small text-muted">${escapeHtml(audit.requester_id || '-')}</div>
                </div>
                <div class="audit-box">
                    <div class="audit-label">Quando e canal</div>
                    <div>${escapeHtml(formatDateTime(audit.asked_at))}</div>
                    <div class="small text-muted">${escapeHtml(audit.channel || '-')} · ${escapeHtml(audit.requester_profile || '-')}</div>
                </div>
                <div class="audit-box">
                    <div class="audit-label">Assistente</div>
                    <div>${escapeHtml(audit.assistant_name || '-')}</div>
                    <div class="small text-muted">Tipo: ${escapeHtml(formatResponseMode(audit.response_mode || 'AUTOMATIC'))}</div>
                </div>
                <div class="audit-box">
                    <div class="audit-label">Confianca</div>
                    <div>${escapeHtml(formatConfidence(audit.confidence_score))}</div>
                    <div class="small text-muted">Entregue em ${escapeHtml(formatDateTime(audit.delivered_at))}</div>
                </div>
            </div>
            <div class="d-flex flex-wrap" style="gap: 8px;">
                <span class="audit-chip">Fallback humano: ${audit.fallback_to_human ? 'sim' : 'nao'}</span>
                <span class="audit-chip">Resposta corrigida depois: ${audit.corrected ? 'sim' : 'nao'}</span>
                ${audit.corrected_at ? `<span class="audit-chip">Corrigida em: ${escapeHtml(formatDateTime(audit.corrected_at))}</span>` : ''}
                ${audit.corrected_by ? `<span class="audit-chip">Corrigida por: ${escapeHtml(audit.corrected_by)}</span>` : ''}
            </div>
        </div>

        <div class="audit-section">
            <div class="audit-label">Eventos da Trilha</div>
            <div class="audit-box">${eventsHtml}</div>
        </div>
    `);
}

function selecionarAuditoriaMensagem(messageId) {
    auditMessageAtivoId = messageId;
    if (!conversaAtiva) return;
    renderizarHistorico(conversaAtiva);
    renderizarAuditoria(conversaAtiva);
}

async function enviarMensagem() {
    Swal.fire('Informacao', 'Resposta humana desabilitada. Este canal opera apenas com assistentes institucionais.', 'info');
}

async function encerrarConversaAtual() {
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
        const res = await fetch(`/api/webchat/conversations/${encodeURIComponent(contatoAtivoId)}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: String(finalText || '').trim()
            })
        });
        const body = await res.json();
        if (!res.ok) {
            throw new Error(body?.error || 'Falha ao encerrar conversa.');
        }

        await selecionarChat(contatoAtivoId, true);
        await carregarConversasSilencioso();
    } catch (err) {
        Swal.fire('Erro', err.message || 'Nao foi possivel encerrar a conversa.', 'error');
    }
}

window.selecionarChat = selecionarChat;
window.selecionarAuditoriaMensagem = selecionarAuditoriaMensagem;
window.enviarMensagem = enviarMensagem;
