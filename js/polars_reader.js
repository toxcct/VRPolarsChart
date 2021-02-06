//----------------------------------
// -> jQuery required for : $.ajax() and $.map()
//----------------------------------

var PolarsReader = (function() {
	var _sailsNames	= {
		"Jib"		: { "en":"Jib",					"fr":"Foc",					"es":"Foque"					},
		"JIB"		: { "en":"Jib",					"fr":"Foc",					"es":"Foque"					},
		"Spi"		: { "en":"Spi",					"fr":"Spi",					"es":"Spi"						},
		"SPI"		: { "en":"Spi",					"fr":"Spi",					"es":"Spi"						},
		"Staysail"	: { "en":"Staysail",			"fr":"Trinquette",			"es":"Trinquetilla"				},
		"STAYSAIL"	: { "en":"Staysail",			"fr":"Trinquette",			"es":"Trinquetilla"				},
		"LightJib"	: { "en":"Light jib",			"fr":"Génois léger",		"es":"Foque ligero"				},
		"LIGHT_JIB"	: { "en":"Light jib",			"fr":"Génois léger",		"es":"Foque ligero"				},
		"Code0"		: { "en":"Code 0",				"fr":"Code 0",				"es":"Código 0"					},
		"CODE_0"	: { "en":"Code 0",				"fr":"Code 0",				"es":"Código 0"					},
		"HeavyGnk"	: { "en":"Heavy Gennaker",		"fr":"Spi lourd",			"es":"Gennaker pesado"			},
		"HEAVY_GNK"	: { "en":"Heavy Gennaker",		"fr":"Spi lourd",			"es":"Gennaker pesado"			},
		"LightGnk"	: { "en":"Light Gennaker",		"fr":"Spi léger",			"es":"Gennaker ligero"			},
		"LIGHT_GNK"	: { "en":"Light Gennaker",		"fr":"Spi léger",			"es":"Gennaker ligero"			}
	};
	var _optionsNames = {
		"light"		: { "en":"Light wind sails",	"fr":"Voiles petit temps",	"es":"Velas para viento suave"	},
		"heavy"		: { "en":"Strong wind sails",	"fr":"Voiles de brise",		"es":"Velas para viento fuerte"	},
		"reach"		: { "en":"Reaching sail",		"fr":"Voile reaching",		"es":"Vela de través"			},
		"foil"		: { "en":"Foils",				"fr":"Foils",				"es":"Orzas"					},
		"hull"		: { "en":"Hull polish",			"fr":"Polish coque",		"es":"Cera para el casco"		}
	};
	var _polars			= {};
	var _typesRetrieved = {};


	function getSpeeds(twa, tws, boatType, options) {
		if (twa === undefined || isNaN(twa))	throw new SyntaxError("Parameter 'twa' must be a positive number");
		if (tws === undefined || isNaN(tws))	throw new SyntaxError("Parameter 'tws' must be a positive number");
		if (!boatType)			throw new SyntaxError("Parameter 'boatType' is mandatory");
		if (!options)			options = [];

		var sError = null;

		//Loading relevant polars regarding boatType.
		//If already retrieved, using cached data.
		if (_typesRetrieved[boatType] === undefined) {
			_polars = {};
			$.ajax({
				async	: false,
				cache	: false,
				dataType: "json",
				url		: "data/boats/" + boatType + ".json",
				success	: function(data){
					_typesRetrieved[boatType] = _polars = data;
				},
				error	: function(xhr, status, err){
					sError = "Cannot retrieve polar resources for boat type '" + boatType + "' (" + err + ")";
				}
			});
		}
		else {
			_polars = _typesRetrieved[boatType];
		}

		if (sError !== null) {
			throw new TypeError(sError);
		}

		return {
			best		: theoreticalSpeed(twa, tws, options),
			all			: allSailsSpeeds(twa, tws, options)
		};
	}
	function getFoilRange() {
		return {
			twaMerge	: _polars.foil.twaMerge,
			twaMin		: _polars.foil.twaMin,
			twaMax		: _polars.foil.twaMax,
			speedRatio	: _polars.foil.speedRatio
		};
	}
	function theoreticalSpeed(twa, tws, options) {
		var globalFactor= _polars.globalSpeedRatio;
		var foilFactor	= foilingFactor(options, tws, twa, _polars.foil);
		var foilRate	= (foilFactor - 1.0) * 100 / (_polars.foil.speedRatio - 1.0);
		var hullFactor	= hullingFactor(options, _polars.hull);
		var twsLookup	= fractionStep(tws, _polars.tws);
		var twaLookup	= fractionStep(twa, _polars.twa);
		var speed		= maxSpeed(options, twsLookup, twaLookup, _polars.sail);
		var totalSpeed	= speed.speed * foilFactor * hullFactor * globalFactor;

		return {
			speed		: roundTo(totalSpeed, 3),
			vmg			: roundTo(totalSpeed * Math.cos(twa * Math.PI/180), 3),
			sail		: speed.sail,
			foilFactor	: roundTo(foilFactor, 3),
			foilRate	: roundTo(foilRate, 1)
		};
	}
	function allSailsSpeeds(twa, tws, options) {
		var globalFactor= _polars.globalSpeedRatio;
		var foilFactor	= foilingFactor(options, tws, twa, _polars.foil);
		var hullFactor	= hullingFactor(options, _polars.hull);
		var twsLookup	= fractionStep(tws, _polars.tws);
		var twaLookup	= fractionStep(twa, _polars.twa);
		var speeds		= sailsSpeeds(options, twsLookup, twaLookup, _polars.sail);

		$.map(speeds, function(val, key){
			speeds[key] = roundTo(val * foilFactor * hullFactor * globalFactor, 3);
		});

		return speeds;
	}
	function foilingFactor(options, tws, twa, foil) {
		var speedSteps	= [0, foil.twsMin - foil.twsMerge, foil.twsMin, foil.twsMax,  foil.twsMax + foil.twsMerge, Infinity];
		var twaSteps	= [0, foil.twaMin - foil.twaMerge, foil.twaMin, foil.twaMax,  foil.twaMax + foil.twaMerge, Infinity];
		var foilMat		= [
			[1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1],
			[1, 1, foil.speedRatio, foil.speedRatio, 1, 1],
			[1, 1, foil.speedRatio, foil.speedRatio, 1, 1],
			[1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1]
		];

		if (options.includes("foil")) {
			var iS = fractionStep(tws, speedSteps);
			var iA = fractionStep(twa, twaSteps);
			return bilinear(
					iA.fraction, iS.fraction,
					foilMat[iA.index - 1][iS.index - 1],
					foilMat[iA.index	][iS.index - 1],
					foilMat[iA.index - 1][iS.index	  ],
					foilMat[iA.index	][iS.index	  ]
				);
		}
		else {
			return 1.0;
		}
	}
	function hullingFactor(options, hull) {
		if (options.includes("hull")) {
			return hull.speedRatio;
		}
		else {
			return 1.0;
		}
	}
	function fractionStep(value, steps) {
		var absVal	= Math.abs(value);
		var index	= 0;
		while (index < steps.length && steps[index]<= absVal) {
			index++;
		}

		if (index >= steps.length) {
			return {
				index	: steps.length-1,
				fraction: 1
			};
		}

		return {
			index	: index,
			fraction: (absVal - steps[index-1]) / (steps[index] - steps[index-1])
		};
	}
	function maxSpeed(options, iS, iA, sailDefs) {
		var maxSpeed	= 0;
		var maxSail		= "";
		for (const sailDef of sailDefs) {
			if ((sailDef.name === "Jib")										||
				(sailDef.name === "Spi")										||
				(sailDef.name === "Staysail"	&& options.includes("heavy"))	||
				(sailDef.name === "LightJib"	&& options.includes("light"))	||
				(sailDef.name === "Code0"		&& options.includes("reach"))	||
				(sailDef.name === "HeavyGnk"	&& options.includes("heavy"))	||
				(sailDef.name === "LightGnk"	&& options.includes("light")) ) {
				var speeds	= sailDef.speed;
				var speed	= bilinear(
						iA.fraction, iS.fraction,
						speeds[iA.index - 1	][iS.index - 1],
						speeds[iA.index		][iS.index - 1],
						speeds[iA.index - 1	][iS.index	  ],
						speeds[iA.index		][iS.index	  ]
					);

				if (speed > maxSpeed) {
					maxSpeed	= speed;
					maxSail		= sailDef.name;
				}
			}
		}

		return {
			speed	: maxSpeed,
			sail	: maxSail
		};
	}
	function sailsSpeeds(options, iS, iA, sailDefs) {
		var retSpeeds = {};

		for (const sailDef of sailDefs) {
			if ((sailDef.name === "Jib"			) ||
				(sailDef.name === "Spi"			) ||
				(sailDef.name === "Staysail"	) ||
				(sailDef.name === "LightJib"	) ||
				(sailDef.name === "Code0"		) ||
				(sailDef.name === "HeavyGnk"	) ||
				(sailDef.name === "LightGnk"	) ) {
				var speeds	= sailDef.speed;
				var speed	= bilinear(
						iA.fraction, iS.fraction,
						speeds[iA.index - 1	][iS.index - 1],
						speeds[iA.index		][iS.index - 1],
						speeds[iA.index - 1	][iS.index	  ],
						speeds[iA.index		][iS.index	  ]
					);

				retSpeeds[sailDef.name] = speed;
			}
		}

		return retSpeeds;
	}
	function roundTo(number, digits) {
		if (number !== undefined && !isNaN(number)) {
			var scale = Math.pow(10, digits);
			return Math.round(number * scale) / scale;
		}
		else {
			throw new EvalError("Could not evaluate '" + number + "' to a proper number");
		}
	}
	function bilinear(x, y, f00, f10, f01, f11) {
		return f00 * (1 - x) * (1 - y)
			 + f10 * 	  x  * (1 - y)
			 + f01 * (1 - x) *		y
			 + f11 * 	  x  *		y;
	}


	////////////////////////////////////////
	return {
		sailsNames		: _sailsNames,
		optionsNames	: _optionsNames,
		getSpeeds		: getSpeeds,
		getFoilRange	: getFoilRange,
		foilingFactor	: foilingFactor,
		hullingFactor	: hullingFactor
	};

	//---------------------------------
	// Structure of data returned:
	//---------------------------------
	// * PolarsReader.getSpeeds()
	//	{
	//		best: {
	//			speed		: <Number>,
	//			vmg			: <Number>,
	//			sail		: <String#SailId>,
	//			foilFactor	: <Number>,
	//			foilRate	: <Number>
	//		},
	//		all	: [
	//			<String#SailId> : <Number>
	//		]
	//	}
	//
	// * PolarsReader.getFoilRange()
	//	{
	//		twaMerge	: <Number>,
	//		twaMin		: <Number>,
	//		twaMax		: <Number>,
	//		speedRatio	: <Number>
	//	}
	//---------------------------------

})();
