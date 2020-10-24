'use strict';

Module.register("MMM-homeassistant-sensors", {
	result: {},
	defaults: {
		title: 'Home Assistant',
		host: 'hassio.local',
		port: '8321',
		https: false,
		token: '',
		apipassword: '',
		fade: 100,
		updateInterval: 300000,
		controlsensor: 'sensor control disabled', // If you want to show this instans of HA-Sensors only when this sensor is the value below.
		controlsensorvalue: 'sensor control disabled', // The value the above sensor must have to show this instans of HA-Sensors.
		noaddress: 'away', // If address field is "undefined" or "null" on the sensor, this string will be displayed instead of the address.
		debuglogging: false,
		entities: []
	},

	getStyles: function () {
		return ["modules/MMM-homeassistant-sensors/node_modules/@mdi/font/css/materialdesignicons.min.css", "MMM-homeassistant-sensors.css"];
	},

	start: function () {
		this.getStats();
		this.scheduleUpdate();
	},
	isEmpty: function (obj) {
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				return false;
			}
		}
		return true;
	},
	getDom: function () {
		var wrapper = document.createElement("ticker");
		wrapper.className = "small";
		var data = this.result;
		// For debugging
		//console.log(data);

		// Hides and shows the module if the control sensor is defined and the control sensor value is defined.
		if (data && !this.isEmpty(data)) {
			// If the control sensor is set to anything else the the default continue.
			if (this.config.controlsensor !== "sensor control disabled") {
				var stateval = this.getState(data, this.config.controlsensor);
				// If the control sensor value is anything not the default or not the defined value, hide the module.
				if (stateval !== this.config.controlsensorvalue && this.config.controlsensorvalue !== "sensor control disabled") {
					if (!this.hidden) {
						this.hide();
					}
				} else {
					if (this.hidden) {
						this.show();
					}
				}
			}
		}

		// Starting to build the elements.
		var statElement = document.createElement("header");
		var title = this.config.title;
		statElement.innerHTML = title;
		wrapper.appendChild(statElement);

		if (data && !this.isEmpty(data)) {
			var tableElement = document.createElement("table");
			var values = this.config.values;

			for (var confEntity of this.config.entities) {
				var haEntity = data.find(e => {
					return e.entity_id === confEntity.entity
				});

				if (typeof haEntity !== 'undefined') {
					tableElement.appendChild(this.addValue(haEntity, confEntity));
				} else {
					var error = confEntity.entity + ' not found!';
					console.error('MMM-homeassistant-sensors ERROR: ', error);
				}
			}

			wrapper.appendChild(tableElement);
		} else {
			var error = document.createElement("span");
			error.innerHTML = "Error fetching stats.";
			wrapper.appendChild(error);
		}
		return wrapper;
	},

	addValue: function (haEntity, confEntity) {
		var value, unit;
		if (typeof confEntity.attribute !== 'undefined') {
			if (typeof haEntity.attributes[confEntity.attribute] !== 'undefined') {
				value = haEntity.attributes[confEntity.attribute];
				unit = '';
			} else {
				var warn = confEntity.entity + ' has no attribute ' + confEntity.attribute + '!';
				console.warn('MMM-homeassistant-sensors WARN: ', warn);

				value = haEntity.state;

				if (typeof haEntity.attributes.unit_of_measurement !== 'undefined') {
					unit = haEntity.attributes.unit_of_measurement;
				} else {
					unit = '';
				}
			}
		} else {
			value = haEntity.state;

			if (typeof haEntity.attributes.unit_of_measurement !== 'undefined') {
				unit = haEntity.attributes.unit_of_measurement;
			} else {
				unit = '';
			}
		}

		if (typeof confEntity.devider !== 'undefined') {
			if (!isNaN(confEntity.devider) && !isNaN(value)) {
				value /= confEntity.devider;
			}
		}

		if (!isNaN(value)) {
			value = Math.round((value + Number.EPSILON) * 100) / 100;
		}


		var icon;
		for (var key in confEntity.icons) {
			if (value === key) {
				icon = confEntity.icons[key];
				break;
			}
		}
		if (typeof icon === 'undefined') {
			icon = confEntity.icon;
		}

		if (typeof confEntity.replace !== 'undefined') {
			for (var key in confEntity.replace) {
				if (value === key) {
					value = confEntity.replace[key];
					break;
				}
			}
		}

		var name;
		if (typeof confEntity.name !== 'undefined') {
			name = confEntity.name;
		} else if (typeof haEntity.attributes.friendly_name !== 'undefined') {
			name = haEntity.attributes.friendly_name;
		} else {
			name = haEntity.entity_id;
		}

		var blinkHigh = false;
		if (!isNaN(confEntity.highThreshold)) {
			blinkHigh = (value > confEntity.highThreshold);
		}

		var blinkLow = false;
		if (!isNaN(confEntity.lowThreshold)) {
			blinkLow = (value > confEntity.lowThreshold);
		}

		var newrow,
			newText,
			newCell;

		newrow = document.createElement("tr");
		newrow.className = "normal";

		if (blinkHigh) {
			newrow.className += " blinkhigh";
		}
		if (blinkLow) {
			newrow.className += " blinklow";
		}

		// Column start point. 
		var column = -1;

		// Icon
		column++;
		newCell = newrow.insertCell(column);
		newCell.className = "symbol light";
		if (typeof icon !== 'undefined') {
			var iconsinline;
			iconsinline = document.createElement("span");
			iconsinline.className = "mdi mdi-" + icon;
			newCell.appendChild(iconsinline);
		}

		// Name
		column++;
		newCell = newrow.insertCell(column);
		newCell.className = "name bright";
		newText = document.createTextNode(name);
		newCell.appendChild(newText);

		// Value
		column++;
		newCell = newrow.insertCell(column);
		newCell.className = "value light";
		newText = document.createTextNode(value);
		newCell.appendChild(newText);

		// Unit
		column++;
		newCell = newrow.insertCell(column);
		newCell.className = "unit light";
		newText = document.createTextNode(unit);
		newCell.appendChild(newText);

		return newrow;
	},

	// Update
	scheduleUpdate: function (delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		var self = this;
		setInterval(function () {
			self.getStats();
		}, nextLoad);
	},

	getStats: function () {
		this.sendSocketNotification('GET_STATS', this.config);
	},

	socketNotificationReceived: function (notification, payload) {
		if (notification === "STATS_RESULT") {
			this.result = payload;
			//var fade = 500;
			this.updateDom(this.config.fade);
		}
	},
});
