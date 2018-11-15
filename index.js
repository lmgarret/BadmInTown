/*
 the script mus be loaded after the map div is defined.
 otherwise this will not work (we would need a listener to
 wait for the DOM to be fully loaded).

 Just put the script tag below the map div.

 The source code below is the example from the leaflet start page.
 */
let map;
let clubs = [];
let departement_layer;
let club_markers;
let info = L.control();
let legend = L.control({position: 'bottomright'});

main();

function main() {
	create_map();
	loadClubs();
}

function create_map(){
	map = L.map('map',{minZoom: 0,  maxZoom: 15}).setView([46.43, 2.30], 5.5);
 	map._layersMaxZoom = 19;

	const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap, ©CartoDB'
	}).addTo(map);

	map.createPane('labels');
	const positronLabels = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
	        attribution: '©OpenStreetMap, ©CartoDB',
	        pane: 'labels'
	}).addTo(map);

	info.onAdd = function (map) {
	    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
	    this.update();
	    return this._div;
	};

	// method that we will use to update the control based on feature properties passed
	info.update = function (props) {
	    this._div.innerHTML = '<h4>Badminton Clubs density</h4>' +  (props ?
	        '<b>' + props.nom + '</b><br />' + props.density + ' Clubs</sup>'
	        : 'Hover over a departement');
	};

	info.addTo(map);


	legend.onAdd = function (map) {

	    var div = L.DomUtil.create('div', 'info legend'),
	        grades = [0, 5, 10, 15, 20, 30, 45, 65],
	        labels = [];

	    // loop through our density intervals and generate a label with a colored square for each interval
	    for (var i = 0; i < grades.length; i++) {
	        div.innerHTML +=
	            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
	            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
	    }

	    return div;
	};

	legend.addTo(map);
}


function loadClubs(){
	club_markers = L.markerClusterGroup({
	//spiderfyOnMaxZoom: false,
		showCoverageOnHover: false,
		maxClusterRadius: 60,
		disableClusteringAtZoom: 9
	});
	const temp_markers = [];
	const geo_points = []

	d3.csv("data/Club_geo.csv", function(club){
		if (club.lat !== "" && club.long !== ""){
			club.lat = parseFloat(club.lat);
			club.long = parseFloat(club.long);
			clubs.push(club);
			geo_points.push([club.long,club.lat]);

			const marker = new L.CircleMarker([club.lat, club.long],{
				      radius: 6,
	            fillColor: '#0D47A1',
	            fillOpacity: 0.5,
							weight: 0 //stroke width
	        })
			.bindPopup(`${club.name}`);
			marker.on('click', function(e){
				map.setView(e.latlng);
			});
			temp_markers.push(marker);
		} else {
			console.log(`Club ${club.name} has no coord.`);
		}

	}).then( () => {
		// maps from https://github.com/gregoiredavid/france-geojson
		d3.json("data/france-departements_low.geojson").then((data) => {
			let turf_points = turf.points(geo_points);
			data.features.forEach((polygon) => {
				let ptsWithin = turf.pointsWithinPolygon(turf_points, polygon);
				if(ptsWithin.features.length !== 0){
					polygon.properties.density = ptsWithin.features.length;
				}
			});
			departement_layer = L.geoJson(data, {style: dep_style,
    		onEachFeature: onEachFeature});
			departement_layer.addTo(map);
		}).then(() => {
				club_markers.addLayers(temp_markers);
				map.addLayer(club_markers);
		});
	});
}

function dep_style(region) {
  return {
     fillColor: getColor(region.properties.density),
		 weight: 1, //stroke width
		 opacity: 1,
		 color: 'white',  //Outline color
		 fillOpacity: 0.7
  };
}
function getColor(d) {
	//TODO use d3.interpolate ?
    return d > 65 ? '#00093A' :
           d > 45  ? '#01579B' :
           d > 30 ? '#0288D1' :
           d > 20  ? '#29B6F6' :
           d > 15   ? '#4FC3F7' :
           d > 10   ? '#81D4FA' :
           d > 5   ? '#B3E5FC' :
                      '#E1F5FE';
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        //layer.bringToFront();
    }
    info.update(layer.feature.properties);
}

function resetHighlight(e) {
    departement_layer.resetStyle(e.target);
    info.update();
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}
