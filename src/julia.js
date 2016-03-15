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
var worldview = null;
var gl = null;
var renderer = null;

function setupWebGL() {

	worldview = new Kangas(null, 
		{width:(window.innerWidth), height:(window.innerHeight),});
	gl = worldview.gl;
	document.body.appendChild(worldview.canvas);
	if(gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function buildShaderPrograms (e) {
				window.removeEventListener(e.type,buildShaderPrograms,false);
				var shaderSource = e.data;
				try {
					var basicVshader = new worldview.Shader(gl.VERTEX_SHADER, shaderSource.vshHeader + shaderSource.basic2d);
					renderer.fractal = new worldview.Program(basicVshader, shaderSource.fshHeader + shaderSource.mandelbrot); 
					gl.deleteShader(basicVshader.gl);
				} catch (err){
					throw err;
					return;
				}
				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);

		window.addEventListener("programs-ready",
				function(e) {
					initBuffers();
					var event = new CustomEvent("render-ready");
					window.dispatchEvent(event);
				}, false);

		window.addEventListener("render-ready",
				function (e) {
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
					gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
					gl.viewport(0,0,worldview.width,worldview.height);
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
					var program = renderer.fractal;
					gl.useProgram(program.gl);
					gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 0);
					gl.uniformMatrix4fv(program.MVPmatrix, false, Kangas.transform.identity);
					window.addEventListener("resize", resizeCanvas, false);
					resizeCanvas();
					renderer.animate(renderScene);
				}, false);

	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}
}

function renderScene() {
	var nowTime = new Date();
	var milliseconds = nowTime.getTime();
	var angle = (milliseconds * 2.0 * Math.PI / 30000.0) % (2000.0 * Math.PI);
	var radius = 1.0;
	var cx = -0.25+radius*Math.cos(angle);
	var cy = radius*Math.sin(angle*Math.PI/4.0);
	var program = renderer.fractal;
	gl.useProgram(program.gl);
	gl.uniform2f(program.julia_c, cx, cy);
	gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, 0);
	
	document.getElementById("c-value").innerHTML = "c=(" + cx.toFixed(3) + ", " + cy.toFixed(3) + ")" ;
	renderer.animate(renderScene);
}

function initBuffers() {
	var ratio = worldview.height/worldview.width;
	var texsize = 2.0;
	var vVertices = [
	     -1.0,   -1.0, -texsize,   -texsize*ratio, 
	     1.0,   -1.0,  texsize,   -texsize*ratio, 
	     1.0,   1.0,   texsize,   texsize*ratio, 
	     -1.0,   1.0,  -texsize,   texsize*ratio, 
	];	
	renderer.vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STATIC_DRAW);

	var vIndices = [ 0,  1,  2 , 3 ];
	renderer.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vIndices), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function resizeCanvas (e) {
	worldview.width = window.innerWidth;
	worldview.height = window.innerHeight;
	worldview.gl.viewport(0,0,worldview.width,worldview.height);
}

})()
