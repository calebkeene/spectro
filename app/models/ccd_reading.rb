class CcdReading < ActiveRecord::Base
	has_many :pixel_readings
	validates_associated :pixel_readings
end
