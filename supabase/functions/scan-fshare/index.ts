// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  checkFshareAlive,
  getMovies,
  getSupabaseClient,
  googleSearch,
  inspect,
} from "../_shared/index.ts";
import * as _ from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { date } = await req.json();

  try {
    const data = await searchFshare(date);
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

async function searchFshare(date) {
  const movies = await getMovies(date);
  const list = movies.filter((x) => x.video_url || x.links.length);
  const output: any = [];
  await Promise.all(
    list.map(async (movie: any) => {
      if (movie.links.filter((x: any) => x.url.includes("fshare.vn")).length)
        return;

      const record = await scanTvCine(movie);
      if (record) output.push(record);
      else output.push(await scanFshareGG(movie));
    })
  );

  if (!output.length) return [];

  const key = date + "-fshare";
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("crawl_results")
    .upsert(
      {
        key,
        data: output.filter((x) => x.links.length),
        resolved: false,
        updated_at: new Date(),
      },
      { onConflict: "key" }
    )
    .select();

  if (error) throw new Error(error.details);

  return data[0].data;
}

async function scanFshareGG(movie) {
  const title = movie.english
    ? [movie.english, movie.year].join(" ")
    : movie.title;
  const rr = await googleSearch(
    `${title} fshare`,
    `a[href^='/url?q=https://www.fshare.vn/']`
  );
  const r = rr
    .map((titleNode) => {
      const label = titleNode.text();
      const path = new URL(
        titleNode.attr("href").replace("/url?q=", "").replace("&", "?")
      ).pathname;
      const url = `https://www.fshare.vn${path}`;

      if (url.includes("/file/") && !checkFshareAlive(url)) return;

      return { label, url };
    })
    .filter((x) => x);
  return { id: movie.id, title: movie.title, links: r };
}

async function scanTvCine(movie) {
  const title = movie.english
    ? [movie.english, movie.year].join(" ")
    : movie.title;

  const url = `https://thuviencine.com/?s=${encodeURIComponent(title)}`;
  const $ = await inspect(url);
  const links: any = [];
  for (const e of $('[rel="bookmark"]')) {
    const tv = $(e).find(".item-tv").text();
    if (tv === "TV") continue;

    const found = $(e).attr("title");
    const downloadUrl = [
      "https://thuviencine.com/download/?id=",
      $(e).closest(".type-post").attr("id").split("-").pop(),
    ].join("");
    const label = $(e).find(".item-quality").text().trim();
    const $$ = await inspect(downloadUrl);
    const url = $$("#hover").first().attr("href");
    if (!url) continue;

    links.push({ found, url, label });
  }

  if (links.length) return { id: movie.id, title: movie.title, links };
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/scan-fshare' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
