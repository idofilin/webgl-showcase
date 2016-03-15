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
 
attribute vec2 position;

varying vec2 texpos;

uniform mat4 MVPmatrix;
uniform float flashing;

void main() {
	texpos = position/0.25;

	gl_Position = MVPmatrix*vec4( vec2(0.7, 0.0) + 4.0*flashing*position, 0.0, 1.0 ) ;
}	

