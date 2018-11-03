
angular.module('rhdemo').controller('NewPessoaController', function ($scope, $location, locationParser, flash, PessoaResource ) {
    $scope.disabled = false;
    $scope.$location = $location;
    $scope.pessoa = $scope.pessoa || {};
    

    $scope.save = function() {
        var successCallback = function(data,responseHeaders){
            var id = locationParser(responseHeaders);
            flash.setMessage({'type':'success','text':'The pessoa was created successfully.'});
            $location.path('/Pessoas');
        };
        var errorCallback = function(response) {
            if(response && response.data) {
                flash.setMessage({'type': 'error', 'text': response.data.message || response.data}, true);
            } else {
                flash.setMessage({'type': 'error', 'text': 'Something broke. Retry, or cancel and start afresh.'}, true);
            }
        };
        PessoaResource.save($scope.pessoa, successCallback, errorCallback);
    };
    
    $scope.cancel = function() {
        $location.path("/Pessoas");
    };
});