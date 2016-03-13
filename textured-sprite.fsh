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
 
uniform sampler2D sampler0;

varying lowp float colorLevel;
varying mediump mat2 rotationMat;

const lowp vec4 lowColor = vec4(1.0, 0.0, 0.0, 1.0);
const lowp vec4 highColor = vec4(1.0, 1.0, 0.0, 1.0);

void main() {
	//mediump vec2 texpos = gl_PointCoord;
	//mediump vec4 sampleColor = texture2D( sampler0, texpos );
	//mediump float intensity = dot(vec3(0.299,0.587,0.114),sampleColor.rgb);
	lowp float intensity = texture2D( sampler0, rotationMat*(gl_PointCoord-vec2(0.5)) + vec2(0.5) ).r;
	//lowp float intensity = texture2D( sampler0, gl_PointCoord ).r;
	if (intensity < 0.25)
		discard;
	else
		gl_FragColor = intensity*mix(lowColor,highColor,colorLevel);
}

