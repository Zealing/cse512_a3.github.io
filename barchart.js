
// ========= d3 specification of bar chart
var stack = d3.layout.stack();
var margin = {top: 20, right: 160, bottom: 30, left: 40},
    width = 1200 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], 0.1);

var y = d3.scale.linear()
    .range([height, 0]);

var color = d3.scale.category20();

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var rotate = function(arr){
  var temp = arr.shift();
  arr.push(temp);
};

// ======== data transformation process
var rawData;

var binRange = 5;

var groupFinal = [];

var optionList = [];

var categories;

var isNormalize = false;

// helper func to process data
function processData(data, colorType, categoryType) {
  // first empty groupfinal
  groupFinal = [];

  var temGroup = {};

  for (var i = 0; i < data.length; i++) {
      var colorTypeValue = rawData[i][colorType];
      var categoryTypeValue = rawData[i][categoryType];

      var colorTypeObj = temGroup[colorTypeValue];
      if (colorTypeObj !== undefined) {
        // if this color type obj has this category value, increment it, else create a new one
        if (colorTypeObj.hasOwnProperty(categoryTypeValue)) {
          colorTypeObj[categoryTypeValue] = colorTypeObj[categoryTypeValue] + 1;
        } else {
          colorTypeObj[categoryTypeValue] = 1;
        }
      } else {
        // if no such color type obj, create a new one and add this category value into it as a nested obj
        temGroup[colorTypeValue] = {};
        temGroup[colorTypeValue][categoryTypeValue] = 1;
      }
  }

  // then transfer tem group into [{}, {}, ..] format
  for (var colorTypeKey in temGroup) {
    if (temGroup.hasOwnProperty(colorTypeKey)) {
      
      var temColorGroup = temGroup[colorTypeKey];
      for (var categoryTypeKey in temColorGroup) {
        if (temColorGroup.hasOwnProperty(categoryTypeKey)) {

          var temCategory = {};
          temCategory[categoryType] = categoryTypeKey;
          temCategory[colorTypeKey] = temGroup[colorTypeKey][categoryTypeKey];
          console.log(colorTypeKey);
          // then, check each obj in groupFinal if there exists same category type value
          var i = null;
          for (i = 0; i < groupFinal.length; i++) {
            var curCategoryTypeValue = groupFinal[i][categoryType];
            if (curCategoryTypeValue === categoryTypeKey) {
              groupFinal[i][colorTypeKey] = temGroup[colorTypeKey][categoryTypeKey];
              break;
            }
          }

          // finally, push this obj into final array if not exist, else do nothing
          if (i === groupFinal.length) {
            groupFinal.push(temCategory);
          }
        }
      }
    }
  }

  // take care of corner case
  for (var colorTypeKey in temGroup) {
    if (temGroup.hasOwnProperty(colorTypeKey)) {
      for (var i = 0; i < groupFinal.length; i++) {
        // if cannot find its own type in final group, put itself into it and set to 0
        if (groupFinal[i][colorTypeKey] === undefined) {
          groupFinal[i][colorTypeKey] = 0;
        }
      }
    }
  }

  color.domain(d3.keys(groupFinal[0]).filter(function(key) { return key != categoryType; }));
  categories = d3.keys(groupFinal[0]).filter(function(key) { return key != categoryType; });
}

