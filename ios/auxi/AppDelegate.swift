import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "auxi",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // Warm-start deep links (reset-password / verify-email): forwards
  // `auxi://…` custom-scheme opens into RCTLinkingManager so RN's JS
  // `Linking` `url` event fires. Requires the bridging header
  // (`auxi-Bridging-Header.h`) importing `<React/RCTLinkingManager.h>`.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links (https://macgie.com/…): iOS routes these through
  // `continueUserActivity`, NOT `application(_:open:options:)` above — that
  // method only fires for custom-scheme opens (`auxi://…`) and for
  // `xcrun simctl openurl` / the OS URL-open path in general. Without this
  // method, iOS still launches the app (Associated Domains entitlement +
  // AASA match), but the NSUserActivity carrying the tapped URL is silently
  // dropped before it ever reaches RN's `Linking` module — the app opens to
  // its default cold-start screen instead of the deep-linked one. Confirmed
  // missing (AU-457 real-device TestFlight test, 2026-08-28): custom-scheme
  // links worked, a real https://macgie.com Universal Link tap opened the
  // app but landed on Home.
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
