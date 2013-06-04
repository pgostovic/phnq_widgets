var listenersByEventName = {};

phnq.notify =
{
    listen: function(eventName, listenerFn)
    {
        var listeners = listenersByEventName[eventName];
        if(!listeners)
            listeners = listenersByEventName[eventName] = [];
        
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
