fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios build_only

```sh
[bundle exec] fastlane ios build_only
```

Build a signed Release IPA without uploading (smoke test / verify signing)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Bump build number, archive Release, upload to TestFlight, tag, and write metadata for auxi-launch-notify

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
