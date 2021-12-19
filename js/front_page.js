var ctx = {
    w: 810,
    h: 400,
    TRANSITION_DURATION: 1000,
    scale: 1,
    liveFlights: [],
    alreadyIn: [],
    planeUpdater: null,
    available_planes_percentage: 100,
    planes_bool: true,
    airports_bool: false,
    routes_bool: false,
    path_bool: false,
    num_available_planes: 0,
    num_available_airports: 0,
    using_archive: true,
    api_key: "a77503-66f68a",
    MIN_COUNT: 3000,
    ANIM_DURATION: 600, // ms
    NODE_SIZE_NL: 3,
    NODE_SIZE_MAP: 2,
    LINK_ALPHA: 0.2,
    nodes: [],
    links: [],
    final_airportlist: [],
    final_airlines: [],
    airplaneDataset: [],
    final_airplanes: [],
    planeRegisterNum: [],
    liveAirlines: [],
    final_timeSeries_airports: []
};

const PROJECTIONS = {
    ER: d3.geoEquirectangular().center([0,0]).scale(128).translate([ctx.w/2,ctx.h/2]),
};

const QUAD_ANGLE = Math.PI / 6.0;

// https://github.com/d3/d3-force
var simulation = d3.forceSimulation()
    .force("link", d3.forceLink()
        .id(function(d) { return d.id; })
        .distance(5).strength(0.08))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(ctx.w / 2, ctx.h / 2));

var createViz = function() {
    d3.select("#main").attr("width", ctx.w);
    d3.select("#main").attr("height", ctx.h);
    d3.select("#main").attr("fill", "#000");

    var newSVG = d3.select("#svg_div").append("svg");
    ctx.svg = newSVG;
    newSVG.attr("id", "live_map");
    newSVG.attr("width", ctx.w);
    newSVG.attr("height", ctx.h);
    newSVG.attr("class", "live_map_svg")
    loadWidgets();
    loadGeo(newSVG);
};

var loadWidgets = function () {
    var horizentalWidgets_left = d3.select("#hor_widgets_left");
    horizentalWidgets_left.style("background", "#343949")
        .style("width", ctx.w / 6 + "px")
        .style("height", ctx.h + "px")
        .style("top", "0px")
        .style("left", "0px")
        .style("opacity", "60%");
    var horizentalWidgets_left_slider = d3.select("#label_class_asli")

    var horizentalWidgets_right_btns = d3.select("#hor_widgets_right_btn");
    horizentalWidgets_right_btns.style("background", "#343949")
        .style("width", ctx.w / 8 + "px")
        .style("height", ctx.h + "px")
        .style("top", "0px")
        .style("right", "0px")
        .style("opacity", "60%");
    loadNumbersPlacard();
}

var loadNumbersPlacard = function () {
    var number_flights = d3.select("#label_number_of_flights");
    number_flights.html("# Flights")

    var number_airports = d3.select("#label_number_of_airports");
    number_airports.html("# Airports")

    var number_airlines = d3.select("#label_number_of_airlines");
    number_airlines.html("# Airlines")


    var number_destinations = d3.select("#label_number_of_Destinations");
    number_destinations.html("# Destinations");

    var number_fleet_size = d3.select("#label_fleet_size_airline");
    number_fleet_size.html("# Fleet Size");

    var number_average_age = d3.select("#label_age_of_airline");
    number_average_age.html("# Average Age");
}

var vloadGroundDistribution = function (data) {
    var vlSpec2 = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.1.1..json",
        "description": "A barchart",
        "height": 332,
        "width": {"step": 40},
        "config": {
            "axis": {
                "labelFont": "Lucida Bright",
                "titleFont": "Lucida Bright",
                "labelColor": "#bdbdbd",
                "tickColor": "#bdbdbd",
                "titleColor": "#bdbdbd"
            },
            "legend": {
                "orient": "bottom",
                "diable": false,
                "titleColor": "#bdbdbd",
                "labelColor": "#bdbdbd"
            }
        },
        "data": {
            "values": data
        },
        "mark": "bar",
        "background": '#292d3a',
        "encoding": {
            "x": {
                "bin": {
                    "maxbins": 1
                },
                "axis": {
                "labels": false},
                "field": "onground",
                "type": "nominal",
                "title": "On Ground"},
            "color": {
                "field": "onground",
                "scale": {
                    "range": ["#9a9dab", "#454d64"]}
            },
            "y": {
                "aggregate": "count",
                "field": "onground",
                "type": "quantitative",
                "title": "Count of Airplanes"
            }
        }
    }
    vegaEmbed("#inTheAir", vlSpec2);
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
        loadAirportDataset();
        loadAirlinesDataset();
        loadAirplaneDataset();
        handleKeyEventSearchAirportTraffic();
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


    d3.select("#svg_div").append("div")
        .attr("id", "div_tooltip")
        .attr("class", "tooltip")
        .style("opacity", 0.001);

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
    console.log("Scale = " + scale);
    ctx.scale = 1 / scale;
    if (ctx.scale != 1){
        d3.selectAll("image")
            .attr("transform", (d) => (getPlaneTransform(d)));
        d3.selectAll("#nodes circle")
            .transition()
            .duration(ctx.ANIM_DURATION)
            .attr("transform", (d) => `translate(${d.lonlat[0]} ${d.lonlat[1]})` + ` scale(${ctx.scale})`)
            // .attr("cx", (d) => (d.lonlat[0]))
            // .attr("cy", (d) => (d.lonlat[1]))
            .attr("r", function (d) {
                return nodescale(d.degree);
            })
        d3.select("#links line")
            // .attr("stroke-width", (d) => (ctx.wScale(d.value)*(ctx.scale)));

    }
}

