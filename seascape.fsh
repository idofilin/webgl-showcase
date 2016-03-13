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
 
varying highp vec4 textureCoord;
varying highp vec4 spaceCoord;

uniform sampler2D texture;
uniform sampler2D sky;
uniform vec4 perturbationAmplitude;
uniform float gain;
uniform float horizon;
uniform vec4 depthScaling;
uniform vec4 skycolors[2];

/* These values are in yuv coordinates */
const vec3 hotColor = vec3(1.0, 0.0, 0.0); 
const vec3 warmColor = vec3(0.53, 0.25, -0.75);
const vec3 coolColor = vec3(0.02, +0.02, -0.02);
/* Transform these colors into RGB */
const vec3 hotColorRGB = YUV2RGB*hotColor;
const vec3 warmColorRGB = YUV2RGB*warmColor;
const vec3 coolColorRGB = YUV2RGB*coolColor;

vec3 colorizeWater ( in float intensity ) {
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
	vec3 clipxyz = spaceCoord.xyz/spaceCoord.w;
	highp vec2 perturbation = 
		vec2(
			noise2d(texture, textureCoord.st).r
			, noise2d(texture, textureCoord.pq).b)
		* perturbationAmplitude.xy;
	perturbation.y *= perturbation.y;
	highp vec4 noisyCoord = textureCoord 
			+ perturbationAmplitude.w * perturbation.stst;
	
	vec4 sample1 = noise2d(texture, noisyCoord.st);
	vec4 sample2 = noise2d(texture, noisyCoord.pq);

	float sampleMixer = 
		smoothstep(0.25, 0.75, 0.5 + 0.5*clipxyz.x);
	vec2 sample = vec2(
		mix(sample1.b, sample1.r, sampleMixer ),
		mix(sample2.r, sample2.b, sampleMixer )
	);

	float intensity = gain * (sample.x + sample.y);
	vec4 ambientColor = skycolors[0];
	float depth = clipxyz.z;

	vec2 skyVector = vec2(
		0.5*clipxyz.x + 0.5
		, (clipxyz.y-horizon)/(1.0-horizon)); 

	vec2 reflectionVector = vec2(
		skyVector.x 
		, (horizon - clipxyz.y)/(horizon + 1.0));
	reflectionVector *= vec2(1.0, 0.6);
	reflectionVector += vec2(
		0.06*(perturbation.s - 0.5)
		, 0.4 + 0.09*(perturbation.t - 0.5) );
	vec3 reflectedSky = texture2D(sky, reflectionVector).rgb;

	float reflectionIntensity = 
			dot(yuvCoeffs[0], reflectedSky);
	intensity *= 1.0 
			+ 1.0*reflectionIntensity*reflectionIntensity;

	vec3 surfaceColor = mix( 
		colorizeWater(intensity)* ambientColor.rgb
		, ambientColor.rgb
		, clamp(0.0, 1.0, step(0.0,depth)*(depth*depth)*ambientColor.a) );

	gl_FragColor = vec4(
		mix ( clamp(surfaceColor, 0.0, 1.0)
				, texture2D(sky, skyVector).rgb
				, smoothstep(horizon, horizon+0.1, clipxyz.y ))
		,-depthScaling.w/depthScaling.z);
}
