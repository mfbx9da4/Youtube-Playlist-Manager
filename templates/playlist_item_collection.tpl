<header>
	<h2><%= pname %></h2>
</header>

<div class="action_bar">
	<a class="button right" href="javascript:delete localStorage['playlist_<%= pid %>']; location.reload();">Refetch videos</a>
	<div style="clear: both"></div>
</div>

<ul class="listView" id="playlist_item_collection">
	<% _.each(collection.models, function(model) {

		var playlistItem = model.attributes,
			videoId = playlistItem.contentDetails.videoId,
			title = playlistItem.snippet.title,
			description = playlistItem.snippet.description.replace(/[\s]{2}/g, ' ').substr(0, 100) + "...",
			duration = playlistItem.contentDetails.duration,
			itemCount = playlistItem.contentDetails.itemCount,
			thumbnail = playlistItem.snippet.thumbnails.medium.url;

		duration = duration.replace(/(P|T|S)*/g, '').
							replace(/(\d)?(?:H|M)(\d)/g, '$1:$2').
							replace(/(^\d\D)/g, '0$1').
							replace(/M/g, '');

	%>

	<li>
		<div style="background-image: url('<%= thumbnail %>');" class="thumbnail">
			<span class="duration"><%= duration %></span>
		</div>

		<div class="info">
			<a href="https://youtube.com/watch?v=<%= videoId %>" class="title"><%= title %></a>
			<div class="description"><%= description %></div>
		</div>
	</li>

	<% }); %>
</ul>

<script>
	$(document).ready(function() {
		// Toggle the dropdown menu's
		$(".dropdown .button, .dropdown button").click(function () {
			$(this).parent().find('.dropdown-slider').slideToggle('fast');
			$(this).find('span.toggle').toggleClass('active');
			return false;
		});
	}); // END document.ready
	
	// Close open dropdown slider/s by clicking elsewhwere on page
	$(document).bind('click', function (e) {
		if (e.target.id != $('.dropdown').attr('class')) {
			$('.dropdown-slider').slideUp();
			$('span.toggle').removeClass('active');
		}
	}); // END document.bind
</script>