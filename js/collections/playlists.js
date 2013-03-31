define([
	"utils",
	"jquery", 
	"underscore", 
	"backbone",
	"models/playlist"

], function(Utils, $, _, Backbone, PlaylistModel) {

	var PlaylistCollection = Backbone.Collection.extend({
		model: PlaylistModel,

		initialize: function(models, options) {
			this.retirieve_playlists();
		},

		retirieve_playlists: function() {
			var self = this;

			if (localStorage.playlists) {
				this.add(JSON.parse(localStorage.playlists));
				return;
			}

			Utils.auth(function(token) {
				var query = {
					part: "id,snippet,contentDetails",
					mine: true,
					maxResults: 50,
					access_token: token
				};

				$.ajax({
					url: "https://www.googleapis.com/youtube/v3/playlists?" + Utils.serialize(query),
					type: "GET",
					async: false,

					success: function(data) {
						if (typeof data != "object") { data = JSON.parse(data); }
						self.add(data.items);
						self.retrieve_thumbnail_previews(data.items);
					}
				});
			});
		},

		retrieve_thumbnail_previews: function(data) {
			var self = this,
				playlistIds = _.map(data, function(playlistItem) {
					return playlistItem.id;
				});

			while (playlistIds.length) {			
				Utils.auth(function(token) {
					var query = {
						playlistId: playlistIds.pop(),
						part: "snippet",
						fields: "etag,items(snippet(thumbnails(default)))",
						maxResults: 5,
						access_token: token
					};

					$.ajax({
						url: "https://www.googleapis.com/youtube/v3/playlistItems?" + Utils.serialize(query),
						type: "GET",
						async: false,

						success: function(data) {
							if (typeof data != "object") { data = JSON.parse(data); }
							self.models[playlistIds.length].set("thumbnailPreviews", data.items);
						}
					});
				});
			}

			localStorage.playlists = JSON.stringify(self.models);
		}
	});

	return PlaylistCollection;
});
