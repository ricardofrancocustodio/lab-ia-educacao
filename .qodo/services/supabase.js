// ðŸ“ .qodo/services/supabase.js
const { createClient } = require("@supabase/supabase-js");
const { OpenAI } = require('openai'); // Precisa do OpenAI para criar embeddings
const { standardizePhone } = require("../utils/phoneUtils");

// --- CLIENTE SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn("âš ï¸ VariÃ¡veis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY nÃ£o definidas.");
}

if (!supabaseServiceRoleKey) {
  console.warn("SUPABASE_SERVICE_KEY ausente. Backend usando ANON key (pode sofrer RLS).");
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// --- CLIENTE OPENAI ---
// (NecessÃ¡rio para criar o embedding da pergunta do usuÃ¡rio em tempo real)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!openai) {
    console.warn("âš ï¸ OPENAI_API_KEY nÃ£o definida no .env. A busca semÃ¢ntica (FAQ) nÃ£o funcionarÃ¡.");
}

const ALLOWED_LEAD_STATUSES = new Set([
  'AGENDADO',
  'REAGENDADO',
  'LISTA_DE_ESPERA',
  'SOLICITOU_CONTATO',
  'CONFIRMADO',
  'COMPARECEU',
  'VISITOU',
  'PRE_MATRICULA',
  'CANCELADO',
  'DESISTENCIA',
  'MATRICULADO',
  'NO_SHOW',
  'NAO_COMPARECEU'
]);

function normalizeStatusValue(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
    .trim();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );
}

/**
 * Busca a configuraÃ§Ã£o completa da escola com base no nÂº do bot.
 * (Esta Ã© a funÃ§Ã£o que criÃ¡mos para a sua arquitetura multi-escola)
 */
async function loadSchoolConfig(botPhoneNumber) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('schools')
    .select('*') // Pega tudo: nome, prompt, knowledge_base (ainda nÃ£o usado), etc.
    .eq('bot_phone_number', botPhoneNumber)
    .single(); 

  if (error) {
    console.error(`âŒ Erro ao carregar config da escola para o nÂº ${botPhoneNumber}:`, error.message);
    return null;
  }
  
  return data;
}

/**
 * âœ… NOVO: Encontra respostas na Base de Conhecimento
 * * 1. Gera um embedding para a pergunta do usuÃ¡rio.
 * 2. Chama a funÃ§Ã£o SQL 'match_knowledge' que acabÃ¡mos de criar no Supabase.
 * 3. Retorna os trechos de resposta mais relevantes.
 */
function normalizeKnowledgeCategory(value) {
  return String(value || "")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesKnowledgeCategory(itemCategory, allowedCategories = []) {
  if (!allowedCategories.length) return true;
  const normalizedItem = normalizeKnowledgeCategory(itemCategory);
  return allowedCategories.some((category) => normalizeKnowledgeCategory(category) === normalizedItem);
}

async function findMatchingAnswers(userQuestion, school_id, options = {}) {
  if (!supabase) return [];

  const normalized = userQuestion.toLowerCase().trim();
  const allowedCategories = Array.isArray(options.categories)
    ? options.categories.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  //
  // 1ï¸âƒ£ BUSCA POR KEYWORDS â€” SUPER RÃPIDA E DIRETA
  //
  const { data: keywordMatch, error: kwError } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("school_id", school_id);

  if (kwError) {
    console.error("KW ERROR:", kwError.message);
  }

  // Filtra no Node.js porque keywords Ã© um array
  const kwResults =
    keywordMatch?.filter(item =>
      matchesKnowledgeCategory(item.category, allowedCategories) &&
      item.keywords?.some(k => normalized.includes(k.toLowerCase()))
    ) || [];

  if (kwResults.length > 0) {
    console.log("ðŸ”Ž MATCH POR KEYWORDS ENCONTRADO!");
    return kwResults.map(r => r.answer);
  }

  if (allowedCategories.length) {
    const categoryTextResults =
      keywordMatch?.filter((item) => {
        if (!matchesKnowledgeCategory(item.category, allowedCategories)) return false;
        const question = String(item.question || '').toLowerCase();
        const answer = String(item.answer || '').toLowerCase();
        return normalized.includes(question) || question.includes(normalized) || answer.includes(normalized);
      }) || [];

    if (categoryTextResults.length > 0) {
      console.log("ðŸ”Ž MATCH POR TEXTO E CATEGORIA ENCONTRADO!");
      return categoryTextResults.slice(0, 3).map((item) => item.answer);
    }
  }

  //
  // 2ï¸âƒ£ SENÃƒO, USA EMBEDDINGS NORMALMENTE
  //
  if (!openai) return [];

  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: userQuestion,
    });

    const query_embedding = embeddingResponse.data[0].embedding;

    const { data: answers, error } = await supabase.rpc("match_knowledge", {
      query_embedding,
      match_threshold: 0.5,
      match_count: 3,
      p_school_id: school_id
    });

    if (error) {
      console.error("âŒ Erro em match_knowledge:", error.message);
      return [];
    }

    const filteredAnswers = Array.isArray(answers)
      ? answers.filter((item) => matchesKnowledgeCategory(item.category, allowedCategories))
      : [];

    const finalAnswers = allowedCategories.length ? filteredAnswers : (answers || []);
    return finalAnswers.map(a => a.answer) || [];

  } catch (err) {
    console.error("âŒ Erro no embedding:", err.message);
    return [];
  }
}

