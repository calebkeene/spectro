$(document).ready(function(){
	
	var SLOPE = 0.0941;
	var INTERCEPT = 370.38
	var START_PIXEL = 1;
	var END_PIXEL = 3715;

	var wavelengths = computeLookupTable();
	populateCalibrationForms();

	var busyReading = false;
	var autoRun = false;
	var fftEnabled = true;
	var async = setInterval(getData, 10); //get ready to read every 5ms

	function getData(force){
		
		if(exitImmediately(force)){ //may not be required once finished flag added to ajax endpoint
			return null; 
		}

		// either run this from setInterval every 100ms (when autorun on), or manually trigger with force flag
		if((autoRun || force==true) && !busyReading){
			busyReading = true;

			$.ajax({
				type: 'POST',
				contentType: "application/json; charset=utf-8",
				url: Routes.readings_path(),
				dataType: 'json',
				success: function (data) {

					var amplitudes = data['data'].map( function(a) { return a.y; });
					var points = []

					if(fftEnabled){ // remove periodic noise in the frequency domain
						var transform = num.fft(amplitudes);
						var zeroValueComplex = [0, 0];
						// zero out complex values between 400 and 3596
						// zero out symmetrically so we have components to cancel with on both sides
						transform = transform.fill(zeroValueComplex, 500, 3596);
						var yVals = num.ifft(transform).map( function(a) { return a[0]; });

					}
					else{
						yVals = data['data'].map( function(a) { return a.y; });
		
					}

					for (i=0; i< wavelengths.length; i++){
						var h = new Object();
						h['x'] = wavelengths[i];
						h['y'] = yVals[i]; // just use raw amplitude (no LPF applied)
						points.push(h)
					}


					busyReading = false;
					redrawGraph(points, force);
				},
				error: function (data) {
					console.log(data['message']);
				}
			});
		}
	}

	function populateCalibrationForms(){
		$('.intercept-field').val(INTERCEPT);
		$('.slope-field').val(SLOPE);
		$('.start-pixel-field').val(START_PIXEL);
		$('.end-pixel-field').val(END_PIXEL);
	}

	function computeLookupTable(){
		wavelengths = [];
		// drop the first 100 pixels (start at ~380nm)
		// go to pixel 3715 (~720nm)
		for(i=START_PIXEL; i< END_PIXEL; i++){
			wavelengths.push((i+1)*SLOPE + INTERCEPT);
		}
		return wavelengths;
	}

	function redrawGraph(data, force){
		if(!exitImmediately(force)){
			
			if(data.length == 0){ // for drawing empty graph after first connecting to uC
				dataPoints = [];
				for(i=0; i< wavelengths.length; i++){
					dataPoints.push({ x: wavelengths[i], y: 0 })
				}
			}
			else{
				dataPoints = data;
			}
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
					minimum: 370,
					maximum: 750
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
				$('.startup-controls').hide();
				$('.container').show();
				redrawGraph([], true);
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

	$('.adjust-quadratic-btn').click(function(){
		hideConfigButtons();
		$('.quadratic-calibration-fields').show();
	});

	$('.adjust-pixel-range-btn').click(function(){
		hideConfigButtons();
		$('.pixel-range-calibration-fields').show();
	});

	$('.finished-calibration-btn').click(function(){
		$('.quadratic-calibration-fields').hide();
		$('.pixel-range-calibration-fields').hide();
		showConfigButtons();
	});

	$('.disable-fft-btn').click(function(){
		if(fftEnabled){
			$(this).text('Enable FFT');
			fftEnabled = false;
		}
		else{
			$(this).text('Disable FFT')
			fftEnabled = true;
		}
	});

	// user adjusting constants of operation
	$('.slope-field').change(function(){
		SLOPE = $(this).val();
	});

	$('.intercept-field').change(function(){
		INTERCEPT = $(this).val();
	});

	$('.start-pixel-field').change(function(){
		START_PIXEL = $(this).val();
	});

	$('.end-pixel-field').change(function(){
		END_PIXEL = $(this).val();
	});

	function hideConfigButtons(){
		$('.adjust-quadratic-btn').hide();
		$('.disable-fft-btn').hide()
		$('.adjust-pixel-range-btn').hide();
	}

	function showConfigButtons(){
		$('.adjust-quadratic-btn').show();
		$('.disable-fft-btn').show();
		$('.adjust-pixel-range-btn').show();
	}

});