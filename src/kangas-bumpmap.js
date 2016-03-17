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
var TexturePrototype = 
	module.subconstructors.filter(
			function (method) {
				return method instanceof Function && method.name === "Texture"; 
			})[0].prototype;

TexturePrototype.bumpmap = 
	function generateBumpmap (sources, texture, options) {

	var texture = this;
	var context = texture[module.contextPropertyName];
	var gl = context[module.nativeObjectPropertyName]; 
	gl.disable(gl.CULL_FACE);

	var weights = (options && options.weights && options.weights instanceof Array && options.weights.length >= 9 && options.weights) 
		/* y-compenent of YUV decomposition of color, and embossing coefficients;*/
		|| [0.299, 0.587, 0.114,
			3.0 , 0.0, -3.0,
			3.0 , 0.0, -3.0 ]; 
	var size = (options && options.size && options.size instanceof Array && options.size.length >= 2 && options.size)
		|| (texture.width && texture.height && [texture.width, texture.height])
		|| [256, 256];
	var delta = (options && options.delta) 
		|| [ 1.0/size[0], 1.0/size[1] ];

	var  bumpShader = new context.Program(
		(sources.vshHeader||"") + sources.bumpmapGenVertexShader, 
		(sources.fshHeader||"") + sources.bumpmapGenFragmentShader); 

	var vrtxAttribs = [
		-1.0, -1.0, 0.0, 0.0,
		 1.0, -1.0, 1.0, 0.0,
		 1.0,  1.0, 1.0, 1.0,
		-1.0,  1.0, 0.0, 1.0,
	];

	var vrtxIndices = [
		0 , 1, 2, 0, 2, 3,
	];

	var vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vrtxAttribs), gl.STATIC_DRAW);
	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vrtxIndices), gl.STATIC_DRAW);

	var fbo = gl.createFramebuffer();
	fbo.width = size[0];
	fbo.height = size[1];
	var textureOptions = { 
		format: gl.RGB, 
		magfilter:gl.LINEAR, 
		minfilter:gl.LINEAR,
		width: fbo.width,
		height: fbo.height,
		wrap: gl.REPEAT,
	};
	var bumpTex = new context.Texture(fbo, textureOptions);

	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.viewport (0.0, 0.0, fbo.width, fbo.height);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram (bumpShader[module.nativeObjectPropertyName]);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture[module.nativeObjectPropertyName]);
	gl.uniform1i(bumpShader.texture, 0);
	gl.uniform3fv(bumpShader.weights, 
		new Float32Array(weights));
	gl.uniform2fv(bumpShader.delta, new Float32Array(delta));
	gl.uniformMatrix4fv(bumpShader.MVPmatrix, false, 
		module.transform.identity);
	gl.vertexAttribPointer(bumpShader.coord, 4, gl.FLOAT, false, 
		0, 0);
	gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 
		0, 0);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	gl.useProgram(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.deleteProgram(bumpShader[module.nativeObjectPropertyName]);
	gl.deleteBuffer(vertexBuffer);
	gl.deleteBuffer(indexBuffer);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(fbo);
	return bumpTex;
}

})("Kangas");
