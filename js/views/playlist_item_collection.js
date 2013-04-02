define([
	"jquery", 
	"underscore", 
	"backbone",

	"collections/playlist_items",
	"text!templates/playlist_item_collection.tpl",

], function($, _, Backbone, PlaylistItemCollection, PlaylistItemCollectionTemplate) {
	var PlaylistItemCollectionView = Backbone.View.extend({

		el: "#content",

		initialize: function(options) {
			this.pname = decodeURIComponent(options.pname);
			this.pid = options.pid;
			this.collection = new PlaylistItemCollection(null, options);
		},

		render: function() {
			var html = _.template(PlaylistItemCollectionTemplate, this);
			this.$el.html(html);
		}
	});

	return PlaylistItemCollectionView;
});
