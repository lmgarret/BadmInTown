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
        pane: "<div id= \"stacked-chart-div\">" +
            "<div id= \"stacked-chart-legend\" class='legend'></div>" +
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
            if(player.club !== undefined){
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

function testStackedChart() {
    const data = getNTopClubs(10,clubsLayer.getClubs(), "N").reverse();

    for (let i = 0; i < data.length; i++) {
        //we inverse values to have the values spread left and right of the axis
        data[i].rank_P_count *= - 1;
        data[i].rank_NC_count *= - 1;
        //data[i].rank_D_count *= - 1;
    }
    //console.log(data);

    const margin = {top: 25, right: 20, bottom: 20, left: 10},
        width = 360 - margin.left - margin.right,
        height = 450 - margin.top - margin.bottom;

    const keyLegendMapping = [
        {
            name: "National (N)",
            key: "rank_N_count"
        },
        {
            name: "Regional (R)",
            key: "rank_R_count"
        },
        {
            name: "Departmental (D)",
            key: "rank_D_count"
        },
        {
            name: "Communal (P)",
            key: "rank_P_count"
        },
        {
            name: "No Ranking (NC)",
            key: "rank_NC_count"
        },

    ];

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

    const colors = [
        "#BF360C",
        "#EF6C00",
        "#FFB300",
        "#FFEE58",
        "#FFF9C4",];

    const z = d3.scaleOrdinal()
        .range(colors);

    svg.append("g")
        .attr("class","axis x-axis");

    svg.append("g")
        .attr("class", "axis y-axis");

    d3.selectAll(".opt").on("change", function() {
        update(data, this.value)
    });

    update(data);

    function update(data, input) {
        //update the legend
        let tempDiv = L.DomUtil.create('div', 'legend');

        // loop through our density intervals and generate a label with a colored square for each interval
        for (let i = 0; i < keyLegendMapping.length; i++) {
            tempDiv.innerHTML +=
                `<i style="background: ${colors[i]}"></i>` +
                keyLegendMapping[i].name + '<br>';
        }
        document.getElementById("stacked-chart-legend").innerHTML = tempDiv.innerHTML;

        //update the chart
        const keys = keyLegendMapping.map(mapping => mapping.key);

        const series = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetDiverging)
            .order(d3.stackOrderInsideOut)
            (data);

        y.domain(data.map(d => d.name));

        x.domain([
            d3.max(series, stackMax),
            d3.min(series, stackMin),
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

        const div = d3
            .select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        function getRankFromRange(range, club){
            if (range[1] <= 0 && range[0] <=0){
                if(range[1] === 0){
                    return "P";
                } else {
                    return "NC";
                }
            } else if (range[0] >=0 && range[1] >= 0){
                if (range[0] === 0){
                    return "D";
                } else if(range[0] === club.rank_D_count){
                    return "R";
                } else {
                    return "N";
                }
            } else {
                return "?";
            }
        }

        bars = bars
            .enter()
            .append("rect")
            .attr("height", y.bandwidth())
            .attr("y", d => y(d.data.name))
            .on('mouseover', function(d) {
                d3.select(this).classed("bar-chart-hover", true);
                div.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                div.html(`${Math.abs(d[1] - d[0])} ${getRankFromRange(d,d.data)}`)
                    .style('left', d3.event.pageX + 'px')
                    .style('top', d3.event.pageY - 28 + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).classed("bar-chart-hover", false);
                div
                    .transition()
                    .duration(500)
                    .style('opacity', 0)
            })
            .on('click', function() {
                clubsLayer.focusClub(this.__data__.data.id);
            })
            .merge(bars);

        bars.transition().duration(750)
            .attr("x", d => x(d[1]))
            .attr("width", d => Math.abs(x(d[0])-x(d[1])));

        svg.selectAll(".y-axis").transition().duration(750)
            .attr("transform", "translate(" + x(0)  + ",0)")
            .call(d3.axisRight(y));

        const formatter = d3.format("0");

        svg.selectAll(".x-axis").transition().duration(750)
        //.attr("transform", "translate(0," + x(0) + ")")
            .call(d3.axisTop(x).ticks(8)
                .tickFormat(function (d) {
                    if (d < 0) d = -d; // No negative labels
                    return formatter(d);
                }));

        function stackMin(serie) {
            return d3.min(serie, function(d) { return d[0]; });
        }

        function stackMax(serie) {
            return d3.max(serie, function(d) { return d[1]; });
        }

    }
}
