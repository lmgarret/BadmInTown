
class DivergingStackChart{
    constructor(){
        this.margin = {top: 25, right: 20, bottom: 20, left: 10};
        this.width = 360 - this.margin.left - this.margin.right;
        this.height = 450 - this.margin.top - this.margin.bottom;

        this.keyLegendMapping = [
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
            "#FFF9C4",];

        this.z = d3.scaleOrdinal()
            .range(this.colors);

        this.svg.append("g")
            .attr("class","axis x-axis");

        this.svg.append("g")
            .attr("class", "axis y-axis");

    }

    formatData(data){
        for (let i = 0; i < data.length; i++) {
            //we inverse values to have the values spread left and right of the axis
            data[i].rank_P_count *= - 1;
            data[i].rank_NC_count *= - 1;
            //data[i].rank_D_count *= - 1;
        }
        return data;
    }

    update(data) {
        this.data = this.formatData(data.reverse());

        //update the legend
        let tempDiv = L.DomUtil.create('div', 'legend');

        // loop through our density intervals and generate a label with a colored square for each interval
        for (let i = 0; i < this.keyLegendMapping.length; i++) {
            tempDiv.innerHTML +=
                `<i style="background: ${this.colors[i]}"></i>` +
                this.keyLegendMapping[i].name + '<br>';
        }
        document.getElementById("stacked-chart-legend").innerHTML = tempDiv.innerHTML;

        //update the chart
        const keys = this.keyLegendMapping.map(mapping => mapping.key);

        const series = d3.stack()
            .keys(keys)
            .offset(d3.stackOffsetDiverging)
            .order(d3.stackOrderInsideOut)
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
