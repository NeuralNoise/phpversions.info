// Simple function for comparing x.y.z versions
function cmpVersions (a, b) {
    var i, l, d;

    a = a.split('.');
    b = b.split('.');
    l = Math.min(a.length, b.length);

    for (i=0; i<l; i++) {
        d = parseInt(a[i], 10) - parseInt(b[i], 10);
        if (d !== 0) {
            return d;
        }
    }

    return a.length - b.length;
}

// Extracts the major and minor version from a string
function parseMinorVersion(version) {
    return version.substring(0, version.lastIndexOf('.'));
}

function getBadVersions(callback) {
    var request = new XMLHttpRequest();
    request.open('GET', 'https://raw.githubusercontent.com/psecio/versionscan/master/src/Psecio/Versionscan/checks.json', true);

    request.onreadystatechange = function() {
        if (this.readyState === 4) {
            if (this.status == 200) {
                // Success!
                var data = JSON.parse(this.responseText);

                badVersions = _.chain(data.checks)
                    // Extract the version numbers from each check
                    .map(function(check){
                        return check.fixVersions.base;
                    })
                    // Flatten into a single array
                    .flatten()
                    // Remove duplicates
                    .uniq()
                    // Sort by version number
                    .sort(cmpVersions)
                    // Group by minor version
                    .groupBy(parseMinorVersion)
                    // Return the latest version for each group
                    .map(function(versions){
                        return versions.pop();
                    })
                    // Re-key the array by minor version for faster lookups
                    .keyBy(parseMinorVersion)
                    // Un-chain so we get the final results
                    .value();

                callback(badVersions);
            }
        }
    };

    request.send();
    request = null;
}

// Only execute this code on pages which have version tables
if (document.getElementsByClassName('tables').length > 0) {
    getBadVersions(function (badVersions) {
        var versionCells = document.querySelectorAll('.tables .version');
        Array.prototype.forEach.call(versionCells, function (el) {
            var version = el.textContent.trim();
            if (version === '' || version === '-') {
                return;
            }

            // Try to parse the version number
            version = version.match(/^(\d+\.\d+)\.\d+/);
            if (version === null) {
                el.classList.add('unknown-version');
                return;
            }

            var fullVersion = version[0];
            var minorVersion = version[1];

            if (typeof badVersions[minorVersion] === 'undefined') {
                el.classList.add('good-version');
            } else if (cmpVersions(fullVersion, badVersions[minorVersion]) > 0) {
                el.classList.add('good-version');
            } else {
                el.classList.add('bad-version');
            }
        });
    });
}
