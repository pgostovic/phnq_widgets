phnq_widgets
============

Phnq_widgets is a framework for buliding Rich JavaScript Applications by
organizing UI code along functional instead of technological lines. Instead
of, for example, putting all the JS files into one folder, CSS files into
another folder, and the HTML files into yet another folder, phnq_widgets
enncourages the grouping together of code that is functionally related,
regardless of file type, into widgets. I call this "functional code
organization".

A widget is a self-contained chunk of application functionality that may
include any or all of HTML markup, CSS, JavaScript or static resources such as
images, all in a single folder.

Carving a UI into widgets has many benefits:

- intuitive modularization of UI functionality
- prevents (or at least discourages) monolithic JS and CSS files
- facilitates the reuse of UI functionality
- etc.

Features
--------

In addition to providing the substrate for functional code organization,
phnq_widgets also provides several advanced web framework features:

- implicit and explicit dependency management
- lazy loading and deployment of client-side functionality
- compilation of templates into JS object code, executable on server or client
- automatic static file aggregation/minification/compression
- pluggable interface for auto-publishing to CDNs

The details of these features will be discussed below.

Everything's a Widget
---------------------

One of the benefits of functional code organization is that it is **very**
amenable to modularization. Remember that a widget is self-contained and can
contain everything that it needs (HTML, CSS, JS, images, etc.). Perhaps most
important is that widgets particiapte in dependency management. Examples of
things that can be widgets:

- chunk of rich application functionality (i.e. toolbar, fancy select box, etc.)
- 3rd party library (i.e. Twitter Bootstrap, jQuery UI, Isotope, etc.)
- JS API for accessing some remote web service

Getting Started
---------------

Requirements: node.js, npm

First create an application folder and change into it.

	mkdir my-app
	cd my-app

Install phnq_widgets into your application.

	npm install phnq_widgets

Generate your first widget called com.example.HelloWorld.

	node_modules/.bin/phnq_widgets -g com.example.HelloWorld

Start up a minimal server.

	node_modules/.bin/phnq_widgets -s

Now point your browser to:

	http://localhost:7777/widgets/com.example.HelloWorld

You should see an extremely basic page.

Add some style. Edit the generated file
widgets/com/example/HelloWorld/HelloWorld.css and make it look like this:

	.__CLASS__ h1
	{
		padding: 10px;
		border: 1px solid #999;
		background: #ccc;
		color: #fff;
		font-family: sans-serif;
	}

Refresh your browser and and you should see the effect of the above CSS
stylings.

Add some behaviour. Edit the generated file
widgets/com/example/HelloWorld/HelloWorld.js and make it look like this:

	var widget =
	{
		ready: function($$)
		{
			$$("h1").click(function()
			{
				alert("Hi!");
			});
		}
	};

Refresh your browser. Click on the text HelloWorld and you should trigger
the alert box to open.

Putting the phnq_widgets utility in your PATH
---------------------------------------------
In the Getting Started section we used the phnq_widgets utility a few times,
but the relative path to the utility is a bit cumbersome to type, so putting
it in your PATH helps:

	export PATH=$PATH:./node_modules/.bin

Put that in your shell startup script, relaunch your shell and then
phnq_widgets will be in your PATH whenever you're in a directory that has the
phnq_widgets module installed.

Now, starting your minimal server is a bit more concise:

	phnq_widgets -s

More documentation soon...
