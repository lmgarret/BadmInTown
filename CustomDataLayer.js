/*
 * Regroups classes used to display data points on the map and other information related to datapoints displayed.
 */

// Path to the departments map
let FRANCE_GEOJSON_PATH = "geojson/france_departements_all_low.geojson";
// zoom level at which we see the markers and fade the department shapes
const CLUSTER_VISIBILITY_ZOOM = 8;

// switch between low/high res map for dev/prod environments
switch (window.location.protocol) {
    case 'file:':
        //dev file, lower quality thus faster loading times
        FRANCE_GEOJSON_PATH = "geojson/france_departements_all_dev.geojson";
        break;
    case 'http:':
    case 'https:':
    default:
        FRANCE_GEOJSON_PATH = "geojson/france_departements_all_low.geojson";
        break;
}


/**
 * A CustomDataLayer is an abstraction regrouping multiple layers to display information about datapoints on the map.
 * It is recommend to extend it rather than create an instance of it (see @ClubsLayer, @TournamentsLayer)
 *
 * It is used to load those dataPoints from csvs, and parse/clean them if necessary. As we do not have the information in
 * dataPoints about departments, it computes in which department the datapoint is based on its coordinates.
 * Markers are then created, with all interactions related to it as clicking on it to display the infoPane or methods
 * to focus the data points.
 * Then the department map is created, and filled with colors according to intensity. The legend is created accordingly.
 *
 * This class also offers getters methods to access those datapoints if other calcutlations are needed.
 */
class CustomDataLayer {

