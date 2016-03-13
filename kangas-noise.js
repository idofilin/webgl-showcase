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
var module = window[nsName];
var nativeObjPropName = "gl";
var memoizedResults = {};

module.prototype.worleyFractalNoise = 
		function worleyFractalTexture(sources, options) {
	var context = this;
	var texopts = textureOptions(context, options, "worley-fractal");
	var memoKey = texopts.memoizeKey;
	if (texopts.memoize && !texopts.memoizeOverride && memoKey && memoizedResults[memoKey])
		return createTexture(context, memoizedResults[memoKey], texopts);

	var basisTex = this.worleyNoise(sources, options);
	var fractalTex = this.fractalNoise(basisTex, sources, options);
	if (texopts.memoize && memoKey) {
		var fractalopts = textureOptions(context, options, "fractal");
		if (fractalopts.memoizeKey)
			memoizedResults[memoKey] = memoizedResults[fractalopts.memoizeKey];
	}
	var gl = context[nativeObjPropName]; 
	gl.deleteTexture(basisTex[nativeObjPropName]);
	return fractalTex;
};

module.prototype.fractalNoise = 
		function generateFractalNoiseTexture (basisTex, sources, options) {
	var context = this;
	var texopts = textureOptions(context, options, "fractal");
	var memoKey = texopts.memoizeKey;
	if (texopts.memoize && !texopts.memoizeOverride && memoKey && memoizedResults[memoKey])
		return createTexture(context, memoizedResults[memoKey], texopts);

	var nPixelsX = texopts.width = 
		(options && options.width) 
		|| basisTex.pixelSize && basisTex.pixelSize[0] 
		|| texopts.width 
	var nPixelsY = texopts.height = 
		(options && options.height) 
		|| basisTex.pixelSize && basisTex.pixelSize[1] 
		|| texopts.height;
	
	var simpleSquareAttribs = [
	     -1.0,  -1.0, 0.0, 0.0,
	      1.0,  -1.0, 1.0, 0.0, 
	      1.0,   1.0, 1.0, 1.0, 
	     -1.0,   1.0, 0.0, 1.0, 
	];

	var simpleSquareIndices = [
		0 , 1, 2, 0, 2, 3,
	];

	var gl = context[nativeObjPropName];
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);

	var simpleSquareVertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER,simpleSquareVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(simpleSquareAttribs), gl.STATIC_DRAW);
	var simpleSquareIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, simpleSquareIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(simpleSquareIndices), gl.STATIC_DRAW);

	var fbo = gl.createFramebuffer();
	fbo.width = nPixelsX;
	fbo.height = nPixelsY;
	var fractalNoiseTex = new context.Texture(fbo, texopts);
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.viewport (0.0, 0.0, fbo.width, fbo.height);
	gl.clear(gl.COLOR_BUFFER_BIT);

	var fractalNoiseProg = new context.Program (
		(sources.vshHeader||"") + sources.fractalNoiseGenVertex, 
		(sources.fshHeader||"") + sources.fractalNoiseGenFragment); 
	gl.useProgram (fractalNoiseProg[nativeObjPropName]);
	gl.uniformMatrix4fv(fractalNoiseProg.MVPmatrix, false, 
		module.transform.identity);
	gl.uniform1i(fractalNoiseProg.texture, 0);
	gl.bindTexture(gl.TEXTURE_2D, basisTex[nativeObjPropName]);
	gl.vertexAttribPointer(fractalNoiseProg.coord, 4, gl.FLOAT, false, 
		0, 0);
	gl.drawElements(gl.TRIANGLES, 6 , gl.UNSIGNED_SHORT, 0);

	gl.useProgram(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.deleteProgram(fractalNoiseProg[nativeObjPropName]);
	gl.deleteBuffer(simpleSquareVertexBuffer);
	gl.deleteBuffer(simpleSquareIndexBuffer);

	var rawpixels = obtainRawPixels(context, fbo);
	if (basisTex.patternSize)
		rawpixels.patternSize = basisTex.patternSize;
	if (texopts.memoize && memoKey) {
		memoizedResults[memoKey] = rawpixels;
	}

	gl.bindTexture(gl.TEXTURE_2D, fractalNoiseTex[nativeObjPropName]);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(fbo);

	return createTexture(context, rawpixels, fractalNoiseTex);
};

