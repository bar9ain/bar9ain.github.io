// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { multiParser } from "https://deno.land/x/multiparser@0.114.0/mod.ts";
import { getMovie, getSupabaseClient } from "../_shared/index.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { xml2js } from "https://deno.land/x/xml2js@1.0.0/mod.ts";
import { js2xml } from "https://deno.land/x/js2xml@1.0.3/mod.ts";
import * as path from "https://deno.land/std@0.224.0/path/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const form = await multiParser(req);

    if (!form.fields.id) {
      throw new Error("ID not found");
    }

    const id = form.fields.id;
    const movie = await getMovie(id);

    if (!movie) {
      throw new Error("Movie not found");
    }

    if (!form.files.raw && !form.fields.url && !form.files.sub) {
      throw new Error("Please select a file or enter URL");
    }

    const supabase = getSupabaseClient();
    const sub = form.files.sub;
    const subPath = `${supabase.supabaseUrl}/storage/v1/object/public/media/vtt/${id}.vtt`;

    if (sub) await uploadSubtitle(sub, id);

    const raw = form.files.raw;
    const lang = form.fields.lang || "en";
    const isRaw = lang !== "vi";

    if (raw) {
      switch (raw.contentType) {
        case "application/vnd.apple.mpegurl":
        case "audio/mpegurl":
          return await handleM3u8(raw, { lang, id, isRaw });

        default:
          return await handleDash(raw, { subPath, lang, id, isRaw });
      }
    }

    const url = form.fields.url;
    if (url) {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
      });
      const content = await res.text();
      if (content === "Gone") throw new Error("Gone");

      const contentType = res.headers.get("content-type") as string;
      const file = createFile(content, contentType);
      if (
        contentType === "application/vnd.apple.mpegurl" ||
        contentType === "audio/mpegurl" ||
        url.endsWith(".m3u8") ||
        url.endsWith(".m3u")
      ) {
        return await handleM3u8(processM3U(content, url), {
          lang,
          id,
          isRaw,
        });
      }

      return await handleDash(file, { subPath, id, lang, isRaw });
    }

    return new Response(JSON.stringify({ subPath }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(e.message, { status: 400, headers: corsHeaders });
  }
});

async function upload(file, path) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from("media")
    .upload(path, file.content.buffer, {
      contentType: file.contentType,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw new Error(error.details);

  return `${supabase.supabaseUrl}/storage/v1/object/public/media/${path}`;
}

async function handleM3u8(raw, { lang, id, isRaw }) {
  const supabase = getSupabaseClient();

  // Upload raw m3u8
  await upload(raw, `m3u8/${id}_raw.m3u8`);

  // Create index m3u8
  const indexm3u8 = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${lang}",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE="${lang}",URI="../vtt/${id}.m3u8"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=800000,RESOLUTION=1920x1080,SUBTITLES="subs"
${id}_raw.m3u8`;
  const path = await upload(
    createFile(indexm3u8, "application/vnd.apple.mpegurl"),
    `m3u8/${id}.m3u8`
  );

  await supabase
    .from("cinema")
    .update({ video_url: `${path}${isRaw ? "?type=raw" : ""}` })
    .eq("id", id);

  return new Response(JSON.stringify({ path }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleDash(file, { lang, subPath, id, isRaw }) {
  const supabase = getSupabaseClient();

  const path = await processXML(new TextDecoder().decode(file.content.buffer), {
    path: `dash/${id}.mpd`,
    subPath,
    lang,
  });

  await supabase
    .from("cinema")
    .update({ video_url: `${path}${isRaw ? "?dashtype=raw" : ""}` })
    .eq("id", id);

  return new Response(JSON.stringify({ path }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function processXML(text, { subPath, lang = "en", path }) {
  const xml = xml2js(text, { compact: true });

  const video = xml.MPD.Period.AdaptationSet.find(
    (x) => x._attributes.contentType === "video"
  );
  video.Representation = video.Representation.filter(
    (x) => x._attributes.height == "1080" || x._attributes.width == "1920"
  );

  xml.MPD.Period.AdaptationSet.push({
    _attributes: {
      mimeType: "text/vtt",
      lang,
    },
    Representation: {
      _attributes: {
        id: "caption",
        bandwidth: "123",
      },
      BaseURL: subPath,
    },
  });

  const content = js2xml(xml, {
    compact: true,
    spaces: 2,
    fullTagEmptyElement: true,
  });

  const file = createFile(content, "application/dash+xml");
  return await upload(file, path);
}

function createFile(content: string, contentType: string) {
  return {
    contentType,
    content: { buffer: new TextEncoder().encode(content) },
  };
}

function processM3U(content: string, url: string) {
  const root = url.replace("https://", "").split("/");
  root.pop();

  let list = content.split("\n");

  const ad = "#EXTINF:2.902900,";

  list.forEach((line: string, i: number) => {
    if (line.endsWith(".ts") && !line.startsWith("http")) {
      list[i] = "https://" + path.join(root.join("/"), line);
    }

    if (line === "#EXT-X-DISCONTINUITY") {
      list[i] = "";
    }

    if (line === ad) {
      for (let j = i - 1; j < i + 24; j++) {
        list[j] = "";
      }
    }
  });

  return createFile(
    list.filter((x: string) => x).join("\n"),
    "application/vnd.apple.mpegurl"
  );
}

function getM3ULength(content: string) {
  const list: string[] = content.split("\n");
  let length = 0;
  for (let line of list) {
    if (line.startsWith("#EXTINF")) {
      length += parseFloat(line.split(":").pop()!);
    }
  }

  return Math.ceil(length);
}

function getSubLength(content: string) {
  try {
    const list = content.split("\n").reverse();
    const last = list.find((x) =>
      /\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/.test(x)
    );
    const time = last?.split(" ").pop();
    const [h, m, s] = time!.split(":").map((x) => parseInt(x));
    return (h * 60 + m) * 60 + s;
  } catch {
    return 9000;
  }
}

async function uploadSubtitle(file: ReturnType<typeof createFile>, id: number) {
  await upload(file, `vtt/${id}.vtt`);
  console.log("uploaded vtt file");

  const length = getSubLength(new TextDecoder().decode(file.content.buffer));
  const vttm3u8 = `#EXTM3U
#EXT-X-TARGETDURATION:${length}
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:${length},
${id}.vtt
#EXT-X-ENDLIST
  `;
  await upload(createFile(vttm3u8, "text/vtt"), `vtt/${id}.m3u8`);
  console.log("uploaded m3u8 file");
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/upload' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
