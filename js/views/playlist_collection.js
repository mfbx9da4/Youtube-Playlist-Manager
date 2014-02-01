define([

    "jquery",
    "underscore",
    "backbone",
    "utils",

    "collections/playlists",
    "plugins/text!templates/playlist_collection.tpl",

], function($, _, Backbone, Utils, PlaylistCollection, PlaylistCollectionTemplate) {

    var PlaylistCollectionView = Backbone.View.extend({

        el: "#content",

        events: {
            "click .action_export_playlists": "action_export_playlists",
            "click .action_find_duplicates": "action_find_duplicates",
            "click .action_find_deleted_videos": "action_find_deleted_videos",
            "click .action_replace_deleted_videos": "action_replace_deleted_videos"
        },

        initialize: function() {
            this.collection = new PlaylistCollection();
        },

        render: function() {
            var html = _.template(PlaylistCollectionTemplate, this);
            this.$el.html(html);
        },

        get_selection: function() {
            var playlists = [],
                playlist

                $(".listView input:checked").each(function(i, input) {
                    playlist = {
                        id: $(input).attr("name"),
                        name: $(input).siblings(".info").find(".title").html(),
                        itemCount: parseInt($(input).siblings(".info").find(".itemCount").html(), 10),
                        items: []
                    };

                    playlists.push(playlist);
                });

            return playlists;
        },

        action_export_playlists: function(e) {

            var self = this,
                playlists = self.get_selection(),
                count = 0,
                interval, $dialog;

            if (!playlists.length) {
                alert("Please select one or more playlists first.");
                return;
            }

            var request = function(playlist, pageToken) {
                var config = {
                    playlistId: playlist.id,
                    part: "snippet",
                    fields: "nextPageToken,items(snippet(title,resourceId/videoId))",
                    maxResults: 50,
                    async: true
                };

                if (typeof pageToken == "string") {
                    config.pageToken = pageToken;
                }
                Utils.request("GET", "playlistItems", config, function(data) {
                    success(data, playlist);
                });
            },

                success = function(data, playlist) {
                    if (typeof data != "object") {
                        data = JSON.parse(data);
                    }

                    [].push.apply(playlist.items, data.items);

                    if (typeof data.nextPageToken == "string") {
                        request(playlist, data.nextPageToken);
                    } else {
                        count++;
                    }
                },

                update = function() {
                    var html = "<table><tr><th>Playlist</th><th>Progress</th></tr>",
                        playlist, name,
                        itemCount, i;

                    _.map(playlists, function(playlist) {
                        name = playlist.name;
                        current = playlist.items.length;
                        total = playlist.itemCount;
                        html += "<tr><td>" + name + "</td><td>" + current + "/" + total + " Videos</td></tr>";
                    });

                    html += "</table><hr>";

                    if (count != playlists.length) {
                        html += "<b>please wait ...</b>";
                    }

                    $dialog.find("div").html(html);
                },

                process = function() {
                    update();
                    var text = [],
                        ln = "\r\n",
                        $download, $tab;

                    _.map(playlists, function(playlist) {
                        _.map(playlist.items, function(item) {
                            var title = item.snippet.title;
                            var videoId = "https://youtube.com/watch?v=" + item.snippet.resourceId.videoId;

                            text.push(title + ln + videoId);
                        });
                    });

                    text = encodeURIComponent(text.join(ln + ln));
                    update();

                    $download = $("<a href=\"javascript:void();\">Download</a>");
                    $download.on("click", function(e) {
                        window.open("data:binary/stream;charset=UTF-8;," + text, "_blank");
                    });

                    $tab = $("<a href=\"javascript:void();\">Open window</a>");
                    $tab.on("click", function(e) {
                        window.open("data:text/plain;charset=UTF-8;," + text, "_blank");
                    });

                    $dialog.find("div").append($download, " or ", $tab);
                };

            $dialog = Utils.dialog("Exporting playlists", "...");
            _.map(playlists, function(playlist) {
                request(playlist);
            });

            interval = window.setInterval(function() {
                if (count == playlists.length) {
                    process();
                    window.clearInterval(interval);
                } else {
                    update();
                }
            }, 100);
        },

        action_find_duplicates: function(e) {

            var self = this,
                playlists = self.get_selection(),
                count = 0,
                interval, $dialog;

            if (!playlists.length) {
                alert("Please select one or more playlists first.");
                return;
            }

            var request = function(playlist, pageToken) {
                var config = {
                    playlistId: playlist.id,
                    part: "snippet",
                    fields: "nextPageToken,items(id,snippet(title,resourceId/videoId))",
                    maxResults: 50,
                    async: true
                };

                if (typeof pageToken == "string") {
                    config.pageToken = pageToken;
                }
                Utils.request("GET", "playlistItems", config, function(data) {
                    success(data, playlist);
                });
            },

                success = function(data, playlist) {
                    if (typeof data != "object") {
                        data = JSON.parse(data);
                    }

                    [].push.apply(playlist.items, data.items);

                    if (typeof data.nextPageToken == "string") {
                        request(playlist, data.nextPageToken);
                    } else {
                        count++;
                    }
                },

                update = function() {
                    var titles, id, video, content = [],
                        html = "";

                    _.map(playlists, function(playlist) {

                        html = "Playlist: <b>" + playlist.name + "</b><br><table><tr><th>#</th><th>Name</th><th>video id</th></tr>";

                        titles = {};
                        playlist.duplicates = {};

                        _.map(playlist.items, function(item) {
                            if (!titles[item.snippet.title]) {
                                titles[item.snippet.title] = true;
                            } else {
                                if (!playlist.duplicates[item.snippet.resourceId.videoId]) {
                                    playlist.duplicates[item.snippet.resourceId.videoId] = {
                                        title: item.snippet.title,
                                        ids: [item.id],
                                    };
                                } else {
                                    playlist.duplicates[item.snippet.resourceId.videoId].ids.push(item.id);
                                }
                            }
                        });

                        for (id in playlist.duplicates) {
                            video = playlist.duplicates[id];
                            html += "<tr><td>" + video.ids.length;
                            html += "</td><td>" + video.title;
                            html += "</td><td><a href='https://youtube.com/watch?v=" + id + "' target='_blank'>" + id + "</a></td></tr>";
                        }

                        html += "</table>";

                        if (!Object.keys(playlist.duplicates).length) {
                            html = "Playlist: <b>" + playlist.name + "</b> (no duplicates found)";
                        }

                        content.push(html);
                    });

                    content = content.join("<hr>");
                    $dialog.find("div").html(content);
                },

                process = function() {

                    update();

                    var duplicates = 0,
                        i;
                    _.map(playlists, function(playlist) {
                        duplicates += !! playlist.duplicates;
                    });

                    if (duplicates) {
                        $a = $("<hr><a href=\"javascript:void();\">Remove from playlist(s)</a>");

                        $a.on("click", function(e) {
                            $dialog.find("div").html("<img src='img/loading.gif'>");

                            window.setTimeout(function() {
                                _.map(playlists, function(playlist) {
                                    var playlists_cache = JSON.parse(localStorage["playlists"]),
                                        playlist_cache = JSON.parse(localStorage["playlist_" + playlist.id]),
                                        count = 0;

                                    for (i in playlist.duplicates) {
                                        _.map(playlist.duplicates[i].ids, function(id) {
                                            Utils.request("DELETE", "playlistItems", {
                                                id: id
                                            });
                                            delete playlist_cache[id];
                                            count++;
                                        });
                                    }

                                    for (i in playlists_cache) {
                                        if (playlists_cache[i].id == playlist.id) {
                                            playlists_cache[i].contentDetails.itemCount -= count;
                                        }
                                    }

                                    localStorage["playlists"] = JSON.stringify(playlists_cache);
                                    localStorage["playlist_" + playlist.id] = JSON.stringify(playlist_cache);
                                    location.reload();
                                });

                                $dialog.find("div").html("<b>Duplicates removed!</b>");
                            }, 100);
                        });

                        $dialog.find("div").append($a);
                    } else {
                        $dialog.find("div").html("No dupliactes found!");
                    }
                };

            $dialog = Utils.dialog("Searching for duplicates", "<b>retrieving videos ...</b>");
            _.map(playlists, function(playlist) {
                request(playlist);
            });

            interval = window.setInterval(function() {
                if (count == playlists.length) {
                    process();
                    window.clearInterval(interval);
                }
            }, 100);
        },

        action_find_deleted_videos: function(e) {

            var self = this,
                playlists = self.get_selection(),
                count = 0,
                interval, $dialog;

            if (!playlists.length) {
                alert("Please select one or more playlists first.");
                return;
            }

            var request = function(playlist, pageToken) {
                var config = {
                    playlistId: playlist.id,
                    part: "snippet",
                    fields: "nextPageToken,items(id,snippet(title,resourceId/videoId))",
                    maxResults: 50,
                    async: true
                };

                if (typeof pageToken == "string") {
                    config.pageToken = pageToken;
                }
                Utils.request("GET", "playlistItems", config, function(data) {
                    success(data, playlist);
                });
            },

                success = function(data, playlist) {
                    if (typeof data != "object") {
                        data = JSON.parse(data);
                    }

                    [].push.apply(playlist.items, data.items);

                    if (typeof data.nextPageToken == "string") {
                        request(playlist, data.nextPageToken);
                    } else {
                        count++;
                    }
                },

                process = function() {

                    var videoIds = [],
                        _videoIds = [],

                        invalidIds = [],
                        responseIds = [],

                        videoItemIds = {},
                        titles = {},
                        videoId;

                    _.map(playlists, function(playlist) {
                        _.map(playlist.items, function(item) {
                            videoId = item.snippet.resourceId.videoId;

                            videoIds.push({
                                playlist: playlist.name,
                                videoId: videoId
                            });
                            _videoIds.push(videoId);

                            videoItemIds[videoId] = item.id;
                            titles[videoId] = item.snippet.title;
                        });
                    });

                    while (_videoIds.length) {
                        Utils.request("GET", "videos", {

                            id: _videoIds.splice(0, 50),
                            part: "id"

                        }, function(data) {
                            if (typeof data != "object") {
                                data = JSON.parse(data);
                            }
                            _.map(data.items, function(item) {
                                responseIds.push(item.id);
                            });
                        });
                    }

                    var html = "<b>The following videos have been banned or removed:</b><hr><table><tr><th>Playlist</th><th>Name</th><th>video id</th></tr>";

                    _.map(videoIds, function(video) {
                        if (responseIds.indexOf(video.videoId) == -1) {
                            invalidIds.push(videoItemIds[video.videoId]);
                            html += "<tr><td>" + video.playlist + "</td>";
                            html += "<td>" + titles[video.videoId] + "</td>"
                            html += "<td><a href='https://youtube.com/watch?v=" + video.videoId + "' target='_blank'>" + video.videoId + "</a></td></tr>";
                        }
                    });

                    html += "</table><hr>";

                    if (invalidIds.length) {

                        $a = $("<a href=\"javascript:void();\">Remove from playlist(s)</a>");
                        $a.on("click", function(e) {
                            while (invalidIds.length) {
                                Utils.request("DELETE", "playlistItems", {
                                    id: invalidIds.pop()
                                });
                            }
                            //delete localStorage.playlists;
                            //location.reload();

                            $dialog.find("div").html("Deleted videos removed!");
                        });

                        $dialog.find("div").html(html);
                        $dialog.find("div").append($a);

                    } else {
                        $dialog.find("div").html("No deleted videos found!");
                    }
                };

            $dialog = Utils.dialog("Searching for deleted videos", "<b>retrieving videos ...</b>");
            _.map(playlists, function(playlist) {
                request(playlist);
            });

            interval = window.setInterval(function() {
                if (count == playlists.length) {
                    $dialog.find("div").html("<b>scanning videos ...</b>")
                    process();
                    window.clearInterval(interval);
                }
            }, 100);
        },

        action_replace_deleted_videos: function(e) {

            var self = this,
                playlists = self.get_selection(),
                count = 0,
                interval, $dialog;

            if (!playlists.length) {
                alert("Please select one or more playlists first.");
                return;
            }

            var request = function(playlist, pageToken) {
                var config = {
                    playlistId: playlist.id,
                    part: "snippet",
                    fields: "nextPageToken,items(id,snippet(title,resourceId/videoId))",
                    maxResults: 50,
                    async: true
                };

                if (typeof pageToken == "string") {
                    config.pageToken = pageToken;
                }
                Utils.request("GET", "playlistItems", config, function(data) {
                    success(data, playlist);
                });
            },

                success = function(data, playlist) {
                    if (typeof data != "object") {
                        data = JSON.parse(data);
                    }

                    [].push.apply(playlist.items, data.items);

                    if (typeof data.nextPageToken == "string") {
                        request(playlist, data.nextPageToken);
                    } else {
                        count++;
                    }
                },

                process = function() {

                    var videoIds = [],
                        _videoIds = [],

                        invalidIds = [],
                        responseIds = [],

                        videoItemIds = {},
                        titles = {},
                        suggestedVideos = [],
                        videoId;

                    // get all video ids and titles
                    _.map(playlists, function(playlist) {
                        _.map(playlist.items, function(item) {
                            videoId = item.snippet.resourceId.videoId;

                            videoIds.push({
                                playlist: playlist.name,
                                playlistId: playlist.id,
                                videoId: videoId,
                                id: item.id
                            });
                            _videoIds.push(videoId);

                            videoItemIds[videoId] = item.id;
                            titles[videoId] = item.snippet.title;
                        });
                    });

                    // get response ids
                    while (_videoIds.length) {
                        Utils.request("GET", "videos", {

                            id: _videoIds.splice(0, 50),
                            part: "id"

                        }, function(data) {
                            if (typeof data != "object") {
                                data = JSON.parse(data);
                            }
                            _.map(data.items, function(item) {
                                responseIds.push(item.id);
                            });
                        });
                    }

                    var suggestVideos = function(title) {
                        var stripTitle = function(title) {
                            if (title == "Private video") {
                                return null;
                            }
                            return title.replace(/\[.*\]/g, '').replace(/\(.*\)/g, '');
                        }
                        title = stripTitle(title);
                        var videos = [];
                        if (!title) {
                            return false;
                        } else {
                            var response;
                            Utils.request("GET", "search", {
                                q: title,
                                part: 'snippet',
                                type: 'video'
                            }, function(data) {
                                var items = data.items;
                                for (var i = 0; i < items.length; i++) {
                                    var video = {};
                                    video.videoId = items[i].id.videoId;
                                    video.title = function () {
                                        if (items[i].snippet) {
                                            return items[i].snippet.title;
                                        } else {
                                            return 'No title';
                                        }
                                    if (video.videoId) {
                                        Utils.request('GET', 'videos', {
                                                id: video.videoId,
                                                part: 'contentDetails'
                                            },
                                            function(data2) {
                                                var duration = data2.items[0].contentDetails.duration;
                                                duration = duration.replace('PT', '').replace('M', ':').replace('S', '');
                                                video.duration = duration;
                                            }
                                        )
                                    } else {
                                        video.duration = ' ';
                                    }
                                    videos.push(video)
                                }
                            });
                        }
                        return videos;
                    };

                    var html = "<b>The following videos have been banned or removed:</b><hr><table> \
                    <tr> \
                        <th></th> \
                        <th>Playlist</th> \
                        <th>Name</th> \
                        <th>Replacement</th> \
                    </tr>";

                    // if videoId not found in response ids search for equivalent
                    // video and suggest replacement
                    _.map(videoIds, function(video) {
                        if (responseIds.indexOf(video.videoId) == -1) {
                            var videos = suggestVideos(titles[video.videoId])
                            if (videos) {
                                invalidIds.push(videoItemIds[video.videoId]);
                                html += "<tr>";
                                html += '<td><input checked class="deleted-checkbox" type="checkbox" name="' + video.videoId + '"></td>';
                                html += "<td>" + video.playlist + "</td>";
                                html += "<td><a href='https://youtube.com/watch?v=" + video.videoId + "' target='_blank'>" + titles[video.videoId] + "</a></td>";
                                html += "<td><form><ul>";
                                for (var i = 0; i < videos.length; i++) {
                                    var checked = i == 0 ? "checked" : ""
                                    html += "<li>"
                                    html += "<input class='suggested-radio' type='radio' " + checked + " name='group" + video.videoId + "'id='" + videos[i].videoId + "'> "
                                    html += "<a href='https://youtube.com/watch?v=" + videos[i].videoId + "' target='_blank'>" + videos[i].title + "</a>";
                                    html += "&nbsp;" + videos[i].duration;
                                    html += "</li>";
                                }
                                html += "</ul></form></td>"
                                html += "</tr>";
                                suggestedVideos.push.apply(suggestedVideos, videos);
                            } else {
                                var titles_not_found = true;
                            }
                            $dialog.find("div").html(html);
                        }
                        if (titles_not_found){
                            html += 'Some deleted videos found but their titles have not been found, so I could not find a replacement. Soz';
                        }
                    });

                    html += "</table><hr>";

                    // on click replace go through suggested videos and reinsert at old video's
                    // place
                    if (invalidIds.length) {

                        $a = $("<a href=\"#\">Replace from playlist(s)</a>");
                        $a.on("click", function(e) {
                            var getSelectedVideos = function() {
                                var olds = $('.deleted-checkbox:checked');
                                var news = $('.suggested-radio:checked');
                                var old_to_new = {};
                                for (var i = 0; i < olds.length; i++) {
                                    var old = $(olds[i]);
                                    var new_vid = old.parent().parent().find('.suggested-radio:checked')[0]
                                    old_to_new[olds[i].name] = new_vid.id;
                                }
                                return old_to_new;
                            };

                            while (invalidIds.length) {
                                var getVideoById = function(id) {
                                    for (var i = 0; i < videoIds.length; i++) {
                                        if (videoIds[i].id == id) {
                                            return videoIds[i];
                                        }
                                    }
                                };

                                // get selected videos
                                var old_to_new = getSelectedVideos();
                                var invalidId = invalidIds.pop();
                                var video = getVideoById(invalidId);

                                // get old video position
                                var position;
                                Utils.request("GET", "playlistItems", {
                                    id: invalidId,
                                    part: 'snippet',
                                    fields: 'items/snippet/position'
                                }, function(data) {
                                    position = data.items[0].snippet.position
                                });

                                var snippet = {
                                    'snippet': {}
                                };
                                snippet.snippet.playlistId = video.playlistId;
                                snippet.snippet.resourceId = {};
                                snippet.snippet.resourceId.videoId = old_to_new[video.videoId];
                                snippet.snippet.resourceId.kind = 'youtube#video';
                                snippet.snippet.position = position;

                                // delete old by id
                                // Utils.request('DELETE', "playlistItems",{id: invalidId});

                                // insert at old position
                                Utils.request("POST",
                                    "playlistItems", {
                                        part: 'snippet'
                                    },
                                    function(data) {},
                                    JSON.stringify(snippet)
                                );
                            }
                            //delete localStorage.playlists;
                            //location.reload();

                            $dialog.find("div").html("Videos replaced!");
                        });

                        $dialog.find("div").html(html);
                        $dialog.find("div").append($a);

                    } else {
                        $dialog.find("div").html("No replacement videos found!");
                    }
                };

            $dialog = Utils.dialog("Searching for deleted videos", "<b>retrieving videos ...</b>");
            _.map(playlists, function(playlist) {
                request(playlist);
            });

            interval = window.setInterval(function() {
                if (count == playlists.length) {
                    $dialog.find("div").html("<b>scanning videos ...</b>")
                    process();
                    window.clearInterval(interval);
                }
            }, 100);
        }
    });

    return PlaylistCollectionView;
});