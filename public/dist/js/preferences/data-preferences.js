// js/preferences/data.js

window.__legacyPreferencesSchemaAvailable = window.__legacyPreferencesSchemaAvailable ?? null;

function isMissingPreferencesTableError(error) {
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || error?.details || '').toLowerCase();
    return code === 'PGRST205' || message.includes('could not find the table') || message.includes('does not exist');
}

// Busca todos os segmentos da escola (ativos e inativos)
async function buscarSegmentosDaEscola(schoolId) {
    if (!_supabase) return [];
    
    const { data, error } = await _supabase
        .from('segments')
        .select('id, name, stage_category, display_order, active')
        .eq('school_id', schoolId)
        .order('display_order', { ascending: true });

    if (error) {
        if (isMissingPreferencesTableError(error)) {
            window.__legacyPreferencesSchemaAvailable = false;
            console.warn('Tabela segments nao encontrada; modulo legado de segmentos sera desativado.', error.message || error);
            return [];
        }
        throw error;
    }
    window.__legacyPreferencesSchemaAvailable = true;
    return data || [];
}

// Busca o que o usuario ja salvou anteriormente
async function buscarPreferenciasUsuario(userId, schoolId) {
    if (!_supabase || !userId) return [];

    const { data, error } = await _supabase
        .from('user_dashboard_prefs')
        .select('visible_segments')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .single();

    if (error && error.code !== 'PGRST116') {
        if (isMissingPreferencesTableError(error)) {
            console.warn('Tabela user_dashboard_prefs nao encontrada; usando fallback de segmentos ativos.', error.message || error);
            return [];
        }
        throw error;
    }

    return data?.visible_segments || [];
}

// Salva a lista de IDs selecionados
async function salvarPreferenciasNoBanco(idsSelecionados) {
    if (!_supabase || !_userId || !_schoolId) throw new Error("Dados de sessão perdidos.");

    const { error } = await _supabase
        .from('user_dashboard_prefs')
        .upsert({
            user_id: _userId,
            school_id: _schoolId,
            visible_segments: idsSelecionados,
            updated_at: new Date().toISOString()
        }, 
        { onConflict: 'user_id, school_id' });

    if (error) {
        if (isMissingPreferencesTableError(error)) {
            console.warn('Tabela user_dashboard_prefs nao encontrada; preferencia individual nao sera persistida.', error.message || error);
            return true;
        }
        throw error;
    }
    return true;
}

// ==========================================
// SALVAR TURMAS E VAGAS (NOVA LÓGICA)
// ==========================================

async function salvarTurmasCapacidade() {
    // Verifica se as variáveis globais do core.js estão carregadas
    if (!_supabase || !_schoolId) {
        console.error("Supabase ou School ID não inicializados.");
        return;
    }

    // 1. Seleciona apenas os segmentos marcados
    const checkboxes = document.querySelectorAll('.checkbox-filho:checked');
    const turmasParaSalvar = [];
    const ANO_LETIVO = 2026; 

    // 2. Varre cada segmento e coleta os inputs de Manhã, Tarde e Integral
    checkboxes.forEach(cb => {
        const segId = cb.value;
        // Pega o nome do segmento (está no label logo depois do checkbox)
        const label = document.querySelector(`label[for="${cb.id}"]`);
        const nomeSegmento = label ? label.innerText.trim() : 'Segmento';

        const inputM = document.getElementById(`vagas-m-${segId}`);
        const inputT = document.getElementById(`vagas-t-${segId}`);
        const inputI = document.getElementById(`vagas-i-${segId}`);

        // Função auxiliar interna
        const empacotarTurma = (turno, inputElement) => {
            if (!inputElement) return;
            const qtd = parseInt(inputElement.value);
            
            // Só salvamos se for um número válido (mesmo que seja 0)
            if (!isNaN(qtd)) {
                turmasParaSalvar.push({
                    school_id: _schoolId,      // Variável global do core.js
                    segment_id: segId,
                    school_year: ANO_LETIVO,
                    shift: turno,
                    name: `${nomeSegmento} - ${turno}`,
                    capacity: qtd
                });
            }
        };

        empacotarTurma('Manhã', inputM);
        empacotarTurma('Tarde', inputT);
        empacotarTurma('Integral', inputI);
    });

    // 3. Envia tudo para o banco de uma vez (Batch Upsert)
    if (turmasParaSalvar.length > 0) {
        const { error } = await _supabase
            .from('school_classes')
            .upsert(turmasParaSalvar, { 
                onConflict: 'school_id, segment_id, shift, school_year' 
            });

        if (error) throw error;
        console.log(`✅ ${turmasParaSalvar.length} turmas atualizadas.`);
    }
}

// No final do arquivo data.js

// Busca as turmas/vagas salvas no banco
async function buscarTurmasSalvas(schoolId) {
    if (!_supabase) return [];
    const ANO_LETIVO = 2026;

    const { data, error } = await _supabase
        .from('school_classes')
        .select('segment_id, shift, capacity')
        .eq('school_id', schoolId)
        .eq('school_year', ANO_LETIVO);

    if (error) {
        if (isMissingPreferencesTableError(error)) {
            console.warn('Tabela school_classes nao encontrada; interface seguira sem vagas salvas.', error.message || error);
            return [];
        }
        console.error("Erro ao buscar turmas:", error);
        return [];
    }
    return data || [];
}

