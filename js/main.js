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

function doRequest(request, params, onready) {
	console.log("Requesting " + request);

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

	var parString = "";
	for ( var p in params) {
		parString += "&" + p + "=" + params[p];
	}

	var url = "http://api.publictransport.tampere.fi/prod/?request=" + request
			+ "&format=json" + "&user=" + secret.user + "&pass=" + secret.pass
			+ parString;

	console.log(url);

	xhr.open("GET", url);

	xhr.send();
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
		container.appendChild(linedata)

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

function getStopInfo(code) {
	var sn = document.getElementById("stopname");
	clear(sn);
	sn.appendChild(document.createTextNode(stops[currIx].name));

	var dist = document.getElementById("distance");
	clear(dist);
	dist.appendChild(document.createTextNode(stops[currIx].dist + " m"));

	var curStopData = stopData[code];
	var now = new Date().getTime();

	if (curStopData === undefined
			|| (now - curStopData.timestamp) > 5 * 60 * 1000) {
		var departs = document.getElementById("departs");
		clear(departs);
		var loading = document.createElement('tr');
		loading.appendChild(document.createTextNode('Ladataan...'));
		departs.appendChild(loading);

		doRequest("stop", {
			"code" : code
		}, function(data) {
			var departures = groupDepartures(data[0].departures);

			var stopCode = data[0].code;
			stopData[stopCode] = {};
			stopData[stopCode].departures = departures;
			stopData[stopCode].timestamp = now;

			if (stops[currIx].code === stopCode) {
				redrawDepartures(departures);
			}
		});
	}

	if (curStopData !== undefined) {
		redrawDepartures(curStopData.departures);
	}
}

function onStopsLoaded(data) {
	stops = data;

	drawStops();
}

function doRedraw() {
	console.log("redrawing");
	var curStop = stops[currIx];
	if (curStop) {
		getStopInfo(curStop.code);
	}
	
	window.setTimeout(doRedraw, 30*1000);
}

window.onload = function() {
	document.addEventListener('rotarydetent', rotaryHandler, false);

	navigator.geolocation.getCurrentPosition(function(pos) {
		var opts = {
			"center_coordinate" : pos.coords.longitude.toString() + ","
					+ pos.coords.latitude.toString(),
			"epsg_in" : "wgs84",
			"limit" : classNames.length.toString()
		};

		doRequest("stops_area", opts, onStopsLoaded);
	}, function(err) {
		console.log("location error: " + err.code);
	}, {
		"enableHighAccuracy" : true,
		"maximumAge" : 600000,
		"timeout" : 60000
	});
	
	doRedraw();
	
	document.addEventListener('visibilitychange', function() {
		if (document.hidden) {
			console.log("hiding");
			window.clearTimeout();
		}
		else {
			console.log("showing");
			doRedraw();
		}
	}, false);
	
	document.addEventListener('tizenhwkey', function(e) {
				if (e.keyName === "back") {
					try {
						tizen.application.getCurrentApplication().hide();
					} catch (ignore) {
					}
				}
		});
};
