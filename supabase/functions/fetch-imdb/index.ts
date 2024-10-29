// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { inspect } from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { id } = await req.json();

  try {
    const data = await scanImdb(id);
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

async function scanImdb(id) {
  const url = `https://imdb.com/title/${id}`;
  const $ = await inspect(url);
  const json = JSON.parse($("#__NEXT_DATA__").first().text());
  const data = json.props.pageProps.aboveTheFoldData;
  return {
    id: data.id,
    countries: (data.countriesOfOrigin?.countries || []).map((x) => ({
      code: x.id,
    })),
    genres: (data.genres?.genres || []).map((x) => x.text),
    english: [...new Set([data.originalTitleText?.text, data.titleText?.text])]
      .filter((x) => x)
      .join(" - "),
    year: data.releaseYear?.year,
    rate: data.ratingsSummary?.aggregateRating,
  };
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-imdb' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
