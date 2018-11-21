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

        Promise.all([promiseClubs, promiseTournaments]).then(() => {
            //createToggleControl();
            createLeftControls();
            //tournamentsLayer.show();
            clubsLayer.show();
        });
    });
}

function create_map() {
    map = L.map('map', {
        minZoom: 0,
        maxZoom: 13,
    }).setView([46.43, 2.30], 5.5);
    map._layersMaxZoom = 13;

    const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap, ©CartoDB'
    }).addTo(map);

    return d3.json('geojson/france_shape.geojson').then(geoJSON => {
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

function createLeftControls() {
    const htmlFranceButton = '<button type="button" class="btn btn-group-first btn-france" id="franceButton">'+
        '   <img src="svg/fr.svg" alt="fr"  width="15" height="15" >'+
        '</button>';
    const htmlToggleButtonClubs = '<button type="button" class="btn btn-group-last" id="toggleButton">' +
        '   <i class="fa fa-home"></i>'+
        '</button>';
    const htmlToggleButtonTournaments = '<button type="button" class="btn btn-group-last" id="toggleButton">' +
        '   <i class="fa fa-trophy"></i>'+
        '</button>';

    let buttons;
    buttons = L.control.custom({
        position: 'topleft',
        content: htmlFranceButton + htmlToggleButtonClubs,
        classes: 'btn-group-vertical btn-group-sm',
        style:
            {
                opacity: '1',
            },
        datas:
            {
                'foo': 'bar',
            },
        events:
            {
                click: function (data) {
                    switch (data.target.id) {
                        case "toggleButton":
                            if (clubsLayer.visible) {
                                clubsLayer.hide();
                                tournamentsLayer.show();
                                buttons.container.innerHTML = htmlFranceButton + htmlToggleButtonTournaments;
                            } else if (tournamentsLayer.visible) {
                                clubsLayer.show();
                                tournamentsLayer.hide();
                                buttons.container.innerHTML = htmlFranceButton + htmlToggleButtonClubs;

                            } else {
                                console.log("ToggleControl: error onclick.");
                            }
                            break;
                        case "franceButton":
                            map.setView([46.43, 2.30], 5.5);
                            break;
                        default:
                            break;

                    }
                },
                dblclick: function (data) {
                    console.log('wrapper div element dblclicked');
                    //console.log(data);
                },
                contextmenu: function (data) {
                    console.log('wrapper div element contextmenu');
                    //console.log(data);
                },
            }
    }).addTo(map);
}

function createToggleControl() {
    let toggleControl = L.control({position: 'bottomleft'});
    toggleControl.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };
    toggleControl.update = function (map) {
        if (clubsLayer.visible) {
            this._div.innerHTML = 'Clubs'
        } else if (tournamentsLayer.visible) {
            this._div.innerHTML = 'Tournaments';
        } else {
            this._div.innerHTML = 'Unknown';
        }
    };
    toggleControl.onclick = function () {
    };

    toggleControl.addTo(map);
}
