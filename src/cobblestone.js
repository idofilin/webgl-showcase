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
var animationRequestID = null;
var numHouses = 1000;
var shaderSource;
var tempdisplacement;
var MVPtransformWasUpdated = false; 

function setupWebGL() {

	worldview = new Kangas(null, 
		{width:(window.innerWidth), height:(window.innerHeight),});

	gl = worldview.gl;
	if(gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function prepareShaders (e) {
				window.removeEventListener(e.type,prepareShaders,false);
				shaderSource = e.data;

				renderer.noiseTex = worldview.worleyFractalNoise(
						shaderSource,
						{width:1024, height:1024, density: 16, name: "commonNoise"});

				renderer.simple= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d, 
					shaderSource.fshHeader + shaderSource.basicLookup); 

				renderer.surface= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic3d, 
					shaderSource.fshHeader + shaderSource.surface); 

				renderer.skyprog = new worldview.Program(
						shaderSource.vshHeader + shaderSource.basic3d,
						shaderSource.fshHeader + shaderSource.sky);

				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);

		window.addEventListener("programs-ready",
			function initData (e) {
				window.removeEventListener(e.type,initData,false);
				initBuffers();
				initShaders();
				initTextures();
			}, false);

		window.addEventListener("textures-load",
			function launchRenderingLoop (e) {
				window.removeEventListener(e.type,launchRenderingLoop,false);
				renderer.dayCycle = {callback: calculateDayLight, callPeriod:100};
				renderer.dayCycle.callback((new Date()).getTime());
				gl.frontFace(gl.CCW);
				gl.enable(gl.CULL_FACE);
				gl.depthFunc(gl.LESS);
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clearDepth(1.0);
				window.addEventListener("resize", resizeCanvas, false);
				worldview.cleanup.push(cleanContextBeforePageUnload);
				worldview.cleanup.push(renderer);
				worldview.moveTouchHandlers.push(drag);
				worldview.endTouchHandlers.push(endDrag);
				document.body.appendChild(worldview.canvas);
				animationRequestID = renderer.animate(function(t) {
					resizeCanvas();
					initTextureAtlas();
					gl.activeTexture(gl.TEXTURE1);
					gl.bindTexture(gl.TEXTURE_2D, renderer.bumptex.gl);
					gl.activeTexture(gl.TEXTURE2);
					gl.bindTexture(gl.TEXTURE_2D, renderer.noiseTex.gl);
					gl.activeTexture(gl.TEXTURE0);
					gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
					gl.enable(gl.DEPTH_TEST);
					gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
					animationRequestID = renderer.animate(drawScene);
				});
			}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}

}

function drawScene(timestamp) {
	animationRequestID = renderer.animate(drawScene);
	var milliseconds = timestamp;
	var program = renderer.surface;
	var offsets = renderer.offset;
	
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.colortex.gl);
	gl.uniform1f(renderer.surface.isGround, 0.0);
	gl.uniformMatrix4fv(program.MVPmatrix, false, renderer.mvpMatrix);
	gl.vertexAttribPointer(program.position, 3, gl.FLOAT, false, 
		offsets.houses.stride, offsets.houses.position);
	gl.vertexAttribPointer(program.texcoord, 2, gl.FLOAT, false, 
		offsets.houses.stride, offsets.houses.texture);
	gl.drawElements(gl.TRIANGLES, 6*numHouses, gl.UNSIGNED_SHORT, 0);

	gl.bindTexture(gl.TEXTURE_2D, renderer.cobble.gl);
	gl.uniform1f(renderer.surface.isGround, 1.0);
	gl.vertexAttribPointer(program.position, 3, gl.FLOAT, false, 
		offsets.ground.stride, offsets.ground.position);
	gl.vertexAttribPointer(program.texcoord, 2, gl.FLOAT, false, 
		offsets.ground.stride, offsets.ground.texture);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	var program = renderer.skyprog;
	gl.useProgram(program.gl);
	gl.uniform1f(program.time, timestamp);
	gl.uniformMatrix4fv(program.MVPmatrix, false, renderer.skyMatrix);
	gl.vertexAttribPointer(program.position, 3, gl.FLOAT, false, 
		offsets.sky.stride, offsets.sky.position);
	gl.vertexAttribPointer(program.texcoord, 2, gl.FLOAT, false, 
		offsets.sky.stride, offsets.sky.texture);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	if (MVPtransformWasUpdated) {
		MVPtransformWasUpdated = false;
		updateMVPTransform(renderer.tempdisplacement);
	}
}

