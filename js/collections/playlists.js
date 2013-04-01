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

			Utils.request("playlists", {

					part: "id,snippet,contentDetails",
					fields: "items(id,snippet/title,contentDetails/itemCount)",
					mine: true,
					maxResults: 50,

				}, function(data) {
					if (typeof data != "object") { data = JSON.parse(data); }
					self.add(data.items);
					self.retrieve_favorites_info();
				}
			);
		},

		retrieve_favorites_info: function() {
			var self = this;

			// First we need to aquire the playlist id
			// Favorites, likes, etc. are stored in the channel resource
			Utils.request("channels", {

					part: "contentDetails",
					fields: "items/contentDetails/relatedPlaylists",
					mine: true,
					maxResults: 1,

				}, function(data) {
					if (typeof data != "object") { data = JSON.parse(data); }
					var fav_id = data.items[0].contentDetails.relatedPlaylists.favorites;

					// Now we can fetch the title, and itemCount
					Utils.request("playlists", {

							id: fav_id,
							part: "id,snippet,contentDetails",
							fields: "items(id,snippet/title,contentDetails/itemCount)",
							maxResults: 1,

						}, function(data) {
							if (typeof data != "object") { data = JSON.parse(data); }
							self.add(data.items, { at: 0 });
							self.retrieve_thumbnail_previews();
						}
					);
				}
			);
		},

		retrieve_thumbnail_previews: function() {
			var self = this,
				playlistIds = _.map(this.models, function(playlistItem) {
					return playlistItem.attributes.id;
				});

			while (playlistIds.length) {		
				Utils.request("playlistItems", {

						playlistId: playlistIds.pop(),
						part: "snippet",
						fields: "items/snippet/thumbnails/default/url",

					}, function(data) {
						if (typeof data != "object") { data = JSON.parse(data); }
						self.models[playlistIds.length].set("thumbnailPreviews", data.items);
					}
				);
			}

			localStorage.playlists = JSON.stringify(this.models);
		}
	});

	return PlaylistCollection;
});
