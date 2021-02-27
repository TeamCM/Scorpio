# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.9]

### Changed
- Make preloader disappears when connected into the websocket server
- Socket.IO will manualy reconnect every 3 seconds if its got disconnected (if fails more than 5 times, it will refresh the page)
- Router.JS is now in the server folder

### Removed
- Unecessary comments in app.js

### Added
- deleteAcc(pwd) function
- Errors if some lib is not loaded

### Fixed
- Socket.IO Not triggering event reconnect, reconnect_attempt, reconnecting (See changed to see the manually reconection)

## [0.0.8]

### Added
- Now the version is the now "n-n-n" not more "n-n" (n is a number)
- DM and Friends Viewer (DM is Direct Message) (Not complete)
- Added Join Server button (Not complete)


## [0.0.7]

### Added
- Verify type of request send to the server

### Fixed
- Changelog says "Removed sendMessage()", this is not true

## [0.0.6]

### Added
- A new clean output in the console

### Removed
- sendMessage()

## [0.0.4]
### Added

- Purify to "<", "/", ">"

### Removed

- DOMPurify
- Removed sendMessage()

### Changed
- Send token in the text of a request to be a header of a request


## [0.0.3]
### Added

- Added DOMPurify


## [0.0.2]
### Added

- sendMessage() function

### Fixed

- User always anonimo in the chat

### Removed

- Send button