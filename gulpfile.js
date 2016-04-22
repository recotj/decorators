const path = require('path');
const gulp = require('gulp');

const PACKAGE_NAME = require('./package.json').name;
const PACKAGES_PATH = './packages';
const DIST_PATH = './lib';
const DIST_PACKAGES_PATH = `${DIST_PATH}/packages`;
const ENTRY_FILE = 'entry.js';

const PACKAGE_PREFIX = /^decorator-/;

const isWin32 = (path.win32 === path);
const srcEx = isWin32 ? /(packages\\[^\\]+)\\src\\/ : /(packages\/[^\/]+)\/src\//;
const libFragment = isWin32 ? '$1\\lib\\' : '$1/lib/';

gulp.task('clean', (done) => {
	require('del')(DIST_PATH)
		.then(paths => {
			paths.forEach(path => console.log('delete: %s', path.replace(__dirname, '')));
			done();
		});
});

gulp.task('build:packages', () => {
	const plumber = require('gulp-plumber');
	const gutil = require('gulp-util');
	const newer = require('gulp-newer');
	const through = require('through2');
	const babel = require('gulp-babel');
	const chalk = require('chalk');

	return gulp.src(`${PACKAGES_PATH}/*/src/**/*.js`)
		.pipe(plumber({
			errorHandler(err) {
				gutil.log(err.stack);
			}
		}))
		.pipe(through.obj((file, enc, callback) => {
			file._path = file.path;
			file.path = file.path.replace(srcEx, libFragment);
			callback(null, file);
		}))
		.pipe(newer(PACKAGES_PATH))
		.pipe(through.obj((file, enc, callback) => {
			gutil.log('compiling', `'${chalk.cyan(file._path)}'...`);
			callback(null, file);
		}))
		.pipe(babel())
		.pipe(gulp.dest(PACKAGES_PATH));
});

gulp.task('build:modules', ['build:packages'], () => {
	return gulp.src([`${PACKAGES_PATH}/*/lib/**/*.js`, `${PACKAGES_PATH}/*/package.json`])
		.pipe(gulp.dest(DIST_PACKAGES_PATH));
});

gulp.task('entry', ['build:modules'], (done) => {
	const stream = require('stream');
	const pass = stream.PassThrough();
	const fs = require('fs');
	const makeVinylStream = require('vinyl-source-stream');

	fs.readdir(DIST_PACKAGES_PATH, (error, files) => {
		if (error) return console.error(error);
		const scripts = [];
		files.forEach((filename) => {
			if (PACKAGE_PREFIX) filename = filename.replace(PACKAGE_PREFIX, '');
			const key = filename.replace(/-([a-z])/g, (m, p1) => p1.toUpperCase());
			const script = `module.exports['${key}'] = require('./${filename}');`;
			scripts.push(script);
		});
		pass.end(new Buffer(scripts.join('\n'), 'utf8'));

		const out = pass.pipe(makeVinylStream(ENTRY_FILE))
			.pipe(gulp.dest(DIST_PACKAGES_PATH));

		done(null, out);
	});
});

gulp.task('build', ['entry'], () => {
	const browserify = require('browserify');
	const makeVinylStream = require('vinyl-source-stream');

	const options = {
		entries: [ENTRY_FILE],
		basedir: DIST_PACKAGES_PATH,
		standalone: PACKAGE_NAME
	};

	return browserify(options)
		.external(['react', 'react-dom', 'react/lib/PooledClass', 'lodash'])
		.bundle()
		.pipe(makeVinylStream(`${PACKAGE_NAME}.js`))
		.pipe(gulp.dest(DIST_PATH));
});

gulp.task('build:min', ['entry'], () => {
	const browserify = require('browserify');
	const makeVinylStream = require('vinyl-source-stream');
	const makeVinylBuffer = require('vinyl-buffer');
	const uglify = require('gulp-uglify');

	const derequire = require('browserify-derequire');
	const collapse = require('bundle-collapser/plugin');

	const options = {
		entries: [ENTRY_FILE],
		basedir: DIST_PACKAGES_PATH,
		standalone: PACKAGE_NAME,
		plugin: [derequire, collapse]
	};

	return browserify(options)
		.external(['react', 'react-dom', 'react/lib/PooledClass', 'lodash'])
		.bundle()
		.pipe(makeVinylStream(`${PACKAGE_NAME}.min.js`))
		.pipe(makeVinylBuffer())
		.pipe(uglify({
			compress: {
				if_return: true,
				dead_code: true,
				drop_console: true,
				drop_debugger: true
			},
			output: {
				ascii_only: true
			}
		}))
		.pipe(gulp.dest(DIST_PATH));
});


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
