
//= On DOM Ready ==================//
$(function() {
	//Images Maps
	$("map area")
		.mouseover(function(evt){
			$(evt.target).parent().prev().attr("src", $(evt.target).data("imgsrc"));
		})
		.mouseleave(function(evt){
			$(evt.target).parent().prev().attr("src", $(evt.target).parent().prev().data("defsrc"));
		});

	$("map").prev().map(function(idx, elm){
		$(elm).attr("src", $(elm).data("defsrc"));
	});


	//Builds Table of Content
	$("#toc").empty().append(
		"<span class='title'>Page Content</span>" +
		"<span><a href='#_top'>&uparrow; Top</a></span><br/>"
	);
	$(".contentframe h5").map(function(idx, elm){
		var title	= $(elm).text();
		var anchor	= $(elm).parent().attr("id");
		$("#toc").append("<span><a href='#" + anchor + "'>" + title + "</a></span>");
	});


	//Animated Scrolls
	$("a[href^='#']").click(function(e) {
		e.preventDefault();
		var position = $($(this).attr("href")).offset().top;
		$("body, html").animate({ scrollTop : position }, 300);
	});
});
//=================================//
