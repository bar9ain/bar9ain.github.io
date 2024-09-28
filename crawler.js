const supabaseJs = require("@supabase/supabase-js");

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
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    .toISOString()
    .substr(0, 10);

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

async function checkMovies(movies) {
  //
  const list = movies
    .filter((x) => !x.video_url && !x.links.length)
    .map((x) => x.imdb);

  console.log("Checking new movies...");

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
    await supabase
      .from("cinema")
      .update({
        english: m.primary_title,
        year: m.start_year,
        rate: m.rating?.aggregate_rating || "N/A",
        genres: m.genres,
        countries: m.origin_countries,
      })
      .eq("imdb", m.id)
      .select();

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

function printProgress(prefix, value, max) {
  const progress = parseInt((value / max) * 100);
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`${prefix} ${progress}%`);
}
