phnq.net =
{
    getJSON: function(url, params, fn, errorFn)
    {
        req("GET", url, params, fn, errorFn);
    },
    
    postJSON: function(url, obj, fn, errorFn)
    {
        req("POST", url, obj, fn, errorFn);
    }
};

var hostPortRe = /^(https?):\/\/([^\/:]*)(:(\d*))?.*$/;
var pageHostPortM = hostPortRe.exec(location.href);
var pageScheme = pageHostPortM[1];
var pageHost = pageHostPortM[2];
var pagePort = pageHostPortM[4] || (pageScheme == "http" ? 80 : 443);

var isSameOriginAsPage = function(url)
{
    var urlHostPortM = hostPortRe.exec(url);
    var urlScheme = urlHostPortM[1];
    var urlHost = urlHostPortM[2];
    var urlPort = urlHostPortM[4] || (urlScheme == "http" ? 80 : 443);
    return urlScheme == pageScheme && urlHost == pageHost && urlPort == pagePort;
};

var req = function(method, url, data, fn, errorFn)
{
    errorFn = errorFn || fn;

    if(!url.match(/^https?:\/\//))
        url = phnq_core.baseURI + url;

    if(isSameOriginAsPage(url)) // use XHR
    {
        $.ajax(
        {
            url: url,
            type: method,
            data: method == "POST" ? JSON.stringify(data) : data,
            dataType: "json",
            contentType: method == "POST" ? "application/json; charset=utf-8" : undefined
        }).success(function(resp, status, xhr)
        {
            fn(resp, xhr.status);
        }).error(function(resp, status, xhr)
        {
            errorFn(resp, xhr.status);
        });
    }
    else // use JSONP
    {
        url = url + "?jsoncallback=?"; // assume now Q params in url for now...
        
        var params = (method == "POST" || method == "PUT") ?
        {
            jsonmethod:  method,
            jsonbody: JSON.stringify(data)
        } : data;
        
        $.getJSON(url, params, function(resp)
        {
            if(resp.status == 200)
                fn(resp.data, resp.status);
            else
                errorFn(resp.data, resp.status)
        });
    }
};