function initBuffers() {

	var sceneSize = 10.0;
	var sceneTexSize = 40.0;
	var eps = 1e-6;
	var horizon = 0.33;
	renderer.displacement = renderer.tempdisplacement = [0.0, 0.0,-sceneSize];
	
	renderer.offset={};

	var vrtxAttribs = [
	     -1.0,  -1.0, 0.0, 0.0,
	      1.0,  -1.0, 1.0, 0.0, 
	      1.0,   1.0, 1.0, 1.0, 
	     -1.0,   1.0, 0.0, 1.0, 
	];

	renderer.offset.sky = { 
		position: vrtxAttribs.length*Kangas.sizeof.float32,
		texture: (vrtxAttribs.length+3)*Kangas.sizeof.float32,
		stride: 5*Kangas.sizeof.float32,
	};

	vrtxAttribs = vrtxAttribs.concat([
		 -1.0, horizon, -1.0+eps, 0.0, 0.0, 
		  1.0, horizon, -1.0+eps, 1.0, 0.0, 
		  1.0, 1.0, -1.0+eps, 1.0, 1.0,
		 -1.0, 1.0, -1.0+eps, 0.0, 1.0, 
	 ]);

	renderer.offset.ground = { 
		position: vrtxAttribs.length*Kangas.sizeof.float32,
		texture: (vrtxAttribs.length+3)*Kangas.sizeof.float32,
		stride: 5*Kangas.sizeof.float32,
	};

	vrtxAttribs = vrtxAttribs.concat([
		 -sceneSize, 0.0, +sceneSize, 0.0, 0.0,
		 +sceneSize, 0.0, +sceneSize, +sceneTexSize, 0.0,
		 +sceneSize, 0.0, -sceneSize, +sceneTexSize, +sceneTexSize, 
		 -sceneSize, 0.0, -sceneSize, 0.0, +sceneTexSize, 
	 ]);

	renderer.offset.houses = { 
		position: vrtxAttribs.length*Kangas.sizeof.float32,
		texture: (vrtxAttribs.length+3)*Kangas.sizeof.float32,
		stride: 5*Kangas.sizeof.float32,
	};

	vrtxAttribs = vrtxAttribs.concat([
		  -0.4, 0.0, 0, 0.01, 0.00,
		   0.4, 0.0, 0, 0.49, 0.00, 
		   0.4, 0.8, 0, 0.49, 0.49, 
		  -0.4, 0.8, 0, 0.01, 0.49,  
	]);
	
	var vrtxIndices = [
		0 , 1, 2, 0, 2, 3
	];

	var posOffset = 56,
	    texcoordOffset = 59,
	    randomOffsetX, 
		randomOffsetZ, 
		randomTexOffsetS, 
		randomTexOffsetT;
	for (var index = 1; index < numHouses; index++) {
		randomOffsetX = (2.0*Math.random() - 1.0) * sceneSize;
		randomOffsetZ = (2.0*Math.random() - 1.0) * sceneSize;
		randomTexOffsetS = randomTexOffsetT = 0.0;
		while (randomTexOffsetT === 0.0 && randomTexOffsetS === 0.0) {
			randomTexOffsetS = Math.round(Math.random())*0.5;
			randomTexOffsetT = Math.round(Math.random())*0.5;
		}
		for (var j = 0; j < 4; j++) {
			vrtxAttribs.push(vrtxAttribs[posOffset+j*5] + randomOffsetX);
			vrtxAttribs.push(vrtxAttribs[posOffset+j*5+1]);
			vrtxAttribs.push(vrtxAttribs[posOffset+j*5+2] + randomOffsetZ);
			vrtxAttribs.push(vrtxAttribs[texcoordOffset+j*5] + randomTexOffsetS);
			vrtxAttribs.push(vrtxAttribs[texcoordOffset+j*5+1] + randomTexOffsetT);
			vrtxIndices.push(vrtxIndices[(index-1)*6+j]+4);
		}
		vrtxIndices.push(vrtxIndices[(index-1)*6 + 4]+4);
		vrtxIndices.push(vrtxIndices[(index-1)*6 + 5]+4);
	}

	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vrtxAttribs), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vrtxIndices), gl.STATIC_DRAW);

	renderer.horizon = horizon;

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
}