var loadFlightData = function(data){
    var total_flights = data.length
    var num = Math.floor((ctx.available_planes_percentage * total_flights)/100);
    ctx.liveFlights = [];
    for (var i = 0; i < total_flights; i++) {
        var tmp = {}
        tmp['id'] = data[i]["flight"]['icaoNumber']
        tmp['icao24'] = data[i]['aircraft']['icao24']
        tmp['origin'] = data[i]['departure']['iataCode']
        tmp['destination'] = data[i]["arrival"]['iataCode']
        tmp['origin_icao'] = data[i]['departure']['icaoCode']
        tmp['destination_icao'] = data[i]["arrival"]['icaoCode']
        tmp['velocity'] = data[i]["speed"]['horizontal']
        tmp['airline_code'] = data[i]["airline"]['icaoCode']
        if (tmp['airline_code'] != null && tmp['airline_code'] !== "") {
            ctx.liveAirlines.push(data[i]["airline"]['icaoCode'])
        }
        tmp['longitude'] = data[i]["geography"]['longitude']
        tmp['latitude'] = data[i]["geography"]['latitude']
        if (tmp['longitude'] === null && tmp['latitude'] === null) {
            continue;
        }
        tmp['plane_regNumber'] = data[i]["aircraft"]['regNumber']
        onground_status = data[i]["speed"]['isGround']
        if (parseInt(onground_status) != 0) {tmp['onground'] = true;}
        else {tmp['onground'] = false;}
        tmp['bearing'] = data[i]["geography"]['direction']
        tmp['altitude'] = data[i]["geography"]['altitude']

        if (num-- > 0) {
            ctx.planeRegisterNum.push(tmp['plane_regNumber']);
            ctx.liveFlights.push(tmp);
        }

    }
    var flightNumber_label = d3.select("#number_of_flights_pl");
    flightNumber_label.html(ctx.liveFlights.length);
    plotSpeedAltitude();
};

var loadAirlinesDataset = function () {
    if (ctx.using_archive) {
        d3.json('resources/data/airlineDatabase.json').then(function (data) {
            console.log("Airlines Dataset --> Offline");
            loadAirlinesData(data)
        });
    }
    else {
        d3.json(`https://aviation-edge.com/v2/public/airlineDatabase?key=${ctx.api_key}`).then(function (data) {
            console.log("Airlines Dataset --> Online");
            loadAirlinesData(data)
        });
    }
}

var loadScheduledDataset = function () {
    //http://aviation-edge.com/v2/public/flightsHistory?key=[API_KEY]&code=JFK&type=departure&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    var typeTraffic = document.getElementById("list_types_input").value;
    var airportIATA = document.getElementById("list_airports_input").value;
    var fromDate = document.getElementById("from_date_input").value;
    var toDate = document.getElementById("to_date_input").value;

    // console.log(`https://aviation-edge.com/v2/public/flightsHistory?key=${ctx.api_key}&code=${airportIATA}&type=departure&date_from=${fromDate}&date_to=${toDate}`);
    // console.log(`https://aviation-edge.com/v2/public/flightsHistory?key=${ctx.api_key}&code=${airportIATA}&type=arrival&date_from=${fromDate}&date_to=${toDate}`);

    if (ctx.using_archive) {
        var promises_offline;
        // console.log(typeTraffic)
        if (typeTraffic === "both") {
            promises_offline = [
                d3.json(`resources/data/flightsHistory_arrival.json`),
                d3.json(`resources/data/flightsHistory_arrival.json`)];
        }
        else if (typeTraffic === "arrival") {
            promises_offline = [d3.json(`resources/data/flightsHistory_arrival.json`)];
        } else if (typeTraffic === "departure") {
            promises_offline = [d3.json(`resources/data/flightsHistory_arrival.json`)];
        }

        Promise.all(promises_offline).then(function (data) {
            if (data.length == 2) {
                var twoWayFlights = data[0].concat(data[1]);
                loadScheduledData(twoWayFlights);
            } else {
                var oneWayflights = data;
                loadScheduledData(oneWayflights);
            }
        });
    } else {
        var promises_online;
        console.log("Fetching Data Online, it may takes some time...");
        console.log(typeTraffic);
        if (typeTraffic === "both") {
            promises_online = [
                d3.json(`https://aviation-edge.com/v2/public/flightsHistory?key=${ctx.api_key}&code=${airportIATA}&type=departure&date_from=${fromDate}&date_to=${toDate}`),
                d3.json(`https://aviation-edge.com/v2/public/flightsHistory?key=${ctx.api_key}&code=${airportIATA}&type=arrival&date_from=${fromDate}&date_to=${toDate}`)];
        }
        else if (typeTraffic === "arrival") {
            promises_online = [d3.json(`https://aviation-edge.com/v2/public/flightsHistory?key=${ctx.api_key}&code=${airportIATA}&type=arrival&date_from=${fromDate}&date_to=${toDate}`)];
        } else if (typeTraffic === "departure") {
            promises_online = [d3.json(`https://aviation-edge.com/v2/public/flightsHistory?key=${ctx.api_key}&code=${airportIATA}&type=departure&date_from=${fromDate}&date_to=${toDate}`)];
        }

        Promise.all(promises_online).then(function (data) {
            if (data.length == 2) {
                var twoWayFlights = data[0].concat(data[1]);
                loadScheduledData(twoWayFlights);
            } else {
                var oneWayflights = data;
                loadScheduledData(oneWayflights);
            }
        });
    }

}

