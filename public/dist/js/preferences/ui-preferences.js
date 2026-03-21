// js/preferences/ui.js

// =========================================================
// RENDERIZAÇÃO
// =========================================================
function uiAlternarLoader(ativo) {
    const loader = document.getElementById('segmentos-loader');
    const container = document.getElementById('segmentos-hierarquia');
    if (loader) loader.style.display = ativo ? 'block' : 'none';
    if (container) container.style.display = ativo ? 'none' : 'block';
}

function uiMostrarErro(msg) {
    const alerta = document.getElementById('alert-segmentos-escola');
    if (alerta) {
        alerta.className = 'alert alert-danger';
        alerta.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i> ${msg}`;
        alerta.style.display = 'block';
    }
}

function uiMostrarAviso(msg) {
    const alerta = document.getElementById('alert-segmentos-escola');
    if (alerta) {
        alerta.className = 'alert alert-warning';
        alerta.innerHTML = `<i class="fas fa-info-circle mr-1"></i> ${msg}`;
        alerta.style.display = 'block';
    }
}

function uiDesativarModuloLegado(msg) {
    const card = document.getElementById('legacy-segments-card');
    const loader = document.getElementById('segmentos-loader');
    const container = document.getElementById('segmentos-hierarquia');
    const btnSalvar = document.getElementById('btn-salvar-segmentos-escola');
    const alerta = document.getElementById('alert-segmentos-escola');

    if (loader) loader.style.display = 'none';
    if (container) {
        container.style.display = 'block';
        container.innerHTML = '<div class="alert alert-light border mb-0"><i class="fas fa-database mr-1"></i> Este bloco depende de tabelas legadas que nao existem neste ambiente.</div>';
    }
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.classList.remove('btn-primary');
        btnSalvar.classList.add('btn-secondary');
    }
    if (alerta) {
        alerta.className = 'alert alert-warning';
        alerta.innerHTML = `<i class="fas fa-info-circle mr-1"></i> ${msg}`;
        alerta.style.display = 'block';
    }
    if (card) {
        card.classList.remove('card-primary');
        card.classList.add('card-secondary');
    }
}

function normalizarTextoSegmento(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function ehSerieTransicaoQuintoAno(nomeSegmento) {
    const nome = normalizarTextoSegmento(nomeSegmento);
    return nome.includes('5 ano') || nome.includes('5o ano');
}

// ==========================================
// RENDERIZAÇÃO DA UI (COM FILTRO E INTERAÇÃO)
// ==========================================

function uiRenderizarHierarquia(todosSegmentos, salvos) {
    const container = document.getElementById('segmentos-hierarquia');
    if (!container) return;

    container.innerHTML = '';
    
    // Lista de IDs salvos
    const setSalvos = (salvos && salvos.length > 0)
        ? new Set(salvos)
        : new Set(todosSegmentos.filter(s => s.active === true).map(s => s.id));

    // Agrupamento
    const grupos = {};
    todosSegmentos.forEach(seg => {
        const cat = seg.stage_category || 'OUTROS';
        if (!grupos[cat]) grupos[cat] = [];
        grupos[cat].push(seg);
    });

    const nomesCategorias = {
        'INFANTIL': 'Educação Infantil',
        'FUND1': 'Ensino Fundamental I',
        'FUND2': 'Ensino Fundamental II',
        'MEDIO': 'Ensino Médio',
        'OUTROS': 'Outros Cursos'
    };

    // --- LISTA DE NOMES PARA IGNORAR ---
    const nomesIgnorar = [
        'Fundamental I', 'Ensino Fundamental I', 
        'Fundamental II', 'Ensino Fundamental II', 
        'Ensino Médio', 'Médio', 'Colegial',
        'Educação Infantil', 'Infantil'
    ];

    Object.entries(grupos).forEach(([codigoCat, listaSegmentos]) => {
        const nomeExibicao = nomesCategorias[codigoCat] || codigoCat;
        const safeId = codigoCat.replace(/[^a-zA-Z0-9]/g, '_');

        const bloco = document.createElement('div');
        bloco.className = 'card card-light mb-3 shadow-sm border';
        
        let htmlFilhos = '';
        let totalMarcados = 0;
        let totalExibidos = 0; 

        listaSegmentos.forEach(seg => {
            // Filtro de nomes genéricos
            if (nomesIgnorar.includes(seg.name.trim())) return;
            if (seg.name.toUpperCase() === nomeExibicao.toUpperCase()) return;

            totalExibidos++; 

            const isChecked = setSalvos.has(seg.id) ? 'checked' : '';
            // Se desmarcado, desabilita inputs
            const isDisabled = isChecked ? '' : 'disabled';
            const opacityStyle = isChecked ? '1' : '0.5';
            const transicao5Ano = ehSerieTransicaoQuintoAno(seg.name) && (codigoCat === 'FUND1' || codigoCat === 'FUND2');
            const dragAttrs = transicao5Ano
                ? `draggable="true" ondragstart="dragSegment(event)" title="Arraste para Fundamental I ou II"`
                : '';
            const dragClass = transicao5Ano ? 'segmento-arrastavel' : '';
            const dragBadgeHtml = transicao5Ano
                ? `<span class="badge badge-info ml-2" style="font-size:10px;"><i class="fas fa-arrows-alt mr-1"></i>Arraste para mover</span>`
                : '';

            if (isChecked) totalMarcados++;

            htmlFilhos += `
                <div id="segment-row-${seg.id}"
                     class="segment-row d-flex flex-wrap align-items-center justify-content-between border-bottom py-2 ml-md-4 ml-2 mr-2 ${dragClass}"
                     data-segment-id="${seg.id}"
                     data-can-move="${transicao5Ano ? '1' : '0'}"
                     data-original-stage="${codigoCat}"
                     data-stage-category="${codigoCat}"
                     ${dragAttrs}>
                    
                    <div class="form-check mb-2 mb-md-0" style="min-width: 200px;">
                        <input class="form-check-input checkbox-filho" 
                               type="checkbox" 
                               id="seg-${seg.id}" 
                               value="${seg.id}" 
                               data-grupo="${safeId}"
                               onchange="toggleInputsVagas('${seg.id}')" 
                               ${isChecked}>
                        <label class="form-check-label text-dark font-weight-bold" for="seg-${seg.id}">
                            ${seg.name}
                            ${dragBadgeHtml}
                        </label>
                    </div>

                    <div id="wrapper-vagas-${seg.id}" class="d-flex align-items-center" style="gap: 10px; opacity: ${opacityStyle}; transition: opacity 0.3s;">
                        <div class="text-center">
                            <small class="d-block text-muted" style="font-size: 10px; text-transform: uppercase;">Manhã</small>
                            <input type="number" id="vagas-m-${seg.id}" class="form-control form-control-sm text-center input-vaga" style="width: 70px;" placeholder="0" min="0" ${isDisabled}>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted" style="font-size: 10px; text-transform: uppercase;">Tarde</small>
                            <input type="number" id="vagas-t-${seg.id}" class="form-control form-control-sm text-center input-vaga" style="width: 70px;" placeholder="0" min="0" ${isDisabled}>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted" style="font-size: 10px; text-transform: uppercase;">Integral</small>
                            <input type="number" id="vagas-i-${seg.id}" class="form-control form-control-sm text-center input-vaga" style="width: 70px;" placeholder="0" min="0" ${isDisabled}>
                        </div>
                    </div>
                </div>
            `;
        });

        if (totalExibidos > 0) {
            const todosMarcados = totalMarcados === totalExibidos;
            const checkedPai = todosMarcados ? 'checked' : '';

            bloco.innerHTML = `
                <div class="card-header p-2 bg-light border-bottom">
                    <div class="form-check">
                        <input class="form-check-input checkbox-pai" 
                               type="checkbox" 
                               id="cat-${safeId}" 
                               data-grupo-alvo="${safeId}"
                               ${checkedPai}>
                        <label class="form-check-label font-weight-bold text-primary" for="cat-${safeId}">
                            ${nomeExibicao}
                        </label>
                    </div>
                </div>
                <div id="dropzone-${safeId}"
                     class="card-body p-0"
                     data-grupo="${safeId}"
                     data-stage-category="${codigoCat}"
                     ondrop="dropSegment(event)"
                     ondragover="allowDropSegment(event)"
                     ondragleave="leaveDropSegment(event)">
                    ${htmlFilhos}
                </div>
            `;
            container.appendChild(bloco);
            
            // Estado Indeterminado (Visual)
            if (totalMarcados > 0 && totalMarcados < totalExibidos) {
                const elPai = bloco.querySelector(`#cat-${safeId}`);
                if(elPai) elPai.indeterminate = true;
            }
        }
    });

    if (todosSegmentos.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">Nenhum segmento cadastrado nesta escola.</div>';
    }
}

