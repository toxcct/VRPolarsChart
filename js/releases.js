
//= On DOM Ready ==================//
$(function() {
	//Builds Table of Content
	$("#toc").empty().append(
		"<span class='title'>Page Content</span>" +
		"<span><a href='#_top'>&uparrow; Top</a></span>"
	);

	$(".contentframe h3").map(function(idx, elm){
		var title	= $(elm).text();
		var anchor	= $(elm).parent().attr("id");
		$("#toc").append("<br/><span><a href='#" + anchor + "'>" + title + "</a></span>");

		$(elm).parent().find("h5").map(function(idx, elm){
			var version = $(elm).text();
			var id = ($(elm).parent().attr("id") + "_" + version + "_" + $(elm).index()).replace(/\./g, "_");
			$(elm).attr("id", id);
			$("#toc").append("<span><a href='#" + id + "'>" + version + "</a></span>");

			console.log( id );
		});
	});

	//Animated Scrolls
	$("a[href^='#']").click(function(e) {
		e.preventDefault();
		var position = $($(this).attr("href")).offset().top;
		$("body, html").animate({ scrollTop : position }, 300);
	});
});
//=================================//
