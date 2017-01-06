function writeDebug(text) {
	var p = document.getElementById("content-text");
	var span = document.createElement("span");
	var tn = document.createTextNode(text);
	span.appendChild(tn);
	p.appendChild(document.createElement("br"));
	p.appendChild(span);
}

var classNames = [ "topleft", "toptopleft", "top", "toptopright", "topright",
		"righttop", "right", "bottomright", "bottombottomright" ];

var stopData = {};
var stops = [];
var currIx = 0;
var gpsWatchHandle = 0;
var oldPos = null;

function showStatusMessage(message) {
	var departs = document.getElementById("departs");
	clear(departs);
	var loading = document.createElement('tr');
	loading.appendChild(document.createTextNode(message));
	departs.appendChild(loading);
}

function makeStopSelector(ix, stopData) {
	var className = classNames[ix];

	var span = document.createElement("span");
	span.classList.add("edge");
	span.classList.add(className);

	if (ix == currIx) {
		span.classList.add("selected");
	}

	span.appendChild(document.createTextNode(stopData.code));

	var stops = document.getElementById("stops");
	stops.appendChild(span);

}

function doRequest(url, onready) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {

		if (xhr.readyState === 4) {
			if (xhr.status == 200) {
				onready(JSON.parse(xhr.responseText));
			} else {
				console.log("error " + xhr.status + ": " + xhr.statusText);
			}
		}
	};
	xhr.onerror = function() {
		writeDebug("error");
		writeDebug(xhr.statusText);
	};

	console.log(url);

	xhr.open("GET", url);

	xhr.send();
}

function doTklRequest(request, params, onready) {
	console.log("Requesting " + request);

	var parString = "";
	for ( var p in params) {
		parString += "&" + p + "=" + params[p];
	}

	var url = "http://api.publictransport.tampere.fi/prod/?request=" + request
			+ "&format=json" + "&user=" + secret.user + "&pass=" + secret.pass
			+ parString;

	doRequest(url, onready);
}

function doStopRequest(stop, onready) {
	console.log("Requesting stop " + stop);

	doRequest("http://data.itsfactory.fi/journeys/api/1/stop-monitoring?stops="
			+ stop, onready);
}

function rotaryHandler(ev) {
	var oldIx = currIx;

	if (ev.detail.direction === 'CW' && currIx < stops.length - 1) {
		currIx++;
	}

	if (ev.detail.direction === 'CCW' && currIx > 0) {
		currIx--;
	}

	if (currIx !== oldIx) {
		drawStops();
	}
}

function clear(el) {
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
}

function drawStops() {
	var stopsContainer = document.getElementById("stops");
	clear(stopsContainer);

	for ( var ix in stops) {
		makeStopSelector(ix, stops[ix]);
	}

	getStopInfo(stops[currIx].code);
}

function groupDepartures(departures) {
	var ret = {};

	for ( var ix in departures) {
		var dep = ret[departures[ix].code] || {};

		dep.name = departures[ix].name1;
		dep.times = dep.times || [];
		dep.times.push({
			"date" : departures[ix].date,
			"time" : departures[ix].time
		});

		ret[departures[ix].code] = dep;
	}

	return ret;
}

function redrawDepartures(departures) {
	var departsElement = document.getElementById("departs");
	clear(departsElement);

	for ( var code in departures) {
		var container = document.createElement("tr");

		var line = document.createElement("td");
		line.rowspan = 2;
		line.classList.add("line-id");
		line.appendChild(document.createTextNode(code));
		container.appendChild(line);

		var linedata = document.createElement("tr");
		var lineName = document.createElement("td");
		lineName.classList.add("line-name");
		lineName.appendChild(document.createTextNode(departures[code].name));
		linedata.appendChild(lineName);
		container.appendChild(linedata);

		var timesrow = document.createElement("tr");
		var times = document.createElement("td");
		for ( var timeIx in departures[code].times) {
			var d = departures[code].times[timeIx].date.toString();
			var t = departures[code].times[timeIx].time;

			var depTime = new tizen.TZDate(d.substring(0, 4), parseInt(d
					.substring(4, 6)) - 1, d.substring(6, 8),
					t.substring(0, 2), t.substring(2, 4), 0, 0,
					"Europe/Helsinki");

			var timeEl = document.createElement("span");
			timeEl.classList.add("time");
			var dtime = depTime.difference(tizen.time.getCurrentDateTime());
			var dmins = dtime.length / 1000 / 60;
			timeEl.appendChild(document.createTextNode(Math.round(dmins)
					.toString()));
			times.appendChild(timeEl);
		}
		timesrow.appendChild(times);
		container.appendChild(timesrow);

		departsElement.appendChild(container);
	}
}

