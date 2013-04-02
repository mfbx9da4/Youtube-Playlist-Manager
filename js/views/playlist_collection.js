define([
	"jquery", 
	"underscore",
	"backbone",
	"utils",

	"collections/playlists",
	"text!templates/playlist_collection.tpl",

], function($, _, Backbone, Utils, PlaylistCollection, PlaylistCollectionTemplate) {
	var PlaylistCollectionView = Backbone.View.extend({

		el: "#content",

		events: {
			"click .action_export_playlists": "action_export_playlists",
			"click .action_find_duplicates": "action_find_duplicates",
			"click .action_find_deleted_videos": "action_find_deleted_videos"
		},

		initialize: function() {
			this.collection = new PlaylistCollection();
		},

		render: function() {
			var html = _.template(PlaylistCollectionTemplate, this);
			this.$el.html(html);
		},

		get_selection: function() {
			var playlists = [], playlist

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

			var self = this, playlists = self.get_selection(),
				count = 0, interval, $dialog;

			if (!playlists.length) { alert("Please select one or more playlists first."); return; }

			var request = function(playlist, pageToken) {
				var config = {
					playlistId: playlist.id,
					part: "snippet",
					fields: "nextPageToken,items(snippet(title,resourceId/videoId))",
					maxResults: 50,
					async: true
				};

				if (typeof pageToken == "string") { config.pageToken = pageToken; }
				Utils.request("GET", "playlistItems", config, function(data) { success(data, playlist); });
			},

			success = function(data, playlist) {
				if (typeof data != "object") { data = JSON.parse(data); }

				[].push.apply(playlist.items, data.items);

				if (typeof data.nextPageToken == "string")
				{ request(playlist, data.nextPageToken); }
				else { count++; }
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

				if (count != playlists.length)
				{ html += "<b>please wait ...</b>"; }

				$dialog.find("div").html(html);
			},

			process = function() {
				var text = [], ln = escape("\r\n"), $download, $tab;

				_.map(playlists, function(playlist) {
					_.map(playlist.items, function(item) {
						var title = item.snippet.title;
						var videoId = "https://youtube.com/watch?v=" + item.snippet.resourceId.videoId;

						text.push(title + ln + videoId);
					});
				});

				text = text.join(ln+ln);
				update();

				$download = $("<a href=\"javascript:void();\">Download</a>");
				$download.on("click", function(e) { window.open("data:bytes;charset=utf-8," + text, "_blank"); $("#dialog_container").remove(); });

				$tab = $("<a href=\"javascript:void();\">Open window</a>");
				$tab.on("click", function(e) { window.open("data:text/plain;charset=utf-8," + text, "_blank"); $("#dialog_container").remove(); });

				$dialog.find("div").append($download, " or ", $tab);
			};

			$dialog = Utils.dialog("Exporting playlists", "...");
			_.map(playlists, function(playlist) { request(playlist); });

			interval = window.setInterval(function() {
				if (count == playlists.length) {
					process();
					window.clearInterval(interval);
				} else { update(); }
			}, 100);
		},

		action_find_duplicates: function(e) {

			var self = this, playlists = self.get_selection(),
				count = 0, interval, $dialog;

			if (!playlists.length) { alert("Please select one or more playlists first."); return; }

			var request = function(playlist, pageToken) {
				var config = {
					playlistId: playlist.id,
					part: "snippet",
					fields: "nextPageToken,items(id,snippet(title,resourceId/videoId))",
					maxResults: 50,
					async: true
				};

				if (typeof pageToken == "string"){ config.pageToken = pageToken; }
				Utils.request("GET", "playlistItems", config, function(data) { success(data, playlist); });
			},

			success = function(data, playlist) {
				if (typeof data != "object") { data = JSON.parse(data); }

				[].push.apply(playlist.items, data.items);

				if (typeof data.nextPageToken == "string")
				{ request(playlist, data.nextPageToken); }
				else { count++; }
			},

			update = function() {
				var titles, id, video, content = [], html = "";

				_.map(playlists, function(playlist) {

					html = "Playlist: <b>" + playlist.name + "</b><br><table><tr><th>#</th><th>Name</th><th>video id</th></tr>";

					titles = {};
					playlist.duplicates = {};

					_.map(playlist.items, function(item) {
						if (!titles[item.snippet.title]) { titles[item.snippet.title] = true; }
						else {
							if (!playlist.duplicates[item.snippet.resourceId.videoId])
							{
								playlist.duplicates[item.snippet.resourceId.videoId] = {
									title: item.snippet.title,
									ids: [item.id],
								};
							}
							else { playlist.duplicates[item.snippet.resourceId.videoId].ids.push(item.id); }
						}
					});

					for (id in playlist.duplicates) {
						video = playlist.duplicates[id];
						html += "<tr><th>" + video.ids.length;
						html += "</th><th>" + video.title;
						html += "</th><th><a href='https://youtube.com/watch?v=" + id + "' target='_blank'>" + id + "</a></th></tr>";
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

				var duplicates = {};
				_.map(playlists, function(playlist) { $.extend(duplicates, playlist.duplicates); });

				if (Object.keys(duplicates).length) {
					$a = $("<hr><a href=\"javascript:void();\">Remove duplicates</a>");

					$a.on("click", function(e) {
						$dialog.find("div").html("<img src='img/loading.gif'>");

						window.setTimeout(function() {
							for (i in duplicates) {
								_.map(duplicates[i].ids, function(id) {
									Utils.request("DELETE", "playlistItems", { id: id });
								});
							}

							$dialog.find("div").html("<b>Duplicates removed!</b>");
						}, 100);
					});

					$dialog.find("div").append($a);
				} else {
					$dialog.find("div").html("No dupliactes found!");
				}
			};

			$dialog = Utils.dialog("Searching for duplicates", "<b>retrieving videos ...</b>");
			_.map(playlists, function(playlist) { request(playlist); });

			interval = window.setInterval(function() {
				if (count == playlists.length) {
					process();
					window.clearInterval(interval);
				}
			}, 100);
		},

		action_find_deleted_videos: function(e) {

			var self = this, playlists = self.get_selection(),
				count = 0, interval, $dialog;

			if (!playlists.length) { alert("Please select one or more playlists first."); return; }

			var request = function(playlist, pageToken) {
				var config = {
					playlistId: playlist.id,
					part: "snippet",
					fields: "nextPageToken,items(id,snippet(title,resourceId/videoId))",
					maxResults: 50,
					async: true
				};

				if (typeof pageToken == "string") { config.pageToken = pageToken; }
				Utils.request("GET", "playlistItems", config, function(data) { success(data, playlist); });
			},

			success = function(data, playlist) {
				if (typeof data != "object") { data = JSON.parse(data); }

				[].push.apply(playlist.items, data.items);

				if (typeof data.nextPageToken == "string")
				{ request(playlist, data.nextPageToken); }
				else { count++; }
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

						videoIds.push({ playlist: playlist.name, videoId: videoId });
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
						if (typeof data != "object") { data = JSON.parse(data); }
						_.map(data.items, function(item) { responseIds.push(item.id); });
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

					$a = $("<a href=\"javascript:void();\">Remove duplicates</a>");
					$a.on("click", function(e) {
						while (invalidIds.length) { Utils.request("DELETE", "playlistItems", { id: invalidIds.pop() }); }
						delete localStorage.playlists;
						location.reload();
					});

					$dialog.find("div").html(html);
					$dialog.find("div").append($a);

				} else { $dialog.find("div").html("No deleted videos found!"); }
			};

			$dialog = Utils.dialog("Searching for deleted videos", "<b>retrieving videos ...</b>");
			_.map(playlists, function(playlist) { request(playlist); });

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
