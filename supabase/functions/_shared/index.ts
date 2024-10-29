import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { createClient } from "jsr:@supabase/supabase-js@2";
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

export function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      },
    }
  );
}

export async function googleSearch(text, pattern) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);

  const result: any[] = [];

  $(pattern).each((i, title) => {
    const titleNode = $(title);
    result.push(titleNode);
  });

  return result;
}

export async function getMovies(date) {
  const firstDay = moment(date).startOf("month").format("YYYY-MM-DD");
  const lastDay = moment(date).endOf("month").format("YYYY-MM-DD");

  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from("cinema")
    .select("*, links (id, url, label)")
    .eq("hidden", false)
    .gte("release_date", firstDay)
    .lte("release_date", lastDay)
    .order("release_date")
    .order("id", { ascending: false });

  return data;
}

export async function getMovie(movieId: number) {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from("cinema")
    .select("*, links (id, url, label)")
    .eq("id", movieId)
    .single();

  return data;
}

export function formatFileSize(bytes, decimalPoint) {
  if (bytes == 0) return "0 Bytes";
  var k = 1000,
    dm = decimalPoint || 2,
    sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

export async function inspect(url) {
  const response = await fetch(url, {
    headers: { "Accept-Language": "en" },
  }).then((r) => r.text());
  return cheerio.load(response);
}

export async function checkFshareAlive(url) {
  const r = await fetch(url);
  return r.status !== 404;
}