var loadScheduledData = function (data) {
    for (item in data) {
        tmp = {};
        tmp['dateTime'] = data[item][data[item]['type']]['actualTime'];
        if (tmp['dateTime'] == null) continue;
        let times = tmp['dateTime'].split('t');
        tmp['date'] = times[0];
        tmp['time'] = times[1];
        if (data[item]['departure']['delay'] != null) {
            tmp['delay'] = data[item]['departure']['delay'];
        } else {
            tmp['delay'] = 0;
        }
        tmp['status'] = data[item]['status'];
        tmp['flight_icao'] = data[item]['flight']['icaoNumber'];
        tmp['flight_iata'] = data[item]['flight']['iataNumber'];
        // console.log(tmp);
        ctx.final_timeSeries_airports.push(tmp);
    }
    plotAirportTrafficTimeSeries();
}

var plotAirportTrafficTimeSeries = function () {
    // console.log(ctx.final_timeSeries_airports);
    var vlSpec3 = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.1.1..json",
        "description": "A barchart",
        "data": {
            "values": ctx.final_timeSeries_airports
        },
        "config": {
            "axis": {
                "labelFont": "Lucida Bright",
                "titleFont": "Lucida Bright",
                "labelColor": "#bdbdbd",
                "tickColor": "#bdbdbd",
                "titleColor": "#bdbdbd",
                "labelFontSize": 12,
                "gridColor": "#474c62"
            },
            "legend": {
                "disable": true,
                "titleColor": "#bdbdbd",
                "labelColor": "#bdbdbd"
            }
        },
        "encoding": {
            "x": {
                "timeUnit": "date",
                "field": "date",
                "type": "temporal",
                "title": "Days"},
        },
        "background": '#292d3a',
        "layer": [
            {
                "mark": {"stroke": "#ff4b4b", "type": "line"},
                "encoding": {
                    "y": {
                        "aggregate": "count",
                        "field": "date",
                        "title": "Airport Traffic",
                        "axis": {
                            "titleColor":"#ff4b4b",
                            "grid": true,
                            "tickBand": "extent",
                            "gridColor": "rgba(255,75,75,0.20)"
                        }
                    }
                }
            },
            {
                "mark": {"type": "line", "color": "#1bd7d7"},
                "encoding": {
                    "y": {
                        "aggregate": "average",
                        "field": "delay",
                        "title": "Average Delay",
                        "axis": {
                            "titleColor":"#1bd7d7",
                            "grid": true,
                            "tickBand": "extent",
                            "gridColor": "rgba(27,215,215,0.20)"
                        }
                    }
                }
            }
        ],
        "resolve": {"scale": {"y": "independent"}}
    }
    var vlOpts3 = {width:700, height:300, actions: true};
    vegaEmbed("#time_series_plot_airports_traffic", vlSpec3, vlOpts3);
}

var loadAirlinesData = function (data) {
    var newAirlinesArray = data.filter(function (el)
        {
            return el['statusAirline'] === "active";
        }
    );
    newAirlinesArray = newAirlinesArray.filter(function (el)
        {
            return el['sizeAirline'] != 0;
        }
    );
    // console.log(newAirlinesArray);
    ctx.final_airlines = newAirlinesArray;
    var airlineNumber_label = d3.select("#number_of_airlines_pl");
    airlineNumber_label.html(newAirlinesArray.length);
    plotAirlineFleetSizeDatasets(newAirlinesArray);
    plotAirlineAgeDatasets(newAirlinesArray);
}

var plotAirlineFleetSizeDatasets = function (airlinesArray) {
    airlinesArray.sort(function(a,b) {
        return b.sizeAirline - a.sizeAirline
    });
    // console.log(airlinesArray);
    var additionAirline;
    for (item in airlinesArray) {
        if (airlinesArray[item]['codeIcaoAirline'] === document.getElementById("list_airlines_input").value) {
            additionAirline = airlinesArray[item];
        }
    }
    vlSpec2 = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "Bar Chart with a spacing-saving y-axis",
        "data": {
                "values": airlinesArray.slice(0, 11).concat(additionAirline)
        },
        "width": 300,
        "height": 342,
        "config": {
            "axis": {
                "labelFont": "Lucida Bright",
                "titleFont": "Lucida Bright",
                "labelColor": "#bdbdbd",
                "tickColor": "#bdbdbd",
                "titleColor": "#bdbdbd",
                "labelFontSize": 12,
            },
            "legend": {
                "disable": true,
                "titleColor": "#bdbdbd",
                "labelColor": "#bdbdbd"
            }
        },
        "mark": {"type": "bar", "yOffset": 5, "cornerRadiusEnd": 2, "height": {"band": 0.5}},
        "background": '#292d3a',
        "encoding": {
            "x": {
                "field": "sizeAirline",
                "type": "quantitative",
                "title": "Fleet Size",
                "axis": {
                    "bandPosition": 0,
                    "grid": true,
                    "gridColor": "#575757",
                    "domain": false,
                    "ticks": false,
                    "labelAlign": "left",
                    "labelBaseline": "middle",
                    "labelPadding": 7,
                    "labelOffset": -15,
                    "titleX": 100,
                    "titleY": 23,
                    "titleAngle": 0,
                    "titleAlign": "left"
                },
            },
            "y": {
                "field": "nameAirline",
                "title": "Airlines",
                "sort": "-x"
            },
            "color": {
                "field": "sizeAirline",
                "scale": {
                    "range": ["#9a9dab", "#9a9dab"]
                }
            }
        }
    }

    vegaEmbed("#airline_barchart", vlSpec2);
}

