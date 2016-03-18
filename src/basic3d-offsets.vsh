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
 
attribute vec3 position;
attribute vec2 texcoord;

varying vec4 textureCoord;
varying vec4 spaceCoord;

uniform mat4 MVPmatrix;
uniform vec4 texoffset;

void main()
{
	gl_Position =  spaceCoord = MVPmatrix * vec4(position, 1.0);
	textureCoord = vec4(texcoord, texcoord) + texoffset;     
}

