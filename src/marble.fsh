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
 
varying highp vec2 textureCoord;
varying highp vec4 spaceCoord;

uniform sampler2D texture;
uniform float maxDeformation;
uniform float veinFreq;
uniform float time;

const vec3 veinColdColor = vec3(104.0, 50.0, 0.0)/255.0;
const vec3 veinHotColor = vec3(204.0, 97.0, 0.0)/255.0;
const vec3 veinInnerColor = veinColdColor*0.75;
const vec3 matrixLightColor = vec3(230.0)/255.0;
const vec3 matrixDarkColor = vec3(207.0, 90.0, 68.0)/255.0;

vec3 colorize (
		in float inVein, 
		in float temperature,
		in float matrixTint) {
	vec3 matrixColor = mix(matrixLightColor, matrixDarkColor, matrixTint);
	vec3 veinColor = mix(veinColdColor, veinHotColor, temperature);
	veinColor = mix(veinColor, veinInnerColor,
		smoothstep(0.99,1.0,inVein));
	vec3 outColor = mix(matrixColor, veinColor, inVein);
	return outColor;
}

#define completionTime 0.6
void main(void)
{
	
	float deformation = maxDeformation * smoothstep(0.2, completionTime, time);
	float temperature = smoothstep(0.0,0.3, time) 
		- smoothstep(completionTime-0.1, completionTime, time);
	float turbulence = 4.0*smoothstep(0.0, completionTime, time);
	turbulence = min(turbulence,3.0);

	vec4 sample = noise2d(texture, textureCoord);
	float inVein = sin(textureCoord.y*veinFreq*PI  
		- deformation*(sample.r - 0.5)
		+ rotate2d(vec2(1.2*turbulence,0.0), vec2(0.0),
			-2.0*time*(sample.r - 0.5)).y ); 
	inVein *= inVein;
	inVein = smoothstep(0.7-turbulence*0.14, 1.0, inVein);
	float matrixTint = sample.r;
	
	gl_FragColor = vec4(colorize(inVein,temperature,matrixTint),1.0);
}

