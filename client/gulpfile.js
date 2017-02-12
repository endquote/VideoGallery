/* eslint arrow-body-style: "off" */

const gulp = require('gulp');
const browserify = require('gulp-browserify');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const sequence = require('gulp-sequence');
const del = require('del');
const browserSync = require('browser-sync');
const uglifyjs = require('uglify-js');
const minifier = require('gulp-uglify/minifier');
const pump = require('pump');
const stylus = require('gulp-stylus');

gulp.task('clean', () => {
  return del('./dist');
});

gulp.task('html', () => {
  return pump([
    gulp.src('./src/**/*.html'),
    gulp.dest('./dist/'),
  ]);
});

gulp.task('js', () => {
  return pump([
    gulp.src(['./src/scripts/main.js']),
    sourcemaps.init(),
    browserify(),
    minifier({}, uglifyjs),
    sourcemaps.write('.'),
    gulp.dest('./dist/scripts/'),
  ]);
});

gulp.task('styles', () => {
  return pump([
    gulp.src('./src/styles/**/*'),
    sourcemaps.init(),
    stylus({ compress: true }),
    sourcemaps.write('.'),
    gulp.dest('./dist/styles/'),
  ]);
});

gulp.task('images', () => {
  return pump([
    gulp.src('./src/images/**/*'),
    imagemin({ progressive: true }),
    gulp.dest('./dist/images/'),
  ]);
});

gulp.task('browser-sync', () => {
  browserSync.init({
    proxy: 'localhost:8080',
    open: false,
  });
});

gulp.task('build', sequence('clean', ['html', 'js', 'styles', 'images']));

gulp.task('watch', ['build', 'browser-sync'], () => {
  gulp.watch('./src/**/*.html', ['html', browserSync.reload]);
  gulp.watch('./src/scripts/**/*', ['js', browserSync.reload]);
  gulp.watch('./src/styles/**/*', ['styles', browserSync.reload]);
  gulp.watch('./src/images/**/*', ['images', browserSync.reload]);
});

gulp.task('default', ['build']);
gulp.task('dev', ['watch']);
