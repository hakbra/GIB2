function Set() {
	this.counter = 0;
}
Set.prototype.add = function(item) {
	if (!(item in this))
		this.counter++;
	this[item] = true;
}
Set.prototype.del = function(item) {
	if (item in this)
		this.counter--;
	delete this[item];
}
Set.prototype.empty = function() {
	return this.counter == 0;
}
Set.prototype.str = function() {
	var txt = "[";
	for (var k in this)
		if (this[k] == true && k != "counter")
			txt += k + ",";

	txt += "] counter=" + this.counter;
	return txt;
}
function dist(a, b) {
	return a.ll.distanceTo(b.ll);
}

function getPath(came_from, current_node) {
	path = new Array();
	while (true) {
		if (current_node in came_from) {
			path.unshift(current_node);
			current_node = came_from[current_node];
		} else
			break;
	}
	path.unshift(current_node);
	return path;
}

function getMinKey(openset, score) {
	var minVal = null;
	var minKey = null;
	for (var key in openset) if (openset.hasOwnProperty(key) && key != "counter") {
		var val = score[key];
		if (minVal == null || val < minVal) {
			minVal = val;
			minKey = key;
		}
	 }
	return minKey;
}

function p(obj) {
	var txt = "[";
	for (var k in obj)
		txt += k + "=>" + obj[k] + ",";
	txt += "]";
	return txt;
}

function shortestPath(nodes, from_id, to_id) {
	var closedset = new Set();
	var openset = new Set();
	openset.add(from_id);
	var came_from = new Object();
	var g_score = new Object();
	var f_score = new Object();
	g_score[from_id] = 0;
	f_score[from_id] = dist(nodes[from_id], nodes[to_id]);

	while (!openset.empty()) {
		var current = getMinKey(openset, f_score);		
		if (current == to_id)
			return getPath(came_from, current);
			
		//console.log("current: " + current);
		//console.log("openset: " + openset.str());
		//console.log("closedset: " + closedset.str());
		//console.log("comefrom: " + p(came_from));
		//console.log("gscore: " + p(g_score));
		//console.log("fscore: " + p(f_score));
		//console.log("=================");

		openset.del(current);
		closedset.add(current);
		for (var nkey in nodes[current].neighbours) {
			var n = nodes[current].neighbours[nkey];
			if (n in closedset)
				continue;
			var new_g_score = g_score[current] + dist(nodes[current], nodes[n]);
			if ((!(n in openset)) || (new_g_score < g_score[n])) {
				came_from[n] = current;
				g_score[n] = new_g_score;
				f_score[n] = g_score[n] + dist(nodes[n], nodes[to_id]);
				openset.add(n);
			}
		}
	}

	return null;
}
