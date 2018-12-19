/////////////////////////////////////////////////////////
/////////////// The Radar Chart Function ////////////////
/// mthh - 2017 /////////////////////////////////////////
// Inspired by the code of alangrafu and Nadieh Bremer //
// (VisualCinnamon.com) and modified for d3 v4 //////////
/////////////////////////////////////////////////////////

const max = Math.max;
const sin = Math.sin;
const cos = Math.cos;
const HALF_PI = Math.PI / 2;
const PI = Math.PI;

/**
 * Takes a player level given as a string and returns its equivalent int value
 */
function getNumber(d){
	if(d == 'NC') return 0;
	if(d == 'P12') return 1;
	if(d == 'P11') return 2;
	if(d == 'P10') return 3;
	if(d == 'D9') return 4;
	if(d == 'D8') return 5;
	if(d == 'D7') return 6;
	if(d == 'R6') return 7;
	if(d == 'R5') return 8;
	if(d == 'R4') return 9;
	if(d == 'N3') return 10;
	if(d == 'N2') return 11;
	if(d == 'N1') return 12;
	
}

/**
 * Takes a player and a width, and creates a star chart for the levels
 * of that player. 
 * Note that the chart is displayed in a div with class radarChart, 
 * so such a div must already exist in the HTML code.
 */
function createPlot(player, wi){
	var margin = { top: 50, right: 30, bottom: 20, left: 30 },
	width = Math.min(wi, window.innerWidth / 4) - margin.left - margin.right,
	height = Math.min(width, window.innerHeight - margin.top - margin.bottom);
	var data = [
		{ name: 'Player level',
			axes: [
				{axis: 'Simple', value: getNumber(player.rank_solo)},
				{axis: 'Double', value: getNumber(player.rank_double)},
				{axis: 'Mixte', value: getNumber(player.rank_mixte)}
			]
		}
	];
	
	var radarChartOptions = {
		w: wi,
		h: wi,
		margin: margin,
		levels: 12,
		roundStrokes: true,
		color: d3.scaleOrdinal().range(["#333333"]),
		format: '.0f'
	};

	// Draw the chart, get a reference the created svg element :
	let svg_radar1 = RadarChart(".radarChart", data, radarChartOptions);
}




