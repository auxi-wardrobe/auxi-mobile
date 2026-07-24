//
//  auxi-Bridging-Header.h
//  auxi
//
//  Exposes React-Core's Objective-C `RCTLinkingManager` to Swift so
//  `AppDelegate.swift` can forward `application(_:open:options:)` into it —
//  required for warm-start `Linking` deep links (reset-password / verify-email)
//  to reach RN's JS `Linking` module. No new pod: RCTLinkingManager ships as
//  part of the already-vendored React-Core pod.
//

#import <React/RCTLinkingManager.h>
