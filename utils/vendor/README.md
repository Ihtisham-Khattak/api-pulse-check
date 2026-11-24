# Vendored libraries

- `k6-reporter-3.0.4.js`: the HTML report generator from https://github.com/benc-uk/k6-reporter
  (release 3.0.4, `dist/bundle.js`), MIT licensed, see `k6-reporter-LICENSE.txt`.
  It is stored here so that tests started from the web UI do not need internet access
  just to load the report library at start-up.
