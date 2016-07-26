class PixelReading < ActiveRecord::Base
	belongs_to :ccd_reading

	validates :pixel_number, :digital_value, presence: true
end