    constructor(json_path) {

        this.json_path = json_path;
        this.dataPoints = [];
        this.visible = false;
        this.loadedDepartments = 0;
        this.totalDepartments = 101;

        this.sidebarPanelButton = {
            id: 'dataPanel',                     // UID, used to access the panel
            tab: '<i class="fa fa-question" style="color: black;"></i>',  // content can be passed as HTML string,
            //pane: someDomNode.innerHTML,        // DOM elements can be passed, too
            title: 'Data',              // an optional pane header
            button: toggleLayerButton
        };

        this.legendLabel = L.control({position: 'topright'});
        this.legendLabel.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info legend');
            this.update();
            return this._div;
        };
        this.legendLabel.update = this.updateLegendLabel(
            this.getDepartmentColor,
            this.getDepartmentColorGrades,
            this.getDepartmentOpacity
        );

    }

    /**
     * Function called when parsing the csv file and we need to apply some transformation on each data point.
     * @param dataPoint the dataPoint parsed
     */
    onDataPointParsed(dataPoint) {
        // Override in child classes to parse more in details
        return dataPoint;
    }

    /**
     * Function called when parsing the department geojson file and a department is loaded.
     * @param department the department parsed
     */
    onDepartmentParsed(department) {
        this.totalDepartments++;
        return department
    }

    /**
     * Starts the loading of the dataPoints. Creates markers and departments layers.
     * @param map the map to add layers to.
     * @return {Promise<any>} Promise on the loading of data points
     */
    loadDataPoints(map) {
        //trigger the loading bar
        onLoadStarted();
        this.markerCluster = this.createMarkerCluster();

        //creates both promises on datapoints and departments loading
        let promiseDepartment = d3.json(FRANCE_GEOJSON_PATH, d => this.onDepartmentParsed(d));
        let promiseDataPoints = d3.csv(this.json_path, d => {
            try {
                let parsed_d = this.onDataPointParsed(d);
                this.dataPoints.push(parsed_d);
            } catch (e) {
                console.debug(`Dropped ${d.name}: ${e.message}`);
            }

        });

        this.loadingPromise = new Promise((resolveLoadingPromise, reject) => {
            Promise.all([promiseDepartment, promiseDataPoints]).then(values => {
                let departments = values[0];

                for (let i = 0, len = departments.features.length; i < len; i++) {
                    //we sleep here to let the display update itself
                    sleep(50).then(() => {
                        this.computeDepartmentDensity(departments.features[i], this.dataPoints);
                        this.loadedDepartments++;
                        onLoadProgress();
                        //this.onEachDepartmentFeature(departments.features[i],departments.features[i])
                    }).then(() => {
                        if (i === departments.features.length - 1) {
                            this.department_layer = L.geoJson(
                                departments,
                                {
                                    style: this.departmentStyle.bind(this),
                                    onEachFeature: this.onEachDepartmentFeature.bind(this)
                                }
                            );
                            map.on('zoomend', () => {
                                this.department_layer.setStyle(this.departmentStyle.bind(this));
                                this.legendLabel.update();
                            });

                            resolveLoadingPromise(0);
                        }
                    });
                }


            });

        });
        return this.loadingPromise;
    }

    /**
     * Returns the department layer associated to the department feature given
     * @param department feature we want to get the department from
     * @return the department layer
     */
    getDepartmentLayer(department) {
        let layer = undefined;
        this.department_layer.eachLayer(l => {
            if (l.feature.properties.code === department.properties.code) {
                layer = l;
            }
        });
        return layer;
    }

    /**
     * Checks if loading is done and then enables/shows the department layer and the marker cluster.
     */
    show() {
        this.loadingPromise.then(() => {
            this.visible = true;

            this.department_layer.addTo(map);
            this.markerCluster.addTo(map);
            this.legendLabel.addTo(map);

            // show markers only at CLUSTER_VISIBILITY_ZOOM zoom
            map.removeLayer(this.markerCluster);
            map.on('zoom', () => {
                //console.log(`zoom=${map.getZoom()}`);
                if (this.visible) {
                    if (map.getZoom() >= CLUSTER_VISIBILITY_ZOOM) {
                        map.addLayer(this.markerCluster);
                    } else {
                        map.removeLayer(this.markerCluster);
                    }
                }

            });

            map.addLayer(this.department_layer);

            if (map.getZoom() >= CLUSTER_VISIBILITY_ZOOM) {
                map.addLayer(this.markerCluster);
            } else {
                map.removeLayer(this.markerCluster);
            }
            map.addControl(this.legendLabel);
        });
    }

    /**
     * Hides the department layer and marker cluster
     */
    hide() {

        this.loadingPromise.then(() => {
            this.visible = false;

            map.removeLayer(this.department_layer);
            map.removeLayer(this.markerCluster);
            map.removeControl(this.legendLabel);
        });
    }

    /**
     * Initializes and returns the MarkerClusterGroup created to hold all data points
     * @return {L.MarkerClusterGroup}
     */
    createMarkerCluster() {
        return L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            maxClusterRadius: function (zoom) {
                //show markers when zoom is at CLUSTER_VISIBILITY_ZOOM
                return zoom >= CLUSTER_VISIBILITY_ZOOM ? 2 :
                    250;
            },
            disableClusteringAtZoom: 21,
            iconCreateFunction: function (cluster) {
                let c = ' marker-cluster-';
                if (cluster.getChildCount() < 20) {
                    c += 'small';
                } else if (cluster.getChildCount() < 45) {
                    c += 'medium';
                } else {
                    c += 'large';
                }
                return new L.DivIcon({
                    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                    className: 'marker-cluster' + c,
                    iconSize: new L.Point(0, 0)
                });
            }
        });
    }

    /**
     * Given a datapoint, creates a marker for it.
     * @param dataPoint dataPoint loaded from csv
     * @return {*} the newly created marker
     */
    createMarker(dataPoint) {
        const marker = new L.CircleMarker([dataPoint.lat, dataPoint.long], {
            radius: 6,
            fillColor: this.markerFillColor(),
            fillOpacity: 0.8,
            weight: 0 //stroke width
        }).bindPopup(`${dataPoint.name}`);
        let options = {
            locate: {
                callback: () => {
                    if (!marker.getPopup().isOpen()) {
                        marker.openPopup();
                    }
                }
            }
        };
        marker.on({
            click: this.onDataPointClicked(dataPoint, options).bind(this),
        });
        return marker;
    }

    /**
     * Computes the density of datapoints present in the given departments. Assigns to each datapoints its department
     * @param department department feature to compute the density to
     * @param dataPoints dataPoints to use to compute density
     * @return {*} the update department
     */
    computeDepartmentDensity(department, dataPoints) {
        department.properties.density = 0;
        dataPoints.forEach(dataPoint => {
            if (dataPoint.department === undefined) {
                let point = turf.point([dataPoint.long, dataPoint.lat]);
                if (turf.inside(point, department)) {
                    department.properties.density++;
                    dataPoint.department = department;
                }
            }
        });
        return department;
    }

    /**
     * Style function for department in basic (not selected, not highlighted) state.
     * @param department department feature to be used to style
     * @return style function
     */
    departmentStyle(department) {
        return {
            fillColor: this.getDepartmentColor(department.properties.density),
            weight: 1, //stroke width
            opacity: 1,
            color: 'white',  //Outline color
            fillOpacity: this.getDepartmentOpacity(department.properties.isSelected)
        };
    }

    /**
     * Style function for department when highlighted
     * @return style function
     */
    departmentStyleHighlighted() {
        return {
            dashArray: '',
            fillOpacity: 0,
        };
    }

    /**
     * Color function for department depending on density
     * @param d density in the department
     * @return {string} hex color to be used
     */
    getDepartmentColor(d) {
        return d > 65 ? '#00093A' :
            d > 45 ? '#01579B' :
                d > 30 ? '#0288D1' :
                    d > 20 ? '#29B6F6' :
                        d > 15 ? '#4FC3F7' :
                            d > 10 ? '#81D4FA' :
                                d > 5 ? '#B3E5FC' :
                                    '#E1F5FE';
    }

    /**
     * Opacity function for department. Starting at CLUSTER_VISIBILITY_ZOOM,
     * departments are gradually shown transparent depending on the zoom
     * @param isSelected whether the department is selected
     * @return {number} the opacity of the department
     */
    getDepartmentOpacity(isSelected) {
        if (isSelected) {
            return 0;
        }
        let zoom = map.getZoom();

        if (zoom >= CLUSTER_VISIBILITY_ZOOM) {
            let maxZoom = map.getMaxZoom() + 1; //+1 so that when at real maxZoom the legend is not empty
            return 0.5 * (maxZoom - zoom) / (maxZoom - CLUSTER_VISIBILITY_ZOOM);
        } else {
            return 0.8;
        }
    }

    /**
     * Generates the color grades for the legend
     * @return {number[]} color grades to display on the legend
     */
    getDepartmentColorGrades() {
        return [0, 5, 10, 15, 20, 30, 45, 65];
    }

    /**
     * @return {string} hex color of the marker
     */
    markerFillColor() {
        return "#000000"
    }

    /**
     * Action when a department is hovered. Sets the department style, and resets others. Opens its popup
     * @param e the hover event
     */
    onMouseOverDepartment(e) {
        let layer = e.target;

        //reset styles for other departments
        this.department_layer.eachLayer(l => {
            if (!l.feature.properties.isSelected) {
                this.department_layer.resetStyle(l);
            }
        });

        //show popup if not showing markers
        if (map.getZoom() < CLUSTER_VISIBILITY_ZOOM) {
            layer.openPopup();
        }
        //set highlighted style
        layer.setStyle({
            dashArray: '',
            fillOpacity: 0,
        });
    }

    /**
     * Action when a department is not hovered anymore. Basically reset the department's style.
     * @param e the mouseout event
     */
    onMouseOutDepartment(e) {
        let layer = e.target;
        layer.closePopup();

        //reset only if the mouse is not in the department. e.g. do not reset if the mouse is on a marker IN
        //the department
        let polygon = e.target.toGeoJSON();
        let point = turf.point([e.latlng.lng, e.latlng.lat]);
        if (!turf.inside(point, polygon) && !layer.feature.properties.isSelected) {
            this.department_layer.resetStyle(e.target);
        }
    }

    /**
     * Action when a department is clicked on. Closes the popup, unhighlight other departments and set the department
     * as selected. Opens the statistic pane (with stacked chart) and focuses the department
     * @param e the click event
     */
    onClickDepartment(e) {
        let layer = e.target;
        layer.closePopup();

        map.fitBounds(e.target.getBounds());

        this.department_layer.eachLayer(l => {
            if (l !== layer) {
                l.feature.properties.isSelected = false;
                this.department_layer.resetStyle(l);
            }
        });
        layer.feature.properties.isSelected = true;
        layer.setStyle({
            dashArray: '',
            fillOpacity: 0,
        });
        map.once("moveend zoomend", () => {
            let clubs = getClubsInDepartment(layer.feature.properties.code, this.dataPoints);
            const data = getNTopClubs(10, clubs);

            stackChart.update(data, `Top ${data.length} Clubs: ${layer.feature.properties.nom}`)
            sidebar.open("statsPane");
            //sidebar.close("infoPane");
        });
    }

    /**
     * Action when the user clicks on a marker. Generate its infoPane and opens it. Opens the popup
     * @param dataPoint dataPoint clicked
     * @param options locate options
     * @return {Function} a compatible event function to perform described actions
     */
    onDataPointClicked(dataPoint, options) {
        return (e) => {
            //generate HTML
            let title = this.getDataType();
            title = title[0].toUpperCase() + title.substr(1); //put first letter to uppercase
            let html = `<b>Name:</b> ${dataPoint.name}(${dataPoint.short_name}) </br>`
                + `<b>City:</b> ${dataPoint.city_name}`;
            let zoom = options.locate.zoom === undefined ? map.getZoom() : options.locate.zoom;
            let paneOptions = {
                title: title,
                locate: {
                    latlng: e.latlng,
                    zoom: zoom,
                    callback: options.locate.callback
                }
            };
            sidebar.updatePaneHTML("infoPane", html, paneOptions);
            sidebar.open("infoPane", e.latlng, zoom);
        }
    }

    moveViewTo(e) {
        map.setView(e.latlng);
    }

    /**
     * Function applied on each department layer when created. Binds the event listeners and popups.
     * @param feature
     * @param layer
     */
    onEachDepartmentFeature(feature, layer) {
        if (feature.properties) {
            const popupHTML = `<b>${feature.properties.nom}</b>`
                + `: ${feature.properties.density}`
                + ` ${this.getDataType()}s.`;
            layer.bindPopup(popupHTML, {closeButton: false, offset: L.point(0, 0)});
        }
        layer.on({
            mouseover: this.onMouseOverDepartment.bind(this),
            mouseout: this.onMouseOutDepartment.bind(this),
            click: this.onClickDepartment.bind(this)
        });
    }

    /**
     * @return {string} a string describing the type of data represented by a marker.
     */
    getDataType() {
        return "dataPoint";
    }

    /**
     * Update function for the legend. Recreates the HTML code
     * @param colorFct color function used to color departments
     * @param colorGradesFct color function used to generate color grades to be displayed in the html
     * @param opacityFct opacity function used to compute the opacity of a department
     * @return {Function} a compatible function to apply on each department layer
     */
    updateLegendLabel(colorFct, colorGradesFct, opacityFct) {
        return function (props) {
            let colorGrades = colorGradesFct();
            let div = L.DomUtil.create('div', 'info legend');
            div.innerHTML += `<h4>Datapoint density</h4>`;

            // loop through our density intervals and generate a label with a colored square for each interval
            for (let i = 0; i < colorGrades.length; i++) {
                let colorStr = colorFct(colorGrades[i] + 1);
                let opacityStr = opacityFct(false);
                div.innerHTML +=
                    `<i style="background: ${colorStr}; opacity: ${opacityStr}"></i>` +
                    colorGrades[i] + (colorGrades[i + 1] ? '&ndash;' + colorGrades[i + 1] + '<br>' : '+');
            }
            this._div.innerHTML = div.innerHTML;
        };
    }

    /**
     * @return {number} the loading percentage of dataPoints
     */
    getLoadingPercentage() {
        //rough estimation of the progress done so far
        return 100 * this.loadedDepartments / this.totalDepartments;
    }

    /**
     * Changes the style of all departments to show all as unselected
     */
    deselectAllDepartments(excepted = undefined) {
        this.department_layer.eachLayer(l => {
			if (excepted !== undefined && excepted === l.feature) {
				l.feature.properties.isSelected = true;
				l.setStyle({
					dashArray: '',
					fillOpacity: 0,
				});
			} else {
				l.feature.properties.isSelected = false;
				this.department_layer.resetStyle(l);
			}
        });
    }

    /**
     * DEPRECATED
     */
    getSideBarPanelButton() {
        return this.sidebarPanelButton;
    }
}

