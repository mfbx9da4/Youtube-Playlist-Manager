define(["jquery"], function($) {

	var Utils = {};

	Utils.auth = function(callback) {
		var access_token_expire = parseInt(Utils.cookie.get("access_token_expire"), 10);

		if (!access_token_expire || access_token_expire*1000 < new Date().getTime()) {
			$("#msg_auth").fadeIn(function() {
				gapi.auth.authorize({
					"client_id": "716237968116-bfsg986nn1ob5nqir6i7kmsjig4ncf27.apps.googleusercontent.com",
					"scope": "http://gdata.youtube.com"
				}, function() {
					var token = gapi.auth.getToken(),
						access_token = token.access_token;

					Utils.cookie.set("access_token_expire", token.expires_at);
					Utils.cookie.set("access_token", access_token);

					location.reload();
				});
			});
		} else { callback(); }
	};

	Utils.serialize = function(obj) {
		var str = [], key, value;
		for(key in obj) {
			if (obj.hasOwnProperty(key)) {
				value = obj[key];

				str.push(
					encodeURIComponent(key) + "=" +
					encodeURIComponent(value)
				);
			}
		}

		return str.join("&");
	};

	Utils.request = function(type, resource, data, callback) {
		Utils.auth(function(token) {
			data.access_token = Utils.cookie.get("access_token");

			var async = data.async || false;
			if (data.async) { delete data.async; }

			$.ajax({
				url: "https://www.googleapis.com/youtube/v3/" + resource + "?" + Utils.serialize(data),
				type: type,
				async: async,
				success: callback
			});
		});
	};

	Utils.cookie = {
		set: function(name, value, days) {
			if (days) {
				var date = new Date();
				date.setTime(date.getTime()+(days*24*60*60*1000));
				var expires = "; expires="+date.toGMTString();
			} else { var expires = ""; }

			document.cookie = name + "=" + value + expires + "; path=" + location.pathname;
		},

		unset: function(name) { Cookie.set(name, "", -1); },

		get: function(name) {
			var search = new RegExp(name + "=([^;]*)");
			var result = search.exec(document.cookie);
			return result ? result[1] : null;
		}
	};

	Utils.dialog = function(title, content) {
		var $dialog_container = $("<div id='dialog_container'></div>"),
			$dialog = $("<div id='dialog'></div>"),
			$title = $("<h3>" + title + "</h3>"),
			$close = $("<a id='dialog_close' href='javascript:void()'>close</a>"),
			$content = $("<div>" + content + "</div>");

		$close.on("click", function() { $("#dialog_container").remove(); });
		if ($("#dialog_container").length) { $("#dialog_container").remove(); }
		
		$title.append($close);
		$dialog.append($title, $content);
		$dialog_container.append($dialog);
		$("body").append($dialog_container);

		return $dialog;
	};

	$("html").on("click", ".dropdown", function(e) {
		var $target = $(e.currentTarget);
		$target.toggleClass("opened");
	}).on("click", function(e) {
		var $target = $(e.currentTarget);
		if (!($(e.target).hasClass("dropdown") || $(e.target).parent().hasClass("dropdown")))
		$(".dropdown").removeClass("opened");
	});

	$("body").on("click", ".action_bar input[type=checkbox]", function(e) {
		var checked = $(e.currentTarget).is(":checked");
		$(".listView input[type=checkbox]").prop("checked", checked);
	});

	return Utils;
});
