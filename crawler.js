const supabaseJs = require("@supabase/supabase-js");
const cheerio = require("cheerio");
const fs = require("node:fs");
const _ = require("lodash");

const supabase = supabaseJs.createClient(
  process.env.DB_URL,
  process.env.DB_KEY
);

execute();

async function execute() {
  await login();
  const movies = await getMovies();
  console.log(
    "IMDB not set:\n" +
      movies
        .filter((x) => !x.imdb)
        .map((x) => `- ${x.title}`)
        .join("\n")
  );

  const params = process.argv.splice(3);
  const imdbMovies = movies.filter((x) => x.imdb);
  if (params.includes("imdb")) fetchImdb(imdbMovies);
  if (params.includes("sub")) fetchSub(imdbMovies);
  if (params.includes("check")) checkMovies(imdbMovies);
  if (params.includes("search")) findImdb(movies);
  if (params.includes("torrent")) searchTorrents(imdbMovies);
  if (params.includes("fshare")) searchFshare(movies);
}

function login() {
  return supabase.auth.signInWithPassword({
    email: process.env.DB_USER,
    password: process.env.DB_PASS,
  });
}

async function getMovies() {
  const date = new Date(process.argv[2]);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .substr(0, 10);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    .toISOString()
    .substr(0, 10);

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

async function checkMovies(movies) {
  for await (const [i, movie] of movies.entries()) {
    if (movie.video_url || movie.links.length) continue;
    const result = await fetch(
      `https://vidsrc.net/embed/movie/${movie.imdb}/`
    ).then((r) => r.text());
    if (result.includes("the_frame")) {
      console.log(" Found: " + movie.title);
      console.log(`https://vidsrc.net/embed/movie/${movie.imdb}/`);
    }
    printProgress("Checking:", i + 1, movies.length);
  }
}

async function fetchImdb(movies) {
  const ids = JSON.stringify(movies.map((x) => x.imdb)).replaceAll('"', '\\"');
  const r = await fetch("https://graph.imdbapi.dev/v1", {
    headers: {
      accept: "application/json, multipart/mixed",
      "content-type": "application/json",
    },
    body: `{"query":"query exampleMultiTitleIDsx {\\n  titles(ids: ${ids}) {\\n    id\\n    primary_title\\n    start_year\\n    rating {\\n      aggregate_rating\\n    }\\n    genres\\n    origin_countries {\\n      code\\n      name\\n    }\\n  }\\n}"}`,
    method: "POST",
  }).then((r) => r.json());

  for await (const [i, m] of r.data.titles.entries()) {
    const { error } = await supabase
      .from("cinema")
      .update({
        english: m.primary_title,
        year: m.start_year,
        rate: m.rating?.aggregate_rating,
        genres: m.genres,
        countries: m.origin_countries,
      })
      .eq("imdb", m.id)
      .select();

    if (error) console.log(error.message || "", error.details);

    printProgress("Fetch IMDB...", i + 1, r.data.titles.length);
  }
}

async function fetchSub(movies) {
  for await (const [i, movie] of movies.entries()) {
    if (movie.subs_link) continue;

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
      await supabase
        .from("cinema")
        .update({ subs_link })
        .eq("imdb", movie.imdb)
        .select();
    }

    printProgress("Searching for subtitles...", i + 1, movies.length);
  }
}

async function findImdb(movies) {
  const list = movies.filter((x) => !x.imdb);
  const output = [];
  for await (const [i, movie] of list.entries()) {
    printProgress("Finding IMDB...", i + 1, list.length);
    const title = movie.english
      ? [movie.english, movie.year].join(" ")
      : movie.title;
    const rr = await googleSearch(
      `${title} imdb`,
      `a[href^='/url?q=https://www.imdb.com/title/']`
    );
    const r = rr
      .map((titleNode) => {
        const text = titleNode.text();
        const path = new URL(
          titleNode.attr("href").replace("/url?q=", "").replace("&", "?")
        ).pathname;
        const url = `https://www.imdb.com/title${path}`;
        const imdb = path.split("/")[2];

        if (
          text.includes("› title") &&
          !text.includes("TV Series") &&
          !text.includes("TV Episode")
        )
          return { imdb, text, url };
      })
      .filter((x) => x);
    output.push({ id: movie.id, title: movie.title, imdb: r });
  }

  fs.writeFile("./fetch.json", JSON.stringify(output), (err) => {
    if (err) console.error(err);
  });
}

async function searchFshare(movies) {
  const list = movies.filter((x) => x.video_url || x.links.length);
  const output = [];
  for await (const [i, movie] of list.entries()) {
    printProgress("Search for Fshare links...", i + 1, list.length);
    if (movie.links.filter((x) => x.url.includes("fshare.vn")).length) continue;

    const record = await scanTvCine(movie);
    if (record) output.push(record);
    else output.push(await scanFshareGG(movie));
  }

  fs.writeFile("./fetch.json", JSON.stringify(output), (err) => {
    if (err) console.error(err);
  });
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
  const links = [];
  for (const e of $('[rel="bookmark"]')) {
    const found = $(e).attr("title");
    const downloadUrl = [
      "https://thuviencine.com/download/?id=",
      $(e).closest(".type-post").attr("id").split("-").pop(),
    ].join("");

    const $$ = await inspect(downloadUrl);
    const url = $$("#hover").first().attr("href");
    links.push({ found, url, label: 'Fshare Folder' });
  }

  if (links.length) return { id: movie.id, title: movie.title, links };
}

async function inspect(url) {
  const response = await fetch(url).then((r) => r.text());
  return cheerio.load(response);
}

async function googleSearch(text, pattern) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);

  const result = [];

  $(pattern).each((i, title) => {
    const titleNode = $(title);
    result.push(titleNode);
  });

  return result;
}

async function searchTorrents(movies) {
  for await (const [i, movie] of movies.entries()) {
    printProgress("Searching for torrents...", i + 1, movies.length);

    if (movie.links.filter((x) => x.url.startsWith("magnet:")).length) continue;

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

      if (torrents.length >= 7) {
        torrents = _.orderBy(
          torrents,
          ["seeders", "leechers"],
          ["desc", "desc"]
        ).slice(0, 7);
      }
    }

    torrents = torrents.map((x) => ({
      movie_id: movie.id,
      label: [x.name, formatFileSize(x.size, 2)].join(" | "),
      url: `magnet:?xt=urn:btih:${x.info_hash}&dn=${encodeURIComponent(
        x.name
      )}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.bittor.pw%3A1337%2Fannounce&tr=udp%3A%2F%2Fpublic.popcorn-tracker.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce`,
    }));

    if (!torrents.length) continue;

    const { error } = await supabase.from("links").insert(torrents);
    if (error) console.log(error.message || "", error.details);
  }
}

function formatFileSize(bytes, decimalPoint) {
  if (bytes == 0) return "0 Bytes";
  var k = 1000,
    dm = decimalPoint || 2,
    sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

function printProgress(prefix, value, max) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`${prefix} ${value}/${max}`);
}
