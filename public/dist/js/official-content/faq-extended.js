// 📁 public/dist/js/official-content/faq-extended.js
// Implementação robusta para garantir a renderização da FAQ e navegação correta

(function() {
  const log = (msg) => console.log(`[FAQ-Extended] ${msg}`);
  
  const startModule = () => {
    if (!window.OfficialContentPage) {
      setTimeout(startModule, 200);
      return;
    }

    log("Módulo iniciado e integrado ao OfficialContentPage.");
    const Page = window.OfficialContentPage;

    // Sobrescrever funções essenciais
    Page.addFaqItem = () => renderFaqItemUI({});
    Page.saveFaq = async () => await saveFaqItems();
    
    // Interceptar a função de preenchimento original
    Page.fillFaq = function() {
      log("Chamando fillFaq customizado...");
      const container = document.getElementById('faq-items');
      if (container) container.innerHTML = '';
      
      const record = Page.getRecord ? Page.getRecord('faq', 'school') : null;
      const items = record?.content_payload?.items || [];
      
      if (items.length > 0) {
        items.forEach(item => renderFaqItemUI(item));
      }
      
      updateEmptyState();
    };

    // Garantir que ao clicar na aba FAQ, a renderização aconteça
    const faqTabLink = document.querySelector('a[href="#official-faq"]');
    if (faqTabLink) {
      faqTabLink.addEventListener('click', () => {
        log("Aba FAQ clicada, forçando preenchimento...");
        setTimeout(() => Page.fillFaq(), 50);
      });
    }

    function renderFaqItemUI(item = {}) {
      const container = document.getElementById('faq-items');
      if (!container) return;

      const el = document.createElement('div');
      el.className = 'card mb-3 border-left-primary shadow-sm faq-item-row';
      el.dataset.id = item.id || '';
      
      const status = item.status || 'draft';
      const validFrom = item.valid_from ? item.valid_from.split('T')[0] : new Date().toISOString().split('T')[0];
      const validTo = item.valid_to ? item.valid_to.split('T')[0] : '';

      el.innerHTML = `
        <div class="card-body p-3">
          <div class="row">
            <div class="col-md-9"><label class="small font-weight-bold mb-1">Pergunta</label><input class="form-control form-control-sm faq-question" value="${item.question || ''}"></div>
            <div class="col-md-3"><label class="small font-weight-bold mb-1">Status</label>
              <select class="form-control form-control-sm faq-status">
                <option value="draft" ${status === 'draft' ? 'selected' : ''}>Rascunho</option>
                <option value="published" ${status === 'published' ? 'selected' : ''}>Publicado</option>
              </select>
            </div>
            <div class="col-md-12 mt-2"><label class="small font-weight-bold mb-1">Resposta</label><textarea class="form-control form-control-sm faq-answer" rows="2">${item.answer || ''}</textarea></div>
            <div class="col-md-4 mt-2"><label class="small font-weight-bold mb-1">Categoria</label><input class="form-control form-control-sm faq-category" value="${item.category || 'Geral'}"></div>
            <div class="col-md-4 mt-2"><label class="small font-weight-bold mb-1">Início</label><input type="date" class="form-control form-control-sm faq-valid-from" value="${validFrom}"></div>
            <div class="col-md-4 mt-2"><label class="small font-weight-bold mb-1">Fim</label><input type="date" class="form-control form-control-sm faq-valid-to" value="${validTo}"></div>
          </div>
          <div class="mt-2 text-right">
            <button class="btn btn-xs btn-outline-danger remove-faq-btn">Remover</button>
          </div>
        </div>`;

      container.appendChild(el);
      el.querySelector('.remove-faq-btn').onclick = () => { el.remove(); updateEmptyState(); };
      updateEmptyState();
    }

    function updateEmptyState() {
      const container = document.getElementById('faq-items');
      const empty = document.getElementById('faq-empty');
      if (container && empty) {
        empty.style.display = container.children.length > 0 ? 'none' : 'block';
      }
    }

    async function saveFaqItems() {
      const rows = document.querySelectorAll('.faq-item-row');
      if (rows.length === 0) return Swal.fire('Aviso', 'Nenhuma FAQ para salvar.', 'info');

      Swal.fire({ title: 'Salvando...', didOpen: () => Swal.showLoading() });

      try {
        const token = await window.getAccessToken();
        const schoolId = sessionStorage.getItem('SCHOOL_ID');

        for (const row of rows) {
          const payload = {
            question: row.querySelector('.faq-question').value,
            answer: row.querySelector('.faq-answer').value,
            category: row.querySelector('.faq-category').value,
            status: row.querySelector('.faq-status').value,
            valid_from: row.querySelector('.faq-valid-from').value,
            valid_to: row.querySelector('.faq-valid-to').value || null
          };
          
          const id = row.dataset.id;
          const url = id ? `/api/faq/${id}?scope=school` : `/api/faq?scope=school`;
          await fetch(url, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-school-id': schoolId },
            body: JSON.stringify(payload)
          });
        }
        Swal.fire('Sucesso', 'Alterações salvas no banco de dados.', 'success');
      } catch (err) {
        Swal.fire('Erro', err.message, 'error');
      }
    }

    // Injetar CSS para os cartões
    const style = document.createElement('style');
    style.innerHTML = `
      .border-left-primary { border-left: 0.25rem solid #007bff !important; }
      .faq-item-row { transition: transform 0.2s; }
      .faq-item-row:hover { transform: translateY(-2px); }
    `;
    document.head.appendChild(style);
    
    // Forçar preenchimento inicial
    setTimeout(() => Page.fillFaq(), 500);
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startModule();
  } else {
    document.addEventListener('DOMContentLoaded', startModule);
  }
})();
