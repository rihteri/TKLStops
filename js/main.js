function writeDebug(text) {
	var p = document.getElementById("content-text");
	var span = document.createElement("span");
	var tn = document.createTextNode(text);
	span.appendChild(tn);
	p.appendChild(document.createElement("br"));
	p.appendChild(span);
}

var classNames = ["topleft", "toptopleft", "top", "toptopright", "topright"];

var stops = null;
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

	var url = "http://api.publictransport.tampere.fi/prod/?request=" +
				request + 
				"&format=json" + 
				"&user=" + secret.user +
				"&pass=" + secret.pass +
				parString;
	
	console.log(url);
	
	xhr.open("GET", url);

	xhr.send();
}

function rotaryHandler(ev) {	
	if (ev.detail.direction === 'CW' && currIx < stops.length) {
		currIx++;
	}
	
	if (ev.detail.direction === 'CCW' && currIx > 0) {
		currIx--;
	}
	
	drawStops();
}

function clear(el) {
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
}

function drawStops() {
	var stopsContainer = document.getElementById("stops");
	clear(stopsContainer);
	
	for (var ix in stops) {
		makeStopSelector(ix, stops[ix]);
	}
	
	getStopInfo(stops[currIx].code);
}

function groupDepartures(departures) {
	var ret = {};
	
	for (var ix in departures) {
		var dep = ret[departures[ix].code] || {};
		
		dep.name = departures[ix].name1;
		dep.times = dep.times || [];
		dep.times.push({"date": departures[ix].date,
					    "time": departures[ix].time});
		 
		 ret[departures[ix].code] = dep;
	}
	
	return ret;
}

function getStopInfo(code) {
	var sn = document.getElementById("stopname");
	clear(sn);
	sn.appendChild(document.createTextNode(stops[currIx].name));
	
	var dist = document.getElementById("distance");
	clear(dist);
	dist.appendChild(document.createTextNode(stops[currIx].dist));
	
	var departs = document.getElementById("departs");
	clear(departs);
	
	doRequest("stop",
			{"code": code},
			function (data) {
				var departures = groupDepartures(data[0].departures);
				
				for (var code in departures) {
					var container = document.createElement("div");
					
					var line = document.createElement("span");
					line.classList.add("line-id");
					line.appendChild(document.createTextNode(code));
					container.appendChild(line);					
					
					var lineName = document.createElement("span");
					lineName.classList.add("line-name");
					lineName.appendChild(document.createTextNode(departures[code].name));
					container.appendChild(lineName);
					
					var times = document.createElement("div");
					for (var timeIx in departures[code].times) {
						var d = departures[code].times[timeIx].date.toString();
						var t = departures[code].times[timeIx].time;
						
						var depTime = new tizen.TZDate(d.substring(0, 4), parseInt(d.substring(4, 6)) - 1, d.substring(6, 8),
								                       t.substring(0, 2), t.substring(2, 4), 0, 0, "Europe/Helsinki");
						
						var timeEl = document.createElement("span");
						timeEl.classList.add("time");
						var dtime = depTime.difference(tizen.time.getCurrentDateTime());
						var dmins = dtime.length / 1000 / 60;
						timeEl.appendChild(document.createTextNode(Math.round(dmins).toString()));
						times.appendChild(timeEl);
					}
					container.appendChild(times);
					
					departs.appendChild(container);
				}
			});
}

function onStopsLoaded(data) {
	stops = data;
	
	drawStops();
}

window.onload = function() {
	document.addEventListener('rotarydetent', rotaryHandler, false);
	
	navigator.geolocation.getCurrentPosition(
function(pos) {
	doRequest("stops_area", {
		"center_coordinate" : pos.coords.longitude.toString() + "," + pos.coords.latitude.toString(),
		"epsg_in": "wgs84",
		"limit" : "5"
	}, onStopsLoaded);
}, function(err) {
	console.log("location error: " + err.code);
}, {"enableHighAccuracy": true,
	"maximumAge": 600000,
	"timeout": 60000});
	
	document.addEventListener('tizenhwkey', function(e) {
		if (e.keyName === "back") {
			try {
				tizen.application.getCurrentApplication().exit();
			} catch (ignore) {
			}
		}
	});

	
};
