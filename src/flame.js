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

window.addEventListener("load", setupWebGL, false);
var renderer = null;
var worldview = null;
var gl = null;
var shaderSource;

function setupWebGL() {

	worldview = new Kangas(null, 
		{width:(window.innerWidth), height:(window.innerHeight),});
	if (gl = worldview.gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function buildShaderPrograms (e) {
				window.removeEventListener(e.type,buildShaderPrograms,false);
				shaderSource = e.data;

				renderer.noiseTex = worldview.worleyFractalNoise(
						shaderSource,
						{width:512, height:512, density: 11, name: "fractaCellularNoise"});

				renderer.fire= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d, 
					shaderSource.fshHeader + shaderSource.yuvMatrices + shaderSource.voronoiFire); 

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
				gl.depthFunc(gl.LESS);
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clearDepth(1.0);
				gl.activeTexture(gl.TEXTURE0);
				window.addEventListener("resize", resizeCanvas, false);
				worldview.cleanup.push(renderer);
				document.body.appendChild(worldview.canvas);
				gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
				gl.viewport(0,0,worldview.width,worldview.height);
				gl.useProgram(renderer.fire.gl);
				gl.vertexAttribPointer(renderer.fire.coord, 4, gl.FLOAT, false, 
					0, 16*Kangas.sizeof.float32);
				resizeCanvas();
				renderer.animate(drawScene);
			}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}

}

function drawScene(timestamp) {
	renderer.animate(skipFrame);

	var milliseconds = timestamp;
	var program = renderer.fire;
	gl.useProgram(program.gl);

	gl.bindTexture(gl.TEXTURE_2D, renderer.noiseTex.gl);
	gl.uniform2f(renderer.fire.displacement,(-milliseconds%50000.0)/50000.0 , (-milliseconds%4000.0)/4000.0 );
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0*Kangas.sizeof.uint16);

}

function skipFrame(timestamp) {
	renderer.animate(drawScene);
}

function initBuffers() {
	var vrtxAttribs = [
	     -1.0,  -1.0, 0.0, 0.0,
	      1.0,  -1.0, 1.0, 0.0, 
	      1.0,   1.0, 1.0, 1.0, 
	     -1.0,   1.0, 0.0, 1.0, 

	     -1.0,  -1.0, 0.0, 0.0,
	      1.0,  -1.0, 1.0, 0.0, 
	      1.0,   1.0, 1.0, 0.25, 
	     -1.0,   1.0, 0.0, 0.25, 

	];


	var vrtxIndices = [
		0 , 1, 2, 0, 2, 3,
	];

	renderer.vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vrtxAttribs), gl.STATIC_DRAW);

	renderer.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vrtxIndices), gl.STATIC_DRAW);
}

function initShaders () {

	gl.useProgram(renderer.fire.gl);
	gl.uniform1i(renderer.fire.texture, 0);
	gl.uniformMatrix4fv(renderer.fire.MVPmatrix, false, 
		Kangas.transform.identity);
	gl.uniform2f(renderer.fire.displacement, 0.0, 0.0);
	gl.uniform2f(renderer.fire.gain, 5.0, 2.0);
	gl.uniform4f(renderer.fire.scaling, 0.5, 0.0, 0.5, 0.25);
}

function initTextures () {
	window.dispatchEvent(new CustomEvent("textures-load"));
}

function resizeCanvas (e) {
	worldview.width = window.innerWidth;
	worldview.height = window.innerHeight;
	gl.viewport(0,0,worldview.width,worldview.height);
	renderer.projection = Kangas.transform.identity;
	var ratio = worldview.aspect;
	renderer.projection[0] = (ratio < 1.0) ? ratio : 1.0;
	renderer.projection[5] = (ratio < 1.0) ? 1.0 : 1.0/ratio;
	gl.useProgram(renderer.fire.gl);
	gl.uniformMatrix4fv(renderer.fire.MVPmatrix, false, 
		renderer.projection);
}

})()
