// 📁 public/dist/js/official-content/faq-extended.js
// Extensão do módulo FAQ com testes de IA, versionamento, auditoria e conflito

(() => {
  // Aguardar carregamento do OfficialContentPage
  const ensureFaqExtensions = () => {
    if (!window.OfficialContentPage) {
      setTimeout(ensureFaqExtensions, 100);
      return;
    }

    const baseModule = window.OfficialContentPage;

    // ====================================================================
    // DOWNLOADS DE TEMPLATE
    // ====================================================================
    function downloadFaqTemplate() {
      const csv = 'pergunta,resposta,categoria,publico_alvo,vigencia_inicio,vigencia_fim,escopo\n' +
        '"Qual é o período de matrícula?","O período de matrícula é de fevereiro a março de cada ano.","Administrativo","Responsáveis","2026-02-01","2026-03-31","school"\n' +
        '"Quais documentos são necessários?","RG, CPF, Histórico escolar e comprovante de residência.","Administrativo","Responsáveis","2026-02-01","","school"';
      downloadCsv('template-faq.csv', csv);
    }

    // ====================================================================
    // IMPORTAR FAQ DE CSV
    // ====================================================================
    function importFaqCsv(file) {
      if (!file) return;
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) throw new Error('CSV deve ter pelo menos uma linha de cabeçalho e uma de dados.');

            const header = lines[0];
            const expectedHeaders = 'pergunta,resposta,categoria,publico_alvo,vigencia_inicio,vigencia_fim,escopo';

            if (!header.toLowerCase().includes('pergunta') || !header.toLowerCase().includes('resposta')) {
              throw new Error('CSV deve conter colunas "pergunta" e "resposta".');
            }

            document.getElementById('faq-items').innerHTML = '';
            let importedCount = 0;

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cells = parseCSVLine(line);
              if (cells.length < 2) continue;

              const faqData = {
                question: cells[0] || '',
                answer: cells[1] || '',
                category: cells[2] || 'Geral',
                audience: cells[3] || 'Público geral',
                valid_from: cells[4] || new Date().toISOString().split('T')[0],
                valid_to: cells[5] || '',
                scope: cells[6] || 'school'
              };

              if (faqData.question && faqData.answer) {
                addFaqItemUI(faqData);
                importedCount++;
              }
            }

            Swal.fire(
              'Sucesso',
              `${importedCount} pergunta(s) importada(s) com sucesso.`,
              'success'
            );
            document.getElementById('faq-file').value = '';
          } catch (error) {
            Swal.fire('Erro na importação', error.message, 'error');
          }
        };
        reader.readAsText(file);
      } catch (error) {
        Swal.fire('Erro', 'Não foi possível ler o arquivo CSV.', 'error');
      }
    }

    // ====================================================================
    // PARSEAR LINHA CSV (suporta aspas)
    // ====================================================================
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    // ====================================================================
    // ADICIONAR FAQ ITEM COM INTERFACE ESTENDIDA
    // ====================================================================
    function addFaqItemUI(item = {}) {
      const el = document.createElement('div');
      el.className = 'official-list-item';
      el.style.borderLeft = '4px solid #007bff';
      el.style.paddingLeft = '12px';

      const validFrom = item.valid_from || new Date().toISOString().split('T')[0];
      const validTo = item.valid_to || '';

      el.innerHTML = `
        <div class="row">
          <div class="col-md-7 form-group mb-2">
            <label><strong>Pergunta</strong></label>
            <input class="form-control faq-question" value="${escapeHtml(item.question || '')}" placeholder="Digite a pergunta">
          </div>
          <div class="col-md-5 form-group mb-2">
            <label><strong>Categoria</strong></label>
            <select class="form-control faq-category">
              <option value="Geral" ${item.category === 'Geral' ? 'selected' : ''}>Geral</option>
              <option value="Administrativo" ${item.category === 'Administrativo' ? 'selected' : ''}>Administrativo</option>
              <option value="Acadêmico" ${item.category === 'Acadêmico' ? 'selected' : ''}>Acadêmico</option>
              <option value="Financeiro" ${item.category === 'Financeiro' ? 'selected' : ''}>Financeiro</option>
              <option value="Atendimento" ${item.category === 'Atendimento' ? 'selected' : ''}>Atendimento</option>
              <option value="Tecnologia" ${item.category === 'Tecnologia' ? 'selected' : ''}>Tecnologia</option>
            </select>
          </div>
          <div class="col-md-12 form-group mb-3">
            <label><strong>Resposta</strong></label>
            <textarea class="form-control faq-answer" rows="4" placeholder="Digite a resposta de forma clara e concisa">${escapeHtml(item.answer || '')}</textarea>
            <small class="text-muted">Máximo 500 caracteres. Mantenha a resposta direta e compreensível.</small>
          </div>
          <div class="col-md-4 form-group mb-2">
            <label>Público-alvo</label>
            <input class="form-control faq-audience" value="${escapeHtml(item.audience || 'Geral')}" placeholder="Ex: Responsáveis, Estudantes">
          </div>
          <div class="col-md-4 form-group mb-2">
            <label>Vigência início</label>
            <input type="date" class="form-control faq-valid-from" value="${validFrom}">
          </div>
          <div class="col-md-4 form-group mb-2">
            <label>Vigência fim</label>
            <input type="date" class="form-control faq-valid-to" value="${validTo}" placeholder="Deixar vazio para permanente">
          </div>
        </div>
        <div class="row">
          <div class="col-md-12">
            <button type="button" class="btn btn-sm btn-outline-info test-with-ai" style="margin-right: 8px;">
              <i class="fas fa-flask mr-1"></i>Testar com IA
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger remove-item">
              <i class="fas fa-trash mr-1"></i>Remover
            </button>
          </div>
        </div>
        <div class="faq-test-results mt-3" style="display: none; border-top: 1px solid #e9ecef; padding-top: 12px;"></div>`;

      const container = document.getElementById('faq-items');
      if (container) {
        container.appendChild(el);

        // Event: remover item
        el.querySelector('.remove-item').addEventListener('click', () => {
          el.remove();
          toggleEmpty('faq');
        });

        // Event: testar com IA
        el.querySelector('.test-with-ai').addEventListener('click', async () => {
          await testFaqItemWithAI(el);
        });

        toggleEmpty('faq');
      }
    }

    // ====================================================================
    // TESTAR FAQ COM IA
    // ====================================================================
    async function testFaqItemWithAI(itemEl) {
      const question = itemEl.querySelector('.faq-question').value;
      const answer = itemEl.querySelector('.faq-answer').value;

      if (!question || !answer) {
        Swal.fire('Aviso', 'Preencha pergunta e resposta antes de testar.', 'warning');
        return;
      }

      const testQueries = [
        question,
        'Como ' + question.toLowerCase().replace(/\?/, ''),
        'Me explique sobre ' + question.toLowerCase().replace(/\?/, ''),
        'Qual é a resposta para ' + question.toLowerCase().replace(/\?/, '')
      ];

      const testBtn = itemEl.querySelector('.test-with-ai');
      testBtn.disabled = true;
      testBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Testando...';

      const resultsDiv = itemEl.querySelector('.faq-test-results');
      resultsDiv.innerHTML = '<p><em>Processando...</em></p>';
      resultsDiv.style.display = 'block';

      try {
        let totalScore = 0;
        let successCount = 0;
        const results = [];

        for (const testQuery of testQueries) {
          try {
            const token = await window.getAccessToken();
            const response = await fetch('/api/faq-test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-school-id': sessionStorage.getItem('SCHOOL_ID')
              },
              body: JSON.stringify({
                test_query: testQuery,
                expected_answer: answer
              })
            });

            if (response.ok) {
              const data = await response.json();
              const score = data.match_score || 0;
              totalScore += score;
              successCount++;
              results.push({
                query: testQuery,
                score,
                relevant: score >= 0.7
              });
            }
          } catch (err) {
            console.warn('Erro ao testar query:', testQuery, err);
          }
        }

        const avgScore = successCount > 0 ? (totalScore / successCount * 100).toFixed(1) : 0;
        const icon = avgScore >= 70 ? '✓' : avgScore >= 50 ? '⚠' : '✗';
        const color = avgScore >= 70 ? '#28A745' : avgScore >= 50 ? '#FFC107' : '#DC3545';

        resultsDiv.innerHTML = `
          <div style="background: ${color}20; border-left: 4px solid ${color}; padding: 12px; border-radius: 4px;">
            <strong>Resultado do teste: ${icon} ${avgScore}%</strong>
            <small style="display: block; margin-top: 8px; color: #555;">
              ${avgScore >= 70 ? 'Ótimo! A assistente consegue associar a resposta aos tópicos testados.' :
                avgScore >= 50 ? 'A resposta pode ser melhorada. Considere usar termos mais específicos.' :
                'A resposta precisa ser revisada. Tente deixar mais clara e direta.'}
            </small>
          </div>`;
      } catch (error) {
        resultsDiv.innerHTML = `<div class="alert alert-warning mb-0"><small>Erro ao testar: ${error.message}</small></div>`;
      } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="fas fa-flask mr-1"></i>Testar com IA';
      }
    }

    // ====================================================================
    // ESCAPE HTML
    // ====================================================================
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // ====================================================================
    // TOGGLE EMPTY STATE
    // ====================================================================
    function toggleEmpty(moduleKey) {
      const itemsContainer = document.getElementById(moduleKey === 'notice' ? 'notice-items' : 'faq-items');
      const emptyDiv =  document.getElementById(moduleKey === 'notice' ? 'notice-empty' : 'faq-empty');
      if (itemsContainer && emptyDiv) {
        const isEmpty = itemsContainer.children.length === 0;
        emptyDiv.style.display = isEmpty ? '' : 'none';
      }
    }

    // ====================================================================
    // DOWNLOAD CSV
    // ====================================================================
    function downloadCsv(filename, content) {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // ====================================================================
    // ESTENDER EXPORTED API
    // ====================================================================
    const originalExport = {
      addFaqItem: baseModule.addFaqItem,
      downloadFaqTemplate: () => downloadFaqTemplate(),
      importFaqCsv: (file) => importFaqCsv(file)
    };

    // Substituir funções
    window.OfficialContentPage.addFaqItem = function() {
      addFaqItemUI();
    };

    window.OfficialContentPage.downloadFaqTemplate = function() {
      downloadFaqTemplate();
    };

    window.OfficialContentPage.importFaqCsv = function(file) {
      importFaqCsv(file);
    };
  };

  // Iniciar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFaqExtensions);
  } else {
    ensureFaqExtensions();
  }
})();
