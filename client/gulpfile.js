const gulp = require('gulp');
const browserify = require('browserify');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const sequence = require('gulp-sequence').use(gulp);
const del = require('del');
const browserSync = require('browser-sync');
const uglifyjs = require('uglify-es');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const pump = require('pump');
const sass = require('gulp-sass');
const fs = require('fs');
const composer = require('gulp-uglify/composer');
const glob = require('glob-promise');
const path = require('path');
const cleanCSS = require('gulp-clean-css');
const stringify = require('stringify');

const minify = composer(uglifyjs, console);

gulp.task('clean', () => {
  return del('./dist');
});

gulp.task('html', () => {
  return pump([gulp.src('./src/*.html'), gulp.dest('./dist/')]);
});

let vendors = [];

// Bundle all the vendor libraries into a vendor.js file.
gulp.task('scripts:vendor', () => {
  vendors = Object.keys(JSON.parse(fs.readFileSync('package.json')).dependencies);
  const b = browserify({ debug: true });
  vendors.forEach(lib => b.require(lib));
  return pump([
    b.bundle(),
    source('vendor.js'),
    buffer(),
    sourcemaps.init({ loadMaps: true }),
    minify({}),
    sourcemaps.write('.'),
    gulp.dest('./dist/scripts/'),
  ]);
});

// Build tasks for each script entry point, and then tasks which run all of those.
(function buildScriptTasks() {
  const entries = glob.sync('./src/apps/**.js');
  const entryNames = entries.map(entry => path.parse(entry).name);
  const devTaskNames = entryNames.map(name => `scripts:apps:${name}:dev`);
  const releaseTaskNames = entryNames.map(name => `scripts:apps:${name}:release`);

  entries.forEach((entry, i) => {
    // Browserify the entry point, with source maps.
    gulp.task(devTaskNames[i], () => {
      return pump([
        browserify({
          entries: [entry],
          debug: true,
        })
          .transform(stringify)
          .external(vendors)
          .bundle(),
        source(path.parse(entry).base),
        buffer(),
        sourcemaps.init({ loadMaps: true }),
        sourcemaps.write('.'),
        gulp.dest('./dist/scripts/'),
      ]);
    });

    // Release is the same as dev, except for the minify() bit.
    gulp.task(releaseTaskNames[i], () => {
      return pump([
        browserify({
          entries: [entry],
          debug: true,
        })
          .transform(stringify)
          .external(vendors)
          .bundle(),
        source(path.parse(entry).base),
        buffer(),
        sourcemaps.init({ loadMaps: true }),
        minify({}),
        sourcemaps.write('.'),
        gulp.dest('./dist/scripts/'),
      ]);
    });
  });

  // Run all the entry point tasks.
  gulp.task('scripts:apps:dev', devTaskNames);
  gulp.task('scripts:apps:release', releaseTaskNames);
}());

// Compile Stylus files.
gulp.task('sass', () => {
  return pump([
    gulp.src('./src/sass/**/*.scss'),
    sourcemaps.init(),
    sass({ outputStyle: 'compressed' }),
    sourcemaps.write('.'),
    gulp.dest('./dist/styles/'),
  ]);
});

// Orinary CSS files, like the leaflet one.
gulp.task('css', () => {
  return pump([
    gulp.src(['./src/css/**/*.css', './node_modules/leaflet/dist/leaflet.css']),
    sourcemaps.init(),
    cleanCSS(),
    sourcemaps.write('.'),
    gulp.dest('./dist/styles/'),
  ]);
});

// Copy/compress images.
gulp.task('images', () => {
  return pump([
    gulp.src(['./src/images/**/*', './node_modules/leaflet/dist/images/*']),
    imagemin({ progressive: true }),
    gulp.dest('./dist/images/'),
  ]);
});

// Maps are special SVG fiels, we don't want to treat them as images, because imagemin takes out stuff we need.
gulp.task('maps', () => {
  return pump([gulp.src('./src/maps/**/*'), gulp.dest('./dist/maps')]);
});

gulp.task('default', ['build:release']);

gulp.task(
  'build:release',
  sequence('clean', 'scripts:vendor', [
    'html',
    'maps',
    'scripts:apps:release',
    'sass',
    'css',
    'images',
  ]));

gulp.task(
  'build:dev',
  sequence('clean', 'scripts:vendor', [
    'html',
    'maps',
    'scripts:apps:dev',
    'sass',
    'css',
    'images',
  ]));

// Watch/sync drama below.

// Set up Browser Sync. Don't do ghost mode, it is crazy.
gulp.task('browser-sync', () => {
  browserSync.init({
    proxy: 'localhost:8080',
    open: false,
    ghostMode: false,
  });
});

// Define tasks which do the reload after a task. It adds ':watch' to the task name.
// Per: https://browsersync.io/docs/gulp#gulp-reload
// Revise when Gulp 4 happens? https://github.com/gulpjs/gulp/blob/4.0/docs/recipes/minimal-browsersync-setup-with-gulp4.md
function watchTask(...names) {
  names.forEach((name) => {
    gulp.task(`${name}:watch`, [name], (done) => {
      browserSync.reload();
      done();
    });
  });
}

watchTask('html', 'scripts:vendor', 'scripts:apps:dev', 'sass', 'css', 'maps', 'images');

gulp.task('dev', ['build:dev', 'browser-sync'], () => {
  gulp.watch('./src/**/*.html', ['html:watch']);
  gulp.watch('./src/**/*.js', ['scripts:apps:dev:watch']);
  gulp.watch('./src/**/*.scss', ['sass:watch']);
  gulp.watch('./src/**/*.css', ['css:watch']);
  gulp.watch('./src/images/**/*', ['images:watch']);
  gulp.watch('./src/maps/**/*', ['maps:watch']);
  gulp.watch('./package.json', ['scripts:vendor:watch', 'scripts:apps:dev:watch']);
});
