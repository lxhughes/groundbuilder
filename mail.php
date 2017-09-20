<?

$postdata = file_get_contents("php://input");
$request = json_decode($postdata);

if(
	isset($request->TO) && 
	isset($request->FROM) &&
	isset($request->BODY)
){

	$to = $request->TO;
	if(isset($request->NAME)) $name = $request->NAME;
	$from = $request->FROM;
	$body = $request->BODY;
	
	$subject = "Quote Request from Groundbuilder App";
	
	if(isset($name)) $headers = 'From: ' . $name . '< '. $from . '>' . "\r\n";
	else $headers = 'From: '.$from . "\r\n";
	$headers .= 'Reply-To: ' . $from . "\r\n";
	
	mail($to,$subject,$body,$headers);
	
	echo "Sent mail!";
	
}

?>