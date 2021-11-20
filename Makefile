.DEFAULT_GOAL := help
.PHONY: deps clean build serve watch dev dev-server test test-watch all 

deps: ## installs dependencies
	npm install -g typescript
	npm install -g tsc-watch

clean: ## cleans app build artifacts
	@echo 'cleaning up dist'
	rm -rf './dist/js'
	@echo 'done'

compile: ## compiles the app source code
	@echo 'compile start'
	time tsc
	@echo 'done'

add-js: ## replaces "import from './module'" -> "import from './module.js'" \
				and         "Import('./module')" -> "Import('./module.js')" \
				as tsc won't do this when compiling to esnext \
				see https://github.com/microsoft/TypeScript/issues/27287
	@find ./dist/js -type f -name '*.js' -exec sed -E -i '' '/.*\.js.*/! s/.*[from |Import\(|import\(]['\''"]\.{1,2}(\/[\.a-z]*)+/&\.js/g' {} \;

copy-lib: ## copies lib folder to output
	@cp -R ./lib ./dist/js/ 

replace-ts-paths: ## replaces all imports of ts paths with corresponding paths to physical files
	@node ./scripts/replaceTsPaths.js

post-process: add-js replace-ts-paths copy-lib ## processes build output files

build: clean compile post-process ## builds the app

serve: dev-server ## serves the app from local server

define APPLE_SCRIPT_RELOAD
	tell application "Google Chrome"
		set i to 0
		set found to false
		repeat with t in tabs of front window
			set i to i + 1
			if title of t contains "Bare Bones App" then
				set active tab index of front window to i
				tell active tab of front window to reload
				set found to true
				return
			end if
		end repeat
		if found is equal to false then
			do shell script "open http://localhost:8080"
		end if
	end tell
endef

export APPLE_SCRIPT_RELOAD
reload: ## reloads app tab in chrome
	@echo 'reloading browser tab'
	osascript -e "$$APPLE_SCRIPT_RELOAD"

watch:
	tsc-watch --onSuccess "make reload"

dev: serve watch ## !!!Important run with -j2 option!!! Builds app, serves it, then rebuilds and reloads its window in chrome every time src files are changed

NODE_PATH=$(shell npm root -g)

dev-server: ## starts dev server
	NODE_PATH=${NODE_PATH} node dev-server.js

watch-hot:
	tsc-watch --onSuccess "curl -X POST http://localhost:3000/compileSuccess"

dev-hot: dev-server watch-hot ## !!!Important run with -j2 option!!! Builds app, serves it, starts dev server and notifies app via web socket every time src files are changed

test: ## runs all tests
	@node ./dist/js/tests/index.js

process-test: post-process test
test-watch: ## runs all tests every time a file under ./src changes
	@tsc-watch --onSuccess "make process-test" 

all: deps clean build serve ## builds the app and opens it in browser

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
