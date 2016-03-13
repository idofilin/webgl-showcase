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
 
const vec3 yuvMetric = vec3(1.0, 0.436, 0.615);

const mat3 RGB2YUV = 
	mat3 (
	1.0 , 0.0, 0.0,
	0.0, 1.0/yuvMetric[1], 0.0,
	0.0, 0.0, 1.0/yuvMetric[2] ) 
	* mat3 (
	0.299, -0.14713, 0.615, 
	0.587, -0.28886, -0.51499, 
	0.114, 0.436, -0.10001 );

const mat3 YUV2RGB = 
	mat3 (
	1.0, 1.0, 1.0, 
	0.0, -0.39465, 2.03211, 
	1.13983, -0.58060, 0.0 )
	* mat3 (
	1.0 , 0.0, 0.0,
	0.0, yuvMetric[1], 0.0,
	0.0, 0.0, yuvMetric[2] );

const mat3 yuvCoeffs = mat3(
	RGB2YUV[0][0], RGB2YUV[1][0], RGB2YUV[2][0],
	RGB2YUV[0][1], RGB2YUV[1][1], RGB2YUV[2][1],
	RGB2YUV[0][2], RGB2YUV[1][2], RGB2YUV[2][2]);




