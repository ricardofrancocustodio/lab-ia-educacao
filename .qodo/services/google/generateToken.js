// /**
//  * Script automatizado para gerar token OAuth2 do Google Calendar
//  * --------------------------------------------------------------
//  * Ele:
//  * ✅ Abre o navegador automaticamente
//  * ✅ Recebe o código de autorização via callback (sem precisar copiar/colar)
//  * ✅ Salva o token.json automaticamente (ou nome customizado)
//  *
//  * Uso:
//  *   node generateToken.js token-escola1.json
//  *   node generateToken.js token-ef1.json
//  *   node generateToken.js token-secretaria.json
//  */

// const fs = require("fs");
// const path = require("path");
// const http = require("http");
// const { google } = require("googleapis");
// const open = require("open");
// const chalk = require("chalk");

// // 📂 Caminho padrão para o credentials.json
// //const CREDENTIALS_PATH = path.resolve("./.qodo/services/google/credentials.json");
// //const CREDENTIALS_PATH = path.resolve("credentials.json");
// const CREDENTIALS_PATH = path.resolve(__dirname, "credentials.json");

// // 🧩 Permite gerar token com nome diferente (ex: token-ef1.json)
// const customFile = process.argv[2];
// const TOKEN_PATH = path.resolve(__dirname, `${customFile || "token.json"}`);

// async function startAuthServer() {
//   if (!fs.existsSync(CREDENTIALS_PATH)) {
//     console.error(chalk.red("❌ Arquivo credentials.json não encontrado."));
//     console.error(chalk.yellow("👉 Gere o arquivo no Google Cloud Console e salve em .qodo/services/google"));
//     process.exit(1);
//   }

//   const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
//   const { client_secret, client_id, redirect_uris } = credentials.web;
//   const redirectUri = redirect_uris[0];
//   const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

//   // Gera URL de autorização
//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: ["https://www.googleapis.com/auth/calendar"],
//     prompt: "consent", // força nova permissão e refresh_token
//   });

//   console.log(chalk.cyanBright("\n🌐  Abrindo navegador para autenticação...\n"));
//   console.log(chalk.blueBright("Se o navegador não abrir, acesse manualmente:\n"), chalk.underline(authUrl));
//   await open(authUrl);

//   const server = http.createServer(async (req, res) => {
//     if (req.url.startsWith("/oauth2callback")) {
//       const url = new URL(req.url, "http://localhost:8080");
//       const code = url.searchParams.get("code");

//       res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
//       res.end(`
//         <html>
//           <body style="font-family: sans-serif; text-align:center; padding:40px;">
//             <h2>✅ Autorização recebida com sucesso!</h2>
//             <p>Você já pode fechar esta aba.</p>
//           </body>
//         </html>
//       `);

//       try {
//         const { tokens } = await oAuth2Client.getToken(code);
//         oAuth2Client.setCredentials(tokens);

//         const dir = path.dirname(TOKEN_PATH);
//         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

//         fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
//         console.log(chalk.greenBright("\n✅ Token salvo com sucesso em:"), chalk.yellow(TOKEN_PATH));
//         console.log(chalk.cyan("🚀 Agora você já pode usar esta conta na integração com o Google Calendar!"));
//       } catch (err) {
//         console.error(chalk.red("❌ Erro ao gerar o token:"), err.message);
//       } finally {
//         server.close();
//         process.exit(0);
//       }
//     } else {
//       res.writeHead(404);
//       res.end("Not found");
//     }
//   });

//   server.listen(8080, () => {
//     console.log(chalk.greenBright("✅ Servidor aguardando callback em http://localhost:8080/oauth2callback\n"));
//   });
// }

// startAuthServer();
