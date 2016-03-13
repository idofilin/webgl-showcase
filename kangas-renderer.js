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
 
;(function (nsName) {
"use strict"
var module = window[nsName] || (window[nsName] = {});
module.subconstructors = module.subconstructors || [];
module.subconstructors.push(Renderer);

var nativeObjPropName = "gl";
var contextPropertyName = "context";

function Renderer () {
	var _daycycle = {};
	Object.defineProperty(this, "dayCycle", {
		get: function() {return _daycycle},
		set: function(val){
			if (_daycycle.intervalID) clearInterval(_daycycle.intervalID);
			if (!val.callback || !(val.callback instanceof Function)) 
				_daycycle = {};
			else {
				_daycycle.callback = val.callback;
				_daycycle.callPeriod = val.callPeriod || 60000;
				_daycycle.intervalID = setInterval (
					function(){ _daycycle.callback(Date.now()) }
					, _daycycle.callPeriod );
			}
		}	
	});

	var _frameRequestID 
	Object.defineProperty(this, "frameRequestHandle", {
		get: function frameRequestHandle(){return _frameRequestID}, 
	});

	Object.defineProperty(this, "requestFrame", {
		value: ( !(window.requestAnimationFrame) ?
			function requestFrame(func){return _frameRequestID = setTimeout(function(){func.call(null,Date.now())},17)}
			: function requestFrame(func){return _frameRequestID = window.requestAnimationFrame(func)}),
		enumerable: true,
		configurable: false,
		writable: false,
	});

	var context = this[contextPropertyName],
		gl = context[nativeObjPropName];
	this.vertexBuffer = gl.createBuffer();
	this.indexBuffer = gl.createBuffer();

	var _vertexdata = {};
	Object.defineProperty(this, "vertexData", {
		get: function frameRequestHandle(){return _vertexdata}, 
	});
};

Renderer.prototype.cancelFrameRequest = 
	(!window.requestAnimationFrame) ?
		function cancelFrame(){clearTimeout(this.frameRequestHandle)}
		: function cancelFrame(){window.cancelAnimationFrame(this.frameRequestHandle)};

Renderer.prototype.animate = function animate (func) {
	var context = this[contextPropertyName];
	if ( context.isContextLost && context.isContextLost() ) {
		this.cancelFrameRequest();
		context.clean();
		if (context.onContextLost && context.onContextLost instanceof Function)
			context.onContextLost();
		return -1;
	}
	return this.requestFrame(func);
};

Renderer.prototype.addVertexData = 
		function addVertexData(name, data) {
	if (!this.vertexData) 
		return;
	var renderer = this,
		context = renderer[contextPropertyName],
		gl = context[nativeObjPropName],
		vertices = renderer.vertexData[name] = {};
	var hiddenPropOptions = {configurable: false, writable: true, enumerable: false};
	Object.defineProperties(vertices, { 
		data: hiddenPropOptions,
		bytesize: hiddenPropOptions,
		buffertype: hiddenPropOptions,
		byteoffset: hiddenPropOptions,
	});
	vertices.data = data.data;
	vertices.bytesize = data.bytesize;
	vertices.buffertype = vertices.byteoffset = 0;
	var buffertype = data.buffertype;
	if (!buffertype ||
			buffertype !== "index" && buffertype !== "element"
			&& buffertype !== "indices" && buffertype !== "elements") {
		var offset = 0;
		for (var ind = 0; ind < data.attributes.length; ind++) {
			var attribute = data.attributes[ind];
			for (var prop in attribute)
				if (attribute.hasOwnProperty(prop)) {
					var doffset = attribute[prop];
					vertices[prop] = {
						size: doffset,
						offset: offset, 
						bytesize: 0,
					};
					offset += doffset;
				};
		}
		Object.defineProperties(vertices, {
			"stride": hiddenPropOptions,
			"bytestride": hiddenPropOptions, 
		});
		vertices.bytestride = data.bytesize * (vertices.stride = offset);
	} else {
		vertices.buffertype = 1;
	}
}

Renderer.prototype.updateBuffers = 
	function updateBuffers () {
	var renderer = this,
		context = renderer[contextPropertyName],
		gl = context[nativeObjPropName],
		vbuffer = renderer.vertexBuffer,
		ibuffer = renderer.indexBuffer,
		vertexData = renderer.vertexData;
	var offset = [0 , 0];
	for (var prop in vertexData) {
		if (vertexData.hasOwnProperty(prop)) {
			offset[vertexData[prop].buffertype] += vertexData[prop].data.length;
		}
	}
	var vrtxs = new Float32Array(offset[0]);
	var indxs = new Uint16Array(offset[1]);
	offset = [0, 0];
	for (var prop in vertexData) {
		if (vertexData.hasOwnProperty(prop)) {
			var dataset = vertexData[prop];
			if (dataset.buffertype === 1)
				indxs.set(dataset.data, offset[1]);
			else
				vrtxs.set(dataset.data, offset[0]);
			dataset.byteoffset = offset[dataset.buffertype] * dataset.bytesize;
			if (dataset.buffertype === 0)
				for (var attribute in dataset) 
					if (dataset.hasOwnProperty(attribute)) 
						dataset[attribute].byteoffset = 
							(dataset[attribute].offset + offset[0])*dataset.bytesize;
			offset[dataset.buffertype] += dataset.data.length;
		}
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, vbuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vrtxs, gl.STATIC_DRAW);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indxs, gl.STATIC_DRAW);
}

})("Kangas");
