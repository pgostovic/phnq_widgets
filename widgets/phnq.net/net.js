depend("ext.json2");

window.phnq = window.phnq || {};

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

var sameDomain = location.href.indexOf(phnq_core.baseURI) == 0;

var req = function(method, url, data, fn, errorFn)
{
    errorFn = errorFn || fn;

    if(!url.match(/^https?:\/\//))
        url = phnq_core.baseURI + url;

    if(sameDomain) // use XHR
    {
        $.ajax(
        {
            url: url,
            type: method,
            data: method == "POST" ? JSON.stringify(data) : data,
            dataType: "json",
            contentType: "application/json; charset=utf-8"
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
