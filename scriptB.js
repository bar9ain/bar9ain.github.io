// ==UserScript==
// @name         Moveek to V-Cine
// @namespace    http://tampermonkey.net/
// @version      2024-09-19
// @description  try to take over the world!
// @author       You
// @match        https://moveek.com/lich-chieu/*
// @match        https://moveek.com/phim/*
// @match        https://www.imdb.com/title/*
// @match        https://subsource.net/*
// @match        https://www.kpkuang.org/*
// @match        https://en.yts-official.mx/movies/*
// @match        https://yts.mx/movies/*
// @match        https://api.ninsel.ws/embed/movie/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=moveek.com
// @grant        none
// @require      http://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

function formatDate(date) {
  const [d, m] = date.split("/");
  return [year, m, d].join("-");
}

async function initClient() {
  const { createClient } = supabase;
  window.client = createClient(
    "https://oxcdjkfjxwbwjooheeqn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2Rqa2ZqeHdid2pvb2hlZXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3MjU5MzAsImV4cCI6MjA0MjMwMTkzMH0.SRQlvn5BUh_NEzjMIBfETZ6GHWMQM7udm58fLQKrExc"
  );

  await client.auth.signInWithPassword({
    email: "bar9ain@gmail.com",
    password: "Vh:460175",
  });
}

