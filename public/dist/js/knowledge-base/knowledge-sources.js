const SOURCE_ASSISTANTS = {
  "public.assistant": "Assistente Publico",
  "administration.secretariat": "Assistente da Secretaria",
  "administration.treasury": "Assistente da Tesouraria",
  "administration.direction": "Assistente da Direcao"
};

const sourceState = {
  initialized: false,
  allSources: [],
  filteredSources: [],
  selectedSourceId: null,
  selectedFiles: []
};

function getSourceSchoolId() {
  return sessionStorage.getItem("SCHOOL_ID") || "";
}

function getSourceUserId() {
  return sessionStorage.getItem("USER_ID") || "";
}

async function ensureKnowledgeSession() {
  if (!getSourceSchoolId() && typeof window.initSession === "function") {
    await window.initSession();
  }
}

function getSourceAssistantLabel(key) {
  return SOURCE_ASSISTANTS[key] || key || "Assistente";
}

function formatSourceDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch (_error) {
    return value;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function updateKnowledgeToolbar(activeTabId) {
  const searchWrap = document.getElementById("knowledgeSearchWrap");
  const actionButton = document.getElementById("knowledgeActionButton");
  if (!searchWrap || !actionButton) return;

  if (activeTabId === "sources") {
    searchWrap.style.display = "none";
    actionButton.innerHTML = '<i class="fas fa-upload mr-1"></i> Importar Fontes';
    actionButton.onclick = abrirModalFonte;
    return;
  }

  searchWrap.style.display = "block";

  if (activeTabId === "custom") {
    actionButton.innerHTML = '<i class="fas fa-plus mr-1"></i> Nova Resposta';
    actionButton.onclick = typeof abrirModalMinhaPergunta === "function" ? abrirModalMinhaPergunta : abrirModalPergunta;
    return;
  }

  actionButton.innerHTML = '<i class="fas fa-plus mr-1"></i> Novo Item Estruturado';
  actionButton.onclick = abrirModalPergunta;
}

async function apiJson(url, options = {}) {
  const token = await window.getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({ ok: false, error: "Resposta invalida." }));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Falha na requisicao para ${url}`);
  }
  return payload;
}

async function carregarFontesOficiais(forceSelectFirst = false) {
  await ensureKnowledgeSession();
  const schoolId = getSourceSchoolId();
  if (!schoolId) return;

  const loading = document.getElementById("sourcesLoading");
  if (loading) loading.style.display = "block";

  try {
    const payload = await apiJson(`/api/knowledge/sources`);
    sourceState.allSources = payload.sources || [];
    aplicarFiltroFontes();

    if (forceSelectFirst && sourceState.filteredSources.length) {
      selecionarFonte(sourceState.filteredSources[0].id);
    } else if (sourceState.selectedSourceId) {
      const current = sourceState.allSources.find((item) => item.id === sourceState.selectedSourceId);
      if (current) {
        selecionarFonte(current.id);
      } else {
        renderizarPainelVersoes(null);
      }
    } else {
      renderizarPainelVersoes(null);
    }
  } catch (error) {
    console.error(error);
    const list = document.getElementById("sourcesList");
    if (list) {
      list.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    }
  } finally {
    if (loading) loading.style.display = "none";
  }
}

function aplicarFiltroFontes() {
  const search = String(document.getElementById("sourceSearchInput")?.value || "").toLowerCase().trim();
  const area = String(document.getElementById("sourceAreaFilter")?.value || "all").trim();

  sourceState.filteredSources = sourceState.allSources.filter((source) => {
    const matchesArea = area === "all" || source.owning_area === area;
    if (!matchesArea) return false;

    if (!search) return true;

    const haystack = [
      source.title,
      source.document_type,
      source.canonical_reference,
      source.description,
      source.assistant_name,
      source.current_version?.version_label,
      source.current_version?.file_name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });

  renderizarEstatisticasFontes();
  renderizarListaFontes();
}

function renderizarEstatisticasFontes() {
  const container = document.getElementById("sourceAssistantStats");
  if (!container) return;

  const totals = Object.keys(SOURCE_ASSISTANTS).map((key) => {
    const sources = sourceState.allSources.filter((item) => item.owning_area === key).length;
    return { key, label: getSourceAssistantLabel(key), total: sources };
  });

  container.innerHTML = totals
    .map((item) => `
      <div class="col-sm-6 col-xl-3 mb-2">
        <div class="source-stat-card">
          <div class="source-stat-value">${item.total}</div>
          <div class="source-stat-label">${escapeHtml(item.label)}</div>
        </div>
      </div>
    `)
    .join("");
}

function renderizarListaFontes() {
  const container = document.getElementById("sourcesList");
  if (!container) return;

  if (!sourceState.filteredSources.length) {
    container.innerHTML = `
      <div class="alert alert-light border text-center">
        <i class="fas fa-folder-open mb-2 d-block text-muted" style="font-size: 1.5rem;"></i>
        <div class="font-weight-bold mb-1">Nenhuma fonte oficial encontrada</div>
        <div class="text-muted small">Importe arquivos ou publique conteudo manual para alimentar os assistentes.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = sourceState.filteredSources
    .map((source) => {
      const current = source.current_version || {};
      const activeClass = source.id === sourceState.selectedSourceId ? "selected" : "";
      const suspendedBadge = source.active === false ? '<span class="badge badge-danger ml-1"><i class="fas fa-ban mr-1"></i>Suspensa</span>' : '';
      return `
        <div class="card card-outline card-primary source-card ${activeClass}" onclick="selecionarFonte('${source.id}')">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h5 class="mb-1">${escapeHtml(source.title)}</h5>
                <div class="text-muted small">${escapeHtml(getSourceAssistantLabel(source.owning_area))}</div>
              </div>
              <div><span class="badge badge-info">${escapeHtml(source.document_type || "fonte")}</span>${suspendedBadge}</div>
            </div>
            <div class="small text-muted mb-2">${escapeHtml(source.description || source.canonical_reference || "Sem descricao complementar")}</div>
            <div class="row small mb-3">
              <div class="col-sm-6 mb-2 mb-sm-0">
                <div><strong>Versao atual:</strong> ${escapeHtml(current.version_label || "-" )}</div>
                <div><strong>Trechos ativos:</strong> ${current.chunk_count || 0}</div>
              </div>
              <div class="col-sm-6">
                <div><strong>Historico:</strong> ${source.version_count || 0} versao(oes)</div>
                <div><strong>Atualizado em:</strong> ${escapeHtml(formatSourceDate(current.published_at || source.updated_at))}</div>
              </div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="small text-muted">${escapeHtml(current.file_name || source.canonical_reference || "Fonte manual")}</span>
              <div>
                ${source.active === false
                  ? '<button class="btn btn-outline-success btn-sm mr-1" onclick="toggleSuspenderFonte(\'' + source.id + '\', false); event.stopPropagation();"><i class="fas fa-play mr-1"></i>Reativar</button>'
                  : '<button class="btn btn-outline-danger btn-sm mr-1" onclick="toggleSuspenderFonte(\'' + source.id + '\', true); event.stopPropagation();"><i class="fas fa-ban mr-1"></i>Suspender</button>'}
                <button class="btn btn-outline-primary btn-sm" onclick="abrirModalNovaVersao('${source.id}'); event.stopPropagation();">
                  <i class="fas fa-code-branch mr-1"></i> Nova versao
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function selecionarFonte(sourceId) {
  sourceState.selectedSourceId = sourceId;
  renderizarListaFontes();

  const schoolId = getSourceSchoolId();
  if (!schoolId || !sourceId) {
    renderizarPainelVersoes(null);
    return;
  }

  const panel = document.getElementById("sourceVersionsPanel");
  if (panel) {
    panel.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="mt-2 mb-0">Carregando historico...</p></div>';
  }

  try {
    const [source, payload] = await Promise.all([
      Promise.resolve(sourceState.allSources.find((item) => item.id === sourceId) || null),
      apiJson(`/api/knowledge/sources/${sourceId}/versions`)
    ]);
    renderizarPainelVersoes(source, payload.versions || []);
  } catch (error) {
    console.error(error);
    if (panel) {
      panel.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    }
  }
}

function renderizarPainelVersoes(source, versions = []) {
  const panel = document.getElementById("sourceVersionsPanel");
  if (!panel) return;

  if (!source) {
    panel.innerHTML = '<p class="text-muted mb-0">Selecione uma fonte para ver as versoes publicadas e o conteudo vigente.</p>';
    return;
  }

  const versionsHtml = versions.length
    ? versions.map((version) => {
        const excerpt = String(version.raw_text || "").slice(0, 480);
        return `
          <div class="timeline-item ${version.is_current ? "is-current" : ""}">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div class="font-weight-bold">${escapeHtml(version.version_label || `v${version.version_number}`)}</div>
                <div class="small text-muted">Publicada em ${escapeHtml(formatSourceDate(version.published_at))}</div>
              </div>
              <span class="badge ${version.is_current ? "badge-success" : "badge-secondary"}">${version.is_current ? "Atual" : "Historica"}</span>
            </div>
            <div class="small mb-2">
              <div><strong>Arquivo:</strong> ${escapeHtml(version.file_name || "Conteudo manual")}</div>
              <div><strong>Trechos ativos:</strong> ${version.chunk_count || 0}</div>
            </div>
            <div class="source-version-preview">${escapeHtml(excerpt || "Sem conteudo armazenado.")}</div>
          </div>
        `;
      }).join("")
    : '<p class="text-muted mb-0">Esta fonte ainda nao possui versoes publicadas.</p>';

  panel.innerHTML = `
    <div class="mb-3">
      <h5 class="mb-1">${escapeHtml(source.title)}</h5>
      <div class="text-muted small">${escapeHtml(getSourceAssistantLabel(source.owning_area))}</div>
      <div class="small mt-2">${escapeHtml(source.description || source.canonical_reference || "Sem descricao complementar")}</div>
    </div>
    <button class="btn btn-primary btn-sm mb-3" onclick="abrirModalNovaVersao('${source.id}')">
      <i class="fas fa-code-branch mr-1"></i> Publicar nova versao
    </button>
    <div class="source-version-timeline">${versionsHtml}</div>
  `;
}

function abrirModalFonte() {
  sourceState.selectedFiles = [];
  const preview = document.getElementById("selectedFilesPreview");
  const input = document.getElementById("sourceFiles");
  const manual = document.getElementById("manualSourceContent");
  if (preview) preview.innerHTML = "";
  if (input) input.value = "";
  if (manual) manual.value = "";
  $("#modalFonte").modal("show");
}

function renderizarArquivosSelecionados() {
  const preview = document.getElementById("selectedFilesPreview");
  if (!preview) return;

  if (!sourceState.selectedFiles.length) {
    preview.innerHTML = '<div class="text-muted small">Nenhum arquivo selecionado.</div>';
    return;
  }

  preview.innerHTML = sourceState.selectedFiles
    .map((file) => `
      <div class="selected-file-item">
        <i class="far fa-file-alt mr-2"></i>${escapeHtml(file.name)}
        <span class="text-muted small ml-2">${Math.round(file.size / 1024) || 1} KB</span>
      </div>
    `)
    .join("");
}

async function lerArquivoComoTexto(file) {
  return file.text();
}

async function montarPayloadArquivos(files, versionLabel) {
  const payload = [];
  for (const file of files) {
    const content = await lerArquivoComoTexto(file);
    payload.push({
      name: file.name,
      type: file.type || "text/plain",
      content,
      version_label: versionLabel || "v1"
    });
  }
  return payload;
}

async function salvarFontesOficiais() {
  try {
    await ensureKnowledgeSession();
    const schoolId = getSourceSchoolId();
    const userId = getSourceUserId();
    const owningArea = document.getElementById("sourceOwningArea")?.value;
    const documentType = document.getElementById("sourceDocumentType")?.value;
    const canonicalReference = document.getElementById("sourceCanonicalReference")?.value;
    const description = document.getElementById("sourceDescription")?.value;
    const versionLabel = document.getElementById("sourceVersionLabel")?.value || "v1";
    const manualContent = document.getElementById("manualSourceContent")?.value || "";

    const filesPayload = await montarPayloadArquivos(sourceState.selectedFiles, versionLabel);
    if (manualContent.trim()) {
      filesPayload.push({
        name: "fonte-manual.txt",
        type: "text/plain",
        title: canonicalReference ? `Fonte manual - ${canonicalReference}` : `Fonte manual - ${getSourceAssistantLabel(owningArea)}`,
        content: manualContent,
        version_label: versionLabel
      });
    }

    if (!filesPayload.length) {
      Swal.fire("Fontes oficiais", "Selecione ao menos um arquivo ou cole um conteudo institucional.", "warning");
      return;
    }

    Swal.fire({
      title: "Publicando fontes...",
      text: "Gerando versoes e publicando trechos para a IA.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    await apiJson("/api/knowledge/sources/import", {
      method: "POST",
      body: JSON.stringify({
        school_id: schoolId,
        user_id: userId,
        owning_area: owningArea,
        document_type: documentType,
        canonical_reference: canonicalReference,
        description,
        files: filesPayload
      })
    });

    Swal.close();
    $("#modalFonte").modal("hide");
    await carregarFontesOficiais(true);
    Swal.fire({ icon: "success", title: "Fontes publicadas", toast: true, position: "top-end", timer: 2500, showConfirmButton: false });
  } catch (error) {
    Swal.close();
    console.error(error);
    Swal.fire("Erro", error.message || "Falha ao publicar fontes oficiais.", "error");
  }
}

function abrirModalNovaVersao(sourceId) {
  const source = sourceState.allSources.find((item) => item.id === sourceId);
  document.getElementById("versionSourceId").value = sourceId || "";
  document.getElementById("newVersionLabel").value = "";
  document.getElementById("newVersionFile").value = "";
  document.getElementById("newVersionContent").value = "";
  document.getElementById("versionSourceSummary").innerHTML = source
    ? `<strong>${escapeHtml(source.title)}</strong><br><span class="text-muted">${escapeHtml(getSourceAssistantLabel(source.owning_area))}</span>`
    : "Nenhuma fonte selecionada.";
  $("#modalNovaVersao").modal("show");
}

async function salvarNovaVersaoFonte() {
  try {
    await ensureKnowledgeSession();
    const sourceId = document.getElementById("versionSourceId")?.value;
    const schoolId = getSourceSchoolId();
    const userId = getSourceUserId();
    const fileInput = document.getElementById("newVersionFile");
    const versionLabel = document.getElementById("newVersionLabel")?.value;
    let content = document.getElementById("newVersionContent")?.value || "";
    let fileName = null;
    let mimeType = null;

    if (fileInput?.files?.[0]) {
      const file = fileInput.files[0];
      content = await lerArquivoComoTexto(file);
      fileName = file.name;
      mimeType = file.type || "text/plain";
    }

    if (!sourceId || !content.trim()) {
      Swal.fire("Nova versao", "Informe um arquivo ou cole o conteudo da nova versao.", "warning");
      return;
    }

    Swal.fire({
      title: "Publicando versao...",
      text: "Atualizando a base ativa do assistente.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    await apiJson(`/api/knowledge/sources/${sourceId}/versions`, {
      method: "POST",
      body: JSON.stringify({
        school_id: schoolId,
        user_id: userId,
        version_label: versionLabel,
        file_name: fileName,
        mime_type: mimeType,
        content
      })
    });

    Swal.close();
    $("#modalNovaVersao").modal("hide");
    await carregarFontesOficiais();
    await selecionarFonte(sourceId);
    Swal.fire({ icon: "success", title: "Versao publicada", toast: true, position: "top-end", timer: 2500, showConfirmButton: false });
  } catch (error) {
    Swal.close();
    console.error(error);
    Swal.fire("Erro", error.message || "Falha ao publicar nova versao.", "error");
  }
}

function inicializarFontesOficiais() {
  if (sourceState.initialized || document.body.dataset.page !== "knowledge") return;
  sourceState.initialized = true;

  const sourceFilesInput = document.getElementById("sourceFiles");
  if (sourceFilesInput) {
    sourceFilesInput.addEventListener("change", (event) => {
      sourceState.selectedFiles = [...(event.target.files || [])];
      renderizarArquivosSelecionados();
    });
  }

  document.getElementById("sourceSearchInput")?.addEventListener("input", aplicarFiltroFontes);
  document.getElementById("sourceAreaFilter")?.addEventListener("change", aplicarFiltroFontes);

  const tabs = ["all", "custom", "sources"];
  tabs.forEach((tabId) => {
    const tab = document.getElementById(`${tabId}-tab`);
    if (!tab) return;
    $(tab).on("shown.bs.tab", async function () {
      updateKnowledgeToolbar(tabId);
      if (tabId === "sources") {
        await carregarFontesOficiais(true);
      }
    });
  });

  updateKnowledgeToolbar("all");
  renderizarArquivosSelecionados();
}

window.abrirModalFonte = abrirModalFonte;
window.salvarFontesOficiais = salvarFontesOficiais;
window.abrirModalNovaVersao = abrirModalNovaVersao;
window.salvarNovaVersaoFonte = salvarNovaVersaoFonte;
window.selecionarFonte = selecionarFonte;
window.carregarFontesOficiais = carregarFontesOficiais;
window.toggleSuspenderFonte = toggleSuspenderFonte;

async function toggleSuspenderFonte(sourceId, suspend) {
  const action = suspend ? 'Suspender' : 'Reativar';
  const { value: reason, isConfirmed } = await Swal.fire({
    title: `${action} fonte`,
    text: suspend ? 'A fonte sera desativada e nao sera usada em novas respostas.' : 'A fonte sera reativada e voltara a ser usada nas respostas.',
    input: suspend ? 'textarea' : undefined,
    inputLabel: suspend ? 'Motivo da suspensao' : undefined,
    inputPlaceholder: suspend ? 'Descreva o motivo...' : undefined,
    showCancelButton: true,
    confirmButtonText: action,
    confirmButtonColor: suspend ? '#dc3545' : '#28a745',
    cancelButtonText: 'Cancelar'
  });
  if (!isConfirmed) return;

  try {
    await apiJson(`/api/knowledge/sources/${sourceId}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend, reason: reason || '' })
    });
    Swal.fire({ icon: 'success', title: suspend ? 'Fonte suspensa' : 'Fonte reativada', timer: 1500, showConfirmButton: false });
    await carregarFontesOficiais();
  } catch (err) {
    Swal.fire('Erro', err.message, 'error');
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarFontesOficiais);
} else {
  inicializarFontesOficiais();
}

