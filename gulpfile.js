const path = require('path');
const gulp = require('gulp');

const workflow = require('gulp-workflow');
const build = workflow.build;

workflow.init({ PACKAGE_PREFIX: /^decorator-/ });

gulp.task('clean', workflow.clean);

gulp.task('build:packages', build.packages);
gulp.task('build:modules', ['build:packages'], build.modules);

gulp.task('entry', ['build:modules'], build.entry);

gulp.task('build', ['entry'], build.basic);
gulp.task('build:min', ['entry'], build.min);

gulp.task('release', (done) => {
	const run = require('run-sequence');
	return run(
		'clean',
		['build', 'build:min'],
		done
	);
});

gulp.task('default', (done) => {
	const run = require('run-sequence');
	return run(
		'clean',
		'build',
		done
	);
});
