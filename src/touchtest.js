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
 
window.addEventListener("load", setupContext, false);

var renderer = null;
var worldview = null;
var gl = null;
var shaderSource;
var firstRendering = false;

function setupContext(event) {
	var canvas = event && event.canvas || null;
	worldview = new Kangas(canvas, 
			{width:(window.innerWidth), height:(window.innerHeight), alpha:true, onContextLost:onContextLost});
	gl = worldview.gl;
	/*gl.getExtension("EXT_frag_depth");*/
	if(gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function buildShaderPrograms (e) {
				window.removeEventListener(e.type,buildShaderPrograms,false);
				shaderSource = e.data;

				renderer.basic= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d, 
					shaderSource.fshHeader + shaderSource.colorVectorField); 

				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);

		window.addEventListener("programs-ready",
			function initializeData (e) {
				window.removeEventListener(e.type,initializeData,false);
				initBuffers();
				initShaders();
				window.dispatchEvent(new CustomEvent("textures-load"));
			}, false);

		window.addEventListener("textures-load",
			function initializeRenderingLoop (e) {
				window.removeEventListener(e.type,initializeRenderingLoop,false);
				gl.clearColor(0.0, 0.0, 1.0, 0.0);
				gl.clearDepth(1.0);
				window.addEventListener("resize", resizeCanvas, false);
				worldview.startTouchHandlers.push(startTouches);
				worldview.moveTouchHandlers.push(processTouches);
				worldview.endTouchHandlers.push(endTouches);
				worldview.cleanup.push(renderer);
				worldview.width = window.innerWidth;
				worldview.height = window.innerHeight;
				gl.viewport(0,0,worldview.width,worldview.height);
				gl.enable(gl.DEPTH_TEST);
				gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
				gl.lineWidth(5.0);
				document.body.appendChild(worldview.canvas);
				firstRendering = true;
				renderer.animate(skipFrame);
			}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}

}

function drawScene(timestamp) {

	var offsets = renderer.offset;
	var program;

	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

	gl.useProgram(renderer.basic.gl);
	gl.vertexAttribPointer(renderer.basic.coord, 4, gl.FLOAT, false, 
		0*Kangas.sizeof.float32, 0);
	gl.drawElements(gl.LINES, renderer.buffersLength, gl.UNSIGNED_SHORT, 0);

	renderer.animate(skipFrame);
}

function skipFrame(timestamp) {

	resizeCanvas();

	renderer.animate(drawScene);
}

function resizeCanvas (e) {
	if (worldview.canvas.width != worldview.canvas.clientWidth 
			|| worldview.canvas.height != worldview.canvas.clientHeight 
			|| firstRendering) {
		if (firstRendering) firstRendering = false;
		worldview.width = worldview.canvas.clientWidth;
		worldview.height = worldview.canvas.clientHeight;
		gl.viewport (0.0, 0.0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}
}

function startTouches(evt,startEvts) {
	if (!startEvts.touchPath)
		startEvts.touchPath = [];
}

function processTouches(evt, startEvts) {
	var se = (startEvts[0].touches) ? startEvts[0].touches[0] : startEvts[0];
	var e = (evt.touches) ? evt.touches[0] : evt;
	var timetag = Date.now();
	startEvts.touchPath.push({
		t: timetag,
		x: 2.0 * (e.clientX)/worldview.width - 1.0, 
		y: 1.0 - 2.0 * (e.clientY)/worldview.height, 
	});
	return false;
}

function endTouches(evt, startEvts) {
	updateBuffers(startEvts.touchPath);
}

function updateBuffers(path) {

	var vrtxAttribs = [];
	var vrtxIndices = [];
	for (var index = 0; index < path.length; index++) {
		var current = path[index];
		vrtxAttribs.push(current.x);
		vrtxAttribs.push(current.y);
		if (index == 0) { 
			vrtxAttribs.push(0.0);
			vrtxAttribs.push(0.0);
		} else {
			var dt = (1e-6 + current.t - path[index-1].t);
			vrtxAttribs.push((current.x - path[index-1].x)/dt * 100 * 0.5 + 0.5);
			vrtxAttribs.push((current.y - path[index-1].y)/dt * 100 * 0.5 + 0.5);
		}
		vrtxIndices.push(index);
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vrtxAttribs), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vrtxIndices), gl.STATIC_DRAW);

	renderer.buffersLength = path.length;
}

function initBuffers () {
	renderer.vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 0.0, 0.0]), gl.STATIC_DRAW);
	renderer.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([1]), gl.STATIC_DRAW);
	renderer.buffersLength = 0;
}

function initShaders () {

	gl.useProgram(renderer.basic.gl);
	gl.uniform1i(renderer.basic.texture, 0);
	gl.uniformMatrix4fv(renderer.basic.MVPmatrix, false, Kangas.transform.reverseHandedness);
}

function onContextLost() {
	var canvasElements = document.getElementsByTagName("canvas");
	for (var i=0; i < canvasElements.length; i++)
		document.body.removeChild(canvasElements[i]);
	var evt = new CustomEvent("restore-context")
	delete worldview.canvas;
	setupContext(evt);
	var evt = new CustomEvent("shaders-load")
	evt.data = shaderSource;
	window.dispatchEvent(evt);
}


