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
 
#define maxIter 20.0

varying vec2 textureCoord;

uniform vec2 julia_c;

const vec4 innerColor = vec4(1.0, 1.0, 1.0, 1.0);
const vec4 outerColorClose = vec4(1.0, 1.0, 0.0, 1.0);
const vec4 outerColorFar = vec4(0.0, 0.0, 0.0, 1.0);

void main(void) {
	vec2 c = textureCoord ;
	float r2 = dot(julia_c,julia_c);
	float intensity = 0.0;

	vec2 z = c;
	for ( float iter = 0.0; iter <  maxIter; iter++ ) {
		z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + julia_c;
		r2 = dot(z,z);
		intensity = iter/maxIter;
		if (r2 > 4.0) break;
	}

	if (distance(textureCoord, julia_c) < 2e-2)
		gl_FragColor = vec4(1.0,0.0,0.0,1.0);
	else if (intensity < 1.0e-1)
		discard;
	else if (r2 < 4.0)
		gl_FragColor = innerColor;
	else
		gl_FragColor =
		mix(outerColorFar,outerColorClose,smoothstep(0.1, 1.0,
		intensity));
	
}
