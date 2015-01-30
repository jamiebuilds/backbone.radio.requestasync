import Radio from 'backbone.radio';

var eventSplitter = /\s+/;

// An internal method used to handle Radio's method overloading for Requests and
// Commands. It's borrowed from Backbone.Events. It differs from Backbone's overload
// API (which is used in Backbone.Events) in that it doesn't support space-separated
// event names.
function _eventsApi(obj, action, name, rest) {
  if (!name) {
    return false;
  }

  var results = { keys: [], results: [] }, result;

  // Handle event maps.
  if (typeof name === 'object') {
    for (var key in name) {
      result = obj[action].apply(obj, [key, name[key]].concat(rest));
      if (eventSplitter.test(key)) {
        results.keys.concat(result.keys);
        results.keys.concat(result.results);
      } else {
        results.keys.push(key);
        results.results.push(result);
      }
    }
    return results;
  }

  // Handle space separated event names.
  if (eventSplitter.test(name)) {
    var names = name.split(eventSplitter);
    for (var i = 0, l = names.length; i < l; i++) {
      result = obj[action].apply(obj, [names[i]].concat(rest));
      results.keys.push(names[i]);
      results.results.push(result);
    }
    return results;
  }

  return false;
}

function _unwrap(results) {
  var result = {};
  return Promise.all(results.results).then(function(values) {
    for (var i = 0; i < results.keys.length; i++) {
      result[results.keys[i]] = values[i];
    }
    return result;
  });
}

const UNHANDLED_REQUEST = 'An unhandled async request was fired';

/**
 * Make an async Request.
 * @public
 * @method requestAsync
 * @memberOf Radio.Requests
 * @memberOf Radio.Channel
 * @returns {Promise}
 */
Radio.Requests.requestAsync = Radio.Channel.prototype.requestAsync = function(name, ...args) {
  var results = _eventsApi(this, 'requestAsync', name, args);
  if (results) {
    return _unwrap(results);
  }
  var channelName = this.channelName;
  var requests = this._requests;

  // Check if we should log the request, and if so, do it
  if (channelName && this._tunedIn) {
    Radio.log.apply(this, [channelName, name].concat(args));
  }

  // If the request isn't handled, log it in DEBUG mode and exit
  if (requests && (requests[name] || requests['default'])) {
    var handler = requests[name] || requests['default'];
    args = requests[name] ? args : arguments;
    try {
      return Promise.resolve(Radio._callHandler(handler.callback, handler.context, args));
    } catch (err) {
      return Promise.reject(err);
    }
  } else {
    Radio.debugLog(UNHANDLED_REQUEST, name, channelName);
    return Promise.reject(new Error(
      Radio._debugText(UNHANDLED_REQUEST, name, channelName)
    ));
  }
};

/**
 * Make an async Request.
 * @public
 * @method requestAsync
 * @memberOf Radio
 * @returns {Promise}
 */
Radio.requestAsync = function(channelName, ...args) {
  var channel = this.channel(channelName);
  return channel.requestAsync.apply(channel, args);
};
