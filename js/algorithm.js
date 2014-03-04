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
	var hordist = a.ll.distanceTo(b.ll);
	var floordiff = Math.abs(a.floor - b.floor);
	var floordist = floordiff * 3;
	return Math.sqrt(hordist*hordist+floordist*floordist);
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

function getPathDist(nodes, path) {
	var pdist = 0;
	if (path.length > 1)
		pdist = dist(nodes[path[0]], nodes[path[1]]);
	for (var i = 1; i < path.length; i++) {
		pdist += dist(nodes[path[i-1]], nodes[path[i]]);
	}
	return pdist;
}

function getMinKey(openset, score) {
	var minVal = null;
	var minKey = null;
	for (var key in openset) if (openset.hasOwnProperty(key) && key != "counter") {
		var val = score[key];
		console.log("Value: " + val);
		console.log("Key: " + key);
		if (minVal == null || val < minVal) {
			minVal = val;
			minKey = key;
		}
	 }
	 console.log("Returning: " + minKey);
	return minKey;
}

function p(obj) {
	var txt = "[";
	for (var k in obj)
		txt += k + "=>" + obj[k] + ",";
	txt += "]";
	return txt;
}

function shortestPath(nodes, from_id, to_ids) {
	var closedset = new Set();
	var openset = new Set();
	var came_from = new Object();
	var g_score = new Object();
	var goals = new Set();

	g_score[from_id] = 0;
	openset.add(from_id);

	if (to_ids.constructor === Array)
		for (var k in to_ids)
			goals.add(to_ids[k]);
	else
		goals.add(to_ids);

	while (!openset.empty()) {
		var current = getMinKey(openset, g_score);		
		if (current in goals) {
			var path = getPath(came_from, current);
			var pdist = getPathDist(nodes, path);
			return {"nodes": path, "dist": pdist};
		}
			
		console.log("current: " + current);
		console.log("openset: " + openset.str());
		console.log("closedset: " + closedset.str());
		console.log("comefrom: " + p(came_from));
		console.log("gscore: " + p(g_score));
		console.log("=================");

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
				openset.add(n);
			}
		}
	}

	return null;
}
