class CreatePixelReadings < ActiveRecord::Migration
  def change
    create_table :pixel_readings do |t|
    	t.belongs_to :ccd_reading, index: true
    	t.integer :pixel_number
    	t.integer :digital_value
      t.timestamps null: false
    end
  end
end
