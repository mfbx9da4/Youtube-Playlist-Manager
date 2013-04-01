define([
	"utils",
	"jquery", 
	"underscore",

	"backbone",
	"models/playlist_item"

], function(Utils, $, _, Backbone, PlaylistItemModel) {

	var PlaylistItemCollection = Backbone.Collection.extend({
		model: PlaylistItemModel,

		initialize: function(models, options) {
			this.pid = options.pid;
			this.retrieve_playlist();
		},

		retrieve_playlist: function() {
			var self = this;

			if (localStorage["playlist_" + this.pid]) {
				this.add(JSON.parse(localStorage["playlist_" + this.pid]));
				return;
			}

			Utils.request("playlistItems", {

					part: "id,snippet,contentDetails",
					playlistId: self.pid,
					maxResults: 50

				}, function(data) {
					if (typeof data != "object") { data = JSON.parse(data); }
					self.retrieve_video_resources(data.items);
				}
			);
		},

		retrieve_video_resources: function(data) {

			var self = this,
				videoIds = _.map(data, function(playlistItem) {
					return playlistItem.contentDetails.videoId;
				});

			Utils.request("videos", {

					id: videoIds,
					part: "id,snippet,contentDetails,statistics"

				}, function(data) {
					if (typeof data != "object") { data = JSON.parse(data); }
					self.add(data.items);

					localStorage["playlist_" + self.pid] = JSON.stringify(self.models);
				}
			);
		}
	});

	return PlaylistItemCollection;
});
