function addPerson(sn) {
	var name = prompt("Person til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO person VALUES (" + sn + ", \"" + name + "\")");
}
function addRoom(sn) {
	var name = prompt("Navn til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO room VALUES (" + sn + ", \"" + name + "\")");
}

// Data class
function Data(map) {
	this.map = map;
	this.mode = -1;
	this.floor = 0;
	this.maps = new Array();
	this.nodes = new Object();
	this.lines = new Array();
	this.selectedNode = null;
	this.layer = L.layerGroup().addTo(this.map);
	this.pathlayer = L.layerGroup().addTo(this.map);
	this.path = null;
	
	this.info = new CustomControl('info', {position:"bottomright"});
	this.map.addControl(this.info);

	this.map.addControl(CustomButton(this.floorUp.bind(this), {'text':'Up'}));
	this.map.addControl(CustomButton(this.floorDown.bind(this), {'text':'Down'}));

	this.map.on('click', this.onClick.bind(this));
}

Data.prototype.updateInfo = function() {
	if (this.selectedNode == null) {
		var html = "Velg rom";
	} else {
		var node = this.nodes[this.selectedNode];

		var html = (this.mode <= 0) ? "Ingen navn" : "Node " + this.selectedNode;
		if (node.names.length > 0) {
			html = "<b>" + node.names[0] + "</b>";
		}
		
		if (this.mode == 1) // info mode
			html += "<button onclick=\"addRoom("+this.selectedNode+")\">+</button>";


		if (node.names.length > 1) {
			for (var i = 1; i < node.names.length; i++)
				html += "/<br><b>" + node.names[i] + "</b>";
		}

		html += "<br>";

		html += "<br><u>Personer:</u>";
		if (this.mode == 1) // info mode
			html += "<button onclick=\"addPerson("+this.selectedNode+")\">+</button>";

		if (node.persons.length > 0) {
			for (var i = 0; i < node.persons.length; i++)
				html += "<br>" + node.persons[i];
		}
		html += "<br><small>id: " + node.id + "</small><br>";
	}

	html += "<br><br>";
	if (this.mode == 0)
		html += "<small>read</small>";		
	if (this.mode == 1)
		html += "<small>info</small>";		
	if (this.mode == 2)
		html += "<small>edit</small>";

	this.info._container.innerHTML = html;
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

	var persons = getAll("SELECT * FROM person");
	for (var i = 0; i < persons.length; i++) {
		this.nodes[persons[i]["node_id"]].persons.push(persons[i]["name"]);
	}

	var names = getAll("SELECT * FROM room");
	for (var i = 0; i < names.length; i++) {
		this.nodes[names[i]["node_id"]].names.push(names[i]["name"]);
	}
}

Data.prototype.selectNode = function(id) {
	if (this.selectedNode == null) {
		this.selectedNode = id;
		this.nodes[id].marker.setIcon(greenIcon);
	}
	else if (this.selectedNode == id) {
		this.selectedNode = null;	
		this.nodes[id].marker.setIcon(redIcon);
		this.pathlayer.clearLayers();
	}
	else {
		if (this.mode == 2) { // edit mode
			var l = new Line(this.nodes[this.selectedNode], this.nodes[id]);
			l.write();
			this.lines.push(l);
			this.layer.addLayer(l.polyline);
		} else {
			this.path = shortestPath(this.nodes, this.selectedNode, id);
			this.drawPath();
		}
		this.nodes[id].marker.setIcon(greenIcon);
		this.nodes[this.selectedNode].marker.setIcon(redIcon);
		this.selectedNode = id;
	}

	this.updateInfo();
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

Data.prototype.onClick = function(e) {
	if (e.originalEvent.altKey && this.mode != -1) { // Change mode if not in user mode
		this.mode = (this.mode + 1) % 3;
		this.updateInfo();
		this.draw();
		return;
	}
	var nearestNode = this.getClosestNode(e.latlng, 1);
	if (nearestNode != null)
		this.selectNode(nearestNode.id);
	else if(this.mode > 1) // Only in edit-mode
		this.addNode(e);
}

Data.prototype.addNode = function(e) {
	var n = new Node(e.latlng, this.floor);
	this.nodes[n.id] = n;
	this.layer.addLayer(n.marker);
}

Data.prototype.drawPath = function() {
	this.pathlayer.clearLayers();
	if (this.path == null) return;
	if (this.path["nodes"].length == 1) return;

	for (var i = 1; i < this.path["nodes"].length; i++) {
		var n1 = this.nodes[this.path["nodes"][i-1]];
		var n2 = this.nodes[this.path["nodes"][i]];

		if (n1.floor != this.floor && n2.floor != this.floor)
			continue;

		var pl = new L.Polyline([n1.ll, n2.ll], {color:'red'});
		this.pathlayer.addLayer(pl);
	}
	console.log(this.path["dist"]);
}

Data.prototype.draw = function() {
	this.updateInfo();
	this.drawPath();
	this.layer.clearLayers();
	this.layer.addLayer(this.maps[this.floor]); //Add basemap
	for (var id in this.nodes) //Add nodes
		if (this.nodes[id].floor == this.floor) { // Only if they are on the current floor
			if (this.mode == -1) { // Only if they have roomname in usermode
				if (this.nodes[id].names.length > 0) {
					this.layer.addLayer(this.nodes[id].marker);
				}
			} else {
					this.layer.addLayer(this.nodes[id].marker);
			}
		}
	if (this.mode != 2) // line mode
		return;
	for (var i = 0; i < this.lines.length; i++) { // Add lines
		if (this.lines[i].a.floor == this.floor || this.lines[i].b.floor == this.floor)
			this.lines[i].polyline.addTo(this.layer); 
	}
}

Data.prototype.floorUp = function() {
	if (this.floor == this.maps.length-1) // Cant go further up
		return;
	this.floor++;
	this.draw();
}

Data.prototype.floorDown = function() {
	if (this.floor == 0) //Cant go further down
		return;
	this.floor--;
	this.draw();
}
