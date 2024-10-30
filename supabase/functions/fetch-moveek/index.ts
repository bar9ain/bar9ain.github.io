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

  const { url } = await req.json();

  try {
    const data = await scanMoveek(url);
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

function formatDate(date) {
  const [d, m, y] = date.split("/");
  if (!d || !m || !y) return null;
  return [y, m, d].join("-");
}

async function scanMoveek(url) {
  const $ = await inspect(url);
  const title = $(".mb-0.text-truncate a").first().text().trim();
  const englishName = $(".mb-0.text-muted.text-truncate")
    .first()
    .text()
    .split("-");
  const genres = englishName
    .pop()
    .split(",")
    .map((x) => x.trim());
  const image = $("img[data-srcset]").first().attr("data-src");
  const result: any = {
    title,
    genres,
    english: englishName.join("-").trim(),
    image,
  };

  try {
    result.release_date = formatDate(
      $(".fe-calendar").first().closest(".col").children().last().text().trim()
    );
  } catch (e) {
    console.log(e.message);
  }

  try {
    result.content_rating = $(".fe-user-check")
      .first()
      .closest(".col")
      .children()
      .last()
      .text()
      .trim();
  } catch {}

  return result;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-moveek' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
