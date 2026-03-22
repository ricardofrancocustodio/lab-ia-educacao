const PublicCalendarPage = (() => {
  const state = { schools: [], networks: [], filteredSchools: [] };
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getTypeColor(type) {
    const value = normalize(type);
    if (value.includes('ferias')) return '#1fa79a';
    if (value.includes('recesso') || value.includes('feriado') || value.includes('suspens')) return '#cf2f2f';
    if (value.includes('reuniao') || value.includes('conselho')) return '#e49b22';
    if (value.includes('evento') || value.includes('institucional') || value.includes('comunidade')) return '#2f67d9';
    return '#2f8a4b';
  }

  function getDateParts(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return { year: '', month: -1, day: '' };
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return { year: normalized.slice(0, 4), month: Number(normalized.slice(5, 7)) - 1, day: Number(normalized.slice(8, 10)) };
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
      return { year: normalized.slice(6, 10), month: Number(normalized.slice(3, 5)) - 1, day: Number(normalized.slice(0, 2)) };
    }
    return { year: '', month: -1, day: '' };
  }

  function compareCalendarDates(a, b) {
    const left = getDateParts(a?.start_date || '');
    const right = getDateParts(b?.start_date || '');
    return String(left.year).localeCompare(String(right.year)) || left.month - right.month || Number(left.day || 0) - Number(right.day || 0);
  }

  function inferYear(entries) {
    const first = (entries || []).find((item) => getDateParts(item.start_date).year);
    return first ? getDateParts(first.start_date).year : 'Sem ano';
  }

  function formatUpdatedAt(value) {
    if (!value) return 'Não informado';
    try {
      return new Date(value).toLocaleString('pt-BR');
    } catch (_error) {
      return value;
    }
  }

  function parseDateToLocal(value) {
    const parts = getDateParts(value);
    if (!parts.year || parts.month < 0 || !parts.day) return null;
    return new Date(Number(parts.year), parts.month, Number(parts.day));
  }

  function formatEventRange(entry) {
    const start = String(entry?.start_date || '').trim();
    const end = String(entry?.end_date || '').trim();
    if (!start) return 'Data não informada';
    if (!end || end === start) return start;
    return `${start} a ${end}`;
  }

  function getVisibleNotes(entries, monthIndex) {
    return entries
      .filter((entry) => getDateParts(entry.start_date).month === monthIndex)
      .slice(0, 3);
  }

  function buildMonthMatrix(yearValue, monthIndex, entries) {
    const year = Number(yearValue) || new Date().getFullYear();
    const firstDay = new Date(year, monthIndex, 1);
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    const cells = [];
    const today = new Date();

    const dayEvents = new Map();
    entries.forEach((entry) => {
      const start = parseDateToLocal(entry.start_date);
      const end = parseDateToLocal(entry.end_date || entry.start_date);
      if (!start || !end) return;
      const cursor = new Date(start);
      while (cursor <= end) {
        if (cursor.getFullYear() === year && cursor.getMonth() === monthIndex) {
          const key = cursor.getDate();
          if (!dayEvents.has(key)) dayEvents.set(key, []);
          dayEvents.get(key).push(entry);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    for (let index = 0; index < leadingBlanks; index += 1) {
      cells.push('<div class="calendar-day is-empty"></div>');
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const events = dayEvents.get(day) || [];
      const colors = [...new Set(events.map((entry) => getTypeColor(entry.event_type)))].slice(0, 3);
      const primaryColor = colors[0] || '';
      const isToday = today.getFullYear() === year && today.getMonth() === monthIndex && today.getDate() === day;
      cells.push(`
        <div class="calendar-day${events.length ? ' has-event' : ''}${isToday ? ' is-today' : ''}" title="${escapeHtml(events.map((entry) => `${entry.title || 'Evento sem título'} (${formatEventRange(entry)})`).join(' | '))}">
          <span class="calendar-day-number"${primaryColor ? ` style="background:${primaryColor};"` : ''}>${day}</span>
          ${colors.length ? `<span class="calendar-day-markers">${colors.map((color) => `<i class="calendar-day-marker" style="background:${color};"></i>`).join('')}</span>` : ''}
        </div>
      `);
    }

    const remainder = cells.length % 7;
    if (remainder) {
      for (let index = remainder; index < 7; index += 1) {
        cells.push('<div class="calendar-day is-empty"></div>');
      }
    }

    return cells.join('');
  }

  function populateNetworks() {
    const select = document.getElementById('public-calendar-network');
    select.innerHTML = ['<option value="">Todas as redes</option>']
      .concat(state.networks.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`))
      .join('');
  }

  function populateSchools(schools) {
    const select = document.getElementById('public-calendar-school');
    select.innerHTML = schools.length
      ? schools.map((item) => `<option value="${item.school_id}">${escapeHtml(item.school_name)}</option>`).join('')
      : '<option value="">Nenhuma escola encontrada</option>';
  }

  function applyFilters() {
    const networkId = document.getElementById('public-calendar-network').value;
    const search = normalize(document.getElementById('public-calendar-search').value);
    state.filteredSchools = state.schools.filter((item) => {
      const matchesNetwork = !networkId || item.network_id === networkId;
      const matchesSearch = !search || normalize(item.school_name).includes(search) || normalize(item.network_name).includes(search);
      return matchesNetwork && matchesSearch;
    });
    populateSchools(state.filteredSchools);
    renderSelectedSchool();
  }

  function renderSelectedSchool() {
    const selectedId = document.getElementById('public-calendar-school').value;
    const school = state.filteredSchools.find((item) => item.school_id === selectedId) || state.filteredSchools[0];
    const title = document.getElementById('public-calendar-school-title');
    const subtitle = document.getElementById('public-calendar-school-subtitle');
    const metadata = document.getElementById('public-calendar-metadata');
    const year = document.getElementById('public-calendar-year');
    const grid = document.getElementById('public-calendar-grid');

    if (!school) {
      title.textContent = 'Nenhuma escola encontrada';
      subtitle.textContent = 'Ajuste os filtros para localizar um calendário publicado.';
      metadata.innerHTML = '';
      year.textContent = 'Ano';
      grid.innerHTML = '<div class="calendar-empty-state">Nenhum calendário publicado para os filtros selecionados.</div>';
      return;
    }

    const isNetworkOnly = school.presentation_kind === 'network_only';
    document.getElementById('public-calendar-school').value = school.school_id;

    title.textContent = school.school_name;
    subtitle.textContent = isNetworkOnly
      ? `${school.network_name}`
      : `${school.network_name}`;

    const entries = (school.merged_entries || []).slice().sort(compareCalendarDates);
    const yearValue = inferYear(entries);
    year.textContent = yearValue;

    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    metadata.innerHTML = [
      ['Rede / Secretaria', school.network_name],
      ['Escopo de exibição', isNetworkOnly ? 'Rede / Secretaria' : 'Unidade escolar'],
      ['Título do calendário', school.calendar_title || 'Calendário Escolar'],
      ['Resumo', school.calendar_summary || (isNetworkOnly ? 'Calendário-base oficial publicado pela rede.' : 'Calendário-base da rede com complementos da unidade escolar.')],
      ['Início e término', entries.length ? `${firstEntry?.start_date || '-'} até ${lastEntry?.end_date || lastEntry?.start_date || '-'}` : '-'],
      ['Última atualização', formatUpdatedAt(school.updated_at)]
    ].map(([label, value]) => `
      <div class="calendar-meta-item">
        <div class="calendar-meta-dot"></div>
        <div>
          <div class="calendar-meta-label">${escapeHtml(label)}</div>
          <div class="calendar-meta-value">${escapeHtml(value)}</div>
        </div>
      </div>
    `).join('');

    grid.innerHTML = MONTHS.map((month, monthIndex) => {
      const monthEntries = entries.filter((entry) => getDateParts(entry.start_date).month === monthIndex || getDateParts(entry.end_date || entry.start_date).month === monthIndex);
      const notes = getVisibleNotes(monthEntries, monthIndex);
      return `
        <article class="calendar-month">
          <div class="calendar-month-head">
            <span>${month}</span>
            <span class="calendar-month-count">${monthEntries.length}</span>
          </div>
          <div class="calendar-weekdays">
            ${WEEKDAYS.map((day) => `<div class="calendar-weekday">${day}</div>`).join('')}
          </div>
          <div class="calendar-days">
            ${buildMonthMatrix(yearValue, monthIndex, monthEntries)}
          </div>
          <div class="calendar-month-notes">
            ${notes.length ? notes.map((entry) => `
              <div class="calendar-month-note">
                <i class="calendar-dot" style="background:${getTypeColor(entry.event_type)};"></i>
                <span><strong>${escapeHtml(entry.title || 'Evento')}</strong></span>
              </div>
            `).join('') : '<div class="calendar-empty">Sem eventos destacados neste mês.</div>'}
          </div>
        </article>
      `;
    }).join('');
  }

  async function load() {
    const response = await fetch('/api/public-calendar');
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || 'Falha ao carregar calendário público.');
    state.networks = data.networks || [];
    state.schools = data.schools || [];
    populateNetworks();
    state.filteredSchools = state.schools.slice();
    populateSchools(state.filteredSchools);
    renderSelectedSchool();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('public-calendar-network').addEventListener('change', applyFilters);
    document.getElementById('public-calendar-school').addEventListener('change', renderSelectedSchool);
    document.getElementById('public-calendar-search').addEventListener('input', applyFilters);
    document.getElementById('public-calendar-apply').addEventListener('click', applyFilters);
    load().catch((error) => {
      document.getElementById('public-calendar-root').innerHTML = `<div class="calendar-card calendar-empty-state">${escapeHtml(error.message)}</div>`;
    });
  });
})();
