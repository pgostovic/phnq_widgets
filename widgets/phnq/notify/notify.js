var listenersByEventName = {};

phnq.notify =
{
    listen: function(eventName, listenerFn, context)
    {
        var listeners = listenersByEventName[eventName];
        if(!listeners)
            listeners = listenersByEventName[eventName] = [];
        
		listenerFn.___notifyContext___ = context;
		
        listeners.push(listenerFn);
    },
    
    unlisten: function(eventName, listenerFn)
    {
        var listeners = listenersByEventName[eventName];
        if(listeners)
        {
            var i = listeners.length;
            while(i--)
            {
                var l = listeners[i];
                if(l == listenerFn)
                {
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    },
	
	unlistenAll: function(context)
	{
		if(context)
		{
			for(var eventName in listenersByEventName)
			{
		        var listeners = listenersByEventName[eventName];
		        if(listeners)
		        {
		            var i = listeners.length;
		            while(i--)
		            {
		                var l = listeners[i];
						if(l.___notifyContext___ == context)
						{
		                    listeners.splice(i, 1);
						}
					}
				}
			}
		}
		else
		{
			listenersByEventName = {};
		}
	},
    
    post: function(eventName /* arg1, arg2, etc... */)
    {
        var listeners = listenersByEventName[eventName];
        if(listeners && listeners.length > 0)
        {
            var args = [];
            for(var i=1; i<arguments.length; i++)
            {
                args.push(arguments[i]);
            }
            
            for(var i=0; i<listeners.length; i++)
            {
                listeners[i].apply(null, args);
            }
        }
    }
};
