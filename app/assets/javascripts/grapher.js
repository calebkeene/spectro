$(document).ready(function(){
	
	var busyReading = false;
	var autoRun = false;
	var async = setInterval(getData, 100); //get ready to read every 100ms

	function getData(force){
		
		if(exitImmediately(force)){ //may not be required once finished flag added to ajax endpoint
			return null; 
		}

		// either run this from setInterval every 100ms (when autorun on), or manually trigger with force flag
		if((autoRun || force==true) && !busyReading){
			console.log('getting data');
			console.log('busyReading -> '+busyReading);
			busyReading = true;

			$.ajax({
				type: 'POST',
				contentType: "application/json; charset=utf-8",
				url: Routes.readings_path(),
				dataType: 'json',
				success: function (data) {
					console.log(data['message']);
					busyReading = false;
					redrawGraph(data, force);
				},
				error: function (data) {
					console.log(data['message']);
				}
			});
		}
	}

	function redrawGraph(data, force){

		if(!exitImmediately(force)){
			console.log('redrawing graph');
			dataPoints = data['data'];
			var chart = new CanvasJS.Chart("data-area",{
				zoomEnabled: true,
				zoomType: 'xy',
				title:{
					text: "CCD Read (TCD1304AP)",
					fontSize: 25
				},
				axisX:{
					labelFontSize: 15,
					title: 'pixel number',
					titleFontSize: 25,
					titleFontStyle: 'italic',
					labelAngle: 30,
					minimum: 0,
					maximum: 3800
				},
				axisY:{
					labelFontSize: 15,
					title: 'digital value',
					titleFontSize: 25,
					titleFontStyle: 'italic',
					minimum: 0,
					maximum: 65536
				},
				data: [
				{
					type: 'line',
					color: '#0066ff',
					lineThickness: 2,
					dataPoints: dataPoints
				}
				]
			});
			chart.render();
			$('.canvasjs-chart-credit').hide();
		}
	}

	function exitImmediately(force){ // extra safety interlock to prevent reading when it shouldn't
		if(typeof(force) == 'undefined' && !autoRun){
			return true;
		}
		else{
			return false;
		}
	}

	function printTime(){
		var now = new Date();
		hours = now.getHours();
		minutes = now.getMinutes();
		seconds = now.getSeconds();
		if(minutes < 10){ minutes = '0'+String(minutes)}
		if(seconds <10){seconds = '0'+String(seconds)}

		return String(hours)+':'+String(minutes)+':'+String(seconds)
	}

	//click handlers
	$('.connect-serial').click(function(){
		$.ajax({
			type: 'POST',
			contentType: "application/json; charset=utf-8",
			url: Routes.readings_connect_serial_path(),
			dataType: 'json',
			success: function (data) {
				console.log(data['message']);
				$('.startup-controls').hide();
				$('.container').show();
			},
			error: function (data) {
				console.log(data['message']);
			}
		});
	});


	$('.get-reading-btn').click(function(){
		getData(true);
	});

	$('.auto-read-toggle').click(function(){
		if(autoRun == true){
			$('.running-icon').hide();
			$(this).text('start auto read');
			$('.get-reading-btn').show(200);
			autoRun = false;
		}
		else{
			$('.running-icon').show();
			$(this).text('stop auto read');	
			$('.get-reading-btn').hide(200);
			autoRun = true;
		}
	});

});