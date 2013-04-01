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
			"click .action_remove_duplicates": "action_remove_duplicates",
			"click .action_remove_deleted_videos": "action_remove_deleted_videos"
		},

		initialize: function() {
			this.collection = new PlaylistCollection();
		},

		render: function() {
			var html = _.template(PlaylistCollectionTemplate, this);
			this.$el.html(html);
		},

		get_selection: function() {
			var playlists = [];

			$(".listView input:checked").each(function(i, input) {
				playlists.push($(input).attr("name"));
			});

			return playlists;
		},

		action_export_playlists: function(e) {

			var self = this,
				playlists = self.get_selection(),
				txt_data = [],
				nextPageToken = true,
				config,
				playlist;

			if (!playlists.length) { alert("Please select one or more playlists first."); return; }
			if (!confirm("This process might take a few seconds.\nClick ok to start the process.")) { return; }

			$("*").css("cursor", "wait");

			while (playlists.length) {
				nextPageToken = true;
				playlist = playlists.pop();

				while (nextPageToken) {

					config = {
						playlistId: playlist,
						part: "snippet",
						fields: "nextPageToken,items(snippet(title,resourceId/videoId))",
						maxResults: 50
					};

					if (typeof nextPageToken == "string") { config.pageToken = nextPageToken; }

					Utils.request("GET", "playlistItems", config, function(data) {
						if (typeof data != "object") { data = JSON.parse(data); }
						txt_data.push(data);
						nextPageToken = data.nextPageToken;
					});
				}
			}

			var txt = [],
				ln = escape("\n");

			_.map(txt_data, function(data) {
				_.map(data.items, function(item) {
					var title = item.snippet.title;
					var videoId = "https://youtube.com/watch?v=" + item.snippet.resourceId.videoId;

					txt.push(title + ln + videoId);
				});
			});

			txt = txt.join(ln+ln);
			window.open("data:text/plain;charset=utf-8," + txt, "_blank");

			$("*").css("cursor", "");
		},

		action_remove_duplicates: function(e) {
			var self = this,
				playlists = self.get_selection(),
				playlistItems = [],
				nextPageToken = true,
				config,
				playlist;

			if (!playlists.length) { alert("Please select one or more playlists first."); return; }
			if (!confirm("This process might take a few seconds.\nClick ok to start the process.")) { return; }

			$("*").css("cursor", "wait");

			while (playlists.length) {
				nextPageToken = true;
				playlist = playlists.pop();

				while (nextPageToken) {

					config = {
						playlistId: playlist,
						part: "snippet",
						fields: "nextPageToken,items(id,snippet(title,resourceId/videoId))",
						maxResults: 50
					};

					if (typeof nextPageToken == "string") { config.pageToken = nextPageToken; }

					Utils.request("GET", "playlistItems", config, function(data) {
						if (typeof data != "object") { data = JSON.parse(data); }
						playlistItems.push(data);
						nextPageToken = data.nextPageToken;
					});
				}
			}

			var ids = [], titles = {};

			_.map(playlistItems, function(data) {
				_.map(data.items, function(item) {
					if (!titles[item.snippet.title]) { titles[item.snippet.title] = true; }
					else { ids.push(item.id); }
				});
			});

			while (ids.length) { Utils.request("DELETE", "playlistItems", { id: ids.pop() }); }

			delete localStorage.playlists;
			location.reload();
		},

		action_remove_deleted_videos: function(e) {
			var self = this,
				playlists = self.get_selection(),
				playlistItems = [],
				nextPageToken = true,
				config,
				playlist;

			if (!playlists.length) { alert("Please select one or more playlists first."); return; }
			if (!confirm("This process might take a few seconds.\nClick ok to start the process.")) { return; }

			$("*").css("cursor", "wait");

			while (playlists.length) {
				nextPageToken = true;
				playlist = playlists.pop();

				while (nextPageToken) {

					config = {
						playlistId: playlist,
						part: "snippet",
						fields: "nextPageToken,items(id,snippet(title,resourceId/videoId))",
						maxResults: 50
					};

					if (typeof nextPageToken == "string") { config.pageToken = nextPageToken; }

					Utils.request("GET", "playlistItems", config, function(data) {
						if (typeof data != "object") { data = JSON.parse(data); }
						playlistItems.push(data);
						nextPageToken = data.nextPageToken;
					});
				}
			}

			var videoIds = [],
				_videoIds = [],
				invalidIds = [],
				responseIds = [],
				videoItemIds = {},
				titles = {},
				videoId;

			_.map(playlistItems, function(data) {
				_.map(data.items, function(item) {
					videoId = item.snippet.resourceId.videoId;

					videoIds.push(videoId);
					_videoIds.push(videoId);

					videoItemIds[videoId] = item.id;
					titles[videoId] = item.snippet.title;
				});
			});

			while (_videoIds.length) {
				Utils.request("GET", "videos", {

					id: _videoIds.splice(0, 50),
					part: "id",

				}, function(data) {
					if (typeof data != "object") { data = JSON.parse(data); }
					_.map(data.items, function(item) { responseIds.push(item.id); });
				});
			}

			var msg = "The following videos have been banned or removed:\n\n";

			_.map(videoIds, function(id) {
				if (responseIds.indexOf(id) == -1) {
					invalidIds.push(videoItemIds[id]);
					msg += titles[id] + "\n";
				}
			});

			msg += "\n\nClick ok to delete them.";

			if (confirm(msg)) {

				while (invalidIds.length) { Utils.request("DELETE", "playlistItems", { id: invalidIds.pop() }); }

				delete localStorage.playlists;
				location.reload();
			}
		}
	});

	return PlaylistCollectionView;
});
