function setupKnowledgeToolbar() {
    const actionButton = document.getElementById('knowledgeActionButton');
    const searchWrap = document.getElementById('knowledgeSearchWrap');
    const allTab = document.getElementById('all-tab');
    const customTab = document.getElementById('custom-tab');
    if (!actionButton || !allTab || !customTab) return;

    const activateStructured = () => {
        if (searchWrap) searchWrap.style.display = 'block';
        actionButton.innerHTML = '<i class="fas fa-plus mr-1"></i> Novo Item Estruturado';
        actionButton.onclick = abrirModalPergunta;
    };

    const activateCustom = () => {
        if (searchWrap) searchWrap.style.display = 'none';
        actionButton.innerHTML = '<i class="fas fa-plus mr-1"></i> Nova Resposta';
        actionButton.onclick = typeof abrirModalMinhaPergunta === 'function' ? abrirModalMinhaPergunta : abrirModalPergunta;
    };

    if (typeof $ !== 'undefined') {
        $(allTab).on('shown.bs.tab', activateStructured);
        $(customTab).on('shown.bs.tab', activateCustom);
    }

    activateStructured();
}
let _todasPerguntas = [];
let _todasPerguntasEstruturadas = [];

function isCustomEntry(item) {
    return item?.is_custom === true || item?.is_custom === 'true';
}


// --- 1. InicializaÃ§Ã£o ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'knowledge') {
        initPage();
        setupKnowledgeToolbar();
    }
});

// --- 2. Buscar Dados ---
async function carregarPerguntas() {
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    
    if (!schoolId) {
        document.getElementById('loading').innerHTML = '<div class="alert alert-warning">VocÃª precisa estar logado ou ter um ID de escola vÃ¡lido.</div>';
        return;
    }

    // Verificar se supabaseClient estÃ¡ disponÃ­vel
    if (!window.supabaseClient) {
        document.getElementById('loading').innerHTML = '<div class="alert alert-danger">Erro: Supabase nÃ£o inicializado.</div>';
        console.error('Supabase nÃ£o inicializado. Verifique supabaseConfig.js');
        return;
    }

    const { data: questions, error } = await window.supabaseClient
        .from('knowledge_base')
        .select('*')
        .eq('school_id', schoolId)
        .order('id', { ascending: true });

    document.getElementById('loading').style.display = 'none';

    if (error) {
        console.error(error);
        alert("Erro ao buscar perguntas.");
        return;
    }

    _todasPerguntas = questions || [];
    _todasPerguntasEstruturadas = _todasPerguntas.filter((item) => !isCustomEntry(item));
    
    const grupos = {};
    _todasPerguntasEstruturadas.forEach(q => {
        let cat = q.category || 'Geral';
        cat = cat.charAt(0).toUpperCase() + cat.slice(1);
        if (!grupos[cat]) grupos[cat] = [];
        grupos[cat].push(q);
    });

    renderizarAccordion(grupos);
}

// --- 3. Renderizar ---
function renderizarAccordion(grupos) {
    const tabMenu = document.getElementById('pills-tab');
    const tabContent = document.getElementById('pills-tabContent');
    const totalCount = document.getElementById('totalCount');

    tabMenu.innerHTML = '';
    tabContent.innerHTML = '';
    
    const categorias = Object.keys(grupos).sort();
    let total = 0;
    categorias.forEach(c => total += grupos[c].length);
    totalCount.innerText = `Itens estruturados: ${total}`;

    let isFirst = true;

    categorias.forEach((categoria, index) => {
        const itens = grupos[categoria];
        const tabId = `custom-tabs-${index}`;
        
        // 1. CorreÃ§Ã£o: Trocamos para tag <a>, usamos data-toggle="pill" e href="#..." (PadrÃ£o Bootstrap 4)
        // TambÃ©m ajustamos a classe da badge de bg-secondary para badge-secondary
        tabMenu.innerHTML += `
            <li class="nav-item">
                <a class="nav-link ${isFirst ? 'active' : ''}" id="tab-${index}" data-toggle="pill" href="#${tabId}" role="tab" aria-controls="${tabId}" aria-selected="${isFirst ? 'true' : 'false'}">
                    ${categoria} <span class="badge badge-secondary ml-1">${itens.length}</span>
                </a>
            </li>`;

        // ConteÃºdo da Aba (Permanece igual)
        tabContent.innerHTML += `
            <div class="tab-pane fade ${isFirst ? 'show active' : ''}" id="${tabId}" role="tabpanel" aria-labelledby="tab-${index}">
                ${gerarHtmlPerguntas(itens)}
            </div>`;
        
        isFirst = false;
    });

    inicializarWidgets();
}

