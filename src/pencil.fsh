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
uniform sampler2D elevationTexture;

void main(void)
{
	vec3 clipxyz = spaceCoord.xyz/spaceCoord.w;
	vec4 sample  = texture2D( texture, clipxyz.xy );
	vec4 elSample = texture2D( elevationTexture, vec2(1.0*clipxyz.x, textureCoord.y) );
		if (clipxyz.y > (textureCoord.y - 0.35)+0.7*elSample.g) discard;
	float intensity = 0.7*textureCoord.x + 0.3*sample.r;
	intensity = clamp(intensity, 0.0, 1.0);
	gl_FragColor = vec4( 1.0 - vec3(smoothstep(0.5,0.8,intensity)), 1.0 );
}

