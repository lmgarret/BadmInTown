const FRANCE_GEOJSON_PATH = "geojson/france_departements_all_low.geojson";
const CLUSTER_VISIBILITY_ZOOM = 8;

class CustomDataLayer {

    constructor(json_path) {
        this.json_path = json_path;
        this.dataPoints = [];
        this.visible = false;
        this.loadedDepartments = 0;
        this.totalDepartments = 101;

        this.infoLabel = L.control();
        this.infoLabel.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };
        this.infoLabel.update = this.updateInfoLabel;

        this.legendLabel = L.control({position: 'bottomright'});
        this.legendLabel.onAdd = function (map) {
            let colorGrades = this.getDepartmentColorGrades();
            let div = L.DomUtil.create('div', 'info legend');

            // loop through our density intervals and generate a label with a colored square for each interval
            for (let i = 0; i < colorGrades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + this.getDepartmentColor(colorGrades[i] + 1) + '"></i> ' +
                    colorGrades[i] + (colorGrades[i + 1] ? '&ndash;' + colorGrades[i + 1] + '<br>' : '+');
            }

            return div;
        }.bind(this);
    }

    /**
     * Function called when parsing the csv file and we need to apply some transformation on each data point.
     * @param dataPoint
     */
    onDataPointParsed(dataPoint) {
        if (dataPoint.lat !== "" && dataPoint.long !== "") {
            dataPoint.lat = parseFloat(dataPoint.lat);
            dataPoint.long = parseFloat(dataPoint.long);
            this.dataPoints.push(dataPoint);
            this.markerCluster.addLayer(this.createMarker(dataPoint));
        } else {
            console.log(`${this.getDataType()} ${dataPoint.name} has no coord.`);
        }
        return dataPoint;
    }

    onDepartmentParsed(department) {
        this.totalDepartments++;
        return department
    }

    loadDataPoints(map) {
        _onLoadStarted();
        this.markerCluster = this.createMarkerCluster();

        let promiseDepartment = d3.json(FRANCE_GEOJSON_PATH, d => this.onDepartmentParsed(d));
        let promiseDataPoints = d3.csv(this.json_path, d => this.onDataPointParsed(d));

        this.loadingPromise = new Promise((resolveLoadingPromise, reject) => {
            Promise.all([promiseDepartment, promiseDataPoints]).then(values => {
                let departments = values[0];
                let dataPoints = values[1];

                for (let i = 0, len = departments.features.length; i < len; i++) {
                    //we sleep here to let the display update itself
                    sleep(50).then(() => {
                        this.computeDepartmentDensity(departments.features[i], dataPoints);
                        this.loadedDepartments++;
                        _onLoadProgress();
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

                            resolveLoadingPromise(42);
                        }
                    });
                }


            });

        });
        return this.loadingPromise;
    }

    show() {
        this.loadingPromise.then(() => {
            this.visible = true;

            this.department_layer.addTo(map);
            this.markerCluster.addTo(map);
            this.infoLabel.addTo(map);
            this.legendLabel.addTo(map);

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
            map.addControl(this.infoLabel);
            map.addControl(this.legendLabel);
        });
    }

    hide() {

        this.loadingPromise.then(() => {
            this.visible = false;

            map.removeLayer(this.department_layer);
            map.removeLayer(this.markerCluster);
            map.removeControl(this.infoLabel);
            map.removeControl(this.legendLabel);
        });
    }


    createMarkerCluster() {
        return L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            maxClusterRadius: function (zoom) {
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

    createMarker(dataPoint) {
        const marker = new L.CircleMarker([dataPoint.lat, dataPoint.long], {
            radius: 6,
            fillColor: this.markerFillColor(),
            fillOpacity: 0.8,
            weight: 0 //stroke width
        }).bindPopup(`${dataPoint.name}`);
        marker.on({
            click: this.moveViewTo
        });
        return marker;
    }

    computeDepartmentDensity(department, dataPoints) {
        department.properties.density = 0;
        dataPoints.forEach(dataPoint => {
            if (dataPoint.department_code === undefined){
                let point = turf.point([dataPoint.long, dataPoint.lat]);
                if (turf.inside(point, department)) {
                    department.properties.density++;
                    dataPoint.department_code = department.properties.code;
                }
            }
        });
        return department;
    }

    departmentStyle(department) {
        return {
            fillColor: this.getDepartmentColor(department.properties.density),
            weight: 1, //stroke width
            opacity: 1,
            color: 'white',  //Outline color
            fillOpacity: 0.8
        };
    }

    departmentStyleHighlighted() {
        return {
            dashArray: '',
            fillOpacity: 0,
        };
    }

    getDepartmentColor(d) {
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

    getDepartmentColorGrades() {
        return [0, 5, 10, 15, 20, 30, 45, 65];
    }

    markerFillColor() {
        return "#000000"
    }

    onMouseOverDepartment(e) {
        let layer = e.target;
        let dep_code = layer.feature.properties.code;

        this.department_layer.eachLayer(l => {
            if (!l.feature.properties.isSelected) {
                this.department_layer.resetStyle(l);
            }
        });
        if (map.getZoom() < CLUSTER_VISIBILITY_ZOOM) {
            layer.openPopup();
        }

        layer.setStyle({
            dashArray: '',
            fillOpacity: 0,
        });

        this.infoLabel.update(layer.feature.properties);
    }

    onMouseOutDepartment(e) {
        let layer = e.target;
        layer.closePopup();
        let polygon = e.target.toGeoJSON();
        let point = turf.point([e.latlng.lng, e.latlng.lat]);

        if (!turf.inside(point, polygon) && !layer.feature.properties.isSelected) {
            this.department_layer.resetStyle(e.target);
        }
        this.infoLabel.update();
    }

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
    }

    moveViewTo(e) {
        map.setView(e.latlng);
    }

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

    getDataType() {
        return "dataPoint";
    }


    updateInfoLabel(props) {
        this._div.innerHTML = '<h4>DataPoints density</h4>' + (props ?
            '<b>' + props.nom + '</b><br />' + props.density + ' datapoints</sup>'
            : 'Hover over a department');
    }

    getLoadingPercentage() {
        //rough estimation of the progress done so far
        return 100 * this.loadedDepartments / this.totalDepartments;
    }

    deselectAllDepartments() {
        this.department_layer.eachLayer(l => {
            l.feature.properties.isSelected = false;
            this.department_layer.resetStyle(l);
        });
    }
}

class ClubsLayer extends CustomDataLayer {
    constructor() {
        super("data/Club_geo.csv");
    }

    getDataType() {
        return "club"
    }

    getDepartmentColor(d) {
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

    getDepartmentColorGrades() {
        return [0, 5, 10, 15, 20, 30, 45, 65];
    }

    markerFillColor() {
        return "#0D47A1"
    }

    updateInfoLabel(props) {
        this._div.innerHTML = '<h4>Clubs density</h4>' + (props ?
            '<b>' + props.nom + '</b><br />' + props.density + ' clubs</sup>'
            : 'Hover over a department');
    }
}

class TournamentsLayer extends CustomDataLayer {
    constructor() {
        super("data/Tournament.csv");
    }

    getDataType() {
        return "tournament";
    }

    getDepartmentColor(d) {
        //TODO use d3.interpolate ?
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

    updateInfoLabel(props) {
        this._div.innerHTML = '<h4>Tournaments density</h4>' + (props ?
            '<b>' + props.nom + '</b><br />' + props.density + ' tournaments</sup>'
            : 'Hover over a department');
    }
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}