/**
 * Class extending CustomDataLayer, that specifically displays clubs points and department stats on clubs.
 * Offers more specific methods on clubs.
 */
class ClubsLayer extends CustomDataLayer {
    constructor() {
        super("data/Club_geo.csv");
        this.sidebarPanelButton = {
            id: 'clubsPanel',                     // UID, used to access the panel
            tab: '<i class="fas fa-school" style="color: black;"></i>',  // content can be passed as HTML string,
            //pane: someDomNode.innerHTML,        // DOM elements can be passed, too
            title: 'Clubs',              // an optional pane header
            button: toggleLayerButton
        };
        this.players = [];
    }

    /**
     * see super method
     */
    getDataType() {
        return "club"
    }

    /**
     * see super method
     */
    getDepartmentColor(d) {
        return d > 65 ? '#00093A' :
            d > 45 ? '#01579B' :
                d > 30 ? '#0288D1' :
                    d > 20 ? '#29B6F6' :
                        d > 15 ? '#4FC3F7' :
                            d > 10 ? '#81D4FA' :
                                d > 5 ? '#B3E5FC' :
                                    '#E1F5FE';
    }

    /**
     * see super method
     */
    getDepartmentColorGrades() {
        return [0, 5, 10, 15, 20, 30, 45, 65];
    }

