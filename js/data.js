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

// Marker icons

var redIcon = L.icon({ 
        iconUrl: 'img/marker_red.png', // pull out values as desired from the feature feature.properties.style.externalGraphic.
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0],
    });
var greenIcon = L.icon({ 
        iconUrl: 'img/marker_green.png', // pull out values as desired from the feature feature.properties.style.externalGraphic.
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0],
    });

// Line

function Line(a, b) {
	this.a = a;
	this.b = b;
	this.dist = a.ll.distanceTo(b.ll);
	this.polyline = L.polyline([a.ll, b.ll]);
}

Line.prototype.write = function() {
	execute("INSERT INTO line (node_a, node_b, dist) VALUES(" + this.a.id + "," + this.b.id + "," + this.dist + ")");
}

// Node
function Node(ll, f, id) {
	this.id = id;
	this.ll = ll;
	this.floor = f;
	this.type = null;
	if (id == null)
		this.write();
	this.neighbours = new Array();
	this.marker = L.marker(ll, {icon: redIcon});
}

Node.prototype.write = function() {
	var values = "Point("+this.ll.lat+","+this.ll.lng+"),"+this.floor+","+this.type;
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
	this.selectedNode = null;
}

Data.prototype.read = function() {
	var options = {minZoom: 18, maxZoom: 22, attribution: "Håkon Bråten"};
	var layers = getAll("SELECT * FROM layer ORDER BY floor");

	for (var i = 0; i < layers.length; i++)
		this.maps.push( new L.TileLayer( 'http://a.tiles.mapbox.com/v3/'+layers[i].url+'/{z}/{x}/{y}.png', options));

	var nodes = getAll( "SELECT id, X(pos) as x, Y(pos) as y, floor FROM node"); 
	for (var j = 0; j < nodes.length; j++) {
		var n = new Node(L.latLng(nodes[j].x, nodes[j].y), nodes[j].floor, nodes[j].id);
		this.nodes[n.id] = n;
	}
	
	var lines = getAll("SELECT * FROM line");
	for (var i = 0; i < lines.length; i++) {
		var l = new Line(this.nodes[lines[i].node_a], this.nodes[lines[i].node_b], lines[i].dist);
		this.lines.push(l);
	}	

	this.addFloor();
}

Data.prototype.createLine = function(id) {
	
}

Data.prototype.selectNode = function(id) {
	if (this.selectedNode == null) {
		this.selectedNode = id;
		this.nodes[id].marker.setIcon(greenIcon);
	}
	else if (this.selectedNode == id) {
		this.selectedNode = null;	
		this.nodes[id].marker.setIcon(redIcon);
	}
	else {
		var l = new Line(this.nodes[this.selectedNode], this.nodes[id]);
		l.write();
		this.lines.push(l);
		l.polyline.addTo(this.map);
		this.nodes[id].marker.setIcon(greenIcon);
		this.nodes[this.selectedNode].marker.setIcon(redIcon);
		this.selectedNode = id;
	}
}

Data.prototype.getClosestNode = function(target, limit) {
	var closestNode = null;
	var min = null;
	for (var id in this.nodes)
		if (this.nodes[id].floor == this.floor) {
			var pos = this.nodes[id].ll;
			var dist = target.distanceTo(pos); 
			if ((min == null && dist < limit) || (min != null && dist < min)) {
				closestNode = this.nodes[id];
				min = dist;
			}
		}
	return closestNode;
}


Data.prototype.clickHandler = function(e) {
	var nearestNode = this.getClosestNode(e.latlng, 40);
	if (nearestNode != null)
		this.selectNode(nearestNode.id);
	else
		this.addNode(e);
}

Data.prototype.addNode = function(e) {
	var n = new Node(e.latlng, this.floor);
	this.nodes[n.id] = n;
	n.marker.addTo(this.map)
}

Data.prototype.addFloor = function() {
	this.map.addLayer(this.maps[this.floor]);
	for (var id in this.nodes)
		if (this.nodes[id].floor == this.floor)
			this.map.addLayer(this.nodes[id].marker);
	for (var i = 0; i < this.lines.length; i++) {
		if (this.lines[i].a.floor == this.floor || this.lines[i].b.floor == this.floor)
			this.lines[i].polyline.addTo(map); 
	}
}

Data.prototype.removeFloor = function() {
	this.map.removeLayer(this.maps[this.floor]);
	for (var id in this.nodes)
		if (this.nodes[id].floor == this.floor)
			this.map.removeLayer(this.nodes[id].marker);
	for (var i = 0; i < this.lines.length; i++) {
		if (this.lines[i].a.floor == this.floor || this.lines[i].b.floor == this.floor)
			this.map.removeLayer(this.lines[i].polyline); 
	}
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
