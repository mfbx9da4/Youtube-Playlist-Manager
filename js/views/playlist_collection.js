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

			if (!playlists.length) {
				alert("Please select one or more playlists first.");
				return;
			}

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

					Utils.request("playlistItems", config, function(data) {
						txt_data.push(data);
						nextPageToken = data.nextPageToken;
					});
				}
			}

			var txt = [];

			_.map(txt_data, function(data) {
				_.map(data.items, function(item) {
					var title = item.snippet.title;
					var videoId = "https://youtube.com/watch?v=" + item.snippet.resourceId.videoId;

					txt.push(title + "\n" + videoId);
				});
			});

			txt = txt.join("\n\n");
			window.open("data:text/plain;charset=utf-8," + escape(txt), "_blank");

			$("*").css("cursor", "");
		}
	});

	return PlaylistCollectionView;
});
