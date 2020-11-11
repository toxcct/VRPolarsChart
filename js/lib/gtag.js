if ((window.location.hostname !== '127.0.0.1') && (window.location.hostname !== 'localhost')) {
	//Google Analytics
	var gaId = "UA-109304812-1";
	$("head").append("<script async src='https://www.googletagmanager.com/gtag/js?id='" + gaId + "></script>");
	window.dataLayer = window.dataLayer || [];
	function gtag(){dataLayer.push(arguments);}
	gtag('js', new Date());
	gtag('config', gaId);

	//Google AdSense
	$("head").append("<script async src='//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'></script>");
	(adsbygoogle = window.adsbygoogle || []).push({
		google_ad_client: "ca-pub-8796367543101705",
		enable_page_level_ads: true
	});
}
