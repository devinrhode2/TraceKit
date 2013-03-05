
/*

Sheild, the main function, does a few things:

1. Wraps a callback in a try/catch block:
   Sheild(function(){
     //your program
   })();

2. Optionally include a `console` param to use our historicalConsole
   Shield(function(console){
     
   })();
   For documentation regarding keeping a console history, see https://github.com/devinrhode2/historicalConsole.js

3. Modify global api functions so their callbacks are also wrapped in a try/catch block:
   Shield('$');
   Shield('$, $.fn.on, $.fn.ready')
   Now errors in these callbacks will be caught:
   $(function(){})
   $('#foo').on('click', function(){})
   $(document).ready(function(){})

4. Use it for easier try/catch blocks. Instead of:
   var func = function() {
     //your function
   };

   add Shield:
   var func = Shield(function(){
     //no need for a try/catch block now, Shield has it taken care of
   });

*/

function Shield(apiFn, promises) {
  if (_.isString(apiFn)) {
    if (apiFn.indexOf(' ') > -1) {
      apiFn.replace(/\,/g, ''); //allow '$, $.fn.on, $.fn.ready'
      apiFn = apiFn.split(' ');
    }
  }
  if (_.isArray(apiFn)) {
    _.each(apiFn, function(api){
      Shield(api);
    });
    return;
  }
  return extendFunction(apiFn, function(args, prevFunc) {
    apiFn = null;//garbage collected
    
    //if function.length (number of listed parameters) is 1, and there are no args, then this is
    //Shield(function(console){})()
    //ie, prevFunc expects 1 arg (length) but received none when called
    if (prevFunc.length === 1 && args.length === 0) {
      //historicalConsole takes in a function and returns one that will receive the first arg as the console.
      //The second arg is a unique identifier to use another scope's historical console object
      //options.url is probably a deent unique identifier.
      //We could ask the user to name the app (Shield.options.appName('thing')
      return historicalConsole(prevFunc, options.url);
    } else {
      //instead of just doing apiFn.apply, we interate through args
      //and if an arg is a function then we wrap then we swap that fn for callback in a try/catch
      var length = args.length;
      //before executing the overriden function, transform each function arg to have a try/catch wrapper
      //I'd prefer to keep the while/length style iteration here for performance, since this can be rather important
      var arg;
      while (arg = args[--length]) {
        if (_.isFunction(arg)) {
          arg = wrapInTryCatch(arg);
        }
      }

      //now we apply the modified arguments:
      var ret = prevFunc.apply(this, args);
      if (promises) {
        promises = promises.split(' ');
        var promise;
        while(promise = promises.pop()) {
          ret[promise] = Shield(ret[promise]);
        }
      }
      return ret;
    }
  });
}
