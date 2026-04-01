/**
 * Backfill embeddings for all knowledge_base rows that have NULL embedding.
 * Uses BAAI/bge-m3 (1024 dims) via HuggingFace Inference API.
 *
 * Usage: node scripts/backfill-embeddings.js
 */
require("dotenv").config();
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const EMBEDDING_MODEL = "intfloat/multilingual-e5-large";
const EMBEDDING_DIMENSION = 1024;
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_KEY required in .env");
  process.exit(1);
}
if (!HUGGINGFACE_API_KEY) {
  console.error("HUGGINGFACE_API_KEY required in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function generateEmbedding(text, retries = 3) {
  const trimmed = String(text || "").trim().slice(0, 8000);
  if (!trimmed) return null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}`,
        { inputs: trimmed },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
            "X-Wait-For-Model": "true"
          },
          timeout: 120000
        }
      );

      const embedding = response.data;
      if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error(`Unexpected embedding shape: expected array[${EMBEDDING_DIMENSION}], got ${typeof embedding} (len=${Array.isArray(embedding) ? embedding.length : "?"})`);
      }
      return embedding;
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = err.code === "ECONNABORTED" || err.message.includes("timeout") || status === 429 || status === 503;
      if (isRetryable && attempt < retries) {
        const wait = status === 429 ? 15000 : 5000;
        console.log(`    Retry ${attempt}/${retries} (${err.code || status || err.message}), waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

async function main() {
  console.log("Fetching knowledge_base rows with NULL embedding...");

  const { data: rows, error } = await supabase
    .from("knowledge_base")
    .select("id, question, answer")
    .is("embedding", null)
    .limit(BATCH_SIZE);

  if (error) {
    console.error("DB error:", error.message);
    process.exit(1);
  }

  console.log(`Found ${rows.length} rows without embeddings.`);
  if (!rows.length) {
    console.log("Nothing to do.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const text = `${row.question}\n${row.answer}`;
    try {
      const embedding = await generateEmbedding(text);
      if (embedding) {
        const { error: updateError } = await supabase
          .from("knowledge_base")
          .update({ embedding })
          .eq("id", row.id);
        if (updateError) throw updateError;
        success++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`  [${i + 1}/${rows.length}] FAIL ${row.id.slice(0, 8)}: ${err.message}`);
      failed++;
    }

    if ((i + 1) % 10 === 0 || i === rows.length - 1) {
      console.log(`  Progress: ${i + 1}/${rows.length} (${success} ok, ${failed} failed)`);
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone. ${success} embeddings generated, ${failed} failed.`);

  // Check if there are more
  const { count } = await supabase
    .from("knowledge_base")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);
  if (count > 0) {
    console.log(`Still ${count} rows without embeddings. Run the script again.`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
