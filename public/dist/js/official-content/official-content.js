const OfficialContentPage = (() => {
  const state = { schoolId: null, records: {} };
  const CALENDAR_COLUMNS = ['start_date', 'end_date', 'title', 'event_type', 'audience', 'location', 'shift', 'required_action', 'notes', 'source_reference'];
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

  async function getAuthHeaders(extraHeaders = {}) {
    const token = await window.getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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

  function toggleEmpty(kind) {
    if (kind === 'faq') {
      const count = document.querySelectorAll('#faq-items .official-list-item').length;
      document.getElementById('faq-empty').style.display = count ? 'none' : 'block';
    }
    if (kind === 'notice') {
      const count = document.querySelectorAll('#notice-items .official-list-item').length;
      document.getElementById('notice-empty').style.display = count ? 'none' : 'block';
    }
  }

  function createFaqItem(item = {}) {
    const el = document.createElement('div');
    el.className = 'official-list-item';
    el.innerHTML = `
      <div class="row">
        <div class="col-md-6 form-group mb-2"><label>Pergunta</label><input class="form-control faq-question" value="${item.question || ''}"></div>
        <div class="col-md-3 form-group mb-2"><label>Categoria</label><input class="form-control faq-category" value="${item.category || ''}"></div>
        <div class="col-md-3 form-group mb-2"><label>Publico-alvo</label><input class="form-control faq-audience" value="${item.audience || ''}"></div>
        <div class="col-md-12 form-group mb-2"><label>Resposta</label><textarea class="form-control faq-answer" rows="3">${item.answer || ''}</textarea></div>
        <div class="col-md-4 form-group mb-2"><label>Escopo</label><input class="form-control faq-scope" value="${item.scope || 'school'}"></div>
        <div class="col-md-4 form-group mb-2"><label>Versao</label><input class="form-control faq-version" value="${item.version || ''}"></div>
        <div class="col-md-4 form-group mb-2"><label>Fonte associada</label><input class="form-control faq-source" value="${item.source || ''}"></div>
      </div>
      <div class="text-right"><button type="button" class="btn btn-outline-danger btn-sm remove-item">Remover</button></div>`;
    el.querySelector('.remove-item').addEventListener('click', () => {
      el.remove();
      toggleEmpty('faq');
    });
    document.getElementById('faq-items').appendChild(el);
    toggleEmpty('faq');
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

  function fillCalendar(scopeKey) {
    const record = getRecord('calendar', scopeKey);
    if (!record) return;
    document.getElementById(`calendar-${scopeKey}-title`).value = record.title || '';
    document.getElementById(`calendar-${scopeKey}-summary`).value = record.summary || '';
    document.getElementById(`calendar-${scopeKey}-lines`).value = stringifyCalendarCsv(record.content_payload?.entries || []);
  }

  function fillEnrollment() {
    const record = getRecord('enrollment', 'school');
    if (!record) return;
    const payload = record.content_payload || {};
    document.getElementById('enrollment-period').value = payload.enrollment_period || '';
    document.getElementById('reenrollment-period').value = payload.reenrollment_period || '';
    document.getElementById('enrollment-target').value = payload.target_audience || '';
    document.getElementById('enrollment-required').value = (payload.required_documents || []).join('\n');
    document.getElementById('enrollment-optional').value = (payload.optional_documents || []).join('\n');
    document.getElementById('enrollment-rules').value = payload.special_rules || '';
    document.getElementById('enrollment-link').value = payload.official_link || '';
    document.getElementById('enrollment-summary').value = record.summary || '';
  }

  function fillFaq() {
    document.getElementById('faq-items').innerHTML = '';
    const record = getRecord('faq', 'school');
    (record?.content_payload?.items || []).forEach(createFaqItem);
    document.getElementById('faq-summary').value = record?.summary || '';
    toggleEmpty('faq');
  }

  function fillNotices() {
    document.getElementById('notice-items').innerHTML = '';
    const record = getRecord('notices', 'school');
    (record?.content_payload?.items || []).forEach(createNoticeItem);
    document.getElementById('notices-summary').value = record?.summary || '';
    toggleEmpty('notice');
  }

  async function load() {
    state.schoolId = getSchoolId();
    if (!state.schoolId) {
      Swal.fire('Atencao', 'School ID nao encontrado na sessao.', 'warning');
      return;
    }
    const data = await request('/api/official-content');
    state.records = {};
    (data.records || []).forEach(setRecord);
    fillCalendar('network');
    fillCalendar('school');
    fillEnrollment();
    fillFaq();
    fillNotices();
    document.getElementById('official-loading').style.display = 'none';
    document.getElementById('official-content-root').style.display = '';
  }

  async function save(moduleKey, scopeKey, title, summary, contentPayload) {
    const updatedBy = sessionStorage.getItem('USER_NAME') || sessionStorage.getItem('USER_EMAIL') || 'Gestao da escola';
    const data = await request(`/api/official-content/${moduleKey}/${scopeKey}`, {
      method: 'POST',
      body: JSON.stringify({ title, summary, content_payload: contentPayload, updated_by: updatedBy, user_id: sessionStorage.getItem('USER_ID') || null, status: 'published' })
    });
    setRecord(data.record);
    Swal.fire('Sucesso', 'Conteudo oficial salvo com sucesso.', 'success');
  }

  function collectFaqItems() {
    return [...document.querySelectorAll('#faq-items .official-list-item')].map((el) => ({
      question: el.querySelector('.faq-question').value,
      category: el.querySelector('.faq-category').value,
      audience: el.querySelector('.faq-audience').value,
      answer: el.querySelector('.faq-answer').value,
      scope: el.querySelector('.faq-scope').value,
      version: el.querySelector('.faq-version').value,
      source: el.querySelector('.faq-source').value
    })).filter((item) => item.question || item.answer);
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

  async function importCalendarCsv(scopeKey, file) {
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseCalendarCsv(text);
      document.getElementById(`calendar-${scopeKey}-lines`).value = stringifyCalendarCsv(entries);
      document.getElementById(`calendar-${scopeKey}-file`).value = '';
      Swal.fire('CSV importado', `${entries.length} evento(s) carregado(s) no template.`, 'success');
    } catch (error) {
      Swal.fire('Erro', error.message || 'Nao foi possivel ler o CSV informado.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => { void load(); });

  return {
    addFaqItem: () => createFaqItem(),
    addNoticeItem: () => createNoticeItem(),
    downloadCalendarTemplate,
    importCalendarCsv,
    saveCalendar: async (scopeKey) => {
      try {
        const entries = parseCalendarLines(document.getElementById(`calendar-${scopeKey}-lines`).value);
        await save('calendar', scopeKey, document.getElementById(`calendar-${scopeKey}-title`).value, document.getElementById(`calendar-${scopeKey}-summary`).value, {
          template_version: 'calendar_csv_v1',
          columns: CALENDAR_COLUMNS,
          display_columns: CALENDAR_COLUMNS.map((column) => CALENDAR_COLUMN_LABELS[column]),
          locale: 'pt-BR',
          entries
        });
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    },
    saveEnrollment: async () => {
      try {
        await save('enrollment', 'school', 'Matricula e Documentos Exigidos', document.getElementById('enrollment-summary').value, {
          enrollment_period: document.getElementById('enrollment-period').value,
          reenrollment_period: document.getElementById('reenrollment-period').value,
          target_audience: document.getElementById('enrollment-target').value,
          required_documents: splitLines(document.getElementById('enrollment-required').value),
          optional_documents: splitLines(document.getElementById('enrollment-optional').value),
          special_rules: document.getElementById('enrollment-rules').value,
          official_link: document.getElementById('enrollment-link').value
        });
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    },
    saveFaq: async () => {
      try {
        await save('faq', 'school', 'FAQ Oficial', document.getElementById('faq-summary').value, { items: collectFaqItems() });
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    },
    saveNotices: async () => {
      try {
        await save('notices', 'school', 'Comunicados Oficiais', document.getElementById('notices-summary').value, { items: collectNoticeItems() });
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    }
  };
})();

window.OfficialContentPage = OfficialContentPage;
