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
main();

function main() {
    create_map().then(() => {
        sleep(100).then(() => {
            activeLayer = clubsLayer;
            let promiseClubs = clubsLayer.loadDataPoints(map);

            Promise.all([promiseClubs]).then(() => {
                sidebar.addPanel(clubsLayer.getSideBarPanelButton());
                clubsLayer.show();
                sidebar.open("home");
                loadPlayers().then(() => {
                    console.log("Building stacked chart...");
                    testStackedChart();
                });
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
        tab: '<i class="fa fa-chart-bar "></i>',  // content can be passed as HTML string,
        pane: "<div id= \"stacked-chart-div\"><select class=\"opt\">\n" +
            "\t<option value=\"_1\">1</option>\n" +
            "\t<option value=\"_2\">2</option>\n" +
            "</select><br>\n" +
            "<svg id=\"figure\"></svg></div>",        // DOM elements can be passed, too
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
    }
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
            player.club.addPlayer(player);
            players.push(player);
            return player;
        } catch (e) {
            console.log(`Dropped ${d.name}: ${e.message}`);
            return undefined;
        }
    });
}

function getNTopClubs(n, clubs, rank = "N") {
    let start = new Date();
    let result =  clubs.sort((club1, club2) => {
        return club1.getPlayersCountRanked(rank) < club2.getPlayersCountRanked(rank);
    }).slice(0,n);
    //console.debug(`Sorted in ${new Date - start}ms`);
    return result;
}

function testStackedChart() {
    /*console.log(players);
    console.log(clubsLayer.getClub(0).getPlayersCountRanked("N"));
    console.log(clubsLayer.getClub(0));*/

    /*const data = [
        {month: "Q1-2016", apples_1: -400, bananas_1: 920, apples_2: -196, bananas_2: 840},
        {month: "Q2-2016", apples_1: -400, bananas_1: 440, apples_2: -960, bananas_2: 600},
        {month: "Q3-2016", apples_1: -600, bananas_1: 960, apples_2: -640, bananas_2: 640},
        {month: "Q4-2016", apples_1: -400, bananas_1: 480, apples_2: -640, bananas_2: 320}
    ];*/

    const data = getNTopClubs(10,clubsLayer.getClubs(), "R").reverse();
    for (let i = 0; i < data.length; i++) {
        //we inverse values to have the values spread left and right of the axis
        data[i].rank_NC_count *= - 1;
        data[i].rank_P_count *= - 1;
        data[i].rank_D_count *= - 1;
    }
    console.log(data);

    const margin = {top: 35, right: 145, bottom: 35, left: 50},
        width = 420 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#figure")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const y = d3.scaleBand()
        .rangeRound([height, 0])
        .padding(0.2);

    const x = d3.scaleLinear()
        .rangeRound([0, width]);

    const z = d3.scaleOrdinal()
        .range([
            "#FFF9C4",
            "#FFEE58",
            "#FFB300",
            "#EF6C00",
            "#BF360C"]);

    svg.append("g")
        .attr("class","x-axis");

    svg.append("g")
        .attr("class", "y-axis");

    const input = d3.selectAll(".opt").property("value");

    d3.selectAll(".opt").on("change", function() {
        update(data, this.value)
    });

    update(data, input);

    function update(data, input) {

        const keys = ["rank_NC_count","rank_P_count", "rank_F_count","rank_R_count", "rank_N_count"];

        const series = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetDiverging)
            (data);

        y.domain(data.map(d => d.name));

        x.domain([
            d3.min(series, stackMin),
            d3.max(series, stackMax)
        ]).nice();

        const barGroups = svg.selectAll("g.layer")
            .data(series);

        barGroups.exit().remove();

        barGroups.enter().insert("g", ".y-axis")
            .classed('layer', true);

        svg.selectAll("g.layer")
            .transition().duration(750)
            .attr("fill", d => z(d.key));

        let bars = svg.selectAll("g.layer").selectAll("rect")
            .data(function (d) {
                return d;
            });

        bars.exit().remove();

        bars = bars
            .enter()
            .append("rect")
            .attr("height", y.bandwidth())
            .attr("y", d => y(d.data.name))
            .merge(bars)

        bars.transition().duration(750)
            .attr("x", d => x(d[0]))
            .attr("width", d => Math.abs(x(d[1])-x(d[0])));

        svg.selectAll(".y-axis").transition().duration(750)
            .attr("transform", "translate(" + x(0)  + ",0)")
            .call(d3.axisLeft(y));

        svg.selectAll(".x-axis").transition().duration(750)
        //.attr("transform", "translate(0," + x(0) + ")")
            .call(d3.axisTop(x));

        function stackMin(serie) {
            return d3.min(serie, function(d) { return d[0]; });
        }

        function stackMax(serie) {
            return d3.max(serie, function(d) { return d[1]; });
        }

    }
}
