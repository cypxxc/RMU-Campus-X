const fs = require('fs');

function readJson(path) {
    const buf = fs.readFileSync(path);
    // Try UTF-16LE
    try {
        const str = buf.toString('utf16le').replace(/^\ufeff/, '');
        if (str.trim().startsWith('{')) return JSON.parse(str);
    } catch (e) {}
    // Try UTF-8
    try {
        const str = buf.toString('utf8').replace(/^\ufeff/, '');
        if (str.trim().startsWith('{')) return JSON.parse(str);
    } catch (e) {}
    throw new Error('Could not parse JSON from ' + path);
}

try {
    const v = readJson('vitest_results.json');
    const p = readJson('playwright_results.json');
    let r = null;
    try { r = readJson('rules_results.json'); } catch(e) { console.log('rules_results.json not found or empty, skipping.'); }

    let report = 'TEST SUMMARY REPORT\n===================\n\n';
    report += 'VITEST RESULTS (Unit Tests)\n---------------------------\n';

    v.testResults.forEach(suite => {
        report += '\nSuite: ' + suite.name.split(/[\\\/]/).pop() + '\n';
        suite.assertionResults.forEach(test => {
            report += '  [' + (test.status === 'passed' ? 'PASS' : test.status.toUpperCase()) + '] ' + test.title + ' (' + test.duration + 'ms)\n';
        });
    });

    if (r) {
        report += '\n\nFIRESTORE RULES RESULTS\n-----------------------\n';
        r.testResults.forEach(suite => {
            report += '\nSuite: ' + suite.name.split(/[\\\/]/).pop() + '\n';
            suite.assertionResults.forEach(test => {
                report += '  [' + (test.status === 'passed' ? 'PASS' : test.status.toUpperCase()) + '] ' + test.title + ' (' + test.duration + 'ms)\n';
            });
        });
    }

    report += '\n\nPLAYWRIGHT RESULTS (E2E Tests)\n------------------------------\n';

    p.suites.forEach(s => {
        report += '\nFile: ' + s.title + '\n';
        s.suites.forEach(suite => {
            report += '  Group: ' + suite.title + '\n';
            suite.specs.forEach(spec => {
                spec.tests.forEach(t => {
                    const status = t.results[0]?.status || 'unknown';
                    report += '    [' + (status === 'expected' || status === 'passed' ? 'PASS' : status.toUpperCase()) + '] ' + spec.title + ' (' + t.projectName + ') (' + (t.results[0]?.duration || 0) + 'ms)\n';
                });
            });
        });
    });

    fs.writeFileSync('test_output.txt', report);
    console.log('Successfully updated test_output.txt');

    // Also update CSV
    let csv = 'Testing Type,Category,Test Suite,Test Case,Status,Duration (ms)\n';
    v.testResults.forEach(suite => {
        const suiteName = suite.name.split(/[\\\/]/).pop().replace('.test.ts', '').replace('.test.tsx', '');
        suite.assertionResults.forEach(test => {
            csv += `White Box,Unit,${suiteName},"${test.title}",${test.status === 'passed' ? 'Passed' : test.status === 'todo' ? 'Todo' : 'Failed'},${test.duration}\n`;
        });
    });

    if (r) {
        r.testResults.forEach(suite => {
            const suiteName = 'firestore.rules';
            suite.assertionResults.forEach(test => {
                csv += `White Box,Unit,${suiteName},"${test.title}",${test.status === 'passed' ? 'Passed' : test.status === 'todo' ? 'Todo' : 'Failed'},${test.duration}\n`;
            });
        });
    }

    p.suites.forEach(s => {
        const processSuite = (suite, parentTitle = '') => {
            if (suite.specs) {
                suite.specs.forEach(spec => {
                    spec.tests.forEach(t => {
                        const status = t.results[0]?.status || 'unknown';
                        const finalStatus = (status === 'expected' || status === 'passed') ? 'Passed' : (status === 'skipped' ? 'Skipped' : 'Failed');
                        csv += `Black Box,E2E,${suite.title || parentTitle},"${spec.title} (${t.projectName})",${finalStatus},${t.results[0]?.duration || 0}\n`;
                    });
                });
            }
            if (suite.suites) {
                suite.suites.forEach(child => processSuite(child, suite.title || parentTitle));
            }
        };
        processSuite(s);
    });

    fs.writeFileSync('TEST_RESULTS.csv', csv);
    console.log('Successfully updated TEST_RESULTS.csv');
} catch (err) {
    console.error('Error generating reports:', err);
}
