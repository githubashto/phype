window.onload = function(){
	// Load and compile PHP scripts
	function loadPHPScripts() {
		var phpScripts = [];
		var scripts = document.getElementsByTagName('script');
		for (var i=0; i<scripts.length; i++) {
			if (scripts[i].type == 'text/php') {
				phpScripts[phpScripts.length] = scripts[i].src;
			}
		}
		
		return phpScripts;
	}
	
	var phpScripts = loadPHPScripts();

	document.body.innerHTML = interpreter.interpret(phpScripts);
}

var interpreter = {
	curScript : '',
	curOp : 0,
	
	/**
	 * Interprets an array of JSON-objects with parsekit formatted opcodes.
	 * 
	 * @param {Array} phypeCodes An array of JSON-objects with parsekit formatted opcodes.
	 */
	interpret : function(phpScripts) {
		var output = '';
		for (var i=0; i<phpScripts.length; i++) {
			// Set the current executing script and add it to the symbol table.
			interpreter.curScript = phpScripts[i];
			symTables[phpScripts[i]] = {};
			
			// Link the variable references in the script to the global variables.
			var phpCode = ajax.gets(phpScripts[i]);
			linker.linkGlobals(phpCode);
			
			// Extract parsekit formatted opcodes.
			var phypeCodes = eval(ajax.gets('src/phpToJSON.php?file='+phpScripts[i]));
			
			// Iterate through op array.
			while (phypeCodes[interpreter.curOp] && phypeCodes[interpreter.curOp] != 'undefined') {
				var op = parser.parse(phypeCodes[interpreter.curOp]);

				output += eval(op.code+'(op.arg1, op.arg2, op.arg3);');

				interpreter.curOp++;
			}
		}
		
		return output;
	}
}

/////////////
// HELPERS //
/////////////

var parser = {
	/**
	 * Takes a parsekit formatted opcode string and parses it into a JSON object with the properties:
	 *  - command: The name of the opcode.
	 *  - arg1: First argument.
	 *  - arg2: Second argument.
	 *  - arg3: Third argument.
	 * 
	 * @param {String} phypeCode The opcode string to parse.
	 */
	parse : function(phypeCode) {
		var json = {code:'',arg1:{value:'',type:null},arg2:{value:'',type:null},arg3:{value:'',type:null}};
		
		var lastMatched = '';
		var firstSpace = phypeCode.indexOf(' ');
		json.code = phypeCode.substring(0,firstSpace);
		
		var argStr = phypeCode.substring(firstSpace,phypeCode.length);
		json.arg1.value = lastMatched = argStr.match(/('[^']*'|UNUSED|NULL|T\([0-9]+\)|[0-9]+(\.[0-9]+)*|0x[a-fA-F0-9]+|#[0-9]+)/)[0];
		json.arg1.type = parser.getType(json.arg1.value);
		json.arg1.value = parser.getValue(json.arg1.value);
		
		argStr = argStr.substring(lastMatched.length+1,argStr.length);
		json.arg2.value = lastMatched = argStr.match(/('[^']*'|UNUSED|NULL|T\([0-9]+\)|[0-9]+(\.[0-9]+)*|0x[a-fA-F0-9]+|#[0-9]+)/)[0];
		json.arg2.type = parser.getType(json.arg2.value);
		json.arg2.value = parser.getValue(json.arg2.value);

		argStr = argStr.substring(lastMatched.length+1,argStr.length);
		json.arg3.value = argStr.match(/('[^']*'|UNUSED|NULL|T\([0-9]+\)|[0-9]+(\.[0-9]+)*|0x[a-fA-F0-9]+|#[0-9]+)/)[0];
		json.arg3.type = parser.getType(json.arg3.value);
		json.arg3.value = parser.getValue(json.arg3.value);
		
		return json;
	},
	
	/**
	 * Removes pings from strings and removes the annoying three dots added to strings over 16 chars.
	 */
	parseString : function(str) {
		if (str.indexOf('\'')==0 && str.length > 19)
			str = str.substring(1, str.length-4);
		
		return str.substring(1,str.length-1);
	},
	
	/**
	 * Converts variable reference-numbers from "T(xx)" to simply "xx".
	 */
	parseGetNum : function(str) {
		var num = str.match(/[0-9]+/);
		
		return num;
	},
	
	/**
	 * Get the type of an argument.
	 */
	getType : function(arg) {
		if (/UNUSED/.test(arg))
			return ARGT_UNUSED;
		if (/'[^']*'/.test(arg))
			return ARGT_STRING;
		if (/NULL/.test(arg))
			return ARGT_NULL;
		if (/T\([0-9]+\)/.test(arg))
			return ARGT_VAR;
		if (/[0-9]+(\.[0-9]+)*/.test(arg))
			return ARGT_NUM;
		if (/0x[a-fA-F0-9]+/.test(arg))
			return ARGT_HEX;
		if (/#[0-9]+/.test(arg))
			return ARGT_OPADDR;
		return ARGT_UNKNOWN;
	},
	
	/**
	 * Get the value of an argument (removes bogus chars added by parsekit).
	 */
	getValue : function(arg) {
		switch(parser.getType(arg)) {
			case ARGT_STRING:
				return parser.parseString(arg);
			case ARGT_VAR:
			case ARGT_OPADDR:
				return parser.parseGetNum(arg);
			case ARGT_NULL:
			case ARGT_NUM:
			case ARGT_HEX:
			case ARGT_UNUSED:
			case ARGT_UNKNOWN:
				return arg;
		}
	}
}

var linker = {
	assign : function(hash, value) {
		globals[symTables[interpreter.curScript][hash]] = value;
	},
	
	getValue : function(hash) {
		return globals[symTables[interpreter.curScript][hash]];
	},
	
	/**
	 * Links variable references to global variables.
	 * 
	 * @param {String} str The original PHP script.
	 */
	linkGlobals : function(str) {
		// Strip all white-space.
		var str = str.replace(/\s*|\n*|\f*|\r*|\t*|\v*/,'');
		
		// Find all assignments
		var assigns = str.match(/$[a-zA-Z0-9_]=[^;]+;/);
		if (assigns!=null)
			for (var i=0; i<assigns.length; i++) {
				symTables[interpreter.curScript][i] = assigns[i];
				globals[assigns[i]] = null;
			}
	}
}

var symTables = {};
var globals = {};
