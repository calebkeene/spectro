$(document).ready(function(){
		
	var autoRun = false;
	var async = setInterval(getData, 700);

	function getData(force){
		console.log('running getData');
		console.log('autoRun ->'+autoRun);
		console.log('force ->'+force);
		if(exitImmediately(force)){ 
			console.log('exiting');
			return null; 
		}
		
		if(autoRun || force==true){
			//console.log('starting ajax request for data at:'+ printTime());
			console.log('passed autoRun || force test')
			$.ajax({
				type: 'POST',
				contentType: "application/json; charset=utf-8",
				url: Routes.readings_path(),
				dataType: 'json',
				success: function (data) {
				   redrawGraph(data, force);
				},
				error: function (result) {
				   console.log('error getting data');
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
				//animationEnabled: true,
				//animationDuration: 10,
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

	function printTime(){
		var now = new Date();
		hours = now.getHours();
		minutes = now.getMinutes();
		seconds = now.getSeconds();
		if(minutes < 10){ minutes = '0'+String(minutes)}
		if(seconds <10){seconds = '0'+String(seconds)}

		return String(hours)+':'+String(minutes)+':'+String(seconds)
	}

	function exitImmediately(force){
		if(typeof(force) == 'undefined' && !autoRun){
			return true;
		}
		else{
			return false;
		}
	}

	//click handlers
	$('.get-reading-btn').click(function(){
		clearInterval(async);
		console.log('clicked btn');
		getData(true);
	});

	$('.auto-read-toggle').click(function(){
		if(autoRun == true){
			clearInterval(async);
			$('.running-icon').hide();
			$(this).text('start auto read');
			$('.get-reading-btn').show(200);
			autoRun = false;
		}
		else{
			$('.running-icon').show();
			$(this).text('stop auto read');	
			$('.get-reading-btn').hide(200);
			async = setInterval(getData, 700);
			autoRun = true;
		}
	});

});