var plotAirlineAgeDatasets = function (airlinesArray) {
    airlinesArray.sort(function(a,b) {
        return b.sizeAirline - a.sizeAirline
    });
    var additionAirline;
    for (item in airlinesArray) {
        if (airlinesArray[item]['codeIcaoAirline'] === document.getElementById("list_airlines_input").value) {
            additionAirline = airlinesArray[item];
        }
    }
    vlSpec2 = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "Bar Chart with a spacing-saving y-axis",
        "data": {
            "values": airlinesArray.slice(0, 11).concat(additionAirline)
        },
        "width": 317,
        "height": 342,
        "config": {
            "axis": {
                "labelFont": "Lucida Bright",
                "titleFont": "Lucida Bright",
                "labelColor": "#bdbdbd",
                "tickColor": "#bdbdbd",
                "titleColor": "#bdbdbd",
                "labelFontSize": 12,
            },
            "legend": {
                "disable": true,
                "titleColor": "#bdbdbd",
                "labelColor": "#bdbdbd"
            }
        },
        "mark": {"type": "bar", "yOffset": 5, "cornerRadiusEnd": 2, "height": {"band": 0.5}},
        "background": '#292d3a',
        "encoding": {
            "x": {
                "field": "ageFleet",
                "type": "quantitative",
                "title": "Airline Fleet Age",
                "axis": {
                    "bandPosition": 0,
                    "grid": true,
                    "gridColor": "#575757",
                    "domain": false,
                    "ticks": false,
                    "labelAlign": "left",
                    "labelBaseline": "middle",
                    "labelPadding": 7,
                    "labelOffset": -15,
                    "titleX": 100,
                    "titleY": 23,
                    "titleAngle": 0,
                    "titleAlign": "left"
                },
            },
            "y": {
                "field": "nameAirline",
                "title": "Airlines",
                "sort": "-x"
            },
            "color": {
                "field": "ageFleet",
                "scale": {
                    "range": ["#9a9dab", "#9a9dab"]
                }
            }
        }
    }

    vegaEmbed("#airline_fleetAge_barchart", vlSpec2);
}

var plotSpeedAltitude = function () {
    console.log(ctx.liveFlights);
    var vlSpec3 = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.1.1..json",
        "description": "A barchart",
        "data": {
            "values": ctx.liveFlights
        },
        "width": 300,
        "height": 360,
        "config": {
            "axis": {
                "labelFont": "Lucida Bright",
                "titleFont": "Lucida Bright",
                "labelColor": "#bdbdbd",
                "tickColor": "#bdbdbd",
                "titleColor": "#bdbdbd",
                "labelFontSize": 12,
                "gridColor": "#474c62"
            },
            "legend": {
                "disable": false,
                "titleColor": "#bdbdbd",
                "labelColor": "#bdbdbd"
            }
        },
        "mark": {
            "type": "point",
            "color": "#bdbdbd",
            "filled": false
        },
        "background": '#292d3a',
        "encoding": {
            "x": {
                "field": "altitude",
                "type": "quantitative",
                "title": "Altitude",
                "scale": {
                    "domainMin": 0
                }
            },
            "y": {
                "field": "velocity",
                "type": "quantitative",
                "title": "Velocity"
            },
            "shape": {"field": "onground", "type": "nominal"},
            "color": {"field": "onground", "type": "nominal"}
        }
    }
    var vlOpts3 = {width:331, height:330, actions: true};
    vegaEmbed("#speedAltitudeScatterPlot", vlSpec3, vlOpts3);
}

var loadAirportDataset = function () {
    if (ctx.using_archive) {
        d3.json('resources/data/airportDatabase.json').then(function (data) {
            console.log("Airport Dataset --> Offline");
            loadAirportData(data)
        });
    }
    else {
        d3.json(`https://aviation-edge.com/v2/public/airportDatabase?key=${ctx.api_key}`).then(function (data) {
            console.log("Airport Dataset --> Online");
            loadAirportData(data)
        });
    }
}
var loadAirportData = function (data) {
    /*
    * Need to remove duplicates
    * */
    for (var j = 0; j < ctx.availableairports.length; j++) {
        for (var i = 0; i < data.length; i++) {
            if (data[i]['codeIataCity'] === ctx.availableairports[j]['iata_code']) {
                let tmp = {}
                tmp['iata_code'] = data[i]['codeIataAirport'];
                tmp['icao_code'] = data[i]['codeIcaoAirport'];
                tmp['name_airport'] = data[i]['nameAirport'];
                tmp['id'] = data[i]['airportId'];
                tmp['original_country'] = data[i]['nameCountry'];
                tmp['longitude'] = data[i]['longitudeAirport'];
                tmp['latitude'] = data[i]['latitudeAirport'];
                tmp['bearing'] = 0;
                ctx.final_airportlist.push(tmp);
            }
        }
    }
    // console.log("Final airport lists: " + ctx.final_airportlist.length);
    // console.log(ctx.final_airportlist);
    var airlineNumber_label = d3.select("#number_of_airports_pl");
    airlineNumber_label.html(ctx.final_airportlist.length);
    if (ctx.airports_bool) {
        updateAirports();
    }
}


