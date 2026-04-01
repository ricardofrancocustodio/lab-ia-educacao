const TeachingContentPage = (() => {
  const state = {
    items: [],
    selectedId: null,
    pdfPreviewUrl: null,
    uploadedPdfName: '',
    extractedText: '',
    sourcePdfPayload: null,
    selectedVersion: null,
    statusFilter: 'all'
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeText(value) {
    return String(value || '').replace(/\r/g, '').trim();
  }

  function formatDateTime(value) {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('pt-BR');
    } catch (_error) {
      return value;
    }
  }

  function getStatusLabel(status) {
    const key = String(status || 'draft').toLowerCase();
    if (key === 'published') return 'Publicado';
    if (key === 'pending_approval') return 'Aguardando aprovação';
    if (key === 'archived') return 'Arquivado';
    return 'Rascunho';
  }

  function getStatusClass(status) {
    return `teaching-pill teaching-status-${String(status || 'draft').toLowerCase()}`;
  }

  function getApprovalLabel(approvalStatus) {
    const key = String(approvalStatus || 'none').toLowerCase();
    if (key === 'approved') return 'Aprovado';
    if (key === 'rejected') return 'Reprovado';
    if (key === 'pending') return 'Em análise';
    return '';
  }

  function getApprovalClass(approvalStatus) {
    const key = String(approvalStatus || 'none').toLowerCase();
    if (key === 'none') return '';
    return `teaching-pill teaching-approval-${key}`;
  }

  function clearPdfPreview() {
    const preview = document.getElementById('teaching-pdf-preview');
    const empty = document.getElementById('teaching-pdf-preview-empty');
    const name = document.getElementById('teaching-pdf-name');
    const modalFileName = document.getElementById('teaching-modal-file-name');
    const modalPreviewLabel = document.getElementById('teaching-modal-preview-label');
    const modalVersionMeta = document.getElementById('teaching-modal-version-meta');
    const modalTextTitle = document.getElementById('teaching-modal-text-title');
    const modalFooterHint = document.getElementById('teaching-modal-footer-hint');
    const summaryStatus = document.getElementById('teaching-pdf-summary-status');
    const openButton = document.getElementById('teaching-open-comparison-button');
    if (state.pdfPreviewUrl) {
      URL.revokeObjectURL(state.pdfPreviewUrl);
    }
    state.pdfPreviewUrl = null;
    state.uploadedPdfName = '';
    state.sourcePdfPayload = null;
    state.selectedVersion = null;
    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
    if (empty) {
      empty.style.display = 'flex';
    }
    if (name) {
      name.textContent = 'Nenhum PDF carregado';
    }
    if (modalFileName) {
      modalFileName.textContent = 'Nenhum PDF carregado';
    }
    if (modalPreviewLabel) {
      modalPreviewLabel.textContent = 'Pré-visualização do PDF';
    }
    if (modalVersionMeta) {
      modalVersionMeta.textContent = 'Abra uma versão para comparar o PDF com o texto usado pela IA.';
    }
    if (modalTextTitle) {
      modalTextTitle.textContent = 'Texto extraído automaticamente';
    }
    if (modalFooterHint) {
      modalFooterHint.textContent = 'Revise aqui, depois envie o texto para o editor oficial abaixo do formulário. Ao salvar, o sistema cria uma nova versão.';
    }
    if (summaryStatus) {
      summaryStatus.textContent = 'Carregue um PDF para abrir a comparação em tela ampla.';
    }
    if (openButton) {
      openButton.disabled = true;
    }
  }

  function setPdfPreview(file) {
    clearPdfPreview();
    const preview = document.getElementById('teaching-pdf-preview');
    const empty = document.getElementById('teaching-pdf-preview-empty');
    const name = document.getElementById('teaching-pdf-name');
    const modalFileName = document.getElementById('teaching-modal-file-name');
    const modalPreviewLabel = document.getElementById('teaching-modal-preview-label');
    const summaryStatus = document.getElementById('teaching-pdf-summary-status');
    const openButton = document.getElementById('teaching-open-comparison-button');
    state.pdfPreviewUrl = URL.createObjectURL(file);
    state.uploadedPdfName = file.name || '';
    if (preview) {
      preview.src = state.pdfPreviewUrl;
      preview.style.display = 'block';
    }
    if (empty) {
      empty.style.display = 'none';
    }
    if (name) {
      name.textContent = state.uploadedPdfName || 'PDF carregado';
    }
    if (modalFileName) {
      modalFileName.textContent = state.uploadedPdfName || 'PDF carregado';
    }
    if (modalPreviewLabel) {
      modalPreviewLabel.textContent = 'Pré-visualização do PDF';
    }
    if (summaryStatus) {
      summaryStatus.textContent = 'PDF pronto para revisão. Abra a comparação em tela ampla para conferir o original e o texto extraído.';
    }
    if (openButton) {
      openButton.disabled = false;
    }
  }

  function setPdfPreviewUrl(objectUrl, fileName) {
    clearPdfPreview();
    const preview = document.getElementById('teaching-pdf-preview');
    const empty = document.getElementById('teaching-pdf-preview-empty');
    const name = document.getElementById('teaching-pdf-name');
    const modalFileName = document.getElementById('teaching-modal-file-name');
    const summaryStatus = document.getElementById('teaching-pdf-summary-status');
    const openButton = document.getElementById('teaching-open-comparison-button');
    state.pdfPreviewUrl = objectUrl;
    state.uploadedPdfName = fileName || '';
    if (preview) {
      preview.src = objectUrl;
      preview.style.display = 'block';
    }
    if (empty) empty.style.display = 'none';
    if (name) name.textContent = fileName || 'PDF armazenado';
    if (modalFileName) modalFileName.textContent = fileName || 'PDF armazenado';
    if (summaryStatus) summaryStatus.textContent = 'PDF original disponível para reabertura e comparação em tela ampla.';
    if (openButton) openButton.disabled = false;
  }

  function setExtractedText(text, statusMessage) {
    state.extractedText = String(text || '');
    const extracted = document.getElementById('teaching-extracted-text');
    const status = document.getElementById('teaching-extraction-status');
    const useButton = document.getElementById('teaching-use-extracted-button');
    if (extracted) extracted.value = state.extractedText;
    if (status) status.textContent = statusMessage || 'Revise o texto extraído e, se necessário, complemente manualmente antes de publicar.';
    if (useButton) useButton.disabled = !state.extractedText.trim();
  }

  function setModalVersionContext(version, mode = 'extraction') {
    const modalVersionMeta = document.getElementById('teaching-modal-version-meta');
    const modalTextTitle = document.getElementById('teaching-modal-text-title');
    const modalFooterHint = document.getElementById('teaching-modal-footer-hint');
    const useButton = document.getElementById('teaching-use-extracted-button');
    state.selectedVersion = version || null;

    if (mode === 'history' && version) {
      if (modalVersionMeta) {
        modalVersionMeta.textContent = `Versão ${version.version_number} (${version.version_label || 'histórico'}) carregada. Este é o texto oficial usado pela IA nesta versão.`;
      }
      if (modalTextTitle) {
        modalTextTitle.textContent = 'Texto oficial desta versão (usado pela IA)';
      }
      if (modalFooterHint) {
        modalFooterHint.textContent = 'Se você ajustar este texto e depois salvar o material, o sistema publicará uma nova versão.';
      }
      if (useButton) {
        useButton.innerHTML = '<i class="fas fa-arrow-down mr-1"></i>Editar a partir desta versão';
      }
      return;
    }

    if (modalVersionMeta) {
      modalVersionMeta.textContent = 'Revise a extração e leve o conteúdo para o texto oficial abaixo.';
    }
    if (modalTextTitle) {
      modalTextTitle.textContent = 'Texto extraído automaticamente';
    }
    if (modalFooterHint) {
      modalFooterHint.textContent = 'Revise aqui, depois envie o texto para o editor oficial abaixo do formulário. Ao salvar, o sistema cria uma nova versão.';
    }
    if (useButton) {
      useButton.innerHTML = '<i class="fas fa-arrow-down mr-1"></i>Levar para edição';
    }
  }

  function openComparisonModal() {
    const modal = document.getElementById('teaching-comparison-modal');
    if (!modal || !window.jQuery) return;
    window.jQuery(modal).modal('show');
  }

  function updateApprovalCard(metadata) {
    const card = document.getElementById('teaching-approval-card');
    const label = document.getElementById('teaching-approval-status-label');
    const submitBtn = document.getElementById('teaching-submit-approval-button');
    const approveBtn = document.getElementById('teaching-approve-button');
    const rejectBtn = document.getElementById('teaching-reject-button');
    const statusSelect = document.getElementById('teaching-status');
    const statusHint = document.getElementById('teaching-status-hint');
    const itemId = document.getElementById('teaching-source-document-id')?.value;
    if (!card) return;

    if (!itemId) {
      card.style.display = 'none';
      if (statusHint) statusHint.textContent = 'Para publicar, envie para aprovação da coordenação.';
      return;
    }

    card.style.display = 'block';
    const status = String(metadata?.status || 'draft').toLowerCase();
    const approval = String(metadata?.approval_status || 'none').toLowerCase();

    if (submitBtn) submitBtn.style.display = 'none';
    if (approveBtn) approveBtn.style.display = 'none';
    if (rejectBtn) rejectBtn.style.display = 'none';

    if (status === 'published' && approval === 'approved') {
      label.innerHTML = `<span class="teaching-pill teaching-approval-approved"><i class="fas fa-check-circle mr-1"></i>Aprovado e publicado</span>${metadata.approval_by ? ` por ${escapeHtml(metadata.approval_by)}` : ''}${metadata.approval_at ? ` em ${formatDateTime(metadata.approval_at)}` : ''}`;
      if (statusHint) statusHint.textContent = 'Material publicado após aprovação da coordenação.';
      if (statusSelect) {
        if (!statusSelect.querySelector('option[value="published"]')) {
          statusSelect.insertAdjacentHTML('beforeend', '<option value="published">Publicado</option>');
        }
        statusSelect.value = 'published';
        statusSelect.disabled = true;
      }
    } else if (status === 'pending_approval' || approval === 'pending') {
      label.innerHTML = '<span class="teaching-pill teaching-status-pending_approval"><i class="fas fa-clock mr-1"></i>Enviado para aprovação</span> Aguardando análise da coordenação.';
      if (approveBtn) approveBtn.style.display = '';
      if (rejectBtn) rejectBtn.style.display = '';
      if (statusHint) statusHint.textContent = 'Material aguardando aprovação da coordenação.';
      if (statusSelect) {
        statusSelect.value = 'draft';
        statusSelect.disabled = true;
      }
    } else if (approval === 'rejected') {
      label.innerHTML = `<span class="teaching-pill teaching-approval-rejected"><i class="fas fa-times-circle mr-1"></i>Reprovado</span>${metadata.approval_by ? ` por ${escapeHtml(metadata.approval_by)}` : ''}${metadata.approval_at ? ` em ${formatDateTime(metadata.approval_at)}` : ''}${metadata.approval_note ? `<br><small class="text-muted mt-1 d-block">Motivo: ${escapeHtml(metadata.approval_note)}</small>` : ''}`;
      if (submitBtn) submitBtn.style.display = '';
      if (statusHint) statusHint.textContent = 'Material reprovado. Corrija e reenvie para aprovação.';
      if (statusSelect) {
        statusSelect.value = 'draft';
        statusSelect.disabled = false;
      }
    } else {
      label.innerHTML = 'Salve o material como rascunho e depois envie para aprovação da coordenação.';
      if (submitBtn) submitBtn.style.display = '';
      if (statusHint) statusHint.textContent = 'Para publicar, envie para aprovação da coordenação.';
      if (statusSelect) {
        statusSelect.value = status === 'archived' ? 'archived' : 'draft';
        statusSelect.disabled = false;
        const pubOption = statusSelect.querySelector('option[value="published"]');
        if (pubOption) pubOption.remove();
      }
    }
  }

  async function handleApproval(action) {
    const itemId = document.getElementById('teaching-source-document-id')?.value;
    if (!itemId) {
      Swal.fire({ icon: 'warning', title: 'Selecione um material', text: 'Selecione um material na lista antes.' });
      return;
    }

    let note = '';
    if (action === 'pending') {
      const result = await Swal.fire({
        title: 'Enviar para aprovação',
        text: 'O material será enviado para análise da coordenação. Deseja continuar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Enviar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f0ad4e'
      });
      if (!result.isConfirmed) return;
    } else if (action === 'rejected') {
      const result = await Swal.fire({
        title: 'Reprovar material',
        input: 'textarea',
        inputLabel: 'Motivo da reprovação (opcional)',
        inputPlaceholder: 'Descreva o que precisa ser corrigido...',
        showCancelButton: true,
        confirmButtonText: 'Reprovar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
      });
      if (!result.isConfirmed) return;
      note = result.value || '';
    } else if (action === 'approved') {
      const result = await Swal.fire({
        title: 'Aprovar e publicar',
        text: 'O material será publicado e ficará disponível como base para a IA. Confirma?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Aprovar e publicar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745'
      });
      if (!result.isConfirmed) return;
    }

    try {
      const response = await apiJson(`/api/teaching-content/${itemId}/approval`, {
        method: 'PUT',
        body: JSON.stringify({ action, note })
      });
      await loadItems(false);
      const updated = state.items.find((entry) => entry.id === itemId);
      if (updated) {
        state.selectedId = updated.id;
        fillForm(updated);
        renderList();
      }
      const messages = {
        pending: 'Material enviado para aprovação da coordenação.',
        approved: 'Material aprovado e publicado com sucesso!',
        rejected: 'Material reprovado. O professor será notificado.'
      };
      Swal.fire({ icon: 'success', title: messages[action] || 'Atualizado', timer: 2500, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Falha na operação', text: error.message });
    }
  }

  function applyStatusFilter(filter) {
    state.statusFilter = filter || 'all';
    document.querySelectorAll('#teaching-status-filter .btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === state.statusFilter);
    });
    renderList();
  }

  function focusOfficialEditor() {
    const editorCard = document.getElementById('teaching-official-editor-card');
    const rawText = document.getElementById('teaching-raw-text');
    if (editorCard) {
      editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.setTimeout(() => {
      rawText?.focus();
      rawText?.setSelectionRange?.(rawText.value.length, rawText.value.length);
    }, 220);
  }

  function copyExtractedToOfficialEditor() {
    const extracted = document.getElementById('teaching-extracted-text')?.value || '';
    const rawText = document.getElementById('teaching-raw-text');
    if (!rawText || !extracted.trim()) return;
    rawText.value = extracted;
    window.jQuery?.('#teaching-comparison-modal').modal('hide');
    focusOfficialEditor();
  }

  async function fileToBase64(file) {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  async function apiJson(url, options = {}) {
    const token = await window.getAccessToken();
    const schoolId = sessionStorage.getItem('SCHOOL_ID') || '';
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-school-id': schoolId,
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ ok: false, error: 'Resposta inválida do servidor.' }));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || 'Falha na requisição.');
    }
    return payload;
  }

  async function apiBlob(url, options = {}) {
    const token = await window.getAccessToken();
    const schoolId = sessionStorage.getItem('SCHOOL_ID') || '';
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-school-id': schoolId,
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      let message = 'Falha na requisição.';
      try {
        const payload = await response.json();
        message = payload.error || message;
      } catch (_error) {
      }
      throw new Error(message);
    }
    return response.blob();
  }

  function getFormValues() {
    const subjectSelect = document.getElementById('teaching-subject').value;
    const subjectValue = subjectSelect === 'Outro'
      ? (document.getElementById('teaching-subject-other')?.value.trim() || '')
      : subjectSelect.trim();
    return {
      source_document_id: document.getElementById('teaching-source-document-id').value || null,
      title: document.getElementById('teaching-title').value.trim(),
      summary: document.getElementById('teaching-summary').value.trim(),
      raw_text: document.getElementById('teaching-raw-text').value,
      file_name: state.uploadedPdfName ? state.uploadedPdfName.replace(/\.pdf$/i, '.txt') : `${subjectValue || 'material'}.txt`,
      source_pdf: state.sourcePdfPayload,
      metadata: {
        segment: document.getElementById('teaching-segment').value.trim(),
        eja_context: document.getElementById('teaching-eja-context')?.value.trim() || '',
        module_name: document.getElementById('teaching-module').value.trim(),
        subject: subjectValue,
        turma: document.getElementById('teaching-turma').value.trim(),
        topic: document.getElementById('teaching-topic').value.trim(),
        official_link: document.getElementById('teaching-official-link').value.trim(),
        calendar_reference: document.getElementById('teaching-calendar-reference').value.trim(),
        support_links: document.getElementById('teaching-support-links').value,
        status: document.getElementById('teaching-status').value
      }
    };
  }

  async function loadStoredPdf(sourceDocumentId, versionId, fileName) {
    try {
      const params = new URLSearchParams();
      if (versionId) params.set('version_id', versionId);
      const blob = await apiBlob(`/api/teaching-content/${sourceDocumentId}/source-pdf${params.toString() ? `?${params.toString()}` : ''}`);
      const objectUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl(objectUrl, fileName || 'PDF armazenado');
      setExtractedText('', 'PDF original recuperado para conferência. Carregue um novo arquivo se quiser substituir a origem desta versão.');
    } catch (error) {
      clearPdfPreview();
      setExtractedText('', 'Nenhum PDF armazenado para esta versão. Você pode enviar um novo arquivo para a próxima publicação.');
      console.warn('Falha ao carregar PDF salvo:', error);
    }
  }

  async function openVersionComparison(item, version) {
    if (!item || !version) return;

    let resolvedVersion = version;
    try {
      const payload = await apiJson(`/api/teaching-content/${item.id}/versions/${version.id}`);
      resolvedVersion = payload.version || version;
    } catch (error) {
      console.warn('Falha ao carregar detalhes completos da versão:', error);
    }

    if (resolvedVersion.storage_path) {
      await loadStoredPdf(item.id, resolvedVersion.id, resolvedVersion.file_name);
    } else {
      clearPdfPreview();
      const name = document.getElementById('teaching-pdf-name');
      const modalFileName = document.getElementById('teaching-modal-file-name');
      const summaryStatus = document.getElementById('teaching-pdf-summary-status');
      const openButton = document.getElementById('teaching-open-comparison-button');
      if (name) name.textContent = resolvedVersion.file_name || `Versão ${resolvedVersion.version_number}`;
      if (modalFileName) modalFileName.textContent = resolvedVersion.file_name || `Versão ${resolvedVersion.version_number}`;
      if (summaryStatus) summaryStatus.textContent = 'Esta versão não possui PDF armazenado, mas o texto oficial dela está disponível para revisão.';
      if (openButton) openButton.disabled = false;
    }

    setModalVersionContext(resolvedVersion, 'history');
    setExtractedText(resolvedVersion.raw_text || '', 'Este é o texto oficial versionado que foi usado pela IA nesta publicação.');
    openComparisonModal();
  }

  function clearForm() {
    document.getElementById('teaching-content-form').reset();
    document.getElementById('teaching-source-document-id').value = '';
    state.selectedId = null;
    toggleEjaContext();
    toggleSubjectOther();
    setExtractedText('', 'Se o PDF estiver em imagem ou vier sem camada de texto, complete manualmente o conteúdo oficial no campo abaixo.');
    clearPdfPreview();
    updateApprovalCard(null);
    renderList();
    renderVersions(null, []);
  }

  function toggleEjaContext() {
    const segment = document.getElementById('teaching-segment')?.value || '';
    const group = document.getElementById('teaching-eja-context-group');
    if (group) group.style.display = segment === 'EJA' ? '' : 'none';
    if (segment !== 'EJA') {
      const sel = document.getElementById('teaching-eja-context');
      if (sel) sel.value = '';
    }
  }

  function toggleSubjectOther() {
    const subject = document.getElementById('teaching-subject')?.value || '';
    const group = document.getElementById('teaching-subject-other-group');
    if (group) group.style.display = subject === 'Outro' ? '' : 'none';
    if (subject !== 'Outro') {
      const input = document.getElementById('teaching-subject-other');
      if (input) input.value = '';
    }
  }

  function fillForm(item) {
    const metadata = item?.metadata || {};
    document.getElementById('teaching-source-document-id').value = item?.id || '';
    document.getElementById('teaching-title').value = item?.title || '';
    document.getElementById('teaching-status').value = metadata.status || item?.status || 'draft';
    document.getElementById('teaching-segment').value = metadata.segment || '';
    toggleEjaContext();
    const ejaCtx = document.getElementById('teaching-eja-context');
    if (ejaCtx) ejaCtx.value = metadata.eja_context || '';
    document.getElementById('teaching-module').value = metadata.module_name || '';
    const subjectSelect = document.getElementById('teaching-subject');
    const knownSubjects = Array.from(subjectSelect.options).map(o => o.value);
    if (metadata.subject && knownSubjects.includes(metadata.subject)) {
      subjectSelect.value = metadata.subject;
    } else if (metadata.subject) {
      subjectSelect.value = 'Outro';
      const otherInput = document.getElementById('teaching-subject-other');
      if (otherInput) otherInput.value = metadata.subject;
    } else {
      subjectSelect.value = '';
    }
    toggleSubjectOther();
    document.getElementById('teaching-turma').value = metadata.turma || '';
    document.getElementById('teaching-topic').value = metadata.topic || '';
    document.getElementById('teaching-summary').value = item?.summary || '';
    document.getElementById('teaching-official-link').value = metadata.official_link || '';
    document.getElementById('teaching-calendar-reference').value = metadata.calendar_reference || '';
    document.getElementById('teaching-support-links').value = Array.isArray(metadata.support_links) ? metadata.support_links.join('\n') : '';
    document.getElementById('teaching-raw-text').value = '';
    updateApprovalCard(metadata);
    setModalVersionContext(null, 'extraction');
    setExtractedText('', 'Carregue um novo PDF se quiser comparar novamente o original com a extração.');
    clearPdfPreview();
  }

  function renderList() {
    const container = document.getElementById('teaching-list');
    if (!container) return;

    const filtered = state.statusFilter === 'all'
      ? state.items
      : state.items.filter((item) => item.status === state.statusFilter);

    if (!filtered.length) {
      container.innerHTML = state.items.length
        ? '<div class="teaching-empty">Nenhum material encontrado com este filtro.</div>'
        : '<div class="teaching-empty">Nenhum material cadastrado ainda. Comece criando o primeiro conteúdo oficial da disciplina.</div>';
      return;
    }

    container.innerHTML = filtered.map((item) => {
      const metadata = item.metadata || {};
      const activeClass = item.id === state.selectedId ? 'active' : '';
      const supportLinksCount = Array.isArray(metadata.support_links) ? metadata.support_links.length : 0;
      const hasStoredPdf = Boolean(item.current_version && item.current_version.storage_path);
      const approvalStatus = String(metadata.approval_status || 'none').toLowerCase();
      const approvalLabel = getApprovalLabel(approvalStatus);
      return `
        <div class="teaching-item ${activeClass}" data-id="${escapeHtml(item.id)}">
          <div class="d-flex justify-content-between align-items-start" style="gap:12px;">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <div class="text-muted small mt-1">${escapeHtml(metadata.subject || 'Disciplina não informada')} ${metadata.turma ? '&middot; ' + escapeHtml(metadata.turma) : ''} ${metadata.topic ? '&middot; ' + escapeHtml(metadata.topic) : ''}</div>
            </div>
            <div class="d-flex flex-column align-items-end" style="gap:4px;">
              <span class="${getStatusClass(item.status)}">${escapeHtml(getStatusLabel(item.status))}</span>
              ${approvalLabel ? `<span class="${getApprovalClass(approvalStatus)}">${escapeHtml(approvalLabel)}</span>` : ''}
            </div>
          </div>
          <div class="small text-muted mt-2">${escapeHtml(item.summary || 'Sem resumo pedagógico cadastrado.')}</div>
          <div class="teaching-meta">
            ${metadata.segment ? `<span class="teaching-pill"><i class="fas fa-layer-group"></i>${escapeHtml(metadata.segment)}</span>` : ''}
            ${metadata.eja_context ? `<span class="teaching-pill"><i class="fas fa-map-marker-alt"></i>${escapeHtml(metadata.eja_context)}</span>` : ''}
            ${metadata.module_name ? `<span class="teaching-pill"><i class="fas fa-cubes"></i>${escapeHtml(metadata.module_name)}</span>` : ''}
            ${metadata.turma ? `<span class="teaching-pill"><i class="fas fa-users"></i>${escapeHtml(metadata.turma)}</span>` : ''}
            ${item.version_count ? `<span class="teaching-pill"><i class="fas fa-code-branch"></i>${item.version_count} versão(ões)</span>` : ''}
            ${supportLinksCount ? `<span class="teaching-pill"><i class="fas fa-link"></i>${supportLinksCount} link(s)</span>` : ''}
            <span class="teaching-pill ${hasStoredPdf ? 'teaching-pill-pdf-ready' : 'teaching-pill-pdf-missing'}"><i class="fas ${hasStoredPdf ? 'fa-file-pdf' : 'fa-file-alt'}"></i>${hasStoredPdf ? 'PDF original armazenado' : 'Sem PDF original salvo'}</span>
          </div>
          <div class="small text-muted mt-2">Atualizado em ${escapeHtml(formatDateTime(item.updated_at))}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.teaching-item').forEach((element) => {
      element.addEventListener('click', () => {
        const item = state.items.find((entry) => entry.id === element.dataset.id);
        if (!item) return;
        state.selectedId = item.id;
        fillForm(item);
        renderList();
        loadVersions(item.id);
      });
    });
  }

  function renderVersions(item, versions) {
    const container = document.getElementById('teaching-versions');
    if (!container) return;

    if (!item) {
      container.className = 'teaching-empty';
      container.innerHTML = 'Selecione um material para ver o histórico de versões.';
      return;
    }

    const metadata = item.metadata || {};
    const links = Array.isArray(metadata.support_links) ? metadata.support_links.filter(Boolean) : [];
    container.className = '';
    container.innerHTML = `
      <div class="mb-3">
        <strong>${escapeHtml(item.title)}</strong>
        <div class="small text-muted mt-1">${escapeHtml(item.summary || 'Sem resumo cadastrado.')}</div>
      </div>
      <div class="teaching-meta mb-3">
        ${metadata.subject ? `<span class="teaching-pill"><i class="fas fa-book"></i>${escapeHtml(metadata.subject)}</span>` : ''}
        ${metadata.topic ? `<span class="teaching-pill"><i class="fas fa-tag"></i>${escapeHtml(metadata.topic)}</span>` : ''}
        ${metadata.calendar_reference ? `<span class="teaching-pill"><i class="fas fa-calendar-alt"></i>${escapeHtml(metadata.calendar_reference)}</span>` : ''}
      </div>
      ${metadata.official_link || links.length ? `
        <div class="teaching-links small mb-3">
          ${metadata.official_link ? `<a href="${escapeHtml(metadata.official_link)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-alt mr-1"></i>Link oficial principal</a>` : ''}
          ${links.map((link) => `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt mr-1"></i>${escapeHtml(link)}</a>`).join('')}
        </div>
      ` : ''}
      <div>
        ${(versions || []).length ? versions.map((version) => `
          <div class="teaching-version">
            <div class="d-flex justify-content-between align-items-center flex-wrap" style="gap:8px;">
              <strong>${escapeHtml(version.version_label || 'Versão')}</strong>
              <span class="teaching-pill ${version.is_current ? 'teaching-status-published' : ''}">${version.is_current ? 'Atual' : 'Histórico'}</span>
            </div>
            <div class="small text-muted mt-1">Versão ${escapeHtml(version.version_number)} · ${escapeHtml(formatDateTime(version.published_at))}</div>
            <div class="small text-muted mt-1">Arquivo: ${escapeHtml(version.file_name || 'texto-base.txt')} · Trechos: ${escapeHtml(version.chunk_count || 0)}</div>
            <div class="mt-2"><button type="button" class="btn btn-outline-danger btn-sm teaching-open-pdf" data-version-id="${escapeHtml(version.id)}" data-file-name="${escapeHtml(version.file_name || 'material.pdf')}\"><i class="fas fa-file-pdf mr-1"></i>${version.storage_path ? 'Abrir PDF original' : 'Abrir versão'}</button></div>
          </div>
        `).join('') : '<div class="teaching-empty">Nenhuma versão registrada ainda.</div>'}
      </div>
    `;

    container.querySelectorAll('.teaching-open-pdf').forEach((button) => {
      button.addEventListener('click', async () => {
        const version = (versions || []).find((entry) => entry.id === button.dataset.versionId);
        await openVersionComparison(item, version);
      });
    });
  }

  async function loadItems(preserveSelection = true) {
    const payload = await apiJson('/api/teaching-content');
    state.items = payload.items || [];

    if (preserveSelection && state.selectedId) {
      const selected = state.items.find((item) => item.id === state.selectedId);
      if (selected) {
        fillForm(selected);
      } else {
        clearForm();
        return;
      }
    }

    renderList();
  }

  async function loadVersions(itemId) {
    const item = state.items.find((entry) => entry.id === itemId) || null;
    if (!item) {
      renderVersions(null, []);
      return;
    }

    const container = document.getElementById('teaching-versions');
    if (container) {
      container.className = 'teaching-empty';
      container.innerHTML = 'Carregando histórico...';
    }

    try {
      const payload = await apiJson(`/api/teaching-content/${itemId}/versions`);
      renderVersions(payload.item || item, payload.versions || []);
      const latestWithPdf = (payload.versions || []).find((version) => version.is_current && version.storage_path) || (payload.versions || []).find((version) => version.storage_path);
      if (latestWithPdf) {
        await loadStoredPdf(itemId, latestWithPdf.id, latestWithPdf.file_name);
      }
    } catch (error) {
      renderVersions(item, []);
      Swal.fire({ icon: 'error', title: 'Falha ao carregar versões', text: error.message });
    }
  }

  async function saveForm(event) {
    event.preventDefault();

    const payload = getFormValues();
    if (!payload.title) {
      Swal.fire({ icon: 'warning', title: 'Título obrigatório', text: 'Informe o título do material.' });
      return;
    }
    if (!payload.metadata.subject) {
      Swal.fire({ icon: 'warning', title: 'Disciplina obrigatória', text: 'Informe a disciplina deste material.' });
      return;
    }

    const saveButton = document.getElementById('teaching-save-button');
    const originalHtml = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Salvando...';

    try {
      const response = await apiJson('/api/teaching-content', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await loadItems(false);
      const savedId = response.item?.id;
      if (savedId) {
        state.selectedId = savedId;
        const selected = state.items.find((entry) => entry.id === savedId);
        if (selected) fillForm(selected);
        renderList();
        await loadVersions(savedId);
      }
      Swal.fire({ icon: 'success', title: 'Material salvo', text: 'A curadoria pedagógica foi registrada com versionamento.' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Falha ao salvar', text: error.message });
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = originalHtml;
    }
  }

  function bindEvents() {
    document.getElementById('teaching-content-form')?.addEventListener('submit', saveForm);
    document.getElementById('teaching-new-button')?.addEventListener('click', clearForm);
    document.getElementById('teaching-reset-button')?.addEventListener('click', clearForm);
    document.getElementById('teaching-open-comparison-button')?.addEventListener('click', openComparisonModal);
    document.getElementById('teaching-focus-editor-button')?.addEventListener('click', focusOfficialEditor);
    document.getElementById('teaching-use-extracted-button')?.addEventListener('click', copyExtractedToOfficialEditor);
    document.getElementById('teaching-copy-and-edit-button')?.addEventListener('click', copyExtractedToOfficialEditor);
    document.getElementById('teaching-submit-approval-button')?.addEventListener('click', () => handleApproval('pending'));
    document.getElementById('teaching-approve-button')?.addEventListener('click', () => handleApproval('approved'));
    document.getElementById('teaching-reject-button')?.addEventListener('click', () => handleApproval('rejected'));
    document.getElementById('teaching-segment')?.addEventListener('change', toggleEjaContext);
    document.getElementById('teaching-subject')?.addEventListener('change', toggleSubjectOther);
    document.querySelectorAll('#teaching-status-filter .btn').forEach((btn) => {
      btn.addEventListener('click', () => applyStatusFilter(btn.dataset.filter));
    });
    document.getElementById('teaching-pdf-file')?.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const status = document.getElementById('teaching-extraction-status');
      try {
        setPdfPreview(file);
        setExtractedText('', 'Extraindo texto do PDF...');
        const fileBase64 = await fileToBase64(file);
        state.sourcePdfPayload = {
          file_name: file.name,
          mime_type: file.type || 'application/pdf',
          file_base64: fileBase64
        };
        const payload = await apiJson('/api/teaching-content/extract-pdf', {
          method: 'POST',
          body: JSON.stringify({
            file_name: file.name,
            file_base64: fileBase64
          })
        });
        const pageCount = Number(payload.page_count || 0);
        setModalVersionContext(null, 'extraction');
        if (payload.extraction_quality === 'no_text_detected') {
          setExtractedText('', `Nenhum texto foi detectado automaticamente${pageCount ? ` em ${pageCount} página(s)` : ''}. Complete o campo de texto oficial manualmente.`);
        } else {
          setExtractedText(payload.text || '', `Texto extraído de ${pageCount || '-'} página(s). Revise e ajuste antes de usar como base oficial.`);
        }
        if (!document.getElementById('teaching-title').value.trim()) {
          document.getElementById('teaching-title').value = file.name.replace(/\.pdf$/i, '');
        }
        openComparisonModal();
      } catch (error) {
        clearPdfPreview();
        setExtractedText('', 'Falha na extração. Você ainda pode preencher o texto oficial manualmente.');
        Swal.fire({ icon: 'error', title: 'Falha ao extrair PDF', text: error.message });
      } finally {
        if (status && !status.textContent) {
          status.textContent = 'Se o PDF estiver em imagem ou vier sem camada de texto, complete manualmente o conteúdo oficial no campo abaixo.';
        }
        event.target.value = '';
      }
    });
    document.getElementById('teaching-text-file')?.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        document.getElementById('teaching-raw-text').value = normalizeText(text);
        if (!document.getElementById('teaching-title').value.trim()) {
          document.getElementById('teaching-title').value = file.name.replace(/\.[^.]+$/, '');
        }
      } catch (_error) {
        Swal.fire({ icon: 'error', title: 'Arquivo inválido', text: 'Não foi possível ler o arquivo selecionado.' });
      } finally {
        event.target.value = '';
      }
    });
  }

  async function init() {
    await window.initSession?.();
    window.applyPermissions?.();
    bindEvents();
    clearForm();
    await loadItems(false);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  TeachingContentPage.init().catch((error) => {
    console.error('Falha ao iniciar Curadoria Pedagógica:', error);
    Swal.fire({ icon: 'error', title: 'Falha ao carregar página', text: error.message || 'Erro inesperado.' });
  });
});