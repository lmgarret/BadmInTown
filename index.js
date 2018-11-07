let map = undefined;
let mapTitleLabel = undefined;

let clubSeries = undefined; //club imageSeries of the map
let tournamentSeries = undefined; //tournament imageSeries of the map

let tournaments = [];
let clubs = [];

// svg path for target icon
const targetSVG = "M9,0C4.029,0,0,4.029,0,9s4.029,9,9,9s9-4.029,9-9S13.971,0,9,0z M9,15.93 c-3.83,0-6.93-3.1-6.93-6.93S5.17,2.07,9,2.07s6.93,3.1,6.93,6.93S12.83,15.93,9,15.93 M12.5,9c0,1.933-1.567,3.5-3.5,3.5S5.5,10.933,5.5,9S7.067,5.5,9,5.5 S12.5,7.067,12.5,9z";
const circleSVG = "M9,0C4.029,0,0,4.029,0,9s4.029,9,9,9s9-4.029,9-9S13.971,0,9,0z";
let circleFileSVG = undefined;

main();

function main() {
	// populate the city dropdown when the page loads
	/*AmCharts.ready( function() {
		console.log("Loading csv...")
		loadCSVPoints();
		console.log("CSV points created.")
	} );*/
	loadResources().then(() => {
		console.log("Loaded resources")
		createMap();
		createMapUI();
		loadCSVPoints();
	});
}

async function loadResources() {
	console.log("Loading resources...")
	const loadResp = await fetch('svg/circle.svg');
	circleFileSVG = await loadResp.text();
	return circleFileSVG;
}

function loadCSVPoints(){
	console.log("Loading csv...")
	let clubPoints = [];
	d3.csv("data/Tournament.csv", function(data){
		let tournament = data;
		tournament.lat = parseFloat(tournament.lat);
		tournament.long = parseFloat(tournament.long);
		tournament.title = tournament.name;
		tournaments.push(tournament);

		const tournamentPoint = tournamentSeries.mapImages.create();
		tournamentPoint.latitude = tournament.lat;
		tournamentPoint.longitude = tournament.long;
		tournamentPoint.tooltipText = tournament.name;
		tournamentPoint.title = tournament.name;
	})
	.then( () => {
		d3.csv("data/Club_geo.csv")
		.then(data => {
			data.forEach(club => {
				club.title = club.name;

				if(club.lat !== "" && club.long !== ""){

					const clubPoint = clubSeries.mapImages.create();
					club.lat = parseFloat(club.lat);
					club.long = parseFloat(club.long);
					clubs.push(club);

					clubPoint.latitude = club.lat;
					clubPoint.longitude = club.long;
					clubPoint.tooltipText = club.name;
					clubPoint.title = club.name;
					clubPoint.tooltip.background.fill = am4core.color("#CEB1BE");
				}else{
					console.log(`Club ${club.name} has no coords.`)
				}
			});
	 });
	});

  //map.animateData( map.dataProvider, { duration: 1000 } );
	//map.write("mapdiv");
}

function createMap() {
	console.log("Creating map...")
  map = am4core.create("chartdiv", am4maps.MapChart);
	map.geodata = am4geodata_franceDepartmentsLow;
	map.projection = new am4maps.projections.Mercator();
	const  polygonSeries = map.series.push(new am4maps.MapPolygonSeries());
	polygonSeries.useGeodata = true;
	polygonSeries.mapPolygons.template.events.on("hit", function(ev) {
	  map.zoomToMapObject(ev.target);
	});

	// Configure series
	const polygonTemplate = polygonSeries.mapPolygons.template;
	polygonTemplate.tooltipText = "{name}";
	polygonTemplate.fill = am4core.color("#80e5ff");

	// Create hover state and set alternative fill color
	const hs = polygonTemplate.states.create("hover");
	hs.properties.fill = am4core.color("#1ad1ff");

	clubSeries = map.series.push(new am4maps.MapImageSeries());
	const clubSeriesTemplate = clubSeries.mapImages.template;
	const clubCircle = clubSeriesTemplate.createChild(am4core.Circle);
	clubCircle.radius = 4.5;
	clubCircle.fill = am4core.color('#ff3333');
	clubCircle.stroke = am4core.color("#FFFFFF");
	clubCircle.strokeWidth = 0.2;
	clubCircle.nonScaling = false;
	clubCircle.tooltipText = "{title}";
	clubSeriesTemplate.propertyFields.latitude = "lat";
	clubSeriesTemplate.propertyFields.longitude = "long";
	clubSeries.mapImages.template.events.on("hit", function(ev) {
		map.zoomToMapObject(ev.target);
		map.openModal(ev.target.title);
	});

	tournamentSeries = map.series.push(new am4maps.MapImageSeries());
	tournamentSeries.hoverable = true;
	const tournamentSeriesTemplate= tournamentSeries.mapImages.template;
	const tournCircle = tournamentSeriesTemplate.createChild(am4core.Circle);
	tournCircle.radius = 3;
	tournCircle.fill = am4core.color('#0040ff');
	tournCircle.stroke = am4core.color("#FFFFFF");
	tournCircle.strokeWidth = 0.2;
	tournCircle.nonScaling = false;
	tournamentSeriesTemplate.propertyFields.latitude = "lat";
	tournamentSeriesTemplate.propertyFields.longitude = "long";
	tournamentSeries.mapImages.template.events.on("hit", function(ev) {
		map.zoomToMapObject(ev.target);
		map.openModal(ev.target.title);
	});
}

/**
* Creates top left and right buttons for interacting with the map
*/
function createMapUI() {
 	mapTitleLabel = map.chartContainer.createChild(am4core.Label);
	mapTitleLabel.text = "Both";

	map.exporting.menu = new am4core.ExportMenu();

	const home = map.chartContainer.createChild(am4core.Button);
	home.label.text = "Home";
	home.align = "left";
	home.events.on("hit", function(ev) {
		map.goHome();
	});
	home.dy = 20;

	const toggleClubTournaments = map.chartContainer.createChild(am4core.Button);
	toggleClubTournaments.label.text = "Toggle";
	toggleClubTournaments.align = "left";
	toggleClubTournaments.events.on("hit", function(ev) {
		if(!clubSeries.isHidden && !tournamentSeries.isHidden){
			clubSeries.show(500);
			tournamentSeries.hide(250);
			mapTitleLabel.text = "Clubs";
		}else if (!clubSeries.isHidden && tournamentSeries.isHidden){
			clubSeries.hide(500);
			tournamentSeries.show(250);
			mapTitleLabel.text = "Tournaments";
		} else {
			clubSeries.show(250);
			tournamentSeries.show(250);
			mapTitleLabel.text = "Both";
		}
	});
	toggleClubTournaments.dy = 60;
}
