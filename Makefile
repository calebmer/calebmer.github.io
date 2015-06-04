MODULES     = node_modules/.bin/
DESTINATION = destination
ASSETS      = assets
SOURCE      = source

SCRIPTS_SOURCE = $(ASSETS)/_scripts
SCRIPTS_BUILD  = $(ASSETS)/scripts/main.js

STYLES_SOURCE = $(ASSETS)/_styles
STYLES_BUILD  = $(ASSETS)/styles/main.css

.PHONY: clean serve monitor watch

scripts:
	@$(MODULES)browserify \
		$(shell find $(SCRIPTS_SOURCE)/vendor -name *.js) \
		$(SCRIPTS_SOURCE)/main.js \
	|	$(MODULES)uglifyjs \
		--compress --mangle \
		-o $(SCRIPTS_BUILD)

styles:
	@$(MODULES)node-sass \
		--output-style compressed \
		$(STYLES_SOURCE)/main.sass \
	| $(MODULES)postcss \
		--use autoprefixer \
		-o $(STYLES_BUILD)

clean:
	rm $(SCRIPTS_BUILD) $(STYLES_BUILD)

serve:
	jekyll serve \
		--host localhost \
		--future --unpublished --drafts

monitor:
	$(MODULES)nodemon \
		-w $(SCRIPTS_SOURCE) -e js \
		-x "make scripts" \
	& $(MODULES)nodemon \
		-w $(STYLES_SOURCE) -e sass \
		-x "make styles"

watch:
	make monitor & make serve
