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

varying vec2 textureCoord;

uniform vec2 delta;
uniform vec3 weights[3];

vec4 obtainSample(in vec2 texpos) {
	vec4 sample;
	/*
	sample = 1.0/9.0 * ( texture2D( texture, texpos )
		+ texture2D( texture, texpos + vec2(-dx,-dy) )
		+ texture2D( texture, texpos + vec2(0.0,-dy) )
		+ texture2D( texture, texpos + vec2(+dx,-dy) )
		+ texture2D( texture, texpos + vec2(-dx,0.0) )
		+ texture2D( texture, texpos + vec2(+dx,0.0) )
		+ texture2D( texture, texpos + vec2(-dx,+dy) )
		+ texture2D( texture, texpos + vec2(0.0,+dy) )
		+ texture2D( texture, texpos + vec2(+dx,+dy) )
	);
	*/
	sample = texture2D( texture, texpos );
	return sample;
}


float depthFromSample(in vec4 sample) {
	//return smoothstep(0.0, 1.0, dot(intensityCoeffs, sample.rgb));
	return dot(weights[0], sample.rgb);
}

void main(void)
{
	float dx = delta.x;
	float dy = delta.y;

	vec4 sampleColor = obtainSample( textureCoord.st );
	vec4 sampleColorDx = obtainSample( textureCoord.st + vec2(dx, 0.0) );
	vec4 sampleColorDy = obtainSample( textureCoord.st + vec2(0.0, dy) );
	vec4 sampleColorDxMinus = obtainSample( textureCoord.st + vec2(-dx, 0.0) );
	vec4 sampleColorDyMinus = obtainSample( textureCoord.st + vec2(0.0, -dy) );

	float depthValue = depthFromSample(sampleColor); 
	float depthValueDx = depthFromSample(sampleColorDx);
	float depthValueDy = depthFromSample(sampleColorDy);
	float depthValueDxMinus = depthFromSample(sampleColorDxMinus);
	float depthValueDyMinus = depthFromSample(sampleColorDyMinus);

	vec3 normal;
	normal.x = dot(weights[1],vec3(depthValueDxMinus,depthValue,depthValueDx));
	normal.y = dot(weights[2],vec3(depthValueDyMinus,depthValue,depthValueDy));
	normal.z = sqrt(smoothstep(0.0, 1.0, 1.0 - normal.x*normal.x - normal.y*normal.y));	

	gl_FragColor = vec4 ( 0.5+0.5*normalize(normal), depthValue );
}	