function updateDistance() {
	var dist = document.getElementById("distance");
	clear(dist);
	dist.appendChild(document.createTextNode(stops[currIx].dist + " m"));
}

function getStopInfo(code) {
	var splash = document.getElementById("splash");
	if (splash) {
		splash.parentNode.removeChild(splash);
	}
	
	var sn = document.getElementById("stopname");
	clear(sn);
	sn.appendChild(document.createTextNode(stops[currIx].name));

	updateDistance();

	var curStopData = stopData[code];
	var now = new Date().getTime();

	if (curStopData === undefined
			|| (now - curStopData.timestamp) > 5 * 60 * 1000) {
		showStatusMessage("Ladataan...");

		doTklRequest("stop", {
			"code" : code
		}, function(data) {
			var departures = groupDepartures(data[0].departures);

			stopData[code] = {};
			stopData[code].departures = departures;
			stopData[code].timestamp = now;

			if (stops[currIx].code === code) {
				redrawDepartures(departures);
			}
		});
	}

	if (curStopData !== undefined) {
		redrawDepartures(curStopData.departures);
	}
}

function onStopsLoaded(data) {
	if (stops.length > 0) {
		var curStopCode = stops[currIx].code;

		var found = false;
		for ( var i in data) {
			if (data[i].code == curStopCode) {
				currIx = i;
				found = true;
				break;
			}
		}

		if (!found) {
			currIx = 0;
		}
	}

	stops = data;

	drawStops();
}

function doRedraw() {
	console.log("redrawing");
	var curStop = stops[currIx];
	if (curStop) {
		getStopInfo(curStop.code);
	}

	window.setTimeout(doRedraw, 30 * 1000);
}

function onLocationError(err) {
	console.log("location error: " + err.code);

	if (stops.length === 0) {
		showStatusMessage("Paikannus ei onnistunut, yritetään uudelleen.");
	}

	gpsWatchHandle = navigator.geolocation.watchPosition(onPosition,
			onLocationError, gpsOpts);
}

function onVisibilityChange() {
	if (document.hidden) {
		console.log("hiding");
		navigator.geolocation.clearWatch(gpsWatchHandle);
		window.clearTimeout();
	} else {
		console.log("showing");
		startVisibleActions();
	}
}

function onHwKey(e) {
	if (e.keyName === "back") {
		tizen.application.getCurrentApplication().hide();
	}
}

function toRadian(angle) {
	return Math.PI * angle / 180.0;
}

function distance(pos1, pos2) {
	var D = 12720.0;

	var dLat = toRadian(pos1.coords.latitude - pos2.coords.latitude);
	var dLon = toRadian(pos1.coords.longitude - pos2.coords.longitude);

	var sinLat = Math.sin(dLat / 2);
	var sinLon = Math.sin(dLon / 2);

	var coses = Math.cos(toRadian(pos1.coords.latitude))
			+ Math.cos(toRadian(pos2.coords.latitude));

	var sq = sinLat * sinLat + coses * sinLon * sinLon;

	return D * Math.asin(Math.sqrt(sq));
}

function onPosition(pos) {
	console.log("got position " + pos.coords.latitude + ", "
			+ pos.coords.longitude);
	var opts = {
		"center_coordinate" : pos.coords.longitude.toString() + ","
				+ pos.coords.latitude.toString(),
		"epsg_in" : "wgs84",
		"limit" : classNames.length.toString()
	};

	if (!oldPos) {
		doTklRequest("stops_area", opts, onStopsLoaded);
		oldPos = pos;
	} else {
		var dist = distance(pos, oldPos);
		console.log("distance from previous: " + dist + " km");

		if (dist > 0.3) {
			doTklRequest("stops_area", opts, onStopsLoaded);
			oldPos = pos;
		}
	}
}

var gpsOpts = {
	"enableHighAccuracy" : true,
	"maximumAge" : 600000,
	"timeout" : 60000
};

function startVisibleActions() {
	gpsWatchHandle = navigator.geolocation.watchPosition(onPosition,
			onLocationError, gpsOpts);

	doRedraw();
}

window.onload = function() {
	document.addEventListener('rotarydetent', rotaryHandler, false);
	document.addEventListener('visibilitychange', onVisibilityChange, false);
	document.addEventListener('tizenhwkey', onHwKey);

	startVisibleActions();
};
