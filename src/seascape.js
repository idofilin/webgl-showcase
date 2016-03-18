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
var displacement = [2.67, 0.0, -6.81];
var skipCounter = 0;
var MVPtransformWasUpdated = false;

function setupWebGL(event) {
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
					renderer.worleyTex  = worldview.worleyNoise(shaderSource,
							{width:1024, height:1024, density: 23, magfilter:gl.NEAREST, minfilter: gl.NEAREST_MIPMAP_NEAREST, name: "commonNoise"});
					renderer.noiseTex = worldview.fractalNoise(
						renderer.worleyTex, shaderSource,
						{width: 1024, height: 1024, name: "commonNoise"});
					gl.deleteTexture(renderer.worleyTex.gl);
					delete renderer.worleyTex;

					renderer.skyprog= new worldview.Program( 
						shaderSource.vshHeader + shaderSource.basic2d, 
						shaderSource.fshHeader + shaderSource.yuvMatrices + shaderSource.skyshader); 

					var basicVertexSahder = new worldview.Shader("vertex", shaderSource.vshHeader + shaderSource.basic3d);
					renderer.water= new worldview.Program( 
						basicVertexSahder, 
						shaderSource.fshHeader + shaderSource.yuvMatrices + shaderSource.noisyWater); 
					gl.deleteShader(basicVertexSahder.gl);

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
				initTextures();

			}, false);

		window.addEventListener("textures-load",
			function initializeRenderingLoop (e) {
				window.removeEventListener(e.type,initializeRenderingLoop,false);
				window.addEventListener("resize", resizeCanvas, false);
				worldview.moveTouchHandlers.push(panCamera);
				worldview.endTouchHandlers.push(endPanCamera);
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
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, renderer.skytex.gl);
	gl.activeTexture(gl.TEXTURE0);

	gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

	resizeCanvas(true);
	calculateDayLight(Date.now())
	drawSky(timestamp);

	skipCounter = 1;
	renderer.animate(frameDispatcher);
}

function frameDispatcher(timestamp) {
	renderer.animate(frameDispatcher);
	if (skipCounter == 1) {  
		drawScene(timestamp);
		if (MVPtransformWasUpdated) {
			MVPtransformWasUpdated = false;
			updateMVPTransform(renderer.tempdisplacement);
		}
		calculateDayLight(Date.now())
		drawSky(timestamp);
		resizeCanvas();
	} 	
	skipCounter = ++skipCounter % 4;
}

function drawScene(timestamp) {
	var offsets = renderer.vertexData;
	var program = renderer.water;
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.noiseTex.gl);
	gl.uniformMatrix4fv(renderer.water.MVPmatrix, false,
		renderer.waterMvpMatrix);
	var wavemovement = (-timestamp%renderer.wavePeriod)/renderer.wavePeriod;
	gl.uniform4f(program.texoffset, 
			-0.5 * renderer.tempdisplacement[0] + wavemovement, 
			-renderer.tempdisplacement[2], 
			-0.5 * renderer.tempdisplacement[0] - wavemovement + 0.527473, 
			-renderer.tempdisplacement[2] + 0.527473);
	gl.vertexAttribPointer(program.position, 
			offsets.seascape.position.size, gl.FLOAT, false, 
			offsets.seascape.bytestride, 
			offsets.seascape.position.byteoffset);
	gl.vertexAttribPointer(program.texcoord, 
			offsets.seascape.texcoord.size, gl.FLOAT, false, 
			offsets.seascape.bytestride, 
			offsets.seascape.texcoord.byteoffset);
	gl.drawElements(gl.TRIANGLES, 
			12, gl.UNSIGNED_SHORT, 
			offsets.seascapeIndices.byteoffset);
}

