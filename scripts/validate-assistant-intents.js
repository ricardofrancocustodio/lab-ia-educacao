const receptionist = require('../.qodo/core/receptionist');
const agents = require('../.qodo/agents');

const SCHOOL_ID = process.env.SCHOOL_ID || 'c5166e00-2e7a-445a-9946-d56380ad4a32';

async function runCase(label, handler, text, expectedMode) {
  const result = await handler(`validation:${label}:${text}`, {
    text,
    school_id: SCHOOL_ID,
    metadata: {
      school_id: SCHOOL_ID,
      school_name: 'CEF 01 de Brasilia'
    }
  });

  const actualMode = result?.audit?.response_mode || 'UNKNOWN';
  const ok = actualMode === expectedMode;
  return {
    label,
    text,
    expectedMode,
    actualMode,
    ok,
    reply: result?.text || ''
  };
}

async function runConversationFlow(label, steps = []) {
  const from = `validation-flow:${label}`;
  const results = [];

  for (const step of steps) {
    const result = await receptionist.handleMessage(from, {
      text: step.text,
      school_id: SCHOOL_ID,
      metadata: {
        school_id: SCHOOL_ID,
        school_name: 'CEF 01 de Brasilia'
      }
    });

    const actualMode = result?.audit?.response_mode || 'UNKNOWN';
    results.push({
      label,
      text: step.text,
      expectedMode: step.expectedMode,
      actualMode,
      ok: actualMode === step.expectedMode,
      reply: result?.text || '',
      assistantKey: result?.audit?.assistant_key || 'UNKNOWN'
    });
  }

  return results;
}

async function main() {
  const cases = [
    ['public', receptionist.handleMessage.bind(receptionist), 'o que voce consegue me responder?', 'AUTOMATIC_CAPABILITY'],
    ['public', receptionist.handleMessage.bind(receptionist), 'quais assuntos voce atende?', 'AUTOMATIC_CAPABILITY'],
    ['public', receptionist.handleMessage.bind(receptionist), 'voce responde sobre matricula?', 'AUTOMATIC_CAPABILITY'],
    ['public', receptionist.handleMessage.bind(receptionist), 'como faco matricula?', 'ABSTAINED'],
    ['secretariat', agents.administration.secretariat.handleMessage.bind(agents.administration.secretariat), 'o que voce consegue me responder?', 'AUTOMATIC_CAPABILITY'],
    ['direction', agents.administration.direction.handleMessage.bind(agents.administration.direction), 'quais assuntos voce atende?', 'AUTOMATIC_CAPABILITY']
  ];

  const results = [];
  for (const [label, handler, text, expectedMode] of cases) {
    results.push(await runCase(label, handler, text, expectedMode));
  }

  const flowResults = await runConversationFlow('public-route-secretariat', [
    { text: 'quero falar com a secretaria', expectedMode: 'AUTOMATIC_CLARIFICATION' },
    { text: 'sim', expectedMode: 'AUTOMATIC_REDIRECT' },
    { text: 'quais assuntos voce atende?', expectedMode: 'AUTOMATIC_CAPABILITY' },
    { text: 'voltar', expectedMode: 'AUTOMATIC_GREETING' },
    { text: 'quais assuntos voce atende?', expectedMode: 'AUTOMATIC_CAPABILITY' }
  ]);
  results.push(...flowResults);

  console.log(JSON.stringify(results, null, 2));

  const failed = results.filter((item) => !item.ok);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});