function addPerson(sn) {
	var name = prompt("Person til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO property VALUES (" + sn + ", 'person', \"" + name + "\")");
}
function addRoom(sn) {
	var name = prompt("Navn til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO property VALUES (" + sn + ", 'room', \"" + name + "\")");
}
function addType(sn) {
	var name = prompt("Type til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO property VALUES (" + sn + ", 'type', \"" + name + "\")");
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
	this.toFromMode = 1;
	this.autocomplete = null;
	
	this.info = new CustomControl('info', {position:"bottomright"});
	this.map.addControl(this.info);

	this.map.addControl(ButtonRow({
		position: 'topright', 
		upFunc: this.floorUp.bind(this), 
		downFunc: this.floorDown.bind(this)}));

	$("#toFromButton").click(this.toggleToFrom.bind(this));
	$("#clearButton").click(this.clearTargets.bind(this));

	this.populateDrowdown();
	this.toggleToFrom();

	this.map.on('click', this.onClick.bind(this));
}

Data.prototype.clearTargets = function() {
	this.targets = null;
	this.position = null;
	this.path = null;
	this.makePath();
}
Data.prototype.toggleToFrom = function() {
	var d = this;
	if (this.toFromMode == 0) {
		this.toFromMode = 1;
		$("#toFromButton").css("background-color", "#FF0000");
		$("#toFromButton").html("B");
		$( "#search" ).autocomplete({
			source: this.autocomplete.all,
			select: function( event, ui ) {
				event.preventDefault();
				$("#search").val(ui.item.label);
				d.targets = ui.item.value;
				d.makePath();
			}
		});
	} else {
		this.toFromMode = 0;
		$("#toFromButton").css("background-color", "green");
		$("#toFromButton").html("A");
		$( "#search" ).autocomplete({
			source: this.autocomplete.single,
			select: function( event, ui ) {
				event.preventDefault();
				$("#search").val(ui.item.label);
				d.position = ui.item.value;
				d.makePath();
			}
		});
	}
}

Data.prototype.populateDrowdown = function() {
	var names = getAll("SELECT value, node_id FROM property");
	var dict = {};
	for (var i = 0; i < names.length; i++) {
		var name = names[i]["value"];
		var id = names[i]["node_id"];
		if (!(name in dict))
			dict[name] = new Array();
		dict[name].push(id);
	}

	var sourcelist = new Array();
	for (var k in dict) {
		sourcelist.push( {value: dict[k], label: k} );
	}
	
	var singleNames = getAll("SELECT value, node_id FROM property WHERE type = 'name' OR type = 'person'");
	var singleSourcelist = new Array();
	for (var i = 0; i < singleNames.length; i++)
		singleSourcelist.push( {value: singleNames[i]["node_id"], label:singleNames[i]["value"]}); 


	this.autocomplete = {all : sourcelist, single : singleSourcelist};
}

Data.prototype.makePath = function() {
	if (this.position != null && this.targets != null) {
		this.path = shortestPath(this.nodes, this.position, this.targets);
		this.updateInfo();
	}
	this.drawPath();
	if (this.position == null && this.targets != null && this.toFromMode == 1)
		this.toggleToFrom();
	if (this.position != null && this.targets == null && this.toFromMode == 0)
		this.toggleToFrom();
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
	var options = {minZoom: 18, maxZoom: 21, attribution: ""};
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

	var persons = getAll("SELECT node_id, value FROM property WHERE type = 'person'");
	for (var i = 0; i < persons.length; i++) {
		this.nodes[persons[i]["node_id"]].persons.push(persons[i]["value"]);
	}

	var names = getAll("SELECT node_id, value FROM property WHERE type = 'name'");
	for (var i = 0; i < names.length; i++) {
		this.nodes[names[i]["node_id"]].names.push(names[i]["value"]);
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
		var closestNode = this.getClosestNode(e.latlng, this.floor, 400);
		if (this.toFromMode == 0)
			this.position = closestNode.id;
		else
			this.targets = [closestNode.id];

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

			if (n1.floor == this.floor && n2.floor == this.floor) {
				var pl = new L.Polyline([n1.ll, n2.ll], {color:'blue'});
				this.pathlayer.addLayer(pl);
			}
			else if (n1.floor == this.floor) {
				if (n2.floor > n1.floor)
					this.pathlayer.addLayer(L.marker(n1.ll, {icon: upIcon})); // Pil opp
				else
					this.pathlayer.addLayer(L.marker(n1.ll, {icon: downIcon})); // Pil ned
			}
			else if (n2.floor == this.floor) {
				if (n1.floor > n2.floor)
					this.pathlayer.addLayer(L.marker(n2.ll, {icon: upIcon})); // Pil opp
				else
					this.pathlayer.addLayer(L.marker(n2.ll, {icon: downIcon})); // Pil ned
			}
		}
	}
	if (this.targets != null) {
		for (var k in this.targets) {
			var tnode = this.targets[k];
			if (this.nodes[tnode].floor == this.floor)
				this.pathlayer.addLayer(L.marker(this.nodes[tnode].ll, {icon: new redMarker()}));
		}
	}
	if (this.position != null && this.nodes[this.position].floor == this.floor) {
		this.pathlayer.addLayer(L.marker(this.nodes[this.position].ll, {icon: new greenMarker()}));
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

Data.prototype.disableButtons = function() {
	if (this.floor == this.maps.length-1)
		$(".upButton").addClass("disabled");
	else
		$(".upButton").removeClass("disabled");
	if (this.floor == 0)
		$(".downButton").addClass("disabled");
	else
		$(".downButton").removeClass("disabled");
}

Data.prototype.floorUp = function() {
	if (this.floor == this.maps.length-1) // Cant go further up
		return;
	this.floor++;
	this.draw();
	this.disableButtons();
}

Data.prototype.floorDown = function() {
	if (this.floor == 0) //Cant go further down
		return;
	this.floor--;
	this.draw();
	this.disableButtons();
}
