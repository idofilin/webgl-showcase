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
 
varying vec2 textureCoord;
varying vec4 spaceCoord;

uniform sampler2D texture;
uniform vec2 displacement;
uniform vec2 gain;
uniform vec4 scaling;

/* These values are in yuv coordinates */
const vec3 hotColor = vec3(1.0, -0.125, +0.1); /*white, maximum intensity*/
const vec3 warmColor = vec3(0.5, -1.0, +0.7); /*yellow, high intensity*/
const vec3 coolColor = vec3(0.3, -0.0, +0.0); /*red, medium intensity*/
/* Trasform these colors into RGB */
const vec3 hotColorRGB = YUV2RGB*hotColor;
const vec3 warmColorRGB = YUV2RGB*warmColor;
const vec3 coolColorRGB = YUV2RGB*coolColor;


vec3 colorize ( in float intensity ) {
	float hot = 
		smoothstep(warmColor.x, hotColor.x, intensity);
	float warm = 
		smoothstep(coolColor.x, warmColor.x, intensity);
	vec3 color = mix( coolColorRGB,
		mix(warmColorRGB, hotColorRGB, hot),
		warm);
	return intensity*color;
}

void main(void)
{
	vec2 stVector = (textureCoord.st - scaling.st) / scaling.pq;

	float intensity = 1.0 - smoothstep(0.0, 1.0, length(stVector));

	if (intensity < 0.004)
		discard;

	vec2 transformedTexCoord =  
		displacement + 
		vec2(
			0.5 + 0.5*(1.0 - 0.4*sqrt(stVector.t))*stVector.s * scaling.p,
			stVector.t*(1.0 + stVector.t)/2.0 * scaling.q);

	vec4 sample = noise2d(texture, 2.0*transformedTexCoord);

	sample = noise2d(texture, transformedTexCoord +
		0.05*stVector*sample.r);

	intensity *= (gain.y + gain.x*sample.r)*sample.r; 

	intensity = clamp(intensity, 0.0, 1.0);

	if (intensity < 0.004)
		discard;
	
	gl_FragColor = vec4(intensity*colorize(intensity),intensity);

}