// 📁 js/preferences/data.js

async function salvarPreferenciasSegmentos() {
    const btn = document.getElementById('btn-salvar-segmentos-escola');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        // 1. Identificar Segmentos Ativos e Inativos
        const allCheckboxes = document.querySelectorAll('.checkbox-filho');
        const activeIds = [];
        const inactiveIds = [];

        allCheckboxes.forEach(cb => {
            if (cb.checked) {
                activeIds.push(cb.value);
            } else {
                inactiveIds.push(cb.value);
            }
        });

        // 2. Atualizar tabela 'segments' no Banco
        // Marcar como TRUE os selecionados
        if (activeIds.length > 0) {
            const { error: errActive } = await _supabase
                .from('segments')
                .update({ active: true })
                .in('id', activeIds)
                .eq('school_id', _schoolId);
            if (errActive) throw errActive;
        }

        // Marcar como FALSE os não selecionados
        if (inactiveIds.length > 0) {
            const { error: errInactive } = await _supabase
                .from('segments')
                .update({ active: false })
                .in('id', inactiveIds)
                .eq('school_id', _schoolId);
            if (errInactive) throw errInactive;
        }

        // 3. Persistir mudança de categoria da série de transição (ex: 5º ano FUND1 <-> FUND2)
        const rowsMoviveis = document.querySelectorAll('.segment-row[data-can-move="1"]');
        for (const row of rowsMoviveis) {
            const segmentId = row.dataset.segmentId;
            const originalStage = row.dataset.originalStage;
            const currentStage = row.dataset.stageCategory;
            if (!segmentId || !currentStage || originalStage === currentStage) continue;

            const { error: errStage } = await _supabase
                .from('segments')
                .update({ stage_category: currentStage })
                .eq('id', segmentId)
                .eq('school_id', _schoolId);

            if (errStage) throw errStage;
            row.dataset.originalStage = currentStage;
        }

        // 4. Salvar as Vagas das Turmas (Lógica que você já possui)
        await salvarTurmasCapacidade(); 

        // Sucesso!
        $('#modalConfirmacao').modal('show');

    } catch (error) {
        console.error("Erro ao salvar preferências:", error);
        Swal.fire('Erro', 'Ocorreu um erro ao sincronizar os segmentos.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function atualizarResumoFundamentalNoBanco(isQuintoNoFund2) {
    if (!_supabase || !_schoolId) return;

    const payloadFund1 = isQuintoNoFund2
        ? { description: '1º ao 4º Ano', age_min: 6, age_max: 9 }
        : { description: '1º ao 5º Ano', age_min: 6, age_max: 10 };

    const payloadFund2 = isQuintoNoFund2
        ? { description: '5º ao 9º Ano', age_min: 10, age_max: 14 }
        : { description: '6º ao 9º Ano', age_min: 11, age_max: 14 };

    const nomesFund1 = ['Fundamental I', 'Ensino Fundamental I'];
    const nomesFund2 = ['Fundamental II', 'Ensino Fundamental II'];

    const { error: errF1 } = await _supabase
        .from('segments')
        .update(payloadFund1)
        .eq('school_id', _schoolId)
        .in('name', nomesFund1);
    if (errF1) throw errF1;

    const { error: errF2 } = await _supabase
        .from('segments')
        .update(payloadFund2)
        .eq('school_id', _schoolId)
        .in('name', nomesFund2);
    if (errF2) throw errF2;
}

window.persistirStageCategorySegmento = async function(segmentId, stageCategory) {
    if (!_supabase || !_schoolId) throw new Error('Sessão inválida para salvar segmento.');
    if (!segmentId || !stageCategory) throw new Error('Dados do segmento incompletos.');

    const { data: segAtual, error: errSegAtual } = await _supabase
        .from('segments')
        .select('name, age_min, age_max')
        .eq('id', segmentId)
        .eq('school_id', _schoolId)
        .single();
    if (errSegAtual) throw errSegAtual;

    const nomeNormalizado = String(segAtual?.name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    const ehQuintoAno = nomeNormalizado.includes('5º ano') || nomeNormalizado.includes('5o ano') || nomeNormalizado.includes('5 ano');

    const payload = { stage_category: stageCategory };
    if (ehQuintoAno) {
        payload.description = stageCategory === 'FUND2' ? 'Fundamental II' : 'Fundamental I';
        payload.display_order = stageCategory === 'FUND2' ? 30 : 25;
    }

    const { error } = await _supabase
        .from('segments')
        .update(payload)
        .eq('id', segmentId)
        .eq('school_id', _schoolId);

    if (error) throw error;

    if (ehQuintoAno) {
        await atualizarResumoFundamentalNoBanco(stageCategory === 'FUND2');
    }

    return true;
}
