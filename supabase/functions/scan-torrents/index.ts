// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  formatFileSize,
  getMovie,
  getMovies,
  getSupabaseClient,
} from "../_shared/index.ts";
import * as _ from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { date, movieId } = await req.json();

  try {
    const data = await scanTorrents({ date, movieId });
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

async function scanTorrents({
  date,
  movieId,
}: {
  date?: string;
  movieId?: number;
}) {
  const movies = date
    ? (await getMovies(date)).filter((x) => x.imdb)
    : [await getMovie(movieId!)];
  const supabase = getSupabaseClient();
  const output: string[] = [];

  await Promise.all(
    movies.map(async (movie) => {
      if (movie.links.filter((x) => x.url.startsWith("magnet:")).length) {
        return Promise.resolve();
      }

      const res = await fetch(
        "https://apibay.org/q.php?q=" + movie.imdb + "&cat=211,207"
      ).then((r) => r.json());

      let torrents = res.filter((x) => x.id != 0);

      if (
        torrents.some(
          (x) =>
            x.name.includes("YTS.") ||
            x.username === "GalaxyRG" ||
            x.name.endsWith("RARBG")
        )
      ) {
        torrents = torrents.filter(
          (x) =>
            x.name.includes("YTS.") ||
            x.username === "GalaxyRG" ||
            x.name.endsWith("RARBG")
        );
      } else {
        torrents = torrents.filter(
          (x) => !x.name.toLowerCase().includes("telesync")
        );

        if (torrents.length >= 7) {
          torrents = torrents.filter((x) => x.status === "vip");
        }

        // if (torrents.length >= 7) {
        //   torrents = _.sortBy(
        //     torrents,
        //     ["seeders", "leechers"],
        //     ["desc", "desc"]
        //   ).slice(0, 7);
        // }
      }

      torrents = torrents.map((x) => ({
        movie_id: movie.id,
        label: [x.name, formatFileSize(x.size, 2)].join(" | "),
        url: `magnet:?xt=urn:btih:${x.info_hash}&dn=${encodeURIComponent(
          x.name
        )}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.bittor.pw%3A1337%2Fannounce&tr=udp%3A%2F%2Fpublic.popcorn-tracker.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce`,
      }));

      if (!torrents.length) {
        return Promise.resolve();
      }

      const { error } = await supabase.from("links").insert(torrents);
      if (error) output.push(error.message || error.details);
      else
        output.push(`Updated ${torrents.length} torrents for [${movie.title}]`);

      return Promise.resolve();
    })
  );

  return output;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/scan-torrents' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
