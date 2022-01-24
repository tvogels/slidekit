
function peg$subclass(child, parent) {
function ctor() { this.constructor = child; }
ctor.prototype = parent.prototype;
child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
this.message  = message;
this.expected = expected;
this.found    = found;
this.location = location;
this.name     = "SyntaxError";

if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
}
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
        return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
        var escapedParts = "",
            i;

        for (i = 0; i < expectation.parts.length; i++) {
            escapedParts += expectation.parts[i] instanceof Array
            ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
            : classEscape(expectation.parts[i]);
        }

        return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
        return "any character";
        },

        end: function(expectation) {
        return "end of input";
        },

        other: function(expectation) {
        return expectation.description;
        }
    };

function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
}

function literalEscape(s) {
    return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g,  '\\"')
    .replace(/\0/g, '\\0')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
    .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
}

function classEscape(s) {
    return s
    .replace(/\\/g, '\\\\')
    .replace(/\]/g, '\\]')
    .replace(/\^/g, '\\^')
    .replace(/-/g,  '\\-')
    .replace(/\0/g, '\\0')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
    .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
}

function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
}

function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i, j;

    for (i = 0; i < expected.length; i++) {
    descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
    for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
        descriptions[j] = descriptions[i];
        j++;
        }
    }
    descriptions.length = j;
    }

    switch (descriptions.length) {
    case 1:
        return descriptions[0];

    case 2:
        return descriptions[0] + " or " + descriptions[1];

    default:
        return descriptions.slice(0, -1).join(", ")
        + ", or "
        + descriptions[descriptions.length - 1];
    }
}

function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
}

return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
options = options !== void 0 ? options : {};

var peg$FAILED = {},

    peg$startRuleFunctions = { Syntax: peg$parseSyntax },
    peg$startRuleFunction  = peg$parseSyntax,

    peg$c0 = function(id, attributes) { return { id, attributes} },
    peg$c1 = "[",
    peg$c2 = peg$literalExpectation("[", false),
    peg$c3 = "]",
    peg$c4 = peg$literalExpectation("]", false),
    peg$c5 = function(key, value) { return {key, value} },
    peg$c6 = "=",
    peg$c7 = peg$literalExpectation("=", false),
    peg$c8 = function(x) { return x; },
    peg$c9 = /^[a-zA-Z0-9\-_]/,
    peg$c10 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "-", "_"], false, false),
    peg$c11 = function() { return text(); },
    peg$c12 = /^[^[\]]/,
    peg$c13 = peg$classExpectation(["[", "]"], true, false),

    peg$currPos          = 0,
    peg$savedPos         = 0,
    peg$posDetailsCache  = [{ line: 1, column: 1 }],
    peg$maxFailPos       = 0,
    peg$maxFailExpected  = [],
    peg$silentFails      = 0,

    peg$result;

if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
    throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
}

function text() {
    return input.substring(peg$savedPos, peg$currPos);
}

function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
}

function expected(description, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildStructuredError(
    [peg$otherExpectation(description)],
    input.substring(peg$savedPos, peg$currPos),
    location
    );
}

function error(message, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildSimpleError(message, location);
}

function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
}

function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
}

function peg$anyExpectation() {
    return { type: "any" };
}

function peg$endExpectation() {
    return { type: "end" };
}

function peg$otherExpectation(description) {
    return { type: "other", description: description };
}

function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos], p;

    if (details) {
    return details;
    } else {
    p = pos - 1;
    while (!peg$posDetailsCache[p]) {
        p--;
    }

    details = peg$posDetailsCache[p];
    details = {
        line:   details.line,
        column: details.column
    };

    while (p < pos) {
        if (input.charCodeAt(p) === 10) {
        details.line++;
        details.column = 1;
        } else {
        details.column++;
        }

        p++;
    }

    peg$posDetailsCache[pos] = details;
    return details;
    }
}

function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails   = peg$computePosDetails(endPos);

    return {
    start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
    },
    end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
    }
    };
}

function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
    peg$maxFailPos = peg$currPos;
    peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
}

function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
}

function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
    peg$SyntaxError.buildMessage(expected, found),
    expected,
    found,
    location
    );
}

function peg$parseSyntax() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseId();
    if (s1 === peg$FAILED) {
    s1 = null;
    }
    if (s1 !== peg$FAILED) {
    s2 = [];
    s3 = peg$parseAttribute();
    while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseAttribute();
    }
    if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c0(s1, s2);
        s0 = s1;
    } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
    }
    } else {
    peg$currPos = s0;
    s0 = peg$FAILED;
    }

    return s0;
}

function peg$parseAttribute() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 91) {
    s1 = peg$c1;
    peg$currPos++;
    } else {
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$c2); }
    }
    if (s1 !== peg$FAILED) {
    s2 = peg$parseAttributeKey();
    if (s2 !== peg$FAILED) {
        s3 = peg$parseAttributeValue();
        if (s3 === peg$FAILED) {
        s3 = null;
        }
        if (s3 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 93) {
            s4 = peg$c3;
            peg$currPos++;
        } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c4); }
        }
        if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c5(s2, s3);
            s0 = s1;
        } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
        }
    } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
    }
    } else {
    peg$currPos = s0;
    s0 = peg$FAILED;
    }

    return s0;
}

function peg$parseAttributeValue() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 61) {
    s1 = peg$c6;
    peg$currPos++;
    } else {
    s1 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$c7); }
    }
    if (s1 !== peg$FAILED) {
    s2 = peg$parseId();
    if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c8(s2);
        s0 = s1;
    } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
    }
    } else {
    peg$currPos = s0;
    s0 = peg$FAILED;
    }

    return s0;
}

function peg$parseAttributeKey() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c9.test(input.charAt(peg$currPos))) {
    s2 = input.charAt(peg$currPos);
    peg$currPos++;
    } else {
    s2 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$c10); }
    }
    if (s2 !== peg$FAILED) {
    while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c9.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
        } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c10); }
        }
    }
    } else {
    s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
    peg$savedPos = s0;
    s1 = peg$c11();
    }
    s0 = s1;

    return s0;
}

function peg$parseId() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c12.test(input.charAt(peg$currPos))) {
    s2 = input.charAt(peg$currPos);
    peg$currPos++;
    } else {
    s2 = peg$FAILED;
    if (peg$silentFails === 0) { peg$fail(peg$c13); }
    }
    if (s2 !== peg$FAILED) {
    while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c12.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
        } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c13); }
        }
    }
    } else {
    s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
    peg$savedPos = s0;
    s1 = peg$c11();
    }
    s0 = s1;

    return s0;
}

peg$result = peg$startRuleFunction();

if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
} else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
    peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
    peg$maxFailExpected,
    peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
    peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
}
}

export default peg$parse;