function initShaders () {

	gl.useProgram(renderer.surface.gl);
	gl.uniform1i(renderer.surface.colortexture, 0);
	gl.uniform1i(renderer.surface.depthMap, 1);
	gl.uniform1i(renderer.surface.normalSwizzle, 0);

	gl.useProgram(renderer.simple.gl);
	gl.uniform1i(renderer.simple.texture, 0);
	gl.uniformMatrix4fv(renderer.simple.MVPmatrix, false, 
		Kangas.transform.identity);

	gl.useProgram(renderer.skyprog.gl);
	gl.uniform1i(renderer.skyprog.noiseTexture, 2);
	gl.uniform4f(renderer.skyprog.sun, 
			0.0, 100, 0.0, 0.1);
	var cloudspeed = 1.25; 
	gl.uniform4f(renderer.skyprog.cloudVelocity, 4e-5*cloudspeed, -1.0e-5*cloudspeed, 2.1e-5*cloudspeed, 7.0e-6*cloudspeed );
	gl.uniform4f(renderer.skyprog.cloudScaler, 0.05, Math.PI/50.0,  0.7, 0.775);
	gl.uniform4f(renderer.skyprog.cloudColoring, 0.4, 1.2, 0.2, 0.0);
	gl.uniformMatrix4fv(renderer.skyprog.MVPmatrix, false, Kangas.transform.identity);
}

function updateProjection () {
	var projection = Kangas.transform.rampPerspective(
			0.0,
			1.0, 
			worldview.aspect, 
			-1.0, -3.0, renderer.horizon).projection;
	renderer.projection = projection;
	updateMVPTransform(renderer.displacement);
}

function updateMVPTransform (delta) {
	var scalingAndTranslation = Kangas.transform.identity;
	var MVP = Kangas.transform.matrixProduct(
			renderer.projection,
			Kangas.transform.translation(delta));
	renderer.mvpMatrix = MVP;
	renderer.skyMatrix = Kangas.transform.matrixProduct(
			Kangas.transform.reverseHandedness,
			scalingAndTranslation); 
	gl.useProgram(renderer.surface.gl);
	gl.uniformMatrix4fv(renderer.surface.MVPmatrix, false, MVP);
}

function initTextures () {
	var imageTextures = worldview.Texture.batchLoad([ 
			{ src : "cobblestone-houses.jpg", format:gl.RGB, wrap: gl.CLAMP_TO_EDGE },
			{ src: "cobblestone.jpg", format:gl.RGB, wrap: gl.REPEAT },
			]);
	renderer.houses = imageTextures[0];
	renderer.cobble = imageTextures[1];

}

function drag(evt, startEvt) {
	var se = (startEvt[0].touches) ? startEvt[0].touches[0] : startEvt[0];
	var e = (evt.touches) ? evt.touches[0] : evt;
	var startX = se.pageX; 
	var startY = se.pageY;
	var delta = [0.0, 0.0, 0.0];
	delta[0] = 2.0*(e.pageX - startX)/worldview.width/renderer.projection[0];
	delta[2] = 2.0*(e.pageY - startY)/worldview.height/renderer.projection[5];
	var tempdisplacement = delta.map(function(x,i){return x + renderer.displacement[i]});
	renderer.tempdisplacement = tempdisplacement;
	MVPtransformWasUpdated = true;
}

function endDrag (evt, startEvt) {
	if (evt.touches && evt.touches.length > 0)
		return;
	renderer.displacement = renderer.tempdisplacement;
}

function calculateDayLight (timestamp) {
	var seconds = timestamp/1000;
	var lightRotAxis = [0.0, -0.2, 1.0];
	var angle = ((seconds)%120 - 60)/60 * Math.PI;
	renderer.lightVector = 
		Kangas.transform.rotateVector(
			[-1, 0, 0], lightRotAxis, angle);
	var program = renderer.skyprog;
	var ampmIndex = (renderer.lightVector[0] > 0) ? 0 : 2;
	var daynightIndex = (renderer.lightVector[1] > 0) ? 1 : 3;
	gl.useProgram(program.gl);
	var interpFactor = Math.abs(renderer.lightVector[1]/lightRotAxis[2]);
	renderer.currentSkyColor = 
		Kangas.vector.interp(renderer.skycolors[ampmIndex]
			, renderer.skycolors[daynightIndex]
			, interpFactor);
	gl.uniform4fv(program.skycolors, 
		new Float32Array(renderer.currentSkyColor));

	gl.useProgram(renderer.surface.gl);
	gl.uniform3fv(renderer.surface.lightposition
		, renderer.lightVector);
	gl.uniform4fv(renderer.surface.fogColor, (new Float32Array(renderer.currentSkyColor)).subarray(0,4));
	gl.uniform1f(renderer.surface.ambientLight, 0.2 + 0.2*(renderer.lightVector[1]+0.5));
	gl.useProgram(null);
}

