class ReadingsController < ApplicationController
	respond_to :html, :json

	def index

	end

	def create
		ccd_read = get_reading

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

		baud_rate = 460800
		data_bits = 8
		stop_bits = 1
		parity = SerialPort::NONE
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
		bytes = []
		finished = false
		i = 0
		
		while !finished
			$serial_port.write 'a'
			if $serial_port.getbyte == 1 # start
				while serial_val = $serial_port.getbyte do
					bytes << serial_val
					break if bytes.count == 7600
				end
				finished = true
			end
		end
		while i < ((bytes.length) -1) do
			str = "".encode(Encoding::ASCII_8BIT)
			str << bytes[i]
			str << bytes[i+1]
			data_set << { x: curr_pixel, y: str.unpack("S")[0] }
			curr_pixel = curr_pixel + 1
			i = i + 2
		end
		data_set
		# puts 'running FFT'
		# vector = data_set.map { |el| el[:y] }
		# transformed_data =  fft( vector )
		# puts "finished FFT, vector length = #{transformed_data.length}"
		# return transformed_data
	end

	def fft(vec)
	  return vec if vec.size <= 1
	  evens_odds = vec.partition.with_index{|_,i| i.even?}
	  evens, odds = evens_odds.map{|even_odd| fft(even_odd)*2} 
	  evens.zip(odds).map.with_index do |(even, odd),i|
	    even + odd * Math::E ** Complex(0, -2 * Math::PI * i / vec.size) if (even && odd)
	  end
	end
end
