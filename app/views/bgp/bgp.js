'use strict';

/**
 * @ngdoc function
 * @name bmpUiApp.controller:BGPController
 * @description
 * # BGPController
 * Controller of the BGP page
 */
angular.module('bmpUiApp').controller('BGPController', //["$scope", "$stateParams", "$location", "$filter", "bgpDataService", "ConfigService", "socket", "uiGridConstants",
  function($scope, $stateParams, $location, $filter, bgpDataService, ConfigService, socket, uiGridConstants, apiFactory, $timeout) {
    // TODO: have a widget to choose the start and end dates/times
    var start = 1483463232000;
    var end = 1483549631000;
    var updateColor = "#EAA546";
//    var start = 1484665200000;
//    var end = start + 10;
//    var start = 1483466300000;
//    var end = start + 10;

    $scope.httpRequests = [];

    $scope.changeLocation = function(parameter) {
      console.debug("changeLocation", parameter);
      var currentUrl = $location.url();
      var path = $location.path();
      var newUrl = path + (parameter !== undefined ? "?search="+parameter : "");
      console.log("currentUrl %s, path %s, newUrl %s", currentUrl, path, newUrl);
      if (currentUrl !== newUrl) {
        $location.url(newUrl);
      } else if (parameter === undefined) {
        $scope.searchValue = "";
        searchValueFn();
      } else {
        console.log("what to do?");
      }
    };

    var orderBy = "routes";
    var orderDir = "desc";
    $scope.limit = 30;
    $scope.offset = 0;
    function sortThisColumn(){}

    $scope.previousData = function() {
      if ($scope.offset > 0) {
        $scope.offset -= $scope.limit;
        getASListData();
      }
    }
    $scope.nextData = function() {
      $scope.offset += $scope.limit;
      getASListData();
    }

    function displayAllASNodes() {
      getASListData();
      $scope.showDirectedGraph = false;
      $scope.displayASNInfo = false;
    }

    function loadPreviewASHist(result) {
      $scope.previewGraphData = [];

      var timeInterval = 60;

      var gData = [];

      angular.forEach(result, function(record) {
        gData.push([new Date(record.created_on).getTime(), parseInt(record.chg)]);
      });

      console.log(gData);

      $scope.previewGraphData[0] = {
            key: "Change",
            values: gData
        };
    }

    // returns true if string s is a valid AS number
    function isASN(s) {
      return s.match(/^[0-9]+$/) !== null;
    }

    //get all the information of this AS
    function searchValueFn() {
      $scope.cancelAllHttpRequests();

      $scope.asInfo = {};
      $scope.displayASNInfo = false;
      $scope.showDirectedGraph = false;
      $scope.displayAllNodes = false;
      $scope.displayPrefixInfo = false;
      if ($scope.searchValue === "") {
        $scope.displayAllNodes = true;
        displayAllASNodes();
      }
      else if (isASN($scope.searchValue)) {
        $scope.asn = $scope.searchValue;
        $scope.displayASNInfo = false;
        apiFactory.getWhoIsASN($scope.searchValue).success(function(result) {
          var data = result.gen_whois_asn.data;
          $scope.asnDetails = [];
          getASWhoIsInfo(data);
          getASHistInfo();
          getASNodeAndLinks($scope.searchValue);
          $scope.displayASNInfo = true;
          $scope.showDirectedGraph = true;
        }).error(function (error) {
            console.log(error.message);
          });
      }
      // if it's not a number, assume it's a prefix
      else {
        $scope.displayPrefixInfo = true;
        $scope.prefix = $scope.searchValue;
//        $scope.dateFilterOn = true;
        getPrefixInfo($scope.searchValue);
      }
    }

    $scope.keypress = function (keyEvent) {
      if (keyEvent.which === 13)
        searchValueFn($scope.searchValue);
    };

    // AS list table options
    const firstRowHeight = 350;
    const asListGridInitHeight = firstRowHeight;
    $scope.asListGridOptions = {
      enableColumnResizing: true,
      rowHeight: 32,
      gridFooterHeight: 0,
      showGridFooter: true,
      height: asListGridInitHeight,
      enableHorizontalScrollbar: 0,
      enableVerticalScrollbar: 1,
      columnDefs: [
        {
          name: "asn", displayName: 'ASN', width: '*', type: 'number',
          cellTemplate: '<div class="ui-grid-cell-contents asn-clickable">' +
            '<div bmp-asn-model asn="{{ COL_FIELD }}" change-url-on-click="'+$location.path()+'?search={{ COL_FIELD}}"></div></div>'
        },
        {
          name: "origins", displayName: 'Origins', width: '*',
          type: 'number', cellClass: 'align-right', headerCellClass: 'header-align-right'
        },
        {
          name: "routes", displayName: 'Routes', width: '*',
          type: 'number', cellClass: 'align-right', headerCellClass: 'header-align-right',
          sort: { direction: uiGridConstants.DESC }
        },
        {
          name: "changes", displayName: 'Change count', width: '*',
          type: 'number', cellClass: 'align-right', headerCellClass: 'header-align-right'
        }
      ],
      onRegisterApi: function (gridApi) {
        gridApi.core.on.sortChanged($scope, function (grid, sortColumns) {
          console.log("grid sort changed", sortColumns);
          if (sortColumns.length > 0) {
            var c = sortColumns[0];
            console.log("sort ", c.field, c.sort);

            // instead of simply sorting the current data, request new data from the BGP data service
            orderBy = c.field;
            orderDir = c.sort.direction;
            $scope.offset = 0;
            getASListData();

//            sortASList(c.field, c.sort.direction==="desc");
          }
          else {
            // disable sorting
            sortASList();
          }
        });
      }
    };

    var color = d3.scale.category20();
    var minRadius = 4;
    var maxRadius = 30;
    // TODO: make minRadius and maxRadius dependent on the number of nodes to show
    // the domains for both scales below need to be updated when we receive the data
    // TODO: add a slider to change the exponent
    var exponent = .5;
    var radiusLinearScale = d3.scale.pow().exponent(exponent)
      .domain([0,10000])
      .range([minRadius, maxRadius]);
    var minLinkWidth = 1;
    var maxLinkWidth = 4;
    var linkWidthLinearScale = d3.scale.linear()
      .domain([0,10000])
      .range([minLinkWidth, maxLinkWidth]);
    var minLinkLength = 3 * maxRadius;
    var maxLinkLength = 4 * minLinkLength;
    var linkLengthLinearScale = d3.scale.linear()
      .domain([0,10000])
      .range([minLinkLength, maxLinkLength]);

    function getDataFromArray(result, index, key) {
      // TODO: have a way to choose which result to display
      return index < result.length ? result[index][key] : [];
    }

    function stream_index(d, i) {
      return {x: i, y: Math.max(0, d)};
    }

    function transformToGraphData(asList) {
      var prefixesOriginated = [];
      var prefixesTransitted = [];
      var routes = [];
      for (var i = 0 ; i < asList.length ; i++) {
        prefixesOriginated.push(asList[i].origins);
        prefixesTransitted.push(asList[i].routes - asList[i].origins);
        routes.push(asList[i].routes);
      }

      // update the scales' domain for the force directed graph
//      radiusLinearScale.domain([0, d3.max(prefixesOriginated)]);
//      radiusLinearScale.domain([0, d3.max(prefixesTransitted)]);
      radiusLinearScale.domain([0, Math.max(d3.max(prefixesOriginated), d3.max(routes))]);
      console.log("max origins", d3.max(prefixesOriginated), "max routes", d3.max(routes));
      console.log("radius scale", radiusLinearScale.domain());

      return [
        {
          key: "Prefixes Originated",
          values: prefixesOriginated.map(stream_index)
        },
        {
          key: "Prefixes Transitted",
          values: prefixesTransitted.map(stream_index)
        }//,
//        {
//          key: "Routes",
//          values: routes.map(stream_index)
//        }
      ];
    }

    // sort AS list to use for the multi bar chart
    function sortASList(field, reverse) {
      if (field === undefined) {
        $scope.asList = angular.copy($scope.asListBeforeSorting);
      } else {
        $scope.asList = $filter('orderBy')($scope.asListBeforeSorting, field, reverse);
        console.log("sorted", $scope.asList);
      }
      $scope.barChartData = transformToGraphData($scope.asList);
      console.log("$scope.barChartData", $scope.barChartData);
    }

    function updateNodeData(result) {
      console.log("updateNodeData");
      $scope.asListBeforeSorting = result;//getDataFromArray(result, 0, "asList");
      console.log("asListBeforeSorting", $scope.asListBeforeSorting);

      sortASList(orderBy, orderDir==="desc");

      // AS List table (already sorted as this is the widget controlling the sorting)
      $scope.loadingASList = false; // stop loading
      $scope.asListGridOptions.data = $scope.asList;
    }

    function updateForceDirectedGraphData(data) {
      // for a force directed graph, it's important for a node to have a weight
      // we'll use the number of origins as the weight factor for an AS node
      angular.forEach(data.nodes, function(node) {
        node.weight = node.origins;
      });
      $scope.forceDirectedGraph.data = data;
      console.log("forceDirectedGraph data", $scope.forceDirectedGraph.data);
      console.debug("links", JSON.stringify($scope.forceDirectedGraph.data.links));
      console.debug("nodes", JSON.stringify($scope.forceDirectedGraph.data.nodes));
      var linkWeight = function(link) { return link.sum_changes; };
      var minWeight = d3.min(data.links.map(linkWeight));
      var maxWeight = d3.max(data.links.map(linkWeight));
      linkWidthLinearScale.domain([0, maxWeight]);
      linkLengthLinearScale.domain([maxWeight, minWeight]);
      console.log("minWeight %d maxWeight %d", minWeight, maxWeight);
    }


    // Get detailed information of this AS
    function getASDetails(data) {
      var keysToFilterOut = ["raw_output", "remarks", "isTransit", "isOrigin",
        "transit_v4_prefixes", "transit_v6_prefixes", "origin_v4_prefixes", "origin_v6_prefixes"];

      for (var key in data) {
        if (data.hasOwnProperty(key) && keysToFilterOut.indexOf(key) === -1) {
          $scope.asnDetails.push({ key: key, value: data[key]||"null" });
        }
      }
    }

    function clearRequest(request) {
      $scope.httpRequests.splice($scope.httpRequests.indexOf(request), 1);
    }
    $scope.cancelAllHttpRequests = function() {
      console.debug("cancelAllHttpRequests", $scope.httpRequests.length);
      while ($scope.httpRequests.length > 0) {
        console.debug("cancelling request");
        var request = $scope.httpRequests[0];
        request.cancel();
        clearRequest(request);
      }
      console.debug("all done");
    }

    function getASNodeAndLinks(asn) {
      $scope.loadingASNodesAndLinksData = true;

      var request = bgpDataService.getASLinks(asn);
      $scope.httpRequests.push(request);
      request.promise.then(function(asLinks) {
        clearRequest(request);

        var asnToFindOutAbout = [];
        var i;

        // ignore links between the same ASN, e.g. source=109, target=109
        for (i = 0 ; i < asLinks.length ; i++) {
          var src = asLinks[i].source;
          var tgt = asLinks[i].target;
          if (isNaN(src)) {
            console.warn("source=%s invalid in link", src, asLinks[i]);
          } else if (isNaN(tgt)) {
            console.warn("target=%s invalid in link", tgt, asLinks[i]);
          } else if (src !== tgt) {
            // add source and target to the list of ASN to get more info on
            if (asnToFindOutAbout.indexOf(src) === -1) {
              asnToFindOutAbout.push(src);
            }
            if (asnToFindOutAbout.indexOf(tgt) === -1) {
              asnToFindOutAbout.push(tgt);
            }
          }
        }

        console.debug("asnToFindOutAbout", asnToFindOutAbout);

        var asInfoRequest = bgpDataService.getASInfo(asnToFindOutAbout.join(','));
        $scope.httpRequests.push(asInfoRequest);
        asInfoRequest.promise.then(function(linkedASInfo) {
          var nodes = linkedASInfo;

          var nodeIndexes = {};
          for (i = 0 ; i < nodes.length ; i++) {
            nodeIndexes[nodes[i].asn] = i;
          }

          for (i = 0 ; i < asLinks.length ; i++) {
            asLinks[i].sourceASN = asLinks[i].source;
            asLinks[i].source = nodeIndexes[asLinks[i].source];
            asLinks[i].targetASN = asLinks[i].target;
            asLinks[i].target = nodeIndexes[asLinks[i].target];
            if (asLinks[i].source === undefined || asLinks[i].target === undefined) {
              console.warn("Could not find AS%s - removing link between AS%s and AS%s",
                asLinks[i].source === undefined ? asLinks[i].sourceASN : asLinks[i].targetASN, asLinks[i].sourceASN, asLinks[i].targetASN
              );
              asLinks.splice(i, 1);
              i--;
            }
          }

          var data = { nodes: nodes, links: asLinks };


          // find information about this particular AS
          var asNumber = parseInt(asn, 10);
          for (var i = 0 ; i < data.nodes.length ; i++) {
//          console.log("compare %s (%s) with %s (%s)", res.nodes[i].asn, typeof(res.nodes[i].asn), asn, typeof(asn));
            if (data.nodes[i].asn === asNumber) {
              $scope.asnDetails.push({ key: "Number of routes", value: data.nodes[i].routes });
              $scope.asnDetails.push({ key: "Number of origins", value: data.nodes[i].origins });
            }
          }

          updateForceDirectedGraphData(data);

          $scope.loadingASNodesAndLinksData = false;

          clearRequest(asInfoRequest);
        }, function(error) {
          console.warn(error);
        });
      }, function(error) {
        console.warn(error);
      });
    }

//    function uniq_fast(a, containsJSON) {
//      var seen = {};
//      var out = [];
//      var j = 0;
//      for(var i = 0; i < a.length; i++) {
//        var item = containsJSON === true ? JSON.stringify(a[i]) : a[i];
//        if (seen[item] !== 1) {
//          seen[item] = 1;
//          out[j++] = a[i];
//        }
//      }
//      return out;
//    }
//
//    function transformASPathDataToGraphData(data) {
//      var nodes = [], links = [];
//      // split the AS path, concatenate all nodes and links
//      for (var i = 0 ; i < data.length ; i++) {
//        var split = data[i].as_path.split(' ');
//        split = split.map(function(as) { return parseInt(as, 10); });
//        nodes = nodes.concat(split);
//        for (var l = 0 ; l < split.length-1 ; l++) {
//          links.push({sourceASN: split[l], targetASN: split[l+1]});
//        }
//      }
//
//      // then eliminate duplicates
//      nodes = uniq_fast(nodes, false);
//      links = uniq_fast(links, true);
//
//      for (var i = 0 ; i < nodes.length ; i++) {
//        nodes[i] = {asn: nodes[i]};
//      }
//
//      // links' source and target now need to be indexes in the nodes array
//      var nodeIndexes = {};
//      for (i = 0 ; i < nodes.length ; i++) {
//        nodeIndexes[nodes[i].asn] = i;
//      }
//      for (i = 0 ; i < links.length ; i++) {
//        links[i].source = nodeIndexes[links[i].sourceASN];
//        links[i].target = nodeIndexes[links[i].targetASN];
//      }
//
//      return {nodes: nodes, links: links};
//    }

    // Get information for a specific prefix
    function getPrefixInfo(prefix) {
      var start, end;
      if ($scope.dateFilterOn) {
        start = getTimestamp("start");
        end = getTimestamp("end");
      }
      $scope.loadingPrefixes = true; // begin loading
      var request = bgpDataService.getPrefixInfo(prefix, start, end);
      $scope.httpRequests.push(request);
      request.promise.then(function(data) {
          console.debug("prefix info", data, JSON.stringify(data));
          // example of result: [
          //   { "as_path": "123 456 789", "origin_as": 789, "created_on": "2017-02-12 22:55", "prefix": "1.2.3.0/24" },
          //   { "as_path": "123 444 789", "origin_as": 789, "created_on": "2017-02-12 22:39", "prefix": "1.2.3.0/24" },
          //   { "as_path": "123 654 567", "origin_as": 567, "created_on": "2017-02-12 22:54", "prefix": "1.2.9.0/22" }
          // ]
          // we want to organise the data for 2 widgets:
          // - a table listing distinct prefixes and their origin_as
          // - an svg graph (with auto-layout) displaying all AS paths over time")
          $scope.prefixViewGridOptions.data = data;
//          $scope.asPathGraph.data = transformASPathDataToGraphData(data);
          $scope.asPathGraph.paths = [];
          for (var i = 0 ; i < data.length ; i++) {
            $scope.asPathGraph.paths.push({path: data[i].as_path});
          }

          createASpaths($scope.asPathGraph.paths);
          console.log("asPathGraph data", $scope.asPathGraph.data);

          $scope.loadingPrefixes = false; // stop loading
          clearRequest(request);
        }, function(error) {
          console.warn(error);
        }
      );
    }

    // Get information for a specific AS hist
    function getASHistInfo() {
      var start, end;
      // start = 1486903623000;
      // end = 1487158528356;

      if ($scope.dateFilterOn) {
        start = getTimestamp("start");
        end = getTimestamp("end");

       // $scope.loadingPrefixes = true; // begin loading
        var request = bgpDataService.getASHistInfo($scope.asn, start, end);
        $scope.httpRequests.push(request);
        request.promise.then(function(result) {
            console.debug("AS hist info", result);
            loadPreviewASHist(result);
            // example of result: [
            //   { "as_path": "123 456 789", "origin_as": 789, "created_on": "2017-02-12 22:55", "prefix": "1.2.3.0/24" },
            //   { "as_path": "123 444 789", "origin_as": 789, "created_on": "2017-02-12 22:39", "prefix": "1.2.3.0/24" },
            //   { "as_path": "123 654 567", "origin_as": 567, "created_on": "2017-02-12 22:54", "prefix": "1.2.9.0/22" }
            // ]
            // we want to organise the data for 2 widgets:
            // - a table listing distinct prefixes and their origin_as
            // - an svg graph (with auto-layout) displaying all AS paths over time
            // $scope.prefixViewGridOptions.data = result;
            // $scope.asPathGraph.data = transformASPathDataToGraphData(result);
            // console.debug("as path graph data", $scope.asPathGraph.data);
            // $scope.loadingPrefixes = false; // stop loading

            clearRequest(request);
          }, function(error) {
            console.warn(error);
          }
        );
      }
    }

    // Get prefixes information of this AS
    function getPrefixes() {
      $scope.prefixGridOptions.data = [];
      $scope.loadingPrefixes = true; // begin loading
      console.log("getting prefixes for AS", $scope.asn);
      var request = bgpDataService.getASPaths($scope.asn);
      $scope.httpRequests.push(request);
      request.promise.then(function(result) {
          $scope.prefixGridOptions.data = result;
          $scope.loadingPrefixes = false; // stop loading
          clearRequest(request);
        }, function(error) {
          console.warn(error);
        }
      );
    }

    // get AS data (details, prefixes)
    function getASWhoIsInfo(data) {
      if (data.length != 0) {
        $scope.asn = data[0].asn;
        getASDetails(data[0]);
        getPrefixes();
        $scope.nodata = false;
      }
      else {
        $scope.nodata = true;
      }
    }

    function getASListData() {
      $scope.loadingASList = true; // begin loading
      $scope.asListGridOptions.data = [];
      var request = bgpDataService.getASList(orderBy, orderDir, $scope.limit, $scope.offset);
      request.promise.then(function(result) {
          console.debug("got AS list", result);
          $scope.loadingASList = false;
          updateNodeData(result);

          clearRequest(request);
        }, function(error) {
          console.warn(error);
        }
      );
    }    

    /* bar chart */

    $scope.barChartOptions = {
      chart: {
        type: 'multiBarChart',
        height: firstRowHeight,
        margin : {
          top: 20,
          right: 20,
          bottom: 70,
          left: 45
        },
        clipEdge: true,
        duration: 500,
        stacked: true,
        reduceXTicks: false,
        rotateLabels: 90,
        useInteractiveGuideline: true,
//        refreshDataOnly: true,
        xAxis: {
          axisLabel: '',
          showMaxMin: false,
          tickFormat: function(d){
//              return "AS " + d3.format(',f')(d);
            return "AS " + $scope.asList[d].asn;
//            return "";
          }
        },
        yAxis: {
          axisLabel: '',
          tickFormat: function(d){
            return d3.format(',.f')(d);
          }
        }
      }
    };

    /* end of bar chart */

    /* prefix table */

    $scope.prefixGridInitHeight = 250;
    $scope.prefixGridOptions = {
      rowHeight: 32,
      gridFooterHeight: 0,
      showGridFooter: true,
      enableFiltering: true,
      height: $scope.prefixGridInitHeight,
      enableHorizontalScrollbar: 0,
      enableVerticalScrollbar: 1,
      columnDefs: [
        {
          name: "prefix", displayName: 'Prefix', width: '*',
          cellTemplate: '<div class="ui-grid-cell-contents clickable" bmp-prefix-tooltip prefix="{{ COL_FIELD }}" change-url-on-click="'+$location.path()+'?search={{ COL_FIELD}}"></div>'
        },
        {
          name: "origin", displayName: 'Origin AS', width: '*',
          cellTemplate: '<div class="ui-grid-cell-contents asn-clickable">' +
            '<div bmp-asn-model asn="{{ COL_FIELD }}" change-url-on-click="'+$location.path()+'?search={{ COL_FIELD}}"></div></div>'
        }
      ],
      onRegisterApi: function (gridApi) {
        $scope.prefixGridApi = gridApi;
      }
    };

    /* end of prefix table */

    /* prefix view table */

    $scope.prefixViewGridOptions = {
      rowHeight: 32,
      gridFooterHeight: 0,
      showGridFooter: true,
      enableFiltering: true,
      height: $scope.prefixGridInitHeight,
      enableHorizontalScrollbar: 0,
      enableVerticalScrollbar: 1,
      columnDefs: [
        {
          name: "prefix", displayName: 'Prefix', width: '20%',
          cellTemplate: '<div class="ui-grid-cell-contents clickable" bmp-prefix-tooltip prefix="{{ COL_FIELD }}" change-url-on-click="'+$location.path()+'?search={{ COL_FIELD}}"></div>'
        },
        {
          name: "as_path", displayName: 'AS Path', width: '*'
        },
        {
          name: "created_on", displayName: 'Timestamp', width: '*'
        }
      ],
      onRegisterApi: function (gridApi) {
        $scope.prefixViewGridApi = gridApi;
      }
    };

    /* end of prefix view table */

    /* force-directed graph */

    // stability is a value between 0 and 1. A value over 1 will be mapped to 1
    // colors (red to green) checked for color blindness
    $scope.stabilityColors = [
      {
        label: "stability-0",
        color: "#9e1313"
      },
      {
        label: "stability-1",
        color: "#e60000"
      },
      {
        label: "stability-2",
        color: "#f07d02"
      },
      {
        label: "stability-3",
        color: "#84ca50"
      }
    ];
    function linkStabilityIndex(stability) {
      var index = 0;
      if (stability >= 8) {
        index = 3;
      } else if (stability >= 5) {
        index = 2;
      } else if (stability >= 2) {
        index = 1;
      }
      return index;
    }
    function linkStabilityLabel(stability) {
      var index = linkStabilityIndex(stability);
      return $scope.stabilityColors[index].label;
    }
    function linkStabilityColor(stability) {
//      var colors = ["#ca0020", "#f4a582", "#92c5de", "#0571b0"];
      var index = linkStabilityIndex(stability);
      return $scope.stabilityColors[index].color;
    }

    function getParentWidth() {
      var parentDiv = $("#forceDirectedGraph");
      var defaultScrollbarWidth = 15;
      return parentDiv.width() - defaultScrollbarWidth;
    }
    $scope.tooltipFields = [ "asn", "routes", "origins", "changes" ];
//    var customForceDirectedGraphSvg;
    $scope.forceDirectedGraph = {
      options: {
        chart: {
          type: 'customForceDirectedGraph',
          height: Math.min($(window).height()-85, Math.max(500, getParentWidth() * 0.75)),
          width: getParentWidth(),
          margin:{top: 20, right: 20, bottom: 20, left: 20},
//          color: function(d){
//            return color(d.num_of_prefixes)
//          },
          nodeExtras: function(node) {
            node && node
              .append("text")
              .attr("dx", function(d) { return radiusLinearScale(d.routes) + 2; })
              .attr("dy", ".35em")
              .text(function(d) { return d.asn })
              .style('font-size', '10px');
          },
          linkExtras: function(link) {
            link && link
              .style("stroke-width", function(d) { return linkWidthLinearScale(d.sum_changes); })
              .style("stroke", function(d) { return linkStabilityColor(d.changes); })
              .attr("marker-end", function(d) {
                var stabilityLabel = linkStabilityLabel(d.changes);
                return "url(#arrow-"+stabilityLabel+")";
              });
          },
          linkColorSet: $scope.stabilityColors,
          linkColor: function(d) {
            return linkStabilityColor(d.sum_changes);
          },
          linkDist: function(link) {
            return linkLengthLinearScale(link.sum_changes);
          },
          linkStrength: 0.5,
          charge: -300,
//          initCallback: function(svgContainer) {
//            customForceDirectedGraphSvg = svgContainer;
//          },
          radius: function(d) {
            return radiusLinearScale(d.origins);
          },
          nodeCircles: [
            {
              color: "#aec7e8",
              cssClass: "routes",
              radius: function(d) { return radiusLinearScale(d.routes); },
              displayNode: function(d) { return d.routes > 0; }
            },
            {
              color: "#1f77b4",
              cssClass: "origins",
              radius: function(d) { return radiusLinearScale(d.origins); },
              displayNode: function(d) { return d.origins > 0; }
            }
          ],
          nvTooltipFields: $scope.tooltipFields,
          useNVTooltip: false,
          tooltipCallback: function(hideTooltip, tooltipData) {
//            console.debug("tooltipData", tooltipData);
            var nodeTooltip = $("#nodeTooltips");
            if (!hideTooltip) {
              for (var i = 0 ; i < $scope.tooltipFields.length ; i++) {
                var field = $scope.tooltipFields[i];
                $("#field-"+field+" .value").text(tooltipData[field]);
                nodeTooltip.removeClass("hideTooltip")
              }
            } else {
              nodeTooltip.addClass("hideTooltip")
            }
          },
          nodeIdField: "asn"
        }
      }
    };

    $scope.controlZoom = function(direction) {
      window.customForceDirectedGraph.dispatch.zoomControl(direction);
    };

    /* end of force-directed graph */

    /* time slider */

    $scope.dateFilterOn = false;

    // load UTC timezone
    moment.tz.add("Etc/UTC|UTC|0|0|");
    moment.tz.link("Etc/UTC|UTC");

    var timeFormat = 'YYYY-MM-DD HH:mm';

    var startTimestamp, endTimestamp;

    endTimestamp = moment().toDate();
    startTimestamp = moment().subtract(60, 'minutes').toDate();
    var duration, durationInMinutes;

    var sliderSettings = {
      start: [startTimestamp.getTime(), endTimestamp.getTime()], // Handle start position
      step: 60 * 1000, // Slider moves in increments of a minute
      margin: 60 * 1000, // Handles must be more than 1 minute apart
      limit: 3600 * 60 * 1000 * 4, // Maximum 2 hours
      connect: true, // Display a colored bar between the handles
      orientation: 'horizontal', // Orient the slider vertically
      behaviour: 'tap-drag', // Move handle on tap, bar is draggable
      range: {
        'min': moment().subtract(12, 'hours').toDate().getTime(),
        'max': moment().toDate().getTime()
      },
      format: {
        to: function (value) {
          return moment(parseInt(value));
        },
        from: function (value) {
          return parseInt(value);
        }
      },
      pips: {
        mode: 'count',
        values: 5,
        density: 4,
        format: {
          to: function (value) {
            return moment(parseInt(value)).format('MM/DD HH:mm');
          }
        }
      }
    };

    var timeSelector = $('#timeSelector')[0];

    noUiSlider.create(timeSelector, sliderSettings);

    function getTimestamp(startOrEnd) {
      var dateTimePicker = startOrEnd === "start" ? startDatetimePicker : endDatetimePicker;
      return dateTimePicker.data('DateTimePicker').date();
    }

    var startDatetimePicker = $('#startDatetimePicker'),
      endDatetimePicker = $('#endDatetimePicker');

    startDatetimePicker.datetimepicker({
      sideBySide: true,
      format: 'MM/DD/YYYY HH:mm'
    });

    startDatetimePicker.on('dp.hide', function () {
      var setDate = startDatetimePicker.data('DateTimePicker').date();
      var originalValues = timeSelector.noUiSlider.get();
      if (setDate < moment(sliderSettings.range['min'])) {
        timeSelector.noUiSlider.destroy();
        sliderSettings.range = {
          'min': moment(setDate).toDate().getTime(),
          'max': moment(setDate).add(12, 'hours').toDate().getTime()
        };
        loadPreview();
        getASHistInfo();
        sliderSettings.start = [moment(setDate).toDate().getTime(), moment(setDate).toDate().getTime() + (originalValues[1] - originalValues[0])];
        noUiSlider.create(timeSelector, sliderSettings);
        bindEvents();
      }
      else if (setDate > moment(sliderSettings.range['max']) && setDate <= moment()) {
        timeSelector.noUiSlider.destroy();
        sliderSettings.range = {
          'min': moment(setDate).toDate().getTime(),
          'max': moment(setDate).add(12, 'hours').toDate().getTime()
        };
        loadPreview();
        getASHistInfo();
        sliderSettings.start = [moment(setDate).toDate().getTime(), moment(setDate).toDate().getTime() + (originalValues[1] - originalValues[0])];
        noUiSlider.create(timeSelector, sliderSettings);
        bindEvents();
      }
      else if (setDate > moment()) {
        alert("You can't go to the future! But you can try to go to your past :)");
      }
      else {
        timeSelector.noUiSlider.set([moment(setDate).toDate().getTime(), moment(setDate).toDate().getTime() + (originalValues[1] - originalValues[0])]);
      }
    });

    endDatetimePicker.datetimepicker({
      sideBySide: true,
      format: 'MM/DD/YYYY HH:mm'
    });

    endDatetimePicker.on('dp.hide', function () {
      var setDate = endDatetimePicker.data('DateTimePicker').date();
      var originalValues = timeSelector.noUiSlider.get();
      if (setDate <= moment(sliderSettings.range['min'])) {
        timeSelector.noUiSlider.destroy();
        sliderSettings.range = {
          'min': moment(setDate).subtract(12, 'hours').toDate().getTime(),
          'max': moment(setDate).toDate().getTime()
        };
        loadPreview();
        getASHistInfo();
        sliderSettings.start = [moment(setDate).toDate().getTime() - (originalValues[1] - originalValues[0]), moment(setDate).toDate().getTime()];
        noUiSlider.create(timeSelector, sliderSettings);
        bindEvents();
      }
      else if (setDate > moment(sliderSettings.range['max']) && moment(setDate).subtract(12, 'hours') <= moment()) {
        timeSelector.noUiSlider.destroy();
        sliderSettings.range = {
          'min': moment(setDate).subtract(12, 'hours').toDate().getTime(),
          'max': moment(setDate).toDate().getTime()
        };
        loadPreview();
        getASHistInfo();
        sliderSettings.start = [moment(setDate).toDate().getTime() - (originalValues[1] - originalValues[0]), moment(setDate).toDate().getTime()];
        noUiSlider.create(timeSelector, sliderSettings);
        bindEvents();
      }
      else if (moment(setDate).subtract(12, 'hours') > moment()) {
        alert("You can't go to the future! But you can try to go to your past :)");

      }
      else {
        timeSelector.noUiSlider.set([moment(setDate).toDate().getTime() - (originalValues[1] - originalValues[0]), moment(setDate).toDate().getTime()]);
      }
    });

    // load all graphs
    var loadAll = $scope.loadAll = function() {
    };

    function bindEvents() {
      var timer;
      timeSelector.noUiSlider.on('update', function () {
        $timeout.cancel(timer);
        startDatetimePicker.data("DateTimePicker").date(timeSelector.noUiSlider.get()[0]);
        endDatetimePicker.data("DateTimePicker").date(timeSelector.noUiSlider.get()[1]);
        durationInMinutes = Math.round((timeSelector.noUiSlider.get()[1] - timeSelector.noUiSlider.get()[0]) / (1000 * 60));

        if (durationInMinutes > 60)
          duration = Math.floor(durationInMinutes / 60) + ' hrs ' + durationInMinutes % 60 + ' mins';
        else
          duration = durationInMinutes + ' Minutes';
        $('#duration').text(duration);

        timer = $timeout(function() { 
          loadPreview();
          getASHistInfo(); 
        }, 5000);

        
      });
      timeSelector.noUiSlider.on('set', function () {
        loadAll();
      });
      loadAll();
      
    }

    $scope.leftArrow = function () {
      var originalValues = timeSelector.noUiSlider.get();
      timeSelector.noUiSlider.destroy();
      var originalRange = [sliderSettings.range['min'], sliderSettings.range['max']];
      sliderSettings.range = {
        'min': originalRange[0] - (originalRange[1] - originalRange[0]),
        'max': originalRange[0]
      };
      loadPreview();
      getASHistInfo();
      sliderSettings.start = [sliderSettings.range['max'] - (originalValues[1] - originalValues[0]), sliderSettings.range['max']];
      noUiSlider.create(timeSelector, sliderSettings);
      bindEvents();
    };

    $scope.rightArrow = function () {
      var originalValues = timeSelector.noUiSlider.get();
      timeSelector.noUiSlider.destroy();
      var originalRange = [sliderSettings.range['min'], sliderSettings.range['max']];
      sliderSettings.range = {
        'min': originalRange[1],
        'max': originalRange[1] + (originalRange[1] - originalRange[0])
      };
      loadPreview();
      getASHistInfo();
      sliderSettings.start = [sliderSettings.range['min'], sliderSettings.range['min'] + (originalValues[1] - originalValues[0])];
      noUiSlider.create(timeSelector, sliderSettings);
      bindEvents();
    };

    $scope.setToNow = function () {
      var originalValues = timeSelector.noUiSlider.get();
      timeSelector.noUiSlider.destroy();
      sliderSettings.range = {
        'min': moment().subtract(12, 'hours').toDate().getTime(),
        'max': moment().toDate().getTime()
      };
      loadPreview();
      getASHistInfo();
      sliderSettings.start = [moment().toDate().getTime() - (originalValues[1] - originalValues[0]), moment().toDate().getTime()];
      noUiSlider.create(timeSelector, sliderSettings);
      bindEvents();
    };

    function loadPreview() {
      $scope.previewGraphData = [];
    }

    $scope.previewGraph = {
      chart: {
        type: "lineChart",
        height: 120,
        margin: {
          top: 20,
          right: 0,
          bottom: 10,
          left: 0
        },
        color: function (d) {
          if (d.key == "Change")
            return updateColor;
          if (d.key == "Withdraws")
            return withdrawColor;
        },
        x: function (d) {
          return d[0];
        },
        y: function (d) {
          return d[1];
        },
        useVoronoi: true,
        clipEdge: true,
        transitionDuration: 500,
        useInteractiveGuideline: true,
        showLegend: false,
        showControls: false,
        showXAxis: false,
        showYAxis: false,
        forceY : [-2,2],
        xAxis: {
          tickFormat: function (d) {
            return moment(d).format("MM/DD/YYYY HH:mm");
          }
        }
      }
    };

    bindEvents();

    /* end of time slider */

    /* prefix AS path graph */

    $scope.asPathGraph = {
    };

    $scope.testAsPathGraph = {
      width: getParentWidth(),
      height: 400,
      testData: {
        paths: [
          {path: "6939 6939 6939 8220 8220 3096"},{path: "11017 6939 6939 8220 3096"},
          {path: "11017 6939 12989 53723 53723 53723 53723 53723 53723 53723"}
        ]
      }
    };

    $scope.wordCheck = function(word) {
      if (word === undefined) return "";
      if (word.length > 6) {
        return word.slice(0, 4) + " ...";
      } else {
        return word;
      }
    };

    var peerASN = 11017;
    function createASpaths(paths) {
      for (var i = 0 ; i < paths.length ; i++) {
        createASpath(paths[i]);
      }
    }
    function createASpath(path) {
      console.debug("createASpath", path);
      path.config = {};
      var iconWidth = 50;
      var lineWidth = 100;
      var nodeWidth = iconWidth + lineWidth;

      path.config.width = "100%";
      path.config.lineWidth = lineWidth + "px";
      path.config.iconWidth = iconWidth + "px";

      var pathArray = path.path.split(" ");

      var norepeat = [];
      for (var i = 0; i < pathArray.length; i++) {
        if (norepeat.indexOf(pathArray[i]) == -1 && pathArray[i] != '}' && pathArray[i] != '{') {
          norepeat.push(pathArray[i]);
        }
      }
      console.debug("norepeat", norepeat);

      //Router node
      var as_path = [];

      for (var i = 0; i < norepeat.length; i++) {
        //AS nodes "bmp-as_router10-17"
        as_path.push({
          icon: "bmp-as_router10-17",
          topVal: norepeat[i],
          colour: "#9467b0",
          botVal: norepeat[i],
          isEnd: true,
          addWidth: nodeWidth
        });
      }

      //make last as not have connecting line
      as_path[as_path.length - 1].isEnd = false;

      var asname;
      path.as_path = [];
      apiFactory.getWhoIsASNameList(norepeat).success(function(
        result) {

        path.as_path = as_path;

        var asname = result.w.data;
        for (var i = 0; i < asname.length; i++) {
          var index = norepeat.indexOf((asname[i].asn).toString());

          //all fields/ info for popover.
          var popOutFields = ["asn", "as_name", "org_id", "org_name",
            "city", "state_prov", "postal_code", "country"
          ]; //etc
          var pcontent = "";
          for (var j = 0; j < popOutFields.length; j++) {
            if (asname[i][popOutFields[j]] != null) {
              pcontent += popOutFields[j] + " : <span class='thin'>" +
                asname[i][popOutFields[j]] + "</span><br>";
              pcontent = pcontent.replace(/ASN-|ASN/g, "");
            }
          }
          asname[i].as_name = asname[i].as_name.replace(/ASN-|ASN/g,
            "");

          //changed the name of the as to name from results.
          path.as_path[index].topVal = asname[i].as_name; //+1 cause starting router node
          path.as_path[index].noTopText = false;
          path.as_path[index].popOut = pcontent; //+1 cause starting router node
        }

        console.log("peerASN", peerASN, "norepeat[0]", norepeat[0]);
        path.as_path[0].icon = "bmp-ebgp_router10-17";
        path.as_path[0].colour = "#EAA546";
        path.as_path[0].noTopText = true;
        path.as_path[0].addWidth = nodeWidth + 28; //width of label from icon

        path.as_path = [{
          icon: "bmp-bmp_router10-17",
          topVal: "",
          noTopText: true,
          colour: "#4b84ca",
          botVal: "",
          isEnd: true,
          addWidth: nodeWidth
        }].concat(path.as_path);

        //set width of whole container depending on result size.
        //len + 1 for router     + 80 stop wrapping and padding
        path.config.width = nodeWidth * path.as_path.length + 80 + "px";

        console.debug("path", path);
      }).error(function(error) {
        console.log(error);
      });
    }

    // TODO: remove after testing
//    createASpaths($scope.testAsPathGraph.testData.paths);

    /* end of prefix AS path graph */

    var uiServer = ConfigService.bgpDataService;
    const SOCKET_IO_SERVER = "bgpDataServiceSocket";
    socket.connect(SOCKET_IO_SERVER, uiServer);
    socket.on(SOCKET_IO_SERVER, 'dataUpdate', function(data) {
      console.log("dataUpdate", data);
      updateNodeData(data);
    });

    // initialisation
    $(function () {
      //initial search
      console.debug("stateParams", $stateParams);
      if ($stateParams.search) {
        $scope.searchValue = $stateParams.search;
        searchValueFn();
      }
      else {
        $scope.searchValue = "";
        $scope.displayAllNodes = true;
        displayAllASNodes();
      }
    });
  }
);
