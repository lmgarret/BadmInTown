/*
 * BadmInTown main class. Holds all
 */
// Initial coordinates of the map
const INITIAL_COORD = [46.43, 2.30];
// Initial zoom of the map
const INITIAL_ZOOM = 5.5;

// map instance
let map;

// Layer displaying all information about clubs
let clubsLayer = new ClubsLayer();
//Sadly deprecated, layer displaying all information about tournaments
let tournamentsLayer = new TournamentsLayer();
// holder of the currently displayed layer
let activeLayer = undefined;
// map layer of the France in light tone
let franceLightLayer;

// list of all players
let players = [];
// top clubs in France
let topClubs;


// UI elements
let loadingBar;
let sidebar;
let statsSidebarPane;
let infoSidebarPane;
let searchSidebarPane;
let stackChart;

main();

function main() {
    create_map().then(() => {
        // sleep in order to let UI refresh on thread
        sleep(100).then(() => {
            activeLayer = clubsLayer;
            let promiseClubs = clubsLayer.loadDataPoints(map);

            Promise.all([promiseClubs, loadPlayers()]).then(() => {
                clubsLayer.show();
                sidebar.open("home");

                //Create and display top clubs in stack chart
                console.log("Building stacked chart...");
                stackChart = new DivergingStackChart();
                topClubs = getNTopClubs(10, clubsLayer.getClubs(), "N");
                stackChart.update(topClubs, "Top 10 Clubs: France");

                //TODO manually set GPS coords of the following displayed clubs
                //build a list of clubs with no assigned department as incorrect GPS coords
                let clubsNoDepartments = [];
                for (let i = 0; i < clubsLayer.getClubs().length; i++) {
                    let c = clubsLayer.getClubs()[i];
                    if (c.department === undefined) {
                        clubsNoDepartments.push(c);
                    }
                }
                console.log(clubsNoDepartments);

            });
        });

    });
}

/**
 * Initializes the map instance, and adds UI elements and world/France OpenStreetMap layers to it
 * @returns {Promise} Promise of layers to wait on for completion
 */
function create_map() {
    // initialize map instance
    map = L.map('map', {
        minZoom: 0,
        maxZoom: 13,
    }).setView(INITIAL_COORD, INITIAL_ZOOM);
    map._layersMaxZoom = 13;
    map.zoomControl.setPosition('bottomright');

    //added function to setView with an offset in pixels after zooming
    L.Map.prototype.setViewOffset = function (latlng, offset, targetZoom) {
        let targetPoint = this.project(latlng, targetZoom).subtract(offset),
            targetLatLng = this.unproject(targetPoint, targetZoom);
        return this.setView(targetLatLng, targetZoom);
    };

    createUI();

    return loadBaseLayers();
}

/**
 * Creates the UI elements (sidebar, its own panes, loading bar and franceButton) and adds them to the view
 */
function createUI() {
    //Creating the sidebar
    sidebar = L.control.sidebar({
        //autopan: true,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
        container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
        position: 'left',     // left or right
    }).addTo(map);

    //Creates and adds the search pane to the sidebar
    searchSidebarPane = {
        id: 'searchPane',                     // UID, used to access the panel
        tab: '<i class="fa fa-search"></i>',  // content can be passed as HTML string,
        pane: "<div class=\"search_bar\">\n" +
            "  <div class=\"search-container\">\n" +
            "      <input type=\"text\" placeholder=\"Search a club, a player...\" name=\"search\" onkeyup=\"onSearchSubmit(this)\">\n" +
            "  </div>\n" +
            "  <div id=\"search-results-holder\">\n" +
            "Type in the name of a club or a player and we'll find it for you!" +
            "  </div>\n" +
            "</div>",              // an optional pane header
        title: 'Search',              // an optional pane header
    };
    sidebar.addPanel(searchSidebarPane);

    // Creates and adds the info pane to the sidebar
    infoSidebarPane = {
        id: 'infoPane',                     // UID, used to access the panel
        tab: '<i class="fa fa-info"></i>',  // content can be passed as HTML string,
        pane: "Click on a data point to get more info about it.",        // DOM elements can be passed, too
        title: 'Info',              // an optional pane header
    };
    sidebar.addPanel(infoSidebarPane);

    // Creates and adds the stats pane to the sidebar
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

    //Creates and adds the loading bar to the view
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

    // France button to recenter on the map
    const htmlFranceButton = '<button type="button" class="btn btn-france" id="franceButton">' +
        '   <img src="svg/fr.svg" alt="fr"  width="15" height="15" >' +
        '</button>';

    // Create placeholder for buttons and them on map
    L.control.custom({
        position: 'bottomright',
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
            }
    }).addTo(map);
}

