require("phnq_log").setLevel("none");
var phnq_widgets = require("../server/phnq_widgets");
var browser = new (require("zombie"))();

phnq_widgets.start({port:7777, appRoot:__dirname});

describe("phnq_widgets", function()
{
	eval(phnq_widgets.getTestCode({baseUrl:"http://localhost:7777"}));
});
