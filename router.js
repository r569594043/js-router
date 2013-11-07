/*
    Router
*/
(function()  {
	if (!Array.indexOf) {
	  Array.prototype.indexOf = function (obj, start) {
	    for (var i = (start || 0); i < this.length; i++) {
	      if (this[i] == obj) {
	        return i;
	      }
	    }
	    return -1;
	  };
	}
    var Router=function()   {
        this.routes=new Array();
    };
    Router.prototype={
        routes: new Array(),
        registerRoute: function(route, fn, paramObject)  {
            var scope=paramObject?paramObject.scope?paramObject.scope:{}:{};
            var rules=paramObject?paramObject.rules?paramObject.rules:null:null;
            return this.routes[this.routes.length]=new Route({
                route: route,
                fn: fn,
                scope: scope,
                rules: rules
            });
        }, 
        addRoute: function(routeConfig) {
            return this.routes[this.routes.length]=new Route(routeConfig);              
        },
        applyRoute: function(route)   {
			if(typeof route != 'undefined'){
				for(var i=0, j=this.routes.length;i<j; i++)  {
					var sRoute=this.routes[i];
					
					if(sRoute.matches(route)) {
						sRoute.fn.apply(sRoute.scope, sRoute.getArgumentsValues(route));
						return;
					}
				}
			}
			if(this.defaultRoute) {
				this.defaultRoute.fn.apply(this.defaultRoute.scope);
			}
        },
		registerDefaultRoute: function(fn, paramObject)  {
            var scope=paramObject?paramObject.scope?paramObject.scope:{}:{};
            this.defaultRoute = {
				fn: fn,
				scope: scope
			};
			
        }
    };
    
    var Route=function()    {
        this.route=arguments[0].route;
        this.fn=arguments[0].fn;
        this.scope=arguments[0].scope ? arguments[0].scope : null;
        this.rules=arguments[0].rules ? arguments[0].rules: {};
        
        this.routeArguments=Array();
        this.optionalRouteArguments=Array();
        
        //Create the route arguments if they exist
        
        this.routeParts=this.route.split("/");
        for(var i=0, j=this.routeParts.length; i<j; i++)   {
            var rPart=this.routeParts[i];
            if(rPart.substr(0,1)=="{" && rPart.substr(rPart.length-1, 1) == "}") {
                var rKey=rPart.substr(1,rPart.length-2); 
                this.routeArguments.push(rKey);
            }
            if(rPart.substr(0,1)==":" && rPart.substr(rPart.length-1, 1) == ":") {
                var rKey=rPart.substr(1,rPart.length-2); 
                this.optionalRouteArguments.push(rKey);
            }
            
        }
    };
    
    Route.prototype.getArgumentsObject=function(route) {
        var rRouteParts=route.split("/");   
        var rObject={};
        for(var i=0, j=this.routeParts.length; i < j; i++) {
            var rP=this.routeParts[i];//current routePart
            var cP0=rP.substr(0,1); //char at postion 0
            var cPe=rP.substr(rP.length-1, 1);//char at last postion
            if((cP0=="{" || cP0==":" ) && (cPe == "}" || cPe == ":"))  {
                var rKey=rP.substr(1,rP.length-2); 
                rObject[rKey]=rRouteParts[i];
            }                   
        }
        return rObject;
    };
    
    Route.prototype.getArgumentsValues=function(route) {
        var rRouteParts=route.split("/");   
        var rArray=new Array();
        for(var i=0, j=this.routeParts.length; i < j; i++) {
            var rP=this.routeParts[i];//current routePart
            var cP0=rP.substr(0,1); //char at postion 0
            var cPe=rP.substr(rP.length-1, 1);//char at last postion
            if((cP0=="{" || cP0==":" ) && (cPe == "}" || cPe == ":"))  {
                rArray[rArray.length]=rRouteParts[i];
            }                   
        }
        return rArray;
    };
    
    Route.prototype.matches=function(route) {
        //We'd like to examen every individual part of the incoming route
        var incomingRouteParts=route.split("/");
        //This might seem strange, but assuming the route is correct makes the logic easier, than assuming it is wrong.    
        var routeMatches=true;
        
        //if the route is shorter than the route we want to check it against we can immidiatly stop.
        if(incomingRouteParts.length < this.routeParts.length-this.optionalRouteArguments.length)  {
            routeMatches=false;   
        } 
        else    {
            for(var i=0, j=incomingRouteParts.length; i<j && routeMatches; i++)    {
                //Lets cache the variables, to prevent variable lookups by the javascript engine
                var iRp=incomingRouteParts[i];//current incoming Route Part
                var rP=this.routeParts[i];//current routePart                     
                if(typeof rP=='undefined')  {
                    //The route almost certainly doesn't match it's longer than the route to check against
                    routeMatches=false;   
                }
                else    {
                    var cP0=rP.substr(0,1); //char at postion 0
                    var cPe=rP.substr(rP.length-1, 1);//char at last postion                   
                    if((cP0!="{" && cP0!=":") && (cPe != "}" && cPe != ":")) {
                        //This part of the route to check against is not a pseudo macro, so it has to match exactly
                        if(iRp != rP)   {
                            routeMatches=false; 
                        }
                    }
                    else    {
                        //Since this is a pseudo macro and there was a value at this place. The route is correct.
                        //But a rule might change that
                        if(this.rules!=null) {
                            var rKey=rP.substr(1,rP.length-2);
                            //Is the rules rKey a RegExp
                            if(this.rules[rKey] instanceof RegExp)   {
                                routeMatches=this.rules[rKey].test(iRp);  
                            }
                            //Is the rules rKey an Array
                            if(this.rules[rKey] instanceof Array)   {
                                //N.B. If you need older browser to use this, you'll need an Array.indexOf polyfill
                                if(this.rules[rKey].indexOf(iRp) < 0)  {
                                    routeMatches=false;
                                }
                            }
                            //Is the rules rKey a Function
                            if(this.rules[rKey] instanceof Function)   {
                                //this.getArgumentsObject(route) is added, so that it becomes possible to do a cross validation in the function
                                routeMatches=this.rules[rKey](iRp, this.getArgumentsObject(route), this.scope);
                            }
                        }
                        else {
                             routeMatches=true;                       
                        }
                    }
                }   
            }
                                           
        }
        return routeMatches;
    };
    
 
    //Create a main instance to which we bind the window events
    
    window["router"]=new Router();
    
    //Copy the route prototype, so we can make another instance of router for internal purpuse
    window["Router"]=Router;
    
    //Copy the Route prototyp, so we kan make a sole instance of Route
    window["Route"]=Route;
    

    //Create the event that will listen for location hash changes
    
    if ("onhashchange" in window) { // event supported?
        window.onhashchange = function () {
            router.applyRoute(window.location.hash.split('#')[1]);
        };
    }
    else { // event not supported: This would be needed for older IE's
        var storedHash = window.location.hash.split('#')[1];
        window.setInterval(function () {
            if (window.location.hash.split('#')[1] != storedHash) {
                storedHash = window.location.hash.split('#')[1];
                router.applyRoute(window.location.hash.split('#')[1]);
            }
        }, 100);
    }
})();