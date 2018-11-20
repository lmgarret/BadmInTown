const MODE_CLUB = "club";
const MODE_TOURNAMENT = "tournament";

let map;

let clubs = [];
let club_marker_clusters = [];
let departement_club_layer;

let tournaments = [];
let tournament_marker_clusters = [];
let departement_tournament_layer;

let info = L.control();
let legend = L.control({position: 'bottomright'});

main();

function main() {
	create_map().then( () => {
		//loadClubs();
		loadTournaments();
	});
}

function create_map(){
	map = L.map('map',{minZoom: 0,  maxZoom: 13}).setView([46.43, 2.30], 5.5);
 	map._layersMaxZoom = 13;

	const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap, ©CartoDB'
	}).addTo(map);

	return d3.json('data/france_shape.geojson').then( geoJSON => {
		const france_light_layer = L.TileLayer.boundaryCanvas('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
	      attribution: '©OpenStreetMap, ©CartoDB',
		    boundary: geoJSON,
		  });
		france_light_layer.addTo(map);
	}).then( () => {
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
		            '<i style="background:' + getColorClub(grades[i] + 1) + '"></i> ' +
		            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
		    }

		    return div;
		};

		legend.addTo(map);
	});
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
				club_marker_clusters[departement.properties.code] = cluster;
			});
			departement_club_layer = L.geoJson(
				data,
				{style: dep_style_club,
				onEachFeature: onEachFeature(MODE_CLUB)
				}
			);
			departement_club_layer.addTo(map);
		}).then(() => {
			for (const [key, value] of Object.entries(club_marker_clusters)) {
				map.addLayer(value);
			}
		});
	});
}


function create_clubs_marker_cluster(clubs,departement){
		//This function will be set as radiusFn(zoom) in the function _generateInitialClusters
	var GetRadius = function (zoom) {
    return zoom > 8.5 ? 2 :
                      250;
	}

	let club_cluster = L.markerClusterGroup({
		spiderfyOnMaxZoom: true,
		showCoverageOnHover: false,
		maxClusterRadius: GetRadius,
		disableClusteringAtZoom: 21,
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
	            fillOpacity: 0.8,
							weight: 0 //stroke width
	        })
			.bindPopup(`${club.name}`);
			marker.on({
				click: moveViewTo
			});
			temp_markers.push(marker);
		}
	})
	club_cluster.addLayers(temp_markers);
	return club_cluster;
}

function loadTournaments(){
	d3.csv("data/Tournament.csv", function(tournament){
		if (tournament.lat !== "" && tournament.long !== ""){
			tournament.lat = parseFloat(tournament.lat);
			tournament.long = parseFloat(tournament.long);
			tournaments.push(tournament);
		} else {
			console.log(`Tournament ${tournament.name} has no coord.`);
		}

	}).then( () => {
		// maps from https://github.com/gregoiredavid/france-geojson
		d3.json("data/france-departements_low.geojson").then((data) => {
			data.features.forEach((departement) => {
				departement.properties.density = 0;
				let cluster = create_tournaments_marker_cluster(tournaments,departement);
				tournament_marker_clusters[departement.properties.code] = cluster;
			});
			departement_tournament_layer = L.geoJson(
				data,
				{
					style: dep_style_tournament,
					onEachFeature: onEachFeature(MODE_TOURNAMENT)
				}
			);
			departement_tournament_layer.addTo(map);
		}).then(() => {
			for (const [key, value] of Object.entries(tournament_marker_clusters)) {
				map.addLayer(value);
			}
		});
	});
}

function create_tournaments_marker_cluster(tournaments,departement){
		//This function will be set as radiusFn(zoom) in the function _generateInitialClusters
	var GetRadius = function (zoom) {
    return zoom > 8.5 ? 2 :
                      250;
	}

	let tournament_cluster = L.markerClusterGroup({
		spiderfyOnMaxZoom: true,
		showCoverageOnHover: false,
		maxClusterRadius: GetRadius,
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
	tournaments.forEach( tournament => {
		let point = turf.point([tournament.long,tournament.lat]);
		if(turf.inside(point,departement)){
			departement.properties.density += 1;

			const marker = new L.CircleMarker([tournament.lat, tournament.long],{
				      radius: 6,
	            fillColor: '#FFEB3B',
	            fillOpacity: 0.8,
							weight: 0 //stroke width
	        })
			.bindPopup(`${tournament.name}`);
			marker.on({
				click: moveViewTo
			});
			temp_markers.push(marker);
		}
	})
	tournament_cluster.addLayers(temp_markers);
	return tournament_cluster;
}
function other_countries_style(region) {
  return {
     fillColor: "#000000",
		 weight: 1, //stroke width
		 opacity: 1,
		 color: 'white',  //Outline color
		 fillOpacity: 0.9
  };
}

function dep_style_club(region) {
  return {
     fillColor: getColorClub(region.properties.density),
		 weight: 1, //stroke width
		 opacity: 1,
		 color: 'white',  //Outline color
		 fillOpacity: 1
  };
}

function dep_style_tournament(region) {
  return {
     fillColor: getColorTournament(region.properties.density),
		 weight: 1, //stroke width
		 opacity: 1,
		 color: 'white',  //Outline color
		 fillOpacity: 0.8
  };
}
function getColorClub(d) {
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

function getColorTournament(d) {
	//TODO use d3.interpolate ?
    return d > 65 ? '#FF6F00' :
           d > 45  ? '#FF8F00' :
           d > 30 ? '#FFA000' :
           d > 20  ? '#FFB300' :
           d > 15   ? '#FFC107' :
           d > 10   ? '#FFCA28' :
           d > 5   ? '#FFD54F' :
                      '#FFE082';
}

function highlightFeature(mode) {
	return function highlightFeature(e) {
		let layer = e.target;
		let dep_code = layer.feature.properties.code;

		if(mode === MODE_CLUB){
			departement_club_layer.eachLayer( l => departement_club_layer.resetStyle(l))
			layer.setStyle({
	        color: '#666',
	        dashArray: '',
	        fillOpacity: 0.7
	    });
			/*if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
					layer.bringToFront();
					tournament_marker_clusters[dep_code].eachLayer(function(l) {
						l.bringToFront();
					});
			}*/
		}else if (mode === MODE_TOURNAMENT){
			departement_tournament_layer.eachLayer( l => departement_tournament_layer.resetStyle(l))
			layer.setStyle({
					dashArray: '',
					fillOpacity: 0,
			});
		}
		info.update(layer.feature.properties);
	}
}

function resetHighlight(mode) {
		return function resetHighlight(e) {
			let polygon = e.target.toGeoJSON();
			let point = turf.point([e.latlng.lng,e.latlng.lat]);

			if(!turf.inside(point,polygon)){
				if(mode === MODE_CLUB){
					departement_club_layer.resetStyle(e.target);
				}else if (mode === MODE_TOURNAMENT){
					departement_tournament_layer.resetStyle(e.target);
				}
			}
		  info.update();
    }
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function moveViewTo(e){
	map.setView(e.latlng);
}

function onEachFeature(mode) {
	return function onEachFeature(feature, layer) {
				layer.on({
					mouseover: highlightFeature(mode),
					mouseout: resetHighlight(mode),
					click: zoomToFeature
				});
	}
}
