require("phnq_log").exec("widget", function(log)
{
	var phnq_core = require("phnq_core");
	var phnq_ejs = require("phnq_ejs");
	var _path = require("path");
	var _fs = require("fs");

	module.exports = phnq_core.clazz(
	{
		init: function(dir)
		{
			this.type = _path.basename(dir);
			this.dir = dir;
			log.debug("discovered widget: ", this.type);
		},

		getScript: function()
		{
			if(!this.script)
			{
				this.script = this.getFileData("js");
			}
			return this.script;
		},

		getStyle: function()
		{
			if(!this.style)
			{
				this.style = this.getFileData("css");
			}
			return this.style;
		},

		getCompiledMarkup: function()
		{
			if(!this.compiledMarkup)
			{
				var _this = this;
				var ejs = this.getFileData("ejs");
				var sax = require("sax");
				var parser = sax.parser(true);
				var buf = [];
				var bufLen = 0;
				var rootTag = true;

				parser.onopentag = function(node)
				{
					if(rootTag)
					{
						var classes = (node.attributes["class"] || "").trim().split(/\s*/);
						classes.push(_this.type);
						node.attributes["class"] = classes.join(" ");
					}

					buf.push("<"+node.name);
					for(var k in node.attributes)
					{
						var v = _this.absolutizePathIfNeeded("", node.name, k, node.attributes[k]);
						buf.push(" "+k+"=\""+v+"\"");
					}
					buf.push(">");
					bufLen = buf.length;
					rootTag = false;
				};

				parser.onclosetag = function(tagName)
				{
					if(bufLen == buf.length)
					{
						buf.pop();
						buf.push("/>");
					}
					else
					{
						buf.push("</"+tagName+">");
					}
				};

				parser.ontext = function(text)
				{
					buf.push(text);
				};

				parser.write(ejs);

				ejs = buf.join("");

				this.compiledMarkup = phnq_ejs.compile(ejs);
			}
			return this.compiledMarkup;
		},

		getFileData: function(ext)
		{
			if(!this[ext+"File"])
				return null;

			return _fs.readFileSync(this[ext+"File"], "UTF-8");
		},

		absolutizePathIfNeeded: function(tagUri, tagName, attrName, attrValue)
		{
			switch(tagUri + ":" + tagName+":"+attrName)
			{
				case ":img:src":
					return require("phnq_widgets").prefix + "/" + this.type + "/" + attrValue;
					break;
			}
			return attrValue;
		},

		getWidgetShellCode: function(context)
		{
			var title = this.type;

			var markupFn = eval(this.getCompiledMarkup());
			var markup = markupFn(context);

			var shellFn = eval(getCompiledShellMarkup());
			var shellCode = shellFn(
			{
				title: title,
				prefix: require("phnq_widgets").prefix,
				body: markup
			});

			return shellCode;
		}
	});

	var compiledShellMarkup = null;
	var getCompiledShellMarkup = function()
	{
		if(!compiledShellMarkup)
		{
			compiledShellMarkup = phnq_ejs.compile(_fs.readFileSync(__dirname+"/shell.html.ejs", "UTF-8")); 
		}
		return compiledShellMarkup;
	};
});