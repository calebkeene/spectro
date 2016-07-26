class CreateCcdReadings < ActiveRecord::Migration
  def change
    create_table :ccd_readings do |t|
      t.timestamps null: false
    end
  end
end
