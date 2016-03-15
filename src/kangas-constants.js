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
 
;(function (nsName) {
"use strict"
var module = window[nsName] || (window[nsName] = {});

Object.defineProperty(module, "deg2rad",{
	value: Math.PI / 180.0,
	writable: false,
	enumurable: true,
	configurable: false,
});

Object.defineProperty(module, "twopi",{
	value: Math.PI * 2.0, 
	writable: false,
	enumurable: true,
	configurable: false,
});

module.sizeof = {};
Object.defineProperty(module.sizeof, "float32",{
	value: Float32Array.BYTES_PER_ELEMENT,
	writable: false,
	enumurable: true,
	configurable: false,
});

Object.defineProperty(module.sizeof, "uint16",{
	value: Uint16Array.BYTES_PER_ELEMENT,
	writable: false,
	enumurable: true,
	configurable: false,
});


})("Kangas")
