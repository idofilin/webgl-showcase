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
module.subconstructors.push(Texture);
module.subconstructors.push(Texture);

var nativeObjPropName = "gl";
var contextPropertyName = "context";

function Texture (source, options) {
	var textureObj = this,
		context = textureObj[contextPropertyName],
		gl = context[nativeObjPropName];
	var tex = gl.createTexture(); 
	var format = options && options.format || gl.RGB;
	var wrap = options && options.wrap || gl.CLAMP_TO_EDGE;
	var magfilter = options && (options.magfilter || options.filter) || gl.LINEAR;
	var minfilter = options && (options.minfilter || options.filter) || gl.LINEAR_MIPMAP_LINEAR;
	var width = options && options.width || source.width || this.width;
	var height = options && options.height || source.height || this.height; 
	gl.bindTexture(gl.TEXTURE_2D, tex);
	if (typeof source ===  "string") {
		var texImg = new Image();
		texImg.onload = function (e) {
			e.stopPropagation;
			e.target.onload = null;
			var currTex = gl.getParameter(gl.TEXTURE_BINDING_2D);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, e.target);
			initTextureParameters(tex);
			gl.bindTexture(gl.TEXTURE_2D, currTex);
			if (options && options.event)
				window.dispatchEvent( new CustomEvent(options.event.toString()) );
		}
		texImg.src = source;
	} else if (source instanceof WebGLFramebuffer) {
		var fbo = source;
		var attachment = options && options.attachment || gl.COLOR_ATTACHMENT0;
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, format, 
				width, height, 0, format, gl.UNSIGNED_BYTE, null);
		initTextureParameters(tex);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, tex, 0);
	} else if (source instanceof Uint8Array) {
		var pixels = source;
		gl.texImage2D(gl.TEXTURE_2D, 0, format, 
				width, height, 0, format, gl.UNSIGNED_BYTE, pixels);
		initTextureParameters(tex);
	} else if (source instanceof Array 
				&& source.length == 2 
				&& typeof source[0] === "number"
				&& typeof source[1] === "number") {
		gl.copyTexImage2D(gl.TEXTURE_2D, 0, format, 
				source[0], source[1], width, height, 0);
		initTextureParameters(tex);
	}

	function initTextureParameters(tex) {
		if ( !gl.isTexture(tex) ) {
			console.error("Error: texture for " + source + " is invalid.\n");
			return;
		} 
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magfilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minfilter);
		if (minfilter == gl.LINEAR_MIPMAP_LINEAR 
				|| minfilter == gl.NEAREST_MIPMAP_NEAREST
				|| minfilter == gl.LINEAR_MIPMAP_NEAREST
				|| minfilter == gl.NEAREST_MIPMAP_LINEAR ) {
			gl.generateMipmap(gl.TEXTURE_2D);
		}
	}

	this[nativeObjPropName] = tex;
};

Texture.batchLoad = 
	function batchLoad (sources, eventName) {

	var context = this;
	eventName = eventName || "textures-load"; 

	var loadevents = [];
	sources.forEach(function(x,i) {
		var evt = x.event || ("load-" + x.src);
		loadevents[i] = evt;
		window.addEventListener(evt, waitForAllTextures, false);
	});
	
	var readyflags = loadevents.map(function(){return false});
	function waitForAllTextures (evt) {
		var index = loadevents.indexOf(evt.type);
		if (index >= 0) {
			evt.target.removeEventListener(evt.type, waitForAllTextures, false);
			readyflags[index] = true;
		}
		if (readyflags.every(nonzero)) 
			window.dispatchEvent(new CustomEvent(eventName));
		function nonzero(x) {return x === true};
	}

	var retval = 
		sources.map(function(x,i){
			var options = Object.create(x);
			options.event = options.event || loadevents[i];
			var tex = new context.Texture(options.src, options);
			return tex;
		});
	return retval;
}

})("Kangas");
