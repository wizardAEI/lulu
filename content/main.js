(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';

    var NodeType;
    (function (NodeType) {
        NodeType[NodeType["Document"] = 0] = "Document";
        NodeType[NodeType["DocumentType"] = 1] = "DocumentType";
        NodeType[NodeType["Element"] = 2] = "Element";
        NodeType[NodeType["Text"] = 3] = "Text";
        NodeType[NodeType["CDATA"] = 4] = "CDATA";
        NodeType[NodeType["Comment"] = 5] = "Comment";
    })(NodeType || (NodeType = {}));

    function isElement(n) {
        return n.nodeType === n.ELEMENT_NODE;
    }
    function isShadowRoot(n) {
        var host = n === null || n === void 0 ? void 0 : n.host;
        return Boolean((host === null || host === void 0 ? void 0 : host.shadowRoot) === n);
    }
    function isNativeShadowDom(shadowRoot) {
        return Object.prototype.toString.call(shadowRoot) === '[object ShadowRoot]';
    }
    function fixBrowserCompatibilityIssuesInCSS(cssText) {
        if (cssText.includes(' background-clip: text;') &&
            !cssText.includes(' -webkit-background-clip: text;')) {
            cssText = cssText.replace(' background-clip: text;', ' -webkit-background-clip: text; background-clip: text;');
        }
        return cssText;
    }
    function getCssRulesString(s) {
        try {
            var rules = s.rules || s.cssRules;
            return rules
                ? fixBrowserCompatibilityIssuesInCSS(Array.from(rules).map(getCssRuleString).join(''))
                : null;
        }
        catch (error) {
            return null;
        }
    }
    function getCssRuleString(rule) {
        var cssStringified = rule.cssText;
        if (isCSSImportRule(rule)) {
            try {
                cssStringified = getCssRulesString(rule.styleSheet) || cssStringified;
            }
            catch (_a) {
            }
        }
        return cssStringified;
    }
    function isCSSImportRule(rule) {
        return 'styleSheet' in rule;
    }
    var Mirror = (function () {
        function Mirror() {
            this.idNodeMap = new Map();
            this.nodeMetaMap = new WeakMap();
        }
        Mirror.prototype.getId = function (n) {
            var _a;
            if (!n)
                return -1;
            var id = (_a = this.getMeta(n)) === null || _a === void 0 ? void 0 : _a.id;
            return id !== null && id !== void 0 ? id : -1;
        };
        Mirror.prototype.getNode = function (id) {
            return this.idNodeMap.get(id) || null;
        };
        Mirror.prototype.getIds = function () {
            return Array.from(this.idNodeMap.keys());
        };
        Mirror.prototype.getMeta = function (n) {
            return this.nodeMetaMap.get(n) || null;
        };
        Mirror.prototype.removeNodeFromMap = function (n) {
            var _this = this;
            var id = this.getId(n);
            this.idNodeMap["delete"](id);
            if (n.childNodes) {
                n.childNodes.forEach(function (childNode) {
                    return _this.removeNodeFromMap(childNode);
                });
            }
        };
        Mirror.prototype.has = function (id) {
            return this.idNodeMap.has(id);
        };
        Mirror.prototype.hasNode = function (node) {
            return this.nodeMetaMap.has(node);
        };
        Mirror.prototype.add = function (n, meta) {
            var id = meta.id;
            this.idNodeMap.set(id, n);
            this.nodeMetaMap.set(n, meta);
        };
        Mirror.prototype.replace = function (id, n) {
            var oldNode = this.getNode(id);
            if (oldNode) {
                var meta = this.nodeMetaMap.get(oldNode);
                if (meta)
                    this.nodeMetaMap.set(n, meta);
            }
            this.idNodeMap.set(id, n);
        };
        Mirror.prototype.reset = function () {
            this.idNodeMap = new Map();
            this.nodeMetaMap = new WeakMap();
        };
        return Mirror;
    }());
    function createMirror() {
        return new Mirror();
    }
    function maskInputValue(_a) {
        var maskInputOptions = _a.maskInputOptions, tagName = _a.tagName, type = _a.type, value = _a.value, maskInputFn = _a.maskInputFn;
        var text = value || '';
        if (maskInputOptions[tagName.toLowerCase()] ||
            maskInputOptions[type]) {
            if (maskInputFn) {
                text = maskInputFn(text);
            }
            else {
                text = '*'.repeat(text.length);
            }
        }
        return text;
    }
    var ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__';
    function is2DCanvasBlank(canvas) {
        var ctx = canvas.getContext('2d');
        if (!ctx)
            return true;
        var chunkSize = 50;
        for (var x = 0; x < canvas.width; x += chunkSize) {
            for (var y = 0; y < canvas.height; y += chunkSize) {
                var getImageData = ctx.getImageData;
                var originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData
                    ? getImageData[ORIGINAL_ATTRIBUTE_NAME]
                    : getImageData;
                var pixelBuffer = new Uint32Array(originalGetImageData.call(ctx, x, y, Math.min(chunkSize, canvas.width - x), Math.min(chunkSize, canvas.height - y)).data.buffer);
                if (pixelBuffer.some(function (pixel) { return pixel !== 0; }))
                    return false;
            }
        }
        return true;
    }

    var _id = 1;
    var tagNameRegex = new RegExp('[^a-z0-9-_:]');
    var IGNORED_NODE = -2;
    function genId() {
        return _id++;
    }
    function getValidTagName(element) {
        if (element instanceof HTMLFormElement) {
            return 'form';
        }
        var processedTagName = element.tagName.toLowerCase().trim();
        if (tagNameRegex.test(processedTagName)) {
            return 'div';
        }
        return processedTagName;
    }
    function stringifyStyleSheet(sheet) {
        return sheet.cssRules
            ? Array.from(sheet.cssRules)
                .map(function (rule) { return rule.cssText || ''; })
                .join('')
            : '';
    }
    function extractOrigin(url) {
        var origin = '';
        if (url.indexOf('//') > -1) {
            origin = url.split('/').slice(0, 3).join('/');
        }
        else {
            origin = url.split('/')[0];
        }
        origin = origin.split('?')[0];
        return origin;
    }
    var canvasService;
    var canvasCtx;
    var URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
    var RELATIVE_PATH = /^(?!www\.|(?:http|ftp)s?:\/\/|[A-Za-z]:\\|\/\/|#).*/;
    var DATA_URI = /^(data:)([^,]*),(.*)/i;
    function absoluteToStylesheet(cssText, href) {
        return (cssText || '').replace(URL_IN_CSS_REF, function (origin, quote1, path1, quote2, path2, path3) {
            var filePath = path1 || path2 || path3;
            var maybeQuote = quote1 || quote2 || '';
            if (!filePath) {
                return origin;
            }
            if (!RELATIVE_PATH.test(filePath)) {
                return "url(".concat(maybeQuote).concat(filePath).concat(maybeQuote, ")");
            }
            if (DATA_URI.test(filePath)) {
                return "url(".concat(maybeQuote).concat(filePath).concat(maybeQuote, ")");
            }
            if (filePath[0] === '/') {
                return "url(".concat(maybeQuote).concat(extractOrigin(href) + filePath).concat(maybeQuote, ")");
            }
            var stack = href.split('/');
            var parts = filePath.split('/');
            stack.pop();
            for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                var part = parts_1[_i];
                if (part === '.') {
                    continue;
                }
                else if (part === '..') {
                    stack.pop();
                }
                else {
                    stack.push(part);
                }
            }
            return "url(".concat(maybeQuote).concat(stack.join('/')).concat(maybeQuote, ")");
        });
    }
    var SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
    var SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
    function getAbsoluteSrcsetString(doc, attributeValue) {
        if (attributeValue.trim() === '') {
            return attributeValue;
        }
        var pos = 0;
        function collectCharacters(regEx) {
            var chars;
            var match = regEx.exec(attributeValue.substring(pos));
            if (match) {
                chars = match[0];
                pos += chars.length;
                return chars;
            }
            return '';
        }
        var output = [];
        while (true) {
            collectCharacters(SRCSET_COMMAS_OR_SPACES);
            if (pos >= attributeValue.length) {
                break;
            }
            var url = collectCharacters(SRCSET_NOT_SPACES);
            if (url.slice(-1) === ',') {
                url = absoluteToDoc(doc, url.substring(0, url.length - 1));
                output.push(url);
            }
            else {
                var descriptorsStr = '';
                url = absoluteToDoc(doc, url);
                var inParens = false;
                while (true) {
                    var c = attributeValue.charAt(pos);
                    if (c === '') {
                        output.push((url + descriptorsStr).trim());
                        break;
                    }
                    else if (!inParens) {
                        if (c === ',') {
                            pos += 1;
                            output.push((url + descriptorsStr).trim());
                            break;
                        }
                        else if (c === '(') {
                            inParens = true;
                        }
                    }
                    else {
                        if (c === ')') {
                            inParens = false;
                        }
                    }
                    descriptorsStr += c;
                    pos += 1;
                }
            }
        }
        return output.join(', ');
    }
    function absoluteToDoc(doc, attributeValue) {
        if (!attributeValue || attributeValue.trim() === '') {
            return attributeValue;
        }
        var a = doc.createElement('a');
        a.href = attributeValue;
        return a.href;
    }
    function isSVGElement(el) {
        return Boolean(el.tagName === 'svg' || el.ownerSVGElement);
    }
    function getHref() {
        var a = document.createElement('a');
        a.href = '';
        return a.href;
    }
    function transformAttribute(doc, tagName, name, value) {
        if (name === 'src' ||
            (name === 'href' && value && !(tagName === 'use' && value[0] === '#'))) {
            return absoluteToDoc(doc, value);
        }
        else if (name === 'xlink:href' && value && value[0] !== '#') {
            return absoluteToDoc(doc, value);
        }
        else if (name === 'background' &&
            value &&
            (tagName === 'table' || tagName === 'td' || tagName === 'th')) {
            return absoluteToDoc(doc, value);
        }
        else if (name === 'srcset' && value) {
            return getAbsoluteSrcsetString(doc, value);
        }
        else if (name === 'style' && value) {
            return absoluteToStylesheet(value, getHref());
        }
        else if (tagName === 'object' && name === 'data' && value) {
            return absoluteToDoc(doc, value);
        }
        else {
            return value;
        }
    }
    function _isBlockedElement(element, blockClass, blockSelector) {
        if (typeof blockClass === 'string') {
            if (element.classList.contains(blockClass)) {
                return true;
            }
        }
        else {
            for (var eIndex = element.classList.length; eIndex--;) {
                var className = element.classList[eIndex];
                if (blockClass.test(className)) {
                    return true;
                }
            }
        }
        if (blockSelector) {
            return element.matches(blockSelector);
        }
        return false;
    }
    function classMatchesRegex(node, regex, checkAncestors) {
        if (!node)
            return false;
        if (node.nodeType !== node.ELEMENT_NODE) {
            if (!checkAncestors)
                return false;
            return classMatchesRegex(node.parentNode, regex, checkAncestors);
        }
        for (var eIndex = node.classList.length; eIndex--;) {
            var className = node.classList[eIndex];
            if (regex.test(className)) {
                return true;
            }
        }
        if (!checkAncestors)
            return false;
        return classMatchesRegex(node.parentNode, regex, checkAncestors);
    }
    function needMaskingText(node, maskTextClass, maskTextSelector) {
        var el = node.nodeType === node.ELEMENT_NODE
            ? node
            : node.parentElement;
        if (el === null)
            return false;
        if (typeof maskTextClass === 'string') {
            if (el.classList.contains(maskTextClass))
                return true;
            if (el.closest(".".concat(maskTextClass)))
                return true;
        }
        else {
            if (classMatchesRegex(el, maskTextClass, true))
                return true;
        }
        if (maskTextSelector) {
            if (el.matches(maskTextSelector))
                return true;
            if (el.closest(maskTextSelector))
                return true;
        }
        return false;
    }
    function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
        var win = iframeEl.contentWindow;
        if (!win) {
            return;
        }
        var fired = false;
        var readyState;
        try {
            readyState = win.document.readyState;
        }
        catch (error) {
            return;
        }
        if (readyState !== 'complete') {
            var timer_1 = setTimeout(function () {
                if (!fired) {
                    listener();
                    fired = true;
                }
            }, iframeLoadTimeout);
            iframeEl.addEventListener('load', function () {
                clearTimeout(timer_1);
                fired = true;
                listener();
            });
            return;
        }
        var blankUrl = 'about:blank';
        if (win.location.href !== blankUrl ||
            iframeEl.src === blankUrl ||
            iframeEl.src === '') {
            setTimeout(listener, 0);
            return iframeEl.addEventListener('load', listener);
        }
        iframeEl.addEventListener('load', listener);
    }
    function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
        var fired = false;
        var styleSheetLoaded;
        try {
            styleSheetLoaded = link.sheet;
        }
        catch (error) {
            return;
        }
        if (styleSheetLoaded)
            return;
        var timer = setTimeout(function () {
            if (!fired) {
                listener();
                fired = true;
            }
        }, styleSheetLoadTimeout);
        link.addEventListener('load', function () {
            clearTimeout(timer);
            fired = true;
            listener();
        });
    }
    function serializeNode(n, options) {
        var doc = options.doc, mirror = options.mirror, blockClass = options.blockClass, blockSelector = options.blockSelector, maskTextClass = options.maskTextClass, maskTextSelector = options.maskTextSelector, inlineStylesheet = options.inlineStylesheet, _a = options.maskInputOptions, maskInputOptions = _a === void 0 ? {} : _a, maskTextFn = options.maskTextFn, maskInputFn = options.maskInputFn, _b = options.dataURLOptions, dataURLOptions = _b === void 0 ? {} : _b, inlineImages = options.inlineImages, recordCanvas = options.recordCanvas, keepIframeSrcFn = options.keepIframeSrcFn, _c = options.newlyAddedElement, newlyAddedElement = _c === void 0 ? false : _c;
        var rootId = getRootId(doc, mirror);
        switch (n.nodeType) {
            case n.DOCUMENT_NODE:
                if (n.compatMode !== 'CSS1Compat') {
                    return {
                        type: NodeType.Document,
                        childNodes: [],
                        compatMode: n.compatMode
                    };
                }
                else {
                    return {
                        type: NodeType.Document,
                        childNodes: []
                    };
                }
            case n.DOCUMENT_TYPE_NODE:
                return {
                    type: NodeType.DocumentType,
                    name: n.name,
                    publicId: n.publicId,
                    systemId: n.systemId,
                    rootId: rootId
                };
            case n.ELEMENT_NODE:
                return serializeElementNode(n, {
                    doc: doc,
                    blockClass: blockClass,
                    blockSelector: blockSelector,
                    inlineStylesheet: inlineStylesheet,
                    maskInputOptions: maskInputOptions,
                    maskInputFn: maskInputFn,
                    dataURLOptions: dataURLOptions,
                    inlineImages: inlineImages,
                    recordCanvas: recordCanvas,
                    keepIframeSrcFn: keepIframeSrcFn,
                    newlyAddedElement: newlyAddedElement,
                    rootId: rootId
                });
            case n.TEXT_NODE:
                return serializeTextNode(n, {
                    maskTextClass: maskTextClass,
                    maskTextSelector: maskTextSelector,
                    maskTextFn: maskTextFn,
                    rootId: rootId
                });
            case n.CDATA_SECTION_NODE:
                return {
                    type: NodeType.CDATA,
                    textContent: '',
                    rootId: rootId
                };
            case n.COMMENT_NODE:
                return {
                    type: NodeType.Comment,
                    textContent: n.textContent || '',
                    rootId: rootId
                };
            default:
                return false;
        }
    }
    function getRootId(doc, mirror) {
        if (!mirror.hasNode(doc))
            return undefined;
        var docId = mirror.getId(doc);
        return docId === 1 ? undefined : docId;
    }
    function serializeTextNode(n, options) {
        var _a;
        var maskTextClass = options.maskTextClass, maskTextSelector = options.maskTextSelector, maskTextFn = options.maskTextFn, rootId = options.rootId;
        var parentTagName = n.parentNode && n.parentNode.tagName;
        var textContent = n.textContent;
        var isStyle = parentTagName === 'STYLE' ? true : undefined;
        var isScript = parentTagName === 'SCRIPT' ? true : undefined;
        if (isStyle && textContent) {
            try {
                if (n.nextSibling || n.previousSibling) {
                }
                else if ((_a = n.parentNode.sheet) === null || _a === void 0 ? void 0 : _a.cssRules) {
                    textContent = stringifyStyleSheet(n.parentNode.sheet);
                }
            }
            catch (err) {
                console.warn("Cannot get CSS styles from text's parentNode. Error: ".concat(err), n);
            }
            textContent = absoluteToStylesheet(textContent, getHref());
        }
        if (isScript) {
            textContent = 'SCRIPT_PLACEHOLDER';
        }
        if (!isStyle &&
            !isScript &&
            textContent &&
            needMaskingText(n, maskTextClass, maskTextSelector)) {
            textContent = maskTextFn
                ? maskTextFn(textContent)
                : textContent.replace(/[\S]/g, '*');
        }
        return {
            type: NodeType.Text,
            textContent: textContent || '',
            isStyle: isStyle,
            rootId: rootId
        };
    }
    function serializeElementNode(n, options) {
        var doc = options.doc, blockClass = options.blockClass, blockSelector = options.blockSelector, inlineStylesheet = options.inlineStylesheet, _a = options.maskInputOptions, maskInputOptions = _a === void 0 ? {} : _a, maskInputFn = options.maskInputFn, _b = options.dataURLOptions, dataURLOptions = _b === void 0 ? {} : _b, inlineImages = options.inlineImages, recordCanvas = options.recordCanvas, keepIframeSrcFn = options.keepIframeSrcFn, _c = options.newlyAddedElement, newlyAddedElement = _c === void 0 ? false : _c, rootId = options.rootId;
        var needBlock = _isBlockedElement(n, blockClass, blockSelector);
        var tagName = getValidTagName(n);
        var attributes = {};
        var len = n.attributes.length;
        for (var i = 0; i < len; i++) {
            var attr = n.attributes[i];
            attributes[attr.name] = transformAttribute(doc, tagName, attr.name, attr.value);
        }
        if (tagName === 'link' && inlineStylesheet) {
            var stylesheet = Array.from(doc.styleSheets).find(function (s) {
                return s.href === n.href;
            });
            var cssText = null;
            if (stylesheet) {
                cssText = getCssRulesString(stylesheet);
            }
            if (cssText) {
                delete attributes.rel;
                delete attributes.href;
                attributes._cssText = absoluteToStylesheet(cssText, stylesheet.href);
            }
        }
        if (tagName === 'style' &&
            n.sheet &&
            !(n.innerText || n.textContent || '').trim().length) {
            var cssText = getCssRulesString(n.sheet);
            if (cssText) {
                attributes._cssText = absoluteToStylesheet(cssText, getHref());
            }
        }
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
            var value = n.value;
            var checked = n.checked;
            if (attributes.type !== 'radio' &&
                attributes.type !== 'checkbox' &&
                attributes.type !== 'submit' &&
                attributes.type !== 'button' &&
                value) {
                attributes.value = maskInputValue({
                    type: attributes.type,
                    tagName: tagName,
                    value: value,
                    maskInputOptions: maskInputOptions,
                    maskInputFn: maskInputFn
                });
            }
            else if (checked) {
                attributes.checked = checked;
            }
        }
        if (tagName === 'option') {
            if (n.selected && !maskInputOptions['select']) {
                attributes.selected = true;
            }
            else {
                delete attributes.selected;
            }
        }
        if (tagName === 'canvas' && recordCanvas) {
            if (n.__context === '2d') {
                if (!is2DCanvasBlank(n)) {
                    attributes.rr_dataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
                }
            }
            else if (!('__context' in n)) {
                var canvasDataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
                var blankCanvas = document.createElement('canvas');
                blankCanvas.width = n.width;
                blankCanvas.height = n.height;
                var blankCanvasDataURL = blankCanvas.toDataURL(dataURLOptions.type, dataURLOptions.quality);
                if (canvasDataURL !== blankCanvasDataURL) {
                    attributes.rr_dataURL = canvasDataURL;
                }
            }
        }
        if (tagName === 'img' && inlineImages) {
            if (!canvasService) {
                canvasService = doc.createElement('canvas');
                canvasCtx = canvasService.getContext('2d');
            }
            var image_1 = n;
            var oldValue_1 = image_1.crossOrigin;
            image_1.crossOrigin = 'anonymous';
            var recordInlineImage = function () {
                try {
                    canvasService.width = image_1.naturalWidth;
                    canvasService.height = image_1.naturalHeight;
                    canvasCtx.drawImage(image_1, 0, 0);
                    attributes.rr_dataURL = canvasService.toDataURL(dataURLOptions.type, dataURLOptions.quality);
                }
                catch (err) {
                    console.warn("Cannot inline img src=".concat(image_1.currentSrc, "! Error: ").concat(err));
                }
                oldValue_1
                    ? (attributes.crossOrigin = oldValue_1)
                    : image_1.removeAttribute('crossorigin');
            };
            if (image_1.complete && image_1.naturalWidth !== 0)
                recordInlineImage();
            else
                image_1.onload = recordInlineImage;
        }
        if (tagName === 'audio' || tagName === 'video') {
            attributes.rr_mediaState = n.paused
                ? 'paused'
                : 'played';
            attributes.rr_mediaCurrentTime = n.currentTime;
        }
        if (!newlyAddedElement) {
            if (n.scrollLeft) {
                attributes.rr_scrollLeft = n.scrollLeft;
            }
            if (n.scrollTop) {
                attributes.rr_scrollTop = n.scrollTop;
            }
        }
        if (needBlock) {
            var _d = n.getBoundingClientRect(), width = _d.width, height = _d.height;
            attributes = {
                "class": attributes["class"],
                rr_width: "".concat(width, "px"),
                rr_height: "".concat(height, "px")
            };
        }
        if (tagName === 'iframe' && !keepIframeSrcFn(attributes.src)) {
            if (!n.contentDocument) {
                attributes.rr_src = attributes.src;
            }
            delete attributes.src;
        }
        return {
            type: NodeType.Element,
            tagName: tagName,
            attributes: attributes,
            childNodes: [],
            isSVG: isSVGElement(n) || undefined,
            needBlock: needBlock,
            rootId: rootId
        };
    }
    function lowerIfExists(maybeAttr) {
        if (maybeAttr === undefined) {
            return '';
        }
        else {
            return maybeAttr.toLowerCase();
        }
    }
    function slimDOMExcluded(sn, slimDOMOptions) {
        if (slimDOMOptions.comment && sn.type === NodeType.Comment) {
            return true;
        }
        else if (sn.type === NodeType.Element) {
            if (slimDOMOptions.script &&
                (sn.tagName === 'script' ||
                    (sn.tagName === 'link' &&
                        sn.attributes.rel === 'preload' &&
                        sn.attributes.as === 'script') ||
                    (sn.tagName === 'link' &&
                        sn.attributes.rel === 'prefetch' &&
                        typeof sn.attributes.href === 'string' &&
                        sn.attributes.href.endsWith('.js')))) {
                return true;
            }
            else if (slimDOMOptions.headFavicon &&
                ((sn.tagName === 'link' && sn.attributes.rel === 'shortcut icon') ||
                    (sn.tagName === 'meta' &&
                        (lowerIfExists(sn.attributes.name).match(/^msapplication-tile(image|color)$/) ||
                            lowerIfExists(sn.attributes.name) === 'application-name' ||
                            lowerIfExists(sn.attributes.rel) === 'icon' ||
                            lowerIfExists(sn.attributes.rel) === 'apple-touch-icon' ||
                            lowerIfExists(sn.attributes.rel) === 'shortcut icon')))) {
                return true;
            }
            else if (sn.tagName === 'meta') {
                if (slimDOMOptions.headMetaDescKeywords &&
                    lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) {
                    return true;
                }
                else if (slimDOMOptions.headMetaSocial &&
                    (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) ||
                        lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) ||
                        lowerIfExists(sn.attributes.name) === 'pinterest')) {
                    return true;
                }
                else if (slimDOMOptions.headMetaRobots &&
                    (lowerIfExists(sn.attributes.name) === 'robots' ||
                        lowerIfExists(sn.attributes.name) === 'googlebot' ||
                        lowerIfExists(sn.attributes.name) === 'bingbot')) {
                    return true;
                }
                else if (slimDOMOptions.headMetaHttpEquiv &&
                    sn.attributes['http-equiv'] !== undefined) {
                    return true;
                }
                else if (slimDOMOptions.headMetaAuthorship &&
                    (lowerIfExists(sn.attributes.name) === 'author' ||
                        lowerIfExists(sn.attributes.name) === 'generator' ||
                        lowerIfExists(sn.attributes.name) === 'framework' ||
                        lowerIfExists(sn.attributes.name) === 'publisher' ||
                        lowerIfExists(sn.attributes.name) === 'progid' ||
                        lowerIfExists(sn.attributes.property).match(/^article:/) ||
                        lowerIfExists(sn.attributes.property).match(/^product:/))) {
                    return true;
                }
                else if (slimDOMOptions.headMetaVerification &&
                    (lowerIfExists(sn.attributes.name) === 'google-site-verification' ||
                        lowerIfExists(sn.attributes.name) === 'yandex-verification' ||
                        lowerIfExists(sn.attributes.name) === 'csrf-token' ||
                        lowerIfExists(sn.attributes.name) === 'p:domain_verify' ||
                        lowerIfExists(sn.attributes.name) === 'verify-v1' ||
                        lowerIfExists(sn.attributes.name) === 'verification' ||
                        lowerIfExists(sn.attributes.name) === 'shopify-checkout-api-token')) {
                    return true;
                }
            }
        }
        return false;
    }
    function serializeNodeWithId(n, options) {
        var doc = options.doc, mirror = options.mirror, blockClass = options.blockClass, blockSelector = options.blockSelector, maskTextClass = options.maskTextClass, maskTextSelector = options.maskTextSelector, _a = options.skipChild, skipChild = _a === void 0 ? false : _a, _b = options.inlineStylesheet, inlineStylesheet = _b === void 0 ? true : _b, _c = options.maskInputOptions, maskInputOptions = _c === void 0 ? {} : _c, maskTextFn = options.maskTextFn, maskInputFn = options.maskInputFn, slimDOMOptions = options.slimDOMOptions, _d = options.dataURLOptions, dataURLOptions = _d === void 0 ? {} : _d, _e = options.inlineImages, inlineImages = _e === void 0 ? false : _e, _f = options.recordCanvas, recordCanvas = _f === void 0 ? false : _f, onSerialize = options.onSerialize, onIframeLoad = options.onIframeLoad, _g = options.iframeLoadTimeout, iframeLoadTimeout = _g === void 0 ? 5000 : _g, onStylesheetLoad = options.onStylesheetLoad, _h = options.stylesheetLoadTimeout, stylesheetLoadTimeout = _h === void 0 ? 5000 : _h, _j = options.keepIframeSrcFn, keepIframeSrcFn = _j === void 0 ? function () { return false; } : _j, _k = options.newlyAddedElement, newlyAddedElement = _k === void 0 ? false : _k;
        var _l = options.preserveWhiteSpace, preserveWhiteSpace = _l === void 0 ? true : _l;
        var _serializedNode = serializeNode(n, {
            doc: doc,
            mirror: mirror,
            blockClass: blockClass,
            blockSelector: blockSelector,
            maskTextClass: maskTextClass,
            maskTextSelector: maskTextSelector,
            inlineStylesheet: inlineStylesheet,
            maskInputOptions: maskInputOptions,
            maskTextFn: maskTextFn,
            maskInputFn: maskInputFn,
            dataURLOptions: dataURLOptions,
            inlineImages: inlineImages,
            recordCanvas: recordCanvas,
            keepIframeSrcFn: keepIframeSrcFn,
            newlyAddedElement: newlyAddedElement
        });
        if (!_serializedNode) {
            console.warn(n, 'not serialized');
            return null;
        }
        var id;
        if (mirror.hasNode(n)) {
            id = mirror.getId(n);
        }
        else if (slimDOMExcluded(_serializedNode, slimDOMOptions) ||
            (!preserveWhiteSpace &&
                _serializedNode.type === NodeType.Text &&
                !_serializedNode.isStyle &&
                !_serializedNode.textContent.replace(/^\s+|\s+$/gm, '').length)) {
            id = IGNORED_NODE;
        }
        else {
            id = genId();
        }
        var serializedNode = Object.assign(_serializedNode, { id: id });
        mirror.add(n, serializedNode);
        if (id === IGNORED_NODE) {
            return null;
        }
        if (onSerialize) {
            onSerialize(n);
        }
        var recordChild = !skipChild;
        if (serializedNode.type === NodeType.Element) {
            recordChild = recordChild && !serializedNode.needBlock;
            delete serializedNode.needBlock;
            var shadowRoot = n.shadowRoot;
            if (shadowRoot && isNativeShadowDom(shadowRoot))
                serializedNode.isShadowHost = true;
        }
        if ((serializedNode.type === NodeType.Document ||
            serializedNode.type === NodeType.Element) &&
            recordChild) {
            if (slimDOMOptions.headWhitespace &&
                serializedNode.type === NodeType.Element &&
                serializedNode.tagName === 'head') {
                preserveWhiteSpace = false;
            }
            var bypassOptions = {
                doc: doc,
                mirror: mirror,
                blockClass: blockClass,
                blockSelector: blockSelector,
                maskTextClass: maskTextClass,
                maskTextSelector: maskTextSelector,
                skipChild: skipChild,
                inlineStylesheet: inlineStylesheet,
                maskInputOptions: maskInputOptions,
                maskTextFn: maskTextFn,
                maskInputFn: maskInputFn,
                slimDOMOptions: slimDOMOptions,
                dataURLOptions: dataURLOptions,
                inlineImages: inlineImages,
                recordCanvas: recordCanvas,
                preserveWhiteSpace: preserveWhiteSpace,
                onSerialize: onSerialize,
                onIframeLoad: onIframeLoad,
                iframeLoadTimeout: iframeLoadTimeout,
                onStylesheetLoad: onStylesheetLoad,
                stylesheetLoadTimeout: stylesheetLoadTimeout,
                keepIframeSrcFn: keepIframeSrcFn
            };
            for (var _i = 0, _m = Array.from(n.childNodes); _i < _m.length; _i++) {
                var childN = _m[_i];
                var serializedChildNode = serializeNodeWithId(childN, bypassOptions);
                if (serializedChildNode) {
                    serializedNode.childNodes.push(serializedChildNode);
                }
            }
            if (isElement(n) && n.shadowRoot) {
                for (var _o = 0, _p = Array.from(n.shadowRoot.childNodes); _o < _p.length; _o++) {
                    var childN = _p[_o];
                    var serializedChildNode = serializeNodeWithId(childN, bypassOptions);
                    if (serializedChildNode) {
                        isNativeShadowDom(n.shadowRoot) &&
                            (serializedChildNode.isShadow = true);
                        serializedNode.childNodes.push(serializedChildNode);
                    }
                }
            }
        }
        if (n.parentNode &&
            isShadowRoot(n.parentNode) &&
            isNativeShadowDom(n.parentNode)) {
            serializedNode.isShadow = true;
        }
        if (serializedNode.type === NodeType.Element &&
            serializedNode.tagName === 'iframe') {
            onceIframeLoaded(n, function () {
                var iframeDoc = n.contentDocument;
                if (iframeDoc && onIframeLoad) {
                    var serializedIframeNode = serializeNodeWithId(iframeDoc, {
                        doc: iframeDoc,
                        mirror: mirror,
                        blockClass: blockClass,
                        blockSelector: blockSelector,
                        maskTextClass: maskTextClass,
                        maskTextSelector: maskTextSelector,
                        skipChild: false,
                        inlineStylesheet: inlineStylesheet,
                        maskInputOptions: maskInputOptions,
                        maskTextFn: maskTextFn,
                        maskInputFn: maskInputFn,
                        slimDOMOptions: slimDOMOptions,
                        dataURLOptions: dataURLOptions,
                        inlineImages: inlineImages,
                        recordCanvas: recordCanvas,
                        preserveWhiteSpace: preserveWhiteSpace,
                        onSerialize: onSerialize,
                        onIframeLoad: onIframeLoad,
                        iframeLoadTimeout: iframeLoadTimeout,
                        onStylesheetLoad: onStylesheetLoad,
                        stylesheetLoadTimeout: stylesheetLoadTimeout,
                        keepIframeSrcFn: keepIframeSrcFn
                    });
                    if (serializedIframeNode) {
                        onIframeLoad(n, serializedIframeNode);
                    }
                }
            }, iframeLoadTimeout);
        }
        if (serializedNode.type === NodeType.Element &&
            serializedNode.tagName === 'link' &&
            serializedNode.attributes.rel === 'stylesheet') {
            onceStylesheetLoaded(n, function () {
                if (onStylesheetLoad) {
                    var serializedLinkNode = serializeNodeWithId(n, {
                        doc: doc,
                        mirror: mirror,
                        blockClass: blockClass,
                        blockSelector: blockSelector,
                        maskTextClass: maskTextClass,
                        maskTextSelector: maskTextSelector,
                        skipChild: false,
                        inlineStylesheet: inlineStylesheet,
                        maskInputOptions: maskInputOptions,
                        maskTextFn: maskTextFn,
                        maskInputFn: maskInputFn,
                        slimDOMOptions: slimDOMOptions,
                        dataURLOptions: dataURLOptions,
                        inlineImages: inlineImages,
                        recordCanvas: recordCanvas,
                        preserveWhiteSpace: preserveWhiteSpace,
                        onSerialize: onSerialize,
                        onIframeLoad: onIframeLoad,
                        iframeLoadTimeout: iframeLoadTimeout,
                        onStylesheetLoad: onStylesheetLoad,
                        stylesheetLoadTimeout: stylesheetLoadTimeout,
                        keepIframeSrcFn: keepIframeSrcFn
                    });
                    if (serializedLinkNode) {
                        onStylesheetLoad(n, serializedLinkNode);
                    }
                }
            }, stylesheetLoadTimeout);
        }
        return serializedNode;
    }
    function snapshot(n, options) {
        var _a = options || {}, _b = _a.mirror, mirror = _b === void 0 ? new Mirror() : _b, _c = _a.blockClass, blockClass = _c === void 0 ? 'rr-block' : _c, _d = _a.blockSelector, blockSelector = _d === void 0 ? null : _d, _e = _a.maskTextClass, maskTextClass = _e === void 0 ? 'rr-mask' : _e, _f = _a.maskTextSelector, maskTextSelector = _f === void 0 ? null : _f, _g = _a.inlineStylesheet, inlineStylesheet = _g === void 0 ? true : _g, _h = _a.inlineImages, inlineImages = _h === void 0 ? false : _h, _j = _a.recordCanvas, recordCanvas = _j === void 0 ? false : _j, _k = _a.maskAllInputs, maskAllInputs = _k === void 0 ? false : _k, maskTextFn = _a.maskTextFn, maskInputFn = _a.maskInputFn, _l = _a.slimDOM, slimDOM = _l === void 0 ? false : _l, dataURLOptions = _a.dataURLOptions, preserveWhiteSpace = _a.preserveWhiteSpace, onSerialize = _a.onSerialize, onIframeLoad = _a.onIframeLoad, iframeLoadTimeout = _a.iframeLoadTimeout, onStylesheetLoad = _a.onStylesheetLoad, stylesheetLoadTimeout = _a.stylesheetLoadTimeout, _m = _a.keepIframeSrcFn, keepIframeSrcFn = _m === void 0 ? function () { return false; } : _m;
        var maskInputOptions = maskAllInputs === true
            ? {
                color: true,
                date: true,
                'datetime-local': true,
                email: true,
                month: true,
                number: true,
                range: true,
                search: true,
                tel: true,
                text: true,
                time: true,
                url: true,
                week: true,
                textarea: true,
                select: true,
                password: true
            }
            : maskAllInputs === false
                ? {
                    password: true
                }
                : maskAllInputs;
        var slimDOMOptions = slimDOM === true || slimDOM === 'all'
            ?
                {
                    script: true,
                    comment: true,
                    headFavicon: true,
                    headWhitespace: true,
                    headMetaDescKeywords: slimDOM === 'all',
                    headMetaSocial: true,
                    headMetaRobots: true,
                    headMetaHttpEquiv: true,
                    headMetaAuthorship: true,
                    headMetaVerification: true
                }
            : slimDOM === false
                ? {}
                : slimDOM;
        return serializeNodeWithId(n, {
            doc: n,
            mirror: mirror,
            blockClass: blockClass,
            blockSelector: blockSelector,
            maskTextClass: maskTextClass,
            maskTextSelector: maskTextSelector,
            skipChild: false,
            inlineStylesheet: inlineStylesheet,
            maskInputOptions: maskInputOptions,
            maskTextFn: maskTextFn,
            maskInputFn: maskInputFn,
            slimDOMOptions: slimDOMOptions,
            dataURLOptions: dataURLOptions,
            inlineImages: inlineImages,
            recordCanvas: recordCanvas,
            preserveWhiteSpace: preserveWhiteSpace,
            onSerialize: onSerialize,
            onIframeLoad: onIframeLoad,
            iframeLoadTimeout: iframeLoadTimeout,
            onStylesheetLoad: onStylesheetLoad,
            stylesheetLoadTimeout: stylesheetLoadTimeout,
            keepIframeSrcFn: keepIframeSrcFn,
            newlyAddedElement: false
        });
    }

    function on$1(type, fn, target = document) {
        const options = { capture: true, passive: true };
        target.addEventListener(type, fn, options);
        return () => target.removeEventListener(type, fn, options);
    }
    const DEPARTED_MIRROR_ACCESS_WARNING = 'Please stop import mirror directly. Instead of that,' +
        '\r\n' +
        'now you can use replayer.getMirror() to access the mirror instance of a replayer,' +
        '\r\n' +
        'or you can use record.mirror to access the mirror instance during recording.';
    let _mirror = {
        map: {},
        getId() {
            console.error(DEPARTED_MIRROR_ACCESS_WARNING);
            return -1;
        },
        getNode() {
            console.error(DEPARTED_MIRROR_ACCESS_WARNING);
            return null;
        },
        removeNodeFromMap() {
            console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        },
        has() {
            console.error(DEPARTED_MIRROR_ACCESS_WARNING);
            return false;
        },
        reset() {
            console.error(DEPARTED_MIRROR_ACCESS_WARNING);
        },
    };
    if (typeof window !== 'undefined' && window.Proxy && window.Reflect) {
        _mirror = new Proxy(_mirror, {
            get(target, prop, receiver) {
                if (prop === 'map') {
                    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
                }
                return Reflect.get(target, prop, receiver);
            },
        });
    }
    function throttle(func, wait, options = {}) {
        let timeout = null;
        let previous = 0;
        return function (...args) {
            const now = Date.now();
            if (!previous && options.leading === false) {
                previous = now;
            }
            const remaining = wait - (now - previous);
            const context = this;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                func.apply(context, args);
            }
            else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(() => {
                    previous = options.leading === false ? 0 : Date.now();
                    timeout = null;
                    func.apply(context, args);
                }, remaining);
            }
        };
    }
    function hookSetter(target, key, d, isRevoked, win = window) {
        const original = win.Object.getOwnPropertyDescriptor(target, key);
        win.Object.defineProperty(target, key, isRevoked
            ? d
            : {
                set(value) {
                    setTimeout(() => {
                        d.set.call(this, value);
                    }, 0);
                    if (original && original.set) {
                        original.set.call(this, value);
                    }
                },
            });
        return () => hookSetter(target, key, original || {}, true);
    }
    function patch(source, name, replacement) {
        try {
            if (!(name in source)) {
                return () => {
                };
            }
            const original = source[name];
            const wrapped = replacement(original);
            if (typeof wrapped === 'function') {
                wrapped.prototype = wrapped.prototype || {};
                Object.defineProperties(wrapped, {
                    __rrweb_original__: {
                        enumerable: false,
                        value: original,
                    },
                });
            }
            source[name] = wrapped;
            return () => {
                source[name] = original;
            };
        }
        catch (_a) {
            return () => {
            };
        }
    }
    function getWindowHeight() {
        return (window.innerHeight ||
            (document.documentElement && document.documentElement.clientHeight) ||
            (document.body && document.body.clientHeight));
    }
    function getWindowWidth() {
        return (window.innerWidth ||
            (document.documentElement && document.documentElement.clientWidth) ||
            (document.body && document.body.clientWidth));
    }
    function isBlocked(node, blockClass, blockSelector, checkAncestors) {
        if (!node) {
            return false;
        }
        const el = node.nodeType === node.ELEMENT_NODE
            ? node
            : node.parentElement;
        if (!el)
            return false;
        if (typeof blockClass === 'string') {
            if (el.classList.contains(blockClass))
                return true;
            if (checkAncestors && el.closest('.' + blockClass) !== null)
                return true;
        }
        else {
            if (classMatchesRegex(el, blockClass, checkAncestors))
                return true;
        }
        if (blockSelector) {
            if (node.matches(blockSelector))
                return true;
            if (checkAncestors && el.closest(blockSelector) !== null)
                return true;
        }
        return false;
    }
    function isSerialized(n, mirror) {
        return mirror.getId(n) !== -1;
    }
    function isIgnored(n, mirror) {
        return mirror.getId(n) === IGNORED_NODE;
    }
    function isAncestorRemoved(target, mirror) {
        if (isShadowRoot(target)) {
            return false;
        }
        const id = mirror.getId(target);
        if (!mirror.has(id)) {
            return true;
        }
        if (target.parentNode &&
            target.parentNode.nodeType === target.DOCUMENT_NODE) {
            return false;
        }
        if (!target.parentNode) {
            return true;
        }
        return isAncestorRemoved(target.parentNode, mirror);
    }
    function isTouchEvent(event) {
        return Boolean(event.changedTouches);
    }
    function polyfill(win = window) {
        if ('NodeList' in win && !win.NodeList.prototype.forEach) {
            win.NodeList.prototype.forEach = Array.prototype
                .forEach;
        }
        if ('DOMTokenList' in win && !win.DOMTokenList.prototype.forEach) {
            win.DOMTokenList.prototype.forEach = Array.prototype
                .forEach;
        }
        if (!Node.prototype.contains) {
            Node.prototype.contains = (...args) => {
                let node = args[0];
                if (!(0 in args)) {
                    throw new TypeError('1 argument is required');
                }
                do {
                    if (this === node) {
                        return true;
                    }
                } while ((node = node && node.parentNode));
                return false;
            };
        }
    }
    function isSerializedIframe(n, mirror) {
        return Boolean(n.nodeName === 'IFRAME' && mirror.getMeta(n));
    }
    function isSerializedStylesheet(n, mirror) {
        return Boolean(n.nodeName === 'LINK' &&
            n.nodeType === n.ELEMENT_NODE &&
            n.getAttribute &&
            n.getAttribute('rel') === 'stylesheet' &&
            mirror.getMeta(n));
    }
    function hasShadowRoot(n) {
        return Boolean(n === null || n === void 0 ? void 0 : n.shadowRoot);
    }
    class StyleSheetMirror {
        constructor() {
            this.id = 1;
            this.styleIDMap = new WeakMap();
            this.idStyleMap = new Map();
        }
        getId(stylesheet) {
            var _a;
            return (_a = this.styleIDMap.get(stylesheet)) !== null && _a !== void 0 ? _a : -1;
        }
        has(stylesheet) {
            return this.styleIDMap.has(stylesheet);
        }
        add(stylesheet, id) {
            if (this.has(stylesheet))
                return this.getId(stylesheet);
            let newId;
            if (id === undefined) {
                newId = this.id++;
            }
            else
                newId = id;
            this.styleIDMap.set(stylesheet, newId);
            this.idStyleMap.set(newId, stylesheet);
            return newId;
        }
        getStyle(id) {
            return this.idStyleMap.get(id) || null;
        }
        reset() {
            this.styleIDMap = new WeakMap();
            this.idStyleMap = new Map();
            this.id = 1;
        }
        generateId() {
            return this.id++;
        }
    }

    var EventType = /* @__PURE__ */ ((EventType2) => {
      EventType2[EventType2["DomContentLoaded"] = 0] = "DomContentLoaded";
      EventType2[EventType2["Load"] = 1] = "Load";
      EventType2[EventType2["FullSnapshot"] = 2] = "FullSnapshot";
      EventType2[EventType2["IncrementalSnapshot"] = 3] = "IncrementalSnapshot";
      EventType2[EventType2["Meta"] = 4] = "Meta";
      EventType2[EventType2["Custom"] = 5] = "Custom";
      EventType2[EventType2["Plugin"] = 6] = "Plugin";
      return EventType2;
    })(EventType || {});
    var IncrementalSource = /* @__PURE__ */ ((IncrementalSource2) => {
      IncrementalSource2[IncrementalSource2["Mutation"] = 0] = "Mutation";
      IncrementalSource2[IncrementalSource2["MouseMove"] = 1] = "MouseMove";
      IncrementalSource2[IncrementalSource2["MouseInteraction"] = 2] = "MouseInteraction";
      IncrementalSource2[IncrementalSource2["Scroll"] = 3] = "Scroll";
      IncrementalSource2[IncrementalSource2["ViewportResize"] = 4] = "ViewportResize";
      IncrementalSource2[IncrementalSource2["Input"] = 5] = "Input";
      IncrementalSource2[IncrementalSource2["TouchMove"] = 6] = "TouchMove";
      IncrementalSource2[IncrementalSource2["MediaInteraction"] = 7] = "MediaInteraction";
      IncrementalSource2[IncrementalSource2["StyleSheetRule"] = 8] = "StyleSheetRule";
      IncrementalSource2[IncrementalSource2["CanvasMutation"] = 9] = "CanvasMutation";
      IncrementalSource2[IncrementalSource2["Font"] = 10] = "Font";
      IncrementalSource2[IncrementalSource2["Log"] = 11] = "Log";
      IncrementalSource2[IncrementalSource2["Drag"] = 12] = "Drag";
      IncrementalSource2[IncrementalSource2["StyleDeclaration"] = 13] = "StyleDeclaration";
      IncrementalSource2[IncrementalSource2["Selection"] = 14] = "Selection";
      IncrementalSource2[IncrementalSource2["AdoptedStyleSheet"] = 15] = "AdoptedStyleSheet";
      return IncrementalSource2;
    })(IncrementalSource || {});
    var MouseInteractions = /* @__PURE__ */ ((MouseInteractions2) => {
      MouseInteractions2[MouseInteractions2["MouseUp"] = 0] = "MouseUp";
      MouseInteractions2[MouseInteractions2["MouseDown"] = 1] = "MouseDown";
      MouseInteractions2[MouseInteractions2["Click"] = 2] = "Click";
      MouseInteractions2[MouseInteractions2["ContextMenu"] = 3] = "ContextMenu";
      MouseInteractions2[MouseInteractions2["DblClick"] = 4] = "DblClick";
      MouseInteractions2[MouseInteractions2["Focus"] = 5] = "Focus";
      MouseInteractions2[MouseInteractions2["Blur"] = 6] = "Blur";
      MouseInteractions2[MouseInteractions2["TouchStart"] = 7] = "TouchStart";
      MouseInteractions2[MouseInteractions2["TouchMove_Departed"] = 8] = "TouchMove_Departed";
      MouseInteractions2[MouseInteractions2["TouchEnd"] = 9] = "TouchEnd";
      MouseInteractions2[MouseInteractions2["TouchCancel"] = 10] = "TouchCancel";
      return MouseInteractions2;
    })(MouseInteractions || {});
    var CanvasContext = /* @__PURE__ */ ((CanvasContext2) => {
      CanvasContext2[CanvasContext2["2D"] = 0] = "2D";
      CanvasContext2[CanvasContext2["WebGL"] = 1] = "WebGL";
      CanvasContext2[CanvasContext2["WebGL2"] = 2] = "WebGL2";
      return CanvasContext2;
    })(CanvasContext || {});

    function isNodeInLinkedList(n) {
        return '__ln' in n;
    }
    class DoubleLinkedList {
        constructor() {
            this.length = 0;
            this.head = null;
        }
        get(position) {
            if (position >= this.length) {
                throw new Error('Position outside of list range');
            }
            let current = this.head;
            for (let index = 0; index < position; index++) {
                current = (current === null || current === void 0 ? void 0 : current.next) || null;
            }
            return current;
        }
        addNode(n) {
            const node = {
                value: n,
                previous: null,
                next: null,
            };
            n.__ln = node;
            if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
                const current = n.previousSibling.__ln.next;
                node.next = current;
                node.previous = n.previousSibling.__ln;
                n.previousSibling.__ln.next = node;
                if (current) {
                    current.previous = node;
                }
            }
            else if (n.nextSibling &&
                isNodeInLinkedList(n.nextSibling) &&
                n.nextSibling.__ln.previous) {
                const current = n.nextSibling.__ln.previous;
                node.previous = current;
                node.next = n.nextSibling.__ln;
                n.nextSibling.__ln.previous = node;
                if (current) {
                    current.next = node;
                }
            }
            else {
                if (this.head) {
                    this.head.previous = node;
                }
                node.next = this.head;
                this.head = node;
            }
            this.length++;
        }
        removeNode(n) {
            const current = n.__ln;
            if (!this.head) {
                return;
            }
            if (!current.previous) {
                this.head = current.next;
                if (this.head) {
                    this.head.previous = null;
                }
            }
            else {
                current.previous.next = current.next;
                if (current.next) {
                    current.next.previous = current.previous;
                }
            }
            if (n.__ln) {
                delete n.__ln;
            }
            this.length--;
        }
    }
    const moveKey = (id, parentId) => `${id}@${parentId}`;
    class MutationBuffer {
        constructor() {
            this.frozen = false;
            this.locked = false;
            this.texts = [];
            this.attributes = [];
            this.removes = [];
            this.mapRemoves = [];
            this.movedMap = {};
            this.addedSet = new Set();
            this.movedSet = new Set();
            this.droppedSet = new Set();
            this.processMutations = (mutations) => {
                mutations.forEach(this.processMutation);
                this.emit();
            };
            this.emit = () => {
                if (this.frozen || this.locked) {
                    return;
                }
                const adds = [];
                const addList = new DoubleLinkedList();
                const getNextId = (n) => {
                    let ns = n;
                    let nextId = IGNORED_NODE;
                    while (nextId === IGNORED_NODE) {
                        ns = ns && ns.nextSibling;
                        nextId = ns && this.mirror.getId(ns);
                    }
                    return nextId;
                };
                const pushAdd = (n) => {
                    var _a, _b, _c, _d;
                    let shadowHost = null;
                    if (((_b = (_a = n.getRootNode) === null || _a === void 0 ? void 0 : _a.call(n)) === null || _b === void 0 ? void 0 : _b.nodeType) === Node.DOCUMENT_FRAGMENT_NODE &&
                        n.getRootNode().host)
                        shadowHost = n.getRootNode().host;
                    let rootShadowHost = shadowHost;
                    while (((_d = (_c = rootShadowHost === null || rootShadowHost === void 0 ? void 0 : rootShadowHost.getRootNode) === null || _c === void 0 ? void 0 : _c.call(rootShadowHost)) === null || _d === void 0 ? void 0 : _d.nodeType) ===
                        Node.DOCUMENT_FRAGMENT_NODE &&
                        rootShadowHost.getRootNode().host)
                        rootShadowHost = rootShadowHost.getRootNode().host;
                    const notInDoc = !this.doc.contains(n) &&
                        (!rootShadowHost || !this.doc.contains(rootShadowHost));
                    if (!n.parentNode || notInDoc) {
                        return;
                    }
                    const parentId = isShadowRoot(n.parentNode)
                        ? this.mirror.getId(shadowHost)
                        : this.mirror.getId(n.parentNode);
                    const nextId = getNextId(n);
                    if (parentId === -1 || nextId === -1) {
                        return addList.addNode(n);
                    }
                    const sn = serializeNodeWithId(n, {
                        doc: this.doc,
                        mirror: this.mirror,
                        blockClass: this.blockClass,
                        blockSelector: this.blockSelector,
                        maskTextClass: this.maskTextClass,
                        maskTextSelector: this.maskTextSelector,
                        skipChild: true,
                        newlyAddedElement: true,
                        inlineStylesheet: this.inlineStylesheet,
                        maskInputOptions: this.maskInputOptions,
                        maskTextFn: this.maskTextFn,
                        maskInputFn: this.maskInputFn,
                        slimDOMOptions: this.slimDOMOptions,
                        dataURLOptions: this.dataURLOptions,
                        recordCanvas: this.recordCanvas,
                        inlineImages: this.inlineImages,
                        onSerialize: (currentN) => {
                            if (isSerializedIframe(currentN, this.mirror)) {
                                this.iframeManager.addIframe(currentN);
                            }
                            if (isSerializedStylesheet(currentN, this.mirror)) {
                                this.stylesheetManager.trackLinkElement(currentN);
                            }
                            if (hasShadowRoot(n)) {
                                this.shadowDomManager.addShadowRoot(n.shadowRoot, this.doc);
                            }
                        },
                        onIframeLoad: (iframe, childSn) => {
                            this.iframeManager.attachIframe(iframe, childSn);
                            this.shadowDomManager.observeAttachShadow(iframe);
                        },
                        onStylesheetLoad: (link, childSn) => {
                            this.stylesheetManager.attachLinkElement(link, childSn);
                        },
                    });
                    if (sn) {
                        adds.push({
                            parentId,
                            nextId,
                            node: sn,
                        });
                    }
                };
                while (this.mapRemoves.length) {
                    this.mirror.removeNodeFromMap(this.mapRemoves.shift());
                }
                for (const n of Array.from(this.movedSet.values())) {
                    if (isParentRemoved(this.removes, n, this.mirror) &&
                        !this.movedSet.has(n.parentNode)) {
                        continue;
                    }
                    pushAdd(n);
                }
                for (const n of Array.from(this.addedSet.values())) {
                    if (!isAncestorInSet(this.droppedSet, n) &&
                        !isParentRemoved(this.removes, n, this.mirror)) {
                        pushAdd(n);
                    }
                    else if (isAncestorInSet(this.movedSet, n)) {
                        pushAdd(n);
                    }
                    else {
                        this.droppedSet.add(n);
                    }
                }
                let candidate = null;
                while (addList.length) {
                    let node = null;
                    if (candidate) {
                        const parentId = this.mirror.getId(candidate.value.parentNode);
                        const nextId = getNextId(candidate.value);
                        if (parentId !== -1 && nextId !== -1) {
                            node = candidate;
                        }
                    }
                    if (!node) {
                        for (let index = addList.length - 1; index >= 0; index--) {
                            const _node = addList.get(index);
                            if (_node) {
                                const parentId = this.mirror.getId(_node.value.parentNode);
                                const nextId = getNextId(_node.value);
                                if (nextId === -1)
                                    continue;
                                else if (parentId !== -1) {
                                    node = _node;
                                    break;
                                }
                                else {
                                    const unhandledNode = _node.value;
                                    if (unhandledNode.parentNode &&
                                        unhandledNode.parentNode.nodeType ===
                                            Node.DOCUMENT_FRAGMENT_NODE) {
                                        const shadowHost = unhandledNode.parentNode
                                            .host;
                                        const parentId = this.mirror.getId(shadowHost);
                                        if (parentId !== -1) {
                                            node = _node;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (!node) {
                        while (addList.head) {
                            addList.removeNode(addList.head.value);
                        }
                        break;
                    }
                    candidate = node.previous;
                    addList.removeNode(node.value);
                    pushAdd(node.value);
                }
                const payload = {
                    texts: this.texts
                        .map((text) => ({
                        id: this.mirror.getId(text.node),
                        value: text.value,
                    }))
                        .filter((text) => this.mirror.has(text.id)),
                    attributes: this.attributes
                        .map((attribute) => ({
                        id: this.mirror.getId(attribute.node),
                        attributes: attribute.attributes,
                    }))
                        .filter((attribute) => this.mirror.has(attribute.id)),
                    removes: this.removes,
                    adds,
                };
                if (!payload.texts.length &&
                    !payload.attributes.length &&
                    !payload.removes.length &&
                    !payload.adds.length) {
                    return;
                }
                this.texts = [];
                this.attributes = [];
                this.removes = [];
                this.addedSet = new Set();
                this.movedSet = new Set();
                this.droppedSet = new Set();
                this.movedMap = {};
                this.mutationCb(payload);
            };
            this.processMutation = (m) => {
                if (isIgnored(m.target, this.mirror)) {
                    return;
                }
                switch (m.type) {
                    case 'characterData': {
                        const value = m.target.textContent;
                        if (!isBlocked(m.target, this.blockClass, this.blockSelector, false) &&
                            value !== m.oldValue) {
                            this.texts.push({
                                value: needMaskingText(m.target, this.maskTextClass, this.maskTextSelector) && value
                                    ? this.maskTextFn
                                        ? this.maskTextFn(value)
                                        : value.replace(/[\S]/g, '*')
                                    : value,
                                node: m.target,
                            });
                        }
                        break;
                    }
                    case 'attributes': {
                        const target = m.target;
                        let value = m.target.getAttribute(m.attributeName);
                        if (m.attributeName === 'value') {
                            value = maskInputValue({
                                maskInputOptions: this.maskInputOptions,
                                tagName: m.target.tagName,
                                type: m.target.getAttribute('type'),
                                value,
                                maskInputFn: this.maskInputFn,
                            });
                        }
                        if (isBlocked(m.target, this.blockClass, this.blockSelector, false) ||
                            value === m.oldValue) {
                            return;
                        }
                        let item = this.attributes.find((a) => a.node === m.target);
                        if (target.tagName === 'IFRAME' &&
                            m.attributeName === 'src' &&
                            !this.keepIframeSrcFn(value)) {
                            if (!target.contentDocument) {
                                m.attributeName = 'rr_src';
                            }
                            else {
                                return;
                            }
                        }
                        if (!item) {
                            item = {
                                node: m.target,
                                attributes: {},
                            };
                            this.attributes.push(item);
                        }
                        if (m.attributeName === 'style') {
                            const old = this.doc.createElement('span');
                            if (m.oldValue) {
                                old.setAttribute('style', m.oldValue);
                            }
                            if (item.attributes.style === undefined ||
                                item.attributes.style === null) {
                                item.attributes.style = {};
                            }
                            const styleObj = item.attributes.style;
                            for (const pname of Array.from(target.style)) {
                                const newValue = target.style.getPropertyValue(pname);
                                const newPriority = target.style.getPropertyPriority(pname);
                                if (newValue !== old.style.getPropertyValue(pname) ||
                                    newPriority !== old.style.getPropertyPriority(pname)) {
                                    if (newPriority === '') {
                                        styleObj[pname] = newValue;
                                    }
                                    else {
                                        styleObj[pname] = [newValue, newPriority];
                                    }
                                }
                            }
                            for (const pname of Array.from(old.style)) {
                                if (target.style.getPropertyValue(pname) === '') {
                                    styleObj[pname] = false;
                                }
                            }
                        }
                        else {
                            item.attributes[m.attributeName] = transformAttribute(this.doc, target.tagName, m.attributeName, value);
                        }
                        break;
                    }
                    case 'childList': {
                        if (isBlocked(m.target, this.blockClass, this.blockSelector, true))
                            return;
                        m.addedNodes.forEach((n) => this.genAdds(n, m.target));
                        m.removedNodes.forEach((n) => {
                            const nodeId = this.mirror.getId(n);
                            const parentId = isShadowRoot(m.target)
                                ? this.mirror.getId(m.target.host)
                                : this.mirror.getId(m.target);
                            if (isBlocked(m.target, this.blockClass, this.blockSelector, false) ||
                                isIgnored(n, this.mirror) ||
                                !isSerialized(n, this.mirror)) {
                                return;
                            }
                            if (this.addedSet.has(n)) {
                                deepDelete(this.addedSet, n);
                                this.droppedSet.add(n);
                            }
                            else if (this.addedSet.has(m.target) && nodeId === -1) ;
                            else if (isAncestorRemoved(m.target, this.mirror)) ;
                            else if (this.movedSet.has(n) &&
                                this.movedMap[moveKey(nodeId, parentId)]) {
                                deepDelete(this.movedSet, n);
                            }
                            else {
                                this.removes.push({
                                    parentId,
                                    id: nodeId,
                                    isShadow: isShadowRoot(m.target) && isNativeShadowDom(m.target)
                                        ? true
                                        : undefined,
                                });
                            }
                            this.mapRemoves.push(n);
                        });
                        break;
                    }
                }
            };
            this.genAdds = (n, target) => {
                if (this.mirror.hasNode(n)) {
                    if (isIgnored(n, this.mirror)) {
                        return;
                    }
                    this.movedSet.add(n);
                    let targetId = null;
                    if (target && this.mirror.hasNode(target)) {
                        targetId = this.mirror.getId(target);
                    }
                    if (targetId && targetId !== -1) {
                        this.movedMap[moveKey(this.mirror.getId(n), targetId)] = true;
                    }
                }
                else {
                    this.addedSet.add(n);
                    this.droppedSet.delete(n);
                }
                if (!isBlocked(n, this.blockClass, this.blockSelector, false))
                    n.childNodes.forEach((childN) => this.genAdds(childN));
            };
        }
        init(options) {
            [
                'mutationCb',
                'blockClass',
                'blockSelector',
                'maskTextClass',
                'maskTextSelector',
                'inlineStylesheet',
                'maskInputOptions',
                'maskTextFn',
                'maskInputFn',
                'keepIframeSrcFn',
                'recordCanvas',
                'inlineImages',
                'slimDOMOptions',
                'dataURLOptions',
                'doc',
                'mirror',
                'iframeManager',
                'stylesheetManager',
                'shadowDomManager',
                'canvasManager',
            ].forEach((key) => {
                this[key] = options[key];
            });
        }
        freeze() {
            this.frozen = true;
            this.canvasManager.freeze();
        }
        unfreeze() {
            this.frozen = false;
            this.canvasManager.unfreeze();
            this.emit();
        }
        isFrozen() {
            return this.frozen;
        }
        lock() {
            this.locked = true;
            this.canvasManager.lock();
        }
        unlock() {
            this.locked = false;
            this.canvasManager.unlock();
            this.emit();
        }
        reset() {
            this.shadowDomManager.reset();
            this.canvasManager.reset();
        }
    }
    function deepDelete(addsSet, n) {
        addsSet.delete(n);
        n.childNodes.forEach((childN) => deepDelete(addsSet, childN));
    }
    function isParentRemoved(removes, n, mirror) {
        if (removes.length === 0)
            return false;
        return _isParentRemoved(removes, n, mirror);
    }
    function _isParentRemoved(removes, n, mirror) {
        const { parentNode } = n;
        if (!parentNode) {
            return false;
        }
        const parentId = mirror.getId(parentNode);
        if (removes.some((r) => r.id === parentId)) {
            return true;
        }
        return _isParentRemoved(removes, parentNode, mirror);
    }
    function isAncestorInSet(set, n) {
        if (set.size === 0)
            return false;
        return _isAncestorInSet(set, n);
    }
    function _isAncestorInSet(set, n) {
        const { parentNode } = n;
        if (!parentNode) {
            return false;
        }
        if (set.has(parentNode)) {
            return true;
        }
        return _isAncestorInSet(set, parentNode);
    }

    const mutationBuffers = [];
    const isCSSGroupingRuleSupported = typeof CSSGroupingRule !== 'undefined';
    const isCSSMediaRuleSupported = typeof CSSMediaRule !== 'undefined';
    const isCSSSupportsRuleSupported = typeof CSSSupportsRule !== 'undefined';
    const isCSSConditionRuleSupported = typeof CSSConditionRule !== 'undefined';
    function getEventTarget(event) {
        try {
            if ('composedPath' in event) {
                const path = event.composedPath();
                if (path.length) {
                    return path[0];
                }
            }
            else if ('path' in event && event.path.length) {
                return event.path[0];
            }
            return event.target;
        }
        catch (_a) {
            return event.target;
        }
    }
    function initMutationObserver(options, rootEl) {
        var _a, _b;
        const mutationBuffer = new MutationBuffer();
        mutationBuffers.push(mutationBuffer);
        mutationBuffer.init(options);
        let mutationObserverCtor = window.MutationObserver ||
            window.__rrMutationObserver;
        const angularZoneSymbol = (_b = (_a = window === null || window === void 0 ? void 0 : window.Zone) === null || _a === void 0 ? void 0 : _a.__symbol__) === null || _b === void 0 ? void 0 : _b.call(_a, 'MutationObserver');
        if (angularZoneSymbol &&
            window[angularZoneSymbol]) {
            mutationObserverCtor = window[angularZoneSymbol];
        }
        const observer = new mutationObserverCtor(mutationBuffer.processMutations.bind(mutationBuffer));
        observer.observe(rootEl, {
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
            childList: true,
            subtree: true,
        });
        return observer;
    }
    function initMoveObserver({ mousemoveCb, sampling, doc, mirror, }) {
        if (sampling.mousemove === false) {
            return () => {
            };
        }
        const threshold = typeof sampling.mousemove === 'number' ? sampling.mousemove : 50;
        const callbackThreshold = typeof sampling.mousemoveCallback === 'number'
            ? sampling.mousemoveCallback
            : 500;
        let positions = [];
        let timeBaseline;
        const wrappedCb = throttle((source) => {
            const totalOffset = Date.now() - timeBaseline;
            mousemoveCb(positions.map((p) => {
                p.timeOffset -= totalOffset;
                return p;
            }), source);
            positions = [];
            timeBaseline = null;
        }, callbackThreshold);
        const updatePosition = throttle((evt) => {
            const target = getEventTarget(evt);
            const { clientX, clientY } = isTouchEvent(evt)
                ? evt.changedTouches[0]
                : evt;
            if (!timeBaseline) {
                timeBaseline = Date.now();
            }
            positions.push({
                x: clientX,
                y: clientY,
                id: mirror.getId(target),
                timeOffset: Date.now() - timeBaseline,
            });
            wrappedCb(typeof DragEvent !== 'undefined' && evt instanceof DragEvent
                ? IncrementalSource.Drag
                : evt instanceof MouseEvent
                    ? IncrementalSource.MouseMove
                    : IncrementalSource.TouchMove);
        }, threshold, {
            trailing: false,
        });
        const handlers = [
            on$1('mousemove', updatePosition, doc),
            on$1('touchmove', updatePosition, doc),
            on$1('drag', updatePosition, doc),
        ];
        return () => {
            handlers.forEach((h) => h());
        };
    }
    function initMouseInteractionObserver({ mouseInteractionCb, doc, mirror, blockClass, blockSelector, sampling, }) {
        if (sampling.mouseInteraction === false) {
            return () => {
            };
        }
        const disableMap = sampling.mouseInteraction === true ||
            sampling.mouseInteraction === undefined
            ? {}
            : sampling.mouseInteraction;
        const handlers = [];
        const getHandler = (eventKey) => {
            return (event) => {
                const target = getEventTarget(event);
                if (isBlocked(target, blockClass, blockSelector, true)) {
                    return;
                }
                const e = isTouchEvent(event) ? event.changedTouches[0] : event;
                if (!e) {
                    return;
                }
                const id = mirror.getId(target);
                const { clientX, clientY } = e;
                mouseInteractionCb({
                    type: MouseInteractions[eventKey],
                    id,
                    x: clientX,
                    y: clientY,
                });
            };
        };
        Object.keys(MouseInteractions)
            .filter((key) => Number.isNaN(Number(key)) &&
            !key.endsWith('_Departed') &&
            disableMap[key] !== false)
            .forEach((eventKey) => {
            const eventName = eventKey.toLowerCase();
            const handler = getHandler(eventKey);
            handlers.push(on$1(eventName, handler, doc));
        });
        return () => {
            handlers.forEach((h) => h());
        };
    }
    function initScrollObserver({ scrollCb, doc, mirror, blockClass, blockSelector, sampling, }) {
        const updatePosition = throttle((evt) => {
            const target = getEventTarget(evt);
            if (!target || isBlocked(target, blockClass, blockSelector, true)) {
                return;
            }
            const id = mirror.getId(target);
            if (target === doc) {
                const scrollEl = (doc.scrollingElement || doc.documentElement);
                scrollCb({
                    id,
                    x: scrollEl.scrollLeft,
                    y: scrollEl.scrollTop,
                });
            }
            else {
                scrollCb({
                    id,
                    x: target.scrollLeft,
                    y: target.scrollTop,
                });
            }
        }, sampling.scroll || 100);
        return on$1('scroll', updatePosition, doc);
    }
    function initViewportResizeObserver({ viewportResizeCb, }) {
        let lastH = -1;
        let lastW = -1;
        const updateDimension = throttle(() => {
            const height = getWindowHeight();
            const width = getWindowWidth();
            if (lastH !== height || lastW !== width) {
                viewportResizeCb({
                    width: Number(width),
                    height: Number(height),
                });
                lastH = height;
                lastW = width;
            }
        }, 200);
        return on$1('resize', updateDimension, window);
    }
    function wrapEventWithUserTriggeredFlag(v, enable) {
        const value = Object.assign({}, v);
        if (!enable)
            delete value.userTriggered;
        return value;
    }
    const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
    const lastInputValueMap = new WeakMap();
    function initInputObserver({ inputCb, doc, mirror, blockClass, blockSelector, ignoreClass, maskInputOptions, maskInputFn, sampling, userTriggeredOnInput, }) {
        function eventHandler(event) {
            let target = getEventTarget(event);
            const userTriggered = event.isTrusted;
            if (target && target.tagName === 'OPTION')
                target = target.parentElement;
            if (!target ||
                !target.tagName ||
                INPUT_TAGS.indexOf(target.tagName) < 0 ||
                isBlocked(target, blockClass, blockSelector, true)) {
                return;
            }
            const type = target.type;
            if (target.classList.contains(ignoreClass)) {
                return;
            }
            let text = target.value;
            let isChecked = false;
            if (type === 'radio' || type === 'checkbox') {
                isChecked = target.checked;
            }
            else if (maskInputOptions[target.tagName.toLowerCase()] ||
                maskInputOptions[type]) {
                text = maskInputValue({
                    maskInputOptions,
                    tagName: target.tagName,
                    type,
                    value: text,
                    maskInputFn,
                });
            }
            cbWithDedup(target, wrapEventWithUserTriggeredFlag({ text, isChecked, userTriggered }, userTriggeredOnInput));
            const name = target.name;
            if (type === 'radio' && name && isChecked) {
                doc
                    .querySelectorAll(`input[type="radio"][name="${name}"]`)
                    .forEach((el) => {
                    if (el !== target) {
                        cbWithDedup(el, wrapEventWithUserTriggeredFlag({
                            text: el.value,
                            isChecked: !isChecked,
                            userTriggered: false,
                        }, userTriggeredOnInput));
                    }
                });
            }
        }
        function cbWithDedup(target, v) {
            const lastInputValue = lastInputValueMap.get(target);
            if (!lastInputValue ||
                lastInputValue.text !== v.text ||
                lastInputValue.isChecked !== v.isChecked) {
                lastInputValueMap.set(target, v);
                const id = mirror.getId(target);
                inputCb(Object.assign(Object.assign({}, v), { id }));
            }
        }
        const events = sampling.input === 'last' ? ['change'] : ['input', 'change'];
        const handlers = events.map((eventName) => on$1(eventName, eventHandler, doc));
        const currentWindow = doc.defaultView;
        if (!currentWindow) {
            return () => {
                handlers.forEach((h) => h());
            };
        }
        const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(currentWindow.HTMLInputElement.prototype, 'value');
        const hookProperties = [
            [currentWindow.HTMLInputElement.prototype, 'value'],
            [currentWindow.HTMLInputElement.prototype, 'checked'],
            [currentWindow.HTMLSelectElement.prototype, 'value'],
            [currentWindow.HTMLTextAreaElement.prototype, 'value'],
            [currentWindow.HTMLSelectElement.prototype, 'selectedIndex'],
            [currentWindow.HTMLOptionElement.prototype, 'selected'],
        ];
        if (propertyDescriptor && propertyDescriptor.set) {
            handlers.push(...hookProperties.map((p) => hookSetter(p[0], p[1], {
                set() {
                    eventHandler({ target: this });
                },
            }, false, currentWindow)));
        }
        return () => {
            handlers.forEach((h) => h());
        };
    }
    function getNestedCSSRulePositions(rule) {
        const positions = [];
        function recurse(childRule, pos) {
            if ((isCSSGroupingRuleSupported &&
                childRule.parentRule instanceof CSSGroupingRule) ||
                (isCSSMediaRuleSupported &&
                    childRule.parentRule instanceof CSSMediaRule) ||
                (isCSSSupportsRuleSupported &&
                    childRule.parentRule instanceof CSSSupportsRule) ||
                (isCSSConditionRuleSupported &&
                    childRule.parentRule instanceof CSSConditionRule)) {
                const rules = Array.from(childRule.parentRule.cssRules);
                const index = rules.indexOf(childRule);
                pos.unshift(index);
            }
            else if (childRule.parentStyleSheet) {
                const rules = Array.from(childRule.parentStyleSheet.cssRules);
                const index = rules.indexOf(childRule);
                pos.unshift(index);
            }
            return pos;
        }
        return recurse(rule, positions);
    }
    function getIdAndStyleId(sheet, mirror, styleMirror) {
        let id, styleId;
        if (!sheet)
            return {};
        if (sheet.ownerNode)
            id = mirror.getId(sheet.ownerNode);
        else
            styleId = styleMirror.getId(sheet);
        return {
            styleId,
            id,
        };
    }
    function initStyleSheetObserver({ styleSheetRuleCb, mirror, stylesheetManager }, { win }) {
        const insertRule = win.CSSStyleSheet.prototype.insertRule;
        win.CSSStyleSheet.prototype.insertRule = function (rule, index) {
            const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleSheetRuleCb({
                    id,
                    styleId,
                    adds: [{ rule, index }],
                });
            }
            return insertRule.apply(this, [rule, index]);
        };
        const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
        win.CSSStyleSheet.prototype.deleteRule = function (index) {
            const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleSheetRuleCb({
                    id,
                    styleId,
                    removes: [{ index }],
                });
            }
            return deleteRule.apply(this, [index]);
        };
        let replace;
        if (win.CSSStyleSheet.prototype.replace) {
            replace = win.CSSStyleSheet.prototype.replace;
            win.CSSStyleSheet.prototype.replace = function (text) {
                const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        replace: text,
                    });
                }
                return replace.apply(this, [text]);
            };
        }
        let replaceSync;
        if (win.CSSStyleSheet.prototype.replaceSync) {
            replaceSync = win.CSSStyleSheet.prototype.replaceSync;
            win.CSSStyleSheet.prototype.replaceSync = function (text) {
                const { id, styleId } = getIdAndStyleId(this, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        replaceSync: text,
                    });
                }
                return replaceSync.apply(this, [text]);
            };
        }
        const supportedNestedCSSRuleTypes = {};
        if (isCSSGroupingRuleSupported) {
            supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
        }
        else {
            if (isCSSMediaRuleSupported) {
                supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
            }
            if (isCSSConditionRuleSupported) {
                supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
            }
            if (isCSSSupportsRuleSupported) {
                supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
            }
        }
        const unmodifiedFunctions = {};
        Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
            unmodifiedFunctions[typeKey] = {
                insertRule: type.prototype.insertRule,
                deleteRule: type.prototype.deleteRule,
            };
            type.prototype.insertRule = function (rule, index) {
                const { id, styleId } = getIdAndStyleId(this.parentStyleSheet, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        adds: [
                            {
                                rule,
                                index: [
                                    ...getNestedCSSRulePositions(this),
                                    index || 0,
                                ],
                            },
                        ],
                    });
                }
                return unmodifiedFunctions[typeKey].insertRule.apply(this, [rule, index]);
            };
            type.prototype.deleteRule = function (index) {
                const { id, styleId } = getIdAndStyleId(this.parentStyleSheet, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        removes: [
                            { index: [...getNestedCSSRulePositions(this), index] },
                        ],
                    });
                }
                return unmodifiedFunctions[typeKey].deleteRule.apply(this, [index]);
            };
        });
        return () => {
            win.CSSStyleSheet.prototype.insertRule = insertRule;
            win.CSSStyleSheet.prototype.deleteRule = deleteRule;
            replace && (win.CSSStyleSheet.prototype.replace = replace);
            replaceSync && (win.CSSStyleSheet.prototype.replaceSync = replaceSync);
            Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
                type.prototype.insertRule = unmodifiedFunctions[typeKey].insertRule;
                type.prototype.deleteRule = unmodifiedFunctions[typeKey].deleteRule;
            });
        };
    }
    function initAdoptedStyleSheetObserver({ mirror, stylesheetManager, }, host) {
        var _a, _b, _c;
        let hostId = null;
        if (host.nodeName === '#document')
            hostId = mirror.getId(host);
        else
            hostId = mirror.getId(host.host);
        const patchTarget = host.nodeName === '#document'
            ? (_a = host.defaultView) === null || _a === void 0 ? void 0 : _a.Document
            : (_c = (_b = host.ownerDocument) === null || _b === void 0 ? void 0 : _b.defaultView) === null || _c === void 0 ? void 0 : _c.ShadowRoot;
        const originalPropertyDescriptor = Object.getOwnPropertyDescriptor(patchTarget === null || patchTarget === void 0 ? void 0 : patchTarget.prototype, 'adoptedStyleSheets');
        if (hostId === null ||
            hostId === -1 ||
            !patchTarget ||
            !originalPropertyDescriptor)
            return () => {
            };
        Object.defineProperty(host, 'adoptedStyleSheets', {
            configurable: originalPropertyDescriptor.configurable,
            enumerable: originalPropertyDescriptor.enumerable,
            get() {
                var _a;
                return (_a = originalPropertyDescriptor.get) === null || _a === void 0 ? void 0 : _a.call(this);
            },
            set(sheets) {
                var _a;
                const result = (_a = originalPropertyDescriptor.set) === null || _a === void 0 ? void 0 : _a.call(this, sheets);
                if (hostId !== null && hostId !== -1) {
                    try {
                        stylesheetManager.adoptStyleSheets(sheets, hostId);
                    }
                    catch (e) {
                    }
                }
                return result;
            },
        });
        return () => {
            Object.defineProperty(host, 'adoptedStyleSheets', {
                configurable: originalPropertyDescriptor.configurable,
                enumerable: originalPropertyDescriptor.enumerable,
                get: originalPropertyDescriptor.get,
                set: originalPropertyDescriptor.set,
            });
        };
    }
    function initStyleDeclarationObserver({ styleDeclarationCb, mirror, ignoreCSSAttributes, stylesheetManager, }, { win }) {
        const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
        win.CSSStyleDeclaration.prototype.setProperty = function (property, value, priority) {
            var _a;
            if (ignoreCSSAttributes.has(property)) {
                return setProperty.apply(this, [property, value, priority]);
            }
            const { id, styleId } = getIdAndStyleId((_a = this.parentRule) === null || _a === void 0 ? void 0 : _a.parentStyleSheet, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleDeclarationCb({
                    id,
                    styleId,
                    set: {
                        property,
                        value,
                        priority,
                    },
                    index: getNestedCSSRulePositions(this.parentRule),
                });
            }
            return setProperty.apply(this, [property, value, priority]);
        };
        const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
        win.CSSStyleDeclaration.prototype.removeProperty = function (property) {
            var _a;
            if (ignoreCSSAttributes.has(property)) {
                return removeProperty.apply(this, [property]);
            }
            const { id, styleId } = getIdAndStyleId((_a = this.parentRule) === null || _a === void 0 ? void 0 : _a.parentStyleSheet, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleDeclarationCb({
                    id,
                    styleId,
                    remove: {
                        property,
                    },
                    index: getNestedCSSRulePositions(this.parentRule),
                });
            }
            return removeProperty.apply(this, [property]);
        };
        return () => {
            win.CSSStyleDeclaration.prototype.setProperty = setProperty;
            win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
        };
    }
    function initMediaInteractionObserver({ mediaInteractionCb, blockClass, blockSelector, mirror, sampling, }) {
        const handler = (type) => throttle((event) => {
            const target = getEventTarget(event);
            if (!target ||
                isBlocked(target, blockClass, blockSelector, true)) {
                return;
            }
            const { currentTime, volume, muted, playbackRate, } = target;
            mediaInteractionCb({
                type,
                id: mirror.getId(target),
                currentTime,
                volume,
                muted,
                playbackRate,
            });
        }, sampling.media || 500);
        const handlers = [
            on$1('play', handler(0)),
            on$1('pause', handler(1)),
            on$1('seeked', handler(2)),
            on$1('volumechange', handler(3)),
            on$1('ratechange', handler(4)),
        ];
        return () => {
            handlers.forEach((h) => h());
        };
    }
    function initFontObserver({ fontCb, doc }) {
        const win = doc.defaultView;
        if (!win) {
            return () => {
            };
        }
        const handlers = [];
        const fontMap = new WeakMap();
        const originalFontFace = win.FontFace;
        win.FontFace = function FontFace(family, source, descriptors) {
            const fontFace = new originalFontFace(family, source, descriptors);
            fontMap.set(fontFace, {
                family,
                buffer: typeof source !== 'string',
                descriptors,
                fontSource: typeof source === 'string'
                    ? source
                    : JSON.stringify(Array.from(new Uint8Array(source))),
            });
            return fontFace;
        };
        const restoreHandler = patch(doc.fonts, 'add', function (original) {
            return function (fontFace) {
                setTimeout(() => {
                    const p = fontMap.get(fontFace);
                    if (p) {
                        fontCb(p);
                        fontMap.delete(fontFace);
                    }
                }, 0);
                return original.apply(this, [fontFace]);
            };
        });
        handlers.push(() => {
            win.FontFace = originalFontFace;
        });
        handlers.push(restoreHandler);
        return () => {
            handlers.forEach((h) => h());
        };
    }
    function initSelectionObserver(param) {
        const { doc, mirror, blockClass, blockSelector, selectionCb } = param;
        let collapsed = true;
        const updateSelection = () => {
            const selection = doc.getSelection();
            if (!selection || (collapsed && (selection === null || selection === void 0 ? void 0 : selection.isCollapsed)))
                return;
            collapsed = selection.isCollapsed || false;
            const ranges = [];
            const count = selection.rangeCount || 0;
            for (let i = 0; i < count; i++) {
                const range = selection.getRangeAt(i);
                const { startContainer, startOffset, endContainer, endOffset } = range;
                const blocked = isBlocked(startContainer, blockClass, blockSelector, true) ||
                    isBlocked(endContainer, blockClass, blockSelector, true);
                if (blocked)
                    continue;
                ranges.push({
                    start: mirror.getId(startContainer),
                    startOffset,
                    end: mirror.getId(endContainer),
                    endOffset,
                });
            }
            selectionCb({ ranges });
        };
        updateSelection();
        return on$1('selectionchange', updateSelection);
    }
    function mergeHooks(o, hooks) {
        const { mutationCb, mousemoveCb, mouseInteractionCb, scrollCb, viewportResizeCb, inputCb, mediaInteractionCb, styleSheetRuleCb, styleDeclarationCb, canvasMutationCb, fontCb, selectionCb, } = o;
        o.mutationCb = (...p) => {
            if (hooks.mutation) {
                hooks.mutation(...p);
            }
            mutationCb(...p);
        };
        o.mousemoveCb = (...p) => {
            if (hooks.mousemove) {
                hooks.mousemove(...p);
            }
            mousemoveCb(...p);
        };
        o.mouseInteractionCb = (...p) => {
            if (hooks.mouseInteraction) {
                hooks.mouseInteraction(...p);
            }
            mouseInteractionCb(...p);
        };
        o.scrollCb = (...p) => {
            if (hooks.scroll) {
                hooks.scroll(...p);
            }
            scrollCb(...p);
        };
        o.viewportResizeCb = (...p) => {
            if (hooks.viewportResize) {
                hooks.viewportResize(...p);
            }
            viewportResizeCb(...p);
        };
        o.inputCb = (...p) => {
            if (hooks.input) {
                hooks.input(...p);
            }
            inputCb(...p);
        };
        o.mediaInteractionCb = (...p) => {
            if (hooks.mediaInteaction) {
                hooks.mediaInteaction(...p);
            }
            mediaInteractionCb(...p);
        };
        o.styleSheetRuleCb = (...p) => {
            if (hooks.styleSheetRule) {
                hooks.styleSheetRule(...p);
            }
            styleSheetRuleCb(...p);
        };
        o.styleDeclarationCb = (...p) => {
            if (hooks.styleDeclaration) {
                hooks.styleDeclaration(...p);
            }
            styleDeclarationCb(...p);
        };
        o.canvasMutationCb = (...p) => {
            if (hooks.canvasMutation) {
                hooks.canvasMutation(...p);
            }
            canvasMutationCb(...p);
        };
        o.fontCb = (...p) => {
            if (hooks.font) {
                hooks.font(...p);
            }
            fontCb(...p);
        };
        o.selectionCb = (...p) => {
            if (hooks.selection) {
                hooks.selection(...p);
            }
            selectionCb(...p);
        };
    }
    function initObservers(o, hooks = {}) {
        const currentWindow = o.doc.defaultView;
        if (!currentWindow) {
            return () => {
            };
        }
        mergeHooks(o, hooks);
        const mutationObserver = initMutationObserver(o, o.doc);
        const mousemoveHandler = initMoveObserver(o);
        const mouseInteractionHandler = initMouseInteractionObserver(o);
        const scrollHandler = initScrollObserver(o);
        const viewportResizeHandler = initViewportResizeObserver(o);
        const inputHandler = initInputObserver(o);
        const mediaInteractionHandler = initMediaInteractionObserver(o);
        const styleSheetObserver = initStyleSheetObserver(o, { win: currentWindow });
        const adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o, o.doc);
        const styleDeclarationObserver = initStyleDeclarationObserver(o, {
            win: currentWindow,
        });
        const fontObserver = o.collectFonts
            ? initFontObserver(o)
            : () => {
            };
        const selectionObserver = initSelectionObserver(o);
        const pluginHandlers = [];
        for (const plugin of o.plugins) {
            pluginHandlers.push(plugin.observer(plugin.callback, currentWindow, plugin.options));
        }
        return () => {
            mutationBuffers.forEach((b) => b.reset());
            mutationObserver.disconnect();
            mousemoveHandler();
            mouseInteractionHandler();
            scrollHandler();
            viewportResizeHandler();
            inputHandler();
            mediaInteractionHandler();
            styleSheetObserver();
            adoptedStyleSheetObserver();
            styleDeclarationObserver();
            fontObserver();
            selectionObserver();
            pluginHandlers.forEach((h) => h());
        };
    }

    class CrossOriginIframeMirror {
        constructor(generateIdFn) {
            this.generateIdFn = generateIdFn;
            this.iframeIdToRemoteIdMap = new WeakMap();
            this.iframeRemoteIdToIdMap = new WeakMap();
        }
        getId(iframe, remoteId, idToRemoteMap, remoteToIdMap) {
            const idToRemoteIdMap = idToRemoteMap || this.getIdToRemoteIdMap(iframe);
            const remoteIdToIdMap = remoteToIdMap || this.getRemoteIdToIdMap(iframe);
            let id = idToRemoteIdMap.get(remoteId);
            if (!id) {
                id = this.generateIdFn();
                idToRemoteIdMap.set(remoteId, id);
                remoteIdToIdMap.set(id, remoteId);
            }
            return id;
        }
        getIds(iframe, remoteId) {
            const idToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
            const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
            return remoteId.map((id) => this.getId(iframe, id, idToRemoteIdMap, remoteIdToIdMap));
        }
        getRemoteId(iframe, id, map) {
            const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);
            if (typeof id !== 'number')
                return id;
            const remoteId = remoteIdToIdMap.get(id);
            if (!remoteId)
                return -1;
            return remoteId;
        }
        getRemoteIds(iframe, ids) {
            const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
            return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
        }
        reset(iframe) {
            if (!iframe) {
                this.iframeIdToRemoteIdMap = new WeakMap();
                this.iframeRemoteIdToIdMap = new WeakMap();
                return;
            }
            this.iframeIdToRemoteIdMap.delete(iframe);
            this.iframeRemoteIdToIdMap.delete(iframe);
        }
        getIdToRemoteIdMap(iframe) {
            let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
            if (!idToRemoteIdMap) {
                idToRemoteIdMap = new Map();
                this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
            }
            return idToRemoteIdMap;
        }
        getRemoteIdToIdMap(iframe) {
            let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
            if (!remoteIdToIdMap) {
                remoteIdToIdMap = new Map();
                this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
            }
            return remoteIdToIdMap;
        }
    }

    class IframeManager {
        constructor(options) {
            this.iframes = new WeakMap();
            this.crossOriginIframeMap = new WeakMap();
            this.crossOriginIframeMirror = new CrossOriginIframeMirror(genId);
            this.mutationCb = options.mutationCb;
            this.wrappedEmit = options.wrappedEmit;
            this.stylesheetManager = options.stylesheetManager;
            this.recordCrossOriginIframes = options.recordCrossOriginIframes;
            this.crossOriginIframeStyleMirror = new CrossOriginIframeMirror(this.stylesheetManager.styleMirror.generateId.bind(this.stylesheetManager.styleMirror));
            this.mirror = options.mirror;
            if (this.recordCrossOriginIframes) {
                window.addEventListener('message', this.handleMessage.bind(this));
            }
        }
        addIframe(iframeEl) {
            this.iframes.set(iframeEl, true);
            if (iframeEl.contentWindow)
                this.crossOriginIframeMap.set(iframeEl.contentWindow, iframeEl);
        }
        addLoadListener(cb) {
            this.loadListener = cb;
        }
        attachIframe(iframeEl, childSn) {
            var _a;
            this.mutationCb({
                adds: [
                    {
                        parentId: this.mirror.getId(iframeEl),
                        nextId: null,
                        node: childSn,
                    },
                ],
                removes: [],
                texts: [],
                attributes: [],
                isAttachIframe: true,
            });
            (_a = this.loadListener) === null || _a === void 0 ? void 0 : _a.call(this, iframeEl);
            if (iframeEl.contentDocument &&
                iframeEl.contentDocument.adoptedStyleSheets &&
                iframeEl.contentDocument.adoptedStyleSheets.length > 0)
                this.stylesheetManager.adoptStyleSheets(iframeEl.contentDocument.adoptedStyleSheets, this.mirror.getId(iframeEl.contentDocument));
        }
        handleMessage(message) {
            if (message.data.type === 'rrweb') {
                const iframeSourceWindow = message.source;
                if (!iframeSourceWindow)
                    return;
                const iframeEl = this.crossOriginIframeMap.get(message.source);
                if (!iframeEl)
                    return;
                const transformedEvent = this.transformCrossOriginEvent(iframeEl, message.data.event);
                if (transformedEvent)
                    this.wrappedEmit(transformedEvent, message.data.isCheckout);
            }
        }
        transformCrossOriginEvent(iframeEl, e) {
            var _a;
            switch (e.type) {
                case EventType.FullSnapshot: {
                    this.crossOriginIframeMirror.reset(iframeEl);
                    this.crossOriginIframeStyleMirror.reset(iframeEl);
                    this.replaceIdOnNode(e.data.node, iframeEl);
                    return {
                        timestamp: e.timestamp,
                        type: EventType.IncrementalSnapshot,
                        data: {
                            source: IncrementalSource.Mutation,
                            adds: [
                                {
                                    parentId: this.mirror.getId(iframeEl),
                                    nextId: null,
                                    node: e.data.node,
                                },
                            ],
                            removes: [],
                            texts: [],
                            attributes: [],
                            isAttachIframe: true,
                        },
                    };
                }
                case EventType.Meta:
                case EventType.Load:
                case EventType.DomContentLoaded: {
                    return false;
                }
                case EventType.Plugin: {
                    return e;
                }
                case EventType.Custom: {
                    this.replaceIds(e.data.payload, iframeEl, ['id', 'parentId', 'previousId', 'nextId']);
                    return e;
                }
                case EventType.IncrementalSnapshot: {
                    switch (e.data.source) {
                        case IncrementalSource.Mutation: {
                            e.data.adds.forEach((n) => {
                                this.replaceIds(n, iframeEl, [
                                    'parentId',
                                    'nextId',
                                    'previousId',
                                ]);
                                this.replaceIdOnNode(n.node, iframeEl);
                            });
                            e.data.removes.forEach((n) => {
                                this.replaceIds(n, iframeEl, ['parentId', 'id']);
                            });
                            e.data.attributes.forEach((n) => {
                                this.replaceIds(n, iframeEl, ['id']);
                            });
                            e.data.texts.forEach((n) => {
                                this.replaceIds(n, iframeEl, ['id']);
                            });
                            return e;
                        }
                        case IncrementalSource.Drag:
                        case IncrementalSource.TouchMove:
                        case IncrementalSource.MouseMove: {
                            e.data.positions.forEach((p) => {
                                this.replaceIds(p, iframeEl, ['id']);
                            });
                            return e;
                        }
                        case IncrementalSource.ViewportResize: {
                            return false;
                        }
                        case IncrementalSource.MediaInteraction:
                        case IncrementalSource.MouseInteraction:
                        case IncrementalSource.Scroll:
                        case IncrementalSource.CanvasMutation:
                        case IncrementalSource.Input: {
                            this.replaceIds(e.data, iframeEl, ['id']);
                            return e;
                        }
                        case IncrementalSource.StyleSheetRule:
                        case IncrementalSource.StyleDeclaration: {
                            this.replaceIds(e.data, iframeEl, ['id']);
                            this.replaceStyleIds(e.data, iframeEl, ['styleId']);
                            return e;
                        }
                        case IncrementalSource.Font: {
                            return e;
                        }
                        case IncrementalSource.Selection: {
                            e.data.ranges.forEach((range) => {
                                this.replaceIds(range, iframeEl, ['start', 'end']);
                            });
                            return e;
                        }
                        case IncrementalSource.AdoptedStyleSheet: {
                            this.replaceIds(e.data, iframeEl, ['id']);
                            this.replaceStyleIds(e.data, iframeEl, ['styleIds']);
                            (_a = e.data.styles) === null || _a === void 0 ? void 0 : _a.forEach((style) => {
                                this.replaceStyleIds(style, iframeEl, ['styleId']);
                            });
                            return e;
                        }
                    }
                }
            }
        }
        replace(iframeMirror, obj, iframeEl, keys) {
            for (const key of keys) {
                if (!Array.isArray(obj[key]) && typeof obj[key] !== 'number')
                    continue;
                if (Array.isArray(obj[key])) {
                    obj[key] = iframeMirror.getIds(iframeEl, obj[key]);
                }
                else {
                    obj[key] = iframeMirror.getId(iframeEl, obj[key]);
                }
            }
            return obj;
        }
        replaceIds(obj, iframeEl, keys) {
            return this.replace(this.crossOriginIframeMirror, obj, iframeEl, keys);
        }
        replaceStyleIds(obj, iframeEl, keys) {
            return this.replace(this.crossOriginIframeStyleMirror, obj, iframeEl, keys);
        }
        replaceIdOnNode(node, iframeEl) {
            this.replaceIds(node, iframeEl, ['id']);
            if ('childNodes' in node) {
                node.childNodes.forEach((child) => {
                    this.replaceIdOnNode(child, iframeEl);
                });
            }
        }
    }

    class ShadowDomManager {
        constructor(options) {
            this.shadowDoms = new WeakSet();
            this.restorePatches = [];
            this.mutationCb = options.mutationCb;
            this.scrollCb = options.scrollCb;
            this.bypassOptions = options.bypassOptions;
            this.mirror = options.mirror;
            const manager = this;
            this.restorePatches.push(patch(Element.prototype, 'attachShadow', function (original) {
                return function (option) {
                    const shadowRoot = original.call(this, option);
                    if (this.shadowRoot)
                        manager.addShadowRoot(this.shadowRoot, this.ownerDocument);
                    return shadowRoot;
                };
            }));
        }
        addShadowRoot(shadowRoot, doc) {
            if (!isNativeShadowDom(shadowRoot))
                return;
            if (this.shadowDoms.has(shadowRoot))
                return;
            this.shadowDoms.add(shadowRoot);
            initMutationObserver(Object.assign(Object.assign({}, this.bypassOptions), { doc, mutationCb: this.mutationCb, mirror: this.mirror, shadowDomManager: this }), shadowRoot);
            initScrollObserver(Object.assign(Object.assign({}, this.bypassOptions), { scrollCb: this.scrollCb, doc: shadowRoot, mirror: this.mirror }));
            setTimeout(() => {
                if (shadowRoot.adoptedStyleSheets &&
                    shadowRoot.adoptedStyleSheets.length > 0)
                    this.bypassOptions.stylesheetManager.adoptStyleSheets(shadowRoot.adoptedStyleSheets, this.mirror.getId(shadowRoot.host));
                initAdoptedStyleSheetObserver({
                    mirror: this.mirror,
                    stylesheetManager: this.bypassOptions.stylesheetManager,
                }, shadowRoot);
            }, 0);
        }
        observeAttachShadow(iframeElement) {
            if (iframeElement.contentWindow) {
                const manager = this;
                this.restorePatches.push(patch(iframeElement.contentWindow.HTMLElement.prototype, 'attachShadow', function (original) {
                    return function (option) {
                        const shadowRoot = original.call(this, option);
                        if (this.shadowRoot)
                            manager.addShadowRoot(this.shadowRoot, iframeElement.contentDocument);
                        return shadowRoot;
                    };
                }));
            }
        }
        reset() {
            this.restorePatches.forEach((restorePatch) => restorePatch());
            this.shadowDoms = new WeakSet();
        }
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    /*
     * base64-arraybuffer 1.0.1 <https://github.com/niklasvh/base64-arraybuffer>
     * Copyright (c) 2021 Niklas von Hertzen <https://hertzen.com>
     * Released under MIT License
     */
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    // Use a lookup table to find the index.
    var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (var i$1 = 0; i$1 < chars.length; i$1++) {
        lookup[chars.charCodeAt(i$1)] = i$1;
    }
    var encode = function (arraybuffer) {
        var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';
        for (i = 0; i < len; i += 3) {
            base64 += chars[bytes[i] >> 2];
            base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += chars[bytes[i + 2] & 63];
        }
        if (len % 3 === 2) {
            base64 = base64.substring(0, base64.length - 1) + '=';
        }
        else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + '==';
        }
        return base64;
    };

    const canvasVarMap = new Map();
    function variableListFor(ctx, ctor) {
        let contextMap = canvasVarMap.get(ctx);
        if (!contextMap) {
            contextMap = new Map();
            canvasVarMap.set(ctx, contextMap);
        }
        if (!contextMap.has(ctor)) {
            contextMap.set(ctor, []);
        }
        return contextMap.get(ctor);
    }
    const saveWebGLVar = (value, win, ctx) => {
        if (!value ||
            !(isInstanceOfWebGLObject(value, win) || typeof value === 'object'))
            return;
        const name = value.constructor.name;
        const list = variableListFor(ctx, name);
        let index = list.indexOf(value);
        if (index === -1) {
            index = list.length;
            list.push(value);
        }
        return index;
    };
    function serializeArg(value, win, ctx) {
        if (value instanceof Array) {
            return value.map((arg) => serializeArg(arg, win, ctx));
        }
        else if (value === null) {
            return value;
        }
        else if (value instanceof Float32Array ||
            value instanceof Float64Array ||
            value instanceof Int32Array ||
            value instanceof Uint32Array ||
            value instanceof Uint8Array ||
            value instanceof Uint16Array ||
            value instanceof Int16Array ||
            value instanceof Int8Array ||
            value instanceof Uint8ClampedArray) {
            const name = value.constructor.name;
            return {
                rr_type: name,
                args: [Object.values(value)],
            };
        }
        else if (value instanceof ArrayBuffer) {
            const name = value.constructor.name;
            const base64 = encode(value);
            return {
                rr_type: name,
                base64,
            };
        }
        else if (value instanceof DataView) {
            const name = value.constructor.name;
            return {
                rr_type: name,
                args: [
                    serializeArg(value.buffer, win, ctx),
                    value.byteOffset,
                    value.byteLength,
                ],
            };
        }
        else if (value instanceof HTMLImageElement) {
            const name = value.constructor.name;
            const { src } = value;
            return {
                rr_type: name,
                src,
            };
        }
        else if (value instanceof HTMLCanvasElement) {
            const name = 'HTMLImageElement';
            const src = value.toDataURL();
            return {
                rr_type: name,
                src,
            };
        }
        else if (value instanceof ImageData) {
            const name = value.constructor.name;
            return {
                rr_type: name,
                args: [serializeArg(value.data, win, ctx), value.width, value.height],
            };
        }
        else if (isInstanceOfWebGLObject(value, win) || typeof value === 'object') {
            const name = value.constructor.name;
            const index = saveWebGLVar(value, win, ctx);
            return {
                rr_type: name,
                index: index,
            };
        }
        return value;
    }
    const serializeArgs = (args, win, ctx) => {
        return [...args].map((arg) => serializeArg(arg, win, ctx));
    };
    const isInstanceOfWebGLObject = (value, win) => {
        const webGLConstructorNames = [
            'WebGLActiveInfo',
            'WebGLBuffer',
            'WebGLFramebuffer',
            'WebGLProgram',
            'WebGLRenderbuffer',
            'WebGLShader',
            'WebGLShaderPrecisionFormat',
            'WebGLTexture',
            'WebGLUniformLocation',
            'WebGLVertexArrayObject',
            'WebGLVertexArrayObjectOES',
        ];
        const supportedWebGLConstructorNames = webGLConstructorNames.filter((name) => typeof win[name] === 'function');
        return Boolean(supportedWebGLConstructorNames.find((name) => value instanceof win[name]));
    };

    function initCanvas2DMutationObserver(cb, win, blockClass, blockSelector) {
        const handlers = [];
        const props2D = Object.getOwnPropertyNames(win.CanvasRenderingContext2D.prototype);
        for (const prop of props2D) {
            try {
                if (typeof win.CanvasRenderingContext2D.prototype[prop] !== 'function') {
                    continue;
                }
                const restoreHandler = patch(win.CanvasRenderingContext2D.prototype, prop, function (original) {
                    return function (...args) {
                        if (!isBlocked(this.canvas, blockClass, blockSelector, true)) {
                            setTimeout(() => {
                                const recordArgs = serializeArgs([...args], win, this);
                                cb(this.canvas, {
                                    type: CanvasContext['2D'],
                                    property: prop,
                                    args: recordArgs,
                                });
                            }, 0);
                        }
                        return original.apply(this, args);
                    };
                });
                handlers.push(restoreHandler);
            }
            catch (_a) {
                const hookHandler = hookSetter(win.CanvasRenderingContext2D.prototype, prop, {
                    set(v) {
                        cb(this.canvas, {
                            type: CanvasContext['2D'],
                            property: prop,
                            args: [v],
                            setter: true,
                        });
                    },
                });
                handlers.push(hookHandler);
            }
        }
        return () => {
            handlers.forEach((h) => h());
        };
    }

    function initCanvasContextObserver(win, blockClass, blockSelector) {
        const handlers = [];
        try {
            const restoreHandler = patch(win.HTMLCanvasElement.prototype, 'getContext', function (original) {
                return function (contextType, ...args) {
                    if (!isBlocked(this, blockClass, blockSelector, true)) {
                        if (!('__context' in this))
                            this.__context = contextType;
                    }
                    return original.apply(this, [contextType, ...args]);
                };
            });
            handlers.push(restoreHandler);
        }
        catch (_a) {
            console.error('failed to patch HTMLCanvasElement.prototype.getContext');
        }
        return () => {
            handlers.forEach((h) => h());
        };
    }

    function patchGLPrototype(prototype, type, cb, blockClass, blockSelector, mirror, win) {
        const handlers = [];
        const props = Object.getOwnPropertyNames(prototype);
        for (const prop of props) {
            if ([
                'isContextLost',
                'canvas',
                'drawingBufferWidth',
                'drawingBufferHeight',
            ].includes(prop)) {
                continue;
            }
            try {
                if (typeof prototype[prop] !== 'function') {
                    continue;
                }
                const restoreHandler = patch(prototype, prop, function (original) {
                    return function (...args) {
                        const result = original.apply(this, args);
                        saveWebGLVar(result, win, this);
                        if (!isBlocked(this.canvas, blockClass, blockSelector, true)) {
                            const recordArgs = serializeArgs([...args], win, this);
                            const mutation = {
                                type,
                                property: prop,
                                args: recordArgs,
                            };
                            cb(this.canvas, mutation);
                        }
                        return result;
                    };
                });
                handlers.push(restoreHandler);
            }
            catch (_a) {
                const hookHandler = hookSetter(prototype, prop, {
                    set(v) {
                        cb(this.canvas, {
                            type,
                            property: prop,
                            args: [v],
                            setter: true,
                        });
                    },
                });
                handlers.push(hookHandler);
            }
        }
        return handlers;
    }
    function initCanvasWebGLMutationObserver(cb, win, blockClass, blockSelector, mirror) {
        const handlers = [];
        handlers.push(...patchGLPrototype(win.WebGLRenderingContext.prototype, CanvasContext.WebGL, cb, blockClass, blockSelector, mirror, win));
        if (typeof win.WebGL2RenderingContext !== 'undefined') {
            handlers.push(...patchGLPrototype(win.WebGL2RenderingContext.prototype, CanvasContext.WebGL2, cb, blockClass, blockSelector, mirror, win));
        }
        return () => {
            handlers.forEach((h) => h());
        };
    }

    var WorkerClass = null;

    try {
        var WorkerThreads =
            typeof module !== 'undefined' && typeof module.require === 'function' && module.require('worker_threads') ||
            typeof __non_webpack_require__ === 'function' && __non_webpack_require__('worker_threads') ||
            typeof require === 'function' && require('worker_threads');
        WorkerClass = WorkerThreads.Worker;
    } catch(e) {} // eslint-disable-line

    function decodeBase64$1(base64, enableUnicode) {
        return Buffer.from(base64, 'base64').toString(enableUnicode ? 'utf16' : 'utf8');
    }

    function createBase64WorkerFactory$2(base64, sourcemapArg, enableUnicodeArg) {
        var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
        var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
        var source = decodeBase64$1(base64, enableUnicode);
        var start = source.indexOf('\n', 10) + 1;
        var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
        return function WorkerFactory(options) {
            return new WorkerClass(body, Object.assign({}, options, { eval: true }));
        };
    }

    function decodeBase64(base64, enableUnicode) {
        var binaryString = atob(base64);
        if (enableUnicode) {
            var binaryView = new Uint8Array(binaryString.length);
            for (var i = 0, n = binaryString.length; i < n; ++i) {
                binaryView[i] = binaryString.charCodeAt(i);
            }
            return String.fromCharCode.apply(null, new Uint16Array(binaryView.buffer));
        }
        return binaryString;
    }

    function createURL(base64, sourcemapArg, enableUnicodeArg) {
        var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
        var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
        var source = decodeBase64(base64, enableUnicode);
        var start = source.indexOf('\n', 10) + 1;
        var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
        var blob = new Blob([body], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }

    function createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg) {
        var url;
        return function WorkerFactory(options) {
            url = url || createURL(base64, sourcemapArg, enableUnicodeArg);
            return new Worker(url, options);
        };
    }

    var kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';

    function isNodeJS() {
        return kIsNodeJS;
    }

    function createBase64WorkerFactory(base64, sourcemapArg, enableUnicodeArg) {
        if (isNodeJS()) {
            return createBase64WorkerFactory$2(base64, sourcemapArg, enableUnicodeArg);
        }
        return createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg);
    }

    var WorkerFactory = createBase64WorkerFactory('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwooZnVuY3Rpb24gKCkgewogICAgJ3VzZSBzdHJpY3QnOwoKICAgIC8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg0KICAgIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLg0KDQogICAgUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55DQogICAgcHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLg0KDQogICAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICJBUyBJUyIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEgNCiAgICBSRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkNCiAgICBBTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsDQogICAgSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NDQogICAgTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1INCiAgICBPVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SDQogICAgUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS4NCiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqLw0KDQogICAgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikgew0KICAgICAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH0NCiAgICAgICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7DQogICAgICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9DQogICAgICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvclsidGhyb3ciXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9DQogICAgICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfQ0KICAgICAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpOw0KICAgICAgICB9KTsNCiAgICB9CgogICAgLyoKICAgICAqIGJhc2U2NC1hcnJheWJ1ZmZlciAxLjAuMSA8aHR0cHM6Ly9naXRodWIuY29tL25pa2xhc3ZoL2Jhc2U2NC1hcnJheWJ1ZmZlcj4KICAgICAqIENvcHlyaWdodCAoYykgMjAyMSBOaWtsYXMgdm9uIEhlcnR6ZW4gPGh0dHBzOi8vaGVydHplbi5jb20+CiAgICAgKiBSZWxlYXNlZCB1bmRlciBNSVQgTGljZW5zZQogICAgICovCiAgICB2YXIgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7CiAgICAvLyBVc2UgYSBsb29rdXAgdGFibGUgdG8gZmluZCB0aGUgaW5kZXguCiAgICB2YXIgbG9va3VwID0gdHlwZW9mIFVpbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnID8gW10gOiBuZXcgVWludDhBcnJheSgyNTYpOwogICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFycy5sZW5ndGg7IGkrKykgewogICAgICAgIGxvb2t1cFtjaGFycy5jaGFyQ29kZUF0KGkpXSA9IGk7CiAgICB9CiAgICB2YXIgZW5jb2RlID0gZnVuY3Rpb24gKGFycmF5YnVmZmVyKSB7CiAgICAgICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXlidWZmZXIpLCBpLCBsZW4gPSBieXRlcy5sZW5ndGgsIGJhc2U2NCA9ICcnOwogICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gMykgewogICAgICAgICAgICBiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaV0gPj4gMl07CiAgICAgICAgICAgIGJhc2U2NCArPSBjaGFyc1soKGJ5dGVzW2ldICYgMykgPDwgNCkgfCAoYnl0ZXNbaSArIDFdID4+IDQpXTsKICAgICAgICAgICAgYmFzZTY0ICs9IGNoYXJzWygoYnl0ZXNbaSArIDFdICYgMTUpIDw8IDIpIHwgKGJ5dGVzW2kgKyAyXSA+PiA2KV07CiAgICAgICAgICAgIGJhc2U2NCArPSBjaGFyc1tieXRlc1tpICsgMl0gJiA2M107CiAgICAgICAgfQogICAgICAgIGlmIChsZW4gJSAzID09PSAyKSB7CiAgICAgICAgICAgIGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDEpICsgJz0nOwogICAgICAgIH0KICAgICAgICBlbHNlIGlmIChsZW4gJSAzID09PSAxKSB7CiAgICAgICAgICAgIGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDIpICsgJz09JzsKICAgICAgICB9CiAgICAgICAgcmV0dXJuIGJhc2U2NDsKICAgIH07CgogICAgY29uc3QgbGFzdEJsb2JNYXAgPSBuZXcgTWFwKCk7DQogICAgY29uc3QgdHJhbnNwYXJlbnRCbG9iTWFwID0gbmV3IE1hcCgpOw0KICAgIGZ1bmN0aW9uIGdldFRyYW5zcGFyZW50QmxvYkZvcih3aWR0aCwgaGVpZ2h0LCBkYXRhVVJMT3B0aW9ucykgew0KICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkgew0KICAgICAgICAgICAgY29uc3QgaWQgPSBgJHt3aWR0aH0tJHtoZWlnaHR9YDsNCiAgICAgICAgICAgIGlmICgnT2Zmc2NyZWVuQ2FudmFzJyBpbiBnbG9iYWxUaGlzKSB7DQogICAgICAgICAgICAgICAgaWYgKHRyYW5zcGFyZW50QmxvYk1hcC5oYXMoaWQpKQ0KICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNwYXJlbnRCbG9iTWFwLmdldChpZCk7DQogICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2NyZWVuID0gbmV3IE9mZnNjcmVlbkNhbnZhcyh3aWR0aCwgaGVpZ2h0KTsNCiAgICAgICAgICAgICAgICBvZmZzY3JlZW4uZ2V0Q29udGV4dCgnMmQnKTsNCiAgICAgICAgICAgICAgICBjb25zdCBibG9iID0geWllbGQgb2Zmc2NyZWVuLmNvbnZlcnRUb0Jsb2IoZGF0YVVSTE9wdGlvbnMpOw0KICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0geWllbGQgYmxvYi5hcnJheUJ1ZmZlcigpOw0KICAgICAgICAgICAgICAgIGNvbnN0IGJhc2U2NCA9IGVuY29kZShhcnJheUJ1ZmZlcik7DQogICAgICAgICAgICAgICAgdHJhbnNwYXJlbnRCbG9iTWFwLnNldChpZCwgYmFzZTY0KTsNCiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZTY0Ow0KICAgICAgICAgICAgfQ0KICAgICAgICAgICAgZWxzZSB7DQogICAgICAgICAgICAgICAgcmV0dXJuICcnOw0KICAgICAgICAgICAgfQ0KICAgICAgICB9KTsNCiAgICB9DQogICAgY29uc3Qgd29ya2VyID0gc2VsZjsNCiAgICB3b3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24gKGUpIHsNCiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHsNCiAgICAgICAgICAgIGlmICgnT2Zmc2NyZWVuQ2FudmFzJyBpbiBnbG9iYWxUaGlzKSB7DQogICAgICAgICAgICAgICAgY29uc3QgeyBpZCwgYml0bWFwLCB3aWR0aCwgaGVpZ2h0LCBkYXRhVVJMT3B0aW9ucyB9ID0gZS5kYXRhOw0KICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zcGFyZW50QmFzZTY0ID0gZ2V0VHJhbnNwYXJlbnRCbG9iRm9yKHdpZHRoLCBoZWlnaHQsIGRhdGFVUkxPcHRpb25zKTsNCiAgICAgICAgICAgICAgICBjb25zdCBvZmZzY3JlZW4gPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKHdpZHRoLCBoZWlnaHQpOw0KICAgICAgICAgICAgICAgIGNvbnN0IGN0eCA9IG9mZnNjcmVlbi5nZXRDb250ZXh0KCcyZCcpOw0KICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoYml0bWFwLCAwLCAwKTsNCiAgICAgICAgICAgICAgICBiaXRtYXAuY2xvc2UoKTsNCiAgICAgICAgICAgICAgICBjb25zdCBibG9iID0geWllbGQgb2Zmc2NyZWVuLmNvbnZlcnRUb0Jsb2IoZGF0YVVSTE9wdGlvbnMpOw0KICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBibG9iLnR5cGU7DQogICAgICAgICAgICAgICAgY29uc3QgYXJyYXlCdWZmZXIgPSB5aWVsZCBibG9iLmFycmF5QnVmZmVyKCk7DQogICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0ID0gZW5jb2RlKGFycmF5QnVmZmVyKTsNCiAgICAgICAgICAgICAgICBpZiAoIWxhc3RCbG9iTWFwLmhhcyhpZCkgJiYgKHlpZWxkIHRyYW5zcGFyZW50QmFzZTY0KSA9PT0gYmFzZTY0KSB7DQogICAgICAgICAgICAgICAgICAgIGxhc3RCbG9iTWFwLnNldChpZCwgYmFzZTY0KTsNCiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdvcmtlci5wb3N0TWVzc2FnZSh7IGlkIH0pOw0KICAgICAgICAgICAgICAgIH0NCiAgICAgICAgICAgICAgICBpZiAobGFzdEJsb2JNYXAuZ2V0KGlkKSA9PT0gYmFzZTY0KQ0KICAgICAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VyLnBvc3RNZXNzYWdlKHsgaWQgfSk7DQogICAgICAgICAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKHsNCiAgICAgICAgICAgICAgICAgICAgaWQsDQogICAgICAgICAgICAgICAgICAgIHR5cGUsDQogICAgICAgICAgICAgICAgICAgIGJhc2U2NCwNCiAgICAgICAgICAgICAgICAgICAgd2lkdGgsDQogICAgICAgICAgICAgICAgICAgIGhlaWdodCwNCiAgICAgICAgICAgICAgICB9KTsNCiAgICAgICAgICAgICAgICBsYXN0QmxvYk1hcC5zZXQoaWQsIGJhc2U2NCk7DQogICAgICAgICAgICB9DQogICAgICAgICAgICBlbHNlIHsNCiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VyLnBvc3RNZXNzYWdlKHsgaWQ6IGUuZGF0YS5pZCB9KTsNCiAgICAgICAgICAgIH0NCiAgICAgICAgfSk7DQogICAgfTsKCn0pKCk7Cgo=', null, false);

    class CanvasManager {
        constructor(options) {
            this.pendingCanvasMutations = new Map();
            this.rafStamps = { latestId: 0, invokeId: null };
            this.frozen = false;
            this.locked = false;
            this.processMutation = (target, mutation) => {
                const newFrame = this.rafStamps.invokeId &&
                    this.rafStamps.latestId !== this.rafStamps.invokeId;
                if (newFrame || !this.rafStamps.invokeId)
                    this.rafStamps.invokeId = this.rafStamps.latestId;
                if (!this.pendingCanvasMutations.has(target)) {
                    this.pendingCanvasMutations.set(target, []);
                }
                this.pendingCanvasMutations.get(target).push(mutation);
            };
            const { sampling = 'all', win, blockClass, blockSelector, recordCanvas, dataURLOptions, } = options;
            this.mutationCb = options.mutationCb;
            this.mirror = options.mirror;
            if (recordCanvas && sampling === 'all')
                this.initCanvasMutationObserver(win, blockClass, blockSelector);
            if (recordCanvas && typeof sampling === 'number')
                this.initCanvasFPSObserver(sampling, win, blockClass, blockSelector, {
                    dataURLOptions,
                });
        }
        reset() {
            this.pendingCanvasMutations.clear();
            this.resetObservers && this.resetObservers();
        }
        freeze() {
            this.frozen = true;
        }
        unfreeze() {
            this.frozen = false;
        }
        lock() {
            this.locked = true;
        }
        unlock() {
            this.locked = false;
        }
        initCanvasFPSObserver(fps, win, blockClass, blockSelector, options) {
            const canvasContextReset = initCanvasContextObserver(win, blockClass, blockSelector);
            const snapshotInProgressMap = new Map();
            const worker = new WorkerFactory();
            worker.onmessage = (e) => {
                const { id } = e.data;
                snapshotInProgressMap.set(id, false);
                if (!('base64' in e.data))
                    return;
                const { base64, type, width, height } = e.data;
                this.mutationCb({
                    id,
                    type: CanvasContext['2D'],
                    commands: [
                        {
                            property: 'clearRect',
                            args: [0, 0, width, height],
                        },
                        {
                            property: 'drawImage',
                            args: [
                                {
                                    rr_type: 'ImageBitmap',
                                    args: [
                                        {
                                            rr_type: 'Blob',
                                            data: [{ rr_type: 'ArrayBuffer', base64 }],
                                            type,
                                        },
                                    ],
                                },
                                0,
                                0,
                            ],
                        },
                    ],
                });
            };
            const timeBetweenSnapshots = 1000 / fps;
            let lastSnapshotTime = 0;
            let rafId;
            const getCanvas = () => {
                const matchedCanvas = [];
                win.document.querySelectorAll('canvas').forEach((canvas) => {
                    if (!isBlocked(canvas, blockClass, blockSelector, true)) {
                        matchedCanvas.push(canvas);
                    }
                });
                return matchedCanvas;
            };
            const takeCanvasSnapshots = (timestamp) => {
                if (lastSnapshotTime &&
                    timestamp - lastSnapshotTime < timeBetweenSnapshots) {
                    rafId = requestAnimationFrame(takeCanvasSnapshots);
                    return;
                }
                lastSnapshotTime = timestamp;
                getCanvas()
                    .forEach((canvas) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const id = this.mirror.getId(canvas);
                    if (snapshotInProgressMap.get(id))
                        return;
                    snapshotInProgressMap.set(id, true);
                    if (['webgl', 'webgl2'].includes(canvas.__context)) {
                        const context = canvas.getContext(canvas.__context);
                        if (((_a = context === null || context === void 0 ? void 0 : context.getContextAttributes()) === null || _a === void 0 ? void 0 : _a.preserveDrawingBuffer) === false) {
                            context === null || context === void 0 ? void 0 : context.clear(context.COLOR_BUFFER_BIT);
                        }
                    }
                    const bitmap = yield createImageBitmap(canvas);
                    worker.postMessage({
                        id,
                        bitmap,
                        width: canvas.width,
                        height: canvas.height,
                        dataURLOptions: options.dataURLOptions,
                    }, [bitmap]);
                }));
                rafId = requestAnimationFrame(takeCanvasSnapshots);
            };
            rafId = requestAnimationFrame(takeCanvasSnapshots);
            this.resetObservers = () => {
                canvasContextReset();
                cancelAnimationFrame(rafId);
            };
        }
        initCanvasMutationObserver(win, blockClass, blockSelector) {
            this.startRAFTimestamping();
            this.startPendingCanvasMutationFlusher();
            const canvasContextReset = initCanvasContextObserver(win, blockClass, blockSelector);
            const canvas2DReset = initCanvas2DMutationObserver(this.processMutation.bind(this), win, blockClass, blockSelector);
            const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(this.processMutation.bind(this), win, blockClass, blockSelector, this.mirror);
            this.resetObservers = () => {
                canvasContextReset();
                canvas2DReset();
                canvasWebGL1and2Reset();
            };
        }
        startPendingCanvasMutationFlusher() {
            requestAnimationFrame(() => this.flushPendingCanvasMutations());
        }
        startRAFTimestamping() {
            const setLatestRAFTimestamp = (timestamp) => {
                this.rafStamps.latestId = timestamp;
                requestAnimationFrame(setLatestRAFTimestamp);
            };
            requestAnimationFrame(setLatestRAFTimestamp);
        }
        flushPendingCanvasMutations() {
            this.pendingCanvasMutations.forEach((values, canvas) => {
                const id = this.mirror.getId(canvas);
                this.flushPendingCanvasMutationFor(canvas, id);
            });
            requestAnimationFrame(() => this.flushPendingCanvasMutations());
        }
        flushPendingCanvasMutationFor(canvas, id) {
            if (this.frozen || this.locked) {
                return;
            }
            const valuesWithType = this.pendingCanvasMutations.get(canvas);
            if (!valuesWithType || id === -1)
                return;
            const values = valuesWithType.map((value) => {
                const rest = __rest(value, ["type"]);
                return rest;
            });
            const { type } = valuesWithType[0];
            this.mutationCb({ id, type, commands: values });
            this.pendingCanvasMutations.delete(canvas);
        }
    }

    class StylesheetManager {
        constructor(options) {
            this.trackedLinkElements = new WeakSet();
            this.styleMirror = new StyleSheetMirror();
            this.mutationCb = options.mutationCb;
            this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
        }
        attachLinkElement(linkEl, childSn) {
            if ('_cssText' in childSn.attributes)
                this.mutationCb({
                    adds: [],
                    removes: [],
                    texts: [],
                    attributes: [
                        {
                            id: childSn.id,
                            attributes: childSn
                                .attributes,
                        },
                    ],
                });
            this.trackLinkElement(linkEl);
        }
        trackLinkElement(linkEl) {
            if (this.trackedLinkElements.has(linkEl))
                return;
            this.trackedLinkElements.add(linkEl);
            this.trackStylesheetInLinkElement(linkEl);
        }
        adoptStyleSheets(sheets, hostId) {
            if (sheets.length === 0)
                return;
            const adoptedStyleSheetData = {
                id: hostId,
                styleIds: [],
            };
            const styles = [];
            for (const sheet of sheets) {
                let styleId;
                if (!this.styleMirror.has(sheet)) {
                    styleId = this.styleMirror.add(sheet);
                    const rules = Array.from(sheet.rules || CSSRule);
                    styles.push({
                        styleId,
                        rules: rules.map((r, index) => {
                            return {
                                rule: getCssRuleString(r),
                                index,
                            };
                        }),
                    });
                }
                else
                    styleId = this.styleMirror.getId(sheet);
                adoptedStyleSheetData.styleIds.push(styleId);
            }
            if (styles.length > 0)
                adoptedStyleSheetData.styles = styles;
            this.adoptedStyleSheetCb(adoptedStyleSheetData);
        }
        reset() {
            this.styleMirror.reset();
            this.trackedLinkElements = new WeakSet();
        }
        trackStylesheetInLinkElement(linkEl) {
        }
    }

    function wrapEvent(e) {
        return Object.assign(Object.assign({}, e), { timestamp: Date.now() });
    }
    let wrappedEmit;
    let takeFullSnapshot;
    let canvasManager;
    let recording = false;
    const mirror = createMirror();
    function record(options = {}) {
        const { emit, checkoutEveryNms, checkoutEveryNth, blockClass = 'rr-block', blockSelector = null, ignoreClass = 'rr-ignore', maskTextClass = 'rr-mask', maskTextSelector = null, inlineStylesheet = true, maskAllInputs, maskInputOptions: _maskInputOptions, slimDOMOptions: _slimDOMOptions, maskInputFn, maskTextFn, hooks, packFn, sampling = {}, dataURLOptions = {}, mousemoveWait, recordCanvas = false, recordCrossOriginIframes = false, userTriggeredOnInput = false, collectFonts = false, inlineImages = false, plugins, keepIframeSrcFn = () => false, ignoreCSSAttributes = new Set([]), } = options;
        const inEmittingFrame = recordCrossOriginIframes
            ? window.parent === window
            : true;
        let passEmitsToParent = false;
        if (!inEmittingFrame) {
            try {
                window.parent.document;
                passEmitsToParent = false;
            }
            catch (e) {
                passEmitsToParent = true;
            }
        }
        if (inEmittingFrame && !emit) {
            throw new Error('emit function is required');
        }
        if (mousemoveWait !== undefined && sampling.mousemove === undefined) {
            sampling.mousemove = mousemoveWait;
        }
        mirror.reset();
        const maskInputOptions = maskAllInputs === true
            ? {
                color: true,
                date: true,
                'datetime-local': true,
                email: true,
                month: true,
                number: true,
                range: true,
                search: true,
                tel: true,
                text: true,
                time: true,
                url: true,
                week: true,
                textarea: true,
                select: true,
                password: true,
            }
            : _maskInputOptions !== undefined
                ? _maskInputOptions
                : { password: true };
        const slimDOMOptions = _slimDOMOptions === true || _slimDOMOptions === 'all'
            ? {
                script: true,
                comment: true,
                headFavicon: true,
                headWhitespace: true,
                headMetaSocial: true,
                headMetaRobots: true,
                headMetaHttpEquiv: true,
                headMetaVerification: true,
                headMetaAuthorship: _slimDOMOptions === 'all',
                headMetaDescKeywords: _slimDOMOptions === 'all',
            }
            : _slimDOMOptions
                ? _slimDOMOptions
                : {};
        polyfill();
        let lastFullSnapshotEvent;
        let incrementalSnapshotCount = 0;
        const eventProcessor = (e) => {
            for (const plugin of plugins || []) {
                if (plugin.eventProcessor) {
                    e = plugin.eventProcessor(e);
                }
            }
            if (packFn) {
                e = packFn(e);
            }
            return e;
        };
        wrappedEmit = (e, isCheckout) => {
            var _a;
            if (((_a = mutationBuffers[0]) === null || _a === void 0 ? void 0 : _a.isFrozen()) &&
                e.type !== EventType.FullSnapshot &&
                !(e.type === EventType.IncrementalSnapshot &&
                    e.data.source === IncrementalSource.Mutation)) {
                mutationBuffers.forEach((buf) => buf.unfreeze());
            }
            if (inEmittingFrame) {
                emit === null || emit === void 0 ? void 0 : emit(eventProcessor(e), isCheckout);
            }
            else if (passEmitsToParent) {
                const message = {
                    type: 'rrweb',
                    event: eventProcessor(e),
                    isCheckout,
                };
                window.parent.postMessage(message, '*');
            }
            if (e.type === EventType.FullSnapshot) {
                lastFullSnapshotEvent = e;
                incrementalSnapshotCount = 0;
            }
            else if (e.type === EventType.IncrementalSnapshot) {
                if (e.data.source === IncrementalSource.Mutation &&
                    e.data.isAttachIframe) {
                    return;
                }
                incrementalSnapshotCount++;
                const exceedCount = checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
                const exceedTime = checkoutEveryNms &&
                    e.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
                if (exceedCount || exceedTime) {
                    takeFullSnapshot(true);
                }
            }
        };
        const wrappedMutationEmit = (m) => {
            wrappedEmit(wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: Object.assign({ source: IncrementalSource.Mutation }, m),
            }));
        };
        const wrappedScrollEmit = (p) => wrappedEmit(wrapEvent({
            type: EventType.IncrementalSnapshot,
            data: Object.assign({ source: IncrementalSource.Scroll }, p),
        }));
        const wrappedCanvasMutationEmit = (p) => wrappedEmit(wrapEvent({
            type: EventType.IncrementalSnapshot,
            data: Object.assign({ source: IncrementalSource.CanvasMutation }, p),
        }));
        const wrappedAdoptedStyleSheetEmit = (a) => wrappedEmit(wrapEvent({
            type: EventType.IncrementalSnapshot,
            data: Object.assign({ source: IncrementalSource.AdoptedStyleSheet }, a),
        }));
        const stylesheetManager = new StylesheetManager({
            mutationCb: wrappedMutationEmit,
            adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit,
        });
        const iframeManager = new IframeManager({
            mirror,
            mutationCb: wrappedMutationEmit,
            stylesheetManager: stylesheetManager,
            recordCrossOriginIframes,
            wrappedEmit,
        });
        for (const plugin of plugins || []) {
            if (plugin.getMirror)
                plugin.getMirror({
                    nodeMirror: mirror,
                    crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
                    crossOriginIframeStyleMirror: iframeManager.crossOriginIframeStyleMirror,
                });
        }
        canvasManager = new CanvasManager({
            recordCanvas,
            mutationCb: wrappedCanvasMutationEmit,
            win: window,
            blockClass,
            blockSelector,
            mirror,
            sampling: sampling.canvas,
            dataURLOptions,
        });
        const shadowDomManager = new ShadowDomManager({
            mutationCb: wrappedMutationEmit,
            scrollCb: wrappedScrollEmit,
            bypassOptions: {
                blockClass,
                blockSelector,
                maskTextClass,
                maskTextSelector,
                inlineStylesheet,
                maskInputOptions,
                dataURLOptions,
                maskTextFn,
                maskInputFn,
                recordCanvas,
                inlineImages,
                sampling,
                slimDOMOptions,
                iframeManager,
                stylesheetManager,
                canvasManager,
                keepIframeSrcFn,
            },
            mirror,
        });
        takeFullSnapshot = (isCheckout = false) => {
            var _a, _b, _c, _d, _e, _f;
            wrappedEmit(wrapEvent({
                type: EventType.Meta,
                data: {
                    href: window.location.href,
                    width: getWindowWidth(),
                    height: getWindowHeight(),
                },
            }), isCheckout);
            stylesheetManager.reset();
            mutationBuffers.forEach((buf) => buf.lock());
            const node = snapshot(document, {
                mirror,
                blockClass,
                blockSelector,
                maskTextClass,
                maskTextSelector,
                inlineStylesheet,
                maskAllInputs: maskInputOptions,
                maskTextFn,
                slimDOM: slimDOMOptions,
                dataURLOptions,
                recordCanvas,
                inlineImages,
                onSerialize: (n) => {
                    if (isSerializedIframe(n, mirror)) {
                        iframeManager.addIframe(n);
                    }
                    if (isSerializedStylesheet(n, mirror)) {
                        stylesheetManager.trackLinkElement(n);
                    }
                    if (hasShadowRoot(n)) {
                        shadowDomManager.addShadowRoot(n.shadowRoot, document);
                    }
                },
                onIframeLoad: (iframe, childSn) => {
                    iframeManager.attachIframe(iframe, childSn);
                    shadowDomManager.observeAttachShadow(iframe);
                },
                onStylesheetLoad: (linkEl, childSn) => {
                    stylesheetManager.attachLinkElement(linkEl, childSn);
                },
                keepIframeSrcFn,
            });
            if (!node) {
                return console.warn('Failed to snapshot the document');
            }
            wrappedEmit(wrapEvent({
                type: EventType.FullSnapshot,
                data: {
                    node,
                    initialOffset: {
                        left: window.pageXOffset !== undefined
                            ? window.pageXOffset
                            : (document === null || document === void 0 ? void 0 : document.documentElement.scrollLeft) ||
                                ((_b = (_a = document === null || document === void 0 ? void 0 : document.body) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.scrollLeft) ||
                                ((_c = document === null || document === void 0 ? void 0 : document.body) === null || _c === void 0 ? void 0 : _c.scrollLeft) ||
                                0,
                        top: window.pageYOffset !== undefined
                            ? window.pageYOffset
                            : (document === null || document === void 0 ? void 0 : document.documentElement.scrollTop) ||
                                ((_e = (_d = document === null || document === void 0 ? void 0 : document.body) === null || _d === void 0 ? void 0 : _d.parentElement) === null || _e === void 0 ? void 0 : _e.scrollTop) ||
                                ((_f = document === null || document === void 0 ? void 0 : document.body) === null || _f === void 0 ? void 0 : _f.scrollTop) ||
                                0,
                    },
                },
            }));
            mutationBuffers.forEach((buf) => buf.unlock());
            if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0)
                stylesheetManager.adoptStyleSheets(document.adoptedStyleSheets, mirror.getId(document));
        };
        try {
            const handlers = [];
            handlers.push(on$1('DOMContentLoaded', () => {
                wrappedEmit(wrapEvent({
                    type: EventType.DomContentLoaded,
                    data: {},
                }));
            }));
            const observe = (doc) => {
                var _a;
                return initObservers({
                    mutationCb: wrappedMutationEmit,
                    mousemoveCb: (positions, source) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: {
                            source,
                            positions,
                        },
                    })),
                    mouseInteractionCb: (d) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.MouseInteraction }, d),
                    })),
                    scrollCb: wrappedScrollEmit,
                    viewportResizeCb: (d) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.ViewportResize }, d),
                    })),
                    inputCb: (v) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.Input }, v),
                    })),
                    mediaInteractionCb: (p) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.MediaInteraction }, p),
                    })),
                    styleSheetRuleCb: (r) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.StyleSheetRule }, r),
                    })),
                    styleDeclarationCb: (r) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.StyleDeclaration }, r),
                    })),
                    canvasMutationCb: wrappedCanvasMutationEmit,
                    fontCb: (p) => wrappedEmit(wrapEvent({
                        type: EventType.IncrementalSnapshot,
                        data: Object.assign({ source: IncrementalSource.Font }, p),
                    })),
                    selectionCb: (p) => {
                        wrappedEmit(wrapEvent({
                            type: EventType.IncrementalSnapshot,
                            data: Object.assign({ source: IncrementalSource.Selection }, p),
                        }));
                    },
                    blockClass,
                    ignoreClass,
                    maskTextClass,
                    maskTextSelector,
                    maskInputOptions,
                    inlineStylesheet,
                    sampling,
                    recordCanvas,
                    inlineImages,
                    userTriggeredOnInput,
                    collectFonts,
                    doc,
                    maskInputFn,
                    maskTextFn,
                    keepIframeSrcFn,
                    blockSelector,
                    slimDOMOptions,
                    dataURLOptions,
                    mirror,
                    iframeManager,
                    stylesheetManager,
                    shadowDomManager,
                    canvasManager,
                    ignoreCSSAttributes,
                    plugins: ((_a = plugins === null || plugins === void 0 ? void 0 : plugins.filter((p) => p.observer)) === null || _a === void 0 ? void 0 : _a.map((p) => ({
                        observer: p.observer,
                        options: p.options,
                        callback: (payload) => wrappedEmit(wrapEvent({
                            type: EventType.Plugin,
                            data: {
                                plugin: p.name,
                                payload,
                            },
                        })),
                    }))) || [],
                }, hooks);
            };
            iframeManager.addLoadListener((iframeEl) => {
                handlers.push(observe(iframeEl.contentDocument));
            });
            const init = () => {
                takeFullSnapshot();
                handlers.push(observe(document));
                recording = true;
            };
            if (document.readyState === 'interactive' ||
                document.readyState === 'complete') {
                init();
            }
            else {
                handlers.push(on$1('load', () => {
                    wrappedEmit(wrapEvent({
                        type: EventType.Load,
                        data: {},
                    }));
                    init();
                }, window));
            }
            return () => {
                handlers.forEach((h) => h());
                recording = false;
            };
        }
        catch (error) {
            console.warn(error);
        }
    }
    record.addCustomEvent = (tag, payload) => {
        if (!recording) {
            throw new Error('please add custom event after start recording');
        }
        wrappedEmit(wrapEvent({
            type: EventType.Custom,
            data: {
                tag,
                payload,
            },
        }));
    };
    record.freezePage = () => {
        mutationBuffers.forEach((buf) => buf.freeze());
    };
    record.takeFullSnapshot = (isCheckout) => {
        if (!recording) {
            throw new Error('please take full snapshot after start recording');
        }
        takeFullSnapshot(isCheckout);
    };
    record.mirror = mirror;

    class RecorderEventCenter {
        constructor() {
            this.events = [];
        }
        getEvents() {
            return this.events;
        }
        subscribe(event, listener) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(listener);
        }
        unSubscribe(event, listener) {
            if (!this.events[event]) {
                return;
            }
            this.events[event] = this.events[event].filter((l) => l !== listener);
        }
        publish(event, ...args) {
            let listeners = this.events[event];
            listeners.forEach((listener) => {
                listener(event, ...args);
            });
        }
    }

    const recorderEventCenter = new RecorderEventCenter();

    let events = [];
    let recorderStopFn =  null;
    function recorderStart(){
        recorderStopFn = record({
            emit(event) {
              // push event into the events array
              events.push(event);
              if(events.length > 100){
                events.shift();
              }
            },
            blockClass: /^lulu-*/g,
        });
    }
    function recorderStop(){
        recorderStopFn && recorderStopFn();
        recorderStopFn = null;
    }

    // this function will send events to the backend and reset the events array
    function save() {
      const body = JSON.stringify({ events });
      events = [];
      recorderEventCenter.publish('onSave', body);
    }

    const button = document.createElement("button");
    button.classList.add("lulu-floating-button");
    // use the svg from chrome extension
    const recordSvg = chrome.runtime.getURL("assets/record_fill.svg");
    const pauseSvg = chrome.runtime.getURL("assets/pause.svg");
    button.style.backgroundImage = `url(${recordSvg})`;
    button.showCloseButton = false;
    document.body.appendChild(button);


    let isDragging = false;
    let isMoving = false;
    let isRecording = false;
    let dragStartX;
    let dragStartY;

    button.addEventListener("mousedown", function (event) {
      isDragging = true;
      dragStartX = event.clientX - button.getBoundingClientRect().right;
      dragStartY = event.clientY - button.getBoundingClientRect().top;
      button.classList.add("dragging");
    });

    document.addEventListener("mousemove", function (event) {
      if (isDragging) {
        isMoving = true;
        const right = document.body.getBoundingClientRect().right - (event.clientX - dragStartX);
        const top = event.clientY - dragStartY;
        button.style.right = right + "px";
        button.style.top = top + "px";
      }
    });

    document.addEventListener("mouseup", function () {
      isDragging = false;
      button.classList.remove("dragging");
      setTimeout(() => isMoving = false, 600);
    });

    // 点击按钮而非拖拽的逻辑
    button.addEventListener("click", function () {

      if (button.showCloseButton) {
        const projector = document.querySelector('.lulu-projector');
        projector.classList.remove('active');
        button.showCloseButton = false;
        isRecording ? button.style.backgroundImage = `url(${pauseSvg})` : button.style.backgroundImage = `url(${recordSvg})`;
        return
      }

      // 判断是否在拖拽
      if (isMoving) {
        return;
      }
      isRecording = !isRecording;
      if (isRecording) {
        recorderStart();
        button.style.backgroundImage = `url(${pauseSvg})`;
      } else {
        recorderStop();
        save();
        button.style.backgroundImage = `url(${recordSvg})`;
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('request', request);
      if (request.type === 'onHideRecorderBtn') {
          button.classList.add('hide');
      }else if (request.type === 'onShowRecorderBtn') {
          button.classList.remove('hide');
      }
    });

    function e(){}function t(e,t){for(const n in t)e[n]=t[n];return e}function n(e){return e()}function i(){return Object.create(null)}function o(e){e.forEach(n);}function r(e){return "function"==typeof e}function s(e,t){return e!=e?t==t:e!==t||e&&"object"==typeof e||"function"==typeof e}function a(e){const t={};for(const n in e)"$"!==n[0]&&(t[n]=e[n]);return t}function l(e,t){e.appendChild(t);}function c(e,t,n){e.insertBefore(t,n||null);}function d(e){e.parentNode.removeChild(e);}function u(e,t){for(let n=0;n<e.length;n+=1)e[n]&&e[n].d(t);}function h(e){return document.createElement(e)}function p(e){return document.createElementNS("http://www.w3.org/2000/svg",e)}function g(e){return document.createTextNode(e)}function m(){return g(" ")}function f(e,t,n,i){return e.addEventListener(t,n,i),()=>e.removeEventListener(t,n,i)}function y(e,t,n){null==n?e.removeAttribute(t):e.getAttribute(t)!==n&&e.setAttribute(t,n);}function v(e,t){t=""+t,e.wholeText!==t&&(e.data=t);}function C(e,t,n,i){null===n?e.style.removeProperty(t):e.style.setProperty(t,n,i?"important":"");}function I(e,t,n){e.classList[n?"add":"remove"](t);}let A;function b(e){A=e;}function w(){if(!A)throw new Error("Function called outside component initialization");return A}function N(e){w().$$.on_mount.push(e);}function E(e){w().$$.on_destroy.push(e);}function S(){const e=w();return (t,n,{cancelable:i=!1}={})=>{const o=e.$$.callbacks[t];if(o){const r=function(e,t,{bubbles:n=!1,cancelable:i=!1}={}){const o=document.createEvent("CustomEvent");return o.initCustomEvent(e,n,i,t),o}(t,n,{cancelable:i});return o.slice().forEach((t=>{t.call(e,r);})),!r.defaultPrevented}return !0}}const T=[],D=[],M=[],R=[],x=Promise.resolve();let k=!1;function F(e){M.push(e);}const O=new Set;let B=0;function L(){const e=A;do{for(;B<T.length;){const e=T[B];B++,b(e),V(e.$$);}for(b(null),T.length=0,B=0;D.length;)D.pop()();for(let e=0;e<M.length;e+=1){const t=M[e];O.has(t)||(O.add(t),t());}M.length=0;}while(T.length);for(;R.length;)R.pop()();k=!1,O.clear(),b(e);}function V(e){if(null!==e.fragment){e.update(),o(e.before_update);const t=e.dirty;e.dirty=[-1],e.fragment&&e.fragment.p(e.ctx,t),e.after_update.forEach(F);}}const _=new Set;let G;function W(){G={r:0,c:[],p:G};}function U(){G.r||o(G.c),G=G.p;}function Z(e,t){e&&e.i&&(_.delete(e),e.i(t));}function $(e,t,n,i){if(e&&e.o){if(_.has(e))return;_.add(e),G.c.push((()=>{_.delete(e),i&&(n&&e.d(1),i());})),e.o(t);}else i&&i();}function K(e){e&&e.c();}function Y(e,t,i,s){const{fragment:a,on_mount:l,on_destroy:c,after_update:d}=e.$$;a&&a.m(t,i),s||F((()=>{const t=l.map(n).filter(r);c?c.push(...t):o(t),e.$$.on_mount=[];})),d.forEach(F);}function P(e,t){const n=e.$$;null!==n.fragment&&(o(n.on_destroy),n.fragment&&n.fragment.d(t),n.on_destroy=n.fragment=null,n.ctx=[]);}function Q(e,t){-1===e.$$.dirty[0]&&(T.push(e),k||(k=!0,x.then(L)),e.$$.dirty.fill(0)),e.$$.dirty[t/31|0]|=1<<t%31;}function z(t,n,r,s,a,l,c,u=[-1]){const h=A;b(t);const p=t.$$={fragment:null,ctx:null,props:l,update:e,not_equal:a,bound:i(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(n.context||(h?h.$$.context:[])),callbacks:i(),dirty:u,skip_bound:!1,root:n.target||h.$$.root};c&&c(p.root);let g=!1;if(p.ctx=r?r(t,n.props||{},((e,n,...i)=>{const o=i.length?i[0]:n;return p.ctx&&a(p.ctx[e],p.ctx[e]=o)&&(!p.skip_bound&&p.bound[e]&&p.bound[e](o),g&&Q(t,e)),n})):[],p.update(),g=!0,o(p.before_update),p.fragment=!!s&&s(p.ctx),n.target){if(n.hydrate){const e=function(e){return Array.from(e.childNodes)}(n.target);p.fragment&&p.fragment.l(e),e.forEach(d);}else p.fragment&&p.fragment.c();n.intro&&Z(t.$$.fragment),Y(t,n.target,n.anchor,n.customElement),L();}b(h);}class J{$destroy(){P(this,1),this.$destroy=e;}$on(e,t){const n=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return n.push(t),()=>{const e=n.indexOf(t);-1!==e&&n.splice(e,1);}}$set(e){var t;this.$$set&&(t=e,0!==Object.keys(t).length)&&(this.$$.skip_bound=!0,this.$$set(e),this.$$.skip_bound=!1);}}var X;function H(e){return e.nodeType===e.ELEMENT_NODE}!function(e){e[e.Document=0]="Document",e[e.DocumentType=1]="DocumentType",e[e.Element=2]="Element",e[e.Text=3]="Text",e[e.CDATA=4]="CDATA",e[e.Comment=5]="Comment";}(X||(X={}));var j=function(){function e(){this.idNodeMap=new Map,this.nodeMetaMap=new WeakMap;}return e.prototype.getId=function(e){var t;if(!e)return -1;var n=null===(t=this.getMeta(e))||void 0===t?void 0:t.id;return null!=n?n:-1},e.prototype.getNode=function(e){return this.idNodeMap.get(e)||null},e.prototype.getIds=function(){return Array.from(this.idNodeMap.keys())},e.prototype.getMeta=function(e){return this.nodeMetaMap.get(e)||null},e.prototype.removeNodeFromMap=function(e){var t=this,n=this.getId(e);this.idNodeMap.delete(n),e.childNodes&&e.childNodes.forEach((function(e){return t.removeNodeFromMap(e)}));},e.prototype.has=function(e){return this.idNodeMap.has(e)},e.prototype.hasNode=function(e){return this.nodeMetaMap.has(e)},e.prototype.add=function(e,t){var n=t.id;this.idNodeMap.set(n,e),this.nodeMetaMap.set(e,t);},e.prototype.replace=function(e,t){var n=this.getNode(e);if(n){var i=this.nodeMetaMap.get(n);i&&this.nodeMetaMap.set(t,i);}this.idNodeMap.set(e,t);},e.prototype.reset=function(){this.idNodeMap=new Map,this.nodeMetaMap=new WeakMap;},e}();function q(){return new j}var ee=/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;function te(e,t){void 0===t&&(t={});var n=1,i=1;function o(e){var t=e.match(/\n/g);t&&(n+=t.length);var o=e.lastIndexOf("\n");i=-1===o?i+e.length:e.length-o;}function r(){var e={line:n,column:i};return function(t){return t.position=new s(e),p(),t}}var s=function(e){this.start=e,this.end={line:n,column:i},this.source=t.source;};s.prototype.content=e;var a=[];function l(o){var r=new Error("".concat(t.source||"",":").concat(n,":").concat(i,": ").concat(o));if(r.reason=o,r.filename=t.source,r.line=n,r.column=i,r.source=e,!t.silent)throw r;a.push(r);}function c(){return h(/^{\s*/)}function d(){return h(/^}/)}function u(){var t,n=[];for(p(),g(n);e.length&&"}"!==e.charAt(0)&&(t=E()||S());)!1!==t&&(n.push(t),g(n));return n}function h(t){var n=t.exec(e);if(n){var i=n[0];return o(i),e=e.slice(i.length),n}}function p(){h(/^\s*/);}function g(e){var t;for(void 0===e&&(e=[]);t=m();)!1!==t&&e.push(t),t=m();return e}function m(){var t=r();if("/"===e.charAt(0)&&"*"===e.charAt(1)){for(var n=2;""!==e.charAt(n)&&("*"!==e.charAt(n)||"/"!==e.charAt(n+1));)++n;if(n+=2,""===e.charAt(n-1))return l("End of comment missing");var s=e.slice(2,n-2);return i+=2,o(s),e=e.slice(n),i+=2,t({type:"comment",comment:s})}}function f(){var e=h(/^([^{]+)/);if(e)return ne(e[0]).replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g,"").replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g,(function(e){return e.replace(/,/g,"‌")})).split(/\s*(?![^(]*\)),\s*/).map((function(e){return e.replace(/\u200C/g,",")}))}function y(){var e=r(),t=h(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);if(t){var n=ne(t[0]);if(!h(/^:\s*/))return l("property missing ':'");var i=h(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/),o=e({type:"declaration",property:n.replace(ee,""),value:i?ne(i[0]).replace(ee,""):""});return h(/^[;\s]*/),o}}function v(){var e,t=[];if(!c())return l("missing '{'");for(g(t);e=y();)!1!==e&&(t.push(e),g(t)),e=y();return d()?t:l("missing '}'")}function C(){for(var e,t=[],n=r();e=h(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/);)t.push(e[1]),h(/^,\s*/);if(t.length)return n({type:"keyframe",values:t,declarations:v()})}var I,A=N("import"),b=N("charset"),w=N("namespace");function N(e){var t=new RegExp("^@"+e+"\\s*([^;]+);");return function(){var n=r(),i=h(t);if(i){var o={type:e};return o[e]=i[1].trim(),n(o)}}}function E(){if("@"===e[0])return function(){var e=r(),t=h(/^@([-\w]+)?keyframes\s*/);if(t){var n=t[1];if(!(t=h(/^([-\w]+)\s*/)))return l("@keyframes missing name");var i,o=t[1];if(!c())return l("@keyframes missing '{'");for(var s=g();i=C();)s.push(i),s=s.concat(g());return d()?e({type:"keyframes",name:o,vendor:n,keyframes:s}):l("@keyframes missing '}'")}}()||function(){var e=r(),t=h(/^@media *([^{]+)/);if(t){var n=ne(t[1]);if(!c())return l("@media missing '{'");var i=g().concat(u());return d()?e({type:"media",media:n,rules:i}):l("@media missing '}'")}}()||function(){var e=r(),t=h(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);if(t)return e({type:"custom-media",name:ne(t[1]),media:ne(t[2])})}()||function(){var e=r(),t=h(/^@supports *([^{]+)/);if(t){var n=ne(t[1]);if(!c())return l("@supports missing '{'");var i=g().concat(u());return d()?e({type:"supports",supports:n,rules:i}):l("@supports missing '}'")}}()||A()||b()||w()||function(){var e=r(),t=h(/^@([-\w]+)?document *([^{]+)/);if(t){var n=ne(t[1]),i=ne(t[2]);if(!c())return l("@document missing '{'");var o=g().concat(u());return d()?e({type:"document",document:i,vendor:n,rules:o}):l("@document missing '}'")}}()||function(){var e=r();if(h(/^@page */)){var t=f()||[];if(!c())return l("@page missing '{'");for(var n,i=g();n=y();)i.push(n),i=i.concat(g());return d()?e({type:"page",selectors:t,declarations:i}):l("@page missing '}'")}}()||function(){var e=r();if(h(/^@host\s*/)){if(!c())return l("@host missing '{'");var t=g().concat(u());return d()?e({type:"host",rules:t}):l("@host missing '}'")}}()||function(){var e=r();if(h(/^@font-face\s*/)){if(!c())return l("@font-face missing '{'");for(var t,n=g();t=y();)n.push(t),n=n.concat(g());return d()?e({type:"font-face",declarations:n}):l("@font-face missing '}'")}}()}function S(){var e=r(),t=f();return t?(g(),e({type:"rule",selectors:t,declarations:v()})):l("selector missing")}return ie((I=u(),{type:"stylesheet",stylesheet:{source:t.source,rules:I,parsingErrors:a}}))}function ne(e){return e?e.replace(/^\s+|\s+$/g,""):""}function ie(e,t){for(var n=e&&"string"==typeof e.type,i=n?e:t,o=0,r=Object.keys(e);o<r.length;o++){var s=e[r[o]];Array.isArray(s)?s.forEach((function(e){ie(e,i);})):s&&"object"==typeof s&&ie(s,i);}return n&&Object.defineProperty(e,"parent",{configurable:!0,writable:!0,enumerable:!1,value:t||null}),e}var oe={script:"noscript",altglyph:"altGlyph",altglyphdef:"altGlyphDef",altglyphitem:"altGlyphItem",animatecolor:"animateColor",animatemotion:"animateMotion",animatetransform:"animateTransform",clippath:"clipPath",feblend:"feBlend",fecolormatrix:"feColorMatrix",fecomponenttransfer:"feComponentTransfer",fecomposite:"feComposite",feconvolvematrix:"feConvolveMatrix",fediffuselighting:"feDiffuseLighting",fedisplacementmap:"feDisplacementMap",fedistantlight:"feDistantLight",fedropshadow:"feDropShadow",feflood:"feFlood",fefunca:"feFuncA",fefuncb:"feFuncB",fefuncg:"feFuncG",fefuncr:"feFuncR",fegaussianblur:"feGaussianBlur",feimage:"feImage",femerge:"feMerge",femergenode:"feMergeNode",femorphology:"feMorphology",feoffset:"feOffset",fepointlight:"fePointLight",fespecularlighting:"feSpecularLighting",fespotlight:"feSpotLight",fetile:"feTile",feturbulence:"feTurbulence",foreignobject:"foreignObject",glyphref:"glyphRef",lineargradient:"linearGradient",radialgradient:"radialGradient"};var re=/([^\\]):hover/,se=new RegExp(re.source,"g");function ae(e,t){var n=null==t?void 0:t.stylesWithHoverClass.get(e);if(n)return n;var i=te(e,{silent:!0});if(!i.stylesheet)return e;var o=[];if(i.stylesheet.rules.forEach((function(e){"selectors"in e&&(e.selectors||[]).forEach((function(e){re.test(e)&&o.push(e);}));})),0===o.length)return e;var r=new RegExp(o.filter((function(e,t){return o.indexOf(e)===t})).sort((function(e,t){return t.length-e.length})).map((function(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})).join("|"),"g"),s=e.replace(r,(function(e){var t=e.replace(se,"$1.\\:hover");return "".concat(e,", ").concat(t)}));return null==t||t.stylesWithHoverClass.set(e,s),s}function le(){return {stylesWithHoverClass:new Map}}function ce(e,t){var n=t.doc,i=t.hackCss,o=t.cache;switch(e.type){case X.Document:return n.implementation.createDocument(null,"",null);case X.DocumentType:return n.implementation.createDocumentType(e.name||"html",e.publicId,e.systemId);case X.Element:var r,s=function(e){var t=oe[e.tagName]?oe[e.tagName]:e.tagName;return "link"===t&&e.attributes._cssText&&(t="style"),t}(e);r=e.isSVG?n.createElementNS("http://www.w3.org/2000/svg",s):n.createElement(s);var a={};for(var l in e.attributes)if(Object.prototype.hasOwnProperty.call(e.attributes,l)){var c=e.attributes[l];if("option"!==s||"selected"!==l||!1!==c)if(!0===c&&(c=""),l.startsWith("rr_"))a[l]=c;else {var d="textarea"===s&&"value"===l,u="style"===s&&"_cssText"===l;if(u&&i&&"string"==typeof c&&(c=ae(c,o)),!d&&!u||"string"!=typeof c)try{if(e.isSVG&&"xlink:href"===l)r.setAttributeNS("http://www.w3.org/1999/xlink",l,c.toString());else if("onload"===l||"onclick"===l||"onmouse"===l.substring(0,7))r.setAttribute("_"+l,c.toString());else {if("meta"===s&&"Content-Security-Policy"===e.attributes["http-equiv"]&&"content"===l){r.setAttribute("csp-content",c.toString());continue}"link"===s&&"preload"===e.attributes.rel&&"script"===e.attributes.as||"link"===s&&"prefetch"===e.attributes.rel&&"string"==typeof e.attributes.href&&e.attributes.href.endsWith(".js")||("img"===s&&e.attributes.srcset&&e.attributes.rr_dataURL?r.setAttribute("rrweb-original-srcset",e.attributes.srcset):r.setAttribute(l,c.toString()));}}catch(e){}else {for(var h=n.createTextNode(c),p=0,g=Array.from(r.childNodes);p<g.length;p++){var m=g[p];m.nodeType===r.TEXT_NODE&&r.removeChild(m);}r.appendChild(h);}}}var f=function(t){var n=a[t];if("canvas"===s&&"rr_dataURL"===t){var i=document.createElement("img");i.onload=function(){var e=r.getContext("2d");e&&e.drawImage(i,0,0,i.width,i.height);},i.src=n.toString(),r.RRNodeType&&(r.rr_dataURL=n.toString());}else if("img"===s&&"rr_dataURL"===t){var o=r;o.currentSrc.startsWith("data:")||(o.setAttribute("rrweb-original-src",e.attributes.src),o.src=n.toString());}if("rr_width"===t)r.style.width=n.toString();else if("rr_height"===t)r.style.height=n.toString();else if("rr_mediaCurrentTime"===t&&"number"==typeof n)r.currentTime=n;else if("rr_mediaState"===t)switch(n){case"played":r.play().catch((function(e){return console.warn("media playback error",e)}));break;case"paused":r.pause();}};for(var y in a)f(y);if(e.isShadowHost)if(r.shadowRoot)for(;r.shadowRoot.firstChild;)r.shadowRoot.removeChild(r.shadowRoot.firstChild);else r.attachShadow({mode:"open"});return r;case X.Text:return n.createTextNode(e.isStyle&&i?ae(e.textContent,o):e.textContent);case X.CDATA:return n.createCDATASection(e.textContent);case X.Comment:return n.createComment(e.textContent);default:return null}}function de(e,t){var n=t.doc,i=t.mirror,o=t.skipChild,r=void 0!==o&&o,s=t.hackCss,a=void 0===s||s,l=t.afterAppend,c=t.cache,d=ce(e,{doc:n,hackCss:a,cache:c});if(!d)return null;if(e.rootId&&i.getNode(e.rootId)!==n&&i.replace(e.rootId,n),e.type===X.Document&&(n.close(),n.open(),"BackCompat"===e.compatMode&&e.childNodes&&e.childNodes[0].type!==X.DocumentType&&(e.childNodes[0].type===X.Element&&"xmlns"in e.childNodes[0].attributes&&"http://www.w3.org/1999/xhtml"===e.childNodes[0].attributes.xmlns?n.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">'):n.write('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">')),d=n),i.add(d,e),(e.type===X.Document||e.type===X.Element)&&!r)for(var u=0,h=e.childNodes;u<h.length;u++){var p=h[u],g=de(p,{doc:n,mirror:i,skipChild:!1,hackCss:a,afterAppend:l,cache:c});g?(p.isShadow&&H(d)&&d.shadowRoot?d.shadowRoot.appendChild(g):d.appendChild(g),l&&l(g,p.id)):console.warn("Failed to rebuild",p);}return d}function ue(e,t){var n=t.doc,i=t.onVisit,o=t.hackCss,r=void 0===o||o,s=t.afterAppend,a=t.cache,l=t.mirror,c=void 0===l?new j:l,d=de(e,{doc:n,mirror:c,skipChild:!1,hackCss:r,afterAppend:s,cache:a});return function(e,t){for(var n=0,i=e.getIds();n<i.length;n++){var o=i[n];e.has(o)&&t(e.getNode(o));}}(c,(function(e){i&&i(e),function(e,t){var n=t.getMeta(e);if((null==n?void 0:n.type)===X.Element){var i=e;for(var o in n.attributes)if(Object.prototype.hasOwnProperty.call(n.attributes,o)&&o.startsWith("rr_")){var r=n.attributes[o];"rr_scrollLeft"===o&&(i.scrollLeft=r),"rr_scrollTop"===o&&(i.scrollTop=r);}}}(e,c);})),d}const he="Please stop import mirror directly. Instead of that,\r\nnow you can use replayer.getMirror() to access the mirror instance of a replayer,\r\nor you can use record.mirror to access the mirror instance during recording.";let pe={map:{},getId:()=>(console.error(he),-1),getNode:()=>(console.error(he),null),removeNodeFromMap(){console.error(he);},has:()=>(console.error(he),!1),reset(){console.error(he);}};function ge(e){const t={},n=(e,n)=>{const i={value:e,parent:n,children:[]};return t[e.node.id]=i,i},i=[];for(const o of e){const{nextId:e,parentId:r}=o;if(e&&e in t){const r=t[e];if(r.parent){const e=r.parent.children.indexOf(r);r.parent.children.splice(e,0,n(o,r.parent));}else {const e=i.indexOf(r);i.splice(e,0,n(o,null));}}else if(r in t){const e=t[r];e.children.push(n(o,e));}else i.push(n(o,null));}return i}function me(e,t){t(e.value);for(let n=e.children.length-1;n>=0;n--)me(e.children[n],t);}function fe(e,t){return Boolean("IFRAME"===e.nodeName&&t.getMeta(e))}function ye(e,t){var n,i;const o=null===(i=null===(n=e.ownerDocument)||void 0===n?void 0:n.defaultView)||void 0===i?void 0:i.frameElement;if(!o||o===t)return {x:0,y:0,relativeScale:1,absoluteScale:1};const r=o.getBoundingClientRect(),s=ye(o,t),a=r.height/o.clientHeight;return {x:r.x*s.relativeScale+s.x,y:r.y*s.relativeScale+s.y,relativeScale:a,absoluteScale:s.absoluteScale*a}}function ve(e){return Boolean(null==e?void 0:e.shadowRoot)}function Ce(e,t){const n=e[t[0]];return 1===t.length?n:Ce(n.cssRules[t[1]].cssRules,t.slice(2))}function Ie(e){const t=[...e],n=t.pop();return {positions:t,index:n}}"undefined"!=typeof window&&window.Proxy&&window.Reflect&&(pe=new Proxy(pe,{get:(e,t,n)=>("map"===t&&console.error(he),Reflect.get(e,t,n))}));class Ae{constructor(){this.id=1,this.styleIDMap=new WeakMap,this.idStyleMap=new Map;}getId(e){var t;return null!==(t=this.styleIDMap.get(e))&&void 0!==t?t:-1}has(e){return this.styleIDMap.has(e)}add(e,t){if(this.has(e))return this.getId(e);let n;return n=void 0===t?this.id++:t,this.styleIDMap.set(e,n),this.idStyleMap.set(n,e),n}getStyle(e){return this.idStyleMap.get(e)||null}reset(){this.styleIDMap=new WeakMap,this.idStyleMap=new Map,this.id=1;}generateId(){return this.id++}}var be=(e=>(e[e.DomContentLoaded=0]="DomContentLoaded",e[e.Load=1]="Load",e[e.FullSnapshot=2]="FullSnapshot",e[e.IncrementalSnapshot=3]="IncrementalSnapshot",e[e.Meta=4]="Meta",e[e.Custom=5]="Custom",e[e.Plugin=6]="Plugin",e))(be||{}),we=(e=>(e[e.Mutation=0]="Mutation",e[e.MouseMove=1]="MouseMove",e[e.MouseInteraction=2]="MouseInteraction",e[e.Scroll=3]="Scroll",e[e.ViewportResize=4]="ViewportResize",e[e.Input=5]="Input",e[e.TouchMove=6]="TouchMove",e[e.MediaInteraction=7]="MediaInteraction",e[e.StyleSheetRule=8]="StyleSheetRule",e[e.CanvasMutation=9]="CanvasMutation",e[e.Font=10]="Font",e[e.Log=11]="Log",e[e.Drag=12]="Drag",e[e.StyleDeclaration=13]="StyleDeclaration",e[e.Selection=14]="Selection",e[e.AdoptedStyleSheet=15]="AdoptedStyleSheet",e))(we||{}),Ne=(e=>(e[e.MouseUp=0]="MouseUp",e[e.MouseDown=1]="MouseDown",e[e.Click=2]="Click",e[e.ContextMenu=3]="ContextMenu",e[e.DblClick=4]="DblClick",e[e.Focus=5]="Focus",e[e.Blur=6]="Blur",e[e.TouchStart=7]="TouchStart",e[e.TouchMove_Departed=8]="TouchMove_Departed",e[e.TouchEnd=9]="TouchEnd",e[e.TouchCancel=10]="TouchCancel",e))(Ne||{}),Ee=(e=>(e[e["2D"]=0]="2D",e[e.WebGL=1]="WebGL",e[e.WebGL2=2]="WebGL2",e))(Ee||{}),Se=(e=>(e.Start="start",e.Pause="pause",e.Resume="resume",e.Resize="resize",e.Finish="finish",e.FullsnapshotRebuilded="fullsnapshot-rebuilded",e.LoadStylesheetStart="load-stylesheet-start",e.LoadStylesheetEnd="load-stylesheet-end",e.SkipStart="skip-start",e.SkipEnd="skip-end",e.MouseInteraction="mouse-interaction",e.EventCast="event-cast",e.CustomEvent="custom-event",e.Flush="flush",e.StateChange="state-change",e.PlayBack="play-back",e.Destroy="destroy",e))(Se||{});
    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    function Te(e,t,n,i){return new(n||(n=Promise))((function(o,r){function s(e){try{l(i.next(e));}catch(e){r(e);}}function a(e){try{l(i.throw(e));}catch(e){r(e);}}function l(e){var t;e.done?o(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}l((i=i.apply(e,t||[])).next());}))}for(var De="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",Me="undefined"==typeof Uint8Array?[]:new Uint8Array(256),Re=0;Re<De.length;Re++)Me[De.charCodeAt(Re)]=Re;var xe=null;try{var ke="undefined"!=typeof module&&"function"==typeof module.require&&module.require("worker_threads")||"function"==typeof __non_webpack_require__&&__non_webpack_require__("worker_threads")||"function"==typeof require&&require("worker_threads");xe=ke.Worker;}catch(Ht){}function Fe(e,t,n){var i=void 0===t?null:t,o=function(e,t){return Buffer.from(e,"base64").toString(t?"utf16":"utf8")}(e,void 0!==n&&n),r=o.indexOf("\n",10)+1,s=o.substring(r)+(i?"//# sourceMappingURL="+i:"");return function(e){return new xe(s,Object.assign({},e,{eval:!0}))}}var Oe,Be,Le,Ve,_e="[object process]"===Object.prototype.toString.call("undefined"!=typeof process?process:0);Oe="Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwooZnVuY3Rpb24gKCkgewogICAgJ3VzZSBzdHJpY3QnOwoKICAgIC8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg0KICAgIENvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLg0KDQogICAgUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55DQogICAgcHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLg0KDQogICAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICJBUyBJUyIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEgNCiAgICBSRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkNCiAgICBBTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsDQogICAgSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NDQogICAgTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1INCiAgICBPVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SDQogICAgUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS4NCiAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqLw0KDQogICAgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikgew0KICAgICAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH0NCiAgICAgICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7DQogICAgICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9DQogICAgICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvclsidGhyb3ciXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9DQogICAgICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfQ0KICAgICAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpOw0KICAgICAgICB9KTsNCiAgICB9CgogICAgLyoKICAgICAqIGJhc2U2NC1hcnJheWJ1ZmZlciAxLjAuMSA8aHR0cHM6Ly9naXRodWIuY29tL25pa2xhc3ZoL2Jhc2U2NC1hcnJheWJ1ZmZlcj4KICAgICAqIENvcHlyaWdodCAoYykgMjAyMSBOaWtsYXMgdm9uIEhlcnR6ZW4gPGh0dHBzOi8vaGVydHplbi5jb20+CiAgICAgKiBSZWxlYXNlZCB1bmRlciBNSVQgTGljZW5zZQogICAgICovCiAgICB2YXIgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7CiAgICAvLyBVc2UgYSBsb29rdXAgdGFibGUgdG8gZmluZCB0aGUgaW5kZXguCiAgICB2YXIgbG9va3VwID0gdHlwZW9mIFVpbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnID8gW10gOiBuZXcgVWludDhBcnJheSgyNTYpOwogICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFycy5sZW5ndGg7IGkrKykgewogICAgICAgIGxvb2t1cFtjaGFycy5jaGFyQ29kZUF0KGkpXSA9IGk7CiAgICB9CiAgICB2YXIgZW5jb2RlID0gZnVuY3Rpb24gKGFycmF5YnVmZmVyKSB7CiAgICAgICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXlidWZmZXIpLCBpLCBsZW4gPSBieXRlcy5sZW5ndGgsIGJhc2U2NCA9ICcnOwogICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gMykgewogICAgICAgICAgICBiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaV0gPj4gMl07CiAgICAgICAgICAgIGJhc2U2NCArPSBjaGFyc1soKGJ5dGVzW2ldICYgMykgPDwgNCkgfCAoYnl0ZXNbaSArIDFdID4+IDQpXTsKICAgICAgICAgICAgYmFzZTY0ICs9IGNoYXJzWygoYnl0ZXNbaSArIDFdICYgMTUpIDw8IDIpIHwgKGJ5dGVzW2kgKyAyXSA+PiA2KV07CiAgICAgICAgICAgIGJhc2U2NCArPSBjaGFyc1tieXRlc1tpICsgMl0gJiA2M107CiAgICAgICAgfQogICAgICAgIGlmIChsZW4gJSAzID09PSAyKSB7CiAgICAgICAgICAgIGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDEpICsgJz0nOwogICAgICAgIH0KICAgICAgICBlbHNlIGlmIChsZW4gJSAzID09PSAxKSB7CiAgICAgICAgICAgIGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDIpICsgJz09JzsKICAgICAgICB9CiAgICAgICAgcmV0dXJuIGJhc2U2NDsKICAgIH07CgogICAgY29uc3QgbGFzdEJsb2JNYXAgPSBuZXcgTWFwKCk7DQogICAgY29uc3QgdHJhbnNwYXJlbnRCbG9iTWFwID0gbmV3IE1hcCgpOw0KICAgIGZ1bmN0aW9uIGdldFRyYW5zcGFyZW50QmxvYkZvcih3aWR0aCwgaGVpZ2h0LCBkYXRhVVJMT3B0aW9ucykgew0KICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkgew0KICAgICAgICAgICAgY29uc3QgaWQgPSBgJHt3aWR0aH0tJHtoZWlnaHR9YDsNCiAgICAgICAgICAgIGlmICgnT2Zmc2NyZWVuQ2FudmFzJyBpbiBnbG9iYWxUaGlzKSB7DQogICAgICAgICAgICAgICAgaWYgKHRyYW5zcGFyZW50QmxvYk1hcC5oYXMoaWQpKQ0KICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNwYXJlbnRCbG9iTWFwLmdldChpZCk7DQogICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2NyZWVuID0gbmV3IE9mZnNjcmVlbkNhbnZhcyh3aWR0aCwgaGVpZ2h0KTsNCiAgICAgICAgICAgICAgICBvZmZzY3JlZW4uZ2V0Q29udGV4dCgnMmQnKTsNCiAgICAgICAgICAgICAgICBjb25zdCBibG9iID0geWllbGQgb2Zmc2NyZWVuLmNvbnZlcnRUb0Jsb2IoZGF0YVVSTE9wdGlvbnMpOw0KICAgICAgICAgICAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0geWllbGQgYmxvYi5hcnJheUJ1ZmZlcigpOw0KICAgICAgICAgICAgICAgIGNvbnN0IGJhc2U2NCA9IGVuY29kZShhcnJheUJ1ZmZlcik7DQogICAgICAgICAgICAgICAgdHJhbnNwYXJlbnRCbG9iTWFwLnNldChpZCwgYmFzZTY0KTsNCiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZTY0Ow0KICAgICAgICAgICAgfQ0KICAgICAgICAgICAgZWxzZSB7DQogICAgICAgICAgICAgICAgcmV0dXJuICcnOw0KICAgICAgICAgICAgfQ0KICAgICAgICB9KTsNCiAgICB9DQogICAgY29uc3Qgd29ya2VyID0gc2VsZjsNCiAgICB3b3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24gKGUpIHsNCiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHsNCiAgICAgICAgICAgIGlmICgnT2Zmc2NyZWVuQ2FudmFzJyBpbiBnbG9iYWxUaGlzKSB7DQogICAgICAgICAgICAgICAgY29uc3QgeyBpZCwgYml0bWFwLCB3aWR0aCwgaGVpZ2h0LCBkYXRhVVJMT3B0aW9ucyB9ID0gZS5kYXRhOw0KICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zcGFyZW50QmFzZTY0ID0gZ2V0VHJhbnNwYXJlbnRCbG9iRm9yKHdpZHRoLCBoZWlnaHQsIGRhdGFVUkxPcHRpb25zKTsNCiAgICAgICAgICAgICAgICBjb25zdCBvZmZzY3JlZW4gPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKHdpZHRoLCBoZWlnaHQpOw0KICAgICAgICAgICAgICAgIGNvbnN0IGN0eCA9IG9mZnNjcmVlbi5nZXRDb250ZXh0KCcyZCcpOw0KICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoYml0bWFwLCAwLCAwKTsNCiAgICAgICAgICAgICAgICBiaXRtYXAuY2xvc2UoKTsNCiAgICAgICAgICAgICAgICBjb25zdCBibG9iID0geWllbGQgb2Zmc2NyZWVuLmNvbnZlcnRUb0Jsb2IoZGF0YVVSTE9wdGlvbnMpOw0KICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBibG9iLnR5cGU7DQogICAgICAgICAgICAgICAgY29uc3QgYXJyYXlCdWZmZXIgPSB5aWVsZCBibG9iLmFycmF5QnVmZmVyKCk7DQogICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0ID0gZW5jb2RlKGFycmF5QnVmZmVyKTsNCiAgICAgICAgICAgICAgICBpZiAoIWxhc3RCbG9iTWFwLmhhcyhpZCkgJiYgKHlpZWxkIHRyYW5zcGFyZW50QmFzZTY0KSA9PT0gYmFzZTY0KSB7DQogICAgICAgICAgICAgICAgICAgIGxhc3RCbG9iTWFwLnNldChpZCwgYmFzZTY0KTsNCiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdvcmtlci5wb3N0TWVzc2FnZSh7IGlkIH0pOw0KICAgICAgICAgICAgICAgIH0NCiAgICAgICAgICAgICAgICBpZiAobGFzdEJsb2JNYXAuZ2V0KGlkKSA9PT0gYmFzZTY0KQ0KICAgICAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VyLnBvc3RNZXNzYWdlKHsgaWQgfSk7DQogICAgICAgICAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKHsNCiAgICAgICAgICAgICAgICAgICAgaWQsDQogICAgICAgICAgICAgICAgICAgIHR5cGUsDQogICAgICAgICAgICAgICAgICAgIGJhc2U2NCwNCiAgICAgICAgICAgICAgICAgICAgd2lkdGgsDQogICAgICAgICAgICAgICAgICAgIGhlaWdodCwNCiAgICAgICAgICAgICAgICB9KTsNCiAgICAgICAgICAgICAgICBsYXN0QmxvYk1hcC5zZXQoaWQsIGJhc2U2NCk7DQogICAgICAgICAgICB9DQogICAgICAgICAgICBlbHNlIHsNCiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VyLnBvc3RNZXNzYWdlKHsgaWQ6IGUuZGF0YS5pZCB9KTsNCiAgICAgICAgICAgIH0NCiAgICAgICAgfSk7DQogICAgfTsKCn0pKCk7Cgo=",Be=null,Le=!1,_e?Fe(Oe,Be,Le):function(e,t,n){}(),function(e){e[e.Document=0]="Document",e[e.DocumentType=1]="DocumentType",e[e.Element=2]="Element",e[e.Text=3]="Text",e[e.CDATA=4]="CDATA",e[e.Comment=5]="Comment";}(Ve||(Ve={}));var Ge=function(){function e(){this.idNodeMap=new Map,this.nodeMetaMap=new WeakMap;}return e.prototype.getId=function(e){var t;if(!e)return -1;var n=null===(t=this.getMeta(e))||void 0===t?void 0:t.id;return null!=n?n:-1},e.prototype.getNode=function(e){return this.idNodeMap.get(e)||null},e.prototype.getIds=function(){return Array.from(this.idNodeMap.keys())},e.prototype.getMeta=function(e){return this.nodeMetaMap.get(e)||null},e.prototype.removeNodeFromMap=function(e){var t=this,n=this.getId(e);this.idNodeMap.delete(n),e.childNodes&&e.childNodes.forEach((function(e){return t.removeNodeFromMap(e)}));},e.prototype.has=function(e){return this.idNodeMap.has(e)},e.prototype.hasNode=function(e){return this.nodeMetaMap.has(e)},e.prototype.add=function(e,t){var n=t.id;this.idNodeMap.set(n,e),this.nodeMetaMap.set(e,t);},e.prototype.replace=function(e,t){var n=this.getNode(e);if(n){var i=this.nodeMetaMap.get(n);i&&this.nodeMetaMap.set(t,i);}this.idNodeMap.set(e,t);},e.prototype.reset=function(){this.idNodeMap=new Map,this.nodeMetaMap=new WeakMap;},e}();function We(e){const t=[];for(const n in e){const i=e[n];if("string"!=typeof i)continue;const o=Ye(n);t.push(`${o}: ${i};`);}return t.join(" ")}const Ue=/-([a-z])/g,Ze=/^--[a-zA-Z0-9-]+$/,$e=e=>Ze.test(e)?e:e.replace(Ue,((e,t)=>t?t.toUpperCase():"")),Ke=/\B([A-Z])/g,Ye=e=>e.replace(Ke,"-$1").toLowerCase();class Pe{constructor(...e){this.childNodes=[],this.parentElement=null,this.parentNode=null,this.ELEMENT_NODE=qe.ELEMENT_NODE,this.TEXT_NODE=qe.TEXT_NODE;}get firstChild(){return this.childNodes[0]||null}get lastChild(){return this.childNodes[this.childNodes.length-1]||null}get nextSibling(){const e=this.parentNode;if(!e)return null;const t=e.childNodes,n=t.indexOf(this);return t[n+1]||null}contains(e){if(e===this)return !0;for(const t of this.childNodes)if(t.contains(e))return !0;return !1}appendChild(e){throw new Error("RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.")}insertBefore(e,t){throw new Error("RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.")}removeChild(e){throw new Error("RRDomException: Failed to execute 'removeChild' on 'RRNode': This RRNode type does not support this method.")}toString(){return "RRNode"}}function Qe(e){return class extends e{constructor(e,t,n){super(),this.nodeType=qe.DOCUMENT_TYPE_NODE,this.RRNodeType=Ve.DocumentType,this.textContent=null,this.name=e,this.publicId=t,this.systemId=n,this.nodeName=e;}toString(){return "RRDocumentType"}}}function ze(e){return class extends e{constructor(e){super(),this.nodeType=qe.ELEMENT_NODE,this.RRNodeType=Ve.Element,this.attributes={},this.shadowRoot=null,this.tagName=e.toUpperCase(),this.nodeName=e.toUpperCase();}get textContent(){let e="";return this.childNodes.forEach((t=>e+=t.textContent)),e}set textContent(e){this.childNodes=[this.ownerDocument.createTextNode(e)];}get classList(){return new je(this.attributes.class,(e=>{this.attributes.class=e;}))}get id(){return this.attributes.id||""}get className(){return this.attributes.class||""}get style(){const e=this.attributes.style?function(e){const t={},n=/:(.+)/;return e.replace(/\/\*.*?\*\//g,"").split(/;(?![^(]*\))/g).forEach((function(e){if(e){const i=e.split(n);i.length>1&&(t[$e(i[0].trim())]=i[1].trim());}})),t}(this.attributes.style):{},t=/\B([A-Z])/g;return e.setProperty=(n,i,o)=>{if(t.test(n))return;const r=$e(n);i?e[r]=i:delete e[r],"important"===o&&(e[r]+=" !important"),this.attributes.style=We(e);},e.removeProperty=n=>{if(t.test(n))return "";const i=$e(n),o=e[i]||"";return delete e[i],this.attributes.style=We(e),o},e}getAttribute(e){return this.attributes[e]||null}setAttribute(e,t){this.attributes[e]=t;}setAttributeNS(e,t,n){this.setAttribute(t,n);}removeAttribute(e){delete this.attributes[e];}appendChild(e){return this.childNodes.push(e),e.parentNode=this,e.parentElement=this,e}insertBefore(e,t){if(null===t)return this.appendChild(e);const n=this.childNodes.indexOf(t);if(-1==n)throw new Error("Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.");return this.childNodes.splice(n,0,e),e.parentElement=this,e.parentNode=this,e}removeChild(e){const t=this.childNodes.indexOf(e);if(-1===t)throw new Error("Failed to execute 'removeChild' on 'RRElement': The RRNode to be removed is not a child of this RRNode.");return this.childNodes.splice(t,1),e.parentElement=null,e.parentNode=null,e}attachShadow(e){const t=this.ownerDocument.createElement("SHADOWROOT");return this.shadowRoot=t,t}dispatchEvent(e){return !0}toString(){let e="";for(const t in this.attributes)e+=`${t}="${this.attributes[t]}" `;return `${this.tagName} ${e}`}}}function Je(e){return class extends e{constructor(e){super(),this.nodeType=qe.TEXT_NODE,this.nodeName="#text",this.RRNodeType=Ve.Text,this.data=e;}get textContent(){return this.data}set textContent(e){this.data=e;}toString(){return `RRText text=${JSON.stringify(this.data)}`}}}function Xe(e){return class extends e{constructor(e){super(),this.nodeType=qe.COMMENT_NODE,this.nodeName="#comment",this.RRNodeType=Ve.Comment,this.data=e;}get textContent(){return this.data}set textContent(e){this.data=e;}toString(){return `RRComment text=${JSON.stringify(this.data)}`}}}function He(e){return class extends e{constructor(e){super(),this.nodeName="#cdata-section",this.nodeType=qe.CDATA_SECTION_NODE,this.RRNodeType=Ve.CDATA,this.data=e;}get textContent(){return this.data}set textContent(e){this.data=e;}toString(){return `RRCDATASection data=${JSON.stringify(this.data)}`}}}class je{constructor(e,t){if(this.classes=[],this.add=(...e)=>{for(const t of e){const e=String(t);this.classes.indexOf(e)>=0||this.classes.push(e);}this.onChange&&this.onChange(this.classes.join(" "));},this.remove=(...e)=>{this.classes=this.classes.filter((t=>-1===e.indexOf(t))),this.onChange&&this.onChange(this.classes.join(" "));},e){const t=e.trim().split(/\s+/);this.classes.push(...t);}this.onChange=t;}}var qe;!function(e){e[e.PLACEHOLDER=0]="PLACEHOLDER",e[e.ELEMENT_NODE=1]="ELEMENT_NODE",e[e.ATTRIBUTE_NODE=2]="ATTRIBUTE_NODE",e[e.TEXT_NODE=3]="TEXT_NODE",e[e.CDATA_SECTION_NODE=4]="CDATA_SECTION_NODE",e[e.ENTITY_REFERENCE_NODE=5]="ENTITY_REFERENCE_NODE",e[e.ENTITY_NODE=6]="ENTITY_NODE",e[e.PROCESSING_INSTRUCTION_NODE=7]="PROCESSING_INSTRUCTION_NODE",e[e.COMMENT_NODE=8]="COMMENT_NODE",e[e.DOCUMENT_NODE=9]="DOCUMENT_NODE",e[e.DOCUMENT_TYPE_NODE=10]="DOCUMENT_TYPE_NODE",e[e.DOCUMENT_FRAGMENT_NODE=11]="DOCUMENT_FRAGMENT_NODE";}(qe||(qe={}));const et={svg:"http://www.w3.org/2000/svg","xlink:href":"http://www.w3.org/1999/xlink",xmlns:"http://www.w3.org/2000/xmlns/"},tt={altglyph:"altGlyph",altglyphdef:"altGlyphDef",altglyphitem:"altGlyphItem",animatecolor:"animateColor",animatemotion:"animateMotion",animatetransform:"animateTransform",clippath:"clipPath",feblend:"feBlend",fecolormatrix:"feColorMatrix",fecomponenttransfer:"feComponentTransfer",fecomposite:"feComposite",feconvolvematrix:"feConvolveMatrix",fediffuselighting:"feDiffuseLighting",fedisplacementmap:"feDisplacementMap",fedistantlight:"feDistantLight",fedropshadow:"feDropShadow",feflood:"feFlood",fefunca:"feFuncA",fefuncb:"feFuncB",fefuncg:"feFuncG",fefuncr:"feFuncR",fegaussianblur:"feGaussianBlur",feimage:"feImage",femerge:"feMerge",femergenode:"feMergeNode",femorphology:"feMorphology",feoffset:"feOffset",fepointlight:"fePointLight",fespecularlighting:"feSpecularLighting",fespotlight:"feSpotLight",fetile:"feTile",feturbulence:"feTurbulence",foreignobject:"foreignObject",glyphref:"glyphRef",lineargradient:"linearGradient",radialgradient:"radialGradient"};function nt(e,t,n,i){const o=e.childNodes,r=t.childNodes;i=i||t.mirror||t.ownerDocument.mirror,(o.length>0||r.length>0)&&it(Array.from(o),r,e,n,i);let s=null,a=null;switch(t.RRNodeType){case Ve.Document:a=t.scrollData;break;case Ve.Element:{const o=e,r=t;switch(function(e,t,n){const i=e.attributes,o=t.attributes;for(const i in o){const r=o[i],s=n.getMeta(t);if(s&&"isSVG"in s&&s.isSVG&&et[i])e.setAttributeNS(et[i],i,r);else if("CANVAS"===t.tagName&&"rr_dataURL"===i){const t=document.createElement("img");t.src=r,t.onload=()=>{const n=e.getContext("2d");n&&n.drawImage(t,0,0,t.width,t.height);};}else e.setAttribute(i,r);}for(const{name:t}of Array.from(i))t in o||e.removeAttribute(t);t.scrollLeft&&(e.scrollLeft=t.scrollLeft),t.scrollTop&&(e.scrollTop=t.scrollTop);}(o,r,i),a=r.scrollData,s=r.inputData,r.tagName){case"AUDIO":case"VIDEO":{const t=e,n=r;void 0!==n.paused&&(n.paused?t.pause():t.play()),void 0!==n.muted&&(t.muted=n.muted),void 0!==n.volume&&(t.volume=n.volume),void 0!==n.currentTime&&(t.currentTime=n.currentTime),void 0!==n.playbackRate&&(t.playbackRate=n.playbackRate);break}case"CANVAS":{const i=t;if(null!==i.rr_dataURL){const e=document.createElement("img");e.onload=()=>{const t=o.getContext("2d");t&&t.drawImage(e,0,0,e.width,e.height);},e.src=i.rr_dataURL;}i.canvasMutations.forEach((t=>n.applyCanvas(t.event,t.mutation,e)));}break;case"STYLE":{const e=o.sheet;e&&t.rules.forEach((t=>n.applyStyleSheetMutation(t,e)));}}if(r.shadowRoot){o.shadowRoot||o.attachShadow({mode:"open"});const e=o.shadowRoot.childNodes,t=r.shadowRoot.childNodes;(e.length>0||t.length>0)&&it(Array.from(e),t,o.shadowRoot,n,i);}break}case Ve.Text:case Ve.Comment:case Ve.CDATA:e.textContent!==t.data&&(e.textContent=t.data);}if(a&&n.applyScroll(a,!0),s&&n.applyInput(s),"IFRAME"===t.nodeName){const o=e.contentDocument,r=t;if(o){const e=i.getMeta(r.contentDocument);e&&n.mirror.add(o,Object.assign({},e)),nt(o,r.contentDocument,n,i);}}}function it(e,t,n,i,o){var r;let s,a,l=0,c=e.length-1,d=0,u=t.length-1,h=e[l],p=e[c],g=t[d],m=t[u];for(;l<=c&&d<=u;){const f=i.mirror.getId(h),y=i.mirror.getId(p),v=o.getId(g),C=o.getId(m);if(void 0===h)h=e[++l];else if(void 0===p)p=e[--c];else if(-1!==f&&f===v)nt(h,g,i,o),h=e[++l],g=t[++d];else if(-1!==y&&y===C)nt(p,m,i,o),p=e[--c],m=t[--u];else if(-1!==f&&f===C)n.insertBefore(h,p.nextSibling),nt(h,m,i,o),h=e[++l],m=t[--u];else if(-1!==y&&y===v)n.insertBefore(p,h),nt(p,g,i,o),p=e[--c],g=t[++d];else {if(!s){s={};for(let t=l;t<=c;t++){const n=e[t];n&&i.mirror.hasNode(n)&&(s[i.mirror.getId(n)]=t);}}if(a=s[o.getId(g)],a){const t=e[a];n.insertBefore(t,h),nt(t,g,i,o),e[a]=void 0;}else {const t=ot(g,i.mirror,o);"#document"===n.nodeName&&(null===(r=i.mirror.getMeta(t))||void 0===r?void 0:r.type)===Ve.Element&&n.documentElement&&(n.removeChild(n.documentElement),e[l]=void 0,h=void 0),n.insertBefore(t,h||null),nt(t,g,i,o);}g=t[++d];}}if(l>c){const e=t[u+1];let r=null;for(e&&n.childNodes.forEach((t=>{i.mirror.getId(t)===o.getId(e)&&(r=t);}));d<=u;++d){const e=ot(t[d],i.mirror,o);n.insertBefore(e,r),nt(e,t[d],i,o);}}else if(d>u)for(;l<=c;l++){const t=e[l];t&&(n.removeChild(t),i.mirror.removeNodeFromMap(t));}}function ot(e,t,n){const i=n.getId(e),o=n.getMeta(e);let r=null;if(i>-1&&(r=t.getNode(i)),null!==r)return r;switch(e.RRNodeType){case Ve.Document:r=new Document;break;case Ve.DocumentType:r=document.implementation.createDocumentType(e.name,e.publicId,e.systemId);break;case Ve.Element:{let t=e.tagName.toLowerCase();t=tt[t]||t,r=o&&"isSVG"in o&&(null==o?void 0:o.isSVG)?document.createElementNS(et.svg,t):document.createElement(e.tagName);break}case Ve.Text:r=document.createTextNode(e.data);break;case Ve.Comment:r=document.createComment(e.data);break;case Ve.CDATA:r=document.createCDATASection(e.data);}return o&&t.add(r,Object.assign({},o)),r}class rt extends(function(e){return class t extends e{constructor(){super(...arguments),this.nodeType=qe.DOCUMENT_NODE,this.nodeName="#document",this.compatMode="CSS1Compat",this.RRNodeType=Ve.Document,this.textContent=null;}get documentElement(){return this.childNodes.find((e=>e.RRNodeType===Ve.Element&&"HTML"===e.tagName))||null}get body(){var e;return (null===(e=this.documentElement)||void 0===e?void 0:e.childNodes.find((e=>e.RRNodeType===Ve.Element&&"BODY"===e.tagName)))||null}get head(){var e;return (null===(e=this.documentElement)||void 0===e?void 0:e.childNodes.find((e=>e.RRNodeType===Ve.Element&&"HEAD"===e.tagName)))||null}get implementation(){return this}get firstElementChild(){return this.documentElement}appendChild(e){const t=e.RRNodeType;if((t===Ve.Element||t===Ve.DocumentType)&&this.childNodes.some((e=>e.RRNodeType===t)))throw new Error(`RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${t===Ve.Element?"RRElement":"RRDoctype"} on RRDocument allowed.`);return e.parentElement=null,e.parentNode=this,this.childNodes.push(e),e}insertBefore(e,t){const n=e.RRNodeType;if((n===Ve.Element||n===Ve.DocumentType)&&this.childNodes.some((e=>e.RRNodeType===n)))throw new Error(`RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one ${n===Ve.Element?"RRElement":"RRDoctype"} on RRDocument allowed.`);if(null===t)return this.appendChild(e);const i=this.childNodes.indexOf(t);if(-1==i)throw new Error("Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.");return this.childNodes.splice(i,0,e),e.parentElement=null,e.parentNode=this,e}removeChild(e){const t=this.childNodes.indexOf(e);if(-1===t)throw new Error("Failed to execute 'removeChild' on 'RRDocument': The RRNode to be removed is not a child of this RRNode.");return this.childNodes.splice(t,1),e.parentElement=null,e.parentNode=null,e}open(){this.childNodes=[];}close(){}write(e){let t;if('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">'===e?t="-//W3C//DTD XHTML 1.0 Transitional//EN":'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">'===e&&(t="-//W3C//DTD HTML 4.0 Transitional//EN"),t){const e=this.createDocumentType("html",t,"");this.open(),this.appendChild(e);}}createDocument(e,n,i){return new t}createDocumentType(e,t,n){const i=new(Qe(Pe))(e,t,n);return i.ownerDocument=this,i}createElement(e){const t=new(ze(Pe))(e);return t.ownerDocument=this,t}createElementNS(e,t){return this.createElement(t)}createTextNode(e){const t=new(Je(Pe))(e);return t.ownerDocument=this,t}createComment(e){const t=new(Xe(Pe))(e);return t.ownerDocument=this,t}createCDATASection(e){const t=new(He(Pe))(e);return t.ownerDocument=this,t}toString(){return "RRDocument"}}}(Pe)){constructor(e){super(),this.UNSERIALIZED_STARTING_ID=-2,this._unserializedId=this.UNSERIALIZED_STARTING_ID,this.mirror=new yt,this.scrollData=null,e&&(this.mirror=e);}get unserializedId(){return this._unserializedId--}createDocument(e,t,n){return new rt}createDocumentType(e,t,n){const i=new st(e,t,n);return i.ownerDocument=this,i}createElement(e){const t=e.toUpperCase();let n;switch(t){case"AUDIO":case"VIDEO":n=new lt(t);break;case"IFRAME":n=new ut(t,this.mirror);break;case"CANVAS":n=new ct(t);break;case"STYLE":n=new dt(t);break;default:n=new at(t);}return n.ownerDocument=this,n}createComment(e){const t=new pt(e);return t.ownerDocument=this,t}createCDATASection(e){const t=new gt(e);return t.ownerDocument=this,t}createTextNode(e){const t=new ht(e);return t.ownerDocument=this,t}destroyTree(){this.childNodes=[],this.mirror.reset();}open(){super.open(),this._unserializedId=this.UNSERIALIZED_STARTING_ID;}}const st=Qe(Pe);class at extends(ze(Pe)){constructor(){super(...arguments),this.inputData=null,this.scrollData=null;}}class lt extends(function(e){return class extends e{attachShadow(e){throw new Error("RRDomException: Failed to execute 'attachShadow' on 'RRElement': This RRElement does not support attachShadow")}play(){this.paused=!1;}pause(){this.paused=!0;}}}(at)){}class ct extends at{constructor(){super(...arguments),this.rr_dataURL=null,this.canvasMutations=[];}getContext(){return null}}class dt extends at{constructor(){super(...arguments),this.rules=[];}}class ut extends at{constructor(e,t){super(e),this.contentDocument=new rt,this.contentDocument.mirror=t;}}const ht=Je(Pe),pt=Xe(Pe),gt=He(Pe);function mt(e,t,n,i){let o;switch(e.nodeType){case qe.DOCUMENT_NODE:i&&"IFRAME"===i.nodeName?o=i.contentDocument:(o=t,o.compatMode=e.compatMode);break;case qe.DOCUMENT_TYPE_NODE:{const n=e;o=t.createDocumentType(n.name,n.publicId,n.systemId);break}case qe.ELEMENT_NODE:{const n=e,i=function(e){return e instanceof HTMLFormElement?"FORM":e.tagName.toUpperCase()}(n);o=t.createElement(i);const r=o;for(const{name:e,value:t}of Array.from(n.attributes))r.attributes[e]=t;n.scrollLeft&&(r.scrollLeft=n.scrollLeft),n.scrollTop&&(r.scrollTop=n.scrollTop);break}case qe.TEXT_NODE:o=t.createTextNode(e.textContent||"");break;case qe.CDATA_SECTION_NODE:o=t.createCDATASection(e.data);break;case qe.COMMENT_NODE:o=t.createComment(e.textContent||"");break;case qe.DOCUMENT_FRAGMENT_NODE:o=i.attachShadow({mode:"open"});break;default:return null}let r=n.getMeta(e);return t instanceof rt&&(r||(r=vt(o,t.unserializedId),n.add(e,r)),t.mirror.add(o,Object.assign({},r))),o}function ft(e,t=function(){return new Ge}(),n=new rt){return function e(i,o){const r=mt(i,n,t,o);if(null!==r)if("IFRAME"!==(null==o?void 0:o.nodeName)&&i.nodeType!==qe.DOCUMENT_FRAGMENT_NODE&&(null==o||o.appendChild(r),r.parentNode=o,r.parentElement=o),"IFRAME"===i.nodeName){const t=i.contentDocument;t&&e(t,r);}else i.nodeType!==qe.DOCUMENT_NODE&&i.nodeType!==qe.ELEMENT_NODE&&i.nodeType!==qe.DOCUMENT_FRAGMENT_NODE||(i.nodeType===qe.ELEMENT_NODE&&i.shadowRoot&&e(i.shadowRoot,r),i.childNodes.forEach((t=>e(t,r))));}(e,null),n}class yt{constructor(){this.idNodeMap=new Map,this.nodeMetaMap=new WeakMap;}getId(e){var t;if(!e)return -1;const n=null===(t=this.getMeta(e))||void 0===t?void 0:t.id;return null!=n?n:-1}getNode(e){return this.idNodeMap.get(e)||null}getIds(){return Array.from(this.idNodeMap.keys())}getMeta(e){return this.nodeMetaMap.get(e)||null}removeNodeFromMap(e){const t=this.getId(e);this.idNodeMap.delete(t),e.childNodes&&e.childNodes.forEach((e=>this.removeNodeFromMap(e)));}has(e){return this.idNodeMap.has(e)}hasNode(e){return this.nodeMetaMap.has(e)}add(e,t){const n=t.id;this.idNodeMap.set(n,e),this.nodeMetaMap.set(e,t);}replace(e,t){const n=this.getNode(e);if(n){const e=this.nodeMetaMap.get(n);e&&this.nodeMetaMap.set(t,e);}this.idNodeMap.set(e,t);}reset(){this.idNodeMap=new Map,this.nodeMetaMap=new WeakMap;}}function vt(e,t){switch(e.RRNodeType){case Ve.Document:return {id:t,type:e.RRNodeType,childNodes:[]};case Ve.DocumentType:{const n=e;return {id:t,type:e.RRNodeType,name:n.name,publicId:n.publicId,systemId:n.systemId}}case Ve.Element:return {id:t,type:e.RRNodeType,tagName:e.tagName.toLowerCase(),attributes:{},childNodes:[]};case Ve.Text:case Ve.Comment:return {id:t,type:e.RRNodeType,textContent:e.textContent||""};case Ve.CDATA:return {id:t,type:e.RRNodeType,textContent:""}}}var Ct=Uint8Array,It=Uint16Array,At=Uint32Array,bt=new Ct([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),wt=new Ct([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),Nt=new Ct([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Et=function(e,t){for(var n=new It(31),i=0;i<31;++i)n[i]=t+=1<<e[i-1];var o=new At(n[30]);for(i=1;i<30;++i)for(var r=n[i];r<n[i+1];++r)o[r]=r-n[i]<<5|i;return [n,o]},St=Et(bt,2),Tt=St[0],Dt=St[1];Tt[28]=258,Dt[258]=28;for(var Mt=Et(wt,0)[0],Rt=new It(32768),xt=0;xt<32768;++xt){var kt=(43690&xt)>>>1|(21845&xt)<<1;kt=(61680&(kt=(52428&kt)>>>2|(13107&kt)<<2))>>>4|(3855&kt)<<4,Rt[xt]=((65280&kt)>>>8|(255&kt)<<8)>>>1;}var Ft=function(e,t,n){for(var i=e.length,o=0,r=new It(t);o<i;++o)++r[e[o]-1];var s,a=new It(t);for(o=0;o<t;++o)a[o]=a[o-1]+r[o-1]<<1;if(n){s=new It(1<<t);var l=15-t;for(o=0;o<i;++o)if(e[o])for(var c=o<<4|e[o],d=t-e[o],u=a[e[o]-1]++<<d,h=u|(1<<d)-1;u<=h;++u)s[Rt[u]>>>l]=c;}else for(s=new It(i),o=0;o<i;++o)s[o]=Rt[a[e[o]-1]++]>>>15-e[o];return s},Ot=new Ct(288);for(xt=0;xt<144;++xt)Ot[xt]=8;for(xt=144;xt<256;++xt)Ot[xt]=9;for(xt=256;xt<280;++xt)Ot[xt]=7;for(xt=280;xt<288;++xt)Ot[xt]=8;var Bt=new Ct(32);for(xt=0;xt<32;++xt)Bt[xt]=5;var Lt=Ft(Ot,9,1),Vt=Ft(Bt,5,1),_t=function(e){for(var t=e[0],n=1;n<e.length;++n)e[n]>t&&(t=e[n]);return t},Gt=function(e,t,n){var i=t/8>>0;return (e[i]|e[i+1]<<8)>>>(7&t)&n},Wt=function(e,t){var n=t/8>>0;return (e[n]|e[n+1]<<8|e[n+2]<<16)>>>(7&t)},Ut=function(e,t,n){(null==t||t<0)&&(t=0),(null==n||n>e.length)&&(n=e.length);var i=new(e instanceof It?It:e instanceof At?At:Ct)(n-t);return i.set(e.subarray(t,n)),i};function Zt(e,t){return function(e,t,n){var i=e.length,o=!t||n,r=!n||n.i;n||(n={}),t||(t=new Ct(3*i));var s,a=function(e){var n=t.length;if(e>n){var i=new Ct(Math.max(2*n,e));i.set(t),t=i;}},l=n.f||0,c=n.p||0,d=n.b||0,u=n.l,h=n.d,p=n.m,g=n.n,m=8*i;do{if(!u){n.f=l=Gt(e,c,1);var f=Gt(e,c+1,3);if(c+=3,!f){var y=e[(D=((s=c)/8>>0)+(7&s&&1)+4)-4]|e[D-3]<<8,v=D+y;if(v>i){if(r)throw "unexpected EOF";break}o&&a(d+y),t.set(e.subarray(D,v),d),n.b=d+=y,n.p=c=8*v;continue}if(1==f)u=Lt,h=Vt,p=9,g=5;else {if(2!=f)throw "invalid block type";var C=Gt(e,c,31)+257,I=Gt(e,c+10,15)+4,A=C+Gt(e,c+5,31)+1;c+=14;for(var b=new Ct(A),w=new Ct(19),N=0;N<I;++N)w[Nt[N]]=Gt(e,c+3*N,7);c+=3*I;var E=_t(w),S=(1<<E)-1;if(!r&&c+A*(E+7)>m)break;var T=Ft(w,E,1);for(N=0;N<A;){var D,M=T[Gt(e,c,S)];if(c+=15&M,(D=M>>>4)<16)b[N++]=D;else {var R=0,x=0;for(16==D?(x=3+Gt(e,c,3),c+=2,R=b[N-1]):17==D?(x=3+Gt(e,c,7),c+=3):18==D&&(x=11+Gt(e,c,127),c+=7);x--;)b[N++]=R;}}var k=b.subarray(0,C),F=b.subarray(C);p=_t(k),g=_t(F),u=Ft(k,p,1),h=Ft(F,g,1);}if(c>m)throw "unexpected EOF"}o&&a(d+131072);for(var O=(1<<p)-1,B=(1<<g)-1,L=p+g+18;r||c+L<m;){var V=(R=u[Wt(e,c)&O])>>>4;if((c+=15&R)>m)throw "unexpected EOF";if(!R)throw "invalid length/literal";if(V<256)t[d++]=V;else {if(256==V){u=null;break}var _=V-254;if(V>264){var G=bt[N=V-257];_=Gt(e,c,(1<<G)-1)+Tt[N],c+=G;}var W=h[Wt(e,c)&B],U=W>>>4;if(!W)throw "invalid distance";if(c+=15&W,F=Mt[U],U>3&&(G=wt[U],F+=Wt(e,c)&(1<<G)-1,c+=G),c>m)throw "unexpected EOF";o&&a(d+131072);for(var Z=d+_;d<Z;d+=4)t[d]=t[d-F],t[d+1]=t[d+1-F],t[d+2]=t[d+2-F],t[d+3]=t[d+3-F];d=Z;}}n.l=u,n.p=c,n.b=d,u&&(l=1,n.m=p,n.d=h,n.n=g);}while(!l);return d==t.length?t:Ut(t,0,d)}((function(e){if(8!=(15&e[0])||e[0]>>>4>7||(e[0]<<8|e[1])%31)throw "invalid zlib data";if(32&e[1])throw "invalid zlib data: preset dictionaries not supported"}(e),e.subarray(2,-4)),t)}const $t=e=>{if("string"!=typeof e)return e;try{const t=JSON.parse(e);if(t.timestamp)return t}catch(e){}try{const t=JSON.parse(function(e,t){var n="";if(!t&&"undefined"!=typeof TextDecoder)return (new TextDecoder).decode(e);for(var i=0;i<e.length;){var o=e[i++];o<128||t?n+=String.fromCharCode(o):o<224?n+=String.fromCharCode((31&o)<<6|63&e[i++]):o<240?n+=String.fromCharCode((15&o)<<12|(63&e[i++])<<6|63&e[i++]):(o=((15&o)<<18|(63&e[i++])<<12|(63&e[i++])<<6|63&e[i++])-65536,n+=String.fromCharCode(55296|o>>10,56320|1023&o));}return n}(Zt(function(e,t){var n=e.length;if(!t&&"undefined"!=typeof TextEncoder)return (new TextEncoder).encode(e);for(var i=new Ct(e.length+(e.length>>>1)),o=0,r=function(e){i[o++]=e;},s=0;s<n;++s){if(o+5>i.length){var a=new Ct(o+8+(n-s<<1));a.set(i),i=a;}var l=e.charCodeAt(s);l<128||t?r(l):l<2048?(r(192|l>>>6),r(128|63&l)):l>55295&&l<57344?(r(240|(l=65536+(1047552&l)|1023&e.charCodeAt(++s))>>>18),r(128|l>>>12&63),r(128|l>>>6&63),r(128|63&l)):(r(224|l>>>12),r(128|l>>>6&63),r(128|63&l));}return Ut(i,0,o)}(e,!0))));if("v1"===t.v)return t;throw new Error(`These events were packed with packer ${t.v} which is incompatible with current packer v1.`)}catch(e){throw console.error(e),new Error("Unknown data format.")}};function Kt(e){return {all:e=e||new Map,on:function(t,n){var i=e.get(t);i?i.push(n):e.set(t,[n]);},off:function(t,n){var i=e.get(t);i&&(n?i.splice(i.indexOf(n)>>>0,1):e.set(t,[]));},emit:function(t,n){var i=e.get(t);i&&i.slice().map((function(e){e(n);})),(i=e.get("*"))&&i.slice().map((function(e){e(t,n);}));}}}var Yt,Pt=Object.freeze({__proto__:null,default:Kt});function Qt(e=window,t=document){if("scrollBehavior"in t.documentElement.style&&!0!==e.__forceSmoothScrollPolyfill__)return;const n=e.HTMLElement||e.Element,i={scroll:e.scroll||e.scrollTo,scrollBy:e.scrollBy,elementScroll:n.prototype.scroll||a,scrollIntoView:n.prototype.scrollIntoView},o=e.performance&&e.performance.now?e.performance.now.bind(e.performance):Date.now;const r=(s=e.navigator.userAgent,new RegExp(["MSIE ","Trident/","Edge/"].join("|")).test(s)?1:0);var s;function a(e,t){this.scrollLeft=e,this.scrollTop=t;}function l(e){if(null===e||"object"!=typeof e||void 0===e.behavior||"auto"===e.behavior||"instant"===e.behavior)return !0;if("object"==typeof e&&"smooth"===e.behavior)return !1;throw new TypeError("behavior member of ScrollOptions "+e.behavior+" is not a valid value for enumeration ScrollBehavior.")}function c(e,t){return "Y"===t?e.clientHeight+r<e.scrollHeight:"X"===t?e.clientWidth+r<e.scrollWidth:void 0}function d(t,n){const i=e.getComputedStyle(t,null)["overflow"+n];return "auto"===i||"scroll"===i}function u(e){const t=c(e,"Y")&&d(e,"Y"),n=c(e,"X")&&d(e,"X");return t||n}function h(e){for(;e!==t.body&&!1===u(e);)e=e.parentNode||e.host;return e}function p(t){let n,i,r,s=(o()-t.startTime)/468;var a;s=s>1?1:s,a=s,n=.5*(1-Math.cos(Math.PI*a)),i=t.startX+(t.x-t.startX)*n,r=t.startY+(t.y-t.startY)*n,t.method.call(t.scrollable,i,r),i===t.x&&r===t.y||e.requestAnimationFrame(p.bind(e,t));}function g(n,r,s){let l,c,d,u;const h=o();n===t.body?(l=e,c=e.scrollX||e.pageXOffset,d=e.scrollY||e.pageYOffset,u=i.scroll):(l=n,c=n.scrollLeft,d=n.scrollTop,u=a),p({scrollable:l,method:u,startTime:h,startX:c,startY:d,x:r,y:s});}e.scroll=e.scrollTo=function(){void 0!==arguments[0]&&(!0!==l(arguments[0])?g.call(e,t.body,void 0!==arguments[0].left?~~arguments[0].left:e.scrollX||e.pageXOffset,void 0!==arguments[0].top?~~arguments[0].top:e.scrollY||e.pageYOffset):i.scroll.call(e,void 0!==arguments[0].left?arguments[0].left:"object"!=typeof arguments[0]?arguments[0]:e.scrollX||e.pageXOffset,void 0!==arguments[0].top?arguments[0].top:void 0!==arguments[1]?arguments[1]:e.scrollY||e.pageYOffset));},e.scrollBy=function(){void 0!==arguments[0]&&(l(arguments[0])?i.scrollBy.call(e,void 0!==arguments[0].left?arguments[0].left:"object"!=typeof arguments[0]?arguments[0]:0,void 0!==arguments[0].top?arguments[0].top:void 0!==arguments[1]?arguments[1]:0):g.call(e,t.body,~~arguments[0].left+(e.scrollX||e.pageXOffset),~~arguments[0].top+(e.scrollY||e.pageYOffset)));},n.prototype.scroll=n.prototype.scrollTo=function(){if(void 0===arguments[0])return;if(!0===l(arguments[0])){if("number"==typeof arguments[0]&&void 0===arguments[1])throw new SyntaxError("Value could not be converted");return void i.elementScroll.call(this,void 0!==arguments[0].left?~~arguments[0].left:"object"!=typeof arguments[0]?~~arguments[0]:this.scrollLeft,void 0!==arguments[0].top?~~arguments[0].top:void 0!==arguments[1]?~~arguments[1]:this.scrollTop)}const e=arguments[0].left,t=arguments[0].top;g.call(this,this,void 0===e?this.scrollLeft:~~e,void 0===t?this.scrollTop:~~t);},n.prototype.scrollBy=function(){void 0!==arguments[0]&&(!0!==l(arguments[0])?this.scroll({left:~~arguments[0].left+this.scrollLeft,top:~~arguments[0].top+this.scrollTop,behavior:arguments[0].behavior}):i.elementScroll.call(this,void 0!==arguments[0].left?~~arguments[0].left+this.scrollLeft:~~arguments[0]+this.scrollLeft,void 0!==arguments[0].top?~~arguments[0].top+this.scrollTop:~~arguments[1]+this.scrollTop));},n.prototype.scrollIntoView=function(){if(!0===l(arguments[0]))return void i.scrollIntoView.call(this,void 0===arguments[0]||arguments[0]);const n=h(this),o=n.getBoundingClientRect(),r=this.getBoundingClientRect();n!==t.body?(g.call(this,n,n.scrollLeft+r.left-o.left,n.scrollTop+r.top-o.top),"fixed"!==e.getComputedStyle(n).position&&e.scrollBy({left:o.left,top:o.top,behavior:"smooth"})):e.scrollBy({left:r.left,top:r.top,behavior:"smooth"});};}class zt{constructor(e=[],t){this.timeOffset=0,this.raf=null,this.actions=e,this.speed=t.speed,this.liveMode=t.liveMode;}addAction(e){if(!this.actions.length||this.actions[this.actions.length-1].delay<=e.delay)return void this.actions.push(e);const t=this.findActionIndex(e);this.actions.splice(t,0,e);}start(){this.timeOffset=0;let e=performance.now();const t=()=>{const n=performance.now();for(this.timeOffset+=(n-e)*this.speed,e=n;this.actions.length;){const e=this.actions[0];if(!(this.timeOffset>=e.delay))break;this.actions.shift(),e.doAction();}(this.actions.length>0||this.liveMode)&&(this.raf=requestAnimationFrame(t));};this.raf=requestAnimationFrame(t);}clear(){this.raf&&(cancelAnimationFrame(this.raf),this.raf=null),this.actions.length=0;}setSpeed(e){this.speed=e;}toggleLiveMode(e){this.liveMode=e;}isActive(){return null!==this.raf}findActionIndex(e){let t=0,n=this.actions.length-1;for(;t<=n;){const i=Math.floor((t+n)/2);if(this.actions[i].delay<e.delay)t=i+1;else {if(!(this.actions[i].delay>e.delay))return i+1;n=i-1;}}return t}}function Jt(e,t){if(e.type===be.IncrementalSnapshot&&e.data.source===we.MouseMove&&e.data.positions&&e.data.positions.length){const n=e.data.positions[0].timeOffset,i=e.timestamp+n;return e.delay=i-t,i-t}return e.delay=e.timestamp-t,e.delay}
    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */function Xt(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var i,o,r=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(i=r.next()).done;)s.push(i.value);}catch(e){o={error:e};}finally{try{i&&!i.done&&(n=r.return)&&n.call(r);}finally{if(o)throw o.error}}return s}!function(e){e[e.NotStarted=0]="NotStarted",e[e.Running=1]="Running",e[e.Stopped=2]="Stopped";}(Yt||(Yt={}));var Ht={type:"xstate.init"};function jt(e){return void 0===e?[]:[].concat(e)}function qt(e){return {type:"xstate.assign",assignment:e}}function en(e,t){return "string"==typeof(e="string"==typeof e&&t&&t[e]?t[e]:e)?{type:e}:"function"==typeof e?{type:e.name,exec:e}:e}function tn(e){return function(t){return e===t}}function nn(e){return "string"==typeof e?{type:e}:e}function on(e,t){return {value:e,context:t,actions:[],changed:!1,matches:tn(e)}}function rn(e,t,n){var i=t,o=!1;return [e.filter((function(e){if("xstate.assign"===e.type){o=!0;var t=Object.assign({},i);return "function"==typeof e.assignment?t=e.assignment(i,n):Object.keys(e.assignment).forEach((function(o){t[o]="function"==typeof e.assignment[o]?e.assignment[o](i,n):e.assignment[o];})),i=t,!1}return !0})),i,o]}function sn(e,t){void 0===t&&(t={});var n=Xt(rn(jt(e.states[e.initial].entry).map((function(e){return en(e,t.actions)})),e.context,Ht),2),i=n[0],o=n[1],r={config:e,_options:t,initialState:{value:e.initial,actions:i,context:o,matches:tn(e.initial)},transition:function(t,n){var i,o,s="string"==typeof t?{value:t,context:e.context}:t,a=s.value,l=s.context,c=nn(n),d=e.states[a];if(d.on){var u=jt(d.on[c.type]);try{for(var h=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],i=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&i>=e.length&&(e=void 0),{value:e&&e[i++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")}(u),p=h.next();!p.done;p=h.next()){var g=p.value;if(void 0===g)return on(a,l);var m="string"==typeof g?{target:g}:g,f=m.target,y=m.actions,v=void 0===y?[]:y,C=m.cond,I=void 0===C?function(){return !0}:C,A=void 0===f,b=null!=f?f:a,w=e.states[b];if(I(l,c)){var N=Xt(rn((A?jt(v):[].concat(d.exit,v,w.entry).filter((function(e){return e}))).map((function(e){return en(e,r._options.actions)})),l,c),3),E=N[0],S=N[1],T=N[2],D=null!=f?f:a;return {value:D,context:S,actions:E,changed:f!==a||E.length>0||T,matches:tn(D)}}}}catch(e){i={error:e};}finally{try{p&&!p.done&&(o=h.return)&&o.call(h);}finally{if(i)throw i.error}}}return on(a,l)}};return r}var an=function(e,t){return e.actions.forEach((function(n){var i=n.exec;return i&&i(e.context,t)}))};function ln(e){var t=e.initialState,n=Yt.NotStarted,i=new Set,o={_machine:e,send:function(o){n===Yt.Running&&(t=e.transition(t,o),an(t,nn(o)),i.forEach((function(e){return e(t)})));},subscribe:function(e){return i.add(e),e(t),{unsubscribe:function(){return i.delete(e)}}},start:function(i){if(i){var r="object"==typeof i?i:{context:e.config.context,value:i};t={value:r.value,actions:[],context:r.context,matches:tn(r.value)};}return n=Yt.Running,an(t,Ht),o},stop:function(){return n=Yt.Stopped,i.clear(),o},get state(){return t},get status(){return n}};return o}function cn(e,{getCastFn:t,applyEventsSynchronously:n,emitter:i}){const o=sn({id:"player",context:e,initial:"paused",states:{playing:{on:{PAUSE:{target:"paused",actions:["pause"]},CAST_EVENT:{target:"playing",actions:"castEvent"},END:{target:"paused",actions:["resetLastPlayedEvent","pause"]},ADD_EVENT:{target:"playing",actions:["addEvent"]}}},paused:{on:{PLAY:{target:"playing",actions:["recordTimeOffset","play"]},CAST_EVENT:{target:"paused",actions:"castEvent"},TO_LIVE:{target:"live",actions:["startLive"]},ADD_EVENT:{target:"paused",actions:["addEvent"]}}},live:{on:{ADD_EVENT:{target:"live",actions:["addEvent"]},CAST_EVENT:{target:"live",actions:["castEvent"]}}}}},{actions:{castEvent:qt({lastPlayedEvent:(e,t)=>"CAST_EVENT"===t.type?t.payload.event:e.lastPlayedEvent}),recordTimeOffset:qt(((e,t)=>{let n=e.timeOffset;return "payload"in t&&"timeOffset"in t.payload&&(n=t.payload.timeOffset),Object.assign(Object.assign({},e),{timeOffset:n,baselineTime:e.events[0].timestamp+n})})),play(e){var o;const{timer:r,events:s,baselineTime:a,lastPlayedEvent:l}=e;r.clear();for(const e of s)Jt(e,a);const c=function(e,t){for(let n=e.length-1;n>=0;n--){const i=e[n];if(i.type===be.Meta&&i.timestamp<=t)return e.slice(n)}return e}(s,a);let d=null==l?void 0:l.timestamp;(null==l?void 0:l.type)===be.IncrementalSnapshot&&l.data.source===we.MouseMove&&(d=l.timestamp+(null===(o=l.data.positions[0])||void 0===o?void 0:o.timeOffset)),a<(d||0)&&i.emit(Se.PlayBack);const u=new Array;for(const e of c)if(!(d&&d<a&&(e.timestamp<=d||e===l)))if(e.timestamp<a)u.push(e);else {const n=t(e,!1);r.addAction({doAction:()=>{n();},delay:e.delay});}n(u),i.emit(Se.Flush),r.start();},pause(e){e.timer.clear();},resetLastPlayedEvent:qt((e=>Object.assign(Object.assign({},e),{lastPlayedEvent:null}))),startLive:qt({baselineTime:(e,t)=>(e.timer.toggleLiveMode(!0),e.timer.start(),"TO_LIVE"===t.type&&t.payload.baselineTime?t.payload.baselineTime:Date.now())}),addEvent:qt(((e,n)=>{const{baselineTime:i,timer:o,events:r}=e;if("ADD_EVENT"===n.type){const{event:e}=n.payload;Jt(e,i);let s=r.length-1;if(!r[s]||r[s].timestamp<=e.timestamp)r.push(e);else {let t=-1,n=0;for(;n<=s;){const t=Math.floor((n+s)/2);r[t].timestamp<=e.timestamp?n=t+1:s=t-1;}-1===t&&(t=n),r.splice(t,0,e);}const a=e.timestamp<i,l=t(e,a);a?l():o.isActive()&&o.addAction({doAction:()=>{l();},delay:e.delay});}return Object.assign(Object.assign({},e),{events:r})}))}});return ln(o)}const dn=new Map;function un(e,t){let n=dn.get(e);return n||(n=new Map,dn.set(e,n)),n.has(t)||n.set(t,[]),n.get(t)}function hn(e,t,n){return i=>Te(this,void 0,void 0,(function*(){if(i&&"object"==typeof i&&"rr_type"in i){if(n&&(n.isUnchanged=!1),"ImageBitmap"===i.rr_type&&"args"in i){const o=yield hn(e,t,n)(i.args);return yield createImageBitmap.apply(null,o)}if("index"in i){if(n||null===t)return i;const{rr_type:e,index:o}=i;return un(t,e)[o]}if("args"in i){const{rr_type:o,args:r}=i;return new(window[o])(...yield Promise.all(r.map(hn(e,t,n))))}if("base64"in i)return function(e){var t,n,i,o,r,s=.75*e.length,a=e.length,l=0;"="===e[e.length-1]&&(s--,"="===e[e.length-2]&&s--);var c=new ArrayBuffer(s),d=new Uint8Array(c);for(t=0;t<a;t+=4)n=Me[e.charCodeAt(t)],i=Me[e.charCodeAt(t+1)],o=Me[e.charCodeAt(t+2)],r=Me[e.charCodeAt(t+3)],d[l++]=n<<2|i>>4,d[l++]=(15&i)<<4|o>>2,d[l++]=(3&o)<<6|63&r;return c}(i.base64);if("src"in i){const t=e.get(i.src);if(t)return t;{const t=new Image;return t.src=i.src,e.set(i.src,t),t}}if("data"in i&&"Blob"===i.rr_type){const o=yield Promise.all(i.data.map(hn(e,t,n)));return new Blob(o,{type:i.type})}}else if(Array.isArray(i)){return yield Promise.all(i.map(hn(e,t,n)))}return i}))}const pn=["WebGLActiveInfo","WebGLBuffer","WebGLFramebuffer","WebGLProgram","WebGLRenderbuffer","WebGLShader","WebGLShaderPrecisionFormat","WebGLTexture","WebGLUniformLocation","WebGLVertexArrayObject"];function gn({mutation:e,target:t,type:n,imageMap:i,errorHandler:o}){return Te(this,void 0,void 0,(function*(){try{const o=function(e,t){try{return t===Ee.WebGL?e.getContext("webgl")||e.getContext("experimental-webgl"):e.getContext("webgl2")}catch(e){return null}}(t,n);if(!o)return;if(e.setter)return void(o[e.property]=e.args[0]);const r=o[e.property],s=yield Promise.all(e.args.map(hn(i,o)));!function(e,t){if(!(null==t?void 0:t.constructor))return;const{name:n}=t.constructor;if(!pn.includes(n))return;const i=un(e,n);i.includes(t)||i.push(t);}(o,r.apply(o,s));}catch(t){o(e,t);}}))}function mn({event:e,mutation:t,target:n,imageMap:i,errorHandler:o}){return Te(this,void 0,void 0,(function*(){try{const o=n.getContext("2d");if(t.setter)return void(o[t.property]=t.args[0]);const r=o[t.property];if("drawImage"===t.property&&"string"==typeof t.args[0])i.get(e),r.apply(o,t.args);else {const e=yield Promise.all(t.args.map(hn(i,o)));r.apply(o,e);}}catch(e){o(t,e);}}))}function fn({event:e,mutation:t,target:n,imageMap:i,canvasEventMap:o,errorHandler:r}){return Te(this,void 0,void 0,(function*(){try{const s=o.get(e)||t,a="commands"in s?s.commands:[s];if([Ee.WebGL,Ee.WebGL2].includes(t.type)){for(let e=0;e<a.length;e++){const o=a[e];yield gn({mutation:o,type:t.type,target:n,imageMap:i,errorHandler:r});}return}for(let t=0;t<a.length;t++){const o=a[t];yield mn({event:e,mutation:o,target:n,imageMap:i,errorHandler:r});}}catch(e){r(t,e);}}))}const yn=Kt||Pt,vn={duration:500,lineCap:"round",lineWidth:3,strokeStyle:"red"};function Cn(e){return e.type==be.IncrementalSnapshot&&(e.data.source==we.TouchMove||e.data.source==we.MouseInteraction&&e.data.type==Ne.TouchStart)}class In{constructor(e,t){if(this.usingVirtualDom=!1,this.virtualDom=new rt,this.mouseTail=null,this.tailPositions=[],this.emitter=yn(),this.legacy_missingNodeRetryMap={},this.cache=le(),this.imageMap=new Map,this.canvasEventMap=new Map,this.mirror=q(),this.styleMirror=new Ae,this.firstFullSnapshot=null,this.newDocumentQueue=[],this.mousePos=null,this.touchActive=null,this.lastSelectionData=null,this.constructedStyleMutations=[],this.adoptedStyleSheets=[],this.handleResize=e=>{this.iframe.style.display="inherit";for(const t of [this.mouseTail,this.iframe])t&&(t.setAttribute("width",String(e.width)),t.setAttribute("height",String(e.height)));},this.applyEventsSynchronously=e=>{for(const t of e){switch(t.type){case be.DomContentLoaded:case be.Load:case be.Custom:continue;case be.FullSnapshot:case be.Meta:case be.Plugin:case be.IncrementalSnapshot:}this.getCastFn(t,!0)();}!0===this.touchActive?this.mouse.classList.add("touch-active"):!1===this.touchActive&&this.mouse.classList.remove("touch-active"),this.touchActive=null;},this.getCastFn=(e,t=!1)=>{let n;switch(e.type){case be.DomContentLoaded:case be.Load:break;case be.Custom:n=()=>{this.emitter.emit(Se.CustomEvent,e);};break;case be.Meta:n=()=>this.emitter.emit(Se.Resize,{width:e.data.width,height:e.data.height});break;case be.FullSnapshot:n=()=>{var n;if(this.firstFullSnapshot){if(this.firstFullSnapshot===e)return void(this.firstFullSnapshot=!0)}else this.firstFullSnapshot=!0;this.rebuildFullSnapshot(e,t),null===(n=this.iframe.contentWindow)||void 0===n||n.scrollTo(e.data.initialOffset),this.styleMirror.reset();};break;case be.IncrementalSnapshot:n=()=>{if(this.applyIncremental(e,t),!t&&(e===this.nextUserInteractionEvent&&(this.nextUserInteractionEvent=null,this.backToNormal()),this.config.skipInactive&&!this.nextUserInteractionEvent)){for(const t of this.service.state.context.events)if(!(t.timestamp<=e.timestamp)&&this.isUserInteraction(t)){t.delay-e.delay>1e4*this.speedService.state.context.timer.speed&&(this.nextUserInteractionEvent=t);break}if(this.nextUserInteractionEvent){const t=this.nextUserInteractionEvent.delay-e.delay,n={speed:Math.min(Math.round(t/5e3),this.config.maxSpeed)};this.speedService.send({type:"FAST_FORWARD",payload:n}),this.emitter.emit(Se.SkipStart,n);}}};}return ()=>{n&&n();for(const n of this.config.plugins||[])n.handler&&n.handler(e,t,{replayer:this});this.service.send({type:"CAST_EVENT",payload:{event:e}});const i=this.service.state.context.events.length-1;if(e===this.service.state.context.events[i]){const t=()=>{i<this.service.state.context.events.length-1||(this.backToNormal(),this.service.send("END"),this.emitter.emit(Se.Finish));};e.type===be.IncrementalSnapshot&&e.data.source===we.MouseMove&&e.data.positions.length?setTimeout((()=>{t();}),Math.max(0,50-e.data.positions[0].timeOffset)):t();}this.emitter.emit(Se.EventCast,e);}},!(null==t?void 0:t.liveMode)&&e.length<2)throw new Error("Replayer need at least 2 events.");const n={speed:1,maxSpeed:360,root:document.body,loadTimeout:0,skipInactive:!1,showWarning:!0,showDebug:!1,blockClass:"rr-block",liveMode:!1,insertStyleRules:[],triggerFocus:!0,UNSAFE_replayCanvas:!1,pauseAnimation:!0,mouseTail:vn,useVirtualDom:!0};this.config=Object.assign({},n,t),this.handleResize=this.handleResize.bind(this),this.getCastFn=this.getCastFn.bind(this),this.applyEventsSynchronously=this.applyEventsSynchronously.bind(this),this.emitter.on(Se.Resize,this.handleResize),this.setupDom();for(const e of this.config.plugins||[])e.getMirror&&e.getMirror({nodeMirror:this.mirror});this.emitter.on(Se.Flush,(()=>{if(this.usingVirtualDom){const e={mirror:this.mirror,applyCanvas:(e,t,n)=>{fn({event:e,mutation:t,target:n,imageMap:this.imageMap,canvasEventMap:this.canvasEventMap,errorHandler:this.warnCanvasMutationFailed.bind(this)});},applyInput:this.applyInput.bind(this),applyScroll:this.applyScroll.bind(this),applyStyleSheetMutation:(e,t)=>{e.source===we.StyleSheetRule?this.applyStyleSheetRule(e,t):e.source===we.StyleDeclaration&&this.applyStyleDeclaration(e,t);}};if(this.iframe.contentDocument&&nt(this.iframe.contentDocument,this.virtualDom,e,this.virtualDom.mirror),this.virtualDom.destroyTree(),this.usingVirtualDom=!1,Object.keys(this.legacy_missingNodeRetryMap).length)for(const t in this.legacy_missingNodeRetryMap)try{const n=this.legacy_missingNodeRetryMap[t],i=ot(n.node,this.mirror,this.virtualDom.mirror);nt(i,n.node,e,this.virtualDom.mirror),n.node=i;}catch(e){this.config.showWarning&&console.warn(e);}this.constructedStyleMutations.forEach((e=>{this.applyStyleSheetMutation(e);})),this.constructedStyleMutations=[],this.adoptedStyleSheets.forEach((e=>{this.applyAdoptedStyleSheet(e);})),this.adoptedStyleSheets=[];}this.mousePos&&(this.moveAndHover(this.mousePos.x,this.mousePos.y,this.mousePos.id,!0,this.mousePos.debugData),this.mousePos=null),this.lastSelectionData&&(this.applySelection(this.lastSelectionData),this.lastSelectionData=null);})),this.emitter.on(Se.PlayBack,(()=>{this.firstFullSnapshot=null,this.mirror.reset(),this.styleMirror.reset();}));const i=new zt([],{speed:this.config.speed,liveMode:this.config.liveMode});this.service=cn({events:e.map((e=>t&&t.unpackFn?t.unpackFn(e):e)).sort(((e,t)=>e.timestamp-t.timestamp)),timer:i,timeOffset:0,baselineTime:0,lastPlayedEvent:null},{getCastFn:this.getCastFn,applyEventsSynchronously:this.applyEventsSynchronously,emitter:this.emitter}),this.service.start(),this.service.subscribe((e=>{this.emitter.emit(Se.StateChange,{player:e});})),this.speedService=ln(sn({id:"speed",context:{normalSpeed:-1,timer:i},initial:"normal",states:{normal:{on:{FAST_FORWARD:{target:"skipping",actions:["recordSpeed","setSpeed"]},SET_SPEED:{target:"normal",actions:["setSpeed"]}}},skipping:{on:{BACK_TO_NORMAL:{target:"normal",actions:["restoreSpeed"]},SET_SPEED:{target:"normal",actions:["setSpeed"]}}}}},{actions:{setSpeed:(e,t)=>{"payload"in t&&e.timer.setSpeed(t.payload.speed);},recordSpeed:qt({normalSpeed:e=>e.timer.speed}),restoreSpeed:e=>{e.timer.setSpeed(e.normalSpeed);}}})),this.speedService.start(),this.speedService.subscribe((e=>{this.emitter.emit(Se.StateChange,{speed:e});}));const o=this.service.state.context.events.find((e=>e.type===be.Meta)),r=this.service.state.context.events.find((e=>e.type===be.FullSnapshot));if(o){const{width:e,height:t}=o.data;setTimeout((()=>{this.emitter.emit(Se.Resize,{width:e,height:t});}),0);}r&&setTimeout((()=>{var e;this.firstFullSnapshot||(this.firstFullSnapshot=r,this.rebuildFullSnapshot(r),null===(e=this.iframe.contentWindow)||void 0===e||e.scrollTo(r.data.initialOffset));}),1),this.service.state.context.events.find(Cn)&&this.mouse.classList.add("touch-device");}get timer(){return this.service.state.context.timer}on(e,t){return this.emitter.on(e,t),this}off(e,t){return this.emitter.off(e,t),this}setConfig(e){Object.keys(e).forEach((t=>{e[t],this.config[t]=e[t];})),this.config.skipInactive||this.backToNormal(),void 0!==e.speed&&this.speedService.send({type:"SET_SPEED",payload:{speed:e.speed}}),void 0!==e.mouseTail&&(!1===e.mouseTail?this.mouseTail&&(this.mouseTail.style.display="none"):(this.mouseTail||(this.mouseTail=document.createElement("canvas"),this.mouseTail.width=Number.parseFloat(this.iframe.width),this.mouseTail.height=Number.parseFloat(this.iframe.height),this.mouseTail.classList.add("replayer-mouse-tail"),this.wrapper.insertBefore(this.mouseTail,this.iframe)),this.mouseTail.style.display="inherit"));}getMetaData(){const e=this.service.state.context.events[0],t=this.service.state.context.events[this.service.state.context.events.length-1];return {startTime:e.timestamp,endTime:t.timestamp,totalTime:t.timestamp-e.timestamp}}getCurrentTime(){return this.timer.timeOffset+this.getTimeOffset()}getTimeOffset(){const{baselineTime:e,events:t}=this.service.state.context;return e-t[0].timestamp}getMirror(){return this.mirror}play(e=0){var t,n;this.service.state.matches("paused")||this.service.send({type:"PAUSE"}),this.service.send({type:"PLAY",payload:{timeOffset:e}}),null===(n=null===(t=this.iframe.contentDocument)||void 0===t?void 0:t.getElementsByTagName("html")[0])||void 0===n||n.classList.remove("rrweb-paused"),this.emitter.emit(Se.Start);}pause(e){var t,n;void 0===e&&this.service.state.matches("playing")&&this.service.send({type:"PAUSE"}),"number"==typeof e&&(this.play(e),this.service.send({type:"PAUSE"})),null===(n=null===(t=this.iframe.contentDocument)||void 0===t?void 0:t.getElementsByTagName("html")[0])||void 0===n||n.classList.add("rrweb-paused"),this.emitter.emit(Se.Pause);}resume(e=0){console.warn("The 'resume' was deprecated in 1.0. Please use 'play' method which has the same interface."),this.play(e),this.emitter.emit(Se.Resume);}destroy(){this.pause(),this.config.root.removeChild(this.wrapper),this.emitter.emit(Se.Destroy);}startLive(e){this.service.send({type:"TO_LIVE",payload:{baselineTime:e}});}addEvent(e){const t=this.config.unpackFn?this.config.unpackFn(e):e;Cn(t)&&this.mouse.classList.add("touch-device"),Promise.resolve().then((()=>this.service.send({type:"ADD_EVENT",payload:{event:t}})));}enableInteract(){this.iframe.setAttribute("scrolling","auto"),this.iframe.style.pointerEvents="auto";}disableInteract(){this.iframe.setAttribute("scrolling","no"),this.iframe.style.pointerEvents="none";}resetCache(){this.cache=le();}setupDom(){this.wrapper=document.createElement("div"),this.wrapper.classList.add("replayer-wrapper"),this.config.root.appendChild(this.wrapper),this.mouse=document.createElement("div"),this.mouse.classList.add("replayer-mouse"),this.wrapper.appendChild(this.mouse),!1!==this.config.mouseTail&&(this.mouseTail=document.createElement("canvas"),this.mouseTail.classList.add("replayer-mouse-tail"),this.mouseTail.style.display="inherit",this.wrapper.appendChild(this.mouseTail)),this.iframe=document.createElement("iframe");const e=["allow-same-origin"];this.config.UNSAFE_replayCanvas&&e.push("allow-scripts"),this.iframe.style.display="none",this.iframe.setAttribute("sandbox",e.join(" ")),this.disableInteract(),this.wrapper.appendChild(this.iframe),this.iframe.contentWindow&&this.iframe.contentDocument&&(Qt(this.iframe.contentWindow,this.iframe.contentDocument),function(e=window){"NodeList"in e&&!e.NodeList.prototype.forEach&&(e.NodeList.prototype.forEach=Array.prototype.forEach),"DOMTokenList"in e&&!e.DOMTokenList.prototype.forEach&&(e.DOMTokenList.prototype.forEach=Array.prototype.forEach),Node.prototype.contains||(Node.prototype.contains=(...e)=>{let t=e[0];if(!(0 in e))throw new TypeError("1 argument is required");do{if(this===t)return !0}while(t=t&&t.parentNode);return !1});}(this.iframe.contentWindow));}rebuildFullSnapshot(e,t=!1){if(!this.iframe.contentDocument)return console.warn("Looks like your replayer has been destroyed.");Object.keys(this.legacy_missingNodeRetryMap).length&&console.warn("Found unresolved missing node map",this.legacy_missingNodeRetryMap),this.legacy_missingNodeRetryMap={};const n=[],i=(e,t)=>{this.collectIframeAndAttachDocument(n,e);for(const n of this.config.plugins||[])n.onBuild&&n.onBuild(e,{id:t,replayer:this});};ue(e.data.node,{doc:this.iframe.contentDocument,afterAppend:i,cache:this.cache,mirror:this.mirror}),i(this.iframe.contentDocument,e.data.node.id);for(const{mutationInQueue:e,builtNode:t}of n)this.attachDocumentToIframe(e,t),this.newDocumentQueue=this.newDocumentQueue.filter((t=>t!==e));const{documentElement:o,head:r}=this.iframe.contentDocument;this.insertStyleRules(o,r),this.service.state.matches("playing")||this.iframe.contentDocument.getElementsByTagName("html")[0].classList.add("rrweb-paused"),this.emitter.emit(Se.FullsnapshotRebuilded,e),t||this.waitForStylesheetLoad(),this.config.UNSAFE_replayCanvas&&this.preloadAllImages();}insertStyleRules(e,t){var n;const i=(o=this.config.blockClass,[`.${o} { background: currentColor }`,"noscript { display: none !important; }"]).concat(this.config.insertStyleRules);var o;if(this.config.pauseAnimation&&i.push("html.rrweb-paused *, html.rrweb-paused *:before, html.rrweb-paused *:after { animation-play-state: paused !important; }"),this.usingVirtualDom){const n=this.virtualDom.createElement("style");this.virtualDom.mirror.add(n,vt(n,this.virtualDom.unserializedId)),e.insertBefore(n,t),n.rules.push({source:we.StyleSheetRule,adds:i.map(((e,t)=>({rule:e,index:t})))});}else {const o=document.createElement("style");e.insertBefore(o,t);for(let e=0;e<i.length;e++)null===(n=o.sheet)||void 0===n||n.insertRule(i[e],e);}}attachDocumentToIframe(e,t){const n=this.usingVirtualDom?this.virtualDom.mirror:this.mirror,i=[],o=(e,o)=>{this.collectIframeAndAttachDocument(i,e);const r=n.getMeta(e);if((null==r?void 0:r.type)===X.Element&&"HTML"===(null==r?void 0:r.tagName.toUpperCase())){const{documentElement:e,head:n}=t.contentDocument;this.insertStyleRules(e,n);}for(const t of this.config.plugins||[])t.onBuild&&t.onBuild(e,{id:o,replayer:this});};de(e.node,{doc:t.contentDocument,mirror:n,hackCss:!0,skipChild:!1,afterAppend:o,cache:this.cache}),o(t.contentDocument,e.node.id);for(const{mutationInQueue:e,builtNode:t}of i)this.attachDocumentToIframe(e,t),this.newDocumentQueue=this.newDocumentQueue.filter((t=>t!==e));}collectIframeAndAttachDocument(e,t){if(fe(t,this.mirror)){const n=this.newDocumentQueue.find((e=>e.parentId===this.mirror.getId(t)));n&&e.push({mutationInQueue:n,builtNode:t});}}waitForStylesheetLoad(){var e;const t=null===(e=this.iframe.contentDocument)||void 0===e?void 0:e.head;if(t){const e=new Set;let n,i=this.service.state;const o=()=>{i=this.service.state;};this.emitter.on(Se.Start,o),this.emitter.on(Se.Pause,o);const r=()=>{this.emitter.off(Se.Start,o),this.emitter.off(Se.Pause,o);};t.querySelectorAll('link[rel="stylesheet"]').forEach((t=>{t.sheet||(e.add(t),t.addEventListener("load",(()=>{e.delete(t),0===e.size&&-1!==n&&(i.matches("playing")&&this.play(this.getCurrentTime()),this.emitter.emit(Se.LoadStylesheetEnd),n&&clearTimeout(n),r());})));})),e.size>0&&(this.service.send({type:"PAUSE"}),this.emitter.emit(Se.LoadStylesheetStart),n=setTimeout((()=>{i.matches("playing")&&this.play(this.getCurrentTime()),n=-1,r();}),this.config.loadTimeout));}}preloadAllImages(){return Te(this,void 0,void 0,(function*(){this.service.state;const e=()=>{this.service.state;};this.emitter.on(Se.Start,e),this.emitter.on(Se.Pause,e);const t=[];for(const e of this.service.state.context.events)if(e.type===be.IncrementalSnapshot&&e.data.source===we.CanvasMutation){t.push(this.deserializeAndPreloadCanvasEvents(e.data,e));("commands"in e.data?e.data.commands:[e.data]).forEach((t=>{this.preloadImages(t,e);}));}return Promise.all(t)}))}preloadImages(e,t){if("drawImage"===e.property&&"string"==typeof e.args[0]&&!this.imageMap.has(t)){const t=document.createElement("canvas"),n=t.getContext("2d"),i=null==n?void 0:n.createImageData(t.width,t.height);null==i||i.data,JSON.parse(e.args[0]),null==n||n.putImageData(i,0,0);}}deserializeAndPreloadCanvasEvents(e,t){return Te(this,void 0,void 0,(function*(){if(!this.canvasEventMap.has(t)){const n={isUnchanged:!0};if("commands"in e){const i=yield Promise.all(e.commands.map((e=>Te(this,void 0,void 0,(function*(){const t=yield Promise.all(e.args.map(hn(this.imageMap,null,n)));return Object.assign(Object.assign({},e),{args:t})})))));!1===n.isUnchanged&&this.canvasEventMap.set(t,Object.assign(Object.assign({},e),{commands:i}));}else {const i=yield Promise.all(e.args.map(hn(this.imageMap,null,n)));!1===n.isUnchanged&&this.canvasEventMap.set(t,Object.assign(Object.assign({},e),{args:i}));}}}))}applyIncremental(e,t){var n,i,o;const{data:r}=e;switch(r.source){case we.Mutation:try{this.applyMutation(r,t);}catch(e){this.warn(`Exception in mutation ${e.message||e}`,r);}break;case we.Drag:case we.TouchMove:case we.MouseMove:if(t){const e=r.positions[r.positions.length-1];this.mousePos={x:e.x,y:e.y,id:e.id,debugData:r};}else r.positions.forEach((n=>{const i={doAction:()=>{this.moveAndHover(n.x,n.y,n.id,t,r);},delay:n.timeOffset+e.timestamp-this.service.state.context.baselineTime};this.timer.addAction(i);})),this.timer.addAction({doAction(){},delay:e.delay-(null===(n=r.positions[0])||void 0===n?void 0:n.timeOffset)});break;case we.MouseInteraction:{if(-1===r.id||t)break;const e=new Event(Ne[r.type].toLowerCase()),n=this.mirror.getNode(r.id);if(!n)return this.debugNodeNotFound(r,r.id);this.emitter.emit(Se.MouseInteraction,{type:r.type,target:n});const{triggerFocus:i}=this.config;switch(r.type){case Ne.Blur:"blur"in n&&n.blur();break;case Ne.Focus:i&&n.focus&&n.focus({preventScroll:!0});break;case Ne.Click:case Ne.TouchStart:case Ne.TouchEnd:t?(r.type===Ne.TouchStart?this.touchActive=!0:r.type===Ne.TouchEnd&&(this.touchActive=!1),this.mousePos={x:r.x,y:r.y,id:r.id,debugData:r}):(r.type===Ne.TouchStart&&(this.tailPositions.length=0),this.moveAndHover(r.x,r.y,r.id,t,r),r.type===Ne.Click?(this.mouse.classList.remove("active"),this.mouse.offsetWidth,this.mouse.classList.add("active")):r.type===Ne.TouchStart?(this.mouse.offsetWidth,this.mouse.classList.add("touch-active")):r.type===Ne.TouchEnd&&this.mouse.classList.remove("touch-active"));break;case Ne.TouchCancel:t?this.touchActive=!1:this.mouse.classList.remove("touch-active");break;default:n.dispatchEvent(e);}break}case we.Scroll:if(-1===r.id)break;if(this.usingVirtualDom){const e=this.virtualDom.mirror.getNode(r.id);if(!e)return this.debugNodeNotFound(r,r.id);e.scrollData=r;break}this.applyScroll(r,t);break;case we.ViewportResize:this.emitter.emit(Se.Resize,{width:r.width,height:r.height});break;case we.Input:if(-1===r.id)break;if(this.usingVirtualDom){const e=this.virtualDom.mirror.getNode(r.id);if(!e)return this.debugNodeNotFound(r,r.id);e.inputData=r;break}this.applyInput(r);break;case we.MediaInteraction:{const e=this.usingVirtualDom?this.virtualDom.mirror.getNode(r.id):this.mirror.getNode(r.id);if(!e)return this.debugNodeNotFound(r,r.id);const t=e;try{r.currentTime&&(t.currentTime=r.currentTime),r.volume&&(t.volume=r.volume),r.muted&&(t.muted=r.muted),1===r.type&&t.pause(),0===r.type&&t.play(),4===r.type&&(t.playbackRate=r.playbackRate);}catch(e){this.config.showWarning&&console.warn(`Failed to replay media interactions: ${e.message||e}`);}break}case we.StyleSheetRule:case we.StyleDeclaration:this.usingVirtualDom?r.styleId?this.constructedStyleMutations.push(r):r.id&&(null===(i=this.virtualDom.mirror.getNode(r.id))||void 0===i||i.rules.push(r)):this.applyStyleSheetMutation(r);break;case we.CanvasMutation:if(!this.config.UNSAFE_replayCanvas)return;if(this.usingVirtualDom){const t=this.virtualDom.mirror.getNode(r.id);if(!t)return this.debugNodeNotFound(r,r.id);t.canvasMutations.push({event:e,mutation:r});}else {const t=this.mirror.getNode(r.id);if(!t)return this.debugNodeNotFound(r,r.id);fn({event:e,mutation:r,target:t,imageMap:this.imageMap,canvasEventMap:this.canvasEventMap,errorHandler:this.warnCanvasMutationFailed.bind(this)});}break;case we.Font:try{const e=new FontFace(r.family,r.buffer?new Uint8Array(JSON.parse(r.fontSource)):r.fontSource,r.descriptors);null===(o=this.iframe.contentDocument)||void 0===o||o.fonts.add(e);}catch(e){this.config.showWarning&&console.warn(e);}break;case we.Selection:if(t){this.lastSelectionData=r;break}this.applySelection(r);break;case we.AdoptedStyleSheet:this.usingVirtualDom?this.adoptedStyleSheets.push(r):this.applyAdoptedStyleSheet(r);}}applyMutation(e,t){if(this.config.useVirtualDom&&!this.usingVirtualDom&&t&&(this.usingVirtualDom=!0,ft(this.iframe.contentDocument,this.mirror,this.virtualDom),Object.keys(this.legacy_missingNodeRetryMap).length))for(const e in this.legacy_missingNodeRetryMap)try{const t=this.legacy_missingNodeRetryMap[e],n=mt(t.node,this.virtualDom,this.mirror);n&&(t.node=n);}catch(e){this.config.showWarning&&console.warn(e);}const n=this.usingVirtualDom?this.virtualDom.mirror:this.mirror;e.removes.forEach((t=>{var i;const o=n.getNode(t.id);if(!o){if(e.removes.find((e=>e.id===t.parentId)))return;return this.warnNodeNotFound(e,t.id)}let r=n.getNode(t.parentId);if(!r)return this.warnNodeNotFound(e,t.parentId);if(t.isShadow&&ve(r)&&(r=r.shadowRoot),n.removeNodeFromMap(o),r)try{r.removeChild(o),this.usingVirtualDom&&"#text"===o.nodeName&&"STYLE"===r.nodeName&&(null===(i=r.rules)||void 0===i?void 0:i.length)>0&&(r.rules=[]);}catch(t){if(!(t instanceof DOMException))throw t;this.warn("parent could not remove child in mutation",r,o,e);}}));const i=Object.assign({},this.legacy_missingNodeRetryMap),o=[],r=e=>{var t;if(!this.iframe.contentDocument)return console.warn("Looks like your replayer has been destroyed.");let r=n.getNode(e.parentId);if(!r)return e.node.type===X.Document?this.newDocumentQueue.push(e):o.push(e);e.node.isShadow&&(ve(r)||r.attachShadow({mode:"open"}),r=r.shadowRoot);let s=null,a=null;if(e.previousId&&(s=n.getNode(e.previousId)),e.nextId&&(a=n.getNode(e.nextId)),(e=>{let t=null;return e.nextId&&(t=n.getNode(e.nextId)),null!==e.nextId&&void 0!==e.nextId&&-1!==e.nextId&&!t})(e))return o.push(e);if(e.node.rootId&&!n.getNode(e.node.rootId))return;const l=e.node.rootId?n.getNode(e.node.rootId):this.usingVirtualDom?this.virtualDom:this.iframe.contentDocument;if(fe(r,n))return void this.attachDocumentToIframe(e,r);const c=(e,t)=>{for(const n of this.config.plugins||[])n.onBuild&&n.onBuild(e,{id:t,replayer:this});},d=de(e.node,{doc:l,mirror:n,skipChild:!0,hackCss:!0,cache:this.cache,afterAppend:c});if(-1===e.previousId||-1===e.nextId)return void(i[e.node.id]={node:d,mutation:e});const u=n.getMeta(r);if(u&&u.type===X.Element&&"textarea"===u.tagName&&e.node.type===X.Text){const e=Array.isArray(r.childNodes)?r.childNodes:Array.from(r.childNodes);for(const t of e)t.nodeType===r.TEXT_NODE&&r.removeChild(t);}if(s&&s.nextSibling&&s.nextSibling.parentNode)r.insertBefore(d,s.nextSibling);else if(a&&a.parentNode)r.contains(a)?r.insertBefore(d,a):r.insertBefore(d,null);else {if(r===l)for(;l.firstChild;)l.removeChild(l.firstChild);r.appendChild(d);}if(c(d,e.node.id),this.usingVirtualDom&&"#text"===d.nodeName&&"STYLE"===r.nodeName&&(null===(t=r.rules)||void 0===t?void 0:t.length)>0&&(r.rules=[]),fe(d,this.mirror)){const e=this.mirror.getId(d),t=this.newDocumentQueue.find((t=>t.parentId===e));t&&(this.attachDocumentToIframe(t,d),this.newDocumentQueue=this.newDocumentQueue.filter((e=>e!==t)));}(e.previousId||e.nextId)&&this.legacy_resolveMissingNode(i,r,d,e);};e.adds.forEach((e=>{r(e);}));const s=Date.now();for(;o.length;){const e=ge(o);if(o.length=0,Date.now()-s>500){this.warn("Timeout in the loop, please check the resolve tree data:",e);break}for(const t of e){n.getNode(t.value.parentId)?me(t,(e=>{r(e);})):this.debug("Drop resolve tree since there is no parent for the root node.",t);}}Object.keys(i).length&&Object.assign(this.legacy_missingNodeRetryMap,i),function(e){const t=new Set,n=[];for(let i=e.length;i--;){const o=e[i];t.has(o.id)||(n.push(o),t.add(o.id));}return n}(e.texts).forEach((t=>{var i;const o=n.getNode(t.id);if(!o){if(e.removes.find((e=>e.id===t.id)))return;return this.warnNodeNotFound(e,t.id)}if(o.textContent=t.value,this.usingVirtualDom){const e=o.parentNode;(null===(i=null==e?void 0:e.rules)||void 0===i?void 0:i.length)>0&&(e.rules=[]);}})),e.attributes.forEach((t=>{const i=n.getNode(t.id);if(!i){if(e.removes.find((e=>e.id===t.id)))return;return this.warnNodeNotFound(e,t.id)}for(const e in t.attributes)if("string"==typeof e){const o=t.attributes[e];if(null===o)i.removeAttribute(e);else if("string"==typeof o)try{if("_cssText"===e&&("LINK"===i.nodeName||"STYLE"===i.nodeName))try{const e=n.getMeta(i);Object.assign(e.attributes,t.attributes);const o=de(e,{doc:i.ownerDocument,mirror:n,skipChild:!0,hackCss:!0,cache:this.cache}),r=i.nextSibling,s=i.parentNode;if(o&&s){s.removeChild(i),s.insertBefore(o,r),n.replace(t.id,o);break}}catch(e){}i.setAttribute(e,o);}catch(e){this.config.showWarning&&console.warn("An error occurred may due to the checkout feature.",e);}else if("style"===e){const e=o,t=i;for(const n in e)if(!1===e[n])t.style.removeProperty(n);else if(e[n]instanceof Array){const i=e[n];t.style.setProperty(n,i[0],i[1]);}else {const i=e[n];t.style.setProperty(n,i);}}}}));}applyScroll(e,t){var n,i;const o=this.mirror.getNode(e.id);if(!o)return this.debugNodeNotFound(e,e.id);const r=this.mirror.getMeta(o);if(o===this.iframe.contentDocument)null===(n=this.iframe.contentWindow)||void 0===n||n.scrollTo({top:e.y,left:e.x,behavior:t?"auto":"smooth"});else if((null==r?void 0:r.type)===X.Document)null===(i=o.defaultView)||void 0===i||i.scrollTo({top:e.y,left:e.x,behavior:t?"auto":"smooth"});else try{o.scrollTo({top:e.y,left:e.x,behavior:t?"auto":"smooth"});}catch(e){}}applyInput(e){const t=this.mirror.getNode(e.id);if(!t)return this.debugNodeNotFound(e,e.id);try{t.checked=e.isChecked,t.value=e.text;}catch(e){}}applySelection(e){try{const t=new Set,n=e.ranges.map((({start:e,startOffset:n,end:i,endOffset:o})=>{const r=this.mirror.getNode(e),s=this.mirror.getNode(i);if(!r||!s)return;const a=new Range;a.setStart(r,n),a.setEnd(s,o);const l=r.ownerDocument,c=null==l?void 0:l.getSelection();return c&&t.add(c),{range:a,selection:c}}));t.forEach((e=>e.removeAllRanges())),n.forEach((e=>{var t;return e&&(null===(t=e.selection)||void 0===t?void 0:t.addRange(e.range))}));}catch(e){}}applyStyleSheetMutation(e){var t;let n=null;e.styleId?n=this.styleMirror.getStyle(e.styleId):e.id&&(n=(null===(t=this.mirror.getNode(e.id))||void 0===t?void 0:t.sheet)||null),n&&(e.source===we.StyleSheetRule?this.applyStyleSheetRule(e,n):e.source===we.StyleDeclaration&&this.applyStyleDeclaration(e,n));}applyStyleSheetRule(e,t){var n,i,o,r;if(null===(n=e.adds)||void 0===n||n.forEach((({rule:e,index:n})=>{try{if(Array.isArray(n)){const{positions:i,index:o}=Ie(n);Ce(t.cssRules,i).insertRule(e,o);}else {const i=void 0===n?void 0:Math.min(n,t.cssRules.length);null==t||t.insertRule(e,i);}}catch(e){}})),null===(i=e.removes)||void 0===i||i.forEach((({index:e})=>{try{if(Array.isArray(e)){const{positions:n,index:i}=Ie(e);Ce(t.cssRules,n).deleteRule(i||0);}else null==t||t.deleteRule(e);}catch(e){}})),e.replace)try{null===(o=t.replace)||void 0===o||o.call(t,e.replace);}catch(e){}if(e.replaceSync)try{null===(r=t.replaceSync)||void 0===r||r.call(t,e.replaceSync);}catch(e){}}applyStyleDeclaration(e,t){if(e.set){Ce(t.rules,e.index).style.setProperty(e.set.property,e.set.value,e.set.priority);}if(e.remove){Ce(t.rules,e.index).style.removeProperty(e.remove.property);}}applyAdoptedStyleSheet(e){var t;const n=this.mirror.getNode(e.id);if(!n)return;null===(t=e.styles)||void 0===t||t.forEach((e=>{var t;let i=null,o=null;if(ve(n)?o=(null===(t=n.ownerDocument)||void 0===t?void 0:t.defaultView)||null:"#document"===n.nodeName&&(o=n.defaultView),o)try{i=new o.CSSStyleSheet,this.styleMirror.add(i,e.styleId),this.applyStyleSheetRule({source:we.StyleSheetRule,adds:e.rules},i);}catch(e){}}));let i=0;const o=(e,t)=>{const n=t.map((e=>this.styleMirror.getStyle(e))).filter((e=>null!==e));ve(e)?e.shadowRoot.adoptedStyleSheets=n:"#document"===e.nodeName&&(e.adoptedStyleSheets=n),n.length!==t.length&&i<10&&(setTimeout((()=>o(e,t)),0+100*i),i++);};o(n,e.styleIds);}legacy_resolveMissingNode(e,t,n,i){const{previousId:o,nextId:r}=i,s=o&&e[o],a=r&&e[r];if(s){const{node:i,mutation:o}=s;t.insertBefore(i,n),delete e[o.node.id],delete this.legacy_missingNodeRetryMap[o.node.id],(o.previousId||o.nextId)&&this.legacy_resolveMissingNode(e,t,i,o);}if(a){const{node:i,mutation:o}=a;t.insertBefore(i,n.nextSibling),delete e[o.node.id],delete this.legacy_missingNodeRetryMap[o.node.id],(o.previousId||o.nextId)&&this.legacy_resolveMissingNode(e,t,i,o);}}moveAndHover(e,t,n,i,o){const r=this.mirror.getNode(n);if(!r)return this.debugNodeNotFound(o,n);const s=ye(r,this.iframe),a=e*s.absoluteScale+s.x,l=t*s.absoluteScale+s.y;this.mouse.style.left=`${a}px`,this.mouse.style.top=`${l}px`,i||this.drawMouseTail({x:a,y:l}),this.hoverElements(r);}drawMouseTail(e){if(!this.mouseTail)return;const{lineCap:t,lineWidth:n,strokeStyle:i,duration:o}=!0===this.config.mouseTail?vn:Object.assign({},vn,this.config.mouseTail),r=()=>{if(!this.mouseTail)return;const e=this.mouseTail.getContext("2d");e&&this.tailPositions.length&&(e.clearRect(0,0,this.mouseTail.width,this.mouseTail.height),e.beginPath(),e.lineWidth=n,e.lineCap=t,e.strokeStyle=i,e.moveTo(this.tailPositions[0].x,this.tailPositions[0].y),this.tailPositions.forEach((t=>e.lineTo(t.x,t.y))),e.stroke());};this.tailPositions.push(e),r(),setTimeout((()=>{this.tailPositions=this.tailPositions.filter((t=>t!==e)),r();}),o/this.speedService.state.context.timer.speed);}hoverElements(e){var t;null===(t=this.iframe.contentDocument)||void 0===t||t.querySelectorAll(".\\:hover").forEach((e=>{e.classList.remove(":hover");}));let n=e;for(;n;)n.classList&&n.classList.add(":hover"),n=n.parentElement;}isUserInteraction(e){return e.type===be.IncrementalSnapshot&&(e.data.source>we.Mutation&&e.data.source<=we.Input)}backToNormal(){this.nextUserInteractionEvent=null,this.speedService.state.matches("normal")||(this.speedService.send({type:"BACK_TO_NORMAL"}),this.emitter.emit(Se.SkipEnd,{speed:this.speedService.state.context.normalSpeed}));}warnNodeNotFound(e,t){this.warn(`Node with id '${t}' not found. `,e);}warnCanvasMutationFailed(e,t){this.warn("Has error on canvas update",t,"canvas mutation:",e);}debugNodeNotFound(e,t){this.debug("[replayer]",`Node with id '${t}' not found. `,e);}warn(...e){this.config.showWarning&&console.warn("[replayer]",...e);}debug(...e){this.config.showDebug&&console.log("[replayer]",...e);}}function An(e){let t="";return Object.keys(e).forEach((n=>{t+=`${n}: ${e[n]};`;})),t}function bn(e,t=2){let n=String(e);const i=Math.pow(10,t-1);if(e<i)for(;String(i).length>n.length;)n=`0${e}`;return n}function wn(e){if(e<=0)return "00:00";const t=Math.floor(e/36e5);e%=36e5;const n=Math.floor(e/6e4);e%=6e4;const i=Math.floor(e/1e3);return t?`${bn(t)}:${bn(n)}:${bn(i)}`:`${bn(n)}:${bn(i)}`}function Nn(){let e=!1;return ["fullscreen","webkitIsFullScreen","mozFullScreen","msFullscreenElement"].forEach((t=>{t in document&&(e=e||Boolean(document[t]));})),e}function En(e){return {"[object Boolean]":"boolean","[object Number]":"number","[object String]":"string","[object Function]":"function","[object Array]":"array","[object Date]":"date","[object RegExp]":"regExp","[object Undefined]":"undefined","[object Null]":"null","[object Object]":"object"}[Object.prototype.toString.call(e)]}function Sn(e){return e.type===be.IncrementalSnapshot&&(e.data.source>we.Mutation&&e.data.source<=we.Input)}function Tn(t){let n,i,o,r,s,a,u,p,C;return {c(){n=h("div"),i=h("input"),o=m(),r=h("label"),s=m(),a=h("span"),u=g(t[3]),y(i,"type","checkbox"),y(i,"id",t[2]),i.disabled=t[1],y(i,"class","svelte-9brlez"),y(r,"for",t[2]),y(r,"class","svelte-9brlez"),y(a,"class","label svelte-9brlez"),y(n,"class","switch svelte-9brlez"),I(n,"disabled",t[1]);},m(e,d){c(e,n,d),l(n,i),i.checked=t[0],l(n,o),l(n,r),l(n,s),l(n,a),l(a,u),p||(C=f(i,"change",t[4]),p=!0);},p(e,[t]){4&t&&y(i,"id",e[2]),2&t&&(i.disabled=e[1]),1&t&&(i.checked=e[0]),4&t&&y(r,"for",e[2]),8&t&&v(u,e[3]),2&t&&I(n,"disabled",e[1]);},i:e,o:e,d(e){e&&d(n),p=!1,C();}}}function Dn(e,t,n){let{disabled:i}=t,{checked:o}=t,{id:r}=t,{label:s}=t;return e.$$set=e=>{"disabled"in e&&n(1,i=e.disabled),"checked"in e&&n(0,o=e.checked),"id"in e&&n(2,r=e.id),"label"in e&&n(3,s=e.label);},[o,i,r,s,function(){o=this.checked,n(0,o);}]}class Mn extends J{constructor(e){super(),z(this,e,Dn,Tn,s,{disabled:1,checked:0,id:2,label:3});}}function Rn(e,t,n){const i=e.slice();return i[39]=t[n],i}function xn(e,t,n){const i=e.slice();return i[42]=t[n],i}function kn(e,t,n){const i=e.slice();return i[45]=t[n],i}function Fn(e){let t,n,i,r,s,a,p,A,b,w,N,E,S,T,M,x,k,F,O,B,L,V,_,G,W,U,Q=wn(e[6])+"",z=wn(e[8].totalTime)+"",J=e[14],X=[];for(let t=0;t<J.length;t+=1)X[t]=On(kn(e,J,t));let H=e[9],j=[];for(let t=0;t<H.length;t+=1)j[t]=Bn(xn(e,H,t));function q(e,t){return "playing"===e[7]?Vn:Ln}let ee=q(e),te=ee(e),ne=e[3],ie=[];for(let t=0;t<ne.length;t+=1)ie[t]=_n(Rn(e,ne,t));function oe(t){e[30](t);}let re={id:"skip",disabled:"skipping"===e[10],label:"skip inactive"};return void 0!==e[0]&&(re.checked=e[0]),B=new Mn({props:re}),D.push((()=>function(e,t,n){const i=e.$$.props[t];void 0!==i&&(e.$$.bound[i]=n,n(e.$$.ctx[i]));}(B,"checked",oe))),{c(){t=h("div"),n=h("div"),i=h("span"),r=g(Q),s=m(),a=h("div"),p=h("div"),A=m();for(let e=0;e<X.length;e+=1)X[e].c();b=m();for(let e=0;e<j.length;e+=1)j[e].c();w=m(),N=h("div"),E=m(),S=h("span"),T=g(z),M=m(),x=h("div"),k=h("button"),te.c(),F=m();for(let e=0;e<ie.length;e+=1)ie[e].c();O=m(),K(B.$$.fragment),V=m(),_=h("button"),_.innerHTML='<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16"><defs><style type="text/css"></style></defs><path d="M916 380c-26.4 0-48-21.6-48-48L868 223.2 613.6 477.6c-18.4\n            18.4-48.8 18.4-68 0-18.4-18.4-18.4-48.8 0-68L800 156 692 156c-26.4\n            0-48-21.6-48-48 0-26.4 21.6-48 48-48l224 0c26.4 0 48 21.6 48 48l0\n            224C964 358.4 942.4 380 916 380zM231.2 860l108.8 0c26.4 0 48 21.6 48\n            48s-21.6 48-48 48l-224 0c-26.4 0-48-21.6-48-48l0-224c0-26.4 21.6-48\n            48-48 26.4 0 48 21.6 48 48L164 792l253.6-253.6c18.4-18.4 48.8-18.4\n            68 0 18.4 18.4 18.4 48.8 0 68L231.2 860z" p-id="1286"></path></svg>',y(i,"class","rr-timeline__time svelte-19ke1iv"),y(p,"class","rr-progress__step svelte-19ke1iv"),C(p,"width",e[13]),y(N,"class","rr-progress__handler svelte-19ke1iv"),C(N,"left",e[13]),y(a,"class","rr-progress svelte-19ke1iv"),I(a,"disabled","skipping"===e[10]),y(S,"class","rr-timeline__time svelte-19ke1iv"),y(n,"class","rr-timeline svelte-19ke1iv"),y(k,"class","svelte-19ke1iv"),y(_,"class","svelte-19ke1iv"),y(x,"class","rr-controller__btns svelte-19ke1iv"),y(t,"class","rr-controller svelte-19ke1iv");},m(o,d){c(o,t,d),l(t,n),l(n,i),l(i,r),l(n,s),l(n,a),l(a,p),e[27](p),l(a,A);for(let e=0;e<X.length;e+=1)X[e].m(a,null);l(a,b);for(let e=0;e<j.length;e+=1)j[e].m(a,null);l(a,w),l(a,N),e[28](a),l(n,E),l(n,S),l(S,T),l(t,M),l(t,x),l(x,k),te.m(k,null),l(x,F);for(let e=0;e<ie.length;e+=1)ie[e].m(x,null);l(x,O),Y(B,x,null),l(x,V),l(x,_),G=!0,W||(U=[f(a,"click",e[16]),f(k,"click",e[4]),f(_,"click",e[31])],W=!0);},p(e,t){if((!G||64&t[0])&&Q!==(Q=wn(e[6])+"")&&v(r,Q),(!G||8192&t[0])&&C(p,"width",e[13]),16384&t[0]){let n;for(J=e[14],n=0;n<J.length;n+=1){const i=kn(e,J,n);X[n]?X[n].p(i,t):(X[n]=On(i),X[n].c(),X[n].m(a,b));}for(;n<X.length;n+=1)X[n].d(1);X.length=J.length;}if(512&t[0]){let n;for(H=e[9],n=0;n<H.length;n+=1){const i=xn(e,H,n);j[n]?j[n].p(i,t):(j[n]=Bn(i),j[n].c(),j[n].m(a,w));}for(;n<j.length;n+=1)j[n].d(1);j.length=H.length;}if((!G||8192&t[0])&&C(N,"left",e[13]),1024&t[0]&&I(a,"disabled","skipping"===e[10]),(!G||256&t[0])&&z!==(z=wn(e[8].totalTime)+"")&&v(T,z),ee!==(ee=q(e))&&(te.d(1),te=ee(e),te&&(te.c(),te.m(k,null))),1066&t[0]){let n;for(ne=e[3],n=0;n<ne.length;n+=1){const i=Rn(e,ne,n);ie[n]?ie[n].p(i,t):(ie[n]=_n(i),ie[n].c(),ie[n].m(x,O));}for(;n<ie.length;n+=1)ie[n].d(1);ie.length=ne.length;}const n={};var i;1024&t[0]&&(n.disabled="skipping"===e[10]),!L&&1&t[0]&&(L=!0,n.checked=e[0],i=()=>L=!1,R.push(i)),B.$set(n);},i(e){G||(Z(B.$$.fragment,e),G=!0);},o(e){$(B.$$.fragment,e),G=!1;},d(n){n&&d(t),e[27](null),u(X,n),u(j,n),e[28](null),te.d(),u(ie,n),P(B),W=!1,o(U);}}}function On(e){let t,n;return {c(){t=h("div"),y(t,"title",n=e[45].name),C(t,"width",e[45].width),C(t,"height","4px"),C(t,"position","absolute"),C(t,"background",e[45].background),C(t,"left",e[45].position);},m(e,n){c(e,t,n);},p(e,i){16384&i[0]&&n!==(n=e[45].name)&&y(t,"title",n),16384&i[0]&&C(t,"width",e[45].width),16384&i[0]&&C(t,"background",e[45].background),16384&i[0]&&C(t,"left",e[45].position);},d(e){e&&d(t);}}}function Bn(e){let t,n;return {c(){t=h("div"),y(t,"title",n=e[42].name),C(t,"width","10px"),C(t,"height","5px"),C(t,"position","absolute"),C(t,"top","2px"),C(t,"transform","translate(-50%, -50%)"),C(t,"background",e[42].background),C(t,"left",e[42].position);},m(e,n){c(e,t,n);},p(e,i){512&i[0]&&n!==(n=e[42].name)&&y(t,"title",n),512&i[0]&&C(t,"background",e[42].background),512&i[0]&&C(t,"left",e[42].position);},d(e){e&&d(t);}}}function Ln(e){let t,n;return {c(){t=p("svg"),n=p("path"),y(n,"d","M170.65984 896l0-768 640 384zM644.66944\n              512l-388.66944-233.32864 0 466.65728z"),y(t,"class","icon"),y(t,"viewBox","0 0 1024 1024"),y(t,"version","1.1"),y(t,"xmlns","http://www.w3.org/2000/svg"),y(t,"xmlns:xlink","http://www.w3.org/1999/xlink"),y(t,"width","16"),y(t,"height","16");},m(e,i){c(e,t,i),l(t,n);},d(e){e&&d(t);}}}function Vn(e){let t,n;return {c(){t=p("svg"),n=p("path"),y(n,"d","M682.65984 128q53.00224 0 90.50112 37.49888t37.49888 90.50112l0\n              512q0 53.00224-37.49888 90.50112t-90.50112\n              37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224\n              37.49888-90.50112t90.50112-37.49888zM341.34016 128q53.00224 0\n              90.50112 37.49888t37.49888 90.50112l0 512q0 53.00224-37.49888\n              90.50112t-90.50112\n              37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224\n              37.49888-90.50112t90.50112-37.49888zM341.34016 213.34016q-17.67424\n              0-30.16704 12.4928t-12.4928 30.16704l0 512q0 17.67424 12.4928\n              30.16704t30.16704 12.4928 30.16704-12.4928\n              12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928zM682.65984\n              213.34016q-17.67424 0-30.16704 12.4928t-12.4928 30.16704l0 512q0\n              17.67424 12.4928 30.16704t30.16704 12.4928 30.16704-12.4928\n              12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928z"),y(t,"class","icon"),y(t,"viewBox","0 0 1024 1024"),y(t,"version","1.1"),y(t,"xmlns","http://www.w3.org/2000/svg"),y(t,"xmlns:xlink","http://www.w3.org/1999/xlink"),y(t,"width","16"),y(t,"height","16");},m(e,i){c(e,t,i),l(t,n);},d(e){e&&d(t);}}}function _n(e){let t,n,i,o,r,s,a=e[39]+"";function u(){return e[29](e[39])}return {c(){t=h("button"),n=g(a),i=g("x"),t.disabled=o="skipping"===e[10],y(t,"class","svelte-19ke1iv"),I(t,"active",e[39]===e[1]&&"skipping"!==e[10]);},m(e,o){c(e,t,o),l(t,n),l(t,i),r||(s=f(t,"click",u),r=!0);},p(i,r){e=i,8&r[0]&&a!==(a=e[39]+"")&&v(n,a),1024&r[0]&&o!==(o="skipping"===e[10])&&(t.disabled=o),1034&r[0]&&I(t,"active",e[39]===e[1]&&"skipping"!==e[10]);},d(e){e&&d(t),r=!1,s();}}}function Gn(e){let t,n,i=e[2]&&Fn(e);return {c(){i&&i.c(),t=g("");},m(e,o){i&&i.m(e,o),c(e,t,o),n=!0;},p(e,n){e[2]?i?(i.p(e,n),4&n[0]&&Z(i,1)):(i=Fn(e),i.c(),Z(i,1),i.m(t.parentNode,t)):i&&(W(),$(i,1,1,(()=>{i=null;})),U());},i(e){n||(Z(i),n=!0);},o(e){$(i),n=!1;},d(e){i&&i.d(e),e&&d(t);}}}function Wn(e,t,n){return (100-(t-n)/(t-e)*100).toFixed(2)}function Un(e,t,n){const i=S();let o,r,s,a,l,c,d,u,h,p,{replayer:g}=t,{showController:m}=t,{autoPlay:f}=t,{skipInactive:y}=t,{speedOption:v}=t,{speed:C=(v.length?v[0]:1)}=t,{tags:I={}}=t,{inactiveColor:A}=t,b=0,T=null,M=!1,R=null;const x=()=>{T&&(cancelAnimationFrame(T),T=null);},k=()=>{"paused"===o&&(l?(g.play(),l=!1):g.play(b));},F=()=>{"playing"===o&&(g.pause(),M=!1);},O=(e,t)=>{n(6,b=e),M=!1;("boolean"==typeof t?t:"playing"===o)?g.play(e):g.pause(e);},B=(e,t,i=!1,o)=>{R=i?{start:e,end:t}:null,n(6,b=e),M=t,c=o,g.play(e);},L=e=>{let t="playing"===o;n(1,C=e),t&&g.pause(),g.setConfig({speed:C}),t&&g.play(b);};var V;N((()=>{n(7,o=g.service.state.value),n(10,r=g.speedService.state.value),g.on("state-change",(e=>{const{player:t,speed:i}=e;if((null==t?void 0:t.value)&&o!==t.value)switch(n(7,o=t.value),o){case"playing":x(),T=requestAnimationFrame((function e(){n(6,b=g.getCurrentTime()),M&&b>=M&&(R?B(R.start,R.end,!0,void 0):(g.pause(),c&&(c(),c=null))),b<d.totalTime&&(T=requestAnimationFrame(e));}));break;case"paused":x();}(null==i?void 0:i.value)&&r!==i.value&&n(10,r=i.value);})),g.on("finish",(()=>{l=!0,c&&(c(),c=null);})),f&&g.play();})),V=()=>{y!==g.config.skipInactive&&g.setConfig({skipInactive:y});},w().$$.after_update.push(V),E((()=>{g.pause(),x();}));return e.$$set=e=>{"replayer"in e&&n(17,g=e.replayer),"showController"in e&&n(2,m=e.showController),"autoPlay"in e&&n(18,f=e.autoPlay),"skipInactive"in e&&n(0,y=e.skipInactive),"speedOption"in e&&n(3,v=e.speedOption),"speed"in e&&n(1,C=e.speed),"tags"in e&&n(19,I=e.tags),"inactiveColor"in e&&n(20,A=e.inactiveColor);},e.$$.update=()=>{if(64&e.$$.dirty[0]&&i("ui-update-current-time",{payload:b}),128&e.$$.dirty[0]&&i("ui-update-player-state",{payload:o}),131072&e.$$.dirty[0]&&n(8,d=g.getMetaData()),320&e.$$.dirty[0]){const e=Math.min(1,b/d.totalTime);n(13,u=100*e+"%"),i("ui-update-progress",{payload:e});}655360&e.$$.dirty[0]&&n(9,h=(()=>{const{context:e}=g.service.state,t=e.events.length,n=e.events[0].timestamp,i=e.events[t-1].timestamp,o=[];return e.events.forEach((e=>{if(e.type===be.Custom){const t={name:e.data.tag,background:I[e.data.tag]||"rgb(73, 80, 246)",position:`${Wn(n,i,e.timestamp)}%`};o.push(t);}})),o})()),1179648&e.$$.dirty[0]&&n(14,p=(()=>{try{const{context:e}=g.service.state,t=e.events.length,n=e.events[0].timestamp,i=e.events[t-1].timestamp,o=function(e){const t=[];let n=e[0].timestamp;for(const i of e)Sn(i)&&(i.timestamp-n>1e4&&t.push([n,i.timestamp]),n=i.timestamp);return t}(e.events),r=(e,t,n,i)=>((i-n)/(t-e)*100).toFixed(2);return o.map((e=>({name:"inactive period",background:A,position:`${Wn(n,i,e[0])}%`,width:`${r(n,i,e[0],e[1])}%`})))}catch(e){return []}})());},[y,C,m,v,()=>{switch(o){case"playing":F();break;case"paused":k();}},L,b,o,d,h,r,s,a,u,p,i,e=>{if("skipping"===r)return;const t=s.getBoundingClientRect();let n=(e.clientX-t.left)/t.width;n<0?n=0:n>1&&(n=1);const i=d.totalTime*n;l=!1,O(i);},g,f,I,A,k,F,O,B,()=>{n(0,y=!y);},()=>Promise.resolve().then((()=>{n(8,d=g.getMetaData());})),function(e){D[e?"unshift":"push"]((()=>{a=e,n(12,a);}));},function(e){D[e?"unshift":"push"]((()=>{s=e,n(11,s);}));},e=>L(e),function(e){y=e,n(0,y);},()=>i("fullscreen")]}class Zn extends J{constructor(e){super(),z(this,e,Un,Gn,s,{replayer:17,showController:2,autoPlay:18,skipInactive:0,speedOption:3,speed:1,tags:19,inactiveColor:20,toggle:4,play:21,pause:22,goto:23,playRange:24,setSpeed:5,toggleSkipInactive:25,triggerUpdateMeta:26},null,[-1,-1]);}get toggle(){return this.$$.ctx[4]}get play(){return this.$$.ctx[21]}get pause(){return this.$$.ctx[22]}get goto(){return this.$$.ctx[23]}get playRange(){return this.$$.ctx[24]}get setSpeed(){return this.$$.ctx[5]}get toggleSkipInactive(){return this.$$.ctx[25]}get triggerUpdateMeta(){return this.$$.ctx[26]}}function $n(e){let t,n,i={replayer:e[7],showController:e[3],autoPlay:e[1],speedOption:e[2],skipInactive:e[0],tags:e[4],inactiveColor:e[5]};return t=new Zn({props:i}),e[32](t),t.$on("fullscreen",e[33]),{c(){K(t.$$.fragment);},m(e,i){Y(t,e,i),n=!0;},p(e,n){const i={};128&n[0]&&(i.replayer=e[7]),8&n[0]&&(i.showController=e[3]),2&n[0]&&(i.autoPlay=e[1]),4&n[0]&&(i.speedOption=e[2]),1&n[0]&&(i.skipInactive=e[0]),16&n[0]&&(i.tags=e[4]),32&n[0]&&(i.inactiveColor=e[5]),t.$set(i);},i(e){n||(Z(t.$$.fragment,e),n=!0);},o(e){$(t.$$.fragment,e),n=!1;},d(n){e[32](null),P(t,n);}}}function Kn(e){let t,n,i,o,r=e[7]&&$n(e);return {c(){t=h("div"),n=h("div"),i=m(),r&&r.c(),y(n,"class","rr-player__frame"),y(n,"style",e[11]),y(t,"class","rr-player"),y(t,"style",e[12]);},m(s,a){c(s,t,a),l(t,n),e[31](n),l(t,i),r&&r.m(t,null),e[34](t),o=!0;},p(e,i){(!o||2048&i[0])&&y(n,"style",e[11]),e[7]?r?(r.p(e,i),128&i[0]&&Z(r,1)):(r=$n(e),r.c(),Z(r,1),r.m(t,null)):r&&(W(),$(r,1,1,(()=>{r=null;})),U()),(!o||4096&i[0])&&y(t,"style",e[12]);},i(e){o||(Z(r),o=!0);},o(e){$(r),o=!1;},d(n){n&&d(t),e[31](null),r&&r.d(),e[34](null);}}}function Yn(e,n,i){let o,{width:r=1024}=n,{height:s=576}=n,{maxScale:l=1}=n,{events:c=[]}=n,{skipInactive:d=!0}=n,{autoPlay:u=!0}=n,{speedOption:h=[1,2,4,8]}=n,{speed:p=1}=n,{showController:g=!0}=n,{tags:m={}}=n,{inactiveColor:f="#D4D4D4"}=n;let y,v,C,I,A,b,w=r,S=s;const T=(e,t)=>{const n=[r/t.width,s/t.height];l&&n.push(l),e.style.transform=`scale(${Math.min(...n)})translate(-50%, -50%)`;},M=()=>{var e;y&&(Nn()?document.exitFullscreen?document.exitFullscreen():document.mozExitFullscreen?document.mozExitFullscreen():document.webkitExitFullscreen?document.webkitExitFullscreen():document.msExitFullscreen&&document.msExitFullscreen():(e=y).requestFullscreen?e.requestFullscreen():e.mozRequestFullScreen?e.mozRequestFullScreen():e.webkitRequestFullscreen?e.webkitRequestFullscreen():e.msRequestFullscreen&&e.msRequestFullscreen());};N((()=>{if(void 0!==h&&"array"!==En(h))throw new Error("speedOption must be array");if(h.forEach((e=>{if("number"!==En(e))throw new Error("item of speedOption must be number")})),h.indexOf(p)<0)throw new Error(`speed must be one of speedOption,\n        current config:\n        {\n          ...\n          speed: ${p},\n          speedOption: [${h.toString()}]\n          ...\n        }\n        `);var e;i(7,o=new In(c,Object.assign({speed:p,root:v,unpackFn:$t},n))),o.on("resize",(e=>{T(o.wrapper,e);})),e=()=>{Nn()?setTimeout((()=>{w=r,S=s,i(13,r=y.offsetWidth),i(14,s=y.offsetHeight-(g?80:0)),T(o.wrapper,{width:o.iframe.offsetWidth,height:o.iframe.offsetHeight});}),0):(i(13,r=w),i(14,s=S),T(o.wrapper,{width:o.iframe.offsetWidth,height:o.iframe.offsetHeight}));},document.addEventListener("fullscreenchange",e),document.addEventListener("webkitfullscreenchange",e),document.addEventListener("mozfullscreenchange",e),document.addEventListener("MSFullscreenChange",e),C=()=>{document.removeEventListener("fullscreenchange",e),document.removeEventListener("webkitfullscreenchange",e),document.removeEventListener("mozfullscreenchange",e),document.removeEventListener("MSFullscreenChange",e);};})),E((()=>{C&&C();}));return e.$$set=e=>{i(39,n=t(t({},n),a(e))),"width"in e&&i(13,r=e.width),"height"in e&&i(14,s=e.height),"maxScale"in e&&i(15,l=e.maxScale),"events"in e&&i(16,c=e.events),"skipInactive"in e&&i(0,d=e.skipInactive),"autoPlay"in e&&i(1,u=e.autoPlay),"speedOption"in e&&i(2,h=e.speedOption),"speed"in e&&i(17,p=e.speed),"showController"in e&&i(3,g=e.showController),"tags"in e&&i(4,m=e.tags),"inactiveColor"in e&&i(5,f=e.inactiveColor);},e.$$.update=()=>{24576&e.$$.dirty[0]&&i(11,A=An({width:`${r}px`,height:`${s}px`})),24584&e.$$.dirty[0]&&i(12,b=An({width:`${r}px`,height:`${s+(g?80:0)}px`}));},n=a(n),[d,u,h,g,m,f,M,o,y,v,I,A,b,r,s,l,c,p,()=>o.getMirror(),()=>{T(o.wrapper,{width:o.iframe.offsetWidth,height:o.iframe.offsetHeight});},(e,t)=>{switch(o.on(e,t),e){case"ui-update-current-time":case"ui-update-progress":case"ui-update-player-state":I.$on(e,(({detail:e})=>t(e)));}},e=>{o.addEvent(e),I.triggerUpdateMeta();},()=>o.getMetaData(),()=>o,()=>{I.toggle();},e=>{I.setSpeed(e);},()=>{I.toggleSkipInactive();},()=>{I.play();},()=>{I.pause();},(e,t)=>{I.goto(e,t);},(e,t,n=!1,i)=>{I.playRange(e,t,n,i);},function(e){D[e?"unshift":"push"]((()=>{v=e,i(9,v);}));},function(e){D[e?"unshift":"push"]((()=>{I=e,i(10,I);}));},()=>M(),function(e){D[e?"unshift":"push"]((()=>{y=e,i(8,y);}));}]}class Pn extends J{constructor(e){super(),z(this,e,Yn,Kn,s,{width:13,height:14,maxScale:15,events:16,skipInactive:0,autoPlay:1,speedOption:2,speed:17,showController:3,tags:4,inactiveColor:5,getMirror:18,triggerResize:19,toggleFullscreen:6,addEventListener:20,addEvent:21,getMetaData:22,getReplayer:23,toggle:24,setSpeed:25,toggleSkipInactive:26,play:27,pause:28,goto:29,playRange:30},null,[-1,-1]);}get getMirror(){return this.$$.ctx[18]}get triggerResize(){return this.$$.ctx[19]}get toggleFullscreen(){return this.$$.ctx[6]}get addEventListener(){return this.$$.ctx[20]}get addEvent(){return this.$$.ctx[21]}get getMetaData(){return this.$$.ctx[22]}get getReplayer(){return this.$$.ctx[23]}get toggle(){return this.$$.ctx[24]}get setSpeed(){return this.$$.ctx[25]}get toggleSkipInactive(){return this.$$.ctx[26]}get play(){return this.$$.ctx[27]}get pause(){return this.$$.ctx[28]}get goto(){return this.$$.ctx[29]}get playRange(){return this.$$.ctx[30]}}class Qn extends Pn{constructor(e){super({target:e.target,props:e.data||e.props});}}

    const projector = document.createElement("div");
    projector.className = 'lulu-projector';
    document.body.appendChild(projector);


    const contentDom = document.createElement("div");
    contentDom.className = 'lulu-projector-content';
    projector.appendChild(contentDom);

    let player = null;
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'onPlayRecorder') {
            projector.className = 'lulu-projector active';
            contentDom.innerHTML = '';
            player = null;
            player =  new Qn({
                target: contentDom,
                props: {
                    events: request.events,
                    width: 1200,
                    height: 800,
                }
            });
            button.style.backgroundImage = `url(${chrome.runtime.getURL("assets/close_fill.svg")})`;
            button.showCloseButton = true;
            player.play();
            // auto replay
            player.on('finish', () => {
                player.play();
            });
        }
    });

    recorderEventCenter.subscribe('onSave', (_, body) => {
        // send to popup.js
        chrome.runtime.sendMessage({ type: 'onSaveRecorder', body });
    });

}));
