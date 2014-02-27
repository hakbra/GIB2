// Line

function Line(a, b) {
	this.a = a;
	this.b = b;
	this.dist = a.ll.distanceTo(b.ll);
	this.polyline = L.polyline([a.ll, b.ll]);

	a.neighbours.push(b.id);
	b.neighbours.push(a.id);
}

Line.prototype.write = function() {
	execute("INSERT INTO line (node_a, node_b, dist) VALUES(" + this.a.id + "," + this.b.id + "," + this.dist + ")");
}
