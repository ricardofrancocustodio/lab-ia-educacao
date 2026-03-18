// ./js/preferences/notification-page-settings.js

const NOTIF_KEY = 'notifications';
const REALTIME_STATUS_OPTIONS = [
    { key: 'AGENDADO', label: 'Agendamento' },
    { key: 'LISTA_DE_ESPERA', label: 'Lista de espera' },
    { key: 'REAGENDADO', label: 'Reagendado' },
    { key: 'SOLICITOU_CONTATO', label: 'Solicitou contato humano' },
    { key: 'CANCELADO', label: 'Cancelou' },
    { key: 'CONFIRMADO', label: 'Confirmou visita' },
    { key: 'NAO_COMPARECEU', label: 'Nao confirmou / nao compareceu' },
    { key: 'PRE_MATRICULA', label: 'Pre-matricula' },
    { key: 'MATRICULADO', label: 'Matriculado' },
    { key: 'DESISTENCIA', label: 'Desistencia' },
    { key: 'VISITOU', label: 'Visitou' }
];

const PARENT_NOTIFICATION_TRIGGERS = [
    { key: 'apos_visita', label: 'Apos visita na escola' },
    { key: 'apos_pre_matricula', label: 'Ao entrar no fluxo de pre-matricula' },
    { key: 'apos_matriculado', label: 'Apos matricula efetivada' },
    { key: 'lembrete_documentacao', label: 'Lembrete de documentacao pendente' },
    { key: 'confirmacao_documentacao', label: 'Confirmacao de recebimento de documentacao' },
    { key: 'followup_sem_retorno', label: 'Follow-up sem retorno do responsavel' }
];

const DEFAULT_NOTIFICATION_SETTINGS = {
    master_on: false,
    realtime_on: false,
    internal_channels: { whatsapp: true, email: false, sms: false },
    realtime_all_statuses: true,
    realtime_statuses: [],
    consolidated_all_statuses: true,
    consolidated_statuses: [],
    consolidated_on: false,
    internal_consolidated_channels: { whatsapp: true, email: false, sms: false },
    active_times: [],
    parent_notifications: {}
};

let currentReminderTimes = [];
let currentRealtimeStatuses = [];
let currentConsolidatedStatuses = [];
let currentParentNotifications = {};
let canManageParentNotifications = false;

function applyParentSectionAccessByRole(userRole) {
    const roleNorm = String(userRole || '').toLowerCase();
    canManageParentNotifications = ['superadmin', 'network_manager', 'secretariat'].includes(roleNorm);

    const card = document.getElementById('parentNotificationsCard');
    if (card) {
        card.style.display = canManageParentNotifications ? '' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    carregarNotificacoes();
});

