function interpolateTemplate(text, leadData = {}) {
  const safe = String(text || "");
  const name = leadData.name || "Responsavel";
  const schoolName = leadData.school_name || leadData.schoolName || process.env.SCHOOL_NAME || "Escola";

  return safe
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*school_name\s*\}\}/gi, schoolName);
}

function resolveSchoolName(leadData = {}, options = {}) {
  return String(
    options?.schoolName ||
    leadData.school_name ||
    leadData.schoolName ||
    process.env.SCHOOL_NAME ||
    "Escola"
  ).trim();
}

function renderParentTemplate(trigger, leadData = {}, options = {}) {
  const name = leadData.name || "Responsavel";
  const schoolName = resolveSchoolName(leadData, options);
  const customText = String(options?.customText || "").trim();
  const prefix = schoolName ? `${schoolName}: ` : "";
  const subject = schoolName ? `Atualizacao da ${schoolName}` : "Atualizacao da Escola";

  if (customText) {
    return {
      subject,
      text: `${prefix}${interpolateTemplate(customText, leadData)}`
    };
  }

  let text;

  switch (String(trigger || "").trim()) {
    case "apos_visita":
      text = `Ola, ${name}! Obrigado pela visita a nossa Escola. Se quiser continuar, podemos apoiar no proximo passo.`;
      break;
    case "apos_pre_matricula":
      text = `Ola, ${name}! Seu processo de pre-matricula foi iniciado. Se precisar de ajuda com documentos, estamos a disposicao.`;
      break;
    case "apos_matriculado":
      text = `Ola, ${name}! Matricula confirmada com sucesso. Seja bem-vindo(a) a nossa comunidade escolar!`;
      break;
    case "lembrete_documentacao":
      text = `Ola, ${name}! Lembrete: ainda ha documentacao pendente para conclusao do processo.`;
      break;
    case "confirmacao_documentacao":
      text = `Ola, ${name}! Confirmamos o recebimento da documentacao. Obrigado!`;
      break;
    case "followup_sem_retorno":
      text = `Ola, ${name}! Passando para saber se deseja continuar com o processo. Estamos disponiveis para ajudar.`;
      break;
    default:
      text = `Ola, ${name}! Temos uma atualizacao importante sobre seu processo com a Escola.`;
      break;
  }

  return {
    subject,
    text: `${prefix}${text}`
  };
}

function renderTeamRealtimeTemplate({ topic, message, leadData = {} } = {}) {
  const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return {
    subject: `Tempo real: ${topic || "Atualizacao"}`,
    text: `*${topic || "Atualizacao"}* - ${time}\n${message || ""}\n*${leadData.name || "N/A"}* (${leadData.phone || "N/A"})`.trim()
  };
}

function renderTeamConsolidatedTemplate({ greeting, lines = [], total = 0, includeNoActivityFooter = false } = {}) {
  let text = `*${greeting || "Resumo Automatico"}*\n\n*Resumo por status:*`;
  if (!Array.isArray(lines) || lines.length === 0) {
    text += `\n- Nenhuma atividade registrada no periodo`;
  } else {
    text += `\n${lines.join("\n")}`;
  }
  if (includeNoActivityFooter) {
    text += `\n\nNenhuma atividade registrada no periodo para os status selecionados.`;
  }
  text += `\nTotal: ${total} atividades.`;
  return {
    subject: "Resumo consolidado da equipe",
    text
  };
}

module.exports = {
  interpolateTemplate,
  renderParentTemplate,
  renderTeamRealtimeTemplate,
  renderTeamConsolidatedTemplate
};
