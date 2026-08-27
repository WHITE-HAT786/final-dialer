require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json'))) rescue {}

Pod::Spec.new do |s|
  s.name           = 'ExpoPjsip'
  s.version        = '0.1.0'
  s.summary        = 'Native SIP/UDP (PJSIP) engine for the Depth Route mobile app'
  s.license        = 'MIT'
  s.author         = 'Depth Route'
  s.homepage       = 'https://depthroute.com'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # The PJSIP static libs (libpjsua2, libpj*, etc.) + headers must be vendored.
  # See modules/expo-pjsip/PJSIP_SETUP.md for building the iOS PJSIP xcframework.
  # s.vendored_frameworks = 'vendor/pjsip.xcframework'
  # s.pod_target_xcconfig = { 'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/vendor/pjsip/include"' }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = "**/*.{h,m,mm,swift}"
end