// ==========================================
// FUNÇÃO AJUDANTE (ESSENCIAL PARA O CLIQUE)
// ==========================================
window.toggleInputsVagas = function(segId) {
    const checkbox = document.getElementById(`seg-${segId}`);
    const wrapper = document.getElementById(`wrapper-vagas-${segId}`);
    
    if (!checkbox || !wrapper) return;

    const inputs = wrapper.querySelectorAll('input');
    
    if (checkbox.checked) {
        // Habilita
        wrapper.style.opacity = '1';
        inputs.forEach(input => input.disabled = false);
    } else {
        // Desabilita
        wrapper.style.opacity = '0.5';
        inputs.forEach(input => {
            input.disabled = true;
            // Opcional: Limpar o valor se quiser forçar o usuário a digitar novamente ao reativar
            // input.value = ''; 
        });
    }
}
// Helper para habilitar/desabilitar inputs visualmente
window.toggleInputsVagas = function(segId) {
    const checkbox = document.getElementById(`seg-${segId}`);
    const wrapper = document.getElementById(`wrapper-vagas-${segId}`);
    const inputs = wrapper.querySelectorAll('input');
    
    if (checkbox.checked) {
        wrapper.style.opacity = '1';
        inputs.forEach(input => input.disabled = false);
    } else {
        wrapper.style.opacity = '0.5';
        inputs.forEach(input => {
            input.disabled = true;
            input.value = ''; // Opcional: limpar valor ao desmarcar
        });
    }
}

