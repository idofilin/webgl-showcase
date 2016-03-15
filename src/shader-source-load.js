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
 
onmessage = function(e) {

var outtext="";

shaders = JSON.parse(e.data);
response = {};
aliases = [];

for ( var index = 0; index < shaders.length; index++ ) {

	/* If this entry in shaders defines an alias remember it for later
	 * and continue to the next item. */
	if (shaders[index].alias) {
		aliases.push(shaders[index]);
		continue;
	}

	var textToInput;
	req = new XMLHttpRequest();
	req.open("GET", shaders[index].filename, false);
	req.setRequestHeader("Content-Type",
		"text/plain;charset=UTF-8");
	req.send();
	if (req.readyState == req.DONE) 
		if (req.status === 200) 
			textToInput = req.responseText;
		else 
			textToInput = req.statusText;

	Object.defineProperty(response, shaders[index].name,{
		value:textToInput,
		writable: false,
		enumerable: true,
		configurable: false
	});
}

for ( var index = 0; index < aliases.length; index++ ) {
	if (!(response[aliases[index].alias]))
		Object.defineProperty(response, aliases[index].alias,{
			value:response[aliases[index].name],
			writable: false,
			enumerable: true,
			configurable: false
		});
}

postMessage(JSON.stringify(response));

}
