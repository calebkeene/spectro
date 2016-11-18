$(document).ready(function(){
	

	var START_PIXEL = 1;
	var END_PIXEL = 3700;
	var EXPOSURE_TIME = 1; // default is 1ms
	var usingWavelength = true

	var pixels = createPixelsArray();
	var wavelengths = createWavelengthsArray();

	populateCalibrationForms();

	var busyReading = false;
	var autoRun = false;
	var fftEnabled = true;
	var async = setInterval(getData, 10); //get ready to read every 10ms
	xVals = wavelengths;
	var lastRead = [];

	function getData(force, singleRead){		

		if(exitImmediately(force)){ //may not be required once finished flag added to ajax endpoint
			return null; 
		}

		// either run this from setInterval every 100ms (when autorun on), or manually trigger with force flag
		if((autoRun || force==true) && !busyReading){
			
			busyReading = true;

			var single = singleRead || false;
			
			$.ajax({
				type: 'POST',
				url: Routes.readings_path(),
				data: {single_read: single},

				success: function (data) {

					var amplitudes = data['data'].map( function(a) { return a.y; });
					var points = [];
					var yVals = [];

					if(fftEnabled){ // remove periodic noise with frequency domain band-stop filter
						var transform = num.fft(amplitudes);
						var zeroValueComplex = [0, 0];
						// zero out complex values between 400 (0+400) and 3596 (4096-400)
						// zero out symmetrically so we have components to cancel with on both sides
						transform = transform.fill(zeroValueComplex, 500, 3596);
						yVals = num.ifft(transform).map( function(a) { return a[0]; });

					}
					else{ // just use straight amplitudes
						yVals = data['data'].map( function(a) { return a.y; });
					}

					for (i=0; i< xVals.length; i++){
						var h = new Object();
						h['x'] = xVals[i];
						h['y'] = yVals[i]; // just use raw amplitude (no LPF applied)
						points.push(h)
					}

					lastRead = points;
					busyReading = false;
					
					redrawGraph(force);
				},
				error: function (data) {
					console.log(data['message']);
				}
			});
		}
	}

	function populateCalibrationForms(){
		$('.start-pixel-field').val(START_PIXEL);
		$('.end-pixel-field').val(END_PIXEL);
	}

	function createPixelsArray(){

		vals = [];
		for(i=START_PIXEL; i<=END_PIXEL; i++){
			vals.push(i);
		}
		return vals;
	}

	function createWavelengthsArray(){
		vals = [];

		var a = 7e-10; 
		var b =  -5e-6;
		var c = 0.1053;

	
		for(x=START_PIXEL; x<= END_PIXEL; x++){ // 3rd order polynomial mapping pixel to wavelength
			vals.push(
				((a*(x**3))+(b*(x**2))+(c*x)+359.01)
			);
		}
		return vals;
	}

	function toggleXaxis(){
		usingWavelength = !usingWavelength;
		if(usingWavelength){
			xVals = wavelengths;
		}
		else{
			xVals = pixels;
		}
		rebuildXvals();
	}

	function rebuildXvals(){
		for(i=0; i<lastRead.length; i++){
			lastRead[i].x = xVals[i]; // redo x values of last reading
		}
	}

	function redrawGraph(force){

		if(!exitImmediately(force)){
			if(lastRead.length == 0){ // for drawing empty graph after first connecting to uC
				for(i=0; i< xVals.length; i++){
					lastRead.push({ x: xVals[i], y: 0 })
				}
			}

			if(usingWavelength){
				min =  380;
				max = 720;
				xLabel = 'Wavelength [nm]'
			}
			else{
				min = START_PIXEL;
				max = END_PIXEL;
				xLabel = 'Pixel Number'
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
					title: xLabel,
					titleFontSize: 25,
					titleFontStyle: 'italic',
					labelAngle: 30,
					minimum: min,
					maximum: max
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
					dataPoints: lastRead
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

	function adjustExposureTime(){
		$.ajax({ 
			type: 'POST',
			url: Routes.readings_adjust_exposure_path(),
			data: {exposure_time: EXPOSURE_TIME}
		});
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
				redrawGraph(true);
			},
			error: function (data) {
				console.log(data['message']);
			}
		});
	});


	$('.get-reading-btn').click(function(){
		getData(true, true);
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

	$('.adjust-exposure-btn').click(function(){
		hideConfigButtons();
		$('.adjust-exposure-field').show();
	});

	$('.adjust-pixel-range-btn').click(function(){
		hideConfigButtons();
		$('.pixel-range-calibration-fields').show();
	});

	$('.finished-calibration-btn').click(function(){
		if(usingWavelength){
			xVals = wavelengths;
		}
		else{
			xVals = pixels;
		}	
		rebuildXvals();

		$('.adjust-exposure-field').hide();
		//$('.quadratic-calibration-fields').hide();
		$('.pixel-range-calibration-fields').hide();
		redrawGraph(true);
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

	$('.toggle-x-axis-btn').click(function(){
		toggleXaxis();
		redrawGraph(true);
	});

	// user adjusting constants of operation
	$('.exposure-time-field').change(function(){
		console.log('old EXPOSURE_TIME -> '+EXPOSURE_TIME);
		EXPOSURE_TIME = parseInt($(this).val());
		console.log('new EXPOSURE_TIME -> '+EXPOSURE_TIME);
		adjustExposureTime();
	});

	$('.start-pixel-field').change(function(){
		val = parseInt($(this).val());
		if(val > END_PIXEL-500){
			alert('ERROR: minimum number of pixels to read is 500');
			$(this).val(START_PIXEL);
		}
		else{
			START_PIXEL = val;
		}
	});

	$('.end-pixel-field').change(function(){
		val = parseInt($(this).val());
		if(val < START_PIXEL+500){
			alert('ERROR: minimum number of pixels to read is 500');
			$(this).val(END_PIXEL);
		}
		else{
			END_PIXEL = val;
		}
	});

	function hideConfigButtons(){
		$('.adjust-exposure-btn').hide();
		$('.disable-fft-btn').hide()
		$('.adjust-pixel-range-btn').hide();
		$('.toggle-x-axis-btn').hide();
	}

	function showConfigButtons(){
		$('.adjust-exposure-btn').show();
		$('.disable-fft-btn').show();
		$('.adjust-pixel-range-btn').show();
		$('.toggle-x-axis-btn').show();
	}

});