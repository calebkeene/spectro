ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../../Gemfile', __FILE__)

require 'bundler/setup' # Set up gems listed in the Gemfile.

at_exit do
	if $serial_port
		$serial_port.close
		puts "SERIAL PORT CLOSED" 
	end
end