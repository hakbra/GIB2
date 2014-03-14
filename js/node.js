// Node
function Node(ll, f, id) {
	this.id = id;
	this.ll = ll;
	this.floor = f;
	this.type = null;
	this.persons = new Array();
	this.name = null;
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
