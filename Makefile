.DEFAULT_GOAL := help
.PHONY: deps clean compile build add-js replace-ts-paths post-process watch-hot dev-hot dev-server test test-watch all 

deps: ## installs dependencies
	npm install -g typescript
	npm install -g tsc-watch
	yarn --frozen-lockfile

clean: ## cleans app build artifacts
	@echo 'cleaning up dist'
	rm -rf './dist/js'
	@echo 'done'

compile: ## compiles the app source code
	@echo 'compile start'
	time tsc
	@echo 'done'

copy-lib: ## copies lib folder to output
	@cp -R ./lib ./dist/js/ 

add-js: ## replaces "import from './module'" -> "import from './module.js'" \
				and         "Import('./module')" -> "Import('./module.js')" \
				as tsc won't do this when compiling to esnext \
				see https://github.com/microsoft/TypeScript/issues/27287
	@node ./scripts/fixJSPaths.js

replace-ts-paths: ## replaces all imports of ts paths with corresponding paths to physical files
	@node ./scripts/replaceTsPaths.js

post-process: add-js replace-ts-paths ## processes build output files

build: clean compile copy-lib post-process ## builds the app

NODE_PATH=$(shell npm root -g)

dev-server: ## starts dev server
	NODE_PATH=${NODE_PATH} node dev-server.js

process-notify: post-process
	curl -X POST http://localhost:3000/compileSuccess
watch-hot: build
	tsc-watch --onSuccess "$(MAKE) process-notify"

dev-hot: dev-server watch-hot ## !!!Important run with -j2 option!!! Builds app, serves it, starts dev server and notifies app via web socket every time src files are changed

test: ## runs all tests
	@node ./dist/js/tests/index.js

process-test: post-process test
test-watch: ## runs all tests every time a file under ./src changes
	@tsc-watch --onSuccess "$(MAKE) process-test" 

all: deps build dev-server ## builds the app and opens it in browser

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
