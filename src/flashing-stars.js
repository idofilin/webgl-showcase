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
var gl = null;
var renderer = null;

function setupWebGL() {
	worldview = new Kangas(null, 
		{width:window.innerWidth, height:window.innerHeight,});
	gl = worldview.gl;
	document.body.appendChild(worldview.canvas);
	if(gl) {

		renderer = new worldview.Renderer();
		var loadTimer = setInterval(function() {document.getElementById("status-msgs").innerHTML += "|"}, 1);

		window.addEventListener("shaders-load",
			function(e) {
				window.removeEventListener(e.type,arguments.callee,false);
				var shaderSource = e.data;

				renderer.sun = new worldview.Program(
						shaderSource.vshHeader+shaderSource.sunV,
						shaderSource.fshHeader+shaderSource.sunF); 
				renderer.moon = new worldview.Program(
						shaderSource.vshHeader+shaderSource.pointSpriteV, 
						shaderSource.fshHeader+shaderSource.pointSpriteF); 

				window.dispatchEvent(new CustomEvent("programs-ready"));
		}, false);


		window.addEventListener("programs-ready",
				function(e) {
					window.removeEventListener(e.type, arguments.callee, false); 
					initBuffers();
					window.dispatchEvent(new CustomEvent("render-ready"));
				}, false);

		window.addEventListener("render-ready",
				function (e) {
					window.removeEventListener(e.type, arguments.callee, false); 
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
					gl.bindBuffer(gl.ARRAY_BUFFER, renderer.vertexBuffer);
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
					clearInterval(loadTimer);
					window.addEventListener("resize", resizeCanvas, false);
					resizeCanvas();
					renderer.animate(updateColor);
				}, false);
	} else {
		alert( "Error: Your browser does not appear to support WebGL." );
	}
}

function updateColor() {
	renderer.animate(updateColor);

	var nowTime = new Date();
	var milliseconds = nowTime.getTime();

	gl.viewport(0,0,worldview.width,worldview.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	drawGeometry(milliseconds);

	gl.viewport(worldview.width/4,worldview.height/4,worldview.width/2,worldview.height/2);
	drawGeometry(milliseconds);
}

function drawGeometry(timestamp) {
	var angle = timestamp*2*Math.PI/10000;
	var mvMatrix = renderer.mvMatrix;
	mvMatrix[4] = -(mvMatrix[1] = Math.sin(angle)); 
	mvMatrix[5] = mvMatrix[0] = Math.cos(angle); 
	mvMatrix[12] = mvMatrix[13] = 0.0;

	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

	var program = renderer.sun;
	gl.useProgram(program.gl);
	gl.uniformMatrix4fv(program.MVPmatrix, false, renderer.mvMatrix);
	gl.uniform1f(program.flashing, Math.cos(angle)*Math.cos(angle));

	gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);

	gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, 0);

	program = renderer.moon;
	gl.useProgram(program.gl);
	mvMatrix[12] = 0.3 * Math.cos(Math.PI*Math.PI*angle);
	mvMatrix[13] = 0.3 * Math.sin(-Math.PI*Math.PI*angle);
	gl.uniformMatrix4fv(program.MVPmatrix, false, renderer.mvMatrix);
	gl.uniform1f(program.flashing, Math.sin(angle*Math.PI/2.0)*Math.sin(angle*Math.PI/2.0));
	gl.drawArrays(gl.POINTS, 4, 1);

	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
}

function initBuffers() {
	var vVertices = [
		-0.25, -0.25,
		 0.25, -0.25,
		 0.25,  0.25,
		-0.25,  0.25,
	     0.7,   0.0, 
	];	
	renderer.vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,renderer.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STATIC_DRAW);

	var vIndices = [ 0,  1,  2 , 3 ];
	renderer.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vIndices), gl.STATIC_DRAW);

	renderer.mvMatrix = new Float32Array([ 
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0,
	]);
}

function resizeCanvas (e) {
	worldview.width = window.innerWidth;
	worldview.height = window.innerHeight;
	gl.viewport(0,0,worldview.width,worldview.height);
}

