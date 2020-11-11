
//= On DOM Ready ==================//
$(function() {
	//Adding a .fix() Method to the Number class
	Number.prototype.fix = function(n, pad) {
		if (pad === undefined) pad = false;

		if (pad === true)
			return this.toFixed((n !== undefined) ? n : 2);
		else
			return Number.parseFloat(this.toFixed((n !== undefined) ? n : 2));
	};
	window.parseBool = function(s) {
		if (!s) return false;

		return (
			(s.toLowerCase() === "true")	||
			(s.toLowerCase() === "yes")		||
			(s.toLowerCase() === "y")		||
			(s === "1")
		);
	}

	//Starts Application
	PolarsApp.initialize();
});
//=================================//

var PolarsApp = (function(){
	var _versions			= { app:"5.5.2", data:{} };
	var _bInitialized		= false;
	var _bError				= false;
	var _checkVersionRate	= 60; //In seconds
	var _checkVersionOff	= false;
	var _currentRace		= null;
	var _currentBoat		= null;
	var _defaultSettings	= {
		raceId			: "",
		twa				: 0,
		tws				: 10,
		archivedByUser	: false,
		options			: {
			light	: false,
			reach	: false,
			heavy	: false,
			foil	: false,
			hull	: false
		}
	};
	var _acceptedURLParams	= ["race_id", "twa", "tws", "light", "reach", "heavy", "foil", "hull", "utm_source"];


	//Static Data retrieved from Server
	var _races				= {};
	var _boats				= {};

	//Properties for UI Sync
	var _current_twa		= 0;		// Attitude	> TWA
	var _current_boatspeed	= 0;		// Attitude	> Boat Speed
	var _chk_spd_overlay	= false;	// Attitude	> Boat Speed	> Chart Overlay
	var _current_vmg		= 0;		// Attitude	> VMG
	var _chk_vmg_overlay	= false;	// Attitude	> VMG			> Chart Overlay
	var _current_tws		= 0;		// Input	> TWS
	var _maxsp_twa			= 0;		// Maximum	> TWA
	var _maxsp_bs			= 0;		// Maximum	> Speed
	var _twa_up				= 0;		// Optimums	> TWA (upwind)
	var _vmg_up				= 0;		// Optimums	> VMG (upwind)
	var _twa_down			= 0;		// Optimums	> TWA (downwind)
	var _vmg_down			= 0;		// Optimums	> VMG (downwind)
	var _chk_opt_light		= false;	// Options	> Light sails
	var _chk_opt_reach		= false;	// Options	> Reaching sail
	var _chk_opt_heavy		= false;	// Options	> Heavy sails
	var _chk_opt_foil		= false;	// Options	> Foils
	var _chk_opt_hull		= false;	// Options	> Hull
	var _foils_factor		= 1;		// Options	> Foils			> Factor
	var _foils_rate			= 0;		// Options	> Foils			> Factor (Calculated rate)
	var _chk_foils_overlay	= false;	// Options	> Foils			> Chart Overlay


	function getVersions() {
		return _versions;
	}
	function disableCheckVersions() {
		_checkVersionOff = true;
	}
	function enableCheckVersions(rate) {
		if (rate !== undefined) {
			if (typeof rate !== "number")
				throw new TypeError("Number expected");
			_checkVersionRate = rate;
		}
		_checkVersionOff = false;
		checkVersions();
	}
	function initialize() {
		if (_bInitialized) return;

		try {
			//Sails Names
			$.map(PolarsReader.sailsNames, function(obj, i) {
				$(".sail."+i).next().text(obj.en);
			});

			//Options Names
			$.map(PolarsReader.optionsNames, function(obj, i) {
				$("label[for=opt_"+i+"]").text(obj.en);
			});
			$("label[for=opt_foil]")
				.append('<span id="foils_factor" title="Factor by which the boat speed is increased"></span>')
				.append('<span id="foils_rate"	title="Rate by which the foils are kicking"></span>');

			//Loading Races and Boats
			handleBoatsVersion();
			handleRacesVersion();

			//Event Handlers Registration
			registerEventHandlers();

			//Launching Application Versions Check
			checkVersions();

			//Loading User Stored Data and URL Parameters
			retrieveUserDataStored();

			//Building Races Selection
			buildRacesSelector();

			//Forces actualization of UI Elements regarding selected race and settings.
			//Updates internal properties, refreshes chart, and load data accordingly.
			$("#race_selection select")
				.val(_currentRace.id)
				.trigger("change");


			$("#app_version"	).text(_versions.app);
			$("#spdprj_overlay"	).prop("checked", _chk_spd_overlay	);
			$("#vmg_overlay"	).prop("checked", _chk_vmg_overlay	);
			$("#foils_overlay"	).prop("checked", _chk_foils_overlay);

			_bInitialized = true;
		}
		catch (e) {
			console.error("Error during Application Initialization : ", e);
		}
	}
	function setErrorMessage(msg) {
		if (!msg) {
			clearMessages();
		}
		else {
			$("#info_message").empty().hide();
			$("#error_message").html(msg).show();
		}
	}
	function setInfoMessage(msg) {
		if (!msg) {
			clearMessages();
		}
		else {
			$("#error_message").empty().hide();
			$("#info_message").html(msg).show();
		}
	}
	function clearMessages() {
		enablePageControls();
		$("#info_message, #error_message").empty().hide();
	}
	function enablePageControls(bEnable) {
		if (bEnable === undefined || bEnable === null) bEnable = true;

		$(".sidebox button, .sidebox input, #reset_stored_data")
			.prop("disabled", !bEnable)
			.addClass   (!bEnable ? "gray" : "")
			.removeClass( bEnable ? "gray" : "");

		$(".sidebox .sail")
			.addClass   (!bEnable ? "dim" : "")
			.removeClass( bEnable ? "dim" : "");

		$(  "#data_maxsp_twa, #data_maxsp_bs,"
		  + "#data_twa_up, #data_vmg_up,"
		  + "#data_twa_down, #data_vmg_down")
			.addClass   (!bEnable ? "disabled" : "")
			.removeClass( bEnable ? "disabled" : "");

		$("#race_selection")
			.addClass   (!bEnable ? "disabled" : "")
			.removeClass( bEnable ? "disabled" : "");
	}
	function checkVersions() {
		var storedAppVersion	= PolarsStorage.get().version;
		var serverVersions		= null;

		console.group("Application version check");
		if (_checkVersionOff === true) {
			console.log("Check disabled. Exiting.");
			console.groupEnd();
			return;
		}

		if (storedAppVersion !== _versions.app) {
			if (storedAppVersion) {
				console.log("Application updated from '" + storedAppVersion + "' to '" + _versions.app + "'");
				PolarsStorage.merge({version:_versions.app});
			}
		}
		$.ajax({
			cache	: false,
			dataType: "json",
			url		: "data/versions.json",
			success	: function(data) {
				serverVersions = data;

				if (_versions.app !== serverVersions.app) {
					handleAppVersion(serverVersions.app);
				}
				else {
					console.log("Up to date so far.");
					console.groupEnd();
					if (_checkVersionOff === true || _checkVersionRate === 0) return;
					setTimeout(checkVersions, (_checkVersionRate*1000));
				}

				handleBoatsVersion(serverVersions.data.boats);
				handleRacesVersion(serverVersions.data.races);
			},
			error	: function(xhr, status, err){
				console.warn("Cannot retrieve Versions Manifest from Server (" + err + "). Will be retried later.");
				console.groupEnd();

				if (_checkVersionOff === true || _checkVersionRate === 0) return;
				setTimeout(checkVersions, (_checkVersionRate*1000));
			}
		});
	}
	function handleAppVersion(srvVersion) {
		var msg = "You are running version '" + _versions.app + "'.<br/>"
				+ "A newer version has been published on the server.<br/>"
				+ "Please refresh this page to retrieve version '" + srvVersion + "'.<br/>"
				+ "<button id='refreshbtn' class='bigRedButton'>Refresh Now</span>";

		$("#app_version").parent()
			.attr("title", "Refresh the page to use latest version " + srvVersion)
			.prepend("<img src='css/img/blink_alert.gif' />");

		setErrorMessage(msg);
		enablePageControls(false);

		$("#refreshbtn").click(function(){
			window.location.reload(true);
		});
	}
	function handleRacesVersion(srvVersion) {
		if (_versions.data.races === undefined || _versions.data.races !== srvVersion) {
			$.ajax({
				async	: (srvVersion === undefined) ? false : true,
				cache	: false,
				dataType: "json",
				url		: "data/races.json",
				success	: function(data){
					if (srvVersion !== undefined && data.version !== srvVersion) return;

					_versions.data.races = data.version;
					_races = data.races;
					if (srvVersion === undefined) return;

					buildRacesSelector();
					selectRace(_currentRace.id);
				},
				error	: function(xhr, status, err){
					console.warn("Cannot retrieve races list from Server (" + err + "). Will be retried later.")
				}
			});
		}
	}
	function handleBoatsVersion(srvVersion) {
		if (_versions.data.boats === undefined || _versions.data.boats !== srvVersion) {
			$.ajax({
				async	: (srvVersion === undefined) ? false : true,
				cache	: false,
				dataType: "json",
				url		: "data/boats.json",
				success	: function(data){
					if (srvVersion !== undefined && data.version !== srvVersion) return;

					_versions.data.boats = data.version;
					_boats = data.boats;
					if (srvVersion === undefined) return;

					buildRacesSelector();
					selectRace(_currentRace.id);

				},
				error	: function(xhr, status, err){
					console.warn("Cannot retrieve boats list from Server (" + err + "). Will be retried later.")
				}
			});
		}
	}
	function retrieveUserDataStored() {
		try {
			//Get the URL Parameters to load proper data
			var urlParams = parseQueryString();

			//If no data found in the Local Storage yet, create default dataset
			if (PolarsStorage.isEmpty()) {
				_currentRace	= _races.find(function(item){
					return (item.id === (urlParams["race_id"] || _defaultSettings.raceId)); });
				if (_currentRace === undefined) {
					_currentRace = _races
						.filter(function(item){
							return (new Date(item.endDate) > new Date()); })
						.sort(function(item1, item2){
							return (
								(new Date(item1.startDate) < new Date(item2.startDate)) ? -1 :
								(new Date(item1.startDate) > new Date(item2.startDate)) ? +1 :
								0);
						})[0];
				}
				_currentBoat	=
					_boats.find(function(item){
						return (item.id === _currentRace.boatId); })
					||
					_boats.find(function(item){
						return (item.id === "unknown"); });
				_current_twa	= (urlParams["twa"]	  !== undefined)	? parseFloat(urlParams["twa"]).fix(0) : _defaultSettings.twa;
				_current_tws	= (urlParams["tws"]   !== undefined)	? parseFloat(urlParams["tws"]).fix(2) : _defaultSettings.tws;
				_chk_opt_light	= (urlParams["light"] !== undefined)	? parseBool(urlParams["light"])	: _defaultSettings.options.light;
				_chk_opt_reach	= (urlParams["reach"] !== undefined)	? parseBool(urlParams["reach"])	: _defaultSettings.options.reach;
				_chk_opt_heavy	= (urlParams["heavy"] !== undefined)	? parseBool(urlParams["heavy"])	: _defaultSettings.options.heavy;
				_chk_opt_foil	= (urlParams["foil"]  !== undefined)	? parseBool(urlParams["foil"])	: _defaultSettings.options.foil;
				_chk_opt_hull	= (urlParams["hull"]  !== undefined)	? parseBool(urlParams["hull"])	: _defaultSettings.options.hull;

				PolarsStorage.merge({
					version		: _versions.app,
					appSettings	: {
						selectedRaceId	: _currentRace.id,
						showSpdOverlay	: _chk_spd_overlay,
						showVMGOverlay	: _chk_vmg_overlay,
						showFoilsOverlay: _chk_foils_overlay
					},
					races		: [
						{
							raceId	: _currentRace.id.toString(),
							twa		: _current_twa,
							tws		: _current_tws,
							options	: {
								light	: _chk_opt_light,
								reach	: _chk_opt_reach,
								heavy	: _chk_opt_heavy,
								foil	: _chk_opt_foil,
								hull	: _chk_opt_hull
							}
						}
					]
				});
			}
			//Otherwise, load appropriate data
			else {
				var data = PolarsStorage.get();

				var raceSettings = data.races.find(function(item){
					return (item.raceId === (urlParams["race_id"] || data.appSettings.selectedRaceId)); });
				if (raceSettings === undefined) {
					var race = _races.find(function(item){
						return (item.id === urlParams["race_id"] || _defaultSettings.raceId); });
					if (race === undefined) {
						race = _races
							.filter(function(item){
								return (new Date(item.startDate) > new Date()); })
							.sort(function(item1, item2){
								return (
									(new Date(item1.startDate) < new Date(item2.startDate)) ? -1 :
									(new Date(item1.startDate) > new Date(item2.startDate)) ? +1 :
									0);
							})[0];
					}

					raceSettings = {
						raceId	: race.id,
						twa		: (urlParams["twa"] !== undefined) ? parseFloat(urlParams["twa"]).fix(0) : _defaultSettings.twa,
						tws		: (urlParams["tws"] !== undefined) ? parseFloat(urlParams["tws"]).fix(2) : _defaultSettings.tws,
						options	: {
							light	: (urlParams["light"] !== undefined)	? parseBool(urlParams["light"])	: _defaultSettings.options.light,
							reach	: (urlParams["reach"] !== undefined)	? parseBool(urlParams["reach"])	: _defaultSettings.options.reach,
							heavy	: (urlParams["heavy"] !== undefined)	? parseBool(urlParams["heavy"])	: _defaultSettings.options.heavy,
							foil	: (urlParams["foil"]  !== undefined)	? parseBool(urlParams["foil"])	: _defaultSettings.options.foil,
							hull	: (urlParams["hull"]  !== undefined)	? parseBool(urlParams["hull"])	: _defaultSettings.options.hull
						}
					};
				}
				else {
					raceSettings = {
						raceId	: raceSettings.raceId.toString(),
						twa		: (urlParams["twa"] !== undefined) ? parseFloat(urlParams["twa"]).fix(0) : raceSettings.twa,
						tws		: (urlParams["tws"] !== undefined) ? parseFloat(urlParams["tws"]).fix(2) : raceSettings.tws,
						options	: {
							light	: (urlParams["light"] !== undefined)	? parseBool(urlParams["light"])	: raceSettings.options.light,
							reach	: (urlParams["reach"] !== undefined)	? parseBool(urlParams["reach"])	: raceSettings.options.reach,
							heavy	: (urlParams["heavy"] !== undefined)	? parseBool(urlParams["heavy"])	: raceSettings.options.heavy,
							foil	: (urlParams["foil"]  !== undefined)	? parseBool(urlParams["foil"])	: raceSettings.options.foil,
							hull	: (urlParams["hull"]  !== undefined)	? parseBool(urlParams["hull"])	: raceSettings.options.hull
						}
					};
				}

				PolarsStorage.merge({
					appSettings	: {
						selectedRaceId	: raceSettings.raceId
					},
					races : [ raceSettings ]
				});

				_currentRace	= _races.find(function(item){
					return (item.id === raceSettings.raceId); });
				_currentBoat	=
					_boats.find(function(item){
						return (item.id === _currentRace.boatId); })
					||
					_boats.find(function(item){
						return (item.id === "unknown"); });
				_current_twa	= raceSettings.twa;
				_current_tws	= raceSettings.tws;
				_chk_opt_light	= raceSettings.options.light;
				_chk_opt_reach	= raceSettings.options.reach;
				_chk_opt_heavy	= raceSettings.options.heavy;
				_chk_opt_foil	= raceSettings.options.foil;
				_chk_opt_hull	= raceSettings.options.hull;

				_chk_spd_overlay	= data.appSettings.showSpdOverlay;
				_chk_vmg_overlay	= data.appSettings.showVMGOverlay;
				_chk_foils_overlay	= data.appSettings.showFoilsOverlay;
			}
		}
		catch (e) {
			console.error("Error while retrieving User Data : ", e);
		}
	}
	function parseQueryString(param) {
		/**
		 * Returns the URL parameters as a map of key-values.
		 * Value contains null if no value is given in the URL for a given parameter.
		 * If 'param' argument is provided (optional), then its value is returned only.
		 *    Otherwise, the whole array is returned.
		 *
		 * See 'URLSearchParams API' to refine this function :
		 *    https://developers.google.com/web/updates/2016/01/urlsearchparams
		 **/
		var str = window.location.search;
		var objURL = {};
		str.replace(
			new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
			function( $0, $1, $2, $3 ){
				objURL[ $1 ] = $3 === undefined ? null : $3;
			}
		);
		if (param !== undefined) return objURL[param];
		return objURL;
	}
	function buildRacesSelector() {
		try {
			//Removes previous races in the list
			$("#race_selection .race").off().remove();

			var arrClosed = [], arrProgress = [], arrIncoming = [];
			var arrHiddenProgress = [], arrHiddenIncoming = [];

			var now = new Date();
			var threeDaysLater = new Date();
				threeDaysLater.setDate( now.getDate() + 3 );

			var data = PolarsStorage.get();


			////////////////////////////////////
			//Building arrays...
			var arrRaces = $.extend(true, [], _races);
			for (var x in arrRaces) {
				var race	= arrRaces[x];
				var dtStart	= new Date(race.startDate);
				var dtEnd	= new Date(race.endDate);

				//Looks in local storage if race is known to be hidden by user
				var raceSettings = data.races.find(function(item){
					return (item.raceId === race.id); });

				//Races closed
				if ((race.endDate !== "") && (dtEnd <= now)) {
					if (race.show !== true) continue;
					arrClosed.push(race);
				}

				//Races incoming
				else if ((race.startDate !== "") && (dtStart > now)) {
					if (race.show !== true) continue;
					race.archivedByUser		= (raceSettings !== undefined && raceSettings.archivedByUser === true);
					race.additionalClass	= "incoming";

					//Hidding races further than 30 days ahead
					var dtStartMin30days = new Date(dtStart);
						dtStartMin30days.setDate(dtStartMin30days.getDate() - 30);

					if (race.archivedByUser || dtStartMin30days >= now) {
						arrHiddenIncoming.push(race);
					}
					else {
						arrIncoming.push(race);
					}
				}

				//Races in progress
				else {
					if (race.show !== true) continue;
					race.archivedByUser		= (raceSettings !== undefined && raceSettings.archivedByUser === true);
					race.additionalClass	= (dtEnd <= threeDaysLater) ? "closing" : "racing";

					if (race.archivedByUser) {
						arrHiddenProgress.push(race);
					}
					else {
						arrProgress.push(race);
					}
				}
			}


			////////////////////////////////////
			//Adding races' thumbnails...

			//Closed races
			if (arrClosed.length === 0) {
				$("#race_selection select optgroup[label='Closed races']"     )
					.append("<option disabled>None so far...</option>");
			}
			else {
				arrClosed
					.sort(function(item1, item2) {
						return (
							(new Date(item1.endDate) < new Date(item2.endDate)) ? -1 :
							(new Date(item1.endDate) > new Date(item2.endDate)) ? +1 :
							0
						);
					})
					.forEach(function(item, idx){
						var boat = _boats.find(function(b){ return (b.id === item.boatId); });
						$("#race_selection select optgroup[label='Closed races']").append(
							"<option value='" + item.id + "'>" + item.name + "</option>" );
						$("#race_selection .races_closed").append(
							"<div class='race'>" +
								"<div class='imgbtn' data-race='" + item.id + "' title='" + item.name + " (" + boat.name + ")'></div>" +
								item.shortName +
							"</div>");
					});
			}

			//Races displayed. Limiting to "MAX_DISPLAYED" thumbnails at the same time...
			var MAX_DISPLAYED	= 6;
			var iCptDisplayed	= 0;

			//Races in progress
			if (arrProgress.length === 0) {
				$("#race_selection select optgroup[label='Races in progress']")
					.append("<option disabled>None so far...</option>");
			}
			else {
				arrProgress
					.sort(function(item1, item2) {
						return (
							(new Date(item1.endDate) < new Date(item2.endDate)) ? -1 :
							(new Date(item1.endDate) > new Date(item2.endDate)) ? +1 :
							0
						);
					})
					.forEach(function(item, idx){
						var boat = _boats.find(function(b){ return (b.id === item.boatId); });
						$("#race_selection select optgroup[label='Races in progress']").append(
							"<option value='" + item.id + "'>" + item.name + "</option>" );

						if (iCptDisplayed < MAX_DISPLAYED) {
							iCptDisplayed++;
							$("#race_selection .races_in_progress").append(
								"<div class='race " + item.additionalClass + "'>" +
									"<div class='imgbtn' data-race='" + item.id + "' title='" + item.name + " (" + boat.name + ")'></div>" +
									item.shortName +
								"</div>");
						}
						else {
							arrHiddenProgress.push(item);
						}
					});
			}

			//Incoming races
			if (arrIncoming.length === 0) {
				$("#race_selection select optgroup[label='Races to come']"    )
					.append("<option disabled>None so far...</option>");
			}
			else {
				arrIncoming
					.sort(function(item1, item2) {
						return (
							(new Date(item1.startDate) < new Date(item2.startDate)) ? -1 :
							(new Date(item1.startDate) > new Date(item2.startDate)) ? +1 :
							0
						);
					})
					.forEach(function(item, idx){
						var boat = _boats.find(function(b){ return (b.id === item.boatId); });
						$("#race_selection select optgroup[label='Races to come']").append(
							"<option value='" + item.id + "'>" + item.name + "</option>" );

						if (iCptDisplayed < MAX_DISPLAYED) {
							iCptDisplayed++;
							$("#race_selection .races_incoming").append(
								"<div class='race incoming'>" +
									"<div class='imgbtn' data-race='" + item.id + "' title='" + item.name + " (" + boat.name + ")'></div>" +
									item.shortName +
								"</div>");
						}
						else {
							arrHiddenIncoming.push(item);
						}
					});
			}

			//Hidden races
			if (arrHiddenProgress.length !== 0) {
				arrHiddenProgress
					.sort(function(item1, item2) {
						return (
							(new Date(item1.endDate) < new Date(item2.endDate)) ? -1 :
							(new Date(item1.endDate) > new Date(item2.endDate)) ? +1 :
							0
						);
					})
					.forEach(function(item, idx) {
						var boat = _boats.find(function(b){ return (b.id === item.boatId); });
						$("#race_selection select optgroup[label='Races in progress']").append(
							"<option value='" + item.id + "'>" + item.name + "</option>" );

						$("#race_selection .races_hidden").append(
							"<div class='race " + item.additionalClass + "'>" +
								"<div class='imgbtn' data-race='" + item.id + "' title='" + item.name + " (" + boat.name + ")'></div>" +
								item.shortName +
							"</div>");
					});
			}

			if (arrHiddenIncoming.length !== 0) {
				arrHiddenIncoming
					.sort(function(item1, item2) {
						return (
							(new Date(item1.startDate) < new Date(item2.startDate)) ? -1 :
							(new Date(item1.startDate) > new Date(item2.startDate)) ? +1 :
							0
						);
					})
					.forEach(function(item, idx) {
						var boat = _boats.find(function(b){ return (b.id === item.boatId); });
						$("#race_selection select optgroup[label='Races to come']").append(
							"<option value='" + item.id + "'>" + item.name + "</option>" );

						$("#race_selection .races_hidden").append(
							"<div class='race " + item.additionalClass + "'>" +
								"<div class='imgbtn' data-race='" + item.id + "' title='" + item.name + " (" + boat.name + ")'></div>" +
								item.shortName +
							"</div>");
					});
			}

			var arrHiddenRaces = (arrHiddenProgress.concat(arrHiddenIncoming)).map(function(item, idx) { return item.id; });
			PolarsStorage.setTemp(arrHiddenRaces);

			//Display/Hide Hidden races counter
			var iCptHidden = arrHiddenRaces.length;
			if (iCptHidden === 0) {
				$(".races_hidden_counter").empty().addClass('none');
			}
			else {
				$(".races_hidden_counter").text("+" + iCptHidden + " races").removeClass('none');
			}

			if (arrIncoming.length === 0 && arrProgress.length === 0) {
				$("#race_selection .archives_selector").addClass("no_active_races");
			}
			else {
				$("#race_selection .archives_selector").removeClass("no_active_races");
			}


			//Adds the images and the click event on the Races buttons
			$("#race_selection .imgbtn").map(function(i, el) {
				$(el)
					.css("background-image", "url(data/races/" + $(el).data("race") + ".jpg)")
					.off().click(function(){
						if ($("#race_selection").is(".disabled")) return;
						$("#race_selection select").val( $(el).data("race") ).trigger("change");
					});
			});


			//Builds the Races Closed & Hidden Banner display
			$("#race_selection .archives_selector .imgbtn").off().click(function(){
				if ($("#race_selection").is(".disabled")) return;
				$("#race_selection .races_closed").show();
				$("#race_selection .races_hidden").hide();
				$("#race_selection .hidden_races_banner").fadeIn();

				$("#race_selection .hidden_races_banner").off().click(function(){
					$(document).off("keydown");
					$("#race_selection .hidden_races_banner").fadeOut();
				});
				$(document).keydown(function(ev){
					//[ESC] Key pressed
					if (!ev.ctrlKey && !ev.altKey && !ev.shiftKey && ev.keyCode === 27) {
						$(document).off("keydown");
						$("#race_selection .hidden_races_banner").fadeOut();
					}
				});
			});
			$("#race_selection .races_hidden_counter").off().click(function(){
				if ($("#race_selection").is(".disabled")) return;
				$("#race_selection .races_closed").hide();
				$("#race_selection .races_hidden").show();
				$("#race_selection .hidden_races_banner").fadeIn();

				$("#race_selection .hidden_races_banner").off().click(function(){
					$(document).off("keydown");
					$("#race_selection .hidden_races_banner").fadeOut();
				});
				$(document).keydown(function(ev){
					//[ESC] Key pressed
					if (!ev.ctrlKey && !ev.altKey && !ev.shiftKey && ev.keyCode === 27) {
						$(document).off("keydown");
						$("#race_selection .hidden_races_banner").fadeOut();
					}
				});
			});
		}
		catch (e) {
			console.error("Error while building races selector : ", e);
		}
	}
	function selectRace(raceId) {
		try {
			var data			= PolarsStorage.get();
			var arrHiddenRaces	= PolarsStorage.getTemp();
			var isHidden		= arrHiddenRaces.includes(raceId);

			var raceSettings = data.races.find(function(item){
				return (item.raceId === raceId); });
			if (raceSettings === undefined) {
				var race = _races.find(function(item){
					return (item.id === raceId); });
				if (race === undefined) {
					race = _races
						.filter(function(item){
							return (new Date(item.startDate) > new Date()); })
						.sort(function(item1, item2){
							return (
								(new Date(item1.startDate) < new Date(item2.startDate)) ? -1 :
								(new Date(item1.startDate) > new Date(item2.startDate)) ? +1 :
								0);
						})[0];
				}

				raceSettings = {
					raceId	: race.id.toString(),
					twa		: _defaultSettings.twa,
					tws		: _defaultSettings.tws,
					options	: _defaultSettings.options
				};
			}
			PolarsStorage.merge({
				appSettings	: {
					selectedRaceId	: raceSettings.raceId
				},
				races : [ raceSettings ]
			});

			_currentRace	= _races.find(function(item){
				return (item.id === raceSettings.raceId); });
			_currentBoat	=
				_boats.find(function(item){
					return (item.id === _currentRace.boatId); })
				||
				_boats.find(function(item){
					return (item.id === "unknown"); });
			_current_twa	= raceSettings.twa;
			_current_tws	= raceSettings.tws;
			_chk_opt_light	= raceSettings.options.light;
			_chk_opt_reach	= raceSettings.options.reach;
			_chk_opt_heavy	= raceSettings.options.heavy;
			_chk_opt_foil	= raceSettings.options.foil;
			_chk_opt_hull	= raceSettings.options.hull;

			clearMessages();

			//Updates the Race Selector
			$("#race_selection .imgbtn").removeClass("selected");
			$("#race_selection .races_hidden_counter").removeClass("selected");
			$("#race_selection .imgbtn[data-race='" + _currentRace.id + "']").addClass("selected");
			if (new Date(_currentRace.endDate) <= new Date()) {
				$("#race_selection .archives_selector .imgbtn").addClass("selected");
			}
			else if (raceSettings.archivedByUser || isHidden) {
				$("#race_selection .races_hidden_counter").addClass("selected");
			}

			//UI Data Elements
			$("#data_race_name"	).text(_currentRace.name			);
			$("#data_boat_name"	).text(_currentBoat.name			);
			$("#data_twa .val"	).text(_current_twa					);
			$("#data_tws"		).val (_current_tws					);
			$("#opt_light"		).prop("checked", _chk_opt_light	);
			$("#opt_reach"		).prop("checked", _chk_opt_reach	);
			$("#opt_heavy"		).prop("checked", _chk_opt_heavy	);
			$("#opt_foil"		).prop("checked", _chk_opt_foil		);
			$("#opt_hull"		).prop("checked", _chk_opt_hull		);

			//Updates the URL Parameters and Page title
			updateURL();

			//Builds the Route sidebox
			$("#data_race_route")
				.find(".from")
					.find(".img")
						.css("background-image",
							_currentRace.route.from.flag
								? "url(css/img/flags/" + _currentRace.route.from.flag + ".gif)"
								: ""
						).end()
					.find(".name").text(_currentRace.route.from.name).end()
					.end()
				.find(".to")
					.find(".img" )
						.css("background-image",
							_currentRace.route.to.flag
								? "url(css/img/flags/" + _currentRace.route.to.flag + ".gif)"
								: ""
						).end()
					.find(".name").text(_currentRace.route.to.name).end();

			//Hide/Restore buttons
			$("#hidebtn, #restorebtn").hide();
			var now		= new Date();
			var dtStart	= new Date(_currentRace.startDate);
			var dtEnd	= new Date(_currentRace.endDate);
			//if ((dtStart <= now) && (dtEnd >= now)) {
			if (dtEnd >= now) {
				if (raceSettings.archivedByUser === true) {
					$("#restorebtn").show();
				}
				else {
					$("#hidebtn").show();
				}
			}

			//Show Map link
			var rt	= _currentRace.route;
			var src	= (rt.from.lat && rt.from.lon)	? (rt.from.lat + "%2C" + rt.from.lon)	: "";
			var dst	= (rt.to.lat   && rt.to.lon)	? (rt.to.lat   + "%2C" + rt.to.lon)		: "";
			var cntr= (rt.center)					? ("map=" + rt.center + "&layers=T")	: "layers=T";
			$("#routebtn").attr("href", "https://www.openstreetmap.org/directions?route=" + src + "%3B" + dst + "#" + cntr);
			if (src === "" && dst === "")
				$("#routebtn").addClass("disabled").attr("title", "GPS Coordinates unavailable");
			else
				$("#routebtn").removeClass("disabled").attr("title", "Show Map");

			//Dims the unused sails
			$(".sail.LIGHT_JIB, .sail.LIGHT_GNK")
				.removeClass( _chk_opt_light ? "dim" : "")
				.addClass   (!_chk_opt_light ? "dim" : "");
			$(".sail.CODE_0")
				.removeClass( _chk_opt_reach ? "dim" : "")
				.addClass   (!_chk_opt_reach ? "dim" : "");
			$(".sail.STAYSAIL, .sail.HEAVY_GNK")
				.removeClass( _chk_opt_heavy ? "dim" : "")
				.addClass   (!_chk_opt_heavy ? "dim" : "");

			//Disables the Foil Overlay if option is unchecked
			$("#foils_overlay").prop("disabled", !$("#opt_foil").is(":checked"));

			showRaceCountdown();
			plotPolarsChart();
		}
		catch (e) {
			console.error("Error during race selection (" + raceId + ") : ", e);
		}
	}
	function updateURL() {
		try {
			var newURL = "";
			var urlParams = parseQueryString();

			for (var param in urlParams) {
				if (!_acceptedURLParams.includes(param)) {
					console.warn(
						  "Not supported URL Parameter : '" + param + "'.\n"
						+ "Only the following parameters are accepted : \n"
						+ _acceptedURLParams.join(", ")
					);
					continue;
				}

				newURL += "&" + param + "=" + (
					param === "race_id"	? _currentRace.id	:
					param === "twa"		? _current_twa		:
					param === "tws"		? _current_tws		:
					param === "light"	? _chk_opt_light	:
					param === "reach"	? _chk_opt_reach	:
					param === "heavy"	? _chk_opt_heavy	:
					param === "foil"	? _chk_opt_foil		:
					param === "hull"	? _chk_opt_hull		:
					urlParams[param]
				);
			}
			if (newURL.length !== 0) newURL = "?" + newURL.substring(1);

			$("head title").text("Polars Chart : " + _currentRace.name);
			window.history.replaceState({}, "", newURL);
		}
		catch (e) {
			console.error("Error while updating URL : ", e);
		}
	}
	function showRaceCountdown() {
		try {
			var dtStart	= new Date(_currentRace.startDate);
			var dtEnd	= new Date(_currentRace.endDate);
			var now		= new Date();

			var threeDaysLater = new Date();
				threeDaysLater.setDate( now.getDate() + 3 );

			var diff, nbD, nbH, nbM, nbS, nbMs, TZ;
			var data_event_title	= "Race information";
			var data_event_dt		= "No information to";
			var data_countdown		= "display right now";
			var data_class			= "";

			//Race Start information missing
			if (_currentRace.startDate === "") {
				data_event_title	= "Race start";
				data_event_dt		= "Start Date still unknown";
				data_countdown		= "Let's wait for it ;-)";
			}

			//Race incoming
			else if (now < dtStart) {
				var fmt = formatCountdown(_currentRace.startDate);
				data_event_title	= "Race start";
				data_event_dt		= fmt.data_event_dt;
				data_countdown		= fmt.data_countdown;
				data_class			= 'incoming';
				if (_currentRace.startDate.length !== 10)
					setTimeout(showRaceCountdown, 1000);
				if (fmt.changing_categ) {
					buildRacesSelector();
					selectRace(_currentRace.id);
				}
			}

			//Race in progress
			else if (now < dtEnd) {
				var fmt = formatCountdown(_currentRace.endDate);
				data_event_title	= "Race end";
				data_event_dt		= fmt.data_event_dt;
				data_countdown		= fmt.data_countdown;
				data_class			= (dtEnd <= threeDaysLater) ? 'closing' : 'racing';
				if (_currentRace.endDate.length !== 10)
					setTimeout(showRaceCountdown, 1000);
				if (fmt.changing_categ) {
					buildRacesSelector();
					selectRace(_currentRace.id);
				}
			}

			//Race closed
			else if (now > dtEnd) {
				data_event_dt	= "Race closed since";
				data_countdown	= dtEnd.toLocaleDateString() + " " + dtEnd.toLocaleTimeString();
			}

			//-------------------//
			$("#data_event_dt" ).text(data_event_dt);
			$("#data_countdown").text(data_countdown)
				.removeClass().addClass(data_class);
			if (data_event_title !== "")
				$("#data_event_title").text(data_event_title);
		}
		catch (e) {
			console.error("Error while updating race countdown : ", e);
		}
	}
	function formatCountdown(sDate) {
		var dt = new Date(sDate);
		var cd = getCountdown(dt);

		var fmt = {
			data_event_dt	: dt.toLocaleDateString() + (
				sDate.length === 10
					? ""
					: ", "	+ dt.toLocaleTimeString()
							+ " GMT" + (cd.TZ > 0 ? "+" : "-") + cd.TZ ),
			data_countdown	: "",
			changing_categ	: false
		}

		if (sDate.length !== 10) {
			fmt.data_countdown = ""
				+ (cd.D ? cd.D + " day" + (cd.D !== 1 ? "s" : "") + ", "	: "")
				+ (cd.H ? cd.H + " hr"  + (cd.H !== 1 ? "s" : "") + ", "	: "")
				+ (cd.M ? cd.M + " min, "									: "")
				+ (cd.S + " sec");
		}
		else {
			fmt.data_countdown = ""
				+ (cd.D + " day" + (cd.D !== 1 ? "s" : "") + " left");
		}

		if (!cd.D && !cd.H && !cd.M && cd.S <= 1) {
			fmt.changing_categ = true;
		}

		return fmt;
	}
	function getCountdown(datetime) {
		var cd		= {D:0, H:0, M:0, S:0, Ms:0, TZ:0};
		var now		= new Date();
		var diff	= datetime.getTime() - now.getTime();

		cd.D	= Math.floor(diff / (24 * 60 * 60 * 1000));	diff -= cd.D * (24 * 60 * 60 * 1000);
		cd.H	= Math.floor(diff / (	  60 * 60 * 1000)); diff -= cd.H * (	 60 * 60 * 1000);
		cd.M	= Math.floor(diff / (		   60 * 1000)); diff -= cd.M * (		  60 * 1000);
		cd.S	= Math.floor(diff / (				1000)); diff -= cd.S * (			   1000);
		cd.Ms	= diff;
		cd.TZ	= (datetime.getTimezoneOffset() / 60) * -1;

		return cd;
	}
	function plotPolarsChart() {
		try {
			var data = null;
			var sailsSelected = getSailsSelected();

			try {
				data = PolarsChart.plotChart(
					_current_twa,
					_current_tws,
					_currentBoat.id,
					(
						(_chk_opt_light	? "light,"	: "") +
						(_chk_opt_heavy	? "heavy,"	: "") +
						(_chk_opt_reach	? "reach,"	: "") +
						(_chk_opt_foil	? "foil,"	: "") +
						(_chk_opt_hull	? "hull,"	: "")
					).split(","),
					sailsSelected
				);
			}
			catch(e) {
				PolarsChart.clearChart();
				setErrorMessage(e);
				return;
			}

			_current_boatspeed	= data.current.speed;
			_current_vmg		= data.current.vmg;
			_foils_factor		= data.current.foilFactor;
			_foils_rate			= data.current.foilRate;
			_maxsp_twa			= data.max.twa;
			_maxsp_bs			= data.max.speed;
			_twa_up				= data.bestVMG.upwind.twa;
			_vmg_up				= data.bestVMG.upwind.vmg;
			_twa_down			= data.bestVMG.downwind.twa;
			_vmg_down			= data.bestVMG.downwind.vmg;


			$("#data_twa .val"		 ).text(_current_twa		);
			$("#data_boat_speed .val").text(_current_boatspeed	);
			$("#data_vmg .val"		 ).text(_current_vmg		);
			$("#data_tws"			 ).val (_current_tws		);
			$("#foils_factor"		 ).text(_foils_factor		);
			$("#foils_rate"			 ).text(_foils_rate			);
			$("#data_maxsp_twa"		 ).text(_maxsp_twa			);
			$("#data_maxsp_bs"		 ).text(_maxsp_bs			);
			$("#data_twa_up"		 ).text(_twa_up				);
			$("#data_vmg_up"		 ).text(_vmg_up				);
			$("#data_twa_down"		 ).text(_twa_down			);
			$("#data_vmg_down"		 ).text(_vmg_down			);

			$(".sail.JIB"		).next().next().text(data.sailsSpeeds.JIB		.fix(2, true));
			$(".sail.LIGHT_JIB"	).next().next().text(data.sailsSpeeds.LIGHT_JIB	.fix(2, true));
			$(".sail.STAYSAIL"	).next().next().text(data.sailsSpeeds.STAYSAIL	.fix(2, true));
			$(".sail.CODE_0"	).next().next().text(data.sailsSpeeds.CODE_0	.fix(2, true));
			$(".sail.SPI"		).next().next().text(data.sailsSpeeds.SPI		.fix(2, true));
			$(".sail.LIGHT_GNK"	).next().next().text(data.sailsSpeeds.LIGHT_GNK	.fix(2, true));
			$(".sail.HEAVY_GNK"	).next().next().text(data.sailsSpeeds.HEAVY_GNK	.fix(2, true));

			$(".sail").removeClass("selected");
			if (data.current.bestSail)
				$(".sail." + data.current.bestSail).addClass("selected");

			$("#data_maxsp_twa, #data_twa_up, #data_twa_down").removeClass("selected");
			if (_current_twa == _maxsp_twa)	$("#data_maxsp_twa").addClass("selected");
			if (_current_twa == _twa_up)	$("#data_twa_up"   ).addClass("selected");
			if (_current_twa == _twa_down)	$("#data_twa_down" ).addClass("selected");

			PolarsChart.showBoatSpeedOverlay(_chk_spd_overlay);
			PolarsChart.showVMGOverlay(_chk_vmg_overlay);
			PolarsChart.showFoilsOverlay(_chk_foils_overlay);
		}
		catch (e) {
			console.error("Error while plotting chart : ", e);
		}
	}
	function setTWA(delta, isAbsolute) {
		if (isNaN(delta))	delta = _defaultSettings.twa;
		else				delta = parseInt(delta);

		if (isAbsolute === true)
			_current_twa = (delta).fix(0);
		else
			_current_twa = (_current_twa + delta).fix(0);

			 if (_current_twa < 0  ) _current_twa = 0;
		else if (_current_twa > 180) _current_twa = 180;

		PolarsStorage.merge({
			races : [{
				raceId	: _currentRace.id.toString(),
				twa		: _current_twa
			}]
		});

		plotPolarsChart();

		//Updates the URL Parameters and Page title
		updateURL();
	}
	function setWindSpeed(delta, isAbsolute) {
		if (isNaN(delta))	delta = _defaultSettings.tws;
		else				delta = parseFloat(delta);

		if (isAbsolute)
			_current_tws = delta.fix();
		else
			_current_tws = (_current_tws + delta).fix();

			 if (_current_tws < 1 ) _current_tws = 1;
		else if (_current_tws > 70) _current_tws = 70;

		PolarsStorage.merge({
			races : [{
				raceId	: _currentRace.id.toString(),
				tws		: _current_tws
			}]
		});

		plotPolarsChart();

		//Updates the URL Parameters and Page title
		updateURL();
	}
	function setBoatOptions() {
		PolarsStorage.merge({
			races : [{
				raceId	: _currentRace.id.toString(),
				options	: {
					light	: ( _chk_opt_light	= $("#opt_light").is(":checked") ),
					heavy	: ( _chk_opt_heavy	= $("#opt_heavy").is(":checked") ),
					reach	: ( _chk_opt_reach	= $("#opt_reach").is(":checked") ),
					foil	: ( _chk_opt_foil	= $("#opt_foil"	).is(":checked") ),
					hull	: ( _chk_opt_hull	= $("#opt_hull"	).is(":checked") )
				}
			}]
		});

		//Disables the Foil Overlay if option is unchecked
		$("#foils_overlay").prop("disabled", !$("#opt_foil").is(":checked"));

		//Dims the unused sails
		$(".sail.LIGHT_JIB, .sail.LIGHT_GNK")
			.removeClass( _chk_opt_light ? "dim" : "")
			.addClass   (!_chk_opt_light ? "dim" : "");
		$(".sail.CODE_0")
			.removeClass( _chk_opt_reach ? "dim" : "")
			.addClass   (!_chk_opt_reach ? "dim" : "");
		$(".sail.STAYSAIL, .sail.HEAVY_GNK")
			.removeClass( _chk_opt_heavy ? "dim" : "")
			.addClass   (!_chk_opt_heavy ? "dim" : "");

		//Updates Plot All Sails Option, and replots chart
		setAllSailsCurvesOption();

		//Updates the URL Parameters and Page title
		updateURL();
	}
	function setAppSettings() {
		PolarsStorage.merge({
			appSettings : {
				showSpdOverlay	: ( _chk_spd_overlay	= $("#spdprj_overlay"	).is(":checked") ),
				showVMGOverlay	: ( _chk_vmg_overlay	= $("#vmg_overlay"		).is(":checked") ),
				showFoilsOverlay: ( _chk_foils_overlay	= $("#foils_overlay"	).is(":checked") )
			}
		});

		PolarsChart.showBoatSpeedOverlay(_chk_spd_overlay);
		PolarsChart.showVMGOverlay(_chk_vmg_overlay);
		PolarsChart.showFoilsOverlay(_chk_foils_overlay);
	}
	function setAllSailsCurvesOption() {
		$("#opt_plotfullcurves").parent().parent()
			.removeClass(!$("#opt_plotfullcurves").is(":checked") ? "showchks" : "")
			.addClass	( $("#opt_plotfullcurves").is(":checked") ? "showchks" : "");

		$(".sail input[type='checkbox']").map(function(idx, elm){
			$(elm).prop("checked", !$(elm).parent().is(".dim"));
		});

		plotPolarsChart();
	}
	function selectSailsCurves() {
		var sailsSelected = getSailsSelected();
		if (!sailsSelected.length) {
			$("#opt_plotfullcurves")
				.prop("checked", false)
				.parent().parent().removeClass("showchks");
		}

		plotPolarsChart();
	}
	function getSailsSelected() {
		var sailsSelected = [];
		if ($("#opt_plotfullcurves").is(":checked")) {
			$(".sail input[type='checkbox']:checked").parent().map(function(i, elm) {
				sailsSelected = sailsSelected.concat(
					$.makeArray(elm.classList).filter(function(str) {
						return ["JIB","LIGHT_JIB","STAYSAIL","CODE_0","SPI","LIGHT_GNK","HEAVY_GNK"].includes(str);
					})
				);
			});
		}
		return sailsSelected;
	}
	function registerEventHandlers() {
		//Race Selection Hidden Combobox
		$("#race_selection select").off().change(function(){
			selectRace(this.value);
		});

		//Hide/Restore Buttons
		$("#hidebtn").click(function(){
			var data = PolarsStorage.get();
			var raceSettings = data.races.find(function(item){
				return (item.raceId === _currentRace.id); });

			if (raceSettings === undefined) {
				raceSettings = $.extend({}, _defaultSettings, {
					raceId			: _currentRace.id.toString(),
					archivedByUser	: true
				});
			}
			else {
				raceSettings.archivedByUser = true;
			}

			PolarsStorage.merge({
				races : [raceSettings]
			});

			buildRacesSelector();
			selectRace(_currentRace.id);
		});
		$("#restorebtn").click(function(){
			var data = PolarsStorage.get();
			var raceSettings = data.races.find(function(item){
				return (item.raceId === _currentRace.id); });

			if (raceSettings === undefined) {
				raceSettings = $.extend({}, _defaultSettings, {
					raceId			: _currentRace.id.toString(),
					archivedByUser	: false
				});
			}
			else {
				raceSettings.archivedByUser = false;
			}

			PolarsStorage.merge({
				races : [raceSettings]
			});

			buildRacesSelector();
			selectRace(_currentRace.id);
		});

		//Reveal Race Permalink
		$("#linkbtn").off().click(function(){
			window.history.replaceState({}, "", "?" + _acceptedURLParams.join("&"));
			updateURL();
		});

		//TWA [-]/[+] Buttons
		$("#btn_twa_m1"		).off().click (function(){ setTWA(-1); });
		$("#btn_twa_p1"		).off().click (function(){ setTWA(+1); });

		//WindSpeed Field and Buttons
		$("#data_tws"		).off().change(function(){ setWindSpeed(this.value, true);	});
		$("#btn_setsp_m10"	).off().click (function(){ setWindSpeed(-1);				});
		$("#btn_setsp_m1"	).off().click (function(){ setWindSpeed(-0.1);				});
		$("#btn_setsp_p1"	).off().click (function(){ setWindSpeed(+0.1);				});
		$("#btn_setsp_p10"	).off().click (function(){ setWindSpeed(+1);				});

		//MaxSpeed / TWA Up / TWA Down Rows
		$("#data_maxsp_twa, #data_maxsp_bs").off().click(function(){ if ($(this).is(".disabled")) return true; setTWA(_maxsp_twa,	true); });
		$("#data_twa_up,    #data_vmg_up"  ).off().click(function(){ if ($(this).is(".disabled")) return true; setTWA(_twa_up,		true); });
		$("#data_twa_down,  #data_vmg_down").off().click(function(){ if ($(this).is(".disabled")) return true; setTWA(_twa_down,	true); });

		$("#opt_light"		).off().change(function(){ setBoatOptions(); });
		$("#opt_reach"		).off().change(function(){ setBoatOptions(); });
		$("#opt_heavy"		).off().change(function(){ setBoatOptions(); });
		$("#opt_foil"		).off().change(function(){ setBoatOptions(); });
		$("#opt_hull"		).off().change(function(){ setBoatOptions(); });

		//App Options Checkboxes
		$("#spdprj_overlay"	).off().change(function(){ setAppSettings(); });
		$("#vmg_overlay"	).off().change(function(){ setAppSettings(); });
		$("#foils_overlay"	).off().change(function(){ setAppSettings(); });

		//Sails Plot Options Checkboxes
		$("#opt_plotfullcurves"			).off().change(function(){ setAllSailsCurvesOption();	});
		$(".sail input[type='checkbox']").off().change(function(){ selectSailsCurves();			});

		//Chart Drag & Drop
		PolarsChart.registerDragNDrop(function(twa){ setTWA(twa, true); });

		//Reset Button
		$("#reset_stored_data").off().click(function(){
			if (!confirm(
				"You are about to remove every data currently stored on your browser.\n\n" +
				"Are you sure that you want to reset and reload the entire application ?")) return;

			PolarsStorage.remove();
			window.history.replaceState({}, "", window.location.origin + window.location.pathname);
			window.location.reload(true);
		});

		//Prevents defaut behavior on disabled links
		$("a").click(function(ev){
			if ($(ev.target).is(".disabled")) {
				ev.preventDefault();
			}
		});
	}


	////////////////////////////////////////
	return {
		initialize			: initialize,
		getVersions			: getVersions,
		enableCheckVersions	: enableCheckVersions,
		disableCheckVersions: disableCheckVersions
	};

})();