var loadAirports = function (airportData) {
    /*
    * For loading the large_airports
    * */
    // console.log(airportData)
    ctx.airportInitialData = airportData;
    ctx.availableairports = []
    var numairport = 2220;
    for (var j = 0; j < ctx.airportInitialData.length; j++) {
        if (ctx.airportInitialData[j].type === "large_airport") {
            let tmp = {}
            tmp['iata_code'] = ctx.airportInitialData[j].iata_code
            tmp['id'] = ctx.airportInitialData[j].ident;
            tmp['original_country'] = ctx.airportInitialData[j].iso_country;
            tmp['longitude'] = ctx.airportInitialData[j].longitude_deg;
            tmp['latitude'] = ctx.airportInitialData[j].latitude_deg;
            tmp['bearing'] = 0;
            if (numairport-- > 0) {
                ctx.availableairports.push(tmp);
            }
        }
    }
    console.log("Large Airports length: " + ctx.availableairports.length)
    if (ctx.airports_bool) {
        updateAirports();
    }
}

var loadAirplaneDataset = function () {
    if (ctx.using_archive) {
        d3.json('resources/data/airplaneDatabase.json').then(function (data) {
            console.log("Airplane Dataset --> Offline");
            loadAirplaneData(data)
        });
    }
    else {
        d3.json(`https://aviation-edge.com/v2/public/airplaneDatabase?key=${ctx.api_key}`).then(function (data) {
            console.log("Airplane Dataset --> Online");
            loadAirplaneData(data)
        });
    }
}
var loadAirplaneData = function (data) {
    // console.log(data)
    //planeStatus, planeModel, planeAge, hexIcaoAirplane, codeIataAirline
    for (var j = 0; j < data.length; j++) {
        var tmp = {}
        if (data[j]['planeStatus'] === 'active') {
            tmp['planeAge'] = data[j]['planeAge'];
            tmp['enginesCount'] = data[j]['enginesCount'];
            tmp['airplaneId'] = data[j]['airplaneId'];
            tmp['productionLine'] = data[j]['productionLine'];
            tmp['numberRegistration'] = data[j]['numberRegistration'];
            tmp['planeModel'] = data[j]['planeModel'];
            tmp['codeIataAirline'] = data[j]['codeIataAirline'];
            tmp['hexIcaoAirplane'] = data[j]['hexIcaoAirplane'];
            for (var i = 0; i < ctx.planeRegisterNum.length; i++) {
                if (tmp['numberRegistration'] === ctx.planeRegisterNum[i]) {
                    ctx.airplaneDataset.push(tmp);
                }
            }

        }
    }
    // plotAirplaneBarchart();
}

var plotAirplaneBarchart = function () {
    // console.log(ctx.airplaneDataset);
    var vlSpec2 = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.1.1..json",
        "description": "A barchart",
        "width": 300,
        "height": 350,
        "config": {
            "axis": {
                "labelFont": "Lucida Bright",
                "titleFont": "Lucida Bright",
                "labelColor": "#bdbdbd",
                "tickColor": "#bdbdbd",
                "titleColor": "#bdbdbd",
                "labelFontSize": 18,
            },
            "legend": {
                "disable": true,
                "titleColor": "#bdbdbd",
                "labelColor": "#bdbdbd"
            }
        },
        "data": {
            "values": ctx.airplaneDataset
        },
        "transform": [
            {
                "aggregate": [{
                    "op": "count",
                    "field": "productionLine",
                    "as": "AirlineModel",
                }],
                "groupby": ["productionLine"]
            }
        ],
        "mark": "bar",
        "background": '#292d3a',
        "encoding": {
            "y": {
                "field": "AirlineModel",
                "type": "quantitative",
                "title": "Count of Airplanes"
            },
            "x": {
                "field": "productionLine",
                "type": "nominal",
                "title": "Airplane Model"},
            "color": {
                "field": "productionLine",
                "scale": {
                    "range": ["#9a9dab", "#9a9dab"]}
            }
        }
    }
    vegaEmbed("#airplaneModel_barchart", vlSpec2);
}

var loadAirPlanes = function (newSVG) {
    if (ctx.planes_bool) {
        if (ctx.using_archive) {
            d3.json(`resources/live_data/flights.json`).then(function (data) {
                console.log("Airplanes Loading --> Offline");
                // console.log(data);
                loadFlightData(data);
                vloadGroundDistribution(ctx.liveFlights);
                updatePlanes();
            });
        }
        else {
            d3.json(`http://aviation-edge.com/v2/public/flights?key=${ctx.api_key}&limit=30000`).then(function (data) {
                console.log("Airplanes Loading --> Online");
                // console.log(data);
                loadFlightData(data);
                vloadGroundDistribution(ctx.liveFlights);
                updatePlanes();
                // // active for moving planes
                // setInterval(function(){
                //     loadAirPlanes(newSVG);
                //     console.log("Ran")
                // }, 10000);
            });
        }
    }
    var flightNumber_label = d3.select("#number_of_flights_pl");
    flightNumber_label.html(ctx.liveFlights.length);
}

var updateAirports = function () {
    // console.log(ctx.final_airportlist)
    var airportSelection = d3.select("g#airports")
        .selectAll("image")
        .data(ctx.final_airportlist, function(d){
            return d['id']
        }).attr("opacity", 1);

    airportSelection.enter()
        .append("image")
        .attr("transform", (d) => (getPlaneTransform(d)))
        .attr("width", 2)
        .attr("xlink:href", "resources/img/white_dot.png")
}

