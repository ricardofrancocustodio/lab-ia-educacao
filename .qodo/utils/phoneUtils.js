// 📁 .qodo/utils/phoneUtils.js - VERSÃO COM 9º DÍGITO OBRIGATÓRIO

/**
 * Padroniza números de telefone BRASILEIROS para formato internacional
 * GARANTE o 9º dígito para celulares (8º dígito após DDD)
 */
function standardizePhone(input) {
    if (!input) return "";
    
    // Remove TUDO que não é número
    let clean = String(input).replace(/\D/g, "");
    
    // Se vazio, retorna vazio
    if (clean.length === 0) return "";
    
    // Se começar com 0, remove
    if (clean.startsWith("0")) clean = clean.substring(1);
    
    console.log(`📞 [PHONE UTILS] Input: "${input}" → Clean: "${clean}" (${clean.length} dígitos)`);
    
    // REGRAS BRASIL (COM 9º DÍGITO OBRIGATÓRIO):
    // Celulares brasileiros têm 13 dígitos com DDI: 55 + DDD + 9 + número (8 dígitos)
    // Formato final: 55XX9XXXXXXX (13 dígitos)
    
    if (clean.length === 8) {
        // Número antigo sem 9: 99998888 → adiciona 9, DDD 11 e DDI 55 → 5511999998888
        clean = "55119" + clean;
        console.log(`📞 [PHONE UTILS] 8 dígitos → Adicionado 9, DDD 11, DDI 55: "${clean}"`);
    } 
    else if (clean.length === 9) {
        // Já tem 9 dígitos: 999998888 → adiciona DDD 11 e DDI 55 → 5511999998888
        clean = "5511" + clean;
        console.log(`📞 [PHONE UTILS] 9 dígitos → Adicionado DDD 11, DDI 55: "${clean}"`);
    } 
    else if (clean.length === 10) {
        // Número antigo com DDD mas sem 9: 1199998888 → adiciona 9 e DDI 55 → 5511999998888
        const ddd = clean.substring(0, 2);
        const numero = clean.substring(2);
        clean = "55" + ddd + "9" + numero;
        console.log(`📞 [PHONE UTILS] 10 dígitos → Adicionado 9 e DDI 55: "${clean}"`);
    } 
    else if (clean.length === 11) {
        // Formato correto já: 11999998888 → adiciona DDI 55 → 5511999998888
        clean = "55" + clean;
        console.log(`📞 [PHONE UTILS] 11 dígitos → Adicionado DDI 55: "${clean}"`);
    }
    else if (clean.length === 12) {
        // Tem DDI mas falta 9: 551199998888 → precisa adicionar 9
        if (clean.startsWith("55")) {
            const ddd = clean.substring(2, 4);
            const numero = clean.substring(4); // 8 dígitos
            clean = "55" + ddd + "9" + numero;
            console.log(`📞 [PHONE UTILS] 12 dígitos → Adicionado 9: "${clean}"`);
        }
    }
    // 13 dígitos já está correto: 5511999998888
    
    // VERIFICAÇÃO FINAL: Garante que celulares têm 13 dígitos
    if (clean.length === 13 && clean.startsWith("55")) {
        // Verifica se tem o 9 na posição correta (após DDD)
        const posicaoNove = clean.charAt(4); // Índice 4 (0-based)
        if (posicaoNove !== "9") {
            console.log(`⚠️ [PHONE UTILS] Celular sem 9º dígito! Corrigindo: "${clean}"`);
            const ddi = clean.substring(0, 2); // 55
            const ddd = clean.substring(2, 4); // XX
            const numero = clean.substring(4); // 8 dígitos
            clean = ddi + ddd + "9" + numero;
            console.log(`📞 [PHONE UTILS] Corrigido para: "${clean}"`);
        }
    }
    
    return clean;
}

/**
 * Garante que telefones brasileiros estejam no formato correto com 9º dígito
 */
function enforceNinthDigit(phone) {
    if (!phone) return phone;
    
    const clean = phone.replace(/\D/g, "");
    
    // Só aplica para celulares brasileiros (começam com 55)
    if (clean.startsWith("55") && clean.length >= 12) {
        const ddi = clean.substring(0, 2); // 55
        const ddd = clean.substring(2, 4); // XX
        const resto = clean.substring(4); // resto
        
        // Se o primeiro dígito após DDD não for 9, adiciona
        if (resto.length >= 1 && resto.charAt(0) !== "9") {
            const novoNumero = ddi + ddd + "9" + resto;
            console.log(`🔢 [9TH DIGIT] "${phone}" → "${novoNumero}"`);
            return novoNumero;
        }
    }
    
    return phone;
}

/**
 * Gera TODAS as variações possíveis para busca (INCLUINDO com/sem 9)
 */