// =========================================================
// EVENTOS E LÓGICA
// =========================================================
function uiConfigurarEventos() {
    const container = document.getElementById('segmentos-hierarquia');
    const btnSalvar = document.getElementById('btn-salvar-segmentos-escola');

    // Lógica Pai/Filho (Event Delegation para performance)
    if (container) {
        container.addEventListener('change', (e) => {
            const el = e.target;

            // 1. Clicou no PAI
            if (el.classList.contains('checkbox-pai')) {
                const grupo = el.dataset.grupoAlvo;
                const marcar = el.checked;
                
                // Marca/Desmarca todos os filhos desse grupo
                const filhos = container.querySelectorAll(`.checkbox-filho[data-grupo="${grupo}"]`);
                filhos.forEach(f => f.checked = marcar);
            }

            // 2. Clicou no FILHO
            if (el.classList.contains('checkbox-filho')) {
                const grupo = el.dataset.grupo;
                uiAtualizarEstadoPai(grupo);
            }
        });
    }

    // Botão Salvar
    if (btnSalvar) {
        // Remove listeners antigos para evitar duplicação (boa prática em SPAs simples)
        const novoBtn = btnSalvar.cloneNode(true);
        btnSalvar.parentNode.replaceChild(novoBtn, btnSalvar);
        
        novoBtn.addEventListener('click', async () => {
            await uiAcaoSalvar(novoBtn);
        });
    }
}

function uiAtualizarEstadoPai(grupoId) {
    const pai = document.querySelector(`.checkbox-pai[data-grupo-alvo="${grupoId}"]`);
    const filhos = document.querySelectorAll(`.checkbox-filho[data-grupo="${grupoId}"]`);
    
    if (!pai || filhos.length === 0) return;

    const total = filhos.length;
    const marcados = Array.from(filhos).filter(f => f.checked).length;

    if (marcados === 0) {
        pai.checked = false;
        pai.indeterminate = false;
    } else if (marcados === total) {
        pai.checked = true;
        pai.indeterminate = false;
    } else {
        pai.checked = false;
        pai.indeterminate = true; // O tracinho visual
    }
}

