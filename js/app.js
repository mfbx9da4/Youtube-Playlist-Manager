define([

	"jquery", 
	"underscore", 
	"backbone",
	"router",
	"utils"
	
], function($, _, Backbone, Router, Utils) {

	var App = {};

	App.initialize = function() {

		// Dropdown functionality
		$("body").on("click", ".dropdown", function(e) {
			var $target = $(e.currentTarget);
			$target.toggleClass("opened");
		}).on("click", function(e) {
			var $target = $(e.currentTarget);
			if (!($(e.target).hasClass("dropdown") || $(e.target).parent().hasClass("dropdown")))
			$(".dropdown").removeClass("opened");
		});

		// Select functionality
		$("body").on("click", ".action_bar input[type=checkbox]", function(e) {
			var checked = $(e.currentTarget).is(":checked");
			$(".listView input[type=checkbox]").prop("checked", checked);
		});

		// Request authentication
		Utils.auth(Router.initialize);
	};

	return App;
});