<?php

function indent($json) {
 
    $result    = '';
    $pos       = 0;
    $strLen    = strlen($json);
    $indentStr = '  ';
    $newLine   = "\n";
 
    for($i = 0; $i <= $strLen; $i++) {
        // Grab the next character in the string
        $char = substr($json, $i, 1);
        
        // If this character is the end of an element, 
        // output a new line and indent the next line
        if($char == '}' || $char == ']') {
            $result .= $newLine;
            $pos --;
            for ($j=0; $j<$pos; $j++) {
                $result .= $indentStr;
            }
        }
        
        // Add the character to the result string
        $result .= $char;
 
        // If the last character was the beginning of an element, 
        // output a new line and indent the next line
        if ($char == ',' || $char == '{' || $char == '[') {
            $result .= $newLine;
            if ($char == '{' || $char == '[') {
                $pos ++;
            }
            for ($j = 0; $j < $pos; $j++) {
                $result .= $indentStr;
            }
        }
    }
 
    return $result;
}

$file = ($_GET['file'])? $_GET['file'] : '';

$json = json_encode(parsekit_compile_file($file, $errors, PARSEKIT_SIMPLE));
if (!$json || $json=='false')
	echo '{}';
else
	echo indent($json);

?>