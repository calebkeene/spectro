class ReadingsController < ApplicationController
	respond_to :html, :json
	def index

	end

	def create
		ccd_read = get_reading
		#pixels = PixelReading.all
		#ccd_read = pixels.map { |reading| { x: reading.pixel_number, y: reading.digital_value }}
		render json: {message: 'new ccd reading', data: ccd_read }, status: 200
	end

	def get_reading
		
		@@serial_port.flush
		curr_pixel = 1
		data_set = []
		finished = false
		reads = 1
		while !finished
			@@serial_port.write 'a'
			if @@serial_port.gets.chomp == 'S' # start
				while serial_val = @@serial_port.gets.chomp do
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
