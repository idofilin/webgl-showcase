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
var numParticlesInBuffer = 300;
var numParticlesOnScreen = 300;
var vParticleVertices = [];
var vParticleIndices = [];
var numParticlesAttribs = 5;
var worldview = null;

function setupWebGL() {
	
	worldview = new Kangas(null, 
		{width:window.innerWidth, height:window.innerHeight,});
	var gl;
	if(gl = worldview.gl) {

		renderer = new worldview.Renderer();

		window.addEventListener("shaders-load",
			function(e) {
				window.removeEventListener(e.type,arguments.callee,false);
				var shaderSource = e.data;
				
				renderer.blit= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.basic2d, 
					shaderSource.fshHeader + shaderSource.basicLookup); 

				renderer.particles= new worldview.Program( 
					shaderSource.vshHeader + shaderSource.spriteVertex, 
					shaderSource.fshHeader + shaderSource.spriteFragment); 

				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);

	window.addEventListener("programs-ready",
			function(e) {
				window.removeEventListener(e.type, arguments.callee, false); 
				initBuffers();
			}, false);

	window.addEventListener("textures-load",
			function (e) {
				window.removeEventListener(e.type, arguments.callee, false); 
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
				gl.viewport(0,0,worldview.width,worldview.height);
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.bindBuffer(gl.ARRAY_BUFFER, renderer.particlesBuffer);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.particlesIndexBuffer);
				gl.disable(gl.DEPTH_TEST);
				gl.disable(gl.BLEND);

				gl.activeTexture(gl.TEXTURE0);
				gl.useProgram(renderer.blit.gl);
				gl.uniform1i(renderer.blit.texture, 0);
				gl.uniformMatrix4fv(renderer.blit.MVPmatrix, false, Kangas.transform.identity);

			 	gl.useProgram(renderer.particles.gl);
				gl.uniform1i(renderer.particles.texture, 0);
				gl.vertexAttribPointer(renderer.particles.size, 1, gl.FLOAT, false, 
						numParticlesAttribs*Kangas.sizeof.float32, 18*Kangas.sizeof.float32);
				gl.vertexAttribPointer(renderer.particles.color, 1, gl.FLOAT, false, 
						numParticlesAttribs*Kangas.sizeof.float32, 19*Kangas.sizeof.float32);
				gl.vertexAttribPointer(renderer.particles.rotation, 1, gl.FLOAT, false, 
						numParticlesAttribs*Kangas.sizeof.float32, 20*Kangas.sizeof.float32);
						
				window.addEventListener("resize", resizeCanvas, false);
				document.body.appendChild(worldview.canvas);
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
	var fbo = renderer.fbo;
	var gl = worldview.gl;

	renderer.manoise.advance();

	var program = renderer.blit;
	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.fbo.texture.gl);
	gl.vertexAttribPointer(program.coord, 4, gl.FLOAT, false, 0, 0);

	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

	drawToFramebuffers(milliseconds);

	renderer.animate(renderScene);
}

function drawToFramebuffers(timestamp) {
	var fbo = renderer.fbo;
	var gl = worldview.gl;
	var noise = renderer.manoise;

	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);	
	gl.viewport(0,0,fbo.width,fbo.height);
	gl.clear(gl.COLOR_BUFFER_BIT);

	var program = renderer.particles;
	gl.useProgram(program.gl);
	gl.bindTexture(gl.TEXTURE_2D, renderer.leaf_tex.gl);
	gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 
		numParticlesAttribs*Float32Array.BYTES_PER_ELEMENT, 64 );
	gl.drawElements(gl.POINTS, numParticlesOnScreen, gl.UNSIGNED_SHORT, 4*Uint16Array.BYTES_PER_ELEMENT);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);	

	for (var i = 0; i < numParticlesInBuffer; i++) { 
		var x = vParticleVertices[16+i*numParticlesAttribs] += 0.01*noise[i%20]; 
		var y = vParticleVertices[16+i*numParticlesAttribs+1] -= 0.005 + 0.01*Math.abs(noise[(i+1)%20]); 
		if ( Math.abs(x) > 1.0 || Math.abs(y) > 1.0) {
			vParticleVertices[16+numParticlesAttribs*i] = 2.0*Math.random()-1.0;
			vParticleVertices[16+numParticlesAttribs*i+1] = 1.0;
			vParticleVertices[16+numParticlesAttribs*i+2] = 0.25 + 0.75*Math.random();
			vParticleVertices[16+numParticlesAttribs*i+3] = Math.random();
			vParticleVertices[16+numParticlesAttribs*i+4] = 2.0*Math.PI*Math.random();
		}
	}

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vParticleVertices), gl.DYNAMIC_DRAW);
	worldview.gl.viewport(0,0,worldview.width,worldview.height);
}

function initBuffers() {
	var gl = worldview.gl;

	vParticleVertices = 
		vParticleVertices.concat([ 
	     -1.0, -1.0, 0.0, 0.0,
	      1.0, -1.0, 1.0, 0.0, 
	      1.0,  1.0, 1.0, 1.0, 
	     -1.0,  1.0, 0.0, 1.0, 
		 ]);

	vParticleIndices = 
		vParticleIndices.concat([0, 1, 2, 2, 3, 0]);

	for (var i = 0; i < numParticlesInBuffer; i++) { 
		vParticleVertices = 
			vParticleVertices.concat([2.0*Math.random()-1.0, 2.0*Math.random()-1.0, 0.25+0.75*Math.random(),Math.random(), 2.0*Math.PI*Math.random()]);
		vParticleIndices.push(i);
	}

	renderer.particlesBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.particlesBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vParticleVertices), gl.DYNAMIC_DRAW);

	renderer.particlesIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.particlesIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vParticleIndices), gl.STATIC_DRAW);

	var fbo = renderer.fbo = gl.createFramebuffer();
	fbo.texture = new worldview.Texture(fbo,
			{filter:gl.NEAREST, 
			 attachment:gl.COLOR_ATTACHMENT0,
				width:(fbo.width=1<<10), 
				height:(fbo.height=1<<10)});

	renderer.leaf_tex = new worldview.Texture( "leaf_tex.jpg",
		{format:gl.RGB, event:"textures-load"});

	renderer.manoise = [];
	for (var i=0; i< 20; i++) {renderer.manoise.push(2.0*Math.random() - 1.0)}
	renderer.manoise.advance = function () {
		this.forEach(function(x,i,a){a[i] = 0.5*x + 0.5*(2.0*Math.random() - 1.0 );});
	}
}

function resizeCanvas (e) {
	worldview.width = window.innerWidth;
	worldview.height = window.innerHeight;
	worldview.gl.viewport(0,0,worldview.width,worldview.height);
}
