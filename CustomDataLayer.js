const FRANCE_GEOJSON_PATH = "data/france-departements_low.geojson";
const CLUSTER_VISIBILITY_ZOOM = 8;

class CustomDataLayer {

    constructor(json_path) {
        this.json_path = json_path;
        this.dataPoints = [];
        this.visible = true;

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
        return department
    }

    loadDataPoints(map) {
        this.markerCluster = this.createMarkerCluster();

        let promiseDepartment = d3.json(FRANCE_GEOJSON_PATH, d => this.onDepartmentParsed(d));
        let promiseDataPoints = d3.csv(this.json_path, d => this.onDataPointParsed(d));

        return Promise.all([promiseDepartment, promiseDataPoints]).then(values => {
            let departments = values[0];
            let dataPoints = values[1];

            departments.features.forEach((department) => this.computeDepartmentDensity(department, dataPoints));
            this.department_layer = L.geoJson(
                departments,
                {
                    style: this.departmentStyle.bind(this),
                    onEachFeature: this.onEachFeature.bind(this)
                }
            );
        });
    }

    show() {
        console.log(this);
        this.visible = true;

        this.department_layer.addTo(map);
        this.markerCluster.addTo(map);
        this.infoLabel.addTo(map);
        this.legendLabel.addTo(map);

        map.removeLayer(this.markerCluster);

        map.on('zoom', () => {
            console.log(`zoom=${map.getZoom()}`);
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
    }

    hide() {
        this.visible = false;

        map.removeLayer(this.department_layer);
        map.removeLayer(this.markerCluster);
        map.removeControl(this.infoLabel);
        map.removeControl(this.legendLabel);
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
            let point = turf.point([dataPoint.long, dataPoint.lat]);
            if (turf.inside(point, department)) {
                department.properties.density++;
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

    highlightFeature(e) {
        let layer = e.target;
        let dep_code = layer.feature.properties.code;

        this.department_layer.eachLayer(l => this.department_layer.resetStyle(l))
        layer.setStyle({
            dashArray: '',
            fillOpacity: 0,
        });

        this.infoLabel.update(layer.feature.properties);
    }

    resetHighlight(e) {
        let polygon = e.target.toGeoJSON();
        let point = turf.point([e.latlng.lng, e.latlng.lat]);

        if (!turf.inside(point, polygon)) {
            this.department_layer.resetStyle(e.target);
        }
        this.infoLabel.update();
    }

    zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

    moveViewTo(e) {
        map.setView(e.latlng);
    }

    onEachFeature(feature, layer) {
        layer.on({
            mouseover: this.highlightFeature.bind(this),
            mouseout: this.resetHighlight.bind(this),
            click: this.zoomToFeature.bind(this)
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