const RadarChart = function RadarChart(parent_selector, data, options) {
	
	//Wraps SVG text - Taken from http://bl.ocks.org/mbostock/7555321
	const wrap = (text, width) => {
	  text.each(function() {
			var text = d3.select(this),
				words = text.text().split(/\s+/).reverse(),
				word,
				line = [],
				lineNumber = 0,
				lineHeight = 1.4, // ems
				y = text.attr("y"),
				x = text.attr("x"),
				dy = parseFloat(text.attr("dy")),
				tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

			while (word = words.pop()) {
			  line.push(word);
			  tspan.text(line.join(" "));
			  if (tspan.node().getComputedTextLength() > width) {
					line.pop();
					tspan.text(line.join(" "));
					line = [word];
					tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
			  }
			}
	  });
	}//wrap

	const cfg = {
	 w: 600,				//Width of the circle
	 h: 600,				//Height of the circle
	 margin: {top: 20, right: 20, bottom: 20, left: 20}, //The margins of the SVG
	 levels: 12,				//How many levels or inner circles should there be drawn
	 maxValue: 12, 			//What is the value that the biggest circle will represent
	 labelFactor: 1.25, 	//How much farther than the radius of the outer circle should the labels be placed
	 wrapWidth: 60, 		//The number of pixels after which a label needs to be given a new line
	 opacityArea: 0.35, 	//The opacity of the area of the blob
	 dotRadius: 4, 			//The size of the colored circles of each blog
	 opacityCircles: 0.1, 	//The opacity of the circles of each blob
	 strokeWidth: 1, 		//The width of the stroke around each blob
	 roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed)
	 color: d3.scaleOrdinal(d3.schemeCategory10),	//Color function,
	 format: '.2%',
	 unit: '',
	 legend: false
	};

	//Put all of the options into a variable called cfg
	if('undefined' !== typeof options){
	  for(var i in options){
		if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
	  }//for i
	}//if

	//If the supplied maxValue is smaller than the actual one, replace by the max in the data
	// var maxValue = max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return o.value;}))}));
	let maxValue = 0;
	for (let j=0; j < data.length; j++) {
		for (let i = 0; i < data[j].axes.length; i++) {
			data[j].axes[i]['id'] = data[j].name;
			if (data[j].axes[i]['value'] > maxValue) {
				maxValue = data[j].axes[i]['value'];
			}
		}
	}
	maxValue = max(cfg.maxValue, maxValue);

	const allAxis = data[0].axes.map((i, j) => i.axis),	//Names of each axis
		total = allAxis.length,					//The number of different axes
		radius = Math.min(cfg.w/2, cfg.h/2), 	//Radius of the outermost circle
		Format = d3.format(cfg.format),			 	//Formatting
		angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"

	//Scale for the radius
	const rScale = d3.scaleLinear()
		.range([0, radius])
		.domain([0, maxValue]);

	/////////////////////////////////////////////////////////
	//////////// Create the container SVG and g /////////////
	/////////////////////////////////////////////////////////
	const parent = d3.select(parent_selector);

	//Remove whatever chart with the same id/class was present before
	parent.select("svg").remove();

	//Initiate the radar chart SVG
	let svg = parent.append("svg")
			.attr("width",  cfg.w + cfg.margin.left + cfg.margin.right)
			.attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
			.attr("class", "radar");

	//Append a g element
	let g = svg.append("g")
			.attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")");

	/////////////////////////////////////////////////////////
	////////// Glow filter for some extra pizzazz ///////////
	/////////////////////////////////////////////////////////

	//Filter for the outside glow
	let filter = g.append('defs').append('filter').attr('id','glow'),
		feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
		feMerge = filter.append('feMerge'),
		feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
		feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

	/////////////////////////////////////////////////////////
	/////////////// Draw the Circular grid //////////////////
	/////////////////////////////////////////////////////////
	
	// Some usefull function for the background color	
	function getColor(d){
		if(d <= 0) return "#fffce5";
		if(1 <= d && d < 4) return "#fff6a8";
		if(4 <= d && d < 7) return "#ffd77a";
		if(7 <= d && d < 10) return "#e59d62";
		if(10 <= d) return "#bc7864";
	}
	
	function getStrokeColor(d){
		if(d <= 0) return "#e0dbac";
		if(1 <= d && d < 4) return "#d3c547";
		if(4 <= d && d < 7) return "#c98d00";
		if(7 <= d && d < 10) return "#aa4c00";
		if(10 <= d) return "#8c2708";
	}
	
	//Wrapper for the grid & axes
	var axisGrid = g.append("g").attr("class", "axisWrapper");
	
	//Draw the background circles
	axisGrid.selectAll(".levels")
		 .data(d3.range(1,(cfg.levels+1)).reverse())
		 .enter()
		.append("circle")
		.attr("class", "gridCircle")
		.attr("r", function(d, i){return radius/cfg.levels*d + 6;})
		.style("fill", function(d, i){return getColor(d);})//function(d, i){return getColor(d);})
		.style("stroke", function(d, i){return getStrokeColor(d);})
		.style("fillOpacity", 0.5);


  // Some usefull functions for the legend	
	function getLevel(d){
		if(d == 0) return 'NC';
		if(d == 1) return 'P12';
		if(d == 2) return 'P11';
		if(d == 3) return 'P10';
		if(d == 4) return 'D9';
		if(d == 5) return 'D8';
		if(d == 6) return 'D7';
		if(d == 7) return 'R6';
		if(d == 8) return 'R5';
		if(d == 9) return 'R4';
		if(d == 10) return 'N3';
		if(d == 11) return 'N2';
		if(d == 12) return 'N1';
		
	}
	const sdm = [data[0].axes[0].value, data[0].axes[1].value, data[0].axes[2].value]
	// returns X position for the category label
	function getX(category){
		if(category == 0){
			return 4;
		} else if(category == 1){
			return 7 + cos( -1 * PI / 6) * sdm[1]*radius/cfg.levels;
		} else {
			return -20 + cos( -5 * PI / 6) * sdm[2]*radius/cfg.levels;
		}	
	}
	
	// returns Y position for the category label
	function getY(category){
		if(category == 0){
			return  4 - sdm[0]*radius/cfg.levels;			
		} else if(category == 1){
			return 4 - sin( -1 * PI / 6) * sdm[1]*radius/cfg.levels;
		} else {
			return 4 - sin( -5 * PI / 6) * sdm[2]*radius/cfg.levels;
		}
	}
	
	
	//Text indicating at what % each level is
	axisGrid.selectAll(".axisLabel")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter().append("text")
	   .attr("class", "axisLabel")
	   .attr("x", 4)
	   .attr("y", function(d){return 4 - d*radius/cfg.levels;})
	   .style("font-size", "10px")
	   .attr("fill", "#777777")
	   .text(function(d,i) { return getLevel(d); });
		 
	//Text indicating the level label for each point
 	for(let i = 0; i < 3; ++i){
 		axisGrid.append("text")
 			.attr("x", getX(i))
 			.attr("y", getY(i))
 			.style("font-size", "10px")
 			.attr("fill", "#000000")
 			.text(getLevel(sdm[i]))
 	}

	

	/////////////////////////////////////////////////////////
	//////////////////// Draw the axes //////////////////////
	/////////////////////////////////////////////////////////

	//Create the straight lines radiating outward from the center
	var axis = axisGrid.selectAll(".axis")
		.data(allAxis)
		.enter()
		.append("g")
		.attr("class", "axis");
	//Append the lines
	axis.append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", (d, i) => rScale(maxValue *1.1) * cos(angleSlice * i - HALF_PI))
		.attr("y2", (d, i) => rScale(maxValue* 1.1) * sin(angleSlice * i - HALF_PI))
		.attr("class", "line")
		.style("stroke", "white")
		.style("stroke-width", "2px");

	//Append the labels at each axis
	axis.append("text")
		.attr("class", "legend")
		.style("font-size", "11px")
		.attr("text-anchor", "middle")
		.attr("dy", "0.35em")
		.attr("x", (d,i) => rScale(maxValue * cfg.labelFactor) * cos(angleSlice * i - HALF_PI))
		.attr("y", (d,i) => rScale(maxValue * cfg.labelFactor) * sin(angleSlice * i - HALF_PI))
		.text(d => d)
		.call(wrap, cfg.wrapWidth);

	/////////////////////////////////////////////////////////
	///////////// Draw the radar chart blobs ////////////////
	/////////////////////////////////////////////////////////

	//The radial line function
	const radarLine = d3.radialLine()
		.curve(d3.curveLinearClosed)
		.radius(d => rScale(d.value))
		.angle((d,i) => i * angleSlice);

	if(cfg.roundStrokes) {
		radarLine.curve(d3.curveCardinalClosed)
	}

	//Create a wrapper for the blobs
	const blobWrapper = g.selectAll(".radarWrapper")
		.data(data)
		.enter().append("g")
		.attr("class", "radarWrapper");

	//Append the backgrounds
	blobWrapper
		.append("path")
		.attr("class", "radarArea")
		.attr("d", d => radarLine(d.axes))
		.style("fill", (d,i) => cfg.color(i))
		.style("fill-opacity", cfg.opacityArea);

	//Create the outlines
	blobWrapper.append("path")
		.attr("class", "radarStroke")
		.attr("d", function(d,i) { return radarLine(d.axes); })
		.style("stroke-width", cfg.strokeWidth + "px")
		.style("stroke", (d,i) => cfg.color(i))
		.style("fill", "none")
		.style("filter" , "url(#glow)");

	//Append the circles
	blobWrapper.selectAll(".radarCircle")
		.data(d => d.axes)
		.enter()
		.append("circle")
		.attr("class", "radarCircle")
		.attr("r", cfg.dotRadius)
		.attr("cx", (d,i) => rScale(d.value) * cos(angleSlice * i - HALF_PI))
		.attr("cy", (d,i) => rScale(d.value) * sin(angleSlice * i - HALF_PI))
		.style("fill", (d) => cfg.color(d.id))
		.style("fill-opacity", 0.8);

	return svg;
}
