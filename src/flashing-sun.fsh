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
 
varying vec2 texpos;

uniform highp float flashing;

void main() {
	float intensity =  0.1/length(texpos) * smoothstep(0.0, 0.2, 1.0 - dot(texpos,texpos) );
	vec3 shineColor = mix( vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), intensity);
	gl_FragColor = vec4( shineColor, intensity*flashing );
}

