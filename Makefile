.DEFAULT_GOAL := help
.PHONY: deps clean build serve watch dev dev-server test test-watch all 

deps: ## installs dependencies
	npm install -g typescript
	npm install -g ts-node
	npm install -g http-server
	npm install -g tsc-watch
	npm install -g express
	npm install -g ws

clean: ## cleans app build artifacts
	@echo 'cleaning up dist'
	rm -rf './dist/js'
	@echo 'done'

build: ## builds the app source code
	@echo 'build start'
	time tsc
	@echo 'done'

serve: ## serves the app from local server
	##  | awk '/Available on/ { system("open http://localhost:8080") }'
	cd dist && http-server . -c-1 -P http://localhost:8080?

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
	@ts-node ./tests.ts

test-watch: ## runs all tests every time a file under ./src changes
	@make test
	@fswatch -or ./ | xargs -n1 -I {} sh -c 'clear && make test'  

all: deps clean build serve ## builds the app and opens it in browser

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
