ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../../Gemfile', __FILE__)

require 'bundler/setup' # Set up gems listed in the Gemfile.

at_exit do
	puts "CLOSING SERIAL PORT"
	@@serial_port.close
end