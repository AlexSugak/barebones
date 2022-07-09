.DEFAULT_GOAL := help
.PHONY: deps clean compile build add-js import-map replace-ts-paths post-process watch-hot dev-hot dev-server test test-watch all 

.EXPORT_ALL_VARIABLES:

NODE_PATH=$(shell npm root -g)
DIST_DIR=$(shell realpath ./dist)

deps: ## installs dependencies
	npm install -g fsmonitor
	yarn --frozen-lockfile

clean: ## cleans app build artifacts
	@echo 'cleaning up dist'
	@rm -rf './dist/js'
	@echo 'done'

compile: ## compiles the app source code
	@echo 'compile start'
	time ./node_modules/.bin/tsc
	@echo 'done'

copy-lib: ## copies lib folder to output
	@echo 'copying lib folder to output'
	@mkdir -p ./dist/js/ && cp -R ./lib ./dist/js/
	@echo 'done'

add-js: ## replaces "import from './module'" -> "import from './module.js'" \
				and         "Import('./module')" -> "Import('./module.js')" \
				as tsc won\'t do this when compiling to esnext \
				see https://github.com/microsoft/TypeScript/issues/27287
	@node ./scripts/fixJSPaths.js

replace-ts-paths: ## replaces all imports of ts paths with corresponding paths to physical files
	@node ./scripts/replaceTsPaths.js

import-map: ## generates import map file
	@node ./scripts/generateImportMap.js

hashes: ## appends hashes to js files in dist
	@node ./scripts/appendHashes.js

post-process: import-map replace-ts-paths ## processes build output files

watch-css: ## watches css changes and notifies dev server
	@fsmonitor -s -p '+*.css' $(MAKE) compile-success

build: clean compile copy-lib post-process ## builds the app

publish: ## prepares production bundle
	@$(MAKE) build
	@$(MAKE) hashes
	@$(MAKE) import-map

dev-server: ## starts dev server
	@node --no-warnings --experimental-top-level-await --experimental-policy=./dist/js/policy.json dev-server.js

compile-success: 
	@curl -X POST http://localhost:3000/compileSuccess

process-notify: post-process
	@$(MAKE) compile-success
	@$(MAKE) test

watch-hot:
	@./node_modules/.bin/tsc-watch --onSuccess "$(MAKE) process-notify"

dev: ## Builds app, serves it, starts dev server and notifies app via web socket every time src files are changed
	@$(MAKE) build
	@$(MAKE) dev-server &
	$(MAKE) watch-hot &
	$(MAKE) watch-css

test: ## runs all tests
	@node --no-warnings --experimental-top-level-await --experimental-policy=./dist/js/policy.json ./dist/js/tests/index.js

process-test: 
	@$(MAKE) post-process
	@$(MAKE) test
test-watch: ## runs all tests every time a file under ./src changes
	@$(MAKE) clean
	@$(MAKE) copy-lib
	@./node_modules/.bin/tsc-watch --onSuccess "$(MAKE) process-test" 

docker-down: ## shuts down docker compose
	@docker-compose down

docker-up: ## starts up docker compose
	@docker-compose up -d

postgres-rebuild: docker-down ## rebuilds and restarts postgres service, use it to e.g. update the db schema
	@rm -rf ./postgres-data
	@$(MAKE) docker-up

postgres-connect: docker-up ## connects to postgress container and runs bash, run `psql -U postgres` to connect to db
	@CID=$$(docker ps -aqf "name=postgres"); \
	docker exec -it "$$CID" /bin/bash

all: deps build docker-up dev-server ## restores dependecies, builds the app and runs dev server

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
