// Database
function sendAjax(sql, method) {
	var xmlhttp=new XMLHttpRequest();
	console.log("SQL: " + sql);
	xmlhttp.open("GET","driver.php?sql="+sql+"&method="+method,false);
	xmlhttp.send();
	console.log("Response: " + xmlhttp.responseText);
	return JSON.parse(xmlhttp.responseText);
}

function getAll(sql) {
	return sendAjax(sql, 'getAll');
}

function getOne(sql) {
	return sendAjax(sql, 'getOne');
}

function execute(sql) {
	sendAjax(sql, 'execute');
}

function insert(sql) {
	return sendAjax(sql, 'insert');
}

// Line

function Line(a, b) {
	this.a = a;
	this.b = b;
}

// Node
function Node(x, y, f, id) {
	this.id = id;
	this.x = x;
	this.y = y;
	this.floor = f;
	this.type = null;
	if (id == null)
		this.write();
	this.neighbours = new Array();
	this.marker = L.marker([x, y], options={"id":this.id}).bindPopup(this.id);
}

Node.prototype.write = function() {
	var values = "Point("+this.x+","+this.y+"),"+this.floor+","+this.type;
	this.id = insert(
		"INSERT INTO node (pos, floor, type) VALUES("+values+")");
}

// Data class

function Data(map) {
	this.map = map;
	this.floor = 0;
	this.maps = new Array();
	this.nodes = new Object();
	this.lines = new Array();
}

Data.prototype.read = function() {
	var options = {minZoom: 18, maxZoom: 22, attribution: "Håkon Bråten"};
	var layers = getAll("SELECT * FROM layer ORDER BY floor");

	for (var i = 0; i < layers.length; i++) {
		this.maps.push(
				new L.TileLayer(
					'http://a.tiles.mapbox.com/v3/'+layers[i].url+'/{z}/{x}/{y}.png', options));

		var floornodes = getAll(
			"SELECT id, X(pos) as x, Y(pos) as y, floor FROM node WHERE floor=" + layers[i].floor); 
		for (var j = 0; j < floornodes.length; j++) {
			n = new Node(floornodes[j].x, floornodes[j].y, floornodes[j].floor, floornodes[j].id);
			this.nodes[n.id] = n;
		}
	}
	this.addFloor();
}

Data.prototype.addFloor = function() {
	this.map.addLayer(this.maps[this.floor]);
	for (var id in this.nodes)
		if (this.nodes[id].floor == this.floor+1)
			this.map.addLayer(this.nodes[id].marker);
}

Data.prototype.removeFloor = function() {
	this.map.removeLayer(this.maps[this.floor]);
	for (var id in this.nodes)
		if (this.nodes[id].floor == this.floor+1)
			this.map.removeLayer(this.nodes[id].marker);
}

Data.prototype.addNode = function(e) {
	var n = new Node(e.latlng.lat, e.latlng.lng, this.floor+1);
	this.nodes[n.id] = n;
	n.marker.addTo(this.map)
}

Data.prototype.floorUp = function() {
	if (this.floor == this.maps.length-1)
		return;
	this.removeFloor();
	this.floor++;
	this.addFloor();
}

Data.prototype.floorDown = function() {
	if (this.floor == 0)
		return;
	this.removeFloor();
	this.floor--;
	this.addFloor();
}
