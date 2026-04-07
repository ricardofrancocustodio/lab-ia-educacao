const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseInline(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function wrapParagraph(lines) {
  const text = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  return `<p>${parseInline(text)}</p>`;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const htmlParts = [];
  const paragraphBuffer = [];
  const codeBuffer = [];
  let inCodeBlock = false;
  let headingCount = 0;

  const flushParagraph = () => {
    if (!paragraphBuffer.length) {
      return;
    }

    htmlParts.push(wrapParagraph(paragraphBuffer));
    paragraphBuffer.length = 0;
  };

  const flushCodeBlock = () => {
    if (!codeBuffer.length) {
      htmlParts.push('<pre><code></code></pre>');
      return;
    }

    const code = escapeHtml(codeBuffer.join('\n')).replace(/\n$/, '');
    htmlParts.push(`<pre><code>${code}</code></pre>`);
    codeBuffer.length = 0;
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushParagraph();
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line.replace(/\s+$/g, ''));
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      headingCount += 1;
      const level = headingMatch[1].length;
      const text = parseInline(headingMatch[2].trim());
      const coverClass = headingCount <= 3 ? ' class="cover-heading"' : '';
      htmlParts.push(`<h${level}${coverClass}>${text}</h${level}>`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();

  if (inCodeBlock) {
    flushCodeBlock();
  }

  return htmlParts.filter(Boolean).join('\n');
}

function buildHtmlDocument(bodyHtml, title) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }

    :root {
      --paper: #fffdfa;
      --ink: #1e2430;
      --muted: #5a6472;
      --accent: #17324d;
      --accent-soft: #dfe7ef;
      --frame: #d7d4cd;
      --code-bg: #f4efe6;
    }

    * {
      box-sizing: border-box;
    }

    html {
      background: #e9e3d7;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: #e9e3d7;
      font-family: Cambria, Georgia, "Times New Roman", serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    main {
      width: 180mm;
      margin: 10mm auto;
      padding: 18mm 15mm 16mm;
      background: var(--paper);
      box-shadow: 0 8px 28px rgba(24, 33, 45, 0.08);
      border: 1px solid var(--frame);
    }

    p {
      margin: 0 0 10pt;
      font-size: 11.5pt;
      line-height: 1.58;
      text-align: justify;
      widows: 3;
      orphans: 3;
    }

    strong {
      color: #16283c;
      font-weight: 700;
    }

    h1, h2, h3, h4 {
      margin: 0;
      color: var(--accent);
      font-family: "Segoe UI Semibold", "Aptos Display", "Trebuchet MS", Arial, sans-serif;
      line-height: 1.18;
      page-break-after: avoid;
      break-after: avoid-page;
    }

    h1 {
      margin-top: 4mm;
      margin-bottom: 5mm;
      font-size: 23pt;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      text-align: center;
    }

    h2 {
      margin-top: 7mm;
      margin-bottom: 3mm;
      font-size: 16pt;
    }

    h3 {
      margin-top: 6mm;
      margin-bottom: 2.5mm;
      font-size: 13pt;
    }

    h4 {
      margin-top: 5mm;
      margin-bottom: 2mm;
      font-size: 11.5pt;
    }

    .cover-heading {
      text-align: center;
      max-width: 135mm;
      margin-left: auto;
      margin-right: auto;
    }

    h1.cover-heading + h2.cover-heading {
      margin-top: 3mm;
    }

    h2.cover-heading {
      font-size: 17pt;
      letter-spacing: 0.01em;
    }

    h2.cover-heading + p,
    h2.cover-heading + h2.cover-heading + p {
      margin-top: 8mm;
      text-align: center;
      color: var(--muted);
      font-size: 11pt;
    }

    pre {
      margin: 10pt 0 12pt;
      padding: 10pt 12pt;
      background: linear-gradient(180deg, var(--code-bg), #fbf8f2);
      border: 1px solid #ddd3c4;
      border-left: 4px solid #8b6b3e;
      border-radius: 4px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 10pt;
      line-height: 1.5;
      color: #33281b;
    }

    @media print {
      html,
      body {
        background: #ffffff;
      }

      main {
        width: auto;
        margin: 0;
        padding: 0;
        border: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <main>
${bodyHtml}
  </main>
</body>
</html>`;
}

function resolveBrowserPath() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  const htmlPath = process.argv[4] || outputPath.replace(/\.pdf$/i, '.print.html');

  if (!inputPath || !outputPath) {
    fail('Uso: node scripts/render-markdown-pdf.js <entrada.md> <saida.pdf> [saida.html]');
  }

  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath);
  const resolvedHtml = path.resolve(htmlPath);

  if (!fs.existsSync(resolvedInput)) {
    fail(`Arquivo de entrada nao encontrado: ${resolvedInput}`);
  }

  const markdown = fs.readFileSync(resolvedInput, 'utf8');
  const bodyHtml = renderMarkdown(markdown);
  const html = buildHtmlDocument(bodyHtml, path.basename(resolvedInput, path.extname(resolvedInput)));

  fs.mkdirSync(path.dirname(resolvedHtml), { recursive: true });
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedHtml, html, 'utf8');

  const browserPath = resolveBrowserPath();
  if (!browserPath) {
    fail('Nenhum navegador compativel encontrado para impressao em PDF.');
  }

  const fileUrl = `file:///${resolvedHtml.replace(/\\/g, '/')}`;
  const result = spawnSync(
    browserPath,
    [
      '--headless=new',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
      `--print-to-pdf=${resolvedOutput}`,
      fileUrl
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    fail(`Falha ao gerar PDF. ${details}`.trim());
  }

  console.log(`HTML gerado em: ${resolvedHtml}`);
  console.log(`PDF gerado em: ${resolvedOutput}`);
}

main();