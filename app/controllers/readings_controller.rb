class ReadingsController < ApplicationController
	respond_to :html, :json

	def index

	end

	def create
		ccd_read = get_reading
		# increment = Math::PI/3800
		# ccd_read = []
		# for i in 1..3800 
		# 	ccd_read << {x: i, y: Math.sin(i*increment)}
		# end

		if ccd_read.length == 3800
			render json: {message: 'new ccd reading', data: ccd_read }, status: 200
		else
			render json: {message: 'incorrect data length'}, status: 500
		end
	end

	def connect_serial
		if !$serial_port.nil? # has previously been opened, reclose
			puts "closing old serial port"
			$serial_port.close
		end
	 	port_str = `ls -lah /dev/cu.*`.split(" ").last
		raise 'PORT NOT FOUND - please check' if port_str.length < 1
		puts "serial_port=#{port_str}"

		#baud_rate = 230400
		baud_rate = 460800
		data_bits = 8
		stop_bits = 1
		parity = SerialPort::NONE
		#loop do
		$serial_port = SerialPort.new(port_str, baud_rate, data_bits, stop_bits, parity)
		sleep(1)
		$serial_port.sync = true
		$serial_port.read_timeout = 0
		if $serial_port #this should always be true, just check for sanity
			render json: {message: 'initialised serial port successfully, ready to send data'}, status: 200
		end
	end

	def get_reading
		$serial_port.flush
		curr_pixel = 1
		data_set = []
		finished = false
		reads = 1
		while !finished
			$serial_port.write 'a'
			if $serial_port.gets.chomp == 'S' # start
				while serial_val = $serial_port.gets.chomp do
					if serial_val == 'E' # end
						finished = true
						break
					else
						data_set << { x: curr_pixel, y: serial_val.to_i }
						curr_pixel = curr_pixel + 1
					end
				end
			end
		end
		data_set

	end

end
