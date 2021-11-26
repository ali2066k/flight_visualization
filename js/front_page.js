var ctx = {
    w: 810,
    h: 400,
    // LA_MIN: 41.31,
    // LA_MAX: 51.16,
    // LO_MIN: -4.93,
    // LO_MAX: 7.72,
    LA_MIN: 1.31,
    LA_MAX: 51.16,
    LO_MIN: -14.93,
    LO_MAX: 72.72,
    TRANSITION_DURATION: 1000,
    scale: 1,
    liveFlights: [],
    alreadyIn: [],
    planeUpdater: null,
    available_planes_percentage: 100,
    planes_bool: true,
    airports_bool: false,
    routes_bool: false,
    path_bool: false
};


// TODO:
// https://ourairports.com/data/
// https://ourairports.com/data/
// https://rapidapi.com/Active-api/api/airport-info

// Heat Map
// https://www.google.com/search?q=d3+geographic+heatmap&rlz=1C1UEAD_frFR969FR969&oq=d3+geographic+heatmap&aqs=chrome..69i57.5713j0j4&sourceid=chrome&ie=UTF-8
//https://bl.ocks.org/patricksurry/803a131d4c34fde54b9fbb074341daa5
//
//


const PROJECTIONS = {
    ER: d3.geoEquirectangular().center([0,0]).scale(128).translate([ctx.w/2,ctx.h/2]),
};

var createViz = function() {

    //
    // Designing stuff

    //

    d3.select("#main").attr("width", ctx.w + 100);
    d3.select("#main").attr("height", ctx.h + 100);
    d3.select("#main").attr("fill", "#000");


    var newSVG = d3.select("#main").append("svg");
    ctx.svg = newSVG;
    newSVG.attr("id", "live_map");
    newSVG.attr("width", ctx.w);
    newSVG.attr("height", ctx.h);
    loadWidgets();
    loadGeo(newSVG);
};

var loadWidgets = function () {
    var horizentalWidgets = d3.select("#hor_widgets");
    horizentalWidgets.style("background", "rgba(224,223,223,0.63)")
        .style("width", ctx.w / 6 + "px")
        .style("height", ctx.h + "px")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px")
        // .style("z-index", "9")
        .style("opacity", "60%");
    // var horizentalFirst_Widget = d3.select("h_widgets").append('f').attr("id", "h1_widget")
    //     .attr("class", "hwidgets_items");
    // horizentalFirst_Widget.style("background", "#000")
    //     .attr("width", ctx.w / 8)
    //     .attr("height", ctx.h / 5)
    //     .style("position", "absolute")
    //     .style("top", "0px")
    //     .style("left", "0px")
    //     .style("z-index", "9")
    //     .style("opacity", "80%");

}
var loadAirplaneAltitudeAnalysis = function(newSVG) {
    // Todo: Altiutude duration of trip relation
}

var loadGeo = function(newSVG){
    var promises = [d3.json("resources/geo_maps/ne_50m_admin_0_countries.geojson"),
                    d3.json("resources/geo_maps/ne_50m_ocean.geojson"),
                    d3.json("resources/geo_maps/ne_50m_lakes.geojson"),
                    d3.json("resources/geo_maps/ne_50m_glaciated_areas.geojson"),
                    d3.json("resources/geo_maps/ne_50m_rivers_lake_centerlines.geojson"),
                    d3.csv("resources/data/airports.csv")];
    Promise.all(promises).then(function(d){
        drawMap(d[0], d[1], d[2], d[3], d[4], newSVG);
        loadAirPlanes();
        loadAirports(d[5]);
        drawCirclesPath();
        // loadTrackByAirCrafts("4bb18b", "1637882831");
        // loadFlightsByAirCrafts("344649", 1636673231-604800, 1636673231);
    }).catch(function(error){console.log(error)});
};