    /**
     * see super method
     */
    markerFillColor() {
        return "#0D47A1"
    }

    /**
     * see super method
     */
    updateLegendLabel(colorFct, colorGradesFct, opacityFct) {
        return function (props) {
            let colorGrades = colorGradesFct();
            let div = L.DomUtil.create('div', 'info legend');
            div.innerHTML += `<h4>Clubs density</h4>`;

            // loop through our density intervals and generate a label with a colored square for each interval
            for (let i = 0; i < colorGrades.length; i++) {
                let colorStr = colorFct(colorGrades[i] + 1);
                let opacityStr = opacityFct(false);
                div.innerHTML +=
                    `<i style="background: ${colorStr}; opacity: ${opacityStr}"></i>` +
                    colorGrades[i] + (colorGrades[i + 1] ? '&ndash;' + colorGrades[i + 1] + '<br>' : '+');
            }
            this._div.innerHTML = div.innerHTML;
        };
    }

    /**
     *
     * @return {Array} the clubs loaded from csv
     */
    getClubs() {
        return this.dataPoints;
    }

    /**
     * Finds the club with the given id
     * @param id id of the club to find
     * @return {*} the club if found, else undefined
     */
    getClub(id) {
        for (let i = 0; i < this.dataPoints.length; i++) {
            if (this.dataPoints[i].id === id) {
                return this.dataPoints[i];
            }
        }
        return undefined;
    }

