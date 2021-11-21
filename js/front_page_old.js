var ctx = {
    w: 1200,
    h: 800,
};

const PROJECTIONS = {
    ER: d3.geoEquirectangular().center([0,0]).scale(128).translate([ctx.w/2,ctx.h/2]),
};

var createViz = function(){
    var svgEl = d3.select("#main").append("svg");
    ctx.svg = svgEl;

    svgEl.attr("width", ctx.w);
    svgEl.attr("height", ctx.h);
    svgEl.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#daecf3");
    loadGeo(svgEl);
};

var loadData = function(svgEl){

};

var loadGeo = function(svgEl){
    var promises = [d3.json("resources/ne_110m_land.geojson"),
        d3.json("resources/ne_50m_lakes.geojson"),
        d3.json("resources/ne_50m_rivers_lake_centerlines.geojson")];
    // // https://opensky-network.org/api/states/all.json?lamin=${ctx.LA_MIN}&lomin=${ctx.LO_MIN}&lamax=${ctx.LA_MAX}&lomax=${ctx.LO_MAX}
    // //d3.json(`https://opensky-network.org/api/states/all?lamin=${ctx.LA_MIN}&lomin=${ctx.LO_MIN}&lamax=${ctx.LA_MAX}&lomax=${ctx.LO_MAX}`)];
    // //d3.json("https://opensky-network.org/api/states/all?lamin=45.8389&lomin=5.9962&lamax=47.8229&lomax=10.5226")];
    //
    Promise.all(promises).then(function(data){
        drawMap(data[0], data[1], data[2], svgEl);
        // loadPlanes()
    }).catch(function(error){console.log(error)});
};


var drawMap = function(countries, lakes, rivers, svgEl){
    ctx.mapG = svgEl.append("g")
        .attr("id", "map");
    // bind and draw geographical features to <path> elements
    var path4proj = d3.geoPath()
        .projection(PROJECTIONS.ER);
    var countryG = ctx.mapG.append("g").attr("id", "countries");
    countryG.selectAll("path.country")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("d", path4proj)
        .attr("class", "country");
    var lakeG = ctx.mapG.append("g").attr("id", "lakes");
    lakeG.selectAll("path.lakes")
        .data(lakes.features)
        .enter()
        .append("path")
        .attr("d", path4proj)
        .attr("class", "lake");
    var riverG = ctx.mapG.append("g").attr("id", "rivers");
    riverG.selectAll("path.rivers")
        .data(rivers.features)
        .enter()
        .append("path")
        .attr("d", path4proj)
        .attr("class", "river");

    var zoom = d3.zoom()
        .scaleExtent([1, 40])
        .on("zoom", zoomed);
    svgEl.call(zoom);
};

// pan & zoom
function zoomed(event, d) {
    ctx.mapG.attr("transform", event.transform);
    var scale = ctx.mapG.attr("transform");
    scale = scale.substring(scale.indexOf('scale(')+6);
    scale = parseFloat(scale.substring(0, scale.indexOf(')')));
    ctx.scale = 1 / scale;
    if (ctx.scale != 1){
        d3.selectAll("image")
            .attr("transform", (d) => (getPlaneTransform(d)));
    }
}




























// min_max = []
// for (var city in output){
//     if (city != 'Date'){
//         element = {"name":city, "values": output[city]}
//         series.push(element);
//         [min, max] = d3.extent(output[city]);
//         min_max.push(min)
//         min_max.push(max)
//     }
// }
// var color = d3.scaleLinear()
//     .domain([min, 100, max])
//     .range(["red", "white", "blue"]);
// console.log("MIN MAX --------------------------------");
// console.log([min, max]);



// [min, max] = d3.extent(max_min);
// var color = d3.scaleLinear()
//     .domain([min, 100, max])
//     .range(["red", "white", "blue"]);