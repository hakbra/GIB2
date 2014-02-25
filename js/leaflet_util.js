// Custom objects


var CustomControl = function(name, options) {
	
	var control = new (L.Control.extend({
		options: options,
		onAdd: function (map) {
			var container = L.DomUtil.create('div',name);
			container.innerHTML = "Hello";
			return container;
		}
	}));

	return control;
}


var Button = function(buttonFunction, options) {

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
