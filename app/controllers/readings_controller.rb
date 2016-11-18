class ReadingsController < ApplicationController
	
	respond_to :html, :json

	WAVELENGTHS = *(1..3800).map{ |x| 
		7e-10*(x**3)-5e-6*(x**2)+0.1053*x+359.01
	}

	def index
		# just render index.haml
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

	def adjust_exposure
		exposure_time = params[:exposure_time]
		$serial_port.flush
		finished = false
		exposure = 0

		while !finished
			puts 'sending \'e\' to uC'
			puts "finished -> #{finished}"
			$serial_port.write 'e' # tell uC we're adjusting exposure 
			0
			if $serial_port.getbyte == 1
				puts 'handshake complete, sending exposure time to uC'
				$serial_port.write(exposure_time)
		 	end
		end
		puts "finished! set exposure to #{exposure}ms"
	end

	def get_reading
		$serial_port.flush
		curr_pixel = 1
		data_set = []
		bytes = []
		finished = false
		i = 0
		
		while !finished
			$serial_port.write 'r' # get reading
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
			data_set << { y: (str.unpack("S")[0] - 5300) } # 5300 is dark signal (signal with no light input)
			i = i + 2
		end

		if params[:single_read] == 'true'
			single_read_create_txt(data_set)
		end
		puts "val -> #{data_set.last[:y]}"
		data_set
	end

	def single_read_create_txt(data_set)
		data_dir = "#{`pwd`.chomp}/manual_reads"
		Dir.mkdir(data_dir) unless File.exist?(data_dir)

		puts "saving spectral read to #{data_dir}"
		File.open("#{data_dir}/fluorescent_roomlights_20ms_fixed.txt", 'w') do |f|
			data_set.each_with_index { |reading, i| f << WAVELENGTHS[i].to_s + " " + reading[:y].to_s + "\n" }
		end
	end

end
