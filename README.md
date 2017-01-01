# TKLStops
Tizen watch app for showing the next bus in the nearest bus stop, if you happen to be in Tampere, Finland.

## Obtaining API access
Go to http://developer.publictransport.tampere.fi/pages/en/http-get-interface.php
and obtain a username/password for accessing the api. Create a new file js/secret.js
that looks like this:

````
var secret = {
		"user": "youruser",
		"pass": "yourpass"
};
````
