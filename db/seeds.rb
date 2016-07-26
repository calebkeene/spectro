# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rake db:seed (or created alongside the db with db:setup).

CcdReading.create
parent_id = CcdReading.last.id
for i in 1..3800 do
	pixel_reading = PixelReading.new
	pixel_reading.pixel_number = i
	pixel_reading.digital_value = Random.rand(65536)
	ccd_reading_id = parent_id
	pixel_reading.save
end
