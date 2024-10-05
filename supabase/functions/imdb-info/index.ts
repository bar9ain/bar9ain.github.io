// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { getMovies, getSupabaseClient } from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { date } = await req.json();

  try {
    const data = await fetchImdb(date);
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

async function fetchImdb(_date: string) {
  const movies = (await getMovies(_date)).filter((x) => x.imdb);
  const ids = JSON.stringify(movies.map((x) => x.imdb)).replaceAll('"', '\\"');
  const r = await fetch("https://graph.imdbapi.dev/v1", {
    headers: {
      accept: "application/json, multipart/mixed",
      "content-type": "application/json",
    },
    body: `{"query":"query exampleMultiTitleIDsx {\\n  titles(ids: ${ids}) {\\n    id\\n    primary_title\\n    start_year\\n    rating {\\n      aggregate_rating\\n    }\\n    genres\\n    origin_countries {\\n      code\\n      name\\n    }\\n  }\\n}"}`,
    method: "POST",
  }).then((r) => r.json());

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("cinema")
    .upsert(
      r.data.titles.map((m) => ({
        english: m.primary_title,
        year: m.start_year,
        rate: m.rating?.aggregate_rating,
        genres: m.genres,
        countries: m.origin_countries,
        imdb: m.id,
      })),
      { onConflict: "imdb" }
    )
    .select();

  if (error) return { error: error.message || error.details };

  return { success: true };
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/imdb-info' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
