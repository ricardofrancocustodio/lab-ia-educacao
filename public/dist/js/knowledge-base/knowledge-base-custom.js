// knowledge-base-custom.js
console.log('🚀 knowledge-base-custom.js carregado');

let _minhasPerguntas = [];
let _isLoadingMinhasPerguntas = false;
const salvarDadosPerguntaOriginal = typeof window.salvarDadosPergunta === 'function'
    ? window.salvarDadosPergunta.bind(window)
    : null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function aguardarContextoSessao(maxTentativas = 12, intervaloMs = 150) {
    for (let i = 0; i < maxTentativas; i++) {
        const schoolId = sessionStorage.getItem('SCHOOL_ID');
        if (schoolId && window.supabaseClient) {
            return { schoolId, supabaseClient: window.supabaseClient };
        }
        await sleep(intervaloMs);
    }
    return {
        schoolId: sessionStorage.getItem('SCHOOL_ID'),
        supabaseClient: window.supabaseClient
    };
}

// --- 1. Inicialização ---
// --- 1. Inicialização ---
function verificarEIniciarCustom() {
    console.log('📌 Verificando inicialização customizada...');
    console.log('📌 data-page:', document.body.dataset.page);
    
    if (document.body.dataset.page === 'knowledge') {
        console.log('✅ Página knowledge detectada, iniciando initCustomPage');
        // Pequeno atraso para garantir que o DOM e as abas do Bootstrap estejam prontos
        setTimeout(initCustomPage, 100);
    }
}

// Verifica se o DOM já carregou antes de tentar adicionar o escutador de eventos
if (document.readyState === 'loading') {
    // A página ainda está carregando, então ouvimos o evento padrão
    document.addEventListener('DOMContentLoaded', verificarEIniciarCustom);
} else {
    // A página JÁ carregou (o evento DOMContentLoaded passou), chamamos direto!
    verificarEIniciarCustom();
}

// --- 2. Buscar Dados (Apenas is_custom = true) ---
async function carregarMinhasPerguntas() {
    if (_isLoadingMinhasPerguntas) {
        console.log('ℹ️ carregarMinhasPerguntas ignorado: carregamento já em andamento');
        return;
    }

    _isLoadingMinhasPerguntas = true;
    console.log('🔍 Iniciando carregarMinhasPerguntas');

    const { schoolId, supabaseClient } = await aguardarContextoSessao();
    console.log('🏫 SCHOOL_ID:', schoolId);
    
    if (!schoolId) {
        console.error('❌ SCHOOL_ID não encontrado');
        mostrarMensagemCustom('warning', 'Você precisa estar logado ou ter um ID de escola válido.');
        _isLoadingMinhasPerguntas = false;
        return;
    }

    // Verificar se supabaseClient está disponível
    if (!supabaseClient) {
        console.error('❌ supabaseClient não disponível');
        mostrarMensagemCustom('danger', 'Erro: Supabase não inicializado.');
        _isLoadingMinhasPerguntas = false;
        return;
    }
    
    console.log('✅ supabaseClient disponível');

    // Mostrar loading APENAS no container de minhas perguntas
    const customQuestionsList = document.getElementById('customQuestionsList');
    if (customQuestionsList) {
        customQuestionsList.innerHTML = `
            <div class="text-center mb-4">
                <div class="spinner-border text-primary"></div>
                <p>Carregando respostas customizadas...</p>
            </div>
        `;
    }

    try {
        console.log('📡 Fazendo consulta ao banco...');
        const { data: questions, error } = await supabaseClient
            .from('knowledge_base')
            .select('*')
            .eq('school_id', schoolId)
            .order('id', { ascending: true });

        console.log('📦 Dados recebidos:', questions);
        console.log('⚠️ Erro (se houver):', error);

        if (error) {
            console.error('❌ Erro na consulta:', error);
            mostrarMensagemCustom('danger', 'Erro ao buscar minhas perguntas: ' + error.message);
            return;
        }

        const todasPerguntas = questions || [];
        _minhasPerguntas = todasPerguntas.filter((q) =>
            q?.is_custom === true || q?.is_custom === 'true'
        );
        console.log(`✅ ${_minhasPerguntas.length} perguntas customizadas encontradas`);
        
        // Atualizar contador na aba
        const customCount = document.getElementById('customCount');
        if (customCount) {
            customCount.innerText = _minhasPerguntas.length;
            console.log('🏷️ Contador atualizado:', _minhasPerguntas.length);
        }
        
        // Renderizar lista de minhas perguntas
        renderizarMinhasPerguntas();
        
    } catch (error) {
        console.error('❌ Erro na execução:', error);
        mostrarMensagemCustom('danger', 'Erro ao carregar dados: ' + error.message);
    } finally {
        _isLoadingMinhasPerguntas = false;
    }
}