module.prototype.worleyNoise = 
		function worleyBasisTexture (sources, options) {
	var context = this;
	var featureDensity = (options && options.density) || 9;
	var distanceGain = (options && options.gain) 
		|| 0.32*featureDensity /* this experssion was obtained
								  empirically to ensure maximal
								  use of the [0.0, 1.0] interval
								  of allowed values.*/;
	var texopts = options && Object.create(options) || {}; 
	texopts.density = featureDensity; 
	texopts.gain =  distanceGain;
	texopts = textureOptions(context, texopts, "worley");
	var memoKey = texopts.memoizeKey;
	if (texopts.memoize && !texopts.memoizeOverride && memoKey && memoizedResults[memoKey])
		return createTexture(context, memoizedResults[memoKey], texopts);

	var gl = context[nativeObjPropName]; 
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);

	var nPixelsX = texopts.width; 
	var nPixelsY = texopts.height; 
	var numFeatures = featureDensity * featureDensity;
	var featurePoints = [];
	for (var index = 0; index < numFeatures; index++) {
		featurePoints.push([ 
				2.0*Math.random() - 1.0, 
				2.0*Math.random() - 1.0, 
		]);
	}

	var lefties = featurePoints.filter(function(x){return x[0]<=0.0});
	var righties = featurePoints.filter(function(x){return x[0]>0.0});
	var lowies = featurePoints.filter(function(x){return x[1]<=0.0});
	var upies = featurePoints.filter(function(x){return x[1]>0.0});
	var upperlefties = upies.filter(function(x){return x[0]<=0.0});
	var upperrighties = upies.filter(function(x){return x[0]>0.0});
	var lowerlefties = lowies.filter(function(x){return x[0]<=0.0});
	var lowerrighties = lowies.filter(function(x){return x[0]>0.0});

	featurePoints = 
		featurePoints
		.concat(lefties.map(function(x){return [x[0]+2.0,x[1]]}))
		.concat(righties.map(function(x){return [x[0]-2.0,x[1]]}))
		.concat(lowies.map(function(x){return [x[0],x[1]+2.0]}))
		.concat(upies.map(function(x){return [x[0],x[1]-2.0]}))
		.concat(upperrighties.map(function(x){return [x[0]-2.0,x[1]-2.0]}))
		.concat(upperlefties.map(function(x){return [x[0]+2.0,x[1]-2.0]}))
		.concat(lowerrighties.map(function(x){return [x[0]-2.0,x[1]+2.0]}))
		.concat(lowerlefties.map(function(x){return [x[0]+2.0,x[1]+2.0]}));

	var voronoiObject = new Voronoi();
	var boundingBox = {xl:-2.0, xr:2.0, yt:-2.0, yb:2.0};
	var sites = featurePoints.reduce(function(acc,val){return acc.concat([{x:val[0],y:val[1]}])},[]);
	var diagram = voronoiObject.compute(sites,boundingBox);
	var edges = diagram.edges;

	var numOfMissingSites = edges.reduce(
		function(accum,val){return accum + ((val.rSite && val.lSite)?0:1)}
		,0);

	var numAttr = 7;
	var vrtxDataSize = numAttr*(4*edges.length - numOfMissingSites);
	var indexDataSize = 6*edges.length - 3*numOfMissingSites; 

	var vrtxData = new Float32Array(vrtxDataSize);
	var indexData = new Uint16Array(indexDataSize);

	var offset = 0;
	var indexoffset = 0;

	var quadIndices = [0, 1, 2, 2, 3, 0];
	var triangleIndices = [0, 1, 2]; 

	edges.forEach(function(edge) {
		var points;
		var features;
		var edginess;
		if (!edge.lSite) {
			points = [edge.va, edge.rSite, edge.vb];
			features = new Float32Array([
				edge.rSite.x, edge.rSite.y, 
				edge.rSite.x, edge.rSite.y
			]);
			edginess = new Float32Array([1.0, 0.0, 1.0]); 
		} else if (!edge.rSite) {
			points = [edge.va, edge.vb, edge.lSite];
			features = new Float32Array([
				edge.lSite.x, edge.lSite.y, 
				edge.lSite.x, edge.lSite.y
			]);
			edginess = new Float32Array([1.0, 1.0, 0.0]); 
		} else {
			points = [edge.va, edge.rSite, edge.vb, edge.lSite];
			features = new Float32Array([
				edge.lSite.x, edge.lSite.y, 
				edge.rSite.x, edge.rSite.y
			]);
			edginess = new Float32Array([1.0, 0.0, 1.0,  0.0]); 
		};

		points.forEach(
			function(val,ind){
				var dataoffset = numAttr*(offset + ind);
				vrtxData[dataoffset] = val.x;
				vrtxData[dataoffset+1] = val.y;
				vrtxData[dataoffset+2] = edginess[ind];
				vrtxData.set(features, dataoffset+3);
			});

		var relativeOffsets;
		if (points.length > 3)
			relativeOffsets = quadIndices;
		else
			relativeOffsets = triangleIndices;

		indexData.set(relativeOffsets.map(function(x){return offset+x;}),indexoffset);

		offset += points.length;
		indexoffset += relativeOffsets.length;
	});

	var vertexBuffer = gl.createBuffer();	
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vrtxData, gl.STATIC_DRAW);

	var indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

	var fbo = gl.createFramebuffer();
	fbo.width = nPixelsX;
	fbo.height = nPixelsY;
	var fboBoundTex = new context.Texture(fbo, texopts);
	gl.bindTexture(gl.TEXTURE_2D, null);

	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.viewport (0.0, 0.0, fbo.width, fbo.height);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	var voronoiNoise = new context.Program(
		(sources.vshHeader||"") + sources.worleyNoiseGenVertex, 
		(sources.fshHeader||"") + sources.worleyNoiseGenFragment); 
	gl.useProgram (voronoiNoise[nativeObjPropName]);
	gl.uniformMatrix4fv(voronoiNoise.MVPmatrix, false, 
		module.transform.identity);
	gl.uniform1f(voronoiNoise.gain, distanceGain);
	gl.uniform2f(voronoiNoise.cellIdentityCoefficients, featureDensity*100.0, featureDensity*100.0);
	gl.vertexAttribPointer(voronoiNoise.coord, 2, gl.FLOAT, false, 
		numAttr*module.sizeof.float32, 0);
	gl.vertexAttribPointer(voronoiNoise.edginess, 1, gl.FLOAT, false, 
		numAttr*module.sizeof.float32, 2*module.sizeof.float32);
	gl.vertexAttribPointer(voronoiNoise.sites, 4, gl.FLOAT, false, 
		numAttr*module.sizeof.float32, 3*module.sizeof.float32);
	gl.drawElements(gl.TRIANGLES, indexData.length, 
			gl.UNSIGNED_SHORT, 0);

	gl.useProgram(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.deleteProgram(voronoiNoise[nativeObjPropName]);
	gl.deleteBuffer(vertexBuffer);
	gl.deleteBuffer(indexBuffer);
	gl.disableVertexAttribArray(voronoiNoise.coord);
	gl.disableVertexAttribArray(voronoiNoise.edginess);
	gl.disableVertexAttribArray(voronoiNoise.sites);

	var rawpixels = obtainRawPixels(context, fbo);
	rawpixels.patternSize = [featureDensity, featureDensity];
	rawpixels.gain = distanceGain; 
	if (texopts.memoize && memoKey) 
		memoizedResults[memoKey] = rawpixels;

	gl.bindTexture(gl.TEXTURE_2D, fboBoundTex[nativeObjPropName]);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(fbo);
	return createTexture(context, rawpixels, fboBoundTex);
}

