nv.models.customForceDirectedGraph = function() {
  "use strict";

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------
  var margin = {top: 2, right: 0, bottom: 2, left: 0}
    , width = 400
    , height = 32
    , container = null
    , dispatch = d3.dispatch('renderEnd')
    , color = nv.utils.getColor(['#000'])
    , tooltip = nv.models.tooltip()
    , noData = null
  // Force directed graph specific parameters [default values]
    , linkStrength = 0.1
    , friction = 0.9
    , linkDist = 30
    , charge = -120
    , gravity = 0.1
    , theta = 0.8
    , alpha = 0.1
    , radius = 5
  // These functions allow to add extra attributes to nodes and links
    , nodeExtras = function(nodes) { /* Do nothing */ }
    , linkExtras = function(links) { /* Do nothing */ }
    , linkColor = "#ccc"
    , initCallback = function(svgContainer) { /* Do nothing */}
  // you can specify the list of fields you want to show when hovering a node e.g. ["name", "value"]
    , nvTooltipFields = null
    , useNVTooltip = true
    , tooltipCallback = function(hide, tooltipData) { /* Do nothing */ }
    ;

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var renderWatch = nv.utils.renderWatch(dispatch);


  var nominal_base_node_size = 8;
  var max_base_node_size = 36;
  var nominal_stroke = 1.5;
  var max_stroke = 4.5;
  var min_zoom = 0.1;
  var max_zoom = 7;
  var zoom = d3.behavior.zoom().scaleExtent([min_zoom,max_zoom]);
  var svg, g;

  var size = d3.scale.pow().exponent(1)
    .domain([1,100])
    .range([8,24]);

  var highlight_color = "blue";
  var highlight_trans = 0.1;
  var focus_node = null, highlight_node = null;
  var default_node_color = "#ccc";
  var default_link_color = "#888";

  var outline = false;
  var towhite = "stroke";
  if (outline) {
    towhite = "fill"
  }

  function chart(selection) {
    renderWatch.reset();

    selection.each(function(data) {
      if (svg === undefined) {
        svg = d3.select(this);
        container = svg.append("g");
        g = container;
        svg.style("cursor","move");
      }
      nv.utils.initSVG(container);

      var availableWidth = nv.utils.availableWidth(width, container, margin),
        availableHeight = nv.utils.availableHeight(height, container, margin);

      container
        .attr("width", availableWidth)
        .attr("height", availableHeight);

      // Display No Data message if there's nothing to show.
      if (!data || !data.links || !data.nodes) {
        nv.utils.noData(chart, container)
        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }
      container.selectAll('*').remove();

      // Collect names of all fields in the nodes
      var nodeFieldSet = new Set();
      data.nodes.forEach(function(node) {
        var keys = Object.keys(node);
        keys.forEach(function(key) {
          if (nvTooltipFields === null || nvTooltipFields.indexOf(key) !== -1) {
            nodeFieldSet.add(key);
          }
        });
      });

      var linkedByIndex = {};
      data.links.forEach(function(d) {
        linkedByIndex[d.source + "," + d.target] = true;
      });

      function isConnected(a, b) {
        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
      }

      function hasConnections(a) {
        for (var property in linkedByIndex) {
          var s = property.split(",");
          if ((s[0] == a.index || s[1] == a.index) && linkedByIndex[property]) {
            return true;
          }
        }
        return false;
      }

      function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
      }

      var force = d3.layout.force()
        .nodes(data.nodes)
        .links(data.links)
        .size([availableWidth, availableHeight])
        .linkStrength(linkStrength)
        .friction(friction)
        .linkDistance(linkDist)
        .charge(charge)
        .gravity(gravity)
        .theta(theta)
        .alpha(alpha)
        .start();

      var link = container.selectAll(".link")
        .data(data.links)
        .enter().append("line")
        .attr("class", "nv-force-link")
        .style("stroke-width", function(d) { return Math.sqrt(d.value); });

      var node = container.selectAll(".node")
        .data(data.nodes)
        .enter()
        .append("g")
        .attr("class", "nv-force-node")
        .call(force.drag);

      var circle = node
        .append("circle")
        .attr("r", radius)
        .style("fill", function(d) { return color(d) } )
        .on("mouseover", function(evt) {
          container.select('.nv-series-' + evt.seriesIndex + ' .nv-distx-' + evt.pointIndex)
            .attr('y1', evt.py);
          container.select('.nv-series-' + evt.seriesIndex + ' .nv-disty-' + evt.pointIndex)
            .attr('x2', evt.px);

          // Add 'series' object to
          var nodeColor = color(evt);
          evt.series = [];
          nodeFieldSet.forEach(function(field) {
            evt.series.push({
              color: nodeColor,
              key:   field,
              value: evt[field]
            });
          });
          if (useNVTooltip) {
            tooltip.data(evt).hidden(false);
          }
          tooltipCallback(false, evt);
        })
        .on("mouseout", function(d) {
          if (useNVTooltip) {
            tooltip.hidden(true);
          }
          tooltipCallback(true);
        });


      function exit_highlight() {
        highlight_node = null;
        if (focus_node === null) {
          svg.style("cursor","move");
          if (highlight_color !== "white") {
            circle.style(towhite, "white");
            link.style("opacity", 1);
            link.style("stroke", function(o) {
              return linkColor(o);
            });
          }
        }
      }

      function set_focus(d) {
        if (highlight_trans < 1) {
          circle.style("opacity", function(o) {
            return isConnected(d, o) ? 1 : highlight_trans;
          });

          link.style("opacity", function(o) {
            return o.source.index == d.index || o.target.index == d.index ? 1 : highlight_trans;
          });
        }
      }

      function set_highlight(d) {
        svg.style("cursor","pointer");
        if (focus_node !== null) d = focus_node;
        highlight_node = d;

        if (highlight_color !== "white") {
          circle.style(towhite, function(o) {
            return isConnected(d, o) ? highlight_color : "white";});
          link.style("opacity", function(o) {
            return o.source.index == d.index || o.target.index == d.index ? 1 : 0.5;
          });
          link.style("stroke", function(o) {
            return o.source.index == d.index || o.target.index == d.index ? linkColor(o) : default_link_color;
          });
        }
      }

      node
        .on("mouseover", function(d) {
          set_highlight(d);
        })
        .on("mousedown", function(d) {
          d3.event.stopPropagation();
          focus_node = d;
          set_focus(d);
          if (highlight_node === null) {
            set_highlight(d);
          }
        }).on("mouseout", function(d) {
          exit_highlight();
        });

      d3.select(window).on("mouseup", function() {
        if (focus_node !== null) {
          focus_node = null;
          if (highlight_trans < 1) {
            circle.style("opacity", 1);
            link.style("opacity", 1);
          }
        }

        if (highlight_node === null) exit_highlight();
      });


      zoom.on("zoom", function() {
        console.debug("zoom");
        var stroke = nominal_stroke;
        if (nominal_stroke*zoom.scale()>max_stroke) stroke = max_stroke/zoom.scale();
        link.style("stroke-width",stroke);
        circle.style("stroke-width",stroke);

        var base_radius = nominal_base_node_size;
        if (nominal_base_node_size*zoom.scale()>max_base_node_size) base_radius = max_base_node_size/zoom.scale();
        circle.attr("r", function(d) {
          return (radius(d)*base_radius/nominal_base_node_size||base_radius);
        });
        g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
      });

      tooltip.headerFormatter(function(d) {return "Node";});

      // Apply extra attributes to nodes and links (if any)
      linkExtras(link);
      nodeExtras(node);

      force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

        node.attr("transform", function(d) {
          return "translate(" + d.x + ", " + d.y + ")";
        });
      });
    });

    svg.call(zoom);

    initCallback(svg);

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.options = nv.utils.optionsFunc.bind(chart);

  chart._options = Object.create({}, {
    // simple options, just get/set the necessary values
    width:     {get: function(){return width;}, set: function(_){width=_;}},
    height:    {get: function(){return height;}, set: function(_){height=_;}},

    // Force directed graph specific parameters
    linkStrength:{get: function(){return linkStrength;}, set: function(_){linkStrength=_;}},
    friction:    {get: function(){return friction;}, set: function(_){friction=_;}},
    linkDist:    {get: function(){return linkDist;}, set: function(_){linkDist=_;}},
    charge:      {get: function(){return charge;}, set: function(_){charge=_;}},
    gravity:     {get: function(){return gravity;}, set: function(_){gravity=_;}},
    theta:       {get: function(){return theta;}, set: function(_){theta=_;}},
    alpha:       {get: function(){return alpha;}, set: function(_){alpha=_;}},
    radius:      {get: function(){return radius;}, set: function(_){radius=_;}},

    //functor options
    x: {get: function(){return getX;}, set: function(_){getX=d3.functor(_);}},
    y: {get: function(){return getY;}, set: function(_){getY=d3.functor(_);}},

    // options that require extra logic in the setter
    margin: {get: function(){return margin;}, set: function(_){
      margin.top    = _.top    !== undefined ? _.top    : margin.top;
      margin.right  = _.right  !== undefined ? _.right  : margin.right;
      margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
      margin.left   = _.left   !== undefined ? _.left   : margin.left;
    }},
    color:  {get: function(){return color;}, set: function(_){
      color = nv.utils.getColor(_);
    }},
    noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
    nodeExtras: {get: function(){return nodeExtras;}, set: function(_){
      nodeExtras = _;
    }},
    linkExtras: {get: function(){return linkExtras;}, set: function(_){
      linkExtras = _;
    }},
    linkColor: {get: function(){return linkColor;}, set: function(_){
      linkColor = _;
    }},
    initCallback: {get: function() { return initCallback; }, set: function(_) {
      console.log("setting initCallback");
      initCallback = _;
    }},
    nvTooltipFields: {get: function() { return nvTooltipFields; }, set: function(_) {
      nvTooltipFields = _;
    }},
    useNVTooltip: {get: function() { return useNVTooltip; }, set: function(_) {
      useNVTooltip = _;
    }},
    tooltipCallback: {get: function() { return tooltipCallback; }, set: function(_) {
      tooltipCallback = _;
    }}
  });

  chart.dispatch = dispatch;
  chart.tooltip = tooltip;
  nv.utils.initOptions(chart);
  return chart;
};