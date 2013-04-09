/*!
 * CloudGrid 0.3
 *
 * Copyright 2013 cloudgridjs.org
 * Released under the MIT license
 *
 * Date: 2013-2-4
 */
(function($, _) {
    var defaultOptions = {
	url: "",
	template: '<tr><% _.each(map, function(title, index){%><td><%= record[index] %></td><%}); %></tr>',
	ajaxData: {},
	parentTemplate: '<table class="cg-table"><% if(!_.isUndefined(map)){%><thead><tr><% _.each(map, function(title){%> <th><%= title %></th><%}); %></tr></thead><%}%><tbody></tbody></table>',
	events: {},
	bodySelector: 'tbody',
	dataType: 'json',
	sortable: false
    };

    var privateFunctions = {
	//Find event rule
	splitEvent: function(event) {
	    var events = event.split(' '),
		eventDetail = {
		    selectors: '',
		    event: ''
		};

	    for (var i = 0, length = events.length; i < length; i++) {
		if (i === 0) {
		    eventDetail.event = events[i];
		    continue;
		}
		if (i > 1) {
		    eventDetail.selectors += ' ';
		}
		eventDetail.selectors += events[i];
	    }
	    return eventDetail;
	}
    };

    //Constructor
    var CloudGrid = function(data, options) {
	//Initialize Data and options
	this.data = (_.isEmpty(data)) ? [] : data;
	this.options = (_.isEmpty(options)) ? defaultOptions : _.extend(defaultOptions, options);
	this.initialize = function() {
	    if ((_.isUndefined(this.options.parentTemplate)) && (this.options.parentTemplate === '')) {
		return;
	    }

	    //Render main view
	    this.renderGrid();
	    //Append row if not empty
	    this.addDataSet(data);
	    
	    this.attachEvents();
	};

	this.append = function(row) {
	    var selector = this.options.parentID + ' ' + this.options.bodySelector;
	    $(selector).append(this.renderRow(row));
	};
	
	this.addDataSet = function(dataSet){
	    if (dataSet.length > 0) {
		for (var i = 0; i < dataSet.length; i++) {
		    this.addRow(dataSet[i]);
		}
	    }
	}

	this.attachEvents = function() {
	    //todo check if events exist
	    var events = this.options.events,
		    splitted = {},
		    selector = this.options.parentID + ' ' + this.options.bodySelector;

	    for (var event in events) {
		splitted = privateFunctions.splitEvent(event);
		$(selector).on(splitted.event, splitted.selectors, this.options[events[event]]);
	    }
	};

	//Render first draw
	this.initialize();
    };

    //Add row to template
    CloudGrid.prototype.addRow = function(row) {
	if (typeof row === 'undefined') return;
	this.data.push(row);
	this.append(row);
    };

    //Fetch data from server
    CloudGrid.prototype.fetch = function() {
	if (typeof this.options.url === 'undefined')  return;
	var self = this;
	$.ajax({
	    url: this.options['url'],
	    data: this.options['ajaxData'],
	    type: "POST",
	    success: function(response) {
		$(self.options.parentID).trigger('cg_fetched');
		var data = $.parseJSON(response);
		self.addDataSet(data);
	    }
	});
    };

    //Paint all Grid view with parent container
    CloudGrid.prototype.renderRow = function(record) {
	var data = {
	    'map': this.options.map,
	    'record': record
	};
	return _.template(this.options.template, data);
    };

    //Paint all Grid view with parent container
    CloudGrid.prototype.renderGrid = function() {
	var grid = _.template(this.options.parentTemplate, this.options);
	$(this.options.parentID).html(grid);
    };

    CloudGrid.prototype.filter = function(filters) {
	var record = {};
	//Loop through out all the data
	for (var i = 0, length = this.data.length; i < length; i++) {
	    record = this.data[i];
	    //Is found until proven other wise
	    var isFound = true;

	    //Loop through filters
	    if (!_.isEmpty(filters.isEqual)) {
		
		var equal = filters.isEqual;
		for (var property in equal) {
		    if (typeof record[property] === 'undefined') {
			continue;
		    }
		    
		    if ((_.isArray(equal[property])) && (_.indexOf(equal[property], record[property]) < 0)) {
			isFound = false;
			break;
		    } else if ((!_.isArray(equal[property])) && (equal[property] !== record[property])) {
			isFound = false;
			break;
		    }
		}
	    }

	    if ((!_.isEmpty(filters.isGreater)) && (isFound)) {
		var greater = filters.isGreater;
		for (var rangeProperty in greater) {
		    if (typeof record[rangeProperty] === 'undefined') {
			continue;
		    }
		    if (record[rangeProperty] < greater[rangeProperty]) {
			isFound = false;
			break;
		    }
		}
	    }

	    if ((!_.isEmpty(filters.isSmaller)) && (isFound)) {
		var smaller = filters.isSmaller;
		for (var smallerRule in smaller) {
		    if (typeof record[smallerRule] === 'undefined') {
			continue;
		    }
		    if (record[smallerRule] > greater[smallerRule]) {
			isFound = false;
			break;
		    }
		}
	    }

	    if (isFound) {
		this.append(record);
	    }
	}
    };
    
    //Clear Grid
    CloudGrid.prototype.clear = function() {
	$(this.options.parentID+' '+this.options.bodySelector).html('');
    };

    //Assigne CloudGrid to global scope
    window.CloudGrid = CloudGrid;
    //Check if amd is used
    if (typeof define === "function") {
	define("CloudGrid", [], function() {
	    return CloudGrid;
	});
    }
})(jQuery, _);