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
 
;(function () {
"use strict"
window.addEventListener("load", setupGraphics, false);

var renderer = null;
var context = null;
var gl = null;

function setupGraphics() {
	context = new Kangas(null, 
		{width:(window.innerWidth), height:(window.innerHeight), density:19});
	if (gl = context.gl) {

		renderer = new context.Renderer();

		window.addEventListener("shaders-load",
			function buildShaderPrograms (e) {
				window.removeEventListener(e.type,buildShaderPrograms,false);
				var shaderSource = e.data;
				try {
					renderer.noiseTex = context.whiteNoise({width:256, height:256});
					renderer.worleyTex = context.worleyFractalNoise(shaderSource, {density: 7, width:256, height:256});
					renderer.pencil= new context.Program( 
						shaderSource.vshHeader + shaderSource.basic2d, 
						shaderSource.fshHeader + shaderSource.yuvMatrices + shaderSource.pencil); 

				} catch(err) {
					throw err;
					return;
				}
				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);

		window.addEventListener("programs-ready",
			function initializeData (e) {
				window.removeEventListener(e.type,initializeData,false);
				initBuffers();
				initShaders();
				initTextures();
			}, false);

		window.addEventListener("textures-load",
			function startRenderingLoop (e) {
				window.removeEventListener(e.type,startRenderingLoop,false);
				gl.frontFace(gl.CCW);
				gl.enable(gl.CULL_FACE);
				gl.depthFunc(gl.LEQUAL);
				gl.clearColor(1.0, 1.0, 1.0, 1.0);
				gl.clearDepth(1.0);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, renderer.worleyTex.gl);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, renderer.noiseTex.gl);
				window.addEventListener("resize", resizeCanvas, false);
				context.cleanup.push(renderer);
				document.body.appendChild(context.canvas);
				gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
				gl.viewport(0,0,context.width,context.height);
				gl.useProgram(renderer.pencil.gl);
				var offsets = renderer.vertexData;
				gl.vertexAttribPointer(renderer.pencil.coord, 
					offsets.simpleblit.coord.size, gl.FLOAT, false, 0,
					offsets.simpleblit.coord.byteoffset);
				resizeCanvas();
				renderer.animate(drawScene);
			}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}

}

function drawScene(timestamp) {
	var milliseconds = timestamp;
	var program = renderer.pencil;
	var offsets = renderer.vertexData;

	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	gl.useProgram(program.gl);
	gl.drawElements(gl.TRIANGLE_STRIP, 
			29, gl.UNSIGNED_SHORT, 
			offsets.simpleblitIndices.byteoffset);
}

function initBuffers() {
	renderer.addVertexData("simpleblit", {
		data: new Float32Array([
				 -1.0,  0.5,  1.0, -0.1,
				 -1.0, -1.0,  0.0, 0.5,
				  -0.5, 0.75, 0.95, 0.5,
				  -0.25, -1.0,  0.0, 0.5,
				  -0.35, 0.8, 0.9, 0.5,
				  0.3, -1.0, 0.0, 0.5,
				  0.66, 0.95, 0.85, 0.5,
				  1.0, -1.0,  0.0, 0.5,
				  1.0, 0.95,  0.8, 0.5,

				 -1.0,  0.15,  1.0, -0.2,
				 -1.0, -1.25,  0.0, 0.0,
				  -0.5, 0.25, 0.95, 0.0,
				  -0.25, -1.25,  0.0, 0.0,
				  -0.35, 0.3, 0.9, 0.0,
				  0.3, -1.25, 0.0, 0.0,
				  0.66, 0.55, 0.85, 0.0,
				  1.0, -1.25,  0.0, 0.0,
				  1.0, 0.35,  0.8, 0.0,

				 -1.0,  -0.25,  1.0, -0.7,
				 -1.0, -1.5,  0.0, -0.5,
				  -0.5, -0.2, 0.95, -0.5,
				  -0.25, -1.5,  0.0, -0.6,
				  -0.35, -0.1, 0.9, -0.4,
				  0.3, -1.5, 0.0, -0.4,
				  0.66, 0.0, 0.85, -0.4,
				  1.0, -1.5,  0.0, -0.4,
				  1.0, -0.25,  0.8, -0.6,
					]),
		attributes : [{coord:4}],
		bytesize : Kangas.sizeof.float32,
	});
	renderer.addVertexData("simpleblitIndices", {
		buffertype : "index",
		data: new Uint16Array([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 
			9, 10, 11, 12, 13, 14, 15, 16, 17, 17,
			18, 19, 20, 21, 22, 23, 24, 25, 26, 
		]),
		bytesize : Kangas.sizeof.uint16,
	});
	renderer.updateBuffers();
}

function initShaders () {

	gl.useProgram(renderer.pencil.gl);
	gl.uniform1i(renderer.pencil.texture, 0);
	gl.uniform1i(renderer.pencil.elevationTexture, 1);
	gl.uniformMatrix4fv(renderer.pencil.MVPmatrix, false, 
		Kangas.transform.identity);
}

function initTextures () {
	window.dispatchEvent(new CustomEvent("textures-load"));
}

function resizeCanvas (e) {
	context.width = window.innerWidth;
	context.height = window.innerHeight;
	gl.viewport(0,0,context.width,context.height);
	renderer.projection = Kangas.transform.identity;
	gl.useProgram(renderer.pencil.gl);
	gl.uniformMatrix4fv(renderer.pencil.MVPmatrix, false, 
		renderer.projection);
	renderer.animate(drawScene);
}

})()
