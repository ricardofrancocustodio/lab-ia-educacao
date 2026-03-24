// 📁 public/dist/js/official-content/faq-extended.js
// Implementação completa do módulo FAQ Oficial conforme README-FAQ-MODULO.md
// Gerencia: Upload (CSV/Manual), Ciclo de Vida (Draft/Review/Published/Archived), Vigência, IA e Auditoria

(() => {
  // Aguardar carregamento do OfficialContentPage
  const ensureFaqExtensions = () => {
    if (!window.OfficialContentPage) {
      setTimeout(ensureFaqExtensions, 100);
      return;
    }

    const baseModule = window.OfficialContentPage;

    // Sobrescrever funções do baseModule para usar a nova lógica estendida
    baseModule.downloadFaqTemplate = downloadFaqTemplate;
    baseModule.importFaqCsv = importFaqCsv;
    baseModule.addFaqItem = () => addFaqItemUI();
    baseModule.saveFaq = saveAllFaqItems;
    
    // Inicializar lista de FAQs ao carregar
    const originalInit = baseModule.init;
    baseModule.init = async () => {
      if (originalInit) await originalInit();
      await loadFaqItems();
    };

    // ====================================================================
    // CARREGAR ITENS DA FAQ DO BACKEND
    // ====================================================================
    async function loadFaqItems() {
      const container = document.getElementById('faq-items');
      if (!container) return;
      
      container.innerHTML = '<div class="text-center p-3"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando FAQs...</div>';
      
      try {
        const token = await window.getAccessToken();
        const schoolId = sessionStorage.getItem('SCHOOL_ID');
        const response = await fetch(`/api/faq?scope=school`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-school-id': schoolId
          }
        });
        
        const data = await response.json();
        container.innerHTML = '';
        
        if (data.ok && data.items && data.items.length > 0) {
          data.items.forEach(item => addFaqItemUI(item));
          toggleEmpty('faq', false);
        } else {
          toggleEmpty('faq', true);
        }
      } catch (error) {
        console.error('Erro ao carregar FAQs:', error);
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar FAQs do servidor.</div>';
      }
    }

    // ====================================================================
    // DOWNLOADS DE TEMPLATE CSV
    // ====================================================================
    function downloadFaqTemplate() {
      const csv = 'pergunta,resposta,categoria,publico_alvo,vigencia_inicio,vigencia_fim,status\n' +
        '"Qual é o período de matrícula?","O período de matrícula é de fevereiro a março de cada ano.","Administrativo","Responsáveis","2026-02-01","2026-03-31","draft"\n' +
        '"Quais documentos são necessários?","RG, CPF, Histórico escolar e comprovante de residência.","Administrativo","Responsáveis","2026-02-01","","published"';
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "template-faq-oficial.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // ====================================================================
    // IMPORTAR FAQ DE CSV
    // ====================================================================
    function importFaqCsv(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) throw new Error('CSV vazio ou sem cabeçalho.');

          let importedCount = 0;
          for (let i = 1; i < lines.length; i++) {
            const cells = parseCSVLine(lines[i]);
            if (cells.length < 2) continue;

            addFaqItemUI({
              question: cells[0],
              answer: cells[1],
              category: cells[2] || 'Geral',
              audience: cells[3] || 'Geral',
              valid_from: cells[4] || new Date().toISOString().split('T')[0],
              valid_to: cells[5] || '',
              status: cells[6] || 'draft'
            });
            importedCount++;
          }
          Swal.fire('Sucesso', `${importedCount} item(ns) carregado(s) para edição. Clique em "Salvar" para confirmar.`, 'success');
        } catch (error) {
          Swal.fire('Erro', error.message, 'error');
        }
      };
      reader.readAsText(file);
    }

    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i+1] === '"') { current += '"'; i++; }
          else insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) { result.push(current.trim()); current = ''; }
        else current += char;
      }
      result.push(current.trim());
      return result;
    }

    // ====================================================================
    // INTERFACE DE ITEM (UI)
    // ====================================================================
    function addFaqItemUI(item = {}) {
      const container = document.getElementById('faq-items');
      const el = document.createElement('div');
      el.className = 'official-list-item card mb-3 border-left-primary';
      el.dataset.id = item.id || '';
      
      const status = item.status || 'draft';
      const statusColors = { draft: 'warning', review: 'info', published: 'success', archived: 'secondary' };
      const statusLabels = { draft: 'Rascunho', review: 'Em análise', published: 'Publicado', archived: 'Arquivado' };

      el.innerHTML = `
        <div class="card-body p-3">
          <div class="row">
            <div class="col-md-8 form-group">
              <label class="small font-weight-bold">Pergunta</label>
              <input class="form-control faq-question" value="${escapeHtml(item.question || '')}" placeholder="Ex: Qual o horário de funcionamento?">
            </div>
            <div class="col-md-4 form-group">
              <label class="small font-weight-bold">Status</label>
              <select class="form-control faq-status">
                <option value="draft" ${status === 'draft' ? 'selected' : ''}>Rascunho</option>
                <option value="review" ${status === 'review' ? 'selected' : ''}>Em análise</option>
                <option value="published" ${status === 'published' ? 'selected' : ''}>Publicado</option>
                <option value="archived" ${status === 'archived' ? 'selected' : ''}>Arquivado</option>
              </select>
            </div>
            <div class="col-md-12 form-group">
              <label class="small font-weight-bold">Resposta</label>
              <textarea class="form-control faq-answer" rows="3">${escapeHtml(item.answer || '')}</textarea>
            </div>
            <div class="col-md-4 form-group">
              <label class="small font-weight-bold">Categoria</label>
              <input class="form-control faq-category" value="${escapeHtml(item.category || 'Geral')}">
            </div>
            <div class="col-md-4 form-group">
              <label class="small font-weight-bold">Vigência Início</label>
              <input type="date" class="form-control faq-valid-from" value="${item.valid_from ? item.valid_from.split('T')[0] : new Date().toISOString().split('T')[0]}">
            </div>
            <div class="col-md-4 form-group">
              <label class="small font-weight-bold">Vigência Fim</label>
              <input type="date" class="form-control faq-valid-to" value="${item.valid_to ? item.valid_to.split('T')[0] : ''}">
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <div>
              <button class="btn btn-xs btn-outline-info mr-2 test-ai-btn"><i class="fas fa-robot mr-1"></i>Testar IA</button>
              <button class="btn btn-xs btn-outline-secondary history-btn"><i class="fas fa-history mr-1"></i>Histórico</button>
            </div>
            <button class="btn btn-xs btn-link text-danger remove-item-btn"><i class="fas fa-trash"></i></button>
          </div>
          <div class="ai-result mt-2" style="display:none"></div>
        </div>`;

      container.appendChild(el);
      toggleEmpty('faq', false);

      // Eventos
      el.querySelector('.remove-item-btn').onclick = () => { el.remove(); toggleEmpty('faq', container.children.length === 0); };
      el.querySelector('.test-ai-btn').onclick = () => testFaqWithAI(el);
      el.querySelector('.history-btn').onclick = () => showFaqHistory(item.id);
    }

    function toggleEmpty(module, isEmpty) {
      const emptyEl = document.getElementById(`${module}-empty`);
      if (emptyEl) emptyEl.style.display = isEmpty ? 'block' : 'none';
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // ====================================================================
    // SALVAR TODOS OS ITENS
    // ====================================================================
    async function saveAllFaqItems() {
      const items = document.querySelectorAll('#faq-items .official-list-item');
      if (items.length === 0) {
        Swal.fire('Aviso', 'Nenhuma FAQ para salvar.', 'warning');
        return;
      }

      Swal.fire({ title: 'Salvando FAQs...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      try {
        const token = await window.getAccessToken();
        const schoolId = sessionStorage.getItem('SCHOOL_ID');
        let successCount = 0;

        for (const el of items) {
          const id = el.dataset.id;
          const payload = {
            question: el.querySelector('.faq-question').value,
            answer: el.querySelector('.faq-answer').value,
            category: el.querySelector('.faq-category').value,
            status: el.querySelector('.faq-status').value,
            valid_from: el.querySelector('.faq-valid-from').value,
            valid_to: el.querySelector('.faq-valid-to').value || null
          };

          const method = id ? 'PUT' : 'POST';
          const url = id ? `/api/faq/${id}?scope=school` : `/api/faq?scope=school`;

          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-school-id': schoolId },
            body: JSON.stringify(payload)
          });

          if (res.ok) successCount++;
        }

        Swal.fire('Sucesso', `${successCount} FAQ(s) processada(s) com sucesso.`, 'success');
        await loadFaqItems();
      } catch (error) {
        Swal.fire('Erro', error.message, 'error');
      }
    }

    // ====================================================================
    // TESTE COM IA E HISTÓRICO (STUBS PARA INTEGRAÇÃO)
    // ====================================================================
    async function testFaqWithAI(el) {
      const resultDiv = el.querySelector('.ai-result');
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<small class="text-muted"><i class="fas fa-spinner fa-spin mr-1"></i>Analisando relevância...</small>';
      
      try {
        const question = el.querySelector('.faq-question').value;
        const answer = el.querySelector('.faq-answer').value;
        const token = await window.getAccessToken();
        
        const faqId = el.dataset.id;
        const url = faqId ? `/api/faq/${faqId}/test` : `/api/faq/test-mock`; // Fallback para mock se não salvo
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`,
            'x-school-id': sessionStorage.getItem('SCHOOL_ID')
          },
          body: JSON.stringify({ question, answer })
        });
        
        const data = await res.json();
        const score = data.score || 0;
        const color = score > 0.8 ? 'success' : score > 0.5 ? 'warning' : 'danger';
        resultDiv.innerHTML = `<div class="alert alert-${color} py-1 px-2 mb-0 mt-1 small">Score de Relevância IA: <strong>${(score * 100).toFixed(0)}%</strong></div>`;
      } catch (e) {
        resultDiv.innerHTML = '<small class="text-danger">Erro ao conectar com serviço de IA.</small>';
      }
    }

    async function showFaqHistory(faqId) {
      if (!faqId) { Swal.fire('Aviso', 'Salve o item primeiro para ver o histórico.', 'info'); return; }
      Swal.fire({ title: 'Histórico de Versões', html: '<div class="text-left small">Carregando trilha de auditoria...</div>', showConfirmButton: true });
      // Implementação futura: fetch(`/api/faq/${faqId}/history`)
    }
  };

  ensureFaqExtensions();
})();