async function uiAcaoSalvar(btn) {
    // 1. Coleta IDs
    const checkedBoxes = document.querySelectorAll('.checkbox-filho:checked');
    const ids = Array.from(checkedBoxes).map(cb => cb.value);

    if (ids.length === 0) {
        return Swal.fire({
            icon: 'warning',
            title: 'Atenção',
            text: 'Selecione pelo menos um segmento para salvar.'
        });
    }

    // 2. Estado de Loading
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        // Chama a camada de Data
        await salvarPreferenciasNoBanco(ids);

        // Passo B: Salva os números de vagas digitados (Banco de Dados da Escola)
        // Essa função está no arquivo data-preferences.js
        if (typeof salvarTurmasCapacidade === 'function') {
            await salvarTurmasCapacidade(); 
        } else {
            console.warn("Função salvarTurmasCapacidade não encontrada.");
        }

        // 3. Sucesso! Mostra modal ou alerta
        if (typeof $ !== 'undefined' && $('#modalConfirmacao').length) {
             $('#modalConfirmacao').modal('show');
             setTimeout(() => $('#modalConfirmacao').modal('hide'), 2000);
        } else {
            // Fallback caso não tenha jQuery/Bootstrap modal pronto
            alert("Dados salvos com sucesso!");
        }

    } catch (err) {
        console.error(err);
        if (typeof uiMostrarErro === 'function') {
            uiMostrarErro("Erro ao salvar: " + err.message);
        } else {
            alert("Erro: " + err.message);
        }
    } finally {
        // Restaura o botão
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// No final do arquivo ui.js

// Preenche os inputs com os valores vindos do banco
function uiPreencherVagas(turmas) {
    if (!turmas || turmas.length === 0) return;

    turmas.forEach(turma => {
        // Mapeia o turno do banco ('Manhã') para a letra do ID do input ('m')
        let letra = '';
        if (turma.shift === 'Manhã') letra = 'm';
        else if (turma.shift === 'Tarde') letra = 't';
        else if (turma.shift === 'Integral') letra = 'i';

        if (letra) {
            // Reconstrói o ID: ex: vagas-m-UUID
            const inputId = `vagas-${letra}-${turma.segment_id}`;
            const input = document.getElementById(inputId);
            
            // Se o input existir na tela, coloca o valor
            if (input) {
                input.value = turma.capacity;
            }
        }
    });
}


// ==========================================
// DRAG AND DROP (SÉRIES/ANOS DE TRANSIÇÃO)
// ==========================================
window.allowDropSegment = function(ev) {
    ev.preventDefault();
    const zone = ev.currentTarget;
    if (zone) zone.classList.add('bg-light'); // Efeito visual ao passar por cima
}

window.leaveDropSegment = function(ev) {
    const zone = ev.currentTarget;
    if (zone) zone.classList.remove('bg-light');
}

window.dragSegment = function(ev) {
    const row = ev.currentTarget;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/segment-id", row.id); // Guarda o ID da linha arrastada
}

window.dropSegment = function(ev) {
    ev.preventDefault();
    const zone = ev.currentTarget;
    if (zone) zone.classList.remove('bg-light');

    const rowId = ev.dataTransfer.getData("text/segment-id");
    if (!rowId) return;

    const row = document.getElementById(rowId);
    if (!row) return;

    if (row.dataset.canMove !== '1') return;

    const sourceCheckbox = row.querySelector('.checkbox-filho');
    const sourceGroup = sourceCheckbox ? sourceCheckbox.dataset.grupo : null;
    const targetGroup = zone?.dataset?.grupo || null;
    const targetCategory = zone?.dataset?.stageCategory || null;

    if (!targetGroup || !targetCategory || targetGroup === sourceGroup) return;

    if (targetCategory !== 'FUND1' && targetCategory !== 'FUND2') return;

    const oldZone = sourceGroup ? document.getElementById(`dropzone-${sourceGroup}`) : null;
    const oldNextSibling = row.nextElementSibling;
    const previousStageCategory = row.dataset.stageCategory || row.dataset.originalStage || null;

    // Move fisicamente a linha no HTML para a nova zona (bloco do segmento)
    // Regra de UX:
    // - FUND1: 5º ano aparece por último
    // - FUND2: 5º ano aparece por primeiro
    if (targetCategory === 'FUND2') {
        const primeiraLinha = zone.querySelector('.segment-row');
        if (primeiraLinha) zone.insertBefore(row, primeiraLinha);
        else zone.appendChild(row);
    } else {
        zone.appendChild(row);
    }

    // Atualiza metadados para salvar no banco depois
    row.dataset.stageCategory = targetCategory;
    if (sourceCheckbox) sourceCheckbox.dataset.grupo = targetGroup;

    // Recalcula estados dos checkboxes pai (origem e destino)
    if (sourceGroup) uiAtualizarEstadoPai(sourceGroup);
    uiAtualizarEstadoPai(targetGroup);

    // Salva automaticamente ao soltar + toast de feedback
    if (typeof window.persistirStageCategorySegmento === 'function') {
        window.persistirStageCategorySegmento(row.dataset.segmentId, targetCategory)
            .then(() => {
                row.dataset.originalStage = targetCategory;
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Série movida e salva',
                        showConfirmButton: false,
                        timer: 1800
                    });
                }
            })
            .catch((err) => {
                console.error('Erro ao salvar categoria do segmento:', err);

                // Reverte UI se falhar no banco
                if (oldZone) {
                    if (oldNextSibling && oldNextSibling.parentElement === oldZone) {
                        oldZone.insertBefore(row, oldNextSibling);
                    } else {
                        oldZone.appendChild(row);
                    }
                }
                row.dataset.stageCategory = previousStageCategory || row.dataset.originalStage;
                if (sourceCheckbox) sourceCheckbox.dataset.grupo = sourceGroup || sourceCheckbox.dataset.grupo;

                if (sourceGroup) uiAtualizarEstadoPai(sourceGroup);
                uiAtualizarEstadoPai(targetGroup);

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: 'Não foi possível salvar. Movimento desfeito.',
                        showConfirmButton: false,
                        timer: 2600
                    });
                }
            });
    }
}
