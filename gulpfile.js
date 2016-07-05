var gulp = require('gulp');
//include plugins
var uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    plumber = require('gulp-plumber'),
    livereload = require('gulp-livereload'),
    concat = require('gulp-concat');

gulp.task('concat-apps',function(){
    gulp.src('public/scripts/*.js')
        .pipe(concat('k-app-script.js'))
        .pipe(gulp.dest('build/js'));
});

gulp.task('concat-libs',function(){
    gulp.src(['node_modules/d3/d3.min.js','node_modules/angular/angular.min.js','node_modules/d3-svg-legend/d3-legend.js'])
        .pipe(concat('k-ext-libs.js'))
        .pipe(gulp.dest('build/js'));
});

gulp.task('jshint',function(){
    gulp.src(['./public/libs/*.js'])
    .pipe(plumber())    
    .pipe(jshint)
    .piple(jshint.reporter('default'));
});

gulp.task('scripts',function() {
    gulp.src('js/*.js')
    .pipe(plumber())
    .pipe(uglify())
    .pipe(gulp.dest('build/js'))
    .pipe(livereload());
});

gulp.task('concat-styles',function(){
    gulp.src('public/styles/*.css')
    .pipe(concat('k-app-style.css'))
    .pipe(gulp.dest('build/css'));
});

gulp.task('watch',function(){
    var server = livereload();
    gulp.watch('./public/libs/*.js',['concat-apps']);
    gulp.watch('./public/libs/*.css',['concat-styles']);
    // gulp.watch('./public/libs/*.js',['jshint']);
});


gulp.task('default', ['concat-libs','concat-apps','concat-styles','scripts','watch']);