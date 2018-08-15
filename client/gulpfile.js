const gulp = require('gulp');
const browserify = require('browserify');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const sequence = require('gulp-sequence');
const del = require('del');
const browserSync = require('browser-sync');
const uglifyjs = require('uglify-es');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const sass = require('gulp-sass');
const fs = require('fs');
const composer = require('gulp-uglify/composer');
const glob = require('glob-promise');
const path = require('path');
const cleanCSS = require('gulp-clean-css');
const stringify = require('stringify');

sequence.use(gulp);
const minify = composer(uglifyjs, console);

gulp.task('clean', () => {
  return del('dist');
});

gulp.task('html', () => {
  return gulp.src('src/*.html')
    .pipe(gulp.dest('dist/'));
});

let vendors = [];

// Bundle all the vendor libraries into a vendor.js file.
gulp.task('scripts:vendor', () => {
  vendors = Object.keys(JSON.parse(fs.readFileSync('package.json')).dependencies);
  const b = browserify({ debug: true });
  vendors.forEach(lib => b.require(lib));
  return b.bundle()
    .pipe(source('vendor.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(minify({}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/scripts/'));
});

let globalTasks = ['html', 'scripts:vendor', 'css', 'images'];
let scriptTasks = [];

// Build tasks for each script entry point, and then tasks which run all of those.
(function buildScriptTasks() {
  const entries = glob.sync('src/apps/**.js');
  const entryNames = entries.map(entry => path.parse(entry).name);
  scriptTasks = entryNames.map(name => `scripts:apps:${name}`);
  const sassTasks = entryNames.map(name => `sass:${name}`);
  globalTasks = globalTasks.concat(sassTasks);

  // Run all the entry point tasks.
  gulp.task('scripts:apps', scriptTasks);
  gulp.task('sass', sassTasks);

  entries.forEach((entry, i) => {
    // Browserify the entry point, with source maps.
    gulp.task(scriptTasks[i], () => {
      return browserify({ entries: [entry], debug: true })
        .transform(stringify)
        .external(vendors)
        .bundle()
        .pipe(source(path.parse(entry).base))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(minify({}))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/scripts/'));
    });

    // Compile sass files.
    gulp.task(sassTasks[i], () => {
      return gulp.src(entry.replace('apps', 'sass').replace('.js', '.scss'))
        .pipe(sourcemaps.init())
        .pipe(sass({ outputStyle: 'compressed' }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/styles/'));
    });
  });
}());

// Ordinary CSS files.
gulp.task('css', () => {
  return gulp.src(['src/css/**/*.css'])
    .pipe(sourcemaps.init())
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/styles/'));
});

// Copy/compress images.
gulp.task('images', () => {
  return gulp.src(['src/images/**/*'])
    .pipe(imagemin({ progressive: true }))
    .pipe(gulp.dest('dist/images/'));
});

gulp.task('build', sequence('clean', globalTasks.concat(scriptTasks)));
gulp.task('default', ['build']);

// Watch/sync drama below.

// Set up Browser Sync. Don't do ghost mode, it is crazy.
gulp.task('browser-sync', () => {
  browserSync.init({
    proxy: 'localhost:8080',
    browser: 'google chrome',
    ghostMode: false,
    notify: false,
    ui: false,
    open: false,
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

watchTask('html', 'scripts:vendor', 'scripts:apps', 'sass', 'css', 'images');

gulp.task('dev:watch', () => {
  gulp.watch('src/*.html', ['html:watch']);
  gulp.watch('src/**/*.js', ['scripts:apps:watch']);
  gulp.watch('src/components/*.html', ['scripts:apps:watch']);
  gulp.watch('src/**/*.scss', ['sass:watch']);
  gulp.watch('src/**/*.css', ['css:watch']);
  gulp.watch('src/images/**/*', ['images:watch']);
  gulp.watch('package.json', ['scripts:vendor:watch', 'scripts:apps:watch']);
});

// The dev task builds, runs browser-sync, then watches everything.
gulp.task('dev', sequence('build', 'browser-sync', 'dev:watch'));
