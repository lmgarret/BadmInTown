let circleFileSVG = undefined;
let map = undefined;
// svg path for target icon
const targetSVG = "M9,0C4.029,0,0,4.029,0,9s4.029,9,9,9s9-4.029,9-9S13.971,0,9,0z M9,15.93 c-3.83,0-6.93-3.1-6.93-6.93S5.17,2.07,9,2.07s6.93,3.1,6.93,6.93S12.83,15.93,9,15.93 M12.5,9c0,1.933-1.567,3.5-3.5,3.5S5.5,10.933,5.5,9S7.067,5.5,9,5.5 S12.5,7.067,12.5,9z";
const circleSVG = "M9,0C4.029,0,0,4.029,0,9s4.029,9,9,9s9-4.029,9-9S13.971,0,9,0z";

main();

function main() {
	// populate the city dropdown when the page loads
	AmCharts.ready( function() {
		console.log("Loading csv...")
		loadCSVPoints();
		console.log("CSV points created.")
	} );
	loadResources().then(() => {
		console.log("Loaded resources")
		createMap();
	});
}

async function loadResources() {
	console.log("Loading resources...")
	const loadResp = await fetch('svg/circle.svg');
	circleFileSVG = await loadResp.text();
	return circleFileSVG;
}

async function loadCSVPoints(){
	console.log("Loading csv...")
	let tournaments = [];
	let clubs = [];
	let clubPoints = [];
	await d3.csv("data/Tournament.csv", function(data) {
		tournaments.push(data)
	});
	await d3.csv("data/Club.csv", function(data) {
		let club = data;
		club.nb_tournaments = 0;
		tournaments.forEach( tournament => {
			if (tournament.club_id === club.id) {
				club.lat = tournament.lat;
				club.long = tournament.long;
				club.nb_tournaments++;
			}
		});
		clubs = addClubPoint(data, clubPoints);
	});
	map.dataProvider.images = clubPoints;
	map.validateData();
  //map.animateData( map.dataProvider, { duration: 1000 } );
	//map.write("mapdiv");
}

