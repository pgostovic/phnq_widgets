phnq_log.exec("context", function(log)
{
	var nextIdIdx = 0;

	phnq_widgets.Context = phnq_core.clazz(
	{
		init: function(type, params)
		{
			this.type = type;
			this.params = params;
			this.query = getQueryParams();
		},

		widget: function(type, params)
		{
			return $().widgets("wph", type, params);
		},

		nextId: function()
		{
			return phnq_widgets.config.idPrefixClient + (nextIdIdx++);
		},

		i18n: function(key, defaultValue)
		{
			var locale = $("html").attr("lang");
			return phnq_widgets.getI18nString(this.type, key) || defaultValue || "[MISSING_STRING("+locale+", "+this.type+") - "+key+"]";;
		},

		fixUrl: function(type, url)
		{
			// If url starts with http/https or /, then return as is...
			if(url.match(/^(https?:\/\/|\/)/))
				return url;
			else
				return phnq_widgets.config.uriPrefix + "/" + type + "/" + url;
		}
	});

	var queryParams = null;
	var getQueryParams = function()
	{
		if(!queryParams)
		{
			queryParams = {};
			if(location.search.match(/^\?/))
			{
				$(location.search.substring(1).split("&")).each(function()
				{
					var nvp = this.split("=");
					if(nvp.length == 2)
						queryParams[nvp[0]] = unescape(nvp[1]);
				});
			}
		}
		return queryParams;
	};
});
