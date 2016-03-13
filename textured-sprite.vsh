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
attribute lowp float size;
attribute lowp float color;
attribute lowp float rotation;

varying lowp float colorLevel;
varying mediump mat2 rotationMat;

void main() {
	gl_Position = vec4( position, 0.0, 1.0 );
	gl_PointSize = 128.0 * size;
	colorLevel = color;
	rotationMat = mat2(cos(rotation), sin(rotation), -sin(rotation), cos(rotation));
}	

