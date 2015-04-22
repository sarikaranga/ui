'use strict';

angular.module('bmp.components.card')

.controller('BmpCardPeerPeerController', ["$scope", "apiFactory", function ($scope, apiFactory) {
    window.SCOPEZ = $scope;

    //This can probably be moved so dont repeat.
    var createLocationTable = function(){
      if ($scope.data.stateprov !== undefined || $scope.data.city !== undefined || $scope.data.country !== undefined) {
        var type;
        if ($scope.cardType == "global.router") {
          type = "BMP Router";
        } else if ($scope.cardType == "global.peer") {
          type = "Peer";
        } else {
          type = "None";
        }
        $scope.locationInfo = (
        '<table class="routerLoc">' +
        ' <tr>' +
        '   <td>Type</td>' +
        '   <td>' + type + '</td>' +
        ' </tr>' +
        ' <tr>' +
        '   <td>Location</td>' +
        '   <td>' + $scope.data.City + '</td>' +
        ' </tr>' +
        ' <tr>' +
        '   <td>State</td>' +
        '   <td>' + $scope.data.State + '</td>' +
        ' </tr>' +
        ' <tr>' +
        '   <td>Country</td>' +
        '   <td>' + $scope.data.Country + '</td>' +
        ' </tr>' +
        '</table>'
        );
      } else {
        //DEFAULT Data
        $scope.locationInfo = "<table class='routerLoc noRouterLoc'><tr><td>There is no Location Data ...</td></tr></table>";
      }
    };

    //  PEER DATA
    //  {
    //  "RouterName":"csr1.openbmp.org",     //  "RouterIP":"173.39.209.78",
    //  "LocalIP":"192.168.255.32",          //  "LocalPort":17404,
    //  "LocalASN":65000,                    //  "LocalBGPId":"192.168.255.32",
    //  "PeerName":"lo-0.edge5.Washington1.Level3.net",
    //  "PeerIP":"4.68.1.197",               //  "PeerPort":179,
    //  "PeerASN":3356,                      //  "PeerBGPId":"4.68.1.197",
    //  "LocalHoldTime":180,                 //  "PeerHoldTime":90,
    //  "isUp":1,                            //  "isBMPConnected":1,
    //  "isPeerIPv4":1,                      //  "isPeerVPN":0,
    //  "isPrePolicy":1,                     //  "LastBMPReasonCode":null,
    //  "LastDownCode":0,                    //  "LastdownSubCode":0,
    //  "LastDownMessage":null,              //  "LastDownTimestamp":null,
    //  "SentCapabilities":"MPBGP (1) : afi=1 safi=1 : Unicast IPv4, Route Refresh Old (128), Route Refresh (2), Route Refresh Enhanced (70), 4 Octet ASN (65)",
    //  "RecvCapabilities":"MPBGP (1) : afi=1 safi=1 : Unicast IPv4, Route Refresh (2), Route Refresh Old (128), Graceful Restart (64), 4 Octet ASN (65)",
    //  "peer_hash_id":"c33f36c12036e98d89ae3ea54cce0be2",
    //  "router_hash_id":"0314f419a33ec8819e78724f51348ef9"
    // }

    //peer stuff here
    var peerPrefix;
    $scope.ribData = [
      ["Pre Rib", 0],
      ["Post Rib", 0]
    ];
    apiFactory.getPeerPrefixByHashId($scope.data.peer_hash_id).
      success(function (result){
        peerPrefix = result.v_peer_prefix_report_last.data;
        //atm this grabs first data item (may not be correct)
        try{
          $scope.ribData[0][1] = peerPrefix[0].Pre_RIB;
          $scope.ribData[1][1] = peerPrefix[0].Post_RIB;
        }catch(err){
          //catch if RIB is undefined
        }
      }).
      error(function (error){
        console.log(error.message);
      });


    //Redraw Tables when menu state changed
  /*  $scope.$on('menu-toggle', function(thing, args) {
      $timeout( function(){
        resize();
      }, 550);
    });*/

    $scope.peerViewPeerOptions = {
      enableRowSelection: true,
      enableRowHeaderSelection: false
    };

    $scope.peerViewPeerOptions.columnDefs = [
      {name: "DownstreamAS", displayName: 'AS Number', width: '*'},
      {name: "as_name", displayName: 'AS Name', width: '*'},
      {name: "org_name", displayName:'Organization', width: '*'}
    ];
    var peerViewPeerDefaultData = [{"as_name":"NO DATA"}];
    $scope.peerViewPeerOptions.onRegisterApi = function (gridApi) {
      $scope.peerViewPeerApi= gridApi;
    };

    $scope.$watch('cardExpand', function(val) {
      if($scope.cardExpand == true){
        setTimeout(function(){
          //$scope.peerViewPeerApi.core.handleWindowResize();
          $scope.calGridHeight();
        },10)
      }
    });


    $scope.calGridHeight = function(){
      $scope.peerViewPeerApi.core.handleWindowResize();

      var height;
      if($scope.peerViewPeerOptions.data.length > 10){
        height = ((10 * 30) + 30);
      }else{
        height = (($scope.peerViewPeerOptions.data.length * 30) + 50);
      }
      $scope.height = height;
      $scope.peerViewPeerApi.grid.gridHeight = $scope.height;
    };

    //DownstreamAS, as_name, and org_name (working)
    $scope.peerDownData = [];
    apiFactory.getPeerDownStream($scope.data.peer_hash_id).
      success(function (result){
        //var peerDown
        if(result.peerDownstreamASN.data.length == 0){
          $scope.peerViewPeerOptions.data = peerViewPeerDefaultData;
        }else {
          $scope.peerViewPeerOptions.data = result.peerDownstreamASN.data;
        }
        $scope.peerViewPeerApi.core.handleWindowResize();

        for(var i = 0; i<$scope.peerViewPeerOptions.length; i++) {
          var data = $scope.peerViewPeerOptions[i];
          if (data.org_name == "" || data.org_name === null) {
            data.org_name = "-";
          }
          $scope.peerDownData.push({
            DownstreamAS: data.DownstreamAS,
            as_name: data.as_name,
            org_name: data.org_name
          });
        }

        if($scope.peerDownData.length < 1){
           //  No data
           $scope.peerDownData.push({
             DownstreamAS: "None",
             as_name: "None",
             org_name: "None"
           });
         }

      }).
      error(function (error){
        console.log(error.message);
      });


    $scope.downTime = ($scope.data.LastDownTimestamp === null)? "Up":$scope.data.LastDownTimestamp;

    $scope.peerFullIp = $scope.data.PeerIP;
    if($scope.data.isPeerIPv4 == "1"){
      //is ipv4 so add ' :<port>'
      $scope.peerFullIp = $scope.data.PeerIP + " :" + $scope.data.PeerPort;
    }


    //  "RouterName": "csr1.openbmp.org",
    //  "PeerName": "lo-0.edge5.Washington1.Level3.net",
    //  "Prefix": "216.40.30.0",
    //  "PrefixLen": 23,
    //  "Origin": "igp",
    //  "Origin_AS": 4306,
    //  "MED": 0,
    //  "LocalPref": 0,
    //  "NH": "4.68.1.197",
    //  "AS_Path": " 3356 3257 4436 4436 4436 4436 6450 4306",
    //  "ASPath_Count": 8,
    //  "Communities": "3257:3257 3356:3 3356:22 3356:86 3356:575 3356:666 3356:2006",
    //  "ExtCommunities": "",
    //  "ClusterList": "",
    //  "Aggregator": "",
    //  "PeerAddress": "4.68.1.197",
    //  "PeerASN": 3356,
    //  "isPeerIPv4": "1",
    //  "isPeerVPN": "0",
    //  "LastModified": "2015-04-16 17:53:41"

    $scope.ribGridOptions = {
      enableRowSelection: true,
      enableRowHeaderSelection: false
    };
    //
    $scope.ribGridOptions.columnDefs = [
      {name: "Prefix", displayName: 'Prefix', width: "15%"},
      {name: "NH", displayName: 'NH', width: "15%"},
      {name: "AS_Path", displayName: 'AS Path'},
      {name: "MED", displayName: 'MED', width: "10%"},
      {name: "LocalPref", displayName: 'Local Pref', width: "10%"}
    ];

    $scope.ribGridOptions.multiSelect = false;
    $scope.ribGridOptions.noUnselect = true;
    $scope.ribGridOptions.modifierKeysToMultiSelect = false;
    $scope.ribGridOptions.rowTemplate = '<div ng-click="grid.appScope.ribGridSelection();" ng-repeat="col in colContainer.renderedColumns track by col.colDef.name" class="ui-grid-cell" ui-grid-cell></div>';
    $scope.ribGridOptions.onRegisterApi = function (gridApi) {
      $scope.ribGridApi= gridApi;
    };

    $scope.getRibData = function() {
      apiFactory.getPeerRib($scope.data.peer_hash_id).
        success(function (result) {
          $scope.ribGridOptions.data = result.v_routes.data;
          $scope.ribGridApi.core.handleWindowResize();
        }).
        error(function (error) {
          console.log(error.message);
        });
    };

    $scope.ribGridSelection = function(){
      $scope.values = $scope.ribGridApi.selection.getSelectedRows()[0];
      apiFactory.getPeerGeo($scope.values.Prefix).
        success(function (result) {
          $scope.values.geo = result.v_geo_ip.data;
        }).
        error(function (error) {
          console.log(error.message);
        });
    };


    createLocationTable();

}]);