module.prototype.whiteNoise = 
		function generateWhiteNoiseTexture(options) {
	var context = this;
	var texopts = textureOptions(context, options, "white");
	var memoKey = texopts.memoizeKey;
	if (texopts.memoize && !texopts.memoizeOverride && memoKey && memoizedResults[memoKey])
		return createTexture(context, memoizedResults[memoKey], texopts);

	var data = [];
	var datasize = texopts.width * texopts.height * 4;
	for (var index = 0; index < datasize; ++index)
		data.push(Math.floor(Math.random()*256.0));
	var pixels = new Uint8Array(data)
	var rawpixels= {};
	Object.defineProperty(rawpixels,"pixels", {
		value : pixels, 
		enumerable : false,
		writable : false,
		configurable : false,
	});
	rawpixels.pixelSize = [nPixelsX, nPixelsY];
	if (texopts.memoize && memoKey)
		memoizedResults[memoKey] = rawpixels;
	return createTexture(context, rawpixels, texopts); 
}

function createTexture (context, rawdata, tex) {
	
	var gl = context[nativeObjPropName];
	var returnTex; 

	if (tex instanceof context.Texture)
		returnTex = tex;
	else
		returnTex = new context.Texture (rawdata.pixels, tex);

	gl.bindTexture(gl.TEXTURE_2D, null);

	for (var prop in rawdata)
		if (rawdata.hasOwnProperty(prop))
			Object.defineProperty(returnTex, prop, {
				value : rawdata[prop],
				enumerable : true,
				writable : false,
				configurable : false,
			});

	return returnTex;
};

