'use strict';

/**
 * @ngdoc function
 * @name bmpUiApp.controller:SecurityAnalysisController
 * @description
 * # SecurityAnalysisController
 * Controller of the Security Analysis page
 */
angular.module('bmpUiApp')
  .controller('SecurityAnalysisController', ['$scope', 'apiFactory', '$http', '$timeout', function ($scope, apiFactory, $http, $timeout) {

    $scope.securityGridInitHeight = 350;

    var paginationOptions = {
      page: 1,
      pageSize: 1000,
      sort: null,
      desc: null
    };

    var searchOptions = {
      asn: null,
      prefix: null,
      where: null
    };

    var rowTemplate = `
    <div class='tableRow hover-row-highlight' ng-class="[(row.entity.rpki_origin_as != 0 &&row.entity.recv_origin_as != row.entity.rpki_origin_as)
      || (row.entity.irr_origin_as != 0 && row.entity.recv_origin_as != row.entity.irr_origin_as) ? 'red' : '', row.entity.prefixClass]">
      <div ng-repeat="col in colContainer.renderedColumns track by col.colDef.name" class="ui-grid-cell" ui-grid-cell>
      </div>
    </div>
    `;

    $(document).on('mouseover', '.tableRow', function(){
      var classList = $(this).attr('class').split(' ');
      var prefix = classList[classList.length - 1];

      $("."+prefix).find('.ui-grid-cell').css('background-color', '#d9d9d9 !important');
    }).on('mouseleave', '.tableRow', function(){
      var classList = $(this).attr('class').split(' ');
      var prefix = classList[classList.length - 1];
      $("."+prefix).find('.ui-grid-cell').css('background-color', '');
    });

    $scope.securityGridOptions = {
      rowHeight: 25,
      showGridFooter: true,
      height: $scope.securityGridInitHeight,
      enableHorizontalScrollbar: 0,
      paginationPageSize: paginationOptions.pageSize,
      paginationPageSizes: [1000, 2000, 3000],
      enablePaginationControls: true,
      useExternalPagination: true,
      useExternalSorting: true,
      enableRowSelection: true,
      enableRowHeaderSelection: false,
      multiSelect: false,
      rowTemplate: rowTemplate,
      columnDefs: [
        {name: "prefixWithLen", displayName: 'Prefix/Len', width: '*'},
        {name: "recv_origin_as", displayName: 'Recv Origin AS', width: '*', cellFilter: 'zeroFilter'},
        {name: "rpki_origin_as", displayName: "RPKI Origin AS", width: "*", cellFilter: 'zeroFilter'},
        {name: 'irr_origin_as', displayName: 'IRR Origin AS', width: "*", cellFilter: 'zeroFilter'},
        {name: 'irr_source', displayName: "IRR Origin AS", width: "*"}
      ],
      onRegisterApi: function(gridApi) {
        $scope.gridApi = gridApi;
        gridApi.pagination.on.paginationChanged($scope, function(newPage, pageSize) {
          paginationOptions.page = newPage;
          paginationOptions.pageSize = pageSize;
          getMismatchPrefix();
        });

        gridApi.core.on.sortChanged($scope, function(grid, sortColumns) {
          if (sortColumns.length == 0) {
            paginationOptions.sort = null;
          } else {
            paginationOptions.sort = sortColumns[0].name;
            paginationOptions.desc = (sortColumns[0].sort.direction == 'desc');
          }
          getMismatchPrefix();
        });
      }
    };

    function getMismatchPrefix() {
      $scope.securityIsLoad = true;
      apiFactory.getMisMatchPrefix(paginationOptions.page, paginationOptions.pageSize,
        paginationOptions.sort, paginationOptions.desc, searchOptions.asn, searchOptions.prefix, searchOptions.where)
        .success(function(res) {
          var data = res.gen_prefix_validation.data;
          data.forEach(function(value){
            value.prefixWithLen = value.prefix + '/' + value.prefix_len;
            value.prefixClass = value.prefix.replace(/\./g, '-') + '-' + value.prefix_len;
          });
          $scope.securityGridOptions.data = data;
          $scope.securityIsLoad = false;
        })
        .error(function(err){
          console.log(err.message);
        });
      apiFactory.getTotalCount(searchOptions.asn, searchOptions.prefix)
        .success(function(data) {
          if (!$.isEmptyObject(data)) {
            $scope.securityGridOptions.totalItems = data['table']['data'][0]['total'];
          }
        })
        .error(function(err) {
          console.log(err.message);
        });
    }

    $scope.search = function(keyword) {
      // initial clean
      searchOptions.asn = null;
      searchOptions.prefix = null;
      $timeout(function(){
        if($.isEmptyObject(keyword)) {
          searchOptions.asn = null;
          searchOptions.prefix = null;
        } else if(keyword.indexOf('.') != -1 || keyword.indexOf(':') != -1) {
          // search for prefix
          searchOptions.prefix = keyword;
        } else if(keyword.toLowerCase().indexOf('where') != -1 ) {
          // where clause
          searchOptions.where = keyword;
        } else if(!isNaN(keyword)) {
          // asn
          searchOptions.asn = keyword;
        }
        getMismatchPrefix();
      }, 800);

    };

    getMismatchPrefix();

  }])
  .filter('zeroFilter', function() {
    // display '-' instead of 0
    return function(value) {
      return value == 0 ? '-' : value;
    }
  });
