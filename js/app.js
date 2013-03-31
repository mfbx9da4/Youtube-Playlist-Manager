define([
	"jquery", 
	"underscore", 
	"backbone",
	"router"
	
], function($, _, Backbone, Router, PlaylistCollectionView) {

	var App = {};

	App.initialize = function() {

		Router.initialize();
	};

	return App;
});