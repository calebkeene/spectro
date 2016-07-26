class ReadingsController < ApplicationController

	def index
		@pixel_readings = PixelReading.all
	end

end
