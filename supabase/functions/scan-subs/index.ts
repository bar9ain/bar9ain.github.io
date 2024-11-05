// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getMovies, getSupabaseClient } from "../_shared/index.ts";
import * as _ from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { date } = await req.json();

  try {
    const data = await scanSubs(date);
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

async function scanSubs(date: string) {
  const output: string[] = [];
  const supabase = getSupabaseClient();
  const movies = (await getMovies(date)).filter((x) => x.imdb && !x.subs_link);

  await Promise.all(
    movies.map(async (movie) => {
      if (movie.subs_link) return Promise.resolve();

      const result = await fetch("https://api.subsource.net/api/searchMovie", {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
        },
        body: `{\"query\":\"${movie.imdb}\"}`,
        method: "POST",
      }).then((r) => r.json());
      if (result.found.length) {
        const subs_link = `https://subsource.net/subtitles/${result.found[0].linkName}`;
        const { data } = await supabase
          .from("cinema")
          .update({ subs_link })
          .eq("imdb", movie.imdb)
          .select();

        if (data.length) {
          output.push(`Updated subtitle link for [${data[0].title}]`);
        }
      }

      return Promise.resolve();
    })
  );

  return output;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/scan-subs' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