var loadRoutes = function (airlineICAO) {
    // http://aviation-edge.com/v2/public/routes?key=[API_KEY]&airlineIcao=BMS
    console.log("LoadRoutes was called...");

    var airline_routes_JSON = d3.json(`http://aviation-edge.com/v2/public/routes?key=${ctx.api_key}&airlineIcao=${airlineICAO}`);
    var cities_JSON = d3.json(`resources/data/airportDatabase.json`);
    var data4fetch = [cities_JSON, airline_routes_JSON];
    Promise.all(data4fetch).then(function(d) {
        restructureData(d[0], d[1]);
        createGraphLayout();
    });
    loadAirlinesDataset();
}

var restructureData = function(airports, routes){
    var connected = {};

    routes.forEach(
        function(d){
            // console.log(d)
            if (d.departureIata != null && d.arrivalIata != null) {
                if (isNaN(d.departureIata.charAt(0)) && isNaN(d.arrivalIata.charAt(0))) {
                    var timeStart = 0;
                    var timeEnd = 0;
                    //create date format
                    if (d.departureTime != null && d.arrivalTime != null) {
                        timeStart = parseInt(d.departureTime.split(':')[0]);
                        timeEnd = parseInt(d.arrivalTime.split(':')[0]);
                    }

                    var hourDiff = timeEnd - timeStart;
                    if (hourDiff < 0) {
                        hourDiff = 24 - Math.abs(hourDiff)
                    }
                    ctx.links.push({source: d.departureIata, target: d.arrivalIata, value: hourDiff});
                    connected[d.departureIata] = 1;
                    connected[d.arrivalIata] = 1;
                }
            }
        }
    );
    ctx.wScale = d3.scaleLinear().domain([d3.min(ctx.links, function(d){return d.value*ctx.scale;}),
        d3.max(ctx.links, function(d){return d.value*ctx.scale;})])
        .range([0.1, 10]);
    // console.log(connected);
    airports.forEach(
        function(d) {
            // console.log(d);
            //isNaN(d.iata.charAt(0)) && d.iata in connected
            if (d.codeIataAirport != null) {
                if (isNaN(d.codeIataAirport.charAt(0)) && d.codeIataAirport in connected) {
                    var coords = PROJECTIONS.ER([d.longitudeAirport, d.latitudeAirport]);
                    if (!coords) {
                        // handle specific case of San Juan (SJU),
                        // which is out of bounds for the Albers projection
                        coords = [ctx.w, ctx.h];
                    }
                    // console.log("Node was added...")
                    ctx.nodes.push({
                        id: d.codeIataAirport,
                        city_id: d.codeIataCity,
                        airport_name: d.nameAirport,
                        country_code: d.codeIso2Country,
                        country_name: d.nameCountry,
                        lonlat: coords
                    });
                }
            } else {
                // console.log("INjo");
                // console.log(d);
            }
        });
};

var createGraphLayout = function(){
    var svg = d3.select("#map")
    var color = d3.scaleOrdinal(d3.schemeAccent);
    var lines = svg.append("g")
        .attr("id", "links")
        .attr("opacity", ctx.LINK_ALPHA)
        .selectAll("line")  // simpler version uses <line>
        .data(ctx.links)
        .enter()
        .append("line")    // simpler version uses <line>
        .attr("stroke-width", (d) => (ctx.wScale(d.value)/5));

    var circles = svg.append("g")
        .attr("id", "nodes")
        .selectAll("circle")
        .data(ctx.nodes)
        .enter()
        .append("circle")
        .attr("r", ctx.NODE_SIZE_NL)
        .attr("fill", (d) => (color(d.group)));

    circles.append("title")
        .text(function(d) { return d.airport_name + " (" + d.id + ", " + d.country_name +")"; });

    circles.call(d3.drag().on("start", (event, d) => startDragging(event, d))
        .on("drag", (event, d) => dragging(event, d))
        .on("end", (event, d) => endDragging(event, d)));

    simulation.nodes(ctx.nodes)
        .on("tick", simStep);

    simulation.force("link")
        .links(ctx.links);

    function simStep(){
        // code run at each iteration of the simulation
        updateNLLinks();
        circles.attr("cx", (d) => (d.x))
            .attr("cy", (d) => (d.y));
    }
    // Add degree
    d3.selectAll('#nodes circle')
        .each(function(d) {
            d.degree = 0;
        });

    // Calculate degree
    ctx.links.forEach(function (d) {
        d.source.degree += 1;
        d.target.degree += 1;
    });

    // Accessor functions to get min & max
    var minDegree = d3.min((ctx.nodes), function (d) {
        return d.degree;
    })

    var maxDegree = d3.max((ctx.nodes), function (d) {
        return d.degree;
    })

    // Create node scale based on degree
    var nodescale = d3.scaleSqrt()
        .domain([minDegree, maxDegree])
        .range([1, 3]); // Change this to your desired range

    simulation.stop();

    d3.select("#links")
        .transition()
        .duration(ctx.ANIM_DURATION)
        .attr("opacity", 0)
        .on("end", function(d){updateGeoLinks();})
        .transition()
        .duration(ctx.ANIM_DURATION)
        .attr("opacity", ctx.LINK_ALPHA)
        .attr("stroke", "#fff");
    d3.selectAll("#nodes circle")
        .transition()
        .duration(ctx.ANIM_DURATION)
        .attr("transform", (d) => `translate(${d.lonlat[0]} ${d.lonlat[1]})`)
        .attr("fill", "#e05e26")
        // .attr("cx", (d) => (d.lonlat[0]))
        // .attr("cy", (d) => (d.lonlat[1]))
        .attr("r", function (d) {
            return nodescale(d.degree);
        })

    var number_of_Destinations = d3.select("#number_of_Destinations_pl");
    number_of_Destinations.html(ctx.nodes.length);

    var number_of_age_airline = d3.select("#number_of_age_of_airline");
    var number_of_fleet_size = d3.select("#number_fleet_size_airline");
    for (item in ctx.final_airlines) {
        if (ctx.final_airlines[item]['codeIcaoAirline'] === document.getElementById("list_airlines_input").value) {
            number_of_age_airline.html(ctx.final_airlines[item]['ageFleet']);
            number_of_fleet_size.html(ctx.final_airlines[item]['sizeAirline']);
            break;
        }
    }



};

