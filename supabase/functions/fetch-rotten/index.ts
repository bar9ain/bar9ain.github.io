// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { inspect } from "../_shared/index.ts";
import { getSupabaseClient } from "../_shared/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { id } = await req.json();
    const data = await fetchRotten(id);
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

async function fetchRotten(slug: string) {
  const url = `https://www.rottentomatoes.com/m/${slug}`;
  const $ = await inspect(url);
  const json = JSON.parse(
    $('script[type="application/ld+json"]').first().html()
  );

  
  const response: Record<string, any> = {
    contentRating: json.contentRating,
    releaseDate: json.dateCreated,
    cast: (json.actor || []).map((act: any) => ({
      id: act.sameAs.split("/").pop(),
      name: act.name,
      image: act.image,
    })),
    genre: json.genre,
    year: json.dateCreated?.split("-")?.shift(),
  };

  const scorecard = JSON.parse($("#media-scorecard-json").first().html()!);

  if (scorecard) {
    response.audienceScore = scorecard.audienceScore.score;
    response.audienceVerified = scorecard.audienceScore.certified;
    response.criticsScore = scorecard.criticsScore.score;
    response.criticsVerified = scorecard.criticsScore.certified;
    response.synopsis = scorecard.description;
    response.cta = scorecard.cta;
  }

  const mediaInfo = ($(".media-info").first().text() || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  mediaInfo.map((line, index) => {
    switch (line) {
      case "Distributor":
        response.distributor = mediaInfo[index + 1]
          .split("/")
          .map((x) => x.trim());
        break;

      case "Rating":
        response.contentWarning = extractWordsInBrackets(
          mediaInfo[index + 1]
        ).split("|");
        break;

      case "Runtime":
        response.runtime = mediaInfo[index + 1];
    }
  });

  const mediaHero = JSON.parse($("#media-hero-json").first().html()!);
  const record = {
    id: slug,
    title: mediaHero.content.title,
    data: response,
  };

  const supabase = await getSupabaseClient();
  const result = await supabase
    .from("rotten_tomatoes")
    .upsert(record, { onConflict: "id" })
    .select()
    .single();

  if (result.error) throw new Error(result.error.details);

  return result.data;
}

function extractWordsInBrackets(text: string) {
  const regex = /\(([^\)]+)\)/g;
  const matches = text.match(regex);
  if (!matches) return "";

  const wordsInBrackets = matches.map((match) => match.slice(1, -1));
  return wordsInBrackets.shift() || "";
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-rotten' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
