'use strict';

Module.register("MMM-homeassistant-sensors", {
	result: {},
	defaults: {
		prettyName: true,
		stripName: true,
		title: 'Home Assistant',
		host: 'hassio.local',
		port: '8321',
		https: false, 
		token: '',
		apipassword: '',
		fade: 100,
		updateInterval: 300000,
		displaySymbol: true,
		displaydates: false,
		displaytimes: false,
		dateformat: 'YYYY-MM-DD', // See moments for more format options: https://momentjs.com/docs/#/displaying/
		timeformat: 'HH:mm:ss', // See moments for more format options: https://momentjs.com/docs/#/displaying/
		controlsensor: 'sensor control disabled', // If you want to show this instans of HA-Sensors only when this sensor is the value below.
		controlsensorvalue: 'sensor control disabled', // The value the above sensor must have to show this instans of HA-Sensors.
		noaddress: 'away', // If address field is "undefined" or "null" on the sensor, this string will be displayed instead of the address.
		debuglogging: false,
		values: []
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
			if (values.length > 0) {
				for (var i = 0; i < values.length; i++) {

					// Check if there is icons in the config.
					if (values[i].icons) {
						var icons = values[i].icons[0];
					} else {
						var icons = "none";
					}

					// Check if there is values to replace in the config.
					if (values[i].replace) {
						var replace = values[i].replace[0];
					} else {
						var replace = "none";
					}

					// Check if the unit should be replaced in the config.
					if (values[i].defunit) {
						var defunit = values[i].defunit;
					} else {
						var defunit = "none";
					}

					// Check if a global Show Date is set in the config.
					if (this.config.displaydates === true) {
						var showdate = true;
					} else {
						var showdate = false;
					}

					// Check if a local entity date is set to show (overriding the default).
					if (values[i].showdate === true) {
						showdate = true;
					} 

					// Check if a local entity date is not set to show (overriding the default).
					if (values[i].showdate === false) {
						showdate = false;
					}

					// Check if a global Show Time is set in the config.
					if (this.config.displaytimes === true) {
						var showtime = true;
					} else {
						var showtime = false;
					}

					// Check if a local entity time is set to show (overriding the default).
					if (values[i].showtime === true) {
						showtime = true;
					} 

					// Check if a local entity time is not set to show (overriding the default).
					if (values[i].showtime === false) {
						showtime = false;
					}

					// Pulling all entity values.
					// The Sensor
					var sensor = values[i].sensor;
					// Name of the Sensor
					var name = this.getName(data, sensor);
					// State of the Sensor
					var stateval = this.getState(data, sensor);
					// Value of the Sensor
					var sensval = this.getValue(data, sensor);
					// Make the data array.
					var sensordata = [stateval, this.getUnit(data, sensor), icons, replace, values[i].name, defunit, showdate, showtime, this.getLastupd(data, sensor), this.getPicture(data, sensor), values[i].displayvalue, values[i].divider, values[i].multiplier, values[i].round, this.getAddress(data, sensor), values[i].displayunit, values[i].highAlertThreshold, values[i].lowAlertThreshold, sensval, values[i].useValue];
					// For debugging
					//console.log(sensordata);
					if (stateval) {
						tableElement.appendChild(this.addValue(name, sensordata));
					}
				}
			} else {
				for (var key in data) {
					if (data.hasOwnProperty(key)) {
						tableElement.appendChild(this.addValue(key, data[key]));
					}
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

	// Collect the state from the entity.
	getState: function (data, value) {
		for (var i = 0; i < data.length; i++) {
			if (data[i].entity_id == value) {
				return data[i].state;
			}
		}
		return null;
	},

	// Collect the value from the entity.
	getValue: function (data, value) {
		for (var i = 0; i < data.length; i++) {
			if (data[i].entity_id == value) {
				if (typeof data[i].attributes.value !== "undefined") {
					return data[i].attributes.value;
				} else {
					return null;
				}
			}
		}
		return null;
	},

	// Collect the unit from the entity.
	getUnit: function (data, value) {
		for (var i = 0; i < data.length; i++) {
			if (data[i].entity_id == value) {
				if (typeof data[i].attributes.unit_of_measurement !== "undefined") {
					return data[i].attributes.unit_of_measurement;
				}
				return "";
			}
		}
		return "";
	},

	// Collect the address from the entity (if available).
	getAddress: function (data, value) {
		for (var i = 0; i < data.length; i++) {
			if (data[i].entity_id == value) {
				return data[i].attributes.address;
			}
		}
		return null;
	},

	// Collect the name from the entity.
	getName: function (data, value) {
		for (var i = 0; i < data.length; i++) {
			if (data[i].entity_id == value) {
				return data[i].attributes.friendly_name;
			}
		}
		return null;
	},

	// Collect the last update date and time from the entity.
	getLastupd: function (data, value) {
		for (var i = 0; i < data.length; i++) {
			if (data[i].entity_id == value) {
				return data[i].last_updated;
			}
		}
		return null;
	},

	// Collect the picture from the entity.	
	getPicture: function (data, value) {
		for (var i = 0; i < data.length; i++) {
			if (data[i].entity_id == value) {
				return data[i].attributes.entity_picture;
			}
		}
		return null;
	},

	// Adding alla the sensors to the table.
	addValue: function (name, sensordata) {
		// The array looks like this.
	//sensordata = [0]State, [1]unit, [2]icons, [3]replace, [4]displayname, [5]defunit, [6]showdate, [7]showtime, [8]lastupd, [9]picture, [10]displayvalue, [11]divider, [12]multiplier, [13]round, [14]address, [15]displayunit, [16]highAlertThreshold, [17]lowAlertThreshold, [18]Value, [19]useValue
		var newrow,
		newText,
		newCell;
		var newValue;
		var datedata;
		var timedata;
		var unit;
		var picture;
		var address;
		var addblinkhigh = 0;
		var addblinklow = 0;
		newrow = document.createElement("tr");

		// Fix the time and date.
		var thetime = new Date(sensordata[8]);
		var momentdate = moment(thetime);

		// The time formatted. 
		var timedata = moment(thetime).format(this.config.timeformat);

		// The date formatted
		var datedata = moment(thetime).format(this.config.dateformat);

		// Format the time to human readable...
		var rtime = momentdate.from(moment());

		// Adds the address if available.
		if (sensordata[14]) {
			address = sensordata[14];
		} else {
			address = this.config.noaddress;
		}

		// Unit
		if (sensordata[5] !== "none") {
			unit = sensordata[5];
			unit = unit.replace("%t%", timedata);
			unit = unit.replace("%r%", rtime);
			unit = unit.replace("%m%", momentdate);
			unit = unit.replace("%d%", datedata);
			unit = unit.replace("%a%", address);
		} else {
			unit = sensordata[1];
		}

		// Name
		if (sensordata[4]) {
			name = sensordata[4];
			name = name.replace("%t%", timedata);
			name = name.replace("%r%", rtime);
			name = name.replace("%m%", momentdate);
			name = name.replace("%d%", datedata);
			name = name.replace("%a%", address);
			name = name.replace("%u%", unit);
		} else {
			if (this.config.stripName) {
				var split = name.split(".");
				name = split[split.length - 1];
			}
			if (this.config.prettyName) {
				name = name.replace(/([A-Z])/g, function ($1) {
						return "_" + $1.toLowerCase();
					});
				name = name.split("_").join(" ");
				name = name.replace(/\w\S*/g, function (txt) {
						return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
					});
			}
		}
		// removes the date from the output table if selected.
		if (sensordata[6] === false) {
			datedata = "";
		}

		// Removes the date from the output table if selected.
		if (sensordata[7] === false) {
			timedata = "";
		}
		
		// Removes the unit if set not to be displayed.
		if (sensordata[15] === false) {
			unit = "";
		}


		// Column start point. 
		var column = -1;

		// Last Date Updated
		column++;
		newCell = newrow.insertCell(column);
		if (datedata !== "") {
			newCell.className = "ha-date";
			newText = document.createTextNode(datedata);
			newCell.appendChild(newText);
		} else {
			newCell.className = "ha-empty";
		}

		// Last Time Updated
		column++;
		newCell = newrow.insertCell(column);
		if (timedata !== "") {
			newCell.className = "ha-time";
			newText = document.createTextNode(timedata);
			newCell.appendChild(newText);
		} else {
			newCell.className = "ha-empty";
		}

		// icons
		column++;
		newCell = newrow.insertCell(column);
		if (this.config.displaySymbol) {
			if (typeof sensordata[2] === "object") {
				var iconsinline = "none";
				//Change icons based on HA status
				for (var key in sensordata[2]) {
					
					// Sets the icon defined in the config specified value will give specified icon.
				    if (sensordata[0] === key) {
						if (!sensordata[2][key].includes("/")) {
							newCell.className = "ha-icon";
							iconsinline = document.createElement("i");
							iconsinline.className = "mdi mdi-" + sensordata[2][key];	
							break;
						} else {
							iconsinline = document.createElement("img");
							iconsinline.src = sensordata[2][key];
							iconsinline.className = "ha-img";
						}
					} 

					// If no icon is set by values, the default one will be used.
					if (iconsinline === "none") {
						newCell.className = "ha-icon";
						iconsinline = document.createElement("i");
						iconsinline.className = "mdi mdi-" + sensordata[2].default;
					}
				}
				newCell.appendChild(iconsinline);
			} else {
				// Setting the Picture if defined in the entity.
				if (sensordata[9]) {
					if (!sensordata[9].includes("http")) {
						if (this.config.https) {
							var picturestart = "https://";
						} else {
							var picturestart = "http://";
						}
						picture = picturestart.concat(this.config.host, ":", this.config.port, sensordata[9]);
					} else {
						picture = sensordata[9];
					}
					var iconsinline = document.createElement("img");
					iconsinline.src = picture;
					iconsinline.className = "ha-img";
					newCell.appendChild(iconsinline);
				}
			}
		} else {
			newCell.className = "ha-empty";
		}

		// Replace the "state" with the "value" if set to true in config.
		if (sensordata[19]) {
			newValue = sensordata[18];
		} else {
			newValue = sensordata[0];
		}

		// Replace the "value" with something defined in config.
		for (var key in sensordata[3]) {
			if (sensordata[0] === key) {
				newValue = sensordata[3][key];
			}
		}
		
		// Calculate the divider
		if (sensordata[11]) {
			newValue = newValue / sensordata[11];
		}

		// Calculate the multiplier 
		if (sensordata[12]) {
			newValue = newValue * sensordata[12];
		}
		
		// Round the value to two decimals.
		// Todo: Add a better function for this...
		if (sensordata[13]) {
			newValue = Math.round(newValue * 100) / 100;
		}

		// If you want to add the value to the defined unit.
		if (sensordata[5] !== "none") {
			unit = unit.replace("%v%", newValue);
		}
		
		// Change the value to the address if %a% defined as a value replacement array.
		if (typeof newValue === 'string') {
			if (newValue.includes("%a%")) {
				newValue = newValue.replace("%a%", address);
			}
		}

		// If you want to add the value to the defined name.
		if (sensordata[4]) {
			name = name.replace("%v%", newValue);
		}
		
		// Removes the value if selected.
		if (sensordata[10] === false) {
			newValue = "";
		}

		// If higher then alert threshold add blink high class.
		if (!isNaN(sensordata[16])) {
			if (newValue > sensordata[16]) {
				addblinkhigh = 1;
			} 
		}

		// If lower then alert threshold add blink low class.
		if (!isNaN(sensordata[17])) {
			if (newValue < sensordata[17]) {
				addblinklow = 1;
			} 
		}


		// Name
		column++;
		newCell = newrow.insertCell(column);
		newCell.className = "ha-name";
		newText = document.createTextNode(name);
		newCell.appendChild(newText);

		// Value
		column++;
		newCell = newrow.insertCell(column);
		newCell.className = "ha-value light";
		if (addblinkhigh > 0) {
			newrow.className += "blinkhigh";
		}
		if (addblinklow > 0) {
			newrow.className += "blinklow";
		}
		newText = document.createTextNode(newValue);
		newCell.appendChild(newText);

		// Unit
		column++;
		newCell = newrow.insertCell(column);
		newCell.className = "ha-unit light";
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
