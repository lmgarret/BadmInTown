const INITIAL_COORD = [46.43, 2.30];
const INITIAL_ZOOM = 5.5;
let map;

let clubsLayer = new ClubsLayer();
let tournamentsLayer = new TournamentsLayer();
let activeLayer = undefined;
let players = [];

let franceLightLayer;

let loadingBar;
let sidebar;
let statsSidebarPane;
let infoSidebarPane;
let stackChart;
let topClubs;
main();

function main() {
    create_map().then(() => {
        sleep(100).then(() => {
            activeLayer = clubsLayer;
            let promiseClubs = clubsLayer.loadDataPoints(map);

            Promise.all([promiseClubs, loadPlayers()]).then(() => {
                //TODO see how to integrate this
                //sidebar.addPanel(clubsLayer.getSideBarPanelButton());
                clubsLayer.show();
                sidebar.open("home");

                console.log("Building stacked chart...");

                stackChart = new DivergingStackChart();
                topClubs = getNTopClubs(10, clubsLayer.getClubs(), "N");
                stackChart.update(topClubs, "Top 10 Clubs: France");
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

    //added function to setView with an offset in pixels after zooming
    L.Map.prototype.setViewOffset = function (latlng, offset, targetZoom) {
        let targetPoint = this.project(latlng, targetZoom).subtract(offset),
            targetLatLng = this.unproject(targetPoint, targetZoom);
        return this.setView(targetLatLng, targetZoom);
    };

    createUI();

    return loadBaseLayers();
}

function createUI() {

    sidebar = L.control.sidebar({
        //autopan: true,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
        container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
        position: 'left',     // left or right
    }).addTo(map);

    infoSidebarPane = {
        id: 'infoPane',                     // UID, used to access the panel
        tab: '<i class="fa fa-info"></i>',  // content can be passed as HTML string,
        pane: "Click on a data point to get more info about it.",        // DOM elements can be passed, too
        title: 'Info',              // an optional pane header
    };
    sidebar.addPanel(infoSidebarPane);


    statsSidebarPane = {
        id: 'statsPane',                     // UID, used to access the panel
        pane: "<div id= \"stacked-chart-div\">" +
            "<div id= \"stacked-chart-title\" class='legend'></div>" +
            "<svg id=\"figure\"></svg>" +       // DOM elements can be passed, too
            "<div id= \"stacked-chart-legend\" class='legend'></div>" +
            "</div>",
        tab: '<i class="fa fa-chart-bar "></i>',  // content can be passed as HTML string,
        title: 'Statistics',              // an optional pane header
    };
    sidebar.addPanel(statsSidebarPane);

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

    const htmlFranceButton = '<button type="button" class="btn btn-france" id="franceButton">' +
        '   <img src="svg/fr.svg" alt="fr"  width="15" height="15" >' +
        '</button>';

    let buttons;
    buttons = L.control.custom({
        position: 'topleft',
        content: htmlFranceButton,
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
                        case "franceButton":
                            stackChart.update(topClubs, "Top 10 Clubs: France");
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

function loadBaseLayers() {
    const positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        useCache: true,
        crossOrigin: true,
        cacheMaxAge: 604800000, // 7 days, we don't need exact roads for this project
    }).addTo(map);

    return d3.json('geojson/france_shape_hd.geojson').then(geoJSON => {
        franceLightLayer = L.TileLayer.boundaryCanvas('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            boundary: geoJSON,
            useCache: true,
            crossOrigin: true,
            cacheMaxAge: 604800000, // 7 days, we don't need exact roads for this project
        });

        map.createPane('labels');
        const positronLabels = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            useCache: true,
            crossOrigin: true,
            cacheMaxAge: 604800000, // 7 days, we don't need exact roads for this project
            pane: 'labels'
        }).addTo(map);
    });
}

function _onLoadStarted() {
    franceLightLayer.remove();
    loadingBar.addTo(map);
}

function _onLoadProgress() {
    let percentage = activeLayer.getLoadingPercentage();
    percentage = Math.round(percentage);
    percentage = percentage > 100 ? 100 : percentage;

    if (percentage % 10 === 0) {
        loadingBar.container.innerHTML = htmlLoadingBar(percentage);
        console.log(`Loaded: ${percentage}`);
    }
    loadingBar.container.innerHTML = htmlLoadingBar(percentage);
    if (percentage === 100) {
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

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function toggleLayerButton(event) {
    sidebar.close();
    let title = "Info";
    let html = "Click on a data point to get more info about it.";
    let paneOptions = {
        title: title,
    };
    sidebar.updatePaneHTML("infoPane", html, paneOptions);

    if (clubsLayer.visible) {
        setActiveLayer(tournamentsLayer, [clubsLayer]);
        //TODO modularize removal?
        sidebar.removePanel('clubsPanel');
        sidebar.addPanel(tournamentsLayer.getSideBarPanelButton());
    } else if (tournamentsLayer.visible) {
        setActiveLayer(clubsLayer, [tournamentsLayer]);
        //TODO modularize removal?
        sidebar.removePanel('tournamentsPanel');
        sidebar.addPanel(clubsLayer.getSideBarPanelButton());

    } else {
        console.log("ToggleControl: error onclick.");
    }
}

function setActiveLayer(layer, otherLayers = []) {
    activeLayer = layer;

    for (let i = 0; i < otherLayers.length; i++) {
        otherLayers[i].hide();
    }

    if (activeLayer.loadingPromise === undefined) {
        activeLayer.loadDataPoints(map);
    }

    activeLayer.show();
}

function loadPlayers() {
    console.log("Loading players...");
    return d3.csv("data/Player.csv", d => {
        try {
            let player = new Player(d);
            player.club = clubsLayer.getClub(player.club_id);
            if (player.club !== undefined) {
                player.club.addPlayer(player);
            }
            players.push(player);
            return player;
        } catch (e) {
            console.log(`Dropped ${d.name}: ${e.message}`);
            return undefined;
        }
    });
}