    /**
     * see super method
     */
    onDataPointParsed(dataPoint) {
        let club = new Club(dataPoint);
        let marker = this.createMarker(club);
        this.markerCluster.addLayer(marker);
        club.marker = marker;
        return club;
    }

    /**
     * Focus the club with the given id. Moves the map to the club, opens the popup and its infoPane
     * @param club_id if of the club to focus
     */
    focusClub(club_id) {
        let club = this.getClub(club_id);
		
		

        if (club !== undefined) {
            let zoom = 11;
            let options = {
                locate: {
                    callback: () => {
                        if (!club.marker.getPopup().isOpen()) {
                            club.marker.openPopup();
                        }
                    },
                    zoom: zoom
                }
            };
            this.onDataPointClicked(club, options).bind(this)({latlng: {lat: club.lat, lng: club.long}});
            if (!club.marker.getPopup().isOpen()) {
                club.marker.openPopup();
            }
        }
    }

    /**
     * Generates a compare method between players on a given field
     * @param field the field to compare players on
     * @param ascending 1 if the order should be ascending, -1 for descending
     * @return {Function} a compare function on the given field
     * @private
     */
    _comparePlayersOn(field, ascending = 1) {
        return (a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            if (field !== "rank_avg" && field.includes("rank_")) {
                aVal = getNumber(aVal);
                bVal = getNumber(bVal);
            }

            if (aVal < bVal) {
                return 1 * ascending;
            } else if (aVal > bVal) {
                return -1 * ascending;
            } else {
                return 0;
            }
        };
    }

    /**
     * Given a rank, returns the associated color
     * @param rank rank to use to determine color
     * @return {*} the color in a hex string
     * @private
     */
    static _getRankColor(rank) {
        let colors = [
            "#BF360C",
            "#EF6C00",
            "#FFB300",
            "#FFEE58",
            "#FFF9C4",
        ];

        if (rank === "N1" || rank === "N2" || rank === "N3") {
            return colors[0];
        } else if (rank === "R4" || rank === "R5" || rank === "R6") {
            return colors[1];
        } else if (rank === "D7" || rank === "D8" || rank === "D9") {
            return colors[2];
        } else if (rank === "P10" || rank === "P11" || rank === "P12") {
            return colors[3];
        } else {
            return colors[4];
        }
    }