if (location.hostname == "moveek.com") {
  $.getScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
  $.getScript("https://cdn.jsdelivr.net/jsrmvi/dist/jsrmvi.min.js");

  function inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  const englishName = document
    .querySelector(".mb-0.text-muted.text-truncate")
    .textContent.split("-");
  const genres = englishName
    .pop()
    .split(",")
    .map((x) => x.trim());
  const english = englishName.join("-").trim();
  const moveek_url = window.location.href.replace("lich-chieu", "phim");
  const movieTitle = document
    .querySelector(".mb-0.text-truncate a")
    .text.trim();

  requestAnimationFrame(checkForReady);

  function checkForReady() {
    if (window.supabase && window.jsrmvi) {
      initElements();
      return true;
    }

    requestAnimationFrame(checkForReady);
  }

  async function initElements() {
    initClient();

    window.data = (
      await client.from("cinema").select().eq("moveek_url", moveek_url)
    ).data[0];

    const btnRate = document.querySelector("[data-token]");
    btnRate.style.display = "none";

    const toolbar = btnRate.parentElement;
    toolbar.children[1].style.display = "none";
    toolbar.children[toolbar.children.length - 1].style.display = "none";

    const btnPhimmoi = document.createElement("a");
    toolbar.appendChild(btnPhimmoi);
    btnPhimmoi.outerHTML = `<a href="https://phimmoichill3.net/tim-kiem/${jsrmvi
      .removeVI(movieTitle, { concatBy: " " })
      .split(" ")
      .slice(0, 4)
      .join("+")}/" class="btn btn-outline-light btn-sm" target="_blank">
  <img src="https://phimmoichill3.net/dev/images/logo.png" height="12">
</a>`;

    const btnYeuphim = document.createElement("a");
    toolbar.appendChild(btnYeuphim);
    btnYeuphim.outerHTML = `<a href="https://yeuphim.cc/?search=${jsrmvi
      .removeVI(movieTitle, { concatBy: " " })
      .split(" ")
      .slice(0, 4)
      .join("+")}" class="btn btn-outline-light btn-sm ml-1" target="_blank">
  <img src="https://yeuphim.cc/logo.png" height="12">
</a>`;

    const btnAnime = document.createElement("a");
    toolbar.appendChild(btnAnime);
    btnAnime.outerHTML = `<a href="https://anime.com.co/search/${jsrmvi
      .removeVI(movieTitle, { concatBy: " " })
      .split(" ")
      .slice(0, 4)
      .join("+")}/" class="btn btn-outline-light btn-sm ml-1" target="_blank">
  <img src="https://anime.com.co/wp-content/uploads/2024/07/anime-logo.png" height="12">
</a>`;

    const btnTimkiem = document.createElement("a");
    toolbar.appendChild(btnTimkiem);
    btnTimkiem.outerHTML = `<a href="https://www.google.com/search?q=${encodeURIComponent(
      movieTitle
    )} vietsub" class="btn btn-outline-light btn-sm ml-1" target="_blank">
  <svg height="12" width="12" viewBox="0 0 24 24"><path fill="#4285f4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"></path><path fill="#34a853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"></path><path fill="#fbbc04" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"></path><path fill="#ea4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"></path></svg>
</a>`;

    const btnVietsub = document.createElement("a");
    toolbar.appendChild(btnVietsub);
    btnVietsub.outerHTML = `<a href="https://www.google.com/search?q=${encodeURIComponent(
      english
    )} vietsub" class="btn btn-outline-light btn-sm ml-1" target="_blank">
  <svg height="12" width="12" viewBox="0 0 24 24"><path fill="#4285f4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"></path><path fill="#34a853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"></path><path fill="#fbbc04" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"></path><path fill="#ea4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"></path></svg>
</a>`;

    const btnFshare = document.createElement("a");
    toolbar.appendChild(btnFshare);
    btnFshare.outerHTML = `<a href="https://www.google.com/search?q=${encodeURIComponent(
      english
    )} fshare" class="btn btn-outline-light btn-sm ml-1" target="_blank">
  <img src="https://www.fshare.vn/images/favicon.png" height="12" />
</a>`;

    const btnImdb = document.createElement("a");
    toolbar.appendChild(btnImdb);
    const href = data.imdb
      ? `https://www.imdb.com/title/${data.imdb}`
      : `https://www.google.com/search?q=${encodeURIComponent(english)} imdb`;
    btnImdb.outerHTML = `<a href="${href}" class="btn btn-outline-light btn-sm ml-1" target="_blank" id="imdb">
  <svg width="24" height="12" viewBox="0 0 64 32"><g fill="#F5C518"><rect x="0" y="0" width="100%" height="100%" rx="4"></rect></g><g transform="translate(8.000000, 7.000000)" fill="#000000" fill-rule="nonzero"><polygon points="0 18 5 18 5 0 0 0"></polygon><path d="M15.6725178,0 L14.5534833,8.40846934 L13.8582008,3.83502426 C13.65661,2.37009263 13.4632474,1.09175121 13.278113,0 L7,0 L7,18 L11.2416347,18 L11.2580911,6.11380679 L13.0436094,18 L16.0633571,18 L17.7583653,5.8517865 L17.7707076,18 L22,18 L22,0 L15.6725178,0 Z"></path><path d="M24,18 L24,0 L31.8045586,0 C33.5693522,0 35,1.41994415 35,3.17660424 L35,14.8233958 C35,16.5777858 33.5716617,18 31.8045586,18 L24,18 Z M29.8322479,3.2395236 C29.6339219,3.13233348 29.2545158,3.08072342 28.7026524,3.08072342 L28.7026524,14.8914865 C29.4312846,14.8914865 29.8796736,14.7604764 30.0478195,14.4865461 C30.2159654,14.2165858 30.3021941,13.486105 30.3021941,12.2871637 L30.3021941,5.3078959 C30.3021941,4.49404499 30.272014,3.97397442 30.2159654,3.74371416 C30.1599168,3.5134539 30.0348852,3.34671372 29.8322479,3.2395236 Z"></path><path d="M44.4299079,4.50685823 L44.749518,4.50685823 C46.5447098,4.50685823 48,5.91267586 48,7.64486762 L48,14.8619906 C48,16.5950653 46.5451816,18 44.749518,18 L44.4299079,18 C43.3314617,18 42.3602746,17.4736618 41.7718697,16.6682739 L41.4838962,17.7687785 L37,17.7687785 L37,0 L41.7843263,0 L41.7843263,5.78053556 C42.4024982,5.01015739 43.3551514,4.50685823 44.4299079,4.50685823 Z M43.4055679,13.2842155 L43.4055679,9.01907814 C43.4055679,8.31433946 43.3603268,7.85185468 43.2660746,7.63896485 C43.1718224,7.42607505 42.7955881,7.2893916 42.5316822,7.2893916 C42.267776,7.2893916 41.8607934,7.40047379 41.7816216,7.58767002 L41.7816216,9.01907814 L41.7816216,13.4207851 L41.7816216,14.8074788 C41.8721037,15.0130276 42.2602358,15.1274059 42.5316822,15.1274059 C42.8031285,15.1274059 43.1982131,15.0166981 43.281155,14.8074788 C43.3640968,14.5982595 43.4055679,14.0880581 43.4055679,13.2842155 Z"></path></g></svg>
</a>`;
    document.getElementById("imdb").oncontextmenu = async (e) => {
      e.preventDefault();
      const v = prompt("Enter IMDB ID:", data.imdb || "");
      if (v != data.imdb) {
        const rs = await client
          .from("cinema")
          .update({ imdb: v })
          .eq("moveek_url", moveek_url)
          .select();
        if (!rs.data.length) {
          alert("failed");
        } else {
          document.getElementById(
            "imdb"
          ).href = `https://www.imdb.com/title/${v}`;
          alert("updated");
        }
      }
    };
  }

  async function submitMovie() {
    if (!window.supabase && !window.jsrmvi) {
      alert("not loaded");
      return;
    }

    const movie = {
      title: movieTitle,
      genres: data.genres || genres,
      image: data.image || document.querySelector("img[srcset]").src,
      moveek_url,
    };

    if (!data.english) {
      movie.english = english;
      movie.romanized = [
        jsrmvi.removeVI(
          document.querySelector(".mb-0.text-truncate a").text.trim(),
          { concatBy: " " }
        ),
        jsrmvi.removeVI(english, { concatBy: " " }),
      ].join("-");
    }

    try {
      movie.release_date = formatDate(
        document
          .querySelector(".fe-calendar")
          .closest(".col")
          .children[2].textContent.trim()
      );
    } catch {}

    try {
      movie.content_rating = document
        .querySelector(".fe-user-check")
        .closest(".col")
        .children[2].textContent.trim();
    } catch {}

    const result = await client
      .from("cinema")
      .upsert(movie, { onConflict: "moveek_url" })
      .select()
      .single();

    if (result.error) {
      console.log(result.error.details);
      alert("failed");
    } else {
      alert("updated");
    }
  }

  $(window).bind("keydown.meta_s", function (event) {
    if (event.keyCode == 83) {
      event.preventDefault();
      submitMovie();
    }
  });
}

