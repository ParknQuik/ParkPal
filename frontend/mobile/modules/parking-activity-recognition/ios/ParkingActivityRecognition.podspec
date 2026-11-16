Pod::Spec.new do |s|
  s.name           = 'ParkingActivityRecognition'
  s.version        = '1.0.0'
  s.summary        = 'Native activity recognition for parking guidance'
  s.description    = 'Normalizes Android Activity Recognition and Apple Core Motion signals.'
  s.license        = { :type => 'MIT' }
  s.author         = 'ParkPal'
  s.homepage       = 'https://github.com/ParknQuik/ParkPal'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  # CocoaPods uses the local module path supplied by Expo autolinking; this is
  # the source repository metadata required by the podspec format.
  s.source         = { :git => 'https://github.com/ParknQuik/ParkPal.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
