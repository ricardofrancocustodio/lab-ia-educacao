// 📁 public/dist/js/official-content/faq-extended.js
// Implementação completa do módulo FAQ Oficial conforme README-FAQ-MODULO.md

(function() {
  const initFaqModule = () => {
    if (!window.OfficialContentPage) {
      setTimeout(initFaqModule, 100);
      return;
    }

    console.log("Iniciando FAQ Extended Module...");
    const Page = window.OfficialContentPage;

    // Sobrescrever funções para usar a nova lógica
    Page.addFaqItem = function(item = {}) {
      addFaqItemUI(item);
    };

    Page.saveFaq = async function() {
      await saveAllFaqItems();
    };

    Page.downloadFaqTemplate = function() {
      const csv = 'pergunta,resposta,categoria,publico_alvo,vigencia_inicio,vigencia_fim,status\n' +
        '"Qual é o período de matrícula?","O período de matrícula é de fevereiro a março de cada ano.","Administrativo","Responsáveis","2026-02-01","2026-03-31","draft"';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "template-faq-oficial.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    Page.importFaqCsv = function(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const lines = e.target.result.split('\n').filter(l => l.trim());
          for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
            if (cells.length >= 2) {
              addFaqItemUI({
                question: cells[0],
                answer: cells[1],
                category: cells[2],
                audience: cells[3],
                valid_from: cells[4],
                valid_to: cells[5],
                status: cells[6]
              });
            }
          }
          Swal.fire('Sucesso', 'Itens carregados do CSV.', 'success');
        } catch (err) {
          Swal.fire('Erro', 'Falha ao processar CSV', 'error');
        }
      };
      reader.readAsText(file);
    };

    // Injetar CSS necessário
    const style = document.createElement('style');
    style.innerHTML = `
      .faq-item-card { border-left: 4px solid #007bff; margin-bottom: 15px; transition: all 0.2s; }
      .faq-item-card:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
      .status-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; font-weight: bold; }
      .status-draft { background: #fff3cd; color: #856404; }
      .status-published { background: #d4edda; color: #155724; }
    `;
    document.head.appendChild(style);

    function addFaqItemUI(item = {}) {
      const container = document.getElementById('faq-items');
      if (!container) return;

      const el = document.createElement('div');
      el.className = 'faq-item-card card';
      el.dataset.id = item.id || '';
      
      const status = item.status || 'draft';
      const validFrom = item.valid_from ? item.valid_from.split('T')[0] : new Date().toISOString().split('T')[0];
      const validTo = item.valid_to ? item.valid_to.split('T')[0] : '';

      el.innerHTML = `
        <div class="card-body p-3">
          <div class="row">
            <div class="col-md-8"><label class="small mb-1 font-weight-bold">Pergunta</label><input class="form-control form-control-sm faq-question" value="${item.question || ''}"></div>
            <div class="col-md-4"><label class="small mb-1 font-weight-bold">Status</label>
              <select class="form-control form-control-sm faq-status">
                <option value="draft" ${status === 'draft' ? 'selected' : ''}>Rascunho</option>
                <option value="published" ${status === 'published' ? 'selected' : ''}>Publicado</option>
              </select>
            </div>
            <div class="col-md-12 mt-2"><label class="small mb-1 font-weight-bold">Resposta</label><textarea class="form-control form-control-sm faq-answer" rows="2">${item.answer || ''}</textarea></div>
            <div class="col-md-4 mt-2"><label class="small mb-1 font-weight-bold">Categoria</label><input class="form-control form-control-sm faq-category" value="${item.category || 'Geral'}"></div>
            <div class="col-md-4 mt-2"><label class="small mb-1 font-weight-bold">Início</label><input type="date" class="form-control form-control-sm faq-valid-from" value="${validFrom}"></div>
            <div class="col-md-4 mt-2"><label class="small mb-1 font-weight-bold">Fim</label><input type="date" class="form-control form-control-sm faq-valid-to" value="${validTo}"></div>
          </div>
          <div class="mt-2 text-right">
            <button class="btn btn-xs btn-outline-danger remove-btn">Remover</button>
          </div>
        </div>`;

      container.appendChild(el);
      el.querySelector('.remove-btn').onclick = () => { el.remove(); updateEmptyState(); };
      updateEmptyState();
    }

    function updateEmptyState() {
      const container = document.getElementById('faq-items');
      const empty = document.getElementById('faq-empty');
      if (container && empty) {
        empty.style.display = container.children.length > 0 ? 'none' : 'block';
      }
    }

    async function saveAllFaqItems() {
      const items = document.querySelectorAll('.faq-item-card');
      if (items.length === 0) return Swal.fire('Aviso', 'Nenhum item para salvar', 'info');

      Swal.fire({ title: 'Salvando...', didOpen: () => Swal.showLoading() });

      try {
        const token = await window.getAccessToken();
        const schoolId = sessionStorage.getItem('SCHOOL_ID');

        for (const el of items) {
          const payload = {
            question: el.querySelector('.faq-question').value,
            answer: el.querySelector('.faq-answer').value,
            category: el.querySelector('.faq-category').value,
            status: el.querySelector('.faq-status').value,
            valid_from: el.querySelector('.faq-valid-from').value,
            valid_to: el.querySelector('.faq-valid-to').value || null
          };
          
          const id = el.dataset.id;
          const url = id ? `/api/faq/${id}?scope=school` : `/api/faq?scope=school`;
          await fetch(url, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-school-id': schoolId },
            body: JSON.stringify(payload)
          });
        }
        Swal.fire('Sucesso', 'FAQs salvas.', 'success');
      } catch (err) {
        Swal.fire('Erro', err.message, 'error');
      }
    }

    // Carregar dados iniciais se houver
    const originalFillFaq = Page.fillFaq;
    Page.fillFaq = function() {
      const container = document.getElementById('faq-items');
      if (container) container.innerHTML = '';
      const record = Page.getRecord('faq', 'school');
      const items = record?.content_payload?.items || [];
      if (items.length > 0) {
        items.forEach(item => addFaqItemUI(item));
      }
      updateEmptyState();
    };
  };

  initFaqModule();
})();
