// ==UserScript==
// @name         Moveek to V-Cine
// @namespace    http://tampermonkey.net/
// @version      2024-09-19
// @description  try to take over the world!
// @author       You
// @match        https://moveek.com/lich-chieu/*
// @match        https://moveek.com/phim/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=moveek.com
// @grant        none
// ==/UserScript==

$.getScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
$.getScript("https://unpkg.com/jsrmvi/dist/jsrmvi.min.js");

function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

window.submitMovie = async function () {
  if (!window.supabase && !window.jsrmvi) {
    alert("not loaded");
    return;
  }

  const { createClient } = supabase;
  window.client = createClient(
    "https://oxcdjkfjxwbwjooheeqn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2Rqa2ZqeHdid2pvb2hlZXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3MjU5MzAsImV4cCI6MjA0MjMwMTkzMH0.SRQlvn5BUh_NEzjMIBfETZ6GHWMQM7udm58fLQKrExc"
  );

  const englishName = document
    .querySelector(".mb-0.text-muted.text-truncate")
    .textContent.split("-");
  const genres = englishName
    .pop()
    .split(",")
    .map((x) => x.trim());
  const english = englishName.join("-").trim();
  const moveek_url = window.location.href.replace("lich-chieu", "phim");

  const movie = {
    title: document.querySelector(".mb-0.text-truncate a").text.trim(),
    english,
    genres,
    image: document.querySelector("img[srcset]").src,
    moveek_url,
    romanized: [
      jsrmvi.removeVI(
        document.querySelector(".mb-0.text-truncate a").text.trim(),
        { concatBy: " " }
      ),
      jsrmvi.removeVI(english, { concatBy: " " }),
    ].join("-"),
  };

  let result = await client.from("cinema").insert(movie);
  if (result.error) {
    console.log(result.error.details);
    result = await client
      .from("cinema")
      .update(movie)
      .eq("moveek_url", moveek_url)
      .select();
    if (!result.data.length) {
      alert("failed");
    } else {
      alert("updated");
    }
  } else {
    alert("inserted");
  }
};

$(window).bind("keydown.meta_s", function (event) {
  if (event.keyCode == 83) {
    event.preventDefault();
    submitMovie();
  }
});