function createMap() {
	console.log("Creating map...")
	map = AmCharts.makeChart( "chartdiv", {
		"type": "map",
		"theme": "light",
		"colorSteps": 10,
  	"showDescriptionOnHover": false,

		"dataProvider": {
			"map": "franceDepartmentsLow",
			"getAreasFromMap": true,
			"areas": [ {
					"id":"FR-01",
					"title":"Ain"},
				{"id":"FR-02",
					"title":"Aisne"},
				{	"id":"FR-03",
					"title":"Allier"},
				{"id":"FR-04",
					"title":"Alpes-de-Haute-Provence"},
				{"id":"FR-05",
					"title":"Hautes-Alpes"},
				{"id":"FR-06",
					"title":"Alpes-Maritimes"},
				{"id":"FR-07",
					"title":"Ardèche"},
				{"id":"FR-08",
					"title":"Ardennes"},
				{"id":"FR-09",
					"title":"Ariège"},
				{"id":"FR-10",
					"title":"Aube"},
				{"id":"FR-11",
					"title":"Aude"},
				{"id":"FR-12",
					"title":"Aveyron"},
				{	"id":"FR-13",
					"title":"Bouches-du-Rhône"},
				{	"id":"FR-14",
					"title":"Calvados"},
				{	"id":"FR-15",
					"title":"Cantal"},
				{	"id":"FR-16",
					"title":"Charente"},
				{	"id":"FR-17",
					"title":"Charente-Maritime"},
				{	"id":"FR-18",
					"title":"Cher"},
				{	"id":"FR-19",
					"title":"Corrèze"},
				{	"id":"FR-2A",
					"title":"Corse-du-Sud"},
				{	"id":"FR-2B",
					"title":"Haute-Corse"},
				{	"id":"FR-21",
					"title":"Côte-d'Or"},
				{	"id":"FR-22",
					"title":"Côtes-d'Armor"},
				{	"id":"FR-23",
					"title":"Creuse"},
				{"id":"FR-24",
					"title":"Dordogne"},
				{	"id":"FR-25",
					"title":"Doubs"},
				{	"id":"FR-26",
					"title":"Drôme"},
				{	"id":"FR-27",
					"title":"Eure"},
				{"id":"FR-28",
					"title":"Eure-et-Loir"},
				{	"id":"FR-29",
					"title":"Finistère"},
				{	"id":"FR-30",
					"title":"Gard"},
				{	"id":"FR-31",
					"title":"Haute-Garonne"},
				{	"id":"FR-32",
					"title":"Gers"},
				{	"id":"FR-33",
					"title":"Gironde"},
				{	"id":"FR-34",
					"title":"Hérault"},
				{	"id":"FR-35",
					"title":"Ille-et-Vilaine"},
				{	"id":"FR-36",
					"title":"Indre"},
				{	"id":"FR-37",
					"title":"Indre-et-Loire"},
				{	"id":"FR-38",
					"title":"Isère"},
				{	"id":"FR-39",
					"title":"Jura"},
				{	"id":"FR-40",
					"title":"Landes"},
				{	"id":"FR-41",
					"title":"Loir-et-Cher"},
				{	"id":"FR-42",
					"title":"Loire"},
				{	"id":"FR-43",
					"title":"Haute-Loire"},
				{	"id":"FR-44",
					"title":"Loire-Atlantique"},
				{	"id":"FR-45",
					"title":"Loiret"},
				{	"id":"FR-46",
					"title":"Lot"},
				{	"id":"FR-47",
					"title":"Lot-et-Garonne"},
				{	"id":"FR-48",
					"title":"Lozère"},
				{	"id":"FR-49",
					"title":"Maine-et-Loire"},
				{	"id":"FR-50",
					"title":"Manche"},
				{	"id":"FR-51",
					"title":"Marne"},
				{	"id":"FR-52",
					"title":"Haute-Marne"},
				{	"id":"FR-53",
					"title":"Mayenne"},
				{	"id":"FR-54",
					"title":"Meurthe-et-Moselle"},
				{	"id":"FR-55",
					"title":"Meuse"},
				{	"id":"FR-56",
					"title":"Morbihan"},
				{	"id":"FR-57",
					"title":"Moselle"},
				{	"id":"FR-58",
					"title":"Nièvre"},
				{	"id":"FR-59",
					"title":"Nord"},
				{	"id":"FR-60",
					"title":"Oise"},
				{	"id":"FR-61",
					"title":"Orne"},
				{	"id":"FR-62",
					"title":"Pas-de-Calais"},
				{	"id":"FR-63",
					"title":"Puy-de-Dôme"},
				{	"id":"FR-64",
					"title":"Pyrénées-Atlantiques"},
				{	"id":"FR-65",
					"title":"Hautes-Pyrénées"},
				{	"id":"FR-66",
					"title":"Pyrénées-Orientales"},
				{	"id":"FR-67",
					"title":"Bas-Rhin"},
				{	"id":"FR-68",
					"title":"Haut-Rhin"},
				{	"id":"FR-69",
					"title":"Rhône"},
				{	"id":"FR-70",
					"title":"Haute-Saône"},
				{	"id":"FR-71",
					"title":"Saône-et-Loire"},
				{	"id":"FR-72",
					"title":"Sarthe"},
				{	"id":"FR-73",
					"title":"Savoie"},
				{	"id":"FR-74",
					"title":"Haute-Savoie"},
				{	"id":"FR-75",
					"title":"Ville de Paris"},
				{	"id":"FR-76",
					"title":"Seine-Maritime"},
				{	"id":"FR-77",
					"title":"Seine-et-Marne"},
				{	"id":"FR-78",
					"title":"Yvelines"},
				{	"id":"FR-79",
					"title":"Deux-Sèvres"},
				{	"id":"FR-80",
					"title":"Somme"},
				{	"id":"FR-81",
					"title":"Tarn"},
				{	"id":"FR-82",
					"title":"Tarn-et-Garonne"},
				{	"id":"FR-83",
					"title":"Var"},
				{	"id":"FR-84",
					"title":"Vaucluse"},
				{	"id":"FR-85",
					"title":"Vendée"},
				{	"id":"FR-86",
					"title":"Vienne"},
				{	"id":"FR-87",
					"title":"Haute-Vienne"},
				{	"id":"FR-88",
					"title":"Vosges"},
				{	"id":"FR-89",
					"title":"Yonne"},
				{	"id":"FR-90",
					"title":"Territoire de Belfort"},
				{	"id":"FR-91",
					"title":"Essonne"},
				{	"id":"FR-92",
					"title":"Hauts-de-Seine"},
				{	"id":"FR-93",
					"title":"Seine-Saint-Denis"},
				{	"id":"FR-94",
					"title":"Val-de-Marne"},
				{	"id":"FR-95",
					"title":"Val-d'Oise"}
			]

		},

		"areasSettings": {
			"autoZoom": true
		},

	  "imagesSettings": {
	    "color": "#CC0000",
	    "rollOverColor": "#CC0000",
	    "selectedColor": "#000000",
	    "balloonText": "Club: <strong>[[title]]</strong>"
	  },

		"export": {
			"enabled": true
		},
		"listeners": [{
    "event": "clickMapObject",
    "method": function(event) {
				//TODO fill interaction with points
				console.log(event.event);

  			//alert('ModalClick');
				//map.closeAllPopups();
				//map.openPopup("We clicked on <strong>" + ev.target.dataItem.dataContext.name + "</strong>");
	    }
		}]

	} );
}
function addClubPoint(club, points) {
	customData = `
		<p align="left">City: ${club.city_name}</p>
		<p align="left">URL: <a href="https://badiste.fr/${club.url}">badiste.fr</a></p>
		<p align="left">Tournaments: ${club.nb_tournaments}</p>
		`;

  const point = new AmCharts.MapImage();
  point.title = club.name;
	point.description = customData;
  point.latitude = club.lat;
  point.longitude = club.long;
	point.type = 'circle';
	point.color = 'blue';
	point.selectable = true;
  //point.svgPath = circleSVG;
	//point.imageURL = "svg/circle.svg"
  point.zoomLevel = 5;
  point.scale = 0.6 * Math.pow(1.02, club.nb_tournaments);
  point.chart = map;
	points.push(point);

	return points;
}

