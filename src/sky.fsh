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

uniform sampler2D noiseTexture;
uniform highp float time;
uniform vec4 sun;
uniform vec4 cloudVelocity;
uniform vec4 skycolors[2];
uniform vec4 cloudScaler;
uniform vec4 cloudColoring;

const float lacunarity = PI - 1.25;

vec3 colorizeSky( in vec2 skyxy ) {
	vec2 sunvec = skyxy - sun.xy;
	float sundisc = sun.w - dot(sunvec, sunvec); 
	float intensity = max( 0.0, 1.0 + sundisc );
	vec3 color = 
		mix( skycolors[0].rgb
			, skycolors[1].rgb 
				+ vec3(1.0) 
					* smoothstep(-0.05, -0.0, sundisc)
				+ skycolors[0].rgb 
					* 0.25 * pow(intensity, 16.0*skycolors[0].g)
				+ vec3(0.8, 0.9, 0.6)
					* 0.75 * intensity*intensity
			, smoothstep(0.0, 1.0, skyxy.y) );
	return clamp(color, 0.0, 1.0);
}

void main(void) {
	vec2 billow = time*cloudVelocity.zw;
	vec2 vel = time*cloudVelocity.xy;
	vec2 cloudCoord[3];
	cloudCoord[0] = 
			cloudScaler.st*(vel + textureCoord.st + 0.5);
	cloudCoord[1] = 
			cloudScaler.st*(vel/lacunarity + billow + lacunarity*textureCoord.st + PI/6.0);
	cloudCoord[2] = 
			cloudScaler.st*(vel/lacunarity - billow/lacunarity + lacunarity*lacunarity*textureCoord.st);
	vec4 sample[3];
	sample[0] = texture2D( noiseTexture, cloudCoord[0]);
	sample[1] = texture2D( noiseTexture, cloudCoord[1]);
	sample[2] = texture2D( noiseTexture, cloudCoord[2]);
	float cloudIntensity = 
		(sample[0].g
		+ 0.5*sample[1].g
		+ 0.25*sample[2].g) / 1.75;
	float mixingFactor = 
		smoothstep( cloudScaler.p , cloudScaler.q, cloudIntensity);
	float coloringFactor = 
		smoothstep(cloudColoring.s, cloudColoring.t,
			cloudIntensity + cloudColoring.p*textureCoord.y);
	gl_FragColor = vec4(
		mix( colorizeSky(textureCoord)
				, mix(skycolors[1].rgb, skycolors[0].rgb, coloringFactor)
				, mixingFactor )
		, 1.0);
}
