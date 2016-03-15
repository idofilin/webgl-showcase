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
 
varying highp vec4 spaceCoord;
varying highp vec4 sitesCoord;
varying float edgeAffinity;

uniform highp float gain;
uniform highp vec2 cellIdentityCoefficients;

void main(void) {
	
	highp vec2 dist;
	dist.x = distance(spaceCoord.xy, sitesCoord.xy);
	dist.y = distance(spaceCoord.xy, sitesCoord.zw);

	highp float swapper = step(dist.y, dist.x);
	
	highp vec2 outputDistances = clamp (
		gain * vec2(
			mix(dist.x, dist.y, swapper),
			mix(dist.y, dist.x, swapper))
	, 0.0, 1.0);

	highp vec2 focalFeature = 
		mix(sitesCoord.xy, sitesCoord.zw, swapper);

	highp float cellValue = fract(
		dot(cellIdentityCoefficients, focalFeature));

	gl_FragColor = vec4( 
		outputDistances
		, edgeAffinity, cellValue);
}

