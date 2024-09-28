const supabaseJs = require("@supabase/supabase-js");
const fs = require("node:fs");

const supabase = supabaseJs.createClient(
  process.env.DB_URL,
  process.env.DB_KEY
);

read();

function login() {
  return supabase.auth.signInWithPassword({
    email: process.env.DB_USER,
    password: process.env.DB_PASS,
  });
}

async function read() {
  await login();
  const text = fs.readFileSync("./fetch.json", "utf-8");
  const input = JSON.parse(text);

  for await (const [i, record] of input.entries()) {
    printProgress("Importing...", i + 1, input.length);
    if (!record.imdb || !record.imdb.length) continue;

    const { error } = await supabase
      .from("cinema")
      .update({ imdb: record.imdb[0].imdb })
      .eq("id", record.id);
    if (error) console.log(error.message, error.details);
  }
}

function printProgress(prefix, value, max) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`${prefix} ${value}/${max}`);
}
