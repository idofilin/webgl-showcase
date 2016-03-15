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

function setupWebGL() {

	worldview = new Kangas(null, 
		{width:(Math.min(window.innerWidth,window.innerHeight)-5), 
			height:(Math.min(window.innerWidth,window.innerHeight)-5),});
	var gl = worldview.gl;
	if(gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function(e) {
				window.removeEventListener(e.type,arguments.callee,false);
				var shaderSource = e.data;

				renderer.blit= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d,
					shaderSource.fshHeader + shaderSource.basicLookup); 

				renderer.combiner= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d,
					shaderSource.fshHeader + shaderSource.combineTex); 
			
				renderer.filter= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d,
					shaderSource.fshHeader + shaderSource.smokeFilter); 


				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);


		window.addEventListener("programs-ready",
				function(e) {
					initBuffers();
				}, false);

		window.addEventListener("render-ready",
				function (e) {
					document.body.appendChild(worldview.canvas);
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
					gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
					window.addEventListener("resize", resizeCanvas, false);
					resizeCanvas();
					renderer.animate(updateColor);
				}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}
}

function updateColor() {
	var nowTime = new Date();
	var milliseconds = nowTime.getTime();
	var gl = worldview.gl;

	renderer.manoise.advance();

	gl.viewport(0,0,worldview.width,worldview.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	drawGeometry(milliseconds);
	drawToFramebuffers(milliseconds);
	renderer.animate(updateColor);
}

function drawToFramebuffers(timestamp) {
	var mvMatrix = renderer.mvMatrix;
	var fbo = renderer.fbo;
	var noise = renderer.manoise;
	var gl = worldview.gl;

	gl.disable(gl.DEPTH_TEST);

	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[0]);	
	gl.viewport(0,0,fbo[0].width,fbo[0].height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	program = renderer.filter;
	gl.useProgram(program.gl);

	var dx = 1.0/fbo[1].width;
	var dy = 1.0/fbo[1].height;
	var filterOffsets = [
		dx , 0.0,
		0.0, dy, 
		-dx, 0.0,
		0.0, -dy,
	];
	gl.uniform2fv(program.tcoffset, new Float32Array(filterOffsets));

	gl.bindTexture(gl.TEXTURE_2D, renderer.fbo[1].texture.gl);
	gl.uniform1i(program.texture, 0);
	gl.uniform1f(program.retain, 0.9 + 0.1 * Math.random());

	var PERIOD = -10000; //in millisecs
	backAngle =  17 / PERIOD * 2.0*Math.PI* ( 0.25 + 0.25*Math.random());
	gl.uniformMatrix4fv(program.MVPmatrix, false, 
			Kangas.transform.translationYawPitchRoll([0,0,0],[0,0,backAngle]));

	gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 0);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1]);	
	gl.viewport(0,0,fbo[1].width,fbo[1].height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	program = renderer.blit;
	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.fbo[0].texture.gl);
	gl.uniform1i(program.texture, 0);
	gl.uniformMatrix4fv(program.MVPmatrix, false, Kangas.transform.identity);

	gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 0);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
	program = renderer.combiner;
	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.galaxy_tex.gl);
	gl.uniform1i(program.texture, 0);

	var angle = timestamp*2*Math.PI/PERIOD;
	var mvMatrix = renderer.mvMatrix;
	mvMatrix[4] = -(mvMatrix[1] = Math.sin(angle)); 
	mvMatrix[5] = mvMatrix[0] = Math.cos(angle); 
	mvMatrix[12] = mvMatrix[13] = 0.0;
	gl.uniformMatrix4fv(program.MVPmatrix, false, mvMatrix);

	gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 0);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
}

function drawGeometry(timestamp) {
	var angle = timestamp*2*Math.PI/5000;
	var mvMatrix = renderer.mvMatrix;
	var gl = worldview.gl;

	mvMatrix[4] = -(mvMatrix[1] = Math.sin(angle)); 
	mvMatrix[5] = mvMatrix[0] = Math.cos(angle); 
	mvMatrix[12] = mvMatrix[13] = 0.0;

	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

	program = renderer.blit;
	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.fbo[0].texture.gl);
	gl.uniformMatrix4fv(program.MVPmatrix, false, Kangas.transform.identity);
	gl.uniform1i(program.texture, 0);
	gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 16*Kangas.sizeof.float32);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
}

function initBuffers() {
	var gl = worldview.gl;
	var vVertices = [
	     -1.0,   -1.0, 0.0 , 0.0,
	     1.0,   -1.0,  1.0 , 0.0,
	     1.0,   1.0,   1.0 , 1.0,
	     -1.0,   1.0,  0.0 , 1.0,
	     -1.2,   -1.2, 0.0 , 0.0,
	     1.2,   -1.2,  1.0 , 0.0,
	     1.2,   1.2,   1.0 , 1.0,
	     -1.2,   1.2,  0.0 , 1.0,
	];	
	renderer.vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STATIC_DRAW);

	var vIndices = [ 0,  1,  2 , 2 , 3 , 0 , 4 , 5 , 6, 6 , 7 , 4];
	renderer.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vIndices), gl.STATIC_DRAW);

	renderer.mvMatrix = Kangas.transform.identity;
	renderer.fbo = [ gl.createFramebuffer(), gl.createFramebuffer() ];
	
	for (var index=0; index < renderer.fbo.length; index++) {
		var fbo = renderer.fbo[index];
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		fbo.width = 1 << 9;
		fbo.height = 1 << 9;
		fbo.texture = new worldview.Texture(fbo,
			{filter:gl.NEAREST, wrap:gl.REPEAT});

	}
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);

	renderer.manoise = [];
	for (var i=0; i< 20; i++) {renderer.manoise.push(2.0*Math.random() - 1.0)}
	renderer.manoise.advance = function () {
		this.forEach(function(x,i,a){a[i] = 0.5*x + 0.5*(2.0*Math.random() - 1.0 );});
	}

	renderer.galaxy_tex = new worldview.Texture("galaxy-small.jpg",
		{format:gl.RGB, event:"render-ready", wrap:gl.REPEAT, filter: gl.NEAREST} );

	}

function resizeCanvas (e) {
	worldview.width = window.innerWidth;
	worldview.height = window.innerHeight;
	worldview.gl.viewport(0,0,worldview.width,worldview.height);
}

