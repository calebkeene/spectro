Spectro::Application.routes.draw do

  root 'readings#index'
  resources :readings, only: [:create]
  post '/readings/connect_serial', to: 'readings#connect_serial'
  post '/readings/adjust_exposure', to: 'readings#adjust_exposure'
end
