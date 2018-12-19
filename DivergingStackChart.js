/**
 * Class responsible for creating, updating and showing the Stack chart representing clubs depending on their levels,
 * which is determined on the number of players in national then regional then departmental etc...
 */
class DivergingStackChart{
    constructor(){
        this.margin = {top: 25, right: 20, bottom: 10, left: 10};
        this.width = 370 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

        //Names and fields for the legend
        this.keyLegendMapping = [
            {
                name: "No Ranking (NC)",
                key: "rank_NC_count"
            },
            {
                name: "Communal (P)",
                key: "rank_P_count"
            },
            {
                name: "Departmental (D)",
                key: "rank_D_count"
            },
            {
                name: "Regional (R)",
                key: "rank_R_count"
            },
            {
                name: "National (N)",
                key: "rank_N_count"
            },

        ];

        this.svg = d3.select("#figure")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this.y = d3.scaleBand()
            .rangeRound([this.height, 0])
            .padding(0.2);

        this.x = d3.scaleLinear()
            .rangeRound([0, this.width]);

        this.colors = [
            "#BF360C",
            "#EF6C00",
            "#FFB300",
            "#FFEE58",
            "#FFF9C4",
        ];

        this.z = d3.scaleOrdinal()
            .range(this.colors);

        this.svg.append("g")
            .attr("class","axis x-axis");

        this.svg.append("g")
            .attr("class", "axis y-axis");

    }

    /**
     * Processes data in order to get it in the correct order
     * @param data clubs to format
     * @return {Array} formatted data array
     */
    formatData(data){
        let formattedData = [];

        for (let i = 0; i < data.length; i++) {
            let d = {
                id: data[i].id,
                name: data[i].name,
                rank_N_count: - data[i].rank_N_count,
                rank_R_count: - data[i].rank_R_count,
                rank_D_count: - data[i].rank_D_count,
                //we inverse values to have the values spread left and right of the axis
                rank_P_count: - data[i].rank_P_count,
                rank_NC_count: - data[i].rank_NC_count,

            };
            formattedData.push(d);
        }

        formattedData = formattedData.reverse();

        /*if(this.data !== undefined) {
            for (let i = 0; i < this.data.length - formattedData.length; i++) {
                formattedData.push({
                    //push stub value to fill if not enough clubs to display
                    id: -1 * i,
                    name: " ".repeat(i),
                    rank_N_count: 0,
                    rank_R_count: 0,
                    rank_D_count: 0,
                    rank_P_count: 0,
                    rank_NC_count: 0,
                });
            }
        }*/
        return formattedData;
    }

    /**
     * Generates the HTML code for one element of the legend
     * @param keyMapping tuple from keyLegendMapping to use to create the legend
     * @return {string} html ready code
     * @private
     */
    _createLegendItemHTML(keyMapping){
        return `<i style="background: ${this.z(keyMapping.key)}"></i>` +
            keyMapping.name + '<br>'
    }

    /**
     * Update the chart with the given data and title. Generates the new HTML code and animates its replacement in the
     * chart's div.
     * @param data new clubs to display
     * @param title string title of the chart
     */
    update(data,title) {
        this.data = this.formatData(data);

        //update the legend
        let legendDiv = L.DomUtil.create('div', 'legend');

        legendDiv.innerHTML += this._createLegendItemHTML(this.keyLegendMapping[4]);
        legendDiv.innerHTML += this._createLegendItemHTML(this.keyLegendMapping[3]);
        legendDiv.innerHTML += this._createLegendItemHTML(this.keyLegendMapping[2]);
        legendDiv.innerHTML += this._createLegendItemHTML(this.keyLegendMapping[1]);
        // loop through our density intervals and generate a label with a colored square for each interval
        legendDiv.innerHTML += this._createLegendItemHTML(this.keyLegendMapping[0]);

        document.getElementById("stacked-chart-legend").innerHTML = legendDiv.innerHTML;


        //update the title
        let titleDiv = L.DomUtil.create('div', 'title');
        titleDiv.innerHTML += `<b>${title}</b></br>`;
        document.getElementById("stacked-chart-title").innerHTML = titleDiv.innerHTML;

        //update the chart
        const keys = this.keyLegendMapping.map(mapping => mapping.key);

        const series = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetDiverging)
            .order(d3.stackOrderReverse)
            (this.data);

        this.y.domain(this.data.map(d => d.name));

        this.x.domain([
            d3.max(series, stackMax),
            d3.min(series, stackMin),
        ]).nice();

        const barGroups = this.svg.selectAll("g.layer")
            .data(series);

        barGroups.exit().remove();

        barGroups.enter().insert("g", ".y-axis")
            .classed('layer', true);

        this.svg.selectAll("g.layer")
            .transition().duration(750)
            .attr('class', 'clickable')
            .attr("fill", d => this.z(d.key));

        let bars = this.svg.selectAll("g.layer").selectAll("rect")
            .data(function (d) {
                return d;
            });

        bars.exit().remove();

        const div = d3
            .select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        /**
         * Return a rank depending on the range it is being on
         * @param range range of index it displayed on
         * @param club the club being displayed
         * @return {string} a string caption for the tooltip, corresponding to the rank
         */
        function getRankFromRange(range, club){
            if (range[0] === club.rank_N_count){
                return "National"
            } else if (range[0] === club.rank_N_count + club.rank_R_count){
                return "Regional"
            } else if (range[0] === club.rank_N_count + club.rank_R_count + club.rank_D_count){
                return "Departmental"
            }else if (range[0] === club.rank_N_count + club.rank_R_count + club.rank_D_count + club.rank_P_count){
                return "Communal"
            }else {
                return "No Ranking"
            }
        }

        bars = bars
            .enter()
            .append("rect")
            .merge(bars)
            .attr("height", this.y.bandwidth())
            .attr("y", d => this.y(d.data.name))
            .on('mouseover', function(d) {
                d3.select(this).classed("bar-chart-hover", true);
                div.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                div.html(`${Math.abs(d[1] - d[0])} ${getRankFromRange(d,d.data)}`)
                    .style('left', d3.event.pageX + 'px')
                    .style('top', d3.event.pageY - 28 + 'px');
                let club = clubsLayer.getClub(this.__data__.data.id);

                if (map.getZoom() >= CLUSTER_VISIBILITY_ZOOM){
                    sidebar.moveViewTo({lat: club.lat, lng: club.long}, "open", map.getZoom());
                    club.marker.openPopup();
                } else {
                    clubsLayer.onMouseOverDepartment({target : clubsLayer.getDepartmentLayer(club.department)});
                }

            })
            .on('mouseout', function() {
                d3.select(this).classed("bar-chart-hover", false);
                div
                    .transition()
                    .duration(500)
                    .style('opacity', 0)
            })
            .on('click', function() {
				let club = clubsLayer.getClub(this.__data__.data.id);
				clubsLayer.deselectAllDepartments(club.department)
                clubsLayer.focusClub(club.id);
            });

        bars.transition().duration(750)
            .attr("x", d => this.x(d[1]))
            .attr("width", d => Math.abs(this.x(d[0])-this.x(d[1])));

        this.svg.selectAll(".y-axis").transition().duration(750)
            .attr("transform", "translate(" + this.x(0)  + ",0)")
            .call(d3.axisRight(this.y));

        const formatter = d3.format("0");

        this.svg.selectAll(".x-axis").transition().duration(750)
        //.attr("transform", "translate(0," + x(0) + ")")
            .call(d3.axisTop(this.x).ticks(8)
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
