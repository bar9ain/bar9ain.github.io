import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

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
