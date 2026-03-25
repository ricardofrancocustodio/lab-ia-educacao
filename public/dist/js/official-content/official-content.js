const OfficialContentPage = (() => {
  // Funções auxiliares
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  const state = { schoolId: null, contextSchoolId: null, records: {}, effectiveRole: '', history: {}, context: null, institutions: [], calendarImportedFileName: { network: null, school: null }, enrollmentScope: 'network' };
  const SUPPORT_MODULE_CONFIG = {
    enrollment: {
      scopeKey: 'school',
      title: 'Matricula e Documentos Exigidos',
      statusSelectId: 'enrollment-status-select',
      statusBadgeId: 'enrollment-status-badge',
      versionGridId: 'enrollment-version-grid',
      historyId: 'enrollment-history',
      shellTarget: '#official-enrollment .card-body',
      helpTitle: 'Como publicar este modulo',
      helpText: 'Estruture regras, periodos e documentos exigidos. Ao salvar, o sistema gera uma versao tecnica rastreavel para consulta humana e uso da IA.'
    },
    notices: {
      scopeKey: 'school',
      title: 'Comunicados Oficiais',
      statusSelectId: 'notices-status-select',
      statusBadgeId: 'notices-status-badge',
      versionGridId: 'notices-version-grid',
      historyId: 'notices-history',
      shellTarget: '#official-notices .card-body',
      helpTitle: 'Como publicar este modulo',
      helpText: 'Use este bloco para avisos temporarios, campanhas, suspensoes e comunicados administrativos com vigencia definida.'
    }
  };
  const CALENDAR_COLUMNS = ['start_date', 'end_date', 'title', 'event_type', 'audience', 'location', 'shift', 'required_action', 'notes', 'source_reference'];
  const NETWORK_EDIT_ROLES = new Set(['superadmin', 'network_manager', 'content_curator']);
  const SCHOOL_EDIT_ROLES = new Set(['superadmin', 'network_manager', 'content_curator', 'secretariat', 'direction', 'coordination']);
  const CALENDAR_COLUMN_LABELS = {
    start_date: 'data_inicio',
    end_date: 'data_fim',
    title: 'titulo',
    event_type: 'tipo_evento',
    audience: 'publico',
    location: 'local',
    shift: 'turno',
    required_action: 'acao_necessaria',
    notes: 'observacoes',
    source_reference: 'fonte_referencia'
  };
  const CALENDAR_MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const CALENDAR_HEADER_ALIASES = {
    start_date: 'start_date',
    data_inicio: 'start_date',
    data_inicial: 'start_date',
    inicio: 'start_date',
    data: 'start_date',
    end_date: 'end_date',
    data_fim: 'end_date',
    data_final: 'end_date',
    fim: 'end_date',
    termino: 'end_date',
    término: 'end_date',
    title: 'title',
    titulo: 'title',
    título: 'title',
    evento: 'title',
    nome_evento: 'title',
    event_type: 'event_type',
    tipo_evento: 'event_type',
    tipo: 'event_type',
    categoria: 'event_type',
    audience: 'audience',
    publico: 'audience',
    público: 'audience',
    publico_alvo: 'audience',
    público_alvo: 'audience',
    location: 'location',
    local: 'location',
    unidade: 'location',
    shift: 'shift',
    turno: 'shift',
    required_action: 'required_action',
    acao_necessaria: 'required_action',
    ação_necessaria: 'required_action',
    acao: 'required_action',
    ação: 'required_action',
    notes: 'notes',
    observacoes: 'notes',
    observação: 'notes',
    observacoes_gerais: 'notes',
    source_reference: 'source_reference',
    fonte_referencia: 'source_reference',
    fonte: 'source_reference',
    referencia: 'source_reference',
    referência: 'source_reference'
  };

  function key(moduleKey, scopeKey) {
    return `${moduleKey}::${scopeKey}`;
  }

  function getSchoolId() {
    return sessionStorage.getItem('SCHOOL_ID') || '';
  }

  function getRequestedSchoolId() {
    return String(state.contextSchoolId || state.schoolId || '').trim();
  }

  function normalizeRoleKey(role) {
    return String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  }

  function getEffectiveRole() {
    return normalizeRoleKey(sessionStorage.getItem('EFFECTIVE_ROLE') || sessionStorage.getItem('PLATFORM_ROLE') || sessionStorage.getItem('USER_ROLE'));
  }

  function canEditScope(scopeKey) {
    const role = state.effectiveRole || getEffectiveRole();
    return scopeKey === 'network' ? NETWORK_EDIT_ROLES.has(role) : SCHOOL_EDIT_ROLES.has(role);
  }

  async function getAuthHeaders(extraHeaders = {}) {
    const token = await window.getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-school-id': getRequestedSchoolId(),
      ...extraHeaders
    };
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: await getAuthHeaders(options.headers || {})
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) {
      throw new Error(json.error || `HTTP ${response.status}`);
    }
    return json;
  }

  function setRecord(record) {
    if (!record?.module_key || !record?.scope_key) return;
    state.records[key(record.module_key, record.scope_key)] = record;
  }

  function getRecord(moduleKey, scopeKey) {
    return state.records[key(moduleKey, scopeKey)] || null;
  }

  function setHistory(moduleKey, scopeKey, items) {
    state.history[key(moduleKey, scopeKey)] = Array.isArray(items) ? items : [];
  }

  function getHistory(moduleKey, scopeKey) {
    return state.history[key(moduleKey, scopeKey)] || [];
  }

  function getEnrollmentRecord(scopeKey) {
    return getRecord('enrollment', scopeKey);
  }

  function getEnrollmentScopeKey(scopeKey) {
    return scopeKey === 'school' ? 'school' : 'network';
  }

  function getEnrollmentElement(baseId, scopeKey = 'network') {
    const scopedId = `${baseId}-${getEnrollmentScopeKey(scopeKey)}`;
    return document.getElementById(scopedId) || document.getElementById(baseId);
  }

  function getEnrollmentDom(scopeKey = 'network') {
    const scope = getEnrollmentScopeKey(scopeKey);
    return {
      scope,
      wrapper: getEnrollmentElement('enrollment-scope-wrapper', scope),
      documentTitle: getEnrollmentElement('enrollment-document-title', scope),
      statusCard: getEnrollmentElement('enrollment-status-card', scope),
      statusLabel: getEnrollmentElement('enrollment-status-label', scope),
      scopeLabel: getEnrollmentElement('enrollment-scope-label', scope),
      validityLabel: getEnrollmentElement('enrollment-validity-label', scope),
      publishedLabel: getEnrollmentElement('enrollment-published-label', scope),
      fileInput: getEnrollmentElement('enrollment-file', scope),
      period: getEnrollmentElement('enrollment-period', scope),
      reenrollmentPeriod: getEnrollmentElement('reenrollment-period', scope),
      target: getEnrollmentElement('enrollment-target', scope),
      required: getEnrollmentElement('enrollment-required', scope),
      optional: getEnrollmentElement('enrollment-optional', scope),
      rules: getEnrollmentElement('enrollment-rules', scope),
      link: getEnrollmentElement('enrollment-link', scope),
      summary: getEnrollmentElement('enrollment-summary', scope),
      faqFile: getEnrollmentElement('enrollment-faq-file', scope),
      faqItems: getEnrollmentElement('enrollment-faq-items', scope),
      faqEmpty: getEnrollmentElement('enrollment-faq-empty', scope)
    };
  }


  function setEnrollmentScope(scopeKey) {
    if (scopeKey !== 'network' && scopeKey !== 'school') return;
    state.enrollmentScope = scopeKey;
    const wrapper = getEnrollmentDom(scopeKey).wrapper;
    if (wrapper) {
      wrapper.dataset.activeScope = scopeKey;
    }
    fillEnrollment(scopeKey);
    fillEnrollmentFaq(scopeKey);
  }

  function getCurrentEnrollmentScope() {
    return state.enrollmentScope || 'network';
  }

  function setCalendarFileName(scopeKey, fileName) {
    if (!scopeKey) return;
    state.calendarImportedFileName[scopeKey] = String(fileName || '').trim() || null;
  }

  function normalizeInstitutionType(value) {
    return String(value || 'education_department').trim().toLowerCase() || 'education_department';
  }

  function getInstitutionTypeLabel(value) {
    return normalizeInstitutionType(value) === 'school_unit' ? 'Unidade escolar' : 'Rede / Secretaria';
  }

  function buildInstitutionOptionLabel(item = {}) {
    const typeLabel = getInstitutionTypeLabel(item.institution_type);
    const parent = String(item.parent_name || '').trim();
    return parent ? `${item.name} (${typeLabel} | ${parent})` : `${item.name} (${typeLabel})`;
  }

  function ensureContextUI() {
    if (document.getElementById('official-context-summary')) return;
    const loading = document.getElementById('official-loading');
    if (!loading || !loading.parentElement) return;
    const wrap = document.createElement('div');
    wrap.className = 'alert alert-light border d-flex flex-column flex-lg-row justify-content-between align-items-lg-start';
    wrap.style.gap = '16px';
    wrap.style.borderRadius = '14px';
    wrap.style.marginBottom = '1rem';
    wrap.innerHTML = `
      <div id="official-context-summary" style="color:#17324d;font-size:.92rem;">
        <strong style="display:block;margin-bottom:4px;">Carregando contexto institucional...</strong>
        <span>Identificando a rede e a unidade vinculadas a este perfil.</span>
      </div>
      <div id="official-context-picker-wrap" style="display:none;min-width:300px;max-width:420px;width:100%;">
        <label for="official-context-picker" style="font-size:.85rem;font-weight:600;color:#17324d;margin-bottom:6px;display:block;">Contexto institucional do superadmin</label>
        <select id="official-context-picker" class="form-control"></select>
        <small style="display:block;color:#5f6b7a;margin-top:6px;">Ao selecionar uma unidade escolar, o bloco de rede usa automaticamente a secretaria/rede pai.</small>
      </div>`;
    loading.parentElement.insertBefore(wrap, loading);
  }

  function renderContextSummary() {
    ensureContextUI();
    const summary = document.getElementById('official-context-summary');
    if (!summary) return;
    const context = state.context || {};
    const requested = context.requested_school || null;
    const networkScope = context.network_scope || null;
    const schoolScope = context.school_scope || null;
    const requestedName = requested?.name || 'Instituicao atual';
    const networkName = networkScope?.name || requestedName;
    const schoolName = schoolScope?.name || requestedName;
    const intro = state.effectiveRole === 'superadmin'
      ? 'Superadmin operando em um contexto institucional explicito.'
      : 'O sistema separa automaticamente o que e documento da rede e o que e documento local.';
    const legacyNote = context.using_legacy_network_fallback
      ? '<div class="mt-2 text-warning">Foi encontrado um calendario de rede legado salvo na propria unidade. Ao salvar novamente, ele passa a valer no nivel da rede.</div>'
      : '';
    summary.innerHTML = `
      <strong style="display:block;margin-bottom:4px;">${requestedName}</strong>
      <span>${intro}</span>
      <div class="mt-2">
        <span><strong>Rede:</strong> ${networkName}</span><br>
        <span><strong>Escopo local:</strong> ${schoolName}</span>
      </div>
      ${legacyNote}`;
  }

  function renderContextPicker() {
    ensureContextUI();
    const wrap = document.getElementById('official-context-picker-wrap');
    const select = document.getElementById('official-context-picker');
    if (!wrap || !select) return;
    const isSuperadmin = state.effectiveRole === 'superadmin';
    wrap.style.display = isSuperadmin ? '' : 'none';
    if (!isSuperadmin) return;
    const options = (state.institutions || []).map((item) => {
      const selected = String(item.id) === String(getRequestedSchoolId()) ? ' selected' : '';
      return `<option value="${item.id}"${selected}>${buildInstitutionOptionLabel(item)}</option>`;
    }).join('');
    select.innerHTML = options;
    if (select.dataset.bound !== '1') {
      select.dataset.bound = '1';
      select.addEventListener('change', async () => {
        state.contextSchoolId = select.value || state.schoolId;
        await load();
      });
    }
  }

  function splitCsvRow(line) {
    const cells = [];
    let current = '';
    let insideQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (insideQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function escapeCsvValue(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (/[,"\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  }

  function normalizeHeaderName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function toInternalCalendarColumn(value) {
    const normalized = normalizeHeaderName(value);
    return CALENDAR_HEADER_ALIASES[normalized] || '';
  }

  function normalizeCalendarEntry(entry = {}) {
    const startDate = String(entry.start_date || entry.startDate || entry.date || '').trim();
    const endDate = String(entry.end_date || entry.endDate || entry.date || startDate).trim();
    return {
      start_date: startDate,
      end_date: endDate,
      date: startDate,
      title: String(entry.title || '').trim(),
      event_type: String(entry.event_type || entry.type || '').trim(),
      type: String(entry.event_type || entry.type || '').trim(),
      audience: String(entry.audience || '').trim(),
      location: String(entry.location || '').trim(),
      shift: String(entry.shift || '').trim(),
      required_action: String(entry.required_action || '').trim(),
      notes: String(entry.notes || '').trim(),
      source_reference: String(entry.source_reference || entry.source || '').trim()
    };
  }

  function validateCalendarHeader(header) {
    const missing = [];
    if (!header.includes('start_date')) missing.push('data_inicio');
    if (!header.includes('title')) missing.push('titulo');
    if (missing.length) {
      throw new Error(`CSV invalido. Faltam coluna(s) obrigatoria(s): ${missing.join(', ')}. Baixe o template em portugues para evitar erro.`);
    }
  }

  function parseCalendarCsv(value) {
    const lines = String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = splitCsvRow(lines[0]).map((item) => toInternalCalendarColumn(item));
    validateCalendarHeader(header);
    return lines.slice(1).map((line) => {
      const row = splitCsvRow(line);
      const entry = {};
      header.forEach((column, index) => {
        if (column) entry[column] = row[index] || '';
      });
      return normalizeCalendarEntry(entry);
    }).filter((entry) => entry.start_date || entry.title || entry.notes);
  }

  function parseCalendarLines(value) {
    const text = String(value || '').trim();
    if (!text) return [];
    const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
    const normalizedFirstLine = normalizeHeaderName(firstLine);
    if (normalizedFirstLine.includes('data_inicio') || normalizedFirstLine.includes('start_date') || normalizedFirstLine.includes('tipo_evento') || normalizedFirstLine.includes('event_type') || normalizedFirstLine.includes('fonte_referencia') || normalizedFirstLine.includes('source_reference')) {
      return parseCalendarCsv(text);
    }
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [date = '', title = '', type = '', notes = ''] = line.split('|').map((item) => item.trim());
      return normalizeCalendarEntry({ start_date: date, end_date: date, title, event_type: type, notes });
    }).filter((entry) => entry.start_date || entry.title || entry.notes);
  }

  function stringifyCalendarCsv(entries = []) {
    const rows = [CALENDAR_COLUMNS.map((column) => CALENDAR_COLUMN_LABELS[column]).join(',')];
    entries.map((item) => normalizeCalendarEntry(item)).forEach((entry) => {
      rows.push(CALENDAR_COLUMNS.map((column) => escapeCsvValue(entry[column])).join(','));
    });
    return rows.join('\n');
  }

  function splitLines(value) {
    return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }

  function formatDateTimeLabel(value) {
    if (!value) return 'Nao publicado ainda';
    try {
      return new Date(value).toLocaleString('pt-BR');
    } catch (_error) {
      return String(value);
    }
  }

  function getCalendarDateParts(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return { year: '', month: -1, day: '' };
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return { year: normalized.slice(0, 4), month: Number(normalized.slice(5, 7)) - 1, day: normalized.slice(8, 10) };
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
      return { year: normalized.slice(6, 10), month: Number(normalized.slice(3, 5)) - 1, day: normalized.slice(0, 2) };
    }
    return { year: '', month: -1, day: '' };
  }

  function compareCalendarEntries(a, b) {
    const left = getCalendarDateParts(a?.start_date || '');
    const right = getCalendarDateParts(b?.start_date || '');
    return String(left.year).localeCompare(String(right.year)) || left.month - right.month || String(left.day).localeCompare(String(right.day));
  }

  function formatShortId(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return '-';
    return normalized.length > 12 ? normalized.slice(0, 8) + '...' + normalized.slice(-4) : normalized;
  }

  function getKnowledgeSyncLabel(record) {
    return record?._source_version_meta?.id || record?._source_document_meta?.id || record?.source_version_id || record?.source_document_id
      ? 'Sim, vinculada a base oficial'
      : 'Sera criada ao salvar';
  }

  function getTechnicalDocumentLabel(record) {
    const fileName = String(record?._source_version_meta?.file_name || '').trim();
    const documentTitle = String(record?._source_document_meta?.title || '').trim();
    if (fileName) return fileName;
    if (documentTitle) return documentTitle;
    return formatShortId(record?._source_version_meta?.id || record?.source_version_id || record?._source_document_meta?.id || record?.source_document_id);
  }

  function getCalendarStatusLabel(record) {
    const status = String(record?.status || 'draft').toLowerCase();
    if (status === 'published') return 'Publicado';
    if (status === 'archived') return 'Arquivado';
    return 'Rascunho';
  }

  function getCalendarStatusBadgeClass(record) {
    const status = String(record?.status || 'draft').toLowerCase();
    if (status === 'published') return 'badge-success';
    if (status === 'archived') return 'badge-secondary';
    return 'badge-warning';
  }

  function inferCalendarYear(entries = []) {
    const firstWithYear = entries.find((item) => getCalendarDateParts(item.start_date).year);
    return firstWithYear ? getCalendarDateParts(firstWithYear.start_date).year : 'sem ano definido';
  }

  function getCalendarTypeColor(type) {
    const normalized = normalizeHeaderName(type);
    if (normalized.includes('recesso') || normalized.includes('ferias') || normalized.includes('feriado') || normalized.includes('suspens')) return '#b91c1c';
    if (normalized.includes('reuniao') || normalized.includes('conselho') || normalized.includes('encontro')) return '#d97706';
    if (normalized.includes('evento') || normalized.includes('institucional') || normalized.includes('comunidade')) return '#2563eb';
    return '#1f7a3e';
  }

  function getModuleItemCount(moduleKey, record) {
    const payload = record?.content_payload || {};
    if (moduleKey === 'faq') return Array.isArray(payload.items) ? payload.items.length : 0;
    if (moduleKey === 'notices') return Array.isArray(payload.items) ? payload.items.length : 0;
    if (moduleKey === 'enrollment') {
      return (Array.isArray(payload.required_documents) ? payload.required_documents.length : 0)
        + (Array.isArray(payload.optional_documents) ? payload.optional_documents.length : 0);
    }
    return 0;
  }

  function ensureSupportModuleShells() {
    Object.entries(SUPPORT_MODULE_CONFIG).forEach(([moduleKey, config]) => {
      const host = document.querySelector(config.shellTarget);
      if (!host || host.querySelector('.official-version-box')) return;

      const shell = document.createElement('div');
      shell.innerHTML =         '<div class="official-version-box">' +
          '<div class="d-flex justify-content-between align-items-start flex-wrap">' +
            '<div>' +
              '<strong>Estado da publicacao</strong>' +
              '<p class="official-help mb-0 mt-1">' + config.helpText + '</p>' +
            '</div>' +
            '<span class="badge badge-light border" id="' + config.statusBadgeId + '">Aguardando carregamento</span>' +
          '</div>' +
          '<div class="official-version-grid" id="' + config.versionGridId + '"></div>' +
          '<div class="official-toolbar mt-3 mb-2">' +
            '<select id="' + config.statusSelectId + '" class="form-control form-control-sm" style="max-width:220px;">' +
              '<option value="draft">Rascunho</option>' +
              '<option value="published">Publicado</option>' +
              '<option value="archived">Arquivado</option>' +
            '</select>' +
            '<button class="btn btn-outline-secondary btn-sm" onclick="OfficialContentPage.updateModuleStatus(&quot;' + moduleKey + '&quot;)">Atualizar status</button>' +
          '</div>' +
          '<div id="' + config.historyId + '" class="official-list"></div>' +
        '</div>' +
        '<div class="official-template">' +
          '<strong>' + config.helpTitle + '</strong>' +
          '<p class="official-help mb-0 mt-2">' + config.helpText + '</p>' +
        '</div>';
      host.insertBefore(shell, host.firstChild);
    });
  }

  function renderSupportModuleVersion(moduleKey) {
    const config = SUPPORT_MODULE_CONFIG[moduleKey];
    if (!config) return;
    const record = getRecord(moduleKey, config.scopeKey);
    const grid = document.getElementById(config.versionGridId);
    const badge = document.getElementById(config.statusBadgeId);
    const select = document.getElementById(config.statusSelectId);
    if (!grid || !badge || !select) return;

    const statusLabel = getCalendarStatusLabel(record);
    badge.textContent = statusLabel;
    badge.className = 'badge border ' + getCalendarStatusBadgeClass(record);
    select.value = String(record?.status || 'draft').toLowerCase();
    const sourceVersion = record?._source_version_meta;
    const currentPublishedFile = sourceVersion?.file_name || 'Sem arquivo definido';
    const cards = [
      { label: 'Versao atual', value: sourceVersion?.version_label || statusLabel },
      { label: 'Arquivo publicado', value: currentPublishedFile },
      { label: 'Ultima atualizacao', value: formatDateTimeLabel(record?.updated_at) },
      { label: 'Fonte sincronizada', value: getKnowledgeSyncLabel(record) },
      { label: 'Documento tecnico', value: getTechnicalDocumentLabel(record) },
      { label: 'Itens estruturados', value: String(getModuleItemCount(moduleKey, record)) },
      { label: 'Resumo oficial', value: record?.summary ? 'Preenchido' : 'Pendente' }
    ];
    grid.innerHTML = cards.map((item) =>       '<div class="official-version-item">' +
        '<div class="official-version-label">' + item.label + '</div>' +
        '<div class="official-version-value">' + (item.value || '-') + '</div>' +
      '</div>'
    ).join('');
  }

  function renderEnrollmentVersion(scopeKey = 'network') {
    const refs = getEnrollmentDom(scopeKey);
    const record = getEnrollmentRecord(scopeKey);
    if (!refs.statusLabel || !refs.scopeLabel || !refs.validityLabel || !refs.publishedLabel) return;
    const statusLabel = record?.status ? String(record.status).toUpperCase() : 'DRAFT';
    refs.statusLabel.textContent = statusLabel;
    refs.scopeLabel.textContent = scopeKey === 'network' ? 'Rede / Secretaria' : 'Escola / Unidade';
    const validFrom = formatDateTimeLabel(record?.content_payload?.validFrom || record?.validFrom);
    const validTo = formatDateTimeLabel(record?.content_payload?.validTo || record?.validTo);
    refs.validityLabel.textContent = (validFrom || '-') + ' até ' + (validTo || '-');
    refs.publishedLabel.textContent = formatDateTimeLabel(record?.published_at);
  }

  function renderSupportModuleHistory(moduleKey) {
    const config = SUPPORT_MODULE_CONFIG[moduleKey];
    if (!config) return;
    const list = document.getElementById(config.historyId);
    const history = getHistory(moduleKey, config.scopeKey);
    if (!list) return;
    if (!history.length) {
      list.innerHTML = '<div class="official-empty">Nenhuma versao anterior registrada ainda. Depois da primeira publicacao, o historico completo aparece aqui.</div>';
      return;
    }
    list.innerHTML = history.map((item) => {
      const currentBadge = item.is_current ? '<span class="badge badge-success ml-2">Em uso</span>' : '';
      return         '<div class="official-list-item">' +
          '<div class="d-flex justify-content-between align-items-start flex-wrap">' +
            '<div>' +
              '<strong>' + (item.version_label || 'Versao sem rotulo') + currentBadge + '</strong>' +
              '<div class="official-help mt-1">Status: ' + (item.status || '-') + ' | Publicado em: ' + formatDateTimeLabel(item.published_at) + ' | Responsavel: ' + (item.actor_name || '-') + ' | Arquivo: ' + (item.file_name || '-') + '</div>' +
            '</div>' +
            '<div class="mt-2 mt-lg-0">' +
              '<button class="btn btn-outline-primary btn-sm" ' + (item.snapshot_available ? '' : 'disabled') + ' onclick="OfficialContentPage.restoreModuleVersion(&quot;' + moduleKey + '&quot;, &quot;' + item.id + '&quot;)">Reativar esta versao</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function renderCalendarHistory(scopeKey) {
    const list = document.getElementById('calendar-' + scopeKey + '-history');
    const select = document.getElementById('calendar-' + scopeKey + '-status-select');
    const record = getRecord('calendar', scopeKey);
    const history = getHistory('calendar', scopeKey);
    if (select) select.value = String(record?.status || 'draft').toLowerCase();
    if (!list) return;
    if (!history.length) {
      list.innerHTML = '<div class="official-empty">Nenhuma versao anterior registrada ainda. A partir das proximas publicacoes, o historico completo aparecera aqui.</div>';
      return;
    }
    list.innerHTML = history.map((item) => {
      const canRestore = item.snapshot_available;
      const currentBadge = item.is_current ? '<span class="badge badge-success ml-2">Em uso</span>' : '';
      const status = item.status || '-';
      return `
        <div class="official-list-item">
          <div class="d-flex justify-content-between align-items-start flex-wrap">
            <div>
              <strong>${item.version_label || 'Versao sem rotulo'}${currentBadge}</strong>
              <div class="official-help mt-1">Status: ${status} | Publicado em: ${formatDateTimeLabel(item.published_at)} | Responsavel: ${item.actor_name || '-'} | Arquivo: ${item.file_name || '-'}</div>
            </div>
            <div class="mt-2 mt-lg-0">
              <button class="btn btn-outline-primary btn-sm" ${canRestore ? '' : 'disabled'} onclick="OfficialContentPage.restoreCalendarVersion('${scopeKey}', '${item.id}')">Reativar esta versao</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderCalendarVersion(scopeKey) {
    const record = getRecord('calendar', scopeKey);
    const grid = document.getElementById('calendar-' + scopeKey + '-version-grid');
    const badge = document.getElementById('calendar-' + scopeKey + '-status-badge');
    if (!grid || !badge) return;
    const entries = record?.content_payload?.entries || [];
    const statusLabel = getCalendarStatusLabel(record);
    badge.textContent = statusLabel;
    badge.className = 'badge border ' + getCalendarStatusBadgeClass(record);
    const sourceVersion = record?._source_version_meta;
    const currentPublishedFile = sourceVersion?.file_name || state.calendarImportedFileName[scopeKey] || 'Sem arquivo definido';
    const cards = [
      { label: 'Versao atual', value: sourceVersion?.version_label || statusLabel },
      { label: 'Arquivo publicado', value: currentPublishedFile },
      { label: 'Ultima atualizacao', value: formatDateTimeLabel(record?.updated_at) },
      { label: 'Fonte sincronizada', value: getKnowledgeSyncLabel(record) },
      { label: 'Documento tecnico', value: getTechnicalDocumentLabel(record) },
      { label: 'Quantidade de eventos', value: String(entries.length || 0) },
      { label: 'Ano de referencia', value: inferCalendarYear(entries) }
    ];
    grid.innerHTML = cards.map((item) => `
      <div class="official-version-item">
        <div class="official-version-label">${item.label}</div>
        <div class="official-version-value">${item.value || '-'}</div>
      </div>
    `).join('');
    renderCalendarHistory(scopeKey);
  }
  function renderCalendarPreview(scopeKey, entries = null) {
    const previewEl = document.getElementById('calendar-' + scopeKey + '-preview');
    const noteEl = document.getElementById('calendar-' + scopeKey + '-preview-note');
    const countEl = document.getElementById('calendar-' + scopeKey + '-preview-count');
    if (!previewEl || !noteEl || !countEl) return;
    const recordEntries = getRecord('calendar', scopeKey)?.content_payload?.entries || [];
    const sourceEntries = Array.isArray(entries) ? entries : recordEntries;
    const normalizedEntries = sourceEntries.map((item) => normalizeCalendarEntry(item)).filter((item) => item.start_date || item.title);
    countEl.textContent = normalizedEntries.length + ' evento' + (normalizedEntries.length === 1 ? '' : 's');
    if (!normalizedEntries.length) {
      previewEl.innerHTML = '<div class="official-calendar-empty">Nenhum evento estruturado ainda. Importe o CSV ou preencha algumas linhas para visualizar a apresentacao.</div>';
      noteEl.textContent = 'Depois de salvar, esta estrutura pode virar a tela publica do calendario com filtros e visualizacao por mes.';
      return;
    }
    const byMonth = new Map();
    normalizedEntries.forEach((entry) => {
      const month = getCalendarDateParts(entry.start_date).month;
      if (month >= 0 && month <= 11) {
        if (!byMonth.has(month)) byMonth.set(month, []);
        byMonth.get(month).push(entry);
      }
    });
    const monthsToShow = [...byMonth.keys()].sort((a, b) => a - b).slice(0, 6);
    previewEl.innerHTML = monthsToShow.map((monthIndex) => {
      const monthEntries = (byMonth.get(monthIndex) || []).sort(compareCalendarEntries).slice(0, 4);
      return `
        <div class="official-calendar-month">
          <div class="official-calendar-month-head">${CALENDAR_MONTH_LABELS[monthIndex]}</div>
          <div class="official-calendar-month-body">
            ${monthEntries.map((entry) => `
              <div class="official-calendar-event" style="border-left-color:${getCalendarTypeColor(entry.event_type)};">
                <div class="official-calendar-event-date">${entry.start_date}${entry.end_date && entry.end_date !== entry.start_date ? ' ate ' + entry.end_date : ''}</div>
                <div class="official-calendar-event-title">${entry.title || 'Evento sem titulo'}</div>
                <div class="official-calendar-event-meta">${entry.event_type || 'tipo livre'}${entry.audience ? ' • ' + entry.audience : ''}</div>
              </div>
            `).join('') || '<div class="official-calendar-empty">Sem eventos neste mes.</div>'}
          </div>
        </div>
      `;
    }).join('');
    noteEl.textContent = 'Esqueleto sugerido: cabecalho com filtros, blocos mensais e lista de eventos por escola/rede. Se houver mais meses, a tela publica pode carregar o restante sob demanda.';
  }

  function setReadOnlyState(selector, isReadOnly) {
    document.querySelectorAll(selector).forEach((el) => {
      if ('disabled' in el) el.disabled = isReadOnly;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.readOnly = isReadOnly;
      }
    });
  }

  function applyAccessRules() {
    const canEditNetwork = canEditScope('network');
    const canEditSchool = canEditScope('school');

    setReadOnlyState('#official-enrollment-network input, #official-enrollment-network textarea, #official-enrollment-school input, #official-enrollment-school textarea', !canEditSchool);
    setReadOnlyState('#official-notices input, #official-notices textarea', !canEditSchool);
    setReadOnlyState('#calendar-network-title, #calendar-network-summary, #calendar-network-lines', !canEditNetwork);
    setReadOnlyState('#calendar-school-title, #calendar-school-summary, #calendar-school-lines', !canEditSchool);

    document.querySelectorAll('#official-calendar-network button, #official-calendar-network input[type="file"], #official-calendar-school button, #official-calendar-school input[type="file"]').forEach((el) => {
      const isNetworkControl = ['calendar-network-file'].includes(el.id) || String(el.getAttribute('onclick') || '').includes("'network'");
      const canUse = isNetworkControl ? canEditNetwork : canEditSchool;
      el.disabled = !canUse;
    });

    document.querySelectorAll('#official-enrollment-network button, #official-enrollment-school button, #official-notices button').forEach((el) => {
      el.disabled = !canEditSchool;
    });

    const networkCard = document.querySelector('#official-calendar-network .official-card');
    if (networkCard && !canEditNetwork && !networkCard.querySelector('.official-readonly-note')) {
      const note = document.createElement('div');
      note.className = 'alert alert-light border official-readonly-note';
      note.textContent = 'Seu perfil pode consultar o conteudo da rede, mas nao pode edita-lo.';
      networkCard.querySelector('.card-body').insertAdjacentElement('afterbegin', note);
    }
  }

  function showLoadError(message) {
    const loading = document.getElementById('official-loading');
    if (!loading) return;
    loading.innerHTML = `
      <div class="text-center p-4">
        <div class="text-danger font-weight-bold mb-2">Falha ao carregar conteudo oficial</div>
        <div class="text-muted">${message || 'Erro inesperado no carregamento.'}</div>
      </div>`;
  }

  async function ensureSessionReady() {
    if (typeof window.initSession === 'function') {
      await window.initSession();
    }
    state.schoolId = getSchoolId();
    state.contextSchoolId = state.contextSchoolId || state.schoolId;
    state.effectiveRole = getEffectiveRole();
  }

  async function loadInstitutionOptionsIfNeeded() {
    ensureContextUI();
    if (state.effectiveRole !== 'superadmin') {
      state.institutions = [];
      renderContextPicker();
      return;
    }
    if (Array.isArray(state.institutions) && state.institutions.length) {
      renderContextPicker();
      return;
    }
    const data = await request('/api/official-content/institutions');
    state.institutions = Array.isArray(data.institutions) ? data.institutions : [];
    state.contextSchoolId = state.contextSchoolId || data.default_school_id || state.schoolId;
    renderContextPicker();
  }

  function toggleEmpty(kind, scopeKey = getCurrentEnrollmentScope()) {
    if (kind === 'notice') {
      const count = document.querySelectorAll('#notice-items .official-list-item').length;
      const empty = document.getElementById('notice-empty');
      if (empty) empty.style.display = count ? 'none' : 'block';
    }
    if (kind === 'enrollment-faq') {
      const refs = getEnrollmentDom(scopeKey);
      const count = refs.faqItems ? refs.faqItems.querySelectorAll('.official-list-item').length : 0;
      if (refs.faqEmpty) refs.faqEmpty.style.display = count ? 'none' : 'block';
    }
  }

  function createNoticeItem(item = {}) {
    const el = document.createElement('div');
    el.className = 'official-list-item';
    el.innerHTML = `
      <div class="row">
        <div class="col-md-5 form-group mb-2"><label>Titulo</label><input class="form-control notice-title" value="${item.title || ''}"></div>
        <div class="col-md-3 form-group mb-2"><label>Tipo</label><input class="form-control notice-type" value="${item.type || ''}"></div>
        <div class="col-md-2 form-group mb-2"><label>Inicio</label><input type="date" class="form-control notice-start" value="${item.start_date || ''}"></div>
        <div class="col-md-2 form-group mb-2"><label>Fim</label><input type="date" class="form-control notice-end" value="${item.end_date || ''}"></div>
        <div class="col-md-8 form-group mb-2"><label>Mensagem</label><textarea class="form-control notice-message" rows="3">${item.message || ''}</textarea></div>
        <div class="col-md-4 form-group mb-2"><label>Anexo / Link</label><input class="form-control notice-attachment" value="${item.attachment_url || ''}"></div>
      </div>
      <div class="text-right"><button type="button" class="btn btn-outline-danger btn-sm remove-item">Remover</button></div>`;
    el.querySelector('.remove-item').addEventListener('click', () => {
      el.remove();
      toggleEmpty('notice');
    });
    document.getElementById('notice-items').appendChild(el);
    toggleEmpty('notice');
  }

  function createEnrollmentFaqItem(scopeOrItem = 'network', maybeItem = {}) {
    const scopeKey = typeof scopeOrItem === 'string' ? getEnrollmentScopeKey(scopeOrItem) : getCurrentEnrollmentScope();
    const item = typeof scopeOrItem === 'string' ? (maybeItem || {}) : (scopeOrItem || {});
    const refs = getEnrollmentDom(scopeKey);
    const itemsEl = refs.faqItems;
    if (!itemsEl) {
      console.warn('enrollment-faq-items element not found for scope', scopeKey);
      return;
    }
    const el = document.createElement('div');
    el.className = 'official-list-item';
    el.style.borderLeft = '4px solid #007bff';
    el.style.paddingLeft = '12px';
    el.innerHTML = `
      <div class="row">
        <div class="col-md-8 form-group mb-2">
          <label><strong>Pergunta</strong></label>
          <input class="form-control enroll-faq-question" value="${escapeHtml(item.question || '')}" placeholder="Digite a pergunta">
        </div>
        <div class="col-md-4 form-group mb-2">
          <label><strong>Categoria</strong></label>
          <select class="form-control enroll-faq-category">
            <option value="Geral" ${item.category === 'Geral' ? 'selected' : ''}>Geral</option>
            <option value="Administrativo" ${item.category === 'Administrativo' ? 'selected' : ''}>Administrativo</option>
            <option value="Documentos" ${item.category === 'Documentos' ? 'selected' : ''}>Documentos</option>
            <option value="Períodos" ${item.category === 'Períodos' ? 'selected' : ''}>Períodos</option>
          </select>
        </div>
        <div class="col-md-12 form-group mb-2">
          <label><strong>Resposta</strong></label>
          <textarea class="form-control enroll-faq-answer" rows="3" placeholder="Digite a resposta">${escapeHtml(item.answer || '')}</textarea>
        </div>
      </div>
      <div class="text-right"><button type="button" class="btn btn-outline-danger btn-sm remove-item">Remover</button></div>`;
    el.querySelector('.remove-item').addEventListener('click', () => {
      el.remove();
      toggleEmpty('enrollment-faq', scopeKey);
    });
    itemsEl.appendChild(el);
    toggleEmpty('enrollment-faq', scopeKey);
  }

  function collectEnrollmentFaqItems(scopeKey = getCurrentEnrollmentScope()) {
    const refs = getEnrollmentDom(scopeKey);
    return [...(refs.faqItems ? refs.faqItems.querySelectorAll('.official-list-item') : [])].map((el) => ({
      question: el.querySelector('.enroll-faq-question').value,
      answer: el.querySelector('.enroll-faq-answer').value,
      category: el.querySelector('.enroll-faq-category').value
    })).filter((item) => item.question && item.answer);
  }

  function parseCSVLineEnrollment(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function fillCalendar(scopeKey) {
    const record = getRecord('calendar', scopeKey);
    if (!record) {
      renderCalendarVersion(scopeKey);
      renderCalendarPreview(scopeKey, []);
      return;
    }
    const entries = record.content_payload?.entries || [];
    document.getElementById(`calendar-${scopeKey}-title`).value = record.title || '';
    document.getElementById(`calendar-${scopeKey}-summary`).value = record.summary || '';
    document.getElementById(`calendar-${scopeKey}-lines`).value = stringifyCalendarCsv(entries);
    setCalendarFileName(scopeKey, record._source_version_meta?.file_name || record._source_document_meta?.title || null);
    renderCalendarVersion(scopeKey);
    renderCalendarPreview(scopeKey, entries);
  }

  function fillEnrollment(scopeKey = 'network') {
    const refs = getEnrollmentDom(scopeKey);
    const record = getEnrollmentRecord(scopeKey);
    renderEnrollmentVersion(scopeKey);
    if (!refs.period || !refs.reenrollmentPeriod || !refs.target || !refs.required || !refs.optional || !refs.rules || !refs.link || !refs.summary || !refs.documentTitle) {
      return;
    }
    if (!record) {
      refs.period.value = '';
      refs.reenrollmentPeriod.value = '';
      refs.target.value = '';
      refs.required.value = '';
      refs.optional.value = '';
      refs.rules.value = '';
      refs.link.value = '';
      refs.summary.value = '';
      refs.documentTitle.textContent = 'Nenhum documento cadastrado';
      return;
    }
    const payload = record.content_payload || {};
    refs.period.value = payload.enrollment_period || '';
    refs.reenrollmentPeriod.value = payload.reenrollment_period || '';
    refs.target.value = payload.target_audience || '';
    refs.required.value = (payload.required_documents || []).join('\n');
    refs.optional.value = (payload.optional_documents || []).join('\n');
    refs.rules.value = payload.special_rules || '';
    refs.link.value = payload.official_link || '';
    refs.summary.value = record.summary || '';
    refs.documentTitle.textContent = record.title || 'Documento carregado';
  }

  function fillEnrollmentFaq(scopeKey = getCurrentEnrollmentScope()) {
    try {
      const refs = getEnrollmentDom(scopeKey);
      const record = getRecord('enrollment', scopeKey);
      const itemsEl = refs.faqItems;
      if (!itemsEl) {
        console.warn('enrollment-faq-items element not found for scope', scopeKey);
        return;
      }
      itemsEl.innerHTML = '';
      (record?.faq_items || []).forEach((item) => {
        try {
          createEnrollmentFaqItem(scopeKey, item);
        } catch (e) {
          console.error('Error creating enrollment FAQ item:', e);
        }
      });
      toggleEmpty('enrollment-faq', scopeKey);
    } catch (error) {
      console.error('Error in fillEnrollmentFaq:', error);
    }
  }

  function fillNotices() {
    const itemsEl = document.getElementById('notice-items');
    if (itemsEl) itemsEl.innerHTML = '';
    const record = getRecord('notices', 'school');
    (record?.content_payload?.items || []).forEach(createNoticeItem);
    const summaryEl = document.getElementById('notices-summary');
    if (summaryEl) summaryEl.value = record?.summary || '';
    toggleEmpty('notice');
    renderSupportModuleVersion('notices');
  }

  async function load() {
    try {
      await ensureSessionReady();
      ensureContextUI();
      if (!state.schoolId) {
        Swal.fire('Atencao', 'School ID nao encontrado na sessao.', 'warning');
        showLoadError('School ID nao encontrado na sessao.');
        return;
      }
      await loadInstitutionOptionsIfNeeded();
      const data = await request('/api/official-content');
      state.context = data.context || null;
      renderContextSummary();
      renderContextPicker();
      ensureSupportModuleShells();
      state.records = {};
      (data.records || []).forEach(setRecord);
      fillCalendar('network');
      fillCalendar('school');
      await loadCalendarHistory('network');
      await loadCalendarHistory('school');
      fillEnrollment('network');
      fillEnrollment('school');
      fillEnrollmentFaq('network');
      fillEnrollmentFaq('school');
      fillNotices();
      await loadSupportModuleHistory('enrollment', 'network');
      await loadSupportModuleHistory('enrollment', 'school');
      await Promise.all(Object.keys(SUPPORT_MODULE_CONFIG).filter((m) => m !== 'enrollment').map(loadSupportModuleHistory));
      applyAccessRules();
      document.getElementById('official-loading').style.display = 'none';
      document.getElementById('official-content-root').style.display = '';
    } catch (error) {
      console.error('Falha ao inicializar Conteudo Oficial:', error);
      showLoadError(error?.message || 'Nao foi possivel carregar o conteudo oficial.');
      Swal.fire('Erro', error?.message || 'Nao foi possivel carregar o conteudo oficial.', 'error');
    }
  }

  async function save(moduleKey, scopeKey, title, summary, contentPayload, options = {}) {
    if (!canEditScope(scopeKey)) {
      throw new Error(scopeKey === 'network' ? 'Seu perfil nao pode editar conteudo oficial da rede.' : 'Seu perfil nao pode editar conteudo oficial da escola.');
    }
    const updatedBy = sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Gestao da escola';
    const data = await request(`/api/official-content/${moduleKey}/${scopeKey}`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        summary,
        content_payload: contentPayload,
        updated_by: updatedBy,
        user_id: sessionStorage.getItem('USER_ID') || null,
        status: 'published',
        file_name: options.file_name || null
      })
    });
    const enrichedRecord = {
      ...data.record,
      _source_version_meta: data.source_version || null,
      _source_document_meta: data.source_document || null
    };
    setRecord(enrichedRecord);
    if (moduleKey === 'calendar') {
      renderCalendarVersion(scopeKey);
      renderCalendarPreview(scopeKey, contentPayload.entries || []);
      await loadCalendarHistory(scopeKey);
    } else if (moduleKey === 'enrollment') {
      renderEnrollmentVersion(scopeKey);
      fillEnrollment(scopeKey);
      fillEnrollmentFaq(scopeKey);
      await loadSupportModuleHistory(moduleKey, scopeKey);
    } else if (SUPPORT_MODULE_CONFIG[moduleKey]) {
      renderSupportModuleVersion(moduleKey);
      await loadSupportModuleHistory(moduleKey);
    }
    Swal.fire('Sucesso', 'Conteudo oficial salvo com sucesso.', 'success');
  }

  function collectNoticeItems() {
    return [...document.querySelectorAll('#notice-items .official-list-item')].map((el) => ({
      title: el.querySelector('.notice-title').value,
      type: el.querySelector('.notice-type').value,
      start_date: el.querySelector('.notice-start').value,
      end_date: el.querySelector('.notice-end').value,
      message: el.querySelector('.notice-message').value,
      attachment_url: el.querySelector('.notice-attachment').value
    })).filter((item) => item.title || item.message);
  }

  function buildCalendarTemplateRows(scopeKey) {
    const sourceReference = scopeKey === 'network' ? 'Calendario oficial 2026' : 'Agenda escolar 2026';
    const audience = scopeKey === 'network' ? 'Rede inteira' : 'Comunidade escolar';
    const location = scopeKey === 'network' ? '' : 'Unidade escolar';
    return [
      {
        start_date: '2026-02-09',
        end_date: '2026-02-09',
        title: 'Inicio do ano letivo',
        event_type: 'letivo',
        audience,
        location,
        shift: 'todos',
        required_action: 'Comparecimento obrigatorio',
        notes: 'Primeiro dia com estudantes',
        source_reference: sourceReference
      },
      {
        start_date: '2026-03-02',
        end_date: '2026-03-06',
        title: 'Periodo de conselho de classe',
        event_type: 'conselho',
        audience,
        location,
        shift: 'todos',
        required_action: '',
        notes: 'Usar uma linha para periodos continuos',
        source_reference: sourceReference
      }
    ];
  }

  function downloadCalendarTemplate(scopeKey) {
    const csv = stringifyCalendarCsv(buildCalendarTemplateRows(scopeKey));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-calendario-${scopeKey}-pt-br.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCsv(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function loadCalendarHistory(scopeKey) {
    try {
      const data = await request('/api/official-content/calendar/' + scopeKey + '/history');
      setHistory('calendar', scopeKey, data.history || []);
      renderCalendarHistory(scopeKey);
    } catch (error) {
      console.error('Falha ao carregar historico do calendario:', error);
    }
  }

  async function loadSupportModuleHistory(moduleKey, scopeKey = null) {
    const config = SUPPORT_MODULE_CONFIG[moduleKey];
    if (!config) return;
    const actualScope = scopeKey || config.scopeKey;
    try {
      const data = await request('/api/official-content/' + moduleKey + '/' + actualScope + '/history');
      setHistory(moduleKey, actualScope, data.history || []);
      if (moduleKey === 'enrollment') {
        renderEnrollmentVersion(actualScope);
        fillEnrollment(actualScope);
        fillEnrollmentFaq(actualScope);
      } else {
        renderSupportModuleHistory(moduleKey);
        if (data.current) {
          setRecord(data.current);
          renderSupportModuleVersion(moduleKey);
        }
      }
      if (data.current) {
        setRecord(data.current);
      }
    } catch (error) {
      console.error('Falha ao carregar historico de ' + moduleKey + ':', error);
    }
  }

  async function importCalendarCsv(scopeKey, file) {
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseCalendarCsv(text);
      document.getElementById(`calendar-${scopeKey}-lines`).value = stringifyCalendarCsv(entries);
      document.getElementById(`calendar-${scopeKey}-file`).value = '';
      setCalendarFileName(scopeKey, file.name);
      renderCalendarPreview(scopeKey, entries);
      renderCalendarVersion(scopeKey);
      Swal.fire('CSV importado', `${entries.length} evento(s) carregado(s) no template. Revise o preview e clique em Salvar conteudo oficial para publicar no contexto selecionado.`, 'success');
    } catch (error) {
      Swal.fire('Erro', error.message || 'Nao foi possivel ler o CSV informado.', 'error');
    }
  }

  function initializeOfficialContentTabs() {
    return;
  }

  function setActiveContentTab(rawTabId) {
    const targetId = String(rawTabId || '').trim();
    if (!targetId) return;
    const normalizedId = targetId.startsWith('#') ? targetId : `#${targetId}`;
    if (window.jQuery && typeof window.jQuery.fn.tab === 'function') {
      const link = document.querySelector(`.nav-tabs .nav-link[href="${normalizedId}"]`);
      if (link) {
        window.jQuery(link).tab('show');
        return;
      }
    }
    const tabLinks = document.querySelectorAll('.nav-tabs .nav-link');
    const panes = document.querySelectorAll('.tab-content .tab-pane');
    tabLinks.forEach((link) => {
      const isActive = String(link.getAttribute('href') || '').trim() === normalizedId;
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panes.forEach((pane) => {
      const isActive = pane.id === normalizedId.replace('#', '');
      pane.classList.toggle('active', isActive);
      pane.classList.toggle('show', isActive);
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(() => {
    initializeOfficialContentTabs();
    setActiveContentTab('#official-calendar-network');
    ensureSupportModuleShells();
    ['network', 'school'].forEach((scopeKey) => {
      const textarea = document.getElementById(`calendar-${scopeKey}-lines`);
      if (textarea) {
        textarea.addEventListener('input', () => {
          try {
            renderCalendarPreview(scopeKey, parseCalendarLines(textarea.value));
          } catch (_error) {
            renderCalendarPreview(scopeKey, []);
          }
        });
      }
    });
    void load();
  });

  return {
    setActiveContentTab: (tabId) => setActiveContentTab(tabId),
    setEnrollmentScope: (scopeKey) => setEnrollmentScope(scopeKey),
    createNewEnrollmentDocument: (scopeKey = getCurrentEnrollmentScope()) => {
      const refs = getEnrollmentDom(scopeKey);
      if (!refs.period || !refs.reenrollmentPeriod || !refs.target || !refs.required || !refs.optional || !refs.rules || !refs.link || !refs.summary || !refs.documentTitle) return;
      refs.period.value = '';
      refs.reenrollmentPeriod.value = '';
      refs.target.value = '';
      refs.required.value = '';
      refs.optional.value = '';
      refs.rules.value = '';
      refs.link.value = '';
      refs.summary.value = '';
      refs.documentTitle.textContent = `Novo documento (${scopeKey})`;
    },
    addEnrollmentFaqItem: (scopeKey = getCurrentEnrollmentScope()) => createEnrollmentFaqItem(scopeKey),
    updateCalendarStatus: async (scopeKey) => {
      try {
        const record = getRecord('calendar', scopeKey);
        const nextStatus = document.getElementById('calendar-' + scopeKey + '-status-select').value;
        const data = await request('/api/official-content/calendar/' + scopeKey + '/status', {
          method: 'POST',
          body: JSON.stringify({ status: nextStatus, updated_by: sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Gestao da escola' })
        });
        setRecord({ ...record, ...data.record });
        renderCalendarVersion(scopeKey);
        await loadCalendarHistory(scopeKey);
        Swal.fire('Status atualizado', 'O calendario oficial foi atualizado para o status selecionado.', 'success');
      } catch (error) {
        Swal.fire('Erro', error.message || 'Nao foi possivel atualizar o status.', 'error');
      }
    },
    restoreCalendarVersion: async (scopeKey, versionId) => {
      try {
        const data = await request('/api/official-content/calendar/' + scopeKey + '/restore/' + versionId, {
          method: 'POST',
          body: JSON.stringify({ updated_by: sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Gestao da escola' })
        });
        const enrichedRecord = {
          ...data.record,
          _source_version_meta: data.source_version || null,
          _source_document_meta: data.source_document || null
        };
        setRecord(enrichedRecord);
        setCalendarFileName(scopeKey, data.source_version?.file_name || null);
        fillCalendar(scopeKey);
        await loadCalendarHistory(scopeKey);
        Swal.fire('Versao reativada', 'A versao anterior voltou a ser a referencia oficial ativa.', 'success');
      } catch (error) {
        Swal.fire('Erro', error.message || 'Nao foi possivel reativar esta versao.', 'error');
      }
    },
    addNoticeItem: () => createNoticeItem(),
    updateModuleStatus: async (moduleKey) => {
      const config = SUPPORT_MODULE_CONFIG[moduleKey];
      if (!config) return;
      try {
        const record = getRecord(moduleKey, config.scopeKey);
        const nextStatus = document.getElementById(config.statusSelectId).value;
        const data = await request('/api/official-content/' + moduleKey + '/' + config.scopeKey + '/status', {
          method: 'POST',
          body: JSON.stringify({ status: nextStatus, updated_by: sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Gestao da escola' })
        });
        setRecord({ ...record, ...data.record });
        renderSupportModuleVersion(moduleKey);
        await loadSupportModuleHistory(moduleKey);
        Swal.fire('Status atualizado', 'O modulo oficial foi atualizado para o status selecionado.', 'success');
      } catch (error) {
        Swal.fire('Erro', error.message || 'Nao foi possivel atualizar o status.', 'error');
      }
    },
    restoreModuleVersion: async (moduleKey, versionId) => {
      const config = SUPPORT_MODULE_CONFIG[moduleKey];
      if (!config) return;
      try {
        const data = await request('/api/official-content/' + moduleKey + '/' + config.scopeKey + '/restore/' + versionId, {
          method: 'POST',
          body: JSON.stringify({ updated_by: sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Gestao da escola' })
        });
        const enrichedRecord = {
          ...data.record,
          _source_version_meta: data.source_version || null,
          _source_document_meta: data.source_document || null
        };
        setRecord(enrichedRecord);
        if (moduleKey === 'enrollment') fillEnrollment(getCurrentEnrollmentScope());
        if (moduleKey === 'faq') fillFaq();
        if (moduleKey === 'notices') fillNotices();
        await loadSupportModuleHistory(moduleKey, moduleKey === 'enrollment' ? getCurrentEnrollmentScope() : null);
        Swal.fire('Versao reativada', 'A versao anterior voltou a ser a referencia oficial ativa.', 'success');
      } catch (error) {
        Swal.fire('Erro', error.message || 'Nao foi possivel reativar esta versao.', 'error');
      }
    },
    downloadCalendarTemplate,
    importCalendarCsv,
    saveCalendar: async (scopeKey) => {
      try {
        const entries = parseCalendarLines(document.getElementById(`calendar-${scopeKey}-lines`).value);
        const fileName = state.calendarImportedFileName[scopeKey] || `calendario-${scopeKey}.csv`;
        await save('calendar', scopeKey, document.getElementById(`calendar-${scopeKey}-title`).value, document.getElementById(`calendar-${scopeKey}-summary`).value, {
          template_version: 'calendar_csv_v1',
          columns: CALENDAR_COLUMNS,
          display_columns: CALENDAR_COLUMNS.map((column) => CALENDAR_COLUMN_LABELS[column]),
          locale: 'pt-BR',
          entries
        }, { file_name: fileName });
        setCalendarFileName(scopeKey, fileName);
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    },
    saveEnrollment: async (scopeKey) => {
      try {
        const scope = scopeKey || getCurrentEnrollmentScope();
        const refs = getEnrollmentDom(scope);
        const title = scope === 'network' ? 'Matrícula e Documentos da Rede' : 'Matrícula e Documentos da Escola';
        await save('enrollment', scope, title, refs.summary?.value || '', {
          enrollment_period: refs.period?.value || '',
          reenrollment_period: refs.reenrollmentPeriod?.value || '',
          target_audience: refs.target?.value || '',
          required_documents: splitLines(refs.required?.value || ''),
          optional_documents: splitLines(refs.optional?.value || ''),
          special_rules: refs.rules?.value || '',
          official_link: refs.link?.value || ''
        }, { file_name: `enrollment-${scope}.csv` });
        fillEnrollment(scope);
        fillEnrollmentFaq(scope);
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    },
    saveNotices: async () => {
      try {
        const summary = document.getElementById('notices-summary')?.value || '';
        await save('notices', 'school', 'Comunicados Oficiais', summary, { items: collectNoticeItems() });
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    },
    downloadEnrollmentTemplate: () => {
      const csv = 'enrollment_period,reenrollment_period,target_audience,required_documents,optional_documents,special_rules,official_link,summary\n';
      downloadCsv('template-matricula.csv', csv);
    },
    importEnrollmentCsv: async (scopeOrFile, maybeFile) => {
      const scope = typeof scopeOrFile === 'string' ? scopeOrFile : getCurrentEnrollmentScope();
      const file = typeof scopeOrFile === 'string' ? maybeFile : scopeOrFile;
      if (!file) return;
      try {
        const refs = getEnrollmentDom(scope);
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV deve ter pelo menos uma linha de dados.');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines[1].split(',').map(d => d.trim());
        const expectedHeaders = ['enrollment_period', 'reenrollment_period', 'target_audience', 'required_documents', 'optional_documents', 'special_rules', 'official_link', 'summary'];
        if (headers.length !== expectedHeaders.length || !headers.every((h, i) => h === expectedHeaders[i])) {
          throw new Error('Cabeçalhos do CSV não correspondem ao template esperado.');
        }
        if (refs.period) refs.period.value = data[0] || '';
        if (refs.reenrollmentPeriod) refs.reenrollmentPeriod.value = data[1] || '';
        if (refs.target) refs.target.value = data[2] || '';
        if (refs.required) refs.required.value = (data[3] || '').split(';').join('\n');
        if (refs.optional) refs.optional.value = (data[4] || '').split(';').join('\n');
        if (refs.rules) refs.rules.value = data[5] || '';
        if (refs.link) refs.link.value = data[6] || '';
        if (refs.summary) refs.summary.value = data[7] || '';
        if (refs.fileInput) refs.fileInput.value = '';
        Swal.fire('CSV importado', 'Dados de matrícula carregados com sucesso.', 'success');
      } catch (error) {
        Swal.fire('Erro', error.message || 'Não foi possível ler o CSV informado.', 'error');
      }
    },
    downloadNoticesTemplate: () => {
      const csv = 'title,type,start_date,end_date,message,attachment_url\n';
      downloadCsv('template-comunicados.csv', csv);
    },
    importNoticesCsv: async (file) => {
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV deve ter pelo menos uma linha de dados.');
        const headers = lines[0].split(',').map(h => h.trim());
        const expectedHeaders = ['title', 'type', 'start_date', 'end_date', 'message', 'attachment_url'];
        if (headers.length !== expectedHeaders.length || !headers.every((h, i) => h === expectedHeaders[i])) {
          throw new Error('Cabeçalhos do CSV não correspondem ao template esperado.');
        }
        document.getElementById('notice-items').innerHTML = '';
        for (let i = 1; i < lines.length; i++) {
          const data = lines[i].split(',').map(d => d.trim());
          createNoticeItem({
            title: data[0] || '',
            type: data[1] || '',
            start_date: data[2] || '',
            end_date: data[3] || '',
            message: data[4] || '',
            attachment_url: data[5] || ''
          });
        }
        document.getElementById('notices-file').value = '';
        Swal.fire('CSV importado', `${lines.length - 1} comunicado(s) carregado(s) com sucesso.`, 'success');
      } catch (error) {
        Swal.fire('Erro', error.message || 'Não foi possível ler o CSV informado.', 'error');
      }
    },
    downloadEnrollmentFaqTemplate: () => {
      const csv = 'pergunta,resposta,categoria\n"Qual é o período de matrícula?","Fevereiro a março","Administrativo"\n';
      downloadCsv('template-faq-matricula.csv', csv);
    },
    importEnrollmentFaqCsv: async (scopeOrFile, maybeFile) => {
      const scope = typeof scopeOrFile === 'string' ? scopeOrFile : getCurrentEnrollmentScope();
      const file = typeof scopeOrFile === 'string' ? maybeFile : scopeOrFile;
      if (!file) return;
      try {
        const refs = getEnrollmentDom(scope);
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV deve ter pergunta e resposta.');
        if (refs.faqItems) refs.faqItems.innerHTML = '';
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cells = parseCSVLineEnrollment(line);
          if (cells.length >= 2) {
            createEnrollmentFaqItem(scope, {
              question: cells[0] || '',
              answer: cells[1] || '',
              category: cells[2] || 'Geral'
            });
          }
        }
        if (refs.faqFile) refs.faqFile.value = '';
        Swal.fire('CSV importado', `${lines.length - 1} pergunta(s) carregada(s).`, 'success');
        fillEnrollmentFaq(scope);
      } catch (error) {
        Swal.fire('Erro', error.message || 'Não foi possível ler o CSV.', 'error');
      }
    },
    saveEnrollmentFaq: async (scopeKey = getCurrentEnrollmentScope()) => {
      try {
        const record = getRecord('enrollment', scopeKey);
        const items = collectEnrollmentFaqItems(scopeKey);
        const updatedRecord = { ...record, faq_items: items };
        setRecord(updatedRecord);
        fillEnrollmentFaq(scopeKey);
        Swal.fire('Sucesso', 'Perguntas frequentes salvas.', 'success');
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    },
    getRecord,
    getRecord,
    setRecord
  };
})();

window.OfficialContentPage = OfficialContentPage;






