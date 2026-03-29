// school-switcher.js
// Provides cross-school context switching for auditor and superadmin roles.
// Injects x-school-id header into all /api/* fetch calls when a school override is active.

(function () {
  var _originalFetch = window.fetch;
  window.fetch = function (input, init) {
    var overrideSchoolId = sessionStorage.getItem('SCHOOL_SWITCHER_ID') || '';
    var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
    if (overrideSchoolId && url.indexOf('/api/') === 0) {
      init = Object.assign({}, init);
      if (init.headers instanceof Headers) {
        if (!init.headers.has('x-school-id')) init.headers.set('x-school-id', overrideSchoolId);
      } else {
        init.headers = Object.assign({}, init.headers);
        if (!init.headers['x-school-id']) init.headers['x-school-id'] = overrideSchoolId;
      }
    }
    return _originalFetch.call(this, input, init);
  };
})();

async function renderSchoolSwitcher() {
  var role = (sessionStorage.getItem('EFFECTIVE_ROLE') || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (role !== 'auditor' && role !== 'superadmin') return;

  try {
    var token = typeof getAccessToken === 'function' ? await getAccessToken() : null;
    var headers = token ? { Authorization: 'Bearer ' + token } : {};
    var res = await fetch('/api/schools/list', { headers: headers });
    if (!res.ok) return;
    var data = await res.json();
    if (!data.ok || !data.schools || !data.schools.length) return;

    var sidebar = document.querySelector('.main-sidebar .sidebar');
    if (!sidebar) return;

    var currentOverride = sessionStorage.getItem('SCHOOL_SWITCHER_ID') || '';

    var optionsHtml = '<option value="">Todas as Secretarias</option>';
    for (var i = 0; i < data.schools.length; i++) {
      var s = data.schools[i];
      var selected = currentOverride === s.id ? ' selected' : '';
      var typeLabel = s.institution_type === 'school_unit' ? '\u{1F3EB}' : '\u{1F3DB}\uFE0F';
      optionsHtml += '<option value="' + s.id + '"' + selected + '>' + typeLabel + ' ' + s.name + '</option>';
    }

    var containerHtml = '<div id="school-switcher-container"'
      + ' style="padding:10px 14px 8px;border-bottom:1px solid rgba(255,255,255,.08);">'
      + '<label style="display:block;font-size:.72rem;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">'
      + '<i class="fas fa-exchange-alt mr-1"></i>Contexto Institucional</label>'
      + '<select id="school-switcher-select" class="form-control form-control-sm"'
      + ' style="background:#1a2332;color:#c2cfe0;border:1px solid rgba(255,255,255,.12);'
      + 'border-radius:6px;font-size:.82rem;padding:4px 8px;">'
      + optionsHtml
      + '</select>'
      + '</div>';

    var wrapper = document.createElement('div');
    wrapper.innerHTML = containerHtml;
    var el = wrapper.firstElementChild;

    var nav = sidebar.querySelector('nav');
    if (nav) {
      sidebar.insertBefore(el, nav);
    } else {
      sidebar.appendChild(el);
    }

    var selectEl = document.getElementById('school-switcher-select');
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        var val = this.value;
        if (val) {
          sessionStorage.setItem('SCHOOL_SWITCHER_ID', val);
        } else {
          sessionStorage.removeItem('SCHOOL_SWITCHER_ID');
        }
        window.location.reload();
      });
    }
  } catch (e) {
    console.warn('Falha ao renderizar seletor de escola:', e && e.message ? e.message : e);
  }
}
