

angular.module('rhdemo').controller('EditPessoaController', function($scope, $routeParams, $location, flash, PessoaResource ) {
    var self = this;
    $scope.disabled = false;
    $scope.$location = $location;
    
    $scope.get = function() {
        var successCallback = function(data){
            self.original = data;
            $scope.pessoa = new PessoaResource(self.original);
        };
        var errorCallback = function() {
            flash.setMessage({'type': 'error', 'text': 'The pessoa could not be found.'});
            $location.path("/Pessoas");
        };
        PessoaResource.get({PessoaId:$routeParams.PessoaId}, successCallback, errorCallback);
    };

    $scope.isClean = function() {
        return angular.equals(self.original, $scope.pessoa);
    };

    $scope.save = function() {
        var successCallback = function(){
            flash.setMessage({'type':'success','text':'The pessoa was updated successfully.'}, true);
            $scope.get();
        };
        var errorCallback = function(response) {
            if(response && response.data && response.data.message) {
                flash.setMessage({'type': 'error', 'text': response.data.message}, true);
            } else {
                flash.setMessage({'type': 'error', 'text': 'Something broke. Retry, or cancel and start afresh.'}, true);
            }
        };
        $scope.pessoa.$update(successCallback, errorCallback);
    };

    $scope.cancel = function() {
        $location.path("/Pessoas");
    };

    $scope.remove = function() {
        var successCallback = function() {
            flash.setMessage({'type': 'error', 'text': 'The pessoa was deleted.'});
            $location.path("/Pessoas");
        };
        var errorCallback = function(response) {
            if(response && response.data && response.data.message) {
                flash.setMessage({'type': 'error', 'text': response.data.message}, true);
            } else {
                flash.setMessage({'type': 'error', 'text': 'Something broke. Retry, or cancel and start afresh.'}, true);
            }
        }; 
        $scope.pessoa.$remove(successCallback, errorCallback);
    };
    
    
    $scope.get();
});