import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

export async function getMovies(d) {
  const date = new Date(d);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .substr(0, 10);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    .toISOString()
    .substr(0, 10);

  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from("cinema")
    .select("*, links (id, url, label)")
    .eq("hidden", false)
    .gt("release_date", firstDay)
    .lte("release_date", lastDay)
    .order("release_date")
    .order("id", { ascending: false });

  return data;
}
