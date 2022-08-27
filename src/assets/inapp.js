var inAPP = (function () {

    var loginCallback;

    function open(URL, appScope, callback, options) {
        loginCallback = callback;
        var redirect_uri_success = "//Success";
        var redirect_uri_failure = "//Success";
        var browserRef = window.open(URL, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
        browserRef.addEventListener('loadstart', function (event) {

            alert(event)
            // if ((event.url).indexOf(redirect_uri_success) === 0) {
            //     browserRef.removeEventListener("exit", function (event) {
            //     });
            //     browserRef.close();
            //     var name = 'code';
            //     name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
            //     var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
            //     var results = regex.exec(event.url);
            //     var output = results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
            //     if (output != '') {
            //         loginCallback({ status: 'connected', authResponse: { code: output } })
            //     } else {
            //         loginCallback({ status: 'Problem authenticating' })
            //     }

            // }

        });
        browserRef.addEventListener('exit', function (event) {
            loginCallback({ status: 'closed' })
        });


    }


    // The public API
    return {
        open: open
    }

}());