// Função auxiliar para mostrar mensagens
function mostrarMensagemCustom(tipo, mensagem) {
    const customQuestionsList = document.getElementById('customQuestionsList');
    if (customQuestionsList) {
        const alertClass = tipo === 'warning' ? 'warning' : 'danger';
        customQuestionsList.innerHTML = `
            <div class="alert alert-${alertClass} text-center">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                ${mensagem}
            </div>
        `;
    }
}

// --- 3. Renderizar Lista de Minhas Perguntas ---
function renderizarMinhasPerguntas() {
    console.log('🎨 Iniciando renderizarMinhasPerguntas');
    
    const customQuestionsList = document.getElementById('customQuestionsList');
    
    if (!customQuestionsList) {
        console.error('❌ Elemento customQuestionsList não encontrado no DOM');
        return;
    }
    
    console.log('✅ Elemento customQuestionsList encontrado');
    
    if (_minhasPerguntas.length === 0) {
        console.log('ℹ️ Nenhuma pergunta encontrada, exibindo mensagem');
        customQuestionsList.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle mr-2"></i>
                Você ainda não criou nenhuma pergunta personalizada.
                <br>
                <button class="btn btn-success btn-sm mt-3" onclick="abrirModalMinhaPergunta()">
                    <i class="fas fa-plus mr-1"></i> Criar Primeira Resposta
                </button>
            </div>
        `;
        return;
    }
    
    console.log('📊 Agrupando por categoria...');
    
    // Agrupar por categoria para melhor organização
    const grupos = {};
    _minhasPerguntas.forEach(q => {
        let cat = q.category || 'Geral';
        cat = cat.charAt(0).toUpperCase() + cat.slice(1);
        if (!grupos[cat]) grupos[cat] = [];
        grupos[cat].push(q);
    });
    
    console.log('📁 Categorias encontradas:', Object.keys(grupos));
    
    let html = '';
    const categorias = Object.keys(grupos).sort();
    
    categorias.forEach(categoria => {
        const itens = grupos[categoria];
        
        html += `
            <div class="card card-outline card-primary mb-4">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-folder mr-2"></i>${categoria}
                        <span class="badge bg-primary ml-2">${itens.length}</span>
                    </h3>
                </div>
                <div class="card-body p-0">
                    ${gerarHtmlMinhasPerguntas(itens)}
                </div>
            </div>
        `;
    });
    
    console.log('📝 HTML gerado, tamanho:', html.length);
    customQuestionsList.innerHTML = html;
    
    console.log('🔄 Inicializando widgets...');
    inicializarWidgetsCustom();
}

function gerarHtmlMinhasPerguntas(lista) {
    console.log('📄 Gerando HTML para', lista.length, 'perguntas');
    
    return lista.map(item => {
        const respostaValida = item.answer || "Resposta pendente.";
        
        // Mostrar keywords se existirem
        const keywordsHtml = item.keywords && item.keywords.length > 0 
            ? `<div class="mt-2"><small class="text-muted">Palavras-chave: ${item.keywords.join(', ')}</small></div>`
            : '';

        return `
        <div class="card card-outline card-secondary m-2 collapsed-card">
            <div class="card-header">
                <h3 class="card-title" style="font-size:1rem; width: 80%;">
                    ${item.question}
                </h3>
                <div class="card-tools">
                    <button class="btn btn-tool text-primary" title="Editar Completo" onclick="abrirModalMinhaPergunta('${item.id}', event)">
                        <i class="fas fa-pen"></i>
                    </button>
                    
                    <button class="btn btn-tool text-danger" title="Excluir" onclick="excluirMinhaPergunta('${item.id}', event)">
                        <i class="fas fa-trash"></i>
                    </button>

                    <button type="button" class="btn btn-tool" data-card-widget="collapse-custom">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div class="card-body" style="display: none;">
                <p class="text-muted mb-1"><small>Resposta Rápida:</small></p>
                <textarea class="form-control mb-2" id="custom-answer-${item.id}" rows="3">${respostaValida}</textarea>
                ${keywordsHtml}
                <button class="btn btn-success btn-sm" onclick="salvarMinhaResposta('${item.id}')">Salvar Apenas Resposta</button>
            </div>
        </div>
    `}).join('');
}

function inicializarWidgetsCustom() {
    console.log('🔧 Inicializando widgets collapse-custom');
    
    // Usar setTimeout para garantir que o DOM esteja pronto
    setTimeout(() => {
        if (typeof $ !== 'undefined') {
            console.log('✅ jQuery disponível');
            try {
                // Inicializar apenas os widgets com collapse-custom
                $('[data-card-widget="collapse-custom"]').each(function() {
                    $(this).click(function(e) {
                        e.preventDefault();
                        const card = $(this).closest('.card');
                        const body = card.find('.card-body');
                        const icon = $(this).find('i');
                        
                        if (body.is(':visible')) {
                            body.slideUp();
                            icon.removeClass('fa-minus').addClass('fa-plus');
                        } else {
                            body.slideDown();
                            icon.removeClass('fa-plus').addClass('fa-minus');
                        }
                    });
                });
                console.log('✅ Widgets customizados inicializados');
            } catch (error) {
                console.error('❌ Erro ao inicializar widgets:', error);
            }
        } else {
            console.log('❌ jQuery não disponível');
            // Fallback sem jQuery
            document.querySelectorAll('[data-card-widget="collapse-custom"]').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const card = this.closest('.card');
                    const body = card.querySelector('.card-body');
                    const icon = this.querySelector('i');
                    
                    if (body.style.display === 'none') {
                        body.style.display = 'block';
                        icon.classList.remove('fa-plus');
                        icon.classList.add('fa-minus');
                    } else {
                        body.style.display = 'none';
                        icon.classList.remove('fa-minus');
                        icon.classList.add('fa-plus');
                    }
                });
            });
        }
    }, 200);
}

// --- 4. Busca na aba Minhas Perguntas ---
function setupCustomSearch() {
    console.log('🔍 Configurando busca customizada');
    
    const searchCustomInput = document.getElementById('searchCustomInput');
    if (searchCustomInput) {
        console.log('✅ Input de busca encontrado');
        
        // Remover listener antigo se existir
        searchCustomInput.removeEventListener('keyup', handleCustomSearch);
        searchCustomInput.addEventListener('keyup', handleCustomSearch);
        console.log('✅ Listener de busca adicionado');
    } else {
        console.log('❌ Input de busca não encontrado');
    }
}

function handleCustomSearch(e) {
    const termo = e.target.value.toLowerCase();
    console.log('🔎 Buscando por:', termo);
    
    if (termo.length === 0) {
        console.log('📋 Termo vazio, voltando à visualização normal');
        renderizarMinhasPerguntas();
        return;
    }

    const filtrados = _minhasPerguntas.filter(p => 
        (p.question && p.question.toLowerCase().includes(termo)) || 
        (p.answer && p.answer.toLowerCase().includes(termo)) ||
        (p.keywords && p.keywords.some(k => k.toLowerCase().includes(termo))) ||
        (p.category && p.category.toLowerCase().includes(termo))
    );
    
    console.log(`🔎 Encontrados ${filtrados.length} resultados`);
    
    const customQuestionsList = document.getElementById('customQuestionsList');
    
    if (filtrados.length > 0) {
        customQuestionsList.innerHTML = `
            <h5 class="text-primary mb-3">
                <i class="fas fa-search mr-2"></i>Resultados da busca (${filtrados.length})
            </h5>
            ${gerarHtmlMinhasPerguntas(filtrados)}
        `;
    } else {
        customQuestionsList.innerHTML = `
            <div class="alert alert-warning text-center">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Nenhuma pergunta encontrada para "${termo}"
            </div>
        `;
    }
    
    inicializarWidgetsCustom();
}

// --- 5. Inicialização da página customizada ---
function initCustomPage() {
    console.log('🚀 initCustomPage executando');
    
    if (document.body.dataset.page !== 'knowledge') {
        console.log('❌ Página não é knowledge, abortando');
        return;
    }

    console.log('✅ Página é knowledge, continuando...');

    // Verificar se estamos na aba correta
    const customTab = document.getElementById('custom-tab');
    if (customTab) {
        console.log('✅ Aba custom-tab encontrada');

        if (!customTab.dataset.customLoadBound) {
            if (typeof $ !== 'undefined') {
                $(customTab).on('shown.bs.tab', function () {
                    console.log('📌 Aba custom foi ativada (shown.bs.tab)');
                    carregarMinhasPerguntas();
                });
            }

            customTab.addEventListener('click', function () {
                setTimeout(() => {
                    console.log('📌 Aba custom clicada, garantindo carregamento');
                    carregarMinhasPerguntas();
                }, 120);
            });

            customTab.dataset.customLoadBound = '1';
            console.log('✅ Listeners da aba custom adicionados');
        }
    } else {
        console.log('❌ Aba custom-tab NÃO encontrada');
    }
    
    // Configurar busca
    setupCustomSearch();
    
    // Verificar se a aba custom está ativa inicialmente
    const customPane = document.getElementById('custom');
    if (customPane && customPane.classList.contains('active')) {
        console.log('✅ Aba custom já está ativa inicialmente');
        carregarMinhasPerguntas();
    } else {
        console.log('ℹ️ Aba custom não está ativa, aguardando clique');
    }
}

// --- 6. CRUD Functions para Minhas Perguntas ---
function abrirModalMinhaPergunta(id = null, event = null) {
    console.log('📝 abrirModalMinhaPergunta chamado com id:', id);
    
    if(event) event.stopPropagation();

    const datalist = document.getElementById('listCategorias');
    if (datalist) {
        // Manter as opções padrão
        datalist.innerHTML = `
            <option value="Geral">
            <option value="Secretaria">
            <option value="Financeiro">
            <option value="Pedagógico">
            <option value="Sistema">
        `;
    }

    if (id) {
        // MODO EDIÇÃO
        const item = _minhasPerguntas.find(p => p.id == id);
        if (!item) {
            console.error('❌ Item não encontrado com id:', id);
            return;
        }

        console.log('📝 Editando item:', item);
        
        document.getElementById('modalTitulo').innerText = 'Editar Resposta Customizada';
        document.getElementById('editId').value = item.id;
        document.getElementById('editCategory').value = item.category || '';
        document.getElementById('editQuestion').value = item.question;
        document.getElementById('editAnswer').value = item.answer || 'Resposta pendente.';
    } else {
        // MODO CRIAÇÃO
        console.log('📝 Criando nova pergunta');
        
        document.getElementById('modalTitulo').innerText = 'Nova Resposta Customizada';
        document.getElementById('editId').value = '';
        document.getElementById('editCategory').value = '';
        document.getElementById('editQuestion').value = '';
        document.getElementById('editAnswer').value = '';
    }

    $('#modalPergunta').modal('show');
}

// Função para sobrescrever o salvamento padrão quando estiver na aba custom
function salvarDadosPerguntaCustom() {
    // Verificar se estamos na aba custom
    const customPane = document.getElementById('custom');
    if (customPane && customPane.classList.contains('active')) {
        salvarDadosMinhaPergunta();
    } else {
        // Chamar a função original do knowledge-base.js
        if (typeof salvarDadosPergunta === 'function') {
            salvarDadosPergunta();
        }
    }
}

// Substituir a função global de salvamento
window.salvarDadosPergunta = function() {
    const customPane = document.getElementById('custom');
    if (customPane && customPane.classList.contains('active')) {
        salvarDadosMinhaPergunta();
    } else {
        // Chamar a função original se existir
        if (typeof salvarDadosPerguntaOriginal === 'function') {
            salvarDadosPerguntaOriginal();
        }
    }
};

async function salvarMinhaResposta(id) {
    const respostaElement = document.getElementById(`custom-answer-${id}`);
    if (!respostaElement) return;
    
    const novaResposta = respostaElement.value;
    const schoolId = sessionStorage.getItem('SCHOOL_ID');
    
    // Encontrar a pergunta completa
    const perguntaCompleta = _minhasPerguntas.find(p => p.id == id);
    if (!perguntaCompleta) return;
    
    // Garantir que não seja nulo
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
        const { embedding, keywords } = await gerarEmbeddingETagsCustom(perguntaCompleta.question, safeAnswer);
        
        const updateData = { 
            answer: safeAnswer,
            is_custom: true // Garantir que continue como custom
        };
        
        if (embedding) {
            updateData.embedding = embedding;
        }
        
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
            carregarMinhasPerguntas(); // Recarregar apenas as minhas perguntas
        } else {
            console.error(error);
            Swal.fire('Erro!', 'Erro ao salvar: ' + error.message, 'error');
        }
    } catch (error) {
        Swal.close();
        console.error('Erro ao gerar embedding:', error);
        
        await window.supabaseClient
            .from('knowledge_base')
            .update({ 
                answer: safeAnswer,
                is_custom: true
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
        carregarMinhasPerguntas();
    }
}

async function salvarNovaMinhaPergunta() {
    await salvarDadosMinhaPergunta();
}

async function salvarDadosMinhaPergunta() {
    const id = document.getElementById('editId').value;
    const category = document.getElementById('editCategory').value;
    const question = document.getElementById('editQuestion').value;
    const answer = document.getElementById('editAnswer').value;
    const schoolId = sessionStorage.getItem('SCHOOL_ID');

    if (!question || !category) {
        alert("Preencha a Categoria e a Pergunta.");
        return;
    }

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
        const { embedding, keywords } = await gerarEmbeddingETagsCustom(question, safeAnswer);
        
        const payload = {
            school_id: schoolId,
            category: category,
            question: question,
            answer: safeAnswer,
            is_custom: true // CRÍTICO: garantir que seja marcado como custom
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
            delete updatePayload.is_custom; // Não alterar o is_custom na edição
            
            const res = await window.supabaseClient
                .from('knowledge_base')
                .update(updatePayload)
                .eq('id', id)
                .eq('school_id', schoolId);
            error = res.error;
        } else {
            const res = await window.supabaseClient
                .from('knowledge_base')
                .insert([payload]);
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
                text: embedding ? 'Embedding e palavras-chave gerados' : 'Resposta customizada salva (sem embedding)',
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 2000 
            });
            carregarMinhasPerguntas(); // Recarregar apenas as minhas perguntas
        }

    } catch (error) {
        Swal.close();
        console.error('Erro no processo de salvamento:', error);
        
        const fallbackPayload = {
            school_id: schoolId,
            category: category,
            question: question,
            answer: safeAnswer,
            is_custom: true,
            keywords: extrairKeywordsSimplesCustom(`${question} ${safeAnswer}`)
        };

        try {
            if (id) {
                const updatePayload = { ...fallbackPayload };
                delete updatePayload.is_custom;
                await window.supabaseClient
                    .from('knowledge_base')
                    .update(updatePayload)
                    .eq('id', id)
                    .eq('school_id', schoolId);
            } else {
                await window.supabaseClient
                    .from('knowledge_base')
                    .insert([fallbackPayload]);
            }
            
            $('#modalPergunta').modal('hide');
            Swal.fire({ 
                icon: 'warning', 
                title: 'Salvo com fallback', 
                text: 'Resposta customizada salva com keywords locais',
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 3000 
            });
            carregarMinhasPerguntas();
        } catch (fallbackError) {
            console.error('Erro no fallback:', fallbackError);
            Swal.fire('Erro!', 'Não foi possível salvar a pergunta.', 'error');
        }
    }
}

async function excluirMinhaPergunta(id, event) {
    if(event) event.stopPropagation();

    const confirmacao = await Swal.fire({
        title: 'Tem certeza?',
        text: "Esta ação não pode ser desfeita.",
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
        Swal.fire('Excluído!', 'A pergunta foi removida.', 'success');
        
        // Remover do array local
        _minhasPerguntas = _minhasPerguntas.filter(p => p.id != id);
        
        // Atualizar contador
        const customCount = document.getElementById('customCount');
        if (customCount) {
            customCount.innerText = _minhasPerguntas.length;
        }
        
        renderizarMinhasPerguntas();
    }
}

// --- 7. Funções de Embedding e Keywords (customizadas) ---
async function gerarEmbeddingETagsCustom(pergunta, resposta) {
    try {
        const textoCompleto = `${pergunta}\n${resposta}`;
        console.log('🔍 Tentando gerar embedding via Supabase Edge Function (Custom)...');

        if (!window.supabaseClient) {
            throw new Error("Cliente Supabase não inicializado.");
        }

        const { data, error } = await window.supabaseClient.functions.invoke('embed', {
            body: { 
                text: textoCompleto,
                school_id: sessionStorage.getItem('SCHOOL_ID')
            }
        });

        if (error) {
            console.error('❌ Erro retornado pela Edge Function:', error);
            throw error;
        }

        return {
            embedding: data.embedding || null,
            keywords: data.keywords || []
        };

    } catch (error) {
        console.error('⚠️ Erro ao gerar embedding (usando fallback local):', error);
        
        const keywordsSimples = extrairKeywordsSimplesCustom(`${pergunta} ${resposta}`);
        
        return {
            embedding: null,
            keywords: keywordsSimples
        };
    }
}

function extrairKeywordsSimplesCustom(texto) {
    if (!texto) return [];
    
    const stopwords = ['a', 'o', 'e', 'de', 'da', 'do', 'em', 'para', 'com', 'como', 'que', 'é', 'são', 'seu', 'sua', 'se', 'no', 'na'];
    
    const palavras = texto.toLowerCase()
        .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
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