var updateGeoLinks = function(){
    d3.selectAll("#links line")
         .attr("x1", (d) => (d.source.lonlat[0]))
         .attr("y1", (d) => (d.source.lonlat[1]))
         .attr("x2", (d) => (d.target.lonlat[0]))
         .attr("y2", (d) => (d.target.lonlat[1]));
};

var getCurve = function(x1, y1, x2, y2){
    var alpha = Math.atan2(y2-y1, x2-x1);
    var ds = Math.sqrt(Math.pow((x2-x1),2)+Math.pow((y2-y1),2)) / 2.0;
    var rho = ds / Math.cos(QUAD_ANGLE);
    var cpx = x1 + rho*Math.cos(alpha+QUAD_ANGLE);
    var cpy = y1 + rho*Math.sin(alpha+QUAD_ANGLE);
    return `M${x1},${y1}Q${cpx},${cpy} ${x2},${y2}`;
};

var updateNLLinks = function(){
    d3.selectAll("#links line")
      .attr("x1", (d) => (d.source.x))
      .attr("y1", (d) => (d.source.y))
      .attr("x2", (d) => (d.target.x))
      .attr("y2", (d) => (d.target.y));
};

var updatePlanes = function () {
    var planSelection = d3.select("g#planes")
        .selectAll("image")
        .data(ctx.liveFlights, function(d){
            return d['id']
        }).attr("opacity", 1);

    // Define the div for the tooltip
    var decription_div = d3.select("#div_tooltip");
    planSelection.enter()
        .append("image")
        .attr("transform", (d) => (getPlaneTransform(d)))
        .attr("width", 12)
        .attr("text", (d) => (ctx.current_alt = d.alt))
        .attr("xlink:href", "/resources/img/plane_orange.png")
        //Our new hover effects
        .on('mouseover', function (d) {
            // console.log(d)
            d3.select(this).transition()
                .duration('500')
                .attr('width', '16');
            decription_div.transition()
                .duration(100)
                .style("opacity", 0.6)
                // .style("width", '79%')
                // .attr("width", ctx.w)
                .attr("text", ctx.current_alt)
                .text("Registery Number: " + d.fromElement.__data__.plane_regNumber
                            + ", Departure: " + d.fromElement.__data__.origin
                                + ", Arrival: " + d.fromElement.__data__.destination
                                    + ", Altitude: " + d.fromElement.__data__.altitude
                                        + ", Velocity: " + d.fromElement.__data__.velocity);
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
                loadFlightsByAirCrafts(d.path[0].__data__['icao24'], getLastWeekTime(), getYesterdayTime(), d.path[0].__data__)
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
    var xy = PROJECTIONS.ER([d.longitude, d.latitude]);
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

var getAirportTransform = function(d) {
    // console.log(d);
    if (d != null) {
        var xy = PROJECTIONS.ER([d.lonlat[0], d.lonlat[1]]);
        console.log("XY: " + xy);
        var sc = 4 * ctx.scale;
        var x = xy[0] + sc;
        var y = xy[1] + sc;
        var t = `translate(${x} ${y})`;
        // console.log((ctx.scale == 1) ? t : t + ` scale(${ctx.scale})`)
        return (ctx.scale == 1) ? t : t + ` scale(${ctx.scale})`;
    }
    else {
        console.log(d)
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

var setSampleSize = function(sample){
    // console.log(sample)
    ctx.available_planes_percentage = sample;
    loadAirPlanes();
};

var handleKeyEventPlanes = function () {
    ctx.planes_bool = true;
    // console.log(ctx.planes_bool);
    var airportsSelection = d3.select("g#airports");
    airportsSelection.transition(10).style("visibility", "hidden");
    var routesNodeSelection = d3.selectAll("#nodes circle");
    routesNodeSelection.style("visibility", "hidden");
    var routesLinkSelection = d3.selectAll("#links");
    routesLinkSelection.style("visibility", "hidden");
    var planSelection = d3.select("g#planes");
    planSelection.style("visibility", "visible");

}
var handleKeyEventAirports = function () {
    ctx.airports_bool = true;
    // console.log(ctx.airports_bool);
    var planSelection = d3.select("g#planes");
    planSelection.style("visibility", "hidden");
    var routesNodeSelection = d3.selectAll("#nodes circle");
    routesNodeSelection.style("visibility", "hidden");
    var routesLinkSelection = d3.selectAll("#links");
    routesLinkSelection.style("visibility", "hidden");
    var airportsSelection = d3.select("g#airports");
    airportsSelection.style("visibility", "visible");
    loadAirports(ctx.airportInitialData);
}
var handleKeyEventRoutes = function () {

    ctx.routes_bool = true;
    // console.log(ctx.routes_bool);
    var airportsSelection = d3.select("g#airports");
    airportsSelection.style("visibility", "hidden");
    var planSelection = d3.select("g#planes");
    planSelection.style("visibility", "hidden");
    d3.selectAll("g#nodes").remove();
    d3.selectAll("#links").remove();
    ctx.nodes = [];
    ctx.links = [];
    loadRoutes(document.getElementById("list_airlines_input").value);
    var routesNodeSelection = d3.selectAll("g#nodes");
    routesNodeSelection.style("visibility", "visible");
    var routesLinkSelection = d3.selectAll("#links");
    routesLinkSelection.style("visibility", "visible");
    handleDropDownListEvent();
}

var handleDropDownListEvent = function () {

    var list_items = $("#airlines_list");

    for (item in ctx.final_airlines) {
        // console.log(item);
        list_items.append("<option value='" + ctx.final_airlines[item].codeIcaoAirline + "'" + " class='option_element'" + ">" + ctx.final_airlines[item].nameAirline + "</option>");
    }
}

var handleKeyEventAirportInput = function () {
    var list_items = $("#airports_list");
    for (item in ctx.final_airportlist) {
        // console.log(ctx.final_airportlist[item]);
        list_items.append("<option value='" + ctx.final_airportlist[item].iata_code + "'" + " class='option_element'" + ">" + ctx.final_airportlist[item].name_airport + "</option>");
    }
}

var handleKeyEventSearchAirportTraffic = function () {
    loadScheduledDataset();
}

var handleKeyEventOnline = function () {
    if (ctx.using_archive == false) ctx.using_archive = true;
    if (ctx.using_archive == true) ctx.using_archive = false;
}

var addOption = function () {

}

function startDragging(event, node){
    if (true){return;}
    if (!event.active){
        simulation.alphaTarget(0.3).restart();
    }
    node.fx = node.x;
    node.fy = node.y;
}

function dragging(event, node){
    if (true){return;}
    node.fx = event.x;
    node.fy = event.y;
}

function endDragging(event, node){
    if (true){return;}
    if (!event.active){
        simulation.alphaTarget(0);
    }
    node.fx = null;
    node.fy = null;
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

var loadFlightsByAirCrafts = function (aircrafticao24, begin_time, end_time, aircraftOtherInfo) {
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

        // console.log(airports_list);
        if (airports_list.length > 0) {
            ctx.final_airportlist = airports_list;
            ctx.airports_bool = true;
            var planSelection = d3.select("g#planes");
            planSelection.style("visibility", "hidden");
            ctx.planes_bool = false;
            updateAirports();
            var airportsSelection = d3.select("g#airports");
            airportsSelection.style("visibility", "visible");
            // console.log(ctx.final_airportlist)
        }

        var coords1;
        var coords2;
        console.log(aircraftOtherInfo)
        // console.log(ctx.final_airportlist)
        if (aircraftOtherInfo['destination_icao'] != null && aircraftOtherInfo['origin_icao'] != null) {
            for (airport in ctx.availableairports) {
                if (aircraftOtherInfo['origin_icao'] === ctx.availableairports[airport]['id']) {
                    // console.log("Coord1 is found...");
                    coords1 = [ctx.availableairports[airport]['longitude'], ctx.availableairports[airport]['latitude']];
                    // console.log(coords1);
                    continue;
                }
                if (aircraftOtherInfo['destination_icao'] === ctx.availableairports[airport]['id']) {
                    // console.log("Coord2 is found...");
                    coords2 = [ctx.availableairports[airport]['longitude'], ctx.availableairports[airport]['latitude']];
                    // console.log(coords2);

                }
            }
        }
        if (coords1 != null && coords2 != null) {
            drawCirclesPath(coords1, coords2);
        }

    }).catch(function(error){console.log(error)});
}

var drawCirclesPath = function (coord1, coord2) {
    var path = d3.geoPath().projection(PROJECTIONS.ER)
    var link = {type: "LineString", coordinates: [coord1, coord2]} // Change these data to see ho the great circle reacts
    ctx.svg.append("path")
        .attr("d", path(link))
        .style("fill", "none")
        .style("stroke", "#2e7bd9")
        .style("stroke-width", 3)
}

var loadTrackByAirCrafts = function (aircrafticao24, time) {

    // if (ctx.planes_bool) {
    //     // ctx.planes_bool = false;
    //     console.log(aircrafticao24 + " ||| " + time)
    //     d3.json(`https://opensky-network.org/api/tracks/all?icao24=${aircrafticao24}&time=${time}`).then(function (data) {
    //         // console.log(data)
    //
    //         var currentAircraft = {};
    //         currentAircraft['id'] = data['icao24'];
    //         currentAircraft['startTime'] = data['startTime'];
    //         currentAircraft['endTime'] = data['endTime'];
    //         currentAircraft['calllsign'] = data['calllsign'];
    //
    //        ctx.path = []
    //         for (element in data['path']) {
    //             // console.log(element);
    //             var point = {};
    //             point['pointId'] = element;
    //             point['time'] = data['path'][element][0];
    //             point['lat'] = data['path'][element][1];
    //             point['lon'] = data['path'][element][2];
    //             point['bearing'] = data['path'][element][3];
    //             point['true_track'] = data['path'][element][4];
    //             point['on_ground'] = data['path'][element][5];
    //             ctx.path.push(point)
    //         }
    //
    //         // currentAircraft['path'] = ctx.path;
    //         // console.log(ctx.path)
    //         updateAircraftTrajectory(ctx.path);
    //     }).catch(function(error){console.log(error)});
    // }
}




