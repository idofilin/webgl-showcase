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
window.addEventListener("load", initCloudscape, false);
window.addEventListener("load", function(e) { clock = new Clock();document.body.appendChild(clock.domElement); }, false);

function Clock() {
	this.domElement=document.createElement("div");
	this.domElement.setAttribute("id", "hud");;
	this.domElement.innerHTML = "00:00";
}

var renderer = null;
var worldview = null;
var gl = null;
var shaderSource;
var displacement = [2.67, 0.0, -6.81];
var clock;
var skipCounter = 0;
var MVPtransformWasUpdated = false;

function initCloudscape(event) {
	var canvas = event && event.canvas || null;
	worldview = new Kangas(canvas, 
			{width:(window.innerWidth), height:(window.innerHeight), alpha:true, onContextLost:onContextLost});
	worldview.canvas.onscroll = function(e){e.preventDefault(); e.stopPropagation; return false};
	if(gl = worldview.gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function buildShaderPrograms (e) {
				window.removeEventListener(e.type,buildShaderPrograms,false);
				shaderSource = e.data;

				try {

					renderer.noiseTex = worldview.worleyFractalNoise(
							shaderSource,
							{width:1024, height:1024, density: 16, name: "commonNoise"});

					renderer.skyprog= new worldview.Program( 
						shaderSource.vshHeader + shaderSource.basic2d, 
						shaderSource.fshHeader + shaderSource.yuvMatrices + shaderSource.skyshader); 

				} catch (err){
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
				window.addEventListener("resize", resizeCanvas, false);
				worldview.cleanup.push(renderer);
				document.body.appendChild(worldview.canvas);
				renderer.animate(firstRendering);
			}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}
}

function firstRendering (timestamp) {
	gl.frontFace(gl.CCW);
	gl.enable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.blendFunc(gl.ONE_MINUS_DST_ALPHA,gl.DST_ALPHA);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.activeTexture(gl.TEXTURE0);

	gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

	resizeCanvas(true);
	calculateDayLight(Date.now())
	drawSky(timestamp);

	skipCounter = 1;
	renderer.animate(drawSky);
}

function drawSky(timestamp) {

	renderer.animate(drawSky);
	skipCounter = ++skipCounter % 2;
	if (skipCounter != 1) return;

	var program = renderer.skyprog;
	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.noiseTex.gl);
	gl.uniform1f(program.time, timestamp);

	var offsets = renderer.vertexData;
	gl.vertexAttribPointer(program.coord, 
			offsets.skyblit.coord.size, gl.FLOAT, false, 
			0,
			offsets.skyblit.coord.byteoffset);
	gl.drawElements(gl.TRIANGLES, 
			6, gl.UNSIGNED_SHORT, 
			offsets.skyblitIndices.byteoffset);

	if (MVPtransformWasUpdated) {
		MVPtransformWasUpdated = false;
		updateMVPTransform(renderer.tempdisplacement);
	}
	calculateDayLight(Date.now())
}

function initBuffers() {

	var eps = 1e-6;
	var zfar = -3.0
	var znear = -1.0

	renderer.zfar = zfar;
	renderer.znear = znear;

	renderer.skycolors = [
		//sunrise
		[ 247/255, 119/255, 96/255, 1.0, 72/255, 65/255, 83/255, 1.0, ],
		//mid-day
		[ 1.0, 1.0 , 1.0, 1.0, 43/255, 86/255, 139/255, 1.0,],
		//sunset
		[ 250/255, 124/255, 10/255, 1.0, 92/255, 65/255, 83/255, 1.0, ],
		//midnight
		[ 106/255, 56/255, 106/255, 1.0, 27/255, 16/255, 32/255, 1.0, ],
	
	];
	renderer.addVertexData("skyblit", {
		data: new Float32Array([
				 -1.0, -1.0, -3.0, 0.0,
				  1.0, -1.0, 3.0, 0.0,
				  1.0, 1.0, 3.0, 1.0,
				 -1.0, 1.0, -3.0, 1.0,
				]),
		attributes : [{coord:4}],
		bytesize : Kangas.sizeof.float32,
	});
	renderer.addVertexData("skyblitIndices", {
		buffertype : "index",
		data: new Uint16Array([
			0, 1, 2, 0, 2, 3,
		]),
		bytesize : Kangas.sizeof.uint16,
	});
	renderer.updateBuffers();
}

