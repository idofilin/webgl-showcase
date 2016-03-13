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
 
;(function (nsName) {
"use strict"
var module = window[nsName] || (window[nsName] = Context);
if (module !== Context) {
	Object.keys(module).forEach(function(key){
		Context[key] = module[key]; 
	});
	module = (window[nsName] = Context);
}
Context.subconstructors = Context.subconstructors || [];
Context.subconstructors.push(Shader);
Context.subconstructors.push(Program);

function Context (inputContext, contextParams) {
	try {
		if (inputContext instanceof WebGLRenderingContext) {
			var gl = inputContext;
			var canvas = gl.canvas;
		} else if  (inputContext instanceof HTMLCanvasElement) {
			canvas = inputContext;
			gl = canvas.getContext("webgl", contextParams)
				|| canvas.getContext("experimental-webgl", contextParams);
			if (!gl)
				throw "Failed to get WebGL context.\n" 
					+ "Your browser or operating system may not support WebGL.\n";
		} else {
			throw "Input to context constructor must be instance of HTMLCanvasElement or WebGLRenderingContext."
		}
	} catch(err) {
		throw "In context initilization:\n" + err;
	}

	var context = this;
	context.gl = gl;
	context.canvas = canvas;
	module.subconstructors.forEach( function(method){
		if (!(method instanceof Function && method.name))
			return;
		context[method.name] =  
			eval("(function " + method.name + " () { method.apply(this, arguments); })");
		context[method.name].prototype = Object.create(method.prototype);
		context[method.name].prototype.context = context; 
		for (var utility in method) 
			context[method.name][utility] = 
				method[utility] instanceof Function && method[utility].bind(context)
				|| method[utility];
	});
};

function Shader (type, source) {
	var context = this.context,
		gl = context && context.gl;
	if (!context || !gl) {
		throw "Unable to get context when creating shader.\n" + source;
	}

	var shaderType = type;
	if (typeof type === "string") 
		shaderType = 
			(type === "VERTEX_SHADER" || type === "FRAGMENT_SHADER") && gl[type]
			|| type.toLowerCase() === "vertex" && gl.VERTEX_SHADER 
			|| type.toLowerCase() === "fragment" && gl.FRAGMENT_SHADER;
	if (!shaderType || shaderType !== gl.VERTEX_SHADER && shaderType != gl.FRAGMENT_SHADER ) {
		throw "Invalid shader type " + type + ", when creating shader.\n" + source;
	}

	var shader = gl.createShader(shaderType);
	if (!shader) {
		throw "Failed to create new WebGLShader object.\n" + source;
	}

	gl.shaderSource(shader,source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		var errLog = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw "Failed to compile shader.\n" 
			+ source + "\nError log:\n" 
			+ errLog;
	}

	this.type = shaderType;
	this.source = source;
	this.gl = shader;
	this.context = context;
};

function Program(vshader, fshader) {
	var context = this.context,
		gl = context && context.gl;
	if (!context || !gl) {
		throw "Unable to get context when creating shader program.\n";
	}

	var programShaders = [
		{ref: vshader, owned: false}, 
		{ref: fshader, owned: false}
	];
	try { 
		programShaders.forEach(function(shader, index) {
			if (shader.ref instanceof context.Shader) {
				return;
			} else if (typeof shader.ref === "string") {
				shader.ref = 
					new context.Shader( 
						(index == 0) ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER, 
						shader.ref);
				shader.owned = true;
			} else {
				throw "When building shader program, " 
					+ ((index == 0) ? "vertex" : "fragment") 
					+ " shader is of invalid type.";
			}
		});
	} catch (err) {
		cleanup();
		throw err;
	}
	
	var program = gl.createProgram();
	if (!program) {
		cleanup();
		throw "Failed to create new WebGLProgram object.";
	}
	
	try {
		gl.attachShader(program, programShaders[0].ref.gl);
		gl.attachShader(program, programShaders[1].ref.gl);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			var linkErrLog = gl.getProgramInfoLog(program);
			throw "Shader program did not link successfully.\nError log:\n" + linkErrLog;
		} else {
			this.gl = program;
			this.context = context;
			this.vertexShaderSource = programShaders[0].ref.source;
			this.fragmentShaderSource = programShaders[1].ref.source;
			this.getAttributesAndUniforms();
		}
	} catch (err) {
		gl.deleteProgram(program);
		var programDeleted = true;
		throw (err);
	} finally {
		if (!programDeleted) {
			gl.detachShader(program, programShaders[0].ref.gl);
			gl.detachShader(program, programShaders[1].ref.gl);
		}
		cleanup();
	}

	function cleanup() {
		if (programShaders[0].owned)
			gl.deleteShader(programShaders[0].ref.gl);
		if (programShaders[1].owned)
			gl.deleteShader(programShaders[1].ref.gl);
	}
}

var uniformRE = /^\s*uniform\s+((highp|lowp|mediump)\s+)?(float|int|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D)\s+([a-zA-Z_]*)(?:\[\d+\])?\s*;/mg,
	attributeRE = /^\s*attribute\s+((highp|lowp|mediump)\s+)?(float|vec2|vec3|vec4)\s+([a-zA-Z_]*)\s*;/mg;

Program.prototype.getAttributesAndUniforms = 
	function getAttributesAndUniforms () {
		var program = this,
			context = program.context, 
			gl = context.gl,
			vsource = program.vertexShaderSource,
			fsource = program.fragmentShaderSource;

		var match, attr, unif;
		while (match = attributeRE.exec(vsource)) {
			attr = match.splice(-1)[0];
			if (!program[attr]) {
				program[attr] = gl.getAttribLocation(program.gl, attr);
				if (program[attr] >= 0)
					gl.enableVertexAttribArray(program[attr]);
			}
		}
		while (match = uniformRE.exec(vsource+"\n"+fsource)) {
			unif = match.splice(-1)[0];
			if (!program[unif]) 
				program[unif] = gl.getUniformLocation(program.gl, unif);
		}
	};

})("Kangas");