    /**
     * Returns the image's path depending on the genre
     * @param genre genre or the player (0 boy, 1 female)
     * @return {string}
     * @private
     */
    static _getGenreImage(genre) {
        if (parseInt(genre) === 0) {
            return "img/logo_boy.png";
        } else {
            return "img/logo_girl.png"
        }
    }

    /**
     * Opens the infoPane for a given player
     * @param player_id the id of the player to show its infoPane
     * @private
     */
    _openPlayerPane(player_id) {
        let player;
        for (let i = 0; i < players.length; i++) {
            if (players[i].license === player_id) {
                player = players[i];
                console.log(player);
                break;
            }
        }
        if (player === undefined) {
            return;
        } else {
            let paneOptions = {
                title: "Club",
                locate: {
                    latlng: {lat: player.club.lat, lng: player.club.long},
                    zoom: CLUSTER_VISIBILITY_ZOOM,
                    callback: () => {
                        if (!player.club.marker.getPopup().isOpen()) {
                            player.club.marker.openPopup();
                        }
                    }
                }
            };

            this._generatePlayerPaneHMTL(player, paneOptions);
            //sidebar.open(,e.latlng, zoom);
            sidebar.open("infoPane");
        }
    }

    /**
     * Generates the html code for the infoPane to display info about a player.
     * @param player player to display info from
     * @param paneOptions locateOptions for the pane
     * @return {string} html code for the infoPane
     * @private
     */
    _generatePlayerPaneHMTL(player, paneOptions) {
        let club = this.getClub(player.club_id);

        let html = `
      <div class="clickable" id="backButton"> < back to club ${club.name}</div>
      <div>
      <div style="float: right; text-align:right;">
      <img src="${ClubsLayer._getGenreImage(player.gender)}">
      </div>
      
      <h1 style="size:200px;">${player.name} ${player.surname}</h1>
      
      <h3 style="size:200px;"> license number: ${player.license}</h3>
      
      Points average: ${player.rank_avg} 
      </div>
      
      <div class="radarChart"></div>`


        sidebar.updatePaneHTML("infoPane", html, paneOptions);
        createPlot(player, 300)
        document.getElementById('backButton').onclick = () => {
            this._updateClubInfoPane(club, paneOptions)
            return false;
        };
        return html

    }

    /**
     * Generates the html code for the list of players displayed on the club infoPane
     * @param dataPoint club to use to generate the players list
     * @param paneOptions locate options for the infoPane
     * @return {string} html code
     * @private
     */
    _generatePlayersHtml(dataPoint, paneOptions) {
        let searchMethod = paneOptions.comparePlayers !== undefined ? paneOptions.comparePlayers : this._comparePlayersOn("rank_avg");

        let players = dataPoint.players.sort(searchMethod);
        let html = `<div>
        <table>
          <tbody><tr><td><h3>
            <a></a>Les joueurs en 2018-2019
          </h3></td></tr>
          <tr><td><br>
          <table><tbody><tr>
          <th>
            <a class="clickable" id="table_h_players_Name"> Nom Prénom </a>
          </th>
          <th>
            <a class="clickable" id="table_h_players_Genre"> Genre </a>
          </th>
          <th>
            <a class="clickable" id="table_h_players_S"> S </a>
          </th>
          <th>
            <a class="clickable" id="table_h_players_D"> D </a>
          </th>
          <th>
            <a class="clickable" id="table_h_players_M"> M </a>
          </th>
          <th>
            <a class="clickable" id="table_h_players_Moy"> Moy </a>
          </th>`;

        for (let index = 0; index < players.length; index++) {
            const p = players[index];
            let gender = 'M';
            if (parseInt(p.gender)) {
                gender = 'F'
            }
            html += `</tr><tr>
          <td><a class="clickable" id="player${p.license}">${p.name + " " + p.surname.toUpperCase()}</a></td>
          <td align="center">${gender}</td>
          <td bgcolor="${ClubsLayer._getRankColor(p.rank_solo)}" align="center">${p.rank_solo}</td>
          <td bgcolor="${ClubsLayer._getRankColor(p.rank_double)}" align="center">${p.rank_double}</td>
          <td bgcolor="${ClubsLayer._getRankColor(p.rank_mixte)}" align="center">${p.rank_mixte}</td>
          <td align="right">${p.rank_avg}</td>
          </tr>`
        }

        html += `</tbody></table>
        </td></tr></tbody></table>
        </div>`

        return html;


    }