function addTournamentPoint(tournament, points) {
	let sameLocationExists = false;
	points.forEach( point =>{
		if(point.latitude === tournament.lat && point.longitude === tournament.long){
			//point.width = point.width * 2;
			//point.height = point.height * 2;
			point.scale = 	point.scale * 1.15;
			//point.validate();
			sameLocationExists = true;
			//console.log(`Same location exists:i=${index} (${point.latitude},${point.longitude})`)
		}
	})
	if(!sameLocationExists){
		const p2 = tournament.price_2_tabs;
		const p3 = tournament.price_3_tabs;
		customData = `
			<p align="left">Starting: ${tournament.start_date}</p>
			<p align="left">URL: <a href="https://badiste.fr/${tournament.url}">badiste.fr</a></p>
			<p align="left">Prix 1 tableau: ${tournament.price_1_tab}€</p>
			${p2 !== undefined && p2 !== "" ? `<p align="left">Prix 2 tableaux: ${p2}€</p>`: ""}
			${p3 !== undefined && p3 !== ""  ? `<p align="left">Prix 2 tableaux: ${p3}€</p>` : ""}
			`;

	  const point = new AmCharts.MapImage();
	  point.title = tournament.name;
		point.description = customData;
	  point.latitude = tournament.lat;
	  point.longitude = tournament.long;
		point.type = 'circle';
		point.color = 'blue';
		point.selectable = true;
	  //point.svgPath = circleSVG;
		//point.imageURL = "svg/circle.svg"
	  point.zoomLevel = 5;
	  point.scale = 0.5;
	  point.chart = map;

		points.push(point);
	}
	return points;
}
