'use strict';

angular.module('rhdemo',['ngRoute','ngResource'])
  .config(['$routeProvider', function($routeProvider) {
    $routeProvider
      .when('/',{templateUrl:'views/landing.html',controller:'LandingPageController'})
      .when('/Pessoas',{templateUrl:'views/Pessoa/search.html',controller:'SearchPessoaController'})
      .when('/Pessoas/new',{templateUrl:'views/Pessoa/detail.html',controller:'NewPessoaController'})
      .when('/Pessoas/edit/:PessoaId',{templateUrl:'views/Pessoa/detail.html',controller:'EditPessoaController'})
      .otherwise({
        redirectTo: '/'
      });
  }])
  .controller('LandingPageController', function LandingPageController() {
  })
  .controller('NavController', function NavController($scope, $location) {
    $scope.matchesRoute = function(route) {
        var path = $location.path();
        return (path === ("/" + route) || path.indexOf("/" + route + "/") == 0);
    };
  });