function normalizeTime(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return null;

    if (/^\d{2}:\d{2}$/.test(raw)) {
        const [h, m] = raw.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (!m12) return null;
    let h = parseInt(m12[1], 10);
    const m = parseInt(m12[2], 10);
    const ap = m12[3];
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (ap === 'AM') {
        if (h === 12) h = 0;
    } else if (h < 12) {
        h += 12;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeSettings(value) {
    const src = value && typeof value === 'object' ? value : {};
    const times = Array.isArray(src.active_times) ? src.active_times : [];
    const realtimeStatuses = Array.isArray(src.realtime_statuses) ? src.realtime_statuses : [];

    const parentSrc = src.parent_notifications && typeof src.parent_notifications === 'object'
        ? src.parent_notifications
        : {};
    const internalChannelsSrc = src.internal_channels && typeof src.internal_channels === 'object'
        ? src.internal_channels
        : {};
    const internalConsolidatedChannelsSrc = src.internal_consolidated_channels && typeof src.internal_consolidated_channels === 'object'
        ? src.internal_consolidated_channels
        : {};
    const normalizedParent = {};
    PARENT_NOTIFICATION_TRIGGERS.forEach((trigger) => {
        const row = parentSrc[trigger.key] || {};
        const channels = row.channels && typeof row.channels === 'object' ? row.channels : {};
        normalizedParent[trigger.key] = {
            enabled: !!row.enabled,
            template_text: typeof row.template_text === 'string' ? row.template_text : '',
            channels: {
                email: !!channels.email,
                whatsapp: !!channels.whatsapp,
                sms: !!channels.sms
            }
        };
    });

    return {
        master_on: !!src.master_on,
        realtime_on: !!src.realtime_on,
        internal_channels: {
            whatsapp: internalChannelsSrc.whatsapp !== false,
            email: !!internalChannelsSrc.email,
            sms: !!internalChannelsSrc.sms
        },
        realtime_all_statuses: src.realtime_all_statuses !== false,
        realtime_statuses: [...new Set(realtimeStatuses.map((s) => String(s || '').toUpperCase()).filter(Boolean))],
        consolidated_all_statuses: src.consolidated_all_statuses !== false,
        consolidated_statuses: [...new Set((Array.isArray(src.consolidated_statuses) ? src.consolidated_statuses : []).map((s) => String(s || '').toUpperCase()).filter(Boolean))],
        consolidated_on: !!src.consolidated_on,
        internal_consolidated_channels: {
            whatsapp: internalConsolidatedChannelsSrc.whatsapp !== false,
            email: !!internalConsolidatedChannelsSrc.email,
            sms: !!internalConsolidatedChannelsSrc.sms
        },
        active_times: [...new Set(times.map(normalizeTime).filter(Boolean))].sort(),
        parent_notifications: normalizedParent
    };
}

function mergeSettings(schoolSettings, userSettings) {
    const school = normalizeSettings(schoolSettings);
    const user = normalizeSettings(userSettings);
    const hasOwn = (obj, key) => !!obj && Object.prototype.hasOwnProperty.call(obj, key);
    return {
        ...school,
        ...user,
        internal_channels: hasOwn(userSettings, 'internal_channels') ? user.internal_channels : school.internal_channels,
        realtime_statuses: Array.isArray(userSettings?.realtime_statuses) ? user.realtime_statuses : school.realtime_statuses,
        internal_consolidated_channels: hasOwn(userSettings, 'internal_consolidated_channels') ? user.internal_consolidated_channels : school.internal_consolidated_channels,
        consolidated_statuses: Array.isArray(userSettings?.consolidated_statuses) ? user.consolidated_statuses : school.consolidated_statuses,
        active_times: Array.isArray(userSettings?.active_times) ? user.active_times : school.active_times,
        parent_notifications: userSettings?.parent_notifications ? user.parent_notifications : school.parent_notifications
    };
}

function setInternalChannelsFromConfig(config) {
    const realtime = config?.internal_channels || { whatsapp: true, email: false, sms: false };
    const consolidated = config?.internal_consolidated_channels || { whatsapp: true, email: false, sms: false };

    const rtWpp = document.getElementById('rtChannelWhatsapp');
    const rtEmail = document.getElementById('rtChannelEmail');
    const rtSms = document.getElementById('rtChannelSms');
    const csWpp = document.getElementById('csChannelWhatsapp');
    const csEmail = document.getElementById('csChannelEmail');
    const csSms = document.getElementById('csChannelSms');

    if (rtWpp) rtWpp.checked = realtime.whatsapp !== false;
    if (rtEmail) rtEmail.checked = !!realtime.email;
    if (rtSms) rtSms.checked = !!realtime.sms;
    if (csWpp) csWpp.checked = consolidated.whatsapp !== false;
    if (csEmail) csEmail.checked = !!consolidated.email;
    if (csSms) csSms.checked = !!consolidated.sms;
}

function collectInternalChannelsFromUI() {
    return {
        internal_channels: {
            whatsapp: !!document.getElementById('rtChannelWhatsapp')?.checked,
            email: !!document.getElementById('rtChannelEmail')?.checked,
            sms: !!document.getElementById('rtChannelSms')?.checked
        },
        internal_consolidated_channels: {
            whatsapp: !!document.getElementById('csChannelWhatsapp')?.checked,
            email: !!document.getElementById('csChannelEmail')?.checked,
            sms: !!document.getElementById('csChannelSms')?.checked
        }
    };
}

function renderRealtimeStatusOptions() {
    const container = document.getElementById('realtimeStatusOptions');
    if (!container) return;

    const selected = new Set(currentRealtimeStatuses);
    container.innerHTML = REALTIME_STATUS_OPTIONS.map((item) => `
        <div class="custom-control custom-checkbox mb-1">
            <input class="custom-control-input realtime-status-checkbox" type="checkbox" id="rt_status_${item.key}" value="${item.key}" ${selected.has(item.key) ? 'checked' : ''}>
            <label for="rt_status_${item.key}" class="custom-control-label font-weight-normal">${item.label}</label>
        </div>
    `).join('');
}

function collectRealtimeStatusesFromUI() {
    return Array.from(document.querySelectorAll('.realtime-status-checkbox:checked'))
        .map((el) => String(el.value || '').toUpperCase())
        .filter(Boolean);
}

function renderConsolidatedStatusOptions() {
    const container = document.getElementById('consolidatedStatusOptions');
    if (!container) return;

    const selected = new Set(currentConsolidatedStatuses);
    container.innerHTML = REALTIME_STATUS_OPTIONS.map((item) => `
        <div class="custom-control custom-checkbox mb-1">
            <input class="custom-control-input consolidated-status-checkbox" type="checkbox" id="cs_status_${item.key}" value="${item.key}" ${selected.has(item.key) ? 'checked' : ''}>
            <label for="cs_status_${item.key}" class="custom-control-label font-weight-normal">${item.label}</label>
        </div>
    `).join('');
}

function collectConsolidatedStatusesFromUI() {
    const allOn = document.getElementById('switchConsolidatedAllStatuses')?.checked;
    if (allOn) {
        return REALTIME_STATUS_OPTIONS.map((item) => item.key);
    }
    return Array.from(document.querySelectorAll('.consolidated-status-checkbox:checked'))
        .map((el) => String(el.value || '').toUpperCase())
        .filter(Boolean);
}

function renderParentNotificationOptions() {
    const container = document.getElementById('parentNotificationsContainer');
    if (!container) return;

    container.innerHTML = PARENT_NOTIFICATION_TRIGGERS.map((trigger) => {
        const conf = currentParentNotifications[trigger.key] || {
            enabled: false,
            template_text: '',
            channels: { email: false, whatsapp: false, sms: false }
        };
        return `
            <div class="col-md-6 mb-3">
                <div class="border rounded p-3 h-100 parent-notif-card" data-trigger="${trigger.key}">
                    <div class="custom-control custom-switch mb-2">
                        <input class="custom-control-input parent-trigger-switch" type="checkbox" id="pn_${trigger.key}" data-trigger="${trigger.key}" ${conf.enabled ? 'checked' : ''} onchange="toggleParentTriggerChannels('${trigger.key}')">
                        <label class="custom-control-label font-weight-bold" for="pn_${trigger.key}">${trigger.label}</label>
                    </div>
                    <div class="pl-2 parent-channel-group" id="pn_channels_${trigger.key}">
                        <div class="custom-control custom-checkbox mb-1">
                            <input class="custom-control-input parent-channel-checkbox" type="checkbox" id="pn_${trigger.key}_email" data-trigger="${trigger.key}" data-channel="email" ${conf.channels.email ? 'checked' : ''}>
                            <label class="custom-control-label" for="pn_${trigger.key}_email">E-mail</label>
                        </div>
                        <div class="custom-control custom-checkbox mb-1">
                            <input class="custom-control-input parent-channel-checkbox" type="checkbox" id="pn_${trigger.key}_whatsapp" data-trigger="${trigger.key}" data-channel="whatsapp" ${conf.channels.whatsapp ? 'checked' : ''}>
                            <label class="custom-control-label" for="pn_${trigger.key}_whatsapp">WhatsApp</label>
                        </div>
                        <div class="custom-control custom-checkbox">
                            <input class="custom-control-input parent-channel-checkbox" type="checkbox" id="pn_${trigger.key}_sms" data-trigger="${trigger.key}" data-channel="sms" ${conf.channels.sms ? 'checked' : ''}>
                            <label class="custom-control-label" for="pn_${trigger.key}_sms">SMS</label>
                        </div>
                    </div>
                    <div class="mt-3">
                        <label for="pn_${trigger.key}_template" class="small text-muted mb-1 d-block">Texto da mensagem (opcional)</label>
                        <textarea class="form-control form-control-sm parent-template-text"
                            id="pn_${trigger.key}_template"
                            data-trigger="${trigger.key}"
                            rows="3"
                            placeholder="Se vazio, usa o template padrão do sistema. Você pode usar {{name}} para o nome do responsável."
                        >${conf.template_text || ''}</textarea>
                        <small class="text-muted">Placeholders: {{name}}</small>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    PARENT_NOTIFICATION_TRIGGERS.forEach((trigger) => toggleParentTriggerChannels(trigger.key));
}

function toggleParentTriggerChannels(triggerKey) {
    const master = document.getElementById(`pn_${triggerKey}`);
    const channels = document.querySelectorAll(`.parent-channel-checkbox[data-trigger="${triggerKey}"]`);
    const template = document.getElementById(`pn_${triggerKey}_template`);
    channels.forEach((cb) => {
        cb.disabled = !(master && master.checked);
    });
    if (template) {
        template.disabled = !(master && master.checked);
    }
}

function collectParentNotificationsFromUI() {
    const out = {};
    PARENT_NOTIFICATION_TRIGGERS.forEach((trigger) => {
        const enabled = !!document.getElementById(`pn_${trigger.key}`)?.checked;
        const channels = {
            email: !!document.getElementById(`pn_${trigger.key}_email`)?.checked,
            whatsapp: !!document.getElementById(`pn_${trigger.key}_whatsapp`)?.checked,
            sms: !!document.getElementById(`pn_${trigger.key}_sms`)?.checked
        };
        const templateText = String(document.getElementById(`pn_${trigger.key}_template`)?.value || '').trim();
        out[trigger.key] = { enabled, channels, template_text: templateText };
    });
    return out;
}

function renderReminderTimesList() {
    const list = document.getElementById('customReminderTimesList');
    if (!list) return;

    if (!currentReminderTimes.length) {
        list.innerHTML = '<span class="badge badge-light border mr-1 mb-1">Nenhum horario selecionado</span>';
        return;
    }

    list.innerHTML = currentReminderTimes
        .map((time) => `
            <span class="badge badge-info mr-1 mb-1 p-2">
                ${time}
                <button type="button" class="btn btn-xs btn-link text-white p-0 ml-1" onclick="removeReminderTime('${time}')" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `)
        .join('');
}

function addCustomReminderTime() {
    const input = document.getElementById('customReminderTime');
    if (!input) return;

    const time = normalizeTime(input.value);
    if (!time) {
        Swal.fire('Atencao', 'Informe um horario valido no formato 24h.', 'warning');
        return;
    }

    if (!currentReminderTimes.includes(time)) {
        currentReminderTimes.push(time);
        currentReminderTimes.sort();
        renderReminderTimesList();
    }
}

function removeReminderTime(time) {
    currentReminderTimes = currentReminderTimes.filter((t) => t !== time);
    renderReminderTimesList();
}

window.addCustomReminderTime = addCustomReminderTime;
window.removeReminderTime = removeReminderTime;

async function getCurrentContext() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return null;

    let schoolId = sessionStorage.getItem('SCHOOL_ID');
    let userRole = sessionStorage.getItem('USER_ROLE');
    let userId = user.id;

    // Sempre revalida no banco para evitar contexto stale entre usuarios/sessoes.
    const { data: members, error } = await _supabase
        .from('school_members')
        .select('school_id, role, user_id')
        .eq('user_id', user.id)
        .limit(1);

    if (error) throw error;
    const member = Array.isArray(members) ? members[0] : null;
    if (member) {
        schoolId = member.school_id || schoolId;
        userRole = member.role || userRole;
        userId = member.user_id || user.id;
    }

    if (!schoolId) return null;

    // Atualiza cache com o usuario logado atual.
    sessionStorage.setItem('SCHOOL_ID', schoolId);
    sessionStorage.setItem('USER_ROLE', String(userRole || '').toLowerCase());
    sessionStorage.setItem('USER_ID', userId);

    return {
        schoolId,
        userId,
        userRole: String(userRole || '').toLowerCase()
    };
}

async function carregarNotificacoes() {
    try {
        const ctx = await getCurrentContext();
        if (!ctx?.schoolId || !ctx?.userId) throw new Error('Usuario nao logado.');
        applyParentSectionAccessByRole(ctx.userRole);

        const schoolPromise = _supabase
            .from('notification_system_settings')
            .select('value')
            .eq('key', NOTIF_KEY)
            .eq('school_id', ctx.schoolId)
            .limit(1);

        const userPromise = _supabase
            .from('user_notification_settings')
            .select('value')
            .eq('key', NOTIF_KEY)
            .eq('school_id', ctx.schoolId)
            .eq('user_id', ctx.userId)
            .limit(1);

        const [{ data: schoolRows, error: schoolError }, { data: userRows, error: userError }] =
            await Promise.all([schoolPromise, userPromise]);

        if (schoolError) throw schoolError;
        if (userError) throw userError;

        const schoolData = Array.isArray(schoolRows) ? schoolRows[0] : null;
        const userData = Array.isArray(userRows) ? userRows[0] : null;
        const schoolSettings = normalizeSettings(schoolData?.value || DEFAULT_NOTIFICATION_SETTINGS);
        const userSettings = userData?.value || null;
        const config = userSettings ? mergeSettings(schoolSettings, userSettings) : schoolSettings;

        document.getElementById('switchMaster').checked = config.master_on;
        document.getElementById('switchRealTime').checked = config.realtime_on;
        document.getElementById('switchRealtimeAllStatuses').checked = config.realtime_all_statuses !== false;
        document.getElementById('switchConsolidated').checked = config.consolidated_on;
        document.getElementById('switchConsolidatedAllStatuses').checked = config.consolidated_all_statuses !== false;

        currentRealtimeStatuses = [...(config.realtime_statuses || [])];
        renderRealtimeStatusOptions();
        currentConsolidatedStatuses = [...(config.consolidated_statuses || [])];
        renderConsolidatedStatusOptions();
        setInternalChannelsFromConfig(config);
        currentParentNotifications = config.parent_notifications || {};
        if (canManageParentNotifications) {
            renderParentNotificationOptions();
        }

        currentReminderTimes = [...(config.active_times || [])].sort();
        renderReminderTimesList();

        toggleNotificationSections();
        toggleRealtimeStatusOptions();
        toggleConsolidatedStatusOptions();
        toggleFrequencyOptions();
    } catch (err) {
        console.error('Erro ao carregar notificacoes:', err);
    }
}

async function salvarNotificacoes() {
    const btn = document.querySelector('button[onclick="salvarNotificacoes()"]');
    const originalText = btn ? btn.innerHTML : 'Salvar Preferencias';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;
    }

    try {
        const ctx = await getCurrentContext();
        if (!ctx?.schoolId || !ctx?.userId) throw new Error('Contexto de sessao invalido.');

        const settings = {
            master_on: document.getElementById('switchMaster').checked,
            realtime_on: document.getElementById('switchRealTime').checked,
            ...collectInternalChannelsFromUI(),
            realtime_all_statuses: document.getElementById('switchRealtimeAllStatuses').checked,
            realtime_statuses: collectRealtimeStatusesFromUI(),
            consolidated_all_statuses: document.getElementById('switchConsolidatedAllStatuses').checked,
            consolidated_statuses: collectConsolidatedStatusesFromUI(),
            consolidated_on: document.getElementById('switchConsolidated').checked,
            active_times: [...new Set(currentReminderTimes)].sort(),
            parent_notifications: canManageParentNotifications
                ? collectParentNotificationsFromUI()
                : (currentParentNotifications || {})
        };

        if (!settings.realtime_all_statuses && settings.realtime_statuses.length === 0) {
            return Swal.fire('Atencao', 'Selecione ao menos um status para notificacao em tempo real.', 'warning');
        }
        if (settings.realtime_on && !settings.internal_channels.whatsapp && !settings.internal_channels.email && !settings.internal_channels.sms) {
            return Swal.fire('Atencao', 'Selecione ao menos um canal para o envio em tempo real.', 'warning');
        }
        if (settings.consolidated_on && !settings.consolidated_all_statuses && settings.consolidated_statuses.length === 0) {
            return Swal.fire('Atencao', 'Selecione ao menos um status para o resumo consolidado.', 'warning');
        }
        if (settings.consolidated_on && !settings.internal_consolidated_channels.whatsapp && !settings.internal_consolidated_channels.email && !settings.internal_consolidated_channels.sms) {
            return Swal.fire('Atencao', 'Selecione ao menos um canal para o resumo consolidado.', 'warning');
        }
        if (canManageParentNotifications) {
            const invalidParent = Object.entries(settings.parent_notifications || {}).find(([, cfg]) => {
                if (!cfg?.enabled) return false;
                return !cfg.channels?.email && !cfg.channels?.whatsapp && !cfg.channels?.sms;
            });
            if (invalidParent) {
                return Swal.fire('Atencao', 'Em envio para responsaveis, selecione ao menos um canal para cada gatilho ativado.', 'warning');
            }
        }

        // Sempre salva por usuario para manter isolamento entre membros.
        const { error } = await _supabase
            .from('user_notification_settings')
            .upsert(
                {
                    school_id: ctx.schoolId,
                    user_id: ctx.userId,
                    key: NOTIF_KEY,
                    value: settings
                },
                { onConflict: 'school_id,user_id,key' }
            );
        if (error) throw error;

        await carregarNotificacoes();

        Swal.fire({
            icon: 'success',
            title: 'Salvo!',
            text: 'Preferencias atualizadas com sucesso.',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (err) {
        console.error('Erro ao salvar notificacoes:', err);
        Swal.fire('Erro', 'Falha ao salvar configuracoes.', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function toggleNotificationSections() {
    const masterOn = document.getElementById('switchMaster').checked;
    const optionsDiv = document.getElementById('notificationOptions');

    if (masterOn) {
        optionsDiv.style.opacity = '1';
        optionsDiv.style.pointerEvents = 'auto';
    } else {
        optionsDiv.style.opacity = '0.5';
        optionsDiv.style.pointerEvents = 'none';
    }
}

function toggleRealtimeStatusOptions() {
    const realtimeOn = document.getElementById('switchRealTime')?.checked;
    const allStatusesOn = document.getElementById('switchRealtimeAllStatuses')?.checked;
    const config = document.getElementById('realtimeStatusConfig');
    const channels = document.querySelectorAll('#realtimeChannelConfig input[type="checkbox"]');
    const checkboxes = document.querySelectorAll('.realtime-status-checkbox');

    if (!config) return;

    config.style.opacity = realtimeOn ? '1' : '0.5';
    config.style.pointerEvents = realtimeOn ? 'auto' : 'none';

    checkboxes.forEach((cb) => {
        cb.disabled = !realtimeOn || !!allStatusesOn;
    });
    channels.forEach((cb) => {
        cb.disabled = !realtimeOn;
    });
}

function toggleFrequencyOptions() {
    const consolidatedOn = document.getElementById('switchConsolidated').checked;
    const inputs = document.querySelectorAll('#frequencyOptions input, #frequencyOptions button');
    const channels = document.querySelectorAll('#consolidatedChannelConfig input[type="checkbox"]');

    inputs.forEach((input) => {
        input.disabled = !consolidatedOn;
    });
    channels.forEach((cb) => {
        cb.disabled = !consolidatedOn;
    });

    const div = document.getElementById('frequencyOptions');
    if (consolidatedOn) div.classList.remove('text-muted');
    else div.classList.add('text-muted');

    toggleConsolidatedStatusOptions();
}

function toggleConsolidatedStatusOptions() {
    const consolidatedOn = document.getElementById('switchConsolidated')?.checked;
    const allStatusesOn = document.getElementById('switchConsolidatedAllStatuses')?.checked;
    const config = document.getElementById('consolidatedStatusConfig');
    const checkboxes = document.querySelectorAll('.consolidated-status-checkbox');

    if (!config) return;

    config.style.opacity = consolidatedOn ? '1' : '0.5';
    config.style.pointerEvents = consolidatedOn ? 'auto' : 'none';

    checkboxes.forEach((cb) => {
        if (allStatusesOn) cb.checked = true;
        cb.disabled = !consolidatedOn || !!allStatusesOn;
    });
}

window.salvarNotificacoes = salvarNotificacoes;
window.toggleNotificationSections = toggleNotificationSections;
window.toggleRealtimeStatusOptions = toggleRealtimeStatusOptions;
window.toggleConsolidatedStatusOptions = toggleConsolidatedStatusOptions;
window.toggleFrequencyOptions = toggleFrequencyOptions;
window.toggleParentTriggerChannels = toggleParentTriggerChannels;

