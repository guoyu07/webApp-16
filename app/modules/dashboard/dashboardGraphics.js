'use strict';

angular.module('dashboardGraphics', [])

  .factory('mainChart', ['$window', 'fisheyeChart', 'FisheyeLines', 'Datestamp', 'Scorestamp', 'SmoothAverages', 'PathMethods' ,'TimeFormat', function($window, fisheyeChart, FisheyeLines, Datestamp, Scorestamp, SmoothAverages, PathMethods, TimeFormat){
    return {
      render: function(data, sizing, scope){

        //separate data
        var users = data[0];
        var scores = data[1];
        var averages = data[2];
        console.log(averages);

        //create smoothAverages array for line chart
        var smoothAverages = SmoothAverages(averages, scope.dateRange, scope);

        scope.snapshotDate = TimeFormat.format(smoothAverages[0].date);


        // Scales and axes. Note the inverted domain for the y-scale: bigger is up!
        var x = d3.time.scale().range([0, sizing.width]),
            y = d3.scale.linear().range([sizing.height, 0]),
            xAxis = d3.svg.axis().scale(x).ticks(4).tickFormat(d3.time.format("%d-%b-%y")),
            yAxis = d3.svg.axis().scale(y).ticks(6).orient("right");

        // A line generator
        var lineA = d3.svg.line()
            .interpolate("monotone")
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.x); });

        //B line generator
        var lineB = d3.svg.line()
            .interpolate("monotone")
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.y); });

        // Compute the minimum and maximum date, and the maximum a/b.
        x.domain([smoothAverages[0].date, smoothAverages[smoothAverages.length - 1].date]);
        y.domain([0, 100]).nice();

        //clear html of .board before updating new SVG
        var svg = d3.select('.board').html('').append('svg').attr("id", "board")
            .attr("width", sizing.width + sizing.margin.left + sizing.margin.right)
            .attr("height", sizing.height + sizing.margin.top + sizing.margin.bottom)
          .append("g")
            .attr("transform", "translate(" + sizing.margin.left + "," + sizing.margin.top + ")")
            .on("mousemove", function(){
              scope.mouse = d3.mouse(this);
              snapshotUpdate();
            })
            .on('click', function(){
              scope.showFisheye = !scope.showFisheye;
              updateDisplay();
            });

        //show or hide fisheye display
        var updateDisplay = function(){
          if(!scope.showFisheye){
            d3.selectAll('.fisheye, .fisheye-dot, .fisheye-line')
              .attr('display', 'none');
          }else{
            d3.selectAll('.fisheye, .fisheye-dot, .fisheye-line')
              .attr('display', 'static');
          }
        };
        updateDisplay();

        // Add the clip path.
        var clip = svg.append("clipPath")
            .attr("id", "clip")
          .append("rect")
            .attr("width", sizing.width)
            .attr("height", sizing.height);
            
        // Add 'background' for the fisheye scroll
        var background = svg.append('rect')
            .attr('width', sizing.width)
            .attr('height', sizing.height)
            .attr('fill', 'transparent');

        // Add the x, y axes.
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + sizing.height + ")")
            .call(xAxis);
        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + sizing.width + ",0)")
            .call(yAxis);

        //Add the 3 fisheye-box lines
        var fisheyeLines = d3.select('#board')
          .append("g")
            .attr('class', 'fisheye-lines');

        fisheyeLines.selectAll('.fisheye-line')
        //hard-coded positions of 3 corners of fisheye chart
          .data([[8, 190], [158, 190], [158, 40]])
          .enter()
            .append('line')
            .attr("class", "fisheye-line")
            .attr('x1', scope.mouse[0] + sizing.margin.left)
            .attr('y1', Math.min(
              sizing.height * (100 - smoothAverages[0].x) / 100,
              sizing.height * (100 - smoothAverages[0].y) / 100
            ) + sizing.margin.top)
            .attr('x2', function(d, i){return d[0];})
            .attr('y2', function(d, i){return d[1];});

        // Add the lineX path.
        var lineX = svg.append("path")
            .attr("class", "line")
            .attr("id", "lineA")
            .attr("clip-path", "url(#clip)")
            .attr("d", lineA(smoothAverages));


        // Add the lineY path.
        var lineY = svg.append("path")
            .attr("class", "line")
            .attr("id", "lineB")
            .attr("clip-path", "url(#clip)")
            .attr("d", lineB(smoothAverages));

        var snapshotLine = svg.append("line")
            .attr("class", "snapshot-line")
            .attr("x1", scope.mouse[0])
            .attr("x2", scope.mouse[0])
            .attr("y1", sizing.height)
            .attr("y2", Math.min(
              sizing.height * (100 - smoothAverages[0].x) / 100,
              sizing.height * (100 - smoothAverages[0].y) / 100
            ));

        Datestamp.render(smoothAverages[0].date, scope.dateRange, smoothAverages);
        Scorestamp.render(smoothAverages[0].x.toFixed(1), smoothAverages[0].y.toFixed(1), scope);
        if(scope.displayMode === 'fisheye') fisheyeChart.render(smoothAverages[0].date, users, scope);


        var snapshotUpdate = function(){
          if(scope.displayMode === 'fisheye' && scope.mouse[0] < sizing.width){

            var xRatio = scope.mouse[0] / sizing.width;
            //swift xPos left slightly to accommodate last date
            var xPos = (smoothAverages.length - 1) * xRatio + 0.2;
            var xIndex = Math.floor(xPos);
            var date = smoothAverages[xIndex].date;
            var dateStr = TimeFormat.format(date);

            //set snapshotDate
            scope.snapshotDate = dateStr;            

            var height = 0;
            var h1 = PathMethods.getYFromX(lineX, scope.mouse[0]);
            var h2 = PathMethods.getYFromX(lineY, scope.mouse[0]);
            if(h1 < h2){
              height = h1;
            }else{
              height = h2;
            }

            snapshotLine.data(scope.mouse)
              .attr("x1", scope.mouse[0])
              .attr("x2", scope.mouse[0])
              .attr("y1", sizing.height)
              .attr("y2", height);

            fisheyeLines.selectAll('.fisheye-line')
              .attr('x1', scope.mouse[0] + sizing.margin.left)
              .attr('y1', height + sizing.margin.top);

            fisheyeChart.render(date, users, scope);
            Datestamp.render(date, scope.dateRange, smoothAverages);
            Scorestamp.render(smoothAverages[xIndex].x.toFixed(1), smoothAverages[xIndex].y.toFixed(1), scope);
          }
        };

      }
    };
  }])

  .factory('fisheyeChart', ['TimeFormat', function(TimeFormat){
    return {
      render: function(date, users, scope){

        var sizing = {
          width: 150,
          height: 150
        };

        var fisheye = d3.select('.fisheye');
        if(fisheye[0][0] === null){
          fisheye = d3.select('.board').append('svg')
            .attr('display', function(){
              return scope.showFisheye ? 'static' : 'none';
            })
            .attr('class', 'fisheye')
            .attr('width', sizing.width)
            .attr('height', sizing.height);
            //fisheye labels
            fisheye.append('text')
              .attr('class', 'fisheye-label')
              .text('100')
              .style('text-anchor', 'end')
              .attr('x', sizing.width - 2)
              .attr('y', sizing.height - 2);
            fisheye.append('text')
              .attr('class', 'fisheye-label')
              .text('0')
              .style('text-anchor', 'start')
              .attr('x', 2)
              .attr('y', sizing.height - 2);
            fisheye.append('text')
              .attr('class', 'fisheye-label')
              .text('100')
              .style('text-anchor', 'start')
              .attr('x', 2)
              .attr('y', 10);

            //fisheye legends
            fisheye.append('text')
              .attr('class', 'fisheye-legend')
              .text('Company success')
              .style('text-anchor', 'middle')
              .attr('x', sizing.width / 2)
              .attr('y', sizing.height - 2);
            fisheye.append('text')
              .attr('class', 'fisheye-legend')
              .text('Personal success')
              .style('text-anchor', 'middle')
              .attr('transform', 'rotate(270, 8, 75)')
              .attr('x', 8)
              .attr('y', sizing.height / 2);
        }

        //show or hide fisheye display
        var updateDisplay = function(){
          d3.selectAll('.fisheye, .fisheye-dot, .fisheye-line')
            .attr('display', function(){
              return scope.showFisheye ? 'static' : 'none';
            });
        };
        updateDisplay();

        var scorePoints = fisheye.selectAll('.fisheye-dot')
          .data(users);

        //new score entry
        scorePoints.enter()
          .append('circle')
          .attr('class', 'fisheye-dot fisheye-dot-show')
          .attr('fill', function(d){return 'rgb(245,245,245)'})
          .attr('cx', function(d){
            //instant score
            for(var i = d.scores.length - 1; i >= 0; i--){
              if(date - d.scores[i].date < 0){
                //same date but later
                return d.scores[i].x * sizing.width / 100;
              }
            }
          })
          .attr('cy', function(d){
            //instant score
            for(var i = d.scores.length - 1; i >= 0; i--){
              if(date - d.scores[i].date < 0){
                //same date but later
                return sizing.height - d.scores[i].y * sizing.height / 100;
              }
            }
          })
          .attr('r', 3)
          .attr('opacity', 0.75);

        //score updates
        scorePoints.transition()
          .attr('cx', function(d){
            //instant score
            for(var i = d.scores.length - 1; i >= 0; i--){
              if(date - d.scores[i].date < 0){
                //same date but later
                return d.scores[i].x * sizing.width / 100;
              }
            }
            return d.scores[d.scores.length - 1].x * sizing.width / 100;
          })
          .attr('cy', function(d){
            //instant score
            for(var i = d.scores.length - 1; i >= 0; i--){
              if(date - d.scores[i].date < 0){
                //same date but later
                return sizing.height - d.scores[i].y * sizing.height / 100;
              }
            }
            return size.height - d.scores[d.scores.length - 1].y * sizing.height / 100;
          })
          .attr('fill', function(d){
            for(var i = d.scores.length - 1; i >= 0; i--){
              if(date - d.scores[i].date < 0 && i < d.scores.length - 1){
                var dx = d.scores[i].x - d.scores[i+1].x;
                var dy = d.scores[i].y - d.scores[i+1].y;
                var diff = dx + dy;

                //sensitive setting
                var blueness = Math.max(0, Math.min(255, (diff+15) * (255/30)));

                return 'rgb(' + (255 - blueness) + ',0,' + blueness + ')';
              }
            }
          }) 
          .duration(100);

        //old score exit
        scorePoints.exit()
          .transition()
          .attr('opacity', 0)
          .duration(300)
          .remove();
      }
    };
  }])

  .factory('FisheyeLines', [function(){

  }])

  .factory('Datestamp', ['TimeFormat', function(TimeFormat){
    return {
      render: function(date, range, smoothAverages){
        //create datestamp in board if it is not there yet
        if(!d3.select('.board').select('.datestamp')[0][0]){
          d3.select('.board').append('text')
            .attr('class', 'datestamp');          
        }
        d3.select('.board .datestamp')
          .attr("x", 5)
          .attr("y", 15)
          .style("text-anchor", "start")
          .text(function(){
            if(range <= 31){
              return TimeFormat.format(date);
            }else{
              var lastDate = new Date(Date.parse(date) - 86400000 * 6);
              return TimeFormat.format(lastDate) + ' - ' + TimeFormat.format(date) + ': '
              ;
            }
          });
      }
    };
  }])

  .factory('Scorestamp', [function(){
    return {
      render: function(x, y, scope){
        if(!d3.select('.xText')[0][0]){
          d3.select('#board').append("text")
            .attr('text-anchor', 'end')
            .attr('class', 'xText')
            .attr('x', scope.sizing.width)
            .attr('y', 30)
            .text('Company success: ' + x);          
        }else{
        d3.select('.xText').text('Company success: ' + x);          
        }
        if(!d3.select('.yText')[0][0]){
          d3.select('#board').append("text")
            .attr('text-anchor', 'end')
            .attr('class', 'yText')
            .attr('x', scope.sizing.width)
            .attr('y', 60)
            .text('Personal success: ' + y);          
        }else{
          d3.select('.yText').text('Personal success: ' + y);          
        }
      }
    }
  }])

  .factory('SmoothAverages', function(){
    return function(averages, range, scope){
      if(range){
        var firstDate = new Date() - range * 86400000;
      }else{
        var firstDate = averages[0].date;
      }
      var filteredAverages = averages.filter(function(average){
        return Date.parse(average.date) >= firstDate;
      });
      var smoothAverages = [];

      if(!range){
        scope.dateRange = filteredAverages.length;
        range = scope.dateRange;
      }

      if(range < 31){
        //1 month; show every day
        return filteredAverages;
      }else{
        for(var i = (range - 1) % 7; i < filteredAverages.length; i += 7){
          console.log(i);
          var avgNumber = Math.min(i+1, 7);
          var weekAverageX = 0;
          var weekAverageY = 0;
          for(var j = i; j > i - avgNumber; j--){
            weekAverageX += filteredAverages[j].x / avgNumber;
            weekAverageY += filteredAverages[j].y / avgNumber;
          }
          smoothAverages.push({
            x: weekAverageX,
            y: weekAverageY,
            date: averages[i].date
          });
        }
      }
      return smoothAverages;
    };
  })

  .factory('PathMethods', function(){
    return {
      getYFromX: function(el, x){
        var path = el[0][0];
        var finalX = 0;
        var point;
        var len = 0;

        //binary search
        var x0 = 0;
        var x1 = 1;

        var steps = 0;
        var totalLength = path.getTotalLength();

        point = path.getPointAtLength(len);

        while(Math.abs(finalX - x) > 1){
          len = (x0 + x1) / 2 * totalLength;
          point = path.getPointAtLength(len);
          finalX = point.x;
          if(finalX > x){
            x1 = x1 - (x1 - x0) / 2;
          }else{
            x0 = x0 + (x1 - x0) / 2;
          }
          steps++;
        }
        return point.y;
      }
    };
  })

  .factory('TimeFormat', function(){
    return {
      parse: d3.time.format(""),
      format: d3.time.format("%d-%b-%y")
    };
  });
