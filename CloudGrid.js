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
	bodySelector: 'tbody',
	dataType: 'json',
	sortable: false,
	events: {}
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
	this.data = [];
	this.options = (_.isEmpty(options)) ? defaultOptions : _.extend(defaultOptions, options);
	this.gridSelector = selector = this.options.parentID + ' ' + this.options.bodySelector;
	this.selectedItem = {};

	//Initialize the Grid
	this.initialize = function() {
	    if ((_.isUndefined(this.options.parentTemplate)) && (this.options.parentTemplate === '')) {
		return;
	    }
	    //Render main view
	    this.renderGrid();
	    //Append row if not empty
	    this.addDataSet(data);
	    //Attach Events issued by the user
	    this.attachEvents();
	};

	this.append = function(row, recordId) {
	    $(this.gridSelector).append(this.renderRow(row, recordId));
	};

	this.attachEvents = function() {
	    //@todo check if events exist
	    var events = this.options.events,
		    splitted = {};

	    for (var event in events) {
		splitted = privateFunctions.splitEvent(event);
		splitted.selectors = '';
		console.log(splitted.event, splitted.selectors, this.options[events[event]]);
		$(this.gridSelector).on(splitted.event, splitted.selectors, this.options[events[event]]);
	    }
	};

	//Paint all Grid view with parent container
	this.renderRow = function(record, key) {
	    var data = {
		'map': this.options.map,
		'record': record
	    },
	    markup = _.template(this.options.template, data);
	    markup = $(markup).first().attr('cgid', key);
	    return markup;
	};

	//Paint all Grid view with parent container
	this.renderGrid = function() {
	    var grid = _.template(this.options.parentTemplate, this.options);
	    $(this.options.parentID).html(grid);
	};
    };

    $.extend(CloudGrid.prototype, {
	render: function() {
	    //Render first draw
	    this.initialize();

	    $(this.gridSelector).on('click', 'tr', jQuery.proxy(this.onRowClick, this));
	    $(this.gridSelector).on('hover', 'tr', jQuery.proxy(this.onRowHover, this));
	    $(this.gridSelector).on('dblclick', 'tr', jQuery.proxy(this.onRowDblClick, this));
	},
	//Add row to template
	addRow: function(row) {
	    if (typeof row === 'undefined') {
		return;
	    }
	    var newIndex = this.data.length;
	    this.data.push(row);
	    this.append(row, newIndex);
	},
	onRowClick: function(e) {
	    e.stopPropagation();
	    this.selectedItem = $(e.currentTarget).first().attr('cgid');
	    $(this.gridSelector).trigger('cg_selected');
	},
	onRowHover: function(e) {
	    e.stopPropagation();
	},
	onRowDblClick: function(e) {
	    e.stopPropagation();
	},
	addDataSet: function(dataSet) {
	    if (dataSet.length <= 0) {
		return;
	    }

	    for (var i = 0; i < dataSet.length; i++) {
		this.addRow(dataSet[i]);
	    }
	},
	remove: function(){
	    $(this.gridSelector+' [cgid='+this.selectedItem+']').remove();
	    //@todo fix since array is removing index but grid not being updated
	    this.data.splice(this.selectedItem, 1);
	    this.selectedItem = '';
	    console.log(this.data);
	},
	//Fetch data from server
	fetch: function() {
	    if (typeof this.options.url === 'undefined')
		return;
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
	},
	filter: function(filters) {
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
	},
	//Clear Grid
	clear: function() {
	    $(this.options.parentID + ' ' + this.options.bodySelector).html('');
	}
    });

    //Assigne CloudGrid to global scope
    window.CloudGrid = CloudGrid;
    //Check if amd is used
    if (typeof define === "function") {
	define("CloudGrid", [], function() {
	    return CloudGrid;
	});
    }
})(jQuery, _);