function gerarHtmlPerguntas(lista) {
    return lista.map(item => {
        const podeExcluir = isCustomEntry(item);
        const respostaValida = item.answer || "Resposta pendente.";
        
        const btnExcluir = podeExcluir 
            ? `<button class="btn btn-tool text-danger" title="Excluir" onclick="excluirPergunta('${item.id}', event)"><i class="fas fa-trash"></i></button>`
            : '';

        // Mostrar keywords se existirem
        const sourceHtml = item.source_title
            ? `<div class="mt-2"><small class="text-muted">Fonte: ${item.source_title} | Versao: ${item.source_version_label || item.source_version_number || 'sem versao'}</small></div>`
            : '<div class="mt-2"><small class="text-muted">Origem: Base estruturada interna</small></div>';

        const keywordsHtml = item.keywords && item.keywords.length > 0 
            ? `<div class="mt-2"><small class="text-muted">Palavras-chave: ${item.keywords.join(', ')}</small></div>`
            : '';

        return `
        <div class="card card-outline card-secondary mb-2 collapsed-card">
            <div class="card-header">
                <h3 class="card-title" style="font-size:1rem; width: 80%;">
                    ${item.question}
                </h3>
                <div class="card-tools">
                    <button class="btn btn-tool text-primary" title="Editar Completo" onclick="abrirModalPergunta('${item.id}', event)">
                        <i class="fas fa-pen"></i>
                    </button>
                    
                    ${btnExcluir}

                    <button type="button" class="btn btn-tool" data-card-widget="collapse"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <div class="card-body" style="display:none;">
                <p class="text-muted mb-1"><small>Resposta RÃ¡pida:</small></p>
                <textarea class="form-control mb-2" id="answer-${item.id}" rows="3">${respostaValida}</textarea>
                ${sourceHtml}
                ${keywordsHtml}
                <button class="btn btn-success btn-sm" onclick="salvarResposta('${item.id}')">Salvar Resposta Estruturada</button>
            </div>
        </div>
    `}).join('');
}

function inicializarWidgets() {
    if(typeof $ !== 'undefined') $('[data-card-widget="collapse"]').CardWidget();
}