var drawMap = function(countries, oceans, lakes, glaciers, rivers, svgEl){

    ctx.mapG = svgEl.append("g")
        .attr("id", "map")
        .attr("x", 0)
        .attr("y", 0)
        .style("width", ctx.w)
        .style("height", ctx.h)
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", "0px");

    var path4proj = d3.geoPath()
        .projection(PROJECTIONS.ER);

    var countryG = ctx.mapG.append("g").attr("id", "countries");
    countryG.selectAll("path.country")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("d", path4proj)
        .attr("class", "country");

    var oceanG = ctx.mapG.append("g").attr("id", "oceans");
    oceanG.selectAll("path.oceans")
        .data(oceans.features)
        .enter()
        .append("path")
        .attr("d", path4proj)
        .attr("class", "ocean");

    var lakeG = ctx.mapG.append("g").attr("id", "lakes");
    lakeG.selectAll("path.lakes")
        .data(lakes.features)
        .enter()
        .append("path")
        .attr("d", path4proj)
        .attr("class", "lake");

    // var riverG = ctx.mapG.append("g").attr("id", "rivers");
    // riverG.selectAll("path.rivers")
    //     .data(rivers.features)
    //     .enter()
    //     .append("path")
    //     .attr("d", path4proj)
    //     .attr("class", "river");

    var glacierG = ctx.mapG.append("g").attr("id", "glaciers");
    glacierG.selectAll("path.glaciers")
        .data(glaciers.features)
        .enter()
        .append("path")
        .attr("d", path4proj)
        .attr("class", "glacier");

    var planes = ctx.mapG.append("g")
        .attr("id", "planes")
        .attr("class", "plane");

    var airports = ctx.mapG.append("g")
        .attr("id", "airports")
        .attr("class", "airport");

    var pathPoints = ctx.mapG.append("g")
        .attr("id", "pathPoints")
        .attr("class", "pathPoint");



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

var loadData = function(svgEl){

};

var loadAirports = function (airportData) {
    ctx.airportInitialData = airportData;
    // console.log(ctx.airportInitialData);
    ctx.availableairports = []
    var numairport = 2220;
    for (var j = 0; j < ctx.airportInitialData.length; j++) {
        // small_airport, medium_airport
        if (ctx.airportInitialData[j].type === "large_airport" ||
            ctx.airportInitialData[j].type === "medium_airport") {
            let tmp = {}
            // console.log("Inner loop");
            // console.log(ctx.airportInitialData[j].latitude_deg);
            // console.log(ctx.airportInitialData[j].longitude_deg);
            tmp['id'] = ctx.airportInitialData[j].ident;
            tmp['original_country'] = ctx.airportInitialData[j].iso_country;
            tmp['lon'] = ctx.airportInitialData[j].longitude_deg;
            tmp['lat'] = ctx.airportInitialData[j].latitude_deg;
            tmp['bearing'] = 0;
            if (numairport-- > 0) {
                ctx.availableairports.push(tmp);
            }
        }
    }
    // console.log(ctx.availableairports);
    if (ctx.airports_bool) {
        updateAirports();
    }

}

var loadAirPlanes = function (newSVG) {
    if (ctx.planes_bool) {
        d3.json(`https://opensky-network.org/api/states/all`).then(function (data) {
            // console.log(data)
            var total_flights = data["states"].length
            //Clear currentFlights
            var num = Math.floor((ctx.available_planes_percentage * total_flights)/100);
            ctx.liveFlights = []
            for (element in data["states"]){
                var tmp = {}
                if (data["states"][element][5] != 0 && data["states"][element][6] != 0){
                    tmp['id'] = data["states"][element][0]
                    tmp['callsign'] = data["states"][element][1]
                    tmp['original_country'] = data["states"][element][2]
                    tmp['lon'] = data["states"][element][5]
                    tmp['lat'] = data["states"][element][6]
                    if (tmp['lon'] === null && tmp['lat'] === null) {
                        continue;
                    }
                    tmp['onground'] = data["states"][element][8]
                    tmp['bearing'] = data["states"][element][10]
                    tmp['alt'] = data["states"][element][13]
                    // TODO: Check if this attribute is correct ?
                    tmp['Symbol(vega_id)'] = data["states"][element][16]

                    if (num-- > 0) {
                        ctx.liveFlights.push(tmp);
                    }

                }
            }
            updatePlanes();
            // // active for moving planes
            // setInterval(function(){
            //     loadAirPlanes();
            //     console.log("Ran")
            // }, 10000);
        })
    }
}
var updateAirports = function () {
    var airportSelection = d3.select("g#airports")
        .selectAll("image")
        .data(ctx.availableairports, function(d){
            return d['id']
        }).attr("opacity", 1);

    airportSelection.enter()
        .append("image")
        .attr("transform", (d) => (getPlaneTransform(d)))
        .attr("width", 4)
        .attr("xlink:href", "resources/img/white_dot.png")
}

var updatePlanes = function () {
    // console.log(ctx.currentFlights)

    var planSelection = d3.select("g#planes")
        .selectAll("image")
        .data(ctx.liveFlights, function(d){
            return d['id']
        }).attr("opacity", 1);


    // Define the div for the tooltip
    var decription_div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0.001);

    planSelection.enter()
        .append("image")
        .attr("transform", (d) => (getPlaneTransform(d)))
        .attr("width", 12)
        .attr("text", (d) => (ctx.current_alt = d.alt))
        .attr("xlink:href", "/resources/img/plane_orange.png")
        //Our new hover effects
        .on('mouseover', function (d) {
            d3.select(this).transition()
                .duration('500')
                .attr('width', '16');
            decription_div.transition()
                .duration(100)
                .style("opacity", 0.6)
                // .style("width", '79%')
                // .attr("width", ctx.w)
                .attr("text", ctx.current_alt)
                .text("Altitude: " + d.fromElement.__data__.alt + ", Country: "
                    + d.fromElement.__data__.original_country + ", ID: " + d.fromElement.__data__.id
                    + ", lat: " + d.fromElement.__data__.lat  + ", lon: " + d.fromElement.__data__.lon);
        })
        .on('mouseout', function (d, i) {
            d3.select(this).transition()
                    .duration('500')
                    .attr('width', '12');

            decription_div.transition()
                .duration(100)
                .style("opacity", 0);
        })
        .on("click", function (d) {
            d3.select(this).transition()
                .duration('500')
                .attr("xlink:href", "/resources/img/blue_plane.png");
              // console.log(d.path[0].__data__['id'])
                loadFlightsByAirCrafts(d.path[0].__data__['id'], getLastWeekTime(), getYesterdayTime())
        });
    // TODO: Is not functional at the moment --> Track by flight
        // .on("click", function (d) {
        //     d3.select(this).transition()
        //         .duration('500')
        //         .attr("xlink:href", "/resources/img/blue_plane.png");
        //     // console.log(d.path[0].__data__['id'])
        //     loadTrackByAirCrafts(d.path[0].__data__['id'], getYesterdayTime())
        // });

    planSelection.transition()
        .duration(ctx.TRANSITION_DURATION)
        .attr("transform", (d) => (getPlaneTransform(d)));

    planSelection.exit().remove()
}