function initTextureAtlas() {

	gl.disable(gl.CULL_FACE);

	var vrtxAttribs = [
		-1.0, -1.0, 0.0, 0.0,
		 0.0, -1.0, 1.0, 0.0,
		 0.0,  0.0, 1.0, 1.0,
		-1.0,  0.0, 0.0, 1.0,

		 0.0, -1.0, 0.0, 0.0,
		 1.0, -1.0, 0.5, 0.0,
		 1.0,  0.0, 0.5, 0.5,
		 0.0,  0.0, 0.0, 0.5,

		-1.0,  0.0, 0.5, 0.5, 
		 0.0,  0.0, 1.0, 0.5,
		 0.0,  1.0, 1.0, 1.0,
		-1.0,  1.0, 0.5, 1.0,

		 0.0,  0.0, 0.0, 0.5,
		 1.0,  0.0, 0.5, 0.5,
		 1.0,  1.0, 0.5, 1.0,
		 0.0,  1.0, 0.0, 1.0,
	];
	var vrtxIndices = [
		0 , 1, 2, 0, 2, 3,
		4, 5, 6, 4, 6, 7,
		8, 9, 10, 8, 10, 11,
		12, 13, 14, 12, 14, 15,
	];
	var vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vrtxAttribs), gl.STATIC_DRAW);
	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vrtxIndices), gl.STATIC_DRAW);

	var fbo = gl.createFramebuffer();
	fbo.height = fbo.width = 1024;
	var fboBoundTex = new worldview.Texture(fbo,
		{wrap: gl.REPEAT, format:gl.RGB, minfilter: gl.LINEAR_MIPMAP_LINEAR, magfilter: gl.LINEAR});

	gl.disableVertexAttribArray(1);
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.viewport (0.0, 0.0, fbo.width, fbo.height);
	gl.clearColor(1.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	gl.useProgram(renderer.simple.gl);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, renderer.cobble.gl);
	gl.uniform1i(renderer.simple.texture, 0);
	gl.uniformMatrix4fv(renderer.simple.MVPmatrix, false, Kangas.transform.identity);
	gl.vertexAttribPointer(renderer.simple.coord, 4, gl.FLOAT, false, 0, 0);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	gl.bindTexture(gl.TEXTURE_2D, renderer.houses.gl);
	gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 6*Kangas.sizeof.uint16);
	gl.enableVertexAttribArray(1);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	gl.useProgram(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.deleteBuffer(vertexBuffer);
	gl.deleteBuffer(indexBuffer);

	renderer.colortex = fboBoundTex; 
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(fbo);

	gl.bindTexture(gl.TEXTURE_2D, fboBoundTex.gl);
	gl.generateMipmap(gl.TEXTURE_2D);

	renderer.bumptex = renderer.colortex.bumpmap(shaderSource
		, {size: [1024, 1024], 
			weights: [
				0.299, 0.587, 0.114,
				6.0 , 0.0, -6.0,
				6.0 , 0.0, -6.0 ]});

	gl.viewport(0,0,worldview.width,worldview.height);
}

function resizeCanvas (e) {
	worldview.width = window.innerWidth;
	worldview.height = window.innerHeight; gl.viewport(0,0,worldview.width,worldview.height);
	updateProjection();
	var skyX = 2.0 / (1.0 - renderer.horizon) / renderer.mvpMatrix[0];
	var eps = 1e-6;
	gl.bufferSubData(gl.ARRAY_BUFFER
			, renderer.offset.sky.position
			, new Float32Array([
	   			-1.0, renderer.horizon, -1.0+eps, -skyX, 0.0, 
		  		1.0, renderer.horizon, -1.0+eps, skyX, 0.0, 
			   	1.0, 1.0, -1.0+eps, skyX, 1.0,
				-1.0, 1.0, -1.0+eps, -skyX, 1.0,]));	
}

function cleanContextBeforePageUnload (e) {
	var gl = this.gl;
	window.cancelAnimationFrame(animationRequestID);
	gl.bindTexture(gl.TEXTURE_2D,null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

})()