if (location.hostname == "www.imdb.com") {
  const id = document.querySelector('[property="imdb:pageConst"]')?.content;

  if (id) {
    const title = document.querySelector('[data-testid="hero__pageTitle"]');
    const button = document.createElement("a");
    title.appendChild(button);
    button.outerHTML = `<a class="ipc-chip" href="https://vidsrc.net/embed/movie/${id}/" target="_blank">
<img src="https://yts-official.mx/static/yts/image/logo-YTS.svg" height="12" />
</a>`;

    const kpkuang = document.createElement("a");
    title.appendChild(kpkuang);
    kpkuang.outerHTML = `<a class="ipc-chip" href="https://www.kpkuang.org?imdb=${id}" target="_blank">
<img src="https://www.kpkuang.org/upload/site/20190711-1/50134c0bcfeae96636fcef662b77a995.png" height="12" />
</a>`;

    const kino = document.createElement("a");
    title.appendChild(kino);
    kino.outerHTML = `<a class="ipc-chip" href="https://kinogo.biz/search/${encodeURIComponent(
      title.textContent.trim()
    )}" target="_blank">
<img src="https://kinogo.biz/templates/Kinogo/images/favicon.ico" height="12" />
</a>`;

    const subsource = document.createElement("a");
    title.appendChild(subsource);
    subsource.outerHTML = `<a class="ipc-chip" href="https://subsource.net?imdb=${id}" target="_blank">
<img src="https://subsource.net/static/media/logo_full.ae1eddc5ae51fc86c077.png" height="12" />
</a>`;
  }
}
if (location.hostname == "subsource.net") {
  analyze();
  async function analyze() {
    $.getScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    $.getScript("https://cdn.jsdelivr.net/jsrmvi/dist/jsrmvi.min.js");

    const id = window.location.search.replace("?imdb=", "");
    const result = await fetch("https://api.subsource.net/api/searchMovie", {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
      },
      body: `{\"query\":\"${id}\"}`,
      method: "POST",
    }).then((r) => r.json());
    if (result.found.length) {
      await initClient();
      const subs_link = `https://subsource.net/subtitles/${result.found[0].linkName}`;
      const { error } = await client
        .from("cinema")
        .update({ subs_link })
        .eq("imdb", id)
        .select();
      if (error) alert(error.details);
      location.href = subs_link;
    } else {
      alert("not found");
    }
  }
}