var getCurrentTime = function (t) {
    var ts = Math.round((new Date()).getTime() / 1000);
    return ts - (1 * 1);
}
var getYesterdayTime = function (t) {
    var ts = Math.round((new Date()).getTime() / 1000);
    return ts - (3600 * 2);
}
var getLastWeekTime = function (t) {
    var ts = Math.round((new Date()).getTime() / 1000);
    return ts - (604800  * 1);
}

var getPlaneTransform = function(d) {
    // console.log(d.lon);
    // console.log(d.lat);
    // console.log(d.bearing);
    var xy = PROJECTIONS.ER([d.lon, d.lat]);
    var sc = 4*ctx.scale;
    var x = xy[0] - sc;
    var y = xy[1] - sc;
    if (d.bearing != null && d.bearing != 0){
        var t = `translate(${x},${y}) rotate(${d.bearing} ${sc} ${sc})`;
        return (ctx.scale == 1) ? t : t + ` scale(${ctx.scale})`;
    }
    else {
        var t = `translate(${x},${y})`;
        return (ctx.scale == 1) ? t : t + ` scale(${ctx.scale})`;
    }
};

var getToolTipTransform = function(coord) {
    var xy = PROJECTIONS.ER([coord[0], coord[1]]);
    var sc = 4*ctx.scale;
    var x = xy[0] - sc;
    var y = xy[1] - sc;
    var t = `translate(${x},${y})`;
    return (ctx.scale == 1) ? t : t + ` scale(${ctx.scale})`;
};

var loadRoutes = function () {
    console.log("will be added soon");
}
var setSampleSize = function(sample){
    // console.log(sample)
    ctx.available_planes_percentage = sample;
    loadAirPlanes();
};

var handleKeyEventPlanes = function () {
    ctx.planes_bool = true;
    console.log(ctx.planes_bool);
    var airportsSelection = d3.select("g#airports");
    airportsSelection.style("visibility", "hidden");
    var planSelection = d3.select("g#planes");
    planSelection.style("visibility", "visible");

}
var handleKeyEventAirports = function () {
    ctx.airports_bool = true;
    console.log(ctx.airports_bool);
    var planSelection = d3.select("g#planes");
    planSelection.style("visibility", "hidden");
    var airportsSelection = d3.select("g#airports");
    airportsSelection.style("visibility", "visible");
    loadAirports(ctx.airportInitialData);
}
var handleKeyEventRoutes = function () {
    ctx.routes_bool = true;
    console.log(ctx.routes_bool);
    loadRoutes();
}

