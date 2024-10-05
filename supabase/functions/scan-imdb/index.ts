// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { googleSearch } from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { date } = await req.json();

  try {
    const data = await findImdb(date);
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function findImdb(_date: string) {
  const date = new Date(_date);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .substr(0, 10);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    .toISOString()
    .substr(0, 10);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: movies } = await supabase
    .from("cinema")
    .select("*, links (id, url, label)")
    .eq("hidden", false)
    .gt("release_date", firstDay)
    .lte("release_date", lastDay)
    .order("release_date")
    .order("id", { ascending: false });

  const list = movies.filter((x) => !x.imdb);
  const output: any = [];
  for await (const movie of list) {
    const title = movie.english
      ? [movie.english, movie.year].join(" ")
      : movie.title;
    const rr = await googleSearch(
      `${title} imdb`,
      `a[href^='/url?q=https://www.imdb.com/title/']`
    );
    const r = rr
      .map((titleNode) => {
        const text = titleNode.text();
        const path = new URL(
          titleNode.attr("href").replace("/url?q=", "").replace("&", "?")
        ).pathname;
        const url = `https://www.imdb.com${path}`;
        const imdb = path.split("/")[2];

        if (
          text.includes("› title") &&
          !text.includes("TV Series") &&
          !text.includes("TV Episode")
        )
          return { imdb, text, url };
      })
      .filter((x) => x);
    output.push({ id: movie.id, title: movie.title, imdb: r });
  }

  if (!output.length) return [];

  const key = _date + "-imdb";

  const { data, error } = await supabase
    .from("crawl_results")
    .upsert(
      {
        key,
        data: output,
        resolved: false,
        updated_at: new Date(),
      },
      { onConflict: "key" }
    )
    .select();

  if (error) throw new Error(error.details);

  return data[0].data;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/scan-imdb' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