function initShaders () {
	gl.useProgram(renderer.skyprog.gl);
	gl.uniform1i(renderer.skyprog.noiseTexture, 0);
	var cloudspeed = 5.0; 
	gl.uniform4f(renderer.skyprog.cloudVelocity, 4e-5*cloudspeed, -1.666e-5*cloudspeed, 2.1e-5*cloudspeed, 7.0e-6*cloudspeed );
	gl.uniform4f(renderer.skyprog.cloudScaler, 0.12, Math.PI/20.0,  0.7, 0.775);
	gl.uniform4f(renderer.skyprog.cloudColoring, 0.4, 1.2, 0.2, 0.0);
	gl.uniformMatrix4fv(renderer.skyprog.MVPmatrix, false, Kangas.transform.identity);
}

function resizeCanvas (e) {
	if (worldview.canvas.width != worldview.canvas.clientWidth 
			|| worldview.canvas.height != worldview.canvas.clientHeight
			|| e === true) {
		worldview.width = worldview.canvas.clientWidth;
		worldview.height = worldview.canvas.clientHeight;
		gl.viewport (0.0, 0.0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		var skyX = 0.5/worldview.aspect;
		gl.bufferSubData(gl.ARRAY_BUFFER
				, renderer.vertexData.skyblit.coord.byteoffset
				, new Float32Array([
					 -1.0, -1.0, -skyX, 0.0,
					  1.0, -1.0, skyX, 0.0,
					  1.0, 1.0, skyX, 1.0,
					 -1.0, 1.0, -skyX, 1.0 ]));	
	}
}

function calculateDayLight (timestamp) {
	var seconds = timestamp/1000;
	var lightRotAxis = [0.0, 0.0, 1.0];
	var period = 60;
	var angle = (seconds%period - period/2)/(period/2) * Math.PI;
	renderer.lightVector =
		Kangas.transform.rotateVector(
			[1.0, 0.0, -0.0], lightRotAxis, angle);
	var ampmIndex = (renderer.lightVector[0] > 0) ? 0 : 2;
	var daynightIndex = (renderer.lightVector[1] > 0) ? 1 : 3;
	var interpFactor = Math.abs(renderer.lightVector[1]/lightRotAxis[2]);
	renderer.currentSkyColor = 
		Kangas.vector.interp(renderer.skycolors[ampmIndex]
			, renderer.skycolors[daynightIndex]
			, interpFactor);

	gl.useProgram(renderer.skyprog.gl);
	gl.uniform4fv(renderer.skyprog.skycolors, 
		new Float32Array(renderer.currentSkyColor));
	var skyX = 0.5 / worldview.aspect;
	gl.uniform4f(renderer.skyprog.sun, 
			-0.75*skyX, 0.25+renderer.lightVector[1], 0.0, 0.15*0.15);
	gl.useProgram(null);

	if (clock && clock.domElement) {
		var hour = ((angle+Math.PI)/(2.0*Math.PI)*24 + 18)%24;
		var minutes = Math.floor(60*(hour - Math.floor(hour)));
		clock.domElement.innerHTML = 
			((hour < 10) ? "0" : "") + Math.floor(hour)
			+ ":" + ((minutes < 10) ? "0" : "") + minutes;
	}
}

function onContextLost() {
	var canvasElements = document.getElementsByTagName("canvas");
	for (var i=0; i < canvasElements.length; i++)
		document.body.removeChild(canvasElements[i]);
	var evt = new CustomEvent("restore-context")
	delete worldview.canvas;
	initCloudscape(evt);
	var evt = new CustomEvent("shaders-load")
	evt.data = shaderSource;
	window.dispatchEvent(evt);
}

})()