/**
 * Creates the tile layers to display map tiles
 * @returns {Promise<T | never>} Promise on the loading of layers
 */
function loadBaseLayers() {
    // Tilelayer for the dark map
    L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        useCache: true,
        crossOrigin: true,
        cacheMaxAge: 604800000, // 7 days, we don't need exact roads for this project
    }).addTo(map);

    //return promise on the cutting of france map light layer
    return d3.json('geojson/france_shape_hd.geojson').then(geoJSON => {
        // create a layer showing only france in light tone
        franceLightLayer = L.TileLayer.boundaryCanvas('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            boundary: geoJSON,
            useCache: true,
            crossOrigin: true,
            cacheMaxAge: 604800000, // 7 days, we don't need exact roads for this project
        });

        //add light label for the light layers
        map.createPane('labels');
        L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            useCache: true,
            crossOrigin: true,
            cacheMaxAge: 604800000, // 7 days, we don't need exact roads for this project
            pane: 'labels'
        }).addTo(map);
    });
}

/**
 * Callback function to trigger the displaying of the loading bar when dataPoints are being loaded
 */
function onLoadStarted() {
    // nicer visually to not display the lightlayer yet when we start loading
    franceLightLayer.remove();
    loadingBar.addTo(map);
}

/**
 * Callback function for when there has been some progress on the loading of dataPoints. Updates the loading bar
 * accordingly.
 */
function onLoadProgress() {
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

/**
 * Generates html code for the loading bar
 * @param percentage % of advancement on the loading of data
 * @returns {string} html code for the status of the progress bar
 */
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

/**
 * Helper function to emulate the 'sleep' in ms of other programming languages. Useful when loading lots of points
 * in a Promise and in need to update the UI. Sleeping for a very small (e.g. 50ms) allows the engine to properly
 * update the displayed UI.
 * @param time time to sleep in milliseconds
 * @returns {Promise<any>} returns a promise to wait on
 */
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * DEPRECATED
 *
 * Toggles between club and tournaments layer
 * @param event onclick event
 */
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

/**
 * DEPRECATED
 * Sets the visible layer and disables the other layers
 * @param layer layer to show and set active
 * @param otherLayers layers to deactivate/hide
 */
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

/**
 * Loads the players from csv, and assign them to clubs.
 * @return d3 Promise on the loading of players
 */
function loadPlayers() {
    console.log("Loading players...");
    return d3.csv("data/Player.csv", d => {
        try {
            let player = new Player(d);
            //assign player to club and vice-versa
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

/**
 * Callback function whenever text is updated in it. Updated the search div to display results of the search
 * in clubs and players.
 * @param form the input UI element
 */
function onSearchSubmit(form) {
    let search_str = form.value.toLowerCase();

    if (search_str === "") {
        //case nothing in search field. Display a generic search message
        document.getElementById("search-results-holder").innerHTML = "Type in the name of a club or a player and we'll find it for you!";

    } else if (search_str.length < 2) {
        //case less than two letters, we search for only more than 2 letters
        document.getElementById("search-results-holder").innerHTML = "Type in at least 2 letters...";

    } else {
        //holder of html lines
        let result_html = "<ul id=\"search-results-ul\">\n";
        let result_lines = "";

        let clubs = clubsLayer.getClubs();

        //search in clubs, on name and short_name
        for (let i = 0; i < clubs.length; i++) {
            let club = clubs[i];
            if (club.name.toLowerCase().includes(search_str) || club.short_name.toLowerCase().includes(search_str)) {
                result_lines += `<li onclick="clubsLayer.focusClub(${club.id})"><i class="fas fa-location-arrow"></i></i><a href=\"#\">(${club.short_name}) ${club.name}</a></li>`;
            }
        }

        //search in players, on name, surname and name + surname
        for (let i = 0; i < players.length; i++) {
            let p = players[i];
            if (p.name.toLowerCase().includes(search_str)
                || p.surname.toLowerCase().includes(search_str)
                || (p.name.toLowerCase() + " " + p.surname.toLowerCase()).includes(search_str)) {
                result_lines += `<li onclick="clubsLayer._openPlayerPane(${p.license})"><i class="fas fa-user"></i><a href=\"#\">${p.name} ${p.surname.toUpperCase()}</a></li>`;
            }
        }

        if (result_lines === "") {
            result_lines = "No result for " + search_str + ".";
        }

        result_html += result_lines + "</ul>";

        //update search div
        document.getElementById("search-results-holder").innerHTML = result_html;
    }
}
