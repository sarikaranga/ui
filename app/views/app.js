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
    'ui.grid.resizeColumns',
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
        templateUrl: 'views/Login/login.html',
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
        url: '/global-view',
        templateUrl: 'views/globalView/globalView.html',
        controller: 'GlobalViewController'
      })
      .state('app.peerView', {
        url: '/peer-view',
        templateUrl: 'views/peerView/peerView.html',
        controller: 'PeerViewController'
      })
      .state('app.asView', {
        url: '/AS-view',
        templateUrl: 'views/asView/asView.html',
        controller: 'ASViewController'
      })
      .state('app.linkState', {
        url: '/link-state-view',
        templateUrl: 'views/linkState/linkState.html',
        controller: 'linkStateController'
      })
      .state('app.orrView', {
        url: '/orr-view',
        templateUrl: 'views/orrView/orrView.html',
        controller: 'orrViewController'
      })
      .state('app.peerAnalysis', {
        url: '/peer-analysis',
        templateUrl: 'views/peeranalysis/peeranalysis.html',
        controller: 'PeerAnalysisController'
      })
      .state('app.asAnalysis', {
        url: '/AS-analysis',
        templateUrl: 'views/asAnalysis/asAnalysis.html',
        controller: 'ASAnalysisController'
      })
      .state('app.prefixAnalysis', {
        url: '/prefix-analysis',
        templateUrl: 'views/prefixanalysis/prefixanalysis.html',
        controller: 'PrefixAnalysisController'
      })
      .state('app.whoIs', {
        url: '/whois',
        templateUrl: 'views/whois/whois.html',
        controller: 'WhoIsController'
      })
      .state('app.collectionServer', {
        url: '/collection-server',
        templateUrl: 'views/collectionServer/collectionServer.html',
        controller: 'CollectionServerController'

      })
      .state('app.preferences', {
        url: '/preferences',
        templateUrl: 'views/preferences/preferences.html',
        controller: 'PreferencesController'
      })
      .state('app.aggregationAnalysis', {
        url: '/aggregation-analysis',
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
