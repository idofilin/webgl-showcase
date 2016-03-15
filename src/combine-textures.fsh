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

varying mediump vec2 textureCoord;

void main(void)
{
	mediump vec4 sample0  = texture2D( texture, textureCoord );
	mediump vec2 dist = (textureCoord - vec2(0.5)) * 2.0;
	mediump float intensity = dot(vec3(0.299,0.587,0.114), sample0.rgb);
	mediump float distintensity =  smoothstep(0.0, 1.0, 1.0 - dot(dist,dist) );
	gl_FragColor = vec4(mix(vec3(0.0),sample0.rgb,distintensity), 0.05*intensity); 
}
