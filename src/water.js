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
 
window.addEventListener("load", setupWebGL, false);
var renderer = null;
var worldview = null;
var gl = null;
var shaderSource;

function setupWebGL() {

	worldview = new Kangas(null, 
		{width:(window.innerWidth), height:(window.innerHeight),});
	gl = worldview.gl;
	if(gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function(e) {
				window.removeEventListener(e.type,arguments.callee,false);
				shaderSource = e.data;

				renderer.noiseTex = worldview.worleyFractalNoise(
						shaderSource,
						{width:1024, height:1024, density: 17, name: "fractaCellularNoise"});

				renderer.water= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d, 
					shaderSource.fshHeader + shaderSource.yuvMatrices + shaderSource.voronoiWater); 

				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);

		window.addEventListener("programs-ready",
			function(e) {
				window.removeEventListener(e.type,arguments.callee,false);
				initBuffers();
				initShaders();
				initTextures();

			}, false);

		window.addEventListener("textures-load",
			function (e) {
				window.removeEventListener(e.type,arguments.callee,false);
				gl.frontFace(gl.CCW);
				gl.enable(gl.CULL_FACE);
				gl.depthFunc(gl.LESS);
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clearDepth(1.0);
				gl.activeTexture(gl.TEXTURE0);
				window.addEventListener("resize", resizeCanvas, false);
				worldview.cleanup.push(renderer);
				gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
				gl.viewport(0,0,worldview.width,worldview.height);
				gl.useProgram(renderer.water.gl);
				gl.vertexAttribPointer(renderer.water.coord, 4, gl.FLOAT, false, 0, 0);
				gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
				document.body.appendChild(worldview.canvas);
				resizeCanvas();
				renderer.animate(drawScene);
			}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}

}

function drawScene(timestamp) {
	var milliseconds = timestamp;

	var program = renderer.water;
	var offsets = renderer.offset;
	gl.useProgram(program.gl);

	gl.bindTexture(gl.TEXTURE_2D, renderer.noiseTex.gl);
	var waterperiod = 15000.0;
	gl.uniform4f( program.texoffset, 
			(milliseconds%waterperiod)/waterperiod, 0.0,
			0.527473 - (milliseconds%waterperiod)/waterperiod, 0.527473 );
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0*Kangas.sizeof.uint16);

	renderer.animate(drawScene);
}

function initBuffers() {

	var vrtxAttribs = [
	     -1.0,  -1.0, 0.0, 1.5,
	      1.0,  -1.0, 1.5, 1.5, 
	      1.0,   1.0, 1.5, 0.0, 
	     -1.0,   1.0, 0.0, 0.0, 
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

	gl.useProgram(renderer.water.gl);
	gl.uniform1i(renderer.water.texture, 0);
	gl.uniform1i(renderer.water.sky, 1);
	gl.uniformMatrix4fv(renderer.water.MVPmatrix, false, 
		Kangas.transform.identity);
	gl.uniform1f(renderer.water.horizon, 2.0);
	gl.uniform4f(renderer.water.perturbationAmplitude, 
			1.0, 1.0, 0.0, 2.0/renderer.noiseTex.patternSize[0]);
	gl.uniform1f(renderer.water.gain, 0.5);
	gl.uniform4fv(
			renderer.water.depthScaling, 
			new Float32Array([1.0, 1.0, 1.0, 1.0]));
	gl.uniform4fv(
			renderer.water.skycolors, 
			new Float32Array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]));
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
	gl.useProgram(renderer.water.gl);
	gl.uniformMatrix4fv(renderer.water.MVPmatrix, false, 
		renderer.projection);
}