function generatePhoneVariations(input) {
    const variations = new Set();
    
    // Versão padronizada (com 9)
    const stdPhone = standardizePhone(input);
    if (stdPhone) variations.add(stdPhone);
    
    // Versão original limpa
    const clean = String(input).replace(/\D/g, "");
    if (clean) variations.add(clean);
    
    // Gera variações COM e SEM 9
    if (clean.length >= 10) {
        // Se tiver DDD (primeiros 2 dígitos são DDD)
        const possivelDDD = clean.substring(0, 2);
        const validDDDs = ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", 
                          "27", "28", "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", 
                          "44", "45", "46", "47", "48", "49", "51", "53", "54", "55", "61", "62", 
                          "63", "64", "65", "66", "67", "68", "69", "71", "73", "74", "75", "77", 
                          "79", "81", "82", "83", "84", "85", "86", "87", "88", "89", "91", "92", 
                          "93", "94", "95", "96", "97", "98", "99"];
        
        if (validDDDs.includes(possivelDDD)) {
            const ddd = possivelDDD;
            const resto = clean.substring(2);
            
            // Com 55 na frente
            variations.add("55" + ddd + resto);
            
            // Se o resto tiver 8 dígitos, adiciona versão com 9
            if (resto.length === 8) {
                variations.add("55" + ddd + "9" + resto);
            }
            
            // Se o resto tiver 9 dígitos e começar com 9, remove o 9
            if (resto.length === 9 && resto.startsWith("9")) {
                variations.add("55" + ddd + resto.substring(1));
            }
        }
    }
    
    // Adiciona versão com 55 se não tiver
    if (!clean.startsWith("55")) {
        variations.add("55" + clean);
    }
    
    // Adiciona versão sem 55 se tiver
    if (clean.startsWith("55")) {
        variations.add(clean.substring(2));
    }
    
    // Aplica enforceNinthDigit em todas as variações
    const finalVariations = new Set();
    for (const variation of variations) {
        // Mantém a original
        finalVariations.add(variation);
        
        // Adiciona versão com 9º dígito garantido
        const withNinth = enforceNinthDigit(variation);
        if (withNinth && withNinth !== variation) {
            finalVariations.add(withNinth);
        }
    }
    
    console.log(`📞 [PHONE VARIATIONS] Para "${input}":`, Array.from(finalVariations));
    return Array.from(finalVariations);
}

/**
 * Busca inteligente: tenta todas as variações (COM e SEM 9)
 */
async function findVisitsByPhone(phone, daysAhead = 60) {
    const variations = generatePhoneVariations(phone);
    const Agenda = require("../config/google_integration/agendaService.js");
    
    console.log(`🔍 [PHONE SEARCH] Buscando por ${variations.length} variações de "${phone}"`);
    
    for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        console.log(`🔍 [${i+1}/${variations.length}] Tentando: ${variation}`);
        
        try {
            const visits = await Agenda.findVisits({
                emailOrPhone: variation,
                daysAhead: daysAhead
            });
            
            if (visits && visits.length > 0) {
                console.log(`✅ Encontrado com variação: ${variation}`);
                return { visits: visits, matchedVariation: variation };
            }
        } catch (error) {
            console.log(`⚠️ Erro na busca com ${variation}:`, error.message);
        }
    }
    
    console.log(`❌ Nenhuma visita encontrada em nenhuma variação`);
    return { visits: [], matchedVariation: null };
}

// Mantém as outras funções como estão...
function resolveLookupCandidates(from, input) {
    const candidates = new Set();
    
    // 1️⃣ WhatsApp real (com 9º dígito garantido)
    if (from) {
        const stdFrom = standardizePhone(from);
        const stdFromWith9 = enforceNinthDigit(stdFrom);
        if (stdFromWith9) candidates.add(stdFromWith9);
    }
    
    // 2️⃣ Telefone digitado (com 9º dígito)
    const cleanInput = input.replace(/\D/g, "");
    if (cleanInput.length >= 8) {
        const stdInput = standardizePhone(input);
        const stdInputWith9 = enforceNinthDigit(stdInput);
        if (stdInputWith9) candidates.add(stdInputWith9);
    }
    
    // 3️⃣ Email (se for email)
    if (input.includes("@")) {
        candidates.add(input.toLowerCase());
    }
    
    console.log(`🔍 [LOOKUP CANDIDATES] Para "${input}":`, Array.from(candidates));
    return [...candidates];
}

module.exports = { 
    standardizePhone,
    enforceNinthDigit,
    isValidPhone: function(text) {
        const clean = String(text).replace(/\D/g, "");
        return clean.length >= 8;
    },
    generatePhoneVariations,
    findVisitsByPhone,
    resolveLookupCandidates
};