function drawSky(timestamp) {

	var fbo = renderer.skyfbo;
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.viewport (0.0, 0.0, fbo.width, fbo.height);

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
			offsets.seascapeIndices.byteoffset);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport (0.0, 0.0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

function initBuffers() {

	var eps = 1e-6;
	var horizon = 0.25;
	var zfar = -3.0
	var znear = -1.0

	renderer.horizon = horizon;
	renderer.zfar = zfar;
	renderer.znear = znear;

	renderer.wavePeriod = 1000 * renderer.noiseTex.patternSize[0];
	if (!displacement || !(displacement instanceof Array) || displacement.length != 3)
		displacement = renderer.tempdisplacement= renderer.displacement = [3.0, 0.0, -2.0];
	else
		renderer.displacement = renderer.tempdisplacement = displacement;
	
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

	var seascalecoeff = 1.0;
	renderer.addVertexData("seascape", {
		data: new Float32Array([
				 -100, 0.0, znear, -50*seascalecoeff, znear,
				 +100, 0.0, znear, 50*seascalecoeff, znear,
				 +300, 0.0, zfar, 150*seascalecoeff, znear + (zfar - znear)*seascalecoeff, 
				 -300, 0.0, zfar, -150*seascalecoeff, znear + (zfar - znear)*seascalecoeff, 
				 -300.0, 0.0, zfar+eps, 0.0, 0.0, 
				  300.0, 0.0, zfar+eps, 1.0, 0.0, 
				  300.0, 100.0, zfar+eps, 1.0, 1.0,
				 -300.0, 100.0, zfar+eps, 0.0, 1.0, 
				]),
		attributes : [{position:3}, {texcoord:2}],
		bytesize : Kangas.sizeof.float32,
	});
	renderer.addVertexData("seascapeIndices", {
		buffertype : "index",
		data: new Uint16Array([
			0, 1, 2, 0, 2, 3,
			4, 5, 6, 4, 6, 7,
		]),
		bytesize : Kangas.sizeof.uint16,
	});

	renderer.updateBuffers();
}

function initShaders () {

	gl.useProgram(renderer.water.gl);
	gl.uniform1i(renderer.water.texture, 0);
	gl.uniform1i(renderer.water.sky, 1);
	gl.uniform4f(renderer.water.displacement, 0.0, 0.0, 0.0, 0.0);
	gl.uniform4f(renderer.water.perturbationAmplitude, 
			1.0, 1.0, 0.0, 2.0/renderer.noiseTex.patternSize[0]);
	gl.uniform1f(renderer.water.horizon, renderer.horizon);
	gl.uniform1f(renderer.water.gain, 0.5);

	gl.useProgram(renderer.skyprog.gl);
	gl.uniform1i(renderer.skyprog.noiseTexture, 0);
	var cloudspeed = 1.25; 
	gl.uniform4f(renderer.skyprog.cloudVelocity, 4e-5*cloudspeed, -1.0e-5*cloudspeed, 2.1e-5*cloudspeed, 7.0e-6*cloudspeed );
	gl.uniform4f(renderer.skyprog.cloudScaler, 0.05, Math.PI/50.0,  0.7, 0.775);
	gl.uniform4f(renderer.skyprog.cloudColoring, 0.4, 1.2, 0.2, 0.0);
	gl.uniformMatrix4fv(renderer.skyprog.MVPmatrix, false, Kangas.transform.identity);
}

function initTextures () {
	var fbosize = Math.max(gl.drawingBufferWidth, gl.drawingBufferWidth);
	fbosize = Math.pow(2, Math.ceil(Math.log2(fbosize)));
	var skyfbo;
	skyfbo = renderer.skyfbo = gl.createFramebuffer();
	skyfbo.height = fbosize/2.0;
	skyfbo.width = fbosize;
	renderer.skytex = new worldview.Texture(skyfbo,
		{filter: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE, format:gl.RGBA});
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	window.dispatchEvent(new CustomEvent("textures-load"));
}

function resizeCanvas (e) {
	if (worldview.canvas.width != worldview.canvas.clientWidth 
			|| worldview.canvas.height != worldview.canvas.clientHeight
			|| e === true) {
		worldview.width = worldview.canvas.clientWidth;
		worldview.height = worldview.canvas.clientHeight;
		gl.viewport (0.0, 0.0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		updateProjection();
		var skyX = 1.8 / (1.0 - renderer.horizon) / renderer.mvpMatrix[0];
		gl.bufferSubData(gl.ARRAY_BUFFER
				, renderer.vertexData.skyblit.coord.byteoffset
				, new Float32Array([
					 -1.0, -1.0, -skyX, 0.0,
					  1.0, -1.0, skyX, 0.0,
					  1.0, 1.0, skyX, 1.0,
					 -1.0, 1.0, -skyX, 1.0 ]));	
	}
}

function updateProjection () {
	var matrices = 
		Kangas.transform.rampPerspective(
			1.2, 
			1.0, 
			worldview.aspect, 
			renderer.znear, renderer.zfar, renderer.horizon);

	renderer.projection = matrices.projection;
	renderer.backgroundProjection = matrices.groundProjection;
	var constants = matrices.constants;
	renderer.depthAlignment = 
		new Float32Array([
			(1.0-constants.depthstar)/(1+constants.horizon) + constants.depthstar,
			(1.0-constants.depthstar)/(1+constants.horizon),
			-1.0/constants.hramp/2.0,
			1.0/constants.hramp/2.0*0.9,
		]);
	gl.useProgram(renderer.water.gl);	
	gl.uniform4fv(
			renderer.water.depthScaling, 
			renderer.depthAlignment);
	gl.useProgram(null);	
	updateMVPTransform(renderer.displacement);
}

function updateMVPTransform (delta) {
	var scalingAndTranslation = 
		Kangas.transform.translation(delta);
	var MVP = Kangas.transform.matrixProduct(
			renderer.projection, scalingAndTranslation);
	var waterMVP = Kangas.transform.matrixProduct(
			renderer.projection, Kangas.transform.translation([0.0, 0.0, 0.0]));
	renderer.mvpMatrix = MVP;
	renderer.waterMvpMatrix = waterMVP;
}

function panCamera(evt, startEvt) {
	var se, e;  
	if (evt.touches) {
		se = startEvt[0].touches[0];
		for (var i=0 ; i < evt.touches.length; ++i) {
			if (evt.touches[i].identifier == se.identifier) {
				e = evt.touches[i];
				break;
			}
		}
	} else {
		se = startEvt[0];
		e = evt;
	}
	if (!e) return;
	var startX = se.pageX; 
	var startY = se.pageY;
	var delta = [0.0, 0.0, 0.0];
	delta[0] = 2.0*(e.pageX - startX)/worldview.width/renderer.projection[0];
	delta[2] = (renderer.znear - renderer.zfar)*(e.pageY - startY)/worldview.height/renderer.projection[5];
	var tempdisplacement = delta.map(function(x,i){return x + renderer.displacement[i]});
	MVPtransformWasUpdated = true;
	renderer.tempdisplacement = tempdisplacement;
}

function endPanCamera (evt, startEvt) {
	if (evt.touches && evt.touches.length > 0)
		return;
	displacement = renderer.displacement = renderer.tempdisplacement;
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

	gl.useProgram(renderer.water.gl);
	var interpFactor = Math.abs(renderer.lightVector[1]/lightRotAxis[2]);
	renderer.currentSkyColor = 
		Kangas.vector.interp(renderer.skycolors[ampmIndex]
			, renderer.skycolors[daynightIndex]
			, interpFactor);
	gl.uniform4fv(renderer.water.skycolors, 
		new Float32Array(renderer.currentSkyColor));

	gl.useProgram(renderer.skyprog.gl);
	gl.uniform4fv(renderer.skyprog.skycolors, 
		new Float32Array(renderer.currentSkyColor));
	var skyX = 1.8 / (1.0 - renderer.horizon) / renderer.mvpMatrix[0];
	gl.uniform4f(renderer.skyprog.sun, 
			-0.75*skyX, 0.5+0.5*renderer.lightVector[1], 0.0, 0.16);

	gl.useProgram(null);
}

function onContextLost() {
	var canvasElements = document.getElementsByTagName("canvas");
	for (var i=0; i < canvasElements.length; i++)
		document.body.removeChild(canvasElements[i]);
	var evt = new CustomEvent("restore-context")
	delete worldview.canvas;
	setupWebGL(evt);
	var evt = new CustomEvent("shaders-load")
	evt.data = shaderSource;
	window.dispatchEvent(evt);
}

})()
