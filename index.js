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
                    let club1 = clubsLayer.getClub(1);
                    console.log(getNTopClubs(10,clubsLayer.getClubs(), "R"));
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
        pane: "<div id=\"figure\" style=\"margin-bottom: 50px;\"></div>",        // DOM elements can be passed, too
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

    const svgChart = (props, data) => {
        const {width, height, margin, id, selector} = props;
        var svg = d3
            .select(selector)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("id", id)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        return {
            svg,
            width: width - margin.left - margin.right,
            height: height - margin.top - margin.bottom
        };
    };
    const decimalRounder = n => {
        const rounder = Math.pow(10, n);
        return d => {
            return Math.round(d * rounder) / rounder;
        };
    };
    const keyConfig = [
//   { csv: "1", g: "-", color: "#c7001e", label: "Strongly disagree" },
        {csv: "2", g: "-", color: "#f6a580", label: "Unfavorable"},
        {csv: "3", g: "n", color: "#cccccc", label: "Neutral"},
        {csv: "4", g: "+", color: "#92c6db", label: "Favorable"},
//   { csv: "5", g: "+", color: "#086fad", label: "Strongly agree" }
    ];
    const ratioOfLikert = (keys, getN, data) => {
        const ratioRounder = decimalRounder(3);
        return data.map(d => {
            return keys.reduce(
                (acc, k, i, arr) => {
                    const {obs, ratio, N} = acc;
                    const raw = parseInt(d[k], 10);
                    obs[i] = raw;
                    ratio[i] = ratioRounder(raw / N);
                    return acc;
                },
                {obs: [], ratio: [], N: getN(d), label: d.Question}
            );
        });
    };
    const addDataToGroup = rawsAndRatios => {
        return group => {
            const {key, series} = group;
            const items = rawsAndRatios.map((d, i) => {
                let x0 = 0,
                    x1;
                return series.map(g => {
                    const {idx} = g;
                    const obs = d.obs[idx],
                        ratio = d.ratio[idx];
                    x1 = x0 + ratio;
                    const r = {obs, ratio, x0, x1};
                    x0 = x1;
                    return r;
                });
            });
            const maxes = items.map((d, i) => {
                return d[d.length - 1].x1;
            });
            return {group: key, series, data: items, maxes};
        };
    };
    const plotHorizontalHtmlLegend = props => {
        const {parentNode, data, className} = props;
        const g = d3
            .select(parentNode)
            .append("div")
            .attr("class", className);
        let item = g
            .selectAll(".legend")
            .data(data)
            .enter()
            .append("div")
            .attr("class", "legend");
        item
            .append("div")
            .attr("class", "rect")
            .style("background-color", d => {
                return d.color;
            });
        item
            .append("div")
            .attr("class", "label")
            .text(d => {
                return d.label;
            });
        // d3.selectAll(".legendbox").attr("transform", "translate(" + movesize + ",0)");
    };
    const plotYAxis = props => {
        const {svg, className, yScale} = props;
        svg
            .append("g")
            .attr("class", className)
            .call(d3.axisLeft(yScale));
    };
    const plotZeroLine = props => {
        const {svg, className, x, ys} = props;
        const [y1, y2] = ys;
        svg
            .append("g")
            .attr("class", className)
            .append("line")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", y1)
            .attr("y2", y2);
    };
    const plotGroup = (data, svg, config) => {
        const {
            getQuestionTransform,
            getQuestionAxis,
            getBarX,
            getBarWidth,
            getBarHeight,
            getBarText,
            getBarColor
        } = config;
        svg
            .append("g")
            .attr("class", "x axis")
            .call(
                getQuestionAxis().tickFormat(d => {
                    return d3.format(".0%")(Math.abs(d));
                })
            );
        const g = svg
            .selectAll(".question")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "question")
            .attr("transform", getQuestionTransform);
        var bars = g
            .selectAll("rect")
            .data((d, i) => {
                return d;
            })
            .enter()
            .append("g")
            .attr("class", "subbar");
        bars
            .append("rect")
            .attr("height", getBarHeight)
            .attr("x", getBarX)
            .attr("width", getBarWidth)
            .style("fill", getBarColor);
        bars
            .append("text")
            .attr("x", getBarX)
            .attr("y", () => {
                return getBarHeight() / 2;
            })
            .attr("dy", "0.5em")
            .attr("dx", "0.5em")
            .style("text-anchor", "begin")
            .text(getBarText);
    };
    const computeLayout = props => {
        const {
            alignRight,
            xScale,
            yScale,
            maxes,
            data,
            series,
            questionLabels
        } = props;
        const getY = i => {
            return yScale(questionLabels[i]);
        };
        const getBarHeight = () => {
            return yScale.bandwidth();
        };
        const colorScale = d3.scaleOrdinal().range(
            series.map(d => {
                return d.color;
            })
        );
        const getQuestionX = (d, i) => {
            return;
        };
        const getQuestionTransform = (d, i) => {
            const x = alignRight ? xScale(-maxes[i]) : 0;
            const y = getY(i);
            return `translate(${x},${y} )`;
        };
        const getQuestionAxis = (d, i) => {
            const [d0, d1] = xScale.domain();
            const [r0, r1] = xScale.range();
            const domain = alignRight ? [-d1, -d0] : [d0, d1];
            const range = alignRight ? [-r1, -r0] : [r0, r1];
            const scale = d3
                .scaleLinear()
                .domain(domain)
                .rangeRound(range)
                .nice();
            return d3.axisTop(scale).tickValues(
                d3.range(0, d3.max(maxes) + 0.05, 0.1).map(d => {
                    return alignRight ? -d : d;
                })
            );
        };
        const getBarX = (d, i) => {
            return xScale(d.x0);
        };
        const getBarWidth = d => {
            return Math.abs(xScale(d.x1) - xScale(d.x0));
        };
        const getBarText = d => {
            return d.n !== 0 && getBarWidth(d) > 0.3 ? d.obs : "";
        };
        const getBarColor = (d, i) => {
            // console.log(d, i, series[i].label);
            return colorScale(series[i].label);
        };
        return {
            getQuestionTransform,
            getQuestionAxis,
            getBarX,
            getBarWidth,
            getBarHeight,
            getBarText,
            getBarColor
        };
    };
    d3.csv("raw_data.csv").then(function (data) {
        const rawsAndRatios = ratioOfLikert(
            keyConfig.map(d => {
                return d.csv;
            }),
            d => {
                return d.N;
            },
            data
        );
        const groups = keyConfig.reduce(
            (acc, d, i) => {
                const {ks, groups} = acc;
                const {g, csv, color, label} = d;
                let idx = ks.indexOf(g);
                if (idx === -1) {
                    idx = ks.length;
                    ks.push(g);
                }
                if (!groups[idx]) {
                    groups[idx] = {key: g, series: []};
                }
                groups[idx].series.push({idx: i, csv, color, label});
                return {ks, groups};
            },
            {ks: [], groups: []}
        ).groups;
        const groupsWithData = groups.map(addDataToGroup(rawsAndRatios));
        plotHorizontalHtmlLegend({
            parentNode: document.querySelector("#figure"),
            data: keyConfig.map(d => {
                return {label: d.label, color: d.color};
            }),
            center: 50,
            className: "legendbox"
        });
        const {svg, width, height} = svgChart({
            margin: {top: 50, right: 20, bottom: 10, left: 65},
            width: 800,
            height: 500,
            selector: "#figure",
            id: "d3-plot"
        });
        const questionLabels = rawsAndRatios.map(function (d) {
            return d.label;
        });
        const yScale = d3
            .scaleBand()
            .rangeRound([0, height])
            .padding(0.3)
            .domain(questionLabels);
        const xEnd = d3.sum(groupsWithData, d => {
            return d3.max(d.maxes);
        });
        const leftPadding = 32;
        const xScale = d3
            .scaleLinear()
            .domain([0, xEnd])
            .rangeRound([0, width - leftPadding])
            .nice();
        plotYAxis({svg, className: "y axis", yScale});
        const svgGroup = svg
            .append("g")
            .attr("class", "plot")
            .attr("transform", "translate(" + leftPadding + "," + 0 + ")");
        const config = {
            xScale,
            yScale,
            questionLabels
        };
        let groupData, xOffset;
        // -- group
        groupData = groupsWithData[0];
        xOffset = xScale(d3.max(groupsWithData[0].maxes));
        plotGroup(
            groupData.data,
            svgGroup
                .append("g")
                .attr("class", "negative")
                .attr("transform", "translate(" + xOffset + "," + 0 + ")"),
            computeLayout(
                Object.assign({}, config, groupData, {
                    alignRight: true
                })
            )
        );
        // -- group
        groupData = groupsWithData[2];
        xOffset = xScale(d3.max(groupsWithData[0].maxes));
        plotGroup(
            groupData.data,
            svgGroup
                .append("g")
                .attr("class", "positive")
                .attr("transform", "translate(" + xOffset + "," + 0 + ")"),
            computeLayout(Object.assign({}, config, groupData))
        );
        plotZeroLine({
            svg: svgGroup,
            className: "zero axis",
            x: xOffset,
            ys: [0, height]
        });
    });
}