    /**
     * Generate the clubs' html for the infoPane
     * @param dataPoint club to use to generate the infoPane html
     * @param paneOptions locate options for the infoPane
     * @return {string}
     * @private
     */
    _generateClubHtml(dataPoint, paneOptions) {
        let rawHtml = dataPoint.html;
        rawHtml = rawHtml.replace(/(\r\n|\n|\r)/gm, "");
        let htmlNoLogo = /<div[^>]*>(.*)<\/div>/gm.exec(rawHtml);
        let html = htmlNoLogo[1];
        let logoLink = /.*src="([^"]*)".*/gm.exec(html);


        if (logoLink[1].startsWith("../")) {
            html = html.replace(/..\/img\/3\/logo_club.jpg/gm, "img/logo_club.jpg")
        }
        return html + this._generatePlayersHtml(dataPoint, paneOptions);
    }

    /**
     * Updates the HTMl code of the infoPane to display info about the given club
     * @param dataPoint club to get the info from
     * @param paneOptions locate options for the infoPane
     * @private
     */
    _updateClubInfoPane(dataPoint, paneOptions) {
        let html = this._generateClubHtml(dataPoint, paneOptions);
        sidebar.updatePaneHTML("infoPane", html, paneOptions);
        let players = dataPoint.players;
        for (let i = 0; i < players.length; ++i) {
            let p = players[i];
            document.getElementById('player' + p.license.toString()).onclick = () => {
                this._generatePlayerPaneHMTL(p, paneOptions);
                return false;
            };
        }

        // Here we bind all the sorting methods to the table headers

        document.getElementById('table_h_players_Name').onclick = () => {
            let ascending = 1;
            if (paneOptions.sortAscending === undefined) {
                paneOptions.sortAscending = 1;
            } else {
                ascending = paneOptions.sortAscending;
                paneOptions.sortAscending = -paneOptions.sortAscending;
            }
            paneOptions.comparePlayers = this._comparePlayersOn("surname", ascending);
            this._updateClubInfoPane(dataPoint, paneOptions);
            return false;
        };

        document.getElementById('table_h_players_Genre').onclick = () => {
            let ascending = 1;
            if (paneOptions.sortAscending === undefined) {
                paneOptions.sortAscending = 1;
            } else {
                ascending = paneOptions.sortAscending;
                paneOptions.sortAscending = -paneOptions.sortAscending;
            }
            paneOptions.comparePlayers = this._comparePlayersOn("gender", ascending);
            this._updateClubInfoPane(dataPoint, paneOptions);
            return false;
        };

        document.getElementById('table_h_players_S').onclick = () => {
            let ascending = 1;
            if (paneOptions.sortAscending === undefined) {
                paneOptions.sortAscending = 1;
            } else {
                ascending = paneOptions.sortAscending;
                paneOptions.sortAscending = -paneOptions.sortAscending;
            }
            paneOptions.comparePlayers = this._comparePlayersOn("rank_solo", ascending);
            this._updateClubInfoPane(dataPoint, paneOptions);
            return false;
        };

        document.getElementById('table_h_players_D').onclick = () => {
            let ascending = 1;
            if (paneOptions.sortAscending === undefined) {
                paneOptions.sortAscending = 1;
            } else {
                ascending = paneOptions.sortAscending;
                paneOptions.sortAscending = -paneOptions.sortAscending;
            }
            paneOptions.comparePlayers = this._comparePlayersOn("rank_double", ascending);
            this._updateClubInfoPane(dataPoint, paneOptions);
            return false;
        };

        document.getElementById('table_h_players_M').onclick = () => {
            let ascending = 1;
            if (paneOptions.sortAscending === undefined) {
                paneOptions.sortAscending = 1;
            } else {
                ascending = paneOptions.sortAscending;
                paneOptions.sortAscending = -paneOptions.sortAscending;
            }
            paneOptions.comparePlayers = this._comparePlayersOn("rank_mixte", ascending);
            this._updateClubInfoPane(dataPoint, paneOptions);
            return false;
        };

        document.getElementById('table_h_players_Moy').onclick = () => {
            let ascending = 1;
            if (paneOptions.sortAscending === undefined) {
                paneOptions.sortAscending = 1;
            } else {
                ascending = paneOptions.sortAscending;
                paneOptions.sortAscending = -paneOptions.sortAscending;
            }
            paneOptions.comparePlayers = this._comparePlayersOn("rank_avg", ascending);
            this._updateClubInfoPane(dataPoint, paneOptions);
            return false;
        };


    }

    /**
     * see super method
     */
    onDataPointClicked(dataPoint, options) {
        return (e) => {
            let title = this.getDataType();
            title = title[0].toUpperCase() + title.substr(1); //put first letter to uppercase

            let zoom = options.locate.zoom === undefined ? map.getZoom() : options.locate.zoom;
            let paneOptions = {
                title: title,
                locate: {
                    latlng: e.latlng,
                    zoom: zoom,
                    callback: options.locate.callback
                }
            };
            let html = this._updateClubInfoPane(dataPoint, paneOptions)
            //sidebar.updatePaneHTML("infoPane", html, paneOptions);
            sidebar.open("infoPane", e.latlng, zoom);
        }
    }
}

