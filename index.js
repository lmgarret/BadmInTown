const INITIAL_COORD = [46.43, 2.30];
const INITIAL_ZOOM = 5.5;
let map;

let clubsLayer = new ClubsLayer();
let tournamentsLayer = new TournamentsLayer();
let activeLayer = undefined;

let franceLightLayer;

let loadingBar;
let sidebar;

const clubsSidebarPanel = {
    id: 'clubsPanel',                     // UID, used to access the panel
    tab: '<i class="fa fa-home" style="color: black;"></i>',  // content can be passed as HTML string,
    //pane: someDomNode.innerHTML,        // DOM elements can be passed, too
    title: 'Clubs',              // an optional pane header
    button: toggleLayerButton
};

const tournamentsSidebarPanel = {
    id: 'tournamentsPanel',                     // UID, used to access the panel
    tab: '<i class="fa fa-trophy" style="color: black;"></i>',  // content can be passed as HTML string,
    //pane: someDomNode.innerHTML,        // DOM elements can be passed, too
    title: 'Clubs',              // an optional pane header
    button: toggleLayerButton
};

main();

function main() {
    create_map().then(() => {
        sleep(100).then(() => {
            activeLayer = clubsLayer;
            let promiseClubs = clubsLayer.loadDataPoints(map);

            Promise.all([promiseClubs]).then(() => {
                createLeftControls();
                clubsLayer.show();
            });
        });

    });
}

function create_map() {
    map = L.map('map', {
        minZoom: 0,
        maxZoom: 13,
    }).setView(INITIAL_COORD, INITIAL_ZOOM);
    map._layersMaxZoom = 13;
    sidebar = L.control.sidebar({
        autopan: false,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
        container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
        position: 'left',     // left or right
    }).addTo(map);

    sidebar.addPanel(clubsSidebarPanel);

    loadingBar = L.control.custom({
        position: 'bottomleft',
        content: htmlLoadingBar(0),
        classes: 'panel panel-default',
        style:
            {
                width: '200px',
                margin: '20px',
                padding: '0px',
            },
    });

    return loadBaseLayers();
}

function loadBaseLayers() {
    const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        useCache: true,
        crossOrigin: true,
        cacheMaxAge:604800000, // 7 days, we don't need exact roads for this project
    }).addTo(map);

    return d3.json('geojson/france_shape_hd.geojson').then(geoJSON => {
        franceLightLayer = L.TileLayer.boundaryCanvas('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            boundary: geoJSON,
            useCache: true,
            crossOrigin: true,
            cacheMaxAge:604800000, // 7 days, we don't need exact roads for this project
        });

        map.createPane('labels');
        const positronLabels = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            useCache: true,
            crossOrigin: true,
            cacheMaxAge:604800000, // 7 days, we don't need exact roads for this project
            pane: 'labels'
        }).addTo(map);
    });
}

function createLeftControls() {
    const htmlFranceButton = '<button type="button" class="btn btn-group-first btn-france" id="franceButton">' +
        '   <img src="svg/fr.svg" alt="fr"  width="15" height="15" >' +
        '</button>';
    const htmlToggleButtonClubs = '<button type="button" class="btn btn-group-last" id="toggleButton">' +
        '   <i class="fa fa-home" style="color:black"></i>' +
        '</button>';
    const htmlToggleButtonTournaments = '<button type="button" class="btn btn-group-last" id="toggleButton">' +
        '   <i class="fa fa-trophy" style="color:black"></i>' +
        '</button>';

    let buttons;
    buttons = L.control.custom({
        position: 'topleft',
        content: htmlFranceButton + htmlToggleButtonClubs,
        classes: 'btn-group-vertical',
        style:
            {
                opacity: 1,
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
                                setActiveLayer(tournamentsLayer, [clubsLayer]);
                                buttons.container.innerHTML = htmlFranceButton + htmlToggleButtonTournaments;
                            } else if (tournamentsLayer.visible) {
                                setActiveLayer(clubsLayer, [tournamentsLayer]);
                                buttons.container.innerHTML = htmlFranceButton + htmlToggleButtonClubs;

                            } else {
                                console.log("ToggleControl: error onclick.");
                            }
                            break;
                        case "franceButton":
                            map.setView(INITIAL_COORD, INITIAL_ZOOM);
                            activeLayer.deselectAllDepartments();
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
function _onLoadStarted(){
    franceLightLayer.remove();
    loadingBar.addTo(map);
}
function _onLoadProgress() {
    let percentage = activeLayer.getLoadingPercentage();
    percentage = Math.round(percentage);
    percentage = percentage > 100 ? 100 : percentage;

    if( percentage % 10 === 0){
        loadingBar.container.innerHTML = htmlLoadingBar(percentage);
        //loadingBar.invalidateSize();
        //map.removeControl(loadingBar);
        //map.addControl(loadingBar);
        //loadingBar.remove();
        //loadingBar.addTo(map);
        //loadingBar.redraw();
        //map.redraw();
        console.log(`Loaded: ${percentage}`);
    }
    loadingBar.container.innerHTML = htmlLoadingBar(percentage);
    if(percentage === 100){
        franceLightLayer.addTo(map);
        loadingBar.remove();
    }
}

function htmlLoadingBar(percentage) {
    return `<div class="panel-body">` +
        `    <div class="progress" style="margin-bottom:0px;">` +
        `        <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="${percentage}" ` +
        `             aria-valuemin="0" aria-valuemax="100" style="min-width: 2em; width: ${percentage}%">` +
        `            ${percentage}%` +
        `        </div>` +
        `    </div>` +
        `</div>`;

}

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function toggleLayerButton(event){
    if (clubsLayer.visible) {
        setActiveLayer(tournamentsLayer, [clubsLayer]);
        sidebar.removePanel('clubsPanel');
        sidebar.addPanel(tournamentsSidebarPanel);
    } else if (tournamentsLayer.visible) {
        setActiveLayer(clubsLayer, [tournamentsLayer]);
        sidebar.removePanel('tournamentsPanel');
        sidebar.addPanel(clubsSidebarPanel);

    } else {
        console.log("ToggleControl: error onclick.");
    }
}

function setActiveLayer(layer, otherLayers = []){
    activeLayer = layer;

    for(let i = 0; i<otherLayers.length; i++) {
        otherLayers[i].hide();
    }

    if(activeLayer.loadingPromise === undefined){
        activeLayer.loadDataPoints();
    }

    activeLayer.show();
}
