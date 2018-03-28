var loading = $(
  '<ion-loading>\
        <ion-icon class="icon-loading"></ion-icon>\
    </ion-loading>'
);

var element = $(
  '<ion-item-sliding class="item-wrapper">\
    <a class="item item-block item-ios">\
        <ion-thumbnail item-start>\
            <img src="">\
        </ion-thumbnail>\
        <ion-icon class="icon" item-start></ion-icon>\
        <div class="item-inner">\
            <div class="input-wrapper">\
                <ion-label class="label label-md">\
                    <h2>\
                        <i class="icon ion-loading-a"></i>\
                    </h2>\
                    <p class="english"></p>\
                    <p class="description"></p>\
                </ion-label>\
            </div>\
        </div>\
    </a>\
</ion-item-sliding>'
);

function getServerName(url) {
  server = url.split("/")[2];
  s1 = server.split(".");
  server = s1[s1.length - 2];
  return server;
}

function getServerVideos(url) {
  var list = [];
  $.getJSON("http://cors-proxy.htmldriven.com/?url=" + url, function(result) {
    var sourceLinks = $.parseJSON(result.body).sourceLinks;
    getVideos(sourceLinks);
  });
  if ($.inArray(uri, list) != -1) return;
  list.push(uri);
  console.log(list);
}

function getVideos(sourceLinks) {
  sourceLinks.forEach(link => {
    var pass = "bilutv.com4590481877" + movieId;
    var uri = GibberishAES.dec(link.links[0].file, pass);
    if ($(".item[href$='" + uri + "']").length > 0) return;
    var server = getServerName(uri);
    if (server == "bilutv") return;
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

function getEpisodes(episodeList) {
  for (i = 0; i < episodeList.length; i++) {
    episode = episodeList.eq(i);
    var item = element.clone();
    item.find("ion-thumbnail").remove();
    item.find("ion-icon").remove();
    item.find("h2").text(episode.text());
    item.find("a").prop(
      "href",
      "episode.html?url=" +
        episode
          .prop("href")
          .substring(episode.prop("href").lastIndexOf("/") + 1)
          .replace(".html", "")
    );
    $("ion-list").append(item);
  }
}

function getTitle(context) {
  if (context.indexOf("/title") > 0) {
    title = $(context)
      .text()
      .replace("Xem Phim ", "")
      .split("Tập")[0]
      .split("VietSub")[0]
      .split("Thuyết minh")[0];
    document.title = title;
    $("#titleBar").text(title);
    return;
  }
}

function contains(word, char) {
  return word.indexOf(char) > 0;
}

function change_alias(alias) {
  var str = alias;
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(
    /!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g,
    " "
  );
  str = str.replace(/ + /g, " ");
  str = str.trim();
  str = str.replace(/ /g, "-");
  return str;
}

function getMovies(items) {
  $.each(items, function(index, film) {
    var name = $(film)
      .find(".name")
      .text();
    var realname = $(film)
      .find(".real-name")
      .text();
    var status = $(film)
      .find(".current-status")
      .text();
    var image = $(film)
      .find("img")
      .data("original");
    var url = $(film)
      .find("a")
      .prop("href")
      .replace("file:///phim/", "")
      .replace(".html", "");
    var id = url.substring(url.lastIndexOf("-") + 1);
    var path = change_alias(name + "-" + realname + "-" + id);
    item = element.clone();
    item.find("ion-icon").remove();
    item.find("img").prop("src", image);
    item.find("h2").text(name);
    item.find(".english").text(realname);
    item.find(".description").text(status);
    item
      .find("a")
      .prop("href", "movie.html?url=" + path);
    $("ion-list").append(item);
  });
}
