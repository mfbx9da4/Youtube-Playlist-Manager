define([
	"jquery", 
	"underscore",
	"backbone",

	"collections/playlists",
	"text!templates/playlist_collection.tpl",

], function($, _, Backbone, PlaylistCollection, PlaylistCollectionTemplate) {
	var PlaylistCollectionView = Backbone.View.extend({

		el: "#content",

		initialize: function() {
			this.collection = new PlaylistCollection();
		},

		render: function() {
			var html = _.template(PlaylistCollectionTemplate, this);
			this.$el.html(html);
		}
	});

	return PlaylistCollectionView;
});
