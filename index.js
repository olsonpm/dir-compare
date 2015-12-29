var pathUtils = require('path');
var util = require('util');
var fc = require('./filecompare')
var common = require('./common'); 
var compareSyncInternal = require('./compareSync');
var compareAsyncInternal = require('./compareAsync');


/**
 * Default file comparator.
 */
var defaultCompareFileCallback = function (filePath1, fileStat1, filePath2, fileStat2, options) {
    var same = true;
    var compareSize = options.compareSize === undefined ? false : options.compareSize;
    var compareContent = options.compareContent === undefined ? false : options.compareContent;
    if (compareSize && fileStat1.size != fileStat2.size) {
        same = false;
    } else if(compareContent && !fc.compareSync(filePath1, filePath2)){
        same = false;
    }
    return same;
};

/**
 * Default result builder.
 */
var defaultResultBuilderCallback = function (entry1, entry2, state, level, relativePath, options, statistics, diffSet) {
    diffSet.push({
        path1 : entry1 ? pathUtils.dirname(entry1.path) : undefined,
        path2 : entry2 ? pathUtils.dirname(entry2.path) : undefined,
        relativePath : relativePath,
        name1 : entry1 ? entry1.name : undefined,
        name2 : entry2 ? entry2.name : undefined,
        state : state,
        type1 : entry1 ? common.getType(entry1.stat) : 'missing',
        type2 : entry2 ? common.getType(entry2.stat) : 'missing',
        level : level,
        size1 : entry1 ? entry1.stat.size : undefined,
        size2 : entry2 ? entry2.stat.size : undefined,
        date1 : entry1 ? entry1.stat.mtime : undefined,
        date2 : entry2 ? entry2.stat.mtime : undefined
    });
}

var compareSync = function (path1, path2, options, compareFileCallback, resultBuilderCallback) {
    'use strict';
    var statistics = {
        distinct : 0,
        equal : 0,
        left : 0,
        right : 0,
        distinctFiles : 0,
        equalFiles : 0,
        leftFiles : 0,
        rightFiles : 0,
        distinctDirs : 0,
        equalDirs : 0,
        leftDirs : 0,
        rightDirs : 0,
        same : undefined
    };
    var diffSet = [];
    if (!resultBuilderCallback) {
        resultBuilderCallback = defaultResultBuilderCallback;
    }
    if (!compareFileCallback) {
        compareFileCallback = defaultCompareFileCallback;
    }
    compareSyncInternal(path1, path2, 0, '', options === undefined ? {} : options, compareFileCallback, resultBuilderCallback, statistics, diffSet);
    statistics.differences = statistics.distinct + statistics.left + statistics.right;
    statistics.same = statistics.differences ? false : true;
    statistics.diffSet = diffSet;

    return statistics;
};

// TODO: provide async file comparison
// TODO: add option to get only statistics (not dilenames, ...) for memory optimisation.
// TODO: remove all 'debugger', 'console.'
// TODO: see if npm test requires root: do 'npm install ./dir-compare -g', npm test, sudo npm test.
var compareAsync = function (path1, path2, options, compareFileCallback, resultBuilderCallback) {
    'use strict';
    var statistics = {
		distinct : 0,
		equal : 0,
		left : 0,
		right : 0,
        distinctFiles : 0,
        equalFiles : 0,
        leftFiles : 0,
        rightFiles : 0,
        distinctDirs : 0,
        equalDirs : 0,
        leftDirs : 0,
        rightDirs : 0,
		same : undefined,
		diffSet: [],
    };
    if (!resultBuilderCallback) {
        resultBuilderCallback = defaultResultBuilderCallback;
    }
    if (!compareFileCallback) {
        compareFileCallback = defaultCompareFileCallback;
    }
    var asyncDiffSet = [];
    return compareAsyncInternal(path1, path2, 0, '',
    		options === undefined ? {} : options, compareFileCallback, resultBuilderCallback, statistics, asyncDiffSet).then(
    				function(){
    					statistics.differences = statistics.distinct + statistics.left + statistics.right;
    					statistics.same = statistics.differences ? false : true;
    					var diffSet = [];
    					rebuildAsyncDiffSet(statistics, asyncDiffSet, diffSet);
    					statistics.diffSet = diffSet;
    					return statistics;
    				});
};

// Async diffsets are kept into recursive structures.
// This method transforms them into one dimensional arrays. 
var rebuildAsyncDiffSet = function(statistics, asyncDiffSet, diffSet){
	asyncDiffSet.forEach(function(rawDiff){
		if(!Array.isArray(rawDiff)){
		    diffSet.push(rawDiff);
		} else{
		    rebuildAsyncDiffSet(statistics, rawDiff, diffSet);
		}
	});
}


/**
 * Options:
 *  compareSize: true/false - Compares files by size. Defaults to 'false'.
 *  compareContent: true/false - Compares files by content. Defaults to 'false'.
 *  skipSubdirs: true/false - Skips sub directories. Defaults to 'false'.
 *  skipSymlinks: true/false - Skips symbolic links. Defaults to 'false'.
 *  ignoreCase: true/false - Ignores case when comparing names. Defaults to 'false'.
 *  noDiffSet: true/false - Toggles presence of diffSet in output. If true, only statistics are provided. Use this when comparing large number of files to avoid out of memory situations. Defaults to 'false'.
 *  includeFilter: File name filter. Comma separated [minimatch](https://www.npmjs.com/package/minimatch) patterns.
 *  excludeFilter: File/directory name exclude filter. Comma separated [minimatch](https://www.npmjs.com/package/minimatch) patterns.
 *  
 * Output format:
 *  distinct: number of distinct entries
 *  equal: number of equal entries
 *  left: number of entries only in path1
 *  right: number of entries only in path2
 *  differences: total number of differences (distinct+left+right)
 *  same: true if directories are identical
 *  diffSet - List of changes (present if Options.noDiffSet is false)
 *      path1: absolute path not including file/directory name,
 *      path2: absolute path not including file/directory name,
 *      relativePath: common path relative to root,
 *      name1: file/directory name
 *      name2: file/directory name
 *      state: one of equal, left, right, distinct,
 *      type1: one of missing, file, directory
 *      type2: one of missing, file, directory
 *      size1: file size
 *      size2: file size
 *      date1: modification date (stat.mdate)
 *      date2: modification date (stat.mdate)
 *      level: depth
 */
module.exports = {
    compareSync : compareSync,
    compare : compareAsync
};