var updateAircraftTrajectory = function (aircraftTrajectoryDict) {

    // console.log(aircraftTrajectoryDict)
    var planSelection = d3.select("g#pathPoints")
        .selectAll("image")
        .data(aircraftTrajectoryDict, function(d) {
            // console.log(d);
            return d;
        }).attr("opacity", 1);

    console.log("passed");
    planSelection.enter()
        .append("image")
        .attr("transform", (d) => (getPlaneTransform(d)))
        .attr("width", 2)
        .attr("xlink:href", "/resources/img/white_dot.png");

    planSelection.exit().remove()
}

var loadTrackByAirCrafts = function (aircrafticao24, time) {

    if (ctx.planes_bool) {
        // ctx.planes_bool = false;
        console.log(aircrafticao24 + " ||| " + time)
        d3.json(`https://opensky-network.org/api/tracks/all?icao24=${aircrafticao24}&time=${time}`).then(function (data) {
            // console.log(data)

            var currentAircraft = {};
            currentAircraft['id'] = data['icao24'];
            currentAircraft['startTime'] = data['startTime'];
            currentAircraft['endTime'] = data['endTime'];
            currentAircraft['calllsign'] = data['calllsign'];

           ctx.path = []
            for (element in data['path']) {
                // console.log(element);
                var point = {};
                point['pointId'] = element;
                point['time'] = data['path'][element][0];
                point['lat'] = data['path'][element][1];
                point['lon'] = data['path'][element][2];
                point['bearing'] = data['path'][element][3];
                point['true_track'] = data['path'][element][4];
                point['on_ground'] = data['path'][element][5];
                ctx.path.push(point)
            }

            // currentAircraft['path'] = ctx.path;
            // console.log(ctx.path)
            updateAircraftTrajectory(ctx.path);
        }).catch(function(error){console.log(error)});
    }
}

var loadFlightsByAirCrafts = function (aircrafticao24, begin_time, end_time) {



    // console.log(aircrafticao24 + " ||| " + time)
    d3.json(`https://opensky-network.org/api/flights/aircraft?icao24=${aircrafticao24}&begin=${begin_time}&end=${end_time}`).then(function (data) {
        // console.log(data)

        airports_list = [];
        for (element in data) {
            // console.log("inside_loop")
            for (airport in ctx.availableairports) {
                // console.log("inside_looper")
                // console.log(ctx.availableairports[airport]['id'])
                if (data[element]['estDepartureAirport'] === ctx.availableairports[airport]['id']) {
                    // console.log(ctx.availableairports[airport]);
                    airports_list.push(ctx.availableairports[airport])
                }
                else if (data[element]['estArrivalAirport'] === ctx.availableairports[airport]['id']) {
                    // console.log(ctx.availableairports[airport]);
                    airports_list.push(ctx.availableairports[airport])
                }
                else {
                    // console.log("not found")
                }
            }
        }

        console.log(airports_list);
        if (airports_list.length > 0) {
            ctx.availableairports = airports_list;
            ctx.airports_bool = true;
            var planSelection = d3.select("g#planes");
            planSelection.style("visibility", "hidden");
            ctx.planes_bool = false;
            updateAirports();
            var airportsSelection = d3.select("g#airports");
            airportsSelection.style("visibility", "visible");
            console.log(ctx.availableairports)
        }
    }).catch(function(error){console.log(error)});
}

var drawCirclesPath = function () {
    var path = d3.geoPath().projection(PROJECTIONS.ER)
    var link = {type: "LineString", coordinates: [[100, 60], [-60, -30]]} // Change these data to see ho the great circle reacts
    ctx.svg.append("path")
        .attr("d", path(link))
        .style("fill", "none")
        .style("stroke", "#cb1717")
        .style("stroke-width", 3)
}
// var updateCountries = function (newSvg) {
//
//     // # masalan vaghti mouse ro mibari ro country tooltip neshoon bede (# available planes and these stuffo neshoon bede)
//     var countrySelection = d3.select("g#countries")
//         .selectAll("image");
//     countrySelection.on('mouseover', function (d) {
//         d3.select(this).transition()
//             .duration('500')
//             .attr('width', '16');
//         decription_div.transition()
//             .duration(100)
//             .style("opacity", 0.6)
//             // .style("width", '79%')
//             // .attr("width", ctx.w)
//             .attr("text", ctx.current_alt)
//             .text("Altitude: " + d.fromElement.__data__.alt + ", Country: " + d.fromElement.__data__.original_country);
//     })
//         .on('mouseout', function (d, i) {
//             d3.select(this).transition()
//                 .duration('500')
//                 .attr('width', '12');
//
//             decription_div.transition()
//                 .duration(100)
//                 .style("opacity", 0);
//         });
// }