// Database
function sendAjax(sql, method) {
	var xmlhttp=new XMLHttpRequest();
	console.log("SQL: " + sql);
	xmlhttp.open("GET","php/driver.php?sql="+sql+"&method="+method,false);
	xmlhttp.send();
	console.log("Response: " + xmlhttp.responseText);
	return JSON.parse(xmlhttp.responseText);
}

function getAll(sql) {
	return sendAjax(sql, 'getAll');
}

function getOne(sql) {
	return sendAjax(sql, 'getOne');
}

function execute(sql) {
	sendAjax(sql, 'execute');
}

function insert(sql) {
	return sendAjax(sql, 'insert');
}
