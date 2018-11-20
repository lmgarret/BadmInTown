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

let clubsLayer;
let tournamentsLayer;

main();

function main() {
    create_map().then(() => {
        //clubsLayer = new ClubsLayer();
        //clubsLayer.loadDataPoints(map);

        tournamentsLayer = new TournamentsLayer();
        tournamentsLayer.loadDataPoints(map);
    });
}

function create_map() {
    map = L.map('map', {minZoom: 0, maxZoom: 13}).setView([46.43, 2.30], 5.5);
    map._layersMaxZoom = 13;

    const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap, ©CartoDB'
    }).addTo(map);

    return d3.json('data/france_shape.geojson').then(geoJSON => {
        const france_light_layer = L.TileLayer.boundaryCanvas('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            boundary: geoJSON,
        });
        france_light_layer.addTo(map);
    }).then(() => {
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
            this._div.innerHTML = '<h4>Badminton Clubs density</h4>' + (props ?
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

function getColorClub(d) {
    //TODO use d3.interpolate ?
    return d > 65 ? '#00093A' :
        d > 45 ? '#01579B' :
            d > 30 ? '#0288D1' :
                d > 20 ? '#29B6F6' :
                    d > 15 ? '#4FC3F7' :
                        d > 10 ? '#81D4FA' :
                            d > 5 ? '#B3E5FC' :
                                '#E1F5FE';
}
