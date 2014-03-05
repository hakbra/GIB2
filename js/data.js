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
	this.position = null;
	this.targets = null;
	
	this.info = new CustomControl('info', {position:"bottomright"});
	this.map.addControl(this.info);

	this.map.addControl(CustomButton(this.floorUp.bind(this), {'text':'Up'}));
	this.map.addControl(CustomButton(this.floorDown.bind(this), {'text':'Down'}));

	this.map.addControl(new CustomControl('dropDown ui-widget', {position: "topright"}));
	this.populateDrowdown();

	this.map.on('click', this.onClick.bind(this));
}

Data.prototype.populateDrowdown = function() {
	$("div.dropDown").html("<input id=search>");

	var names = getAll("SELECT DISTINCT name, node_id FROM room UNION SELECT DISTINCT name, node_id FROM person");
	var dict = {};
	for (var i = 0; i < names.length; i++) {
		var name = names[i]["name"];
		var id = names[i]["node_id"];
		if (!(name in dict))
			dict[name] = new Array();
		dict[name].push(id);
	}

	var sourcelist = new Array();
	for (var k in dict) {
		sourcelist.push( {value: dict[k], label: k} );
	}

	var d = this;
	$( "#search" ).autocomplete({
		source: sourcelist,
		select: function( event, ui ) {
			event.preventDefault();
			$("#search").val(ui.item.label);
			d.targets = ui.item.value;
			d.makePath();
		}
	});
}

Data.prototype.makePath = function() {
	if (this.position != null && this.targets != null) {
		var closest = this.getClosestNode(this.position.pos, this.position.floor, 400);
		this.path = shortestPath(this.nodes, closest.id, this.targets);
	}
	this.drawPath();
}

Data.prototype.updateInfo = function() {
	var node = null;
	if (this.selectedNode == null) {
		var html = "Velg rom";
	} else {
		node = this.nodes[this.selectedNode];

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
	}

	html += "<br><br>";
	if (this.path != null)
		html += "<small>avstand: " + Math.round(this.path["dist"]) + "m</small><br>";
	if (node != null)
		html += "<small>id: " + node.id + "</small><br>";
	if (this.mode == 0)
		html += "<small>mode: read</small>";		
	if (this.mode == 1)
		html += "<small>mode: info</small>";		
	if (this.mode == 2)
		html += "<small>mode: edit</small>";

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
			this.makePath();
		}
		this.nodes[id].marker.setIcon(greenIcon);
		this.nodes[this.selectedNode].marker.setIcon(redIcon);
		this.selectedNode = id;
	}

	this.updateInfo();
}

Data.prototype.getClosestNode = function(target, floor, limit) {
	var closestNode = null;
	var min = null;
	for (var id in this.nodes)
		if (this.nodes[id].floor == floor) {
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
	if (this.mode == -1) {
		if (this.position != null)
			this.layer.removeLayer(this.position.marker);
		this.position = new Position(e.latlng, this.floor);
		this.layer.addLayer(this.position.marker);
		this.makePath();
		return;
	}
	var nearestNode = this.getClosestNode(e.latlng, this.floor, 1);
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
	if (this.path != null) {
		if (this.path["nodes"].length == 1) return;

		for (var i = 1; i < this.path["nodes"].length; i++) {
			var n1 = this.nodes[this.path["nodes"][i-1]];
			var n2 = this.nodes[this.path["nodes"][i]];

			if (n1.floor != this.floor && n2.floor != this.floor)
				continue;

			var pl = new L.Polyline([n1.ll, n2.ll], {color:'red'});
			this.pathlayer.addLayer(pl);
		}
	}
	if (this.targets != null) {
		for (var k in this.targets) {
			var tnode = this.targets[k];
			if (this.nodes[tnode].floor == this.floor)
				this.pathlayer.addLayer(L.marker(this.nodes[tnode].ll));
		}
	}
}

Data.prototype.draw = function() {
	this.updateInfo();
	this.drawPath();
	this.layer.clearLayers();
	this.layer.addLayer(this.maps[this.floor]); //Add basemap
	if (this.position != null && this.position.floor == this.floor)
		this.layer.addLayer(this.position.marker);
	if (this.mode == -1)
		return;
	for (var id in this.nodes) //Add nodes
		if (this.nodes[id].floor == this.floor) { // Only if they are on the current floor
			this.layer.addLayer(this.nodes[id].marker);
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
