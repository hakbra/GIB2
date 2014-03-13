// Custom objects
var CustomControl = function(name, options) {
	
	var control = new (L.Control.extend({
		options: options,
		onAdd: function (map) {
			var container = L.DomUtil.create('div',name);
			L.DomEvent.disableClickPropagation(container);
			container.innerHTML = "test";
			return container;
		}
	}));

	return control;
}

var ButtonRow = function(options) {
	var row = new(L.Control.extend({
		options: options,
		onAdd: function (map) {
			options = this.options;

			container = L.DomUtil.create('div', 'upDownRow'),
			this._upButton = this._createButton('Up', 'upButton button', container, options.upFunc);
			this._upButton = this._createButton('Down', 'downButton button disabled', container, options.downFunc);

			return container;
		},
		_createButton: function (html, className, container, fn) {
			var link = L.DomUtil.create('div', className, container);
			link.innerHTML = html;

			L.DomEvent
			.on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
			.on(link, 'click', L.DomEvent.stop)
			.on(link, 'click', fn, this)
			.on(link, 'click', this._refocusOnMap, this);

			return link;
		},
	}));

	return row;
}

// Custom markers icons
var redIcon = L.icon({ 
        iconUrl: 'img/marker_red.png',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0],
});
var greenIcon = L.icon({ 
        iconUrl: 'img/marker_green.png',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0],
});
var downIcon = L.icon({ 
        iconUrl: 'img/down.gif',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0],
});
var upIcon = L.icon({ 
        iconUrl: 'img/up.png',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, 0],
});
var redMarker = L.Icon.Default.extend({
	options: {
		iconUrl: 'img/marker-icon-red.png' 
	}
});

var greenMarker = L.Icon.Default.extend({
	options: {
		iconUrl: 'img/marker-icon-green.png' 
	}
});
