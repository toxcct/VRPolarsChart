var PolarsStorage = (function(){
	//---------------------------------
	// Structure of data stored :
	//---------------------------------
	//{
	//	version		: <String>,
	//	appSettings	: {
	//		selectedRaceId	: <String>,
	//		showSpdOverlay	: <Boolean>,
	//		showVMGOverlay	: <Boolean>,
	//		showFoilsOverlay: <Boolean>
	//	},
	//	races : [
	//		{
	//			raceId			: <String>
	//			twa				: <Number>
	//			tws				: <Number>
	//			archivedByUser	: <Boolean>
	//			options			: {
	//				light	: <Boolean>
	//				reach	: <Boolean>
	//				heavy	: <Boolean>
	//				foil	: <Boolean>
	//				hull	: <Boolean>
	//			}
	//		}
	//	]
	//}
	//---------------------------------
	var _storedUserData = {};


	function get() {
		if (window.localStorage)
			_storedUserData =
				JSON.parse(localStorage.getItem("data")) || {};
		return _storedUserData;
	}
	function set(data, noSave) {
		_storedUserData = data;
		if (noSave === false) return;
		save();
	}
	function merge(data, noSave) {
		var newRacesSettings = [];
		if (_storedUserData.races)
			//newRacesSettings = _storedUserData.races.slice(0);
			newRacesSettings = (function(){
				var newArray = [];
				for (var i in _storedUserData.races) {
					newArray.push($.extend(true, {}, _storedUserData.races[i]));
				}
				return newArray;
			})();

		if (data && data.races) {
			for (var x in data.races) {
				var newRaceSettings	= $.extend(true, {}, data.races[x]);
				var oldRaceSettings	= newRacesSettings.find(function(item){
					return (item.raceId === newRaceSettings.raceId); });

				if (oldRaceSettings === undefined) {
					newRacesSettings.push($.extend(true, {}, newRaceSettings));
				}
				else {
					var idx = newRacesSettings.findIndex(function(item){
						return (item.raceId === newRaceSettings.raceId); });
					newRacesSettings[idx] = $.extend(true, {}, oldRaceSettings, newRaceSettings);
				}
			}
		}

		$.extend(true, _storedUserData, data);
		_storedUserData.races = newRacesSettings;

		if (noSave === false) return;
		save();
	}
	/*private*/function save() {
		if (window.localStorage)
			localStorage.setItem("data", JSON.stringify(_storedUserData));
	}
	function remove() {
		if (window.localStorage)
			localStorage.removeItem("data");
	}
	function isEmpty() {
		if (window.localStorage)
			return (localStorage.getItem("data") === null);
		else
			return true;
	}

	function getTemp() {
		return JSON.parse(sessionStorage.getItem("data")) || [];
	}
	function setTemp(dataArray) {
		if (window.sessionStorage)
			sessionStorage.setItem("data", JSON.stringify(dataArray));
	}


	////////////////////////////////////////
	return {
		isEmpty	: isEmpty,
		get		: get,
		set		: set,
		merge	: merge,
		remove	: remove,
		getTemp	: getTemp,
		setTemp	: setTemp
	};

})();
