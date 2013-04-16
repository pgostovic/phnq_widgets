phnq_widgets
============

Phnq_widgets is a framework for buliding Rich JavaScript Applications by
organizing UI code along functional instead of technological lines. Instead
of, for example, putting all the JS files into one folder, CSS files into
another folder, and the HTML files into yet another folder, phnq_widgets
enncourages the grouping together of code that is functionally related,
regardless of file type, into widgets.

A widget is a self-contained chunk of application functionality that may
include any or all of HTML markup, CSS, JavaScript or static resources such as
images.

Carving a UI into widgets has many benefits:
- intuitive modularization of UI functionality
- prevents (or at least discourages) monolithic JS and CSS files
- facilitates the reuse UI functionality
- etc.

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


More documentation soon...
