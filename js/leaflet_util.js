// Custom objects
var CustomControl = function(name, options) {
	
	var control = new (L.Control.extend({
		options: options,
		onAdd: function (map) {
			var container = L.DomUtil.create('div','ccontrol ' + name);
			L.DomEvent.disableClickPropagation(container);
			container.innerHTML = "test";
			return container;
		}
	}));

	return control;
}


var CustomButton = function(buttonFunction, options) {

	var control = new (L.Control.extend({
		options: { position: 'topright' },
		onAdd: function (map) {
			controlDiv = L.DomUtil.create('div', 'button');
			L.DomEvent
				.addListener(controlDiv, 'click', L.DomEvent.stopPropagation)
				.addListener(controlDiv, 'click', L.DomEvent.preventDefault)
				.addListener(controlDiv, 'click', this.clickFunction);

			// Set CSS for the control border
			var controlUI = L.DomUtil.create('div', 'button-border', controlDiv);

			// Set CSS for the control interior
			var controlText = L.DomUtil.create('div', 'button-interior', controlUI);
			controlText.innerHTML = options['text'];

			return controlDiv;
		}
	}));

	control.clickFunction = buttonFunction;

	return control;
};

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
