var log = require("phnq_log").create(__filename);
var phnq_core = require("phnq_core");
var config = require("./config");
var widgetManager = require("./widget_manager").instance();

var nextIdIdx = 0;

module.exports = phnq_core.clazz(
{
	init: function(theWidget, req)
	{
		this.theWidget = theWidget;
		if(req)
		{
			this.query = req.query;
			this.headers = req.headers;
		}
		else
		{
			this.query = {};
			this.headers = {};
		}
		this.params = {};
		this.embedded = [];
        this.model = this.model || {};
	},

	i18n: function(key, defaultValue)
	{
		var locale = "en";
		var acceptLang = this.headers["accept-language"];
		if(acceptLang)
		{
			locale = acceptLang.split(",")[0];
			locale = locale.split(";")[0];
		}
		var currentWidget = this.embedded.length == 0 ? this.theWidget : widgetManager.getWidget(this.embedded[this.embedded.length-1]);
		return currentWidget.getI18nString(key, locale) || defaultValue || "[MISSING_STRING("+locale+", "+currentWidget.type+") - "+key+"]";
	},

	nextId: function()
	{
		return config.idPrefix + (nextIdIdx++);
	},

	fixUrl: function(type, url)
	{
		// If url starts with http/https or /, then return as is...
		if(url.match(/^(https?:\/\/|\/)/))
			return url;
		else
			return config.uriPrefix + "/" + type + "/" + url;
	},

	widget: function(type /* , params, bodyFn */)
	{
		var params=null, bodyFn=null;

		for(var i=1; i<arguments.length; i++)
		{
			if(!params && typeof(arguments[i]) == "object")
				params = arguments[i];
			else if(!bodyFn && typeof(arguments[i]) == "function")
				bodyFn = arguments[i];
		}

		params = params || {};
		var isLazy = !!params._lazy;

		if(bodyFn)
		{
			if(isLazy)
				throw "A widget with a body function may not be loaded lazily: "+type;

			var buf = [];
			bodyFn(buf);
			this.body = buf.join("");
		}

		this.params = params;

		var markup;
		if(isLazy)
		{
			markup = "<span class=\"wph "+type+"\"><!--"+JSON.stringify(this.params)+"--><br/></span>";
		}
		else
		{
			this.embedded.push(type);
			var widget = widgetManager.getWidget(type);
			markup = widget.getMarkup(this);
			if(!markup)
				markup = "";

			this.embedded.pop();
		}

		this.params = {};
		this.body = null;

		return markup;
	}
});
