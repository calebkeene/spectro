Spectro::Application.routes.draw do

  root 'readings#index'
  resources :readings, only: [:create]
end
