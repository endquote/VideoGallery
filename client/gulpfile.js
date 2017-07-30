/* eslint arrow-body-style: "off" */

const gulp = require("gulp");
const browserify = require("browserify");
const sourcemaps = require("gulp-sourcemaps");
const imagemin = require("gulp-imagemin");
const sequence = require("gulp-sequence");
const del = require("del");
const browserSync = require("browser-sync");
const uglifyjs = require("uglify-es");
const buffer = require("vinyl-buffer");
const source = require("vinyl-source-stream");
const pump = require("pump");
const stylus = require("gulp-stylus");
const fs = require("fs");
const composer = require("gulp-uglify/composer");

const minify = composer(uglifyjs, console);

gulp.task("clean", () => {
  return del("./dist");
});

gulp.task("html", () => {
  return pump([gulp.src("./src/**/*.html"), gulp.dest("./dist/")]);
});

// Vendor file tips from: http://blog.revathskumar.com/2016/02/browserify-separate-app-and-vendor-bundles.html
const vendors = Object.keys(
  JSON.parse(fs.readFileSync("package.json")).dependencies
);

gulp.task("scripts:vendor", () => {
  const b = browserify({ debug: true });
  vendors.forEach(lib => b.require(lib));
  return pump([
    b.bundle(),
    source("vendor.js"),
    buffer(),
    sourcemaps.init({ loadMaps: true }),
    minify({}),
    sourcemaps.write("."),
    gulp.dest("./dist/scripts/")
  ]);
});

gulp.task("scripts:app:release", () => {
  return pump([
    browserify({
      entries: ["./src/scripts/main.js"],
      debug: true
    })
      .external(vendors)
      .bundle(),
    source("main.js"),
    buffer(),
    sourcemaps.init({ loadMaps: true }),
    minify({}),
    sourcemaps.write("."),
    gulp.dest("./dist/scripts/")
  ]);
});

gulp.task("scripts:app:dev", () => {
  return pump([
    browserify({
      entries: ["./src/scripts/main.js"],
      debug: true
    })
      .external(vendors)
      .bundle(),
    source("main.js"),
    buffer(),
    gulp.dest("./dist/scripts/")
  ]);
});

gulp.task("styles:release", () => {
  return pump([
    gulp.src("./src/styles/**/*"),
    sourcemaps.init(),
    stylus({ compress: true }),
    sourcemaps.write("."),
    gulp.dest("./dist/styles/")
  ]);
});

gulp.task("styles:dev", () => {
  return pump([
    gulp.src("./src/styles/**/*"),
    stylus({ compress: false }),
    gulp.dest("./dist/styles/")
  ]);
});

gulp.task("images", () => {
  return pump([
    gulp.src("./src/images/**/*"),
    imagemin({ progressive: true }),
    gulp.dest("./dist/images/")
  ]);
});

gulp.task("browser-sync", () => {
  browserSync.init({
    proxy: "localhost:8080",
    open: false,
    ghostMode: false
  });
});

gulp.task("default", ["build:release"]);
gulp.task(
  "build:release",
  sequence("clean", [
    "html",
    "scripts:app:release",
    "scripts:vendor",
    "styles:release",
    "images"
  ])
);
gulp.task(
  "build:dev",
  sequence("clean", [
    "html",
    "scripts:app:dev",
    "scripts:vendor",
    "styles:dev",
    "images"
  ])
);

gulp.task("dev", ["build:dev", "browser-sync"], () => {
  gulp.watch("./src/**/*.html", ["html", browserSync.reload]);
  gulp.watch("./src/scripts/**/*", ["scripts:app:dev", browserSync.reload]);
  gulp.watch("./src/styles/**/*", ["styles:dev", browserSync.reload]);
  gulp.watch("./src/images/**/*", ["images", browserSync.reload]);
});
