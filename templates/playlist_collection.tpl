<header>
	<h2>Select a playlist:</h2>
</header>

<div class="action_bar">
	<input type="checkbox" name="select_all">
	<div class="dropdown">
		<span>Action</span>
		<ul>
			<li class="action_export_playlists">Export playlist(s)</li>
			<li class="action_find_duplicates">Find duplicates</li>
			<li class="action_find_deleted_videos">Find deleted videos</li>
			<li class="action_replace_deleted_videos">Replace deleted videos</li>
		</ul>
	</div>

	<a class="button right" href="javascript:delete localStorage.playlists; location.reload();">Refetch playlists</a>
</div>

<ul class="listView" id="playlist_collection">
	<% _.each(collection.models, function(model) {

		var playlist = model.attributes,
			id = playlist.id,
			title = playlist.snippet.title,
			itemCount = playlist.contentDetails.itemCount,
			thumbnails = playlist.thumbnailPreviews;

	%>

	<li>
		<input type="checkbox" name="<%= id %>">

		<div class="thumbnails">
			<% _.each(thumbnails, function(thumbnail) { %>

			<img src="<%= thumbnail.snippet.thumbnails.default.url %>" width="67" height="50">

			<% }); %>
		</div>

		<div class="info">
			<a class="title" href="#pid/<%= encodeURIComponent(title) %>:<%= id %>"><%= title %></a><br>
			<span class="itemCount"><%= itemCount %> Videos</span>
		</div>
	</li>

	<% }); %>
</ul>