async function salvarResposta(id) {
    const respostaElement = document.getElementById(`answer-${id}`);
    if (!respostaElement) return;
    
    const novaResposta = respostaElement.value;
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    
    // Encontrar a pergunta completa
    const perguntaCompleta = _todasPerguntasEstruturadas.find(p => p.id == id) || _todasPerguntas.find(p => p.id == id);
    if (!perguntaCompleta) return;
    
    // Garantir que nÃ£o seja nulo
    const safeAnswer = novaResposta || "Resposta pendente.";
    
    Swal.fire({
        title: 'Atualizando...',
        text: 'Gerando embedding e palavras-chave',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const { embedding, keywords } = await gerarEmbeddingETags(perguntaCompleta.question, safeAnswer);
        
        const updateData = { 
            answer: safeAnswer,
        };
        
        // Adicionar embedding se gerado
        if (embedding) {
            updateData.embedding = embedding;
        }
        
        // Adicionar keywords se geradas
        if (keywords && keywords.length > 0) {
            updateData.keywords = keywords;
        }
        
        const { error } = await window.supabaseClient
            .from('knowledge_base')
            .update(updateData)
            .eq('id', id)
            .eq('school_id', schoolId);

        Swal.close();

        if (!error) {
            Swal.fire({ 
                icon: 'success', 
                title: 'Salvo!', 
                text: embedding ? 'Embedding e palavras-chave atualizados' : 'Resposta salva (sem embedding)',
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 3000 
            });
            carregarPerguntas();
        } else {
            console.error(error);
            Swal.fire('Erro!', 'Erro ao salvar: ' + error.message, 'error');
        }
    } catch (error) {
        Swal.close();
        console.error('Erro ao gerar embedding:', error);
        
        // Salvar mesmo sem embedding em caso de erro
        await window.supabaseClient
            .from('knowledge_base')
            .update({ 
                answer: safeAnswer
            })
            .eq('id', id)
            .eq('school_id', schoolId);
            
        Swal.fire({ 
            icon: 'success', 
            title: 'Salvo!', 
            text: 'Resposta salva (sem embedding)',
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 3000 
        });
        carregarPerguntas();
    }
}

// Busca
document.getElementById('searchInput').addEventListener('keyup', (e) => {
    const termo = e.target.value.toLowerCase();
    const viewTabs = document.getElementById('view-tabs');
    const viewSearch = document.getElementById('view-search');
    
    if (termo.length === 0) {
        viewTabs.style.display = 'block';
        viewSearch.style.display = 'none';
        return;
    }

    viewTabs.style.display = 'none';
    viewSearch.style.display = 'block';

    const filtrados = _todasPerguntasEstruturadas.filter(p => 
        (p.question && p.question.toLowerCase().includes(termo)) || 
        (p.answer && p.answer.toLowerCase().includes(termo)) ||
        (p.keywords && p.keywords.some(k => k.toLowerCase().includes(termo)))
    );
    
    document.getElementById('search-results-list').innerHTML = filtrados.length > 0 
        ? gerarHtmlPerguntas(filtrados) 
        : '<p class="text-muted">Nada encontrado.</p>';
    
    inicializarWidgets();
});

// --- 4. PermissÃµes ---
const PERMISSIONS = {
    superadmin: { canDelete: true, canManageUsers: true, viewAllReports: true, kbAll: true },
    network_manager: { canDelete: true, canManageUsers: true, viewAllReports: true, kbAll: true },
    content_curator: { canDelete: true, canManageUsers: false, viewAllReports: true, kbAll: true },
    public_operator: { canDelete: false, canManageUsers: false, viewAllReports: false, kbCategory: ['Atendimento Publico'] },
    secretariat: { canDelete: false, canManageUsers: false, viewAllReports: false, kbCategory: ['Secretaria'] },
    coordination: { canDelete: false, canManageUsers: false, viewAllReports: true, kbCategory: ['Coordenacao'] },
    treasury: { canDelete: false, canManageUsers: false, viewAllReports: true, kbCategory: ['Tesouraria'] },
    direction: { canDelete: false, canManageUsers: false, viewAllReports: true, kbCategory: ['Direcao'] },
    auditor: { canDelete: false, canManageUsers: false, viewAllReports: true, kbAll: true },
    observer: { canDelete: false, canManageUsers: false, viewAllReports: false, kbAll: true }
};

// --- 5. InicializaÃ§Ã£o da pÃ¡gina ---
function initPage() {
    if (document.body.dataset.page !== 'knowledge') return;

    // Configurar menu de usuÃ¡rios baseado na role
    const userRole = sessionStorage.getItem('USER_ROLE');
    if (userRole === 'superadmin' || userRole === 'network_manager') {
        const menuUsuarios = document.getElementById('menu-usuarios');
        if (menuUsuarios) {
            menuUsuarios.style.display = 'block';
        }
    }
    
    carregarPerguntas();
}

// --- 6. CRUD Functions ---
function abrirModalPergunta(id = null, event = null) {
    if(event) event.stopPropagation();

    const datalist = document.getElementById('listCategorias');
    if (datalist) {
        datalist.innerHTML = '';
        const categoriasUnicas = [...new Set(_todasPerguntas.map(p => p.category))];
        categoriasUnicas.forEach(c => {
            datalist.innerHTML += `<option value="${c}">`;
        });
    }

    if (id) {
        // MODO EDIÃ‡ÃƒO
        const item = _todasPerguntas.find(p => p.id == id);
        if (!item) return;

        document.getElementById('modalTitulo').innerText = 'Editar Item da Base Estruturada';
        document.getElementById('editId').value = item.id;
        document.getElementById('editCategory').value = item.category || '';
        document.getElementById('editQuestion').value = item.question;
        document.getElementById('editAnswer').value = item.answer || 'Resposta pendente.';
    } else {
        // MODO CRIAÃ‡ÃƒO
        document.getElementById('modalTitulo').innerText = 'Novo Item da Base Estruturada';
        document.getElementById('editId').value = '';
        document.getElementById('editCategory').value = '';
        document.getElementById('editQuestion').value = '';
        document.getElementById('editAnswer').value = '';
    }

    $('#modalPergunta').modal('show');
}

async function salvarNovaPergunta() {
    await salvarDadosPergunta();
}

async function salvarDadosPergunta() {
    const id = document.getElementById('editId').value;
    const category = document.getElementById('editCategory').value;
    const question = document.getElementById('editQuestion').value;
    const answer = document.getElementById('editAnswer').value;
    const schoolId = sessionStorage.getItem('SCHOOL_ID');

    if (!question || !category) {
        alert("Preencha a Categoria e a Pergunta.");
        return;
    }

    // Garantir que answer nÃ£o seja nulo
    const safeAnswer = answer || "Resposta pendente.";

    Swal.fire({
        title: 'Salvando...',
        text: 'Gerando embedding e palavras-chave',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const { embedding, keywords } = await gerarEmbeddingETags(question, safeAnswer);
        
        const payload = {
            school_id: schoolId,
            category: category,
            question: question,
            answer: safeAnswer
        };

        if (embedding) {
            payload.embedding = embedding;
        }
        
        if (keywords && keywords.length > 0) {
            payload.keywords = keywords;
        }

        let error = null;

        if (id) {
            const updatePayload = { ...payload };
            delete updatePayload.is_custom;
            
            const res = await window.supabaseClient.from('knowledge_base').update(updatePayload).eq('id', id);
            error = res.error;
        } else {
            const res = await window.supabaseClient.from('knowledge_base').insert([payload]);
            error = res.error;
        }

        Swal.close();

        if (error) {
            console.error(error);
            Swal.fire('Erro!', 'Erro ao salvar: ' + error.message, 'error');
        } else {
            $('#modalPergunta').modal('hide');
            Swal.fire({ 
                icon: 'success', 
                title: 'Sucesso!', 
                text: embedding ? 'Base estruturada atualizada com palavras-chave' : 'Item estruturado salvo',
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 2000 
            });
            carregarPerguntas();
        }

    } catch (error) {
        Swal.close();
        console.error('Erro no processo de salvamento:', error);
        
        const fallbackPayload = {
            school_id: schoolId,
            category: category,
            question: question,
            answer: safeAnswer,
            keywords: extrairKeywordsSimples(`${question} ${safeAnswer}`)
        };

        try {
            if (id) {
                const updatePayload = { ...fallbackPayload };
                delete updatePayload.is_custom;
                await window.supabaseClient.from('knowledge_base').update(updatePayload).eq('id', id);
            } else {
                await window.supabaseClient.from('knowledge_base').insert([fallbackPayload]);
            }
            
            $('#modalPergunta').modal('hide');
            Swal.fire({ 
                icon: 'warning', 
                title: 'Salvo com fallback', 
                text: 'Item estruturado salvo com keywords locais',
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 3000 
            });
            carregarPerguntas();
        } catch (fallbackError) {
            console.error('Erro no fallback:', fallbackError);
            Swal.fire('Erro!', 'NÃ£o foi possÃ­vel salvar a pergunta.', 'error');
        }
    }
}

async function excluirPergunta(id, event) {
    if(event) event.stopPropagation();

    const confirmacao = await Swal.fire({
        title: 'Tem certeza?',
        text: "Esta aÃ§Ã£o nÃ£o pode ser desfeita.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacao.isConfirmed) return;

    const { error } = await window.supabaseClient
        .from('knowledge_base')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(error);
        Swal.fire('Erro!', 'Erro ao excluir: ' + error.message, 'error');
    } else {
        Swal.fire('ExcluÃ­do!', 'A pergunta foi removida.', 'success');
        carregarPerguntas();
    }
}

// --- 7. FunÃ§Ãµes de Embedding e Keywords ---
async function gerarEmbeddingETags(pergunta, resposta) {
    try {
        const textoCompleto = `${pergunta}\n${resposta}`;
        console.log('ðŸ” Tentando gerar embedding via Supabase Edge Function...');

        // Verifica se o cliente Supabase estÃ¡ disponÃ­vel
        if (!window.supabaseClient) {
            throw new Error("Cliente Supabase nÃ£o inicializado.");
        }

        // --- MUDANÃ‡A PRINCIPAL: Chamada Ã  Edge Function 'embed' ---
        // Isso substitui o fetch('/api/generate-embedding')
        const { data, error } = await window.supabaseClient.functions.invoke('embed', {
            body: { 
                text: textoCompleto,
                school_id: sessionStorage.getItem('SCHOOL_ID') // Opcional, Ãºtil se quiser logar na function
            }
        });

        // Se o Supabase retornar erro na execuÃ§Ã£o da funÃ§Ã£o
        if (error) {
            console.error('âŒ Erro retornado pela Edge Function:', error);
            throw error; // ForÃ§a a ida para o catch (fallback)
        }

        // Sucesso: Retorna os dados vindos da OpenAI via Supabase
        return {
            embedding: data.embedding || null,
            keywords: data.keywords || []
        };

    } catch (error) {
        console.error('âš ï¸ Erro ao gerar embedding (usando fallback local):', error);
        
        // --- FALLBACK ---
        // Se a API falhar, acabar os crÃ©ditos ou der erro de rede,
        // geramos as keywords localmente para nÃ£o travar o salvamento.
        const keywordsSimples = extrairKeywordsSimples(`${pergunta} ${resposta}`);
        
        return {
            embedding: null,
            keywords: keywordsSimples
        };
    }
}

function extrairKeywordsSimples(texto) {
    if (!texto) return [];
    
    const stopwords = ['a', 'o', 'e', 'de', 'da', 'do', 'em', 'para', 'com', 'como', 'que', 'Ã©', 'sÃ£o', 'seu', 'sua', 'se', 'no', 'na'];
    
    const palavras = texto.toLowerCase()
        .replace(/[^\w\sÃ¡Ã Ã¢Ã£Ã©Ã¨ÃªÃ­Ã¯Ã³Ã´ÃµÃ¶ÃºÃ§Ã±]/g, ' ')
        .split(/\s+/)
        .filter(palavra => palavra.length > 3 && !stopwords.includes(palavra));
    
    const frequencia = {};
    palavras.forEach(palavra => {
        frequencia[palavra] = (frequencia[palavra] || 0) + 1;
    });
    
    return Object.entries(frequencia)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
}


