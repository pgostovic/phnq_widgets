var phnq_widgets = require("./server/phnq_widgets");

phnq_widgets.start({port:7777, appRoot:__dirname});
phnq_widgets.addPath("test/widgets");
