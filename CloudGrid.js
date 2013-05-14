/*!
 * CloudGrid 0.3
 *
 * Copyright 2013 cloudgridjs.org
 * Released under the MIT license
 *
 * Date: 2013-2-4
 */

/**
 * @usage:
 * 
 * @customevents cg_selected, cg_fetched
 */
(function($, _) {
	
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
		var defaultOptions = {
			url: "",
			rowTemplate: '<tr><% _.each(map, function(title, index){%><td class="cg-r-<%= index %>"><%= record[index] %></td><%}); %></tr>',
			ajaxData: {},
			parentTemplate: '<table class="cg-table"><% if(!_.isUndefined(map)){%><thead><tr><% _.each(map, function(title, index){%> <th class="cg-h-<%= index %>"><%= title %></th><%}); %></tr></thead><%}%><tbody></tbody></table>',
			bodySelector: 'tbody',
			dataType: 'json',
			sortable: true,
			events: {},
			enabled: true
		};
		
		//Initialize Data and options
		this.data = [];
		this.options = (_.isEmpty(options)) ? defaultOptions : $.extend(true, defaultOptions, options);
		this.gridSelector = selector = this.options.parentID + ' ' + this.options.bodySelector;
		this.selectedItems = [];

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
				$(this.gridSelector).on(splitted.event, splitted.selectors, this.options[events[event]]);
			}
		};

		//Paint all Grid view with parent container
		this.renderRow = function(record, key) {
			var data = {
					'map': this.options.map,
					'record': record
				},		
				markup = _.template(this.options.rowTemplate, data);
			markup = $(markup).first().attr('cgid', key);
			return markup;
		};

		//Paint all Grid view with parent container
		this.renderGrid = function() {
			$(this.options.parentID).html(_.template(this.options.parentTemplate, this.options));
			if(this.options.enabled === true){
				this.enable();
			} else {
				this.disable();
			}
		};
		
		this.onRowClick = function(e) {
			e.stopPropagation();
			if(this.options.enabled === false){
				return;
			}
			
			var selectedItem = $(e.currentTarget).first().attr('cgid');
			if(e.ctrlKey) {
				this.selectedItems.push(selectedItem);
			} else {
				$(this.gridSelector+' [class=cg_selected]').removeClass('cg_selected');
				this.selectedItems = [selectedItem];
			}
			
			$(e.currentTarget).addClass('cg_selected');
			$(e.currentTarget).trigger('cg_selected', this);
		};
		
		this.onRowDblClick = function(e) {
			e.stopPropagation();
			$(e.currentTarget).trigger('cg_dblClick', this);
		};
	};

	$.extend(CloudGrid.prototype, {
		render: function() {
			//Render first draw
			this.initialize();

			$(this.gridSelector).on('click', 'tr', jQuery.proxy(this.onRowClick, this));
			$(this.gridSelector).on('dblclick', 'tr', jQuery.proxy(this.onRowDblClick, this));
		},
		enable: function(){
			this.options.enabled = true;
			$(this.gridSelector).removeClass('disabled');
			$(this.gridSelector).addClass('enabled');
		},
		disable: function(){
			this.options.enabled = false;
			$(this.gridSelector).removeClass('enabled');
			$(this.gridSelector).addClass('disabled');
		},
		reset: function(){
			//Clear Grid Url
			this.clear();			
			for(var i = 0, length = this.data.length; i < length; i++){
				this.append(this.data[i], i);
			}
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
		addDataSet: function(dataSet) {
			if (dataSet.length <= 0) {
				return;
			}
			for (var i = 0; i < dataSet.length; i++) {
				this.addRow(dataSet[i]);
			}
		},		
		remove: function(ids) {
			ids || (ids = {});
			//if ids passed remove ids not selectedItems
			var allIDs = (_.isEmpty(ids)) ? this.selectedItems : ids;
			for(var i =0, length = allIDs.length; i < length; i++){
				this.data.splice(allIDs[i], 1);
			}
			
			if(_.isEmpty(ids)){
				this.selectedItems = [];
			}
			
			this.reset();
		},
		removeAll: function(){
			this.clear();
			this.data = [];
		},
		get: function(id){
			return this.data[id];
		},
		update: function(id, data){
			var record = this.data[id];
			if(typeof record === 'undefined'){
				return false;
			}
			
			for(var key in data){
				if(typeof record[key] === 'undefined'){
					record[key] = data[key];
					continue;
				}
				
				if(record[key] === data[key]){
					continue;
				}
				
				record[key] = data[key];
			}
			
			this.data[id] = record;
			
			//Redraw Grid
			this.reset();
			
			return true;
		},
		//Fetch data from server
		fetch: function() {
			if (typeof this.options.url === 'undefined'){
				return;
			}
			var _this = this;
			$.ajax({
				url: this.options['url'],
				data: this.options['ajaxData'],
				type: "POST",
				success: function(response) {
					$(_this.options.parentID).trigger('cg_fetched');
					var data = $.parseJSON(response);
					_this.addDataSet(data);
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
			$(this.gridSelector).html('');
		},
		toJSON: function(){
			return this.data;
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