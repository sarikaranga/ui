'use strict';

/**
 * @ngdoc overview
 * @name bmpUiApp
 * @description
 * # bmpUiApp
 *
 * Main module of the application.
 */
angular
  .module('bmpUiApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ui.router',
    'nvd3',
    'ui.grid',
    'ui.grid.selection',
    'ui.grid.autoResize',
    'bmp.components.cardList',
    'bmp.components.card',
    'ui.bootstrap',
    'bgDirectives',
    'leaflet-directive',
    'bmp.components.map'
  ])
  .config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/login");
    $stateProvider
      .state('login', {
        url: '/login',
        templateUrl: 'views/login/login.html',
        controller: 'LoginController',
        data: {
          requireLogin: false
        }
      })

      //CARD TEST
      .state('app.card', {
        url: '/card',
        templateUrl: 'views/cardTest/cardTest.html',
        controller: 'CardController',
        data: {
          requireLogin: false
        }
      })

      .state('app.cardChange', {
        url: '/cardC',
        templateUrl: 'views/cardChanges/cardChanges.html',
        controller: 'CardChangesController',
        data: {
          requireLogin: false
        }
      })
      //END CARD TEST

      .state('app', {
        abstract: true,
        templateUrl: 'views/container/container.html',
        controller: 'MainController',
        data: {
          requireLogin: true
        }
      })
      .state('app.globalView', {
        url: '/Global-View',
        templateUrl: 'views/globalView/globalView.html',
        controller: 'GlobalViewController'
      })
      .state('app.peerView', {
        url: '/Peer-View',
        templateUrl: 'views/peerView/peerView.html',
        controller: 'PeerViewController'
      })
      .state('app.asView', {
        url: '/AS-View',
        templateUrl: 'views/asView/asView.html',
        controller: 'ASViewController',
      })
      .state('app.linkState', {
        url: '/Link-State-View',
        templateUrl: 'views/linkState/linkState.html',
        controller: 'linkStateController',
      })
      .state('app.peerAnalysis', {
        url: '/Peer-Analysis',
        templateUrl: 'views/peerAnalysis/peerAnalysis.html',
        controller: 'PeerAnalysisController'
      })
      .state('app.asAnalysis', {
        url: '/AS-Analysis',
        templateUrl: 'views/asAnalysis/asAnalysis.html',
        controller: 'ASAnalysisController'
      })
      /*.state('app.aggregationAnalysis', {
        url: '/Aggregation-Analysis',
        templateUrl: 'views/aggregationAnalysis/aggregationAnalysis.html',
        controller: 'AggregationAnalysisController'
      })*/
      .state('app.prefixAnalysis', {
        url: '/Prefix-Analysis',
        templateUrl: 'views/prefixAnalysis/prefixAnalysis.html',
        controller: 'PrefixAnalysisController'
      })
      .state('app.whoIs', {
        url: '/Who-Is',
        templateUrl: 'views/whoIs/whoIs.html',
        controller: 'WhoIsController'
      })
      .state('app.collectionServer', {
        url: '/Collection-Server',
        templateUrl: 'views/collectionServer/collectionServer.html',
        controller: 'CollectionServerController'

      })
      .state('app.preferences', {
        url: '/Preferences',
        templateUrl: 'views/preferences/preferences.html',
        controller: 'PreferencesController'
      })
      .state('app.aggregationanalysis', {
        url: '/Aggregation-Analysis',
        templateUrl: 'views/aggregationanalysis/aggregationanalysis.html',
        controller: 'aggregationanalysisController'
      });
  })
  .run(function ($rootScope, $state, $cookies) {
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
      var requireLogin = toState.data.requireLogin;
      if (requireLogin && typeof $cookies.username === 'undefined') {
        event.preventDefault();
        $state.transitionTo('login');
      }
    });
  });