function normalize(categories) {
  isNormalize = true;
  yAxis = d3.svg.axis()
  .scale(y)
  .orient("left")
  .tickFormat(d3.format(".0%"));

  var xType = d3.select(".x").property("value");
  var colorType = d3.select(".color").property("value");

  // ========= then update all d3 componenets 

  // map each age group's sex to separate array and maintain a total key-value pair
  groupFinal.forEach(function(d) {
    var y0 = 0;
    d.colorTypes = null;
    d.colorTypes = categories.map(function(type) { return {colorType: type, y0: y0, y1: y0 += +d[type]}; });
    d.colorTypes.forEach(function(d) { d.y0 /= y0; d.y1 /= y0; });
  });

  // then sort the data
  groupFinal.sort(function(a, b) { return b.colorTypes[0].y1 - a.colorTypes[0].y1; });

  x.domain(groupFinal.map(function(d) { return d[xType]; }));
  y.domain([0, 1]);

  svg.select(".x.axis")
      .transition()
      .duration(500)
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.select(".y.axis")
      .transition()
      .duration(500)
      .call(yAxis);

  svg.select(".y-label")
      .text("Percentage");

 var edus = svg.selectAll(".g")
      .data(groupFinal)

      .attr("class", "g")
      .attr("transform", function(d) { return "translate(" + (x(d[xType]) + 10) + ",0)"; });

  edus.selectAll("rect")
      .data(function(d) { return d.colorTypes; })
      .transition()
        .each(function () {
          d3.select(this).on("click", function(d) {
            var gene_index = categories.indexOf(d.colorType);
            moveStuff(gene_index);
          });
        })
      .delay(function(d, i) { return i * 25; })
      .duration(400)
      .attr("class", "bar")
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.y1); })
      .attr("height", function(d) { return y(d.y0) - y(d.y1); })
      .attr("fill", function(d) { return color(d.colorType); });

  svg.selectAll(".legend").remove();

  var legend = svg.selectAll(".legend")
      .data(color.domain().slice().reverse())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width + margin.right - 20 )
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  legend.append("text")
      .attr("x", width + margin.right - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });

}

var moveStuff = function(gene_index){
  var categories_shift = categories;
  for (var i=0; i<gene_index; i++){
      rotate(categories_shift);
  }

  normalize(categories_shift);
};

function populate(colorType, xType) {
  isNormalize = false;

  groupFinal.forEach(function(d) {
    var y0 = 0;
    d.colorTypes = color.domain().map(function(type) { return {colorType: type, y0: y0, y1: y0 += +d[type]}; });
    d.total = d.colorTypes[d.colorTypes.length - 1].y1;
  });

  // then sort the data
  groupFinal.sort(function(a, b) { return b.total - a.total; });

  // =========== then update data into diagram
  x.domain(groupFinal.map(function(d) { return d[xType]; }));
  y.domain([0, d3.max(groupFinal, function(d) { return d.total; })]);

  svg.select(".x.axis")
      .transition()
      .duration(500)
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.select(".y.axis")
      .transition()
      .duration(500)
      .call(yAxis);

  svg.select(".y-label")
      .text("Num of Records");

  var edus = svg.selectAll(".g")
      .data(groupFinal);

  edus.enter()
      .append("g")
      .attr("class", "g")
      .attr("transform", function(d) { return "translate(" + width + ",0)"; });

  edus.transition()
      .duration(500)
      .attr("transform", function(d) { return "translate(" + (x(d[xType]) + 10) + ",0)"; });

  var rect = edus.selectAll("rect")
      .data(function(d) { return d.colorTypes; });

  rect.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return height; })
      .attr("height", 0 )
      .attr("fill", function(d) { return color(d.colorType); })
        .on("mouseover", function(d) {
          //Get this bar's x/y values, then augment for the tooltip
          var xPosition = parseFloat(d3.select(this).attr("x")) + x.rangeBand() / 2;
          var yPosition = parseFloat(d3.select(this).attr("y")) / 2 + height / 2;

          //Update the tooltip position and value
          d3.select("#tooltip")
            .style("left", xPosition + "px")
            .style("top", yPosition + "px")    
            .select("#colorType")
            .text(d.colorType);

          d3.select("#value")
            .text(isNormalize? "Percentage: " + ((d.y1-d.y0)*100).toFixed(2) + "%" : "Num of Records: " + (d.y1 - d.y0) );

          //Show the tooltip
          d3.select("#tooltip").classed("hidden", false);
        })
        .on("mouseout", function() {
          //Hide the tooltip
          d3.select("#tooltip").classed("hidden", true);
        });

  rect.transition()
      .delay(function(d, i) { return i * 50; })
      .duration(350)
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.y1); })
      .attr("height", function(d) { return y(d.y0) - y(d.y1); })
      .attr("fill", function(d) { return color(d.colorType); });

  rect.exit()
      .transition()
      .duration(500)
      .attr("y", function(d) { return height; })
      .attr("height", 0 )
      .remove();

  edus.exit()
      .transition()
      .duration(500)
      .attr("transform", function(d) { return "translate(" + (width + margin.right) + ",0)"; })
      .remove();

  // also change legend
  svg.selectAll(".legend").remove();

  var legend = svg.selectAll(".legend")
      .data(color.domain().slice().reverse())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width + margin.right - 20)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  legend.append("text")
      .attr("x", width + margin.right - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });

}

