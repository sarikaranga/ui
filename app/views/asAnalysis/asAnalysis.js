'use strict';

/**
 * @ngdoc function
 * @name bmpUiApp.controller:ASAnalysisController
 * @description
 * # ASAnalysisController
 * Controller of the AS Analysis page
 */
angular.module('bmpUiApp')
  .controller('ASAnalysisController',['$scope', 'apiFactory', '$timeout', function ($scope, apiFactory, $timeout) {

    /* Chart options */
    $scope.ipv4Options = {
      chart: {
        type: 'discreteBarChart',
        height: 450,
        margin : {
          top: 20,
          right: 20,
          bottom: 130,
          left: 55
        },
        x: function(d){ return d.label; },
        y: function(d){ return d.value; },
        showValues: true,
        staggerLabels:false,
        color:["#4ec0f1"],
        valueFormat: function(d){
          return d3.format('d')(d);
        },
        transitionDuration: 500,
        xAxis: {
          axisLabel: '',
          rotateLabels:-45
        },
        yAxis: {
          axisLabel: '',
          axisLabelDistance: 30,
          tickFormat:function(d){
            return d/1000+'k';
          }
        },
        yDomain:[0,600000]
      },

      "title": {
        "enable": true,
        "text": "ipv4"
      }
    };

    $scope.ipv6Options = {
      chart: {
        type: 'discreteBarChart',
        height: 450,
        margin : {
          top: 20,
          right: 20,
          bottom: 130,
          left: 55
        },
        x: function(d){ return d.label; },
        y: function(d){ return d.value; },
        showValues: true,
        staggerLabels:false,
        color:["#9ec654"],
        valueFormat: function(d){
          return d3.format('d')(d);
        },
        transitionDuration: 500,
        xAxis: {
          axisLabel: '',
          rotateLabels:-45
        },
        yAxis: {
          axisLabel: '',
          axisLabelDistance: 30,
          tickFormat:d3.format('d')
        },
        yDomain:[0,10]
      },


      "title": {
        "enable": true,
        "text": "ipv6"
      }
    };

    /* Chart data */
    $scope.top_transit_ipv4_data = [];
    $scope.top_transit_ipv6_data = [];
    $scope.top_origin_ipv4_data = [];
    $scope.top_origin_ipv6_data = [];

    getData();

    /* Get the data of charts */
    function getData(){
      apiFactory.getTopTransitIpv4Data().success(
        function(results){
          $scope.top_transit_ipv4_data = processData(results,"transit_v4_prefixes");
          $scope.ipv4TransitGraphIsLoad = false; // stop loading
        }
      ).
        error(function (error){
          console.log(error.message);
        });

      apiFactory.getTopTransitIpv6Data().success(
        function(results){
          $scope.top_transit_ipv6_data = processData(results,"transit_v6_prefixes");
          $scope.ipv6TransitGraphIsLoad = false; // stop loading
        }
      ).
        error(function (error){
          console.log(error.message);
        });

      apiFactory.getTopOriginIpv4Data().success(
        function(results){
          $scope.top_origin_ipv4_data = processData(results,"origin_v4_prefixes");
          $scope.ipv4OriginGraphIsLoad = false; // stop loading
        }
      ).
        error(function (error){
          console.log(error.message);
        });

      apiFactory.getTopOriginIpv6Data().success(
        function(results){
          $scope.top_origin_ipv6_data = processData(results,"origin_v6_prefixes");
          $scope.ipv6OriginGraphIsLoad = false; // stop loading
        }
      ).
        error(function (error){
          console.log(error.message);
        });

    }

    /* Process the data get from the APIs */
    function processData(results,option){
      var ip = results.s.data;
      var values=[];
      var prefixes;

      //create array with amount of prefixes
      for (var i = ip.length-1; i >=0; i--) {

        if(option == "transit_v4_prefixes" ) {
          prefixes = ip[i].transit_v4_prefixes;
        }else if(option == "transit_v6_prefixes" ) {
          prefixes = ip[i].transit_v6_prefixes;
        }else if(option == "origin_v4_prefixes" ) {
          prefixes = ip[i].origin_v4_prefixes;
        }else if(option == "origin_v6_prefixes" ) {
          prefixes = ip[i].origin_v6_prefixes;
        }

        if(prefixes != 0) {
          values.push({
            "label": ip[i].as_name,
            "value": prefixes
          });
        }
      }

      var chart_data=[{
        title: "Cumulative Return",
        values: values
      }];

      return chart_data;
    }

  }]);