if (location.hostname == "www.kpkuang.org") {
  const id = window.location.search.replace("?imdb=", "");
  if (!id) return;

  $.ajax({
    url:
      "https://kpdata.ethersaga.online/esearch/index?kw=" +
      id +
      "&ts=" +
      new Date().getTime(),
    dataType: "jsonp",
    timeout: 8000,
    success: function (data) {
      if (data.code == 1) {
        const jsonstr = CryptoJS.enc.Utf8.stringify(
          CryptoJS.enc.Base64.parse(data.js)
        );
        const res = JSON.parse(jsonstr);
        if (res[0]) {
          location.href = "/voddetail/" + res[0].id;
        } else {
          alert("not found");
        }
      }
    },
  });
}

if (
  location.hostname == "en.yts-official.mx" ||
  location.hostname == "yts.mx"
) {
  $.getScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
  $.getScript("https://cdn.jsdelivr.net/jsrmvi/dist/jsrmvi.min.js");

  const imdb = document
    .querySelector('[href*="https://www.imdb.com/title/"]')
    .href.replace("https://www.imdb.com/title/", "")
    .replace("/", "");
  const links = Array.from(document.querySelectorAll('[href^="magnet:"]')).map(
    (x) => {
      const parent = x.closest(".modal-torrent");
      const resolution = parent
        .querySelector(".modal-quality")
        .textContent.trim();
      const quality = parent
        .querySelectorAll(".quality-size")[0]
        .textContent.trim();
      const size =
        "(" +
        parent
          .querySelectorAll(".quality-size")[1]
          .textContent.trim()
          .replace(" ", "") +
        ")";
      return { url: x.href, label: [resolution, quality, size].join(" ") };
    }
  );

  async function update() {
    await initClient();
    const result = await client.from("cinema").select("id").eq("imdb", imdb);
    if (result.error) return alert(result.error.details);
    if (!result.data[0].id) return alert("Movie not found");

    const movie_id = result.data[0].id;
    let count = 0;
    for await (const url of links) {
      const r = await client
        .from("links")
        .insert({ ...url, movie_id })
        .select();
      if (r.data) count++;
    }

    alert("Updated " + count + " links");
  }

  $(window).bind("keydown.meta_s", function (event) {
    if (event.keyCode == 83) {
      event.preventDefault();
      update();
    }
  });
}

if (location.hostname == "api.ninsel.ws") {
  let lines = document
    .querySelector('[data-name="mk"]')
    .text.split("\n")
    .slice(2);
  lines = lines.slice(0, lines.length - 4);
  lines.unshift("result = {");
  lines.push("}");
  eval(lines.join("\n").replace(/\s/g, " "));
  console.clear();
  console.log(result.source.dash);
  for (const url of result.source.cc) {
    console.log(url.url);
  }
}
