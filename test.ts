const cheerio = require("cheerio");

execute("companion_2025");

async function inspect(url) {
  const response = await fetch(url);
  const body = await response.text();
  return cheerio.load(body);
}

async function execute(slug) {
  const url = `https://www.rottentomatoes.com/m/${slug}`;
  const $ = await inspect(url);
  const json = JSON.parse(
    $('script[type="application/ld+json"]').first().html()
  );

  const response = {
    contentRating: json.contentRating,
    releaseDate: json.dateCreated,
    cast: json.actor.map((act) => ({
      id: act.sameAs.split("/").pop(),
      name: act.name,
      image: act.image,
    })),
    genre: json.genre,
    year: json.dateCreated.split("-").shift(),
  };

  const scorecard = JSON.parse($("#media-scorecard-json").first().html());

  response.audienceScore = scorecard.audienceScore.score;
  response.audienceVerified = scorecard.audienceScore.certified;
  response.criticsScore = scorecard.criticsScore.score;
  response.criticsVerified = scorecard.criticsScore.certified;
  response.synopsis = scorecard.description;
  response.cta = scorecard.cta;

  const mediaHero = JSON.parse($("#media-hero-json").first().html());
  response.title = mediaHero.content.title;

  return response;
}
