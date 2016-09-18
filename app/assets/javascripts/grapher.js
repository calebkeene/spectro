$(document).ready(function(){
	
	var SLOPE = 0.0941;
	var INTERCEPT = 370.38
	var busyReading = false;
	var autoRun = false;
	var async = setInterval(getData, 10); //get ready to read every 5ms

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

					var amplitudes = data['data'].map( function(a) { return a.y; });
					var transform = num.fft(amplitudes);
					var zeroValueComplex = [0, 0];
					// zero out complex values between 400 and 3596
					// zero out symmetrically so we have components to cancel with on both sides
					transform = transform.fill(zeroValueComplex, 500, 3596);
					var inverseTransform = num.ifft(transform);

					var reals = [];
					// only go up to 3800 ( all the values after this are from zero padding)
					for (i=0; i< 3800; i++){
						var h = new Object();
						h['x'] = ((i+1)*SLOPE + INTERCEPT);
						h['y'] = inverseTransform[i][0];
						reals.push(h)
					}

					busyReading = false;
					redrawGraph(reals, force);
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
			dataPoints = data;
			var chart = new CanvasJS.Chart("data-area",{
				zoomEnabled: true,
				zoomType: 'xy',
				title:{
					text: "CCD Read (TCD1304AP)",
					fontSize: 25
				},
				axisX:{
					labelFontSize: 15,
					title: 'Wavelength',
					titleFontSize: 25,
					titleFontStyle: 'italic',
					labelAngle: 30,
					// minimum: 0,
					// maximum: 3800
					minimum: 350,
					maximum: 800
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
			$('.get-reading-btn').prop('disabled', false);
			autoRun = false;
		}
		else{
			$('.running-icon').show();
			$(this).text('stop auto read');	
			$('.get-reading-btn').prop('disabled', true);
			autoRun = true;
		}
	});

});