async function upsertLead(leadData) {
  if (!supabase) return null;
  let previousLead = null;
  let initialEventType = null;
  const skipTeamNotify = Boolean(leadData?.skip_team_notify);
  const cleanLeadData = { ...(leadData || {}) };
  // Garante school_id sempre definido (evita quebra no trigger lead_status_history.school_id NOT NULL).
  cleanLeadData.school_id = cleanLeadData.school_id || process.env.SCHOOL_ID || null;
  if (!cleanLeadData.school_id) {
    console.error('âŒ upsertLead abortado: school_id ausente no payload e no ambiente.');
    return null;
  }
  const rawRequestedStatus = cleanLeadData.status;
  const normalizedRequestedStatus = normalizeStatusValue(rawRequestedStatus);
  const hasRequestedStatus = normalizedRequestedStatus.length > 0;
  const isAllowedStatus = hasRequestedStatus && ALLOWED_LEAD_STATUSES.has(normalizedRequestedStatus);
  delete cleanLeadData.skip_team_notify;
  delete cleanLeadData._repair_school_id_tried;

  if (hasRequestedStatus && !isAllowedStatus) {
    delete cleanLeadData.status;
  } else if (hasRequestedStatus && isAllowedStatus) {
    cleanLeadData.status = normalizedRequestedStatus;
  }

  try {
    if (cleanLeadData?.school_id && (cleanLeadData?.wpp_id || cleanLeadData?.phone)) {
      const filters = [];
      if (cleanLeadData.wpp_id) filters.push(`wpp_id.eq.${cleanLeadData.wpp_id}`);
      if (cleanLeadData.phone) filters.push(`phone.eq.${cleanLeadData.phone}`);

      if (filters.length) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, status, school_id, name, phone, wpp_id, email, parent_id, source, booking_date, metadata, children_details, segment')
          .eq('school_id', cleanLeadData.school_id)
          .or(filters.join(','))
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        previousLead = existingLead || null;
      }
    }
  } catch (e) {
    console.warn('âš ï¸ Falha ao ler status anterior do lead:', e.message || e);
  }

  const payloadForWrite = { ...cleanLeadData };
  const preserveIfMissing = ['name', 'email', 'parent_id', 'source', 'booking_date', 'children_details', 'segment', 'status'];
  if (previousLead) {
    preserveIfMissing.forEach((k) => {
      if (payloadForWrite[k] === undefined || payloadForWrite[k] === null || payloadForWrite[k] === '') {
        if (previousLead[k] !== undefined && previousLead[k] !== null && previousLead[k] !== '') {
          payloadForWrite[k] = previousLead[k];
        } else {
          delete payloadForWrite[k];
        }
      }
    });

    if (payloadForWrite.metadata && typeof payloadForWrite.metadata === 'object' && Object.keys(payloadForWrite.metadata).length > 0) {
      payloadForWrite.metadata = {
        ...(previousLead.metadata || {}),
        ...payloadForWrite.metadata
      };
    } else if (previousLead.metadata) {
      payloadForWrite.metadata = previousLead.metadata;
    } else {
      delete payloadForWrite.metadata;
    }
  } else if (!payloadForWrite.metadata || Object.keys(payloadForWrite.metadata).length === 0) {
    delete payloadForWrite.metadata;
  }

  // Regra de negocio:
  // no primeiro contato, se nao houver status oficial solicitado,
  // nao deixar o banco cair no default "INICIADO".
  const firstInsertWithoutOfficialStatus = !previousLead && (!hasRequestedStatus || !isAllowedStatus);
  if (firstInsertWithoutOfficialStatus && payloadForWrite.status === undefined) {
    payloadForWrite.status = null;
  }

  Object.keys(payloadForWrite).forEach((k) => {
    if (payloadForWrite[k] === undefined) delete payloadForWrite[k];
  });

  // leadData deve conter: { name, phone, email, children_details, segment, status, wpp_id, school_id }
  // âœ… Fluxo principal: usa UPSERT com conflito por WhatsApp + escola
  let response = await supabase
    .from('leads')
    .upsert(payloadForWrite, { onConflict: 'wpp_id,school_id' })
    .select()
    .single();

  // âœ… Fallback seguro: se nÃ£o existir constraint UNIQUE para o ON CONFLICT,
  // faz UPDATE/INSERT manual para nÃ£o travar o agendamento.
  if (response.error?.message?.includes('no unique or exclusion constraint matching the ON CONFLICT specification')) {
    console.warn('âš ï¸ Constraint de upsert ausente para (wpp_id, school_id). Aplicando fallback manual.');

    const { data: existingLead, error: findError } = await supabase
      .from('leads')
      .select('id')
      .eq('school_id', cleanLeadData.school_id)
      .or(`wpp_id.eq.${cleanLeadData.wpp_id},phone.eq.${cleanLeadData.phone}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('âŒ Erro ao buscar lead existente no fallback:', findError.message);
      return null;
    }

    if (existingLead?.id) {
      response = await supabase
        .from('leads')
        .update(payloadForWrite)
        .eq('id', existingLead.id)
        .eq('school_id', cleanLeadData.school_id)
        .select()
        .single();
    } else {
      response = await supabase
        .from('leads')
        .insert(payloadForWrite)
        .select()
        .single();
    }
  }

  if (response.error) {
    const errMsg = String(response.error?.message || '');
    const isSchoolIdHistoryError =
      errMsg.includes('lead_status_history') &&
      errMsg.includes('school_id') &&
      errMsg.toLowerCase().includes('null value');

    if (isSchoolIdHistoryError && !leadData?._repair_school_id_tried) {
      try {
        const repairFilters = [];
        if (cleanLeadData.wpp_id) repairFilters.push(`wpp_id.eq.${cleanLeadData.wpp_id}`);
        if (cleanLeadData.phone) repairFilters.push(`phone.eq.${cleanLeadData.phone}`);

        if (repairFilters.length && cleanLeadData.school_id) {
          const { error: repairErr } = await supabase
            .from('leads')
            .update({ school_id: cleanLeadData.school_id })
            .is('school_id', null)
            .or(repairFilters.join(','));

          if (!repairErr) {
            return await upsertLead({
              ...leadData,
              _repair_school_id_tried: true
            });
          }

          console.warn('Falha ao reparar school_id de lead legado:', repairErr.message || repairErr);
        }
      } catch (repairEx) {
        console.warn('Excecao ao reparar school_id de lead legado:', repairEx.message || repairEx);
      }
    }

    console.error('Erro ao salvar lead:', response.error.message);
    return null;
  }

  if (firstInsertWithoutOfficialStatus && !previousLead) {
    try {
      const leadId = response.data?.id || null;
      if (leadId) {
        initialEventType = 'CONTATO_INICIAL';
        await logLeadBotEvent(
          leadId,
          initialEventType,
          'Contato inicial registrado sem status de CRM em leads.status',
          cleanLeadData.school_id || response.data?.school_id || process.env.SCHOOL_ID || null
        );
      }
    } catch (e) {
      console.warn('Falha ao registrar evento de contato inicial:', e.message || e);
    }
  }

  if (hasRequestedStatus && !isAllowedStatus) {
    try {
      const leadId = response.data?.id || previousLead?.id || null;
      if (leadId) {
        await logLeadBotEvent(
          leadId,
          `BOT_STAGE_${normalizedRequestedStatus}`,
          `Status intermediario registrado no bot_events e nao aplicado em leads.status: ${normalizedRequestedStatus}`,
          cleanLeadData.school_id || response.data?.school_id || process.env.SCHOOL_ID || null
        );
      }
    } catch (e) {
      console.warn('âš ï¸ Falha ao registrar status intermediario em lead_bot_events:', e.message || e);
    }
  }

  // Garantia final: para status oficiais permitidos, forca persistencia se vier inconsistente.
  if (hasRequestedStatus && isAllowedStatus) {
    let savedStatus = String(response.data?.status || '').toUpperCase().trim();
    if (savedStatus !== normalizedRequestedStatus) {
      const byIdLeadId = response.data?.id || previousLead?.id || null;
      let forceError = null;

      // 1) Tenta por ID (mais preciso)
      if (byIdLeadId) {
        const { data: forcedById, error: forceByIdErr } = await supabase
          .from('leads')
          .update({ status: normalizedRequestedStatus })
          .eq('id', byIdLeadId)
          .eq('school_id', cleanLeadData.school_id)
          .select()
          .single();

        if (!forceByIdErr && forcedById) {
          response.data = forcedById;
          savedStatus = String(forcedById.status || '').toUpperCase().trim();
        } else {
          forceError = forceByIdErr;
        }
      }

      // 2) Tenta por identificadores de contato (fallback defensivo)
      if (savedStatus !== normalizedRequestedStatus) {
        const contactFilters = [];
        if (cleanLeadData.wpp_id) contactFilters.push(`wpp_id.eq.${cleanLeadData.wpp_id}`);
        if (cleanLeadData.phone) contactFilters.push(`phone.eq.${cleanLeadData.phone}`);

        if (contactFilters.length) {
          const { data: forcedByContact, error: forceByContactErr } = await supabase
            .from('leads')
            .update({ status: normalizedRequestedStatus })
            .eq('school_id', cleanLeadData.school_id)
            .or(contactFilters.join(','))
            .select()
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!forceByContactErr && forcedByContact) {
            response.data = forcedByContact;
            savedStatus = String(forcedByContact.status || '').toUpperCase().trim();
            forceError = null;
          } else if (forceByContactErr) {
            forceError = forceByContactErr;
          }
        }
      }

      // 3) Se ainda nao persistiu, nao pode seguir silenciosamente
      if (savedStatus !== normalizedRequestedStatus) {
        const detail = forceError?.message || 'status nao persistiu apos retries';
        console.error(`Erro ao persistir status oficial (${normalizedRequestedStatus}):`, detail);
        return null;
      }
    }
  }

  try {
    const nextLead = response.data || {};
    const prevStatus = String(previousLead?.status || '').toUpperCase().trim();
    const nextStatus = String(payloadForWrite?.status || nextLead?.status || '').toUpperCase().trim();
    const schoolId = payloadForWrite.school_id || nextLead.school_id;

    if (nextStatus && prevStatus !== nextStatus) {
      try {
        if (nextLead.id) {
          await logLeadBotEvent(
            nextLead.id,
            `STATUS_${nextStatus}`,
            `Status atualizado de ${prevStatus || 'NULL'} para ${nextStatus}`,
            schoolId || cleanLeadData.school_id || process.env.SCHOOL_ID || null
          );
        }
      } catch (eventLogErr) {
        console.warn('Falha ao registrar status em lead_bot_events:', eventLogErr.message || eventLogErr);
      }
      const { notifyResponsibleByTrigger } = require('./notifier/notifier.js');
      if (typeof notifyResponsibleByTrigger === 'function') {
        await notifyResponsibleByTrigger({
          status: nextStatus,
          schoolId,
          leadData: {
            name: nextLead.name || payloadForWrite.name || previousLead?.name || null,
            phone: nextLead.phone || payloadForWrite.phone || nextLead.wpp_id || payloadForWrite.wpp_id || previousLead?.phone || null,
            email: nextLead.email || payloadForWrite.email || previousLead?.email || null,
            status: nextStatus
          }
        });
      }

      if (!skipTeamNotify) {
        const { notifyTeam } = require('./notifier/notifier.js');
        if (typeof notifyTeam === 'function') {
          const basePhone = nextLead.phone || payloadForWrite.phone || nextLead.wpp_id || payloadForWrite.wpp_id || previousLead?.phone || null;
          const details = {
            name: nextLead.name || payloadForWrite.name || previousLead?.name || null,
            phone: basePhone,
            email: nextLead.email || payloadForWrite.email || previousLead?.email || null,
            status: nextStatus,
            leadId: nextLead.id || previousLead?.id || null
          };
          await notifyTeam(`STATUS_${nextStatus}`, `Lead alterou para ${nextStatus}`, details, schoolId);
        }
      }
    } else if (!skipTeamNotify && initialEventType) {
      const { notifyTeam } = require('./notifier/notifier.js');
      if (typeof notifyTeam === 'function') {
        const basePhone = nextLead.phone || payloadForWrite.phone || nextLead.wpp_id || payloadForWrite.wpp_id || previousLead?.phone || null;
        const details = {
          name: nextLead.name || payloadForWrite.name || previousLead?.name || null,
          phone: basePhone,
          email: nextLead.email || payloadForWrite.email || previousLead?.email || null,
          event_type: initialEventType,
          leadId: nextLead.id || previousLead?.id || null
        };
        await notifyTeam(`EVENT_${initialEventType}`, `Lead evento ${initialEventType}`, details, schoolId);
      }
    }
  } catch (e) {
    console.warn('âš ï¸ Falha ao disparar notificacao para responsavel:', e.message || e);
  }

  return response.data;
}

function sanitizeChildrenPayload(children = []) {
  return (Array.isArray(children) ? children : [])
    .map((child) => {
      if (!child) return null;

      if (typeof child === 'object') {
        const rawDetails = String(child.rawDetails || child.raw_details || '').trim();
        let name = String(child.name || child.childName || child.child_name || '').trim();

        const ageInput = child.age ?? child.childAge ?? child.child_age ?? null;
        const age = Number.isInteger(ageInput)
          ? ageInput
          : (ageInput ? parseInt(String(ageInput), 10) : null);

        const interestYearInput = child.interest_year ?? child.interestYear ?? null;
        const interest_year = Number.isInteger(interestYearInput)
          ? interestYearInput
          : (interestYearInput ? parseInt(String(interestYearInput), 10) : null);
        const shiftInput = String(child.shift || child.turno || '').trim().toUpperCase();
        const shift = ['MANHA', 'TARDE', 'INTEGRAL'].includes(shiftInput) ? shiftInput : null;

        if (!name && rawDetails) {
          const ageMatch = rawDetails.match(/(\d{1,2})/);
          name = ageMatch ? rawDetails.slice(0, ageMatch.index).trim() : rawDetails;
          name = name.replace(/[,;:\-]+$/g, '').trim();
        }

        if (!name) return null;
        return {
          name,
          age: Number.isNaN(age) ? null : age,
          target_segment: isUuid(child.target_segment || child.targetSegment || child.segment_id)
            ? (child.target_segment || child.targetSegment || child.segment_id)
            : null,
          interest_year: Number.isNaN(interest_year) ? null : interest_year,
          shift
        };
      }

      const raw = String(child).trim();
      if (!raw) return null;

      const ageMatch = raw.match(/(\d{1,2})/);
      const age = ageMatch ? parseInt(ageMatch[1], 10) : null;
      const name = raw
        .replace(/\d{1,2}\s*(anos?|anos de idade)?/gi, '')
        .replace(/[,;:\-]+$/g, '')
        .trim();

      if (!name) return null;
      return { name, age: Number.isNaN(age) ? null : age, target_segment: null, interest_year: null, shift: null };
    })
    .filter(Boolean);
}

async function upsertParentWithChildren({ school_id, name, phone, email, children = [], target_segment = null }) {
  if (!supabase) return null;

  const cleanName = String(name || '').trim();
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  const safeTargetSegment = isUuid(target_segment) ? target_segment : null;

  if (!school_id || !cleanName || !cleanPhone) {
    console.warn('âš ï¸ upsertParentWithChildren ignorado: school_id, name ou phone ausente.');
    return null;
  }

  const parentPayload = {
    school_id,
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail
  };

  const { data: existingParent, error: findError } = await supabase
    .from('parents')
    .select('id')
    .eq('school_id', school_id)
    .eq('phone', cleanPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error('âŒ Erro ao buscar responsÃ¡vel:', findError.message);
    return null;
  }

  let parentResponse;
  if (existingParent?.id) {
    parentResponse = await supabase
      .from('parents')
      .update(parentPayload)
      .eq('id', existingParent.id)
      .eq('school_id', school_id)
      .select()
      .single();
  } else {
    parentResponse = await supabase
      .from('parents')
      .insert(parentPayload)
      .select()
      .single();
  }

  if (parentResponse.error) {
    console.error('âŒ Erro ao salvar responsÃ¡vel:', parentResponse.error.message);
    return null;
  }

  const parent = parentResponse.data;
  const normalizedChildren = sanitizeChildrenPayload(children);

  await supabase.from('children').delete().eq('parent_id', parent.id);

  if (normalizedChildren.length > 0) {
    const childrenPayload = normalizedChildren.map((child) => ({
      parent_id: parent.id,
      school_id,
      name: child.name,
      age: child.age,
      target_segment: child.target_segment || safeTargetSegment || null,
      interest_year: child.interest_year ?? null,
      shift: child.shift ?? null
    }));

    const { error: childError } = await supabase
      .from('children')
      .insert(childrenPayload);

    if (childError) {
      console.error('âŒ Erro ao salvar filhos:', childError.message);
    }
  }

  return parent;
}

/**
 * Encontra o ID da Escola pelo nÃºmero do bot
 */
async function getSchoolIdByBotNumber(botNumber) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('schools')
    .select('id')
    .eq('bot_phone_number', botNumber)
    .single();

  return data?.id || null;
}

async function getLeadStatus(phone) {
    try {
        const schoolId = process.env.SCHOOL_ID;
        const cleanPhone = standardizePhone(phone);

        // 2. Gera variaÃ§Ãµes possÃ­veis para vencer o "Caos do WhatsApp no Brasil"
        const variations = [];
        
        // VariaÃ§Ã£o A: O prÃ³prio nÃºmero limpo (Ex: 55618259...)
        variations.push(cleanPhone);
        
        let legacyVersion = cleanPhone; 
        if (cleanPhone.length >= 12 && cleanPhone.startsWith("55")) {
            legacyVersion = cleanPhone.substring(2); // Ex: vira "619..."
        }

        // VariaÃ§Ã£o B: Se tem 12 dÃ­gitos (55 + 2 DDD + 8 num), tenta adicionar o 9
        if (cleanPhone.length === 12 && cleanPhone.startsWith("55")) {
            const withNine = cleanPhone.slice(0, 4) + "9" + cleanPhone.slice(4);
            variations.push(withNine); // Ex: 556198259...
        }

        // VariaÃ§Ã£o C: Se tem 13 dÃ­gitos (55 + 2 DDD + 9 num), tenta tirar o 9
        if (cleanPhone.length === 13 && cleanPhone.startsWith("55")) {
            const withoutNine = cleanPhone.slice(0, 4) + cleanPhone.slice(5);
            variations.push(withoutNine); // Ex: 55618259...
        }

        // VariaÃ§Ã£o D: Sem o 55 (Legado)
        if (cleanPhone.startsWith("55")) {
            variations.push(cleanPhone.substring(2)); // Remove o 55
        }

        const orQuery = variations.map(v => `phone.eq.${v}`).join(",");

       let query = supabase
            .from('leads')
            .select('id, status, metadata, phone, source')
            .or(orQuery) // ðŸ‘ˆ O Pulo do Gato
            .order('updated_at', { ascending: false })
            .limit(1);

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query;

        if (error || !data || data.length === 0) return null;
        return data[0]; 
        
    } catch (e) {
        console.error("Erro ao buscar status:", e);
        return null;
    }
}

async function logLeadBotEvent(leadId, eventType, eventDetails = null, schoolId = null) {
  if (!supabase || !leadId) return null;

  try {
    const { data, error } = await supabase
      .from('lead_bot_events')
      .insert({
        lead_id: leadId,
        school_id: schoolId || process.env.SCHOOL_ID || null,
        event_type: eventType,
        event_details: eventDetails
      })
      .select()
      .single();

    if (error) {
      console.error("âŒ Erro ao salvar log do bot:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("âŒ ExceÃ§Ã£o ao salvar log do bot:", err);
    return null;
  }
}


async function findMatchingEntries(userQuestion, schoolId, options = {}) {
  if (!supabase || !schoolId) return [];

  const normalized = String(userQuestion || '').toLowerCase().trim();
  const allowedCategories = Array.isArray(options.categories)
    ? options.categories.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const limit = Number(options.limit || 3);

  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, category, question, answer, source_document_id, source_title, source_version_id, source_version_label, source_version_number, keywords')
    .eq('school_id', schoolId)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Erro ao buscar base estruturada:', error.message);
    return [];
  }

  return (data || [])
    .filter((item) => {
      const categoryMatches = !allowedCategories.length || matchesKnowledgeCategory(item.category, allowedCategories);
      const keywordMatches = Array.isArray(item.keywords)
        ? item.keywords.some((keyword) => normalized.includes(String(keyword || '').toLowerCase()))
        : false;
      const textMatches =
        normalized.includes(String(item.question || '').toLowerCase()) ||
        String(item.answer || '').toLowerCase().includes(normalized);

      return categoryMatches && (keywordMatches || textMatches);
    })
    .slice(0, limit);
}

async function recordConsultationEvent(payload = {}) {
  if (!supabase || !payload.school_id) return null;

  try {
    const requesterId = payload.requester_id || null;
    const channel = payload.channel || 'chat';
    let consultation = null;

    if (requesterId) {
      const { data: existing } = await supabase
        .from('institutional_consultations')
        .select('id, status, metadata')
        .eq('school_id', payload.school_id)
        .eq('channel', channel)
        .eq('requester_id', requesterId)
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      consultation = existing || null;
    }

    const nextStatus = payload.status || (payload.resolved ? 'RESOLVED' : 'IN_PROGRESS');
    const baseMetadata = {
      ...((consultation && consultation.metadata) || {}),
      ...(payload.metadata || {})
    };
    if (payload.user_text) {
      delete baseMetadata.idle_followup_sent_at;
      delete baseMetadata.idle_closed_at;
    }
    const nextMetadata = baseMetadata;

    if (consultation?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('institutional_consultations')
        .update({
          requester_name: payload.requester_name || null,
          primary_topic: payload.primary_topic || 'atendimento_publico',
          status: nextStatus,
          assigned_assistant_key: payload.assigned_assistant_key || 'public.assistant',
          resolved_at: nextStatus === 'RESOLVED' ? new Date().toISOString() : null,
          metadata: nextMetadata
        })
        .eq('id', consultation.id)
        .select('id, status, metadata')
        .single();

      if (updateError) {
        console.error('Erro ao atualizar consulta institucional:', updateError.message);
        return null;
      }
      consultation = updated;
    } else {
      const { data: created, error: consultationError } = await supabase
        .from('institutional_consultations')
        .insert({
          school_id: payload.school_id,
          channel,
          requester_id: requesterId,
          requester_name: payload.requester_name || null,
          primary_topic: payload.primary_topic || 'atendimento_publico',
          status: nextStatus,
          assigned_assistant_key: payload.assigned_assistant_key || 'public.assistant',
          opened_at: new Date().toISOString(),
          resolved_at: nextStatus === 'RESOLVED' ? new Date().toISOString() : null,
          metadata: nextMetadata
        })
        .select('id, status, metadata')
        .single();

      if (consultationError) {
        console.error('Erro ao registrar consulta institucional:', consultationError.message);
        return null;
      }
      consultation = created;
    }

    let originMessage = null;
    if (payload.user_text) {
      const { data: insertedInbound } = await supabase.from('consultation_messages').insert({
        school_id: payload.school_id,
        consultation_id: consultation.id,
        direction: 'INBOUND',
        actor_type: 'CITIZEN',
        actor_name: payload.requester_name || 'Solicitante',
        message_text: payload.user_text
      }).select('*').single();
      originMessage = insertedInbound || null;
    }

    let assistantResponse = null;
    if (payload.response_text) {
      const { data: insertedOutbound } = await supabase.from('consultation_messages').insert({
        school_id: payload.school_id,
        consultation_id: consultation.id,
        direction: 'OUTBOUND',
        actor_type: 'ASSISTANT',
        actor_name: payload.assistant_name || payload.assigned_assistant_key || 'Assistente',
        message_text: payload.response_text
      }).select('*').single();
      const responseMessage = insertedOutbound || null;

      const consultedSources = Array.isArray(payload.consulted_sources)
        ? payload.consulted_sources.map((source) => ({
            source_document_id: source?.source_document_id || null,
            source_title: source?.source_title || null,
            source_version_id: source?.source_version_id || null,
            source_version_label: source?.source_version_label || source?.source_version_number || null,
            source_excerpt: source?.source_excerpt || source?.excerpt || null
          }))
        : [];
      const supportingSource = payload.supporting_source || consultedSources[0] || null;
      const deliveredAt = payload.delivered_at || new Date().toISOString();

      const { data: insertedResponse, error: responseError } = await supabase.from('assistant_responses').insert({
        school_id: payload.school_id,
        consultation_id: consultation.id,
        assistant_key: payload.assigned_assistant_key || 'public.assistant',
        response_text: payload.response_text,
        source_version_id: payload.source_version_id || supportingSource?.source_version_id || null,
        confidence_score: payload.confidence_score ?? null,
        response_mode: payload.response_mode || 'AUTOMATIC',
        consulted_sources: consultedSources,
        supporting_source_title: payload.supporting_source_title || supportingSource?.source_title || null,
        supporting_source_excerpt: payload.supporting_source_excerpt || supportingSource?.source_excerpt || supportingSource?.excerpt || null,
        supporting_source_version_label: payload.supporting_source_version_label || supportingSource?.source_version_label || null,
        origin_message_id: payload.origin_message_id || originMessage?.id || null,
        response_message_id: payload.response_message_id || responseMessage?.id || null,
        fallback_to_human: Boolean(payload.fallback_to_human),
        corrected_from_response_id: payload.corrected_from_response_id || null,
        corrected_at: payload.corrected_at || null,
        corrected_by: payload.corrected_by || null,
        delivered_at: deliveredAt
      }).select('*').single();

      if (responseError) {
        console.error('Erro ao registrar resposta do assistente:', responseError.message);
      } else {
        assistantResponse = insertedResponse;
      }

      await supabase.from('formal_audit_events').insert({
        school_id: payload.school_id,
        consultation_id: consultation.id,
        event_type: payload.audit_event_type || 'ASSISTANT_RESPONSE',
        severity: 'INFO',
        actor_type: 'ASSISTANT',
        actor_name: payload.assistant_name || payload.assigned_assistant_key || 'Assistente',
        summary: payload.audit_summary || 'Resposta emitida no atendimento institucional.',
        details: {
          response_id: assistantResponse?.id || null,
          assigned_assistant_key: payload.assigned_assistant_key || 'public.assistant',
          requester_id: requesterId,
          response_mode: payload.response_mode || 'AUTOMATIC',
          fallback_to_human: Boolean(payload.fallback_to_human),
          source_version_id: payload.source_version_id || supportingSource?.source_version_id || null,
          supporting_source_title: payload.supporting_source_title || supportingSource?.source_title || null,
          consulted_sources: consultedSources,
          delivered_at: deliveredAt,
          period_marker: new Date().toISOString()
        }
      });
    }

    return {
      consultation,
      assistant_response: assistantResponse
    };
  } catch (error) {
    console.error('Erro ao persistir atendimento institucional:', error);
    return null;
  }
}

async function closeConsultationEvent(payload = {}) {
  if (!supabase || !payload.school_id || !payload.requester_id) return null;

  try {
    const { data: consultation } = await supabase
      .from('institutional_consultations')
      .select('id, metadata')
      .eq('school_id', payload.school_id)
      .eq('channel', payload.channel || 'chat')
      .eq('requester_id', payload.requester_id)
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consultation?.id) return null;

    if (payload.final_text) {
      await supabase.from('consultation_messages').insert({
        school_id: payload.school_id,
        consultation_id: consultation.id,
        direction: 'OUTBOUND',
        actor_type: 'ASSISTANT',
        actor_name: payload.actor_name || 'Sistema',
        message_text: payload.final_text
      });
    }

    const { data: updated, error } = await supabase
      .from('institutional_consultations')
      .update({
        status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
        metadata: {
          ...(consultation.metadata || {}),
          resolved_by: payload.actor_name || 'Sistema'
        }
      })
      .eq('id', consultation.id)
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao encerrar consulta institucional:', error.message);
      return null;
    }

    await supabase.from('formal_audit_events').insert({
      school_id: payload.school_id,
      consultation_id: consultation.id,
      event_type: 'CONSULTATION_RESOLVED',
      severity: 'INFO',
      actor_type: 'SYSTEM',
      actor_name: payload.actor_name || 'Sistema',
      summary: 'Conversa institucional encerrada.',
      details: {
        requester_id: payload.requester_id,
        channel: payload.channel || 'chat'
      }
    });

    return updated;
  } catch (error) {
    console.error('Erro ao finalizar atendimento institucional:', error);
    return null;
  }
}

module.exports = { 
  supabase, 
  loadSchoolConfig,
  findMatchingAnswers,
  findMatchingEntries,
  upsertLead,
  upsertParentWithChildren,
  getSchoolIdByBotNumber,
  logLeadBotEvent,
  getLeadStatus,
  recordConsultationEvent,
  closeConsultationEvent
};


