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
 
uniform sampler2D texture;
uniform float retain;
#define sampleSize 4
uniform vec2 tcoffset[sampleSize];

varying vec2 textureCoord;

void main(void)
{
	vec4 sample[sampleSize];
	vec2 tex_coord;

	for (int i = 0; i < sampleSize; i++) {
		tex_coord = textureCoord.st + tcoffset[i];
		if ( tex_coord.s > 1.0 || tex_coord.s < 0.0 || tex_coord.t > 1.0 || tex_coord.t < 0.0 ) {
			sample[i] = vec4(0.0);
		} else {  
			sample[i] = texture2D(texture, tex_coord); 
		}
	}

	gl_FragColor = 
		retain * mix( sample[0], sample[2], 
			clamp( textureCoord.t , 0.0, 1.0 ) ) 
		+ (1.0 - retain) * mix( sample[3],sample[1], 
			clamp( textureCoord.s , 0.0, 1.0) )  ;
}
