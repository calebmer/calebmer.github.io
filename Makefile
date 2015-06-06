MODULES = node_modules/.bin/
SITE = _site
ASSETS = assets

SCRIPTS_SOURCE = $(ASSETS)/_scripts
SCRIPTS_BUILD = $(ASSETS)/scripts/main.js

STYLES_SOURCE = $(ASSETS)/_styles
STYLES_BUILD = $(ASSETS)/styles/main.css

FRONTMATTER = ---\n---\n

.PHONY: clean serve monitor watch

scripts:
	$(MODULES)browserify \
		$(SCRIPTS_SOURCE)/main.js \
	|	$(MODULES)uglifyjs \
		--compress --mangle \
	| echo "$(FRONTMATTER)$$(cat -)" \
	> $(SCRIPTS_BUILD)

styles:
	$(MODULES)node-sass \
		--output-style compressed \
		$(STYLES_SOURCE)/main.sass \
	| $(MODULES)postcss \
		--use autoprefixer \
	| echo "$(FRONTMATTER)$$(cat -)" \
	> $(STYLES_BUILD)

clean:
	rm $(SCRIPTS_BUILD) $(STYLES_BUILD)

serve:
	jekyll serve \
		--config _config.yml,_development.yml \
		--host 0.0.0.0 \
		--future --unpublished --drafts

monitor:
	$(MODULES)nodemon \
		-w $(SCRIPTS_SOURCE) -e js \
		-x "make scripts" \
	& $(MODULES)nodemon \
		-w $(STYLES_SOURCE) -e sass \
		-x "make styles"

watch:
	make monitor \
	& $(MODULES)browser-sync start \
		--no-notify \
		--files $(SITE) \
	& make serve
