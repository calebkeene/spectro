class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception
  before_action :connect_serial, only: [:index]

  def connect_serial
	 	port_str = `ls -lah /dev/cu.*`.split(" ").last
		raise 'PORT NOT FOUND - please check' if port_str.length < 1
		puts "serial_port=#{port_str}"

		baud_rate = 230400
		data_bits = 8
		stop_bits = 1
		parity = SerialPort::NONE
		#loop do
		@@serial_port = SerialPort.new(port_str, baud_rate, data_bits, stop_bits, parity)
		sleep(1)
		@@serial_port.sync = true
		@@serial_port.read_timeout = 0
	end
end
