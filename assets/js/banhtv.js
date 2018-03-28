var BanhTV = (function () {
  urlTimKiem =
    "http://cors-proxy.htmldriven.com/?url=http://banhtv.com/tim-kiem.html?q=";
  classTimKiem = ".item";
  domain = "http://banhtv.com/xem-phim/";
  page = "banhtv";

  getMovies = function (items) {
    $.each(items, function (index, film) {
      var name = $(film)
        .find("p")
        .text();
      var status = $(film)
        .find(".label")
        .text();
      var image = $(film)
        .find("img")
        .prop("src");
      var url = $(film)
        .find("a")
        .prop("href")
        .split("/phim/")[1];
      item = element.clone();
      item.find("ion-icon").remove();
      item.find("img").prop("src", image);
      item.find("h2").text(name);
      item.find(".description").text(status);
      item.find("a").prop("href", "movie.html?url=" + url);
      $("ion-list").append(item);
    });
  };

  function getVideos(sourceLinks) {
    $.each(sourceLinks, function (index, link) {
      var pass = "banhtv.com4590481877" + movieId;
      var uri = GibberishAES.dec(link.links[0].file, pass);
      if ($(".item[href$='" + uri + "']").length > 0) return;
      var server = getServerName(uri);
      if (server == page) return;
      var icon = "icon-" + server;
      item = element.clone();
      item.find("ion-thumbnail").remove();
      item.find("a").prop("href", uri);
      item.find("h2").text(link.links[0].label);
      item.find(".description").text(server);
      item.find("ion-icon").addClass(icon);
      $("ion-list").append(item);
    });
  }

  return {
    urlTimKiem: urlTimKiem,
    classTimKiem: classTimKiem,
    domain: domain,
    page: page,
    getMovies: getMovies,
    getVideos: getVideos
  };
})();
