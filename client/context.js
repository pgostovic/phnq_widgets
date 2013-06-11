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
			return getI18nString(this.type, key, locale) || defaultValue || "[MISSING_STRING("+locale+", "+this.type+") - "+key+"]";;
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

	var getI18nString = function(type, key, locale, localeOrig)
	{
		var widgetClasses = phnq_widgets.widgetClasses;

		localeOrig = localeOrig || locale;

		var i18nStrings = widgetClasses[type].prototype._i18nStrings;

		if(i18nStrings[locale] && i18nStrings[locale][key])
			return i18nStrings[locale][key];

		if(locale)
			return getI18nString(type, key, getParentLocale(locale), localeOrig);

		var deps = widgetClasses[type].prototype._dependencies;
		for(var i=0; i<deps.length; i++)
		{
			var str = getI18nString(deps[i], key, localeOrig);
			if(str)
				return str;
		}

		return null;
	};

	var getParentLocale = function(locale)
	{
		var comps = locale.split(/[_-]/);
		if(comps.length > 1)
		{
			comps.pop();
			return comps.join("_");
		}
		else
		{
			return null;
		}
	};

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