function obtainRawPixels(context, fbo) {

	var gl = context[nativeObjPropName];
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	var pixels = new Uint8Array(fbo.width * fbo.height * 4)
	gl.readPixels(0, 0, fbo.width, fbo.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	var rawpixels= {};
	Object.defineProperty(rawpixels,"pixels", {
		value : pixels, 
		enumerable : false,
		writable : false,
		configurable : false,
	});
	var statistics = [{}, {}, {}, {}];
	for (var i = 0; i < pixels.length; ++i) {
		statistics[i%4].max = 
			statistics[i%4].max && Math.max(statistics[i%4].max, pixels[i]) || pixels[i];
		statistics[i%4].min = 
			statistics[i%4].min && Math.min(statistics[i%4].min, pixels[i]) || pixels[i];
		statistics[i%4].sum = 
			statistics[i%4].sum && (statistics[i%4].sum + pixels[i]) || pixels[i];
		statistics[i%4].sumsqrs = 
			statistics[i%4].sumsqrs && (statistics[i%4].sumsqrs + pixels[i]*pixels[i]) || pixels[i]*pixels[i];
		statistics[i%4].samplesize = 
			statistics[i%4].samplesize && (statistics[i%4].samplesize + 1) || 1.0;
	};
	statistics.forEach(function(x,i,a){
		var mean=x.sum/x.samplesize;
		var variance = x.sumsqrs/(x.samplesize - 1) - mean*mean;
		var stdev = Math.sqrt(variance);
		a[i].mean=mean;
		a[i].variance=variance;
		a[i].stdev=stdev;
	});
	
	rawpixels.statistics = statistics;
	rawpixels.pixelSize = [fbo.width, fbo.height];
	return rawpixels;
}

function textureOptions (context, options, suffix) {
	var gl = context[nativeObjPropName]; 
	var opts = { 
		name : options && typeof options.name === "string" && options.name || false,
		format: options && options.format || gl.RGBA, 
		magfilter:options && options.magfilter || gl.LINEAR, 
		minfilter:options && options.minfilter || gl.LINEAR_MIPMAP_LINEAR,
		width: (options && options.width) || 256,
		height: (options && options.height) || 256,
		wrap: options && options.wrap || gl.REPEAT,
		memoize: !options || options && (options.memoize !== false),
		memoizeOverride : options && options.memoizeOverride && true || false,
		density: options && options.density || false,
		gain: options && options.gain || false,
	};

	opts.memoizeKey = 
		 opts.memoize 
			&& (opts.name && (opts.name + "-" + suffix)  
				|| typeof suffix === "string" 
					&& ([suffix, opts.width, opts.height, 
							Number(opts.density).toFixed(0), 
							Number(opts.gain).toFixed(2)].join("X"))) 
		 || false; 

	return opts;
}

})("Kangas");
