
let map;

let clubsLayer;
let tournamentsLayer;

main();

function main() {
    create_map().then(() => {
        clubsLayer = new ClubsLayer();
        let promiseClubs = clubsLayer.loadDataPoints(map);

        tournamentsLayer = new TournamentsLayer();
        let promiseTournaments = tournamentsLayer.loadDataPoints(map);

        Promise.all([promiseClubs,promiseTournaments]).then(()=> {
            //tournamentsLayer.show();
            clubsLayer.show();
        });
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

        map.createPane('labels');
        const positronLabels = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            pane: 'labels'
        }).addTo(map);

    });
}
