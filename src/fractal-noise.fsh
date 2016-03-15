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

uniform sampler2D texture;

/*const float lacunarity = 2.0;*/  /* In here, lacunarity MUST be an
								  integer, in order to preserve 
								  tilability. Given that, might
								  as well hardcode the values as
								  powers of two.*/

const highp float normalizer = 
	1.0 / 1.1541365 /* sqrt of sum of squares of 1.0 0.5 0.25 etc. */
		* 4.0/5.0 /* attenuate the [0, 1] range of original sampled values */
		;
const highp float turbNormalizer = 0.5; 

highp float turbTransform( in vec4 sample ) {
	return abs( 1.0 - 2.0*sample.r*sample.r );
}

void main(void)
{
	highp vec4 sample[5];
	sample[0] = noise2d(texture, textureCoord);
	sample[1] = noise2d(texture, 2.0*textureCoord);
	sample[2] = noise2d(texture, 4.0*textureCoord);
	sample[3] = noise2d(texture, 8.0*textureCoord);
	sample[4] = noise2d(texture, 16.0*textureCoord);

	highp float intensity  = ( 
		sample[0].r
		+ 0.5 * sample[1].r 
		+ 0.25 * sample[2].r 
		+ 0.125 * sample[3].r 
		+ 0.0625 * sample[4].r 
		) * normalizer; 
	
	highp float turbulence = ( 
		turbTransform(sample[0])
		+ 0.5 * turbTransform(sample[1])
		+ 0.25 * turbTransform(sample[2])
		+ 0.125 * turbTransform(sample[3])
		+ 0.0625 * turbTransform(sample[4])
		) * turbNormalizer;

	gl_FragColor = vec4(
		clamp(intensity, 0.0, 1.0),
		clamp(turbulence, 0.0, 1.0),
		sample[0].rb );
}