d3.csv("adult_23.csv", function(error, data) {
  if (error) throw error;
  isNormalize = false;

  // above all, load category name into a separate array to populate select option menu in html
  var sampleCategory = data[0];
  for (var categoryKey in sampleCategory) {
    if (sampleCategory.hasOwnProperty(categoryKey)) {
      if (categoryKey != "value") {
        optionList.push(categoryKey);
      }
    }
  }

  var select = d3.selectAll("#menu")
    .selectAll("option")
    .data(optionList)
    .enter()
      .append("option")
      .attr("value", function (d) { return d; })
      .text(function (d) { return d; });

  // first, change each age occurence into ageGroup bin 
  // then change each hrs_per_week into bin value (range is 10)
  for (var i = 0; i < data.length; i++) {
    var ageValueBin = Math.floor(data[i].age / 10) * 10;
    // check which bin the data falls into
    if (Math.abs(ageValueBin - data[i].age) >= binRange) {
      ageValueBin = ageValueBin + binRange;
    }
    data[i].age = ageValueBin;

    var hrsValueBin = Math.floor(data[i].hrs_per_week / 10) * 10;
    data[i].hrs_per_week = hrsValueBin;
  }

  // separate dataset as a global variable
  rawData = data;

  // ======== then process data to specified format
  var categoryType = "age";
  var colorType = "education";
  processData(rawData, colorType, categoryType);

  // ========= then visualize age group into a bar chart
  // color.domain(d3.keys(groupFinal[0]).filter(function(key) { return key != categoryType; }));

  // map each age group's sex to separate array and maintain a total key-value pair
  groupFinal.forEach(function(d) {
    var y0 = 0;
    d.colorTypes = color.domain().map(function(type) { return {colorType: type, y0: y0, y1: y0 += +d[type]}; });
    d.total = d.colorTypes[d.colorTypes.length - 1].y1;
  });

  // then sort the data
  groupFinal.sort(function(a, b) { return b.total - a.total; });

  x.domain(groupFinal.map(function(d) { return d[categoryType]; }));
  y.domain([0, d3.max(groupFinal, function(d) { return d.total; })]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Num of Records");

   var ages = svg.selectAll(".g")
        .data(groupFinal)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", function(d) { return "translate(" + (x(d[categoryType]) + 10) + ",0)"; });

    ages.selectAll("rect")
        .data(function(d) { return d.colorTypes; })
        .enter().append("rect")
        .attr("class", "bar")
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(d.y1); })
        .attr("height", function(d) { return y(d.y0) - y(d.y1); })
        .attr("fill", function(d) { return color(d.colorType); })
        .on("mouseover", function(d) {
          //Get this bar's x/y values, then augment for the tooltip
          var xPosition = parseFloat(d3.select(this).attr("x")) + x.rangeBand() / 2;
          var yPosition = parseFloat(d3.select(this).attr("y")) / 2 + height / 2;

          //Update the tooltip position and value
          d3.select("#tooltip")
            .style("left", xPosition + "px")
            .style("top", yPosition + "px")    
            .select("#colorType")
            .text(d.colorType);

          d3.select("#value")
            .text(isNormalize? "Percentage: " + ((d.y1-d.y0)*100).toFixed(2) + "%" : "Num of Records: " + (d.y1 - d.y0) );

          //Show the tooltip
          d3.select("#tooltip").classed("hidden", false);
        })
        .on("mouseout", function() {
          //Hide the tooltip
          d3.select("#tooltip").classed("hidden", true);
        });

    var legend = svg.selectAll(".legend")
        .data(color.domain().slice().reverse())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", width + margin.right - 20)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", width + margin.right - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });
});

// set on click listener to update diagram with different variables in select menus
// example: change age group to education level
d3.selectAll("#menu")
  .on("change", function(d) {

  var xType = d3.select(".x").property("value");
  var colorType = d3.select(".color").property("value");

  yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

  // then generate new group final dataset
  processData(rawData, colorType, xType);

  populate(colorType, xType);
});

d3.select("#normalize")
  .on("click", function() {
    normalize(categories);
  });

d3.select("#denormalize")
  .on("click", function() {
  var xType = d3.select(".x").property("value");
  var colorType = d3.select(".color").property("value");

  yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

  populate(colorType, xType);
});
