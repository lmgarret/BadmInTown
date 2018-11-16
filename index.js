let map;
let clubs = [];
let departement_layer;
let club_marker_clusters = [];
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
	d3.csv("data/Club_geo.csv", function(club){
		if (club.lat !== "" && club.long !== ""){
			club.lat = parseFloat(club.lat);
			club.long = parseFloat(club.long);
			clubs.push(club);
		} else {
			console.log(`Club ${club.name} has no coord.`);
		}

	}).then( () => {
		// maps from https://github.com/gregoiredavid/france-geojson
		d3.json("data/france-departements_low.geojson").then((data) => {
			data.features.forEach((departement) => {
				departement.properties.density = 0;
				let cluster = create_clubs_marker_cluster(clubs,departement);
				club_marker_clusters.push(cluster);
			});
			departement_layer = L.geoJson(data, {style: dep_style,
    		onEachFeature: onEachFeature});
			departement_layer.addTo(map);
		}).then(() => {
			club_marker_clusters.forEach( cluster => {
				map.addLayer(cluster);
			})
		});
	});
}

function create_clubs_marker_cluster(clubs,departement){
	let club_cluster = L.markerClusterGroup({
		spiderfyOnMaxZoom: false,
		showCoverageOnHover: false,
		maxClusterRadius: 250,
		disableClusteringAtZoom: 9,
		iconCreateFunction: function(cluster) {
			let c = ' marker-cluster-';
			if (cluster.getChildCount() < 20) {
				c += 'small';
			} else if (cluster.getChildCount() < 45) {
				c += 'medium';
			} else {
				c += 'large';
			}

			return new L.DivIcon({ html: '<div><span>' + cluster.getChildCount() + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(0, 0) });
		}
	});
	const temp_markers = [];
	clubs.forEach( club => {
		let point = turf.point([club.long,club.lat]);
		if(turf.inside(point,departement)){
			departement.properties.density += 1;
			
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
		}
	})
	club_cluster.addLayers(temp_markers);
	return club_cluster;
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
