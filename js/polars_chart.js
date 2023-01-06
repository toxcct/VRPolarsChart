//----------------------------------
// -> jQuery required for : $()
//----------------------------------

var PolarsChart = (function(){
	var _chartRadius		= 280;
	var _leftOffset			= 30.5;
	var _topOffset			= 60.5;//20.5;
	var _chartScale			= {
		graduationValue	: 5,
		nbGraduations	: 5,
		max				: 25
	};
	var _sailsColors		= {
		"Jib"			: "#cd0342",
		"Spi"			: "#00ff00",
		"Staysail"		: "#0000ff",
		"LightJib"		: "#f67876",
		"Code0"			: "#00a000",
		"HeavyGnk"		: "#b00000",
		"LightGnk"		: "#d77900"
	};

	var _polarsData			= [];
	var _currentResultset	= {};
	var _maxFoilFactor		= 1;

	var _twa = 0, _tws = 0, _boatType = "", _options = [];
	var _callback = null;


	function getGraphLayer(canvasId) {
		//Get Canvas context for direct painting
		return $("#"+canvasId)[0].getContext("2d");
	}
	function refreshLayer(canvasId) {
		//Hack to force refreshing a canvas element
		$("#"+canvasId)[0].width = $("#"+canvasId).width();
	}
	function refreshGraph() {
		refreshLayer("polars_chart_scale");
		refreshLayer("polars_chart_vmg");
		refreshLayer("polars_chart_vmgprj");
		refreshLayer("polars_chart_spdprj");
		refreshLayer("polars_chart_foils");
		refreshLayer("polars_chart_data");
		refreshLayer("polars_chart_twa");
	}
	function clearChart() {
		//Public shorthand for graph cleanup
		refreshGraph();
	}
	function getDataArray(twa, tws, boatType, options) {
		//For performances reasons, do not reprocess the whole loop until TWS changes, or on page load
		var recalcVMGs = (
				(_currentResultset.current				=== undefined)	||
				(_currentResultset.current.__tws		!== tws)		||
				(_currentResultset.current.__boatType	!== boatType)	||
				(_currentResultset.current.__options	!== options)
		);

		if (recalcVMGs) {
			_polarsData			= [];
			_currentResultset	= {
				max		: {
					twa		: 0,
					speed	: 0
				},
				bestVMG	: {
					upwind	: {
						twa	: 0,
						vmg	: 0
					},
					downwind: {
						twa	: 0,
						vmg	: 0
					}
				},
				current	: {
					speed		: 0,
					vmg			: 0,
					bestSail	: "",
					foilFactor	: 1,
					foilRate	: 0,
					//For internal use properties
					__twa		: 0,
					__tws		: 0,
					__boatType	: "",
					__options	: []
				},
				sailsSpeeds : null,
				autoSailChangeTolerance : 0,
			};
			_maxFoilFactor = 1;

			for (var i = 0; i <= 180; i = (i + 0.1).fix(1) ) {
				_polarsData[i] = PolarsReader.getSpeeds(i, tws, boatType, options);

				//Max Speed computation
				if (_polarsData[i].best.speed > _currentResultset.max.speed) {
					_currentResultset.max.speed	= _polarsData[i].best.speed;
					_currentResultset.max.twa	= i;
				}

				//Best VMG upwind/downwind computation
				if (_polarsData[i].best.vmg > _currentResultset.bestVMG.upwind.vmg) {
					_currentResultset.bestVMG.upwind.vmg = _polarsData[i].best.vmg;
					_currentResultset.bestVMG.upwind.twa = i;
				}
				else if (_polarsData[i].best.vmg <= _currentResultset.bestVMG.downwind.vmg) {
					_currentResultset.bestVMG.downwind.vmg	= _polarsData[i].best.vmg;
					_currentResultset.bestVMG.downwind.twa	= i;
				}

				//Foiling range
				if (_polarsData[i].best.foilFactor > _maxFoilFactor) {
					_maxFoilFactor = _polarsData[i].best.foilFactor;
				}
			}
			_currentResultset.autoSailChangeTolerance =  _polarsData[0].autoSailChangeTolerance;

		}
		else {
			_currentResultset.current = {
				speed		: 0,
				vmg			: 0,
				bestSail	: "",
				foilFactor	: 1,
				foilRate	: 0,
				//For internal use properties
				__twa		: 0,
				__tws		: 0,
				__boatType	: "",
				__options	: []
			};
		}

		//Invert Downwind VMG negative value (negative cosine)
		_currentResultset.bestVMG.downwind.vmg *= -1;

		//Add all sails speeds
		_currentResultset.sailsSpeeds = _polarsData[twa].all;

		//Add Current attitude
		_currentResultset.current = {
			speed		: _polarsData[twa].best.speed,
			vmg			: Math.abs(_polarsData[twa].best.vmg),
			bestSail	: _polarsData[twa].best.sail,
			foilFactor	: _polarsData[twa].best.foilFactor,
			foilRate	: _polarsData[twa].best.foilRate,
			__twa		: twa,
			__tws		: tws,
			__boatType	: boatType,
			__options	: options
		};
	}
	function radial(angle, radiusOffset, bHideLabel, ctx, addLabel, arrDashStyle) {
		var c = ctx || getGraphLayer("polars_chart_data");
		var R = _chartRadius;

		var ra = (angle - 90) * Math.PI/180;

		if (arrDashStyle && arrDashStyle.length == 2)
			c.setLineDash(arrDashStyle);
		else
			c.setLineDash([]);

		c.moveTo(0, 0);
		c.lineTo( Math.cos(ra)*(R + 5), Math.sin(ra)*(R + 5) );

		if (!bHideLabel)
			c.fillText(angle + (addLabel ? addLabel : ""), Math.cos(ra)*(R + radiusOffset), Math.sin(ra)*(R + radiusOffset));
	}
	function hsl2rgb(h, s, l) {
		h = h/360;	//in degrees
		s = s/100;	//in percents
		l = l/100;	//in percents

		var r, g, b;

		if (s == 0) {
			r = g = b = l; // achromatic
		}
		else {
			var hue2rgb = function hue2rgb(p, q, t) {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1/6) return p + (q - p) * 6 * t;
				if (t < 1/2) return q;
				if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
				return p;
			}

			var q = (l < 0.5) ? (l * (1 + s)) : (l + s - l * s);
			var p = 2 * l - q;
			r = hue2rgb(p, q, h + 1/3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1/3);
		}

		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
	function plotScale(maxSpeed) {
		var c = getGraphLayer("polars_chart_scale");
		var R = _chartRadius;

		c.lineWidth		= 0.4;
		c.fillStyle		= "rgba(0, 0, 0, 0.6)";
		c.strokeStyle	= "rgba(0, 0, 0, 0.6)";
		c.textBaseline	= "middle";
		c.translate(_leftOffset, R + _topOffset);

		//Radiuses
		c.beginPath();
		c.textAlign = "left";
		for (var i = 0; i <= 180; i += 10) {
			radial(i, 10, false, c, "°");
		};
		c.stroke();

		if (maxSpeed === undefined) maxSpeed = 20;
		_chartScale.graduationValue =
			maxSpeed <=  5 ? 1 :
			maxSpeed <= 10 ? 2 :
			maxSpeed <= 15 ? 3 :
			maxSpeed <= 20 ? 4 :
			maxSpeed <= 30 ? 5 : 10;
		_chartScale.nbGraduations =
			Math.ceil( (maxSpeed + 0.3) / _chartScale.graduationValue );
		_chartScale.max =
			_chartScale.graduationValue * _chartScale.nbGraduations;

		//Arcs
		c.textAlign = "right";
		c.fillText("0kt ", -2, 0);
		for (var i = 1; i <= _chartScale.nbGraduations; i++) {
			c.beginPath();
			c.arc(0, 0, R/_chartScale.nbGraduations * i, -Math.PI/2, +Math.PI/2, false);
			c.fillText((i * _chartScale.graduationValue) + "kts", -2, -R/_chartScale.nbGraduations * i);
			c.fillText((i * _chartScale.graduationValue) + "kts", -2, +R/_chartScale.nbGraduations * i);
			c.stroke();
		};
	}
	function plotData(sailsSelected) {
		var c = getGraphLayer("polars_chart_data");
		var R = _chartRadius;

		c.lineWidth = 1;
		c.translate(_leftOffset, R + _topOffset);

		if (!sailsSelected || !sailsSelected.length) {
			//Curve from best sails only

			var lastSail = -1;

			c.lineWidth = 2;
			c.save();
			c.beginPath();
			c.moveTo(0, 0);

			for (var twa = 0; twa <= 180; twa++) {
				var speed	= _polarsData[twa].best.speed;
				var bestSail= _polarsData[twa].best.sail;

				c.lineTo(0, -speed * R / _chartScale.max);

				if (bestSail !== lastSail) {
					c.stroke();

					lastSail = bestSail;
					c.strokeStyle = _sailsColors[lastSail];
					c.beginPath();
					c.lineTo(0, -speed * R / _chartScale.max);
				}

				c.rotate(Math.PI/180);
			};

			c.stroke();
			c.restore();
		}
		else {
			//All curves from selected sails

			sailsSelected.forEach(function(sailName, idx){
				var sailColor = _sailsColors[sailName];

				c.save();
				c.beginPath();
				c.moveTo(0, 0);
				c.strokeStyle = sailColor;
				c.fillStyle = sailColor + "1A";
				c.lineWidth = (sailName === _currentResultset.current.bestSail) ? 2 : 1;

				for (var twa = 0; twa <= 180; twa++) {
					var speed = _polarsData[twa].all[sailName];

					c.lineTo(0, -speed * R / _chartScale.max);
					//c.stroke();
					c.rotate(Math.PI/180);
				}

				c.stroke();
				c.fill();
				c.restore();
			});

		}

		c.lineWidth = 1;
	}
	function plotMaxValues(bRefreshLayer) {
		var c = getGraphLayer("polars_chart_vmg");
		var R = _chartRadius;

		if (bRefreshLayer) refreshLayer("polars_chart_vmg");

		c.translate(_leftOffset, R + _topOffset);

		//VMG Upwind red arc
		c.fillStyle = "rgba(255, 0, 0, 0.15)";
		c.beginPath();
		c.moveTo(0, 0);
		c.arc(0, 0, R, -Math.PI/2, _currentResultset.bestVMG.upwind.twa*Math.PI/180 - Math.PI/2, false);
		c.closePath();
		c.fill();

		//VMG Downwind red arc
		c.fillStyle = "rgba(255, 0, 0, 0.15)";
		c.beginPath();
		c.moveTo(0, 0);
		c.arc(0, 0, R, +Math.PI/2, _currentResultset.bestVMG.downwind.twa*Math.PI/180 - Math.PI/2, true);
		c.closePath();
		c.fill();

		//VMG radials
		c.fillStyle		= "red";
		c.strokeStyle	= "red";
		c.beginPath();
		radial(_currentResultset.bestVMG.upwind.twa,	25, false, c, "°", [3, 5]);
		radial(_currentResultset.bestVMG.downwind.twa,	25, false, c, "°", [3, 5]);
		c.stroke();

		//Max radial
		c.fillStyle		= "green";
		c.strokeStyle	= "green";
		c.beginPath();
		radial(_currentResultset.max.twa, 25, false, c, "°", [1, 3]);
		c.stroke();
	}
	function plotVMGProjection(bRefreshLayer) {
		var c = getGraphLayer("polars_chart_vmgprj");
		var R = _chartRadius;

		if (bRefreshLayer) refreshLayer("polars_chart_vmgprj");

		var spd	= _currentResultset.current.speed;
		var ra	= (_twa - 90) * Math.PI/180;

		c.setTransform(1, 0, 0, 1, 0, 0);
		c.translate(_leftOffset, R + _topOffset);

		//VMG Projection segment
		c.beginPath();
		c.lineWidth		= 1;
		c.strokeStyle	= "rgba(255, 0, 0, 1)";
		c.fillStyle		= "rgba(255, 0, 0, 1)";
		c.setLineDash([2, 2]);
		c.moveTo(0, Math.sin(ra)*(spd * R/_chartScale.max));
		c.lineTo(Math.cos(ra)*(spd * R/_chartScale.max), Math.sin(ra)*(spd * R/_chartScale.max));
		c.stroke();

		//Vertical Axis VMG Gauge
		c.beginPath();
		c.lineWidth	= 3;
		c.lineCap	= 'butt';
		c.setLineDash([]);
		c.strokeStyle = "rgba(255, 0, 0, 1)";
		c.moveTo(0, 0);
		c.lineTo(0, Math.sin(ra)*(spd * R/_chartScale.max));
		c.stroke();

		//Segment round ends
		c.beginPath();
		c.lineWidth		= 8;
		c.strokeStyle	= "rgba(255, 0, 0, 1)";
		c.lineCap		= 'round';
		c.moveTo(Math.cos(ra)*(spd * R/_chartScale.max), Math.sin(ra)*(spd * R/_chartScale.max));
		c.lineTo(Math.cos(ra)*(spd * R/_chartScale.max), Math.sin(ra)*(spd * R/_chartScale.max));
		c.stroke();
	}
	function plotBoatSpeedProjection(bRefreshLayer) {
		var c = getGraphLayer("polars_chart_spdprj");
		var R = _chartRadius;

		if (bRefreshLayer) refreshLayer("polars_chart_spdprj");

		var spd		= _currentResultset.current.speed;
		var sail	= _currentResultset.current.bestSail;
		var color	= _sailsColors[sail] + "99";
		var ra		= (_twa - 90) * Math.PI/180;

		c.setTransform(1, 0, 0, 1, 0, 0);
		c.translate(_leftOffset, R + _topOffset);

		//Boat Speed Projection arc
		c.beginPath();
		c.lineWidth		= 1;
		c.strokeStyle	= color; //"rgba(255, 120, 0, 0.6)";
		c.setLineDash([2, 2]);
		if (_twa <= 90)	c.arc(0, 0, (spd * R/_chartScale.max), -Math.PI/2, ra, false);
		else			c.arc(0, 0, (spd * R/_chartScale.max), +Math.PI/2, ra, true );
		c.stroke();

		//Vertical Axis MaxSpeed Gauge
		c.beginPath();
		c.lineWidth	= 5;
		c.lineCap	= 'butt';
		c.setLineDash([]);
		if (_twa <= 90) {
			//c.moveTo(0, Math.sin(ra)*(spd * R/_chartScale.max));
			c.moveTo(0, 0);
			c.lineTo(0, -spd * R/_chartScale.max);
		}
		else {
			//c.moveTo(0, Math.sin(ra)*(spd * R/_chartScale.max));
			c.moveTo(0, 0);
			c.lineTo(0, spd * R/_chartScale.max);
		}
		c.stroke();
	}
	function plotFoilRange(bRefreshLayer) {
		if (_maxFoilFactor === 1) return;

		var c = getGraphLayer("polars_chart_foils");
		var R = _chartRadius;

		if (bRefreshLayer) refreshLayer("polars_chart_foils");

		c.translate(_leftOffset, R + _topOffset);

		/*
		//Drawing full chart overlay
		for (var twa = 0; twa < 180; twa++) {
			var hue = -500 * _polarsData[twa].best.foilFactor + 560;

			c.beginPath();
			c.moveTo(0, 0);
			c.fillStyle = "hsla(" + hue + ", 100%, 50%, 0.50)";
			c.arc(0, 0, R, twa * Math.PI/180 - Math.PI/2, (twa+1) * Math.PI/180 - Math.PI/2, false);
			c.closePath();
			c.fill();
		}
		*/

		//Drawing peripheral arc overlay
		for (var twa = 0; twa < 180; twa++) {
			var hue = -500 * _polarsData[twa].best.foilFactor + 560;
			var angleStart	= (twa+0) * Math.PI/180 - Math.PI/2;
			var angleEnd	= (twa+1) * Math.PI/180 - Math.PI/2;

			c.beginPath();
			c.moveTo(0, 0);
			c.fillStyle = "hsla(" + hue + ", 100%, 50%, 1)";
			c.arc(0, 0, R+5,	angleStart,	angleEnd,	false);
			c.arc(0, 0, R-1,	angleEnd,	angleStart,	true);
			c.closePath();
			c.fill();
		}
	}
	function plotCurrentTWA(bRefreshLayer) {
		var c = getGraphLayer("polars_chart_twa");
		var R = _chartRadius;

		if (bRefreshLayer) refreshLayer("polars_chart_twa");

		//Radius line
		c.translate(_leftOffset, R + _topOffset);
		c.beginPath();
		c.fillStyle		= "blue";
		c.strokeStyle	= "blue";
		radial(_twa, 45, false, c, "° : " + _polarsData[_twa].best.speed.fix() + " kts");
		c.stroke();

		//Radius knob
		var ra = (_twa - 90) * Math.PI/180;
		c.lineWidth = 8;
		c.lineCap = 'round';
		c.beginPath();
		c.moveTo(Math.cos(ra)*(R+5), Math.sin(ra)*(R+5));
		c.lineTo(Math.cos(ra)*(R+5), Math.sin(ra)*(R+5));
		c.stroke();
	}
	function plotChart(twa, tws, boatType, options, sailsSelected) {
		_twa = twa, _tws = tws, _boatType = boatType, _options = options;

		getDataArray(_twa, _tws, _boatType, _options);

		refreshGraph();
		plotScale(_currentResultset.max.speed);
		plotData(sailsSelected);
		plotMaxValues();
		plotVMGProjection();
		plotBoatSpeedProjection();
		plotFoilRange();
		plotCurrentTWA();

		return _currentResultset;
	}
	function moveTWA(twa) {
		_twa = twa;

		//Add all sails speeds
		_currentResultset.sailsSpeeds = _polarsData[twa].all;

		//Add Current attitude
		_currentResultset.current = {
			speed		: _polarsData[twa].best.speed,
			vmg			: Math.abs(_polarsData[twa].best.vmg),
			bestSail	: _polarsData[twa].best.sail,
			foilFactor	: _polarsData[twa].best.foilFactor
		};

		plotCurrentTWA(true);
		plotVMGProjection(true);
		plotBoatSpeedProjection(true);

		return _currentResultset;
	}
	function moveTWS(tws) {
		_tws = tws;

		return plotChart(_twa, _tws, _boatType, _options);
	}
	function showVMGOverlay(bShowLayer) {
		(bShowLayer)
			? $("#polars_chart_vmgprj").show()
			: $("#polars_chart_vmgprj").hide();
	}
	function showBoatSpeedOverlay(bShowLayer) {
		(bShowLayer)
			? $("#polars_chart_spdprj").show()
			: $("#polars_chart_spdprj").hide();
	}
	function showFoilsOverlay(bShowLayer) {
		(bShowLayer)
			? $("#polars_chart_foils").show()
			: $("#polars_chart_foils").hide();
	}
	function dragNDropTWA(evt) {
		if (!evt) return;

		var pos = getMousePos(getGraphLayer("polars_chart_twa"), evt);
		var twa = Math.round(
			Math.atan2(
				pos.x - _leftOffset,
				_chartRadius + _topOffset - pos.y
			) * 180/Math.PI
		);

		//var data = moveTWA(twa);
		_callback.call(this, twa);
	}
	function getMousePos(layer, evt) {
		var rect = layer.canvas.getBoundingClientRect();
		return {
			x : evt.clientX - rect.left,
			y : evt.clientY - rect.top
		};
	}
	function cancelEvent(evt) {
		evt = evt || window.event;
		if (!evt.target) { return false; } //IE shit
		if (evt.target.tagName == "INPUT") { return true; }
		if (evt.preventDefault) { evt.preventDefault(); }
		if (evt.stopPropagation) { evt.stopPropagation(); }
		evt.cancelBubble = true;
		return false;
	}
	function registerDragNDrop(callback) {
		if (!(typeof callback === "function"))
			throw new TypeError("Function expected as a callback");

		_callback = callback;

		$("#polars_chart_twa").off().on("mousedown", function(evt){
			dragNDropTWA(evt);
			return true;
		});
		$("#polars_chart_twa").on("mouseup", function(evt){
			return true;
		});
		$("#polars_chart_twa").on("mousemove", function(evt){
			if (evt.buttons == 1) {
				dragNDropTWA(evt);
			}
			return true;
		});
		$("#polars_chart_twa").on("touchstart", function(evt){
			dragNDropTWA(evt.touches[0]);
			return cancelEvent(evt);
		});
		$("#polars_chart_twa").on("touchmove", function(evt){
			dragNDropTWA(evt.touches[0]);
			return cancelEvent(evt);
		});
	}


	////////////////////////////////////////
	return {
		plotChart			: plotChart,
		clearChart			: clearChart,
		moveTWA				: moveTWA,
		moveTWS				: moveTWS,
		showVMGOverlay		: showVMGOverlay,
		showBoatSpeedOverlay: showBoatSpeedOverlay,
		showFoilsOverlay	: showFoilsOverlay,
		registerDragNDrop	: registerDragNDrop
	};

	//---------------------------------
	// Structure of data returned:
	//---------------------------------
	// * PolarsChart.plotChart()
	// * PolarsChart.moveTWA()
	// * PolarsChart.moveTWS()
	//
	//	{
	//		max : {
	//			twa		: <Number>,
	//			speed	: <Number>
	//		},
	//		bestVMG : {
	//			upwind : {
	//				twa		: <Number>,
	//				speed	: <Number>
	//			},
	//			downwind : {
	//				twa		: <Number>,
	//				speed	: <Number>
	//			},
	//		},
	//		current : {
	//			speed		: <Number>,
	//			vmg			: <Number>,
	//			bestSail	: <String#sailId>,
	//			foilFactor	: <Number>
	//		},
	//		sailsSpeeds	: [
	//			<String#SailId> : <Number>
	//		],
	//		autoSailChangeTolerance : <Number>
	//	}
	//---------------------------------

})();
