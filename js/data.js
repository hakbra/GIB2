function addPerson(sn) {
	var name = prompt("Person til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO property VALUES (" + sn + ", 'person', \"" + name + "\")");
	d.reset(false);
}
function addRoom(sn) {
	var name = prompt("Navn til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO property VALUES (" + sn + ", 'name', \"" + name + "\")");
	d.reset(false);
}
function addType(sn) {
	var name = prompt("Type til node " + sn, "");
	if (name == null)
		return;
	execute("INSERT INTO property VALUES (" + sn + ", 'type', \"" + name + "\")");
	d.reset(false);
}
function delPerson(sn) {
	execute("DELETE FROM property WHERE type = 'person' AND node_id = " + sn);
	d.reset(false);
}
function delRoom(sn) {
	execute("DELETE FROM property WHERE type = 'name' AND node_id = " + sn);
	d.reset(false);
}
function delType(sn) {
	execute("DELETE FROM property WHERE type = 'type' AND node_id = " + sn);
	d.reset(false);
}
function removeNode(id) {
	execute("DELETE FROM node WHERE id = " + id);
	execute("DELETE FROM line WHERE node_a = " + id + " OR node_b = " + id);
	execute("DELETE FROM property WHERE node_id = " + id);
	d.reset(true);
}
function publish(id) {
	var name = prompt("Name", "");
	var time = parseInt(prompt("Duration (hours)", ""));
	if (name == null || name == "" || time == null || isNaN(time) || time < 1) {
		alert("Illegal input, position not published");
		return;
	}
	execute("INSERT INTO publication VALUES (" + id + ", '" + name + "', DATE_ADD(NOW(), INTERVAL "+time+" HOUR))");
	d.populateDropdown();
	d.setToFrom(1);
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

	this.populateDropdown();
	this.setToFrom(0);

	this.map.on('click', this.onClick.bind(this));
}

Data.prototype.reset = function(del) {
	this.maps = new Array();
	this.nodes = new Object();
	this.lines = new Array();
	if (del)
		this.selectedNode = null;
	this.path = null;
	this.position = null;
	this.targets = null;

	this.populateDropdown();
	this.setToFrom(0);
	this.read();
	this.draw();
}

Data.prototype.setMode = function(m) {
	this.mode = m;
	this.path = null;
	this.position = null;
	this.targets = null;
	this.draw();
}

Data.prototype.clearTargets = function() {
	this.targets = null;
	this.position = null;
	this.path = null;
	this.toFromMode = 1;
	this.setToFrom(0);
	this.makePath();
}
Data.prototype.toggleToFrom = function() {
	if (this.toFromMode == 1)
		this.setToFrom(0);
	else
		this.setToFrom(1);
}
Data.prototype.setToFrom = function(mode) {
	var d = this;
	if (mode == 1) {
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
			},
			focus: function( event, ui ) {
				event.preventDefault();
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
			},
			focus: function( event, ui ) {
				event.preventDefault();
			}
		});
	}
}

Data.prototype.populateDropdown = function() {
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

	var publications = getAll("SELECT node_id, name FROM publication WHERE expiration > NOW()");
	for (var i = 0; i < publications.length; i++) {
		singleSourcelist.push( {value: [publications[i]["node_id"]], label:publications[i]["name"] + " (temp.)"}); 
		sourcelist.push( {value: [publications[i]["node_id"]], label:publications[i]["name"] + " (temp.)"}); 
	}

	this.autocomplete = {all : sourcelist, single : singleSourcelist};

	$("#search").val("Search");
	$("#search").on("click", function() {
		$(this).val("")
	});
}

Data.prototype.makePath = function() {
	if (this.position != null && this.targets != null && this.targets.indexOf(this.position) > -1) {
		this.targets = null;
		this.path = null;
	}

	if (this.position != null && this.targets != null) {
		this.path = shortestPath(this.nodes, this.position, this.targets);
		this.updateInfo();
	}
	this.drawPath();
	if (this.position == null && this.targets != null && this.toFromMode == 1)
		this.setToFrom(0);
	if (this.position != null && this.targets == null && this.toFromMode == 0)
		this.setToFrom(1);
}

Data.prototype.updateInfo = function() {
	var node = null;
	var html = "<b>" + (this.floor+1) + ". floor</b><br>";
	if (this.mode == -1) {
		if (this.position == null && this.targets == null)
			html += "Set start and destination";
		else if (this.position == null)
			html += "Set start";
		else if (this.targets == null)
			html += "Set destination";
		else
			html += "Distance: " + Math.round(this.path.dist) + "m";

		if (this.position != null) {
			html += "<br><br><button onclick=\"publish("+this.position+")\">Publish my location</button>";
		}

		this.info._container.innerHTML = html;
		return;
	} 

	if (this.selectedNode == null) {
		html += "Choose node";
	} else {
		node = this.nodes[this.selectedNode];

		html += "Node " + this.selectedNode;
		html += "<button onclick=\"removeNode("+this.selectedNode+")\">X</button><br>";

		html += "<br><u>Name:</u><br>";
		if (node.name != null)  {
			html += "<button onclick=\"delRoom("+this.selectedNode+")\">X</button>";
			html += node.name + "<br>";
		}
		html += "<button onclick=\"addRoom("+this.selectedNode+")\">+</button><br>";

		html += "<br><u>Persons:</u><br>";
		for (var i = 0; i < node.persons.length; i++) {
			html += "<button onclick=\"delPerson("+this.selectedNode+")\">X</button>";
			html += node.persons[i] + "<br>";
		}
		html += "<button onclick=\"addPerson("+this.selectedNode+")\">+</button><br>";

		html += "<br><u>Types:</u><br>";
		for (var i = 0; i < node.types.length; i++) {
			html += "<button onclick=\"delType("+this.selectedNode+")\">X</button>";
			html += node.types[i] + "<br>";
		}
		html += "<button onclick=\"addType("+this.selectedNode+")\">+</button>";
	}

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
		this.nodes[names[i]["node_id"]].name = names[i]["value"];
	}

	var types = getAll("SELECT node_id, value FROM property WHERE type = 'type'");
	for (var i = 0; i < types.length; i++) {
		this.nodes[types[i]["node_id"]].types.push(types[i]["value"]);
	}
}

Data.prototype.selectNode = function(id, shift) {
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
		if (shift) { // edit mode
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
	if (e.originalEvent.altKey && e.originalEvent.shiftKey) {
		this.setMode(this.mode*-1);
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
	if(e.originalEvent.altKey) {
		this.addNode(e);
		return;
	}
	var nearestNode = this.getClosestNode(e.latlng, this.floor, 100);
	if (nearestNode != null)
		this.selectNode(nearestNode.id, e.originalEvent.shiftKey);
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
			if (this.nodes[tnode].floor == this.floor) {
				var marker = L.marker(this.nodes[tnode].ll, {icon: new redMarker()});
				if (this.nodes[tnode].name != null)
					marker.bindLabel(this.nodes[tnode].name, {noHide: true});
				this.pathlayer.addLayer(marker);
			}
		}
	}
	if (this.position != null && this.nodes[this.position].floor == this.floor) {
		var marker = L.marker(this.nodes[this.position].ll, {icon: new greenMarker()});
		if (this.nodes[this.position].name != null)
				marker.bindLabel(this.nodes[this.position].name, {noHide: true});
		this.pathlayer.addLayer(marker);
	}
	this.updateInfo();
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
	for (var i = 1; i < this.lines.length; i++) { // Add lines
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
