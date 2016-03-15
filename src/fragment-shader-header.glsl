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
 
#version 100
precision highp float;

#define PI 3.141592653589793238462643383279502884

vec2 rotate2d( in vec2 vector, 
		in vec2 center, 
		in float angle) {
	mat2 rotMat = mat2(cos(angle), sin(angle), 
		-sin(angle), cos(angle));
	vec2 displacement = vector - center;
	vec2 rotatedDisplacement = rotMat*displacement;
	return rotatedDisplacement + center;
}

vec4 noise2d(in sampler2D texture, in vec2 coord) {
	vec4 sample = texture2D( texture, coord );
	return sample; 
}

