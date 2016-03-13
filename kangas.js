/*
Copyright 2016 Ido Filin 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
 
;(function (nsName, nativeObjPropName) {
"use strict"
var module = window[nsName];
if (!module)
	throw "No global module named " + nsName;
ContextConstructor.subconstructors = module.subconstructors || [];
ContextConstructor.CoreConstructor = module;
module = window[nsName] = ContextConstructor;
module.contextPropertyName  = "context";
module.nativeObjectPropertyName = "gl";

var ProgramPrototype = 
	module.subconstructors.filter(
			function (method) {
				return method instanceof Function && method.name === "Program"; 
			})[0].prototype;

function ContextConstructor (inputContext, options) { 
	var context = this;
	if (!(context instanceof ContextConstructor)) {
		throw nsName + " is a constructor, and must be called as such.";
	}

	try {	
		var sendcontext = inputContext || document.createElement("canvas");	
		var contextParams = ContextConstructor.getContextParams(options);
		ContextConstructor.CoreConstructor.call(
				context, 
				sendcontext, 
				contextParams);
		var gl = context.gl;
	} catch(err) {
		throw "In context initilization:\n" + err;
	}

	Object.defineProperties (context, {
		width: {
			get: function () { return this.canvas.clientWidth; },
			set: function (val) { this.canvas.width = val; },
		},
		height: {
			get: function () { return this.canvas.clientHeight; },
			set: function (val) { this.canvas.height = val; },
		},
		aspect: { 
			get: function () { return this.canvas.clientHeight/this.canvas.clientWidth; } 
		},
		isContextLost: {
			value : gl && gl.isContextLost && gl.isContextLost instanceof Function && gl.isContextLost.bind(gl) || null,
			enumerable : false,
			writable : false,
			configurable : false,
		},
		touchstartHandler: {
			value : this.touchHandler.bind(this),
			enumerable : false,
			writable : false,
			configurable : false,
		},
	});

	if (options) {
		if (options.width) context.width = options.width;
		if (options.height) context.height = options.height;
		if (options.onContextLost) context.onContextLost = options.onContextLost; 
	}

	this.maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
	this.cleanup = [];
	this.startTouchHandlers = [];
	this.moveTouchHandlers = [];
	this.endTouchHandlers = [];
	window.addEventListener("beforeunload", this.clean.bind(this), true);
	this.canvas.addEventListener("mousedown", this.touchstartHandler, false);
	this.canvas.addEventListener("touchstart", this.touchstartHandler, false);
};

ContextConstructor.prototype.clean = function cleanContext() {
	var context = this;
	var gl = context.gl;
	var cleanup = context.cleanup;

	gl.useProgram(null);
	gl.bindTexture(gl.TEXTURE_2D,null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	for (var index = 0; index < cleanup.length; index++) {
		var cleanupObj = cleanup[index];
		if (cleanupObj instanceof Function) 
			cleanupObj.call(context);
		else if (cleanupObj instanceof Object) {
			if (cleanupObj instanceof context.Renderer)
				cleanupObj.cancelFrameRequest();
			for (var prop in cleanupObj) {
				var focus = cleanupObj[prop]
				if (focus instanceof context.Program)
					gl.deleteProgram(focus[nativeObjPropName]);
				else if (focus instanceof WebGLProgram)
					gl.deleteProgram(focus);
				else if (focus instanceof context.Shader)
					gl.deleteShader(focus[nativeObjPropName]);
				else if (focus instanceof WebGLShader)
					gl.deleteShader(focus);
				else if (focus instanceof context.Texture)
					gl.deleteTexture(focus[nativeObjPropName]);
				else if (focus instanceof WebGLTexture)
					gl.deleteTexture(focus);
				else if (focus instanceof WebGLBuffer)
					gl.deleteBuffer(focus);
				else 
					continue;
				delete cleanupObj[prop];
			}
			for (var prop in cleanupObj) { 
				if (cleanupObj[prop] instanceof WebGLFramebuffer) {
					gl.deleteFramebuffer(cleanupObj[prop]);
					delete cleanupObj[prop];
				} else if (cleanupObj[prop] instanceof WebGLRenderbuffer) {
					gl.deleteRenderbuffer(cleanupObj[prop]);
					delete cleanupObj[prop];
				}
			}
		}
	}
};

ContextConstructor.prototype.touchHandler = function (sevt) {
	sevt.stopImmediatePropagation();
	sevt.stopPropagation();
	sevt.preventDefault();

	var eventNames = {};
	if (sevt.type === "touchstart") {
		eventNames.start = "touchstart";
		eventNames.move = "touchmove";
		eventNames.end = "touchend";
		eventNames.leave = "touchleave";
		eventNames.cancel = "touchcancel";
	} else if (sevt.type === "mousedown") {
		eventNames.start = "mousedown";
		eventNames.move = "mousemove";
		eventNames.end = "mouseup";
		eventNames.leave = "mouseleave";
		eventNames.cancel = "mousecancel";
	} else {
		return false;
	}

	var context = this;
	sevt.target.removeEventListener("touchstart", context.touchstartHandler, false);
	sevt.target.removeEventListener("mousedown", context.touchstartHandler, false);
	sevt.target.addEventListener(eventNames.start, startHandler, false);
	sevt.target.addEventListener(eventNames.move, moveHandler, false);
	sevt.target.addEventListener(eventNames.end, endHandler, false);
	sevt.target.addEventListener(eventNames.leave, endHandler, false);
	sevt.target.addEventListener(eventNames.cancel, endHandler, false);

	var startEvt = [];
	startHandler(sevt);

	function startHandler (evt) {
		sevt.stopImmediatePropagation();
		evt.stopPropagation();
		evt.preventDefault();
		startEvt.push(copyEvent(evt));
		for (var index = 0; index < context.startTouchHandlers.length; index ++)
			(context.startTouchHandlers[index] instanceof Function) 
				&& context.startTouchHandlers[index].call(context, evt, startEvt);
	}

	function moveHandler (evt) {
		sevt.stopImmediatePropagation();
		evt.stopPropagation();
		evt.preventDefault();
		for (var index = 0; index < context.moveTouchHandlers.length; index ++)
			(context.moveTouchHandlers[index] instanceof Function) 
				&& context.moveTouchHandlers[index].call(context, evt, startEvt);
		return false;
	};

	function endHandler (evt) {
		sevt.stopImmediatePropagation();
		evt.stopPropagation();
		evt.preventDefault();
		if (!evt.touches || evt.touches && evt.touches.length === 0) {
			evt.target.removeEventListener(eventNames.start, startHandler, false);
			evt.target.removeEventListener(eventNames.move, moveHandler, false);
			evt.target.removeEventListener(eventNames.end, endHandler, false);
			evt.target.removeEventListener(eventNames.leave, endHandler, false);
			evt.target.removeEventListener(eventNames.cancel, endHandler, false);
			sevt.target.addEventListener("touchstart", context.touchstartHandler, false);
			sevt.target.addEventListener("mousedown", context.touchstartHandler, false);
		}
		for (var index = 0; index < context.endTouchHandlers.length; index++)
			(context.endTouchHandlers[index] instanceof Function) 
				&& context.endTouchHandlers[index].call(context, evt, startEvt);
		return false;
	}

	return false;
};

Object.defineProperty(ContextConstructor.prototype, "requestFullscreen", { 
	writable: false, configurable: false, 
	value: (function() {
		var element = document.createElement("div");
		var func = 
			 element.requestFullscreen instanceof Function && element.requestFullscreen
			 || element.requestFullScreen instanceof Function && element.requestFullScreen
			 || element.mozRequestFullscreen instanceof Function && element.mozRequestFullscreen
			 || element.mozRequestFullScreen instanceof Function && element.mozRequestFullScreen
			 || element.webkitRequestFullscreen instanceof Function && element.webkitRequestFullscreen
			 || element.webkitRequestFullScreen instanceof Function && element.webkitRequestFullScreen
			 || element.msRequestFullscreen instanceof Function && element.msRequestFullscreen
			 || element.msRequestFullScreen instanceof Function && element.msRequestFullScreen;
		return func;
	})(),
});

/* The following functions serve as class utility methods, to hide
 * browser differences, or as wrappers to general WebGL
 * functionality. */
ContextConstructor.getContextParams = function getWebGLContext (options) {
	var contextParams = {
		alpha: (options && options.alpha!=undefined) ? options.alpha : false,
		"antialias": (options && options.antialias!=undefined) ? options.antialias : true,
	};
	return contextParams; 
};

/* Helper function */
function copyEvent(evt) {
	var copiedEvt = {};
	for (var prop in evt)
		copiedEvt[prop] = evt[prop];
	if (evt.touches) {
		copiedEvt.touches = [];
		for (var i = 0; i < evt.touches.length; ++i) {
			var t = {};
			for (var prop in evt.touches[i]) 
				t[prop] = evt.touches[i][prop];
			copiedEvt.touches.push(t);
		}
	}
	return copiedEvt;
}

var evt = new CustomEvent(nsName.toLowerCase() + "-base-load"); 
window.dispatchEvent(evt);

})("Kangas", "gl");
