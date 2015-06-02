'use strict';

angular.module('bmp.components.card')

  .controller('BmpCardPeerController', ["$scope", "apiFactory", "timeFactory", "cardFactory", function ($scope, apiFactory, timeFactory, cardFactory) {


    window.GPEERSCO = $scope;

    console.log($scope.data.peer_hash_id);

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
      ["Pre Rib", 0, "bmp-prerib"],
      ["Post Rib", 0, "bmp-postrib"]
    ];
    $scope.filterRate = 0.00;

    apiFactory.getPeerPrefixByHashId($scope.data.peer_hash_id).
      success(function (result){
        peerPrefix = result.v_peer_prefix_report_last.data;
        //atm this grabs first data item (may not be correct)
        try{
          $scope.ribData[0][1] = peerPrefix[0].Pre_RIB;
          $scope.ribData[1][1] = peerPrefix[0].Post_RIB;

          if(peerPrefix[0].Post_RIB == peerPrefix[0].Pre_RIB)
            $scope.filerRate = 0.00;
          else
            $scope.filterRate = Math.floor(((peerPrefix[0].Post_RIB/ peerPrefix[0].Pre_RIB ) * 100) * 100) / 100;

        }catch(err){
          //catch if RIB is undefined
        }
      }).
      error(function (error){
        console.log(error.message);
      });

    $scope.summaryPeerOptions = {
      enableRowSelection: true,
      enableRowHeaderSelection: false,
      columnDefs:[
        {name: "asn", displayName: 'AS Number', width: '*'},
        {name: "as_name", displayName: 'AS Name', width: '*'},
        {name: "org_name", displayName:'Organization', width: '*'}
      ]
    };
    var summaryPeerOptionsDefaultData = [{"as_name":"-","asn":"-","org_name":"-"}];

    $scope.summaryPeerOptions.multiSelect = false;
    $scope.summaryPeerOptions.modifierKeysToMultiSelect = false;
    $scope.summaryPeerOptions.noUnselect = false;

    $scope.summaryPeerOptions.onRegisterApi = function (gridApi) {
      $scope.summaryPeerOptionsApi= gridApi;
    };

    $scope.summaryPeerOptions.gridIsLoading = true;

    $scope.calGridHeight = function(grid, gridapi){
      gridapi.core.handleWindowResize();

      var height;
      if(grid.data.length > 10){
        height = ((10 * 30) + 30);
      }else{
        height = ((grid.data.length * 30) + 50);
      }
      grid.changeHeight = height;
      gridapi.grid.gridHeight = grid.changeHeight;
    };

    $scope.$watch('cardExpand', function(val) {
      if($scope.cardExpand == true){
        setTimeout(function(){
          $scope.calGridHeight($scope.summaryPeerOptions, $scope.summaryPeerOptionsApi);
        },10)
      }
    });

    //DownstreamAS, as_name, and org_name (working)
    $scope.peerDownData = [];
    apiFactory.getPeerDownStream($scope.data.peer_hash_id).
      success(function (result){
        if(result.downstreamASN.size == 0){
          $scope.summaryPeerOptions.data = summaryPeerOptionsDefaultData;
        }else {
          $scope.summaryPeerOptions.data = result.downstreamASN.data;
        }
        $scope.summaryPeerOptions.gridIsLoading = false; //stop loading
        $scope.calGridHeight($scope.summaryPeerOptions, $scope.summaryPeerOptionsApi);
      }).
      error(function (error){
        console.log(error.message);
      });


    if($scope.data.isUp){
      $scope.peerTimeText = "Peer Up Time";
      $scope.peerTime = timeFactory.calTimeFromNow($scope.data.LastModified);
    }else{
      $scope.peerTimeText = "Peer Down Time";
      $scope.peerTime = timeFactory.calTimeFromNow($scope.data.LastDownTimestamp);
    }

    $scope.peerFullIp = $scope.data.PeerIP;
    if($scope.data.isPeerIPv4 == "1"){
      //is ipv4 so add ' :<port'
      $scope.peerFullIp = $scope.data.PeerIP + ":" + $scope.data.PeerPort;
    }

    $scope.rpIconData = {
      RouterName: $scope.data.RouterName,
      RouterIP: $scope.data.RouterIP,
      RouterASN: $scope.data.LocalASN,
      PeerName: $scope.data.PeerName,
      PeerIP: $scope.peerFullIp,
      PeerASN: $scope.data.PeerASN
    };

    $scope.locationInfo = cardFactory.createLocationTable({
        stateprov: $scope.data.stateprov,
        city: $scope.data.city,
        country: $scope.data.country,
        type: $scope.data.type
    });

  }]);
