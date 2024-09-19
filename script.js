// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2024-08-01
// @description  try to take over the world!
// @author       You
// @match        https://moveek.com/phim-thang-*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=moveek.com
// @grant        none
// ==/UserScript==

$.getScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
$.getScript("https://unpkg.com/jsrmvi/dist/jsrmvi.min.js");

setTimeout(() => {

    const { createClient } = supabase;
    window.client = createClient(
        "https://oxcdjkfjxwbwjooheeqn.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y2Rqa2ZqeHdid2pvb2hlZXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3MjU5MzAsImV4cCI6MjA0MjMwMTkzMH0.SRQlvn5BUh_NEzjMIBfETZ6GHWMQM7udm58fLQKrExc"
    );

    const year = document.querySelector(".main-content .mb-3.text-white").innerText.split("/").pop().trim()

    function formatDate(date) {
        const [d, m] = date.split("/");
        return [year, m, d].join("-");
    }

    window.titles = Array.from(document.querySelectorAll(".row.grid .card")).map(x=>({
        title: x.querySelector("a[href*='/lich-chieu/'], a[href*='/phim/']")?.title,
        release_date: formatDate(x.querySelector(".text-muted").innerText.trim()),
        image: x.querySelector("img").src,
        moveek_url: x.querySelector("a[href*='/lich-chieu/'], a[href*='/phim/']").href.replace("lich-chieu", "phim"),
        romanized: jsrmvi.removeVI(x.querySelector("a[href*='/lich-chieu/'], a[href*='/phim/']")?.title, {concatBy: ' '})
    }));

    window.insertMovies = async function() {
        for (const title of titles) {
            const result = await client.from("cinema").insert(title);
            console.log(result);
        }
    }
}, 2000);