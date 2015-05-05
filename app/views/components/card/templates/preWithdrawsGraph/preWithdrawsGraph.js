'use strict';

angular.module('bmp.components.card')

  .controller('BmpCardPreWithdrawsGraphController', ["$scope", "apiFactory", function ($scope, apiFactory) {

      $scope.preWithdrawsGraph = {
        chart: {
          type: 'discreteBarChart',
          height: 500,
          margin : {
            top: 20,
            right: 20,
            bottom: 80,
            left: 55
          },
          x: function(d){return d.label;},
          y: function(d){return d.value;},
          showValues: true,
          valueFormat: function(d){
            return d3.format('')(d);
          },
          transitionDuration: 500,
          xAxis: {
            axisLabel: 'Ips',
            rotateLabels: -25,
            rotateYLabel: true
          },
          yAxis: {
            axisLabel: 'Quantity(Ip Count)',
            axisLabelDistance: 30,
            tickFormat:d3.format('d')
          }
        }
      };

    $scope.preWithdrawsConfig = {
      visible: $scope.data.visible // default: true
    };


    $scope.preWithdrawsData = [
      {
        key: "test",
        values:[]
      }
    ];

    apiFactory.getTopPrefixUpdates($scope.data.peer_hash_id)
      .success(function (result){

        var data = result.u.data;
        var len = data.length;
        var gData = [];
        for(var i = 0; i < len; i++){
          gData.push({
            label:data[i].Prefix, value:parseInt(data[i].Count)
          });
        }
        $scope.preWithdrawsData[0].values = gData;
        console.dir($scope.preWithdrawsData[0].values);
      })
      .error(function (error){
        console.log(error.message);
      });

  }]);