/**
 * DEPRECATED : the decision was made to not display info about tournaments as there was no way to link those data
 * to the already displayed ones (linking data is altogether required too much time and scarping).
 */
class TournamentsLayer extends CustomDataLayer {
    constructor() {
        super("data/Tournament.csv");
        this.sidebarPanelButton = {
            id: 'tournamentsPanel',                     // UID, used to access the panel
            tab: '<i class="fas fa-trophy" style="color: black;"></i>',  // content can be passed as HTML string,
            //pane: someDomNode.innerHTML,        // DOM elements can be passed, too
            title: 'Tournaments',              // an optional pane header
            button: toggleLayerButton
        };
    }

    getDataType() {
        return "tournament";
    }

    getDepartmentColor(d) {
        return d > 65 ? '#FF6F00' :
            d > 45 ? '#FF8F00' :
                d > 30 ? '#FFA000' :
                    d > 20 ? '#FFB300' :
                        d > 15 ? '#FFC107' :
                            d > 10 ? '#FFCA28' :
                                d > 5 ? '#FFD54F' :
                                    '#FFE082';
    }

    getDepartmentColorGrades() {
        return [0, 5, 10, 15, 20, 30, 45, 65];
    }

    markerFillColor() {
        return '#E65100'
    }


    onDataPointParsed(dataPoint) {
        let tournament = new Tournament(dataPoint);
        this.markerCluster.addLayer(this.createMarker(tournament));
        return tournament;
    }

    onDataPointClicked(dataPoint, options) {
        return (e) => {
            function getPrice() {
                let prices = "";
                if (dataPoint.price_1_tab != "") {
                    prices = prices + `Un tableau: ${dataPoint.price_1_tab}€ <br>`;
                }
                if (dataPoint.price_2_tabs != "") {
                    prices = prices + `Deux tableaux: ${dataPoint.price_2_tabs}€ <br>`;
                }
                if (dataPoint.price_3_tabs != "") {
                    prices = prices + `Trois tableaus: ${dataPoint.price_3_tabs}€ <br>`;
                }
                return prices;
            }

            let title = this.getDataType();
            title = title[0].toUpperCase() + title.substr(1); //put first letter to uppercase
            let html = `<div style="padding: .5em; margin: 0 auto; width:45em; 
            background-color: #FFFFFF">
            <span style="font-size:2em; font-weight: bold; ">${dataPoint.name}</span>
            <table class="formulaire" 
            cellpadding="0" summary="description du tournoi"><tr>
            <td class="formulaire1">Date</td><td class="forminfo">${dataPoint.start_date}</td></tr>
            <tr>
            <td class="formulaire1"><a href="http://badiste.fr/${dataPoint.url}">Lien du tournoi</td><td class="forminfo"></td></tr>
            <tr>
            <td class="formulaire1">Prix</td><td class="forminfo">${getPrice()}</td></tr>
            <tr></table></div>`;
            let zoom = options.locate.zoom === undefined ? map.getZoom() : options.locate.zoom;
            let paneOptions = {
                title: title,
                locate: {
                    latlng: e.latlng,
                    zoom: zoom,
                    callback: options.locate.callback
                }
            };
            console.log(html)
            sidebar.updatePaneHTML("infoPane", html, paneOptions);
            sidebar.open("infoPane", e.latlng, zoom);
        }
    }
}
