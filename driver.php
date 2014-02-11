<?php
include 'db.php';

header( 'Content-Type', 'application/json' );

try {
	if (isset($_GET['sql']))
		$sql = $_GET['sql'];
	else
		throw new Exception( 'No SQL' );

	if (!isset($_GET['method']))
		throw new Exception( 'No method' );

	$dw = new DatabaseWrapper( new PDO('mysql:host=129.241.124.148;dbname=gib', 'remote', 'pass'));

	switch( $_GET['method'] ) {
		case 'getOne':
			print json_encode( $dw->getOne($sql) );
			break;
		case 'getAll':
			print json_encode( $dw->getAll($sql) );
			break;
		case 'execute':
			$dw->execute($sql);
			print json_encode( true );
			break;
		case 'insert':
			print json_encode($dw->insert($sql));
			break;
		default:
			throw new Exception( 'Unknown method' );
			break;
	}

} catch ( Exception $e ) {
	print json_encode( array( 'error' => $e->getMessage() ) );
}
?>
