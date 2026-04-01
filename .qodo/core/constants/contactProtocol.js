function buildContactProtocol(options = {}) {
  const humanHandoffLabel = options.humanHandoffLabel || "o canal humano adequado";
  const humanHandoffAction = options.humanHandoffAction || "use o canal humano adequado";

  return `
--- PROTOCOLO DE ENCAMINHAMENTO ---
1. Quando nao puder responder com seguranca, indique ${humanHandoffLabel}.
2. Ao encaminhar, diga a acao concreta esperada do usuario: ${humanHandoffAction}.
3. Nao simule agendamentos, promessas de retorno ou acoes humanas que o sistema nao executa.
4. Se existir um botao, fila ou area de escalonamento no produto, cite exatamente o nome dessa acao.
`.trim();
}

module.exports = buildContactProtocol;