(function (nx, global) {

    nx.define("nx.util", {
        static: true,
        methods: {
            uuid: function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0,
                        v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                }).toUpperCase();
            },
            without: function (array, item) {
                var index;
                while ((index = array.indexOf(item)) != -1) {
                    array.splice(index, 1);
                }
                return array;
            },
            find: function (array, iterator, context) {
                var result;
                array.some(function (value, index, list) {
                    if (iterator.call(context || this, value, index, list)) {
                        result = value;
                        return true;
                    }
                });
                return result;
            },
            uniq: function (array, iterator, context) {
                var initial = iterator ? array.map(iterator.bind(context || this)) : array;
                var results = [];
                nx.each(initial, function (value, index) {
                    if (results.indexOf(value) == -1) {
                        results.push(array[index]);
                    }
                });
                return results;
            },
            indexOf: function (array, item) {
                return array.indexOf(item);
            },
            setProperty: function (source, key, value, owner) {
                if (value !== undefined) {
                    if (nx.is(value, 'String')) {
                        if (value.substr(0, 5) == 'model') { // directly target'bind model
                            source.setBinding(key, value + ',direction=<>', source);
                        } else if (value.substr(0, 2) == '{#') { // bind owner's property
                            source.setBinding(key, 'owner.' + value.substring(2, value.length - 1) + ',direction=<>', owner);
                        } else if (value.substr(0, 1) == '{') { // bind owner's model
                            source.setBinding(key, 'owner.model.' + value.substring(1, value.length - 1), owner);
                        } else {
                            source.set(key, value);
                        }
                    } else {
                        source.set(key, value);
                    }
                }
            },
            loadScript: function (url, callback) {
                var script = document.createElement("script");
                script.type = "text/javascript";

                if (script.readyState) { //IE
                    script.onreadystatechange = function () {
                        if (script.readyState == "loaded" ||
                            script.readyState == "complete") {
                            script.onreadystatechange = null;
                            callback();
                        }
                    };
                } else { //Others
                    script.onload = function () {
                        callback();
                    };
                }
                script.src = url;
                document.getElementsByTagName("head")[0].appendChild(script);
            },
            parseURL: function (url) {
                var a = document.createElement('a');
                a.href = url;
                return {
                    source: url,
                    protocol: a.protocol.replace(':', ''),
                    host: a.hostname,
                    port: a.port,
                    query: a.search,
                    params: (function () {
                        var ret = {},
                            seg = a.search.replace(/^\?/, '').split('&'),
                            len = seg.length,
                            i = 0,
                            s;
                        for (; i < len; i++) {
                            if (!seg[i]) {
                                continue;
                            }
                            s = seg[i].split('=');
                            ret[s[0]] = s[1];
                        }
                        return ret;
                    })(),
                    file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
                    hash: a.hash.replace('#', ''),
                    path: a.pathname.replace(/^([^\/])/, '/$1'),
                    relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
                    segments: a.pathname.replace(/^\//, '').split('/')
                };
            },
            keys: function (obj) {
                return Object.keys(obj);
            },
            values: function (obj) {
                var values = [];
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        values.push(obj[key]);
                    }
                }
                return values;
            },
            boundHitTest: function (sourceBound, targetBound) {
                var t = targetBound.top >= sourceBound.top && targetBound.top <= ((sourceBound.top + sourceBound.height)),
                    l = targetBound.left >= sourceBound.left && targetBound.left <= (sourceBound.left + sourceBound.width),
                    b = (sourceBound.top + sourceBound.height) >= (targetBound.top + targetBound.height) && (targetBound.top + targetBound.height) >= sourceBound.top,
                    r = (sourceBound.left + sourceBound.width) >= (targetBound.left + targetBound.width) && (targetBound.left + targetBound.width) >= sourceBound.left,
                    hm = sourceBound.top >= targetBound.top && (sourceBound.top + sourceBound.height) <= (targetBound.top + targetBound.height),
                    vm = sourceBound.left >= targetBound.left && (sourceBound.left + sourceBound.width) <= (targetBound.left + targetBound.width);

                return (t && l) || (b && r) || (t && r) || (b && l) || (t && vm) || (b && vm) || (l && hm) || (r && hm);
            },
            isFirefox: function () {
                return navigator.userAgent.indexOf("Firefox") > 0;
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    nx.util.query = (function () {
        var i,
            internal = {
                publics: {
                    select: function (array, selector) {
                        var rslt = [];
                        if ($.isArray(array) && $.isFunction(selector)) {
                            var i, item;
                            for (i = 0; i < array.length; i++) {
                                item = array[i];
                                if (selector(item)) {
                                    rslt.push(item);
                                }
                            }
                        }
                        return rslt;
                    },
                    group: function (array, grouper) {
                        var map;
                        if ($.isFunction(grouper)) {
                            map = {};
                            var i, id, group;
                            for (i = 0; i < array.length; i++) {
                                id = grouper(array[i]);
                                if (!id || typeof id !== "string") {
                                    continue;
                                }
                                group = map[id] = map[id] || [];
                                group.push(array[i]);
                            }
                        } else {
                            map = array;
                        }
                        return map;
                    },
                    aggregate: function (array, aggregater) {
                        var rslt = null, key;
                        if ($.isFunction(aggregater)) {
                            if ($.isArray(array)) {
                                rslt = aggregater(array);
                            } else {
                                rslt = [];
                                for (key in array) {
                                    rslt.push(aggregater(array[key], key));
                                }
                            }
                        }
                        return rslt;
                    }
                },
                privates: {
                    aggregate: function (array, args) {
                        var rslt, grouper = null, aggregater = null;
                        // get original identfier and aggregater
                        if ($.isArray(args)) {
                            if (typeof args[args.length - 1] === "function") {
                                aggregater = args.pop();
                            }
                            grouper = (args.length > 1 ? args : args[0]);
                        } else {
                            grouper = args.map;
                            aggregater = args.aggregate;
                        }
                        // translate grouper into function if possible
                        if (typeof grouper === "string") {
                            grouper = grouper.replace(/\s/g, "").split(",");
                        }
                        if ($.isArray(grouper) && grouper[0] && typeof grouper[0] === "string") {
                            grouper = (function (keys) {
                                return function (obj) {
                                    var i, o = {};
                                    for (i = 0; i < keys.length; i++) {
                                        o[keys[i]] = obj[keys[i]];
                                    }
                                    return JSON.stringify(o);
                                };
                            })(grouper);
                        }
                        // do map aggregate
                        rslt = internal.publics.aggregate(internal.publics.group(array, grouper), aggregater);
                        return rslt;
                    },
                    mapping: function (array, mapper) {
                        var i, rslt;
                        if (mapper === true) {
                            rslt = EXPORT.clone(array);
                        } else if ($.isFunction(mapper)) {
                            if ($.isArray(array)) {
                                rslt = [];
                                for (i = 0; i < array.length; i++) {
                                    rslt.push(mapper(array[i], i));
                                }
                            } else {
                                rslt = mapper(array, 0);
                            }
                        } else {
                            if ($.isArray(array)) {
                                rslt = array.slice();
                            } else {
                                rslt = array;
                            }
                        }
                        return rslt;
                    },
                    orderby: function (array, comparer) {
                        if (typeof comparer === "string") {
                            comparer = comparer.replace(/^\s*(.*)$/, "$1").replace(/\s*$/, "").replace(/\s*,\s*/g, ",").split(",");
                        }
                        if ($.isArray(comparer) && comparer[0] && typeof comparer[0] === "string") {
                            comparer = (function (keys) {
                                return function (o1, o2) {
                                    var i, key, desc;
                                    if (!o1 && !o2) {
                                        return 0;
                                    }
                                    for (i = 0; i < keys.length; i++) {
                                        key = keys[i];
                                        desc = /\sdesc$/.test(key);
                                        key = key.replace(/(\s+desc|\s+asc)$/, "");
                                        if (o1[key] > o2[key]) {
                                            return desc ? -1 : 1;
                                        } else if (o2[key] > o1[key]) {
                                            return desc ? 1 : -1;
                                        }
                                    }
                                    return 0;
                                };
                            })(comparer);
                        }
                        if (comparer && typeof comparer === "function") {
                            array.sort(comparer);
                        }
                        return array;
                    }
                },
                query: function (array, options) {
                    /**
                     * @doctype MarkDown
                     * options:
                     * - options.array [any*]
                     *   - the target array
                     * - options.select: function(any){return boolean;}
                     *   - *optional*
                     *   - pre-filter of the array
                     * - options.aggregate: {grouper:grouper,aggregater:aggregater} or [proplist, aggregater] or [prop, prop, ..., aggregater]
                     *   - *optional*
                     *   - proplist: "prop,prop,..."
                     *   - prop: property name on array items
                     *   - grouper: map an array item into a string key
                     *   - aggregater: function(mapped){return aggregated}
                     * - options.mapping: function(item){return newitem}
                     *   - *optional*
                     * - options.orderby: proplist or [prop, prop, ...]
                     *   - *optional*
                     */
                    if (arguments.length == 1) {
                        options = array;
                        array = options.array;
                    }
                    if (!array) {
                        return array;
                    }
                    if (options.select) {
                        array = internal.publics.select(array, options.select);
                    }
                    if (options.aggregate) {
                        array = internal.privates.aggregate(array, options.aggregate);
                    }
                    if (options.mapping) {
                        array = internal.privates.mapping(array, options.mapping);
                    }
                    if (options.orderby) {
                        array = internal.privates.orderby(array, options.orderby);
                    }
                    return array;
                }
            };
        for (i in internal.publics) {
            internal.query[i] = internal.publics[i];
        }
        return internal.query;
    })();
})(nx, nx.global);
(function (nx, util) {
    /**
     * @link http://webstuff.nfshost.com/anim-timing/Overview.html
     * @link https://developer.mozilla.org/en/DOM/window.requestAnimationFrame
     * @link http://dev.chromium.org/developers/design-documents/requestanimationframe-implementation
     */
    var requestAnimationFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                return window.setTimeout(callback, 1000 / 60);
            };
    })(), cancelAnimationFrame = (function () {
        return window.cancelAnimationFrame ||
            window.cancelRequestAnimationFrame ||
            window.webkitCancelAnimationFrame ||
            window.webkitCancelRequestAnimationFrame ||
            window.mozCancelAnimationFrame ||
            window.mozCancelRequestAnimationFrame ||
            window.msCancelAnimationFrame ||
            window.msCancelRequestAnimationFrame ||
            window.oCancelAnimationFrame ||
            window.oCancelRequestAnimationFrame ||
            window.clearTimeout;
    })();

    nx.define('nx.graphic.Animation', {
        statics: {
            requestAnimationFrame: requestAnimationFrame,
            cancelAnimationFrame: cancelAnimationFrame
        },
        events: ['complete'],
        properties: {
            callback: {
                set: function (value) {
                    this._callback = value;
                    this.createAnimation();
                    if (this.autoStart()) {
                        this.start();
                    }
                },
                get: function () {
                    return this._callback || function () {
                    };
                }
            },
            duration: {
                value: 1000
            },
            interval: {
                value: 1000 / 60
            },
            autoStart: {
                value: false
            },
            complete: {
                value: function () {
                    return function () {
                    };
                }
            },
            context: {
                value: this
            }
        },
        methods: {
            init: function (opts, args) {
                this.inherited(arguments);
                this.sets(opts);
            },

            createAnimation: function () {
                var self = this;
                var callback = this.callback();
                var duration = this.duration();
                var interval = this.interval();
                var startTime, progress, id, timestamp, lastTime = 0;
                this.fn = function () {
                    timestamp = +new Date();
                    if (!startTime) {
                        startTime = +new Date();
                        progress = 0;
                    } else {
                        if (!duration) {
                            progress = 0;
                        } else {
                            progress = (timestamp - startTime) / duration;
                        }
                    }
                    if (progress >= 1 || (timestamp - lastTime) >= interval) {
                        lastTime = timestamp;
                        if (progress > 1) {
                            progress = 1;
                        }
                        if (callback.call(self.context(), progress) === false) {
                            //break  when user return false
                            duration = 1;
                            self._completeFN();
                        }

                    }
                    if (progress < 1) {
                        self.ani_id = requestAnimationFrame(self.fn);
                    } else if (progress == 1) {
                        self._completeFN();
                    }
                };
            },

            start: function () {
                this.ani_id = requestAnimationFrame(this.fn);
            },
            stop: function () {
                cancelAnimationFrame(this.ani_id);
            },
            _completeFN: function () {
                this.complete().call(this.context());
                this.stop();
                this.fire("complete");
            }
        }
    });
})(nx, nx.util);



(function (nx,global) {
    var zIndex = 1000;
    /**
     * Popup z-index mamager
     * @class nx.widget.ZIndexManager
     * @static
     */
    nx.define('nx.widget.ZIndexManager',null,{
        static: true,
        methods: {
            getIndex: function () {
                return zIndex++;
            }
        }
    });
}(nx,nx.global));
(function (nx, global) {


    var Container = nx.define(nx.ui.Component, {
        view: {
            props: {
                'class': 'nx n-popupContainer',
                style: {
                    'position': 'absolute',
                    'top': '0px',
                    'left': '0px'

                }
            }
        }
    });

    /**
     * Popup container
     * @class nx.ui.PopupContainer
     * @static
     */

    nx.define("nx.ui.PopupContainer", {
        static: true,
        properties: {
            container: {
                value: function () {
                    return new Container();
                }
            }
        },
        methods: {
            addPopup: function (popup) {
                this.container().view().dom().appendChild(popup.view().dom());
            }
        }
    });


    nx.dom.Document.ready(function () {
//        if (document.body.firstChild) {
//            document.body.insertBefore(nx.ui.PopupContainer.container().view().$dom, document.body.firstChild);
//        } else {
//            document.body.appendChild(nx.ui.PopupContainer.container().view().$dom);
//        }
    }, this);


    setTimeout(function () {
        if (document.body) {
            if (document.body.firstChild) {
                document.body.insertBefore(nx.ui.PopupContainer.container().view().dom().$dom, document.body.firstChild);
            } else {
                document.body.appendChild(nx.ui.PopupContainer.container().view().dom().$dom);
            }
        } else {
            setTimeout(arguments.callee, 10);
        }
    }, 0);


})(nx, nx.global);
(function (nx, global) {

    var Container = nx.ui.PopupContainer;

    /**
     * Base popup class
     * @class nx.ui.Popup
     * @extend nx.ui.Component
     */
    nx.define("nx.ui.Popup", nx.ui.Component, {
        events: ['open', 'close'],
        view: {
            props: {
                style: "position:absolute",
                tabindex: -1
            },
            events: {
                blur: function (sender, evt) {
                    // this.close();
                }
            }
        },
        properties: {
            /**
             * @property target
             */
            target: {
                value: document
            },
            /**
             * [bottom,top,left,right]
             * @property direction
             */
            direction: {
                value: "auto" //[bottom,top,left,right]
            },
            /**
             * @property width
             */
            width: {
                value: null
            },
            /**
             * @property height
             */
            height: {
                value: null
            },
            /**
             * @property offset
             */
            offset: {
                value: 0
            },
            /**
             * @property offsetX
             */
            offsetX: {
                value: 0
            },
            /**
             * @property offsetY
             */
            offsetY: {
                value: 0
            },
            /**
             * @property align
             */
            align: {
                value: false
            },
            /**
             * @property position
             */
            position: {
                value: 'absolute'
            },
            /**
             * @property location
             */
            location: {
                value: "outer" // outer inner
            },
            /**
             * @property listenResize
             */
            listenResize: {
                value: false
            },
            /**
             * @property lazyClose
             */
            lazyClose: {
                value: false
            },
            /**
             * @property pin
             */
            pin: {
                value: false
            },
            /**
             * @property registeredPositionMap
             */
            registeredPositionMap: {
                value: function () {
                    return {};
                }
            },
            scrollClose: {
                value: false
            }
        },
        methods: {

            init: function (inPros) {
                this.inherited(inPros);
                this.sets(inPros);
                this._defaultConfig = this.gets();
            },
            attach: function (args) {
                this.inherited(args);
                this.appendToPopupContainer();
            },
            appendToPopupContainer: function () {
                if (!this._appended) {
                    Container.addPopup(this);
                    this._delayCloseEvent();
                    this._listenResizeEvent();
                    this._appended = true;
                    this._closed = false;
                }
            },
            /**
             * Open popup
             * @method open
             * @param args {Object} config
             */
            open: function (args) {
                this._clearTimeout();


                var left = 0;
                var top = 0;

                var root = this.view().dom();

                this.sets(args || {});


                this._resetOffset(args);
                var prevPosition = root.get("data-nx-popup-direction");
                if (prevPosition) {
                    root.removeClass(prevPosition);
                }
                this.appendToPopupContainer();


                //process target

                var target = this.target();
                var targetSize = {
                    width: 0,
                    height: 0
                };

                if (target.resolve && target.view) {
                    target = target.view();
                }

                // if target is a point {x:Number,y:Number}
                if (target.x !== undefined && target.y !== undefined) {
                    left = target.x;
                    top = target.y;
                } else if (target != document) {
                    var elOffset = target.getOffset();
                    left = elOffset.left;
                    top = elOffset.top;
                    targetSize = target.getBound();
                } else {
                    left = 0;
                    top = 0;
                }


                //process
                var width = this.width();
                var height = this.height();
                if (this.align()) {
                    width = targetSize.width || 0;
                }

                if (width) {
                    root.setStyle('width', width);
                    root.setStyle("max-width", width);
                    this.width(width);
                }

                if (height) {
                    root.setStyle('height', height);
                }

                root.setStyle("display", "block");


                //process position

                left += this.offsetX();
                top += this.offsetY();


                var popupSize = this._popupSize = root.getBound();
                var offset = this.offset();
                var innerPositionMap = {
                    "outer": {
                        bottom: {
                            left: left,
                            top: top + targetSize.height + offset
                        },
                        top: {
                            left: left,
                            top: top - popupSize.height - offset
                        },
                        right: {
                            left: left + targetSize.width + offset,
                            top: top
                        },
                        left: {
                            left: left - popupSize.width - offset,
                            top: top
                        }

                    },
                    "inner": {
                        bottom: {
                            left: left + targetSize.width / 2 - popupSize.width / 2 + offset,
                            top: top
                        },
                        top: {
                            left: left + targetSize.width / 2 - popupSize.width / 2,
                            top: top + targetSize.height - popupSize.height - offset
                        },
                        left: {
                            left: left + targetSize.width - popupSize.width - offset,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        },
                        right: {
                            left: left + offset,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        }

                    },
                    "tooltip": {
                        "bottom": {
                            left: left + targetSize.width / 2 - popupSize.width / 2,
                            top: top + targetSize.height + offset + 2
                        },
                        "bottom-left": {
                            left: left - 22,
                            top: top + targetSize.height + offset + 2
                        },
                        "bottom-right": {
                            left: left + targetSize.width - popupSize.width + 22,
                            top: top + targetSize.height + offset + 2
                        },
                        "top": {
                            left: left + targetSize.width / 2 - popupSize.width / 2,
                            top: top - popupSize.height - offset - 2
                        },
                        "top-left": {
                            left: left - 22,
                            top: top - popupSize.height - offset - 2
                        },
                        "top-right": {
                            left: left + targetSize.width / 2 - popupSize.width / 2 + 22,
                            top: top - popupSize.height - offset - 2
                        },
                        "right": {
                            left: left + targetSize.width + offset + 2,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        },
                        "right-top": {
                            left: left + targetSize.width + offset + 2,
                            top: top <= 0 ? 0 : top - 22
                        },
                        "right-bottom": {
                            left: left + targetSize.width + offset + 2,
                            top: top + targetSize.height - popupSize.height
                        },
                        "left": {
                            left: left - popupSize.width - offset - 2,
                            top: top + targetSize.height / 2 - popupSize.height / 2
                        },
                        "left-top": {
                            left: left - popupSize.width - offset - 2,
                            top: top <= 0 ? 0 : top - 22
                        },
                        "left-bottom": {
                            left: left - popupSize.width - offset - 2,
                            top: top + targetSize.height - popupSize.height
                        }
                    }
                };


                var location = this.location();
                this._directionMap = innerPositionMap[location];


                var direction = this.direction();
                if (direction == null || direction == "auto") {
                    direction = this._hitTest();
                }
                if (!direction) {
                    direction = "bottom";
                }
                var positionObj = this._directionMap[direction];
                root.setStyles({
                    "top": positionObj.top,
                    "left": positionObj.left,
                    "position": "position",
                    "z-index": nx.widget.ZIndexManager.getIndex(),
                    'display': 'block'

                });
                //position.setSize(this,popupSize);

                root.set("data-nx-popup-direction", direction);
                root.addClass("popup");
                root.addClass(direction);
                root.addClass("in");
                this.fire("open");
                this.dom().$dom.focus();
            },
            /**
             * close popup
             * @method close
             * @param force
             */
            close: function (force) {

                this._clearTimeout();

                var root = this.view().dom();

                if (this.pin()) {
                    return;
                }

                if (force || !this.lazyClose()) {
                    this._closed = true;
                    root.removeClass('in');
                    root.setStyle("display", "none");
                    this.fire("close");
                } else {
                    this._delayClose();
                }
            },
            _clearTimeout: function () {
                if (this.timer) {
                    clearTimeout(this.timer);
                }
            },
            _delayClose: function () {
                var self = this;
                this._clearTimeout();
                this.timer = setTimeout(function () {
                    self.close(true);
                }, 500);
            },
            _delayCloseEvent: function () {

                if (this.lazyClose()) {
                    //                    this.on("mouseover", function () {
                    //                        var element = this.view().dom().$dom;
                    //                        var target = event.target;
                    //                        var related = event.relatedTarget;
                    //                        if (target && !element.contains(related) && target !== related) {
                    //                            if (this.timer) {
                    //                                clearTimeout(this.timer);
                    //                            }
                    //                        }
                    //                    }, this);
                    //
                    //                    this.on("mouseout", function () {
                    //                        var element = this.view().dom().$dom;
                    //                        var target = event.target;
                    //                        var related = event.relatedTarget;
                    //                        if (!element.contains(related) && target !== related) {
                    //                            clearTimeout(this.timer);
                    //                            this.close(true);
                    //                        }
                    //                    }, this);


                    this.on("mouseenter", function () {
                        if (this.timer) {
                            clearTimeout(this.timer);
                        }
                    }, this);

                    this.on("mouseleave", function () {
                        clearTimeout(this.timer);
                        this.close(true);
                    }, this);
                }
            },
            _listenResizeEvent: function () {
                var self = this;
                var timer;
                if (this.listenResize()) {
                    //                    nx.app.on('resize', function () {
                    //                        if (!this._closed) {
                    //                            if (timer) {
                    //                                clearTimeout(timer)
                    //                            }
                    //                            timer = setTimeout(function () {
                    //                                self.open();
                    //                            }, 22);
                    //                        }
                    //
                    //                    }, this);
                    //
                    //
                    //                    nx.app.on('scroll', function () {
                    //                        if (timer) {
                    //                            clearTimeout(timer)
                    //                        }
                    //                        if (!this._closed) {
                    //                            timer = setTimeout(function () {
                    //                                self.open();
                    //                            }, 22);
                    //                        }
                    //                    }, this);

                }


                if (this.scrollClose()) {
                    //                    nx.app.on('scroll', function () {
                    //                        if (timer) {
                    //                            clearTimeout(timer)
                    //                        }
                    //                        self.close(true);
                    //                    }, this);
                }
            },
            _hitTest: function () {
                var docRect = nx.dom.Document.docRect();

                var keys = Object.keys(this._directionMap);
                var testDirection = keys[0];
                keys.some(function (direction) {
                    var elementRect = {
                        left: this._directionMap[direction].left,
                        top: this._directionMap[direction].top,
                        width: this._popupSize.width,
                        height: this._popupSize.height

                    };
                    //make sure it visible
                    var resulte = elementRect.left >= docRect.scrollX &&
                        elementRect.top >= docRect.scrollY &&
                        elementRect.left + elementRect.width <= docRect.width + docRect.scrollX &&
                        elementRect.top + elementRect.height <= docRect.height + docRect.scrollY;

                    if (resulte) {
                        testDirection = direction;
                        return true;
                    }
                }, this);
                return testDirection;
            },
            _resetOffset: function (args) {
                if (args) {
                    //                    if (!args.offset) {
                    //                        this.offset(this.offset.defaultValue);
                    //                    }
                    //
                    //
                    //                    if (!args.offsetX) {
                    //                        this.offsetX(this.offsetX.defaultValue);
                    //                    }
                    //
                    //
                    //                    if (!args.offsetY) {
                    //                        this.offsetY(this.offsetY.defaultValue);
                    //                    }
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     * UI popover class
     * @class nx.ui.Popover
     * @extend nx.ui.Popup
     */
    nx.define("nx.ui.Popover", nx.ui.Popup, {
        properties: {
            /**
             * Popover's title
             */
            title: {
                get: function () {
                    return this._title;
                },
                set: function (value) {
                    if (value) {
                        this.view("title").dom().setStyle("display", "block");

                    } else {
                        this.view("title").dom().setStyle("display", "none");
                    }
                    if (this._title != value) {
                        this._title = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            location: {
                value: "tooltip"
            }
        },
        view: {
            props: {
                'class': 'popover fade',
                style: {
                    outline: "none"
                },
                tabindex: -1
            },
            events: {
                blur: function (sender, evt) {
                    // this.close();
                }
            },
            content: [{
                props: {
                    'class': 'arrow'
                }
            }, {
                tag: 'h3',
                name: 'title',
                props: {
                    'class': 'popover-title',
                    style: {
                        display: 'none'
                    }
                },
                content: "{#title}"
            }, {
                name: 'body',
                props: {
                    'class': 'popover-content'
                }
            }]
        },
        methods: {
            getContainer: function () {
                return this.view('body').dom();
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {
    /**
     * Global drag manager

     var Component = nx.define(nx.ui.Component, {
        view: {
            content: {
                name: "stage",
                type: 'nx.graphic.TopologyStage',
                props: {
                    width: 600,
                    height: 600
                },
                content: {
                    name: 'a',
                    type: 'nx.graphic.Rect',
                    props: {
                        x: 100,
                        y: 10,
                        width: 100,
                        height: 100,
                        fill: '#f0f'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'dragmove': '{#_dragmove}'
                    }
                }
            }
        },
        properties: {
            positionX: {
                value: 150
            }
        },
        methods: {
            _mousedown: function (sender, event) {
                event.captureDrag(sender.owner());
            },
            _dragmove: function (sender, event) {
                sender.set("x", sender.get("x") * 1 + event.drag.delta[0]);
                sender.set("y", sender.get("y") * 1 + event.drag.delta[1]);
            }

        }
     });


     var app = new nx.ui.Application();
     var comp = new Component();
     comp.attach(app);


     * @class nx.graphic.DragManager
     * @static
     * @extend nx.Observable
     */

    nx.define("nx.graphic.DragManager", nx.Observable, {
        static: true,
        properties: {
            /**
             * activated component.
             * @property node {nx.graphic.Component}
             */
            node: {},
            /**
             * All coordinate will reference to this element.
             * @property referrer {DOMELement}
             */
            referrer: {},
            /**
             * drag track
             * @property track {Array}
             */
            track: {},
            /**
             * Dragging indicator
             * @property dragging
             * @type Boolean
             */
            dragging: {
                value: false
            }
        },
        methods: {
            init: function () {
                window.addEventListener('mousedown', this._capture_mousedown.bind(this), true);
                window.addEventListener('mousemove', this._capture_mousemove.bind(this), true);
                window.addEventListener('mouseup', this._capture_mouseup.bind(this), true);
            },
            /**
             * Start drag event capture
             * @method start
             * @param evt {Event} original dom event
             * @returns {function(this:nx.graphic.DragManager)}
             */
            start: function (evt) {
                return function (node, referrer) {
                    // make sure only one node can capture the "drag" event
                    if (node && !this.node()) {
                        // FIXME may not be right on global
                        referrer = (referrer === window || referrer === document || referrer === document.body) ? document.body : (referrer || node);
                        referrer = (typeof referrer.dom === "function") ? referrer.dom().$dom : referrer;
                        this.node(node);
                        this.referrer(referrer);
                        // track and data
                        var bound, track = [];
                        bound = referrer.getBoundingClientRect();
                        this.track(track);
                        track.push([evt.pageX - document.body.scrollLeft - bound.left, evt.pageY - document.body.scrollTop - bound.top]);
                        track[0].time = evt.timeStamp;
                        evt.dragCapture = function () {};
                        return true;
                    }
                }.bind(this);
            },
            /**
             * Drag move handler
             * @method move
             * @param evt {Event} original dom event
             */
            move: function (evt) {
                var node = this.node();
                if (node) {
                    // attach to the event
                    evt.drag = this._makeDragData(evt);
                    if (!this.dragging()) {
                        this.dragging(true);
                        node.fire("dragstart", evt);
                    }
                    // fire events
                    node.fire("dragmove", evt);
                }
            },
            /**
             * Drag end
             * @method end
             * @param evt {Event} original dom event
             */
            end: function (evt) {
                var node = this.node();
                if (node) {
                    // attach to the event
                    evt.drag = this._makeDragData(evt);
                    // fire events
                    if (this.dragging()) {
                        node.fire("dragend", evt);
                    }
                    // clear status
                    this.node(null);
                    this.track(null);
                    this.dragging(false);
                }
            },
            _makeDragData: function (evt) {
                var track = this.track();
                var bound = this.referrer().getBoundingClientRect();
                var current = [evt.pageX - document.body.scrollLeft - bound.left, evt.pageY - document.body.scrollTop - bound.top],
                    origin = track[0],
                    last = track[track.length - 1];
                current.time = evt.timeStamp;
                track.push(current);
                // FIXME optimize if track too large
                if (track.length > 20) {
                    track.splice(1, track.length - 20);
                }
                // TODO make sure the data is correct when target applied a matrix
                return {
                    target: this.node(),
                    accord: this.referrer(),
                    origin: origin,
                    current: current,
                    offset: [current[0] - origin[0], current[1] - origin[1]],
                    delta: [current[0] - last[0], current[1] - last[1]],
                    track: track
                };
            },
            _capture_mousedown: function (evt) {
                if (evt.captureDrag) {
                    this._lastDragCapture = evt.captureDrag;
                }
                if (evt.type === "mousedown") {
                    evt.captureDrag = this.start(evt);
                } else {
                    evt.captureDrag = function () {};
                }
            },
            _capture_mousemove: function (evt) {
                this.move(evt);
            },
            _capture_mouseup: function (evt) {
                this.end(evt);
            }
        }
    });

})(nx, nx.global);

(function (nx, global) {

    nx.Object.delegateEvent = function (source, sourceEvent, target, targetEvent) {
        if (!target.can(targetEvent)) {
            source.on(sourceEvent, function (sender, event) {
                target.fire(targetEvent, event);
            });
            nx.Object.extendEvent(target, targetEvent);
        }
    };


    //http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm

    var ease = function (t, b, c, d) {
        var ts = (t /= d) * t;
        var tc = ts * t;
        return b + c * (-0.6475 * tc * ts + 0.7975 * ts * ts + -2.3 * tc + 3.2 * ts + -0.05 * t);
    };

    var cssHook = {
        transform: 'webkitTransform'
    };


    /**
     * Base class of graphic component
     * @class nx.graphic.Component
     * @extend nx.ui.Component
     * @module nx.graphic
     */

    nx.define('nx.graphic.Component', nx.ui.Component, {
        /**
         * Fire when drag start
         * @event dragstart
         * @param sender {Object}  Trigger instance
         * @param event {Object} original event object
         */
        /**
         * Fire when drag move
         * @event dragmove
         * @param sender {Object}  Trigger instance
         * @param event {Object} original event object , include delta[x,y] for the shift
         */
        /**
         * Fire when drag end
         * @event dragend
         * @param sender {Object}  Trigger instance
         * @param event {Object} original event object
         */
        events: ['dragstart', 'dragmove', 'dragend'],
        properties: {
            /**
             * Set/get x translate
             * @property translateX
             */
            translateX: {
                set: function (value) {
                    this.setTransform(value);
                }
            },
            /**
             * Set/get y translate
             * @property translateY
             */
            translateY: {
                set: function (value) {
                    this.setTransform(null, value);
                }
            },
            /**
             * Set/get scale
             * @property scale
             */
            scale: {
                set: function (value) {
                    this.setTransform(null, null, value);
                }
            },
            /**
             * Set/get translate, it set/get as {x:number,y:number}
             * @property translate
             */
            translate: {
                get: function () {
                    return {
                        x: this._translateX || 0,
                        y: this._translateY || 0
                    };
                },
                set: function (value) {
                    this.setTransform(value.x, value.y);
                }
            },
            /**
             * Set/get element's visibility
             * @property visible
             */
            visible: {
                get: function () {
                    return this._visible !== undefined ? this._visible : true;
                },
                set: function (value) {
                    if (this.view()) {
                        if (value) {
                            this.view().dom().removeClass('n-hidden');
                        } else {
                            this.view().dom().addClass('n-hidden');
                        }

                    }
                    this._visible = value;
                }
            },
            /**
             * Set/get css class
             * @property class
             */
            'class': {
                get: function () {
                    return this._class !== undefined ? this._class : '';
                },
                set: function (value) {
                    if (this._class !== value) {
                        this._class = value;
                        this.dom().addClass(value);
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        view: {},
        methods: {
            init: function (args) {
                this.inherited(args);
                this.sets(args);
            },
            /**
             * Set component's transform
             * @method setTransform
             * @param [translateX] {Number} x axle translate
             * @param [translateY] {Number} y axle translate
             * @param [scale] {Number} element's scale
             * @param [duration=0] {Number} transition time, unite is second
             */
            setTransform: function (translateX, translateY, scale, duration) {

                var tx = parseFloat(translateX != null ? translateX : this._translateX || 0);
                var ty = parseFloat(translateY != null ? translateY : this._translateY || 0);
                var scl = parseFloat(scale != null ? scale : this._scale || 1);

                this.setStyle('transform', ' matrix(' + scl + ',' + 0 + ',' + 0 + ',' + scl + ',' + tx + ', ' + ty + ')', duration);
                //this.setStyle('transform', ' translate(' + tx + 'px, ' + ty + 'px) scale(' + scl + ')', duration);

                this.dom().$dom.setAttribute('transform', ' translate(' + tx + ', ' + ty + ') scale(' + scl + ')');

                this._translateX = tx;
                this._translateY = ty;
                this._scale = scl;
            },
            /**
             * Set component's css style
             * @method setStyle
             * @param key {String} css key
             * @param value {*} css value
             * @param [duration=0] {Number} set transition time
             * @param [callback]
             * @param [context]
             */
            setStyle: function (key, value, duration, callback, context) {
                if (duration) {
                    this.setTransition(callback, context, duration);
                } else if (callback) {
                    setTimeout(function () {
                        callback.call(context || this);
                    }, 0);
                }


                //todo optimize
                var dom = this.dom().$dom;
                dom.style[key] = value;

                if (cssHook[key]) {
                    dom.style[cssHook[key]] = value;
                }
            },
            setTransition: function (callback, context, duration) {
                var el = this.dom();
                if (duration) {
                    el.setStyle('transition', 'all ' + duration + 's ease');
                    this.on('transitionend', function fn() {
                        if (callback) {
                            callback.call(context || this);
                        }
                        el.setStyle('transition', '');
                        this.off('transitionend', fn, this);
                    }, this);
                } else {
                    el.setStyle('transition', '');
                    if (callback) {
                        setTimeout(function () {
                            callback.call(context || this);
                        }, 0);
                    }
                }
            },
            /**
             * Append component's element to parent node or other dom element
             * @param [parent] {nx.graphic.Component}
             * @method append
             */
            append: function (parent) {
                var parentElement;
                if (parent) {
                    parentElement = this._parentElement = parent.view().dom();
                } else {
                    parentElement = this._parentElement = this._parentElement || this.view().dom().parentNode(); //|| this.parent().view();
                }
                if (parentElement && parentElement.$dom && this._resources && this.view() && !parentElement.contains(this.view().dom())) {
                    parentElement.appendChild(this.view().dom());
                }
            },
            /**
             * Remove component's element from dom tree
             * @method remove
             */
            remove: function () {
                var parentElement = this._parentElement = this._parentElement || this.view().dom().parentNode();
                if (parentElement && this._resources && this.view()) {
                    parentElement.removeChild(this.view().dom());
                }
            },
            /**
             * Get component's bound, delegate element's getBoundingClientRect function
             * @method getBound
             * @returns {*|ClientRect}
             */
            getBound: function () {

                //console.log(this.dom().$dom.getBoundingClientRect())
                //debugger;
                return this.dom().$dom.getBoundingClientRect();
            },
            /**
             * Hide component
             * @method hide
             */
            hide: function () {
                this.visible(false);
            },
            /**
             * Show component
             * @method show
             */
            show: function () {
                this.visible(true);
            },
            /**
             * Set animation for element,pass a config to this function
             * {
             *      to :{
             *          attr1:value,
             *          attr2:value,
             *          ...
             *      },
             *      duration:Number,
             *      complete:Function
             * }
             * @method animate
             * @param config {JSON}
             */
            animate: function (config) {
                var self = this;
                var aniMap = [];
                var el = this.view();
                nx.each(config.to, function (value, key) {
                    var oldValue = this.has(key) ? this.get(key) : el.getStyle(key);
                    aniMap.push({
                        key: key,
                        oldValue: oldValue,
                        newValue: value
                    });
                }, this);

                if (this._ani) {
                    this._ani.stop();
                    this._ani.dispose();
                    delete this._ani;
                }

                var ani = this._ani = new nx.graphic.Animation({
                    duration: config.duration || 1000,
                    context: config.context || this
                });
                ani.callback(function (progress) {
                    nx.each(aniMap, function (item) {
                        var value = item.oldValue + (item.newValue - item.oldValue) * progress;
                        //                        var value = ease(progress, item.oldValue, item.newValue - item.oldValue, 1);
                        self.set(item.key, value);
                    });
                    //console.log(progress);
                });

                if (config.complete) {
                    ani.complete(config.complete);
                }
                ani.on("complete", function fn() {
                    /**
                     * Fired when animation completed
                     * @event animationCompleted
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire("animationCompleted");
                    ani.dispose();
                    delete this._ani;
                }, this);
                ani.start();
            },
            _processPropertyValue: function (propertyValue) {
                var value = propertyValue;
                if (nx.is(propertyValue, 'Function')) {
                    value = propertyValue.call(this, this.model(), this);
                }
                return value;
            },
            dispose: function () {
                if (this._resources && this._resources['@root']) {
                    this.view().dom().$dom.remove();
                }
                this.inherited();
            }
        }
    });

})(nx, nx.global);

(function (nx, global) {

    /**
     * SVG group component
     * @class nx.graphic.Group
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Group", nx.graphic.Component, {
        properties: {
            'data-id': {
                set: function (value) {
                    nx.each(this.content(), function (item) {
                        item.set('data-id', value);
                    });
                    this.view().set('data-id', value);
                    this['_data-id'] = value;
                }
            }
        },
        view: {
            tag: 'svg:g'
        },
        methods: {
            move: function (x, y) {
                var translate = this.translate();
                this.setTransform(x + translate.x, y + translate.y);
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    var xlink = 'http://www.w3.org/1999/xlink';
    /**
     * SVG icon component, which icon's define in nx framework
     * @class nx.graphic.Icon
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Icon", nx.graphic.Component, {
        view: {
            tag: 'svg:g',
            content: [
                {
                    name: 'bgtext',
                    tag: 'svg:text'
                },
                {
                    name: 'text',
                    tag: 'svg:text'
                },
                {
                    tag: 'svg:g',
                    name: 'image',
                    content: {
                        name: 'use',
                        tag: 'svg:use'
                    }
                }
            ]
        },
        properties: {
            imageType: {
                value: "font"
            },
            /**
             * set/get icon's type
             * @property iconType
             */
            iconType: {
                get: function () {
                    return this._iconType;
                },
                set: function (value) {
                    var icon = nx.graphic.Icons.get(value.toLowerCase());
                    var size = icon.size;
                    var img = this.view('image').dom();
                    var shapeEL = this.view('text').dom();
                    var bgEL = this.view('bgtext').dom();
                    var useEL = this.view('use').dom();


                    if (icon.font) {

                        shapeEL.setStyle('display', 'block');
                        useEL.setStyle('display', 'none');

                        // front font
                        if (shapeEL.$dom.firstChild) {
                            shapeEL.$dom.removeChild(shapeEL.$dom.firstChild);
                        }
                        shapeEL.$dom.appendChild(document.createTextNode(icon.font[0]));
                        shapeEL.addClass('fontIcon iconShape');
//

                        //background font

                        if (bgEL.$dom.firstChild) {
                            bgEL.$dom.removeChild(bgEL.$dom.firstChild);
                        }
                        bgEL.$dom.appendChild(document.createTextNode(icon.font[1]));
                        bgEL.addClass('fontIcon iconBG');


                        this.imageType('font');

                    } else {

                        shapeEL.setStyle('display', 'none');
                        useEL.setStyle('display', 'block');

                        if (bgEL.$dom.firstChild) {
                            bgEL.$dom.removeChild(bgEL.$dom.firstChild);
                        }
                        bgEL.$dom.appendChild(document.createTextNode('\ue612'));
                        bgEL.addClass('fontIcon iconBG');

                        //compatible with before
                        useEL.$dom.setAttributeNS(xlink, 'xlink:href', '#' + value);
                        img.setStyle('transform', 'translate(' + size.width / -2 + 'px, ' + size.height / -2 + 'px)');

                        this.imageType('image');
                    }


                    this.view().set('iconType', value);
                    this.view().dom().addClass('n-topology-icon');


                    this.size(size);
                    this._iconType = icon.name;


                }
            },
            /**
             * set/get icon size
             * @property size
             */
            size: {
                value: function () {
                    return {
                        width: 36,
                        height: 36
                    };
                }
            },
            color: {
                set: function (value) {
                    if (this.imageType() == 'font') {
                        this.view('text').dom().setStyle('fill', value);
                    }
                    this.view('bgtext').dom().setStyle('fill', this.showIcon() ? '' : value);
                    this._color = value;
                }
            },
            scale: {
                set: function (value) {
                    var shapeEL = this.view('text').dom();
                    var bgEL = this.view('bgtext').dom();
                    var img = this.view('image').dom();
                    var size = this.size();
                    var fontSize = Math.max(size.width, size.height);
                    var _size = this.showIcon() ? fontSize * value : 4 + value * 8;
                    shapeEL.setStyle('font-size', _size);
                    bgEL.setStyle('font-size', _size);

                    if (this.imageType() == 'image' && value) {
                        img.setStyle('transform', 'translate(' + size.width / -2 + 'px, ' + size.height / -2 + 'px) scale(' + value + ')');
                    }

                    // FIXME for firefox bug with g.getBoundingClientRect
                    if (nx.util.isFirefox()) {
                        shapeEL.$dom.setAttribute('transform', ' translate(0, ' + _size / 2 + ')');
                        bgEL.$dom.setAttribute('transform', ' translate(0, ' + _size / 2 + ')');
                    }


                    this._scale = value;
                }
            },
            showIcon: {
                get: function () {
                    return this._showIcon !== undefined ? this._showIcon : true;
                },
                set: function (value) {
                    var shapeEL = this.view('text').dom();
                    var bgEL = this.view('bgtext').dom();
                    var img = this.view('image').dom();
                    if (value) {
                        if (this.imageType() == 'font') {
                            shapeEL.setStyle('display', 'block');
                            bgEL.setStyle('display', 'block');
                        } else {
                            img.setStyle('display', 'block');
                            bgEL.setStyle('display', 'none');
                        }

                        bgEL.removeClass('iconBGActive');

                        this.view().dom().addClass('showIcon');

                    } else {
                        if (this.imageType() == 'font') {
                            shapeEL.setStyle('display', 'none');
                        } else {
                            img.setStyle('display', 'none');
                        }
                        bgEL.addClass('iconBGActive');

                        this.view().dom().removeClass('showIcon');
                    }

                    this._showIcon = value;

                    if (this._color) {
                        this.color(this._color);
                    }

                    if (this._scale) {
                        this.scale(this._scale);
                    }
                }
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    var xlink = "http://www.w3.org/1999/xlink";
    /**
     * Topology device icons collection
     * @class nx.graphic.Icons
     * @static
     */
    var ICONS = nx.define("nx.graphic.Icons", {
        static: true,
        statics: {
            /**
             * Get icons collection
             * @static
             * @property icons
             */
            icons: {}
        },
        methods: {
            /**
             * Get icon by type
             * @param type {String}
             * @returns {element}
             * @method get
             */
            get: function (type) {
                return ICONS.icons[type] || ICONS.icons.switch;
            },
            /**
             * Get icon"s svg string
             * @param type {String}
             * @returns {element}
             * @method getSVGString
             */
            getSVGString: function (type) {
                return topology_icon[type].icon;
            },
            /**
             * Get all types list
             * @returns {Array}
             * @method getTypeList
             */
            getTypeList: function () {
                return Object.keys(topology_icon);
            },
            /**
             * Register a new icon to this collection
             * @method registerIcon
             * @param name {String} icon"s name
             * @param url {URL} icon"s url
             * @param width {Number} icon"s width
             * @param height {Number} icon"s height
             */
            registerIcon: function (name, url, width, height) {
                var icon1 = document.createElementNS(NS, "image");
                icon1.setAttributeNS(XLINK, "href", url);
                ICONS.icons[name] = {
                    size: {
                        width: width,
                        height: height
                    },
                    icon: icon1.cloneNode(true),
                    name: name
                };
            },
            /**
             * Iterate all icons
             * @param inCallback {Function}
             * @param [inContext] {Object}
             * @private
             */
            __each__: function (inCallback, inContext) {
                var callback = inCallback || function () {
                };
                nx.each(topology_icon, function (obj, name) {
                    var icon = obj.icon;
                    callback.call(inContext || this, icon, name, topology_icon);
                });
            }
        }
    });


    var XLINK = "http://www.w3.org/1999/xlink";
    var NS = "http://www.w3.org/2000/svg";


    var topology_icon = {
        switch: {
            width: 32,
            height: 32,
            name: "Switch",
            font: ["\ue618", "\ue619"]
        },
        router: {
            width: 32,
            height: 32,
            name: "Router",
            font: ["\ue61c", "\ue61d"]
        },
        wlc: {
            width: 32,
            height: 32,
            font: ["\ue60f", "\ue610"]
        },
        unknown: {
            width: 32,
            height: 32,
            font: ["\ue612", "\ue611"]
        },
        server: {
            width: 32,
            height: 32,
            font: ["\ue61b", "\ue61a"]
        },
        phone: {
            width: 32,
            height: 32,
            font: ["\ue61e", "\ue61f"]
        },
        nexus5000: {
            width: 32,
            height: 32,
            font: ["\ue620", "\ue621"]
        },
        ipphone: {
            width: 32,
            height: 32,
            font: ["\ue622", "\ue623"]
        },
        host: {
            width: 32,
            height: 32,
            font: ["\ue624", "\ue625"]
        },
        camera: {
            width: 32,
            height: 32,
            font: ["\ue626", "\ue627"]
        },
        accesspoint: {
            width: 32,
            height: 32,
            font: ["\ue628", "\ue629"]
        },
        groups: {
            width: 32,
            height: 32,
            font: ["\ue615", "\ue62f"]
        },
        groupm: {
            width: 32,
            height: 32,
            font: ["\ue616", "\ue630"]
        },
        groupl: {
            width: 32,
            height: 32,
            font: ["\ue617", "\ue631"]
        },
        collapse: {
            width: 16,
            height: 16,
            font: ["\ue62e", "\ue62e"]
        },
        expand: {
            width: 14,
            height: 14,
            font: ["\ue62d", "\ue62d"]
        },
        nodeset: {
            width: 32,
            height: 32,
            font: ["\ue617", "\ue63a"]
        },
        cloud: {
            width: 48,
            height: 48,
            font: ["\ue633", "\ue633"]
        }
    };


    nx.each(topology_icon, function (icon, key) {
        var i = ICONS.icons[key] = {
            size: {width: icon.width, height: icon.height},
            name: key
        };

        if (icon.font) {
            i.font = icon.font;
        } else if (icon.icon) {
            i.icon = new DOMParser().parseFromString(icon.icon, "text/xml").documentElement.cloneNode(true);
        }
    });

})(nx, nx.global);

(function (nx,global) {
    /**
     * SVG circle component
     * @class nx.graphic.Circle
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Circle", nx.graphic.Component, {
        view: {
            tag: 'svg:circle'

        }
    });
})(nx, nx.global);
(function (nx,global) {

    var xlink = 'http://www.w3.org/1999/xlink';

    /**
     * SVG image component
     * @class nx.graphic.Image
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Image", nx.graphic.Component, {
        properties: {
            /**
             * Set/get image src
             * @property src
             */
            src: {
                get: function () {
                    return this._src !== undefined ? this._src : 0;
                },
                set: function (value) {
                    if (this._src !== value) {
                        this._src = value;
                        if (this.view() && value !== undefined) {
                            var el = this.view().dom().$dom;
                            el.setAttributeNS(xlink, 'href', value);
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        view: {
            tag: 'svg:image'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG line component
     * @class nx.graphic.Line
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Line", nx.graphic.Component, {
        view: {
            tag: 'svg:line'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG path component
     * @class nx.graphic.Path
     * @extend nx.graphic.Component
     * @module nx.graphic
     */

    nx.define("nx.graphic.Path", nx.graphic.Component, {
        view: {
            tag: 'svg:path'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG polygon component
     * @class nx.graphic.Polygon
     * @extend nx.graphic.Path
     * @module nx.graphic
     */

    nx.define("nx.graphic.Polygon", nx.graphic.Path, {
        properties: {
            nodes: {
                /**
                 * Set/get point array to generate a polygon shape
                 * @property nodes
                 */
                get: function () {
                    return this._nodes || [];
                },
                set: function (value) {
                    this._nodes = value;
                    var vertices = value;
                    if (vertices.length !== 0) {
                        if (vertices.length == 1) {
                            var point = vertices[0];
                            vertices.push({x: point.x - 1, y: point.y - 1});
                            vertices.push({x: point.x + 1, y: point.y - 1});
                        } else if (vertices.length == 2) {
                            vertices.push([vertices[0].x + 1, vertices[0].y + 1]);
                            vertices.push(vertices[1]);
                        }

                        var nodes = nx.data.Convex.process(vertices);
                        var path = [];
                        path.push('M ', nodes[0].x, ' ', nodes[0].y);
                        for (var i = 1; i < nodes.length; i++) {
                            if (!nx.is(nodes[i], 'Array')) {
                                path.push(' L ', nodes[i].x, ' ', nodes[i].y);
                            }

                        }
                        path.push(' Z');
                        this.set("d", path.join(''));
                    }

                }
            }
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG rect component
     * @class nx.graphic.Rect
     * @extend nx.graphic.Component
     * @module nx.graphic
     */

    nx.define("nx.graphic.Rect", nx.graphic.Component, {
        view: {
            tag: 'svg:rect'
        }
    });
})(nx, nx.global);
(function (nx, global) {

    /**
     * SVG root component
     * @class nx.graphic.Stage
     * @extend nx.ui.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Stage", nx.ui.Component, {
        events: ['dragStageStart', 'dragStage', 'dragStageEnd', 'stageTransitionEnd'],
        view: {
            tag: 'svg:svg',
            props: {
                'class': 'n-svg',
                version: '1.1',
                xmlns: "http://www.w3.org/2000/svg",
                'xmlns:xlink': 'http://www.w3.org/1999/xlink',
                style: {
                    width: '{#width}',
                    height: '{#height}'
                }
            },
            content: [{
                name: 'defs',
                tag: 'svg:defs'
            }, {
                name: 'scalingLayer',
                type: 'nx.graphic.Group',
                props: {
                    'class': 'stage'
                },
                events: {
                    'transitionend': '{#_transitionend}'
                }
            }, {
                name: 'staticLayer',
                type: 'nx.graphic.Group'
            }],
            events: {
                'mousedown': '{#_mousedown}',
                'dragstart': '{#_dragstart}',
                'dragmove': '{#_drag}',
                'dragend': '{#_dragend}'
            }
        },
        properties: {
            /**
             * Is an animation in progress?
             * @property animating {Boolean}
             * @readOnly
             */
            animating: {},
            /**
             * Set/get nextTopology's scalability
             * @property scalable {Boolean}
             */
            scalable: {
                value: true
            },
            /**
             * Get the viewbox of current stage position.
             * @property scalable {Boolean}
             * @readOnly
             */
            viewbox: {
                dependencies: "width, height, matrix",
                value: function (width, height, matrix) {
                    var inversion = nx.geometry.Matrix.inverse(matrix);
                    return [nx.geometry.Vector.transform([0, 0], inversion), nx.geometry.Vector.transform([width, height], inversion)];
                }
            },
            /**
             * set/get stage's width
             * @property width
             */
            width: {
                value: 300
            },
            /**
             * set/get stage's height
             * @property height
             */
            height: {
                value: 300
            },
            /**
             * Stage scale
             * @property stageScale {Number}
             */
            stageScale: {
                value: 1
            },
            /**
             * Stage padding
             * @property padding {number} 0
             */
            padding: {
                value: 0
            },
            /**
             * Topology max scaling
             * @property maxScale {Number}
             */
            maxZoomLevel: {
                value: 12
            },
            /**
             * Topology min scaling
             * @property minScale {Number}
             */
            minZoomLevel: {
                value: 0.25
            },
            zoomLevel: {
                value: 1
            },
            /**
             * Disable notify stageScale
             * @property disableUpdateStageScale {Boolean} false
             */
            disableUpdateStageScale: {
                value: false
            },
            /**
             * Stage transform matrix
             * @property matrix {nx.geometry.Math} nx.geometry.Matrix.I
             */
            matrix: {
                get: function () {
                    return this._matrix || nx.geometry.Matrix.I;
                },
                set: function (matrix) {
                    //dom.style.webkitTransform = matrixString;
                    var matrixObject = this.matrixObject();
                    var dom = this.scalingLayer().dom().$dom;
                    var matrixString = "matrix(" + nx.geometry.Matrix.stringify(matrix) + ")";
                    dom.style.transform = matrixString;
                    dom.setAttribute('transform', ' translate(' + matrixObject.x() + ', ' + matrixObject.y() + ') scale(' + matrixObject.scale() + ')');
                    this._matrix = matrix;
                }
            },
            /**
             * Matrix Object
             * @property matrixObject
             */
            matrixObject: {},
            /**
             * get content group element
             * @property stage
             */
            stage: {
                get: function () {
                    return this.view("scalingLayer");
                }
            },
            staticLayer: {
                get: function () {
                    return this.view("staticLayer");
                }
            },
            scalingLayer: {
                get: function () {
                    return this.view("scalingLayer");
                }
            },
            fitMatrixObject: {
                set: function (matrix) {
                    if (matrix) {
                        this.zoomLevel(this.stage().scale() / matrix.scale());
                    }
                    this._fitMatrixObject = matrix;
                }
            }
        },
        methods: {
            getContainer: function () {
                return this.view('scalingLayer').view().dom();
            },
            /**
             * Add svg def element into the stage
             * @method addDef
             * @param el {SVGDOM}
             */
            addDef: function (el) {
                this.view("defs").dom().$dom.appendChild(el);
            },
            /**
             * Add svg def element into the stage in string format
             * @method addDefString
             * @param str {String}
             */
            addDefString: function (str) {
                this.view("defs").dom().$dom.appendChild(new DOMParser().parseFromString(str, "text/xml").documentElement);
            },
            /**
             * Get content's relative bound
             * @method getContentBound
             * @returns {{left: number, top: number, width: Number, height: Number}}
             */
            getContentBound: function () {
                var stageBound = this.scalingLayer().getBound();
                var topoBound = this.view().dom().getBound();

                if (stageBound.left === 0 && stageBound.top === 0 && stageBound.width === 0 && stageBound.height === 0) {
                    var padding = this.padding();
                    return {
                        left: padding,
                        top: padding,
                        height: this.height() - padding * 2,
                        width: this.width() - padding * 2
                    };
                } else {
                    var bound = {
                        left: stageBound.left - topoBound.left,
                        top: stageBound.top - topoBound.top,
                        width: stageBound.width,
                        height: stageBound.height
                    };

                    if (bound.width < 300) {
                        bound.left -= (300 - bound.width) / 2;
                        bound.width = 300;
                    }

                    if (bound.height < 300) {
                        bound.top -= (300 - bound.height) / 2;
                        bound.height = 300;
                    }

                    return bound;

                }
            },
            fit: function (callback, context, isAnimated) {
                var watching = nx.keyword.internal.watch(this, "animating", function (animating) {
                    if (!animating) {
                        watching.release();
                        if (isAnimated) {
                            this.scalingLayer().on('transitionend', function fn() {
                                this.scalingLayer().dom().removeClass('n-topology-fit');
                                this.scalingLayer().off('transitionend', fn, this);
                                /* jslint -W030 */
                                callback && callback.call(context || this);
                                this.animating(false);
                            }, this);
                            var originalMatrix = this.matrix();
                            var newMatrix = this.fitMatrixObject().matrix();
                            if (!nx.geometry.Matrix.approximate(originalMatrix, newMatrix)) {
                                this.animating(true);
                                this.scalingLayer().dom().addClass('n-topology-fit');
                                this._setStageMatrix(this.fitMatrixObject().matrix());
                            } else {
                                /* jslint -W030 */
                                callback && callback.call(context || this);
                            }
                            this.zoomLevel(1);
                        } else {
                            this._setStageMatrix(this.fitMatrixObject().matrix());
                            this.zoomLevel(1);
                            /* jslint -W030 */
                            callback && callback.call(context || this);
                        }
                    }
                }.bind(this));
                watching.notify();
            },
            actualSize: function () {
                this.scalingLayer().setTransition(null, null, 0.6);
                this._setStageMatrix(nx.geometry.Matrix.I);
            },
            zoom: function (value, callback, context) {
                this.scalingLayer().setTransition(callback, context, 0.6);
                this.applyStageScale(value);
            },
            zoomByBound: function (inBound, callback, context, duration) {
                var padding = this.padding();
                var stageBound = {
                    left: padding,
                    top: padding,
                    height: this.height() - padding * 2,
                    width: this.width() - padding * 2
                };
                this.scalingLayer().setTransition(callback, context, duration);
                this.applyStageMatrix(this.calcRectZoomMatrix(stageBound, inBound));
            },
            calcRectZoomMatrix: function (graph, rect) {
                var s = (!rect.width && !rect.height) ? 1 : Math.min(graph.height / Math.abs(rect.height), graph.width / Math.abs(rect.width));
                var dx = (graph.left + graph.width / 2) - s * (rect.left + rect.width / 2);
                var dy = (graph.top + graph.height / 2) - s * (rect.top + rect.height / 2);
                return [
                    [s, 0, 0], [0, s, 0], [dx, dy, 1]
                ];
            },
            applyTranslate: function (x, y, duration) {
                var matrix = this.matrixObject();
                matrix.applyTranslate(x, y);
                if (duration) {
                    this.scalingLayer().setTransition(null, null, duration);
                }
                this.matrix(matrix.matrix());
                this.matrixObject(matrix);
                return matrix;
            },
            applyStageMatrix: function (matrix, according) {
                return this._setStageMatrix(nx.geometry.Matrix.multiply(this.matrix(), matrix), according);
            },
            applyStageScale: function (scale, according) {
                var _scale = scale || 1,
                    _according = according || [this.width() / 2, this.height() / 2];
                var matrix = nx.geometry.Matrix.multiply([
                    [1, 0, 0],
                    [0, 1, 0],
                    [-_according[0], -_according[1], 1]
                ], [
                    [_scale, 0, 0],
                    [0, _scale, 0],
                    [0, 0, 1]
                ], [
                    [1, 0, 0],
                    [0, 1, 0],
                    [_according[0], _according[1], 1]
                ]);
                return this.applyStageMatrix(matrix, _according);
            },
            resetStageMatrix: function () {
                var m = new nx.geometry.Matrix(this.matrix());
                this.disableUpdateStageScale(false);
                this.matrix(m.matrix());
                this.matrixObject(m);
                this.stageScale(1 / m.scale());
            },
            resetFitMatrix: function () {
                var watching = nx.keyword.internal.watch(this, "animating", function (animating) {
                    if (!animating) {
                        watching.release();
                        var contentBound, padding, stageBound, matrix;
                        // get transform matrix
                        contentBound = this.getContentBound();
                        padding = this.padding();
                        stageBound = {
                            left: padding,
                            top: padding,
                            height: this.height() - padding * 2,
                            width: this.width() - padding * 2
                        };
                        matrix = new nx.geometry.Matrix(this.calcRectZoomMatrix(stageBound, contentBound));
                        matrix.matrix(nx.geometry.Matrix.multiply(this.matrix(), matrix.matrix()));
                        this.fitMatrixObject(matrix);

                    }
                }.bind(this));
                watching.notify();
            },
            _setStageMatrix: function (matrix, according) {
                according = according || [this.width() / 2, this.height() / 2];
                var m = new nx.geometry.Matrix(matrix);
                var matrixFit = this.fitMatrixObject();
                var scaleFit = matrixFit.scale();
                var zoomMax = this.maxZoomLevel(),
                    zoomMin = this.minZoomLevel();
                if (m.scale() / scaleFit > zoomMax) {
                    m.applyScale(zoomMax * scaleFit / m.scale(), according);
                }
                if (m.scale() / scaleFit < zoomMin) {
                    m.applyScale(zoomMin * scaleFit / m.scale(), according);
                }
                if (!nx.geometry.Matrix.approximate(this.matrix(), m.matrix())) {
                    this.matrixObject(m);
                    this.matrix(m.matrix());
                    if (!this.disableUpdateStageScale()) {
                        this.stageScale(1 / m.scale());
                    }
                    this.zoomLevel(m.scale() / scaleFit);
                    return m;
                } else {
                    return this.matrixObject();
                }
            },
            hide: function () {
                this.view('scalingLayer').dom().setStyle('opacity', 0);
                this.view('staticLayer').dom().setStyle('opacity', 0);
            },
            show: function () {
                this.view('scalingLayer').dom().setStyle('opacity', 1);
                this.view('staticLayer').dom().setStyle('opacity', 1);
            },
            _transitionend: function (sender, event) {
                this.fire('stageTransitionEnd', event);
            },
            _mousedown: function (sender, event) {
                event.captureDrag(sender);
            },
            _dragstart: function (sender, event) {
                this.view("scalingLayer").dom().setStyle('pointer-events', 'none');
                this.fire('dragStageStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragStage', event);
            },
            _dragend: function (sender, event) {
                this.fire('dragStageEnd', event);
                this.view("scalingLayer").dom().setStyle('pointer-events', 'all');
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {
    /**
     * SVG text component
     * @class nx.graphic.Text
     * @extend nx.graphic.Component
     * @module nx.graphic
     */
    nx.define("nx.graphic.Text", nx.graphic.Component, {
        properties: {
            /**
             * Set/get text
             * @property text
             */
            text: {
                get: function () {
                    return this._text !== undefined ? this._text : 0;
                },
                set: function (value) {
                    if (this._text !== value && value !== undefined) {
                        this._text = value;
                        var el = this.view().dom().$dom;
                        if (el.firstChild) {
                            el.removeChild(el.firstChild);
                        }
                        el.appendChild(document.createTextNode(value));
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        view: {
            tag: 'svg:text'
        }
    });
})(nx, nx.global);
(function (nx,global) {
    /**
     * SVG triangle component
     * @class nx.graphic.Triangle
     * @extend nx.graphic.Path
     * @module nx.graphic
     */
    nx.define("nx.graphic.Triangle", nx.graphic.Path, {
        properties: {
            width: {
                get: function () {
                    return this._width !== undefined ? this._width : 0;
                },
                set: function (value) {
                    if (this._width !== value) {
                        this._width = value;
                        this._draw();
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            height: {
                get: function () {
                    return this._height !== undefined ? this._height : 0;
                },
                set: function (value) {
                    if (this._height !== value) {
                        this._height = value;
                        this._draw();
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        methods: {
            _draw: function () {
                if (this._width && this._height) {
                    var path = [];
                    path.push('M ', this._width / 2, ' ', 0);
                    path.push(' L ', this._width, ' ', this._height);
                    path.push(' L ', 0, ' ', this._height);
                    path.push(' Z');
                    this.set("d", path.join(''));
                }


            }
        }
    });
})(nx, nx.global);
(function (nx,global) {

    /**
     * SVG BezierCurves component
     * @class nx.graphic.BezierCurves
     * @extend nx.graphic.Path
     * @module nx.graphic
     */

    nx.define("nx.graphic.BezierCurves", nx.graphic.Path, {
        properties: {
            /**
             * set/get start point'x
             * @property x1
             */
            x1: {
                set: function (value) {
                    this._x1 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._x1 || 0;
                }
            },
            /**
             * set/get start point'y
             * @property y1
             */
            y1: {
                set: function (value) {
                    this._y1 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._y1 || 0;
                }
            },
            /**
             * set/get end point'x
             * @property x2
             */
            x2: {
                set: function (value) {
                    this._x2 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._x2 || 0;
                }
            },
            /**
             * set/get end point'x
             * @property y2
             */
            y2: {
                set: function (value) {
                    this._y2 = value;
                    this._buildPath();
                },
                get: function () {
                    return this._y2 || 0;
                }
            },
            isClockwise: {
                value: true
            },
            straight: {
                value: false
            }
        },
        methods: {
            _buildPath: function () {
                var x1 = this.x1();
                var x2 = this.x2();
                var y1 = this.y1();
                var y2 = this.y2();

                var d;

                if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
                    var dx = (x1 - x2);
                    var dy = (y2 - y1);
                    var dr = Math.sqrt((dx * dx + dy * dy));


                    if (this.straight()) {
                        d = "M" + x1 + "," + y1 + " " + x2 + "," + y2;
                    } else if (this.isClockwise()) {
                        d = "M" + x2 + "," + y2 +
                            "A " + dr + " " + dr + ", 0, 0, 1, " + x1 + "," + y1 +
                            "A " + (dr - 0) + " " + (dr - 0) + ", 0, 0, 0, " + x2 + "," + y2;
                    } else {
                        d = "M" + x2 + "," + y2 +
                            "A " + dr + " " + dr + ", 0, 0, 0, " + x1 + "," + y1 +
                            "A " + (dr - 0) + " " + (dr - 0) + ", 0, 0, 1, " + x2 + "," + y2;
                    }

                    return this.set("d", d);

                } else {
                    return null;
                }
            }
        }
    });

})(nx, nx.global);
(function (nx, ui, global) {
    nx.define("nx.geometry.MatrixSupport", {
        properties: {
            matrix: {
                value: function () {
                    return nx.geometry.Matrix.I;
                }
            },
            /**
             * @property matrixInversion
             * @type {Number[3][3]}
             * @readOnly
             */
            matrixInversion: {
                dependencies: ["matrix"],
                value: function (matrix) {
                    if (!matrix) {
                        return null;
                    }
                    return nx.geometry.Matrix.inverse(matrix);
                }
            },
            transform_internal_: {
                dependencies: ["matrix"],
                value: function (matrix) {
                    if (matrix) {
                        var scale = NaN,
                            rotate = NaN;
                        if (nx.geometry.Matrix.isometric(matrix)) {
                            scale = Math.sqrt(matrix[0][0] * matrix[0][0] + matrix[0][1] * matrix[0][1]);
                            rotate = matrix[0][1] > 0 ? Math.acos(matrix[0][0] / scale) : -Math.acos(matrix[0][0] / scale);
                        }
                        return {
                            x: matrix[2][0],
                            y: matrix[2][1],
                            scale: scale,
                            rotate: rotate
                        };
                    } else {
                        return {
                            x: 0,
                            y: 0,
                            scale: 1,
                            rotate: 0
                        };
                    }
                }
            },
            x: {
                get: function () {
                    return this._x !== undefined ? this._x : this.transform_internal_().x;
                },
                set: function (value) {
                    this._applyTransform("x", value);
                    if (!isNaN(this.transform_internal_().x) && this._x !== this.transform_internal_().x) {
                        this._x = this.transform_internal_().x;
                        return true;
                    }
                    return false;
                }
            },
            y: {
                get: function () {
                    return this._y !== undefined ? this._y : this.transform_internal_().y;
                },
                set: function (value) {
                    this._applyTransform("y", value);
                    if (!isNaN(this.transform_internal_().y) && this._y !== this.transform_internal_().y) {
                        this._y = this.transform_internal_().y;
                        return true;
                    }
                    return false;
                }
            },
            scale: {
                get: function () {
                    return this._scale !== undefined ? this._scale : this.transform_internal_().scale;
                },
                set: function (v) {
                    this._applyTransform("scale", v);
                    if (!isNaN(this.transform_internal_().scale) && this._scale !== this.transform_internal_().scale) {
                        this._scale = this.transform_internal_().scale;
                        return true;
                    }
                    return false;
                }
            },
            rotate: {
                get: function () {
                    return this._rotate !== undefined ? this._rotate : this.transform_internal_().rotate;
                },
                set: function (v) {
                    this._applyTransform("rotate", v);
                    if (!isNaN(this.transform_internal_().rotate) && this._rotate !== this.transform_internal_().rotate) {
                        this._rotate = this.transform_internal_().rotate;
                        return true;
                    }
                    return false;
                }
            }
        },
        methods: {
            applyTranslate: function (x, y) {
                this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                    [1, 0, 0],
                    [0, 1, 0],
                    [x, y, 1]
                ]));
            },
            applyScale: function (s, accord) {
                if (accord) {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [1, 0, 0],
                        [0, 1, 0],
                        [-accord[0], -accord[1], 1]
                    ], [
                        [s, 0, 0],
                        [0, s, 0],
                        [0, 0, 1]
                    ], [
                        [1, 0, 0],
                        [0, 1, 0],
                        [accord[0], accord[1], 1]
                    ]));
                } else {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [s, 0, 0],
                        [0, s, 0],
                        [0, 0, 1]
                    ]));
                }
            },
            applyRotate: function (r, accord) {
                var x = this.x(),
                    y = this.y(),
                    sinr = sin(r),
                    cosr = cos(r);
                if (accord) {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [1, 0, 0],
                        [0, 1, 0],
                        [-accord[0], -accord[1], 1]
                    ], [
                        [cos, sin, 0],
                        [-sin, cos, 0],
                        [0, 0, 1]
                    ], [
                        [1, 0, 0],
                        [0, 1, 0],
                        [accord[0], accord[1], 1]
                    ]));
                } else {
                    this.matrix(nx.geometry.Matrix.multiply(this.matrix(), [
                        [cos, sin, 0],
                        [-sin, cos, 0],
                        [0, 0, 1]
                    ]));
                }
            },
            applyMatrix: function () {
                var matrices = Array.prototype.slice.call(arguments);
                matrices = nx.util.query({
                    array: matrices,
                    mapping: function (matrix) {
                        return nx.is(matrix, nx.geometry.Matrix) ? matrix.matrix() : matrix;
                    }
                });
                matrices.unshift(this.matrix());
                this.matrix(nx.geometry.Matrix.multiply.apply(this, matrices));
            },
            _applyTransform: function (key, value) {
                if (this["_" + key] === value || isNaN(value)) {
                    return;
                }
                if (value === this.transform_internal_()[key]) {
                    this["_" + key] = value;
                    this.notify(key);
                } else {
                    switch (key) {
                    case "x":
                        this.applyTranslate(value - this.transform_internal_().x, 0);
                        break;
                    case "y":
                        this.applyTranslate(0, value - this.transform_internal_().y);
                        break;
                    case "scale":
                        this.applyScale(value / this.transform_internal_().scale, [this.transform_internal_().x, this.transform_internal_().y]);
                        break;
                    case "rotate":
                        this.applyRotate(value - this.transform_internal_().rotate, [this.transform_internal_().x, this.transform_internal_().y]);
                        break;
                    }
                }
            },
            toString: function () {
                return nx.geometry.Matrix.stringify(this.matrix());
            }
        }
    });
})(nx, nx.ui, window);

(function (nx, ui, global) {
    /**
     * @class Matrix
     * @namespace nx.geometry
     */
    var EXPORT = nx.define("nx.geometry.Matrix", nx.Observable, {
        mixins: [nx.geometry.MatrixSupport],
        methods: {
            init: function (matrix) {
                this.inherited();
                this.matrix(matrix);
            },
            equal: function (matrix) {
                return EXPORT.equal(this.matrix(), (nx.is(matrix, EXPORT) ? matrix.matrix() : matrix));
            }
        },
        statics: {
            I: [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ],
            isometric: function (m) {
                return m && (m[0][0] || m[0][1]) && m[0][0] === m[1][1] && m[0][1] === -m[1][0];
            },
            approximate: function (m1, m2) {
                if (!m1 || !m2 || m1.length != m2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < m1.length; i++) {
                    if (!nx.geometry.Vector.approximate(m1[i], m2[i])) {
                        return false;
                    }
                }
                return true;
            },
            equal: function (m1, m2) {
                if (!m1 || !m2 || m1.length != m2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < m1.length; i++) {
                    if (!nx.geometry.Vector.equal(m1[i], m2[i])) {
                        return false;
                    }
                }
                return true;
            },
            multiply: function () {
                var matrixes = Array.prototype.slice.call(arguments);
                var m1, m2, m, mr, mc, r, c, n, row, col, num;
                var i, j, k;
                while (matrixes.length > 1) {
                    /* jshint -W030 */
                    m1 = matrixes[0], m2 = matrixes[1];
                    if (m1[0].length != m2.length) {
                        return null;
                    }
                    /* jshint -W030 */
                    row = m1.length, col = m2[0].length, num = m2.length;
                    m = [];
                    for (r = 0; r < row; r++) {
                        mr = [];
                        for (c = 0; c < col; c++) {
                            mc = 0;
                            for (n = 0; n < num; n++) {
                                mc += m1[r][n] * m2[n][c];
                            }
                            mr.push(mc);
                        }
                        m.push(mr);
                    }
                    matrixes.splice(0, 2, m);
                }
                return matrixes[0];
            },
            transpose: function (m) {
                var t = [],
                    r, c, row = m.length,
                    col = m[0].length;
                for (c = 0; c < col; c++) {
                    t[c] = [];
                    for (r = 0; r < row; r++) {
                        t[c].push(m[r][c]);
                    }
                }
                return t;
            },
            inverse: function (m) {
                // FIXME just for 2D 3x3 Matrix
                var a = m[0][0],
                    b = m[0][1],
                    c = m[1][0],
                    d = m[1][1],
                    e = m[2][0],
                    f = m[2][1];
                var rslt = [],
                    deno = a * d - b * c;
                if (deno === 0) {
                    return null;
                }
                return [
                    [d / deno, -b / deno, 0], [-c / deno, a / deno, 0], [(c * f - d * e) / deno, (b * e - a * f) / deno, 1]
                ];
            },
            stringify: function (matrix) {
                return [matrix[0][0], matrix[0][1], matrix[1][0], matrix[1][1], matrix[2][0], matrix[2][1]].join(",").replace(/-?\d+e[+-]?\d+/g, "0");
            }
        }
    });
})(nx, nx.ui, window);

(function (nx, ui, global) {
    /**
     * @class Math
     * @namespace nx.geometry
     */
    var EXPORT = nx.define("nx.geometry.Math", nx.Observable, {
        statics: (function () {
            function precised(f) {
                return function (param) {
                    var v = f(param);
                    return EXPORT.approximate(v, 0) ? 0 : v;
                };
            }

            return {
                approximate: function (a, b) {
                    var v = a - b;
                    return v < 1e-10 && v > -1e-10;
                },
                sin: precised(Math.sin),
                cos: precised(Math.cos),
                tan: precised(Math.tan),
                cot: function (a) {
                    var tan = Math.tan(a);
                    if (tan > 1e10 || tan < -1e10) {
                        return 0;
                    }
                    return 1 / tan;
                }
            };
        })()
    });
})(nx, nx.ui, window);

(function(nx, ui, global) {
    /**
     * @class BezierCurve
     * @namespace nx.geometry
     */
    var EXPORT = nx.define("nx.geometry.BezierCurve", nx.Observable, {
        statics: (function() {
            function transformBezierToPolyline(bezier) {
                var i, polyline = [];
                for (i = 0; i < bezier.length - 1; i++) {
                    polyline.push([bezier[i], bezier[i + 1]]);
                }
                return polyline;
            }

            function transformPolylineToBezier(polyline) {
                var i, bezier = [polyline[0][0]];
                for (i = 0; i < polyline.length; i++) {
                    bezier.push(polyline[i][1]);
                }
                return bezier;
            }

            function transformRecursiveSeparatePoints(points) {
                var i = 0,
                    last = 0,
                    result = [];
                for (i = 0; i < points.length; i++) {
                    if (typeof points[i] !== "number" || points[i] <= last || points[i] >= 1) {
                        throw "Invalid bread point list: " + points.join(",");
                    }
                    result.push((points[i] - last) / (1 - last));
                    last = points[i];
                }
                return result;
            }
            return {
                slice: function(bezier, from, to) {
                    if (from === 0) {
                        if (to === 0) {
                            return null;
                        }
                        return EXPORT.breakdown(bezier, to).beziers[0];
                    } else if (!to) {
                        return EXPORT.breakdown(bezier, from).beziers[1];
                    } else {
                        return EXPORT.breakdown(bezier, from, to).beziers[1];
                    }
                },
                breakdown: function(bezier) {
                    // get the rest arguments
                    var rates = Array.prototype.slice.call(arguments, 1);
                    if (!rates.length) {
                        throw "Invalid argument length: " + arguments.length;
                    }
                    rates = transformRecursiveSeparatePoints(rates);
                    var rate, polyline, sep, points = [bezier[0]],
                        beziers = [];
                    // transform bezier points into lines
                    polyline = transformBezierToPolyline(bezier);
                    // iterate all rates
                    while (rates.length) {
                        // get the separate ratio
                        rate = rates.shift();
                        // separate the rest bezier
                        sep = EXPORT.separate(polyline, rate);
                        // mark the points and beziers
                        points.push(sep.point);
                        beziers.push(transformPolylineToBezier(sep.left));
                        // get the rest
                        polyline = sep.right;
                    }
                    // append the rest bezier
                    points.push(bezier[bezier.length - 1]);
                    beziers.push(transformPolylineToBezier(polyline));
                    return {
                        points: points,
                        beziers: beziers
                    };
                },
                /**
                 * @method separate
                 * @param polyline List of intervals (interval=[point-from, point-to], point=[x, y]).
                 * @param rate The rate to separate.
                 * @return {point:[x, y], left: leftPolyline, right: rightPolyline}
                 */
                separate: function separate(polyline, rate) {
                    var rest = 1 - rate;
                    var intervalSeparatePoint = function(interval) {
                        return [interval[0][0] * rest + interval[1][0] * rate, interval[0][1] * rest + interval[1][1] * rate];
                    };
                    var intervalInter = function(i1, i2) {
                        return [intervalSeparatePoint([i1[0], i2[0]]), intervalSeparatePoint([i1[1], i2[1]])];
                    };
                    var polylineLower = function(polyline) {
                        var i, rslt = [];
                        for (i = 0; i < polyline.length - 1; i++) {
                            rslt.push(intervalInter(polyline[i], polyline[i + 1]));
                        }
                        return rslt;
                    };
                    // start iterate
                    var point, left = [],
                        right = [];
                    var intervals = polyline,
                        interval;
                    while (intervals.length) {
                        interval = intervals[0];
                        left.push([interval[0], intervalSeparatePoint(interval)]);
                        interval = intervals[intervals.length - 1];
                        right.unshift([intervalSeparatePoint(interval), interval[1]]);
                        if (intervals.length == 1) {
                            point = intervalSeparatePoint(intervals[0]);
                        }
                        intervals = polylineLower(intervals);
                    }
                    return {
                        point: point,
                        left: left,
                        right: right
                    };
                }
            };
        })()
    });
})(nx, nx.ui, window);

(function (nx, global) {
    /**
     * @class Vector
     * @namespace nx.geometry
     */
    var Vector = nx.define("nx.geometry.Vector", nx.Observable, {
        statics: {
            approximate: function (v1, v2) {
                if (!v1 || !v2 || v1.length != v2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < v1.length; i++) {
                    if (!nx.geometry.Math.approximate(v1[i], v2[i])) {
                        return false;
                    }
                }
                return true;
            },
            equal: function (v1, v2) {
                if (!v1 || !v2 || v1.length != v2.length) {
                    return false;
                }
                var i;
                for (i = 0; i < v1.length; i++) {
                    if (v1[i] !== v2[i]) {
                        return false;
                    }
                }
                return true;
            },
            plus: function (v1, v2) {
                return [v1[0] + v2[0], v1[1] + v2[1]];
            },
            transform: function (v, m) {
                var matrices = [
                    [v.concat([1])]
                ].concat(Array.prototype.slice.call(arguments, 1));
                return nx.geometry.Matrix.multiply.apply(nx.geometry.Matrix, matrices)[0].slice(0, 2);
            },
            multiply: function (v, k) {
                return Vector.transform(v, [
                    [k, 0, 0],
                    [0, k, 0],
                    [0, 0, 1]
                ]);
            },
            abs: function (v, len) {
                if (arguments.length == 1) {
                    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                }
                var weight = len / Vector.abs(v);
                return Vector.transform(v, [
                    [weight, 0, 0],
                    [0, weight, 0],
                    [0, 0, 1]
                ]);
            },
            reverse: function (v) {
                return Vector.transform(v, [
                    [-1, 0, 0],
                    [0, -1, 0],
                    [0, 0, 1]
                ]);
            },
            rotate: function (v, a) {
                var sin = nx.geometry.Math.sin(a),
                    cos = nx.geometry.Math.cos(a);
                return Vector.transform(v, [
                    [cos, sin, 0],
                    [-sin, cos, 0],
                    [0, 0, 1]
                ]);
            },
            length: function (v) {
                return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            },
            angleCosine: function (v1, v2) {
                return (v1[0] * v2[0] + v1[1] * v2[1]) / Vector.length(v1) / Vector.length(v2);
            }
        },
        methods: {
            init: function (x, y) {
                this.x = x || 0;
                this.y = y || 0;
            },
            /**
             * @method equals
             * @param v {nx.geometry.Vector}
             * @returns {boolean}
             */
            equals: function (v) {
                return this.x === v.x && this.y === v.y;
            },
            /**
             * @method length
             * @returns {number}
             */
            length: function () {
                return Math.sqrt(this.squaredLength());
            },
            /**
             * @method squaredLength
             * @returns {number}
             */
            squaredLength: function () {
                var x = this.x,
                    y = this.y;

                return x * x + y * y;
            },
            /**
             * @method angle
             * @returns {number}
             */
            angle: function () {
                var l = this.length(),
                    a = l && Math.acos(this.x / l);
                a = a * 180 / Math.PI;
                a = this.y > 0 ? a : -a;

                return a;
            },
            /**
             * @method circumferentialAngle
             * @returns {number}
             */
            circumferentialAngle: function () {
                var angle = this.angle();
                if (angle < 0) {
                    angle += 360;
                }
                return angle;

            },
            /**
             * @method slope
             * @returns {number}
             */
            slope: function () {
                return this.y / this.x;
            },
            /**
             * @method add
             * @param v {nx.geometry.Vector}
             * @returns {nx.geometry.Vector}
             */
            add: function (v) {
                return new Vector(this.x + v.x, this.y + v.y);
            },
            /**
             * @method subtract
             * @param v {nx.geometry.Vector}
             * @returns {nx.geometry.Vector}
             */
            subtract: function (v) {
                return new Vector(this.x - v.x, this.y - v.y);
            },
            /**
             * @method multiply
             * @param k {Number}
             * @returns {nx.geometry.Vector}
             */
            multiply: function (k) {
                return new Vector(this.x * k, this.y * k);
            },
            /**
             * @method divide
             * @param k {Number}
             * @returns {nx.geometry.Vector}
             */
            divide: function (k) {
                return new Vector(this.x / k, this.y / k);
            },
            /**
             * @method rotate
             * @param a {Number}
             * @returns {nx.geometry.Vector}
             */
            rotate: function (a) {
                var x = this.x,
                    y = this.y,
                    sinA = Math.sin(a / 180 * Math.PI),
                    cosA = Math.cos(a / 180 * Math.PI);

                return new Vector(x * cosA - y * sinA, x * sinA + y * cosA);
            },
            /**
             * @method negate
             * @returns {nx.geometry.Vector}
             */
            negate: function () {
                return new Vector(-this.x, -this.y);
            },
            /**
             * @method normal
             * @returns {nx.geometry.Vector}
             */
            normal: function () {
                var l = this.length() || 1;
                return new Vector(-this.y / l, this.x / l);
            },
            /**
             * @method normalize
             * @returns {nx.geometry.Vector}
             */
            normalize: function () {
                var l = this.length() || 1;
                return new Vector(this.x / l, this.y / l);
            },
            /**
             * @method clone
             * @returns {nx.geometry.Vector}
             */
            clone: function () {
                return new Vector(this.x, this.y);
            }
        }
    });
})(nx, window);

(function (nx) {
    var Vector = nx.geometry.Vector;

    /**
     * Mathematics Line class
     * @class nx.geometry.Line
     * @module nx.geometry
     */
    var Line = nx.define('nx.geometry.Line', nx.Observable, {
        methods: {
            init: function (start, end) {
                this.start = start || new Vector();
                this.end = end || new Vector();
                this.dir = this.end.subtract(this.start);
            },
            /**
             * @method length
             * @returns {*}
             */
            length: function () {
                return this.dir.length();
            },
            /**
             * @method squaredLength
             * @returns {*}
             */
            squaredLength: function () {
                return this.dir.squaredLength();
            },
            /**
             * @method angle
             * @returns {*}
             */
            angle: function () {
                return this.dir.angle();
            },
            /**
             * @methid intersection
             * @returns {*}
             */
            circumferentialAngle: function () {
                var angle = this.angle();
                if (angle < 0) {
                    angle += 360;
                }
                return angle;
            },
            /**
             * @method center
             * @returns {nx.geometry.Vector}
             */
            center: function () {
                return this.start.add(this.end).divide(2);
            },
            /**
             * @method slope
             * @returns {*}
             */
            slope: function () {
                return this.dir.slope();
            },
            /**
             * @method general
             * @returns {Array}
             */
            general: function () {
                var k = this.slope(),
                    start = this.start;
                if (isFinite(k)) {
                    return [k, -1, start.y - k * start.x];
                }
                else {
                    return [1, 0, -start.x];
                }
            },
            /**
             * @method intersection
             * @param l {nx.geometry.Line}
             * @returns {nx.geometry.Vector}
             */
            intersection: function (l) {
                var g0 = this.general(),
                    g1 = l.general();

                return new Vector(
                        (g0[1] * g1[2] - g1[1] * g0[2]) / (g0[0] * g1[1] - g1[0] * g0[1]),
                        (g0[0] * g1[2] - g1[0] * g0[2]) / (g1[0] * g0[1] - g0[0] * g1[1]));
            },
            /**
             * @method pedal
             * @param v {nx.geometry.Vector}
             * @returns {nx.geometry.Vector}
             */
            pedal: function (v) {
                var dir = this.dir,
                    g0 = this.general(),
                    g1 = [dir.x, dir.y, -v.x * dir.x - v.y * dir.y];

                return new Vector(
                        (g0[1] * g1[2] - g1[1] * g0[2]) / (g0[0] * g1[1] - g1[0] * g0[1]),
                        (g0[0] * g1[2] - g1[0] * g0[2]) / (g1[0] * g0[1] - g0[0] * g1[1]));
            },
            /**
             * @method translate
             * @param v {nx.geometry.Vector}
             * @returns {mx.math.Line}
             */
            translate: function (v) {
                v = v.rotate(this.angle());
                return new Line(this.start.add(v), this.end.add(v));
            },
            /**
             * @method rotate
             * @param a {Number}
             * @returns {nx.geometry.Line}
             */
            rotate: function (a) {
                return new Line(this.start.rotate(a), this.end.rotate(a));
            },
            /**
             * @method negate
             * @returns {nx.geometry.Line}
             */
            negate: function () {
                return new Line(this.end, this.start);
            },
            /**
             * @method normal
             * @returns {nx.geometry.Vector}
             */
            normal: function () {
                var dir = this.dir, l = this.dir.length();
                return new Vector(-dir.y / l, dir.x / l);
            },
            /**
             * @method pad
             * @param a {nx.geometry.Vector}
             * @param b {nx.geometry.Vector}
             * @returns {nx.geometry.Line}
             */
            pad: function (a, b) {
                var n = this.dir.normalize();
                return new Line(this.start.add(n.multiply(a)), this.end.add(n.multiply(-b)));
            },
            /**
             * @method clone
             * @returns {nx.geometry.Line}
             */
            clone: function () {
                return new Line(this.start, this.end);
            }
        }
    });
})(nx);
(function (nx, global) {


    /*
     0|1
     ---
     2|3
     */

    nx.data.QuadTree = function (inPoints, inWidth, inHeight, inCharge) {
        var width = inWidth || 800;
        var height = inHeight || 600;
        var charge = inCharge || 200;
        var points = inPoints;
        var x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        this.root = null;
        this.alpha = 0;

        if (points) {
            var i = 0, length = points.length;
            var point, px, py;
            for (; i < length; i++) {
                point = points[i];
                point.dx = 0;
                point.dy = 0;
                px = point.x;
                py = point.y;
                if (isNaN(px)) {
                    px = point.x = Math.random() * width;
                }
                if (isNaN(py)) {
                    py = point.y = Math.random() * height;
                }
                if (px < x1) {
                    x1 = px;
                } else if (px > x2) {
                    x2 = px;
                }
                if (py < y1) {
                    y1 = py;
                } else if (py > y2) {
                    y2 = py;
                }
            }

            //square
            var dx = x2 - x1, dy = y2 - y1;
            if (dx > dy) {
                y2 = y1 + dx;
            } else {
                x2 = x1 + dy;
            }

            var root = this.root = new QuadTreeNode(this, x1, y1, x2, y2);
            for (i = 0; i < length; i++) {
                root.insert(points[i]);
            }
        }
    };

    var QuadTreeNode = function (inQuadTree, inX1, inY1, inX2, inY2) {
        var x1 = this.x1 = inX1, y1 = this.y1 = inY1, x2 = this.x2 = inX2, y2 = this.y2 = inY2;
        var cx = (x1 + x2) * 0.5, cy = (y1 + y2) * 0.5;
        var dx = (inX2 - inX1) * 0.5;
        var dy = (inY2 - inY1) * 0.5;
        this.point = null;
        this.nodes = null;
        this.insert = function (inPoint) {
            var point = this.point;
            var nodes = this.nodes;
            if (!point && !nodes) {
                this.point = inPoint;
                return;
            }
            if (point) {
                if (Math.abs(point.x - inPoint.x) + Math.abs(point.y - inPoint.y) < 0.01) {
                    this._insert(inPoint);
                } else {
                    this.point = null;
                    this._insert(point);
                    this._insert(inPoint);
                }
            } else {
                this._insert(inPoint);
            }
        };

        this._insert = function (inPoint) {
            var right = inPoint.x >= cx, bottom = inPoint.y >= cy, i = (bottom << 1) + right;
            var index = (bottom << 1) + right;
            var x = x1 + dx * right;
            var y = y1 + dy * bottom;
            var nodes = this.nodes || (this.nodes = []);
            var node = nodes[index] || (nodes[index] = new QuadTreeNode(inQuadTree, x, y, x + dx, y + dy));
            node.insert(inPoint);
        };
    };

})(nx, nx.global);
(function (nx, global) {

    /**
     * NeXt force layout algorithm class
     * @class nx.data.Force
     */

    /**
     * Force layout algorithm class constructor function
     * @param inWidth {Number} force stage width, default 800
     * @param inHeight {Number} force stage height, default 800
     * @constructor
     */

    nx.data.NextForce = function (inWidth, inHeight) {
        var width = inWidth || 800;
        var height = inHeight || 800;
        var strength = 4;
        var distance = 100;
        var gravity = 0.1;
        this.charge = 1200;
        this.alpha = 1;

        this.totalEnergy = Infinity;
        this.maxEnergy = Infinity;

        var threshold = 2;
        var theta = 0.8;
        this.nodes = null;
        this.links = null;
        this.quadTree = null;
        /**
         * Set data to this algorithm
         * @method setData
         * @param inJson {Object} Follow Common Topology Data Definition
         */
        this.setData = function (inJson) {
            var nodes = this.nodes = inJson.nodes;
            var links = this.links = inJson.links;
            var nodeMap = this.nodeMap = {};
            var weightMap = this.weightMap = {};
            var maxWeight = this.maxWeight = 1;
            var node, link, i = 0, length = nodes.length, id, weight;
            for (; i < length; i++) {
                node = nodes[i];
                id = node.id;
                nodeMap[id] = node;
                weightMap[id] = 0;
            }
            if (links) {
                length = links.length;
                for (i = 0; i < length; ++i) {
                    link = links[i];
                    id = link.source;
                    weight = ++weightMap[id];
                    if (weight > maxWeight) {
                        this.maxWeight = weight;
                    }
                    id = link.target;
                    weight = ++weightMap[id];
                    if (weight > maxWeight) {
                        this.maxWeight = weight;
                    }
                }
            }
        };
        /**
         * Start processing
         * @method start
         */
        this.start = function () {
            var totalEnergyThreshold = threshold * this.nodes.length;
            while (true) {
                this.tick();
                if (this.maxEnergy < threshold * 5 && this.totalEnergy < totalEnergyThreshold) {
                    break;
                }
            }
        };
        /**
         * Tick whole force stage
         * @method tick
         */
        this.tick = function () {
            var nodes = this.nodes;
            var quadTree = this.quadTree = new nx.data.QuadTree(nodes, width, height);
            this._calculateLinkEffect();
            this._calculateCenterGravitation();

            var root = quadTree.root;
            this._calculateQuadTreeCharge(root);
//            var chargeCallback = this.chargeCallback;
//            if (chargeCallback) {
//                chargeCallback.call(scope, root);
//            }
            var i, length = nodes.length, node;
            for (i = 0; i < length; i++) {
                node = nodes[i];
                this._calculateChargeEffect(root, node);
            }
            this._changePosition();
        };
        this._changePosition = function () {
            var totalEnergy = 0;
            var maxEnergy = 0;
            var nodes = this.nodes;
            var i, node, length = nodes.length, x1 = 0, y1 = 0, x2 = 0, y2 = 0, x, y, energy, dx, dy, allFixed = true;
            for (i = 0; i < length; i++) {
                node = nodes[i];
                dx = node.dx * 0.5;
                dy = node.dy * 0.5;
                energy = Math.abs(dx) + Math.abs(dy);

                if (!node.fixed) {

                    totalEnergy += energy;

                    if (energy > maxEnergy) {
                        maxEnergy = energy;
                    }
                }


                if (!node.fixed) {
                    x = node.x += dx;
                    y = node.y += dy;
                    allFixed = false;
                } else {
                    x = node.x;
                    y = node.y;
                }
                if (x < x1) {
                    x1 = x;
                } else if (x > x2) {
                    x2 = x;
                }
                if (y < y1) {
                    y1 = y;
                } else if (y > y2) {
                    y2 = y;
                }
            }
            this.totalEnergy = allFixed ? 0 : totalEnergy;
            this.maxEnergy = allFixed ? 0 : maxEnergy;
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
        };
        this._calculateCenterGravitation = function () {
            var nodes = this.nodes;
            var node, x, y;
            var length = nodes.length;

            var k = 0.5 * gravity;
            x = width / 2;
            y = height / 2;
            for (var i = 0; i < length; i++) {
                node = nodes[i];
                node.dx += (x - node.x) * k;
                node.dy += (y - node.y) * k;
            }
        };
        this._calculateLinkEffect = function () {
            var links = this.links;
            var nodeMap = this.nodeMap;
            var weightMap = this.weightMap;
            var i, length , link, source, target, dx, dy, d2, d, dk, k, sWeight, tWeight, totalWeight;
            if (links) {
                length = links.length;
                for (i = 0; i < length; ++i) {
                    link = links[i];
                    source = nodeMap[link.source];
                    target = nodeMap[link.target];
                    dx = target.x - source.x;
                    dy = target.y - source.y;
                    if (dx === 0 && dy === 0) {
                        target.x += Math.random() * 5;
                        target.y += Math.random() * 5;
                        dx = target.x - source.x;
                        dy = target.y - source.y;
                    }
                    d2 = dx * dx + dy * dy;
                    d = Math.sqrt(d2);
                    if (d2) {
                        var maxWeight = this.maxWeight;
                        dk = strength * (d - distance) / d;
                        dx *= dk;
                        dy *= dk;
                        sWeight = weightMap[source.id];
                        tWeight = weightMap[target.id];
                        totalWeight = sWeight + tWeight;
                        k = sWeight / totalWeight;
                        target.dx -= (dx * k) / maxWeight;
                        target.dy -= (dy * k) / maxWeight;
                        k = 1 - k;
                        source.dx += (dx * k) / maxWeight;
                        source.dy += (dy * k) / maxWeight;
                    }
                }
            }
        };
        this._calculateQuadTreeCharge = function (inNode) {
            if (inNode.fixed) {
                return;
            }
            var nodes = inNode.nodes;
            var point = inNode.point;
            var chargeX = 0, chargeY = 0, charge = 0;
            if (!nodes) {
                inNode.charge = inNode.pointCharge = this.charge;
                inNode.chargeX = point.x;
                inNode.chargeY = point.y;
                return;
            }
            if (nodes) {
                var i = 0, length = nodes.length, node, nodeCharge;
                for (; i < length; i++) {
                    node = nodes[i];
                    if (node) {
                        this._calculateQuadTreeCharge(node);
                        nodeCharge = node.charge;
                        charge += nodeCharge;
                        chargeX += nodeCharge * node.chargeX;
                        chargeY += nodeCharge * node.chargeY;
                    }
                }
            }
            if (point) {
                var thisCharge = this.charge;
                charge += thisCharge;
                chargeX += thisCharge * point.x;
                chargeY += thisCharge * point.y;
            }
            inNode.charge = charge;
            inNode.chargeX = chargeX / charge;
            inNode.chargeY = chargeY / charge;
        };
        this._calculateChargeEffect = function (inNode, inPoint) {
            if (this.__calculateChargeEffect(inNode, inPoint)) {
                var nodes = inNode.nodes;
                if (nodes) {
                    var node, i = 0, length = nodes.length;
                    for (; i < length; i++) {
                        node = nodes[i];
                        if (node) {
                            this._calculateChargeEffect(node, inPoint);
                        }
                    }
                }

            }
        };

        this.__calculateChargeEffect = function (inNode, inPoint) {
            if (inNode.point != inPoint) {
                var dx = inNode.chargeX - inPoint.x;
                var dy = inNode.chargeY - inPoint.y;
                var d2 = dx * dx + dy * dy;
                var d = Math.sqrt(d2);
                var dk = 1 / d;
                var k;
                if ((inNode.x2 - inNode.x1) * dk < theta) {
                    k = inNode.charge * dk * dk;
                    inPoint.dx -= dx * k;
                    inPoint.dy -= dy * k;
                    return false;
                } else {
                    if (inNode.point) {
                        if (!isFinite(dk)) {
                            inPoint.dx -= Math.random() * 10;
                            inPoint.dy -= Math.random() * 10;
                        } else if (inNode.pointCharge) {
                            k = inNode.pointCharge * dk * dk;
                            inPoint.dx -= dx * k;
                            inPoint.dy -= dy * k;
                        }
                    }
                }
            }
            return true;
        };
    };
})(nx, nx.global);
(function (nx, global) {
    nx.data.Force = function () {
        var force = {};
        var size = [100, 100];
        var alpha = 0,
            friction = 0.9;
        var linkDistance = function () {
            return 100;
        };
        var linkStrength = function () {
            return 1;
        };
        var charge = -1200,
            gravity = 0.1,
            theta = 0.8,
            nodes = [],
            links = [],
            distances, strengths, charges;

        function repulse(node) {
            return function (quad, x1, _, x2) {
                if (quad.point !== node) {
                    var dx = quad.cx - node.x,
                        dy = quad.cy - node.y,
                        dn = 1 / Math.sqrt(dx * dx + dy * dy),
                        k;
                    if ((x2 - x1) * dn < theta) {
                        k = quad.charge * dn * dn;
                        node.px -= dx * k;
                        node.py -= dy * k;
                        return true;
                    }
                    if (quad.point && isFinite(dn)) {
                        k = quad.pointCharge * dn * dn;
                        node.px -= dx * k;
                        node.py -= dy * k;
                    }
                }
                return !quad.charge;
            };
        }

        force.tick = function () {
            if ((alpha *= 0.99) < 0.005) {
                alpha = 0;
                return true;
            }
            var n = nodes.length,
                m = links.length,
                q, i, o, s, t, l, k, x, y;
            for (i = 0; i < m; ++i) {
                o = links[i];
                s = o.source;
                t = o.target;
                x = t.x - s.x;
                y = t.y - s.y;
                if ((l = x * x + y * y)) {
                    l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
                    x *= l;
                    y *= l;
                    t.x -= x * (k = s.weight / (t.weight + s.weight));
                    t.y -= y * k;
                    s.x += x * (k = 1 - k);
                    s.y += y * k;
                }
            }
            if ((k = alpha * gravity)) {
                x = size[0] / 2;
                y = size[1] / 2;
                i = -1;
                if (k)
                    while (++i < n) {
                        o = nodes[i];
                        o.x += (x - o.x) * k;
                        o.y += (y - o.y) * k;
                    }
            }
            if (charge) {
                forceAccumulate(q = quadtree(nodes), alpha, charges);
                i = -1;
                while (++i < n) {
                    if (!(o = nodes[i]).fixed) {
                        q.visit(repulse(o));
                    }
                }
            }
            i = -1;
            while (++i < n) {
                o = nodes[i];
                if (o.fixed) {
                    o.x = o.px;
                    o.y = o.py;
                } else {
                    o.x -= (o.px - (o.px = o.x)) * friction;
                    o.y -= (o.py - (o.py = o.y)) * friction;
                }
            }
        };
        force.nodes = function (x) {
            if (!arguments.length) return nodes;
            nodes = x;
            return force;
        };
        force.links = function (x) {
            if (!arguments.length) return links;
            links = x;
            return force;
        };
        force.distance = linkDistance;
        force.charge = function (x) {
            if (!arguments.length) return charge;
            charge = typeof x === "function" ? x : +x;
            return force;
        };
        force.size = function (x) {
            if (!arguments.length) return size;
            size = x;
            return force;
        };
        force.alpha = function (x) {
            if (!arguments.length) return alpha;
            if (alpha) {
                if (x > 0) alpha = x;
                else alpha = 0;
            } else if (x > 0) {
                alpha = x;
                force.tick();
            }
            return force;
        };
        force.start = function () {
            var i, j, n = nodes.length,
                m = links.length,
                w = size[0],
                h = size[1],
                neighbors, o;
            for (i = 0; i < n; ++i) {
                (o = nodes[i]).index = i;
                o.weight = 0;
            }
            distances = [];
            strengths = [];
            for (i = 0; i < m; ++i) {
                o = links[i];
                if (typeof o.source == "number") o.source = nodes[o.source];
                if (typeof o.target == "number") o.target = nodes[o.target];
                distances[i] = linkDistance.call(this, o, i);
                strengths[i] = linkStrength.call(this, o, i);
                ++o.source.weight;
                ++o.target.weight;
            }
            for (i = 0; i < n; ++i) {
                o = nodes[i];
                if (isNaN(o.x)) o.x = position("x", w);
                if (isNaN(o.y)) o.y = position("y", h);
                if (isNaN(o.px)) o.px = o.x;
                if (isNaN(o.py)) o.py = o.y;
            }
            charges = [];
            if (typeof charge === "function") {
                for (i = 0; i < n; ++i) {
                    charges[i] = +charge.call(this, nodes[i], i);
                }
            } else {
                for (i = 0; i < n; ++i) {
                    charges[i] = charge;
                }
            }

            function position(dimension, size) {
                var neighbors = neighbor(i),
                    j = -1,
                    m = neighbors.length,
                    x;
                while (++j < m)
                    if (!isNaN(x = neighbors[j][dimension])) return x;
                return Math.random() * size;
            }

            function neighbor() {
                if (!neighbors) {
                    neighbors = [];
                    for (j = 0; j < n; ++j) {
                        neighbors[j] = [];
                    }
                    for (j = 0; j < m; ++j) {
                        var o = links[j];
                        neighbors[o.source.index].push(o.target);
                        neighbors[o.target.index].push(o.source);
                    }
                }
                return neighbors[i];
            }

            return force.resume();
        };
        force.resume = function () {
            return force.alpha(0.1);
        };
        force.stop = function () {
            return force.alpha(0);
        };

        return force;
    };


    var forceAccumulate = function (quad, alpha, charges) {
        var cx = 0,
            cy = 0;
        quad.charge = 0;
        if (!quad.leaf) {
            var nodes = quad.nodes,
                n = nodes.length,
                i = -1,
                c;
            while (++i < n) {
                c = nodes[i];
                if (c == null) continue;
                forceAccumulate(c, alpha, charges);
                quad.charge += c.charge;
                cx += c.charge * c.cx;
                cy += c.charge * c.cy;
            }
        }
        if (quad.point) {
            if (!quad.leaf) {
                quad.point.x += Math.random() - 0.5;
                quad.point.y += Math.random() - 0.5;
            }
            var k = alpha * charges[quad.point.index];
            quad.charge += quad.pointCharge = k;
            cx += k * quad.point.x;
            cy += k * quad.point.y;
        }
        quad.cx = cx / quad.charge;
        quad.cy = cy / quad.charge;
    };

    var quadtree = function (points, x1, y1, x2, y2) {
        var p, i = -1,
            n = points.length;
        if (arguments.length < 5) {
            if (arguments.length === 3) {
                y2 = y1;
                x2 = x1;
                y1 = x1 = 0;
            } else {
                x1 = y1 = Infinity;
                x2 = y2 = -Infinity;
                while (++i < n) {
                    p = points[i];
                    if (p.x < x1) x1 = p.x;
                    if (p.y < y1) y1 = p.y;
                    if (p.x > x2) x2 = p.x;
                    if (p.y > y2) y2 = p.y;
                }
            }
        }
        var dx = x2 - x1,
            dy = y2 - y1;
        if (dx > dy) y2 = y1 + dx;
        else x2 = x1 + dy;

        function insert(n, p, x1, y1, x2, y2) {
            if (isNaN(p.x) || isNaN(p.y)) return;
            if (n.leaf) {
                var v = n.point;
                if (v) {
                    if (Math.abs(v.x - p.x) + Math.abs(v.y - p.y) < 0.01) {
                        insertChild(n, p, x1, y1, x2, y2);
                    } else {
                        n.point = null;
                        insertChild(n, v, x1, y1, x2, y2);
                        insertChild(n, p, x1, y1, x2, y2);
                    }
                } else {
                    n.point = p;
                }
            } else {
                insertChild(n, p, x1, y1, x2, y2);
            }
        }

        function insertChild(n, p, x1, y1, x2, y2) {
            var sx = x1 * 0.5 + x2 * 0.5,
                sy = y1 * 0.5 + y2 * 0.5,
                right = p.x >= sx,
                bottom = p.y >= sy,
                i = (bottom << 1) + right;
            n.leaf = false;
            n = n.nodes[i] || (n.nodes[i] = quadtreeNode());
            if (right) x1 = sx;
            else x2 = sx;
            if (bottom) y1 = sy;
            else y2 = sy;
            insert(n, p, x1, y1, x2, y2);
        }

        var root = quadtreeNode();
        root.add = function (p) {
            insert(root, p, x1, y1, x2, y2);
        };
        root.visit = function (f) {
            quadtreeVisit(f, root, x1, y1, x2, y2);
        };
        points.forEach(root.add);
        return root;
    };

    var quadtreeNode = function () {
        return {
            leaf: true,
            nodes: [],
            point: null
        };
    };

    var quadtreeVisit = function (f, node, x1, y1, x2, y2) {
        if (!f(node, x1, y1, x2, y2)) {
            var sx = (x1 + x2) * 0.5,
                sy = (y1 + y2) * 0.5,
                children = node.nodes;
            if (children[0]) quadtreeVisit(f, children[0], x1, y1, sx, sy);
            if (children[1]) quadtreeVisit(f, children[1], sx, y1, x2, sy);
            if (children[2]) quadtreeVisit(f, children[2], x1, sy, sx, y2);
            if (children[3]) quadtreeVisit(f, children[3], sx, sy, x2, y2);
        }
    };
})(nx, nx.global);

(function (nx, global) {
    /**
     * Convex algorithm
     * @class nx.data.Convex
     * @static
     */
    nx.define('nx.data.Convex', {
        static: true,
        methods: {
            multiply: function (p1, p2, p0) {
                return((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y));
            },
            dis: function (p1, p2) {
                return(Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)));
            },
            /**
             * Process given node array
             * @method process
             * @param inPointArray {Array} Each item should be a object, which include x&y attribute
             * @returns {Array}
             */
            process: function (inPointArray) {
                var stack = [];
                var count = inPointArray.length;
                var i, j, k = 0, top = 2;
                var tmp;

                //找到最下且偏左的那个点
                for (i = 1; i < count; i++) {
                    if ((inPointArray[i].y < inPointArray[k].y) || ((inPointArray[i].y === inPointArray[k].y) && (inPointArray[i].x < inPointArray[k].x))) {
                        k = i;
                    }
                }
                //将这个点指定为PointSet[0]
                tmp = inPointArray[0];
                inPointArray[0] = inPointArray[k];
                inPointArray[k] = tmp;

                //按极角从小到大,距离偏短进行排序
                for (i = 1; i < count - 1; i++) {
                    k = i;
                    for (j = i + 1; j < count; j++)
                        if ((this.multiply(inPointArray[j], inPointArray[k], inPointArray[0]) > 0) ||
                            ((this.multiply(inPointArray[j], inPointArray[k], inPointArray[0]) === 0) &&
                                (this.dis(inPointArray[0], inPointArray[j]) < this.dis(inPointArray[0], inPointArray[k]))))
                            k = j;//k保存极角最小的那个点,或者相同距离原点最近
                    tmp = inPointArray[i];
                    inPointArray[i] = inPointArray[k];
                    inPointArray[k] = tmp;
                }
                //第三个点先入栈
                stack[0] = inPointArray[0];
                stack[1] = inPointArray[1];
                stack[2] = inPointArray[2];
                //判断与其余所有点的关系
                for (i = 3; i < count; i++) {
                    //不满足向左转的关系,栈顶元素出栈
                    while (top > 0 && this.multiply(inPointArray[i], stack[top], stack[top - 1]) >= 0) {
                        top--;
                        stack.pop();
                    }
                    //当前点与栈内所有点满足向左关系,因此入栈.
                    stack[++top] = inPointArray[i];
                }
                return stack;
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Vertex class
     * @class nx.data.Vertex
     * @extend nx.data.ObservableObject
     * @module nx.data
     */

    var Vector = nx.geometry.Vector;

    nx.define('nx.data.Vertex', nx.data.ObservableObject, {
        events: ['updateCoordinate'],
        properties: {
            /**
             * Vertex id
             * @property id {String|Number}
             */
            id: {},
            /**
             * @property positionGetter
             */
            positionGetter: {
                value: function () {
                    return function () {
                        return {
                            x: nx.path(this._data, 'x') || 0,
                            y: nx.path(this._data, 'y') || 0
                        };
                    };
                }
            },
            /**
             * @property positionSetter
             */
            positionSetter: {
                value: function () {
                    return function (position) {
                        if (this._data) {
                            var x = nx.path(this._data, 'x');
                            var y = nx.path(this._data, 'y');
                            if (position.x !== x || position.y !== y) {
                                nx.path(this._data, 'x', position.x);
                                nx.path(this._data, 'y', position.y);
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };
                }
            },
            /**
             * Get/set vertex position.
             * @property position
             */
            position: {
                get: function () {
                    return{
                        x: this._x || 0,
                        y: this._y || 0
                    };
                },
                set: function (obj) {
                    var isModified = false;
                    var _position = {
                        x: this._x,
                        y: this._y
                    };
                    if (obj.x !== undefined && this._x !== obj.x) {
                        this._x = obj.x;
                        isModified = true;
                    }

                    if (obj.y !== undefined && this._y !== obj.y) {
                        this._y = obj.y;
                        isModified = true;
                    }


                    if (isModified) {

                        this.positionSetter().call(this, {x: this._x, y: this._y});

                        this.fire("updateCoordinate", {
                            oldPosition: _position,
                            newPosition: {
                                x: this._x,
                                y: this._y
                            }
                        });
                        this.notify("vector");
                    }
                }
            },
            /**
             * Get/set x coordination, suggest use position property
             * @property x
             */
            x: {
                get: function () {
                    return this._x || 0;
                },
                set: function (value) {
                    this.position({x: parseFloat(value)});
                }
            },
            /**
             * Get/set y coordination, suggest use position property
             * @property y
             */
            y: {
                get: function () {
                    return this._y || 0;
                },
                set: function (value) {
                    this.position({y: parseFloat(value)});
                }
            },
            /**
             * Get vertex's Vector object
             * @readOnly
             */
            vector: {
                get: function () {
                    var position = this.position();
                    return new Vector(position.x, position.y);
                }
            },
            restricted: {
                value: false
            },
            /**
             * Set/get vertex's visibility, and this property related to all connect edge set
             * @property visible {Boolean}
             * @default true
             */
            visible: {
                get: function () {
                    return this._visible !== undefined ? this._visible : true;
                },
                set: function (value) {
                    this._visible = value;

                    var graph = this.graph();

                    if (value === false) {
                        if (this.generated()) {
                            nx.each(this.edgeSetCollections(), function (esc, linkKey) {
                                graph.deleteEdgeSetCollection(linkKey);
                            }, this);
                            graph.removeVertex(this.id());
                        }
                    } else {
                        if (!this.restricted() && !this.generated()) {
                            graph.generateVertex(this);

                            nx.each(this.edgeSets(), function (edgeSet) {
                                graph._generateConnection(edgeSet);
                            });
                        }
                    }
                    var parentVertexSet = this.parentVertexSet();
                    if (parentVertexSet) {
                        graph.updateVertexSet(parentVertexSet);
                    }
                }
            },
            /**
             * Status property,tag is this vertex generated
             * @property generated {Boolean}
             * @default false
             */
            generated: {
                value: false
            },
            /**
             * Status property,tag is this vertex updated
             * @property updated {Boolean}
             * @default false
             */
            updated: {
                value: false
            },
            /**
             * Vertex's type
             * @property type {String}
             * @default 'vertex'
             */
            type: {
                value: 'vertex'
            },
            /**
             * connected edgeSets
             * @property edgeSets
             */
            edgeSets: {
                value: function () {
                    return {};
                }
            },
            /**
             * connected edgeSetCollections
             * @property edgeSetCollections
             */
            edgeSetCollections: {
                value: function () {
                    return {};
                }
            },
            /**
             * Get connected edges
             * @property edges
             */
            edges: {
                get: function () {
                    var edges = {};
                    nx.each(this.edgeSets(), function (edgeSet) {
                        nx.extend(edges, edgeSet.edges());
                    });
                    return edges;
                }
            },
            /**
             * Get connected vertices
             * @property connectedVertices
             */
            connectedVertices: {
                get: function () {
                    var vertices = {};
                    this.eachConnectedVertex(function (vertex, id) {
                        vertices[id] = vertex;
                    }, this);
                    return vertices;
                }
            },
            /**
             * Graph instance
             * @property graph {nx.data.ObservableGraph}
             */
            graph: {

            },
            /**
             * Vertex parent vertex set, if exist
             * @property parentVertexSet {nx.data.VertexSet}
             */
            parentVertexSet: {},
            /**
             * Vertex root vertexSet
             * @property rootVertexSet
             */
            rootVertexSet: {
                get: function () {
                    var parentVertexSet = this.parentVertexSet();
                    while (parentVertexSet && parentVertexSet.parentVertexSet()) {
                        parentVertexSet = parentVertexSet.parentVertexSet();
                    }
                    return parentVertexSet;
                }
            },
            /**
             * Generated Root VertexSet
             * @property generatedRootVertexSet
             */
            generatedRootVertexSet: {
                get: function () {
                    var _parentVertexSet;
                    var parentVertexSet = this.parentVertexSet();

                    while (parentVertexSet) {
                        if (parentVertexSet.generated() && parentVertexSet.activated()) {
                            _parentVertexSet = parentVertexSet;
                        }
                        parentVertexSet = parentVertexSet.parentVertexSet();
                    }
                    return _parentVertexSet;
                }
            },
            selected: {
                value: false
            }
        },
        methods: {

            set: function (key, value) {
                if (this.has(key)) {
                    this[key].call(this, value);
                } else {
                    nx.path(this._data, key, value);
                    this.notify(key);
                }
            },
            get: function (key) {
                if (this.has(key)) {
                    return this[key].call(this);
                } else {
                    return nx.path(this._data, key);
                }
            },
            has: function (name) {
                var member = this[name];
                return (member && member.__type__ == 'property');
            },

            /**
             * Get original data
             * @method getData
             * @returns {Object}
             */
            getData: function () {
                return this._data;
            },
            /**
             * Add connected edgeSet, which source vertex is this vertex
             * @method addEdgeSet
             * @param edgeSet {nx.data.EdgeSet}
             * @param linkKey {String}
             */
            addEdgeSet: function (edgeSet, linkKey) {
                var _edgeSets = this.edgeSets();
                _edgeSets[linkKey] = edgeSet;
            },
            /**
             * Remove edgeSet from connected edges array
             * @method removeEdgeSet
             * @param linkKey {String}
             */
            removeEdgeSet: function (linkKey) {
                var _edgeSets = this.edgeSets();
                delete  _edgeSets[linkKey];
            },
            addEdgeSetCollection: function (esc, linkKey) {
                var edgeSetCollections = this.edgeSetCollections();
                edgeSetCollections[linkKey] = esc;
            },
            removeEdgeSetCollection: function (linkKey) {
                var edgeSetCollections = this.edgeSetCollections();
                delete edgeSetCollections[linkKey];
            },
            /**
             * Iterate all connected vertices
             * @method eachConnectedVertex
             * @param callback {Function}
             * @param context {Object}
             */
            eachConnectedVertex: function (callback, context) {
                var id = this.id();
                nx.each(this.edgeSets(), function (edgeSet) {
                    var vertex = edgeSet.sourceID() == id ? edgeSet.target() : edgeSet.source();
                    if (vertex.visible() && !vertex.restricted()) {
                        callback.call(context || this, vertex, vertex.id());
                    }
                }, this);

                nx.each(this.edgeSetCollections(), function (esc) {
                    var vertex = esc.sourceID() == id ? esc.target() : esc.source();
                    if (vertex.visible() && !vertex.restricted()) {
                        callback.call(context || this, vertex, vertex.id());
                    }
                }, this);
            },
            /**
             * Move vertex
             * @method translate
             * @param x
             * @param y
             */
            translate: function (x, y) {
                var _position = this.position();
                if (x != null) {
                    _position.x += x;
                }

                if (y != null) {
                    _position.y += y;
                }

                this.position(_position);
            }
        }
    });
})
(nx, nx.global);

(function (nx, global) {


    /**
     * Edge
     * @class nx.data.Edge
     * @extend nx.data.ObservableObject
     * @module nx.data
     */

    var Line = nx.geometry.Line;
    nx.define('nx.data.Edge', nx.data.ObservableObject, {
        events: ['updateCoordinate'],
        properties: {
            /**
             * Source vertex
             * @property source {nx.data.Vertex}
             */
            source: {
                value: null
            },
            /**
             * Target vertex
             * @property target {nx.data.Vertex}
             */
            target: {
                value: null
            },
            /**
             * Source vertex id
             * @property sourceID {String|Number}
             */
            sourceID: {
                value: null
            },
            /**
             * Target vertex id
             * @property targetID {String|Number}
             */
            targetID: {
                value: null
            },
            /**
             * Edge's linkkey, linkkey = sourceID-targetID
             * @property linkKey {String}
             */
            linkKey: {

            },
            /**
             * Edge's reverse linkkey,reverseLinkKey = targetID + '_' + sourceID
             * @property reverseLinkKey {String}
             */
            reverseLinkKey: {

            },

            /**
             * Status property,tag is this edge generated
             * @property generated {Boolean}
             * @default false
             */
            generated: {
                value: false
            },
            /**
             * Status property,tag is this edge updated
             * @property updated {Boolean}
             * @default false
             */
            updated: {
                value: false
            },
            /**
             * Edge's type
             * @property type {String}
             * @default edge
             */
            type: {
                value: 'edge'
            },
            /**
             * Edge's id
             * @property id {String|Number}
             */
            id: {},
            /**
             * Edge's parent edge set
             * @property parentEdgeSet {nx.data.edgeSet}
             */
            parentEdgeSet: {},
            /**
             * Edge line object
             * @property line {nx.geometry.Line}
             * @readOnly
             */
            line: {
                get: function () {
                    return new Line(this.source().vector(), this.target().vector());
                }
            },
            /**
             * Edge position object
             * {{x1: (Number), y1: (Number), x2: (Number), y2: (Number)}}
             * @property position {Object}
             * @readOnly
             */
            position: {
                get: function () {
                    return {
                        x1: this.source().get("x"),
                        y1: this.source().get("y"),
                        x2: this.target().get("x"),
                        y2: this.target().get("y")
                    };
                }
            },
            /**
             * Is this link is a reverse link
             * @property reverse {Boolean}
             * @readOnly
             */
            reverse: {
                value: false
            },
            /**
             * Graph instance
             * @property graph {nx.data.ObservableGraph}
             */
            graph: {

            }
        },
        methods: {
            /**
             * Get original data
             * @method getData
             * @returns {Object}
             */
            getData: function () {
                return this._data;
            },
            attachEvent: function () {
                this.source().on('updateCoordinate', this._updateCoordinate, this);
                this.target().on('updateCoordinate', this._updateCoordinate, this);
            },
            _updateCoordinate: function () {
                this.fire('updateCoordinate');
            },
            dispose: function () {
                this.source().off('updateCoordinate', this._updateCoordinate, this);
                this.target().off('updateCoordinate', this._updateCoordinate, this);
                this.inherited();
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    var util = nx.util;
    /**
     * Vertex set ckass
     * @class nx.data.VertexSet
     * @extend nx.data.Vertex
     * @module nx.data
     */
    nx.define('nx.data.VertexSet', nx.data.Vertex, {
        properties: {
            position: {
                get: function () {
                    return{
                        x: this._x || 0,
                        y: this._y || 0
                    };
                },
                set: function (obj) {
                    var isModified = false;
                    var _position = {
                        x: this._x,
                        y: this._y
                    };
                    if (obj.x !== undefined && this._x !== obj.x) {
                        this._x = obj.x;
                        isModified = true;
                    }

                    if (obj.y !== undefined && this._y !== obj.y) {
                        this._y = obj.y;
                        isModified = true;
                    }


                    if (isModified) {

                        this.positionSetter().call(this, {x: this._x, y: this._y});


                        var _xDelta = this._x - _position.x;
                        var _yDelta = this._y - _position.y;

                        nx.each(this.vertices(), function (vertex) {
                            vertex.translate(_xDelta, _yDelta);
                        });
                        nx.each(this.vertexSet(), function (vertexSet) {
                            vertexSet.translate(_xDelta, _yDelta);
                        });

                        /**
                         * @event updateVertexSetCoordinate
                         * @param sender {Object}  Trigger instance
                         * @param {Object} {oldPosition:Point,newPosition:Point}
                         */

                        this.fire("updateCoordinate", {
                            oldPosition: _position,
                            newPosition: {
                                x: this._x,
                                y: this._y
                            }
                        });
                        this.notify("vector");
                    }
                }
            },
            /**
             * All child vertices
             * @property vertices {Object}
             * @default {}
             */
            vertices: {
                value: function () {
                    return {};
                }
            },
            vertexSet: {
                value: function () {
                    return {};
                }
            },
            subVertices: {
                get: function () {
                    var vertices = {};
                    this.eachSubVertex(function (vertex, id) {
                        vertices[id] = vertex;
                    });
                    return vertices;
                }
            },
            subVertexSet: {
                get: function () {
                    var vertexSets = {};
                    this.eachSubVertexSet(function (vertexSet, id) {
                        vertexSets[id] = vertexSet;
                    });
                    return vertexSets;
                }
            },
            visible: {
                value: true
            },
            inheritedVisible: {
                get: function () {
                    // all sub vertex is in visible
                    var invisible = true;
                    nx.each(this.vertices(), function (vertex) {
                        if (vertex.visible()) {
                            invisible = false;
                        }
                    });
                    nx.each(this.vertexSet(), function (vertexSet) {
                        if (vertexSet.visible()) {
                            invisible = false;
                        }
                    }, this);
                    return !invisible;
                }
            },
            /**
             * VertexSet's type
             * @property type {String}
             * @default 'vertexset'
             */
            type: {
                value: 'vertexSet'
            },
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
                    if (this._activated !== value) {
                        if (value) {
                            this._collapse();
                        } else {
                            this._expand();
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        methods: {
            initNodes: function () {
                var graph = this.graph();
                var nodes = this.get('nodes');
                nx.each(nodes, function (id) {
                    var vertex = graph.vertices().getItem(id) || graph.vertexSets().getItem(id);
                    if (vertex && !vertex.restricted()) {
                        var _map = vertex.type() == 'vertex' ? this.vertices() : this.vertexSet();
                        _map[id] = vertex;
                        vertex.restricted(true);
                        vertex.parentVertexSet(this);
                    } else {
                        if (console) {
                            console.warn('NodeSet data error', this.id(), id);
                        }
                    }
                }, this);

            },
            /***
             * Add child vertex
             * @method addVertex
             * @param vertex
             */
            addVertex: function (vertex) {
                var nodes = this.get('nodes');
                if (vertex) { //&& !vertex.restricted()
                    var id = vertex.id();
                    var _map = vertex.type() == 'vertex' ? this.vertices() : this.vertexSet();
                    _map[id] = vertex;
                    vertex.restricted(true);

                    var parentVertexSet = vertex.parentVertexSet();
                    if (parentVertexSet) {
                        parentVertexSet.removeVertex(id);
                        parentVertexSet.updated(true);
                    }

                    vertex.parentVertexSet(this);
                    nodes.push(vertex.id());
                    this.updated(true);
                }
            },
            /**
             * Remove vertex
             * @param id {String}
             * @returns {Array}
             */
            removeVertex: function (id) {
                var nodes = this.get('nodes');
                var vertex = this.vertices()[id] || this.vertexSet()[id];
                if (vertex) {
                    vertex.parentVertexSet(null);
                    delete this.vertices()[id];
                    delete this.vertexSet()[id];
                    nodes.splice(nodes.indexOf(id), 1);
                    this.updated(true);
                }
            },
            eachSubVertex: function (callback, context) {
                nx.each(this.vertices(), callback, context || this);
                nx.each(this.vertexSet(), function (vertex) {
                    vertex.eachSubVertex(callback, context);
                }, this);
            },
            eachSubVertexSet: function (callback, context) {
                nx.each(this.vertexSet(), callback, context || this);
                nx.each(this.vertexSet(), function (vertex) {
                    vertex.eachSubVertexSet(callback, context);
                }, this);
            },
            getSubEdgeSets: function () {
                var subEdgeSetMap = {};
                // get all sub vertex and edgeSet
                this.eachSubVertex(function (vertex) {
                    nx.each(vertex.edgeSets(), function (edgeSet, linkKey) {
                        subEdgeSetMap[linkKey] = edgeSet;
                    });
                }, this);
                return subEdgeSetMap;
            },
            _expand: function () {
                var graph = this.graph();

                var parentVertexSet = this.parentVertexSet();
                if (parentVertexSet) {
                    parentVertexSet.activated(false);
                }

                this._activated = false;

                // remove created edgeSet collection
                nx.each(this.edgeSetCollections(), function (esc, linkKey) {
                    graph.deleteEdgeSetCollection(linkKey);
                }, this);


                nx.each(this.vertices(), function (vertex, id) {
                    vertex.restricted(false);
                    if (vertex.visible()) {
                        graph.generateVertex(vertex);
                    }
                }, this);

                nx.each(this.vertexSet(), function (vertexSet) {
                    vertexSet.restricted(false);
                    if (vertexSet.visible()) {
                        graph.generateVertexSet(vertexSet);
                    }
                }, this);

                this.visible(false);

                this._generateConnection();
            },
            _collapse: function () {
                var graph = this.graph();

                this._activated = true;


                this.eachSubVertex(function (vertex) {
                    vertex.restricted(true);
                    if (vertex.generated()) {
                        nx.each(vertex.edgeSetCollections(), function (esc, linkKey) {
                            graph.deleteEdgeSetCollection(linkKey);
                        });
                    }
                }, this);


                nx.each(this.vertexSet(), function (vertexSet, id) {
                    vertexSet.restricted(true);
                    if (vertexSet.generated()) {
                        graph.removeVertexSet(id, false);
                    }
                }, this);

                nx.each(this.vertices(), function (vertex, id) {
                    vertex.restricted(true);
                    if (vertex.generated()) {
                        graph.removeVertex(id);
                    }
                }, this);

                this.visible(true);

                this._generateConnection();

            },
            _generateConnection: function () {
                //
                var graph = this.graph();

                nx.each(this.getSubEdgeSets(), function (edgeSet) {
                    graph._generateConnection(edgeSet);
                }, this);
            }
        }
    });


})
(nx, nx.global);
(function (nx, global) {

    /**
     * Edge set clas
     * @class nx.data.EdgeSet
     * @extend nx.data.Edge
     * @module nx.data
     */

    nx.define('nx.data.EdgeSet', nx.data.Edge, {
        properties: {
            /**
             * All child edges
             * @property edges {Object}
             */
            edges: {
                value: function () {
                    return {};
                }
            },
            /**
             * Edge's type
             * @property type {String}
             * @default 'edgeSet'
             */
            type: {
                value: 'edgeSet'
            },
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
                    var graph = this.graph();
                    nx.each(this.edges(), function (edge,id) {
                        if (value) {
                            graph.removeEdge(id, false);
                        } else {
                            graph.generateEdge(edge);
                        }
                    }, this);
                    this._activated = value;
                }
            }
        },
        methods: {
            /**
             * Add child edge
             * @method addEdge
             * @param edge {nx.data.Edge}
             */
            addEdge: function (edge) {
                var edges = this.edges();
                edges[edge.id()] = edge;
            },
            /**
             * Remove child edge
             * @method removeEdge
             * @param id {String}
             */
            removeEdge: function (id) {
                var edges = this.edges();
                delete  edges[id];
            }
        }

    });
})(nx, nx.global);
(function (nx, global) {
    /**
     * Edge set collection class
     * @class nx.data.EdgeSetCollection
     * @extend nx.data.Edge
     * @module nx.data
     */

    nx.define('nx.data.EdgeSetCollection', nx.data.Edge, {
        properties: {
            /**
             * All child edgeset
             * @property edgeSets {Object}
             */
            edgeSets: {
                value: function () {
                    return {};
                }
            },
            edges: {
                get: function () {
                    var edges = {};
                    nx.each(this.edgeSets(), function (edgeSet) {
                        nx.extend(edges, edgeSet.edges());
                    });
                    return edges;
                }
            },
            /**
             * Edge's type
             * @property type {String}
             * @default 'edgeSet'
             */
            type: {
                value: 'edgeSetCollection'
            },
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
//                    var graph = this.graph();
//                    this.eachEdge(function (edge) {
//                        if (edge.type() == 'edge') {
//                            if (value) {
//                                graph.fire('removeEdge', edge);
//                            } else {
//                                graph.fire('addEdge', edge);
//                            }
//                        } else if (edge.type() == 'edgeSet') {
//                            if (value) {
//                                graph.fire('removeEdgeSet', edge);
//                            } else {
//                                graph.fire('addEdgeSet', edge);
//                            }
//                        }
//                    }, this);
//                    this._activated = value;
                }
            }
        },
        methods: {
            /**
             * Add child edgeSet
             * @method addEdgeSet
             * @param edgeSet {nx.data.EdgeSet}
             */
            addEdgeSet: function (edgeSet) {
                var edgeSets = this.edgeSets();
                edgeSets[edgeSet.linkKey()] = edgeSet;
            },
            /**
             * Remove child edgeSet
             * @method removeEdgeSet
             * @param linkKey {String}
             */
            removeEdgeSet: function (linkKey) {
                var edgeSets = this.edgeSets();
                delete  edgeSets[linkKey];
            }
        }

    });
})(nx, nx.global);
(function (nx, global) {
    var util = nx.util;
    nx.define('nx.data.ObservableGraph.Vertices', nx.data.ObservableObject, {
        events: ['addVertex', 'removeVertex', 'deleteVertex', 'updateVertex', 'updateVertexCoordinate'],
        properties: {

            nodes: {
                get: function () {
                    return this._nodes || [];
                },
                set: function (value) {

                    // off previous ObservableCollection event
                    if (this._nodes && nx.is(this._nodes, nx.data.ObservableCollection)) {
                        this._nodes.off('change', this._nodesCollectionProcessor, this);
                    }

                    this.vertices().clear();

                    if (nx.is(value, nx.data.ObservableCollection)) {
                        value.on('change', this._nodesCollectionProcessor, this);
                        value.each(function (value) {
                            this._addVertex(value);
                        }, this);
                        this._nodes = value;
                    } else if (value) {
                        nx.each(value, this._addVertex, this);
                        this._nodes = value.slice();
                    }
                }
            },

            vertexFilter: {},
            vertices: {
                value: function () {
                    var vertices = new nx.data.ObservableDictionary();
                    vertices.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                this.deleteVertex(item.key());
                            }, this);
                        }
                    }, this);
                    return vertices;
                }
            },
            visibleVertices: {
                get: function () {
                    var vertices = {};
                    this.eachVertex(function (vertex, id) {
                        if (vertex.visible()) {
                            vertices[id] = vertex;
                        }
                    });
                    return vertices;
                }
            },
            vertexPositionGetter: {},
            vertexPositionSetter: {}
        },
        methods: {
            /**
             * Add vertex to Graph
             * @method addVertex
             * @param {JSON} data Vertex original data
             * @param {Object} [config] Config object
             * @returns {nx.data.Vertex}
             */
            addVertex: function (data, config) {
                var vertex;
                var nodes = this.nodes();
                var vertices = this.vertices();
                var identityKey = this.identityKey();
                if (nx.is(nodes, nx.data.ObservableCollection)) {
                    nodes.add(data);
                    //todo will has issue when data is not current
                    vertex = vertices.getItem(vertices.count() - 1);
                } else {
                    vertex = this._addVertex(data, config);
                    if (vertex) {
                        nodes.push(data);
                    }
                }

                if (!vertex) {
                    return null;
                }

                if (config) {
                    vertex.sets(config);
                }
                this.generateVertex(vertex);


                return vertex;
            },
            _addVertex: function (data) {
                var vertices = this.vertices();
                var identityKey = this.identityKey();

                if (typeof (data) == 'string' || typeof (data) == 'number') {
                    data = {
                        data: data
                    };
                }

                var id = nx.path(data, identityKey);
                id = id !== undefined ? id : (this.vertexSets().count() + this.vertices().count());

                if (vertices.getItem(id)) {
                    return null;
                }

                var vertex = new nx.data.Vertex(data);

                var vertexPositionGetter = this.vertexPositionGetter();
                var vertexPositionSetter = this.vertexPositionSetter();
                if (vertexPositionGetter && vertexPositionSetter) {
                    vertex.positionGetter(vertexPositionGetter);
                    vertex.positionSetter(vertexPositionSetter);
                }


                vertex.sets({
                    graph: this,
                    id: id
                });


                //delegate synchronize
                if (nx.is(data, nx.data.ObservableObject)) {
                    var fn = data.set;
                    data.set = function (key, value) {
                        fn.call(data, key, value);
                        //
                        if (vertex.__properties__.indexOf(key) == -1) {
                            if (vertex.has(key)) {
                                vertex[key].call(vertex, value);
                            } else {
                                vertex.notify(key);
                            }
                        }
                    };
                }


                // init position
                vertex.position(vertex.positionGetter().call(vertex));

                vertices.setItem(id, vertex);


                var vertexFilter = this.vertexFilter();
                if (vertexFilter && nx.is(vertexFilter, Function)) {
                    var result = vertexFilter.call(this, data, vertex);
                    vertex.visible(result === false);
                }

                return vertex;
            },
            generateVertex: function (vertex) {
                if (vertex.visible() && !vertex.generated() && !vertex.restricted()) {

                    vertex.on('updateCoordinate', this._updateVertexCoordinateFN, this);
                    /**
                     * @event addVertex
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.Vertex} vertex Vertex object
                     */
                    this.fire('addVertex', vertex);
                    vertex.generated(true);
                }
            },
            _updateVertexCoordinateFN: function (vertex) {
                /**
                 * @event updateVertexCoordinate
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.Vertex} vertex Vertex object
                 */
                this.fire('updateVertexCoordinate', vertex);
            },


            /**
             * Remove a vertex from Graph
             * @method removeVertex
             * @param {String} id
             * @returns {Boolean}
             */
            removeVertex: function (id) {
                var vertex = this.vertices().getItem(id);
                if (!vertex) {
                    return false;
                }

                nx.each(vertex.edgeSets(), function (edgeSet, linkKey) {
                    this.removeEdgeSet(linkKey);
                }, this);

                nx.each(vertex.edgeSetCollections(), function (esc, linkKey) {
                    this.deleteEdgeSetCollection(linkKey);
                }, this);


                vertex.off('updateCoordinate', this._updateVertexCoordinateFN, this);
                vertex.generated(false);
                /**
                 * @event removeVertex
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.Vertex} vertex Vertex object
                 */
                this.fire('removeVertex', vertex);
                return vertex;
            },
            /**
             * Delete a vertex from Graph
             * @method removeVertex
             * @param {id} id
             * @returns {Boolean}
             */
            deleteVertex: function (id) {
                var nodes = this.nodes();
                var vertex = this.getVertex(id);
                if (vertex) {
                    if (nx.is(nodes, nx.data.ObservableCollection)) {
                        var data = vertex.getData();
                        nodes.remove(data);
                    } else {
                        var index = this.nodes().indexOf(vertex.getData());
                        if (index != -1) {
                            this.nodes().splice(index, 1);
                        }
                        this._deleteVertex(id);
                    }
                }
            },
            _deleteVertex: function (id) {
                var vertex = this.vertices().getItem(id);
                if (!vertex) {
                    return false;
                }

                nx.each(vertex.edgeSets(), function (edgeSet) {
                    this.deleteEdgeSet(edgeSet.linkKey());
                }, this);

                nx.each(vertex.edgeSetCollections(), function (esc) {
                    this.deleteEdgeSetCollection(esc.linkKey());
                }, this);

                var vertexSet = vertex.parentVertexSet();
                if (vertexSet) {
                    vertexSet.removeVertex(id);
                }

                vertex.off('updateCoordinate', this._updateVertexCoordinateFN, this);
                vertex.generated(false);
                this.fire('deleteVertex', vertex);

                this.vertices().removeItem(id);

                vertex.dispose();
            },
            eachVertex: function (callback, context) {
                this.vertices().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            getVertex: function (id) {
                return this.vertices().getItem(id);
            },
            _nodesCollectionProcessor: function (sender, args) {
                var items = args.items;
                var action = args.action;
                var identityKey = this.identityKey();
                if (action == 'add') {
                    nx.each(items, function (data) {
                        var vertex = this._addVertex(data);
                        this.generateVertex(vertex);
                    }, this);
                } else if (action == 'remove') {
                    nx.each(items, function (data) {
                        var id = nx.path(data, identityKey);
                        this._deleteVertex(id);
                    }, this);
                } else if (action == 'clear') {
                    this.vertices().clear();
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    nx.define('nx.data.ObservableGraph.VertexSets', nx.data.ObservableObject, {
        events: ['addVertexSet', 'removeVertexSet', 'updateVertexSet', 'updateVertexSetCoordinate'],
        properties: {
            nodeSet: {
                get: function () {
                    return this._nodeSet || [];
                },
                set: function (value) {

                    if (this._nodeSet && nx.is(this._nodeSet, nx.data.ObservableCollection)) {
                        this._nodeSet.off('change', this._nodeSetCollectionProcessor, this);
                    }

                    this.vertexSets().clear();

                    if (nx.is(value, nx.data.ObservableCollection)) {
                        value.on('change', this._nodeSetCollectionProcessor, this);
                        value.each(function (value) {
                            this._addVertexSet(value);
                        }, this);
                        this._nodeSet = value;
                    } else if (value) {
                        nx.each(value, this._addVertexSet, this);
                        this._nodeSet = value.slice();
                    }

                    this.eachVertexSet(this.initVertexSet, this);


                }
            },
            vertexSets: {
                value: function () {
                    var vertexSets = new nx.data.ObservableDictionary();
                    vertexSets.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                this.removeVertexSet(item.key());
                            }, this);
                        }
                    }, this);
                    return vertexSets;
                }
            },
            visibleVertexSets: {
                get: function () {
                    var vertexSets = {};
                    this.eachVertexSet(function (vertexSet, id) {
                        if (vertexSet.visible()) {
                            vertexSets[id] = vertexSet;
                        }
                    });
                    return vertexSets;
                }
            }
        },
        methods: {
            /**
             * Add vertex set to Graph
             * @method addVertexSet
             * @param {JSON} data Vertex set original data, which include nodes(Array) attribute. That is node's ID collection.  e.g. {nodes:[id1,id2,id3]}
             * @param {Object} [config] Config object
             * @returns {nx.data.VertexSet}
             */
            addVertexSet: function (data, config) {


                var vertexSet;
                var nodeSet = this.nodeSet();
                var vertexSets = this.vertexSets();
                if (nx.is(nodeSet, nx.data.ObservableCollection)) {
                    nodeSet.add(data);
                    vertexSet = vertexSets.getItem(vertexSets.count() - 1);
                } else {
                    nodeSet.push(data);
                    vertexSet = this._addVertexSet(data);
                }

                if (!vertexSet) {
                    return null;
                }

                if (config) {
                    vertexSet.sets(config);
                }


                if (config.parentVertexSetID != null) {
                    var parentVertexSet = this.getVertexSet(config.parentVertexSetID);
                    if (parentVertexSet) {
                        parentVertexSet.addVertex(vertexSet);
                    }
                }

                this.initVertexSet(vertexSet);


                this.generateVertexSet(vertexSet);

                vertexSet.activated(true, {
                    force: true
                });
                this.updateVertexSet(vertexSet);

                return vertexSet;
            },
            _addVertexSet: function (data) {
                var identityKey = this.identityKey();
                var vertexSets = this.vertexSets();
                //
                if (typeof (data) == 'string' || typeof (data) == 'number') {
                    data = {
                        data: data
                    };
                }
                var id = nx.path(data, identityKey);
                id = id !== undefined ? id : this.vertexSets().count() + this.vertices().count();

                if (vertexSets.getItem(id)) {
                    return null;
                }

                var vertexSet = new nx.data.VertexSet(data);


                var vertexPositionGetter = this.vertexPositionGetter();
                var vertexPositionSetter = this.vertexPositionSetter();
                if (vertexPositionGetter && vertexPositionSetter) {
                    vertexSet.positionGetter(vertexPositionGetter);
                    vertexSet.positionSetter(vertexPositionSetter);
                }

                //
                vertexSet.sets({
                    graph: this,
                    type: 'vertexSet',
                    id: id
                });


                //delegate synchronize
                if (nx.is(data, nx.data.ObservableObject)) {
                    var fn = data.set;
                    data.set = function (key, value) {
                        fn.call(data, key, value);
                        //
                        if (vertexSet.__properties__.indexOf(key) == -1) {
                            if (vertexSet.has(key)) {
                                vertexSet[key].call(vertexSet, value);
                            } else {
                                vertexSet.notify(key);
                            }
                        }
                    };
                }


                vertexSet.position(vertexSet.positionGetter().call(vertexSet));

                this.vertexSets().setItem(id, vertexSet);

                return vertexSet;
            },
            initVertexSet: function (vertexSet) {
                vertexSet.initNodes();
            },
            generateVertexSet: function (vertexSet) {
                if (vertexSet.visible() && !vertexSet.generated()) {
                    vertexSet.generated(true);
                    vertexSet.on('updateCoordinate', this._updateVertexSetCoordinateFN, this);
                    this.fire('addVertexSet', vertexSet);
                }
            },
            _updateVertexSetCoordinateFN: function (vertexSet, args) {
                /**
                 * @event updateVertexSetCoordinate
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.VertexSet} vertexSet VertexSet object
                 */
                this.fire('updateVertexSetCoordinate', vertexSet);
            },
            updateVertexSet: function (vertexSet) {
                if (vertexSet.generated()) {
                    vertexSet.updated(false);
                    /**
                     * @event updateVertexSet
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.VertexSet} vertexSet VertexSet object
                     */
                    this.fire('updateVertexSet', vertexSet);
                }
            },

            /**
             * Remove a vertex set from Graph
             * @method removeVertexSet
             * @param {String} id
             * @returns {Boolean}
             */
            removeVertexSet: function (id) {

                var vertexSet = this.vertexSets().getItem(id);
                if (!vertexSet) {
                    return false;
                }


                vertexSet.activated(true);

                nx.each(vertexSet.edgeSets(), function (edgeSet, linkKey) {
                    this.removeEdgeSet(linkKey);
                }, this);

                nx.each(vertexSet.edgeSetCollections(), function (esc, linkKey) {
                    this.deleteEdgeSetCollection(linkKey);
                }, this);

                vertexSet.generated(false);
                vertexSet.off('updateCoordinate', this._updateVertexSetCoordinateFN, this);
                this.fire('removeVertexSet', vertexSet);

            },
            deleteVertexSet: function (id) {
                var nodeSet = this.nodeSet();
                var vertexSet = this.getVertexSet(id);
                if (vertexSet) {
                    if (nx.is(nodeSet, nx.data.ObservableCollection)) {
                        var data = vertexSet.getData();
                        nodeSet.remove(data);
                    } else {
                        var index = this.nodeSet().indexOf(vertexSet.getData());
                        if (index != -1) {
                            this.nodeSet().splice(index, 1);
                        }
                        this._deleteVertexSet(id);
                    }
                }
            },
            _deleteVertexSet: function (id) {
                var vertexSet = this.vertexSets().getItem(id);
                if (!vertexSet) {
                    return false;
                }
                if (vertexSet.generated()) {
                    vertexSet.activated(false);
                }


                var parentVertexSet = vertexSet.parentVertexSet();
                if (parentVertexSet) {
                    parentVertexSet.removeVertex(id);

                }

                nx.each(vertexSet.vertices(), function (vertex) {
                    if (parentVertexSet) {
                        parentVertexSet.addVertex(vertex);
                    } else {
                        vertex.parentVertexSet(null);
                    }
                });
                nx.each(vertexSet.vertexSet(), function (vertexSet) {
                    if (parentVertexSet) {
                        parentVertexSet.addVertex(vertexSet);
                    } else {
                        vertexSet.parentVertexSet(null);
                    }
                });

                vertexSet.off('updateCoordinate', this._updateVertexCoordinateFN, this);
                vertexSet.generated(false);
                this.vertexSets().removeItem(id);
                this.fire('deleteVertexSet', vertexSet);

                vertexSet.dispose();
            },

            eachVertexSet: function (callback, context) {
                this.vertexSets().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            getVertexSet: function (id) {
                return this.vertexSets().getItem(id);
            },
            _nodeSetCollectionProcessor: function (sender, args) {
                var items = args.items;
                var action = args.action;
                var identityKey = this.identityKey();
                if (action == 'add') {
                    nx.each(items, function (data) {
                        var vertexSet = this._addVertexSet(data);
                        this.generateVertexSet(vertexSet);

                    }, this);
                } else if (action == 'remove') {
                    nx.each(items, function (data) {
                        var id = nx.path(data, identityKey);
                        this._deleteVertexSet(id);
                    }, this);
                } else if (action == 'clear') {
                    this.vertexSets().clear();
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    nx.define('nx.data.ObservableGraph.Edges', nx.data.ObservableObject, {
        events: ['addEdge', 'removeEdge', 'deleteEdge', 'updateEdge', 'updateEdgeCoordinate'],
        properties: {
            links: {
                get: function () {
                    return this._links || [];
                },
                set: function (value) {

                    if (this._links && nx.is(this._links, nx.data.ObservableCollection)) {
                        this._links.off('change', this._linksCollectionProcessor, this);
                    }

                    this.edgeSetCollections().clear();

                    this.edgeSets().clear();

                    this.edges().clear();


                    if (nx.is(value, nx.data.ObservableCollection)) {
                        value.on('change', this._linksCollectionProcessor, this);
                        value.each(function (value) {
                            this._addEdge(value);
                        }, this);
                        this._links = value;
                    } else if (value) {
                        nx.each(value, this._addEdge, this);
                        this._links = value.slice();
                    }


                }
            },
            edgeFilter: {},
            edges: {
                value: function () {
                    var edges = new nx.data.ObservableDictionary();
                    edges.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                this.deleteEdge(item.key());
                            }, this);
                        }
                    }, this);
                    return edges;
                }
            }
        },
        methods: {
            /**
             * Add edge to Graph
             * @method addEdge
             * @param {JSON} data Vertex original data
             * @param {Object} [config] Config object
             * @returns {nx.data.Edge}
             */
            addEdge: function (data, config) {
                var links = this.links();
                var edges = this.edges();
                var edge;

                if (data.source == null || data.target == null) {
                    return undefined;
                }


                if (nx.is(links, nx.data.ObservableCollection)) {
                    links.add(data);
                    // todo, handler when the data error,
                    edge = edges.getItem(edges.count() - 1);
                }
                else {
                    edge = this._addEdge(data);
                    if (edge) {
                        links.push(data);
                    }
                }

                if (!edge) {
                    return null;
                }

                if (config) {
                    edge.sets(config);
                }

                //update edgeSet
                var edgeSet = edge.parentEdgeSet();
                if (!edgeSet.generated()) {
                    this.generateEdgeSet(edgeSet);
                }
                else {
                    this.updateEdgeSet(edgeSet);
                }

                return edge;
            },
            _addEdge: function (data) {
                var edges = this.edges();
                var identityKey = this.identityKey();
                var source, target, sourceID, targetID;


                if (data.source == null || data.target == null) {
                    return undefined;
                }


                sourceID = nx.path(data, 'source') != null ? nx.path(data, 'source') : data.source;
                source = this.vertices().getItem(sourceID); // || this.vertexSets().getItem(sourceID);


                targetID = nx.path(data, 'target') != null ? nx.path(data, 'target') : data.source;
                target = this.vertices().getItem(targetID); // || this.vertexSets().getItem(targetID);


                if (source && target) {
                    var edge = new nx.data.Edge(data);
                    var id = nx.path(data, 'id') != null ? nx.path(data, 'id') : edge.__id__;

                    if (edges.getItem(id)) {
                        return null;
                    }


                    edge.sets({
                        id: id,
                        source: source,
                        target: target,
                        sourceID: sourceID,
                        targetID: targetID,
                        graph: this
                    });

                    edge.attachEvent();

                    edges.setItem(id, edge);

                    var edgeSet = this.getEdgeSetBySourceAndTarget(sourceID, targetID);
                    if (!edgeSet) {
                        edgeSet = this._addEdgeSet({
                            source: source,
                            target: target,
                            sourceID: sourceID,
                            targetID: targetID
                        });
                    }
                    else {
                        edgeSet.updated(true);
                    }

                    edge.sets({
                        linkKey: edgeSet.linkKey(),
                        reverseLinkKey: edgeSet.reverseLinkKey()
                    });

                    edgeSet.addEdge(edge);
                    edge.parentEdgeSet(edgeSet);
                    edge.reverse(sourceID !== edgeSet.sourceID());


                    var edgeFilter = this.edgeFilter();
                    if (edgeFilter && nx.is(edgeFilter, Function)) {
                        var result = edgeFilter.call(this, data, edge);
                        edge.visible(result === false);
                    }

                    return edge;

                }
                else {
                    if (console) {
                        console.warn('source node or target node is not defined, or linkMappingKey value error', data, source, target);
                    }
                    return undefined;
                }
            },
            generateEdge: function (edge) {
                if (!edge.generated() && edge.source().generated() && edge.target().generated()) {
                    edge.on('updateCoordinate', this._updateEdgeCoordinate, this);

                    /**
                     * @event addEdge
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.Edge} edge Edge object
                     */
                    this.fire('addEdge', edge);
                    edge.generated(true);
                }
            },
            /**
             * Remove edge from Graph
             * @method removeEdge
             * @param id {String} edge id
             * @param isUpdateEdgeSet {Boolean}
             */
            removeEdge: function (id, isUpdateEdgeSet) {
                var edge = this.edges().getItem(id);
                if (!edge) {
                    return false;
                }
                edge.generated(false);
                edge.off('updateCoordinate', this._updateEdgeCoordinate, this);
                /**
                 * @event removeEdge
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.Edge} edge Edge object
                 */
                this.fire('removeEdge', edge);

                if (isUpdateEdgeSet !== false) {
                    var edgeSet = edge.parentEdgeSet();
                    this.updateEdgeSet(edgeSet);
                }
            },
            deleteEdge: function (id, isUpdateEdgeSet) {

                var edge = this.getEdge(id);
                if (!edge) {
                    return false;
                }

                var links = this.links();
                if (nx.is(links, nx.data.ObservableCollection)) {
                    links.removeAt(edge.getData());
                }
                else {
                    var index = links.indexOf(edge.getData());
                    if (index != -1) {
                        links.splice(index, 1);
                    }
                    this._deleteEdge(id, isUpdateEdgeSet);
                }

            },
            _deleteEdge: function (id, isUpdateEdgeSet) {
                var edge = this.getEdge(id);
                if (!edge) {
                    return false;
                }
                edge.off('updateCoordinate', this._updateEdgeCoordinate, this);

                //update parent
                if (isUpdateEdgeSet !== false) {
                    var edgeSet = edge.parentEdgeSet();
                    edgeSet.removeEdge(id);
                    this.updateEdgeSet(edgeSet);
                }

                /**
                 * @event deleteEdge
                 * @param sender {Object} Trigger instance
                 * @param {nx.data.Edge} edge Edge object
                 */
                this.fire('deleteEdge', edge);

                this.edges().removeItem(id);

                edge.dispose();

            },
            _updateEdgeCoordinate: function (sender, args) {
                this.fire('updateEdgeCoordinate', sender);
            },
            getEdge: function (id) {
                return this.edges().getItem(id);
            },
            /**
             * Get edges by source vertex id and target vertex id
             * @method getEdgesBySourceAndTarget
             * @param source {nx.data.Vertex|Number|String} could be vertex object or id
             * @param target {nx.data.Vertex|Number|String} could be vertex object or id
             * @returns {Array}
             */
            getEdgesBySourceAndTarget: function (source, target) {
                var edgeSet = this.getEdgeSetBySourceAndTarget(source, target);
                return edgeSet && edgeSet.getEdges();
            },
            /**
             * Get edges which are connected to passed vertices
             * @method getEdgesByVertices
             * @param inVertices
             * @returns {Array}
             */
            getEdgesByVertices: function (inVertices) {
                //                var edges = [];
                //                nx.each(inVertices, function (vertex) {
                //                    edges = edges.concat(vertex.edges);
                //                    edges = edges.concat(vertex.reverseEdges);
                //                });
                //
                //
                //                return util.uniq(edges);
            },

            /**
             * Get edges which's source and target vertex are both in the passed vertices
             * @method getInternalEdgesByVertices
             * @param inVertices
             * @returns {Array}
             */

            getInternalEdgesByVertices: function (inVertices) {
                //                var edges = [];
                //                var verticesMap = {};
                //                var internalEdges = [];
                //                nx.each(inVertices, function (vertex) {
                //                    edges = edges.concat(vertex.edges);
                //                    edges = edges.concat(vertex.reverseEdges);
                //                    verticesMap[vertex.id()] = vertex;
                //                });
                //
                //                nx.each(edges, function (edge) {
                //                    if (verticesMap[edge.sourceID()] !== undefined && verticesMap[edge.targetID()] !== undefined) {
                //                        internalEdges.push(edge);
                //                    }
                //                });
                //
                //
                //                return internalEdges;

            },
            /**
             * Get edges which's  just one of source or target vertex in the passed vertices. All edges connected ourside of passed vertices
             * @method getInternalEdgesByVertices
             * @param inVertices
             * @returns {Array}
             */
            getExternalEdgesByVertices: function (inVertices) {
                //                var edges = [];
                //                var verticesMap = {};
                //                var externalEdges = [];
                //                nx.each(inVertices, function (vertex) {
                //                    edges = edges.concat(vertex.edges);
                //                    edges = edges.concat(vertex.reverseEdges);
                //                    verticesMap[vertex.id()] = vertex;
                //                });
                //
                //                nx.each(edges, function (edge) {
                //                    if (verticesMap[edge.sourceID()] === undefined || verticesMap[edge.targetID()] === undefined) {
                //                        externalEdges.push(edge);
                //                    }
                //                });
                //
                //
                //                return externalEdges;

            },
            _linksCollectionProcessor: function (sender, args) {
                var items = args.items;
                var action = args.action;
                if (action == 'add') {
                    nx.each(items, function (data) {
                        var edge = this._addEdge(data);
                        //update edgeSet
                        var edgeSet = edge.parentEdgeSet();
                        if (!edgeSet.generated()) {
                            this.generateEdgeSet(edgeSet);
                        }
                        else {
                            this.updateEdgeSet(edgeSet);
                        }
                    }, this);
                }
                else if (action == 'remove') {
                    var ids = [];
                    // get all edges should be delete
                    this.edges().each(function (item, id) {
                        var edge = item.value();
                        if (items.indexOf(edge.getData()) != -1) {
                            ids.push(edge.id());
                        }
                    }, this);
                    nx.each(ids, function (id) {
                        this._deleteEdge(id);
                    }, this);

                }
                else if (action == 'clear') {
                    this.edges().clear();
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    nx.define('nx.data.ObservableGraph.EdgeSets', nx.data.ObservableObject, {
        events: ['addEdgeSet', 'updateEdgeSet', 'removeEdgeSet', 'deleteEdgeSet', 'updateEdgeSetCoordinate'],
        properties: {
            edgeSets: {
                value: function () {
                    var edgeSets = new nx.data.ObservableDictionary();
                    edgeSets.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                this.deleteEdgeSet(item.key());
                            }, this);
                        }
                    }, this);
                    return edgeSets;
                }
            }
        },
        methods: {
            _addEdgeSet: function (data) {
                var edgeSet = new nx.data.EdgeSet();
                var id = edgeSet.__id__;
                var linkKey = data.sourceID + '_' + data.targetID;
                var reverseLinkKey = data.targetID + '_' + data.sourceID;


                edgeSet.sets(data);
                edgeSet.sets({
                    graph: this,
                    linkKey: linkKey,
                    reverseLinkKey: reverseLinkKey,
                    id: id
                });

                edgeSet.source().addEdgeSet(edgeSet, linkKey);
                edgeSet.target().addEdgeSet(edgeSet, linkKey);

                edgeSet.attachEvent();

                this.edgeSets().setItem(linkKey, edgeSet);
                return edgeSet;
            },
            generateEdgeSet: function (edgeSet) {
                if (!edgeSet.generated() && edgeSet.source().generated() && edgeSet.target().generated()) {
                    edgeSet.generated(true);
                    edgeSet.on('updateCoordinate', this._updateEdgeSetCoordinate, this);
                    /**
                     * @event addEdgeSet
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                     */
                    this.fire('addEdgeSet', edgeSet);
                }
            },
            updateEdgeSet: function (edgeSet) {
                if (edgeSet.generated() && edgeSet.source().generated() && edgeSet.target().generated()) {
                    edgeSet.updated(false);
                    /**
                     * @event updateEdgeSet
                     * @param sender {Object}  Trigger instance
                     * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                     */
                    this.fire('updateEdgeSet', edgeSet);
                }
            },
            removeEdgeSet: function (linkKey) {

                var edgeSet = this.edgeSets().getItem(linkKey);
                if (!edgeSet) {
                    return false;
                }

                edgeSet.off('updateCoordinate', this._updateEdgeSetCoordinate, this);

                nx.each(edgeSet.edges(), function (edge, id) {
                    this.removeEdge(id, false);
                }, this);
                edgeSet.generated(false);
                edgeSet._activated = true;
                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('removeEdgeSet', edgeSet);
            },
            deleteEdgeSet: function (linkKey) {
                var edgeSet = this.edgeSets().getItem(linkKey);
                if (!edgeSet) {
                    return false;
                }

                edgeSet.off('updateCoordinate', this._updateEdgeSetCoordinate, this);

                nx.each(edgeSet.edges(), function (edge, id) {
                    this.deleteEdge(id, false);
                }, this);

                edgeSet.source().removeEdgeSet(linkKey);
                edgeSet.target().removeEdgeSet(linkKey);

                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('deleteEdgeSet', edgeSet);

                this.edgeSets().removeItem(linkKey);

                edgeSet.dispose();
            },
            _updateEdgeSetCoordinate: function (sender, args) {
                this.fire('updateEdgeSetCoordinate', sender);
            },
            /**
             * Get edgeSet by source vertex id and target vertex id
             * @method getEdgeSetBySourceAndTarget
             * @param source {nx.data.Vertex|Number|String} could be vertex object or id
             * @param target {nx.data.Vertex|Number|String} could be vertex object or id
             * @returns {nx.data.EdgeSet}
             */
            getEdgeSetBySourceAndTarget: function (source, target) {
                var edgeSets = this.edgeSets();

                var sourceID = nx.is(source, nx.data.Vertex) ? source.id() : source;
                var targetID = nx.is(target, nx.data.Vertex) ? target.id() : target;

                var linkKey = sourceID + '_' + targetID;
                var reverseLinkKey = targetID + '_' + sourceID;

                return edgeSets.getItem(linkKey) || edgeSets.getItem(reverseLinkKey);
            },
            eachEdgeSet: function (callback, context) {
                this.edgeSets().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    nx.define('nx.data.ObservableGraph.EdgeSetCollections', nx.data.ObservableObject, {
        events: ['addEdgeSetCollection', 'removeEdgeSetCollection', 'deleteEdgeSetCollection', 'updateEdgeSetCollection', 'updateEdgeSetCollectionCoordinate'],
        properties: {
            edgeSetCollections: {
                value: function () {
                    var edgeSetCollections = new nx.data.ObservableDictionary();
                    edgeSetCollections.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                //[TODO] DEBUG
                                if(item.value()){
                                    this.deleteEdgeSetCollection(item.value().linkKey());
                                }
                            }, this);
                        }
                    }, this);
                    return edgeSetCollections;
                }
            }
        },
        methods: {
            _addEdgeSetCollection: function (data) {
                var esc = new nx.data.EdgeSetCollection();
                var id = esc.__id__;
                var linkKey = data.sourceID + '_' + data.targetID;
                var reverseLinkKey = data.targetID + '_' + data.sourceID;


                esc.sets(data);
                esc.sets({
                    graph: this,
                    linkKey: linkKey,
                    reverseLinkKey: reverseLinkKey,
                    id: id
                });

                esc.source().addEdgeSetCollection(esc, linkKey);
                esc.target().addEdgeSetCollection(esc, linkKey);

                esc.attachEvent();

                this.edgeSetCollections().setItem(linkKey, esc);
                return esc;
            },
            generateEdgeSetCollection: function (esc) {
                esc.generated(true);
                esc.on('updateCoordinate', this._updateEdgeSetCollectionCoordinate, this);
                this.fire('addEdgeSetCollection', esc);
            },
            updateEdgeSetCollection: function (esc) {
                esc.updated(true);
                this.fire('updateEdgeSetCollection', esc);
            },
            removeEdgeSetCollection: function (linkKey) {

                var esc = this.edgeSetCollections().getItem(linkKey);
                if (!esc) {
                    return false;
                }

                esc.generated(false);
                esc.off('updateCoordinate', this._updateEdgeSetCollectionCoordinate, this);

                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('removeEdgeSetCollection', esc);
            },

            deleteEdgeSetCollection: function (linkKey) {

                var esc = this.edgeSetCollections().getItem(linkKey);
                if (!esc) {
                    return false;
                }
                esc.off('updateCoordinate', this._updateEdgeSetCollectionCoordinate, this);
                esc.source().removeEdgeSetCollection(linkKey);
                esc.target().removeEdgeSetCollection(linkKey);

                /**
                 * @event removeEdgeSet
                 * @param sender {Object}  Trigger instance
                 * @param {nx.data.EdgeSet} edgeSet EdgeSet object
                 */
                this.fire('deleteEdgeSetCollection', esc);

                this.edgeSetCollections().removeItem(linkKey);

                esc.dispose();
            },
            getEdgeSetCollectionBySourceAndTarget: function (source, target) {
                var edgeSetCollections = this.edgeSetCollections();

                var sourceID = nx.is(source, nx.data.Vertex) ? source.id() : source;
                var targetID = nx.is(target, nx.data.Vertex) ? target.id() : target;

                var linkKey = sourceID + '_' + targetID;
                var reverseLinkKey = targetID + '_' + sourceID;

                return edgeSetCollections.getItem(linkKey) || edgeSetCollections.getItem(reverseLinkKey);
            },
            _updateEdgeSetCollectionCoordinate: function (sender, args) {
                this.fire('updateEdgeSetCollectionCoordinate', sender);
            },
            eachEdgeCollections: function (callback, context) {
                this.edgeSetCollections().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            _generateConnection: function (edgeSet) {

                if (!edgeSet.source().visible() || !edgeSet.target().visible()) {
                    return;
                }

                var obj = this._getGeneratedRootVertexSetOfEdgeSet(edgeSet);

                if (!obj.source || !obj.target) {
                    return;
                }

                if (obj.source == obj.target) {
                    return;
                }

                if (!obj.source.visible() || !obj.target.visible()) {
                    return;
                }


                if (obj.source.id() == edgeSet.sourceID() && obj.target.id() == edgeSet.targetID()) {
                    this.generateEdgeSet(edgeSet);
                } else {
                    var esc = this.getEdgeSetCollectionBySourceAndTarget(obj.source.id(), obj.target.id());
                    if (!esc) {
                        esc = this._addEdgeSetCollection({
                            source: obj.source,
                            target: obj.target,
                            sourceID: obj.source.id(),
                            targetID: obj.target.id()
                        });
                        this.generateEdgeSetCollection(esc);
                    }
                    esc.addEdgeSet(edgeSet);
                    this.updateEdgeSetCollection(esc);
                }
            },
            _getGeneratedRootVertexSetOfEdgeSet: function (edgeSet) {
                var source = edgeSet.source();
                if (!source.generated()) {
                    source = source.generatedRootVertexSet();
                }
                var target = edgeSet.target();
                if (!target.generated()) {
                    target = target.generatedRootVertexSet();
                }
                return {
                    source: source,
                    target: target
                };
            }
        }
    });


})(nx, nx.global);
(function (nx, global, logger) {
    /**
     * Force layout processor
     * @class nx.data.ObservableGraph.ForceProcessor
     * @module nx.data
     */
    nx.define("nx.data.ObservableGraph.NeXtForceProcessor", {
        methods: {
            /**
             * Process graph data
             * @param data {JSON} standard graph data
             * @param [key]
             * @param [model]
             * @returns {JSON} {JSON} standard graph data
             */
            process: function (data, key, model) {
                var forceStartDate = new Date();

                var _data = {nodes: data.nodes, links: []};
                var nodeIndexMap = {};
                nx.each(data.nodes, function (node, index) {
                    nodeIndexMap[node[key]] = index;
                });

                _data.links = [];
                nx.each(data.links, function (link) {
                    if (!nx.is(link.source, 'Object') && nodeIndexMap[link.source] !== undefined && !nx.is(link.target, 'Object') && nodeIndexMap[link.target] !== undefined) {
                        _data.links.push({
                            source: nodeIndexMap[link.source],
                            target: nodeIndexMap[link.target]
                        });
                    }
                });

                // force
                var force = new nx.data.NextForce();
                force.setData(data);
                console.log(_data.nodes.length);
                if (_data.nodes.length < 50) {
                    while (true) {
                        force.tick();
                        if (force.maxEnergy < _data.nodes.length * 0.1) {
                            break;
                        }
                    }
                } else {
                    var step = 0;
                    while (++step < 900) {
                        force.tick();
                    }
                }

                console.log(force.maxEnergy);

                return data;
            }
        }
    });

})(nx, nx.global, nx.logger);
(function (nx, global, logger) {
    /**
     * Force layout processor
     * @class nx.data.ObservableGraph.ForceProcessor
     * @module nx.data
     */
    nx.define("nx.data.ObservableGraph.ForceProcessor", {
        methods: {
            /**
             * Process graph data
             * @param data {JSON} standard graph data
             * @param [key]
             * @param [model]
             * @returns {JSON} {JSON} standard graph data
             */
            process: function (data, key, model) {
                var forceStartDate = new Date();
                var _data;

                _data = {nodes: data.nodes, links: []};
                var nodeIndexMap = {};
                nx.each(data.nodes, function (node, index) {
                    nodeIndexMap[node[key]] = index;
                });


                // if source and target is not number, force will search node
                nx.each(data.links, function (link) {
                    if (!nx.is(link.source, 'Object') && nodeIndexMap[link.source] !== undefined && !nx.is(link.target, 'Object') && nodeIndexMap[link.target] !== undefined) {
                        if (key == 'ixd') {
                            _data.links.push({
                                source: link.source,
                                target: link.target
                            });
                        } else {
                            _data.links.push({
                                source: nodeIndexMap[link.source],
                                target: nodeIndexMap[link.target]
                            });
                        }

                    }
                });
                var force = new nx.data.Force();
                force.nodes(_data.nodes);
                force.links(_data.links);
                force.start();
                while (force.alpha()) {
                    force.tick();
                }
                force.stop();

                return data;
            }
        }
    });

})(nx, nx.global, nx.logger);
(function (nx, global) {
    nx.define("nx.data.ObservableGraph.QuickProcessor", {
        methods: {
            process: function (data, key, model) {
                nx.each(data.nodes, function (node) {
                    node.x = Math.floor(Math.random() * model.width());
                    node.y = Math.floor(Math.random() * model.height());
//                    node.x = Math.floor(Math.random() * 100);
//                    node.y = Math.floor(Math.random() * 100);
                });
                return data;
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    nx.define("nx.data.ObservableGraph.CircleProcessor", {
        methods: {
            process: function (data) {

            }
        }
    });

})(nx, nx.global);
(function (nx, global) {

    var DataProcessor = nx.define("nx.data.ObservableGraph.DataProcessor", {
        statics: {
            dataProcessor: {
                'nextforce': new nx.data.ObservableGraph.NeXtForceProcessor(),
                'force': new nx.data.ObservableGraph.ForceProcessor(),
                'quick': new nx.data.ObservableGraph.QuickProcessor(),
                'circle': new nx.data.ObservableGraph.CircleProcessor()
            },
            /**
             * Register graph data processor,
             * @static
             * @method registerDataProcessor
             * @param {String} name data processor name
             * @param {Object} cls processor instance, instance should have a process method
             */
            registerDataProcessor: function (name, cls) {
                GRAPH.dataProcessor[name] = cls;
            }
        },
        properties: {
            /**
             * Set pre data processor,it could be 'force'/'quick'
             * @property dataProcessor
             * @default undefined
             */
            dataProcessor: {},
            width: {
                value: 100
            },
            height: {
                value: 100
            }
        },
        methods: {
            processData: function (data) {
                var identityKey = this._identityKey;
                var dataProcessor = this._dataProcessor;

                //TODO data validation

                if (dataProcessor) {
                    var processor = DataProcessor.dataProcessor[dataProcessor];
                    if (processor) {
                        return processor.process(data, identityKey, this);
                    } else {
                        return data;
                    }
                } else {
                    return data;
                }
            },
        }
    });

})(nx, nx.global);
(function (nx, global) {

    /**
     * ObservableGraph class
     * @extend nx.data.ObservableObject
     * @class nx.data.ObservableGraph
     * @module nx.data
     */
    nx.define('nx.data.ObservableGraph', nx.data.ObservableObject, {
        mixins: [
            nx.data.ObservableGraph.DataProcessor,
            nx.data.ObservableGraph.Vertices,
            nx.data.ObservableGraph.VertexSets,
            nx.data.ObservableGraph.Edges,
            nx.data.ObservableGraph.EdgeSets,
            nx.data.ObservableGraph.EdgeSetCollections
        ],
        event: ['setData', 'insertData', 'clear', 'startGenerate', 'endGenerate'],
        properties: {
            /**
             * Use this attribute of original data as vertex's id and link's mapping key
             * default is index, if not set use array's index as id
             * @property identityKey {String}
             * @default 'index'
             */
            identityKey: {
                value: 'index'
            },
            filter: {},
            groupBy: {}
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.nodeSet([]);
                this.nodes([]);
                this.links([]);

            },
            /**
             * Set data, data should follow Common Topology Data Definition
             * @method setData
             * @param {Object} inData
             */
            setData: function (inData) {

                var data = this.processData(this.getJSON(inData));
                //
                this.clear();

                //generate
                this._generate(inData);
                /**
                 * Trigger when set data to ObservableGraph
                 * @event setData
                 * @param sender {Object}  event trigger
                 * @param {Object} data data, which been processed by data processor
                 */
                this.fire('setData', inData);
            },
            subordinates: function (vertex, callback) {
                // argument type overload
                if (typeof vertex === "function") {
                    callback = vertex;
                    vertex = null;
                }
                // check the vertex children
                var result;
                if (vertex) {
                    result = nx.util.values(vertex.vertices()).concat(nx.util.values(vertex.vertexSet()));
                } else {
                    result = [];
                    nx.each(this.vertices(), function (pair) {
                        var vertex = pair.value();
                        if (!vertex.parentVertexSet()) {
                            result.push(vertex);
                        }
                    }.bind(this));
                    nx.each(this.vertexSets(), function (pair) {
                        var vertex = pair.value();
                        if (!vertex.parentVertexSet()) {
                            result.push(vertex);
                        }
                    }.bind(this));
                }
                // callback if given
                if (callback) {
                    nx.each(result, callback);
                }
                return result;
            },
            /**
             * Insert data, data should follow Common Topology Data Definition
             * @method insertData
             * @param {Object} inData
             */
            insertData: function (inData) {

//                var data = this.processData(inData);
                var data = inData;
                nx.each(inData.nodes, function (node) {
                    this.addVertex(node);
                }, this);

                nx.each(inData.links, function (link) {
                    this.addEdge(link);
                }, this);

                nx.each(inData.nodeSet, function (nodeSet) {
                    this.addVertexSet(nodeSet);
                }, this);

                /**
                 * Trigger when insert data to ObservableGraph
                 * @event insertData
                 * @param sender {Object}  event trigger
                 * @param {Object} data data, which been processed by data processor
                 */

                this.fire('insertData', data);

            },
            _generate: function (data) {
                //
                this.nodes(data.nodes);
                this.links(data.links);
                this.nodeSet(data.nodeSet);

                var filter = this.filter();
                if (filter) {
                    filter.call(this, this);
                }

                /**
                 * Fired when start generate nextTopology elements
                 * @event startGenerate
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('startGenerate');


                //                console.time('vertex');
                this.eachVertex(this.generateVertex, this);
                //                console.timeEnd('vertex');

                //                console.time('edgeSet');
                this.eachEdgeSet(this.generateEdgeSet, this);
                //                console.timeEnd('edgeSet');


                this.eachVertexSet(this.generateVertexSet, this);

                this.eachVertexSet(function (vertexSet) {
                    vertexSet.activated(true, {
                        force: true
                    });
                    this.updateVertexSet(vertexSet);
                }, this);


                /**
                 * Fired when finish generate nextTopology elements
                 * @event endGenerate
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('endGenerate');

            },


            /**
             * Get original data
             * @method getData
             * @returns {Object}
             */

            getData: function () {
                return {
                    nodes: this.nodes(),
                    links: this.links(),
                    nodeSet: this.nodeSet()
                };
            },

            /**
             * Get original json object
             * @method getJSON
             * @param [inData]
             * @returns {{nodes: Array, links: Array,nodeSet:Array}}
             */
            getJSON: function (inData) {
                var data = inData || this.getData();
                var obj = {
                    nodes: [],
                    links: []
                };


                if (nx.is(data.nodes, nx.data.ObservableCollection)) {
                    nx.each(data.nodes, function (n) {
                        if (nx.is(n, nx.data.ObservableObject)) {
                            obj.nodes.push(n.gets());
                        } else {
                            obj.nodes.push(n);
                        }
                    });
                } else {
                    obj.nodes = inData.nodes;
                }


                if (nx.is(data.links, nx.data.ObservableCollection)) {
                    nx.each(data.links, function (n) {
                        if (nx.is(n, nx.data.ObservableObject)) {
                            obj.links.push(n.gets());
                        } else {
                            obj.links.push(n);
                        }
                    });
                } else {
                    obj.links = inData.links;
                }

                if (data.nodeSet) {
                    if (nx.is(data.nodeSet, nx.data.ObservableCollection)) {
                        obj.nodeSet = [];
                        nx.each(data.nodeSet, function (n) {
                            if (nx.is(n, nx.data.ObservableObject)) {
                                obj.nodeSet.push(n.gets());
                            } else {
                                obj.nodeSet.push(n);
                            }
                        });
                    } else {
                        obj.nodeSet = data.nodeSet;
                    }
                }

                return obj;

            },
            /**
             * Get visible vertices data bound
             * @method getBound
             * @returns {{x: number, y: number, width: number, height: number, maxX: number, maxY: number}}
             */

            getBound: function (invertices) {

                var min_x, max_x, min_y, max_y;

                var vertices = invertices || nx.util.values(this.visibleVertices()).concat(nx.util.values(this.visibleVertexSets()));
                var firstItem = vertices[0];
                var x, y;

                if (firstItem) {
                    x = firstItem.get ? firstItem.get('x') : firstItem.x;
                    y = firstItem.get ? firstItem.get('y') : firstItem.y;
                    min_x = max_x = x || 0;
                    min_y = max_y = y || 0;
                } else {
                    min_x = max_x = 0;
                    min_y = max_y = 0;
                }


                nx.each(vertices, function (vertex, index) {
                    x = vertex.get ? vertex.get('x') : vertex.x;
                    y = vertex.get ? vertex.get('y') : vertex.y;
                    min_x = Math.min(min_x, x || 0);
                    max_x = Math.max(max_x, x || 0);
                    min_y = Math.min(min_y, y || 0);
                    max_y = Math.max(max_y, y || 0);
                });

                return {
                    x: min_x,
                    y: min_y,
                    left: min_x,
                    top: min_y,
                    width: max_x - min_x,
                    height: max_y - min_y,
                    maxX: max_x,
                    maxY: max_y
                };
            },

            /**
             * Clear graph data
             * @method clear
             */
            clear: function () {

                this.nodeSet([]);
                this.links([]);
                this.nodes([]);

                this.fire('clear');
            },
            dispose: function () {
                this.clear();
                this.inherited();
            }

        }
    });

})(nx, nx.global);

(function (nx, global) {

    nx.define("nx.data.UniqObservableCollection", nx.data.ObservableCollection, {
        methods: {
            add: function (item) {
                if (item == null || this.contains(item)) {
                    return false;
                }
                return this.inherited(item);
            },
            addRange: function (iter) {
                if (nx.is(iter, Array)) {
                    var items = nx.util.uniq(iter.slice());
                    var i = 0;
                    while (i < items.length) {
                        var item = items[i];
                        if (item == null || this.contains(item)) {
                            items.splice(i, 1);
                        }
                        i++;
                    }
                    return this.inherited(items);
                } else {
                    return this.inherited(iter);
                }


            },
            insert: function (item, index) {
                if (item == null || this.contains(item)) {
                    return false;
                }
                return this.inherited(item, index);
            },
            insertRange: function (iter, index) {
                if (nx.is(iter, Array)) {
                    var items = iter.slice();
                    var i = 0;
                    while (i < items.length) {
                        var item = items[i];
                        if (item == null || this.contains(item)) {
                            items.splice(i, 1);
                        }
                        i++;
                    }
                    return this.inherited(items);
                } else {
                    return this.inherited(iter);
                }
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Topology's base config
     * @class nx.graphic.Topology.Config
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Config", {
        events: [],
        properties: {
            /**
             * Topology status, it could be  initializing/appended/ready
             * @property status {String}
             */
            status: {
                value: 'initializing',
                binding: {
                    direction: "<>"
                }
            },
            /**
             * nextTopology's theme, it could be blue/green/dark/slate/yellow
             * @property theme {String}
             */
            theme: {
                get: function () {
                    return this._theme || 'blue';
                },
                set: function (value) {
                    this._theme = value;
                    this.notify('themeClass');
                }
            },
            themeClass: {
                get: function () {
                    return 'n-topology-' + this.theme();
                }
            },
            /**
             * Set the navigation visibility
             * @property showNavigation {Boolean}
             */
            showNavigation: {
                value: true
            },
            showThumbnail: {
                value: false
            },
            /**
             * Get the setting panel component instance for extend user setting
             * @property viewSettingPanel {nx.ui.Component}
             * @readonly
             */
            viewSettingPanel: {
                get: function () {
                    return this.view("nav").view("customize");
                }
            },
            viewSettingPopover: {
                get: function () {
                    return this.view("nav").view("settingPopover");
                }
            }
        },
        methods: {
        }
    });

})(nx, nx.global);
(function (nx, global) {

    /**
     * Topology graph model class
     * @class nx.graphic.Topology.Graph
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Graph", {
        events: ['beforeSetData', 'afterSetData', 'insertData', 'topologyGenerated'],
        properties: {
            /**
             * Identity the node and link mapping key, default is index
             * @property identityKey {String}
             */
            identityKey: {
                get: function () {
                    return this._identiyKey || 'index';
                },
                set: function (value) {
                    this._identiyKey = value;
                    this.graph().set('identityKey', value);
                }
            },
            /**
             * set/get the nextTopology' data, data should follow Common Topology Data Definition
             * @property data {JSON}
             */
            data: {
                get: function () {
                    return this.graph().getData();
                },
                set: function (value) {
                    if (value == null || !nx.is(value, Object) || value.nodes == null) {
                        return;
                    }

                    var fn = function (data) {

                        /**
                         * Fired before start process data
                         * @event beforeSetData
                         * @param sender {Object} Trigger instance
                         * @param data {JSON}  event object
                         */
                        this.fire("beforeSetData", data);
                        this.clear();
                        this.graph().sets({
                            width: this.width(),
                            height: this.height()
                        });
                        // set Data;
                        this.graph().setData(data);
                        //
                        /**
                         * Fired after process data
                         * @event afterSetData
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire("afterSetData", data);
                    };


                    if (this.status() === 'appended' || this.status() == 'generated') {
                        fn.call(this, value);
                    } else {
                        this.on('ready', function () {
                            fn.call(this, value);
                        }, this);
                    }
                }
            },
            /**
             * Set the use force layout, recommand use dataProcessor:'force'
             * @property autoLayout {Boolean}
             */
            autoLayout: {
                get: function () {
                    return this._autoLayout || false;
                },
                set: function (value) {
                    this._autoLayout = value;
                    if (value) {
                        this.graph().dataProcessor("force");
                    } else {
                        this.graph().dataProcessor("");
                    }
                }
            },
            vertexPositionGetter: {
                get: function () {
                    return this._vertexPositionGetter;
                },
                set: function (value) {
                    this._vertexPositionGetter = value;
                    this.graph().set('vertexPositionGetter', value);
                }
            },
            vertexPositionSetter: {
                get: function () {
                    return this._vertexPositionSetter;
                },
                set: function (value) {
                    this._vertexPositionSetter = value;
                    this.graph().set('vertexPositionSetter', value);
                }
            },
            /**
             * Pre data processor, it could be 'force'/'quick'. It could also support register a new processor
             * @property dataProcessor {String}
             */
            dataProcessor: {
                get: function () {
                    return this._dataProcessor;
                },
                set: function (value) {
                    this._dataProcessor = value;
                    this.graph().set('dataProcessor', value);
                }
            },
            /**
             * Topology graph object
             * @property graph {nx.data.ObservableGraph}
             * @readonly
             */
            graph: {
                value: function () {
                    return new nx.data.ObservableGraph();
                }
            }
        },
        methods: {
            initGraph: function () {
                var graph = this.graph();
                graph.sets({
                    vertexPositionGetter: this.vertexPositionGetter(),
                    vertexPositionSetter: this.vertexPositionSetter(),
                    identityKey: this.identityKey(),
                    dataProcessor: this.dataProcessor()
                });

                if (this.autoLayout()) {
                    graph.dataProcessor("force");
                }


                var nodesLayer = this.getLayer("nodes");
                var linksLayer = this.getLayer("links");
                var nodeSetLayer = this.getLayer("nodeSet");
                var linkSetLayer = this.getLayer("linkSet");

                /**
                 * Vertex
                 */
                graph.on("addVertex", function (sender, vertex) {
                    nodesLayer.addNode(vertex);
                }, this);

                graph.on("removeVertex", function (sender, vertex) {
                    nodesLayer.removeNode(vertex.id());
                }, this);


                graph.on("deleteVertex", function (sender, vertex) {
                    nodesLayer.removeNode(vertex.id());
                }, this);

                graph.on("updateVertex", function (sender, vertex) {
                    nodesLayer.updateNode(vertex.id());
                }, this);

                graph.on("updateVertexCoordinate", function (sender, vertex) {

                }, this);


                /**
                 * Edge
                 */
                graph.on("addEdge", function (sender, edge) {
                    var link = linksLayer.addLink(edge);
                    // add parent linkset
//                    if (edge.parentEdgeSet()) {
//                        var linkSet = this.getLinkSetByLinkKey(edge.linkKey());
//                        link.set('parentLinkSet', linkSet);
//                    }
                }, this);

                graph.on("removeEdge", function (sender, edge) {
                    linksLayer.removeLink(edge.id());
                }, this);
                graph.on("deleteEdge", function (sender, edge) {
                    linksLayer.removeLink(edge.id());
                }, this);
                graph.on("updateEdge", function (sender, edge) {
                    linksLayer.updateLink(edge.id());
                }, this);
                graph.on("updateEdgeCoordinate", function (sender, edge) {
                    linksLayer.updateLink(edge.id());
                }, this);


                /**
                 * EdgeSet
                 */
                graph.on("addEdgeSet", function (sender, edgeSet) {
                    if (this.supportMultipleLink()) {
                        linkSetLayer.addLinkSet(edgeSet);
                    } else {
                        edgeSet.activated(false);
                    }
                }, this);

                graph.on("removeEdgeSet", function (sender, edgeSet) {
                    linkSetLayer.removeLinkSet(edgeSet.linkKey());
                }, this);

                graph.on("deleteEdgeSet", function (sender, edgeSet) {
                    linkSetLayer.removeLinkSet(edgeSet.linkKey());
                }, this);

                graph.on("updateEdgeSet", function (sender, edgeSet) {
                    linkSetLayer.updateLinkSet(edgeSet.linkKey());
                }, this);
                graph.on("updateEdgeSetCoordinate", function (sender, edgeSet) {
                    if (this.supportMultipleLink()) {
                        linkSetLayer.updateLinkSet(edgeSet.linkKey());
                    }
                }, this);


                /**
                 * VertexSet
                 */
                graph.on("addVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.addNodeSet(vertexSet);
                }, this);

                graph.on("removeVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.removeNodeSet(vertexSet.id());
                }, this);
                graph.on("deleteVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.removeNodeSet(vertexSet.id());
                }, this);

                graph.on("updateVertexSet", function (sender, vertexSet) {
                    nodeSetLayer.updateNodeSet(vertexSet.id());
                }, this);

                graph.on("updateVertexSetCoordinate", function (sender, vertexSet) {

                }, this);

                /**
                 * EdgeSetCollection
                 */
                graph.on("addEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.addLinkSet(esc);
                }, this);

                graph.on("removeEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.removeLinkSet(esc.linkKey());
                }, this);
                graph.on("deleteEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.removeLinkSet(esc.linkKey());
                }, this);
                graph.on("updateEdgeSetCollection", function (sender, esc) {
                    linkSetLayer.updateLinkSet(esc.linkKey());
                }, this);
                graph.on("updateEdgeSetCollectionCoordinate", function (sender, esc) {
                    linkSetLayer.updateLinkSet(esc.linkKey());
                }, this);


                /**
                 * Data
                 */
                graph.on("setData", function (sender, data) {

                }, this);


                graph.on("insertData", function (sender, data) {
                    //this.showLoading();
                }, this);


                graph.on("clear", function (sender, event) {

                }, this);


                graph.on("startGenerate", function (sender, event) {
                    this.showLoading();
                    this.stage().hide();
                }, this);
                graph.on("endGenerate", function (sender, event) {
                    this._endGenerate();
                }, this);


            },
            /**
             * Set data to nextTopology, recommend use topo.data(data)
             * @method setData
             * @param data {JSON} should be {nodes:[],links:[]}
             * @param [callback]
             * @param [context]
             */
            setData: function (data, callback, context) {
                if (callback) {
                    this.on('topologyGenerated', function fn() {
                        callback.call(context || this, this);
                        this.off('topologyGenerated', fn, this);
                    }, this);
                }
                if (data == null || !nx.is(data, Object) || data.nodes == null) {
                    return;
                }
                this.data(data);
            },
            /**
             * Insert data to nextTopology
             * @method insertData
             * @param data {JSON}  should be {nodes:[],links:[]}
             */
            insertData: function (data) {
                if (data == null || !nx.is(data, Object)) {
                    return;
                }
                this.graph().insertData(data);
                /**
                 * Fired after insert data
                 * @event insertData
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire("insertData", data);
            },


            /**
             * Get nextTopology data, recommend use topo.data()
             * @method getData
             * @returns {JSON}
             */
            getData: function () {
                return this.data();
            },


            _saveData: function () {
                var data = this.graph().getData();

                if (Object.prototype.toString.call(window.localStorage) === "[object Storage]") {
                    localStorage.setItem("topologyData", JSON.stringify(data));
                }

            },
            _loadLastData: function () {
                if (Object.prototype.toString.call(window.localStorage) === "[object Storage]") {
                    var data = JSON.parse(localStorage.getItem("topologyData"));
                    this.setData(data);
                }
            },
            start: function () {
            },
            _endGenerate: function () {

                this.stage().resetFitMatrix();

                /**
                 * Fired when all nextTopology elements generated
                 * @event topologyGenerated
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                var layoutType = this.layoutType();
                if (layoutType) {
                    this.activateLayout(layoutType, null, function () {
                        this.__fit();
                        this.status('generated');
                        this.fire('topologyGenerated');
                    });
                } else {
                    this.__fit();
                    this.status('generated');
                    this.fire('topologyGenerated');
                }
            },
            __fit: function () {
                this.stage().show();
                if (this.autoFit()) {
                    this.stage().fit(null, null, false);
                    this.stage().resetFitMatrix();
                    this.stage().fit(null, null, false);
                    this.stage().resetFitMatrix();
                    this.stage().fit(null, null, false);
                }
                this.hideLoading();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    function extractDelta(e) {
        if (e.wheelDelta) {
            return e.wheelDelta;
        }

        if (e.detail) {
            return e.detail * -40;
        }


    }

    /**
     * Topology base events
     * @class nx.graphic.Topology.Event
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.Event', {
        events: ['clickStage', 'pressStage', 'dragStageStart', 'dragStage', 'dragStageEnd', 'stageTransitionEnd', 'zoomstart', 'zooming', 'zoomend', 'resetzooming', 'fitStage', 'up', 'down', 'left', 'right', 'esc', 'space', 'enter', 'pressA', 'pressS', 'pressF', 'pressM', 'pressR'],
        properties: {
            /**
             * Enabling gradual scaling feature when zooming, set to false will improve the performance
             * @property enableGradualScaling {Boolean}
             */
            enableGradualScaling: {
                value: true
            }
        },
        methods: {
            _mousewheel: function (sender, event) {
                if (this.scalable()) {
                    var step = 8000;
                    var data = extractDelta(event);
                    var stage = this.stage();
                    var scale = data / step;

                    if (this._zoomWheelDelta == null) {
                        this._zoomWheelDelta = 0;
                        this.fire('zoomstart');
                    }

                    this._zoomWheelDelta += data / step;

                    if (this._enableGradualScaling) {
                        if (Math.abs(this._zoomWheelDelta) < 0.3) {
                            stage.disableUpdateStageScale(true);
                        } else {
                            this._zoomWheelDelta = 0;
                            stage.disableUpdateStageScale(false);
                        }
                    } else {
                        stage.disableUpdateStageScale(true);
                    }


                    stage.applyStageScale(1 + scale, [event.offsetX === undefined ? event.layerX : event.offsetX, event.offsetY === undefined ? event.layerY : event.offsetY]);

                    if (this._zooomEventTimer) {
                        clearTimeout(this._zooomEventTimer);
                    }

                    this._zooomEventTimer = setTimeout(function () {
                        stage.resetStageMatrix();
                        delete this._zoomWheelDelta;

                        /**
                         * Fired when end zooming
                         * @event zoomend
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('zoomend');

                    }.bind(this), 200);

                    /**
                     * Fired when zooming stage
                     * @event zooming
                     * @param sender{Object} trigger instance
                     * @param scale {Number} stage current scale
                     */
                    this.fire('zooming');
                }
                event.preventDefault();
                return false;
            },


            _contextmenu: function (sender, event) {
                event.preventDefault();
            },
            _clickStage: function (sender, event) {
                /**
                 * Fired when click the stage
                 * @event clickStage
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('clickStage', event);
            },
            _pressStage: function (sender, event) {
                /**
                 * Fired when mouse press stage, this is a capture event
                 * @event pressStage
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('pressStage', event);
            },
            _dragStageStart: function (sender, event) {
                /**
                 * Fired when start drag stage
                 * @event dragStageStart
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('dragStageStart', event);
            },
            _dragStage: function (sender, event) {
                /**
                 * Fired when dragging stage
                 * @event dragStage
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('dragStage', event);
            },
            _dragStageEnd: function (sender, event) {
                /**
                 * Fired when drag end stage
                 * @event dragStageEnd
                 * @param sender {Object}  Trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('dragStageEnd', event);
            },
            _stageTransitionEnd: function (sender, event) {
                window.event = event;
                this.fire('stageTransitionEnd', event);
            },
            _key: function (sender, event) {
                var code = event.keyCode;
                switch (code) {
                case 38:
                    /**
                     * Fired when press up arrow key
                     * @event up
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('up', event);
                    event.preventDefault();
                    break;
                case 40:
                    /**
                     * Fired when press down arrow key
                     * @event down
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('down', event);
                    event.preventDefault();
                    break;
                case 37:
                    /**
                     * Fired when press left arrow key
                     * @event left
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('left', event);
                    event.preventDefault();
                    break;
                case 39:
                    /**
                     * Fired when press right arrow key
                     * @event right
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('right', event);
                    event.preventDefault();
                    break;
                case 13:
                    /**
                     * Fired when press enter key
                     * @event enter
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('enter', event);
                    event.preventDefault();
                    break;
                case 27:
                    /**
                     * Fired when press esc key
                     * @event esc
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('esc', event);
                    event.preventDefault();
                    break;
                case 65:
                    /**
                     * Fired when press a key
                     * @event pressA
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressA', event);
                    break;
                case 70:
                    /**
                     * Fired when press f key
                     * @event pressF
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressF', event);
                    break;
                case 77:
                    /**
                     * Fired when press m key
                     * @event pressM
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressM', event);
                    break;
                case 82:
                    /**
                     * Fired when press r key
                     * @event pressR
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressR', event);
                    break;
                case 83:
                    /**
                     * Fired when press s key
                     * @event pressS
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressS', event);
                    break;

                case 32:
                    /**
                     * Fired when press space key
                     * @event space
                     * @param sender {Object}  Trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('space', event);
                    event.preventDefault();
                    break;
                }


                return false;
            },
            blockEvent: function (value) {
                if (value) {
                    nx.dom.Document.body().addClass('n-userselect n-blockEvent');
                } else {
                    nx.dom.Document.body().removeClass('n-userselect');
                    nx.dom.Document.body().removeClass('n-blockEvent');
                }
            }

        }
    });

})(nx, nx.global);

(function (nx, global) {

    var util = nx.util;


    /**
     * Node mixin class
     * @class nx.graphic.Topology.NodeMixin
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.NodeMixin", {
        events: ['addNode', 'deleteNode', 'addNodeSet', 'deleteNodeSet', 'expandAll'],
        properties: {
            /**
             * Node instance class name, support function
            * @property nodeInstanceClass
             */
            nodeInstanceClass: {
                value: 'nx.graphic.Topology.Node'
            },
            /**
             * NodeSet instance class name, support function
             * @property nodeSetInstanceClass
             */
            nodeSetInstanceClass: {
                value: 'nx.graphic.Topology.NodeSet'
            },
            /**
             * Set node's draggable
             * @property nodeDraggable
             */
            nodeDraggable: {
                value: true
            },
            /**
             * Enable smart label
             * @property enableSmartLabel
             */
            enableSmartLabel: {
                value: true
            },
            /**
             * Show or hide node's icon
             * @property showIcon
             */
            showIcon: {
                get: function () {
                    return this._showIcon !== undefined ? this._showIcon : false;
                },
                set: function (value) {
                    if (this._showIcon !== value) {
                        this._showIcon = value;
                        if (this.status() !== "initializing") {
                            this.eachNode(function (node) {
                                node.showIcon(value);
                            });
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            /**
             * All node's config. key is node's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {nodeConfig}
             */
            nodeConfig: {},
            /**
             * All nodeSet's config. key is node's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {nodeSetConfig}
             */
            nodeSetConfig: {},
            /**
             * All selected nodes, could direct add/remove nodes to this collection
             * @property selectedNodes {nx.data.ObservableCollection}
             */
            selectedNodes: {
                value: function () {
                    return new nx.data.UniqObservableCollection();
                }
            },
            activeNodes: {
                set: function (value) {
                    var nodesLayer = this.getLayer("nodes");
                    var nodeSetLayer = this.getLayer("nodeSet");
                    var watcher = this._activeNodesWatcher;
                    if (!watcher) {
                        watcher = this._activeNodesWatcher = new nx.graphic.Topology.NodeWatcher();
                        watcher.topology(this);
                        watcher.updater(function () {
                            var nodes = watcher.getNodes();
                            nx.each(nodes, function (node) {
                                if (node.model().type() == 'vertex') {
                                    nodesLayer.activeElements().add(node);
                                } else {
                                    nodeSetLayer.activeElements().add(node);
                                }
                            }, this);
                        }.bind(this));


                    }
                    nodesLayer.activeElements().clear();
                    nodeSetLayer.activeElements().clear();
                    watcher.nodes(value);
                    this._activeNodes = value;
                }
            },
            highlightedNodes: {
                set: function (value) {
                    var nodesLayer = this.getLayer("nodes");
                    var nodeSetLayer = this.getLayer("nodeSet");
                    var watcher = this._highlightedNodesWatcher;
                    if (!watcher) {
                        watcher = this._highlightedNodesWatcher = new nx.graphic.Topology.NodeWatcher();
                        watcher.topology(this);
                        watcher.updater(function () {
                            nx.each(watcher.getNodes(), function (node) {
                                if (node.model().type() == 'vertex') {
                                    nodesLayer.highlightedElements().add(node);
                                } else {
                                    nodeSetLayer.highlightedElements().add(node);
                                }
                            }, this);
                        }.bind(this));
                    }

                    nodesLayer.highlightedElements().clear();
                    nodeSetLayer.highlightedElements().clear();
                    watcher.nodes(value);
                    this._highlightedNodes = value;
                }
            },
            enableNodeSetAnimation: {
                value: true
            },
            aggregationRule: {}
        },
        methods: {
            initNode: function () {
                var selectedNodes = this.selectedNodes();
                selectedNodes.on('change', function (sender, args) {
                    if (args.action == 'add') {
                        nx.each(args.items, function (node) {
                            node.selected(true);
                            node.on('remove', this._removeSelectedNode = function () {
                                selectedNodes.remove(node);
                            }, this);
                        }, this);
                    } else if (args.action == 'remove') {
                        nx.each(args.items, function (node) {
                            node.selected(false);
                            node.off('remove', this._removeSelectedNode, this);
                        }, this);
                    } else if (args.action == "clear") {
                        nx.each(args.items, function (node) {
                            node.selected(false);
                            node.off('remove', this._removeSelectedNode, this);
                        }, this);
                    }
                });
            },
            /**
             * Add a node to nextTopology
             * @method addNode
             * @param obj
             * @param inOption
             * @returns {*}
             */
            addNode: function (obj, inOption) {
                var vertex = this.graph().addVertex(obj, inOption);
                if (vertex) {
                    var node = this.getNode(vertex.id());
                    this.fire("addNode", node);
                    return node;
                } else {
                    return null;
                }

            },

            /**
             * Remove a node
             * @method removeNode
             * @param arg
             * @returns {boolean}
             */
            removeNode: function (arg, callback, context) {
                this.deleteNode(arg);
            },
            deleteNode: function (arg, callback, context) {
                var id = arg;
                if (nx.is(arg, nx.graphic.Topology.AbstractNode)) {
                    id = arg.id();
                }
                var vertex = this.graph().getVertex(id);
                if (vertex) {
                    var node = this.getNode(id);
                    this.fire("deleteNode", node);
                    this.graph().deleteVertex(id);
                    if (callback) {
                        callback.call(context || this);
                    }
                }
            },
            _getAggregationTargets: function (vertices) {
                var graph = this.graph();
                var mark, marks, markmap = {}, NONE = nx.util.uuid();
                var i, v, vp, vpid, changed, vs = vertices.slice();
                // iterate unless the aggregation successful
                do {
                    changed = false;
                    for (i = vs.length - 1; i >= 0; i--) {
                        v = vs[i];
                        // get the parent vertex and its ID
                        vp = v.parentVertexSet();
                        vpid = (vp ? vp.id() : NONE);
                        // check if same parent vertex marked
                        if (!markmap.hasOwnProperty(vpid)) {
                            // create mark for the parent vertex
                            markmap[vpid] = {
                                vertex: vp || graph,
                                finding: graph.subordinates(vp),
                                found: []
                            };
                        }
                        // get parent mark
                        mark = markmap[vpid];
                        // check if child vertex marked already
                        if (mark === false || mark.found.indexOf(v) >= 0) {
                            // duplicated vertex appears, unable to aggregate
                            throw "wrong input";
                        }
                        // mark child vertex to its parent vertex
                        mark.found.push(v);
                        // remove child vertex from the pool
                        vs.splice(i, 1);
                        // set the vertex array changed
                        changed = true;
                        // check if the parent vertex is fully matched
                        if (mark.finding.length === mark.found.length && mark.vertex !== graph) {
                            // add parent vertex from the pool
                            vs.push(mark.vertex);
                            // mark the parent vertex as fully matched
                            markmap[vpid] = false;
                        }
                    }
                } while (changed);
                // clear fully matched marks from mark map
                for (mark in markmap) {
                    if (!markmap[mark]) {
                        delete markmap[mark];
                    }
                }
                // get remain marks of parent vertices
                marks = nx.util.values(markmap);
                // check if the number of parent not fully matched
                if (marks.length !== 1) {
                    // it should be at most & least one
                    throw nx.graphic.Topology.i18n.cantAggregateNodesInDifferentNodeSet;
                }
                // get the only parent's mark
                mark = marks[0];
                return mark.found;
            },
            aggregationNodes: function (inNodes, inConfig) {
                // transform nodes or node ids into vertices
                var nodes = [],
                    vertices = [];
                nx.each(inNodes, function (node) {
                    if (!nx.is(node, nx.graphic.Topology.AbstractNode)) {
                        node = this.getNode(node);
                    }
                    if (!nx.is(node, nx.graphic.Topology.AbstractNode)) {
                        throw "wrong input";
                    }
                    nodes.push(node);
                    vertices.push(node.model());
                }.bind(this));
                // get aggregate target vertices and ids
                var aggregateVertices, aggregateIds;
                // FIXME catch or not
                aggregateVertices = this._getAggregationTargets(vertices);
                if (aggregateVertices.length < 2) {
                    throw "wrong input. unable to aggregate.";
                }
                aggregateIds = [];
                nx.each(aggregateVertices, function (vertex) {
                    aggregateIds.push(vertex.id());
                });
                // check the user rule
                var aggregationRule = this.aggregationRule();
                if (aggregationRule && nx.is(aggregationRule, 'Function')) {
                    var result = aggregationRule.call(this, nodes, inConfig);
                    if (result === false) {
                        return;
                    }
                }
                // make up data, config and parent
                var data, parent, pn = null,
                    config = {};
                data = {
                    nodes: aggregateIds,
                    x: (inConfig && typeof inConfig.x === "number" ? inConfig.x : aggregateVertices[0].x()),
                    y: (inConfig && typeof inConfig.y === "number" ? inConfig.y : aggregateVertices[0].y()),
                    label: (inConfig && inConfig.label || [nodes[0].label(), nodes[nodes.length - 1].label()].sort().join("-"))
                };
                parent = aggregateVertices[0].parentVertexSet();
                if (parent) {
                    config.parentVertexSetID = parent.id();
                    pn = this.getNode(parent.id());
                }
                var nodeSet = this.addNodeSet(data, config, pn);
                this.stage().resetFitMatrix();
                return nodeSet;
            },
            /**
             * Add a nodeSet
             * @method addNodeSet
             * @param obj
             * @param [inOption]
             * @param [parentNodeSet]
             * @returns {*}
             */
            addNodeSet: function (obj, inOption, parentNodeSet) {
                var vertex = this.graph().addVertexSet(obj, inOption);
                if (vertex) {
                    var nodeSet = this.getNode(vertex.id());
                    if (parentNodeSet) {
                        nodeSet.parentNodeSet(parentNodeSet);
                    }
                    this.fire("addNodeSet", nodeSet);
                    return nodeSet;
                } else {
                    return null;
                }

            },
            removeNodeSet: function (arg, callback, context) {
                this.deleteNodeSet(arg);
            },

            deleteNodeSet: function (arg, callback, context) {
                if (!arg) {
                    return;
                }
                var id = arg;
                if (nx.is(arg, nx.graphic.Topology.AbstractNode)) {
                    id = arg.id();
                }
                var nodeSet = this.getLayer("nodeSet").getNodeSet(id);
                if (nodeSet) {
                    if (nodeSet.collapsed()) {
                        nodeSet.activated(false);
                        nodeSet.expandNodes(function () {
                            this.fire("deleteNodeSet", nodeSet);
                            this.graph().deleteVertexSet(id);
                            if (callback) {
                                callback.call(context || this);
                            }
                        }, this);
                    } else {
                        this.fire("deleteNodeSet", nodeSet);
                        this.graph().deleteVertexSet(id);
                        if (callback) {
                            callback.call(context || this);
                        }
                    }

                } else {
                    this.graph().deleteVertexSet(id);
                    if (callback) {
                        callback.call(context || this);
                    }
                }
            },


            /**
             * Traverse each node
             * @method eachNode
             * @param callback
             * @param context
             */
            eachNode: function (callback, context) {
                this.getLayer("nodes").eachNode(callback, context || this);
                this.getLayer("nodeSet").eachNodeSet(callback, context || this);
            },
            /**
             * Get node by node id
             * @method getNode
             * @param id
             * @returns {*}
             */
            getNode: function (id) {
                return this.getLayer("nodes").getNode(id) || this.getLayer("nodeSet").getNodeSet(id);
            },
            /**
             * Get all visible nodes
             * @returns {Array}
             */
            getNodes: function () {
                var nodes = this.getLayer("nodes").nodes();
                var nodeSets = this.getLayer("nodeSet").nodeSets();
                if (nodeSets && nodeSets.length !== 0) {
                    return nodes.concat(nodeSets);
                } else {
                    return nodes;
                }
            },
            /**
             * Register a customize icon
             * @param name {String}
             * @param url {URL}
             * @param width {Number}
             * @param height {Number}
             */
            registerIcon: function (name, url, width, height) {
                var XLINK = 'http://www.w3.org/1999/xlink';
                var NS = "http://www.w3.org/2000/svg";
                var icon1 = document.createElementNS(NS, "image");
                icon1.setAttributeNS(XLINK, 'href', url);
                nx.graphic.Icons.icons[name] = {
                    size: {
                        width: width,
                        height: height
                    },
                    icon: icon1.cloneNode(true),
                    name: name
                };

                var icon = icon1.cloneNode(true);
                icon.setAttribute("height", height);
                icon.setAttribute("width", width);
                icon.setAttribute("data-device-type", name);
                icon.setAttribute("id", name);
                icon.setAttribute("class", 'deviceIcon');
                this.stage().addDef(icon);
            },
            /**
             * Batch action, highlight node and related nodes and connected links.
             * @param inNode
             */
            highlightRelatedNode: function (inNode) {
                var node;
                if (inNode == null) {
                    return;
                }

                if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                    node = inNode;
                } else {
                    node = this.getNode(inNode);
                }
                if (!node) {
                    return;
                }


                var nodeSetLayer = this.getLayer('nodeSet');
                var nodeLayer = this.getLayer('nodes');

                //highlight node
                if (nx.is(node, 'nx.graphic.Topology.NodeSet')) {
                    nodeSetLayer.highlightedElements().add(node);
                } else {
                    nodeLayer.highlightedElements().add(node);
                }


                // highlight connected nodes and nodeSets
                node.eachConnectedNode(function (n) {
                    if (nx.is(n, 'nx.graphic.Topology.NodeSet')) {
                        nodeSetLayer.highlightedElements().add(n);
                    } else {
                        nodeLayer.highlightedElements().add(n);
                    }
                }, this);


                // highlight connected links and linkSets
                this.getLayer('linkSet').highlightLinkSets(util.values(node.linkSets()));
                this.getLayer('links').highlightLinks(util.values(node.links()));

                this.fadeOut(true);

            },
            /**
             * Batch action, highlight node and related nodes and connected links.
             * @param inNode
             */
            activeRelatedNode: function (inNode) {

                var node;
                if (!inNode) {
                    return;
                }

                if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                    node = inNode;
                } else {
                    node = this.getNode(inNode);
                }
                if (!node) {
                    return;
                }


                var nodeSetLayer = this.getLayer('nodeSet');
                var nodeLayer = this.getLayer('nodes');

                // active node
                if (nx.is(node, 'nx.graphic.Topology.NodeSet')) {
                    nodeSetLayer.activeElements().add(node);
                } else {
                    nodeLayer.activeElements().add(node);
                }


                // highlight connected nodes and nodeSets
                node.eachConnectedNode(function (n) {
                    if (nx.is(n, 'nx.graphic.Topology.NodeSet')) {
                        nodeSetLayer.activeElements().add(n);
                    } else {
                        nodeLayer.activeElements().add(n);
                    }
                }, this);


                // highlight connected links and linkSets
                this.getLayer('linkSet').activeLinkSets(util.values(node.linkSets()));
                this.getLayer('links').activeLinks(util.values(node.links()));

                this.fadeOut();

            },
            /**
             * Zoom nextTopology to let the passing nodes just visible at the screen
             * @method zoomByNodes
             * @param [callback] {Function} callback function
             * @param [context] {Object} callback context
             * @param nodes {Array} nodes collection
             */
            zoomByNodes: function (nodes, callback, context, boundScale) {
                // TODO more overload about nodes
                if (!nx.is(nodes, Array)) {
                    nodes = [nodes];
                }
                // get bound of the selected nodes' models
                var stage = this.stage();
                var p0, p1, center, bound = this.getModelBoundByNodes(nodes);
                var delta, limitscale = stage.maxZoomLevel() * stage.fitMatrixObject().scale();

                if (!bound) {
                    return;
                }

                // check if the nodes are too close to zoom
                if (bound.width * limitscale < 1 && bound.height * limitscale < 1) {
                    // just centralize them instead of zoom
                    center = nx.geometry.Vector.transform(bound.center, stage.matrix());
                    delta = [stage.width() / 2 - center[0], stage.height() / 2 - center[1]];
                    stage.scalingLayer().setTransition(function () {
                        this.adjustLayout();
                        /* jshint -W030 */
                        callback && callback.call(context || this);
                        this.fire('zoomend');
                    }, this, 0.6);
                    stage.applyTranslate(delta[0], delta[1]);
                    stage.applyStageScale(stage.maxZoomLevel() / stage.zoomLevel() * boundScale);
                } else {
                    p0 = nx.geometry.Vector.transform([bound.left, bound.top], stage.matrix());
                    p1 = nx.geometry.Vector.transform([bound.right, bound.bottom], stage.matrix());
                    bound = {
                        left: p0[0],
                        top: p0[1],
                        width: Math.max(1, p1[0] - p0[0]),
                        height: Math.max(1, p1[1] - p0[1])
                    };

                    boundScale = 1 / (boundScale || 1);
                    bound.left += bound.width * (1 - boundScale) / 2;
                    bound.top += bound.height * (1 - boundScale) / 2;
                    bound.height *= boundScale;
                    bound.width *= boundScale;

                    this.zoomByBound(bound, function () {
                        this.adjustLayout();
                        /* jshint -W030 */
                        callback && callback.call(context || this);
                        this.fire('zoomend');
                    }, this);
                }
            },
            getModelBoundByNodes: function (nodes, isIncludeInvisibleNodes) {
                var xmin, xmax, ymin, ymax;
                nx.each(nodes, function (inNode) {
                    var vertex;
                    if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                        vertex = inNode.model();
                    } else {
                        if (isIncludeInvisibleNodes) {
                            vertex = this.graph().getVertex(inNode) || this.graph().getVertexSet(inNode);
                        } else {
                            var node = this.getNode(inNode);
                            vertex = node && node.model();
                        }
                    }
                    if (!vertex) {
                        return;
                    }


                    var x = vertex.x(),
                        y = vertex.y();
                    xmin = (xmin < x ? xmin : x);
                    ymin = (ymin < y ? ymin : y);
                    xmax = (xmax > x ? xmax : x);
                    ymax = (ymax > y ? ymax : y);
                }, this);
                if (xmin === undefined || ymin === undefined) {
                    return undefined;
                }
                return {
                    left: xmin,
                    top: ymin,
                    right: xmax,
                    bottom: ymax,
                    center: [(xmax + xmin) / 2, (ymax + ymin) / 2],
                    width: xmax - xmin,
                    height: ymax - ymin
                };
            },
            /**
             * Get the bound of passing node's
             * @param inNodes {Array}
             * @param isNotIncludeLabel {Boolean}
             * @returns {Array}
             */

            getBoundByNodes: function (inNodes, isNotIncludeLabel) {

                if (inNodes == null || inNodes.length === 0) {
                    inNodes = this.getNodes();
                }

                var bound = {
                    left: 0,
                    top: 0,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    maxX: 0,
                    maxY: 0
                };

                var boundAry = [];


                nx.each(inNodes, function (inNode) {
                    var node;
                    if (nx.is(inNode, nx.graphic.Topology.AbstractNode)) {
                        node = inNode;
                    } else {
                        node = this.getNode(inNode);
                    }

                    if (!node) {
                        return;
                    }


                    if (node.visible()) {
                        if (isNotIncludeLabel) {
                            boundAry.push(this.getInsideBound(node.getBound(true)));
                        } else {
                            boundAry.push(this.getInsideBound(node.getBound()));
                        }
                    }
                }, this);


                var lastIndex = boundAry.length - 1;

                //
                boundAry.sort(function (a, b) {
                    return a.left - b.left;
                });

                bound.x = bound.left = boundAry[0].left;
                bound.maxX = boundAry[lastIndex].left;

                boundAry.sort(function (a, b) {
                    return (a.left + a.width) - (b.left + b.width);
                });

                bound.width = boundAry[lastIndex].left + boundAry[lastIndex].width - bound.x;


                //
                boundAry.sort(function (a, b) {
                    return a.top - b.top;
                });

                bound.y = bound.top = boundAry[0].top;
                bound.maxY = boundAry[lastIndex].top;

                boundAry.sort(function (a, b) {
                    return (a.top + a.height) - (b.top + b.height);
                });

                bound.height = boundAry[lastIndex].top + boundAry[lastIndex].height - bound.y;

                return bound;


            },
            _moveSelectionNodes: function (event, node) {
                if (this.nodeDraggable()) {
                    var nodes = this.selectedNodes().toArray();
                    var stageScale = this.stageScale();
                    if (nodes.indexOf(node) === -1) {
                        node.move(event.drag.delta[0] * stageScale, event.drag.delta[1] * stageScale);
                    } else {
                        nx.each(nodes, function (node) {
                            node.move(event.drag.delta[0] * stageScale, event.drag.delta[1] * stageScale);
                        });
                    }
                }
            },
            expandNodes: function (nodes, sourcePosition, callback, context, isAnimate) {

                var nodesLength = nx.is(nodes, Array) ? nodes.length : nx.util.keys(nodes).length;
                callback = callback || function () {
                };


                if (nodesLength > 150 || nodesLength === 0 || isAnimate === false) {
                    callback.call(context || this, this);
                } else {
                    var positionMap = [];
                    nx.each(nodes, function (node) {
                        positionMap.push({
                            id: node.id(),
                            position: node.position(),
                            node: node
                        });
                        node.position(sourcePosition);
                    }, this);

                    if (this._nodesAnimation) {
                        this._nodesAnimation.stop();
                    }

                    var ani = this._nodesAnimation = new nx.graphic.Animation({
                        duration: 600
                    });
                    ani.callback(function (progress) {
                        nx.each(positionMap, function (item) {
                            var _position = item.position;
                            var node = item.node;
                            if (node && node.model()) {
                                node.position({
                                    x: sourcePosition.x + (_position.x - sourcePosition.x) * progress,
                                    y: sourcePosition.y + (_position.y - sourcePosition.y) * progress
                                });
                            }
                        });
                    }.bind(this));

                    ani.complete(function () {
                        callback.call(context || this, this);
                    }.bind(this));
                    ani.start();
                }
            },
            collapseNodes: function (nodes, targetPosition, callback, context, isAnimate) {
                var nodesLength = nx.is(nodes, Array) ? nodes.length : nx.util.keys(nodes).length;
                callback = callback || function () {
                };


                if (nodesLength > 150 || nodesLength === 0 || isAnimate === false) {
                    callback.call(context || this, this);
                } else {
                    var positionMap = [];
                    nx.each(nodes, function (node) {
                        positionMap.push({
                            id: node.id(),
                            position: node.position(),
                            node: node,
                            vertex: node.model(),
                            vertexPosition: node.model().position()
                        });
                    }, this);

                    if (this._nodesAnimation) {
                        this._nodesAnimation.stop();
                    }


                    var ani = this._nodesAnimation = new nx.graphic.Animation({
                        duration: 600
                    });
                    ani.callback(function (progress) {
                        nx.each(positionMap, function (item) {
                            var _position = item.position;
                            var node = item.node;
                            if (node && node.model()) {
                                node.position({
                                    x: _position.x - (_position.x - targetPosition.x) * progress,
                                    y: _position.y - (_position.y - targetPosition.y) * progress
                                });
                            }
                        });
                    }.bind(this));

                    ani.complete(function () {
                        nx.each(positionMap, function (item) {
                            item.vertex.position(item.vertexPosition);
                        });
                        callback.call(context || this, this);
                    }.bind(this));
                    ani.start();
                }
            },
            expandAll: function () {
                var nodeSetLayer = this.getLayer('nodeSet');
                //console.time('expandAll');
                var fn = function (callback) {
                    var isFinished = true;
                    nodeSetLayer.eachNodeSet(function (nodeSet) {
                        if (nodeSet.visible()) {
                            nodeSet.animation(false);
                            nodeSet.collapsed(false);
                            isFinished = false;
                        }
                    });
                    if (!isFinished) {
                        fn(callback);
                    } else {
                        callback();
                    }
                };

                this.showLoading();

                setTimeout(function () {
                    fn(function () {

                        nodeSetLayer.eachNodeSet(function (nodeSet) {
                            nodeSet.animation(true);
                        });
                        this.stage().resetFitMatrix();
                        this.hideLoading();
                        this.fit(function () {
                            this.blockEvent(false);
                            this.fire('expandAll');
                        }, this);
                    }.bind(this));
                }.bind(this), 100);

            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     * Links mixin class
     * @class nx.graphic.Topology.LinkMixin
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.LinkMixin", {
        events: ['addLink', 'deleteLink'],
        properties: {
            /**
             * Link instance class name, support function
             * @property nodeInstanceClass
             */
            linkInstanceClass: {
                value: 'nx.graphic.Topology.Link'
            },
            /**
             * LinkSet instance class name, support function
             * @property linkSetInstanceClass
             */
            linkSetInstanceClass: {
                value: 'nx.graphic.Topology.LinkSet'
            },
            /**
             * Is nextTopology support Multiple link , is false will highly improve performance
             * @property supportMultipleLink {Boolean}
             */
            supportMultipleLink: {
                value: true
            },
            /**
             * All link's config. key is link's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {linkConfig}
             */
            linkConfig: {},
            /**
             * All linkSet's config. key is link's property, support super binding
             * value could be a single string eg: color:'#f00'
             * value could be a an expression eg: label :'{model.id}'
             * value could be a function eg iconType : function (model,instance){ return  'router'}
             * value could be a normal binding expression eg : label :'{#label}'
             * @property {linkSetConfig}
             */
            linkSetConfig: {}
        },
        methods: {

            /**
             * Add a link to nextTopology
             * @method addLink
             * @param obj {JSON}
             * @param inOption {Config}
             * @returns {nx.graphic.Topology.Link}
             */
            addLink: function (obj, inOption) {
                if (obj.source == null || obj.target == null) {
                    return undefined;
                }
                var edge = this.graph().addEdge(obj, inOption);
                if (edge) {
                    var link = this.getLink(edge.id());
                    this.fire("addLink", link);
                    return link;
                } else {
                    return null;
                }

            },
            /**
             * Remove a link
             * @method removeLink
             * @param arg  {String}
             * @returns {boolean}
             */
            removeLink: function (arg) {
                this.deleteLink(arg);
            },

            deleteLink: function (arg) {
                var id = arg;
                if (nx.is(arg, nx.graphic.Topology.AbstractLink)) {
                    id = arg.id();
                }
                this.fire("deleteLink", this.getLink(id));
                this.graph().deleteEdge(id);
            },


            /**
             * Traverse each link
             * @method eachLink
             * @param callback <Function>
             * @param context {Object}
             */
            eachLink: function (callback, context) {
                this.getLayer("links").eachLink(callback, context || this);
            },

            /**
             * Get link by link id
             * @method getLink
             * @param id
             * @returns {*}
             */
            getLink: function (id) {
                return this.getLayer("links").getLink(id);
            },
            /**
             * get linkSet by node
             * @param sourceVertexID {String} source node's id
             * @param targetVertexID {String} target node's id
             * @returns  {nx.graphic.Topology.LinkSet}
             */
            getLinkSet: function (sourceVertexID, targetVertexID) {
                return this.getLayer("linkSet").getLinkSet(sourceVertexID, targetVertexID);
            },
            /**
             * Get linkSet by linkKey
             * @param linkKey {String} linkKey
             * @returns {nx.graphic.Topology.LinkSet}
             */
            getLinkSetByLinkKey: function (linkKey) {
                return this.getLayer("linkSet").getLinkSetByLinkKey(linkKey);
            },
            /**
             * Get links by node
             * @param sourceVertexID {String} source node's id
             * @param targetVertexID {String} target node's id
             * @returns {Array} links collection
             */
            getLinksByNode: function (sourceVertexID, targetVertexID) {
                var linkSet = this.getLinkSet(sourceVertexID, targetVertexID);
                if (linkSet) {
                    return linkSet.links();
                }
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    nx.define("nx.graphic.Topology.LayerMixin", {
        events: [],
        properties: {
            /**
             * @property layersMap
             */
            layersMap: {
                value: function () {
                    return {};
                }
            },
            /**
             * @property layers
             */
            layers: {
                value: function () {
                    return [];
                }
            },

            /**
             * Get fade status.
             * @property fade
             * @readOnly
             */
            fade: {
                dependencies: "forceFade",
                value: function (forceFade) {
                    // TODO relates highlight and active setting
                    return (forceFade === true || forceFade === false) ? forceFade : this._fade;
                }
            },
            /**
             * Set active priority over highlight.
             * @property fadeActivePriority
             */
            fadeActivePriority: {
                value: false,
                set: function (v) {
                    if (v) {
                        this.dom().addClass("fade-active-priority");
                    } else {
                        this.dom().addClass("fade-active-priority");
                    }
                    this._fadeActivePriority = !! v;
                }
            },
            fadeUpdater_internal_: {
                dependencies: "fade",
                update: function (fade) {
                    if (fade) {
                        this.dom().addClass("fade-all");
                    } else {
                        this.dom().removeClass("fade-all");
                    }
                }
            },
            /**
             * Force layer fade.
             * @property forceFade
             */
            forceFade: {},
            layerResource_internal_: {
                value: function () {
                    return {};
                }
            }
        },
        methods: {
            initLayer: function () {
                this.layersMap({});
                this.layers([]);
                this.attachLayer("links", "nx.graphic.Topology.LinksLayer");
                this.attachLayer("linkSet", "nx.graphic.Topology.LinkSetLayer");
                this.attachLayer("groups", "nx.graphic.Topology.GroupsLayer");
                this.attachLayer("nodes", "nx.graphic.Topology.NodesLayer");
                this.attachLayer("nodeSet", "nx.graphic.Topology.NodeSetLayer");
                this.attachLayer("paths", "nx.graphic.Topology.PathLayer");

            },
            /**
             * To generate a layer
             * @param name
             * @param layer
             * @returns {*}
             * @private
             */
            _generateLayer: function (name, layer) {
                var layerObj;
                if (name && layer) {
                    if (nx.is(layer, "String")) {
                        var cls = nx.path(global, layer);
                        if (cls) {
                            layerObj = new cls();
                        }
                    } else {
                        layerObj = layer;
                    }
                    layerObj.topology(this);
                    layerObj.draw();

                    nx.each(layerObj.__events__, function (eventName) {
                        nx.Object.delegateEvent(layerObj, eventName, this, eventName);
                    }, this);


                    //                    debugger;
                    //                    nx.Object.extendProperty(this, name + 'LayerConfig', {
                    //                        set: function (value) {
                    //                            nx.each(value, function (value, key) {
                    //                                nx.util.setProperty(layerObj, key, value, this);
                    //                            }, this);
                    //                        }
                    //                    });


                }
                return layerObj;
            },
            /**
             * Get a layer reference by name
             * @method getLayer
             * @param name {String} The name you pass to nextTopology when you attacherLayer/prependLayer/insertLayerAfter
             * @returns {*} Instance of a layer
             */
            getLayer: function (name) {
                var layersMap = this.layersMap();
                return layersMap[name];
            },
            appendLayer: function (name, layer) {
                return this.attachLayer(name, layer);
            },
            /**
             * attach a layer to nextTopology, that should be subclass of nx.graphic.Topology.Layer
             * @method attachLayer
             * @param name {String} handler to get this layer
             * @param layer <String,nx.graphic.Topology.Layer> Could be string of a layer's class name, or a reference of a layer
             */
            attachLayer: function (name, layer, index) {
                var layersMap = this.layersMap();
                var layers = this.layers();
                var layerObj = this._generateLayer(name, layer);
                var layerResourceMap, layerResource = {};
                if (layerObj) {
                    if (index >= 0) {
                        layerObj.attach(this.stage(), index);
                        layers.splice(index, 0, layerObj);
                    } else {
                        layerObj.attach(this.stage());
                        layers.push(layerObj);
                    }
                    layersMap[name] = layerObj;
                    // listen layer active elements change
                    layerResourceMap = this.layerResource_internal_();
                    layerResourceMap[name] = layerResource;
                    layerResource.activeElementsChangeListener = function (sender, edata) {
                        layerResource.activeCount = layerObj.activeElements().count();
                        // get the total active count and update class
                        var total = 0;
                        nx.each(layerResourceMap, function (res) {
                            total += res.activeCount;
                        });
                        this.dom().setClass("fade-active-occur", total > 0);
                    };
                    layerObj.activeElements().on("change", layerResource.activeElementsChangeListener, this);
                }
                return layerObj;
            },
            /**
             * Prepend a layer to nextTopology, that should be subclass of nx.graphic.Topology.Layer
             * @method prependLayer
             * @param name {String} handler to get this layer
             * @param layer <String,nx.graphic.Topology.Layer> Could be string of a layer's class name, or a reference of a layer
             */
            prependLayer: function (name, layer) {
                return this.attachLayer(name, layer, 0);
            },
            /**
             * Insert a layer under a certain layer, that should be subclass of nx.graphic.Topology.Layer
             * @method insertLayerAfter
             * @param name  {String} handler to get this layer
             * @param layer <String,Object> Could be string of a layer's class name, or a reference of a layer
             * @param upsideLayerName {String} name of upside layer
             */
            insertLayerAfter: function (name, layer, upsideLayerName) {
                var afterLayer = this.layersMap()[upsideLayerName];
                if (afterLayer) {
                    var index = this.layers().indexOf(afterLayer);
                    if (index >= 0) {
                        return this.attachLayer(name, layer, index + 1);
                    }
                }
            },

            eachLayer: function (callback, context) {
                nx.each(this.layersMap(), callback, context);
            },
            /**
             * fade out layer
             * @method fadeOut
             * @param [force] {Boolean} force layer fade out and can't fade in
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeOut: function (force, callback, context) {
                if (force) {
                    this.forceFade(true);
                } else if (!this.forceFade()) {
                    this.fade(true);
                }
            },
            /**
             * FadeIn layer's fade statues
             * @param force {Boolean} force recover all items
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeIn: function (force, callback, context) {
                if (this.forceFade() === true) {
                    if (force) {
                        this.forceFade(null);
                        this.fade(false);
                    }
                } else {
                    this.fade(false);
                }
            },
            recoverActive: function () {
                nx.each(this.layers(), function (layer) {
                    if (layer.activeElements) {
                        layer.activeElements().clear();
                    }
                }, this);
                this.activeNodes([]);
                this.fadeIn();
            },
            recoverHighlight: function () {
                nx.each(this.layers(), function (layer) {
                    if (layer.highlightedElements) {
                        layer.highlightedElements().clear();
                    }
                }, this);
                //todo refactore
                this.highlightedNodes([]);
                this.fadeIn(true);
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {
    /**
     * Topology stage class
     * @class nx.graphic.Topology.StageMixin
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.StageMixin', {
        events: ['fitStage', 'ready', 'resizeStage', 'afterFitStage'],
        properties: {
            /**
             * Set/get nextTopology's width.
             * @property width {Number}
             */
            width: {
                get: function () {
                    return this._width || 300 + this.padding() * 2;
                },
                set: function (value) {
                    return this.resize(value);
                }
            },
            /**
             * height Set/get nextTopology's height.
             * @property height {Number}
             */
            height: {
                get: function () {
                    return this._height || 300 + this.padding() * 2;
                },
                set: function (value) {
                    this.resize(null, value);
                }
            },
            /**
             * Set/get stage's padding.
             * @property padding {Number}
             */
            padding: {
                value: 100
            },
            /**
             * Set/get nextTopology's scalability
             * @property scalable {Boolean}
             */
            scalable: {
                value: true
            },
            stageScale: {
                value: 1
            },
            revisionScale: {
                value: 1
            },
            matrix: {
                value: function () {
                    return new nx.geometry.Matrix(nx.geometry.Matrix.I);
                }
            },
            /**
             * Set to true will adapt to nextTopology's outside container, set to ture will ignore width/height
             * @property adaptive {Boolean}
             */
            adaptive: {
                value: false
            },
            /**
             * Get the nextTopology's stage component
             * @property stage {nx.graphic.Component}
             */
            stage: {
                get: function () {
                    return this.view('stage');
                }
            },
            /**
             * Enabling the smart node feature, set to false will improve the performance
             * @property enableSmartNode {Boolean}
             */
            enableSmartNode: {
                value: true
            },
            autoFit: {
                value: true
            }
        },

        methods: {
            initStage: function () {
                nx.each(nx.graphic.Icons.icons, function (iconObj, key) {
                    if (iconObj.icon) {
                        var icon = iconObj.icon.cloneNode(true);
                        icon.setAttribute("height", iconObj.size.height);
                        icon.setAttribute("width", iconObj.size.width);
                        icon.setAttribute("data-device-type", key);
                        icon.setAttribute("id", key);
                        icon.setAttribute("class", 'deviceIcon');
                        this.stage().addDef(icon);
                    }
                }, this);
            },
            _adaptiveTimer: function () {
                var self = this;
                if (!this.adaptive() && (this.width() !== 0 && this.height() !== 0)) {
                    this.status('appended');
                    /**
                     * Fired when nextTopology appended to container with with& height
                     * @event ready
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    setTimeout(function () {
                        this.fire('ready');
                    }.bind(this), 0);

                } else {
                    var timer = setInterval(function () {
                        if (nx.dom.Document.body().contains(self.view().dom())) {
                            clearInterval(timer);
                            this._adaptToContainer();
                            this.status('appended');
                            this.fire('ready');
                        }
                    }.bind(this), 10);
                }
            },
            _adaptToContainer: function () {
                var bound = this.view().dom().parentNode().getBound();
                if (bound.width === 0 || bound.height === 0) {
                    if (console) {
                        console.warn("Please set height*width to nextTopology's parent container");
                    }
                    return;
                }
                if (this._width !== bound.width || this._height !== bound.height) {
                    this.resize(bound.width, bound.height);
                }
            },
            /**
             * Make nextTopology adapt to container,container should set width/height
             * @method adaptToContainer
             */
            adaptToContainer: function (callback) {
                if (!this.adaptive()) {
                    return;
                }
                this._adaptToContainer();
                this.fit();
            },


            /**
             * Get the passing bound's relative inside bound,if not passing param will return the nextTopology graphic's bound
             * @param bound {JSON}
             * @returns {{left: number, top: number, width: number, height: number}}
             */
            getInsideBound: function (bound) {
                var _bound = bound || this.stage().view('stage').getBound();
                var topoBound = this.view().dom().getBound();

                return {
                    left: _bound.left - topoBound.left,
                    top: _bound.top - topoBound.top,
                    width: _bound.width,
                    height: _bound.height
                };
            },
            getAbsolutePosition: function (obj) {
                var topoMatrix = this.matrix();
                var stageScale = topoMatrix.scale();
                var topoOffset = this.view().dom().getOffset();
                return {
                    x: obj.x * stageScale + topoMatrix.x() + topoOffset.left,
                    y: obj.y * stageScale + topoMatrix.y() + topoOffset.top
                };
            },
            /**
             * Make nextTopology graphic fit stage
             * @method fit
             */
            fit: function (callback, context, isAnimated) {
                this.stage().fit(function () {
                    this.adjustLayout();
                    /* jshint -W030 */
                    callback && callback.call(context || this);
                    this.fire('afterFitStage');
                }, this, isAnimated == null ? true : isAnimated);
                /**
                 * Fired when  after nextTopology fit to stage
                 * @event fit
                 * @param sender{Object} trigger instance
                 * @param event {Object} original event object
                 */
                this.fire('fitStage');

            },
            /**
             * Zoom nextTopology
             * @param value {Number}
             * @method zoom
             */
            zoom: function (value) {

            },
            /**
             * Zoom nextTopology by a bound
             * @method zoomByBound
             * @param inBound {Object} e.g {left:Number,top:Number,width:Number,height:Number}
             * @param [callback] {Function} callback function
             * @param [context] {Object} callback context
             * @param [duration] {Number} set the transition time, unit is second
             */
            zoomByBound: function (inBound, callback, context, duration) {
                this.stage().zoomByBound(inBound, function () {
                    this.adjustLayout();
                    /* jshint -W030 */
                    callback && callback.call(context || this);
                    this.fire('zoomend');
                }, this, duration !== undefined ? duration : 0.9);
            },
            /**
             * Move nextTopology
             * @method move
             * @param x {Number}
             * @param y {Number}
             * @param [duration] {Number} default is 0
             */
            move: function (x, y, duration) {
                var stage = this.stage();
                stage.applyTranslate(x || 0, y || 0, duration);
            },
            /**
             * Resize nextTopology
             * @method resize
             * @param width {Number}
             * @param height {Number}
             */
            resize: function (width, height) {
                var modified = false;
                if (width != null && width != this._width) {
                    var _width = Math.max(width, 300 + this.padding() * 2);
                    if (_width != this._width) {
                        this._width = _width;
                        modified = true;
                    }
                }
                if (height != null) {
                    var _height = Math.max(height, 300 + this.padding() * 2);
                    if (_height != this._height) {
                        this._height = _height;
                    }
                }

                if (modified) {
                    this.notify('width');
                    this.notify('height');
                    this.stage().resetFitMatrix();
                    /**
                     * Fired when nextTopology's stage changed
                     * @event resizeStage
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('resizeStage');
                }
                return modified;
            },
            /**
             * If enable enableSmartNode, this function will auto adjust the node's overlapping and set the nodes to right size
             * @method adjustLayout
             */
            adjustLayout: function () {


                if (!this.enableSmartNode()) {
                    return;
                }

                if (this._adjustLayoutTimer) {
                    clearTimeout(this._adjustLayoutTimer);
                }
                this._adjustLayoutTimer = setTimeout(function () {
                    var graph = this.graph();
                    if (graph) {
                        var startTime = new Date();
                        var topoMatrix = this.matrix();
                        var stageScale = topoMatrix.scale();
                        var positionAry = [];
                        this.eachNode(function (node) {
                            if (node.activated && !node.activated()) {
                                return;
                            }
                            var position = node.position();
                            positionAry[positionAry.length] = {
                                x: position.x * stageScale + topoMatrix.x(),
                                y: position.y * stageScale + topoMatrix.y()
                            };
                        });
                        var calc = function (positionAry) {
                            var length = positionAry.length;
                            var iconRadius = 36 * 36;
                            var dotRadius = 32 * 32;

                            var testOverlap = function (sourcePosition, targetPosition) {
                                var distance = Math.pow(Math.abs(sourcePosition.x - targetPosition.x), 2) + Math.pow(Math.abs(sourcePosition.y - targetPosition.y), 2);
                                return {
                                    iconOverlap: distance < iconRadius,
                                    dotOverlap: distance < dotRadius
                                };
                            };

                            var iconOverlapCounter = 0;
                            var dotOverlapCounter = 0;

                            for (var i = 0; i < length; i++) {
                                var sourcePosition = positionAry[i];
                                var iconIsOverlap = false;
                                var dotIsOverlap = false;
                                for (var j = 0; j < length; j++) {
                                    var targetPosition = positionAry[j];
                                    if (i !== j) {
                                        var result = testOverlap(sourcePosition, targetPosition);
                                        /* jshint -W030 */
                                        result.iconOverlap && (iconIsOverlap = true);
                                        /* jshint -W030 */
                                        result.dotOverlap && (dotIsOverlap = true);
                                    }
                                }
                                /* jshint -W030 */
                                iconIsOverlap && iconOverlapCounter++;
                                /* jshint -W030 */
                                dotIsOverlap && dotOverlapCounter++;
                            }

                            //0.2,0.4,0.6.0.8,1
                            var overlapPercent = 1;
                            if (iconOverlapCounter / length > 0.2) {
                                overlapPercent = 0.8;
                                if (dotOverlapCounter / length > 0.8) {
                                    overlapPercent = 0.2;
                                } else if (dotOverlapCounter / length > 0.5) {
                                    overlapPercent = 0.4;
                                } else if (dotOverlapCounter / length > 0.15) {
                                    overlapPercent = 0.6;
                                }
                            }
                            return overlapPercent;
                        };

                        if (window.Blob && window.Worker) {
                            var fn = "onmessage = function(e) { self.postMessage(calc(e.data)); };";
                            fn += "var calc = " + calc.toString();

                            if (!this.adjustWorker) {
                                var blob = new Blob([fn]);
                                // Obtain a blob URL reference to our worker 'file'.
                                var blobURL = window.URL.createObjectURL(blob);
                                var worker = this.adjustWorker = new Worker(blobURL);
                                worker.onmessage = function (e) {
                                    var overlapPercent = e.data;
                                    this.revisionScale(overlapPercent);
                                }.bind(this);
                            }
                            this.adjustWorker.postMessage(positionAry); // Start the worker.
                        }


                        //                        var overlapPercent = calc(positionAry);
                        //                        this.revisionScale(overlapPercent);
                        //                        nodesLayer.updateNodeRevisionScale(overlapPercent);

                    }
                }.bind(this), 200);
            }
        }
    });
})
(nx, nx.global);

(function (nx, global) {

    /**
     * Tooltip mixin class
     * @class nx.graphic.Topology.TooltipMixin
     *
     */

    nx.define("nx.graphic.Topology.TooltipMixin", {
        events: [],
        properties: {
            /**
             * Set/get the tooltip manager config
             * @property tooltipManagerConfig
             */
            tooltipManagerConfig: {
                get: function () {
                    return this._tooltipManagerConfig || {};
                },
                set: function (value) {
                    var tooltipManager = this.tooltipManager();
                    if (tooltipManager) {
                        tooltipManager.sets(value);
                    }
                    this._tooltipManagerConfig = value;
                }
            },
            /**
             * get tooltip manager
             * @property tooltipManager
             */
            tooltipManager: {
                value: function () {
                    var config = this.tooltipManagerConfig();
                    return new nx.graphic.Topology.TooltipManager(nx.extend({}, {topology: this}, config));
                }
            }
        },
        methods: {

        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Scene mixin
     * @class nx.graphic.Topology.SceneMixin
     * @module nx.graphic.Topology
     *
     */
    nx.define("nx.graphic.Topology.SceneMixin", {
        events: [],
        properties: {
            /**
             * @property scenesMap
             */
            scenesMap: {
                value: function () {
                    return {};
                }
            },
            /**
             * @property scenes
             */
            scenes: {
                value: function () {
                    return [];
                }
            },
            currentScene: {},
            /**
             * Current scene name
             * @property currentSceneName
             */
            currentSceneName: {},
            sceneEnabled: {
                value: true
            }
        },
        methods: {
            initScene: function () {
                this.registerScene("default", "nx.graphic.Topology.DefaultScene");
                this.registerScene("selection", "nx.graphic.Topology.SelectionNodeScene");
                this.registerScene("zoomBySelection", "nx.graphic.Topology.ZoomBySelection");
                this.activateScene('default');
                this._registerEvents();

            },
            /**
             * Register a scene to nextTopology
             * @method registerScene
             * @param name {String} for reference to a certain scene
             * @param inClass <String,Class> A scene class name or a scene class instance, which is subclass of nx.graphic.Topology.Scene
             */
            registerScene: function (name, inClass) {
                var cls;
                if (name && inClass) {
                    var scene;
                    var scenesMap = this.scenesMap();
                    var scenes = this.scenes();
                    if (!nx.is(inClass, 'String')) {
                        scene = inClass;
                    } else {
                        cls = nx.path(global, inClass);
                        if (cls) {
                            scene = new cls();
                        } else {
                            //nx.logger.log('wrong scene name');
                        }
                    }
                    if (scene) {
                        scene.topology(this);
                        scenesMap[name] = scene;
                        scenes.push(scene);
                    }
                }
            },
            /**
             * Activate a scene, nextTopology only has one active scene.
             * @method activateScene
             * @param name {String} Scene name which be passed at registerScene
             */
            activateScene: function (name) {
                var scenesMap = this.scenesMap();
                var sceneName = name || 'default';
                var scene = scenesMap[sceneName] || scenesMap["default"];
                //
                this.deactivateScene();
                this.currentScene(scene);
                this.currentSceneName(sceneName);

                scene.activate();
                this.fire("switchScene", {
                    name: name,
                    scene: scene
                });
                return scene;
            },
            /**
             * Deactivate a certain scene
             * @method deactivateScene
             */
            deactivateScene: function () {
                if (this.currentScene() && this.currentScene().deactivate) {
                    this.currentScene().deactivate();
                }
                this.currentScene(null);
            },
            disableCurrentScene: function (value) {
                this.sceneEnabled(!value);
            },
            _registerEvents: function () {
                nx.each(this.__events__, this._aop = function (eventName) {
                    this.upon(eventName, function (sender, data) {
                        this.dispatchEvent(eventName, sender, data);
                    }, this);
                }, this);
            },
            dispatchEvent: function (eventName, sender, data) {
                if (this.sceneEnabled()) {
                    var currentScene = this.currentScene();
                    if (currentScene.dispatch) {
                        currentScene.dispatch(eventName, sender, data);
                    }
                    if (currentScene[eventName]) {
                        currentScene[eventName].call(currentScene, sender, data);
                    }
                }
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    /**
     * Layout mixin class
     * @class nx.graphic.Topology.LayoutMixin
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.LayoutMixin", {
        events: [],
        properties: {
            /**
             * Layout map
             * @property  layoutMap
             */
            layoutMap: {
                value: function () {
                    return {};
                }
            },
            /**
             * Current layout type
             * @property layoutType
             */
            layoutType: {
                value: null
            },
            /**
             * Current layout config
             * @property layoutConfig
             */
            layoutConfig: {
                value: null
            }
        },
        methods: {
            initLayout: function () {
                this.registerLayout('force', new nx.graphic.Topology.NeXtForceLayout());
                this.registerLayout('USMap', new nx.graphic.Topology.USMapLayout());
                this.registerLayout('WorldMap', new nx.graphic.Topology.WorldMapLayout());
                this.registerLayout('hierarchicalLayout', new nx.graphic.Topology.HierarchicalLayout());
                this.registerLayout('enterpriseNetworkLayout', new nx.graphic.Topology.EnterpriseNetworkLayout());


            },
            /**
             * Register a layout
             * @method registerLayout
             * @param name {String} layout name
             * @param cls {Object} layout class instance
             */
            registerLayout: function (name, cls) {
                var layoutMap = this.layoutMap();
                layoutMap[name] = cls;

                if (cls.topology) {
                    cls.topology(this);
                }
            },
            /**
             * Get layout instance by name
             * @method getLayout
             * @param name {String}
             * @returns {*}
             */
            getLayout: function (name) {
                var layoutMap = this.layoutMap();
                return layoutMap[name];
            },
            /**
             * Activate a layout
             * @param inName {String} layout name
             * @param inConfig {Object} layout config object
             * @param callback {Function} callback for after apply a layout
             */
            activateLayout: function (inName, inConfig, callback) {
                var layoutMap = this.layoutMap();
                var name = inName || this.layoutType();
                var config = inConfig || this.layoutConfig();
                if (layoutMap[name] && layoutMap[name].process) {
                    layoutMap[name].process(this.graph(), config, callback);
                    this.layoutType(name);
                }
            },
            deactivateLayout: function (name) {

            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Topology's batch operation class
     * @class nx.graphic.Topology.Categories
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Categories", {
        events: [],
        properties: {
        },
        methods: {
            /**
             * Show loading indicator
             * @method showLoading
             */
            showLoading: function () {
                nx.dom.Document.html().addClass('n-waitCursor');
                this.view().dom().addClass('n-topology-loading');
                this.view('loading').dom().setStyle('display', 'block');
            },
            /**
             * Hide loading indicator
             * @method hideLoading
             */
            hideLoading: function () {
                nx.dom.Document.html().removeClass('n-waitCursor');
                this.view().dom().removeClass('n-topology-loading');
                this.view('loading').dom().setStyle('display', 'none');
            },
            exportPNG: function () {

                this.fit();


                var serializer = new XMLSerializer();
                var stageScale = this.stageScale();
                var translateX = topo.matrix().x();
                var translateY = topo.matrix().y();
                var stage = this.stage().view().dom().$dom.querySelector('.stage').cloneNode(true);
                nx.each(stage.querySelectorAll('.fontIcon'), function (icon) {
                    icon.remove();
                });

                nx.each(stage.querySelectorAll('.link'), function (item) {
                    item.style.stroke = '#26A1C5';
                    item.style.fill = 'none';
                    item.style.background = 'transparent';
                });

                nx.each(stage.querySelectorAll('line.link-set-bg'), function (item) {
                    item.style.stroke = '#26A1C5';
                });

                nx.each(stage.querySelectorAll('text.node-label'), function (item) {
                    item.style.fontSize = '12px';
                    item.style.fontFamily = 'Tahoma';
                });

                nx.each(stage.querySelectorAll('.n-hidden'), function (hidden) {
                    hidden.remove();
                });


                var svg = serializer.serializeToString(stage);
                var svgString = '<svg width="' + this.width() + '" height="' + this.height() + '" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" >' + svg + "</svg>";
                var b64 = window.btoa(svgString);
                var img = this.view("img").dom().$dom;
                //var canvas = this.view("canvas").view().$dom;
                img.setAttribute('width', this.width());
                img.setAttribute('height', this.height());
                img.setAttribute('src', 'data:image/svg+xml;base64,' + b64);
                var canvas = this.view('canvas').dom().$dom;
                var ctx = canvas.getContext("2d");
                var revisionScale = this.revisionScale();
                var fontSize = 32 * revisionScale;


                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, this.width(), this.height());


                ctx.drawImage(img, 0, 0);
                ctx.font = fontSize + "px next-font";
                this.eachNode(function (node) {
                    var iconType = node.iconType();
                    var iconObject = nx.graphic.Icons.get(iconType);
                    ctx.fillStyle = '#fff';
                    ctx.fillText(iconObject.font[1], node.x() / stageScale + translateX - 16 * revisionScale, node.y() / stageScale + translateY + 16 * revisionScale);
                    ctx.fillStyle = node.color() || '#26A1C5';
                    ctx.fillText(iconObject.font[0], node.x() / stageScale + translateX - 16 * revisionScale, node.y() / stageScale + translateY + 16 * revisionScale);
                });
                var link = document.createElement('a');
                link.setAttribute('href', canvas.toDataURL());
                link.setAttribute('download', (new Date()).getTime() + ".png");
                var event = document.createEvent('MouseEvents');
                event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                link.dispatchEvent(event);
            },
            __drawBG: function (inBound) {
                var bound = inBound || this.stage().getContentBound();
                var bg = this.stage().view('bg');
                bg.sets({
                    x: bound.left,
                    y: bound.top,
                    width: bound.width,
                    height: bound.height,
                    visible: true
                });
                bg.set('visible', true);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Topology base class

     var topologyData = {
        nodes: [
            {"id": 0, "x": 410, "y": 100, "name": "12K-1"},
            {"id": 1, "x": 410, "y": 280, "name": "12K-2"},
            {"id": 2, "x": 660, "y": 280, "name": "Of-9k-03"},
            {"id": 3, "x": 660, "y": 100, "name": "Of-9k-02"},
            {"id": 4, "x": 180, "y": 190, "name": "Of-9k-01"}
        ],
        links: [
            {"source": 0, "target": 1},
            {"source": 1, "target": 2},
            {"source": 1, "target": 3},
            {"source": 4, "target": 1},
            {"source": 2, "target": 3},
            {"source": 2, "target": 0},
            {"source": 3, "target": 0},
            {"source": 3, "target": 0},
            {"source": 3, "target": 0},
            {"source": 0, "target": 4},
            {"source": 0, "target": 4},
            {"source": 0, "target": 3}
        ]
     };
     nx.define('MyTopology', nx.ui.Component, {
        view: {
            content: {
                type: 'nx.graphic.Topology',
                props: {
                    width: 800,
                    height: 800,
                    nodeConfig: {
                        label: 'model.id'
                    },
                    showIcon: true,
                    data: topologyData
                }
            }
        }
     });
     var app = new nx.ui.Application();
     var comp = new MyTopology();
     comp.attach(app);


     * @class nx.graphic.Topology
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     * @uses nx.graphic.Topology.Config
     * @uses nx.graphic.Topology.Projection
     * @uses nx.graphic.Topology.Graph
     * @uses nx.graphic.Topology.Event
     * @uses nx.graphic.Topology.StageMixin
     * @uses nx.graphic.Topology.NodeMixin
     * @uses nx.graphic.Topology.LinkMixin
     * @uses nx.graphic.Topology.LayerMixin
     * @uses nx.graphic.Topology.TooltipMixin
     * @uses nx.graphic.Topology.SceneMixin
     *
     */
    var extendEvent = nx.Object.extendEvent;
    var extendProperty = nx.Object.extendProperty;
    var extendMethod = nx.Object.extendMethod;
    var Topology = nx.define("nx.graphic.Topology", nx.ui.Component, {
        statics: {
            i18n: {
                'cantAggregateExtraNode': 'Can\'t aggregate extra node',
                'cantAggregateNodesInDifferentNodeSet': 'Can\'t aggregate nodes in different nodeSet'
            },
            extensions: [],
            registerExtension: function (cls) {
                var prototype = Topology.prototype;
                var classPrototype = cls.prototype;

                Topology.extensions.push(cls);

                nx.each(cls.__events__, function (name) {
                    extendEvent(prototype, name);
                });

                nx.each(cls.__properties__, function (name) {
                    extendProperty(prototype, name, classPrototype[name].__meta__);
                });

                nx.each(cls.__methods__, function (name) {
                    if (name !== 'init') {
                        extendMethod(prototype, name, classPrototype[name]);
                    }
                });
            }
        },
        mixins: [
            nx.graphic.Topology.Config,
            nx.graphic.Topology.Graph,
            nx.graphic.Topology.Event,
            nx.graphic.Topology.StageMixin,
            nx.graphic.Topology.NodeMixin,
            nx.graphic.Topology.LinkMixin,
            nx.graphic.Topology.LayerMixin,
            nx.graphic.Topology.LayoutMixin,
            nx.graphic.Topology.TooltipMixin,
            nx.graphic.Topology.SceneMixin,
            nx.graphic.Topology.Categories
        ],
        events: ['clear'],
        view: {
            props: {
                'class': ['n-topology', '{#themeClass}'],
                tabindex: '0',
                style: {
                    width: "{#width}",
                    height: "{#height}"
                }
            },
            content: [
                {
                    name: "stage",
                    type: "nx.graphic.Stage",
                    props: {
                        width: "{#width}",
                        height: "{#height}",
                        padding: '{#padding}',
                        matrixObject: '{#matrix,direction=<>}',
                        stageScale: '{#stageScale,direction=<>}'
                    },
                    events: {
                        ':mousedown': '{#_pressStage}',
                        ':touchstart': '{#_pressStage}',
                        'mouseup': '{#_clickStage}',
                        'touchend': '{#_clickStage}',
                        'mousewheel': '{#_mousewheel}',
                        'DOMMouseScroll': '{#_mousewheel}',
                        'touchmove': '{#_mousewheel}',
                        'dragStageStart': '{#_dragStageStart}',
                        'dragStage': '{#_dragStage}',
                        'dragStageEnd': '{#_dragStageEnd}',
                        'stageTransitionEnd': '{#_stageTransitionEnd}'

                    }
                },
                {
                    name: 'nav',
                    type: 'nx.graphic.Topology.Nav',
                    props: {
                        visible: '{#showNavigation}',
                        showIcon: '{#showIcon,direction=<>}'
                    }
                },
                {
                    name: 'loading',
                    props: {
                        'class': 'n-topology-loading'
                    },
                    content: {
                        tag: 'ul',
                        props: {
                            items: new Array(10),
                            template: {
                                tag: 'li'
                            }
                        }
                    }
                },
//                {
//                    type: 'nx.graphic.Topology.Thumbnail',
//                    props: {
//                        width: "{#width}",
//                        height: "{#height}"
//                    }
//                },
                {
                    name: 'img',
                    tag: 'img',
                    props: {
                        style: {
                            'display': 'none'
                        }
                    }
                },
                {
                    name: 'canvas',
                    tag: 'canvas',
                    props: {
                        width: "{#width}",
                        height: "{#height}",
                        style: {
                            'display': 'none'
                        }
                    }
                }

            ],
            events: {
                'contextmenu': '{#_contextmenu}',
                'keydown': '{#_key}'
            }
        },
        properties: {
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.sets(args);

                this.initStage();
                this.initLayer();
                this.initGraph();
                this.initNode();
                this.initScene();
                this.initLayout();


                nx.each(Topology.extensions, function (cls) {
                    var ctor = cls.__ctor__;
                    if (ctor) {
                        ctor.call(this);
                    }
                }, this);


            },
            attach: function (args) {
                this.inherited(args);
                this._adaptiveTimer();
            },
            /**
             * Clear all layer's content
             * @method clear
             */
            clear: function () {
                this.status('cleared');
                if (this._nodesAnimation) {
                    this._nodesAnimation.stop();
                }
                this.graph().clear();
                this.tooltipManager().closeAll();
                nx.each(this.layers(), function (layer, name) {
                    layer.clear();
                });
                this.blockEvent(false);
                this.fire('clear');
                if (this.width() && this.height()) {
                    this.status('appended');
                }
            },
            dispose: function () {
                this.status('disposed');
                this.tooltipManager().dispose();
                this.graph().dispose();

                nx.each(this.layers(), function (layer) {
                    layer.dispose();
                });
                this.blockEvent(false);
                this.inherited();
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {

    /**
     * Topology basic layer class
     * @class nx.graphic.Topology.Layer
     * @extend nx.graphic.Group
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.Layer", nx.graphic.Group, {
        view: {
            type: 'nx.graphic.Group',
            props: {
                class: "layer"
            }
        },
        properties: {
            /**
             * Get nextTopology
             * @property topology
             */
            topology: {
                value: null
            },
            highlightedElements: {
                value: function () {
                    return new nx.data.UniqObservableCollection();
                }
            },
            activeElements: {
                value: function () {
                    return new nx.data.UniqObservableCollection();
                }
            },
            /**
             * Get fade status.
             * @property fade
             * @readOnly
             */
            fade: {
                dependencies: "forceFade",
                value: function (forceFade) {
                    return (forceFade === true || forceFade === false) ? forceFade : this._fade;
                }
            },
            fadeUpdater_internal_: {
                dependencies: "fade",
                update: function (fade) {
                    if (fade) {
                        this.dom().addClass("fade-layer");
                    } else {
                        this.dom().removeClass("fade-layer");
                    }
                }
            },
            /**
             * Force layer fade.
             * @property forceFade
             */
            forceFade: {}
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.view().set("data-nx-type", this.__className__);

                var highlightedElements = this.highlightedElements();
                var activeElements = this.activeElements();

                highlightedElements.on('change', function (sender, args) {
                    if (args.action == 'add') {
                        nx.each(args.items, function (el) {
                            el.dom().addClass("fade-highlight-item");
                        });
                    } else if (args.action == 'remove' || args.action == "clear") {
                        nx.each(args.items, function (el) {
                            /* jslint -W030 */
                            el.dom() && el.dom().removeClass("fade-highlight-item");
                        });
                    }
                    if (highlightedElements.count() === 0 && activeElements.count() === 0) {
                        this.fadeIn();
                    } else {
                        this.fadeOut();
                    }
                }, this);


                activeElements.on('change', function (sender, args) {
                    if (args.action == 'add') {
                        nx.each(args.items, function (el) {
                            el.dom().addClass("fade-active-item");
                        });
                    } else if (args.action == 'remove' || args.action == "clear") {
                        nx.each(args.items, function (el) {
                            /* jslint -W030 */
                            el.dom() && el.dom().removeClass("fade-active-item");
                        });
                    }
                    if (highlightedElements.count() === 0 && activeElements.count() === 0) {
                        this.fadeIn();
                    } else {
                        this.fadeOut();
                    }
                }, this);

            },
            /**
             * Factory function, draw group
             */
            draw: function () {

            },
            /**
             * Show layer
             * @method show
             */
            show: function () {
                this.visible(true);
            },
            /**
             * Hide layer
             * @method hide
             */
            hide: function () {
                this.visible(false);
            },
            /**
             * fade out layer
             * @method fadeOut
             * @param [force] {Boolean} force layer fade out and can't fade in
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeOut: function (force, callback, context) {
                if (force) {
                    this.forceFade(true);
                } else if (!this.forceFade()) {
                    this.fade(true);
                }
            },
            /**
             * FadeIn layer's fade statues
             * @param force {Boolean} force recover all items
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            fadeIn: function (force, callback, context) {
                if (this.forceFade() === true) {
                    if (force) {
                        this.forceFade(null);
                        this.fade(false);
                    }
                } else {
                    this.fade(false);
                }
            },
            /**
             * Fade in layer
             * @method fadeIn
             * @param force {Boolean} force recover all items
             * @param [callback] {Function} callback after fade out
             * @param [context] {Object} callback context
             */
            recover: function (force, callback, context) {
                this.fadeIn(force, callback, context);
            },
            /**
             * clear layer's content
             * @method clear
             */
            clear: function () {
                this.highlightedElements().clear();
                this.activeElements().clear();
                this.view().dom().empty();
            },
            dispose: function () {
                this.clear();
                this.highlightedElements().clear();
                this.activeElements().clear();
                this.inherited();
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {

    nx.define('nx.graphic.Topology.NodeWatcher', nx.Observable, {
        properties: {
            nodes: {
                get: function () {
                    return this._nodes || [];
                },
                set: function (inNodes) {
                    var updater = this.updater();
                    var vertices = this.vertices();

                    if (vertices.length !== 0) {
                        nx.each(vertices, function (vertex) {
                            vertex.unwatch('generated', updater, this);
                        }, this);
                        vertices.length = 0;
                    }

                    if (!inNodes) {
                        return;
                    }

                    var nodes = inNodes;
                    if (!nx.is(nodes, Array) && !nx.is(nodes, nx.data.ObservableCollection)) {
                        nodes = [nodes];
                    }
                    nx.each(nodes, function (item) {
                        var vertex = this._getVertex(item);
                        if (vertex && vertices.indexOf(vertex) == -1) {
                            vertices.push(vertex);
                        }
                    }, this);


                    //todo
                    if (nx.is(nodes, nx.data.ObservableCollection)) {
                        nodes.on('change', function (sender, args) {
                            var action = args.action;
                            var items = args.items;
                            if (action == 'add') {

                            } else if (action == 'remove') {

                            } else if (action == 'clear') {

                            }
                        });
                    }

                    var observePosition = this.observePosition();
                    nx.each(vertices, function (vertex) {
                        vertex.watch('generated', updater, this);
                        if (observePosition) {
                            vertex.on('updateCoordinate', updater, this);
                        }
                    }, this);

                    updater();
                    this._nodes = nodes;
                }
            },
            updater: {
                value: function () {
                    return function () {

                    };
                }
            },
            topology: {
                set: function (topo) {
                    if (topo && topo.graph()) {
                        var graph = topo.graph();
                        graph.on("addVertexSet", this.update, this);
                        graph.on("removeVertexSet", this.update, this);
                        graph.on("deleteVertexSet", this.update, this);
                        graph.on("updateVertexSet", this.update, this);
                    }
                    this._topology = topo;
                }
            },
            vertices: {
                value: function () {
                    return [];
                }
            },
            observePosition: {
                value: false
            }
        },
        methods: {
            _getVertex: function (value) {
                var vertex;
                var topo = this.topology();
                if (topo && topo.graph()) {
                    var graph = topo.graph();
                    if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                        vertex = value.model();
                    } else if (graph.getVertex(value)) {
                        vertex = graph.getVertex(value);
                    }
                }
                return vertex;
            },
            getNodes: function (includeParent) {
                var nodes = [];
                var topo = this.topology();
                var vertices = this.vertices();
                nx.each(vertices, function (vertex) {
                    var id = vertex.id();
                    var node = topo.getNode(id);
                    if (includeParent !== false && (!node || vertex.generated() === false)) {
                        var generatedRootVertexSet = vertex.generatedRootVertexSet();
                        if (generatedRootVertexSet) {
                            node = topo.getNode(generatedRootVertexSet.id());
                        }
                    }

                    if (node && nodes.indexOf(node)) {
                        nodes.push(node);
                    }
                });

                return nodes;
            },
            update: function () {
                var updater = this.updater();
                var vertices = this.vertices();
                if (vertices.length !== 0) {
                    updater();
                }
            },
            dispose: function () {
                var topo = this.topology();
                if (topo && topo.graph()) {
                    var graph = topo.graph();
                    graph.off("addVertexSet", this.update, this);
                    graph.off("removeVertexSet", this.update, this);
                    graph.off("deleteVertexSet", this.update, this);
                    graph.off("updateVertexSet", this.update, this);
                }
                this.inherited();
            }

        }
    });
})(nx, nx.global);
(function (nx, global) {

    var Vector = nx.geometry.Vector;
    /**
     * Abstract node class
     * @class nx.graphic.Topology.AbstractNode
     * @extend nx.graphic.Group
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.AbstractNode", nx.graphic.Group, {
        events: ['updateNodeCoordinate', 'selectNode', 'remove'],
        properties: {
            /**
             * Get  node's absolute position
             * @property  position
             */
            position: {
                get: function () {
                    return {
                        x: this._x || 0,
                        y: this._y || 0
                    };
                },
                set: function (obj) {
                    var isModified = false;
                    if (obj.x != null && obj.x !== this._x && !this._lockXAxle) {
                        this._x = obj.x;
                        this.notify("x");
                        isModified = true;
                    }

                    if (obj.y != null && obj.y !== this._y && !this._lockYAxle) {
                        this._y = obj.y;
                        this.notify("y");
                        isModified = true;
                    }

                    if (isModified) {
                        var model = this.model();
                        model.position({
                            x: this._x,
                            y: this._y
                        });

                        this.view().setTransform(this._x, this._y);
                    }
                }
            },
            absolutePosition: {
                //dependencies: ['position'],
                get: function () {
                    var position = this.position();
                    var topoMatrix = this.topology().matrix();
                    var stageScale = topoMatrix.scale();
                    return {
                        x: position.x * stageScale + topoMatrix.x(),
                        y: position.y * stageScale + topoMatrix.y()
                    };
                },
                set: function (position) {
                    if (position == null || position.x == null || position.y == null) {
                        return false;
                    }
                    var topoMatrix = this.topology().matrix();
                    var stageScale = topoMatrix.scale();

                    this.position({
                        x: (position.x - topoMatrix.x()) / stageScale,
                        y: (position.y - topoMatrix.y()) / stageScale
                    });
                }
            },
            matrix: {
                //dependencies: ['position'],
                get: function () {
                    var position = this.position();
                    var stageScale = this.stageScale();
                    return [
                        [stageScale, 0, 0],
                        [0, stageScale, 0],
                        [position.x, position.y, 1]
                    ];
                }
            },
            /**
             * Get  node's vector
             * @property  vector
             */
            vector: {
                //dependencies: ['position'],
                get: function () {
                    return new Vector(this.x(), this.y());
                }
            },
            /**
             * Get/set  node's x position, suggest use position
             * @property  x
             */
            x: {
                ////dependencies: ['position'],
                get: function () {
                    return this._x || 0;
                },
                set: function (value) {
                    return this.position({x: parseFloat(value)});
                }
            },
            /**
             * Get/set  node's y position, suggest use position
             * @property  y
             */
            y: {
                ////dependencies: ['position'],
                get: function () {
                    return this._y || 0;
                },
                set: function (value) {
                    return this.position({y: parseFloat(value)});
                }
            },
            /**
             * Lock x axle, node only can move at y axle
             * @property lockXAxle {Boolean}
             */
            lockXAxle: {
                value: false
            },
            /**
             * Lock y axle, node only can move at x axle
             * @property lockYAxle
             */
            lockYAxle: {
                value: false
            },
            /**
             * Get nextTopology stage scale
             * @property scale
             */
            stageScale: {
                set: function (value) {
                    this.view().setTransform(null, null, value);
                }
            },
            /**
             * Get nextTopology instance
             * @property  topology
             */
            topology: {},
            /**
             * Get node's id
             * @property id
             */
            id: {
                get: function () {
                    return this.model().id();
                }
            },
            /**
             * Node is been selected statues
             * @property selected
             */
            selected: {
                value: false
            },
            /**
             * Get/set node's usablity
             * @property enable
             */
            enable: {
                value: true
            },
            /**
             * Get node self reference
             * @property node
             */
            node: {
                get: function () {
                    return this;
                }
            },
            showIcon: {
                value: true
            },
            links: {
                get: function () {
                    var links = {};
                    this.eachLink(function (link, id) {
                        links[id] = link;
                    });
                    return links;
                }
            },
            linkSets: {
                get: function () {
                    var linkSets = {};
                    this.eachLinkSet(function (linkSet, linkKey) {
                        linkSets[linkKey] = linkSet;
                    });
                    return linkSets;
                }
            },
            connectedNodes: {
                get: function () {
                    var nodes = {};
                    this.eachConnectedNode(function (node, id) {
                        nodes[id] = node;
                    });
                    return nodes;
                }
            }
        },
        view: {
            type: 'nx.graphic.Group'
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.watch('selected', function (prop, value) {
                    /**
                     * Fired when node been selected or cancel selected
                     * @event selectNode
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('selectNode', value);
                }, this);
            },
            /**
             * Factory function , will be call when set model
             */
            setModel: function (model) {
                this.model(model);
                model.upon('updateCoordinate', function (sender, args) {
                    this.position({
                        x: args.newPosition.x,
                        y: args.newPosition.y
                    });
                    /**
                     * Fired when node update coordinate
                     * @event updateNodeCoordinate
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('updateNodeCoordinate');
                }, this);


                this.setBinding('visible', 'model.visible,direction=<>', this);
                this.setBinding('selected', 'model.selected,direction=<>', this);

                //initialize position
                this.position(model.position());
            },
            update: function () {

            },
            /**
             * Move node certain distance
             * @method move
             * @param x {Number}
             * @param y {Number}
             */
            move: function (x, y) {
                var position = this.position();
                this.position({x: position.x + x || 0, y: position.y + y || 0});
            },
            /**
             * Move to a position
             * @method moveTo
             * @param x {Number}
             * @param y {Number}
             * @param callback {Function}
             * @param isAnimated {Boolean}
             * @param duration {Number}
             */
            moveTo: function (x, y, callback, isAnimated, duration) {
                if (isAnimated !== false) {
                    var obj = {to: {}, duration: duration || 400};
                    obj.to.x = x;
                    obj.to.y = y;

                    if (callback) {
                        obj.complete = callback;
                    }
                    this.animate(obj);
                } else {
                    this.position({x: x, y: y});
                }
            },
            /**
             * Use css translate to move node for high performance, when use this method, related link can't recive notification. Could hide links during transition.
             * @method translateTo
             * @param x {Number}
             * @param y {Number}
             * @param callback {Function}
             */
            translateTo: function (x, y, callback) {

            },
            /**
             * Iterate  all connected links to this node
             * @method eachLink
             * @param callback
             * @param context
             */
            eachLink: function (callback, context) {
                var model = this.model();
                var topo = this.topology();
                //todo

                this.eachLinkSet(function (linkSet) {
                    linkSet.eachLink(callback, context || this);
                });

            },
            eachLinkSet: function (callback, context) {
                var model = this.model();
                var topo = this.topology();
                nx.each(model.edgeSets(), function (edgeSet, linkKey) {
                    var linkSet = topo.getLinkSetByLinkKey(linkKey);
                    if (linkSet) {
                        callback.call(context || this, linkSet, linkKey);
                    }
                }, this);
                nx.each(model.edgeSetCollections(), function (edgeSetCollection, linkKey) {
                    var linkSet = topo.getLinkSetByLinkKey(linkKey);
                    if (linkSet) {
                        callback.call(context || this, linkSet, linkKey);
                    }
                }, this);
            },
            /**
             * Iterate all connected node
             * @method eachConnectedNode
             * @param callback {Function}
             * @param context {Object}
             */
            eachConnectedNode: function (callback, context) {
                var topo = this.topology();
                this.model().eachConnectedVertex(function (vertex, id) {
                    var node = topo.getNode(id);
                    if (node) {
                        callback.call(context || this, node, id);
                    }
                });
            },
            dispose: function () {
                var model = this.model();
                if (model) {
                    model.upon('updateCoordinate', null);
                }
                this.fire('remove');
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Node class
     * @class nx.graphic.Topology.Node
     * @extend nx.graphic.Topology.AbstractNode
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.Node', nx.graphic.Topology.AbstractNode, {
        events: ['pressNode', 'clickNode', 'enterNode', 'leaveNode', 'dragNodeStart', 'dragNode', 'dragNodeEnd', 'selectNode'],
        properties: {
            /**
             * Get node's label
             * @property label
             */
            label: {
                set: function (inValue) {
                    var label = this._processPropertyValue(inValue);
                    var el = this.view('label');
                    if (label != null) {
                        el.set('text', label);
                        el.set('visible', true);
                        this.calcLabelPosition();
                    } else {
                        el.set('visible', false);
                    }
                    this._label = label;
                }
            },
            /**
             * Node icon's type
             * @method iconType {String}
             */
            iconType: {
                get: function () {
                    return this.view('icon').get('iconType');
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (value && this._iconType !== value) {
                        this._iconType = value;
                        this.view('icon').set('iconType', value);
                        return true;
                    } else {
                        return false;
                    }
                }
            },

            /**
             * Show/hide node's icon
             * @property showIcon
             */
            showIcon: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._showIcon = value;

                    this.view('icon').set('showIcon', value);

                    if (this._label != null) {
                        this.calcLabelPosition();
                    }
                    if (this._selected) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }
                }
            },
            enableSmartLabel: {
                value: true
            },
            labelAngle: {
                value: 90
            },
            /**
             * Set node's label visible
             * @property labelVisibility {Boolean} true
             */
            labelVisibility: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    var el = this.view('label');
                    el.visible(value);
                    this._labelVisible = value;
                }
            },
            revisionScale: {
                set: function (value) {
                    var topo = this.topology();
                    var icon = this.view('icon');
                    icon.set('scale', value);
                    if (topo.showIcon()) {
                        icon.showIcon(value > 0.2);
                    } else {
                        icon.showIcon(false);
                    }

                    if (value > 0.4) {
                        this.view('label').set('visible', this._labelVisible == null ? true : this._labelVisible);
                    } else {
                        this.view('label').set('visible', false);
                    }

                    if (this._label != null) {
                        this.calcLabelPosition();
                    }
                    if (this._selected) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }

                }
            },
            /**
             * Set the node's color
             * @property color
             */
            color: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    //                    this.view('graphic').dom().setStyle('fill', value);
                    this.view('label').dom().setStyle('fill', value);
                    this.view('icon').set('color', value);
                    this._color = value;
                }
            },

            /**
             * Set node's scale
             * @property scale {Number}
             */
            scale: {
                get: function () {
                    return this.view('graphic').scale();
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('graphic').setTransform(null, null, value);
                    this.calcLabelPosition(true);
                }
            },


            selectedRingRadius: {
                get: function () {
                    var bound = this.getBound(true);
                    var radius = Math.max(bound.height, bound.width) / 2;
                    return radius + (this.selected() ? 10 : -4);
                }
            },
            /**
             * Get/set node's selected statues
             * @property selected
             */
            selected: {
                get: function () {
                    return this._selected || false;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._selected == value) {
                        return false;
                    }
                    this._selected = value;
                    this.dom().setClass("node-selected", !!value);
                    if (value) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }
                    return true;
                }
            },
            enable: {
                get: function () {
                    return this._enable != null ? this._enable : true;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._enable = value;
                    if (value) {
                        this.dom().removeClass('disable');
                    } else {
                        this.dom().addClass('disable');
                    }
                }
            },
            parentNodeSet: {
                get: function () {
                    var vertexSet = this.model().parentVertexSet();
                    if (vertexSet) {
                        return this.topology().getNode(vertexSet.id());
                    } else {
                        return null;
                    }
                }
            },
            rootParentNodeSet: {
                get: function () {
                    var vertexSet = this.model().generatedRootVertexSet();
                    if (vertexSet) {
                        return this.topology().getNode(vertexSet.id());
                    } else {
                        return null;
                    }
                }
            }
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'node'
            },
            content: [{
                name: 'label',
                type: 'nx.graphic.Text',
                props: {
                    'class': 'node-label',
                    'alignment-baseline': 'central',
                    y: 12
                }
            }, {
                name: 'selectedBG',
                type: 'nx.graphic.Circle',
                props: {
                    'class': 'selectedBG',
                    'r': 26
                }
            }, {
                type: 'nx.graphic.Group',
                name: 'graphic',
                content: [{
                    name: 'icon',
                    type: 'nx.graphic.Icon',
                    props: {
                        'class': 'icon',
                        'iconType': 'unknown',
                        'showIcon': false,
                        scale: 1
                    }
                }],
                events: {
                    'mousedown': '{#_mousedown}',
                    'mouseup': '{#_mouseup}',

                    'mouseenter': '{#_mouseenter}',
                    'mouseleave': '{#_mouseleave}',

                    'dragstart': '{#_dragstart}',
                    'dragmove': '{#_drag}',
                    'dragend': '{#_dragend}'
                }
            }


            ]
        },
        methods: {
            translateTo: function (x, y, callback, context) {
                var el = this.view();
                var position = this.position();
                el.setTransition(function () {
                    this.position({
                        x: x,
                        y: y
                    });
                    this.calcLabelPosition(true);

                    if (callback) {
                        callback.call(context || this);
                    }
                }, this, 0.5);
                if (position.x == x && position.y == y && callback) {
                    callback.call(context || this);
                } else {
                    el.setTransform(x, y, null, 0.9);
                }

            },
            /**
             * Get node bound
             * @param onlyGraphic {Boolean} is is TRUE, will only get graphic's bound
             * @returns {*}
             */
            getBound: function (onlyGraphic) {
                if (onlyGraphic) {
                    return this.view('graphic').getBound();
                } else {
                    return this.view().getBound();
                }
            },
            _mousedown: function (sender, event) {
                if (this.enable()) {
                    this._prevPosition = this.position();
                    event.captureDrag(this.view('graphic'), this.topology().stage());
                    this.fire('pressNode', event);
                }
            },
            _mouseup: function (sender, event) {
                if (this.enable()) {
                    var _position = this.position();
                    if (this._prevPosition && _position.x === this._prevPosition.x && _position.y === this._prevPosition.y) {
                        /**
                         * Fired when click a node
                         * @event clickNode
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('clickNode', event);
                    }
                }
            },
            _mouseenter: function (sender, event) {
                if (this.enable()) {
                    if (!this.__enter && !this._nodeDragging) {
                        /**
                         * Fired when mouse enter a node
                         * @event enterNode
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('enterNode', event);
                        this.__enter = true;
                    }
                }


            },
            _mouseleave: function (sender, event) {
                if (this.enable()) {
                    if (this.__enter && !this._nodeDragging) {
                        /**
                         * Fired when mouse leave a node
                         * @event leaveNode
                         * @param sender{Object} trigger instance
                         * @param event {Object} original event object
                         */
                        this.fire('leaveNode', event);
                        this.__enter = false;
                    }
                }
            },
            _dragstart: function (sender, event) {
                window.event = event;
                this._nodeDragging = true;
                if (this.enable()) {
                    /**
                     * Fired when start drag a node
                     * @event dragNodeStart
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('dragNodeStart', event);
                }
            },
            _drag: function (sender, event) {
                window.event = event;
                if (this.enable()) {
                    /**
                     * Fired when drag a node
                     * @event dragNode
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('dragNode', event);
                }
            },
            _dragend: function (sender, event) {
                window.event = event;
                this._nodeDragging = false;
                if (this.enable()) {
                    /**
                     * Fired when finish a node
                     * @event dragNodeEnd
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('dragNodeEnd', event);
                    this.updateConnectedNodeLabelPosition();
                }
            },

            updateConnectedNodeLabelPosition: function () {
                this.calcLabelPosition(true);
                this.eachConnectedNode(function (node) {
                    node.calcLabelPosition();
                }, this);
            },
            /**
             * Set label to a node
             * @method calcLabelPosition
             */
            calcLabelPosition: function (force) {
                if (this.enableSmartLabel()) {

                    if (force) {
                        this._centralizedText();
                    } else {
                        //                        clearTimeout(this._centralizedTextTimer || 0);
                        //                        this._centralizedTextTimer = setTimeout(function () {
                        this._centralizedText();
                        //                        }.bind(this), 100);
                    }

                } else {
                    this.updateByMaxObtuseAngle(this.labelAngle());
                }
            },
            _centralizedText: function () {


                //
                var vertex = this.model();

                if (vertex === undefined) {
                    return;
                }

                var vertexID = vertex.id();
                var vectors = [];


                nx.each(vertex.edgeSets(), function (edgeSet) {
                    if (edgeSet.sourceID() !== vertexID) {
                        vectors.push(edgeSet.line().dir.negate());
                    } else {
                        vectors.push(edgeSet.line().dir);
                    }
                }, this);

                nx.each(vertex.edgeSetCollections(), function (esc) {
                    if (esc.sourceID() !== vertexID) {
                        vectors.push(esc.line().dir.negate());
                    } else {
                        vectors.push(esc.line().dir);
                    }
                }, this);


                //sort line by angle;
                vectors = vectors.sort(function (a, b) {
                    return a.circumferentialAngle() - b.circumferentialAngle();
                });


                // get the min incline angle

                var startVector = new nx.geometry.Vector(1, 0);
                var maxAngle = 0,
                    labelAngle;

                if (vectors.length === 0) {
                    labelAngle = 90;
                } else {
                    //add first item to vectors, for compare last item with first

                    vectors.push(vectors[0].rotate(359.9));

                    //find out the max incline angle
                    for (var i = 0; i < vectors.length - 1; i++) {
                        var inclinedAngle = vectors[i + 1].circumferentialAngle() - vectors[i].circumferentialAngle();
                        if (inclinedAngle < 0) {
                            inclinedAngle += 360;
                        }
                        if (inclinedAngle > maxAngle) {
                            maxAngle = inclinedAngle;
                            startVector = vectors[i];
                        }
                    }

                    // bisector angle
                    labelAngle = maxAngle / 2 + startVector.circumferentialAngle();

                    // if max that 360, reduce 360
                    labelAngle %= 360;
                }


                this.updateByMaxObtuseAngle(labelAngle);
            },
            /**
             * @method updateByMaxObtuseAngle
             * @method updateByMaxObtuseAngle
             * @param angle
             */
            updateByMaxObtuseAngle: function (angle) {

                var el = this.view('label');

                // find out the quadrant
                var quadrant = Math.floor(angle / 60);
                var anchor = 'middle';
                if (quadrant === 5 || quadrant === 0) {
                    anchor = 'start';
                } else if (quadrant === 2 || quadrant === 3) {
                    anchor = 'end';
                }

                //
                var size = this.getBound(true);
                var radius = Math.max(size.width / 2, size.height / 2) + (this.showIcon() ? 12 : 8);
                var labelVector = new nx.geometry.Vector(radius, 0).rotate(angle);


                el.set('x', labelVector.x);
                el.set('y', labelVector.y);
                //

                el.set('text-anchor', anchor);

                this._labelAngle = angle;

            },
            dispose: function () {
                clearTimeout(this._centralizedTextTimer);
                this.inherited();
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {
    var util = nx.util;
    /**
     * Nodes layer
     Could use topo.getLayer('nodes') get this
     * @class nx.graphic.Topology.NodesLayer
     * @extend nx.graphic.Topology.Layer
     *
     */
    var CLZ = nx.define('nx.graphic.Topology.NodesLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {}
        },
        events: ['clickNode', 'enterNode', 'leaveNode', 'dragNodeStart', 'dragNode', 'dragNodeEnd', 'hideNode', 'pressNode', 'selectNode', 'updateNodeCoordinate'],
        properties: {
            /**
             * Get all nodes instance
             * @property nodes {Array}
             */
            nodes: {
                get: function () {
                    return this.nodeDictionary().values().toArray();
                }
            },
            /**
             * Get all nodes instance map
             * @property nodesMap {Object}
             */
            nodesMap: {
                get: function () {
                    return this.nodeDictionary().toObject();
                }
            },
            /**
             * Nodes observable dictionary
             * @property nodeDictionary {nx.data.ObservableDictionary}
             */
            nodeDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args) {
                this.inherited(args);

                var topo = this.topology();
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.nodeDictionary().each(function (item) {
                        item.value().stageScale(value);
                    });
                }, this);

                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.nodeDictionary().each(function (item) {
                        item.value().revisionScale(value);
                    }, this);
                }, this);
            },
            /**
             * Add node a nodes layer
             * @param vertex
             * @method addNode
             */
            addNode: function (vertex) {
                var id = vertex.id();
                var node = this._generateNode(vertex);
                this.nodeDictionary().setItem(id, node);
                return node;
            },

            /**
             * Remove node
             * @method removeNode
             * @param id
             */
            removeNode: function (id) {
                var nodeDictionary = this.nodeDictionary();
                var node = nodeDictionary.getItem(id);
                if (node) {
                    node.dispose();
                    nodeDictionary.removeItem(id);
                }
            },
            updateNode: function (id) {
                var nodeDictionary = this.nodeDictionary();
                var node = nodeDictionary.getItem(id);
                if (node) {
                    node.update();
                }
            },
            //get node instance class
            _getNodeInstanceClass: function (vertex) {
                var Clz;
                var topo = this.topology();
                var nodeInstanceClass = topo.nodeInstanceClass();
                if (nx.is(nodeInstanceClass, 'Function')) {
                    Clz = nodeInstanceClass.call(this, vertex);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, nodeInstanceClass);
                }
                if (!Clz) {
                    throw "Error on instance node class";
                }
                return Clz;
            },

            _generateNode: function (vertex) {
                var id = vertex.id();
                var topo = this.topology();
                var stageScale = topo.stageScale();
                var Clz = this._getNodeInstanceClass(vertex);
                var node = new Clz({
                    topology: topo
                });
                node.setModel(vertex);
                node.attach(this.view());

                node.sets({
                    'class': 'node',
                    'data-id': id,
                    'stageScale': stageScale
                });


                this.updateDefaultSetting(node);
                //                setTimeout(function () {
                //                    this.updateDefaultSetting(node);
                //                }.bind(this), 0);
                return node;
            },


            updateDefaultSetting: function (node) {
                var topo = this.topology();
                // delegate events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(node.__events__, function (e) {
                    if (superEvents.indexOf(e) == -1) {
                        node.on(e, function (sender, event) {
                            if (event instanceof MouseEvent) {
                                window.event = event;
                            }
                            this.fire(e, node);
                        }, this);
                    }
                }, this);

                //properties
                var nodeConfig = this.nodeConfig = nx.extend({
                    enableSmartLabel: topo.enableSmartLabel()
                }, CLZ.defaultConfig, topo.nodeConfig());
                delete nodeConfig.__owner__;
                nx.each(nodeConfig, function (value, key) {
                    util.setProperty(node, key, value, topo);
                }, this);

                util.setProperty(node, 'showIcon', topo.showIcon());

                if (topo.revisionScale() !== 1) {
                    node.revisionScale(topo.revisionScale());
                }


            },

            /**
             * Iterate all nodes
             * @method eachNode
             * @param callback
             * @param context
             */
            eachNode: function (callback, context) {
                this.nodeDictionary().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            /**
             * Get node by id
             * @param id
             * @returns {*}
             * @method getNode
             */
            getNode: function (id) {
                return this.nodeDictionary().getItem(id);
            },
            clear: function () {
                this.eachNode(function (node) {
                    node.dispose();
                });
                this.nodeDictionary().clear();
                this.inherited();

            },
            dispose: function () {
                this.clear();
                var topo = this.topology();
                if (topo) {
                    this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                    this.topology().unwatch('revisionScale', this.__watchRevisionScale, this);
                    if (topo._activeNodesWatcher) {
                        topo._activeNodesWatcher.dispose();
                    }
                    if (topo._highlightedNodesWatcher) {
                        topo._highlightedNodesWatcher.dispose();
                    }

                }


                this.inherited();
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     * NodeSet class
     * @class nx.graphic.Topology.NodeSet
     * @extend nx.graphic.Topology.Node
     * @module nx.graphic.Topology
     */

    nx.define("nx.graphic.Topology.NodeSet", nx.graphic.Topology.Node, {
        events: ['expandNode', 'collapseNode', 'beforeExpandNode', 'beforeCollapseNode'],
        properties: {
            /**
             * Get all sub nodes
             */
            nodes: {
                get: function () {
                    var nodes = {};
                    var topo = this.topology();
                    var model = this.model();
                    if (this.model().activated()) {
                        return;
                    }
                    nx.each(model.vertices(), function (vertex, id) {
                        var node = topo.getNode(id);
                        if (node) {
                            nodes[id] = node;
                        }
                    });

                    nx.each(model.vertexSet(), function (vertexSet, id) {
                        var nodeSet = topo.getNode(id);
                        if (nodeSet) {
                            if (nodeSet.activated()) {
                                nodes[id] = nodeSet;
                            } else {
                                nx.extend(nodes, nodeSet.nodes());
                            }
                        }
                    });
                    return nodes;
                }
            },
            nodeSets: {
                get: function () {
                    var nodeSets = {};
                    var topo = this.topology();
                    var model = this.model();
                    model.eachSubVertexSet(function (vertexSet, id) {
                        var nodeSet = topo.getNode(id);
                        if (nodeSet) {
                            nodeSets[id] = nodeSet;
                        }
                    }, this);
                    return nodeSets;
                }
            },
            /**
             * Collapsed statues
             * @property collapsed
             */
            collapsed: {
                get: function () {
                    return this._collapsed !== undefined ? this._collapsed : true;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._collapsed !== value) {
                        this._collapsed = value;
                        if (value) {
                            this.collapse(this._animation);
                        } else {
                            this.expand(this._animation);
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            activated: {
                value: true
            },
            /**
             * Show/hide node's icon
             * @property showIcon
             */
            showIcon: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._showIcon = value;

                    this.view('icon').set('showIcon', value);
                    this.view('icon').set('visible', value);

                    if (this._label != null) {
                        this.calcLabelPosition();
                    }
                    if (this._selected) {
                        this.view('selectedBG').set('r', this.selectedRingRadius());
                    }

                    this._updateMinusIcon();
                }
            },
            revisionScale: {
                set: function (value) {
                    var topo = this.topology();
                    var icon = this.view('icon');
                    icon.set('scale', value);
                    if (topo.showIcon()) {
                        icon.showIcon(value > 0.2);
                        icon.set('visible', value > 0.2);
                    } else {
                        icon.showIcon(false);
                        icon.set('visible', false);
                    }
                    this._updateMinusIcon(value);

                    if (this._labelVisible) {
                        this.view('label').set('visible', value > 0.4);
                    }
                }
            },
            animation: {
                value: true
            }
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'node'
            },
            content: [{
                name: 'label',
                type: 'nx.graphic.Text',
                props: {
                    'class': 'node-label',
                    'alignment-baseline': 'central',
                    y: 12
                }
            }, {
                name: 'selectedBG',
                type: 'nx.graphic.Circle',
                props: {
                    'class': 'selectedBG',
                    'r': 26
                }
            }, {
                type: 'nx.graphic.Group',
                name: 'graphic',
                content: [{
                    name: 'icon',
                    type: 'nx.graphic.Icon',
                    props: {
                        'class': 'icon',
                        'iconType': 'unknown',
                        'showIcon': false,
                        scale: 1
                    }
                }, {
                    name: 'minus',
                    type: 'nx.graphic.Icon',
                    props: {
                        'class': 'indicator',
                        'iconType': 'expand',
                        scale: 1
                    }
                }],
                events: {
                    'mousedown': '{#_mousedown}',
                    'mouseup': '{#_mouseup}',

                    'mouseenter': '{#_mouseenter}',
                    'mouseleave': '{#_mouseleave}',

                    'dragstart': '{#_dragstart}',
                    'dragmove': '{#_drag}',
                    'dragend': '{#_dragend}'
                }
            }


            ]
        },
        methods: {
            setModel: function (model) {
                this.inherited(model);
                this.setBinding('activated', 'model.activated,direction=<>', this);
            },
            update: function () {
                //                this.view().visible(this.model().activated() && this.model().inheritedVisible());
            },
            expand: function (animation, callback, context) {
                // remember the animation status
                var _animation = this.animation();
                this.animation(typeof animation === "boolean" ? animation : _animation);
                // prepare to expand
                this._collapsed = false;
                this.selected(false);
                this.model().activated(false);
                this.fire('beforeExpandNode', this);
                // expand
                this.topology().expandNodes(this.nodes(), this.position(), function () {
                    // set the result
                    this.fire('expandNode', this);
                    /* jslint -W030 */
                    callback && callback.call(context, this, this);
                }, this, this.animation());
                // restore the animation
                this.animation(_animation);
            },
            collapse: function (animation, callback, context) {
                // remember the animation status
                var _animation = this.animation();
                this.animation(typeof animation === "boolean" ? animation : _animation);
                // prepare to expand
                this._collapsed = true;
                this.selected(false);
                this.model().activated(false);
                this.fire('beforeCollapseNode');
                this.topology().collapseNodes(this.nodes(), this.position(), function () {
                    this.model().activated(true);
                    this.fire('collapseNode', this);
                    /* jslint -W030 */
                    callback && callback.call(context, this, this);
                }, this, this.animation());
                // restore the animation
                this.animation(_animation);
            },
            expandNodes: function (callback, context) {
                if (!this.model().activated()) {
                    this.topology().expandNodes(this.nodes(), this.position(), callback, context);
                }
            },
            collapseNodes: function (callback, context) {
                this.topology().collapseNodes(this.nodes(), this.position(), callback, context);
            },
            _updateMinusIcon: function (revisionScale) {
                var icon = this.view('icon');
                var minus = this.view('minus');
                if (icon.showIcon()) {

                    if (revisionScale == 0.4) {
                        minus.scale(0.8);
                    } else {
                        minus.scale(1);
                    }

                    var iconSize = icon.size();
                    var iconScale = icon.scale();

                    minus.setTransform(iconSize.width * iconScale / 2, iconSize.height * iconScale / 2);

                    //if (nx.util.isFirefox()) {
                    //    minus.setTransform(iconSize.width * iconScale / 2, iconSize.height * iconScale / 2);
                    //} else {
                    //
                    //}
                } else {
                    minus.setTransform(0, 0);
                }
            }
        }

    });

})(nx, nx.global);

(function (nx, global) {
    var util = nx.util;
    var CLZ = nx.define('nx.graphic.Topology.NodeSetLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {
                iconType: 'nodeSet',
                label: 'model.label'
            }
        },
        events: ['clickNodeSet', 'enterNodeSet', 'leaveNodeSet', 'dragNodeSetStart', 'dragNodeSet', 'dragNodeSetEnd', 'hideNodeSet', 'pressNodeSet', 'selectNodeSet', 'updateNodeSetCoordinate', 'expandNodeSet', 'collapseNodeSet', 'beforeExpandNodeSet', 'beforeCollapseNodeSet', 'updateNodeSet', 'removeNodeSet'],
        properties: {
            nodeSets: {
                get: function () {
                    return this.nodeSetDictionary().values().toArray();
                }
            },
            nodeSetMap: {
                get: function () {
                    return this.nodeSetDictionary().toObject();
                }
            },
            nodeSetDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args, index) {
                this.inherited(args, index);
                var topo = this.topology();
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.eachNodeSet(function (nodeSet) {
                        nodeSet.stageScale(value);
                    });
                }, this);

                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.eachNodeSet(function (nodeSet) {
                        nodeSet.revisionScale(value);
                    }, this);
                }, this);

            },
            addNodeSet: function (vertexSet) {
                var id = vertexSet.id();
                var nodeSet = this._generateNodeSet(vertexSet);
                this.nodeSetDictionary().setItem(id, nodeSet);
                return nodeSet;
            },

            removeNodeSet: function (id) {
                var nodeSetDictionary = this.nodeSetDictionary();
                var nodeSet = nodeSetDictionary.getItem(id);
                if (nodeSet) {
                    this.fire('removeNodeSet', nodeSet);
                    nodeSet.dispose();
                    nodeSetDictionary.removeItem(id);
                }
            },
            updateNodeSet: function (id) {
                var nodeSetDictionary = this.nodeSetDictionary();
                var nodeSet = nodeSetDictionary.getItem(id);
                if (nodeSet) {
                    nodeSet.update();
                    this.fire('updateNodeSet', nodeSet);
                }
            },
            _getNodeSetInstanceClass: function (vertexSet) {
                var Clz;
                var topo = this.topology();
                var nodeSetInstanceClass = topo.nodeSetInstanceClass();
                if (nx.is(nodeSetInstanceClass, 'Function')) {
                    Clz = nodeSetInstanceClass.call(this, vertexSet);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, nodeSetInstanceClass);
                }

                if (!Clz) {
                    throw "Error on instance node set class";
                }
                return Clz;

            },
            _generateNodeSet: function (vertexSet) {
                var id = vertexSet.id();
                var topo = this.topology();
                var stageScale = topo.stageScale();
                var Clz = this._getNodeSetInstanceClass(vertexSet);

                var nodeSet = new Clz({
                    topology: topo
                });
                nodeSet.setModel(vertexSet);
                nodeSet.attach(this.view());

                nodeSet.sets({
                    'data-id': id,
                    'class': 'node nodeset',
                    stageScale: stageScale
                }, topo);

//                setTimeout(function () {
                this.updateDefaultSetting(nodeSet);
//                }.bind(this), 0);
                return nodeSet;


            },
            updateDefaultSetting: function (nodeSet) {
                var topo = this.topology();


                //register events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(nodeSet.__events__, function (e) {
                    if (superEvents.indexOf(e) == -1) {
                        nodeSet.on(e, function (sender, event) {
                            if (event instanceof MouseEvent) {
                                window.event = event;
                            }
                            this.fire(e.replace('Node', 'NodeSet'), nodeSet);
                        }, this);
                    }
                }, this);


                var nodeSetConfig = nx.extend({enableSmartLabel: topo.enableSmartLabel()}, CLZ.defaultConfig, topo.nodeSetConfig());
                delete nodeSetConfig.__owner__;

                nx.each(nodeSetConfig, function (value, key) {
                    util.setProperty(nodeSet, key, value, topo);
                }, this);

                util.setProperty(nodeSet, 'showIcon', topo.showIcon());

                if (topo.revisionScale() !== 1) {
                    nodeSet.revisionScale(topo.revisionScale());
                }

            },
            /**
             * Get node by id
             * @param id
             * @returns {*}
             * @method getNode
             */
            getNodeSet: function (id) {
                return this.nodeSetDictionary().getItem(id);
            },
            /**
             * Iterate all nodeSet
             * @method eachNode
             * @param callback
             * @param context
             */
            eachNodeSet: function (callback, context) {
                this.nodeSetDictionary().each(function (item, id) {
                    var nodeSet = item.value();
                    callback.call(context || this, nodeSet, id);
                }, this);
            },
            clear: function () {
                this.eachNodeSet(function (nodeSet) {
                    nodeSet.dispose();
                });
                this.nodeSetDictionary().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                this.topology().unwatch('revisionScale', this.__watchRevisionScale, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;

    /**
     * Abstract link class
     * @class nx.graphic.Topology.AbstractLink
     * @extend nx.graphic.Group
     * @module nx.graphic.Topology
     */
    nx.define('nx.graphic.Topology.AbstractLink', nx.graphic.Group, {
        events: ['hide', 'show', 'remove'],
        properties: {
            /**
             * Get source node's instance
             * @property  sourceNode
             */
            sourceNode: {
                get: function () {
                    var topo = this.topology();
                    var id = this.model().source().id();
                    return topo.getNode(id);
                }
            },
            /**
             * Get target node's instance
             * @property targetNode
             */
            targetNode: {
                get: function () {
                    var topo = this.topology();
                    var id = this.model().target().id();
                    return topo.getNode(id);
                }
            },
            /**
             * Get source node's position
             * @property sourcePosition
             */
            sourcePosition: {
                get: function () {
                    return this.sourceNode().position();
                }
            },
            /**
             * Get target node's position
             * @property targetPosition
             */
            targetPosition: {
                get: function () {
                    return this.targetNode().position();
                }
            },
            /**
             * Get source node's id
             * @property sourceNodeID
             */
            sourceNodeID: {
                get: function () {
                    return this.model().source().id();
                }
            },
            /**
             * Get target node's id
             * @property targetNodeID
             */
            targetNodeID: {
                get: function () {
                    return this.model().target().id();
                }
            },
            /**
             * Get source node's x position
             * @property sourceX
             */
            sourceX: {
                get: function () {
                    return this.sourceNode().x();
                }
            },
            /**
             * Get source node's y position
             * @property sourceY
             */
            sourceY: {
                get: function () {
                    return this.sourceNode().y();
                }
            },
            /**
             * Get target node's x position
             * @property targetX
             */
            targetX: {
                get: function () {
                    return this.targetNode().x();
                }
            },
            /**
             * Get target node's x position
             * @property targetY
             */
            targetY: {
                get: function () {
                    return this.targetNode().y();
                }
            },
            /**
             * Get source node's vector
             * @property sourceVector
             */
            sourceVector: {
                get: function () {
                    return this.sourceNode().vector();
                }
            },
            /**
             * Get target node's vector
             * @property targetVector
             */
            targetVector: {
                get: function () {
                    if (this.targetNode()) {
                        return this.targetNode().vector();
                    }
                }
            },
            position: {
                get: function () {
                    var sourceNode = this.sourceNode().position();
                    var targetNode = this.targetNode().position();
                    return {
                        x1: sourceNode.x || 0,
                        x2: sourceNode.y || 0,
                        y1: targetNode.x || 0,
                        y2: targetNode.y || 0
                    };
                }
            },
            /**
             * Get link's line object
             * @property line
             */
            line: {
                get: function () {
                    return  new Line(this.sourceVector(), this.targetVector());
                }
            },
            /**
             * Get nextTopology instance
             * @property topology
             */
            topology: {
                value: null
            },
            /**
             * Get link's id
             * @property id
             */
            id: {
                get: function () {
                    return this.model().id();
                }
            },
            /**
             * Get link's linkKey
             * @property linkKey
             */
            linkKey: {
                get: function () {
                    return this.model().linkKey();
                }
            },
            /**
             * Get is link is reverse link
             * @property reverse
             */
            reverse: {
                get: function () {
                    return this.model().reverse();
                }
            },
            /**
             * Get this center point's position
             * @property centerPoint
             */
            centerPoint: {
                get: function () {
                    return this.line().center();
                }
            },
            /**
             * Get/set link's usability
             * @property enable
             */
            enable: {
                value: true
            }

        },
        methods: {
            /**
             * Factory function , will be call when set model
             * @method setModel
             */
            setModel: function (model, isUpdate) {
                //
                this.model(model);
                //

                //updateCoordinate

//                model.source().on('updateCoordinate', this._watchS = function () {
//                    this.notify('sourcePosition');
//                    this.update();
//                }, this);
//
//                model.target().on('updateCoordinate', this._watchS = function (prop, value) {
//                    this.notify('sourcePosition');
//                    this.update();
//                }, this);

//                model.source().watch('position', this._watchS = function (prop, value) {
//                    this.notify('sourcePosition');
//                    this.update();
//                }, this);
//
//                model.target().watch('position', this._watchT = function () {
//                    this.notify('targetPosition');
//                    this.update();
//                }, this);


                //bind model's visible with element's visible
                this.setBinding('visible', 'model.visible,direction=<>', this);

                if (isUpdate !== false) {
                    this.update();
                }
            },


            /**
             * Factory function , will be call when relate data updated
             * @method update
             */
            update: function () {
//                this.notify('centerPoint');
//                this.notify('line');
//                this.notify('position');
//                this.notify('targetVector');
//                this.notify('sourceVector');
            },
            dispose: function () {
//                var model = this.model();
//                if (model) {
//                    model.source().unwatch('position', this._watchS, this);
//                    model.target().unwatch('position', this._watchT, this);
//                }
                this.fire('remove');
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;
    /**
     * Link class
     * @class nx.graphic.Topology.Link
     * @extend nx.graphic.Topology.AbstractLink
     * @module nx.graphic.Topology
     */

    var offsetRadix = 5;

    nx.define('nx.graphic.Topology.Link', nx.graphic.Topology.AbstractLink, {
        events: ['pressLink', 'clickLink', 'enterLink', 'leaveLink'],
        properties: {
            /**
             * Get link type 'curve' / 'parallel'
             * @property linkType {String}
             */
            linkType: {
                get: function () {
                    return this._linkType !== undefined ? this._linkType : 'parallel';
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._linkType !== value) {
                        this._linkType = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            /**
             * Get/set link's offset percentage
             * @property offset {Float}
             */
            offsetPercentage: {
                value: 0
            },
            /**
             * Get/set link's offset step
             * @property offsetRadix {Number}
             */
            offsetRadix: {
                value: 5
            },
            /**
             * Get/set link's label, it is shown at the center point
             * @property label {String}
             */
            label: {
                set: function (inValue) {
                    var label = this._processPropertyValue(inValue);
                    var el = this.view('label');
                    if (label != null) {
                        el.append();
                    } else {
                        el.remove();
                    }
                    this._label = label;
                }
            },
            /**
             * Set/get link's color
             * @property color {Color}
             */
            color: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('line').dom().setStyle('stroke', value);
                    this.view('path').dom().setStyle('stroke', value);
                    this._color = value;
                }
            },
            /**
             * Set/get link's width
             * @property width {Number}
             */
            width: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    var width = (this._stageScale || 1) * value;
                    this.view('line').dom().setStyle('stroke-width', width);
                    this.view('path').dom().setStyle('stroke-width', width);
                    this._width = value;
                }
            },
            stageScale: {
                set: function (value) {
                    var width = (this._width || 1) * value;
                    this.view('line').dom().setStyle('stroke-width', width);
                    this.view('path').dom().setStyle('stroke-width', width);
                    //                    this.view('disableLabel').scale(value);
                    this._stageScale = value;
                    this.update();
                }
            },
            /**
             * Set/get is link dotted
             * @property dotted {Boolean}
             */
            dotted: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (value) {
                        this.view('path').dom().setStyle('stroke-dasharray', '2, 5');
                    } else {
                        this.view('path').dom().setStyle('stroke-dasharray', '');
                    }
                    this._dotted = value;
                }
            },
            /**
             * Set link's style
             * @property style {Object}
             */
            style: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('line').dom().setStyles(value);
                    this.view('path').dom().setStyles(value);
                }
            },
            /**
             * Get link's parent linkSet
             * @property parentLinkSet
             */
            parentLinkSet: {

            },
            ///**
            // * Get link's source interface point position
            // * @property sourcePoint
            // */
            //sourcePoint: {
            //    get: function () {
            //        var line = this.getPaddingLine();
            //        return line.start;
            //    }
            //},
            ///**
            // * Get link's target interface point position
            // * @property targetPoint
            // */
            //targetPoint: {
            //    get: function () {
            //        var line = this.getPaddingLine();
            //        return line.end;
            //    }
            //},
            /**
             * Set/get link's usability
             * @property enable {Boolean}
             */
            enable: {
                get: function () {
                    return this._enable != null ? this._enable : true;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this._enable = value;
                    this.dom().setClass("disable", !value);
                    this.update();
                }
            },
            /**
             * Set the link's draw function, after set this property please call update function
             * @property drawMethod {Function}
             */
            drawMethod: {

            },
            revisionScale: {}

        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'link'
            },
            content: [{
                    type: 'nx.graphic.Group',
                    content: [{
                        name: 'path',
                        type: 'nx.graphic.Path',
                        props: {
                            'class': 'link'
                        }
                    }, {
                        name: 'line',
                        type: 'nx.graphic.Line',
                        props: {
                            'class': 'link'
                        }
                    }],
                    events: {
                        'mouseenter': '{#_mouseenter}',
                        'mouseleave': '{#_mouseleave}',
                        'mousedown': '{#_mousedown}',
                        'touchstart': '{#_mousedown}',
                        'mouseup': '{#_mouseup}',
                        'touchend': '{#_mouseup}'
                    }
                }, {
                    name: 'label',
                    type: 'nx.graphic.Group',
                    content: {
                        name: 'labelText',
                        type: 'nx.graphic.Text',
                        props: {
                            'alignment-baseline': 'text-before-edge',
                            'text-anchor': 'middle',
                            'class': 'link-label'
                        }
                    }
                }
            ]
        },
        methods: {

            /**
             * Update link's path
             * @method update
             */
            update: function () {

                this.inherited();

                var _offset = this.getOffset();
                var offset = new Vector(0, _offset);
                var width = (this._width || 1) * (this._stageScale || 1);
                var line = this.reverse() ? this.line().negate() : this.line();
                var d;

                if (this.drawMethod()) {
                    d = this.drawMethod().call(this, this.model(), this);
                    this.view('path').setStyle('display', 'block');
                    this.view('line').setStyle('display', 'none');
                    this.view('path').set('d', d);
                    this.view('path').dom().setStyle('stroke-width', width);

                } else if (this.linkType() == 'curve') {
                    var path = [];
                    var n, point;
                    n = line.normal().multiply(_offset * 3);
                    point = line.center().add(n);
                    path.push('M', line.start.x, line.start.y);
                    path.push('Q', point.x, point.y, line.end.x, line.end.y);
                    d = path.join(' ');

                    this.view('path').setStyle('display', 'block');
                    this.view('line').setStyle('display', 'none');
                    this.view('path').set('d', d);
                    this.view('path').dom().setStyle('stroke-width', width);
                } else {
                    var lineEl = this.view('line');
                    var pathEL = this.view('path');
                    var newLine = line.translate(offset);
                    lineEl.sets({
                        x1: newLine.start.x,
                        y1: newLine.start.y,
                        x2: newLine.end.x,
                        y2: newLine.end.y
                    });
                    pathEL.setStyle('display', 'none');
                    lineEl.setStyle('display', 'block');
                    lineEl.setStyle('stroke-width', width);

                    //                    var path = [];
                    //                    var n, point;
                    //                    path.push('M', line.start.x, line.start.y);
                    //                    path.push('L', line.end.x, line.end.y);
                    //                    d = path.join(' ');
                    //
                    //                    pathEL.setStyle('display', 'block');
                    //                    lineEl.setStyle('display', 'none');
                    //                    pathEL.set('d', d);
                    //                    lineEl.setStyle('stroke-width', width);
                }


                this._updateLabel();
            },
            /**
             * Get link's padding Line
             * @method getPaddingLine
             * @returns {*}
             */
            getPaddingLine: function () {
                var _offset = this.offset() * offsetRadix;
                var sourceSize = this.sourceNode().getBound(true);
                var sourceRadius = Math.max(sourceSize.width, sourceSize.height) / 1.3;
                var targetSize = this.targetNode().getBound(true);
                var targetRadius = Math.max(targetSize.width, targetSize.height) / 1.3;
                var line = this.line().pad(sourceRadius, targetRadius);
                var n = line.normal().multiply(_offset);
                return line.translate(n);
            },
            /**
             * Get calculated offset number
             * @method getoffset
             * @returns {number}
             */
            getOffset: function () {
                if (this.linkType() == 'parallel') {
                    return this.offsetPercentage() * this.offsetRadix() * this._stageScale;
                } else {
                    return this.offsetPercentage() * this.offsetRadix(); //* this._stageScale;
                }

            },
            _updateLabel: function () {
                var el, point;
                var _offset = this.getOffset();
                var line = this.line();
                var n = line.normal().multiply(_offset);
                if (this._label != null) {
                    el = this.view('label');
                    point = line.center().add(n);
                    el.setTransform(point.x, point.y, this.stageScale());
                    this.view('labelText').set('text', this._label);
                }
            },
            _mousedown: function () {
                if (this.enable()) {
                    /**
                     * Fired when mouse down on link
                     * @event pressLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressLink');
                }
            },
            _mouseup: function () {
                if (this.enable()) {
                    /**
                     * Fired when click link
                     * @event clickLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('clickLink');
                }
            },
            _mouseleave: function () {
                if (this.enable()) {
                    /**
                     * Fired when mouse leave link
                     * @event leaveLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('leaveLink');
                }
            },
            _mouseenter: function () {
                if (this.enable()) {
                    /**
                     * Fired when mouse enter link
                     * @event enterLink
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('enterLink');
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {
    var util = nx.util;

    /**
     * Links layer
     Could use topo.getLayer('links') get this
     * @class nx.graphic.Topology.LinksLayer
     * @extend nx.graphic.Topology.Layer
     */

    var CLZ = nx.define('nx.graphic.Topology.LinksLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {
                linkType: 'parallel',
                label: null,
                color: null,
                width: null,
                enable: true
            }
        },
        events: ['pressLink', 'clickLink', 'enterLink', 'leaveLink'],
        properties: {
            links: {
                get: function () {
                    return this.linkDictionary().values().toArray();
                }
            },
            linkMap: {
                get: function () {
                    return this.linkDictionary().toObject();
                }
            },
            linkDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args) {
                this.inherited(args);
                var topo = this.topology();
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.eachLink(function (link) {
                        link.stageScale(value);
                    });
                }, this);

                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.eachLink(function (link) {
                        link.revisionScale(value);
                    });
                }, this);
            },
            /**
             * Add a link
             * @param edge
             * @method addLink
             */

            addLink: function (edge) {
                var id = edge.id();
                var link = this._generateLink(edge);
                this.linkDictionary().setItem(id, link);
                return link;
            },
            /**
             * Remove a link
             * @param id {String}
             */
            removeLink: function (id) {
                var linkDictionary = this.linkDictionary();
                var link = linkDictionary.getItem(id);
                if (link) {
                    link.dispose();
                    linkDictionary.removeItem(id);
                }
            },
            /**
             * Update link
             * @method updateLink
             * @param id {String}
             */
            updateLink: function (id) {
                this.linkDictionary().getItem(id).update();
            },

            //get link instance class
            _getLinkInstanceClass: function (edge) {
                var Clz;
                var topo = this.topology();
                var linkInstanceClass = topo.linkInstanceClass();
                if (nx.is(linkInstanceClass, 'Function')) {
                    Clz = linkInstanceClass.call(this, edge);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, linkInstanceClass);
                }
                if (!Clz) {
                    throw "Error on instance link class";
                }
                return Clz;
            },


            _generateLink: function (edge) {
                var id = edge.id();
                var topo = this.topology();
                var Clz = this._getLinkInstanceClass(edge);
                var link = new Clz({
                    topology: topo
                });
                //set model
                link.setModel(edge, false);
                link.attach(this.view());

                link.view().sets({
                    'class': 'link',
                    'data-id': id
                });



//                setTimeout(function () {
                this.updateDefaultSetting(link);
//                }.bind(this), 0);

                return link;

            },
            updateDefaultSetting: function (link) {
                var topo = this.topology();
                //delegate link's events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(link.__events__, function (e) {
                    if (superEvents.indexOf(e) == -1) {
                        link.on(e, function (sender, event) {
                            this.fire(e, link);
                        }, this);
                    }
                }, this);
                //set properties
                var linkConfig = nx.extend({}, CLZ.defaultConfig, topo.linkConfig());
                delete  linkConfig.__owner__;

                nx.each(linkConfig, function (value, key) {
                    util.setProperty(link, key, value, topo);
                }, this);

                if (nx.DEBUG) {
                    var edge = link.model();
                    link.view().sets({
                        'data-linkKey': edge.linkKey(),
                        'data-source-node-id': edge.source().id(),
                        'data-target-node-id': edge.target().id()
                    });
                }

                link.stageScale(topo.stageScale());

                link.update();
            },


            /**
             * Traverse all links
             * @param callback
             * @param context
             * @method eachLink
             */
            eachLink: function (callback, context) {
                this.linkDictionary().each(function (item, id) {
                    callback.call(context || this, item.value(), id);
                });
            },
            /**
             * Get link by id
             * @param id
             * @returns {*}
             */
            getLink: function (id) {
                return this.linkDictionary().getItem(id);
            },
            /**
             * Highlight links
             * @method highlightLinks
             * @param links {Array} links array
             */
            highlightLinks: function (links) {
                this.highlightedElements().addRange(links);
            },
            activeLinks: function (links) {
                this.activeElements().addRange(links);
            },
            /**
             * Clear links layer
             * @method clear
             */
            clear: function () {
                this.eachLink(function (link) {
                    link.dispose();
                });

                this.linkDictionary().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;

    /**
     * LinkSet class
     * @class nx.graphic.Topology.LinkSet
     * @extend nx.graphic.Topology.AbstractLink
     * @module nx.graphic.Topology
     */


    nx.define('nx.graphic.Topology.LinkSet', nx.graphic.Topology.AbstractLink, {
        events: ['pressLinkSetNumber', 'clickLinkSetNumber', 'enterLinkSetNumber', 'leaveLinkSetNumber', 'collapseLinkSet', 'expandLinkSet'],
        properties: {
            /**
             * Get link type 'curve' / 'parallel'
             * @property linkType {String}
             */
            linkType: {
                get: function () {
                    return this._linkType || 'parallel';
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    if (this._linkType !== value) {
                        this._linkType = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            /**
             * Sub links collection
             * @property links
             * @readOnly
             */
            links: {
                get: function () {
                    var links = {};
                    this.eachLink(function (link, id) {
                        links[id] = link;
                    }, this);
                    return links;
                }
            },
            /**
             * LinkSet's color
             * @property color
             */
            color: {
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.view('numBg').dom().setStyle('fill', value);
                    this.view('path').dom().setStyle('stroke', value);
                    this._color = value;
                }
            },
            stageScale: {
                set: function (value) {
                    this.view('path').dom().setStyle('stroke-width', value);
                    this.view('number').setTransform(null, null, value);
                    /* jshint -W030 */
                    this.model() && this._updateLinksOffset();
                    this._stageScale = value;
                }
            },
            /**
             * Set/get link's usability
             * @property enable {Boolean}
             */
            enable: {
                get: function () {
                    return this._enable === undefined ? true : this._enable;
                },
                set: function (inValue) {
                    var value = this._processPropertyValue(inValue);
                    this.dom().setClass("disable", !value);
                    this._enable = value;
                    this.eachLink(function (link) {
                        link.enable(value);
                    });
                }
            },
            /**
             * Collapsed statues
             * @property collapsed
             */
            collapsedRule: {
                value: false
            },
            activated: {
                value: true
            },
            revisionScale: {
                set: function (value) {
                    var strokeWidth = value < 0.6 ? 8 : 12;
                    this.view('numBg').dom().setStyle('stroke-width', strokeWidth);

                    var fontSize = value < 0.6 ? 8 : 10;
                    this.view('num').dom().setStyle('font-size', fontSize);

                    this.view('number').visible(value !== 0.2);


                }


            }
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                'data-type': 'links-sum',
                'class': 'link-set'
            },
            content: [{
                    name: 'path',
                    type: 'nx.graphic.Line',
                    props: {
                        'class': 'link-set-bg'
                    }
                }, {
                    name: 'number',
                    type: 'nx.graphic.Group',
                    content: [{
                        name: 'numBg',
                        type: 'nx.graphic.Rect',
                        props: {
                            'class': 'link-set-circle',
                            height: 1
                        },
                        events: {
                            'mousedown': '{#_number_mouseup}',
                            'mouseenter': '{#_number_mouseenter}',
                            'mouseleave': '{#_number_mouseleave}'
                        }
                    }, {
                        name: 'num',
                        type: 'nx.graphic.Text',
                        props: {
                            'class': 'link-set-text',
                            y: 1
                        }
                    }]
                }

            ]
        },
        methods: {
            setModel: function (model, isUpdate) {
                this.inherited(model, isUpdate);
                this.setBinding('activated', 'model.activated,direction=<>', this);
            },
            update: function () {
                if (this._activated) {
                    var line = this.line();
                    this.view('path').sets({
                        x1: line.start.x,
                        y1: line.start.y,
                        x2: line.end.x,
                        y2: line.end.y
                    });
                    //num
                    var centerPoint = this.centerPoint();
                    this.view('number').setTransform(centerPoint.x, centerPoint.y);
                }
            },
            /**
             * Update linkSet
             * @property updateLinkSet
             */
            updateLinkSet: function () {
                var value = this._processPropertyValue(this.collapsedRule());
                this.model().activated(value, {
                    force: true
                });
                if (value) {
                    this.append();
                    this.update();
                    this._updateLinkNumber();
                    /**
                     * Fired when collapse linkSet
                     * @event collapseLinkSet
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('collapseLinkSet');
                } else {
                    /* jshint -W030 */
                    this.parent() && this.remove();
                    this._updateLinksOffset();
                    /**
                     * Fired when expend linkSet
                     * @event expandLinkSet
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('expandLinkSet');
                }
            },
            /**
             * Iterate all sub links
             * @method eachLink
             * @param callback {Function}
             * @param context {Object}
             */
            eachLink: function (callback, context) {
                var topo = this.topology();
                var model = this.model();

                nx.each(model.edges(), function (edge, id) {
                    var link = topo.getLink(id);
                    if (link) {
                        callback.call(context || this, link, id);
                    }
                });
            },

            _updateLinkNumber: function () {
                var edges = Object.keys(this.model().edges());
                var numEl = this.view('num');
                var numBg = this.view('numBg');
                if (edges.length == 1) {
                    numEl.visible(false);
                    numBg.visible(false);

                } else {
                    numEl.sets({
                        text: edges.length,
                        visible: true
                    });

                    var bound = numEl.getBound();
                    var width = Math.max(bound.width - 6, 1);

                    numBg.sets({
                        width: width,
                        visible: true
                    });
                    numBg.setTransform(width / -2);
                }

            },
            _updateLinksOffset: function () {
                if (!this._activated) {
                    var obj = {};
                    this.eachLink(function (link, id) {
                        var edge = link.model();
                        var linkKey = edge.linkKey();
                        var ary = obj[linkKey] = obj[linkKey] || [];
                        ary.push(link);
                    }, this);

                    nx.each(obj, function (links, linkKey) {
                        if (links.length > 1) {
                            var offset = (links.length - 1) / 2;
                            nx.each(links, function (link, index) {
                                link.offsetPercentage(index * -1 + offset);
                                link.update();
                            }, this);
                        }
                    }, this);
                }
            },


            _number_mousedown: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when press number element
                     * @event pressLinkSetNumber
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('pressLinkSetNumber', event);
                }
            },
            _number_mouseup: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when click number element
                     * @event clickLinkSetNumber
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('clickLinkSetNumber', event);
                }
            },
            _number_mouseleave: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when mouse leave number element
                     * @event numberleave
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('numberleave', event);
                }
            },
            _number_mouseenter: function (sender, event) {
                if (this.enable()) {
                    /**
                     * Fired when mouse enter number element
                     * @event numberenter
                     * @param sender{Object} trigger instance
                     * @param event {Object} original event object
                     */
                    this.fire('numberenter', event);
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    var util = nx.util;

    /** Links layer
     Could use topo.getLayer('linkSet') get this
     * @class nx.graphic.Topology.LinksLayer
     * @extend nx.graphic.Topology.Layer
     */

    var CLZ = nx.define('nx.graphic.Topology.LinkSetLayer', nx.graphic.Topology.Layer, {
        statics: {
            defaultConfig: {
                label: null,
                sourceLabel: null,
                targetLabel: null,
                color: null,
                width: null,
                dotted: false,
                style: null,
                enable: true,
                collapsedRule: function (model) {
                    if (model.type() == 'edgeSetCollection') {
                        return true;
                    }
                    var linkType = this.linkType();
                    var edges = Object.keys(model.edges());
                    var maxLinkNumber = linkType === 'curve' ? 9 : 5;
                    return edges.length > maxLinkNumber;
                }
            }
        },
        events: ['pressLinkSetNumber', 'clickLinkSetNumber', 'enterLinkSetNumber', 'leaveLinkSetNumber', 'collapseLinkSet', 'expandLinkSet'],
        properties: {
            linkSets: {
                get: function () {
                    return this.linkSetDictionary().values().toArray();
                }
            },
            linkSetMap: {
                get: function () {
                    return this.linkSetDictionary().toObject();
                }
            },
            linkSetDictionary: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            }
        },
        methods: {
            attach: function (args) {
                this.inherited(args);

                var topo = this.topology();
                //watch stageScale
                topo.watch('stageScale', this.__watchStageScaleFN = function (prop, value) {
                    this.eachLinkSet(function (linkSet) {
                        linkSet.stageScale(value);
                    });
                }, this);
                topo.watch('revisionScale', this.__watchRevisionScale = function (prop, value) {
                    this.eachLinkSet(function (linkSet) {
                        linkSet.revisionScale(value);
                    });
                }, this);

            },
            addLinkSet: function (edgeSet) {
                var linkSetDictionary = this.linkSetDictionary();
                var linkSet = this._generateLinkSet(edgeSet);
                linkSetDictionary.setItem(edgeSet.linkKey(), linkSet);
                return linkSet;
            },
            updateLinkSet: function (linkKey) {
                this.linkSetDictionary().getItem(linkKey).updateLinkSet();

            },
            removeLinkSet: function (linkKey) {
                var linkSetDictionary = this.linkSetDictionary();
                var linkSet = linkSetDictionary.getItem(linkKey);
                if (linkSet) {
                    linkSet.dispose();
                    linkSetDictionary.removeItem(linkKey);
                    return true;
                } else {
                    return false;
                }
            },

            _getLinkSetInstanceClass: function (edgeSet) {
                var Clz;
                var topo = this.topology();
                var nodeSetInstanceClass = topo.linkSetInstanceClass();
                if (nx.is(nodeSetInstanceClass, 'Function')) {
                    Clz = nodeSetInstanceClass.call(this, edgeSet);
                    if (nx.is(Clz, 'String')) {
                        Clz = nx.path(global, Clz);
                    }
                } else {
                    Clz = nx.path(global, nodeSetInstanceClass);
                }

                if (!Clz) {
                    throw "Error on instance linkSet class";
                }
                return Clz;

            },

            _generateLinkSet: function (edgeSet) {
                var topo = this.topology();
                var Clz = this._getLinkSetInstanceClass(edgeSet);
                var linkSet = new Clz({
                    topology: topo
                });
                //set model
                linkSet.setModel(edgeSet, false);
                linkSet.attach(this.view());


//                setTimeout(function () {
                this.updateDefaultSetting(linkSet);
//                }.bind(this), 0);

                return linkSet;


            },
            updateDefaultSetting: function (linkSet) {
                var topo = this.topology();


                //delegate elements events
                var superEvents = nx.graphic.Component.__events__;
                nx.each(linkSet.__events__, function (e) {
                    //exclude basic events
                    if (superEvents.indexOf(e) == -1) {
                        linkSet.on(e, function (sender, event) {
                            this.fire(e, linkSet);
                        }, this);
                    }
                }, this);

                //set properties
                var linkSetConfig = nx.extend({}, CLZ.defaultConfig, topo.linkSetConfig());
                delete linkSetConfig.__owner__; //fix bug


                linkSetConfig.linkType = (topo.linkConfig() && topo.linkConfig().linkType) || nx.graphic.Topology.LinksLayer.defaultConfig.linkType;


                nx.each(linkSetConfig, function (value, key) {
                    util.setProperty(linkSet, key, value, topo);
                }, this);

                linkSet.stageScale(topo.stageScale());


                if (nx.DEBUG) {
                    var edgeSet = linkSet.model();
                    //set element attribute
                    linkSet.view().sets({
                        'data-nx-type': 'nx.graphic.Topology.LinkSet',
                        'data-linkKey': edgeSet.linkKey(),
                        'data-source-node-id': edgeSet.source().id(),
                        'data-target-node-id': edgeSet.target().id()

                    });

                }

                linkSet.updateLinkSet();
                return linkSet;

            },
            /**
             * Iterate all linkSet
             * @method eachLinkSet
             * @param callback {Function}
             * @param context {Object}
             */
            eachLinkSet: function (callback, context) {
                this.linkSetDictionary().each(function (item, linkKey) {
                    callback.call(context || this, item.value(), linkKey);
                });
            },
            /**
             * Get linkSet by source node id and target node id
             * @method getLinkSet
             * @param sourceVertexID {String}
             * @param targetVertexID {String}
             * @returns {nx.graphic.LinkSet}
             */
            getLinkSet: function (sourceVertexID, targetVertexID) {
                var topo = this.topology();
                var edgeSet = topo.graph().getEdgeSetBySourceAndTarget(sourceVertexID, targetVertexID);
                if (edgeSet) {
                    return this.getLinkSetByLinkKey(edgeSet.linkKey());
                } else {
                    return null;
                }
            },
            /**
             * Get linkSet by linkKey
             * @method getLinkSetByLinkKey
             * @param linkKey {String} linkKey
             * @returns {nx.graphic.Topology.LinkSet}
             */
            getLinkSetByLinkKey: function (linkKey) {
                return this.linkSetDictionary().getItem(linkKey);
            },
            /**
             * Highlight linkSet
             * @method highlightlinkSets
             * @param linkSets {Array} linkSet array
             */
            highlightLinkSets: function (linkSets) {
                this.highlightedElements().addRange(linkSets);
            },
            /**
             * Active linkSet
             * @method highlightlinkSets
             * @param linkSets {Array} linkSet array
             */
            activeLinkSets: function (linkSets) {
                this.activeElements().addRange(linkSets);
            },
            /**
             * Clear links layer
             * @method clear
             */
            clear: function () {
                this.eachLinkSet(function (linkSet) {
                    linkSet.dispose();
                });
                this.linkSetDictionary().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                this.topology().unwatch('stageScale', this.__watchStageScaleFN, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    nx.define("nx.graphic.Topology.HierarchicalLayout", {
        properties: {
            topology: {},
            levelBy: {
                value: function () {
                    return function (inNode) {
                        return inNode.model().get("role");
                    };
                }
            },
            sortOrder: {
                value: function () {
                    return [];
                }
            },
            direction: { // horizontal,vertical
                value: 'vertical'
            },
            order: {

            },
            nodesPositionObject: {

            },
            groups: {}
        },
        methods: {

            process: function (graph, config, callback) {
                var groups = this._group(graph, config || {});
                var nodesPositionObject = this._calc(groups, config || {});

                this._layout(nodesPositionObject, callback);
            },
            _group: function (graph, config) {
                var groups = {'__other__': []};
                var topo = this.topology();
                var levelBy = config.levelBy || this.levelBy();
                topo.eachNode(function (node) {
                    var key;
                    if (nx.is(levelBy, 'String') && levelBy.substr(5) == 'model') {
                        key = node.model().get(levelBy.substring(6));
                    } else {
                        key = levelBy.call(topo, node, node.model());
                    }

                    if (key) {
                        var group = groups[key] = groups[key] || [];
                        group.push(node);
                    } else {
                        groups.__other__.push(node);
                    }

                });
                return groups;
            },
            _calc: function (groups, config) {
                var nodesPositionObject = {}, keys = Object.keys(groups);
                var topo = this.topology();
                var sortOrder = config.sortOrder || this.sortOrder() || [];

                //build order array, and move __other__ to the last

                var order = [];
                nx.each(sortOrder, function (v) {
                    var index = keys.indexOf(v);
                    if (index !== -1) {
                        order.push(v);
                        keys.splice(index, 1);
                    }
                });
                keys.splice(keys.indexOf('__other__'), 1);
                order = order.concat(keys, ['__other__']);
                groups = this._sort(groups, order);

                //var y = 0;

                var padding = topo.padding();
                var width = topo.width() - padding * 2;
                var height = topo.height() - padding * 2;

                var direction = this.direction();


                var perY = height / (order.length + 1);
                var perX = width / (order.length + 1);
                var x = perX, y = perY;

                //'vertical'

                nx.each(order, function (key) {
                    if (groups[key]) {

                        if (direction == 'vertical') {
                            //build nodes position map
                            perX = width / (groups[key].length + 1);
                            nx.each(groups[key], function (node, i) {
                                nodesPositionObject[node.id()] = {
                                    x: perX * (i + 1),
                                    y: y
                                };
                            });
                            y += perY;
                        } else {
                            //build nodes position map
                            perY = height / (groups[key].length + 1);
                            nx.each(groups[key], function (node, i) {
                                nodesPositionObject[node.id()] = {
                                    x: x,
                                    y: perY * (i + 1)
                                };
                            });
                            x += perX;
                        }


                        delete groups[key];
                    }
                });

                this.order(order);


                return nodesPositionObject;

            },
            _sort: function (groups, order) {
                var topo = this.topology();
                var graph = topo.graph();

                groups[order[0]].sort(function (a, b) {
                    return Object.keys(b.model().edgeSets()).length - Object.keys(a.model().edgeSets()).length;
                });

                for (var i = 0; i < order.length - 1; i++) {
                    var firstGroup = groups[order[i]];
                    var secondGroup = groups[order[i + 1]];
                    var ary = [], indexs = [];
                    /* jshint -W083 */
                    nx.each(firstGroup, function (fNode) {
                        var temp = [];
                        nx.each(secondGroup, function (sNode, i) {
                            if (graph.getEdgesBySourceAndTarget(fNode, sNode) != null && temp.indexOf(sNode) != -1) {
                                temp.push(sNode);
                                indexs.push(i);
                            }
                        });
                        temp.sort(function (a, b) {
                            return Object.keys(b.model().edgeSets()).length - Object.keys(a.model().edgeSets()).length;
                        });

                        ary = ary.concat(temp);
                    });

                    /* jshint -W083 */
                    nx.each(ary, function (node, i) {
                        var index = secondGroup.indexOf(node);
                        if (index !== -1) {
                            secondGroup.splice(index, 1);
                        }
                    });
                    groups[order[i + 1]] = ary.concat(secondGroup);
                }

                this.groups(nx.extend({}, groups));
                return groups;
            },
            _layout: function (nodesPositionObject, callback) {
                var topo = this.topology();


                var queueCounter = 0;
                var nodeLength = 0;
                var finish = function () {
                    if (queueCounter == nodeLength) {
                        setTimeout(function () {
                            topo.getLayer('links').show();
                            topo.getLayer('linkSet').show();
                            topo.stage().resetFitMatrix();
                            topo.fit(function () {

                                if (callback) {
                                    callback.call(topo);
                                }
                            });
                        }, 0);

                    }
                }.bind(this);

                //
                topo.getLayer('links').hide();
                topo.getLayer('linkSet').hide();
                nx.each(nodesPositionObject, function (n, id) {
                    var node = topo.getNode(id);
                    if (node) {
                        node.translateTo(n.x, n.y, function () {
                            queueCounter++;
                            finish();
                        });
                        nodeLength++;
                    }
                });
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    nx.define("nx.graphic.Topology.EnterpriseNetworkLayout", nx.graphic.Topology.HierarchicalLayout, {
        properties: {
        },
        methods: {

            process: function (graph, config, callback) {
                this.inherited(graph, config, function () {
                    this._appendGroupElements();
                    if (callback) {
                        callback();
                    }
                }.bind(this));
            },
            _appendGroupElements: function () {
                var topo = this.topology();
                var matrix = topo.matrix();
                var layer = topo.prependLayer('ENLLayer', new Layer());
                var stage = topo.stage();
                var padding = topo.padding();
                var width = topo.width() - padding * 2;
                var height = topo.height() - padding * 2;
                var groups = this.groups();
                var order = this.order();
                var perHeight = height / (order.length);
                var y = padding;
                var items = [];
                var gap = 0;
                nx.each(groups, function (nodes, key) {
                    var label = key !== '__other__' ? key : '';
                    var firstNode = nodes[0];
                    items.push({
                        left: (padding - matrix.x()) / matrix.scale(),
                        top: firstNode.y() - 30 / matrix.scale(),
                        width: width / matrix.scale(),
                        height: 65 / matrix.scale(),
                        label: label,
                        stroke: '#b2e47f'
                    });
                    y += perHeight;
                }, this);

                console.log(items);

                layer.items(items);

            }
        }
    });

    var GroupItem = nx.define(nx.graphic.Group, {
        properties: {
            scale: {},
            top: {},
            left: {},
            label: {},
            width: {},
            height: {},
            stroke: {}
        },
        view: {
            type: 'nx.graphic.Group',
            props: {
                translateY: '{#top}',
                translateX: '{#left}',
                scale: '{#scale}'
            },

            content: [
                {
                    type: 'nx.graphic.Text',
                    props: {
                        text: '{#label}',
                        fill: '{#stroke}',
                        'style': 'font-size:19px',
                        y: -5
                    }
                },
                {
                    type: 'nx.graphic.Rect',
                    props: {
                        width: '{#width}',
                        height: '{#height}',
                        stroke: '{#stroke}'
                    }
                }
            ]
        }
    });

    var Layer = nx.define(nx.graphic.Topology.Layer, {
        properties: {
            items: {}
        },
        view: {
            type: 'nx.graphic.Group',
            content: [
                {
                    type: 'nx.graphic.Group',
                    props: {
                        items: '{#items}',
                        template: {
                            type: GroupItem,
                            props: {
                                top: '{top}',
                                left: '{left}',
                                label: '{label}',
                                width: '{width}',
                                height: '{height}',
                                scale: '{scale}',
                                stroke: '{stroke}',
                                fill: 'none'
                            }
                        }
                    }
                }
            ]
        }
    });

})(nx, nx.global);
(function (nx, global) {

    /**
     * Topology force layout
     * @class nx.graphic.Topology.NeXtForceLayout
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.NeXtForceLayout", {
        properties: {
            topology: {},
            bound: {}
        },
        methods: {
            process: function (graph, config, callback) {
                var topo = this.topology();
                var selectedNodes = topo.selectedNodes().toArray();
                this._layoutTopology(graph, config, callback);
//                if (selectedNodes.length !== 0) {
//                    this._layoutNodes(graph, config, callback);
//                } else {
//                    this._layoutTopology(graph, config, callback);
//                }
            },
            _layoutNodes: function (graph, config, callback) {

            },
            _layoutTopology: function (graph, config, callback) {
                var topo = this.topology();
                var stage = topo.stage();
                var linksLayer = topo.getLayer('links');
                var linkSetLayer = topo.getLayer('linkSet');
                var transform = nx.geometry.Vector.transform;
                var data = {nodes: [], links: []};
                var nodeMap = {}, linkMap = {};

                topo.eachNode(function (node) {
                    nodeMap[node.id()] = data.nodes.length;
                    data.nodes.push({
                        id: node.id()
                    });
                });


                if (topo.supportMultipleLink()) {
                    linkSetLayer.eachLinkSet(function (linkSet) {
                        if (!linkMap[linkSet.linkKey()] && nodeMap[linkSet.sourceNodeID()] && nodeMap[linkSet.targetNodeID()]) {
                            data.links.push({
                                source: nodeMap[linkSet.sourceNodeID()],
                                target: nodeMap[linkSet.targetNodeID()]
                            });
                            linkMap[linkSet.linkKey()] = linkSet;
                        }

                    });
                } else {
                    linksLayer.eachLink(function (link) {
                        if (!linkMap[link.id()] && nodeMap[link.sourceNodeID()] && nodeMap[link.targetNodeID()]) {
                            data.links.push({
                                source: nodeMap[link.sourceNodeID()],
                                target: nodeMap[link.targetNodeID()]
                            });
                            linkMap[link.id()] = link;
                        }
                    });
                }

                topo.hideLoading();
                topo.stage().fit();
                topo.stage().show();

                //force
                var force = new nx.data.Force();
                force.nodes(data.nodes);
                force.links(data.links);
                force.start();
                while (force.alpha()) {
                    force.tick();
                }
                force.stop();

                var bound = this._getBound(data.nodes);
                var matrix = stage.calcRectZoomMatrix(topo.graph().getBound(), bound);


                topo.getLayer('links').hide();


                nx.each(data.nodes, function (n, i) {
                    var node = topo.getNode(n.id);
                    if (node) {
                        var p = transform([n.x, n.y], matrix);
                        node.translateTo(p[0], p[1]);
                    }
                }, this);

                if (this._timer) {
                    clearTimeout(this._timer);
                }

                this._timer = setTimeout(function () {
                    topo.getLayer('links').show();
                    topo.adjustLayout();
                    if (callback) {
                        callback.call(topo);
                    }
                }, 2000);
            },
            _getBound: function (nodes) {
                var lastIndex = nodes.length - 1;
                var bound = {
                    left: 0,
                    x: 0,
                    top: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    maxX: 0,
                    maxY: 0
                };


                //
                nodes.sort(function (a, b) {
                    return a.x - b.x;
                });

                bound.x = bound.left = nodes[0].x;
                bound.maxX = nodes[lastIndex].x;
                bound.width = bound.maxX - bound.x;


                //
                nodes.sort(function (a, b) {
                    return a.y - b.y;
                });

                bound.y = bound.top = nodes[0].y;
                bound.maxY = nodes[lastIndex].y;
                bound.height = bound.maxY - bound.x;
                return bound;
            }
        }
    });


    //                    console.log(JSON.stringify(data));

//                    var force = new nx.data.NextForce(100, 100);
//                    force.setData(data);
//                    if (data.nodes.length < 50) {
//                        while (true) {
//                            force.tick();
//                            if (force.maxEnergy < data.nodes.length * 0.1) {
//                                break;
//                            }
//                        }
//                    } else {
//                        var step = 0;
//                        while (++step < 900) {
//                            force.tick();
//                        }
//                    }
})(nx, nx.global);
(function (nx, global) {
    var USMAP = '<g><path class="mapPath" d="M208.06990887396233,23.37527332433217L215.7868911700379,25.2405505103427L225.05484477500715,27.39663922308216L229.847604433539,28.509843055527313L229.22916419201368,31.258620846761232L225.86435701445737,45.67883911946808L225.57787706626675,46.910367281593494L223.1197704131015,57.976081469960945L222.68460344524175,59.909549559706875L222.15030859693576,62.30432265597199L219.75922708815938,72.928201855628L219.28120986792777,75.03099342974065L218.74847416345648,76.44733270437735L219.71542917729977,80.02811393668435L218.96102207931347,81.20333223790806L219.08988445400314,83.20793071669561L211.9641592482314,81.54754118082383L210.4146876286881,81.16965419238284L205.68170476410637,80.03014429996495L205.4368471187458,79.97143714886977L192.93105504145097,76.97294676283104L190.8690634099026,77.750624908742L186.9491805917645,77.05071385502788L185.22126106592475,76.47604626026339L183.66609371151264,77.40151861060986L181.06996678663228,77.1407305158449L179.3033969233402,77.13948848635175L176.17720225183587,78.029393295673L172.6589729914919,77.67265485964685L170.70085395554645,76.33985636891919L166.93087846420985,77.1850630220805L163.27130420651633,76.67196745095964L163.30707548281362,75.7174402245829L160.58686474814118,74.38458187241952L159.6931984439962,73.6067567839483L156.01712844007614,72.9491420558337L154.291478857127,73.57201357263762L149.6645731342456,74.23623404685475L145.14987197234086,71.8109836175048L143.88072253430482,70.6444043917536L144.1466243526918,69.15159960337223L144.49377571869974,66.87511129520897L144.22699689495965,62.270541172467006L142.07895655500704,59.66634003277056L140.85677270395087,59.553438388152586L140.85894015205616,59.496675451252145L139.916136210513,59.70098217421935L138.33232436334237,56.94648031040356L135.08279344552,55.544277284497184L132.97015963237226,55.891652737784625L131.59923780927363,54.010360471860395L130.58223304356972,54.59448265414676L133.0048520029564,49.238346610522626L132.05281795859673,53.01134664545202L132.7597153345692,53.15668450864064L134.4037748980134,50.31309495214532L133.95969829624335,48.92407759080925L136.0066263306689,47.512726175072885L133.97353612506322,47.14414763713114L133.23217019478432,45.192238821039155L133.35016218806908,43.08409814782601L134.39996162871267,43.61570559604036L137.4876241065142,43.30227124798762L133.8151844120623,40.94574015730416L134.22124021020812,36.01180575065757L133.56641733468462,34.390173977836525L134.12768356191526,31.088633186663174L134.36579641680657,26.977904502305705L132.92554248890553,23.991565216123263L133.05583193368733,18.445048375297006L135.3814012336142,14.928934713321382L137.7828105832524,17.609239021771145L139.35978948127587,18.533292265251134L142.04943780235283,21.288866211198865L145.36097824965577,22.228574647463006L148.8314813233198,24.297190737430128L152.38815017481363,24.61835376383908L154.23369912697444,26.833920861763545L155.77194052908123,25.941911447387724L156.97145289125484,31.02771558775612L156.0399903700427,31.167465296663067L154.11153102600076,33.754590371062704L154.33634204049497,31.249841159051016L152.3664473577677,34.028052207357746L151.11328058475527,34.78459562062528L150.24266411223732,36.190288333375975L152.05914720209643,34.77486956083385L154.2883223587657,34.51704635482088L155.80366912855868,32.42856596702018L158.3031487251667,30.95243800826836L157.89052530622024,34.08992066881717L157.06285573742474,33.698398515392796L155.54884913441987,36.79560413655042L156.61449162797066,38.23449624855266L155.38191432290972,39.936637919970394L154.2089803399425,42.482447345570336L153.308918744116,41.59129761072995L154.46561260391582,39.671311129209016L154.37761074260976,39.647024678286925L152.90932514241405,40.48668924932974L151.61086119807345,43.41364520640036L151.14148558067978,41.80883362931729L152.1008247287545,39.84583766977141L150.16849918289859,40.7968137300079L149.52319582496818,42.1124512069656L147.4021455267702,43.52337594871972L149.42119202527243,42.69178061157413L148.18293208762083,44.21968748182542L149.3795334368529,44.556982790263646L151.00279488754285,43.043302198224296L152.03868051296655,44.888777072586436L153.871518676589,43.723593804341704L155.16626558763522,41.550237292459315L156.60530111779883,41.887109177414004L157.88741282559704,41.705777749248455L157.86384951391113,37.31049385918254L158.99338017309117,37.08321676535968L158.10211483381772,35.73010033671983L159.2088323387424,33.8047208917485L161.16357230459977,31.058688412981382L162.9113142228988,29.90166071978399L161.4539214747631,28.268346296378127L161.50200813601606,25.760799749944113L160.2165301685198,26.436794636975037L160.97080744538914,28.348974231989814L159.60407934913098,27.068134799049517L159.95572460120331,24.940449393438485L161.4910301623285,25.355638807110267L161.97896818770016,24.59676520156131L159.33797227822907,21.648376187312465L159.14240820603703,20.040764536799657L160.36543488805205,19.799012295581747L161.58588974582761,21.43710083420649L162.4858998398068,18.04698631290296L162.95134674943927,16.322885588815097L161.24381018256219,15.20848145955324L160.04585728433227,11.701769628478132L161.08798618415113,10.793553936506783L172.9773901748378,14.256236175137701L183.85631949544694,17.16574961388676L193.36455246139394,19.684155644557336ZM157.3646647636349,18.3415758502814L157.34284738032505,20.75133763190172L156.08774814160597,19.66263139380999ZM154.46762458407255,16.128433844761275L155.73085629870945,17.69805736017429L154.95868420552517,19.460325961718468L153.99155689241917,18.386541536807158ZM157.91803934757735,15.395189160717791L159.51952149155017,16.893443147657194L156.73641125363145,17.308058662100052L156.27828862317824,16.079755903933915ZM159.97862419135782,22.119978709645807L160.5388166572277,24.11512500927563L158.6496279090536,23.89203620744513L157.41059269642705,24.627900887097212L158.8325681275246,25.390478779148225L158.6485163670892,29.0579416406066L159.2553615685493,27.67885436540155L160.7428639901633,29.297522077190706L160.08050572656498,31.573089598805154L157.92666518805885,28.55779741045035L158.4883562476747,26.29383056885888L156.95030906124583,24.548615164702596L159.14762292373314,21.77338886358382ZM157.08352912790554,34.73001210024188L157.1759175768123,36.9346558159408L156.08763757549252,36.370879315301295ZM156.8058229824382,40.26951380705077L155.3821884903527,41.06225419219936L156.89214708421144,38.2911274506497ZM376.46496066911186,51.914213348189946L388.93197131840293,53.028215935570756L388.3653425480326,59.75639881567736L388.00079375570965,64.26380312722256L387.4125084134096,71.51663029909503L386.4649145128003,82.57738610114552L386.35927173246466,83.82242535685998L385.27679748716855,96.57978486985769L385.1186324667765,98.44381815867769L384.698809701747,103.28174782558551L384.1801981419255,109.50361391223487L384.08954713282026,110.68246992216439L383.09449592564863,123.13613914515076L382.5182680680963,127.13048972108277L369.6389242958943,125.91249949176836L368.9747358505291,125.84694661151434L356.6882715225784,124.73652767214708L353.55857284827596,124.39717696805678L331.98615298476255,121.72753712686426L327.5636074981978,121.19679246374426L322.7034944039235,120.54306880803813L307.32805093497205,118.35668167037636L295.4823031517515,116.75285043280724L291.0901143861885,115.88793193239883L289.9562597753677,122.0556696752052L289.4689868456089,125.62012859285994L287.4568148016434,123.35869766512769L287.6825859935117,122.52844891749362L285.9967047793439,119.79631799185256L284.62553865120094,120.37642738457419L283.63911744806023,123.50012310962188L282.24506664110555,122.99154824117818L279.45160339657673,123.31131213949618L279.01599190955295,122.19483447332425L275.89448841092565,122.44418119987643L273.52887993136903,121.18523623256601L271.8359282255869,123.1593031011571L270.8228473855571,122.3871727350346L266.80856836848363,121.58471180717879L265.9949603898795,123.50639731787282L263.77462955842327,121.68960979633823L263.977746776462,120.29858868418546L263.1813009705801,115.44268319643095L261.86586062034564,114.26940639162785L260.5145756577628,114.74014314941417L259.2867093056136,112.97783949256996L260.0027879734803,109.43364067414507L258.85470273876206,108.18806700170046L257.5946468220387,105.09974668812652L257.01916146448184,102.232571328988L257.2968606453165,98.59546836564834L256.11116255210834,98.0015580753576L255.9381347145067,96.5578279292647L250.82866246261025,99.63742938265455L249.8616655743001,99.8566053963151L248.6288976700609,97.62456394237472L247.40940015127347,97.52498249631265L248.6450132911754,95.65002996841542L248.15557764179596,93.56071034158663L249.29361357747968,92.33582636140443L250.43741607596934,92.52603915166321L250.86759772404912,90.21200153517611L249.84304093587244,88.99468681278847L250.67850261619338,87.91088262946107L251.62648928707796,84.70375440843793L253.69592836814797,80.48174077325643L254.32676550058454,77.92767884597913L250.91412373547573,77.7646348184818L250.28691395008548,75.68750982323854L247.29264305822483,72.7655582272755L247.4284684951822,71.39691923913654L246.42961726324572,70.49446229094463L245.7409617814514,67.8498234956237L243.87932910544887,64.41474469284196L241.6618414496704,63.26213028851612L241.5807522724896,62.285496757092915L239.75970315000308,60.46935497364461L241.11335354837047,59.72684924015812L239.8132352586303,58.092912916067576L240.7924876436294,57.48546203837623L240.74289861654768,55.578505820732516L239.71064413664865,54.26741202566666L237.8145383960838,49.57121847887811L238.7311769311309,45.290681111313006L239.85094763996943,40.10441442315971L241.77949842516085,31.098096321664116L257.8109971771737,34.42181309289015L265.85841819186174,36.02968631311114L288.7289166054043,40.20119165249355L300.0164981878418,42.1129949965964L306.48909015808385,43.11850331624498L321.87157047260183,45.38810731219701L337.27637717155096,47.4998043472425L350.286852068656,49.102693249056756L363.44950934656947,50.59421078393302ZM247.4284684951822,71.39691923913654L247.29264305822483,72.7655582272755L250.28691395008548,75.68750982323854L250.91412373547573,77.7646348184818L254.32676550058454,77.92767884597913L253.69592836814797,80.48174077325643L251.62648928707796,84.70375440843793L250.67850261619338,87.91088262946107L249.84304093587244,88.99468681278847L250.86759772404912,90.21200153517611L250.43741607596934,92.52603915166321L249.29361357747968,92.33582636140443L248.15557764179596,93.56071034158663L248.6450132911754,95.65002996841542L247.40940015127347,97.52498249631265L248.6288976700609,97.62456394237472L249.8616655743001,99.8566053963151L250.82866246261025,99.63742938265455L255.9381347145067,96.5578279292647L256.11116255210834,98.0015580753576L257.2968606453165,98.59546836564834L257.01916146448184,102.232571328988L257.5946468220387,105.09974668812652L258.85470273876206,108.18806700170046L260.0027879734803,109.43364067414507L259.2867093056136,112.97783949256996L260.5145756577628,114.74014314941417L261.86586062034564,114.26940639162785L263.1813009705801,115.44268319643095L263.977746776462,120.29858868418546L263.77462955842327,121.68960979633823L265.9949603898795,123.50639731787282L266.80856836848363,121.58471180717879L270.8228473855571,122.3871727350346L271.8359282255869,123.1593031011571L273.52887993136903,121.18523623256601L275.89448841092565,122.44418119987643L279.01599190955295,122.19483447332425L279.45160339657673,123.31131213949618L282.24506664110555,122.99154824117818L283.63911744806023,123.50012310962188L284.62553865120094,120.37642738457419L285.9967047793439,119.79631799185256L287.6825859935117,122.52844891749362L287.4568148016434,123.35869766512769L289.4689868456089,125.62012859285994L288.0481456605741,134.7011241381732L286.64589863202497,143.63758020028786L286.1069653617815,147.07516485894723L285.2416691847088,152.5577038120432L283.7018105789312,161.95553979865701L282.18542063437525,171.4536805154121L275.90534585979714,170.47636550018183L267.7145145618956,169.13708142644555L266.95905635804127,169.00653436610048L255.62126287079596,166.99664084530787L241.51437533212479,164.45244088140396L238.25747411672734,163.81312146165828L228.03746052948316,161.74634177601865L213.10504367718886,158.58241564320986L201.38062018260996,155.98327886854509L201.26264186741616,155.9443229041574L208.194181064414,125.14850783660768L208.86402650464748,122.21419380962902L209.57920284148855,121.62240854995684L210.6538548756982,119.7963758007586L210.54418128371157,117.8487345424237L211.81579328068358,116.88850385738431L211.17154004208896,115.00859304864105L208.23889015674638,113.22338110630164L208.95496606883313,109.87569152074218L210.23244261076775,108.98457178120213L212.43614614381693,105.59541221923064L214.60227681915546,104.31180404784618L215.84816155062708,102.79960483052491L216.00646043659947,101.15325075851445L217.06593304506316,100.29020745611103L219.0736289368876,97.12363308474767L221.7007890101118,93.14158334465435L223.31296627836173,91.42091252914474L222.7826118046106,88.67603183461142L220.0676041385243,86.09394041764699L219.08988445400314,83.20793071669561L218.96102207931347,81.20333223790806L219.71542917729977,80.02811393668435L218.74847416345648,76.44733270437735L219.28120986792777,75.03099342974065L219.75922708815938,72.928201855628L222.15030859693576,62.30432265597199L222.68460344524175,59.909549559706875L223.1197704131015,57.976081469960945L225.57787706626675,46.910367281593494L225.86435701445737,45.67883911946808L229.22916419201368,31.258620846761232L229.847604433539,28.509843055527313L241.77949842516085,31.098096321664116L239.85094763996943,40.10441442315971L238.7311769311309,45.290681111313006L237.8145383960838,49.57121847887811L239.71064413664865,54.26741202566666L240.74289861654768,55.578505820732516L240.7924876436294,57.48546203837623L239.8132352586303,58.092912916067576L241.11335354837047,59.72684924015812L239.75970315000308,60.46935497364461L241.5807522724896,62.285496757092915L241.6618414496704,63.26213028851612L243.87932910544887,64.41474469284196L245.7409617814514,67.8498234956237L246.42961726324572,70.49446229094463ZM436.7850623119907,56.12254905436134L444.9270268368669,56.450940572261516L451.45126502562414,56.66509911997218L464.47126846280105,56.99430355546326L473.41103521315995,57.14383674142323L474.27827867930756,61.63139829266288L475.00518458707495,62.94145392016651L474.1359062827915,65.59674866215403L474.67142122429385,69.6443658545013L474.32283574541606,72.06528845987373L474.25981192256774,72.43038912999873L475.7739057529861,78.02851452654033L477.30261444897445,81.7073166626783L477.85535964951083,84.9548260185195L478.0542701584073,89.82709334249148L477.93020055795586,91.43754350637619L477.93433121570223,94.08596043714181L478.8968333657801,95.46218445618229L478.3696792600468,98.00425127424717L478.3942100922412,101.11886777915083L478.5835565859736,101.12144236331119L479.14957246362434,103.77094672233966L480.88986058390105,106.71155229829856L481.39520136269044,110.71276945680313L481.1750235261709,112.47910769447333L481.32859592812264,114.09388839138433L472.6894668170374,114.01344496045203L462.9267425227518,113.83668387545765L462.5487838151503,113.82775271136381L453.2416104525768,113.54488670776652L449.5848166079546,113.413578172205L440.3271259743346,113.06493224590258L438.219695887975,112.9706204942155L430.01574882132275,112.56506143351021L410.71630930571513,111.47977315759601L410.69289523937334,111.48030090625946L398.4808653624099,110.63850011367265L397.7782197575811,110.58487729373064L384.1801981419255,109.50361391223487L384.698809701747,103.28174782558551L385.1186324667765,98.44381815867769L385.27679748716855,96.57978486985769L386.35927173246466,83.82242535685998L386.4649145128003,82.57738610114552L387.4125084134096,71.51663029909503L388.00079375570965,64.26380312722256L388.3653425480326,59.75639881567736L388.93197131840293,53.028215935570756L402.6562295553884,54.1234680261241L414.0106375189442,54.905754646948935L420.50038280677256,55.289564618688246ZM497.0724296163263,57.240184603279545L499.16519306690066,57.224387203866854L499.1018843294923,50.118643322843354L501.5212474529504,50.35866816045029L503.16308524740845,51.73537463554669L505.0228675005861,59.27450918106217L504.9561812852384,61.234672578723575L506.25500207289974,62.33194729680076L508.22323187598863,62.60861195551297L509.73648212008436,62.41002270179433L510.80396825299766,63.51475574499318L515.507315653214,63.76195197025777L516.2414458455145,65.8607272286057L520.2990490484116,65.2024656892263L520.2992067119503,64.36744137304595L523.4878179466417,63.33696458752297L524.9865946630081,63.565965205058546L529.5325304889936,65.05152253913627L530.6957740941614,64.9512971875289L529.7785693908694,66.45565902618875L532.3555743995976,66.6429132695049L534.2295758516718,70.75425685496998L535.4715249814342,70.2197602230683L535.4839382366914,68.24339256017822L538.0691766911979,68.05832814798839L538.753241137994,69.76806235996548L541.4186643914794,70.8090773789337L542.5845884879974,72.34330721738525L544.4997075190729,72.41755202252966L544.4519849592948,73.62249060818658L548.4142537905718,72.68312483470777L551.050456562152,70.59685371255921L552.8268123996222,69.45341871021753L554.790193068741,72.1518969652368L562.4214965396618,71.39490189646847L565.8236355008087,73.49709168966888L567.1203931893796,72.74172116507748L569.7105329122621,73.11618218184628L564.689287808705,76.47859844911522L558.9718661649567,78.67083338550458L555.3790210284246,80.80920906322513L551.8609038194646,83.99200184097879L546.3994267065746,90.57298241180843L542.5084707577508,94.19682105859363L538.7948812950353,97.19601750509446L537.4859173907628,99.63367403524956L536.3305136638659,99.62328979702238L536.5044572332245,104.19907907433799L536.6840062964787,109.03872197123269L536.0504440303799,111.69298033039854L531.4888595963635,114.12627078137359L529.8594136445661,117.26024990128963L529.3129177956712,118.88132001719805L529.3874240168569,120.15214001431775L530.8369725955193,120.2502714037189L532.5808580454741,122.5566454181452L531.3815408552465,125.31742923247896L531.2718117895793,126.93823491762339L530.9015072253347,129.39513762798674L531.3417587497429,133.4388266339189L530.9588384428881,135.59955892921437L531.9344459682603,136.18186060524044L534.4565531844748,138.82889894638663L537.5611753424346,139.22248316748494L538.6111595318871,140.80677179571308L540.7501573164056,141.6011896731378L542.4541615052505,142.44501555268346L543.9164274902628,145.4839561179383L548.0543979257922,148.44267429535864L549.8854230381448,149.12480375403504L551.8992440925799,151.60217715753356L552.3757742166812,153.80719228308737L552.3163512998807,155.91031442053315L553.1158397794857,158.0496171850674L547.8178027509169,158.30341978214722L546.2030349524372,158.3760117388582L541.5034359595513,158.57961523899598L536.5275337096691,158.77831434889458L535.1251672412604,158.83399750263027L528.7747932765471,159.05872033598155L528.4506988339296,159.06882914456287L522.4038221652997,159.24641899337848L520.3621030604634,159.29554517132988L516.0124931774124,159.3967973138192L512.2817224191687,159.4609293511014L509.6541614986644,159.50163515697477L504.089167326057,159.57266358175025L503.29562401568535,159.58902763130334L496.91257148098595,159.65006150853173L496.0075644799285,159.65053067100985L490.53411359204085,159.67929300893695L487.9449507680171,159.67844755503347L482.5537363807226,159.65905853109064L482.5801360632289,153.10859383763488L482.6207267500289,146.60618350501124L482.62073633344295,146.60417080131992L482.66119562073874,140.10873527005708L482.67376532957,138.46584387091127L482.6893208025142,135.1910994238483L482.69978629049353,131.9910657203003L482.7115488817173,126.54162520010243L482.48587388706335,125.46357245489003L479.5406278697855,123.69340639571476L477.733445808825,120.5821215089577L477.71552444471286,119.42167900193124L480.13274903378544,117.6229285245521L481.32859592812264,114.09388839138433L481.1750235261709,112.47910769447333L481.39520136269044,110.71276945680313L480.88986058390105,106.71155229829856L479.14957246362434,103.77094672233966L478.5835565859736,101.12144236331119L478.3942100922412,101.11886777915083L478.3696792600468,98.00425127424717L478.8968333657801,95.46218445618229L477.93433121570223,94.08596043714181L477.93020055795586,91.43754350637619L478.0542701584073,89.82709334249148L477.85535964951083,84.9548260185195L477.30261444897445,81.7073166626783L475.7739057529861,78.02851452654033L474.25981192256774,72.43038912999873L474.32283574541606,72.06528845987373L474.67142122429385,69.6443658545013L474.1359062827915,65.59674866215403L475.00518458707495,62.94145392016651L474.27827867930756,61.63139829266288L473.41103521315995,57.14383674142323L483.62955753369573,57.23964573515832ZM855.448121505269,86.46230166436465L855.4814977116182,89.76515857448203L854.1551171207543,87.37622389655905L851.020511654358,87.10356712015471L852.0678007094234,88.03877322632911L850.3266694128191,89.96175057232733L849.9617886576746,88.22224034189446L848.6124842771196,90.41327674638694L850.0919554288375,93.41099068333415L845.3409697157404,91.30649433935957L845.6218384873501,89.21919039095565L843.9338112746235,87.48232731922599L843.9928238125862,86.3165510502148L843.9642895188817,86.33751663053135L843.7711289948861,88.04354869006102L844.7708643348188,88.40474665879469L845.0132936131847,90.3104092042056L842.7842067445711,91.57959228280686L843.9985582130518,92.7212724025353L843.5253080269174,94.93908334046546L843.462796241472,98.28965279258057L844.0081429374577,98.73800161772294L842.7997860134521,101.3659139718144L840.6739797813616,101.31719692338424L840.5979749488436,100.35842956037254L839.8720879638361,99.36369008314455L839.5707466763474,104.11783083795854L838.5547932408931,103.24357632506565L837.4153509199546,104.40814785069881L836.7049001874934,101.43612073811391L836.2127254255124,103.06225918945381L835.7835962351619,104.08818695670527L836.9977875255985,105.08799494477694L836.5619321028435,106.39463509731274L836.4156718961412,106.42663271202287L834.6507478093808,102.71549374973574L834.7204311750081,101.84939213262498L834.7746578793799,99.60988272728741L834.7398994426107,99.61031652525219L834.5673111913034,102.29651570537351L833.7616944428255,104.1504867007277L834.3349053528149,103.4365867660257L834.6630237870462,102.90035116054196L836.4967481418553,106.8014985167249L835.723673673875,107.80829839061528L834.4217281601361,104.4708943506264L834.7647839315322,106.43344851458494L833.7047451621837,105.22726669694725L831.466081281899,107.14487250246634L830.6668523360638,109.7952423112896L831.9831972592419,111.57209364408823L830.1032293776472,112.66472321749461L829.8985938113141,116.23661806735174L828.5990037452425,117.1638136332906L828.2556874427623,122.22576572016578L825.8888016331712,121.62909655945896L825.7034947849771,119.90623688704534L822.6312305262305,117.71145009642078L822.1632746181314,114.72897748174785L820.6021984355774,110.31028938630084L817.9180711210325,101.43207261006364L815.0043092034302,92.17761995479475L812.0118058083826,83.24162199143984L812.803055588406,82.24747270407306L815.3210786992328,82.8968417380346L814.8395608729678,80.65352782874118L817.2811934958688,80.3422479369193L815.58344191997,78.31795014719228L816.9655504433947,74.90427078307403L818.7379457742829,73.1186245105788L818.0520960689287,72.16408987004183L819.5173351531246,69.9056094681265L818.1849190355945,67.75502658276355L818.5326199416374,65.19339341396608L817.6227998715619,64.57626986039429L818.1125571043724,61.37783760460172L819.4394456585281,59.71720570081766L819.0631115114076,56.778290926628074L818.7723064980307,54.51019752369723L824.377046223786,38.14362426718105L826.7607593298255,38.09180002497658L827.730990826108,41.32228489658871L829.8082835256314,42.01653362686386L833.0234808762302,39.72893422142033L833.1448330615547,38.915667888370535L835.6149138113001,38.17453589085676L835.4362251540445,36.923559062467234L836.9990605137054,36.44221142839467L841.2791909638095,38.22551019870093L843.9754476284247,39.917999820793625L850.2064725749368,59.89227498945979L851.3272511854419,64.67664156238277L854.2049748985191,65.24957709234445L856.6438441943787,65.03761234552906L856.1766802961866,66.9105554536601L857.6126999990204,68.36907476959402L857.4873393017099,70.55948283170596L860.1932014963925,72.78419331003488L860.506778867109,71.48777942673166L862.2391002548591,71.50735318686031L864.9752098945453,74.66654071214646L866.5313988443708,77.06704753870042L864.7492419748146,80.78391696480185L860.7921168316659,82.1615878126006L860.6345607445742,84.29905655711775L859.2986680259581,84.04119225603563L859.0193735996102,85.55127999352726L857.4837343603122,83.82472988818301L856.8902081377853,84.83244330248351L857.1607234134926,88.02620365653956ZM848.1023066287959,93.2003337968033L848.974198550045,95.08320943467368L847.4752174681985,94.3215278589355ZM851.804772537761,88.82234753990895L853.6280787723226,89.5462154581096L852.502591259621,92.81538491564402L850.8437754567367,91.54387190717205ZM579.5026707348381,107.743484562748L578.1420425714307,107.07319270901553L567.1196896286117,104.81489408734637L567.1382493012693,105.03232717478738L564.6076704107227,104.27915906814133L562.9861266175213,101.15233119573486L560.528205455113,100.2624128861014L565.4380900510599,97.90220467317818L567.0854876188071,96.12088003436418L568.3130387136472,95.04589201334431L573.0374047514795,94.27377472462331L575.2169717190327,92.9298662826759L576.6370421802743,91.21077637727251L578.9540680267928,90.34966945114479L579.4423849517992,89.00380395831394L582.5432304454529,86.41114684997387L582.7338028345371,88.21293645604044L584.2130332895538,88.48848998468713L585.2368865595192,91.58622623906513L585.3019553943928,95.07662398470359L587.9425849460013,91.50913205397615L590.4700194583902,91.66450015888142L593.4088259507928,91.80735441762238L595.8693611681325,93.05267367721262L596.8060699219014,94.69520165510755L600.2835502692411,98.5857625403811L603.0354878649053,98.33896925684314L604.1927383917482,97.50161733491393L607.003238342778,99.02578197114542L607.7676769298462,98.17957323756207L609.3418704414204,99.28136498606659L611.3334238599559,96.44210311382938L615.247266163615,93.80210455478573L618.7155574207878,93.11525899783908L623.6245876609092,92.75371891748682L626.585524968476,91.01684352732127L630.1659947043031,90.35984033470527L629.3892802751668,91.94433116849007L629.7603066979333,95.66686396350087L632.4671254984713,96.17098889138572L634.9400355750007,95.1269221599257L635.5700426603742,96.36892845401769L638.598201569345,94.34604960079866L639.7992933759077,95.53188885025133L641.204121262432,98.74104181071414L640.8985071322211,100.42154671862977L642.1505320628323,99.97636218260982L642.9953833800071,101.47158250864447L645.4603095973698,103.23516291288479L642.7130869849237,103.59375393565142L641.4062837582865,103.70584488319264L641.184376293913,103.73550099553154L635.5601799394008,103.13611698804812L634.7347274723522,105.26751448819823L634.8051346874564,107.24298433683975L631.1571504488584,104.52026278496817L625.5319169933349,103.38415633019645L624.3750135349027,103.68109980927045L622.8702882875773,106.19949348757802L620.1371375384498,106.48302828181215L619.6156937962619,107.44550941610464L617.6122017681357,106.82823031352484L614.4621181733421,107.98863597374282L613.984981121562,110.54150990060566L612.8384296997535,111.20158228418131L609.8252266603695,113.51405626917858L611.745552945932,109.58471631003454L608.479176398894,109.69941800983156L607.5851671953193,112.60156794721911L605.3474435538923,112.16964224015669L603.8048342666291,113.82791351917649L602.7535998202841,116.05641634481822L600.9401077677198,121.02771469568609L598.9009315795531,124.82547426939561L597.1059061914219,123.1717740660464L598.1086811029412,120.41077399454048L594.9631676909044,120.43914575237852L595.9588839486712,117.58308910806954L595.3157939377758,116.52210758561807L595.8258609445455,114.3622929643019L594.8979274260745,113.52567287867294L592.0639643469322,112.67769994492551L591.0004668836596,111.96778127510356L591.0767668558368,110.12034158277902L587.1070096977993,109.43888157257993L585.5286878819634,108.70696829268036L583.600989560048,108.99081190831032L580.2876228285753,108.12709355073764ZM653.9760035884009,116.7282617960085L655.3279410220006,119.42136100013965L653.8487585195417,119.49243427546378L654.1487789559067,121.962502180966L655.7221374111566,123.07001037208772L656.7337351810479,125.6759305895547L656.6183837870226,129.49768329321557L656.776346155069,132.9026670614851L654.6896936957444,134.26336598218734L654.2125932748207,136.39592674573873L654.3251633659281,138.539497276053L653.1509207996479,139.78165958083036L650.953906562408,140.02555929238372L650.2849836825064,141.68787334943931L650.7805794311683,146.05682858176078L653.8332687872291,147.29555879999828L655.9158444226483,144.27593019086135L656.593135846944,144.32040918635323L658.7086294388553,139.36257263468826L661.3857596499081,138.36764802663265L662.8809198643695,137.01238566589575L665.5718285547689,138.09079585076938L667.403891662981,140.85177819919784L668.1458155045377,143.44160700596126L669.7202288272633,148.02182167766375L670.9116356511884,152.93254390709L672.5657817172057,156.37055293222033L672.0375431668813,158.08219658513292L672.144587339187,163.04568157040603L670.4201242428063,163.20818792886985L669.4550153754784,162.29450095138395L668.1044039310943,163.81284735592487L667.8428235906899,166.9865290722197L667.6246417916232,168.2747300533632L665.3799601357658,169.93863749238017L664.5329199942445,172.77457782595764L664.4496754857757,175.35679111154366L661.4557907612617,180.45486078975932L661.3108262078879,181.5139124541589L657.4867513232497,182.17782211571466L655.8847878557889,182.45147199223732L649.3280861578296,183.52994831032402L648.7925891557405,183.61102091484133L643.2269044558229,184.46488911652682L642.8246020824271,183.30344711107136L637.722848177819,183.9020690962427L636.4106645434063,184.04713163046915L631.3611721856475,184.62279196715303L629.6391691160964,184.80973360799726L625.8165591942744,185.19009499550168L623.5657963455466,185.42635807845534L619.4690152710396,185.8568673294916L615.3288082505193,186.2522119352327L617.9406632598559,183.41742605920797L619.3050874083694,179.25674710867827L620.7509108239667,176.58687490910745L621.648253517631,173.16674047100003L621.8653112498109,166.56576131739132L621.1968782477744,162.47107894379417L620.3259397768063,160.09984824410867L617.1184632896603,153.74880732899305L615.7187839223549,150.4519391397622L616.8638979929725,147.23085507774692L615.3639100673872,143.22638123676427L616.7591750924742,140.4736148200543L618.1282200497184,136.73810676966207L618.1421014361194,133.93788896558544L617.7291717872619,130.48936719358926L619.7495829522851,128.87678112846254L619.5648206645967,126.7046606930295L621.1797168895018,125.21183301869144L622.9687319469895,125.23765093437146L624.9146888223914,120.6480211656758L625.8544271268161,122.92672324943442L625.1732865235743,126.35556420845603L625.4558097854214,128.32720635581916L626.0720701989043,128.41330368122624L627.2289139525216,124.11854724099123L627.0181268671109,128.67096936831422L627.9000701573833,126.46277297024812L628.4059562094028,121.66262114009623L627.8823534411471,119.91893908598877L628.0297437761803,118.610445226916L629.9941060032527,116.78207079073275L631.3606045845706,116.54962077455502L633.5015898924449,115.24227963708972L631.9976156515372,115.17604545162703L630.626532719427,112.84418179446834L632.6035979627209,109.62604291896287L635.1655222231584,108.17408205280151L638.9625866526284,110.24984847035455L642.3644922715137,110.33230548918254L643.8574389155009,112.39531379547236L646.5306037965413,112.44862639521193L648.4756184859983,113.67528890546453L651.2111769432313,114.4509062563767L652.2062676506738,114.14554947511647L653.9108658891676,115.56319154205198ZM583.9458647432638,85.22058497625494L584.939701739761,83.59291512756806L587.4402925076481,81.90298139738411L592.0497275350154,81.04458539791904L593.9242085969231,82.2260134418093L590.845947107735,82.76635278364449L591.1429997142201,83.51173857176423L587.6952431352852,86.52134352660767L585.6916425830307,90.81460640997432L585.2317196988857,88.68900466507591L582.8664008006857,88.26268464581449L582.5952004804788,86.43012398489975ZM580.9697288866781,69.71449481621619L583.7551396852255,68.42226844662218L580.678752926159,72.10611382490697L576.8772001036917,74.17392846646874L577.5591834455602,74.6733223146141L575.0034037955188,75.8953884167862L574.1370447248121,74.33297641020283ZM649.8910364371853,103.80174955968403L646.177350563448,103.50880041164748L648.2714355534132,101.88819959873797L647.5529628596338,100.73547538243201L649.3078569289027,100.72529122784306L650.9648104926182,102.45236756232282ZM640.3419846801108,93.52105695779608L641.2381178361636,93.52982812540222L640.7288101859078,95.75991378251854L639.3487179229784,94.53245114320077ZM637.2843388360741,107.38175949867559L640.0756008611276,107.89742466960752L638.360280126744,108.79206661005708ZM624.8366875951527,110.06129316389809L625.7058213099477,112.63014900821611L624.0900862276836,113.30078220253449ZM620.6519200425896,123.42247548132082L619.3277686584015,122.85730722280357L620.1163851053834,121.82008325125719ZM661.6928734880224,181.44897378667702L661.5657041966797,181.47196826076242L661.6928734880224,181.44897378667702ZM661.3402254964878,181.5089982153188L661.4870870757741,181.4834152095135L661.3402254964878,181.5089982153188ZM580.2876228285753,108.12709355073764L583.600989560048,108.99081190831032L585.5286878819634,108.70696829268036L587.1070096977993,109.43888157257993L591.0767668558368,110.12034158277902L591.0004668836596,111.96778127510356L592.0639643469322,112.67769994492551L594.8979274260745,113.52567287867294L595.8258609445455,114.3622929643019L595.3157939377758,116.52210758561807L595.9588839486712,117.58308910806954L594.9631676909044,120.43914575237852L598.1086811029412,120.41077399454048L597.1059061914219,123.1717740660464L598.9009315795531,124.82547426939561L598.9276639609204,127.00900967418772L597.2126566412188,127.50812247552244L595.6170565986471,130.25138513303864L594.7086798269055,133.14079073693244L594.6709343356006,133.14599741143513L594.6236253006718,133.1510016278845L594.0799019258261,135.31855328534937L595.7060422734987,135.71701411000902L597.7338941939122,133.50710984886462L598.0268866652797,132.86808408584466L599.398691945611,129.75412356335687L601.9758208148528,128.22498433981332L603.7588470488286,123.15612275206581L605.2643961914315,122.52190941570939L605.7576841501945,120.56291707897503L606.8594584229638,120.45051493495123L604.741291120271,126.78671993092621L604.6954358219199,128.54760324442088L603.3395236237523,130.3296118016175L602.7951883267517,132.46956546492675L601.6406360835626,135.67127237771672L601.1477409333991,139.1611186141747L601.4711810901006,142.30143495645837L600.2038915053521,143.37175490117193L599.3513087410746,147.50832450109283L600.0873298428222,151.28202888115652L599.1154870739779,154.10142632814825L597.986919189389,159.59187016879707L598.3323082963402,160.78081678677825L599.7876919737563,167.248660596965L600.7824527556687,168.25437590728927L600.3518371392831,170.48478662120147L600.650389159307,173.76805916941748L595.302749353417,174.17259016126616L593.8351297072173,174.3016332090557L588.3438118907263,174.7557713519916L587.4009091915134,174.8562676866061L585.1635956780729,174.968002090852L579.3427307783395,175.28987172531504L578.8624607612287,175.32032226017748L572.8983959256284,175.62213743323696L571.6929538006291,175.69882751865168L564.8596835342204,176.0927638976691L561.9319647671487,176.2380765454633L560.9606321447934,173.98844694975867L558.2634157902353,173.30122951469616L555.8942735503023,171.97620767925162L554.4225065859346,167.61277808100965L554.0621707500688,165.90103142132682L555.4937787192492,162.49118158862223L553.4372736766019,160.86430609849106L553.3535624237751,159.4948615147856L553.1158397794857,158.0496171850674L552.3163512998807,155.91031442053315L552.3757742166812,153.80719228308737L551.8992440925799,151.60217715753356L549.8854230381448,149.12480375403504L548.0543979257922,148.44267429535864L543.9164274902628,145.4839561179383L542.4541615052505,142.44501555268346L540.7501573164056,141.6011896731378L538.6111595318871,140.80677179571308L537.5611753424346,139.22248316748494L534.4565531844748,138.82889894638663L531.9344459682603,136.18186060524044L530.9588384428881,135.59955892921437L531.3417587497429,133.4388266339189L530.9015072253347,129.39513762798674L531.2718117895793,126.93823491762339L531.3815408552465,125.31742923247896L532.5808580454741,122.5566454181452L530.8369725955193,120.2502714037189L529.3874240168569,120.15214001431775L529.3129177956712,118.88132001719805L529.8594136445661,117.26024990128963L531.4888595963635,114.12627078137359L536.0504440303799,111.69298033039854L536.6840062964787,109.03872197123269L536.5044572332245,104.19907907433799L536.3305136638659,99.62328979702238L537.4859173907628,99.63367403524956L538.6310779790587,98.03784562212627L540.0426414414985,99.12159842895505L542.382838101651,98.86978977938804L545.7737367804478,97.49420328504573L549.5268504507858,95.75395646246739L551.3764549361385,95.32597599336032L554.359634039534,93.21209290615252L555.8484783390392,94.33698437640976L554.3184569657427,97.06095041313483L554.7943009057753,98.08915084116006L553.9445858252799,100.25929080843162L556.7695043961288,98.62318477775386L558.8015545242373,100.0312128212098L560.528205455113,100.2624128861014L562.9861266175213,101.15233119573486L564.6076704107227,104.27915906814133L567.1382493012693,105.03232717478738L567.1196896286117,104.81489408734637L578.1420425714307,107.07319270901553L579.5026707348381,107.743484562748ZM557.7012371648973,94.67342763794807L558.2759362815832,95.13197018472954L555.6107354716931,97.05370451154022ZM144.49377571869974,66.87511129520897L144.1466243526918,69.15159960337223L143.88072253430482,70.6444043917536L145.14987197234086,71.8109836175048L149.6645731342456,74.23623404685475L154.291478857127,73.57201357263762L156.01712844007614,72.9491420558337L159.6931984439962,73.6067567839483L160.58686474814118,74.38458187241952L163.30707548281362,75.7174402245829L163.27130420651633,76.67196745095964L166.93087846420985,77.1850630220805L170.70085395554645,76.33985636891919L172.6589729914919,77.67265485964685L176.17720225183587,78.029393295673L179.3033969233402,77.13948848635175L181.06996678663228,77.1407305158449L183.66609371151264,77.40151861060986L185.22126106592475,76.47604626026339L186.9491805917645,77.05071385502788L190.8690634099026,77.750624908742L192.93105504145097,76.97294676283104L205.4368471187458,79.97143714886977L205.68170476410637,80.03014429996495L210.4146876286881,81.16965419238284L211.9641592482314,81.54754118082383L219.08988445400314,83.20793071669561L220.0676041385243,86.09394041764699L222.7826118046106,88.67603183461142L223.31296627836173,91.42091252914474L221.7007890101118,93.14158334465435L219.0736289368876,97.12363308474767L217.06593304506316,100.29020745611103L216.00646043659947,101.15325075851445L215.84816155062708,102.79960483052491L214.60227681915546,104.31180404784618L212.43614614381693,105.59541221923064L210.23244261076775,108.98457178120213L208.95496606883313,109.87569152074218L208.23889015674638,113.22338110630164L211.17154004208896,115.00859304864105L211.81579328068358,116.88850385738431L210.54418128371157,117.8487345424237L210.6538548756982,119.7963758007586L209.57920284148855,121.62240854995684L208.86402650464748,122.21419380962902L208.194181064414,125.14850783660768L201.26264186741616,155.9443229041574L185.5467390853404,152.36064280589312L170.44474996095113,148.73365908597668L169.962119533568,148.60435335545844L161.4316944556187,146.42455346316547L149.69255507738967,143.35642899581512L142.15843383035974,141.24153201410024L131.02987181580335,137.9351810796403L118.56224690877832,134.40582758589494L114.74776051071007,133.33478297475176L110.71013504890601,132.23147645533004L105.58225398350447,130.61436534891652L104.29900921266687,128.15718493746874L104.59753586091693,123.70288306605244L106.42044305433654,119.53901421171065L106.56737398145304,117.89650691361521L105.73158380442618,116.20512274784141L105.80913643730202,114.0858433115593L107.36196105762002,112.35374080407632L110.36300171854361,107.06506164399264L114.35032373817234,101.63388120581396L116.50836322524134,97.32799569366125L119.31550636003254,90.09844835187812L120.49362061091239,87.69037166400346L122.92279577814838,80.42696960993464L124.15286394815689,79.15200899175954L124.95769046041812,76.77713865644932L127.77371280158616,70.57529534858963L129.3773045037674,63.710326714024745L129.9565660718991,60.70474857381714L131.12098575701867,59.82133699083022L131.14698337413557,55.54766430189761L132.26141934736336,56.806900882206264L134.13333411663513,56.928065173590994L136.22351297755029,57.921428797408566L137.63937790486085,57.402441290582715L138.80760924695642,59.5611850025997L140.85677270395087,59.553438388152586L142.07895655500704,59.66634003277056L144.22699689495965,62.270541172467006ZM430.01574882132275,112.56506143351021L438.219695887975,112.9706204942155L440.3271259743346,113.06493224590258L449.5848166079546,113.413578172205L453.2416104525768,113.54488670776652L462.5487838151503,113.82775271136381L462.9267425227518,113.83668387545765L472.6894668170374,114.01344496045203L481.32859592812264,114.09388839138433L480.13274903378544,117.6229285245521L477.71552444471286,119.42167900193124L477.733445808825,120.5821215089577L479.5406278697855,123.69340639571476L482.48587388706335,125.46357245489003L482.7115488817173,126.54162520010243L482.69978629049353,131.9910657203003L482.6893208025142,135.1910994238483L482.67376532957,138.46584387091127L482.66119562073874,140.10873527005708L482.62073633344295,146.60417080131992L482.6207267500289,146.60618350501124L482.5801360632289,153.10859383763488L482.5537363807226,159.65905853109064L480.5840766143545,159.64815889657882L481.584463953287,161.65984611536453L481.1481146446363,164.16666559517898L482.2273565040618,164.92471804097636L482.50182896831353,167.48656943714525L481.7340279148238,168.1090301275641L481.33903878682554,170.75893222628793L480.06673691929205,173.4320892886567L480.1475142292529,174.53971091455196L481.7015285711891,175.98723563132705L481.8416755571844,177.30022037824222L482.54188071047054,178.63728835048767L480.02678610622075,177.97387361453718L479.131165538962,175.60047374789042L477.664945114325,174.5775501632977L474.8075730925722,173.47028150230346L472.85477822982955,172.73241848722807L470.85813292677193,171.43199675745223L468.45020780764264,171.72052788148505L466.3989043383803,171.66465101387905L463.24151111442046,171.45306254561058L462.0392339993743,173.13250262048848L460.93203508280243,173.20212876342327L459.3451755116696,171.7581607163553L457.2351923446432,170.88909939156986L454.72956609397414,168.6449233548094L444.4523427559967,168.34484417212468L440.666702059618,168.21158691641529L431.6556944506987,167.8327098881456L417.68551510100167,167.15350471704357L406.1000961505806,166.43604148111456L396.4851047317584,165.77167206950378L393.66114515100406,165.55325227538958L386.8512122160674,165.03261520074784L379.41376385508755,164.35170699829507L380.1464461858333,155.49686418337524L380.19162040283027,155.02228252639577L380.7381108603348,148.47543006493777L381.2038890199145,143.10621068944624L381.2663335260095,142.37113582108464L381.8664673020142,135.0814536645256L382.5182680680963,127.13048972108277L383.09449592564863,123.13613914515076L384.08954713282026,110.68246992216439L384.1801981419255,109.50361391223487L397.7782197575811,110.58487729373064L398.4808653624099,110.63850011367265L410.69289523937334,111.48030090625946L410.71630930571513,111.47977315759601ZM822.1632746181314,114.72897748174785L822.6312305262305,117.71145009642078L825.7034947849771,119.90623688704534L825.8888016331712,121.62909655945896L825.376948914666,122.7739630219545L826.092225361069,121.89576162734568L827.8741210130879,122.86302953550694L827.3291595066999,126.34302072549247L824.590755915964,127.33147651750039L824.4048049040041,128.40954493630102L822.3372439080026,130.20051904534557L822.2318156594835,130.3560245378103L821.914381164178,131.1997570155262L813.8708943849057,133.03094040631152L813.4690157193054,133.1193855093353L808.7507541111854,134.15094505601837L806.4058202313613,134.64108929202723L804.5402952590761,132.64430355768388L805.2865305028381,129.4197885968258L804.4954848215265,126.71005089968605L804.4040748148698,125.33832194646016L803.5492250875336,119.00693840327824L804.0683991636124,118.32194852540852L803.9675081791252,116.49604461892602L804.8938735519389,114.80106987225497L805.2475782146521,107.26541259807618L804.5713738698187,104.25677282653317L806.959765100391,103.10566638739465L807.6349468211608,101.81147303514842L809.5646305400105,99.38410871462293L809.7020344935304,97.80808243784452L807.707618671557,95.15876184635783L808.6890757613621,91.74412265146964L808.1174958140454,89.92927180940296L808.6752664558751,84.86922930926642L809.4895892832483,84.00592344811218L811.5381599917373,84.62488608241574L812.0118058083826,83.24162199143984L815.0043092034302,92.17761995479475L817.9180711210325,101.43207261006364L820.6021984355774,110.31028938630084ZM803.0883700110327,91.34978790995865L808.1174958140454,89.92927180940296L808.6890757613621,91.74412265146964L807.707618671557,95.15876184635783L809.7020344935304,97.80808243784452L809.5646305400105,99.38410871462293L807.6349468211608,101.81147303514842L806.959765100391,103.10566638739465L804.5713738698187,104.25677282653317L805.2475782146521,107.26541259807618L804.8938735519389,114.80106987225497L803.9675081791252,116.49604461892602L804.0683991636124,118.32194852540852L803.5492250875336,119.00693840327824L804.4040748148698,125.33832194646016L804.4954848215265,126.71005089968605L805.2865305028381,129.4197885968258L804.5402952590761,132.64430355768388L806.4058202313613,134.64108929202723L800.1114576611533,135.9780149864323L798.8725903088762,136.24774907938183L795.6480893663786,136.94600403447714L794.6495913494559,133.3665473431903L793.2539321516861,126.5349888751698L792.2760967586667,122.18053973937742L791.2422585482559,121.02100167054721L789.5440196555932,121.08905766162854L789.8997354643353,118.89022968506652L789.4337244031377,117.93056316420541L787.639414982001,113.83347973466277L787.6002087715935,110.98253044835553L788.2761680717663,109.42447127144601L787.7716527971666,106.38204887572545L786.6959190671039,104.36150953055403L786.3201839920303,104.12682757998118L785.7421464635315,103.25935017814925L785.597572983779,99.66172997357728L784.905737155072,99.20617721958058L784.5862751969141,95.94238978094882L786.5144406553004,95.4194816194265L794.7011041714047,93.49164496027572ZM788.2761680717663,109.42447127144601L787.6002087715935,110.98253044835553L787.639414982001,113.83347973466277L789.4337244031377,117.93056316420541L789.8997354643353,118.89022968506652L789.5440196555932,121.08905766162854L791.2422585482559,121.02100167054721L792.2760967586667,122.18053973937742L793.2539321516861,126.5349888751698L794.6495913494559,133.3665473431903L795.6480893663786,136.94600403447714L795.5346643235753,141.53712796635727L795.3333446816546,149.77016275313633L795.6464165458101,150.41478172699226L795.7715708903058,150.3856154389922L797.045541156398,157.48441660244737L797.50166067882,160.07782496459004L798.011677443702,163.06842593759166L799.5298192704724,165.67718946806883L796.6977431887512,168.5266635046961L798.1246901686674,170.29029221045607L798.183080412036,170.59873612689648L796.7473593940508,172.716721792503L796.9835094085373,173.96971764013517L795.4746547754689,174.69270837806062L794.5667847862192,176.7854882260409L794.9875745323402,173.22366266034703L795.021271600101,172.51506411346236L794.9240514536139,169.4279803852204L794.3043658275594,167.4223711737044L792.3191749469187,165.2837316585909L792.2358592009285,165.32208444633955L794.0792256856226,168.33935588266525L794.7575653381782,170.96527293814017L789.9604978558002,169.46113005869688L789.6720680976211,169.34874558406057L787.6122270197291,168.73208277363585L782.4142693041183,166.95295062867228L781.3905607508093,165.82762304277242L778.0814269003027,165.52266455413394L776.3865255561202,163.53977795403216L775.9964359245491,160.7291392553925L774.4052757652613,159.15883232320903L772.7732351261042,159.33134923865805L770.8116575178385,157.11097145095232L769.2030225286655,157.48755037502997L760.8053368423134,159.27751255564374L760.2489368681175,159.39558169508177L754.7063515491359,160.55795536800974L749.7307323710914,161.58014130922595L749.2024163313147,161.68749744029856L740.4960770582953,163.42512427364193L738.6119229952343,163.84124728241625L732.4241308533104,164.97943774622502L731.0584545202172,165.23739020249263L722.7799735423563,166.81928159275412L720.8437950089931,167.11923940816087L713.4053012486581,168.48419591601362L711.3391806226343,168.8146839857959L710.4744853321191,163.8029025959479L713.0910592461072,161.5475541584284L715.7052264536906,158.4524379791011L717.9366193195715,156.76350952183577L718.7169595761476,154.31781085373007L721.0074190099759,152.056345296392L719.6554180571549,149.07514512933858L719.8159513247399,147.75098597521185L717.1251625771991,147.0522222323982L716.5915758016009,143.75983187088616L719.8236221804357,142.0235336457605L724.1890381396328,140.31588401580655L730.4514140589908,139.24613489282478L733.6649305302668,139.0817154857939L736.5402970623476,140.4574559851278L739.0086372800924,139.26918474596675L741.9820185613012,138.4161254896744L744.1287590256808,138.5238282535928L747.4113764404644,136.33172878857602L748.5159748656622,134.6310590810798L750.8396408061428,132.1312148152033L753.13031083878,131.52856280863557L753.2398155832179,128.63419959957457L753.0958516708843,128.65332438413668L753.0143203250761,128.6643844020706L752.0233114092772,126.1423502443755L751.0994324599455,126.03232573936339L753.1049921087232,124.51040760084356L751.7466251367883,123.22533562723083L752.2886405949394,121.33343560354729L750.6420543670746,122.83062425595449L748.7197360221844,121.28895533362459L749.5216369297021,119.46107683969171L754.6248590852256,114.46305362687986L755.3957756128178,112.15261040522319L760.3031314858026,104.69889504095863L763.776748668445,101.33366891646676L766.9028442836196,100.41206783515247L775.8728689637173,98.31473671444019L784.5862751969141,95.94238978094882L784.905737155072,99.20617721958058L785.597572983779,99.66172997357728L785.7421464635315,103.25935017814925L786.3201839920303,104.12682757998118L786.6959190671039,104.36150953055403L787.7716527971666,106.38204887572545ZM718.1587976204266,147.26848931656866L719.6554834166544,147.74020762252508L719.2860794280045,149.0889047261195ZM802.93362534571,176.2716638906145L802.9935266617267,176.4976470287544L802.93362534571,176.2716638906145ZM798.2694244040379,177.45650092940605L798.5029395463409,177.06588885141434L796.9003459525147,177.19235605507527L796.9290653175445,178.4719024305722L794.5988001196424,178.50552899213085L795.1120378060016,175.9375573166933L795.5602062553105,174.79201712943984L797.8449193390361,174.45921170877978L797.8934352034307,172.71280892996197L799.6949749761152,171.39055782981393L801.3452221440058,172.08217915983028L800.607704529395,171.01877147265384L804.4341688499203,170.40710633209517L805.0114141522411,169.09013200949164L810.2461662229011,167.84400652146064L812.0040097426107,167.09468792382404L815.6526917800268,163.05778171947168L814.2161455948742,166.38540851836115L812.7530462710804,168.20194045900666L814.2674877906129,168.20863243054805L815.6338278334335,165.85202851484917L817.9949031516436,164.31262762656218L819.2476953715227,165.0584769015635L821.4828654812798,162.6423510982521L822.0396087148924,163.15207163235334L815.3948250004687,168.64882173334297L814.3421838901328,168.42243594929448L812.7636248543654,170.49491510262396L811.5512773644512,170.43756308644163L809.7874194762996,172.2686116473293L807.8622549817676,172.64269725088923L806.3737808182764,173.99325903813508L805.1242377998703,173.93134353622827L802.7824427536561,175.64720436939706L798.7674132882103,177.8266536397341ZM797.3263033093278,177.54567917040367L797.3754178413249,177.79608825720265L797.3263033093278,177.54567917040367ZM793.8784826519427,177.93167272923336L793.9245815532516,179.78438069060712L792.1943908107955,181.28095562237468L792.4476349722876,178.38945036725522ZM331.98615298476255,121.72753712686426L353.55857284827596,124.39717696805678L356.6882715225784,124.73652767214708L368.9747358505291,125.84694661151434L369.6389242958943,125.91249949176836L382.5182680680963,127.13048972108277L381.8664673020142,135.0814536645256L381.2663335260095,142.37113582108464L381.2038890199145,143.10621068944624L380.7381108603348,148.47543006493777L380.19162040283027,155.02228252639577L380.1464461858333,155.49686418337524L379.41376385508755,164.35170699829507L378.7990039767548,171.70527086323125L377.8286180635955,183.13087211319112L377.3450404154846,188.82465363431743L377.1320533832179,191.33242386169934L376.86968216714445,194.5395666554042L376.2254413381485,201.8885658770621L363.8325312316832,200.8373946984501L359.1880722668508,200.3898252632266L346.48067215588253,199.0899109762978L344.6872867695132,198.87427868472867L337.2110195526866,197.96963670734635L330.83369486412107,197.2171167539791L322.5059884565578,196.2113387566966L306.8205688604494,194.16458121615165L293.65660893418203,192.33570507513207L293.0015330486693,192.23833440601436L279.20767358584493,190.10525532134045L279.96597643609255,185.38721877092212L280.94918641123934,179.2917078136013L282.18542063437525,171.4536805154121L283.7018105789312,161.95553979865701L285.2416691847088,152.5577038120432L286.1069653617815,147.07516485894723L286.64589863202497,143.63758020028786L288.0481456605741,134.7011241381732L289.4689868456089,125.62012859285994L289.9562597753677,122.0556696752052L291.0901143861885,115.88793193239883L295.4823031517515,116.75285043280724L307.32805093497205,118.35668167037636L322.7034944039235,120.54306880803813L327.5636074981978,121.19679246374426ZM528.7747932765471,159.05872033598155L535.1251672412604,158.83399750263027L536.5275337096691,158.77831434889458L541.5034359595513,158.57961523899598L546.2030349524372,158.3760117388582L547.8178027509169,158.30341978214722L553.1158397794857,158.0496171850674L553.3535624237751,159.4948615147856L553.4372736766019,160.86430609849106L555.4937787192492,162.49118158862223L554.0621707500688,165.90103142132682L554.4225065859346,167.61277808100965L555.8942735503023,171.97620767925162L558.2634157902353,173.30122951469616L560.9606321447934,173.98844694975867L561.9319647671487,176.2380765454633L561.7820857480557,176.8077232591337L564.3498414403705,178.48713278879995L565.62569049015,181.31759132538605L566.6966685657056,181.88323334794177L568.9124398941098,183.2009000898836L569.1335160187468,184.78235025279457L569.2774683302606,186.7169534934328L568.1983477791068,189.53350785196005L567.2440492722833,190.61256914892692L567.0251175688162,193.28252547717182L562.8318553207873,195.8949216157231L561.034915840996,196.16898673869184L557.549423178835,197.00368175945437L557.189000742115,198.62310750546442L557.1892103579065,198.6271465259814L556.7061649162121,200.41388763318332L558.5023839401475,201.90809632206845L559.1552653097549,203.43823954861944L559.1573605097602,203.47762834753303L559.1165904629249,206.20955409986482L557.4295514306782,208.20738578011594L557.2423185841045,210.63620097556918L556.2766484051201,211.78981849354489L553.9381853945392,212.49490073173047L553.2521970258172,213.5585535285977L553.9709015668082,216.37360916783166L553.228266255452,216.83518992294046L548.8501661352943,212.88703761332715L545.6685742276856,212.88796453487623L542.3456589449022,213.1249891961553L539.9482414933166,213.28101336729696L535.91872510881,213.55121472454334L534.845495437237,213.61610020878186L529.4671144561868,213.89350930005514L525.5746260666759,214.0745698564533L523.0117642543827,214.14495201763032L519.9554455424772,214.27064675660347L516.5660851338519,214.41556748858306L513.5187497668454,214.5121644034965L510.15794600668653,214.59069397568067L507.89674853406007,214.61503422408362L503.91882323429127,214.59654649788672L499.8756289351788,214.57385439495738L497.4629525527541,214.55246030260935L491.95663922123725,214.48935341112747L490.2925742146339,211.4287285040249L490.9862221337207,210.75188421224254L491.27373887865,208.52981967897222L490.34569059692075,205.67587327007357L490.3231217513893,203.67037222157728L489.72697539133736,203.087472701328L490.164507787729,200.64803102203575L489.5243747475092,199.32407730634623L488.7110394311819,197.13760603381797L487.43133268553817,196.69324950963244L486.9619989230219,193.8240975367097L487.7584380923766,191.6712406173524L486.74345495063494,190.3746793809812L486.84043140341737,188.34292017655798L484.9048326699773,186.9668521720762L484.98232743659975,185.7740525520876L483.7601003324395,183.8095128995028L483.76937043896567,182.6521535048505L483.01597646846324,181.435268880752L483.21923144427643,178.73318021345506L482.54188071047054,178.63728835048767L481.8416755571844,177.30022037824222L481.7015285711891,175.98723563132705L480.1475142292529,174.53971091455196L480.06673691929205,173.4320892886567L481.33903878682554,170.75893222628793L481.7340279148238,168.1090301275641L482.50182896831353,167.48656943714525L482.2273565040618,164.92471804097636L481.1481146446363,164.16666559517898L481.584463953287,161.65984611536453L480.5840766143545,159.64815889657882L482.5537363807226,159.65905853109064L487.9449507680171,159.67844755503347L490.53411359204085,159.67929300893695L496.0075644799285,159.65053067100985L496.91257148098595,159.65006150853173L503.29562401568535,159.58902763130334L504.089167326057,159.57266358175025L509.6541614986644,159.50163515697477L512.2817224191687,159.4609293511014L516.0124931774124,159.3967973138192L520.3621030604634,159.29554517132988L522.4038221652997,159.24641899337848L528.4506988339296,159.06882914456287ZM377.8286180635955,183.13087211319112L378.7990039767548,171.70527086323125L379.41376385508755,164.35170699829507L386.8512122160674,165.03261520074784L393.66114515100406,165.55325227538958L396.4851047317584,165.77167206950378L406.1000961505806,166.43604148111456L417.68551510100167,167.15350471704357L431.6556944506987,167.8327098881456L440.666702059618,168.21158691641529L444.4523427559967,168.34484417212468L454.72956609397414,168.6449233548094L457.2351923446432,170.88909939156986L459.3451755116696,171.7581607163553L460.93203508280243,173.20212876342327L462.0392339993743,173.13250262048848L463.24151111442046,171.45306254561058L466.3989043383803,171.66465101387905L468.45020780764264,171.72052788148505L470.85813292677193,171.43199675745223L472.85477822982955,172.73241848722807L474.8075730925722,173.47028150230346L477.664945114325,174.5775501632977L479.131165538962,175.60047374789042L480.02678610622075,177.97387361453718L482.54188071047054,178.63728835048767L483.21923144427643,178.73318021345506L483.01597646846324,181.435268880752L483.76937043896567,182.6521535048505L483.7601003324395,183.8095128995028L484.98232743659975,185.7740525520876L484.9048326699773,186.9668521720762L486.84043140341737,188.34292017655798L486.74345495063494,190.3746793809812L487.7584380923766,191.6712406173524L486.9619989230219,193.8240975367097L487.43133268553817,196.69324950963244L488.7110394311819,197.13760603381797L489.5243747475092,199.32407730634623L490.164507787729,200.64803102203575L489.72697539133736,203.087472701328L490.3231217513893,203.67037222157728L490.34569059692075,205.67587327007357L491.27373887865,208.52981967897222L490.9862221337207,210.75188421224254L490.2925742146339,211.4287285040249L491.95663922123725,214.48935341112747L492.74238559017573,215.6447863972843L494.11207010755163,219.58773908978299L494.94722035705007,220.5152268791726L494.9829628564618,220.56971406780042L497.1944125191193,223.1365410557803L496.8619807962244,224.43126986943776L498.4661134873296,225.48347173441198L498.0183636427602,225.48665604860128L491.6632626551577,225.5077095168324L488.5086035915571,225.50699812677055L485.26746631181135,225.49868542011382L482.0874198996993,225.48388747486626L477.23861857261886,225.44340823265543L475.6715604211994,225.42819949576915L469.2509801544212,225.3428988068166L462.8358885976191,225.23317048076137L461.27924896363703,225.20242855798904L456.42670650919524,225.08390808796935L453.1610517196427,225.00888357351425L450.0178956325814,224.92034221988354L445.18648497062895,224.7740529448845L443.5997411298828,224.72594214828757L437.27912606649727,224.50565723218085L437.2384511483539,224.50410431334296L429.45501808521885,224.18834097579372L429.23144875453113,224.17646199951002L421.5065246526028,223.8050672082329L421.22718339336507,223.7880569459428L413.204945814373,223.35394655851496L411.99067951271013,223.28832694796392L402.93075716125554,222.73217519551065L403.3508426957093,216.22321151491587L403.4597290871345,214.51535756686621L403.7684430273883,209.6732619222305L403.83075686655195,208.6958860092193L404.1186366830899,203.94402312802413L396.1896961177674,203.41256982941934L395.73913598527236,203.38308238839068L385.57254678805646,202.63202793113578L382.9010113981078,202.43152877435728L376.2254413381485,201.8885658770621L376.86968216714445,194.5395666554042L377.1320533832179,191.33242386169934L377.3450404154846,188.82465363431743ZM826.6142827668622,135.8597110593156L826.3070433599537,135.98613851320556L826.544012783266,136.337576470003L826.535557495807,136.34402923230448L827.2870367501846,137.83186108190648L828.9033098114193,138.0730875751127L830.2131109424415,137.38588372460083L830.8828048192178,137.6708072358631L833.556946357458,139.92042799710703L833.021393893935,141.6373653726605L835.6924103414404,142.49366990856413L836.2918938864789,144.58405891022414L838.1460388404053,145.31907031262017L840.1980111187952,145.13940417822232L843.439506177101,142.64964537082506L840.5694982276325,138.65909261280513L843.0616251513391,140.20331794347692L844.4579774322463,143.21168778708955L843.9370377431109,145.21393987365423L839.1078910785047,147.45988841905762L838.1744921493755,149.11052760824282L835.8722536222672,150.1657961720224L835.4894180989411,146.04878173456166L834.2030158301782,146.61470472296094L834.1431688922257,148.22942216731087L833.1068945610039,148.98525211569722L832.4156251861507,150.92628699760076L830.0568687562238,152.37629490872985L829.0903374107634,149.46022616523942L828.1733141921268,149.41670135350353L827.5712189299434,148.83678529926556L826.0528672420522,148.01528345862118L824.1977161644843,144.44297959192488L822.4887640215092,144.26770800576276L818.5140136694832,145.4865167557158L814.3759761209915,146.15372759983632L813.9241016460314,146.2426009224797L808.9181582932212,147.43901311484888L802.2249516584172,149.01750358366837L801.6208991622026,149.14870586913503L795.7715708903058,150.3856154389922L795.6464165458101,150.41478172699226L795.3333446816546,149.77016275313633L795.5346643235753,141.53712796635727L795.6480893663786,136.94600403447714L798.8725903088762,136.24774907938183L800.1114576611533,135.9780149864323L806.4058202313613,134.64108929202723L808.7507541111854,134.15094505601837L813.4690157193054,133.1193855093353L813.8708943849057,133.03094040631152L821.914381164178,131.1997570155262L822.2318156594835,130.3560245378103L822.3372439080026,130.20051904534557L824.4048049040041,128.40954493630102L824.590755915964,127.33147651750039L827.3291595066999,126.34302072549247L828.734506222808,129.11080177304052L831.4587812418577,129.71697786949585L830.8894342881699,130.83127404637128L828.0513621916516,132.6594137458519L828.3351024660179,134.0844839902461L827.3029451819406,134.91843260286123ZM837.266162968395,151.29702159976466L839.5747476050144,152.6961030462171L835.923038256092,153.9735925427923L835.977551331546,152.0285064337736ZM845.6597828558461,150.93261367821435L846.7465337240253,152.56731373229525L844.7593443358783,153.3318922435992ZM578.8624607612287,175.32032226017748L579.3427307783395,175.28987172531504L585.1635956780729,174.968002090852L587.4009091915134,174.8562676866061L588.3438118907263,174.7557713519916L593.8351297072173,174.3016332090557L595.302749353417,174.17259016126616L600.650389159307,173.76805916941748L600.5551973226577,177.35581475166566L601.8207215117578,180.08680334194685L603.020272168881,181.4492575022532L604.4030546018366,185.69577994646284L605.7959540994759,188.13770801315684L606.1749020243237,192.65542029076596L606.4421246970711,195.81282385496513L606.6636046462647,198.29056121009899L606.9346412204344,201.21001327092927L607.3931120183339,206.3385744940515L607.7951362234774,210.94921526696623L607.8188315914413,211.21429975231854L608.3051790963442,217.3965659940767L608.7243333463354,222.3746929199615L609.2017915683873,227.54768258291017L609.4252882852799,229.99197592833082L609.6419008063282,232.4167060629186L608.7560208074397,234.17100654026547L608.5718409048089,236.11797285629257L610.5179654873069,240.77171355941005L610.4835236365191,241.7215107673254L611.1762269032213,243.7726522323594L609.2235412646177,247.21554803307208L609.4006227375949,248.2198486295673L607.890774306741,249.32307795549798L608.1514534989667,250.219555972811L605.9817351639001,253.17714877713934L604.8677799362779,253.48725591204197L604.9614418584313,253.9764482768378L606.1399537933723,255.15425518513894L603.9398361994334,260.4857746103878L605.0139625955627,262.1320639920207L603.3171301374751,264.8422211580711L603.8332711751381,266.4877765080215L604.9956610587705,267.69706951717626L604.7153767616634,268.3273456010876L601.8949586572696,268.9369710675812L600.8079023639843,269.94575534080343L599.9438392745092,269.65843230121834L599.1090924553887,270.40167850668524L598.7817598156905,272.82252209988405L600.2115613690383,274.79806016040334L599.3692956871074,276.42776934661197L598.2369628767286,276.2843028665369L592.7091514052946,273.9428399654431L592.6373879863382,273.9756120443085L590.4747956040551,275.353730899738L589.4065095927631,277.2387714734217L590.0122738989003,278.78429161751933L588.0650258700881,277.34284766165354L587.3176174833465,278.4172140681453L586.3435504066612,277.93722980930283L584.4418132592832,274.0634274092753L584.3962050300985,272.47354390116686L585.2135915377692,271.2139738621197L583.5524758430722,268.17355772545716L583.5448867431772,268.06239039081765L583.5407452772457,265.9193084928313L581.1743424700902,264.69734698011064L581.0242411580199,263.8657304607549L578.4240454517646,262.1038286635909L577.0912407141466,262.7641492145002L576.1234817163705,261.1589784377891L572.9243607041647,258.9959933005765L572.2170391244764,258.29205753844576L570.5240687523803,256.47257584076203L570.6231916569752,253.49040576342293L571.5698736762156,250.86828530283128L571.689134722768,250.68957884333406L572.6393468597521,248.19824341522406L572.7271657311857,246.07802083740432L573.3858901726915,245.41123964459211L573.368010520412,244.5375875877778L570.9802813384515,243.33399524044557L568.4005296609076,242.65822030922243L567.11688975836,244.52424178097135L565.3643000031118,243.45917870693006L564.2513813870788,238.04586858368145L563.507713298081,236.70256224697687L561.0038924392323,234.90733614175042L559.6666970252712,234.19515094781275L557.3708825761544,231.35083478159686L555.4819628508865,229.82645346230515L554.5506040870141,228.46112903228402L553.4895717766926,226.90998509371263L553.392524758255,224.99702511522605L552.4709720013379,223.30192252769336L552.1733059162246,220.23946465601296L552.2468311216096,219.32605343051227L553.228266255452,216.83518992294046L553.9709015668082,216.37360916783166L553.2521970258172,213.5585535285977L553.9381853945392,212.49490073173047L556.2766484051201,211.78981849354489L557.2423185841045,210.63620097556918L557.4295514306782,208.20738578011594L559.1165904629249,206.20955409986482L559.1573605097602,203.47762834753303L559.1552653097549,203.43823954861944L558.5023839401475,201.90809632206845L556.7061649162121,200.41388763318332L557.1892103579065,198.6271465259814L557.189000742115,198.62310750546442L557.549423178835,197.00368175945437L561.034915840996,196.16898673869184L562.8318553207873,195.8949216157231L567.0251175688162,193.28252547717182L567.2440492722833,190.61256914892692L568.1983477791068,189.53350785196005L569.2774683302606,186.7169534934328L569.1335160187468,184.78235025279457L568.9124398941098,183.2009000898836L566.6966685657056,181.88323334794177L565.62569049015,181.31759132538605L564.3498414403705,178.48713278879995L561.7820857480557,176.8077232591337L561.9319647671487,176.2380765454633L564.8596835342204,176.0927638976691L571.6929538006291,175.69882751865168L572.8983959256284,175.62213743323696ZM722.7799735423563,166.81928159275412L731.0584545202172,165.23739020249263L732.4241308533104,164.97943774622502L738.6119229952343,163.84124728241625L740.4960770582953,163.42512427364193L749.2024163313147,161.68749744029856L749.7307323710914,161.58014130922595L754.7063515491359,160.55795536800974L760.2489368681175,159.39558169508177L760.8053368423134,159.27751255564374L769.2030225286655,157.48755037502997L770.8116575178385,157.11097145095232L772.7732351261042,159.33134923865805L774.4052757652613,159.15883232320903L775.9964359245491,160.7291392553925L776.3865255561202,163.53977795403216L778.0814269003027,165.52266455413394L781.3905607508093,165.82762304277242L782.4142693041183,166.95295062867228L780.8658707828777,168.79471558540774L779.548115489443,172.663318591647L779.8763164185709,172.54702167332846L778.3015604130723,175.33479535334516L779.6641485394393,176.91653071026076L778.3703393984293,178.9915735796767L778.7294024981193,182.1818806931833L778.8962447302617,182.46713942956683L780.7785065050548,183.02159211040612L781.3482626393313,185.19616647573878L783.3194491957329,186.30516107633252L787.1403136680071,189.19554836403665L784.1018362101593,191.79168677136317L783.1536559423519,193.07205314938312L782.4145729326642,195.25171552105894L781.4667266360104,195.82573911865802L778.8549148856002,197.61937821778463L776.5652733736182,197.51260080657323L776.3808992714296,197.57665369280505L776.3711496164428,197.57981593910517L774.1330555571669,200.28665511635472L769.3072240601116,201.34013973309334L767.9470874140502,201.62375699012875L767.8521255385493,201.64379305691455L763.2628809365754,202.6067059828672L760.2325768573534,203.238614036562L757.272114490093,203.85534302978772L754.2485569720343,204.46955273525805L750.8562122322699,205.14125326582564L750.715896068541,205.16897050936348L741.9028856545759,206.83879332125753L738.4995316043982,207.47986076946881L737.9712848059348,207.57285321471613L731.9835253103518,208.6766771227783L730.2650937394131,208.9908256079957L723.8081994321573,210.17052465040922L722.6326097268131,210.3867764861186L718.6077419244951,211.0935474856576L716.4630815467181,211.46175323170007L709.3792197792243,212.6445196231349L707.9972732600256,212.86619824844513L707.2658251657296,208.38382639908718L707.1058643014585,207.3790923198494L706.6628954568756,204.71499013500204L705.94734822188,200.26726844499024L705.6924466672776,198.8097947873016L705.2000132677053,195.8133302119669L704.5547934937329,191.85615478134503L704.3980562924131,190.964392471118L703.7109884809666,186.78347592800253L703.6893621591496,186.62099570255236L702.5984790605796,180.01367975566313L702.5666763796825,179.82015540120585L701.4990611662114,173.32354759434872L701.108616984983,170.94763286036573L703.4954579527189,169.43680725392778L710.4744853321191,163.8029025959479L711.3391806226343,168.8146839857959L713.4053012486581,168.48419591601362L720.8437950089931,167.11923940816087ZM808.9181582932212,147.43901311484888L813.9241016460314,146.2426009224797L814.3759761209915,146.15372759983632L818.5140136694832,145.4865167557158L819.9873676422712,150.61497540211224L820.4173540534616,152.1479431947198L820.5973153773532,152.93771440538603L821.3414558411207,156.25073971086647L821.0771916194574,158.0108020914713L819.0755258278034,158.96761243809874L816.6713804428344,159.28481920798868L814.8674712736516,160.6207185963326L812.7821630970083,158.3094376556203L814.5009647124994,160.8829027062685L811.9560043292042,161.64453109678072L812.0154367364366,161.69629785409631L812.1367477851284,161.7481128622162L806.7293022551078,163.03728483080738L804.8196792584778,165.17466306299445L804.514009431785,164.09804604006388L803.8281170325083,165.50217388858903L800.8967902505856,168.39113914458676L798.1246901686674,170.29029221045607L796.6977431887512,168.5266635046961L799.5298192704724,165.67718946806883L798.011677443702,163.06842593759166L797.50166067882,160.07782496459004L797.045541156398,157.48441660244737L795.7715708903058,150.3856154389922L801.6208991622026,149.14870586913503L802.2249516584172,149.01750358366837ZM827.5712189299434,148.83678529926556L827.4603666204575,150.23448189488272L825.7087094855765,148.55626962552344L825.1273882801271,148.4939510729572L825.1544115689776,150.6927224827715L826.1545856829107,153.94874903463221L825.7645708788916,155.9675015672434L821.0495762567873,158.50060887147617L821.0771916194574,158.0108020914713L821.3414558411207,156.25073971086647L820.5973153773532,152.93771440538603L820.4173540534616,152.1479431947198L819.9873676422712,150.61497540211224L818.5140136694832,145.4865167557158L822.4887640215092,144.26770800576276L824.1977161644843,144.44297959192488L826.0528672420522,148.01528345862118ZM828.068293845705,150.16028604630503L828.3867098076266,152.99627615285897L827.2447893750038,152.77287028035198ZM830.0568687562238,152.37629490872985L829.251000542491,153.37464863118612L828.1733141921268,149.41670135350353L829.0903374107634,149.46022616523942ZM149.69255507738967,143.35642899581512L161.4316944556187,146.42455346316547L157.60978744985096,161.19727160964794L150.71615055150994,187.853153306369L149.3888859867542,192.85324911719226L148.7124581516968,195.24829201287093L148.04865237130286,198.0054927728478L147.8091000530519,198.97496622588562L147.61098970412195,199.80453533952436L147.3128734059569,201.04239369548122L148.3443584300877,202.6048534436618L151.81835564835848,207.83863075027182L154.53726681530276,211.90690059454175L156.40922377696114,214.72931916597258L164.384173890831,226.74557133760857L170.98245148321678,236.66903154150282L178.47042302161105,247.94941362816712L193.02461238573687,269.8683717034909L195.84920341105197,274.1211640931841L207.8332295109568,292.14191615883067L207.3662502366762,294.5771591370558L209.17599031899857,297.92004405876844L209.30841427511012,300.1941894553777L210.21242738736572,303.1588020734322L212.71880949917983,306.4886730092187L210.4941283788787,308.54647330661794L207.51600223187444,309.6041722481739L207.2439186164143,310.7034073345426L205.38423113501085,312.2942928807024L205.12546348076904,316.63302738634013L204.18046256550167,319.2186917456378L202.21803256694614,321.0420345061083L200.6245766937734,321.3056778697137L200.12688386348265,323.2022029711667L200.83264865562478,323.96075035297997L199.71578894362978,327.22738340991236L200.05540306729745,328.2081098148615L202.40895108055997,328.94209049363735L202.77865612479076,331.2865735457641L201.2475103264273,333.8732328144773L198.16011706908756,333.99702027836133L176.5521175264435,331.4469171567233L160.6416792319974,329.55529851299707L161.3084989791539,327.0373997858618L159.73881760240283,325.818891097749L159.4648657689533,323.7395219821159L160.13005447238777,322.8848224495305L160.01448148630237,318.2109448007633L158.08116792399443,313.4083112521122L157.07026867370365,312.29918643916494L154.87631871625626,308.8093801798466L152.08490218019722,305.9497160902109L150.81463355063357,303.9104972709197L149.31451841711203,303.0680884828412L148.00973473247234,304.0303789132864L146.33128443385203,302.9352333725516L147.05743887400138,301.21411114313094L146.61881559646287,298.6681382876212L145.67341361955653,297.01355252144594L142.79792778739392,296.42667831017934L141.57663040872654,296.7557501454771L139.68802728794282,295.42941774694293L136.1707773049696,292.60659312882615L135.74614100456176,290.1510104775417L133.292345325609,287.45114503551554L132.15565421344644,286.37237306283885L127.50714843332202,285.3523168571338L125.8561924006587,283.889542790462L121.64138138288138,282.58387055455455L118.9363441037143,282.3081327172032L118.68132653869674,280.7810422743115L116.97927052997926,279.2282236579083L118.255928247827,277.0585882216992L118.76886593502127,274.6098740732442L118.16575967164096,273.2463561418923L118.82348946286959,272.0215255553014L119.63877145048525,268.86411146623743L118.14203772469608,268.23466902582777L116.54376899667102,265.95136547977836L117.97750717491675,264.7271797311495L117.58280640238564,262.7451974924877L116.0122110785818,261.7908700379893L114.53481697692763,258.0376865847412L112.91492994486771,256.9795449010371L112.69393880421865,254.36849303465544L111.46785734374521,252.20012202912142L111.53406457677363,250.3957155834172L110.54895168625569,249.29809741842087L109.35405113513502,245.64806581420987L107.31168651487832,242.9205836890378L107.5684551982867,237.62318026612252L110.31043488818807,236.5618235408216L111.44879156597551,233.28648435887771L110.12478622723347,230.52780123686102L107.63902826141583,230.25678999382274L105.77175310020459,226.75291354831575L104.62865117153694,224.68053377545993L105.53463846134878,221.7347557697343L104.74621146629437,218.3752363412657L105.90962097256454,215.0194499563646L106.1173621086208,213.6648788183403L107.71872193554105,213.5400202429745L107.44013534124866,215.4545930109117L107.32728694614207,217.69224958256598L108.59529781009911,218.44531355072183L110.12142939448262,220.96214282476376L111.92612293236124,221.53165360399203L110.39860945333555,220.30883627587957L110.49891802661028,217.06698563792395L108.82472252995757,214.06039565351296L109.57216307084491,212.3509217128685L108.86323037626403,210.8442726387467L111.07735716885043,209.73078229576606L112.50421532201676,210.73664001296618L114.56484494816237,210.61271749222783L118.31463448169137,212.40413703130275L120.5198146535206,211.43169727323004L120.53693768094035,212.607074233596L121.01652776584086,211.41848791494021L119.33408998683234,211.40750670369312L120.20301854743013,209.75612547310868L117.54761334755989,211.3571782993613L115.71434161311532,211.04325841593152L114.36448208025558,209.0664828180004L112.81726210134019,210.41659295205375L111.52694692217563,209.52444042304762L111.17275579174617,207.72983498300766L111.05363676721578,207.6907439265516L111.37760450816944,209.32314271712164L109.58695835029516,207.29542950104508L109.57910592654167,207.24684150429312L108.15726663007842,207.73820888823707L107.6340223959491,206.6831470315757L108.17626591150974,207.86165351985346L107.0452312361478,211.01500237116647L107.71350200559777,212.106907837089L106.11908583106612,212.89719428679894L104.73936344623382,210.67838593793408L104.0719233939787,210.83805047569115L102.34887277222725,207.79437752668503L100.38591584374615,207.5211408361414L102.02796045604856,204.970685025055L103.20566635577336,206.84907928750567L102.00118682230277,202.34389977284388L101.0476080532826,199.0440332724114L98.8282089828117,196.11874677176945L97.14962946516715,191.62951304320393L95.28322286640173,188.10879073734498L96.43132124994855,186.24010342146232L96.25214538855323,179.91939812880833L97.99421001651962,176.81979413825263L98.47301909276075,174.6069354627623L98.51333999666758,171.05761794626983L97.13807564672754,167.3549124841112L96.51547736233965,165.15624268172348L93.96788464417699,161.28955981152808L94.36423052007592,157.79957879390588L97.6442488674897,153.75927539202803L98.19727580496817,154.22493023725156L101.56313998262289,148.52136775682595L101.18322300137544,147.48131644376372L104.58484685902226,140.81063431324242L104.80733015780595,135.50727799342553L103.80385368905587,134.3422572832153L105.58225398350447,130.61436534891652L110.71013504890601,132.23147645533004L114.74776051071007,133.33478297475176L118.56224690877832,134.40582758589494L131.02987181580335,137.9351810796403L142.15843383035974,141.24153201410024ZM123.15975701797686,291.4033109290451L123.94531371751953,293.4578898880942L121.48862161509163,293.74029055765516L120.3029252248092,291.2170690091755ZM125.55114855151044,291.28911072509425L130.3999669042003,294.02654919756685L127.75959583560098,294.0911582976478L125.87367712056437,293.4703587879959ZM127.41714324917871,307.1081626245302L128.66346790903395,308.42754575951164L127.03910231522457,308.0354183830269ZM140.50536683339539,315.2791215000219L142.99682993285626,319.56865656227967L141.08937588564066,318.85864999623925ZM142.26329440818074,307.0323176491361L145.52729543732062,309.20737198800055L145.69587278841624,311.32061426559153L143.81461392821996,310.4328419276519L143.49897954318646,308.2311678166966ZM282.18542063437525,171.4536805154121L280.94918641123934,179.2917078136013L279.96597643609255,185.38721877092212L279.20767358584493,190.10525532134045L293.0015330486693,192.23833440601436L293.65660893418203,192.33570507513207L306.8205688604494,194.16458121615165L305.9507550076048,200.6437079885444L304.8045626695131,208.6805652283516L303.3491984838075,219.17529090225582L302.9290839464752,222.21546064884012L302.59608444295327,224.6627203048863L300.2305103163204,240.832935939025L299.58753085987183,247.34998316527685L298.89674898141914,252.42892510447666L297.8478058885993,259.8328031049193L296.5688665006553,268.89977970478174L282.58956634131846,266.91872760778097L271.6555957481746,265.15177470600713L261.9969155042003,263.63997511774767L245.56614599577378,260.866064664238L240.35035462788937,259.94509590262237L223.6291833612022,256.8345455380602L225.75496360063715,245.63714653618524L227.72686805553445,235.5740618966796L229.23730284859948,227.71659622634138L229.60901544194428,225.78290206433644L232.71931094137534,209.76552504524034L234.02195609661848,203.04216327817267L234.77226706693938,199.13831805773634L237.9806384091279,182.81739842586308L241.51437533212479,164.45244088140396L255.62126287079596,166.99664084530787L266.95905635804127,169.00653436610048L267.7145145618956,169.13708142644555L275.90534585979714,170.47636550018183ZM170.44474996095113,148.73365908597668L185.5467390853404,152.36064280589312L201.26264186741616,155.9443229041574L201.38062018260996,155.98327886854509L213.10504367718886,158.58241564320986L228.03746052948316,161.74634177601865L238.25747411672734,163.81312146165828L241.51437533212479,164.45244088140396L237.9806384091279,182.81739842586308L234.77226706693938,199.13831805773634L234.02195609661848,203.04216327817267L232.71931094137534,209.76552504524034L229.60901544194428,225.78290206433644L229.23730284859948,227.71659622634138L227.72686805553445,235.5740618966796L225.75496360063715,245.63714653618524L223.6291833612022,256.8345455380602L223.07456037997372,259.74778796890325L220.85671139851286,271.7960812693101L218.64276359979613,274.63591294976743L217.42957209618055,274.599838504075L215.885414860548,271.80554632593373L212.06919458182676,271.061433275161L210.02459988362187,271.74113838493486L209.91880116898847,276.2243146864588L209.07516794134347,282.557548364034L209.59647175053726,286.2414900478776L209.383921564148,289.35391101575624L208.00566563363606,290.2410311623313L207.8332295109568,292.14191615883067L195.84920341105197,274.1211640931841L193.02461238573687,269.8683717034909L178.47042302161105,247.94941362816712L170.98245148321678,236.66903154150282L164.384173890831,226.74557133760857L156.40922377696114,214.72931916597258L154.53726681530276,211.90690059454175L151.81835564835848,207.83863075027182L148.3443584300877,202.6048534436618L147.3128734059569,201.04239369548122L147.61098970412195,199.80453533952436L147.8091000530519,198.97496622588562L148.04865237130286,198.0054927728478L148.7124581516968,195.24829201287093L149.3888859867542,192.85324911719226L150.71615055150994,187.853153306369L157.60978744985096,161.19727160964794L161.4316944556187,146.42455346316547L169.962119533568,148.60435335545844ZM703.6893621591496,186.62099570255236L703.7109884809666,186.78347592800253L704.3980562924131,190.964392471118L704.5547934937329,191.85615478134503L705.2000132677053,195.8133302119669L703.304533589701,197.1947192087298L704.660831978131,199.26602558632987L704.4148445293046,200.58384846162858L705.0511287635991,201.90429135360932L704.3102396607234,204.6072530155484L704.1053453082892,205.18198355553113L704.0421709386552,207.55388191104998L704.1389459596853,209.83945212171693L703.3557962355408,211.19236618059426L703.593662362171,213.6008648997821L702.3734648630536,215.96841382872526L701.2370619080216,217.4248673928555L700.3141648920796,219.1323309819552L697.1290974004274,221.84367828267125L695.9467120173313,220.7478340383002L694.5420542566785,222.21689086521678L694.4841539084623,223.70613423874704L692.977862655346,223.81891369454706L692.4703205666946,224.96519986508974L692.1279142489519,225.6950042733156L692.4850088866489,227.2317190998716L692.4715691857366,230.53086687788982L690.8158829187123,231.64777471441494L690.7553929751388,230.5436401066787L689.0673514436413,229.05319462802834L687.8769341876223,230.49154215674344L687.5737573940979,232.90402646847622L686.6342469108444,233.98541045633726L687.7712434467572,237.32006667014946L687.2314918319641,237.64470860162112L686.2238247818102,237.96244490545973L686.0955351709224,240.51432213046849L683.5625047256248,241.60347231880405L682.2332514474758,241.60252928165312L681.0127676268229,240.17530733619992L678.6877705989109,239.26309416969502L677.1790039318726,235.98175479970882L675.2112657613128,236.79741370489842L673.6871560911513,239.04210247486287L672.0994038664601,239.2600987555321L668.355465834395,238.20544204878342L666.6462193070579,239.63864982456857L665.780187492324,239.73422189780138L662.6189303721044,237.6613851211648L660.4853489658508,237.8693954217399L657.8126952102627,237.13888204609748L657.6818375051741,236.25493980734154L656.0908999826731,233.6619346485636L653.2617048987684,232.61374493439553L651.6355403599806,233.20310668983427L649.753286238459,232.04109677327017L648.7621422005459,232.95513548733322L648.3303356469125,229.21361293008613L647.9067349451074,225.14923962166904L647.8159702198027,224.29430697659416L647.4691446749912,221.3173775192746L647.0731411766762,217.7511918781529L646.9033138470111,216.09846216268477L646.3288880046275,210.3790890785009L646.2292956352155,209.58066699986773L645.7636245384984,205.47408374695408L645.4232560689032,202.55558797223284L644.9828122223844,198.92001732755182L644.8300470899554,197.67201002677632L644.2426307516588,192.75135712827853L644.201153422027,192.400896394004L643.8538382054753,189.50870239534174L643.6138068510652,187.56523904428036L643.2269044558229,184.46488911652682L648.7925891557405,183.61102091484133L649.3280861578296,183.52994831032402L655.8847878557889,182.45147199223732L657.4867513232497,182.17782211571466L661.3108262078879,181.5139124541589L661.3402254964878,181.5089982153188L661.4870870757741,181.4834152095135L661.5657041966797,181.47196826076242L661.6928734880224,181.44897378667702L665.9368639476867,182.96132813761938L668.8929695202135,184.52162249075866L670.5970639814275,183.00347544114254L672.2678561856897,184.3812930788439L668.1000694532763,185.8134338530067L667.8537028180048,185.85129913869662L667.7797638471618,185.86244934956767L670.0562926222306,186.05792012594043L672.7391927560884,185.04899898336828L675.6768264604319,186.19240989959724L677.683864320377,185.04475875914648L682.0572457562071,182.71640282073304L682.6830788711504,182.82787661127986L685.8018926135738,182.6976451210245L688.9060426322549,179.47977637906854L691.3247226738658,176.5981763706758L694.9010348906465,174.31384384505918L701.108616984983,170.94763286036573L701.4990611662114,173.32354759434872L702.5666763796825,179.82015540120585L702.5984790605796,180.01367975566313ZM637.722848177819,183.9020690962427L642.8246020824271,183.30344711107136L643.2269044558229,184.46488911652682L643.6138068510652,187.56523904428036L643.8538382054753,189.50870239534174L644.201153422027,192.400896394004L644.2426307516588,192.75135712827853L644.8300470899554,197.67201002677632L644.9828122223844,198.92001732755182L645.4232560689032,202.55558797223284L645.7636245384984,205.47408374695408L646.2292956352155,209.58066699986773L646.3288880046275,210.3790890785009L646.9033138470111,216.09846216268477L647.0731411766762,217.7511918781529L647.4691446749912,221.3173775192746L647.8159702198027,224.29430697659416L647.9067349451074,225.14923962166904L648.3303356469125,229.21361293008613L648.7621422005459,232.95513548733322L648.1024003037742,234.44735056695038L648.4913071398908,236.87054421464825L649.6653924897207,237.55907846339312L649.5300662621305,238.96831270325163L646.6080221739736,239.73576926641817L644.2076868990105,241.34655472546717L642.2283198789136,240.7167850471775L640.5799800314853,241.40094200490546L641.1734235261914,243.68090780803902L641.236863096312,244.85713824517586L638.5785534579508,247.87203405090304L637.3270634219184,250.13691610374917L636.5555600518752,249.83619569175255L635.2063780068936,252.07141956930195L634.8474355658045,255.3633372992573L634.1384283895133,255.57185168859223L631.504456809564,255.6285397804968L630.1417014368552,254.90157338401332L628.9933232221506,252.65883215473752L627.207479087312,253.9843410170879L626.9181848311066,255.44180557516154L626.8566745678468,257.71214967654646L624.9062858221865,259.48796306893826L624.9681463471512,258.46089858415667L623.4137024441322,258.3336252592875L622.3280369443022,256.79556121755377L620.0493618979767,258.303853653848L618.8303992372532,260.99660762241876L615.9366342773267,259.66070341816805L615.4120563706639,259.3335704898153L613.1756944381762,258.7365261564453L612.3525683545957,259.463457197155L610.9674076964342,258.30950508149033L610.9739690084357,260.9967142828958L609.6125609899753,259.8728449421369L606.3239573940634,260.08358206551134L606.7626076337519,261.8355051276907L605.0139625955627,262.1320639920207L603.9398361994334,260.4857746103878L606.1399537933723,255.15425518513894L604.9614418584313,253.9764482768378L604.8677799362779,253.48725591204197L605.9817351639001,253.17714877713934L608.1514534989667,250.219555972811L607.890774306741,249.32307795549798L609.4006227375949,248.2198486295673L609.2235412646177,247.21554803307208L611.1762269032213,243.7726522323594L610.4835236365191,241.7215107673254L610.5179654873069,240.77171355941005L608.5718409048089,236.11797285629257L608.7560208074397,234.17100654026547L609.6419008063282,232.4167060629186L609.4252882852799,229.99197592833082L609.2017915683873,227.54768258291017L608.7243333463354,222.3746929199615L608.3051790963442,217.3965659940767L607.8188315914413,211.21429975231854L607.7951362234774,210.94921526696623L607.3931120183339,206.3385744940515L606.9346412204344,201.21001327092927L606.6636046462647,198.29056121009899L606.4421246970711,195.81282385496513L606.1749020243237,192.65542029076596L605.7959540994759,188.13770801315684L607.1151794246932,189.0501353830001L610.0911308959306,189.3279884388836L613.936670928747,187.33451739311818L615.3288082505193,186.2522119352327L619.4690152710396,185.8568673294916L623.5657963455466,185.42635807845534L625.8165591942744,185.19009499550168L629.6391691160964,184.80973360799726L631.3611721856475,184.62279196715303L636.4106645434063,184.04713163046915ZM789.9604978558002,169.46113005869688L794.7575653381782,170.96527293814017L794.3960459152057,174.8757613659783L793.9534383407165,177.63344746660061L793.0097438408834,178.24655894776754L792.9763152496139,176.4909437250244L792.6023639865331,177.501239997943L792.3366644233263,179.33388413357102L791.8880720484831,181.50291860568598L792.7525309096633,182.02784679771196L795.9618028644359,182.045640087734L796.7702040381148,183.90757852114712L796.832481321257,187.79974667832096L795.8950411264631,187.63009250137816L796.8770724986604,187.83396836925908L797.3392612596379,193.33881524978187L796.5957731360011,191.19639744184133L796.1288773721944,194.90843103917155L796.816987440586,195.54094919652255L794.8930707275199,198.6660936202352L793.8998147274967,198.983340114425L793.8754123005704,199.05964818995892L794.8041076524933,202.57717095974544L791.6879628404638,204.74897010108475L792.1889607123137,205.34916769420397L791.068835529258,210.4717955812174L790.2282275038183,211.83052863520425L788.722566349056,212.1721715275645L789.0858609053732,209.16157016195143L788.5332840092619,207.62510155197413L784.7162546479087,207.36705093397165L781.543439680564,205.9470256189511L780.8126322608653,205.39774493190043L780.7228604377772,205.37187963639064L780.6538009463907,205.32071510368655L778.460757412928,203.6992813288822L778.519312398068,203.67922244319595L777.82247465302,201.7140117021704L777.6893549171425,201.29639757118696L778.90139370291,198.04454091167906L782.5875036953795,195.30130329551946L783.2288311131534,193.10500958925422L783.1536559423519,193.07205314938312L784.1018362101593,191.79168677136317L787.1403136680071,189.19554836403665L783.3194491957329,186.30516107633252L781.3482626393313,185.19616647573878L780.7785065050548,183.02159211040612L778.8962447302617,182.46713942956683L778.7294024981193,182.1818806931833L778.3703393984293,178.9915735796767L779.6641485394393,176.91653071026076L778.3015604130723,175.33479535334516L779.8763164185709,172.54702167332846L779.548115489443,172.663318591647L780.8658707828777,168.79471558540774L782.4142693041183,166.95295062867228L787.6122270197291,168.73208277363585L789.6720680976211,169.34874558406057ZM363.8325312316832,200.8373946984501L376.2254413381485,201.8885658770621L382.9010113981078,202.43152877435728L385.57254678805646,202.63202793113578L395.73913598527236,203.38308238839068L396.1896961177674,203.41256982941934L404.1186366830899,203.94402312802413L403.83075686655195,208.6958860092193L403.7684430273883,209.6732619222305L403.4597290871345,214.51535756686621L403.3508426957093,216.22321151491587L402.93075716125554,222.73217519551065L402.4417574120113,230.803753620674L402.43473660626427,230.91389928523915L401.95413335214937,239.1014915094703L401.8612008196243,240.7223403254626L401.4577202713991,247.3005806408496L401.364197169008,248.8505508796469L400.9541993175669,255.37014289852345L400.94133676183606,255.49011108572734L400.35013165011395,265.3510577589316L400.2477396883334,267.1248952481843L399.94214896436233,271.9257130698654L399.45760267121005,279.3709813690093L385.32184671894476,278.27553481525047L384.08485580466595,278.18063918352254L370.50631763680275,277.17736206358643L353.6283172334229,275.6665778293768L352.66235733968256,275.5749412345622L345.3460856235341,274.8303300868805L341.1103308142377,274.39938369660797L334.2121207714081,273.68271206474185L320.3579439511178,271.9613720745873L319.4736962269195,271.85431350846363L306.3170484885112,270.20326735507L296.5688665006553,268.89977970478174L297.8478058885993,259.8328031049193L298.89674898141914,252.42892510447666L299.58753085987183,247.34998316527685L300.2305103163204,240.832935939025L302.59608444295327,224.6627203048863L302.9290839464752,222.21546064884012L303.3491984838075,219.17529090225582L304.8045626695131,208.6805652283516L305.9507550076048,200.6437079885444L306.8205688604494,194.16458121615165L322.5059884565578,196.2113387566966L330.83369486412107,197.2171167539791L337.2110195526866,197.96963670734635L344.6872867695132,198.87427868472867L346.48067215588253,199.0899109762978L359.1880722668508,200.3898252632266ZM716.4630815467181,211.46175323170007L718.6077419244951,211.0935474856576L722.6326097268131,210.3867764861186L724.1650941860437,219.97514503990556L726.8026657802988,217.17674955521613L729.1659230519116,213.83943640582663L730.7320776132664,214.34786782141657L732.5506637499575,210.754038519593L734.7455703653478,211.76625886061947L737.458044216856,211.6172226506676L737.581200765094,209.6000020987084L738.921422867505,209.0324462441863L739.9378050040614,209.1232553753348L740.8679193474528,207.52205944942853L743.3498600502337,208.52918518412764L745.9742109909514,208.2788204467371L745.5077477378608,209.42600094240083L746.5547404673146,210.33542288220565L748.6765269258436,213.24194225599513L747.8080869865793,217.02643151071572L744.4519054566282,215.13319924672874L741.2557842754372,213.31055127879597L739.331394507438,212.23896398187776L739.8237068761632,214.3030035500832L739.0482430785704,216.29996916916434L739.5764964537817,217.91965345321614L738.3761105496103,219.6562120820979L737.9795429627683,220.34288976559048L736.0504049061136,223.62039960797017L735.1327988830164,224.11623747544525L734.3787173498204,226.63652776323602L732.3192235213683,225.34172338447752L731.7132251208297,227.13906763207126L730.279579125715,232.8387572411673L729.1964003651077,234.2896904659715L726.7495801337203,233.858547866074L725.5985035932108,232.28637505202846L723.8800686371923,231.79738937939578L723.7958674056204,234.86640488499233L722.4795654479764,237.45898188830995L722.8232328476195,238.19642696702124L721.292671051546,240.06940846531882L721.092841813951,242.3447250958585L720.0729034182301,244.67879542277808L718.78550428429,246.36512335150417L717.4268282227338,250.09914041020227L718.7141470382844,251.10714787227664L717.3549164149603,252.54699031851646L717.9438602283412,253.51997112151616L715.6601791366205,255.5300503284626L714.9605484473905,254.52419179768026L711.546253353434,257.1693564658658L710.09745496493,256.3327046465281L710.0734231166343,256.3160470512389L710.4714826299494,257.8289386481623L708.7121912401774,259.1291686882515L705.3416609755004,260.7816517028026L703.0493131568857,259.1760138651508L700.5285266071813,262.0663788939669L697.8376861036801,261.8814982298345L696.0465814719443,261.19853912673454L693.501957789923,257.8329012519656L694.3498305821041,257.16189790172325L693.6858032054149,256.77740678111775L691.3750332307316,256.87335876974396L687.8295933095915,253.7606437532329L686.3462617968146,251.81828856854327L684.9103865735326,250.29277336689097L683.834422280186,248.0846992473297L682.4276467040734,246.9830428888663L682.5761593050106,244.8707863614477L682.2332514474758,241.60252928165312L683.5625047256248,241.60347231880405L686.0955351709224,240.51432213046849L686.2238247818102,237.96244490545973L687.2314918319641,237.64470860162112L687.7712434467572,237.32006667014946L686.6342469108444,233.98541045633726L687.5737573940979,232.90402646847622L687.8769341876223,230.49154215674344L689.0673514436413,229.05319462802834L690.7553929751388,230.5436401066787L690.8158829187123,231.64777471441494L692.4715691857366,230.53086687788982L692.4850088866489,227.2317190998716L692.1279142489519,225.6950042733156L692.4703205666946,224.96519986508974L692.977862655346,223.81891369454706L694.4841539084623,223.70613423874704L694.5420542566785,222.21689086521678L695.9467120173313,220.7478340383002L697.1290974004274,221.84367828267125L700.3141648920796,219.1323309819552L701.2370619080216,217.4248673928555L702.3734648630536,215.96841382872526L703.593662362171,213.6008648997821L703.3557962355408,211.19236618059426L704.1389459596853,209.83945212171693L704.0421709386552,207.55388191104998L704.1053453082892,205.18198355553113L704.3102396607234,204.6072530155484L705.0511287635991,201.90429135360932L704.4148445293046,200.58384846162858L704.660831978131,199.26602558632987L703.304533589701,197.1947192087298L705.2000132677053,195.8133302119669L705.6924466672776,198.8097947873016L705.94734822188,200.26726844499024L706.6628954568756,204.71499013500204L707.1058643014585,207.3790923198494L707.2658251657296,208.38382639908718L707.9972732600256,212.86619824844513L709.3792197792243,212.6445196231349ZM553.392524758255,224.99702511522605L553.4895717766926,226.90998509371263L554.5506040870141,228.46112903228402L555.4819628508865,229.82645346230515L557.3708825761544,231.35083478159686L559.6666970252712,234.19515094781275L561.0038924392323,234.90733614175042L563.507713298081,236.70256224697687L564.2513813870788,238.04586858368145L565.3643000031118,243.45917870693006L567.11688975836,244.52424178097135L568.4005296609076,242.65822030922243L570.9802813384515,243.33399524044557L573.368010520412,244.5375875877778L573.3858901726915,245.41123964459211L572.7271657311857,246.07802083740432L572.6393468597521,248.19824341522406L571.689134722768,250.68957884333406L571.5698736762156,250.86828530283128L570.6231916569752,253.49040576342293L570.5240687523803,256.47257584076203L572.2170391244764,258.29205753844576L572.9243607041647,258.9959933005765L576.1234817163705,261.1589784377891L577.0912407141466,262.7641492145002L578.4240454517646,262.1038286635909L581.0242411580199,263.8657304607549L581.1743424700902,264.69734698011064L583.5407452772457,265.9193084928313L583.5448867431772,268.06239039081765L583.5524758430722,268.17355772545716L585.2135915377692,271.2139738621197L584.3962050300985,272.47354390116686L584.4418132592832,274.0634274092753L586.3435504066612,277.93722980930283L587.3176174833465,278.4172140681453L588.0650258700881,277.34284766165354L590.0122738989003,278.78429161751933L590.555889382983,279.4597719549338L590.44871442631,282.45812985425505L589.3994917440666,283.81011052018255L589.8266073176246,285.0009198291061L588.8664330363281,286.7418049957191L587.6280428038463,285.55221902891265L586.4565462987939,288.1435311732481L585.4729111169703,288.2327276900264L584.6631468700132,288.28301592049434L584.7790459609988,291.32412576192223L583.8091083224286,291.888072160246L585.0444537300096,292.85889111032566L582.6478830398141,293.0556498417957L583.7214721072579,294.2575270855938L584.3288741449879,295.2974003035806L583.1096324026419,296.20111147159423L582.7951576008617,297.78563351647597L579.029252986852,298.0820721747748L574.1039349967532,298.43869013174185L572.7799338843865,298.53192142580895L575.3429119803124,294.4938012366738L577.1058697554024,292.46327604096496L576.7621074138729,290.6483565246285L575.5233682070057,288.87957909822626L574.548543268325,288.9412938209406L569.2727765762266,289.23939801601944L566.1765899332529,289.4138850607311L561.1032043461751,289.6986182287591L556.9296483683206,289.9187948716393L556.3000037470438,289.9379502076803L552.9927435479162,290.0580560325311L546.3382692579036,290.35670259747417L545.8904951788243,290.37998739226646L540.2582612458589,290.5969863896029L536.6476261743327,290.74250543134315L535.43654152555,290.7790750768961L528.8582390869958,290.97448085727444L528.5808555967567,290.98437200516946L524.5734394015631,291.0777357521365L520.3794379097478,291.18114860017465L517.2523709308684,291.24788264153176L509.2097963176881,291.37556701227345L509.1636064720573,288.1990367353354L509.1259356800189,286.33996035912605L509.0728530058277,281.9578135989733L509.0569926620602,280.8670790123547L508.97977894341903,275.5570003206109L508.97270975609985,275.07084395342565L508.893356313151,269.6136138920508L508.8880100256626,269.2459433825635L508.8457280562392,262.38287803680157L508.8393916089273,261.9483546804895L508.76462050448026,255.75042144292615L508.74018716285843,254.07620032367868L508.72545297213026,249.1632631353748L508.7108434730602,247.10510608758898L508.66677717506406,243.3923409544492L508.6476336193381,242.0859962981507L508.7172310012314,241.2139088551951L506.2265628593537,240.50689432066702L504.414161133185,238.6290820892791L504.69010956935995,237.19282484632743L503.3930804824474,236.3943007434949L501.4594852253267,234.25593134197527L502.1288174866154,232.54928084916457L503.51520682540104,230.2342463349296L504.5405515924897,230.57596888408773L504.62689694439007,228.8060811762689L502.94865972142514,227.36795688005884L501.65592264297817,228.0603690799744L498.4661134873296,225.48347173441198L496.8619807962244,224.43126986943776L497.1944125191193,223.1365410557803L494.9829628564618,220.56971406780042L494.94722035705007,220.5152268791726L494.11207010755163,219.58773908978299L492.74238559017573,215.6447863972843L491.95663922123725,214.48935341112747L497.4629525527541,214.55246030260935L499.8756289351788,214.57385439495738L503.91882323429127,214.59654649788672L507.89674853406007,214.61503422408362L510.15794600668653,214.59069397568067L513.5187497668454,214.5121644034965L516.5660851338519,214.41556748858306L519.9554455424772,214.27064675660347L523.0117642543827,214.14495201763032L525.5746260666759,214.0745698564533L529.4671144561868,213.89350930005514L534.845495437237,213.61610020878186L535.91872510881,213.55121472454334L539.9482414933166,213.28101336729696L542.3456589449022,213.1249891961553L545.6685742276856,212.88796453487623L548.8501661352943,212.88703761332715L553.228266255452,216.83518992294046L552.2468311216096,219.32605343051227L552.1733059162246,220.23946465601296L552.4709720013379,223.30192252769336ZM421.22718339336507,223.7880569459428L421.5065246526028,223.8050672082329L429.23144875453113,224.17646199951002L429.45501808521885,224.18834097579372L437.2384511483539,224.50410431334296L437.27912606649727,224.50565723218085L443.5997411298828,224.72594214828757L445.18648497062895,224.7740529448845L450.0178956325814,224.92034221988354L453.1610517196427,225.00888357351425L456.42670650919524,225.08390808796935L461.27924896363703,225.20242855798904L462.8358885976191,225.23317048076137L469.2509801544212,225.3428988068166L475.6715604211994,225.42819949576915L477.23861857261886,225.44340823265543L482.0874198996993,225.48388747486626L485.26746631181135,225.49868542011382L488.5086035915571,225.50699812677055L491.6632626551577,225.5077095168324L498.0183636427602,225.48665604860128L498.4661134873296,225.48347173441198L501.65592264297817,228.0603690799744L502.94865972142514,227.36795688005884L504.62689694439007,228.8060811762689L504.5405515924897,230.57596888408773L503.51520682540104,230.2342463349296L502.1288174866154,232.54928084916457L501.4594852253267,234.25593134197527L503.3930804824474,236.3943007434949L504.69010956935995,237.19282484632743L504.414161133185,238.6290820892791L506.2265628593537,240.50689432066702L508.7172310012314,241.2139088551951L508.6476336193381,242.0859962981507L508.66677717506406,243.3923409544492L508.7108434730602,247.10510608758898L508.72545297213026,249.1632631353748L508.74018716285843,254.07620032367868L508.76462050448026,255.75042144292615L508.8393916089273,261.9483546804895L508.8457280562392,262.38287803680157L508.8880100256626,269.2459433825635L508.893356313151,269.6136138920508L508.97270975609985,275.07084395342565L508.97977894341903,275.5570003206109L509.0569926620602,280.8670790123547L509.0728530058277,281.9578135989733L503.3206359371601,282.0185273983881L502.3451352854457,282.0273625883369L497.40930760176883,282.0718637083487L495.7127374877143,282.0814113509208L491.8105912146844,282.0955902348884L489.1861717516131,282.1030775296713L488.6506817365965,282.10722736974594L480.8993318113625,282.08881426097287L477.5857546128198,282.06152148331125L471.70626937692253,282.0018155362401L467.06216453095664,281.94412346938907L462.0366997342254,281.85780473480156L457.46717850459527,281.7748383923515L453.99008214287886,281.69224257649546L451.07527616640544,281.6060661946235L444.35044415153845,281.396671610441L437.6209789156456,281.1680199151474L436.3654038486766,281.11874048025675L429.5542294725051,280.80977209849175L428.2728168037461,280.7450502278723L420.24734428328134,280.4160554733144L415.6337003972605,280.2147966665451L413.8488896154515,280.13083730852736L406.6413463970387,279.7763441795222L399.6687526442471,279.3925266392664L399.45760267121005,279.3709813690093L399.94214896436233,271.9257130698654L400.2477396883334,267.1248952481843L400.35013165011395,265.3510577589316L400.94133676183606,255.49011108572734L400.9541993175669,255.37014289852345L401.364197169008,248.8505508796469L401.4577202713991,247.3005806408496L401.8612008196243,240.7223403254626L401.95413335214937,239.1014915094703L402.43473660626427,230.91389928523915L402.4417574120113,230.803753620674L402.93075716125554,222.73217519551065L411.99067951271013,223.28832694796392L413.204945814373,223.35394655851496ZM778.460757412928,203.6992813288822L778.519312398068,203.67922244319595L778.460757412928,203.6992813288822ZM777.82247465302,201.7140117021704L777.6893549171425,201.29639757118696L777.82247465302,201.7140117021704ZM778.6133349976233,216.5522346929023L777.0059110062118,210.83492940528424L776.4797641449234,208.96242875279006L776.2230765383815,208.04295645093134L775.8104531705907,206.5718411987591L774.1330555571669,200.28665511635472L776.3711496164428,197.57981593910517L776.3808992714296,197.57665369280505L776.5652733736182,197.51260080657323L778.8549148856002,197.61937821778463L776.9604180447316,201.7227791169895L777.9146372552757,202.5675906807112L777.9551971210776,204.5072266183579L779.3678074240463,206.06949127900396L781.3611324469794,207.69823049757895L782.2716482224237,211.33053057168422L783.8714922321174,213.0497333611777L786.2424101727119,215.3612330001497L787.6174251563864,215.10950000515072L788.2709464628055,218.41231853292368L789.6441917467114,221.40992234706096L789.3550421954982,221.47468010087425L789.1318295037405,221.52462597443855L785.5158535704145,222.3148254591266L780.496453441528,223.2559911379875L779.9825842518808,221.42611345029854L779.6030877970531,220.06773041945598ZM760.2325768573534,203.238614036562L763.2628809365754,202.6067059828672L767.8521255385493,201.64379305691455L767.9470874140502,201.62375699012875L769.3072240601116,201.34013973309334L774.1330555571669,200.28665511635472L775.8104531705907,206.5718411987591L776.2230765383815,208.04295645093134L776.4797641449234,208.96242875279006L777.0059110062118,210.83492940528424L778.6133349976233,216.5522346929023L779.6030877970531,220.06773041945598L779.9825842518808,221.42611345029854L780.496453441528,223.2559911379875L785.5158535704145,222.3148254591266L789.1318295037405,221.52462597443855L789.0408057016949,222.54763427205899L789.0263848157242,225.49532574429782L787.651489177702,226.6394720928639L786.7714088631989,230.47338708191614L783.3956168909999,231.61022018067888L783.358268497814,231.58621458539892L779.7637760008677,233.78231628656033L779.7598359809119,230.95143684035725L779.3562367220075,229.10065378860122L778.1778647542009,230.17726502774963L779.8396087758424,227.1354096057596L778.5459884887123,228.13613544850182L778.1354374561797,227.01831161282337L778.7313034868018,224.3423726256574L777.5593960343106,227.936359448021L774.3127727633481,227.2490529191889L773.2508813918204,226.9837843876993L771.4139714286075,224.92332702414035L772.2662356759811,223.47395026733113L771.7299149739883,222.28782765626352L773.2061884103061,221.72241333207262L775.1368785115778,222.44614254353928L776.1843577634033,220.00159242524387L775.0411662282922,218.76807339951756L775.7857537402946,217.7956443560629L774.9004973089875,219.349110048468L775.9441097982667,220.09241179382514L775.3323895370681,222.0688944194394L772.8764229176144,220.54048747358274L770.1984473614352,219.88969079108472L770.8912190410982,217.7785397963131L772.5711022859252,219.3233771609457L771.8612982166384,217.6680029480658L772.7610961035306,215.95643970305878L771.7341826460589,217.01679647255878L771.2975894213437,215.4009870288137L771.6739129494944,213.04483088590666L773.2685847639573,209.65805472290378L771.9304713823756,212.5659244992039L770.988021033146,212.16834102676194L770.6261807276433,213.9196909412393L769.565694525448,212.3360951380081L771.0126131802512,207.723081238085L774.8920020266781,206.841519067617L771.9290518535215,207.17195469576097L772.2562994089652,203.84458597912896L770.8336667878891,204.44006257677893L770.8868554669571,206.5137201498162L769.0490715633844,208.21306945197898L769.0728764769522,206.26341623744588L767.4592849999294,208.03506503527535L768.0205020216213,208.98514761050228L767.2673635704971,211.68298906795894L765.6600177658393,211.3568516976054L765.0325589347568,212.13036332611284L765.1251857784421,212.146333982947L765.737170979569,211.9810838462305L767.7128029699846,213.8402243252899L766.3901343140337,214.41482566868194L768.4425326982139,215.18898179176347L767.4073192778314,215.98661717448545L767.7851893182866,217.26834713609105L767.1123832246026,220.1280428020042L767.6940276933121,221.0955514477463L768.5510729633575,224.3780134625523L771.0381140157114,226.7036296858363L770.7344027576773,228.04834286007258L767.080516157685,225.98618893849346L765.499751198902,222.48449360812742L765.9293574636179,224.75082719873137L766.111948756825,225.58607934537213L769.8515409460347,228.20251985021343L772.8213895522983,231.06789081331954L773.1148420443142,232.71931715185679L770.9390494458264,231.09453859635664L766.8313375798251,229.51891123020926L766.4776203979729,230.69716375017117L764.1038037593526,228.06158418234918L764.981177295574,230.24996921450054L763.6984043171551,230.06182742687997L761.442891486911,227.5549500604501L759.4154877162317,229.58311772841387L758.009161137154,227.5101409855157L760.031611046436,223.11022801231286L760.4437771857959,220.73286983364653L761.6404708421248,218.88383163998753L760.0554881554725,217.8001688342233L758.5183009001695,218.71712705794346L755.1551416360746,217.03120287840454L753.1878076129462,217.07441772514835L751.9925656590823,215.93926897862787L752.6908587897673,214.32027386214497L750.8736213488824,213.10113568109307L749.2419553402933,213.0553436789013L748.6765269258436,213.24194225599513L746.5547404673146,210.33542288220565L745.5077477378608,209.42600094240083L745.9742109909514,208.2788204467371L743.3498600502337,208.52918518412764L740.8679193474528,207.52205944942853L739.9378050040614,209.1232553753348L738.921422867505,209.0324462441863L737.581200765094,209.6000020987084L737.458044216856,211.6172226506676L734.7455703653478,211.76625886061947L732.5506637499575,210.754038519593L730.7320776132664,214.34786782141657L729.1659230519116,213.83943640582663L726.8026657802988,217.17674955521613L724.1650941860437,219.97514503990556L722.6326097268131,210.3867764861186L723.8081994321573,210.17052465040922L730.2650937394131,208.9908256079957L731.9835253103518,208.6766771227783L737.9712848059348,207.57285321471613L738.4995316043982,207.47986076946881L741.9028856545759,206.83879332125753L750.715896068541,205.16897050936348L750.8562122322699,205.14125326582564L754.2485569720343,204.46955273525805L757.272114490093,203.85534302978772ZM770.1818767830674,215.38791445591983L769.3242775996086,218.09011556742553L769.5209290774452,214.5012916609635ZM788.6559178890127,229.81688439137656L788.3926139206262,229.90953756655722L788.6559178890127,229.81688439137656ZM789.3550421954982,221.47468010087425L789.6441917467114,221.40992234706096L789.3550421954982,221.47468010087425ZM777.6132517486674,233.6395353330256L777.5070214676061,233.66839098245373L777.6132517486674,233.6395353330256ZM777.9397923291235,233.0633741961941L778.2293902220902,233.51736626752768L778.0702947815118,233.5492754026218L777.7803200894365,233.21859989903612ZM777.7803200894365,233.21859989903612L777.8339930457089,233.59556737895275L777.7369483801162,233.61730347653554ZM770.1741555561699,248.29964492433078L770.1741555561699,248.29964492433078L770.1741555561699,248.29964492433078ZM747.8080869865793,217.02643151071572L748.6765269258436,213.24194225599513L749.2419553402933,213.0553436789013L750.8736213488824,213.10113568109307L752.6908587897673,214.32027386214497L751.9925656590823,215.93926897862787L753.1878076129462,217.07441772514835L755.1551416360746,217.03120287840454L758.5183009001695,218.71712705794346L758.947416287817,219.1472774628113L759.8782151114316,220.23240627758048L760.0249758912585,221.1937186885059L760.4004570559287,222.47669951922126L759.0736465973956,224.2608942986027L757.7714817026398,223.96300285561188L757.5547911499064,227.1710920795358L757.8253666680512,230.33968068110687L759.1209214624544,230.1803117574093L761.5962722876591,228.36619540959805L762.2961378064851,230.77628921956534L765.3863476853351,232.15434014007883L768.689309359054,231.76162434900016L770.3830384698099,233.4204822162169L769.6621940038383,234.1153169826771L771.1435496471531,233.81576015634812L774.9672445139591,235.54988818604863L774.1313043483697,239.2462429548615L774.4413357419353,240.7244231946595L771.666144433296,240.54829200934716L769.9330752590779,238.0843425578255L768.6407566473533,238.048999857102L765.2048168128983,235.52453484945283L764.3195398138728,233.95354011782342L762.215977062791,232.80153096031825L762.1806648983527,232.83759716315456L762.5064243161953,233.81763895443385L764.4778121839429,234.15497313336255L764.9556298775009,235.8740338235002L767.03565827656,236.98050948744992L769.1020160117182,238.96237969301922L771.8781326376301,241.43953027773875L775.4393931273892,241.7403239997691L773.8304363638608,242.94181998059935L771.80970781205,242.30002279635812L773.6141935783688,243.01389085634867L774.6359468055732,242.575581822014L776.5623747737598,243.80193502212887L776.6806660542003,246.2314062078135L773.7538253704145,244.14680974068574L775.2619102491849,247.4420995072744L773.6659770000849,248.0969349503796L770.0292693170411,244.94989069707867L768.1790245512905,242.64016819590165L765.790432761182,243.24720570073703L767.9881630194784,243.43921332907837L769.2403278826303,244.95902409427072L770.7820440823857,246.35646495722972L771.8166850552866,247.34776987042324L775.5335459141279,248.73987385556097L775.40147230138,249.8137013802609L776.0764114611516,249.21604165714223L775.9673064813146,250.21789781882387L777.6640740114935,250.38836947683512L776.3461560271255,252.49281022823482L772.3749795677561,250.67458674001375L772.4665681161916,249.8633535016777L771.7929796827302,249.06033348299195L768.4178706281134,249.25685930365535L767.8445817312756,246.9485477144956L768.2134156466386,248.9419140483327L766.0554704691699,248.40051749925738L762.5448800880195,248.96502156462668L762.4370148595997,247.77904515461012L761.4829356500816,247.9033123959515L761.7310248137169,249.3380734322276L762.6917094452396,249.45732132024114L764.9220504201897,248.73591301274314L766.4345989673735,249.84709147036278L769.5465785680915,249.73742496616887L771.6217583626465,250.5860032175582L772.3108335410337,252.3798812132194L775.0556687960097,253.4223781067153L774.6833537936652,254.4205541433107L774.8263106369402,255.68287386450947L776.4199676419246,254.2706157255218L776.9663138194878,255.2479563869838L776.7977094830912,255.765425532392L778.3146320023545,255.12747349057042L779.0140621394484,254.94185964040844L779.2893484995716,254.8309833491378L779.5206784914675,254.84630667401086L777.6553547500796,254.4442963457384L777.3260446372904,252.79858948385265L779.5841886575988,253.11857781527908L782.3732606290989,252.7098397766348L785.6126749224,258.9871974379614L785.252858472319,259.06452868677525L783.8669015560492,256.1343799457936L783.9548583101091,259.34578484185784L783.4854067265878,259.4460695993597L783.1669923444615,259.5129592209096L781.904669700851,259.7825220078L779.1287391468436,260.3708623251671L776.5333640429587,260.9106303088291L775.8022650057537,261.0626359016062L770.3526358497174,262.1540578546088L770.3781095622242,262.3059585874149L766.7568416217829,262.9946922834623L764.8265246168576,263.40674827761745L757.9680786040085,264.74508731099286L756.0384876351648,265.1339385444028L753.9028610303368,265.5532168493015L749.8477634055041,266.3295497502021L747.9076277941074,266.7210042851226L743.859605554803,267.4778865240713L742.9529746039834,267.65029464568363L737.9504821990472,268.5554826517697L736.774587810139,268.7678591032151L734.9634858245918,269.09492554629765L733.0950349231307,269.43477547781276L732.5067354404762,269.5390348776948L729.512430679585,270.0368469576299L724.931193115518,270.81156111756866L724.5472596882958,270.8766433418441L718.8559362610283,271.67365424967136L716.3127880443648,271.9528520137286L712.9975156290621,272.4656841686609L712.052358836306,272.56717247646543L705.3880924285254,273.37254632459894L700.590854852616,273.85219204618045L700.9716661877924,273.34256659078505L698.3249999763511,273.6976961498675L693.6867969209086,274.7582195283053L692.2549137628075,274.95027910265765L691.5111284473469,275.0584906659325L686.8824524828672,275.7524833575218L683.626293407692,276.2165769727453L681.3505066615872,276.53206027997794L674.1784046621458,277.43419943487663L671.1840024053928,277.76258200918267L674.1746212923108,276.1495315110178L678.7586396223865,274.0525611972554L679.4058534662531,271.8370353763893L682.1489900208057,270.73590890356604L682.0681709919731,269.1907922118653L684.020933333798,267.57595862172445L683.7836226803831,266.26838587848147L685.9272296361283,264.42358516251966L686.0771848514429,264.276393838667L689.3648807785479,261.9690324005204L693.6858032054149,256.77740678111775L694.3498305821041,257.16189790172325L693.501957789923,257.8329012519656L696.0465814719443,261.19853912673454L697.8376861036801,261.8814982298345L700.5285266071813,262.0663788939669L703.0493131568857,259.1760138651508L705.3416609755004,260.7816517028026L708.7121912401774,259.1291686882515L710.4714826299494,257.8289386481623L710.0734231166343,256.3160470512389L710.09745496493,256.3327046465281L711.546253353434,257.1693564658658L714.9605484473905,254.52419179768026L715.6601791366205,255.5300503284626L717.9438602283412,253.51997112151616L717.3549164149603,252.54699031851646L718.7141470382844,251.10714787227664L717.4268282227338,250.09914041020227L718.78550428429,246.36512335150417L720.0729034182301,244.67879542277808L721.092841813951,242.3447250958585L721.292671051546,240.06940846531882L722.8232328476195,238.19642696702124L722.4795654479764,237.45898188830995L723.7958674056204,234.86640488499233L723.8800686371923,231.79738937939578L725.5985035932108,232.28637505202846L726.7495801337203,233.858547866074L729.1964003651077,234.2896904659715L730.279579125715,232.8387572411673L731.7132251208297,227.13906763207126L732.3192235213683,225.34172338447752L734.3787173498204,226.63652776323602L735.1327988830164,224.11623747544525L736.0504049061136,223.62039960797017L737.9795429627683,220.34288976559048L738.3761105496103,219.6562120820979L739.5764964537817,217.91965345321614L739.0482430785704,216.29996916916434L739.8237068761632,214.3030035500832L739.331394507438,212.23896398187776L741.2557842754372,213.31055127879597L744.4519054566282,215.13319924672874ZM778.2293902220902,233.51736626752768L778.0702947815118,233.5492754026218L778.2293902220902,233.51736626752768ZM777.8339930457089,233.59556737895275L777.7369483801162,233.61730347653554L777.8339930457089,233.59556737895275ZM777.5070214676061,233.66839098245373L777.6132517486674,233.6395353330256L777.5070214676061,233.66839098245373ZM782.0360613446912,240.37875502990744L780.5518299316409,240.5597824989967L781.8290298979455,236.30222141338015L783.0543356678114,234.74873006247196L783.3956168909999,231.61022018067888L786.7714088631989,230.47338708191614L786.0422644081966,232.883482185091L786.7100193361764,233.017811082766L784.7991281202517,236.96921842031134L785.0416325284207,239.44081975185293L782.8990193935101,241.2341070041075L781.88165927149,245.17893658840228L781.8623613196605,248.87495170589443L780.5205031355681,246.4158087532661L780.7398374073747,240.73393596165454ZM788.3926139206262,229.90953756655722L788.6559178890127,229.81688439137656L788.3926139206262,229.90953756655722ZM784.1345953219552,259.1406110391682L784.8308642663567,259.15716956893664L784.2160738392049,259.29198269391793ZM653.2617048987684,232.61374493439553L656.0908999826731,233.6619346485636L657.6818375051741,236.25493980734154L657.8126952102627,237.13888204609748L660.4853489658508,237.8693954217399L662.6189303721044,237.6613851211648L665.780187492324,239.73422189780138L666.6462193070579,239.63864982456857L668.355465834395,238.20544204878342L672.0994038664601,239.2600987555321L673.6871560911513,239.04210247486287L675.2112657613128,236.79741370489842L677.1790039318726,235.98175479970882L678.6877705989109,239.26309416969502L681.0127676268229,240.17530733619992L682.2332514474758,241.60252928165312L682.5761593050106,244.8707863614477L682.4276467040734,246.9830428888663L683.834422280186,248.0846992473297L684.9103865735326,250.29277336689097L686.3462617968146,251.81828856854327L687.8295933095915,253.7606437532329L691.3750332307316,256.87335876974396L693.6858032054149,256.77740678111775L689.3648807785479,261.9690324005204L686.0771848514429,264.276393838667L685.9272296361283,264.42358516251966L683.7836226803831,266.26838587848147L684.020933333798,267.57595862172445L682.0681709919731,269.1907922118653L682.1489900208057,270.73590890356604L679.4058534662531,271.8370353763893L678.7586396223865,274.0525611972554L674.1746212923108,276.1495315110178L671.1840024053928,277.76258200918267L667.4459577642639,278.4930788187255L666.2660430127785,278.59626052034685L663.0720323167645,278.96089317394024L662.5645537539425,279.0270469851512L654.9188680577716,279.73983723971355L654.8127700223032,279.75037919300246L651.9911321902625,279.850551654368L647.531325926074,280.1561419231348L647.2307860852895,280.201376937831L645.170704036195,280.5744826502215L639.9726163616629,281.0806741129504L637.235607106257,281.243840553993L633.7957736936016,281.3910406986769L630.7168887236053,281.4974052482902L628.5118032092678,282.0384441145046L625.5259619228352,282.05082630400034L621.1349807681443,282.57980209283187L620.340730876882,282.6687354448451L617.0799754998321,282.98792108487044L612.5702687455386,283.4579384752618L611.7917121208136,283.5446684179932L606.1588993268548,283.2503819894871L606.6923644213211,286.6193154593227L600.2288419675693,287.0810320361144L599.8184280893316,287.10432915971637L595.3734360147732,287.4266359067842L595.2241144138013,287.433872729918L595.1073348689664,287.44676055263903L587.5212558171921,287.9900962981145L586.4565462987939,288.1435311732481L587.6280428038463,285.55221902891265L588.8664330363281,286.7418049957191L589.8266073176246,285.0009198291061L589.3994917440666,283.81011052018255L590.44871442631,282.45812985425505L590.555889382983,279.4597719549338L590.0122738989003,278.78429161751933L589.4065095927631,277.2387714734217L590.4747956040551,275.353730899738L592.6373879863382,273.9756120443085L592.7091514052946,273.9428399654431L598.2369628767286,276.2843028665369L599.3692956871074,276.42776934661197L600.2115613690383,274.79806016040334L598.7817598156905,272.82252209988405L599.1090924553887,270.40167850668524L599.9438392745092,269.65843230121834L600.8079023639843,269.94575534080343L601.8949586572696,268.9369710675812L604.7153767616634,268.3273456010876L604.9956610587705,267.69706951717626L603.8332711751381,266.4877765080215L603.3171301374751,264.8422211580711L605.0139625955627,262.1320639920207L606.7626076337519,261.8355051276907L606.3239573940634,260.08358206551134L609.6125609899753,259.8728449421369L610.9739690084357,260.9967142828958L610.9674076964342,258.30950508149033L612.3525683545957,259.463457197155L613.1756944381762,258.7365261564453L615.4120563706639,259.3335704898153L615.9366342773267,259.66070341816805L618.8303992372532,260.99660762241876L620.0493618979767,258.303853653848L622.3280369443022,256.79556121755377L623.4137024441322,258.3336252592875L624.9681463471512,258.46089858415667L624.9062858221865,259.48796306893826L626.8566745678468,257.71214967654646L626.9181848311066,255.44180557516154L627.207479087312,253.9843410170879L628.9933232221506,252.65883215473752L630.1417014368552,254.90157338401332L631.504456809564,255.6285397804968L634.1384283895133,255.57185168859223L634.8474355658045,255.3633372992573L635.2063780068936,252.07141956930195L636.5555600518752,249.83619569175255L637.3270634219184,250.13691610374917L638.5785534579508,247.87203405090304L641.236863096312,244.85713824517586L641.1734235261914,243.68090780803902L640.5799800314853,241.40094200490546L642.2283198789136,240.7167850471775L644.2076868990105,241.34655472546717L646.6080221739736,239.73576926641817L649.5300662621305,238.96831270325163L649.6653924897207,237.55907846339312L648.4913071398908,236.87054421464825L648.1024003037742,234.44735056695038L648.7621422005459,232.95513548733322L649.753286238459,232.04109677327017L651.6355403599806,233.20310668983427ZM585.4729111169703,288.2327276900264L584.6631468700132,288.28301592049434L585.4729111169703,288.2327276900264ZM760.4437771857959,220.73286983364653L758.947416287817,219.1472774628113L758.5183009001695,218.71712705794346L760.0554881554725,217.8001688342233L761.6404708421248,218.88383163998753ZM296.5688665006553,268.89977970478174L293.9871783517866,287.5125454379455L291.299084242144,306.9731378310894L290.3079180616213,314.06872274467923L288.234168160366,329.0000627083124L286.76907175075496,339.60551985993186L285.6598118508173,347.63516778045516L284.7514454969192,354.16947978472L281.90253783753366,374.4996261039621L259.7310881619969,371.25914157434886L250.07563860842117,369.7559053799438L245.78055237196924,367.27926679196366L217.10247232542906,350.6303906751824L195.88457887623093,337.844600886286L196.40415404685814,335.5967100194407L198.16011706908756,333.99702027836133L201.2475103264273,333.8732328144773L202.77865612479076,331.2865735457641L202.40895108055997,328.94209049363735L200.05540306729745,328.2081098148615L199.71578894362978,327.22738340991236L200.83264865562478,323.96075035297997L200.12688386348265,323.2022029711667L200.6245766937734,321.3056778697137L202.21803256694614,321.0420345061083L204.18046256550167,319.2186917456378L205.12546348076904,316.63302738634013L205.38423113501085,312.2942928807024L207.2439186164143,310.7034073345426L207.51600223187444,309.6041722481739L210.4941283788787,308.54647330661794L212.71880949917983,306.4886730092187L210.21242738736572,303.1588020734322L209.30841427511012,300.1941894553777L209.17599031899857,297.92004405876844L207.3662502366762,294.5771591370558L207.8332295109568,292.14191615883067L208.00566563363606,290.2410311623313L209.383921564148,289.35391101575624L209.59647175053726,286.2414900478776L209.07516794134347,282.557548364034L209.91880116898847,276.2243146864588L210.02459988362187,271.74113838493486L212.06919458182676,271.061433275161L215.885414860548,271.80554632593373L217.42957209618055,274.599838504075L218.64276359979613,274.63591294976743L220.85671139851286,271.7960812693101L223.07456037997372,259.74778796890325L223.6291833612022,256.8345455380602L240.35035462788937,259.94509590262237L245.56614599577378,260.866064664238L261.9969155042003,263.63997511774767L271.6555957481746,265.15177470600713L282.58956634131846,266.91872760778097ZM502.3451352854457,282.0273625883369L503.3206359371601,282.0185273983881L509.0728530058277,281.9578135989733L509.1259356800189,286.33996035912605L509.1636064720573,288.1990367353354L509.2097963176881,291.37556701227345L510.1225004019882,297.7238555720255L510.3058239997843,298.8460858201315L511.2882076505488,305.2976717396888L511.63193909590643,307.56595829180003L512.3277740425124,312.10366064112384L512.3166189124837,312.4125525479012L512.2211503353269,320.83170929584014L512.1858541980545,324.6929084222621L512.1441082438104,328.8649889298857L512.108867338889,334.8459387710317L512.0738658429458,339.5300966593686L512.0322285657359,345.23258790143404L507.9993124764134,344.06868221701995L507.5031456483965,342.9444031229674L506.2075339256347,343.32225767890793L504.5180276677401,341.1233591299085L501.643646908921,339.7418444565542L500.662690507497,339.2640847546662L499.2561107216004,340.8606787066211L495.55972647684297,340.68167580603824L494.82102556493163,339.70567306003545L492.35150577011774,340.97625575144264L491.0211964385072,341.61565792814724L489.64998436444085,340.71883709434167L487.28550101783486,341.2894996029469L485.90073056798,343.1044230871797L482.811119009952,343.7531342122885L482.1180264361638,342.79230643029314L478.99035410865315,341.4997161687917L479.6041120334635,340.5547002641491L478.5848741739217,340.1933007696274L476.76172657459017,341.67833134268267L475.28411808537504,341.27346608006053L474.28584113420663,339.39529112577213L474.13034569883854,339.4928031296753L471.78446698143296,342.38328753917096L471.5860077811759,343.7532548334299L470.10519311720935,342.2295751167985L470.4052192476238,340.3444852630148L468.5079206927626,340.56112261501426L467.5171108813676,341.8508805328921L466.14681659750477,341.4373047021668L465.83184109759884,340.01643094037547L464.63458679221026,340.29036148377827L462.72012775854387,338.6170987587943L459.87836579262074,341.16065763489223L458.22028126978137,340.3609201153208L458.76125451860446,338.4918794653073L456.65978169082877,338.2117877440613L455.87580805799547,335.5423989169211L455.37902725187405,336.07714583028906L452.40958733769946,335.1983999150009L451.46605743848266,336.5730813492063L450.49240351789365,336.92407073999664L448.64054653921306,335.1007597396093L446.24690246701255,335.42239578633473L443.42425927883124,333.9053676145792L439.8134543024758,333.7613704720901L439.54527993900876,331.4378200178468L437.08575535040376,329.05890501813906L436.7072521679918,330.5914489255297L435.5468236517276,330.1842135133594L433.9550932561696,329.72947441030703L432.1727589548982,330.3877581181564L430.0051351039113,327.893227625044L428.83740155738104,326.55704637861174L427.6941235467393,326.7725476944744L427.79761171841915,323.27437745075827L428.0233905130729,317.913548520871L428.143368322615,315.06482876698976L428.33332690011383,310.5545051145954L428.4893299128822,306.8504129509324L428.6965990272063,301.92907272478544L428.83552101123394,298.6305477587249L429.1344340400485,290.26480974939955L421.0827248977261,289.9094912906379L415.0219253122342,289.60024485251085L413.076096199909,289.50447938814534L405.07224721651005,289.0479932322279L399.01087150905255,288.65653617319674L397.08777969854003,288.5370490189139L384.6230117358495,287.6713744571787L385.32184671894476,278.27553481525047L399.45760267121005,279.3709813690093L399.6687526442471,279.3925266392664L406.6413463970387,279.7763441795222L413.8488896154515,280.13083730852736L415.6337003972605,280.2147966665451L420.24734428328134,280.4160554733144L428.2728168037461,280.7450502278723L429.5542294725051,280.80977209849175L436.3654038486766,281.11874048025675L437.6209789156456,281.1680199151474L444.35044415153845,281.396671610441L451.07527616640544,281.6060661946235L453.99008214287886,281.69224257649546L457.46717850459527,281.7748383923515L462.0366997342254,281.85780473480156L467.06216453095664,281.94412346938907L471.70626937692253,282.0018155362401L477.5857546128198,282.06152148331125L480.8993318113625,282.08881426097287L488.6506817365965,282.10722736974594L489.1861717516131,282.1030775296713L491.8105912146844,282.0955902348884L495.7127374877143,282.0814113509208L497.40930760176883,282.0718637083487ZM352.66235733968256,275.5749412345622L353.6283172334229,275.6665778293768L370.50631763680275,277.17736206358643L384.08485580466595,278.18063918352254L385.32184671894476,278.27553481525047L384.6230117358495,287.6713744571787L384.03757568724785,287.6270249792841L383.4324059573996,295.9973621018189L382.9863724196252,301.9343290233878L382.81780588660826,304.13250779078885L382.1890034651635,312.3839457195837L381.8696135328739,316.6862736932841L381.5813623693014,320.56914825855176L380.95369774776486,328.7272876613747L380.9395480340331,328.9178517651369L380.2246237989766,337.8743855821847L379.79255865418384,342.6425918284889L379.4720344857968,346.05446769076L378.75066792582766,354.0946333474899L378.14127254486823,362.2779329991555L377.5402300117951,370.4251612080874L377.41963892084243,372.04460793821283L373.30151018164287,371.7352781064925L367.06967695579215,371.2439008179248L363.02714284732986,370.9112047998584L362.3336885402466,370.85369125850923L349.40805952301116,369.6942729248044L348.30400127079344,369.59179584130266L331.3751316740047,367.867142365209L325.42777180495614,367.2474802869358L321.64767531969926,366.8434645837176L321.09083211122606,369.3163874260297L322.61540285862526,371.0391824935923L310.54420563577327,369.65319858385453L296.24630582130555,367.8740938348594L295.1645893811796,376.24895740466195L281.90253783753366,374.4996261039621L284.7514454969192,354.16947978472L285.6598118508173,347.63516778045516L286.76907175075496,339.60551985993186L288.234168160366,329.0000627083124L290.3079180616213,314.06872274467923L291.299084242144,306.9731378310894L293.9871783517866,287.5125454379455L296.5688665006553,268.89977970478174L306.3170484885112,270.20326735507L319.4736962269195,271.85431350846363L320.3579439511178,271.9613720745873L334.2121207714081,273.68271206474185L341.1103308142377,274.39938369660797L345.3460856235341,274.8303300868805ZM620.340730876882,282.6687354448451L621.1349807681443,282.57980209283187L625.5259619228352,282.05082630400034L628.5118032092678,282.0384441145046L630.7168887236053,281.4974052482902L633.7957736936016,281.3910406986769L637.235607106257,281.243840553993L639.9726163616629,281.0806741129504L645.170704036195,280.5744826502215L647.2307860852895,280.201376937831L647.531325926074,280.1561419231348L651.9911321902625,279.850551654368L654.8127700223032,279.75037919300246L654.9188680577716,279.73983723971355L662.5645537539425,279.0270469851512L663.0720323167645,278.96089317394024L666.2660430127785,278.59626052034685L667.4459577642639,278.4930788187255L671.1840024053928,277.76258200918267L674.1784046621458,277.43419943487663L681.3505066615872,276.53206027997794L683.626293407692,276.2165769727453L686.8824524828672,275.7524833575218L691.5111284473469,275.0584906659325L692.2549137628075,274.95027910265765L693.6867969209086,274.7582195283053L698.3249999763511,273.6976961498675L700.9716661877924,273.34256659078505L700.590854852616,273.85219204618045L700.3978992394772,277.63731006164414L697.8972897715207,280.00164887668495L697.7396666923023,280.43262577793394L696.0038717090196,283.7813189366618L693.7607809062229,283.08817459777447L691.1109809416089,285.0774326094188L690.0519929909401,287.03864114651276L688.5146448430198,287.4518241851466L688.4399964927109,286.0840019368553L687.866490725074,285.67239781855733L685.8670343182679,287.4209546711802L685.5139388322475,288.7399136899361L684.308622988975,288.4670825165359L683.7684085035805,291.4739381255804L682.0318785119111,291.73914507654627L679.5899827443186,293.4663411306926L679.6571759850098,293.8433698184897L676.3495649373212,296.8117035469071L673.8751587563049,297.0194921552311L672.2647106924437,297.3747313085611L669.803572686737,299.6081136441517L669.6778049348595,299.5629205494447L668.9119410928118,300.79363181952976L669.0643028678137,302.90220739235906L667.720135617394,304.03759076934296L666.3531231125557,303.73237320271653L665.3120704213582,304.99354525748083L665.3740591099606,309.12808758238566L660.8612613565778,309.68122160162386L658.5372776904961,309.96599825013607L657.9917419736385,310.035712083005L655.4661226654407,310.33111255125016L651.1658106487893,310.8753239676438L649.6760294471617,311.07609638926647L648.0261487245183,311.2666388791388L646.0472995461676,311.4547777102771L642.1368227931628,311.80959477803276L635.4000157444078,312.4608914669798L635.2699156602503,312.4731787986136L628.2468416927553,313.15843909819444L627.466559529393,313.23514203963134L621.7844156505141,313.63927605232334L621.5831852845749,313.65081144474414L615.785691025681,314.0986533419783L610.081516253949,314.5455335032967L606.8425749862995,315.01157228875434L604.3791705063921,315.2151094641408L604.1130060801066,315.2334727398784L597.9745764849174,315.7205405789563L597.4262562026283,315.7621306696394L594.4838879756937,315.98678924126193L591.7476370242941,316.1936742423701L589.4131831510961,316.3712891097706L584.9953166777493,316.6476003919586L583.7844724850883,316.73730386042325L574.9319323773256,317.27910700563075L576.3535481788667,316.6194850402263L576.8766507065109,314.837901321403L578.4360349308486,314.34288093056455L578.236258155627,312.8001456518001L577.010714009672,312.2404745987242L578.0137522069682,309.75806981375604L576.9329779141106,308.8659133633266L578.047881277372,308.30690911320005L578.3266490445754,309.6411618215643L578.5126366323553,309.4915936851356L578.3562891560864,306.65592197133196L580.3311821315422,306.70803351767256L579.5438430645304,305.82731172529L581.003487739857,304.8755502998415L579.4248403074489,303.02436903805165L581.3639923047372,302.51708643096015L583.0770779436045,300.97915162596985L582.3618230714426,299.62535515250875L583.845383709976,299.5572214285777L582.7951576008617,297.78563351647597L583.1096324026419,296.20111147159423L584.3288741449879,295.2974003035806L583.7214721072579,294.2575270855938L582.6478830398141,293.0556498417957L585.0444537300096,292.85889111032566L583.8091083224286,291.888072160246L584.7790459609988,291.32412576192223L584.6631468700132,288.28301592049434L585.4729111169703,288.2327276900264L586.4565462987939,288.1435311732481L587.5212558171921,287.9900962981145L595.1073348689664,287.44676055263903L595.2241144138013,287.433872729918L595.3734360147732,287.4266359067842L599.8184280893316,287.10432915971637L600.2288419675693,287.0810320361144L606.6923644213211,286.6193154593227L606.1588993268548,283.2503819894871L611.7917121208136,283.5446684179932L612.5702687455386,283.4579384752618L617.0799754998321,282.98792108487044ZM712.052358836306,272.56717247646543L712.9975156290621,272.4656841686609L716.3127880443648,271.9528520137286L718.8559362610283,271.67365424967136L724.5472596882958,270.8766433418441L724.931193115518,270.81156111756866L729.512430679585,270.0368469576299L732.5067354404762,269.5390348776948L733.0950349231307,269.43477547781276L734.9634858245918,269.09492554629765L736.774587810139,268.7678591032151L737.9504821990472,268.5554826517697L742.9529746039834,267.65029464568363L743.859605554803,267.4778865240713L747.9076277941074,266.7210042851226L749.8477634055041,266.3295497502021L753.9028610303368,265.5532168493015L756.0384876351648,265.1339385444028L757.9680786040085,264.74508731099286L764.8265246168576,263.40674827761745L766.7568416217829,262.9946922834623L770.3781095622242,262.3059585874149L770.3526358497174,262.1540578546088L775.8022650057537,261.0626359016062L776.5333640429587,260.9106303088291L779.1287391468436,260.3708623251671L781.904669700851,259.7825220078L783.1669923444615,259.5129592209096L784.300684579662,261.96012249869784L786.4759051478648,263.9431944425297L788.5168636797093,267.58962282437403L785.5334368779647,264.47573878935384L784.2548983403235,263.2818089181436L786.4976227428692,266.23865765343237L784.8574848429748,266.1568072447802L781.0199062277131,263.4166282639661L781.5022171010808,264.74299045612554L784.3848354838174,266.94808324801465L782.9442530101873,267.78085328062195L780.815618270266,266.4441061865359L782.6101260698956,268.1972218156793L781.7505783528413,268.43769269799L778.4233038485978,267.28052821738265L781.0194062786048,268.767518539722L778.3418825383847,269.49218461002033L779.591538392308,269.5686174253534L778.3017068246437,271.01244843220945L775.4628458421286,270.43894325158067L774.7143616171138,269.0114315263048L774.7437676905756,266.0994104692302L773.1093582388908,265.2155850062886L770.5849754095125,264.93005349873056L772.9960461242968,265.30187135757967L774.3293370890301,267.27230008097854L774.2076239091039,269.0762780324534L775.8742140140469,271.8499572196423L775.8408867885084,273.1271782232536L780.0731425331091,271.11042818797205L780.7332979509928,271.9548388754872L783.3925775297237,270.1831475351088L785.0020821108019,269.9242033675358L786.4539205110017,275.4473764676368L784.6640183365547,275.6672722636781L786.9586515676342,275.6926565032768L786.4835855999669,271.55944233209505L788.9096762382096,270.3530924521733L789.9877588606008,270.91046570151957L791.2343962058724,275.6255238584075L789.6157855281946,276.75358724650937L788.9197795319706,275.85446402267144L789.2754394187847,276.99553016091284L787.7088384122465,280.504296139586L786.237365838274,282.25835149787406L784.6654096224604,282.36926246814926L782.3363275345234,281.29388828755384L781.3815962142558,282.5767913078382L779.1362494226282,280.4178170583597L780.5687088196628,280.26712118279636L780.2465933741138,278.9850360910459L778.3660481043445,280.51203424313314L779.7643843584925,282.5956049105828L773.4448549690815,282.0659986164153L771.5222499327884,281.01537813550055L771.4197985903727,281.19090566033526L773.8231606471195,282.95067351217506L779.2419255346163,283.62663940012396L779.6273434663119,284.79421301535217L781.1198859465411,283.7125406024421L781.6483177106394,285.4527231358811L779.4488432270882,286.9348290356903L781.0896658928061,286.9547728847974L780.6397411264226,288.4802158441769L777.9878178215899,291.1189960024103L775.5764894308398,290.08374416985873L775.5335485747698,289.2716734901268L773.9798921999995,288.6947465794867L772.7094518253602,290.1504123007088L772.9841278901883,290.0817108459521L773.9709217061861,289.3634182968972L776.6467043763773,291.65725977134616L780.0057124582928,292.0057777976905L779.8837420556033,290.63131470106L783.4740640938287,289.30752269802656L783.1268394228086,290.49615201075267L785.8381528771904,289.5962714769229L783.8088960807934,292.7781848830159L783.2810395648792,294.66218348863526L782.3162230927949,294.906932748385L781.270618255501,293.38493914663513L780.5428394371284,295.3704274154511L777.5607488618191,295.8151478253478L774.6721380871959,297.38404292001815L773.4925364675141,295.8705540483078L774.347269982743,296.8232164324396L771.580060448298,300.84047579606977L769.2638316932378,302.9420326053904L766.4734240330265,306.31741568721657L766.7979639550131,306.23055505114735L766.8642662359318,306.28356273681254L765.1833321248453,309.31396266814556L764.6392055604715,311.29151708259815L763.550665769924,308.8100930778328L764.3691471835027,312.83590427871866L763.6671058131841,314.6263276228093L761.4759934822962,314.54517558489056L757.5299327495554,315.5810420712621L755.6133399988591,316.5425956401799L755.4018344791518,316.40196797072304L755.3295602571643,316.34547968454115L753.9575496306727,315.36393359272233L746.4176936894528,309.95899422500827L746.3915874114168,309.9380114210679L739.6562151083748,305.00899898782984L739.4533177476127,304.8659996854525L735.5025765185034,302.2207639539189L731.9036000411672,302.8050296454379L731.8713196159833,302.81054083849676L725.987612150532,303.6620061626543L722.3209457525268,304.2009888036133L718.8076252746058,304.72918155546927L718.6954276086166,302.56264390571755L717.6418066524304,301.46794863841546L716.423366912039,300.2289661648756L714.4897081516035,301.12636546078556L714.3029595195746,299.1870022655637L709.8463612383963,299.59565703009685L709.2679390199917,299.6589208364228L703.2150681859141,300.2873231766796L701.6150623640751,300.4582215302546L700.1881792860627,300.6107756722297L696.4678527770766,300.9923605305195L694.4238838190018,301.3895825658684L691.2178789224431,302.72120028652955L688.5990642441088,304.5501005978673L686.631427926643,305.0523082514594L685.0286592878813,305.81606041951716L683.6038052760533,306.5239132694454L683.5988215902553,306.527656699321L677.9893266745022,307.4208036137986L676.9871967320934,307.5674814737947L671.1730681154609,308.4163337062382L670.142145782511,308.55362991246886L668.2560149850891,308.7855534232425L665.3740591099606,309.12808758238566L665.3120704213582,304.99354525748083L666.3531231125557,303.73237320271653L667.720135617394,304.03759076934296L669.0643028678137,302.90220739235906L668.9119410928118,300.79363181952976L669.6778049348595,299.5629205494447L669.803572686737,299.6081136441517L672.2647106924437,297.3747313085611L673.8751587563049,297.0194921552311L676.3495649373212,296.8117035469071L679.6571759850098,293.8433698184897L679.5899827443186,293.4663411306926L682.0318785119111,291.73914507654627L683.7684085035805,291.4739381255804L684.308622988975,288.4670825165359L685.5139388322475,288.7399136899361L685.8670343182679,287.4209546711802L687.866490725074,285.67239781855733L688.4399964927109,286.0840019368553L688.5146448430198,287.4518241851466L690.0519929909401,287.03864114651276L691.1109809416089,285.0774326094188L693.7607809062229,283.08817459777447L696.0038717090196,283.7813189366618L697.7396666923023,280.43262577793394L697.8972897715207,280.00164887668495L700.3978992394772,277.63731006164414L700.590854852616,273.85219204618045L705.3880924285254,273.37254632459894ZM788.2098879853309,264.59292223275907L787.3244151665384,263.63730622008893L785.252858472319,259.06452868677525L785.6126749224,258.9871974379614L788.2446134081421,264.5760957898324L792.7010276735389,270.72375087961586L789.5191269597296,267.9571991355866ZM783.4854067265878,259.4460695993597L784.8308642663567,259.15716956893664L784.2160738392049,259.29198269391793L783.9548583101091,259.34578484185784ZM792.6974558336349,283.6402089924874L795.7993690733603,281.48126899698775L795.3359214060639,275.5985290464356L794.7393361444012,273.962584653248L795.392633590152,275.3529232964961L795.8440894656201,282.39649814522215L792.7449623260234,283.7313884305122ZM764.7717425173207,313.55611019043386L764.8036597445073,313.6343622550344L764.7717425173207,313.55611019043386ZM755.7512082515356,316.6495922727114L755.6346150449282,316.5663982565584L755.7512082515356,316.6495922727114ZM384.6230117358495,287.6713744571787L397.08777969854003,288.5370490189139L399.01087150905255,288.65653617319674L405.07224721651005,289.0479932322279L413.076096199909,289.50447938814534L415.0219253122342,289.60024485251085L421.0827248977261,289.9094912906379L429.1344340400485,290.26480974939955L428.83552101123394,298.6305477587249L428.6965990272063,301.92907272478544L428.4893299128822,306.8504129509324L428.33332690011383,310.5545051145954L428.143368322615,315.06482876698976L428.0233905130729,317.913548520871L427.79761171841915,323.27437745075827L427.6941235467393,326.7725476944744L428.83740155738104,326.55704637861174L430.0051351039113,327.893227625044L432.1727589548982,330.3877581181564L433.9550932561696,329.72947441030703L435.5468236517276,330.1842135133594L436.7072521679918,330.5914489255297L437.08575535040376,329.05890501813906L439.54527993900876,331.4378200178468L439.8134543024758,333.7613704720901L443.42425927883124,333.9053676145792L446.24690246701255,335.42239578633473L448.64054653921306,335.1007597396093L450.49240351789365,336.92407073999664L451.46605743848266,336.5730813492063L452.40958733769946,335.1983999150009L455.37902725187405,336.07714583028906L455.87580805799547,335.5423989169211L456.65978169082877,338.2117877440613L458.76125451860446,338.4918794653073L458.22028126978137,340.3609201153208L459.87836579262074,341.16065763489223L462.72012775854387,338.6170987587943L464.63458679221026,340.29036148377827L465.83184109759884,340.01643094037547L466.14681659750477,341.4373047021668L467.5171108813676,341.8508805328921L468.5079206927626,340.56112261501426L470.4052192476238,340.3444852630148L470.10519311720935,342.2295751167985L471.5860077811759,343.7532548334299L471.78446698143296,342.38328753917096L474.13034569883854,339.4928031296753L474.28584113420663,339.39529112577213L475.28411808537504,341.27346608006053L476.76172657459017,341.67833134268267L478.5848741739217,340.1933007696274L479.6041120334635,340.5547002641491L478.99035410865315,341.4997161687917L482.1180264361638,342.79230643029314L482.811119009952,343.7531342122885L485.90073056798,343.1044230871797L487.28550101783486,341.2894996029469L489.64998436444085,340.71883709434167L491.0211964385072,341.61565792814724L492.35150577011774,340.97625575144264L494.82102556493163,339.70567306003545L495.55972647684297,340.68167580603824L499.2561107216004,340.8606787066211L500.662690507497,339.2640847546662L501.643646908921,339.7418444565542L504.5180276677401,341.1233591299085L506.2075339256347,343.32225767890793L507.5031456483965,342.9444031229674L507.9993124764134,344.06868221701995L512.0322285657359,345.23258790143404L513.5909779234618,346.95387898832564L517.1134039297375,346.0461839299294L518.8962912052394,346.71885044760427L519.0050470685546,352.00109827913457L519.1025630255855,356.7374263893071L519.155983152965,359.3320299666092L519.2287101204008,362.8643624250333L519.3449778419833,368.5114595238442L519.43211174482,372.19522931974177L519.9399510086631,376.24215325336377L522.152166301288,378.73968416782475L523.5457582010386,381.37671882546965L522.9594266466055,383.5626401654174L524.8792412051305,384.86669909235684L525.4769839591941,388.83586481487987L526.8656596476268,391.1566687796728L527.626782862174,390.96206242853907L528.3949291542592,393.87674672559774L527.6820484248918,396.89545505230353L526.6068258139817,400.4983169384377L524.93747390049,403.1096700869681L525.6493703967187,404.9045034776817L524.9644427713608,405.6990952200215L524.5980620784778,406.80951966744703L525.554864413203,408.64215930233183L525.4447257946154,412.2490525514022L523.3740608441991,415.7855047907923L522.191510543913,416.97147597424373L523.6971315623159,419.00702879465246L520.8623189871204,419.3017509899356L515.3888730311539,421.61820423324616L515.1226589329394,421.7341691468007L508.83674907366714,424.816531942055L511.9817981974326,422.2453498342194L513.5132556867184,421.7278092711597L512.2791490110409,421.47627180072016L509.1430563043858,422.36487457092824L509.8072103320124,418.0618080291548L508.0479489919557,417.3833000730433L506.91859089348304,419.7096495679673L506.0604763556932,419.5118338464496L504.6110626580119,418.96248102791174L503.63590410481146,416.826222361703L503.2044764245233,417.90846571633585L505.1589481036988,419.5869800762247L504.60768884300234,422.01606351176474L506.37986299807767,422.99496399489965L505.6972826073186,423.5312993768149L506.8430468897235,425.17122310283776L506.5033583604743,426.6232684610479L505.8923554573187,426.3744858012723L504.048317330685,428.5174814052681L502.53498279420995,428.8746078466619L501.13466048351364,432.4483962210132L498.46708201901015,434.82784718239014L496.7366027020398,435.55596102104346L493.71354671341066,437.3803593570956L492.128849543824,437.04822921236547L489.72758623638197,437.99397386376114L489.2922171953321,439.3157736022028L493.5079426134368,437.53722143111355L483.16031461416986,442.80427634550495L487.9004879974009,440.07851582221525L489.07392799426736,438.74019373155346L485.9723629374509,439.685987505447L483.3565058106468,438.9735169513909L482.24490251278996,438.3816464263746L481.6289996299622,437.76621691391307L481.50857939090116,439.6248733984409L479.63702912884935,438.99048499371344L479.2375412781178,437.7926527888637L477.8965568265758,437.5096092528519L477.84939118331454,437.51729376613787L477.83193340604134,437.48713208693107L477.8352160471308,437.86265338369674L478.63548679702023,439.8253002955133L482.1207591177481,442.7082163929788L477.95785911433546,444.9154568993277L475.7287408310011,442.57237395900927L474.5002996668837,443.1711431272906L475.62612196636246,444.9648195208305L475.48916754785836,445.7709407429419L475.5049205499932,446.71627423065996L475.3027881786579,446.80057837330156L474.76431136626803,447.39796168026226L472.8084277367416,448.5814125028216L471.85755291773296,447.09550227496163L468.1204590033649,449.6559445150937L469.4762766984108,449.9370177766407L469.0079462209348,451.3097541284656L469.05453916024817,451.3853020130526L471.715220905662,448.7539795253192L471.66349692901167,450.2461089380386L469.8358900856187,452.63017446656227L469.81771765975736,452.6579394556069L469.7266538446077,452.81274689572035L468.91316761759794,454.13177319105654L467.5529792233924,453.023954150775L463.94277344067245,453.7438965312919L465.66247522530296,453.76194247138324L466.5646335994798,456.0617344760287L467.83471620877816,456.46657263510974L466.613421980419,458.9736531122255L465.04847315194667,463.4189807268752L463.49046742689245,464.244160366999L464.2108512013634,461.82246175959847L461.7492275827852,463.4063215135414L459.77107814828025,461.54506328523405L460.9253058295941,463.9499298069671L459.0073286258805,464.0030348575904L461.1549870393683,464.17743986496555L462.84785488946727,465.0759005340878L464.8947898139208,464.4843283746598L464.4338158332227,467.20857865370857L464.03330093564256,469.0412441602532L462.59647652336014,469.8109766356262L462.68345001193654,472.59131789165144L463.9405487143812,473.86480818512064L464.3663600401319,476.78196995107794L464.65669338965085,478.35965636387994L464.6241129016081,479.7250389171574L464.2707314777898,480.28706671980154L465.2145258335111,480.3051377009857L466.7696216384258,484.31314053031446L466.4782725065523,485.64288973448186L468.1943091785256,486.77240210624734L467.4842791539892,488.5566712542666L465.34002641465804,489.6144221843345L465.3583508808443,490.8737744167619L462.87506096723604,489.9793724577256L459.7844162749335,487.1316342366636L457.15332257888406,486.469726564433L451.5463642633861,486.6643606095604L448.31482615774854,484.65195244119525L447.3516833444057,483.39079143304696L444.98009972237793,482.7100486174912L443.46832838512677,482.9896157145479L441.3740239371442,480.5802450870422L436.2301588570502,479.3229047821102L436.58080798190105,478.4061965455893L435.3343798600583,476.598053900187L433.84748289021263,471.5106356994656L430.9944225952876,468.1156654260457L431.4223425953804,465.252455796105L431.02122035105765,463.5750183985353L430.23377169931297,462.16841258079063L430.7538396492342,459.57998242563247L428.94255671159993,456.5562442473553L427.0078819832735,456.11208195275475L424.3560225851727,453.37908725348245L423.57426325550523,449.95357310795015L422.6684286267847,449.71872445322117L421.14307485549955,446.7560549053539L419.13390355389254,445.75640558945753L417.86392163657587,444.0636451142499L416.35671560214325,438.35316660315937L414.83556491368097,436.93294816420894L414.1721782478919,433.78353324211446L412.57549455017966,431.51789172063565L412.44620785699306,428.884100463235L410.7680627270372,427.1157479649253L410.51558273132935,425.8443350784754L407.21779180792566,423.3689448225972L406.40603540916186,421.58138785983465L403.2297767526469,419.92897216953565L402.7034671681955,417.9532572871028L400.37049079400225,415.102050960664L399.00413343988004,415.56387152235743L395.3903045783228,414.91546406417183L389.67066004790524,414.3474158623792L386.47175772201285,412.51512900884563L385.21711738128704,414.6384404552316L383.186793384065,414.0697956898414L380.6940864556052,414.62506024292895L378.1073502331002,418.65325291800036L376.7785599470693,421.6566493855321L376.43124628697103,424.3426748964797L374.71320847146603,424.71456607131677L371.7779185349372,428.4381927294131L367.2945097478878,426.7327689103183L365.4853249279322,424.4755692332983L362.84702654458454,423.81762044712434L361.7794582743009,422.22153564535245L358.9162513716695,421.3597585511443L357.2008484090311,420.27564177983163L354.56057769318693,416.91121552306333L353.3558807456571,416.6939715864629L350.76321175011867,414.1327841846537L348.5192443105369,408.87596269328844L348.8173740661722,403.90610556341665L346.4140925265435,399.71384926413305L346.4276538685273,397.4638805614869L344.91074270942045,395.08525601404097L341.47898078551907,391.4349577225614L338.7191400918225,390.1733963007123L336.3841462847399,387.4798787760935L335.7844173444512,385.61486907140716L333.2834679172199,383.81821071571426L332.00780863894585,381.3896488138163L330.1751892285995,379.3407824730873L326.86300298806475,377.25141231279486L324.80548260173975,372.24710722810664L322.61540285862526,371.0391824935923L321.09083211122606,369.3163874260297L321.64767531969926,366.8434645837176L325.42777180495614,367.2474802869358L331.3751316740047,367.867142365209L348.30400127079344,369.59179584130266L349.40805952301116,369.6942729248044L362.3336885402466,370.85369125850923L363.02714284732986,370.9112047998584L367.06967695579215,371.2439008179248L373.30151018164287,371.7352781064925L377.41963892084243,372.04460793821283L377.5402300117951,370.4251612080874L378.14127254486823,362.2779329991555L378.75066792582766,354.0946333474899L379.4720344857968,346.05446769076L379.79255865418384,342.6425918284889L380.2246237989766,337.8743855821847L380.9395480340331,328.9178517651369L380.95369774776486,328.7272876613747L381.5813623693014,320.56914825855176L381.8696135328739,316.6862736932841L382.1890034651635,312.3839457195837L382.81780588660826,304.13250779078885L382.9863724196252,301.9343290233878L383.4324059573996,295.9973621018189L384.03757568724785,287.6270249792841ZM505.27521823388867,419.5716811178801L505.34460342786605,419.5277776821089L505.27521823388867,419.5716811178801ZM509.27764836822655,425.900887559446L508.3082512820091,426.9032433910927L503.08937069207326,430.5504862054406L507.3750676875491,426.64707175874184ZM474.9352294645739,448.86340883295554L475.6118547149518,447.3922373064797L476.94616907823297,447.27675760316396L478.7936163224029,445.623175233022L481.98919973709843,444.4646200777659L474.7599744567019,449.2278083315439ZM471.11297901780256,453.2934826955571L471.0256982087286,453.6502389528379L471.11297901780256,453.2934826955571ZM474.2167168401295,449.5878316349397L472.2537551566678,452.29045345273386L472.5005460371815,450.8377284180784ZM465.7073909530948,471.2982783427732L465.42842872871415,466.5083185768041L465.75234629857664,464.8501252354149L465.9471554350528,464.22038059781516L466.0262478667429,462.4582591799773L467.9138998606643,458.6088227416364L468.3304845388322,458.7080986886741L466.16276837567165,464.2244513893901L465.63001896999924,467.501618438448ZM469.2715299708001,455.97045723262227L470.7771909839212,454.05011439808465L468.6857780731814,457.99265452643107ZM466.50361558568375,476.8050536879277L466.57604778371365,476.80705180399696L466.50361558568375,476.8050536879277ZM467.52522492456063,478.5474632122562L467.3818694547412,478.4181265735457L466.25169525220275,477.546408517259L466.66660534476193,476.8083002395747L466.24534470867076,475.4160536066365L466.69733716622477,475.8904715378233L466.99869081128224,476.8098469129214ZM466.69733716622477,475.8904715378233L465.8663970525241,474.4912412718531L465.5183364672601,471.47096168118617L465.7073909530948,471.2982783427732ZM467.7196703801665,480.3199329995526L467.93748621707334,480.32276511691765L467.7196703801665,480.3199329995526ZM524.5734394015631,291.0777357521365L528.5808555967567,290.98437200516946L528.8582390869958,290.97448085727444L535.43654152555,290.7790750768961L536.6476261743327,290.74250543134315L540.2582612458589,290.5969863896029L545.8904951788243,290.37998739226646L546.3382692579036,290.35670259747417L552.9927435479162,290.0580560325311L556.3000037470438,289.9379502076803L556.9296483683206,289.9187948716393L561.1032043461751,289.6986182287591L566.1765899332529,289.4138850607311L569.2727765762266,289.23939801601944L574.548543268325,288.9412938209406L575.5233682070057,288.87957909822626L576.7621074138729,290.6483565246285L577.1058697554024,292.46327604096496L575.3429119803124,294.4938012366738L572.7799338843865,298.53192142580895L574.1039349967532,298.43869013174185L579.029252986852,298.0820721747748L582.7951576008617,297.78563351647597L583.845383709976,299.5572214285777L582.3618230714426,299.62535515250875L583.0770779436045,300.97915162596985L581.3639923047372,302.51708643096015L579.4248403074489,303.02436903805165L581.003487739857,304.8755502998415L579.5438430645304,305.82731172529L580.3311821315422,306.70803351767256L578.3562891560864,306.65592197133196L578.5126366323553,309.4915936851356L578.3266490445754,309.6411618215643L578.047881277372,308.30690911320005L576.9329779141106,308.8659133633266L578.0137522069682,309.75806981375604L577.010714009672,312.2404745987242L578.236258155627,312.8001456518001L578.4360349308486,314.34288093056455L576.8766507065109,314.837901321403L576.3535481788667,316.6194850402263L574.9319323773256,317.27910700563075L576.0221468147528,318.52687796684484L575.1611307108832,319.82638200861186L573.6174666686735,320.42585085390124L572.4188355339419,319.9254805447965L573.0259990324303,322.08886149092996L571.3116028865744,322.62871940150444L572.9041670020061,323.47185575054857L571.1645565275821,324.17597845923353L571.497737514971,326.3611823749907L571.5123484516324,328.4417893557853L568.8382755039281,329.4650123162221L569.1106804053861,330.6114276759448L567.5979200312747,332.4389516541503L566.1870451268469,332.1129245652686L567.9846723319617,333.774543763004L566.0110599008851,334.2937690258649L566.023291322773,334.31640158323194L567.1307351191223,335.9364916795482L564.1129544489618,337.3618972837879L565.3288755679613,341.0579160435044L563.6351871457146,340.7602079584136L563.9315561189816,342.21608197966566L562.4082877788367,343.1190929283998L563.7847601680952,344.32782333464434L562.3257058235196,345.0087519174074L562.6055847661172,345.6035698258718L562.363294916412,347.30778980238915L563.9286512600788,346.4850468668069L563.9632290796604,349.87721707028095L564.9504273289111,352.8020822624296L563.215512837169,353.49534642371657L564.520052137163,354.42357847006576L563.8484746376556,355.28579504313063L563.8610326118957,355.422622108671L562.3426130031196,355.47993210387733L559.6580809930647,355.5921783172888L559.2844029944213,355.6131199297025L549.8184561605581,355.9927870977789L539.6111922588876,356.2647524126297L535.5119972242192,356.3417838984933L531.6207257885301,356.4498943077001L527.7013213878952,356.549507672289L527.2322928271318,356.5597996027825L522.8155988307158,356.6542950394677L522.6536562743827,356.657017518937L519.1025630255855,356.7374263893071L519.0050470685546,352.00109827913457L518.8962912052394,346.71885044760427L517.1134039297375,346.0461839299294L513.5909779234618,346.95387898832564L512.0322285657359,345.23258790143404L512.0738658429458,339.5300966593686L512.108867338889,334.8459387710317L512.1441082438104,328.8649889298857L512.1858541980545,324.6929084222621L512.2211503353269,320.83170929584014L512.3166189124837,312.4125525479012L512.3277740425124,312.10366064112384L511.63193909590643,307.56595829180003L511.2882076505488,305.2976717396888L510.3058239997843,298.8460858201315L510.1225004019882,297.7238555720255L509.2097963176881,291.37556701227345L517.2523709308684,291.24788264153176L520.3794379097478,291.18114860017465ZM701.6150623640751,300.4582215302546L703.2150681859141,300.2873231766796L709.2679390199917,299.6589208364228L709.8463612383963,299.59565703009685L714.3029595195746,299.1870022655637L714.4897081516035,301.12636546078556L716.423366912039,300.2289661648756L717.6418066524304,301.46794863841546L718.6954276086166,302.56264390571755L718.8076252746058,304.72918155546927L722.3209457525268,304.2009888036133L725.987612150532,303.6620061626543L731.8713196159833,302.81054083849676L731.9036000411672,302.8050296454379L735.5025765185034,302.2207639539189L739.4533177476127,304.8659996854525L739.6562151083748,305.00899898782984L746.3915874114168,309.9380114210679L746.4176936894528,309.95899422500827L753.9575496306727,315.36393359272233L755.3295602571643,316.34547968454115L755.5306131498926,316.7933135465987L752.1852948457301,319.5414272314605L749.8785830705626,323.2365183781237L748.3230864797438,327.22662523662007L748.2397210196829,329.6658451891184L746.60331355314,328.7964814609976L748.3341247240264,331.1752979877474L747.2750872114864,331.96922958753703L745.0746104907344,331.5325851464893L747.2114150762757,332.2482060920222L745.303646124502,334.66306286101894L743.04725443013,335.1182866945329L740.7024973940315,338.6755237862958L739.3864242725818,340.43895854077937L738.5996489400201,340.22555688396176L739.8314529291301,337.1787525581186L738.1968505286916,339.4640617567745L737.5393982048545,338.03941270239204L738.3124667702945,340.8735086973287L739.1824158444164,340.8076897433675L737.8480568078655,343.55757476643396L734.1265826321251,345.84158937930897L732.7726419621309,346.7095906683178L731.2789953522732,344.91412813959766L731.6918008931068,346.68639980213925L729.0041410020668,346.03080230658463L729.3782564090961,347.16758186703487L726.2727878646706,346.8392300777614L725.5600816897411,347.9608310547568L724.9697017533845,346.55694926256126L725.3503925607223,348.6393022676825L725.4218335341425,349.4726883487273L725.5196045636125,349.54889519791084L725.4379530801423,349.7500058935858L725.1670635233079,350.1929772709516L726.8745852656763,351.54707152481603L726.2638634676574,354.3143798375369L724.5383175105849,355.03827521911444L724.4670355865364,356.0970818649357L721.9354045641644,355.68231247702874L721.1936683203821,353.7334186849333L721.1113660681366,351.6189144532268L718.1145317986848,347.94394514367855L716.3312150891322,347.47803301406714L715.6573980464043,344.73985966506893L712.6908156566759,339.48004435626615L711.4353456002711,338.72834961514866L709.3013742745719,338.16185784954723L708.9511703550497,337.14969868084995L707.3533480753547,336.4517127514879L705.5931368342135,334.34892554859766L705.5722997125763,332.58845563563716L704.1067100896443,331.5257557787804L703.8298488932235,331.3227078769969L702.3602546230817,330.5572721471998L700.3092262805078,329.0177636413488L698.1786446694459,326.6265799291268L694.5389980570772,324.86289056010173L693.9263346038913,323.84540752713383L691.1941119414672,320.527492625042L690.476903268815,319.0947071742738L688.6752488446202,316.15273715247713L686.7222097463896,315.95655225222436L685.7474544419084,315.8679818003777L684.8512738948092,315.17812249894996L680.9301748415238,312.8458472876789L680.6409873287053,312.33352535721224L681.8855814373496,309.0961374132213L683.4761038974895,307.72370110511247L683.6038052760533,306.5239132694454L685.0286592878813,305.81606041951716L686.631427926643,305.0523082514594L688.5990642441088,304.5501005978673L691.2178789224431,302.72120028652955L694.4238838190018,301.3895825658684L696.4678527770766,300.9923605305195L700.1881792860627,300.6107756722297ZM755.6346150449282,316.5663982565584L755.7512082515356,316.6495922727114L755.6346150449282,316.5663982565584ZM755.4018344791518,316.40196797072304L755.6133399988591,316.5425956401799L755.4018344791518,316.40196797072304ZM746.8152056007881,331.9309842024127L747.2791180278139,332.1192607917285L746.8152056007881,331.9309842024127ZM727.5661670619368,351.8682386776795L728.5893379148281,352.7501820652451L726.7045350923142,355.0613515825431ZM727.996892956848,347.46379276770017L729.4864353486439,347.3757570610553L731.2904320788454,348.6389726417717L729.8187887782049,349.8907959441134L729.1829719770869,351.8340897915508L728.0920084794651,350.00922288499055ZM726.4703592413553,346.96974074347156L727.4642627912314,347.1304150661117L728.3927678761737,351.22622740944496L726.6205787356084,350.046570354579L725.6366360909996,348.2590998697741ZM608.5506065267793,316.8232513389048L606.8425749862995,315.01157228875434L610.081516253949,314.5455335032967L615.785691025681,314.0986533419783L621.5831852845749,313.65081144474414L621.7844156505141,313.63927605232334L627.466559529393,313.23514203963134L628.2468416927553,313.15843909819444L635.2699156602503,312.4731787986136L635.4000157444078,312.4608914669798L642.1368227931628,311.80959477803276L646.0472995461676,311.4547777102771L646.6335259889477,313.74537413874157L647.8655454766676,318.0890083859264L648.041708637354,318.7359983645574L648.3766153763321,319.91989820878337L649.6560319339469,324.28271569195897L650.6973611980154,328.0593442880846L651.2977354214161,330.20222186136345L651.61481768413,331.3463703224454L652.8737629451343,335.91174790349237L653.7562386388188,339.03384009828324L654.0320356652393,340.03948991617267L655.5496976289386,345.51703446709223L655.6506499063116,345.9109897278146L656.9114517610337,350.2609427558044L657.9332877482889,352.4893567002772L659.0720457833519,354.975654178745L660.5273313002392,356.65240186325434L661.2681272892987,359.07538956556004L660.8384291611058,360.06050583485194L662.8291675756194,361.0716719350879L662.3492903506884,361.72491660668584L660.4003624884032,363.8264405897103L660.6381557008672,365.09589718818415L660.600747205996,366.4467439562708L659.7514806436479,369.0706118945475L659.9116184377067,370.51582517621364L660.1638447316772,370.8225621245292L661.9785404003663,375.2483880508415L661.7647610141004,379.20707828419984L661.8630244261701,381.9053204161545L663.1974135474038,383.43795941299516L663.7745629912888,384.7851474232368L656.0758464260592,385.7268620796908L655.9224617570922,385.74692474443407L647.4098433279246,386.73586194890527L644.9926525524314,386.97410757083287L641.7954663618123,387.2989209001156L637.0353351001373,387.76829384967493L635.4801270422795,387.8738393768699L629.4776483430305,388.4071410016089L622.560629806433,389.06541783048215L622.2066144782835,391.5702090510663L624.086471213076,393.7197284734252L626.1579835546529,394.8034897628809L626.0670688099408,398.39747135327536L626.8089691208529,399.04582877682424L624.3869400107295,402.53687244894843L619.9911254031516,403.7639312739285L617.8820931647293,403.8038666893914L621.3606901745856,402.4936587930242L618.5991639249871,400.4430760724118L618.4637281876234,397.975911120158L617.6158124160073,394.80279943425853L616.2743723059014,394.35411405903085L616.2216030645384,393.93263389208346L616.4832704446284,393.54924365724446L615.3080853119108,399.02189759713053L615.4419090641263,401.32446004417955L610.7967432997023,401.52652738965526L610.0119467487777,395.045757435346L609.414032112726,390.1577652207111L609.1383571857311,387.99923761811317L608.3808229516228,382.0153728223024L607.7587469717665,377.1350844376901L607.3207100699716,373.48150213295537L607.488734153119,367.1842883766012L607.5194373742854,365.6563526722148L607.6258095620074,360.5712169741754L607.7337984725399,353.94867469406074L607.7568174195088,352.77513157638157L607.8620251562031,347.1639494693378L607.9474629938024,342.5229854498799L608.022343364766,338.5352454956105L608.1791218844719,332.60574448197667L608.1905664966613,332.0723448194751L608.2887246010253,327.63554147913953L608.3309179929919,324.94746700952896L608.397878156097,322.70241434468585ZM625.036499889628,402.3386751162062L625.0290675155645,402.25560912678L625.036499889628,402.3386751162062ZM680.9301748415238,312.8458472876789L684.8512738948092,315.17812249894996L685.7474544419084,315.8679818003777L686.7222097463896,315.95655225222436L688.6752488446202,316.15273715247713L690.476903268815,319.0947071742738L691.1941119414672,320.527492625042L693.9263346038913,323.84540752713383L694.5389980570772,324.86289056010173L698.1786446694459,326.6265799291268L700.3092262805078,329.0177636413488L702.3602546230817,330.5572721471998L703.8298488932235,331.3227078769969L704.1067100896443,331.5257557787804L705.5722997125763,332.58845563563716L705.5931368342135,334.34892554859766L707.3533480753547,336.4517127514879L708.9511703550497,337.14969868084995L709.3013742745719,338.16185784954723L711.4353456002711,338.72834961514866L712.6908156566759,339.48004435626615L715.6573980464043,344.73985966506893L716.3312150891322,347.47803301406714L718.1145317986848,347.94394514367855L721.1113660681366,351.6189144532268L721.1936683203821,353.7334186849333L721.9354045641644,355.68231247702874L723.2138392416823,356.2056452173829L724.0079578218104,358.32079638486323L725.3857004460715,359.0870255099111L724.6532145087568,360.1774550955357L721.9792929826874,359.1551465186351L720.8013039104096,360.15939645186074L722.3004038619681,360.64711282516316L722.3864689244454,363.01634459351135L719.6714212835062,361.88715085002684L721.3846788264156,363.04009279215916L721.7757414129727,364.06789122406065L719.6203229269636,364.8458783950233L721.7131899118513,365.0260054783837L722.2498270519038,365.9155427218765L720.2425435787445,366.77568021795946L720.6958646923354,370.20896357140884L721.610676076432,370.819466864173L718.5765174836899,370.98321202734985L718.6068845232155,371.0304881269334L719.0838003272547,371.091423446657L720.0877454082906,371.7959790864338L719.2432622721869,373.9605900334709L720.0435135006009,376.4837003381284L718.0821968984551,375.9688017124429L720.1934115657218,378.16792267039943L719.9094153600977,382.35597946175756L718.2813735870136,382.81188267474556L713.2514601386813,381.47095921175196L711.3749868242872,383.1420598031393L711.4372315835841,385.01657282961276L712.3890930471796,386.61165595067484L712.2333724749424,390.4410984192874L710.3291849294613,390.7853749058286L709.5694306470319,389.8585017603872L709.0539504422568,387.00805785884734L705.775890759934,387.2323558545221L705.1196302127937,387.2799074895887L703.1283291179402,387.4260796563532L701.4423480989043,387.5499635450868L694.2653863170915,388.0460972927914L691.4964334119553,388.22375227097814L690.9897829457686,388.2551992650632L690.7307554467095,388.27162208928496L686.6527565677856,388.54803379734744L684.5360873875902,388.6871103339663L680.3105967501763,388.9725955039736L679.0922998813644,389.0567072803692L675.9092399769272,389.2771694898544L674.3346127907727,389.3812844436534L666.6090616810319,389.9033923919127L666.5919347234319,389.9054083318732L663.7745629912888,384.7851474232368L663.1974135474038,383.43795941299516L661.8630244261701,381.9053204161545L661.7647610141004,379.20707828419984L661.9785404003663,375.2483880508415L660.1638447316772,370.8225621245292L659.9116184377067,370.51582517621364L659.7514806436479,369.0706118945475L660.600747205996,366.4467439562708L660.6381557008672,365.09589718818415L660.4003624884032,363.8264405897103L662.3492903506884,361.72491660668584L662.8291675756194,361.0716719350879L660.8384291611058,360.06050583485194L661.2681272892987,359.07538956556004L660.5273313002392,356.65240186325434L659.0720457833519,354.975654178745L657.9332877482889,352.4893567002772L656.9114517610337,350.2609427558044L655.6506499063116,345.9109897278146L655.5496976289386,345.51703446709223L654.0320356652393,340.03948991617267L653.7562386388188,339.03384009828324L652.8737629451343,335.91174790349237L651.61481768413,331.3463703224454L651.2977354214161,330.20222186136345L650.6973611980154,328.0593442880846L649.6560319339469,324.28271569195897L648.3766153763321,319.91989820878337L648.041708637354,318.7359983645574L647.8655454766676,318.0890083859264L646.6335259889477,313.74537413874157L646.0472995461676,311.4547777102771L648.0261487245183,311.2666388791388L649.6760294471617,311.07609638926647L651.1658106487893,310.8753239676438L655.4661226654407,310.33111255125016L657.9917419736385,310.035712083005L658.5372776904961,309.96599825013607L660.8612613565778,309.68122160162386L665.3740591099606,309.12808758238566L668.2560149850891,308.7855534232425L670.142145782511,308.55362991246886L671.1730681154609,308.4163337062382L676.9871967320934,307.5674814737947L677.9893266745022,307.4208036137986L683.5988215902553,306.527656699321L683.6038052760533,306.5239132694454L683.4761038974895,307.72370110511247L681.8855814373496,309.0961374132213L680.6409873287053,312.33352535721224ZM722.6155421550047,360.6443408649102L724.0624747231341,361.04683964894787L722.8778456007092,363.03479074931863L721.9106069567506,361.41540183083ZM723.8010963432296,356.3358769733562L725.257981219223,357.24876955006346L724.232833279247,358.4013683680207ZM722.9510369559057,363.5352486699769L722.6084358959138,366.2191123064024L722.07822479874,364.23659346771876ZM720.9076699219521,371.2367159867438L721.0176523284102,371.2012641486383L721.8393221315387,372.8032076526249L720.4911921156906,374.58655886496297L719.6786355829992,373.4096276833951L720.0611987041301,371.2519971352107ZM722.3638722120266,366.64190509240666L721.5795476141511,369.7696221224446L720.5063159077522,368.0637379007393ZM720.7873017661063,378.3326841226527L720.2051573349102,382.1995720156583L719.3261081804233,379.54331884414864ZM597.4262562026283,315.7621306696394L597.9745764849174,315.7205405789563L604.1130060801066,315.2334727398784L604.3791705063921,315.2151094641408L606.8425749862995,315.01157228875434L608.5506065267793,316.8232513389048L608.397878156097,322.70241434468585L608.3309179929919,324.94746700952896L608.2887246010253,327.63554147913953L608.1905664966613,332.0723448194751L608.1791218844719,332.60574448197667L608.022343364766,338.5352454956105L607.9474629938024,342.5229854498799L607.8620251562031,347.1639494693378L607.7568174195088,352.77513157638157L607.7337984725399,353.94867469406074L607.6258095620074,360.5712169741754L607.5194373742854,365.6563526722148L607.488734153119,367.1842883766012L607.3207100699716,373.48150213295537L607.7587469717665,377.1350844376901L608.3808229516228,382.0153728223024L609.1383571857311,387.99923761811317L609.414032112726,390.1577652207111L610.0119467487777,395.045757435346L610.7967432997023,401.52652738965526L609.5577111685161,402.9126970717575L608.4327951637914,401.7222775644343L605.1721158272874,402.6816396365052L602.9269041464744,401.3881989073334L596.5718600469962,404.1738356760957L595.668034125008,402.93091230815526L595.9554352130802,404.2203229417016L592.9843152370199,406.7586405933678L591.4107573460632,405.95296863993156L589.9572643365042,401.6992243113599L587.7949881992433,399.46497506264313L587.2665842298247,397.98993857864775L588.6769826952205,391.59531701099706L586.9626334912795,391.7126781516681L580.2128801170442,392.1621626216016L578.8180675251625,392.2509031371511L575.6222846384221,392.44990937449336L575.3134784958113,392.4676118312834L571.1903876664821,392.7049713828502L567.4614049991814,392.91162743337793L565.607802378195,393.00389711509774L558.26700439097,393.35290743295593L559.3696307717387,392.03761667287085L558.3374185113561,391.1465444054902L558.8556363995681,389.72912081884374L557.7661462049246,388.67190327850324L559.9546140126826,388.0451235942023L558.8460175976315,385.7133413296174L560.0487505466267,386.4118821408325L559.7978933018221,383.2783404774392L561.337565693556,382.6017766696224L559.9594579244616,381.16012742937903L561.4575852757766,381.55222966020483L561.6999739675332,379.3992044803932L562.660791325343,379.06162975461496L562.1323163885551,377.32113815892944L563.6478209572882,376.7577511138919L564.5003562127313,374.9953289654426L566.2213770314094,373.8655499548155L566.8373964319986,372.0003365538563L566.825696455253,371.884853487609L566.4723373483567,371.83364574532163L564.6913001432291,371.73255478573697L565.2775377362758,370.26397280510946L567.1645914194678,369.9407158448861L568.4672534566818,367.68224098110534L567.0054761808783,367.3457806217915L567.302323422047,365.7070596216429L565.5768771397009,365.673043777971L565.7696498445039,363.63577334734725L566.1822650653306,363.3506305606262L564.450613248254,362.1479337046611L565.821924120587,360.6415161010858L564.5378871509542,360.45013965856606L564.4081775602858,358.57324043165556L565.393604645705,357.57856755356465L564.9492090444809,355.6983691511872L563.7869566500813,357.3780532835889L563.8610326118957,355.422622108671L563.8484746376556,355.28579504313063L564.520052137163,354.42357847006576L563.215512837169,353.49534642371657L564.9504273289111,352.8020822624296L563.9632290796604,349.87721707028095L563.9286512600788,346.4850468668069L562.363294916412,347.30778980238915L562.6055847661172,345.6035698258718L562.3257058235196,345.0087519174074L563.7847601680952,344.32782333464434L562.4082877788367,343.1190929283998L563.9315561189816,342.21608197966566L563.6351871457146,340.7602079584136L565.3288755679613,341.0579160435044L564.1129544489618,337.3618972837879L567.1307351191223,335.9364916795482L566.023291322773,334.31640158323194L566.0110599008851,334.2937690258649L567.9846723319617,333.774543763004L566.1870451268469,332.1129245652686L567.5979200312747,332.4389516541503L569.1106804053861,330.6114276759448L568.8382755039281,329.4650123162221L571.5123484516324,328.4417893557853L571.497737514971,326.3611823749907L571.1645565275821,324.17597845923353L572.9041670020061,323.47185575054857L571.3116028865744,322.62871940150444L573.0259990324303,322.08886149092996L572.4188355339419,319.9254805447965L573.6174666686735,320.42585085390124L575.1611307108832,319.82638200861186L576.0221468147528,318.52687796684484L574.9319323773256,317.27910700563075L583.7844724850883,316.73730386042325L584.9953166777493,316.6476003919586L589.4131831510961,316.3712891097706L591.7476370242941,316.1936742423701L594.4838879756937,315.98678924126193ZM519.43211174482,372.19522931974177L519.3449778419833,368.5114595238442L519.2287101204008,362.8643624250333L519.155983152965,359.3320299666092L519.1025630255855,356.7374263893071L522.6536562743827,356.657017518937L522.8155988307158,356.6542950394677L527.2322928271318,356.5597996027825L527.7013213878952,356.549507672289L531.6207257885301,356.4498943077001L535.5119972242192,356.3417838984933L539.6111922588876,356.2647524126297L549.8184561605581,355.9927870977789L559.2844029944213,355.6131199297025L559.6580809930647,355.5921783172888L562.3426130031196,355.47993210387733L563.8610326118957,355.422622108671L563.7869566500813,357.3780532835889L564.9492090444809,355.6983691511872L565.393604645705,357.57856755356465L564.4081775602858,358.57324043165556L564.5378871509542,360.45013965856606L565.821924120587,360.6415161010858L564.450613248254,362.1479337046611L566.1822650653306,363.3506305606262L565.7696498445039,363.63577334734725L565.5768771397009,365.673043777971L567.302323422047,365.7070596216429L567.0054761808783,367.3457806217915L568.4672534566818,367.68224098110534L567.1645914194678,369.9407158448861L565.2775377362758,370.26397280510946L564.6913001432291,371.73255478573697L566.4723373483567,371.83364574532163L566.825696455253,371.884853487609L566.8373964319986,372.0003365538563L566.2213770314094,373.8655499548155L564.5003562127313,374.9953289654426L563.6478209572882,376.7577511138919L562.1323163885551,377.32113815892944L562.660791325343,379.06162975461496L561.6999739675332,379.3992044803932L561.4575852757766,381.55222966020483L559.9594579244616,381.16012742937903L561.337565693556,382.6017766696224L559.7978933018221,383.2783404774392L560.0487505466267,386.4118821408325L558.8460175976315,385.7133413296174L559.9546140126826,388.0451235942023L557.7661462049246,388.67190327850324L558.8556363995681,389.72912081884374L558.3374185113561,391.1465444054902L559.3696307717387,392.03761667287085L558.26700439097,393.35290743295593L565.607802378195,393.00389711509774L567.4614049991814,392.91162743337793L571.1903876664821,392.7049713828502L575.3134784958113,392.4676118312834L575.6222846384221,392.44990937449336L578.8180675251625,392.2509031371511L580.2128801170442,392.1621626216016L586.9626334912795,391.7126781516681L588.6769826952205,391.59531701099706L587.2665842298247,397.98993857864775L587.7949881992433,399.46497506264313L589.9572643365042,401.6992243113599L591.4107573460632,405.95296863993156L592.9843152370199,406.7586405933678L591.3802924432075,407.31127537006773L589.8261749093565,409.1603733371784L587.7927976248237,410.39938878491955L588.9147456907351,411.6506597510735L589.9654789396785,411.0925514967315L590.4350355505187,412.6492923241392L592.0486556357293,412.5816652235726L592.3244735902598,410.2917090880891L594.3949258021274,408.87579047678537L594.9056381288405,411.13249990232885L595.2899453077484,411.8073210455444L596.5993710864844,412.30247775640703L595.2032451969524,413.2413347964209L596.2995933741984,413.8400493002447L594.3129941670486,413.59365353934015L594.8057425013993,414.65434068308195L591.4458714433299,414.88276052426374L593.2875207352278,416.5891913655877L593.0981054597687,416.4642696831112L593.000162241803,416.4829854965935L591.7446884102155,416.73256397239345L591.6896377406013,417.21797062550013L590.2282375590876,417.6308523201991L591.5317941338507,419.4014358170373L593.7198662724682,420.4512632222852L593.1260592111379,421.2736855713106L596.2304370555986,421.29161315740305L598.5356783600394,422.82515567269024L599.2985221347668,421.93429467439205L601.3155544543674,424.8453946361785L601.1386482191158,426.5325142091118L599.7322154543732,427.8215962234556L598.6902924096595,427.3132481141947L596.2435405726799,429.9267460444172L598.4415400502761,425.9614532438744L597.5311944847264,424.4621737342069L595.4237049196925,425.2140248028809L594.4613009329879,422.6472509123349L592.6083927754707,421.5840589380597L589.6344882064529,421.85383261519974L589.2451751445365,421.2701990129615L588.2757961752424,420.758184034971L586.531649715682,420.6497213791864L584.0274940473429,419.1180800840857L584.0967184083709,417.21986007614L583.094935260343,416.6774183901583L583.4082976320046,418.7381312271449L582.4208044951735,419.7845323683547L585.4419117851239,421.27121547481704L585.4895979150849,423.2457129468588L585.0050674693881,423.7421601323716L585.4280123009065,425.4455417351627L585.0655888286788,426.21942847770833L583.0052982276334,427.84955268268925L582.2254406299916,426.8997859839526L580.53425328124,423.8265282028075L579.7852913622464,425.5310336115457L579.7699679266409,425.2708310227772L579.763838416053,425.1667476720255L579.8327688774217,424.84432333663244L579.8978413738033,424.75511818107645L576.7834930022157,423.99067290494236L576.9813999206369,425.3029915474448L576.5294685918202,425.9121207353628L576.0542031997098,425.6990530635338L574.9809227887476,427.480067963147L572.9041899956787,427.49399995726856L571.1329500407525,427.0693493856446L573.2538115044151,425.6237349100219L571.2761618798737,424.918334666532L570.7272827030513,423.84805580314617L569.3544140133384,426.70731993248614L567.9436490931697,425.95206479719207L567.9310418664282,423.99197597349314L565.7352738358804,422.09575385443463L566.3187972002316,419.4077791008734L564.7867007265786,421.3504460175035L563.2294821480291,420.1941477979494L560.9528802512783,420.9342652685883L560.814002244103,418.8415866694463L559.6250680259365,418.98017922023337L559.4041925449719,416.8395044366198L555.7936353977071,417.0906730734372L556.1837705591805,415.36760090587063L553.8464098490243,415.3830880466003L553.6798995050801,416.12156864165706L550.794004803421,417.9906789294756L551.8413168782741,417.96312812738654L551.7833802599955,419.53525121346377L548.7590211915293,421.2204479128859L543.5699190338548,420.52336803775256L538.1659037105151,418.39617482843323L534.3886193611947,417.2638599741987L529.3906789520377,417.4373671223609L525.2084332479187,418.16881944144984L523.6971315623159,419.00702879465246L522.191510543913,416.97147597424373L523.3740608441991,415.7855047907923L525.4447257946154,412.2490525514022L525.554864413203,408.64215930233183L524.5980620784778,406.80951966744703L524.9644427713608,405.6990952200215L525.6493703967187,404.9045034776817L524.93747390049,403.1096700869681L526.6068258139817,400.4983169384377L527.6820484248918,396.89545505230353L528.3949291542592,393.87674672559774L527.626782862174,390.96206242853907L526.8656596476268,391.1566687796728L525.4769839591941,388.83586481487987L524.8792412051305,384.86669909235684L522.9594266466055,383.5626401654174L523.5457582010386,381.37671882546965L522.152166301288,378.73968416782475L519.9399510086631,376.24215325336377ZM594.0264454997125,416.8958156299643L593.9597164758658,416.85914692161134L593.6557190300767,416.5962916233183ZM593.4234914094498,416.4431498910875L593.6557190300767,416.5962916233183L593.4234914094498,416.4431498910875ZM594.0264454997125,416.8958156299643L593.4234914094498,416.4431498910875L594.0264454997125,416.8958156299643ZM555.2613176245738,419.0544450793577L558.2792392240725,420.4255677789055L556.1671625686821,421.9041446254839L553.1602698474373,420.39107193742257ZM579.7968425530211,425.72718086078476L579.8047396361063,425.8612788212804L579.7968425530211,425.72718086078476ZM590.9256581528729,421.9004962874433L591.6598066385977,423.1632137651071L589.3287899568676,423.1822012296161ZM566.1798277943446,423.50043857191474L567.4587875400316,424.3725564988904L566.9319240429727,426.22539572502274L565.065380661263,424.74465921784144ZM674.3346127907727,389.3812844436534L675.9092399769272,389.2771694898544L679.0922998813644,389.0567072803692L680.3105967501763,388.9725955039736L684.5360873875902,388.6871103339663L686.6527565677856,388.54803379734744L690.7307554467095,388.27162208928496L690.9897829457686,388.2551992650632L691.4964334119553,388.22375227097814L694.2653863170915,388.0460972927914L701.4423480989043,387.5499635450868L703.1283291179402,387.4260796563532L705.1196302127937,387.2799074895887L705.775890759934,387.2323558545221L709.0539504422568,387.00805785884734L709.5694306470319,389.8585017603872L710.3291849294613,390.7853749058286L712.2333724749424,390.4410984192874L712.3890930471796,386.61165595067484L711.4372315835841,385.01657282961276L711.3749868242872,383.1420598031393L713.2514601386813,381.47095921175196L718.2813735870136,382.81188267474556L721.158005535365,382.68348681044824L721.4912257827257,386.1226213615113L720.466992702669,385.3385465338415L718.8041709884565,385.7031904894386L721.1136139441778,386.0557677438809L721.5478332002416,388.001560268254L718.8259680720532,388.8285973109197L719.0478311194486,390.246418093575L717.678685251595,391.4289915137248L718.4170415906907,392.75090826650376L717.4264259529399,394.2896022091668L718.6315810032768,394.08796480156855L718.501818998141,395.5897593620549L720.3233839475608,396.7694478798727L720.7701721482324,399.0432948620719L721.7511721504721,400.1524863568561L720.4943064255899,402.17481076165336L720.471462382603,406.64424388862005L721.0835565211474,407.8355640181186L721.777222983387,409.5192267751213L723.414143652823,410.89495511962923L723.5289181213784,408.8244870022452L722.66776200252,408.02922703562126L720.7468667093639,406.7079564342413L720.2909915602419,403.8996370882154L721.6393621628183,403.2325068772136L720.8629017668906,401.6568114647574L722.2897330502544,400.3268214114863L720.9042241436593,398.07429152078146L721.2532218426322,396.55620038369693L719.1532374749422,395.1699431084156L720.2259649529483,393.7121207955596L719.1464110122854,393.7760897058164L719.3803855114703,391.8148343065427L718.6006685466865,391.0330593006929L719.1559534371726,388.88706506947597L721.9397778883701,389.1033940600164L722.400300917662,390.9874817426156L725.3946900494616,397.0612761097908L725.4526054289337,398.14960086948395L727.4486535714187,401.20427012560526L727.3681300099156,401.21689276713505L727.0330587347443,401.48571548545283L729.9302502662475,405.42141150126054L730.5651545740194,406.78107666892754L736.9698592436876,416.3099405999154L739.7476502803812,418.3192934084867L737.7538419693376,416.182159149055L737.8641975499082,416.16428215197277L741.0156387618977,419.4987751490173L742.2508100525413,421.7779921217066L741.4123470330231,422.7631638127617L740.8463320601339,419.7425314029441L739.7546856769108,423.617373832123L739.3182842603286,423.5858424971699L738.6447494704188,419.83843022778024L737.5351165183918,419.40447047936937L738.1843745450478,417.7720447437978L736.1971111089917,416.43347530171013L735.9707097123393,416.4709049017962L737.5608607192746,420.71137083388135L740.87540205547,426.96783882173975L744.5602802324622,432.5696845361878L744.5255834182385,433.1282757406029L747.064251191709,436.0316664374783L747.7191095331049,437.8269006381079L750.6417722919803,442.88105419323483L749.8808088185384,443.5989096486957L749.9422091775293,444.00329118246947L752.4161898160892,445.15713573466246L753.9685959307617,447.824464555894L753.5948104411136,447.8855752898415L753.5412928942145,447.8935960474612L753.3216236594243,447.9286261918855L753.1912043089536,447.9506092676454L754.3026904408687,448.2855598951912L755.8373213151121,455.25595948636465L756.1610460899311,459.6690763996859L756.4913881103296,466.1073223571352L756.6322719748455,467.491564237928L755.9791773295644,470.25516153973587L754.5464801311425,472.968847967354L754.3173751976979,475.9464860267268L755.1085621410093,477.68079772119006L753.5257957279241,480.4591464690182L753.428818201359,480.4741690773084L752.5969406459515,481.04658405267105L752.6275068821685,481.1189340879121L751.3263963606671,480.7287108837509L749.2111305456637,482.5477234189094L746.471636176286,482.7160667576035L745.8640334785218,483.50139127895073L742.8274450742235,484.4245851362878L741.0445228179049,482.7334814746168L741.3140452601187,480.42584640544266L742.6821437413354,481.858542708146L744.6263431145053,482.52448484050484L745.4877411125084,481.4628495349875L743.7219217482724,479.96594947918953L741.5878228358656,480.1566747608513L739.58510323059,477.6260562354054L737.9257608414683,474.4499877621838L739.2438214084848,473.640418615666L737.8452011917437,472.9858390988052L737.5589787109477,474.3946466441732L736.4908575245433,472.5675349288599L733.4329999068041,471.16306118207586L732.090258921347,471.56281590538106L729.4255319473324,470.02266484601L728.0087069668195,468.41160609092685L726.6287080204576,464.20745856438367L725.87480154707,461.8318802854996L722.8609800436727,461.0466582756437L721.7149586251248,458.4115999472823L721.8662728906118,456.6704606211565L720.8563158994461,454.1563346028734L722.5143581991144,452.8712655828128L720.3249941017813,453.1898076407345L719.8822054998051,454.06483722363316L717.9815234993317,452.8255496723528L718.0001999187846,452.95379338042954L719.3389102579988,453.9248601256503L720.3095087752022,456.39619062852626L717.6324482251918,455.8595164850405L716.5109252934058,454.1610297759541L714.702529707257,452.31354430905213L711.8278472168109,446.5204217340447L709.5549821402342,445.1831145276101L710.8720768725966,444.25583601361996L711.3812693349964,441.77313545049094L713.6744743478217,438.16092778382387L711.682143439051,436.5917648849414L712.2236591281061,438.31702203556097L711.1490942891443,438.15978522746343L711.0073640381431,436.3661569873673L708.8276695470261,435.13121836858136L707.8775057371851,436.81763874948217L710.0776105547452,437.85204013533183L709.8143003203779,440.8739146632298L708.0005873351295,440.25906251819185L705.9461517049065,438.46323834589214L706.4908891764852,436.000845484876L706.1890214487976,432.6007264422292L707.3647756505875,427.5292261128684L707.3150527650052,422.6252964259852L706.3485259264705,422.05700952283655L705.8531336047572,418.7960822125775L704.5573437408923,417.2988193051972L704.5379907790698,417.32986394665215L704.4373666830012,416.147955350766L702.86255845608,414.57900382459L699.1431034763216,414.6639971383903L698.0156331669459,412.0334259266682L696.9556632040163,412.09171150343275L695.6710042117313,410.31150962826837L692.695848385097,408.6724558847858L692.5898302449898,406.24707922406355L690.1642357789722,405.6213628508589L688.1436261460674,402.86983956359063L685.561166412944,401.23735697816915L681.9162447277064,399.651085017729L680.5633587986415,399.7554984085117L676.0800224823491,400.97402788515285L676.339039319848,402.69867103916215L674.864145171173,402.8238762679657L676.5622710955827,403.9418262385444L673.657050872303,404.14509768654875L668.1087560609147,408.11762933234434L665.673118281541,407.5657509397613L665.6709199467298,407.59732891269005L666.6906166307575,408.6642137166973L663.1273631242831,409.4643818832534L661.6230943215238,409.73298389368745L661.5719398792774,407.67422676028025L659.8914109104265,405.4670914481284L654.6978940831243,402.3815302162973L655.7301873112033,402.18081349533895L657.7475933993142,403.6691378694709L659.6341538565445,403.536663421473L659.62050622208,403.41490384443637L658.1452053127138,403.62602443906076L657.311261362355,402.04506130347477L656.1793901911666,402.29318456369504L653.8236483830158,401.24784839041047L653.907138729007,402.39370652867035L649.449082978575,400.149958524514L642.8202429065719,398.7701688608514L642.7898966501037,398.41362775980656L647.482168836993,398.0659921990491L644.8537299551492,396.5398256928188L642.7188841240983,397.37017932851427L641.6590425073136,396.40031610125516L639.5108524251,398.6788722831759L636.3381674902993,398.90244347642306L630.39202661943,400.51482393654305L634.0319496793247,398.24318681129637L632.6433128557887,397.4040235688151L631.9623450959707,398.5315632557166L630.298089745017,396.21393873381805L630.0154231119137,396.90467099964553L630.3066374830275,398.9754196836635L628.9531587395102,400.7570896166035L625.889318627532,401.69311652019894L626.3486292939481,399.91006341124125L627.63937957334,399.26084798047157L626.0670688099408,398.39747135327536L626.1579835546529,394.8034897628809L624.086471213076,393.7197284734252L622.2066144782835,391.5702090510663L622.560629806433,389.06541783048215L629.4776483430305,388.4071410016089L635.4801270422795,387.8738393768699L637.0353351001373,387.76829384967493L641.7954663618123,387.2989209001156L644.9926525524314,386.97410757083287L647.4098433279246,386.73586194890527L655.9224617570922,385.74692474443407L656.0758464260592,385.7268620796908L663.7745629912888,384.7851474232368L666.5919347234319,389.9054083318732L666.6090616810319,389.9033923919127ZM625.036499889628,402.3386751162062L625.0290675155645,402.25560912678L625.036499889628,402.3386751162062ZM636.3559051071127,399.26423233061155L634.4708235781336,399.7398833936245L634.4645922448029,399.67485766246295L636.351644876732,399.16064287151823ZM722.428712820669,390.98207500246554L722.0071136157056,388.32930091388937L723.1979436733702,390.84979149781213L725.3067799743158,396.2711804004631ZM729.9590881477524,405.4168555245237L727.4772563712911,401.19876961932914L727.5520273820985,401.1870433788424L730.0395206091334,405.4021145596612ZM664.8102019058567,409.374749392381L665.1941530641134,410.36792833356697L663.084775556727,409.7591104620949ZM705.1699001792939,432.7601661753566L705.2225995360102,432.7518161460294L705.1699001792939,432.7601661753566ZM748.1134010245892,437.75933359127333L748.295652253094,437.7269791586889L748.1134010245892,437.75933359127333ZM710.5763896372621,446.6858927259702L710.6416868801723,446.67766090182556L710.5763896372621,446.6858927259702ZM751.0197787933046,442.8167057914773L751.1853889714673,442.7899389425251L751.0197787933046,442.8167057914773ZM716.1834373753176,454.2073347672531L716.2249576065482,454.200333118259L716.1834373753176,454.2073347672531ZM754.034465265589,447.81737352255055L754.0581759978832,447.81336466755204L754.034465265589,447.81737352255055ZM718.2796940675147,456.8377684184685L718.3451297356617,456.82724255647224L718.2796940675147,456.8377684184685ZM720.4193752892485,458.0997938049755L722.6365743216911,461.67760711020236L722.0546340762273,461.9164289626918ZM734.9798906968192,472.8046790793209L735.0580253939916,472.79160263206734L734.9798906968192,472.8046790793209ZM755.9356775550734,477.94915599478526L754.2278387474128,482.67256813801197L752.3575429783009,485.00490966127074L754.9228788637593,480.82268586766554ZM313.30573978076234,453.31886282913206L315.02346687229493,453.5906604433786L318.57889597266455,453.9428266261519L315.71040409680666,455.83789580302863L312.4056511677678,454.8315584747387L308.0692173839066,454.81742348936297L309.0847687308886,452.54543799563737ZM333.7483163200626,470.2601204065164L338.41176799169347,472.99675711118425L340.70171509751526,473.37316657896605L343.80207796920524,474.8342455026993L347.3283805803386,478.00461750687384L347.1857885904674,480.0903290228087L348.72370213059384,480.06558236598534L349.09184881450216,481.8007795631292L352.220293557271,484.05966358210884L349.2493811787,487.30503678060427L346.5334764270569,488.70084409856696L343.67474560026153,488.9060018239489L339.8462414862629,491.4285337057377L337.30308768597337,495.3058985747404L333.31191043297963,493.1980464239982L332.64538623332334,491.6970174229411L333.19808775469346,487.4725725156454L331.32542350293886,482.0389399330663L330.0717131464338,480.3276435600574L332.23969643945367,478.05557852612424L334.23616305518567,474.7135402197722L333.03998302272555,472.9453322584707L332.89861630365766,470.9350479394313ZM271.69820306425635,433.7700116585074L273.13795059995715,434.5901369022052L272.7871793838982,438.70039760778474L270.78908844019213,440.3972912378326L267.46034885368863,439.511852794626L265.3405261222059,438.30610593823394L264.9191638882266,436.68591665625013L265.9888315593236,435.1398660650789L268.44627959519795,433.81585427545014ZM259.67594352555426,437.9073199560896L259.81126710392465,439.69200970889074L258.3413735402588,440.3534472506747L257.5309447442187,441.93807618788514L257.0785242316248,439.989538995382ZM313.81568324505054,458.0417717234015L315.365194199176,458.33356900279784L316.9035630573025,460.28740634501827L316.3810869233355,461.1456225713116L314.17522214452526,461.6782065052667L312.54335024180745,458.3607684864962ZM321.0815373072781,464.077554427532L321.3675163467895,465.3206079682733L319.153964267719,465.92281866316733L319.2032191560573,464.958568929236ZM320.5015282070282,456.12008762435863L322.65337307316054,458.5879073428328L325.40369826573345,457.6830232242407L327.0610899133997,458.0303097832907L329.09577631506147,459.93349340298937L331.0577255796701,460.5257213648565L331.2907431153307,462.0790544518829L330.27329093355195,463.1006839990788L325.78740395184474,464.4304277945861L323.32665348497756,464.0243133627381L322.97301545984885,460.812376175387L320.08569380480486,460.2020869242613L319.0065415370312,458.88105588332496L319.375224779605,456.5932398880839ZM296.3620084552338,443.4994323040764L298.9122595018343,446.9234309753191L298.7951792737337,448.13676047506544L300.14011059122527,448.12007038483813L302.11201256513004,451.1452961792747L299.5752535104665,451.92016892959424L297.8693794201146,450.5019290353676L294.2257529766938,451.1900037226579L291.1451205332214,445.97746440490573L293.88455721726183,445.821099014533ZM50.077243283279785,487.41330169110483L51.01540891256562,488.2623256843817L51.01299508433435,488.6056218632315L51.61725096839113,489.8659740052779L50.9444059092549,489.1186862841835L50.70678785973769,488.3668620210369L49.766346018567276,487.2985048498897ZM59.93622860192778,490.1287233270506L59.86280086428599,490.7162399750909L59.55988998612558,490.36523229223667ZM69.60737613753078,493.5193694549129L69.3126649271767,494.25811202816357L68.88239096590078,494.1346266856143L69.03314023243007,493.40985627994354ZM70.02005479469237,493.52941246013205L70.52861702698934,493.974686553598L70.17535987900987,494.2119534613662L69.74561804662156,493.9199699329689ZM70.81991232447584,493.60686764260674L70.78790720481126,494.04944864223756L70.29233169070324,493.6015659588245ZM62.838032589468014,490.67106556779993L63.316039747754616,490.862426965999L63.32695468235917,491.29138941157044L64.27876996786976,491.9199348594619L63.562559069621,491.8661117044819L63.208855812719634,492.45963106987574L62.52830776538738,492.5103470946651L62.27927756534859,491.93315958525665L63.01707639956561,491.80764433346064L62.22355008740861,490.86590149396113ZM65.72863182951548,493.19955012118294L65.40568831922302,493.30398216220357L65.07752804518456,492.79764912055714L63.85991856480912,492.4884388471918L65.54293128191547,492.63949446930525L65.97917628786203,492.5247552893248L66.2330399342445,491.89599693559046L66.75848892992359,492.2729099808817L66.30302190508239,492.55111188738243L66.12178441037524,493.14446499966556ZM50.15527417533768,484.9999264595857L50.458851469076805,485.4322902720505L50.01423220085384,485.5626583283101ZM68.7665289852412,492.2635585548322L68.22942137903746,493.24446735620245L68.99399605575196,493.49495613239645L68.6090253132541,494.09745883689624L67.67415748440366,494.0231204405703L67.20152668794525,494.26838401916973L67.19655425060328,493.63062424817366L66.52804657044196,494.29776115227025L66.4638331755358,493.8363635307661L67.13035847440918,493.4689132494332L67.07592500459245,493.0115168193057L67.82244498156187,493.4101554738113L67.7217496631482,492.41813175356214ZM54.595973232896114,486.63306643605836L54.911856081530004,487.13432331982136L54.221909010682964,487.5521131517773L53.802411169098164,487.2129453421106L53.872514576798636,486.6351174637385ZM70.7004448644991,492.18697421735766L71.0985378004646,492.6360053936941L70.76189511651737,492.94542135358427L70.26073019079156,492.81379468394886ZM47.34623175721727,482.7090295967092L47.354310999391814,483.159631761955L46.727704182224755,483.48541616280477L46.536634983312766,483.91435355279975L45.78177369914475,483.602878871311L45.41327142662341,484.0165557709276L45.18892786060131,483.42576187046944L46.05374889500065,483.22384514419923L46.46347783723404,483.3649739053201ZM80.80589445125239,495.1934752353757L80.61890676268723,495.3716358642177L81.32361445945907,495.8027966202402L82.06003468994068,495.8617672643097L82.86435608329383,496.2001729259443L80.8728792456403,495.9179269901844L80.00096355704714,495.4823785505999L79.3894397793795,495.51890643382495L78.79747942808997,494.9272148881554L79.35214599204451,494.82393018070826L79.61349907926949,495.1699388965217ZM85.43825904659525,494.96060481932903L85.8256525767987,495.45580190462465L85.30062717258289,495.664797411704L84.50582907770583,495.6013228878578L84.79782961685586,495.0341502904026ZM78.91266713863361,492.7997553571312L79.32911789679315,493.6147645627441L78.86492763887901,494.0975247715028L78.2838741980984,494.122007518475L78.5802536828662,494.59783793171795L77.325797334005,494.5101935218274L75.8365941071338,494.6265990888495L75.33558581434093,494.21999708833005L73.96875307740547,494.0216272398529L75.5943352837476,493.8925543747938L76.52390641499969,494.1418484549434L77.71423550700825,494.0118174925918L78.28638437547434,493.6036133078352L77.89323264077694,493.1877785334656L78.40446815783733,492.7490162160177ZM34.521218180491644,473.6529190607688L33.97439372679065,474.5101531456716L33.70693889819104,474.0778326987359L32.814406626136474,473.5400548705555L33.98103280515035,473.44777131814175ZM92.77085873338031,494.84515808858345L93.11743095256583,495.0972751375913L92.84331898746305,495.512920078562L92.0297556641785,495.7174468469716L92.07272956810145,495.0825900850339ZM96.5397958990759,494.48981843670623L96.77193458348627,495.02457808002754L96.4728323311626,495.2451197484133L95.6110376568374,494.4968706566647ZM32.8274765735723,469.1350090052701L33.753872800951854,469.69646992315006L33.90173932098813,470.72622986600476L34.44296530329865,471.10937097802594L33.367582882606314,470.9836192078253L33.099565850360904,470.5307033381095L32.2896875148959,470.73378606510875L31.848242609597904,470.1452848148387L32.33412663298495,469.74572662869053L31.6347812130289,469.49653274012474L31.922752683413194,469.1995563219499L31.23852088438214,468.8507604481261L32.184966701622244,468.7545702521674ZM99.06229732765958,495.4747828778275L100.67640506605862,494.1835534158288L100.65930058036909,493.65131108748216L101.55278334836031,493.0681349680374L102.58216801585974,493.2720116982857L102.27128186946204,492.9059719259086L102.5197366022023,492.31374212951255L103.35556712147114,491.77415632014174L104.24182108970268,491.73315120393613L105.00217857762075,492.24201067668855L104.61547799119674,493.00958810766394L102.77980549912397,493.57334353868936L101.80556719261544,494.6017362654735ZM111.84413930071581,491.3977803060203L111.15268887569113,492.1489931107582L110.97605749841425,491.6114845288786ZM109.92862322057243,489.90930680584114L110.00044511486028,491.0961559103262L110.85269773959152,490.28278523628916L111.3702869254175,490.4235533424894L111.34857485327025,491.06781414661157L110.89572099634992,491.1224363903478L110.01162462709982,491.91687598226974L110.88984642830559,491.6191985059579L111.03416710349455,492.2152845793879L110.05556740469842,492.34015610061266L109.74068631545276,492.8289942244599L109.39871611983807,492.5527539698532L109.33732557561004,493.21027961305646L108.80452098698554,493.01241461046976L106.02858263296427,493.7352214788031L105.28790554959357,494.07455631306453L104.48117509242272,493.46123338276277L106.10315682147922,492.91954471730037L107.69014190686389,492.8100683206121L107.50301193506044,492.1441107777329L108.16613174810759,492.15599892232854L108.06176781444046,491.60188806971524L109.37196699242409,491.6935081057214L108.2165767230335,491.27965049650186L107.89071153932579,490.48798337489796L108.4853907562466,489.99757119987385ZM102.32535861310018,470.85242250063186L103.24881248746225,471.16867384674975L102.79024004068825,471.4904677999341ZM101.98982895644701,466.5735898858878L101.27780575486209,467.1184496349991L100.89527156842685,466.6097439433692ZM116.34289609684018,490.24065850831596L116.44842496237284,490.6542820213501L115.70050078101808,490.5393190858419L115.56232602439482,490.2505187967428ZM112.92241012437611,489.09145044838573L113.80720009151193,489.8421244318142L112.91310696216959,490.3163924672399L112.27243417067847,490.146281798831L112.28242608826801,489.29924421082376ZM114.7046259362581,488.918997784248L114.38790995148878,489.39159560302613L114.86581682977715,489.497075613696L114.23199931010396,490.04889503758324L113.91108026206665,489.2176740208009L114.22843453017117,488.8414502205911ZM125.01647227039066,489.21719641122723L125.87839227855537,489.8564827565243L125.00280075334263,489.7547485267529ZM127.28570644745847,486.2492697363753L127.42670760858303,486.93559142790826L127.07359641196342,487.2550308279365L126.74854663727746,486.59850380121696ZM121.88686273548896,485.0605544838556L122.73051886261467,485.17907144677974L123.00495814992254,485.7747541969886L123.25345244873961,487.2598962006406L123.77223638611417,487.1777891030666L123.99090250133955,487.7318027646124L123.3365071834294,487.62214646638387L123.2171228749108,487.2749648455269L122.7910333640215,487.82481477138805L122.14290852803344,488.0076172607006L121.3466582953736,487.73413786890603L120.21671129390437,487.6909399863292L119.2682753622754,488.106692931744L119.1168060884348,488.5264947091434L117.95914305636349,488.8304369168873L117.21946259234531,488.53484983894987L116.96968120988552,487.7299967831922L117.14250248947806,487.27922704815774L117.98363903401206,487.0450835724593L118.74925695290483,485.75231874094266L119.2823267483422,485.4590766259217L119.95773188370165,485.7477611924543L121.39586942228816,485.0817713900318ZM129.23384040850215,485.2146770174886L129.85007009488237,485.7512102389809L129.43593035461964,486.0463351168633L128.90730494931617,485.27206808319977ZM137.8178899353933,485.7568317546767L137.81262595507835,486.35439339152714L137.19137731133367,486.86982578843003ZM136.5677398578452,485.437492064889L136.39819795410054,486.50305164455494L135.4094701954487,487.13772354090145L135.53374540971032,485.9961265208186L136.0342797317965,486.30906377239955L136.226492071995,485.45719597166465ZM134.79302900610384,484.59513211437087L134.7455037297839,485.3714140239635L134.0974155600876,484.8179598421282ZM133.46792452181415,484.20080124044995L133.5251174622249,484.86748697322923L133.89269447947305,484.82699079639536L134.26671617450813,485.6800960626513L133.98252123015752,486.03825252269894L132.8034824833649,485.42071434055583L132.94592447484908,484.5633109522288ZM135.1797287997536,483.9879469090819L135.44043378543046,484.4135898802923L134.8106212512356,484.230175093687ZM140.8886833820231,475.2085766143738L140.8557640274985,475.65453363072294L141.8166016124364,476.00985892405953L141.6602953216219,474.5817345561324L141.96620443877865,474.0268079261656L143.14006853011094,472.6254102050981L143.98214532727917,472.13977910404026L144.54738789435737,471.474616897013L145.31614452456506,470.93255079715607L145.8435966136026,471.61830545828644L145.74840660804273,470.58619120545757L145.4328855297999,470.6414796062975L145.43199801348425,469.91539371248535L145.9220059089846,467.5714247141552L146.19314169545555,467.0601339912341L146.61390259119136,467.02146682184764L146.15553544239316,465.96402825742376L146.4649477315301,464.9878499044735L147.2305459705216,464.1795604138872L147.9710302659591,463.4558924248052L148.26893861133874,462.39768916071847L148.14182027099108,461.9507145496219L147.6832814073845,462.55715275509L146.3252829169725,463.1827283766635L144.27909982439633,463.9805309636392L143.70195099779482,463.6987596478636L143.61174809111264,463.19719594074024L142.9262220544351,462.65818207613853L143.25478088335717,461.3920034420295L142.8013854243852,461.9230886437788L142.25397165834795,462.0796336274836L142.09826402138762,463.0588333995952L141.18225775013576,462.29206131421097L141.75966159690557,462.83304831637224L142.132925148937,464.1671986067539L142.32804642391014,464.70874463420574L141.61194196402926,465.27743258607217L141.1029639841429,464.9238020971135L140.12603261374647,462.713216404174L139.31387478934596,462.1195306043101L139.4517409050654,461.51034410034663L139.07491310981445,461.62552686656323L138.7827230644539,462.3197798048731L138.3914885087938,462.4670004200526L138.11261374814873,461.75849219560916L137.32523482034796,461.60141272090857L137.30397362832264,460.7507416516746L136.98226365075027,460.50160459939553L135.30887945699305,461.5733804934847L134.6510313358104,461.6900149229822L134.51605415607844,461.79183898887993L133.5606012735147,462.2594050181936L133.33677060703536,462.7548451879396L131.97644966103974,463.2744263282082L131.9135402127161,462.8083824290161L130.6819537256993,462.50126367807536L131.77070293959676,462.20576119459713L132.58274268904643,461.71573082915734L132.21879777417269,461.6166001596792L132.2225279202783,460.4885824123952L133.1261450170238,459.7428374226771L132.2683729478233,459.5871527601123L131.98268931994352,459.8750627936869L131.65022516721467,458.8047869895038L132.003625589006,457.8199471850343L132.90600705927076,457.1425938727554L132.4910024993268,456.2123165962789L132.29826625293114,455.09535590651655L131.95855596368622,454.531895447878L131.63786391810308,453.16917562144187L131.8445177454004,452.7907031596217L131.09847597758898,451.59019915237417L131.60642943901175,451.20743692825147L132.09805007787202,449.9224619601135L131.97513836940527,449.70255723859077L131.33014154780983,451.1088649843399L130.7898850959051,451.3951386788353L131.032227241908,452.3268048460923L130.81530502445065,453.3780925626362L130.2980704825691,453.6963503611299L128.29079437042114,454.29546633564814L126.47906046973277,454.3380562634981L125.34689569537977,453.88622331342077L125.15885375000994,453.1133774050933L125.49178606576403,453.0117379685611L124.72083952412657,452.1941685114562L124.09418122589432,450.9924342869233L124.05975190583052,450.56665713250504L124.5863844204024,450.08133342296605L124.53420639097762,449.61218112251765L125.00681830106433,449.5522500283156L124.88067309626251,449.01193243349917L125.29526879007483,449.05971720989635L125.6960583218376,448.56132082759103L126.17735017885268,448.5141275370304L126.53063744495327,447.9431422680513L127.31480992871452,448.1030362885961L127.13089318027997,449.23333092894694L127.62470109763888,449.22054659193844L128.43966506426955,448.4487236306104L128.08306381954836,447.8412979850453L126.94331741176829,447.37259016485825L127.66014217726008,447.4269506945213L128.15896380971242,447.14293822973883L127.4994066454245,446.9514882464438L126.88847136332596,447.3393715490481L126.93106650515003,446.10188449273903L126.32150283162201,446.6621691422062L126.47050493858458,447.1514307270823L125.04197741397374,447.13081139416533L124.88551201103371,446.5631492197391L124.24666775748139,446.68311609204954L124.10470129686287,446.3286558818813L123.24488850107454,446.34821275252415L123.12024611778959,445.92956829036916L123.9095841083238,445.76582464193064L122.84244270682015,444.4406448317027L122.69852790727514,445.19397156900675L122.13060278459793,445.0298875955126L122.02680173350126,444.09299855239044L122.20618247725766,443.8208805275821L121.56372980775278,443.5024321519398L121.469477568497,442.72488980783845L122.00200836167116,442.3956676968917L121.56015382618841,441.8174123541974L120.88747490208691,442.1192429583529L120.95154814332788,441.1836929057168L122.17552150644147,441.1216325047967L121.63806370125927,440.81023049491876L121.30963221757649,440.06098865409723L122.84712989149537,440.13020692381167L122.5568230781322,438.99658450357884L122.98392818072733,438.1602492316878L124.49105357119404,436.5324297879789L125.2752777270623,435.91494458755704L125.87495118871537,436.0568008969889L127.09010036042159,434.8354282191434L127.91159530212009,435.2839965185283L128.7239523156607,436.8436391826912L128.74119725964053,435.2149284423857L128.35473761090873,434.51758093597886L128.429149237037,434.1026267723157L129.3572863485863,434.0148374118202L129.52844937935492,433.42630921896296L130.379701948776,432.91570237967L130.85973319302425,433.4820117439361L131.69946538970447,433.43356828187126L132.46576073986643,432.58886780609873L133.22120776120803,432.2439621043247L134.038748803594,431.14815543113974L134.2405029977486,430.6001346121027L135.06287596563718,431.07105462789065L134.61395898409674,431.3557911499743L136.44018843706743,431.4453756644819L137.59865103970964,431.2214788481309L138.84301736854738,429.594834492288L138.52894839816474,427.5127159503712L138.5571117248191,426.5230339468541L137.8720243234213,425.473634224587L137.14510490471886,425.3195882711424L137.36582647819384,424.6107466870073L138.4497209307179,424.8172487070081L139.29897941015145,424.1365094126974L139.42322218599037,423.4468612869613L139.17497996179887,422.72769899678144L138.54389361249582,422.06705886213075L138.9340265679463,421.9813294858026L138.49789635769926,421.9561221494776L137.81669334648598,422.9075588746235L136.92825386924068,422.77729450005046L136.27684799185818,423.1994318959143L135.55347080221674,423.2522585671139L135.30787004194693,423.63347072557985L134.39855529944052,424.0906809657301L134.02459985439197,424.97617882404495L133.52232203520043,425.3328483283688L133.50938133974788,424.20645951014075L132.69585926964214,423.0892627791537L132.18232467611375,423.4215405640958L132.78606269684002,424.04351848750804L132.70892034507256,424.6689260609141L131.48402757901133,423.4763327474002L129.47269343055734,423.19336235250626L127.3348801624751,423.6473826155396L126.5831183885036,423.19831275830404L124.20672062748687,422.13523246995584L123.70956887885112,421.0442738935188L124.079717792845,420.5831801007432L124.06914868567651,420.0647390552829L123.45521675391201,419.31841149979044L123.05609808801624,418.22328738102425L123.664846218029,418.531175257946L124.30380107781036,418.2050372294L124.71289768620888,417.6294907386856L125.50830648994253,418.05460588249093L125.91018650200891,419.16322301536957L126.37609607743906,419.3616140731244L127.08149985401327,419.0060056641472L126.75956573268496,418.65438398740514L125.96858399069507,418.44401639799355L125.76318832181465,418.6604703534323L125.27974177854506,417.6524682325723L123.51547635533748,416.7406502570071L122.07895362131646,416.2802064392231L120.92484043120936,415.03014774351493L120.51869052594651,414.7783145887146L121.44095180086649,414.0988618429313L121.98932931209572,414.20564883135546L122.10277767056324,413.6588378320017L123.02151819829116,413.2243457349976L123.26465229592421,413.5984197302259L124.3673679045519,412.9301553425636L124.88632956982637,412.3574475572529L125.97115558538405,411.96747411105923L126.50711303763498,412.4326411612573L127.6518853263515,412.6039778006307L127.99824942581517,412.38678341051417L127.12073784179539,411.67758153440803L127.70408952763142,411.12592380038205L128.44524707597117,410.8323059488786L129.4950382474682,410.83203605827026L129.5560728689569,411.08323679761645L130.5073415134435,410.23488610036634L131.31164141881612,410.1273972967189L132.78265562780734,410.28034077718576L132.83766731239336,411.19237118233235L132.48583489449487,411.5738189828124L132.48611958194869,412.3451797278787L132.1854321781608,412.6637602773949L132.29589142938292,413.3046869826193L132.79089602012937,413.8013265692561L133.17285865369584,413.66594792620344L134.224731458427,413.9712414869054L135.16917376053036,413.8517698396718L135.41892183061907,414.3005076224319L136.04357738242163,414.43717254036187L137.00720150938423,414.27527944889596L137.44235848290992,415.035083126037L137.70576365610705,414.34474083058024L138.61144956231297,413.210734038029L139.3242775079189,413.6277394789315L139.9190825402571,413.50587706493644L139.5223208503199,412.7941047356952L138.16281888052896,412.28178888933184L137.4594117057489,412.64661623599784L137.7752708826103,411.5443882743531L137.1424526789472,410.2464178457358L136.40355671047465,409.8758755510157L136.12523606357803,408.98942637749917L136.54915738877128,408.487448377715L136.95784178053893,408.52925388285837L137.63000028029666,409.7018935897511L137.38394153734492,410.5523924325407L137.71777799462245,411.26652692971606L138.5087437055678,412.04373517766106L139.61748465761394,411.52263396229733L140.50806657562583,412.7237524224933L141.93538401731288,412.7482096116041L142.11797526448584,412.142790906896L141.87942580001115,411.36003214299194L141.00638063887354,411.3310956833946L140.6217709874396,410.8562825023418L139.79165237713502,410.86055406490686L139.4860841737813,411.4826372046128L138.80807379778068,411.50687436002846L137.928216996571,410.1660500236042L138.26872640022714,409.1307409723611L139.12890341274203,408.6963497987145L138.30611201341605,407.9974048941743L137.2377452439857,408.24593602575976L136.29325886094082,408.17981819631757L135.9942373777578,407.70035927462186L135.4868644308011,407.8309157978732L133.53997936859898,406.9122290217296L133.46333679375363,404.9617545915609L133.0452545133479,403.6360427116371L132.18640985135934,402.7673459491465L130.44666729426018,400.4524013950509L129.10061381129637,399.4677106406478L128.91119885737396,398.88596084541996L127.9467271983406,397.76929126198667L128.4523055031407,397.5803385936152L128.99402036008422,396.585004462067L129.38621817793106,394.66092574771136L131.4035291800457,395.1695019751835L133.92606252075413,395.12482928281946L134.74582451359208,394.8753071303213L135.91970660153507,394.027042392117L137.11845993887425,392.6738651575258L137.83858826317152,390.70989934690647L137.59785966980158,390.4507167407382L138.76093206897673,389.394622177827L139.16130503118507,388.6157226125328L139.9331515295566,387.9950825123056L140.56855488345894,387.17663873771767L140.92196104529347,387.76940944307484L140.13575234476232,388.0081446642468L140.62115761250521,388.11419846130246L141.20102267866457,387.58071892934987L141.86818069781745,387.6470932054437L143.2558960135906,386.9590581471465L144.5425420346378,385.87658439137266L145.25835201391433,385.76030211581485L144.90365672912787,387.01076455808584L145.18725466679237,387.94258307785475L145.24337236261476,386.75039801738006L145.57382360279624,386.4437117982933L145.25491749958357,385.5748692254888L144.8281227019496,385.5209804756387L145.92261133185696,384.4883753547011L147.03156584242285,384.16206368359L146.5930470980688,384.47399889327124L146.89622680524363,384.7918150372074L149.52365165380866,384.491020862703L150.67796883541513,383.8275600837567L151.26110194170073,383.192693032493L152.3564610945807,381.6668231806454L152.68253632721448,381.40318502466266L153.148270986919,381.8978872426742L153.8486125836979,382.08329624234074L153.92570904613632,382.5461412912903L154.93046924996534,382.60629558608827L155.0368236528275,383.14929743010805L154.5613247546957,383.76301314724907L153.56055073646377,384.1690783988418L154.03249768795115,384.31775982203743L153.7034590088018,384.76129672622915L154.7288041104814,384.8083757405308L155.09249409965827,384.6086505696199L155.02689811441056,384.0325401745404L155.58640725008627,383.57456418985123L155.81901885396766,382.99725478907106L156.0047118432571,383.4476927524724L156.55933977447356,383.13750219452146L157.084308858107,383.7450724809262L156.8649220908749,384.4207438944367L157.94285932959514,385.1798797516777L158.48987198165742,384.4601758310058L159.44092704324066,384.4260533656962L160.21217011528037,384.1804038111201L160.9794485038581,384.45375020177744L161.21456830021745,385.3344978269127L161.43188741171684,384.40800210434566L162.21910363723813,384.7569941758798L161.79725854059984,385.63334488873886L161.81376046961677,386.1606773071375L162.62164801741972,386.3192527525972L161.44583918536378,386.5836697792451L163.4169051970092,386.47012870889415L163.0429213315642,387.26822816763155L164.29150485919791,387.3534176942626L164.56913544901127,387.7146713666471L164.7370972596184,387.1534716163367L165.75557920558256,387.0123569967881L165.6435779361099,387.8784260462129L166.34098393431475,387.2990438849114L167.0054693990095,387.0807935728545L167.50664041038237,386.5451530544032L169.0801191001429,386.5856749322981L169.83322413278506,387.1166376252453L170.3812773084801,387.0556932590082L170.64918403082237,387.55769545095154L171.50204301323404,387.3235170379003L172.27293735170895,387.9906241907853L173.99368325586116,388.3668097532987L175.1219973662155,387.97152431894665L176.36638618897922,388.18605950070906L176.6883190184739,387.9256902307671L178.15011800666716,388.8654186915813L179.60293287202074,388.8004365295478L179.849301206547,388.44780530505153L182.48445191105236,387.3916802602595L183.68123135151592,387.6614411260189L184.69737010983812,388.2437919383519L185.1007920585682,388.69965383075765L186.19024204568692,388.8705993921256L187.29920714136404,389.70149928188505L187.60728604044823,389.3413474575217L188.1277339419215,389.4610506106313L189.56677844653774,396.7277706796224L192.9215525625258,413.6534047754671L197.9398860793224,438.965412211367L199.86550371325978,448.6839859383369L199.97434135240877,449.23296841917795L201.61174544458237,449.48177026200005L201.69109488026044,448.87379896889604L203.3711312754827,449.36575497060534L204.0671037161234,448.1862419677577L205.98671508143167,447.6405267440391L205.97986582264957,449.4200477228485L206.575793215531,449.9132405570287L207.80710528843161,450.2241540663427L208.27223779963577,451.04304942706705L212.35921773521488,453.5901874918527L213.12257660392146,455.1456943407341L213.1634151668687,455.6700097096029L215.0091445579456,453.4740212209638L215.78882940496695,453.2261698171587L215.9337472869404,452.54930319181324L215.62044181712787,451.2337556566939L216.17161388226197,451.0928583250242L216.21670007573698,450.43498447408706L215.78392908401977,450.2788148797481L216.9488918600898,449.5332627003495L217.55988862373823,448.90801684434683L218.2009337324743,448.25346135409643L219.16119347203755,448.6723485832637L220.0524906872174,449.3174025305458L220.07480147674784,450.24139636471637L220.44853935865396,450.687075861098L220.79513712671937,451.0324808035388L221.68156530746853,450.98760605840965L221.85585160868033,451.3238533418845L222.59826709192447,451.5161829003116L223.391590607838,452.41080820528856L223.83748203656876,452.9940201399363L225.43969569858731,453.4012973075443L226.09920338513427,453.9993924902607L227.5309549102363,454.79441207430494L227.34357523872603,455.1491875529437L228.75893084417703,456.31087602378955L229.40234314074786,457.1537357621866L230.39141900269925,457.9379590694648L232.14279118411685,459.7265984436726L233.06618045760655,460.4370463257918L233.7603388168913,461.1535897623602L233.6057158803662,462.034566197565L234.791439216615,461.95205979776347L234.88973628788278,463.1056005968871L235.88146393883278,463.23290103641324L236.45108504904485,464.46889608349403L237.28573056763696,464.0871963668814L239.48348304620646,464.7566966861499L240.5357296808951,464.6310919788875L241.30105652144465,465.04788387069607L241.88360453513127,464.9991608694724L242.25738304373948,465.56936702698874L242.9736396868313,465.6178834871679L243.3974357289079,465.2746180512593L244.00504289369525,465.84803178413097L244.23655902925358,466.46435710434514L244.0522259702047,467.52075439987306L244.5624785384344,468.6237245189556L245.78565871638642,470.25364024004966L245.5436799773143,470.9684321478394L245.5455976088769,471.8739315343021L245.32009952102158,472.9707474120258L244.54952360184322,474.26533792774177L244.04740658227746,473.72735321315196L243.9303851224292,474.53926081410714L243.51020496856484,474.4445364427166L242.7474959626893,473.1554008391247L243.16451731184188,472.37431985719724L242.5439732950357,472.7771554137204L242.11425473473554,472.20481233388386L242.58831197165637,471.2235802454684L241.59980248239242,468.79493621497306L239.8950386834966,467.5079323601035L239.3500117255336,467.8771477202988L239.15910567228536,467.6206840298116L238.2680284254834,468.8385675975141L237.7884888747938,469.0487803592997L238.40640765237723,469.44869944994747L238.3333474532934,471.43831879480035L237.40476588919933,471.13849298908264L236.93734878413792,470.24158730623907L237.35621040049557,469.587896932233L237.1160471511394,468.6692302522047L237.3620332245539,468.5697736198283L236.90072126762692,467.2666742990086L237.53592140692177,466.81424780080664L236.90309690117277,466.8377853091369L236.42511422136738,466.18870269642497L235.72224597797316,466.1621335441699L235.4900234000373,465.76568723092714L234.7992436435428,465.48375044730784L234.81564068531083,464.507444087399L234.21079511189686,464.7348326368687L233.91851072168274,464.3249956771676L232.7790679397233,464.0654941755067L231.89409744726726,463.2665292118384L232.3923515309179,463.3276899647185L232.01849509580867,462.53655149304484L231.96698931968308,463.03108607336213L230.47097757088602,462.9494085568075L229.5701514273019,462.7639593168833L229.36028421998216,462.155229639322L230.57778891229702,461.5258205919672L229.56754209306843,461.6201616730818L228.92077895508945,460.81681313775067L228.91082227995025,460.24394414383977L228.1496021322684,460.0875311104456L228.24890332205348,459.38208097577115L229.9210278129682,459.86967985276254L228.78489765083202,459.23337589480167L228.1962115133863,459.1542600429635L227.9894586569182,458.40050131852763L228.0613627603409,458.1836414065412L228.09803755249382,458.0736553241834L227.88032077377238,458.7354548456025L227.6419391286384,459.08919461250025L226.93564033367159,458.28093711023723L225.93776925374897,457.5798875986091L225.54519504951887,456.4571045592298L225.82663264885417,456.1076010414775L225.5260247648948,455.6363165270382L225.2366666003805,457.06925918387986L223.95535076750366,456.41972285594653L223.22782856652213,456.51316487676667L222.6808525392945,455.6370666572052L221.9865407343548,454.91023561684233L221.40519294501027,452.9696450703172L221.3739456109646,452.97445259184383L221.60489732083136,453.36070758672753L221.59396549930358,454.53590761898965L221.0165051049114,453.9821619352197L220.6685680129636,453.16832356392223L219.4275961621789,451.02198902187763L219.30287414330041,450.97651288569796L219.36301144962167,451.8080004297621L218.92125054610136,451.8243788102573L219.77133971410154,452.556230699816L219.9542308007217,453.4136020755593L221.43549508380906,455.3832662406325L221.45391104176946,455.75108096729633L222.20136849361165,456.98695775079506L222.29251986047484,457.7309888370405L221.69281414288048,457.92612456209457L221.14977004216806,457.4681161388987L220.49793278448416,456.45318469533726L220.77687418088522,457.2142059799449L220.2057707495265,457.0254494910095L219.31858588642925,457.59474596393886L219.33194827234863,456.83826510621464L218.56564573666046,455.57536542350954L217.9948510071431,455.00540985302706L218.9214169021643,454.28086783985884L217.9509133340739,454.3526165749856L217.21921104260267,453.4846797602625L217.85361113858457,454.7213184337424L217.82084804404099,455.4729237604484L216.64026953327453,455.2176388679814L216.2957593916844,454.4128560137486L216.1069882450754,455.01256745209025L215.18315255346482,454.7684209589899L214.82979450061657,455.27537288205156L215.7588355655357,455.19805469537744L216.6710095834694,455.470983960278L216.31240667561786,455.747191052347L217.36430357412354,456.0397818248294L216.97532330766447,456.7911311543859L217.53071211601812,456.331459209659L217.9775200890719,456.3962141214798L218.91847352532358,457.707160858942L218.27196175162285,458.32213000682793L218.17329883524917,458.0171824966283L217.543047988138,458.60044955563234L217.0907808891289,458.33218662838334L217.37970951128383,459.21011078279196L216.28661007378776,458.5298134122268L215.48211585845792,458.62358215916373L213.3842341599497,457.67814650669317L211.96211223109563,456.67329220435175L211.722925615577,456.0714699515813L210.69689121339735,455.4004152831763L209.62448411801444,455.18945195065385L209.6956295004424,454.63901718075743L209.08349177186247,455.0124323987207L206.30239652709005,453.9162240882812L205.6842261417569,453.84733834902477L204.630477157775,453.3711985755133L205.0964552118532,452.9456548190231L205.23508149380058,453.08629111058247L205.66142321432042,452.0527467834031L204.90624377819495,450.91895292277724L205.16271988824184,450.2783264290715L205.96314978402896,451.013876461009L206.13835661705838,450.91045697967326L205.3854354705076,450.12769193783504L204.91218958291,449.9302427016117L204.85561554220357,450.6179540354761L204.4917826721497,451.5063386920942L202.97538994186777,452.697023775511L201.14066924144265,452.8082667729725L199.0829395414812,452.2323087948711L199.5505558663732,451.3924031453787L198.91634484268644,450.38353163707666L198.5431964161309,450.76162802634246L199.15176486828733,451.22507030725075L198.51945396752757,451.80206455421165L195.20256535332203,451.57892813119076L192.1399204981201,452.34165184237844L191.1241465725151,452.8532941039469L189.80317109908088,452.0850308874864L189.8161554277351,451.8073565749029L188.664365352032,451.98649423204654L188.2632880061256,451.4560315763982L187.4588394865734,451.41638320520156L187.7305911096881,450.2612720438855L187.6232555378037,449.3410831729119L187.00208845535607,449.98339122250417L186.86643992358748,450.5000537228762L186.2039483607073,451.3072437340904L185.61309581191398,450.8492641697366L184.74901472717522,450.57847558028635L184.10932010403198,450.78491165912504L185.01901035162388,449.3221409170039L183.784107642701,449.74654290483693L184.00656240873715,449.11913683321774L183.02031906077434,449.79029094753554L183.53761801670092,448.9832255735892L182.42728599203542,449.4286885472258L181.65405440167012,449.49390609742125L181.51732601580522,449.2250187339222L182.62962716154814,448.7600434772992L183.08756088460572,448.31073675541376L181.9300492896404,448.69422733386136L181.27382106426933,448.1172584504185L181.5063092353497,446.95229537651375L182.68752949455373,446.7968777837368L182.4520606959878,446.50400604390296L181.62795317122956,446.6986097663101L180.5027264653217,448.0229611972296L180.04412044780062,447.56589357055634L179.88086341941408,448.10259142569555L179.25686318448544,448.56130090109724L178.81605017580856,448.46042794726856L178.70468291080417,447.2418957377049L178.43615532640632,447.7424515826115L178.57660653138072,448.77194537478954L178.1282556225854,448.9645247835595L177.7947429853851,449.04458647857643L177.06339121601485,448.3769639559887L177.34786353687386,447.43439464332903L177.84752600321823,446.65014593693894L177.92532730258466,446.026194435092L177.17609788892494,447.34279794241303L177.00642888635474,447.9061679569526L176.6601500297597,447.49961284640136L176.32680253765128,449.0903644469566L175.31267516964863,449.8770790238513L175.3433172582726,450.27131804244607L176.0762178017602,449.4664488939228L176.12282890670133,450.52285267552855L176.49143240257987,449.6067900387399L176.8500687372423,450.52048492090375L176.45005702402585,451.0790356366234L175.9484923492854,450.8334724435682L175.43346387255698,451.3749878463627L175.42590937729162,451.6397184783782L176.04780291816135,451.0150975353283L176.67309345874105,451.32267520449955L177.21496673009085,450.60919128492736L177.58369203502875,451.05261051578833L177.67948973786443,451.7240721547028L176.62217313618422,452.8325682163655L177.3530499630808,453.1331519564076L176.5885474025255,453.9832400405716L176.41653775363747,454.94457388411104L175.6899154754229,455.15277309741805L174.21380778557395,454.9812257322455L174.457301168208,454.44222417661064L174.02862915460886,454.53293886410427L173.62991932077554,455.28134609274383L173.29852287821015,453.9970815308801L173.3246068811793,454.84173206199506L172.80180190111366,455.4659244603408L172.6408846231712,456.08836320192813L172.36520050271105,455.18109960785637L172.25492899879922,457.0690855721148L171.18578497241342,455.94969685366254L171.17339770703612,456.4958711068799L171.68173862418527,456.74767330069506L171.26957903660028,457.16234007510934L171.22320808626944,457.7189782860634L170.48849733811005,458.0639423777267L170.65797457386464,456.6987019315819L169.96262411178134,458.5763562468856L169.50670309129674,458.0796158693836L169.56919039374864,458.8131779746828L169.10880482993886,458.84332989388156L168.2744929677025,460.29754086437816L168.15287508485522,459.5583903466965L167.77180930266067,460.3619212192175L166.9708655154399,460.0653345454119L166.77462661734847,460.37548490069753L165.83207743913755,460.7225801182063L165.79563565990338,460.35397493803026L165.0441941643655,460.12603980821757L165.2597930263458,459.1530267157023L165.89327262708187,458.7079507086833L166.74621252995257,458.6684007018846L166.74618253143143,458.2043077193422L167.6043962914798,457.829938571914L167.51507641238268,457.53672606409447L168.36923510156652,456.46647620275763L167.93183507623976,456.4774452884293L166.53065601890253,457.5812494219322L166.07061967407785,457.5113137692355L165.30123626961955,456.73512476956455L165.78397300493685,454.998252184807L166.65357687056272,453.7739558099046L166.74695583192684,452.812707634594L167.00578320867749,452.63479518095704L167.08070302670694,451.56471569116206L166.56327330015029,450.44727066475303L167.6480996132236,449.9597750516729L168.73175692697427,448.92138642104504L169.65599110450327,448.22689640325945L170.2776467604688,448.8901215280032L170.79403105440775,448.9843124177998L171.67319641717432,448.55870097724176L172.08362549751863,448.81961091047543L173.79488292436412,449.0137029255268L174.03874707434326,449.2238805401547L173.4955506993207,448.58151624865883L172.98118495485335,448.7269638913094L171.74243734332293,448.2209105195188L170.6713157053944,447.4142491115222L171.3994404644431,446.2932047323136L172.5964379389444,445.2434997035728L173.1123968212478,445.10077204729635L172.64897413173358,444.92089642073836L171.83968475368994,445.1377392164038L171.13653945696416,445.89655921179303L170.87674976786704,446.8318023321551L169.37423489195936,446.8727360804073L168.9678257230713,446.12968812823794L168.97622329478986,446.66453270843806L167.81666573943795,447.29795755086724L167.2602680026452,448.2590965126365L166.26589525679395,448.5492898351016L165.29142704530992,449.6161033407973L165.62496431640264,450.401043589218L165.16426058209973,450.4013132385905L164.55120967640144,450.8927516158475L164.3880722454226,451.3568983337276L163.73485834204794,451.9414750655863L163.5027402456024,453.2879636214417L162.9641701147032,453.82134722132486L161.7619198851295,453.69948577055123L162.5931412254543,454.19495569264245L162.964616836834,454.8119033758669L162.53811084592107,455.8474879027511L162.20739302588754,456.0933629038124L160.8610378995545,456.2098957076488L160.6794392623019,456.56051164952873L161.6148744094619,456.5476307520349L161.43334151795167,457.33415826026663L160.9035155430759,457.7171275355617L160.2362449864243,457.620040631565L160.50203825949578,457.1544543933452L160.09965253094214,456.6608416408429L160.14430683978978,457.359684839448L159.68049709273527,458.27088840667784L158.88708355653807,458.3438118460479L159.21812610572323,459.0355125349095L157.96438648725623,459.63613074718495L157.8898068561779,460.6099545737755L157.57559231532673,460.7810790455013L157.7707956184484,461.78936838386755L158.10331018499903,461.4199750479901L159.33596640825712,461.4054092378986L159.83497391020526,461.9948604082092L160.56666909930502,462.399161139852L160.64117466615747,462.8328330889196L160.83335541494372,462.8247641353291L160.52440474126337,462.88616097953525L160.19330800035,463.7918161143783L159.4107612875383,464.43815385244005L158.66308278102034,464.47224808410607L158.45161974454146,465.25168249744956L158.03239048461938,465.2670429498333L158.16014431159255,466.11395411524893L157.6859477466338,466.3417261244207L157.94950250973392,466.64098486887224L157.20418797073208,467.4208046507168L157.14245320233533,467.90897320399637L156.70666601055208,467.27977653054927L156.76950602865585,467.83455822154565L156.367351109843,467.7346326708587L155.77105673487242,468.3517890666977L154.78864931721162,468.2553030317334L154.6384558232228,469.04888710485415L153.60622856154174,469.7397185348983L153.43647978260014,470.101393671939L152.69379741126738,469.7735161040919L152.7599761881489,470.60205344490106L152.2592249182616,470.79340619716885L152.2554165628805,471.3233220973948L151.2869408525025,471.1607750549269L151.2182193784545,472.01521070586114L150.5726211568555,471.76429389613884L149.40198780302921,472.68192225057504L149.3600368281776,473.0512126148919L150.09334383829383,472.79181137850134L149.82029458244105,473.45190903478476L149.98769627649958,473.8090195520665L149.2680854436424,474.91950509495933L148.64775917471775,474.5458751893807L148.24937158316936,475.46001047879975L148.05644604137177,475.01147837476907L146.8764916725286,476.27107759329175L146.2519870236769,475.5919430081244L146.10294736945508,476.1965666800346L145.5396831300371,476.6833499646415L145.89737382407225,477.1324087802825L145.27986010713062,477.1952049839748L144.93062129205614,476.75022508079843L143.82382267054854,477.1910031928798L143.49064662995823,477.62651035704283L144.5763582499281,477.50902211941366L144.42050396782443,478.0326843553682L143.44316576594488,477.66161374705956L143.47934296621463,478.0377498604833L142.7302381884498,477.87444741029213L141.33172388369098,479.2082745013561L142.31099359738076,478.7765149240199L143.13868629553832,479.20208179653025L141.8500369825581,481.11451779670125L141.4413005257975,480.2138180757281L141.3879162187611,481.05162104676504L140.6571266208287,480.8005897091323L140.3514063139326,481.3635269104278L138.7941537869099,481.5653050825505L138.47450496965783,482.12013617339863L138.37171651379342,481.409249414881L138.09182127152852,481.445300904269L138.1517384090865,482.26530212571333L137.82942455560138,483.06213379938424L137.643622528452,481.7827955800048L137.04878474794407,481.5595684745602L136.71122100518627,481.99935356178855L136.430396233488,481.78260197619653L136.20424083993677,482.39411122937423L134.9029979350088,482.96175442284004L134.1518179975184,483.79192236901866L133.95317156789213,483.0798465604522L133.66709326256108,483.8441940625137L133.2381465687166,483.8571127709362L132.77244487762766,483.33738944525726L132.4340482516492,483.84933302737534L131.19287403513806,484.2545630468478L130.49821654554296,484.14595049660704L130.71691965400674,483.40921678814817L131.2117707455899,482.710610794301L130.39599425067638,482.4412697688424L129.91757745412934,482.95611236697346L129.87156776691444,483.77694540121655L129.0241981739518,484.89131591665733L128.47493059568686,484.72051113927944L128.69745004833476,485.50227075201997L128.232191418053,485.7830146821253L127.86111975821522,485.20568353447186L127.4906402755442,486.04210285914587L126.69573966310874,485.73803000900955L126.69712644576107,484.41333848992326L126.22894101946346,484.0149644453067L125.92779874015507,484.3171958823112L126.26257452549056,484.882170511479L126.25984040885598,486.33035557156734L125.90753092477723,485.6714578523686L125.71583533213456,486.2305224366237L124.9338089513516,486.1629386950186L124.74408285636042,485.29070865824116L124.0497583081553,484.8543137814069L123.89638395583785,485.51609585649464L124.53758886846887,486.1267927354105L123.19310263020427,486.85574546906145L123.66918142412906,485.45163123642794L123.63680186504646,484.9208515559602L124.07348308094365,484.63566725860227L125.3294772118348,484.69489183071755L125.73016426723508,483.8973645084889L126.28786053112881,483.52425286479325L126.80758850703639,483.6293401018687L126.72250616400628,482.97936191944734L128.02154456388655,481.65068661309374L129.79864412227437,480.58079540718603L131.41455457793253,480.342464502692L132.41445231401474,480.4055642279404L133.27105417334724,480.2454157888752L132.6382227460345,480.85683460371797L133.4003678191927,482.0667851206129L133.79409940960335,482.3063948365475L133.5629697523092,481.03524389495607L134.42153013882302,481.22150433218854L134.57658575503422,481.7431584227116L135.367427665357,482.00138602834255L135.51483749341932,481.5464947687862L134.52920319018975,480.77191090171124L134.3795873560107,480.33925821941176L135.319817475665,478.620642793383L137.38020834517164,477.0722889743758L139.25015410999592,476.3990915445455L140.89293119272662,475.1510317136694ZM239.01172038560247,471.75283790193754L239.8214413484297,472.14516810759784L239.90859226510992,473.45048855051493L239.08475907300544,472.4561577358089ZM239.89127692737094,467.747027841809L240.74979712190668,468.3004311060303L241.6690900415997,469.42872867711355L242.00558866940344,470.7849543475592L242.03256989194642,471.791923216849L241.6626669735513,472.3931422142236L240.5228806589043,472.08004726263016L240.8008580639437,470.82250921178945L240.3251046483988,472.1374531094766L238.95006522499935,471.5953776478802L239.30355523722318,470.38765609635635L238.8844342088969,470.26758707911375L238.668051592207,469.7189439232214L239.16977123850802,469.07680497732065L238.764233221172,468.50958958568185ZM135.7641388507143,462.05697132593025L134.97980635388473,463.4635315972956L134.31211615135345,463.5850926173038L134.47890020220396,462.6080840014499ZM146.67646111277037,477.4732359601219L147.54903495605697,477.70648933051854L146.3460832244584,477.72628599178717ZM152.56293849763063,483.04166104160066L151.9053897812057,482.7640563469971L152.62487438261263,482.31154484474416ZM158.75201635651257,477.8469408783644L158.4890790753655,478.2295991757826L157.83385678294476,478.2358560470784ZM156.58222643706014,477.60712250634515L156.2564673867394,478.31258456859916L155.57612837419055,478.90191419832627L155.83724876332062,478.09440076473ZM158.04379180099005,477.73568073063456L157.47939644256275,478.3361706201956L157.0119156798589,477.9971277933695L157.49507237931763,477.5392023259278ZM161.107388272463,473.66108421249925L161.93536491367888,473.74691813687076L162.16888701852164,474.1419870590504L161.22006714960258,474.36748967495356L160.75786007442946,475.0459443186093L160.4818859937468,474.2966100782118ZM160.20809644026792,468.6824628661503L160.79296647888702,469.0684973098447L161.07342655908667,469.75867238621305L160.18024004236744,469.22640207784326ZM160.86705415946955,468.46549167696713L161.80902066822867,469.0197423996799L161.98220251781305,468.7349504364691L162.48680114562526,469.041905748372L162.1007581288707,469.60500533716714L162.72001805827537,469.6021070338604L163.04030843457278,468.9361056799395L164.13068963805773,469.5465361100881L163.34065932628477,470.23390248074895L163.6606306618357,470.23553022892906L163.66619587756216,471.01860872704316L164.76324769695103,470.87096203713594L164.13773009118972,472.17353407768036L163.52264447233793,472.1144967539365L162.72023470900794,471.65362213757334L162.46909781283566,471.8821636174917L163.12704725653944,472.297629851648L162.87007311280925,473.1515755623006L162.48162924360557,473.22322920166323L161.80383555188325,472.7527574226811L161.48822216276204,472.94874725989155L162.03437616565444,473.2722946707816L161.57179352882002,473.59667119560953L160.89670919393782,473.52552598781347L160.09621751839552,474.565891972898L159.52549280686938,474.4470499838876L159.9390994906138,475.0354004031454L158.67517486171107,476.51773247328373L157.7869454000265,476.67079650282807L158.05725051833718,476.0453729135189L158.83278373446473,475.2473146135476L158.42186341923806,475.29078251761166L158.60609599014774,474.59742263543905L158.0530922430639,475.1826354151359L157.81738346682738,475.0288373372629L158.3858109990972,474.22738481490626L157.50745444302476,473.9465746024664L156.65542623932646,474.18070168350573L156.80594305005712,474.6817847566325L157.2444574732088,474.2847753253896L157.97412787656916,474.2120128171649L157.30625552507973,475.5873732072047L156.45160932555518,475.05190295719586L156.41631573004872,473.7414306303722L155.66534393004002,473.0879213748146L155.78085761323712,472.2348843962148L156.11148927672747,471.65105797195105L157.066247415353,470.80161294351313L158.2846359121645,470.7687231668124L158.36615522985076,471.4238875199951L159.15777248577015,472.9933782446148L158.97118647884275,472.2678232132782L159.0675532628401,471.2836229192253L158.8091589110674,470.7372204334197L159.6947159549319,470.8206065978364L158.53324632460865,470.1940363999791L158.54023817497858,469.67644702785964L159.27190913826183,469.12562199412787L159.79665224841014,469.5330723187887L159.88967199427728,470.3922936687525L160.09916948239186,469.5186065905527L161.0804943184824,469.82830894962507L160.961486537507,469.13106457822613L161.62135749029886,469.62681470735555L160.83873400316722,468.708800296249ZM161.07432721138105,467.76576099516194L161.44375371068767,467.8465933993868L161.9307858834648,468.54417550118404L160.9670400879054,468.106895232024L160.31800189718138,468.05432100751113L160.8512201322567,467.48552542686406ZM164.07827545704004,465.62405464253993L164.34075136341494,466.1439997935589L164.83036108618137,465.91835202638634L164.66447009642206,466.6119153653468L165.283756743486,466.1804489123378L165.22709456825177,466.94471616859414L164.91563357027186,467.34011423403473L164.05790067605454,466.75909337155855L164.28369096658741,467.48469187192853L163.69796347114553,467.47070923731104L163.29480487615388,467.8398633161823L163.22897486346346,466.96625576263705L163.04116066235275,467.89420487935655L162.52330159333357,467.98426780205745L162.52935822014442,468.4487316211633L161.20343819730255,467.7130980123541L161.05238735506506,467.0704071450832L161.7818844369071,467.1520671194616L161.40173436968453,466.7531626777517L161.5876359174657,466.417339797361L162.47273097256277,466.5709149138686L162.3710806351485,465.76919592526974L162.86935661208204,465.2587422610044L163.47699100340623,465.36196624182816L163.9170614361774,466.23975767420546ZM162.89167125832628,464.670953819337L163.93566867203398,464.22943523034013L163.50144249228586,465.30785129749415L162.99066695691604,465.15303536468116ZM223.57579493433295,457.42892859319124L223.72635792014637,457.8206200417784L224.65743486299147,457.4984089449985L224.99227378507538,457.65748739257873L225.01116960768587,457.6432526921348L225.44896760427554,457.3109289011364L225.34552478737479,457.59213615951785L227.03269577707218,459.23748007763095L227.29803858245646,459.9867650283159L227.0341077408118,460.03509801569004L225.33892302569927,457.9544026741584L225.62659962862017,458.5675236407516L225.26929326254248,458.48902913608106L226.48713791614003,459.95467526912256L227.3236480598264,460.5102187111186L227.6094625799679,461.2117098346569L226.95995498720075,461.33298832280684L227.9756181886737,461.86440309321847L227.75623229758278,462.4758924855566L226.94125330039043,462.1141554695801L227.3590809111176,463.24353470198355L226.9419812159913,463.6351010654176L226.85355061447834,464.1941063592121L226.31970562142206,464.824596629616L225.87381956546386,464.1855243517581L225.68206925004546,463.317823700301L226.0398994678626,462.9014906299589L225.8753155169132,462.37503229001186L224.44666570664117,460.61281522428334L224.32338933968396,459.89080785888854L223.56132088007251,458.5816740851279L223.63942388545615,458.29350327543034L223.53473129302216,457.6918730563849L223.5891816216178,458.28936281194666L223.0090017084978,457.8094822816966L222.42195641902447,456.5072219064736ZM223.92340625640458,456.5092081981176L225.06672359632984,457.0992640191363L223.7926569837704,457.20476387969137L223.50336386691401,456.93775539410353ZM229.4527916102221,471.4858944591937L229.98180202630573,471.30269253463933L229.5577982543746,471.9143199678795ZM225.1942322066461,467.14383203701396L224.66991825939812,467.3508027019777L224.6223361286564,466.8381459053901L223.96683567126158,466.9382787704951L223.6629485996108,466.16500055925366L224.0477345998564,465.43876317717724L223.34010266214733,465.19492687865693L223.18687036302947,464.2132433348664L222.63883204350725,464.438167644602L221.88491097410335,463.8711916349574L222.59182148218932,463.6480904194067L222.11384079121143,463.4762549919926L222.09994642589356,462.7518555513419L222.8047301629171,462.342990256485L222.82981320244738,462.7743306183191L223.28067502326854,462.5495789026841L224.11820798978056,462.91937181594204L224.71238717925075,462.7412511916347L224.85254617619546,463.57787185234486L226.10839353138925,465.73190650051333L226.87687181845249,467.3033592922318L227.42515033488036,469.75684791181715L227.58637926982192,470.29948792568905L226.95746255146253,469.98743939086717L225.55459191772712,468.43222005921456L225.73646937137642,467.7749127550259L225.2201675579726,468.06136653658297ZM235.044832372036,466.75417045718353L235.4097904154803,467.39663088187154L236.6029734738131,467.8506549131109L236.25835477632415,468.2007859969936L236.81025366139414,468.7925439285362L236.13453304467225,469.32106570258304L235.622047189041,469.0331299763621L235.80348172351495,468.7056832225957L235.05056135328743,468.4695170506509L234.7787633649802,468.81594052622586L234.2357260921699,467.85681425105577L234.59152207789947,467.5857030548885L234.60085112941903,466.94523898939843ZM233.7784605433477,466.3927692862578L234.21165685678574,466.668925074626L234.30962058934603,467.4394934718433L233.67041269141635,467.94334432872466L232.79576402601785,467.5331826701434L232.82159389874892,466.8562490962878ZM236.13004854012917,467.45934645214675L235.3181134806061,467.05200537586694L235.16092760759182,466.2870119140136L234.79498406831596,465.78216527195997L235.34578503803337,465.88420577874416L235.9486625934265,466.43601170096633L236.32644313642575,466.233029722144L237.00371353850915,467.02549021692096L236.64387029630367,467.7281410940696ZM232.35854148374665,464.40202341297635L234.08259812349937,465.3770818188004L233.32263789364166,466.2465762081827L232.85018254952914,466.30358869895747L232.66617363837543,465.49068565550584L232.14562418778172,464.5137206067204ZM229.2290597648631,465.82532714547693L229.03237535899558,465.47988118855733L229.63802510114044,465.49562298197424L229.59396617596155,467.33394213403045L229.75517146176236,469.03737285899973L229.9721322961996,468.8239939958084L230.16702073250545,470.0897455116683L229.85830497752957,469.9592047968022L229.34053979957093,468.7756717228452L229.77222008234884,470.779152043263L229.29540381219226,470.46240883190075L228.75190838420502,469.2896943468279L228.63104032388316,468.25277525727137L229.27705449337356,468.03550200201613L228.82142290995426,467.4029860287914L228.05808996534944,467.51193042449574L228.0824256340651,467.150299845047L227.44735201503798,466.5279071594895L227.16340151262216,465.721430096219L227.65645704265296,465.84993868588595L227.65624587958342,465.04560319948064L228.45243589526825,465.18508139646286ZM228.47558536020574,463.6591493241575L230.19979181699287,463.7032801758985L231.30521650624766,463.3894009943291L231.88172695083455,463.7408603933427L232.5827504876948,465.3274042230711L232.46187148233997,465.7856696601177L231.6415105522342,465.34064652774936L230.84616551808094,464.4218781607844L231.57825878183246,465.82624146090717L232.08540312868308,465.80341518380516L232.30896800173417,466.2817959825336L232.09650740074463,466.9753661500151L231.1751373799422,466.8905960260787L231.28727433609254,467.18595048393564L230.56022961911566,467.53089701717414L229.8323178395853,466.09093855274324L229.81788834091782,465.2772750435118L229.43609652937386,465.3537361937642L229.0963964865488,464.84012743110173L228.06641014256007,464.2589131914853ZM220.66763234402777,459.4944266623503L220.44391747001026,459.9607621511771L220.88727562600067,459.9563460754832L221.36642666086476,458.9540953714598L221.7067191391512,458.69786876979634L223.0548798472364,458.79804586329084L223.36857867008098,459.1912303445972L223.24643788999802,459.81758804538043L222.39069162195952,459.63523740508106L223.5668487314632,460.30611552154227L222.6895112015186,460.74416217824427L222.01523913095957,460.44429459425544L220.04936053539984,459.9770388534408L222.14438857476173,460.73981503116164L222.79740243721193,461.2231850722413L223.11685395488894,460.75679456303345L223.7175585437506,460.5744156884123L224.54071873672586,462.22049464092265L223.74400305991466,462.57904357512126L223.32095275659566,462.31458230394514L220.71197677384075,461.360552959975L221.89110552946596,462.2344726489336L222.18022207221225,463.09757964868936L221.79938568416767,463.80063104728083L221.31468692591784,463.77799268076564L220.52166099042427,463.05275896612454L221.32531065927088,463.41013906941043L219.8140291664262,462.470079088676L219.8426764178742,462.1736819788517L219.03911281048204,461.6894799557118L218.82494672216887,461.46755749509464L218.6898774229817,461.50718751232284L218.60989564840057,461.5310732751887L218.5303057091224,460.4084040759651L219.9131295425886,461.14117041280804L219.91952623293807,461.1083353343647L218.18720202617584,459.981213831513L218.17935435975863,459.1655237225771L218.66195381481901,459.3130434760321L218.89452127408927,458.86122240906457L219.44116543599785,458.7807223735607L219.8032945579192,458.12839516461827L221.08577581428295,458.5347893225639ZM217.89234998597402,459.9186718339834L218.56017916256738,460.319979389687L218.45598962681396,461.46768603886096L218.00808761124122,461.1442584476658ZM220.95203966725592,457.56265738116605L220.94000197735772,457.52067363665816L220.95203966725592,457.56265738116605ZM221.67972306960104,464.00408949867426L222.36670033109405,464.6203130025426L222.76749173345678,465.40310319367825L222.705767306209,465.9540512834207L221.99866374687775,466.2928074158223L221.40409600839024,464.115560775418ZM126.36705446414851,434.43827337706534L127.15154996875121,434.7560856583128L126.08340159875428,435.57251465923775L126.14817402271518,434.36523345438707ZM127.56361189147704,433.04627682021686L128.37163363543584,433.9645029962049L128.35058833548482,434.6433972726403L128.7026537443618,435.47049563024797L128.56981628095744,436.0697537476015L127.95105701778397,435.11337511975336L126.16014468634353,434.2794225865027L126.36028228915242,433.66116715456667L126.95764707544691,432.9378042548177ZM128.9483914652811,431.72278737130586L129.8386209050797,432.20365196642894L130.34054878213325,432.86844381473577L129.50847770378977,433.3945232960752L129.0331240538034,434.1369267041843L128.43868394199507,434.0474556991843L127.8221545984946,433.09636343054984L127.21660640494311,432.710703716841L127.30363228395198,432.2622860567823L128.07945189696923,431.75822717770956ZM131.49202567780503,452.2366611973657L131.7356090624889,452.72355494864945L131.3958041909119,452.91721623148607ZM119.46956170202459,448.9509688066259L119.55028079405486,449.66545121115297L120.23438978016569,449.66024968314474L120.81567121374653,450.10355373427484L120.39994030914839,451.6092742293721L120.76903001831408,452.5343847411682L119.23593186764927,452.67531066387266L118.53831642006499,453.3085698659902L117.87801957090517,452.46755118175093L117.2998177059016,452.4041624420789L116.26730012454803,451.24381338600284L115.8897525910279,451.2006134072576L115.26453685600539,450.5099436690225L115.18236063010016,449.70252307563914L115.55322174205378,449.47029940363626L116.97290626403846,449.9776733319744L117.12352518996853,449.5467713350895L118.41061736608529,449.0373733722023L119.4258720808354,449.29485192474044ZM98.61119497915877,442.79840040877514L98.57833053409735,443.42995502214416L99.25543681734214,444.41785874958936L99.92275661985663,444.67570354691924L100.29031257950268,445.27956834232293L99.14987306433927,444.9313452637385L98.34521664634367,443.56660552523937L98.02672155664135,443.3358510591653ZM123.93696490792226,446.4173510458973L124.02473816131425,446.82695167411003L124.77763646030058,446.7395830111665L124.58298576246442,447.23717066243927L125.313214942143,447.33958474858855L125.86039243711971,447.7137646803037L125.91751663984803,448.3963382557914L125.27081419894927,448.9491937871949L124.7580793534389,449.05839539485635L124.92754860800908,449.5521769669196L124.4680401935677,449.68258187707823L123.94535739103112,450.61379187157826L123.47195089349906,450.4880937759984L122.72760164895445,449.5015847777135L123.34049402188177,448.89692155130183L122.60212879576187,449.04954844181054L121.93750588792182,448.57841457493333L123.5259617136175,447.78449406955224L123.38195084445948,447.2748008778866L123.86595740899747,447.14504719122806ZM189.98190643298778,453.11812380856276L189.03183738493928,454.48085835914105L189.0554900245418,454.12291149746517ZM178.29954949757936,453.96785820991266L178.1477507814513,454.6090715103768L177.66795692301955,454.7977606783902ZM177.63235660308507,454.19199004802516L177.82012043001302,453.3965035045607L178.122228857793,453.70892115202156ZM177.56878943977523,453.19842508747433L177.2402733641618,454.3297938097779L176.81997725876283,453.9538839927459ZM180.3925149291786,451.93468076258125L180.80821850873804,451.89611208914994L180.5844677268,452.4593250954519L181.14045662836273,452.1747789126134L180.30892343410622,453.2145619768667L179.50100078935827,454.68670818664833L179.72822056461266,455.1037644109399L178.99024721777073,455.66845046646466L178.18586236389703,455.83185300058403L178.28900367579445,455.2989303567008L179.59922508149384,453.6489362412555L180.2879029030439,452.53329410794134ZM177.58722180548622,451.94619734700973L177.56322537133622,452.606210739864L177.16515296844292,452.3526619237569ZM182.2068791290381,450.8016389889149L182.80623663506003,450.8629914307666L182.79482431702672,451.31700656562447L183.53651509102053,451.05267891790135L183.7083620938467,451.2848862132192L182.6747661535592,451.892379086192L182.11904524246754,452.47549624378445L181.83333005100772,452.21359112295386L182.45732839810972,451.5883513716726L181.72414441009283,451.80404144819687L181.66216843518728,451.49423530472467ZM177.95107976527572,452.7375878180429L178.11260764473866,451.52206906818526L178.8135384479398,451.5596759766266L178.50327317446337,453.35765348349344ZM184.48268237823584,449.8356344559575L184.49609167385432,450.02752039402264L183.27468209791124,450.91049389981634L182.9701278486045,450.51789398544435ZM179.19304008798585,449.76297102704865L179.64833021474075,449.9213913084173L179.09262475927036,450.24956691254374ZM175.33110895680014,450.11991186191034L175.33624352640228,450.1693517998923L175.33110895680014,450.11991186191034ZM176.7567598929102,449.53453759464895L177.13626956590753,450.1530481727914L176.6388719405183,449.9845580247725ZM177.1609586110638,448.4096005591156L177.5944943520375,449.11934067647144L176.89502214285048,449.2835610002681ZM160.22838960380264,459.1629641126925L160.51057521541927,459.5518495125852L159.82293137319675,459.7017466393948ZM169.5091170569814,458.98949239075296L169.21360935471492,459.7360637072571L169.28020791552564,458.890590998513ZM165.10257462154675,452.34232072578976L164.72611732886952,452.7901271740143L164.9569684501712,451.8536087346595ZM165.97782242109676,386.70832492885023L165.85574750108617,387.2169271938481L165.51734461214778,386.7608007666545ZM133.97960276613978,429.94152763137015L134.04829673458278,430.49075323704153L133.1237552696232,430.2367470596517ZM107.99950676545515,423.79577233779185L107.97761406534677,424.4882803363394L109.55718597191398,425.69916884010587L111.1815449112531,425.2035185440829L111.69186409870106,425.41652580272284L112.07768578759422,426.04832867992053L112.04443580085481,426.85299197120804L113.06642141878322,427.4797580439045L113.267151278308,428.0010873714002L114.75774875315187,428.4684674648574L115.62208760407498,428.9325206977747L114.94417257898276,429.80796897230005L113.69681458880845,429.2802786214161L112.6789736139049,430.1013094741241L112.73254494470655,430.44886303543575L112.08148416651056,430.4367335937909L112.33097280206144,429.95083052579196L111.90375223113148,429.11115440227525L110.9503907788339,428.5967428162576L111.18286250548809,428.07908545579636L110.37668139809182,427.05765644811123L109.69176985538783,426.45848839196134L108.36424439001972,426.6548321645705L107.83594588440025,426.9757844601689L107.07157158857882,426.3714210702526L106.96960067877905,425.5285896946094ZM130.4079022061482,410.26832960243956L130.01107400847127,410.4911439413336L128.33771664091708,410.8128553564897ZM236.86619765831495,475.8724010377224L237.32501989233913,476.09345932805275L237.36094817284095,476.8047611815113L236.54966700702042,476.01452067066873ZM241.9672719602919,473.6016582052718L242.3398616675878,474.0721384525516L241.92210773167412,474.6368621795447L241.2238018775467,474.36217994618096ZM235.96371614792344,474.36397227879445L236.7885151875045,475.21122848480644L236.62199921539158,475.51247607169563L236.0398219908958,475.38371971947487L236.22181457487696,474.93183015576994ZM234.8640574851357,474.35958609725407L235.4356625854805,474.96769546469466L235.51917397226669,475.53884059454975L237.2384331701735,476.8868871736307L237.55265413434626,477.34684173242766L236.9305294819613,477.4793178766226L235.64747909201674,476.38365585308054L234.68987789871466,475.39439772404455L234.47362218030145,474.50361997776724ZM240.5772344668424,472.3867495142209L241.17544416293808,472.7536974091178L241.4540388280691,473.67608993020355L240.47493630783435,473.9077378013874L240.62953101107024,473.05900918395895L240.22996632994258,472.72962070865646ZM233.7913926162213,473.9932731872458L234.38051241029996,474.3373613207615L234.35948098177064,474.69847207899215L233.74816578563633,474.93916294626524L233.52885695704873,474.1965923861756ZM232.903555142929,473.8145574421348L233.3292281995673,473.90049563126644L232.76136856235854,474.69861916955773ZM233.20339207738033,473.21417908249157L232.6379381108132,473.6548647988357L232.80636143141882,473.0705711733097ZM232.06116252834443,473.1164544947939L232.60100801803785,473.06839759000576L232.4882819259397,473.77260456301974L232.01114722683837,473.5498706858179ZM233.32876879662666,472.6098759527225L233.71027702375176,472.9595183207828L233.54274907753975,473.3629099361658L233.0585349761481,472.9573064983406ZM232.0433242061291,471.198899487104L233.01710978605496,471.3336887888937L232.25673302730115,471.52675544061543L232.4801786575353,472.0243087560993L231.71631237108306,471.662612884105ZM232.84355684614547,470.40816074864205L233.27381970587396,471.2276892351503L232.77084999240728,470.8989801277899ZM239.2526118550399,467.99514190850937L238.65732718251036,468.3515247795035L239.1415518757375,467.70071936577034ZM231.8952089598639,468.99620363778007L232.40142865127547,468.92961162462063L232.65309169266231,469.77006445882887L232.31795425873136,469.74157686677904L231.5731043036985,470.4420439016269L231.39971289799956,470.9432333843409L231.00429216584428,470.80634410662987L231.32484163433412,469.5715145600935ZM230.89090666889086,467.98688589295307L231.5119220794117,468.00318390062955L232.43045750698448,467.68635036320114L233.21020647781182,468.4635382575001L233.13209038800775,469.03258522465455L233.80843961305584,469.4851554866322L234.32050767310824,469.21825222255694L235.13278719011575,469.6009441348799L235.99513592285854,470.2833933889445L236.41309883702223,471.32772473762617L236.6642915781056,470.97087794049855L237.09834283785204,471.551017033724L237.75913255077205,471.96381960105845L236.45860326785242,471.6460366215648L235.92484943214635,472.35573975564L236.72083552179475,471.8721522854917L237.18538887452752,472.58373416335877L237.50629608064787,472.294424377563L238.3843490658594,473.0308052461725L237.90032324037793,473.53790779750585L238.51657927736164,473.45845790055733L238.60732683371987,472.8778663178742L239.07926357402516,473.8842842350996L238.62599538543614,474.34658495129884L239.18897910796625,474.34373826746236L239.6022471277492,475.13085448523896L239.10096800088752,475.32441854982915L239.77335584885762,475.5363779431747L239.82466020439477,476.4388580377312L238.95881025726783,476.47464124796795L237.89507336499616,475.2273954305658L237.18142832180098,475.4796684157445L237.21772075484552,474.49050124871235L236.87650029009475,474.8670343277715L236.84324450020938,474.20366579725794L236.51627812069376,474.4983938428884L235.34834472540481,474.0513976326274L234.397377699511,474.2636163288451L234.22350835116663,473.60072147512193L234.8770116172488,473.3962995474784L234.24022125587192,472.9878319240385L234.23030167912384,471.94990947978295L233.77215375507234,472.4215539415793L233.1202473514683,472.337314679534L233.5498353359162,470.895262986422L233.0928087193849,470.5046407597551L232.34893184151065,468.8390377897559L231.30616518153758,469.05922715848925L230.8733513702333,468.5036829883357Z"></path></g>';
    var D3URL = 'http://d3js.org/d3.v3.min.js';
    var USMAPTopoJSON = 'http://bl.ocks.org/mbostock/raw/4090846/us.json';
    var util = nx.util;


    /**
     * US map layout class, this require d3.js
     *
     files:
     http://d3js.org/d3.v3.min.js

     * example

     var topo = new nx.graphic.Topology({
        adaptive: true,
        nodeConfig: {
                        label: 'model.name'
                    },
        showIcon: false,
        layoutType: 'USMap',
        layoutConfig: {
            longitude: 'model.longitude',
            latitude: 'model.latitude'
        },
        data: topologyData
     })

     * @class nx.graphic.Topology.USMapLayout
     * @module nx.graphic.Topology
     */

    /**
     * Map's longitude attribute
     * @property longitude
     */
    /**
     * Map's latitude attribute
     * @property latitude
     */

    nx.define("nx.graphic.Topology.USMapLayout", {
        properties: {
            topology: {},
            projection: {}
        },
        methods: {
            process: function (graph, config, callback) {
                // load d3

                if (typeof (d3) === "undefined") {
                    util.loadScript(D3URL, function () {
                        this._process(graph, config, callback);
                    }.bind(this));
                } else {
                    this._process(graph, config, callback);
                }

            },
            _process: function (graph, config, callback) {
                var topo = this.topology();
                var projection = d3.geo.albersUsa();
                topo.prependLayer('usmap', 'nx.graphic.Topology.USMapLayer');

                var longitude = config.longitude || 'model.longitude',
                    latitude = config.latitude || 'model.latitude';


                var _longitude = longitude.split(".").pop(),
                    _latitude = latitude.split(".").pop();

                topo.graph().eachVertexSet(function (vertex) {
                    vertex.positionGetter(function () {
                        var p = projection([nx.path(vertex, _longitude), nx.path(vertex, _latitude)]);
                        return {
                            x: p[0],
                            y: p[1]
                        };
                    });
                    vertex.positionSetter(function (position) {
                        var p = projection.invert([position.x, position.y]);
                        vertex.set(_longitude, p[0]);
                        vertex.set(_latitude, p[1]);
                    });

                    vertex.position(vertex.positionGetter().call(vertex));
                });


                topo.graph().eachVertex(function (vertex) {
                    vertex.positionGetter(function () {
                        var p = projection([nx.path(vertex, _longitude), nx.path(vertex, _latitude)]);
                        return {
                            x: p[0],
                            y: p[1]
                        };
                    });
                    vertex.positionSetter(function (position) {
                        var p = projection.invert([position.x, position.y]);
                        vertex.set(_longitude, p[0]);
                        vertex.set(_latitude, p[1]);
                    });

                    vertex.position(vertex.positionGetter().call(vertex));
                });


                topo.stage().resetFitMatrix();

                this.projection(projection);

                topo.fit(function () {
                    if (callback) {
                        callback.call(topo);
                    }
                }, this, false);


            }
        }
    });


    //

    nx.define("nx.graphic.Topology.USMapLayer", nx.graphic.Topology.Layer, {
        view: {
            type: 'nx.graphic.Group',
            content: {
                name: 'map',
                type: 'nx.graphic.Group'
            }
        },
        methods: {
            draw: function () {
                var map = this.view('map');
                var ns = "http://www.w3.org/2000/svg";
                var el = new DOMParser().parseFromString('<svg  xmlns="' + ns + '">' + USMAP + '</svg>', 'text/xml');
                map.view().dom().$dom.appendChild(document.importNode(el.documentElement.firstChild, true));
            },
            updateMap: function () {
                //                var topo = this.nextTopology();
                //                var g = this.view('map');
                //                var width = 960, height = 500;
                //                var containerWidth = topo._width - topo._padding * 2, containerHeight = topo._height - topo._padding * 2;
                //                var scale = Math.min(containerWidth / width, containerHeight / height);
                //                var translateX = (containerWidth - width * scale) / 2;
                //                var translateY = (containerHeight - height * scale) / 2;
                //                g.setTransform(translateX, translateY, scale);
            }

        }
    });


})(nx, nx.global);

(function (nx, global) {

    var D3URL = 'http://d3js.org/d3.v3.min.js';
    var D3TOPOJSON = 'http://d3js.org/topojson.v1.min.js';
    var WORLDMAPTopoJSON = 'http://bl.ocks.org/mbostock/raw/4090846/world-50m.json';
    var width = 500,
        height = 400;
    var projection;
    var util = nx.util;


    /**
     * World map layout, this require d3.js and d3 topojsonv1.js

     files:
     http://d3js.org/d3.v3.min.js
     http://d3js.org/topojson.v1.min.js

     * example

     var topo = new nx.graphic.Topology({
        adaptive: true,
        nodeConfig: {
                        label: 'model.name'
                    },
        showIcon: false,
        identityKey: 'name',
        layoutType: 'WorldMap',
        layoutConfig: {
            longitude: 'model.longitude',
            latitude: 'model.latitude',
            worldTopoJson: 'lib/world-50m.json'
        },
        data: topologyData
     })

     * @class nx.graphic.Topology.WorldMapLayout
     * @module nx.graphic.Topology
     */
    /**
     * Map's longitude attribute
     * @property longitude
     */
    /**
     * Map's latitude attribute
     * @property latitude
     */
    /**
     * world topo json file url, this should be under the same domain.
     * Could download from here : http://bl.ocks.org/mbostock/raw/4090846/world-50m.json
     * @property worldTopoJson
     */
    nx.define("nx.graphic.Topology.WorldMapLayout", {
        properties: {
            topology: {},
            projection: {}
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                if (!projection && typeof(d3) !== "undefined") {
                    projection = d3.geo.equirectangular().translate([width / 2, height / 2]).precision(0.1);
                    this.projection(projection);
                }
            },
            process: function (graph, config, callback) {
                // load d3

                if (!config.worldTopoJson) {
                    console.log('Please idenity world topo json url, download from:http://bl.ocks.org/mbostock/raw/4090846/world-50m.json');
                    return;
                }

                WORLDMAPTopoJSON = config.worldTopoJson;


                this._loadD3(function () {
                    this._loadTopoJSON(function () {
                        this._process(graph, config, callback);
                    }.bind(this));
                }.bind(this));
            },
            _loadD3: function (fn) {
                if (typeof (d3) === "undefined") {
                    util.loadScript(D3TOPOJSON, function () {
                        fn.call(this);
                    }.bind(this));
                } else {
                    fn.call(this);
                }
            },
            _loadTopoJSON: function (fn) {
                if (typeof (topojson) === "undefined") {
                    util.loadScript(D3TOPOJSON, function () {
                        fn.call(this);
                    }.bind(this));
                } else {
                    fn.call(this);
                }
            },
            _process: function (graph, config, callback) {
                var topo = this.topology();
                topo.prependLayer('worldMap', 'nx.graphic.Topology.WorldMapLayer');


                projection = d3.geo.equirectangular().translate([width / 2, height / 2]).precision(0.1);

                var longitude = config.longitude || 'model.longitude',
                    latitude = config.latitude || 'model.latitude';

                var _longitude = longitude.split(".").pop(),
                    _latitude = latitude.split(".").pop();

                topo.graph().eachVertexSet(function (vertex) {
                    vertex.positionGetter(function () {
                        var p = projection([nx.path(vertex, _longitude), nx.path(vertex, _latitude)]);
                        return {
                            x: p[0],
                            y: p[1]
                        };
                    });
                    vertex.positionSetter(function (position) {
                        var p = projection.invert([position.x, position.y]);
                        vertex.set(_longitude, p[0]);
                        vertex.set(_latitude, p[1]);
                    });

                    vertex.position(vertex.positionGetter().call(vertex));
                });

                topo.graph().eachVertex(function (vertex) {
                    vertex.positionGetter(function () {
                        var p = projection([nx.path(vertex, _longitude), nx.path(vertex, _latitude)]);
                        return {
                            x: p[0],
                            y: p[1]
                        };
                    });
                    vertex.positionSetter(function (position) {
                        var p = projection.invert([position.x, position.y]);
                        vertex.set(_longitude, p[0]);
                        vertex.set(_latitude, p[1]);
                    });

                    vertex.position(vertex.positionGetter().call(vertex));
                });

                this.projection(projection);

                if (callback) {
                    topo.getLayer("worldMap").complete(function () {
                        callback.call(topo);
                    });
                }
            }

        }
    });


    //

    nx.define("nx.graphic.Topology.WorldMapLayer", nx.graphic.Topology.Layer, {
        properties: {
            complete: {}
        },
        view: {
            type: 'nx.graphic.Group',
            content: {
                name: 'map',
                type: 'nx.graphic.Group'
            }
        },
        methods: {
            draw: function () {

                var map = this.view('map');
                var topo = this.topology();
                var group = d3.select(map.view().dom().$dom);

                var path = d3.geo.path().projection(projection);

                d3.json(WORLDMAPTopoJSON, function (error, world) {
                    group.insert("path", ".graticule")
                        .datum(topojson.feature(world, world.objects.land))
                        .attr("class", "land mapPath")
                        .attr("d", path);

                    group.insert("path", ".graticule")
                        .datum(topojson.mesh(world, world.objects.countries, function (a, b) {
                            return a !== b;
                        }))
                        .attr("class", "boundary mapBoundary")
                        .attr("d", path);


                    topo.stage().resetFitMatrix();
                    topo.fit(null, null, false);
                    if (this.complete()) {
                        this.complete().call();
                    }

                }.bind(this));

            },
            updateMap: function () {
                //                var topo = this.nextTopology();
                //                var g = this.view('map');
                //                var width = 960, height = 500;
                //                var containerWidth = topo._width - topo._padding * 2, containerHeight = topo._height - topo._padding * 2;
                //                var scale = Math.min(containerWidth / width, containerHeight / height);
                //                var translateX = (containerWidth - width * scale) / 2;
                //                var translateY = (containerHeight - height * scale) / 2;
                //                g.setTransform(translateX, translateY, scale);
            },
            update: function () {
                var topo = this.topology();
                this.set("scale", topo.scale());
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {
    /**
     * Topology tooltip policy
     * @class nx.graphic.Topology.TooltipPolicy
     */

    nx.define("nx.graphic.Topology.TooltipPolicy", {
        events: [],
        properties: {
            topology: {},
            tooltipManager: {}
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.sets(args);
                this._tm = this.tooltipManager();
            },
            pressStage: function () {
                this._tm.closeAll();
            },
            zoomstart: function () {
                this._tm.closeAll();
            },
            clickNode: function (node) {
                this._tm.openNodeTooltip(node);
            },
            clickLinkSetNumber: function (linkSet) {
                this._tm.openLinkSetTooltip(linkSet);
            },
            dragStageStart: function () {
                this._tm.closeAll();
            },
            clickLink: function (link) {
                this._tm.openLinkTooltip(link);
            },
            resizeStage: function () {
                this._tm.closeAll();
            },
            fitStage: function () {
                this._tm.closeAll();
            },
            deleteNode: function () {
                this._tm.closeAll();
            },
            deleteNodeSet: function () {
                this._tm.closeAll();
            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    /**
     * Basic tooltip class for nextTopology
     * @class nx.graphic.Topology.Tooltip
     * @extend nx.ui.Popover
     */
    nx.define("nx.graphic.Topology.Tooltip", nx.ui.Popover, {
        properties: {
            /**
             * Lazy closing a tooltip
             * @type Boolean
             * @property lazyClose
             */
            lazyClose: {
                value: false
            },
            /**
             * Pin a tooltip
             * @type Boolean
             * @property pin
             */
            pin: {
                value: false
            },
            /**
             * Is tooltip response to resize event
             * @type Boolean
             * @property listenWindow
             */
            listenWindow: {
                value: true
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    /**
     * Node tooltip content class
     * @class nx.graphic.NodeTooltipContent
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     */

    nx.define('nx.graphic.Topology.NodeTooltipContent', nx.ui.Component, {
        properties: {
            node: {
                set: function (value) {
                    var model = value.model();
                    this.view('list').set('items', new nx.data.Dictionary(model.getData()));
                    this.title(value.label());
                }
            },
            topology: {},
            title: {}
        },
        view: {
            content: [
                {
                    name: 'header',
                    props: {
                        'class': 'n-topology-tooltip-header'
                    },
                    content: [
                        {
                            tag: 'span',
                            props: {
                                'class': 'n-topology-tooltip-header-text'
                            },
                            name: 'title',
                            content: '{#title}'
                        }
                    ]
                },
                {
                    name: 'content',
                    props: {
                        'class': 'n-topology-tooltip-content n-list'
                    },
                    content: [
                        {
                            name: 'list',
                            tag: 'ul',
                            props: {
                                'class': 'n-list-wrap',
                                template: {
                                    tag: 'li',
                                    props: {
                                        'class': 'n-list-item-i',
                                        role: 'listitem'
                                    },
                                    content: [
                                        {
                                            tag: 'label',
                                            content: '{key}: '
                                        },
                                        {
                                            tag: 'span',
                                            content: '{value}'
                                        }
                                    ]

                                }
                            }
                        }
                    ]
                }
            ]
        },
        methods: {
            init: function (args) {
                this.inherited(args);
                this.sets(args);
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    /**
     * @class nx.graphic.LinkTooltipContent
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.LinkTooltipContent", nx.ui.Component, {
        properties: {
            link: {
                set: function (value) {
                    var model = value.model();
                    this.view('list').set('items', new nx.data.Dictionary(model.getData()));
                }
            },
            topology: {},
            tooltipmanager: {}
        },
        view: {
            content: {
                props: {
                    'class': 'n-topology-tooltip-content n-list'
                },
                content: [
                    {
                        name: 'list',
                        tag: 'ul',
                        props: {
                            'class': 'n-list-wrap',
                            template: {
                                tag: 'li',
                                props: {
                                    'class': 'n-list-item-i',
                                    role: 'listitem'
                                },
                                content: [
                                    {
                                        tag: 'label',
                                        content: '{key}: '
                                    },
                                    {
                                        tag: 'span',
                                        content: '{value}'
                                    }
                                ]

                            }
                        }
                    }
                ]
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * @class nx.graphic.LinkSetTooltipContent
     * @extend nx.ui.Component
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.LinkSetTooltipContent", nx.ui.Component, {
        properties: {
            linkSet: {
                set: function (value) {
                    var items = [];
                    nx.each(value.model().edges(), function (edge) {
                        items.push({
                            item: "Source:" + edge.sourceID() + " Target :" + edge.targetID(),
                            edge: edge});
                    });
                    this.view("list").items(items);
                }
            },
            topology: {}
        },
        view: [
            {
                props: {
                    style: {
                        'maxHeight': '247px',
                        'overflow': 'auto',
                        'overflow-x': 'hidden'
                    }
                },
                content: {
                    name: 'list',
                    props: {
                        'class': 'list-group',
                        style: 'width:200px',
                        template: {
                            tag: 'a',
                            props: {
                                'class': 'list-group-item'
                            },
                            content: '{item}',
                            events: {
                                'click': '{#_click}'
                            }
                        }
                    }
                }
            }
        ],
        methods: {
            _click: function (sender, events) {
                var link = sender.model().edge;
//                this.nextTopology().fire('clickLink', link);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {


    /**
     * Tooltip manager for nextTopology
     * @class nx.graphic.Topology.TooltipManager
     * @extend nx.data.ObservableObject
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.TooltipManager", {
        events: ['openNodeToolTip', 'closeNodeToolTip', 'openLinkToolTip', 'closeLinkToolTip', 'openLinkSetTooltip', 'closeLinkSetToolTip'],
        properties: {
            /**
             * Get nextTopology
             * @property  topology
             */
            topology: {
                value: null
            },
            /**
             * All tooltip's instance array
             */
            tooltips: {
                value: function () {
                    return new nx.data.ObservableDictionary();
                }
            },
            /**
             * Get node's tooltip
             * @property nodeTooltip
             */
            nodeTooltip: {},
            /**
             * Get link's tooltip
             * @property linkTooltip
             */
            linkTooltip: {},
            /**
             * Get linkSet tooltip
             * @method linkSetTooltip
             */
            linkSetTooltip: {},
            nodeSetTooltip: {},

            /**
             * node tooltip class
             * @property nodeTooltipClass
             */
            nodeTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },

            /**
             * link tooltip class
             * @property linkTooltipClass
             */
            linkTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },
            /**
             * linkSet tooltip class
             * @property linkSetTooltipClass
             */
            linkSetTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },
            nodeSetTooltipClass: {
                value: 'nx.graphic.Topology.Tooltip'
            },
            /**
             * @property nodeTooltipContentClass
             */
            nodeTooltipContentClass: {
                value: 'nx.graphic.Topology.NodeTooltipContent'
            },
            /**
             * @property linkTooltipContentClass
             */
            linkTooltipContentClass: {
                value: 'nx.graphic.Topology.LinkTooltipContent'
            },
            /**
             * @property linkSetTooltipContentClass
             */
            linkSetTooltipContentClass: {
                value: 'nx.graphic.Topology.LinkSetTooltipContent'
            },

            nodeSetTooltipContentClass: {
                value: 'nx.graphic.Topology.NodeSetTooltipContent'
            },
            /**
             * Show/hide node's tooltip
             * @type Boolean
             * @property showNodeTooltip
             */
            showNodeTooltip: {
                value: true
            },
            /**
             * Show/hide link's tooltip
             * @type Boolean
             * @property showLinkTooltip
             */
            showLinkTooltip: {
                value: true
            },
            /**
             * Show/hide linkSet's tooltip
             * @type Boolean
             * @property showLinkSetTooltip
             */
            showLinkSetTooltip: {
                value: true
            },
            showNodeSetTooltip: {
                value: true
            },
            /**
             * Tooltip policy class
             * @property tooltipPolicyClass
             */
            tooltipPolicyClass: {
                get: function () {
                    return this._tooltipPolicyClass !== undefined ? this._tooltipPolicyClass : 'nx.graphic.Topology.TooltipPolicy';
                },
                set: function (value) {
                    if (this._tooltipPolicyClass !== value) {
                        this._tooltipPolicyClass = value;
                        var topology = this.topology();
                        var tooltipPolicyClass = nx.path(global, this.tooltipPolicyClass());
                        if (tooltipPolicyClass) {
                            var tooltipPolicy = new tooltipPolicyClass({
                                topology: topology,
                                tooltipManager: this
                            });
                            this.tooltipPolicy(tooltipPolicy);
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            },
            tooltipPolicy: {
                value: function () {
                    var topology = this.topology();
                    return new nx.graphic.Topology.TooltipPolicy({
                        topology: topology,
                        tooltipManager: this
                    });
                }
            },
            /**
             * Set/get tooltip's activate statues
             * @property activated
             */
            activated: {
                get: function () {
                    return this._activated !== undefined ? this._activated : true;
                },
                set: function (value) {
                    if (this._activated !== value) {
                        this._activated = value;
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        },
        methods: {

            init: function (args) {

                this.inherited(args);

                this.sets(args);

                this.registerTooltip('nodeTooltip', this.nodeTooltipClass());
                this.registerTooltip('linkTooltip', this.linkTooltipClass());
                this.registerTooltip('linkSetTooltip', this.linkSetTooltipClass());
                this.registerTooltip('nodeSetTooltip', this.nodeSetTooltipClass());


                //build in tooltips


                var nodeTooltip = this.getTooltip('nodeTooltip');
                nodeTooltip.on("close", function () {
                    this.fire("closeNodeToolTip");
                }, this);
                nodeTooltip.view().dom().addClass('n-topology-tooltip');
                this.nodeTooltip(nodeTooltip);


                var linkTooltip = this.getTooltip('linkTooltip');
                linkTooltip.on("close", function () {
                    this.fire("closeLinkToolTip", linkTooltip);
                }, this);
                linkTooltip.view().dom().addClass('n-topology-tooltip');
                this.linkTooltip(linkTooltip);


                var linkSetTooltip = this.getTooltip('linkSetTooltip');
                linkSetTooltip.on("close", function () {
                    this.fire("closeLinkSetToolTip", linkSetTooltip);
                }, this);
                linkSetTooltip.view().dom().addClass('n-topology-tooltip');
                this.linkSetTooltip(linkSetTooltip);


                var nodeSetTooltip = this.getTooltip('nodeSetTooltip');
                nodeSetTooltip.on("close", function () {
                    this.fire("closeNodeSetToolTip");
                }, this);
                nodeSetTooltip.view().dom().addClass('n-topology-tooltip');
                this.nodeSetTooltip(nodeSetTooltip);


                var topology = this.topology();
                var tooltipPolicyClass = nx.path(global, this.tooltipPolicyClass());
                if (tooltipPolicyClass) {
                    var tooltipPolicy = new tooltipPolicyClass({
                        topology: topology,
                        tooltipManager: this
                    });
                    this.tooltipPolicy(tooltipPolicy);
                }
            },
            /**
             * Register tooltip class
             * @param name {String}
             * @param tooltipClass {nx.ui.Component}
             */
            registerTooltip: function (name, tooltipClass) {
                var tooltips = this.tooltips();
                var topology = this.topology();
                var clz = tooltipClass;
                if (nx.is(clz, 'String')) {
                    clz = nx.path(global, tooltipClass);
                }
                var instance = new clz();
                instance.sets({
                    topology: topology,
                    tooltipManager: this,
                    model: topology.graph(),
                    'data-tooltip-type': name
                });
                tooltips.setItem(name, instance);
            },
            /**
             * Get tooltip instance by name
             * @param name {String}
             * @returns {nx.ui.Component}
             */
            getTooltip: function (name) {
                var tooltips = this.tooltips();
                return tooltips.getItem(name);
            },

            executeAction: function (action, data) {
                if (this.activated()) {
                    var tooltipPolicy = this.tooltipPolicy();
                    if (tooltipPolicy && tooltipPolicy[action]) {
                        tooltipPolicy[action].call(tooltipPolicy, data);
                    }
                }
            },
            /**
             * Open a node's tooltip
             * @param node {nx.graphic.Topology.Node}
             * @param position {Object}
             * @method openNodeTooltip
             */
            openNodeTooltip: function (node, position) {
                var topo = this.topology();
                var nodeTooltip = this.nodeTooltip();
                var content;

                nodeTooltip.close(true);

                if (this.showNodeTooltip() === false) {
                    return;
                }


                var pos = position || topo.getAbsolutePosition(node.position());

                var contentClass = nx.path(global, this.nodeTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        node: node,
                        model: topo.model()
                    });
                }

                if (content) {
                    nodeTooltip.content(null);
                    content.attach(nodeTooltip);
                }

                var size = node.getBound(true);

                nodeTooltip.open({
                    target: pos,
                    offset: Math.max(size.height, size.width) / 2
                });

                this.fire("openNodeToolTip", node);
            },
            /**
             * Open a nodeSet's tooltip
             * @param nodeSet {nx.graphic.Topology.NodeSet}
             * @param position {Object}
             * @method openNodeSetTooltip
             */
            openNodeSetTooltip: function (nodeSet, position) {
                var topo = this.topology();
                var nodeSetTooltip = this.nodeSetTooltip();
                var content;

                nodeSetTooltip.close(true);

                if (this.showNodeSetTooltip() === false) {
                    return;
                }


                var pos = position || topo.getAbsolutePosition(nodeSet.position());

                var contentClass = nx.path(global, this.nodeSetTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        nodeSet: nodeSet,
                        model: topo.model()
                    });
                }

                if (content) {
                    nodeSetTooltip.content(null);
                    content.attach(nodeSetTooltip);
                }

                var size = nodeSet.getBound(true);

                nodeSetTooltip.open({
                    target: pos,
                    offset: Math.max(size.height, size.width) / 2
                });

                this.fire("openNodeSetToolTip", nodeSet);
            },
            /**
             * open a link's tooltip
             * @param link
             * @param position
             * @method openLinkTooltip
             */
            openLinkTooltip: function (link, position) {
                var topo = this.topology();
                var linkTooltip = this.linkTooltip();
                var content;

                linkTooltip.close(true);

                if (this.showLinkTooltip() === false) {
                    return;
                }

                var pos = position || topo.getAbsolutePosition(link.centerPoint());

                var contentClass = nx.path(global, this.linkTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        link: link,
                        model: topo.model()
                    });
                }

                if (content) {
                    linkTooltip.content(null);
                    content.attach(linkTooltip);
                }

                linkTooltip.open({
                    target: pos,
                    offset: 4
                });

                this.fire("openLinkToolTip", link);
            },
            /**
             * Open linkSet tooltip
             * @method openLinkSetTooltip
             * @param linkSet
             * @param position
             */
            openLinkSetTooltip: function (linkSet, position) {
                var topo = this.topology();
                var linkSetTooltip = this.linkSetTooltip();
                var content;

                linkSetTooltip.close(true);

                if (this.showLinkSetTooltip() === false) {
                    return;
                }

                var pos = position || topo.getAbsolutePosition(linkSet.centerPoint());
                var contentClass = nx.path(global, this.linkSetTooltipContentClass());
                if (contentClass) {
                    content = new contentClass();
                    content.sets({
                        topology: topo,
                        linkSet: linkSet,
                        model: topo.model()
                    });
                }

                if (content) {
                    linkSetTooltip.content(null);
                    content.attach(linkSetTooltip);
                }

                linkSetTooltip.open({
                    target: pos,
                    offsetX: 0,
                    offsetY: 8
                });

                this.fire("openLinkSetToolTip", linkSet);
            },
            /**
             * Close all tooltip
             * @method closeAll
             */
            closeAll: function () {
                this.tooltips().each(function (obj, name) {
                    obj.value().close(true);
                }, this);
            },
            dispose: function () {
                this.tooltips().each(function (obj, name) {
                    obj.value().close(true);
                    obj.value().dispose();
                }, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Basic scene class
     * @class nx.graphic.Topology.Scene
     * @extend nx.data.ObservableObject
     */
    nx.define("nx.graphic.Topology.Scene", nx.data.ObservableObject, {
        properties: {
            topology: {
                value: null
            }
        },
        methods: {
            init: function (args) {
                this.sets(args);
            },
            /**
             * Factory function ,entry of a scene
             * @method activate
             */
            activate: function () {

            },
            /**
             * Deactivate a scene
             * @method deactivate
             */
            deactivate: function () {

            }
        }
    });

})(nx, nx.global);
(function (nx, global) {
    /**
     * Default Scene for nextTopology
     * @class nx.graphic.Topology.DefaultScene
     * @extend nx.graphic.Topology.Scene
     */

    nx.define('nx.graphic.Topology.DefaultScene', nx.graphic.Topology.Scene, {
        events: [],
        methods: {
            /**
             * active scene
             * @method activate
             */

            activate: function () {
                this._topo = this.topology();
                this._nodesLayer = this._topo.getLayer('nodes');
                this._nodeSetLayer = this._topo.getLayer('nodeSet');
                this._linksLayer = this._topo.getLayer('links');
                this._linkSetLayer = this._topo.getLayer('linkSet');
                this._groupsLayer = this._topo.getLayer('groups');
                this._tooltipManager = this._topo.tooltipManager();
                this._nodeDragging = false;
                this._sceneTimer = null;
                this._interval = 600;
            },
            deactivate: function () {
                this._tooltipManager.closeAll();
            },
            dispatch: function (eventName, sender, data) {
                this._tooltipManager.executeAction(eventName, data);
            },
            pressStage: function (sender, event) {
            },
            clickStage: function (sender, event) {
                if (event.target == this._topo.stage().view().dom().$dom && !event.shiftKey) {
                    this._topo.selectedNodes().clear();
                }
            },
            dragStageStart: function (sender, event) {
                var nodes = this._nodesLayer.nodes().length;
                if (nodes > 300) {
                    this._linksLayer.hide();
                }
                this._recover();
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-moveCursor');
            },
            dragStage: function (sender, event) {
                var stage = this._topo.stage();
                stage.applyTranslate(event.drag.delta[0], event.drag.delta[1]);
            },
            dragStageEnd: function (sender, event) {
                this._linksLayer.show();
                this._blockEvent(false);
                nx.dom.Document.html().removeClass('n-moveCursor');
            },
            projectionChange: function () {

            },

            zoomstart: function () {
                var nodes = this._nodesLayer.nodes().length;
                if (nodes > 300) {
                    this._linksLayer.setStyle('display', 'none');
                }
                this._recover();
                //this._topo.adjustLayout();
            },
            zooming: function () {

            },
            zoomend: function () {
                this._linksLayer.setStyle('display', 'block');
                this._topo.adjustLayout();
            },

            beforeSetData: function () {

            },

            afterSetData: function () {

            },


            insertData: function () {

            },


            ready: function () {

            },
            enterNode: function (sender, node) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._sceneTimer = setTimeout(function () {
                        if (!this._nodeDragging) {
                            this._topo.activeRelatedNode(node);
                        }
                    }.bind(this), this._interval);
                    this._recover();
                }
                nx.dom.Document.body().addClass('n-dragCursor');
            },
            leaveNode: function (sender, node) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._recover();
                }
                nx.dom.Document.body().removeClass('n-dragCursor');
            },

            hideNode: function (sender, node) {

            },
            dragNodeStart: function (sender, node) {
                this._nodeDragging = true;
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-dragCursor');
                setTimeout(this._recover.bind(this), 0);
            },
            dragNode: function (sender, node) {
                this._topo._moveSelectionNodes(event, node);
            },
            dragNodeEnd: function () {
                this._nodeDragging = false;
                this._blockEvent(false);
                this._topo.stage().resetFitMatrix();
                nx.dom.Document.html().removeClass('n-dragCursor');
            },

            pressNode: function (sender, node) {
            },
            clickNode: function (sender, node) {
                if (!this._nodeDragging) {
                    if (!event.shiftKey) {
                        this._topo.selectedNodes().clear();
                    }
                    node.selected(!node.selected());
                }
            },
            selectNode: function (sender, node) {
                var selectedNodes = this._topo.selectedNodes();
                if (node.selected()) {
                    if (selectedNodes.indexOf(node) == -1) {
                        this._topo.selectedNodes().add(node);
                    }
                } else {
                    if (selectedNodes.indexOf(node) !== -1) {
                        this._topo.selectedNodes().remove(node);
                    }
                }
            },

            updateNodeCoordinate: function () {

            },


            enterLink: function (sender, events) {
            },

            pressNodeSet: function (sender, nodeSet) {
            },
            clickNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                this._recover();
                if (event.shiftKey) {
                    nodeSet.selected(!nodeSet.selected());
                } else {
                    nodeSet.collapsed(!nodeSet.collapsed());
                }
            },

            enterNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._sceneTimer = setTimeout(function () {
                        this._topo.activeRelatedNode(nodeSet);
                    }.bind(this), this._interval);
                }
            },
            leaveNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                if (!this._nodeDragging) {
                    this._recover();
                }
            },
            beforeExpandNodeSet: function (sender, nodeSet) {

                this._blockEvent(true);
                //update parent group
                var parentNodeSet = nodeSet.parentNodeSet();
                while (parentNodeSet && parentNodeSet.group) {
                    var group = parentNodeSet.group;
                    group.clear();
                    group.nodes(nx.util.values(parentNodeSet.nodes()));
                    group.draw();
                    parentNodeSet = parentNodeSet.parentNodeSet();
                }
                this._recover();
            },
            expandNodeSet: function (sender, nodeSet) {
                clearTimeout(this._sceneTimer);
                this._recover();
                this._topo.stage().resetFitMatrix();
                this._topo.fit(function () {
                    nodeSet.group = this._groupsLayer.addGroup({
                        shapeType: 'nodeSetPolygon',
                        nodeSet: nodeSet,
                        nodes: nx.util.values(nodeSet.nodes()),
                        label: nodeSet.label(),
                        color: '#9BB150',
                        id: nodeSet.id()
                    });
                    var parentNodeSet = nodeSet.parentNodeSet();
                    while (parentNodeSet && parentNodeSet.group) {
                        parentNodeSet.group.draw();
                        parentNodeSet = parentNodeSet.parentNodeSet();
                    }

                    this._blockEvent(false);
                    this._topo.adjustLayout();

                }, this, nodeSet.animation() ? 1.5 : false);

                //
            },
            beforeCollapseNodeSet: function (sender, nodeSet) {
                this._blockEvent(true);
                if (nodeSet.group) {
                    this._groupsLayer.removeGroup(nodeSet.id());
                    delete nodeSet.group;
                }

                nx.each(nodeSet.nodeSets(), function (ns, id) {
                    if (ns.group) {
                        this._groupsLayer.removeGroup(ns.id());
                        delete ns.group;
                    }
                }, this);

                this._topo.fadeIn();
                this._recover();
            },
            collapseNodeSet: function (sender, nodeSet) {
                var parentNodeSet = nodeSet.parentNodeSet();
                while (parentNodeSet && parentNodeSet.group) {
                    var group = parentNodeSet.group;
                    group.clear();
                    group.nodes(nx.util.values(parentNodeSet.nodes()));
                    parentNodeSet = parentNodeSet.parentNodeSet();
                }

                this._topo.stage().resetFitMatrix();
                this._topo.fit(function () {
                    this._blockEvent(false);
                }, this, nodeSet.animation() ? 1.5 : false);
            },
            removeNodeSet: function (sender, nodeSet) {
                if (nodeSet.group) {
                    this._groupsLayer.removeGroup(nodeSet.id());
                    delete nodeSet.group;
                }
                this._topo.stage().resetFitMatrix();
            },
            updateNodeSet: function (sender, nodeSet) {
                if (nodeSet.group) {
                    nodeSet.group.clear();
                    nodeSet.group.nodes(nx.util.values(nodeSet.nodes()));
                }

            },
            dragNodeSetStart: function (sender, nodeSet) {
                this._nodeDragging = true;
                this._recover();
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-dragCursor');
            },
            dragNodeSet: function (sender, nodeSet) {
                this._topo._moveSelectionNodes(event, nodeSet);
            },
            dragNodeSetEnd: function () {
                this._nodeDragging = false;
                this._blockEvent(false);
                nx.dom.Document.html().removeClass('n-dragCursor');
                this._topo.stage().resetFitMatrix();
            },
            selectNodeSet: function (sender, nodeSet) {
                var selectedNodes = this._topo.selectedNodes();
                if (nodeSet.selected()) {
                    if (selectedNodes.indexOf(nodeSet) == -1) {
                        this._topo.selectedNodes().add(nodeSet);
                    }
                } else {
                    if (selectedNodes.indexOf(nodeSet) !== -1) {
                        this._topo.selectedNodes().remove(nodeSet);
                    }
                }
            },

            addNode: function () {
                this._topo.stage().resetFitMatrix();
                this._topo.adjustLayout();
            },
            addNodeSet: function () {
                this._topo.stage().resetFitMatrix();
//                this._topo.fit();
                this._topo.adjustLayout();

            },
            removeNode: function () {
                this._topo.adjustLayout();
            },

            dragGroupStart: function (sender, group) {
            },

            dragGroup: function (sender, group) {
                if (event) {
                    var stageScale = this._topo.stageScale();
                    group.updateNodesPosition(event.drag.delta[0], event.drag.delta[1]);
                    group.move(event.drag.delta[0] * stageScale, event.drag.delta[1] * stageScale);
                }
            },

            dragGroupEnd: function (sender, group) {
            },
            clickGroupLabel: function (sender, group) {

            },
            collapseNodeSetGroup: function (sender, group) {
                var nodeSet = group.nodeSet();
                if (nodeSet) {
                    nodeSet.collapsed(true);
                }
            },

            enterGroup: function (sender, group) {
                if (nx.is(group, 'nx.graphic.Topology.NodeSetPolygonGroup')) {
                    var ns = group.nodeSet();
                    this._topo.activeNodes(nx.util.values(ns.nodes()));
                    this._topo.fadeOut();
                    this._groupsLayer.fadeOut();

                    group.view().dom().addClass('fade-active-item');
                }
            },
            leaveGroup: function (sender, group) {
                group.view().dom().removeClass('fade-active-item');
                this._topo.fadeIn();
                this._topo.recoverActive();
            },


            right: function (sender, events) {
                this._topo.move(30, null, 0.5);
            },
            left: function (sender, events) {
                this._topo.move(-30, null, 0.5);
            },
            up: function () {
                this._topo.move(null, -30, 0.5);
            },
            down: function () {
                this._topo.move(null, 30, 0.5);
            },
            pressR: function () {
                if (nx.DEBUG) {
                    this._topo.activateLayout('force');
                }
            },
            pressA: function () {
                if (nx.DEBUG) {
                    var nodes = this._topo.selectedNodes().toArray();
                    this._topo.selectedNodes().clear();
                    this._topo.aggregationNodes(nodes);
                }
            },
            pressS: function () {
                if (nx.DEBUG) {
                    this._topo.activateScene('selection');
                }
            },
            pressM: function () {
                if (nx.DEBUG) {
                    this._topo.activateScene('default');
                }
            },
            pressF: function () {
                if (nx.DEBUG) {
                    this._topo.fit();
                }
            },
            topologyGenerated: function () {
                this._topo.adjustLayout();
            },
            _recover: function () {
                this._topo.fadeIn();
                this._topo.recoverActive();
            },
            _blockEvent: function (value) {
                this._topo.blockEvent(value);
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {


    /**
     * Selection scene
     * @class nx.graphic.Topology.SelectionScene
     * @extend nx.graphic.Topology.Scene
     */
    nx.define("nx.graphic.Topology.SelectionScene", nx.graphic.Topology.DefaultScene, {
        methods: {
            /**
             * Entry
             * @method activate
             */

            activate: function (args) {
                this.appendRect();
                this.inherited(args);
                this.topology().dom().addClass('n-crosshairCursor');

            },
            deactivate: function () {
                this.inherited();
                this.rect.dispose();
                delete this.rect;
                this.topology().dom().removeClass('n-crosshairCursor');
                nx.dom.Document.html().removeClass('n-crosshairCursor');
            },
            _dispatch: function (eventName, sender, data) {
                if (this[eventName]) {
                    this[eventName].call(this, sender, data);
                }
            },
            appendRect: function () {
                var topo = this.topology();
                if (!this.rect) {
                    this.rect = new nx.graphic.Rect({
                        'class': 'selectionRect'
                    });
                    this.rect.attach(topo.stage().staticLayer());
                }
                this.rect.sets({
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                });
            },
            dragStageStart: function (sender, event) {
                this.rect.set('visible', true);
                this._blockEvent(true);
                nx.dom.Document.html().addClass('n-crosshairCursor');
            },
            dragStage: function (sender, event) {
                var rect = this.rect;
                var origin = event.drag.origin;
                var size = event.drag.offset;
                // check if width negative
                if (size[0] < 0) {
                    rect.set('x', origin[0] + size[0]);
                    rect.set('width', -size[0]);
                } else {
                    rect.set('x', origin[0]);
                    rect.set('width', size[0]);
                }
                if (size[1] < 0) {
                    rect.set('y', origin[1] + size[1]);
                    rect.set('height', -size[1]);
                } else {
                    rect.set('y', origin[1]);
                    rect.set('height', size[1]);
                }
            },
            dragStageEnd: function (sender, event) {
                this._stageTranslate = null;
                this.rect.set('visible', false);
                this._blockEvent(false);
                nx.dom.Document.html().removeClass('n-crosshairCursor');
            },
            _getRectBound: function () {
                var rectbound = this.rect.getBoundingClientRect();
                var topoBound = this.topology().getBound();
                return {
                    top: rectbound.top - topoBound.top,
                    left: rectbound.left - topoBound.left,
                    width: rectbound.width,
                    height: rectbound.height,
                    bottom: rectbound.bottom - topoBound.top,
                    right: rectbound.right - topoBound.left
                };
            },
            esc: {

            },
            clickNodeSet: function (sender, nodeSet) {},
            dragNode: function () {

            },
            dragNodeSet: function () {

            },
            _blockEvent: function (value) {
                if (value) {
                    this.topology().scalable(false);
                    nx.dom.Document.body().addClass('n-userselect n-blockEvent');
                } else {
                    this.topology().scalable(true);
                    nx.dom.Document.body().removeClass('n-userselect');
                    nx.dom.Document.body().removeClass('n-blockEvent');
                }
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     * Selection node scene
     * @class nx.graphic.Topology.SelectionNodeScene
     * @extend nx.graphic.Topology.SelectionScene
     */

    nx.define('nx.graphic.Topology.SelectionNodeScene', nx.graphic.Topology.SelectionScene, {
        properties: {
            /**
             * Get all selected nodes
             * @property selectedNodes
             */
            selectedNodes: {
                get: function () {
                    return this.topology().selectedNodes();
                }
            }
        },
        methods: {

            activate: function () {
                this.inherited();
                var tooltipManager = this._tooltipManager;
                tooltipManager.activated(false);
            },
            deactivate: function () {
                this.inherited();
                var tooltipManager = this._tooltipManager;
                tooltipManager.activated(true);
            },

            pressStage: function (sender, event) {
                var selectedNodes = this.selectedNodes();
                var multi = this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                if (!multi) {
                    selectedNodes.clear();
                }

                event.captureDrag(sender.stage().view(), this.topology().stage());
            },
            enterNode: function () {

            },
            clickNode: function (sender, node) {},
            dragStageStart: function (sender, event) {
                this.inherited(sender, event);
                var selectedNodes = this.selectedNodes();
                var multi = this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                if (!multi) {
                    selectedNodes.clear();
                }
                this._prevSelectedNodes = this.selectedNodes().toArray().slice();
            },
            dragStage: function (sender, event) {
                this.inherited(sender, event);
                this.selectNodeByRect(this.rect.getBound());
            },
            selectNode: function (sender, node) {
                if (node.selected()) {
                    this._topo.selectedNodes().add(node);
                } else {
                    this._topo.selectedNodes().remove(node);
                }
            },
            selectNodeSet: function (sender, nodeset) {
                if (nodeset.selected()) {
                    this._topo.selectedNodes().add(nodeset);
                } else {
                    this._topo.selectedNodes().remove(nodeset);
                }
            },


            pressNode: function (sender, node) {
                if (node.enable()) {
                    var selectedNodes = this.selectedNodes();
                    this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                    if (!this._multi) {
                        selectedNodes.clear();
                    }
                    node.selected(!node.selected());
                }
            },
            pressNodeSet: function (sender, nodeSet) {
                if (nodeSet.enable()) {
                    var selectedNodes = this.selectedNodes();
                    this._multi = event.metaKey || event.ctrlKey || event.shiftKey;
                    if (!this._multi) {
                        selectedNodes.clear();
                    }
                    nodeSet.selected(!nodeSet.selected());
                }
            },
            selectNodeByRect: function (bound) {
                this.topology().eachNode(function (node) {
                    var nodeBound = node.getBound();
                    // FIXME for firefox bug with g.getBoundingClientRect
                    if (nx.util.isFirefox()) {
                        var position = [node.x(), node.y()];
                        var svgbound = this.topology().stage().dom().getBound();
                        var matrix = this.topology().stage().matrix();
                        position = nx.geometry.Vector.transform(position, matrix);
                        nodeBound.x = nodeBound.left = position[0] + svgbound.left - nodeBound.width / 2;
                        nodeBound.right = nodeBound.left + nodeBound.width;
                        nodeBound.y = nodeBound.top = position[1] + svgbound.top - nodeBound.height / 2;
                        nodeBound.bottom = nodeBound.top + nodeBound.height;
                    }
                    var nodeSelected = node.selected();
                    if (this._hittest(bound, nodeBound)) {
                        if (!nodeSelected) {
                            node.selected(true);
                        }
                    } else {
                        if (this._multi) {
                            if (this._prevSelectedNodes.indexOf(node) == -1) {
                                if (nodeSelected) {
                                    node.selected(false);
                                }
                            }
                        } else {
                            if (nodeSelected) {
                                node.selected(false);
                            }
                        }
                    }
                }, this);
            },
            collapseNodeSetGroup: function (sender, group) {

            },
            enterGroup: function (sender, group) {

            },
            _hittest: function (sourceBound, targetBound) {
                var t = targetBound.top >= sourceBound.top && targetBound.top <= ((sourceBound.top + sourceBound.height)),
                    l = targetBound.left >= sourceBound.left && targetBound.left <= (sourceBound.left + sourceBound.width),
                    b = (sourceBound.top + sourceBound.height) >= (targetBound.top + targetBound.height) && (targetBound.top + targetBound.height) >= sourceBound.top,
                    r = (sourceBound.left + sourceBound.width) >= (targetBound.left + targetBound.width) && (targetBound.left + targetBound.width) >= sourceBound.left,
                    hm = sourceBound.top >= targetBound.top && (sourceBound.top + sourceBound.height) <= (targetBound.top + targetBound.height),
                    vm = sourceBound.left >= targetBound.left && (sourceBound.left + sourceBound.width) <= (targetBound.left + targetBound.width);

                return (t && l) || (b && r) || (t && r) || (b && l) || (t && vm) || (b && vm) || (l && hm) || (r && hm);
            }
        }
    });

})(nx, nx.global);

(function (nx, global) {

    /**
     * Zoom by selection scene
     * @class nx.graphic.Topology.ZoomBySelection
     * @extend nx.graphic.Topology.SelectionScene
     */
    nx.define("nx.graphic.Topology.ZoomBySelection", nx.graphic.Topology.SelectionScene, {
        events: ['finish'],
        properties: {
        },
        methods: {
            activate: function (args) {
                this.inherited(args);
                nx.dom.Document.html().addClass('n-zoomInCursor');
            },
            deactivate: function () {
                this.inherited();
                nx.dom.Document.html().removeClass('n-zoomInCursor');
            },
            dragStageEnd: function (sender, event) {
                var bound = this.rect.getBound();
                this.inherited(sender, event);

                this.fire('finish', bound);
            },
            esc: function () {
                this.fire('finish');
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {


    var shapeMap = {
        'rect': 'nx.graphic.Topology.RectGroup',
        'circle': 'nx.graphic.Topology.CircleGroup',
        'polygon': 'nx.graphic.Topology.PolygonGroup',
        'nodeSetPolygon': 'nx.graphic.Topology.NodeSetPolygonGroup'
    };


    var colorTable = ['#C3A5E4', '#75C6EF', '#CBDA5C', '#ACAEB1 ', '#2CC86F'];
    //    var colorTable = ['#75C6EF', '#75C6EF', '#75C6EF', '#75C6EF ', '#75C6EF'];


    /**
     * Topology group layer class

     var groupsLayer = topo.getLayer('groups');
     var nodes1 = [0, 1];
     var group1 = groupsLayer.addGroup({
                    nodes: nodes1,
                    label: 'Rect',
                    color: '#f00'
                });
     group1.on('clickGroupLabel', function (sender, events) {
                    console.log(group1.nodes());
                }, this);

     *
     * @class nx.graphic.Topology.GroupsLayer
     * @extend nx.graphic.Topology.Layer
     * @module nx.graphic.Topology
     */

    nx.define('nx.graphic.Topology.GroupsLayer', nx.graphic.Topology.Layer, {
        statics: {
            /**
             * Default color table, with 5 colors
             * @property colorTable
             * @static
             */
            colorTable: colorTable
        },
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup', 'collapseNodeSetGroup'],
        properties: {
            shapeType: 'polygon',
            /**
             * Groups elements
             * @property groupItems {nx.data.ObservableDictionary}
             */
            groupItems: {
                value: function () {
                    var dict = new nx.data.ObservableDictionary();
                    dict.on('change', function (sender, args) {
                        var action = args.action;
                        var items = args.items;
                        if (action == 'clear') {
                            nx.each(items, function (item) {
                                var group = item.value();
                                if (group) {
                                    group.dispose();
                                }

                            });
                        }
                    }, this);
                    return dict;
                }
            },
            /**
             * groups data
             * @property groups {Array}
             */
            groups: {
                get: function () {
                    return this._groups || [];
                },
                set: function (value) {
                    if (nx.is(value, Array)) {
                        nx.each(value, function (item) {
                            this.addGroup(item);
                        }, this);
                        this._groups = value;
                    }
                }
            }
        },
        methods: {

            /**
             * Register a group item class
             * @param name {String} group items' name
             * @param className {Object} which should extend nx.graphic.Topology.GroupItem
             */
            registerGroupItem: function (name, className) {
                shapeMap[name] = className;
            },


            attach: function (args) {
                this.inherited(args);
                var topo = this.topology();
                topo.on('afterFitStage', this._redraw.bind(this), this);
                topo.on('zoomend', this._redraw.bind(this), this);
                topo.on('collapseNode', this._redraw.bind(this), this);
                topo.on('expandNode', this._redraw.bind(this), this);
                topo.watch('revisionScale', this._redraw.bind(this), this);
                topo.watch('showIcon', this._redraw.bind(this), this);
            },
            /**
             * Add a group to group layer
             * @param obj {Object} config of a group
             */
            addGroup: function (obj) {
                var groupItems = this.groupItems();
                var shape = obj.shapeType || this.shapeType();
                var nodes = obj.nodes;

                var GroupClass = nx.path(global, shapeMap[shape]);
                var group = new GroupClass({
                    'topology': this.topology()
                });

                var config = nx.clone(obj);

                if (!config.color) {
                    config.color = colorTable[groupItems.count() % 5];
                }
                delete config.nodes;
                delete config.shapeType;

                group.sets(config);
                group.attach(this);


                group.nodes(nodes);

                var id = config.id || group.__id__;

                groupItems.setItem(id, group);

                var events = ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup', 'collapseNodeSetGroup'];

                nx.each(events, function (e) {
                    group.on(e, function (sender, event) {
                        if (event instanceof MouseEvent) {
                            window.event = event;
                        }
                        this.fire(e, group);
                    }, this);
                }, this);


                return group;

            },
            _redraw: function () {
                this.groupItems().each(function (item) {
                    item.value()._draw();
                }, this);
            },
            /**
             * Remove a group
             * @method removeGroup
             * @param id
             */
            removeGroup: function (id) {
                var groupItems = this.groupItems();
                var group = groupItems.getItem(id);
                if (group) {
                    group.dispose();
                    groupItems.removeItem(id);
                }
            },
            /**
             * Get a group by id
             * @method getGroup
             * @param id
             * @returns {*}
             */
            getGroup: function (id) {
                return this.groupItems().getItem(id);
            },
            /**
             * Iterate all group
             * @method eachGroupItem
             * @param callBack
             * @param context
             */
            eachGroupItem: function (callBack, context) {
                this.groupItems().each(function (item) {
                    callBack.call(context || this, item.value(), item.key());
                }, this);
            },
            /**
             * clear all group
             * @clear
             */
            clear: function () {
                this.groupItems().clear();
                this.inherited();
            },
            dispose: function () {
                this.clear();
                var topo = this.topology();
                topo.off('collapseNode', this._redraw.bind(this), this);
                topo.off('expandNode', this._redraw.bind(this), this);
                topo.off('zoomend', this._redraw.bind(this), this);
                topo.off('fitStage', this._redraw.bind(this), this);
                topo.unwatch('revisionScale', this._redraw.bind(this), this);
                topo.unwatch('showIcon', this._redraw.bind(this), this);
                this.inherited();
            }

        }
    });


})(nx, nx.global);

(function (nx, global) {

    /**
     *
     * Base group shape class
     * @class nx.graphic.Topology.GroupItem
     * @extend nx.graphic.Component
     * @module nx.graphic.Topology.Group
     *
     */


    nx.define("nx.graphic.Topology.GroupItem", nx.graphic.Group, {
        events: [],
        properties: {
            /**
             * Topology
             * @property topology
             * @readyOnly
             */
            topology: {

            },
            /**
             * Node array in the shape
             * @property nodes {Array}
             */
            nodes: {
                get: function () {
                    return this._nodes || [];
                },
                set: function (value) {
                    var topo = this.topology();
                    var graph = topo.graph();
                    var vertices = this.vertices();
                    if (nx.is(value, Array) || nx.is(value, nx.data.ObservableCollection)) {

                        //
                        nx.each(value, function (value) {
                            var vertex;
                            if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                                vertex = value.model();
                            } else if (graph.getVertex(value)) {
                                vertex = graph.getVertex(value);
                            }

                            if (vertex && vertices.indexOf(vertex) == -1) {
                                vertices.push(vertex);
                            }

                        }, this);

                        //
                        nx.each(vertices, function (vertex) {
                            this.attachEvent(vertex);
                        }, this);

                        this.draw();


                    }
                    this._nodes = value;
                }
            },
            vertices: {
                value: function () {
                    return [];
                }
            },
            /**
             * Shape's color
             * @property color
             */
            color: {

            },
            /**
             * Group's label
             * @property label
             */
            label: {

            },
            blockDrawing: {
                value: false
            }
        },
        view: {

        },
        methods: {
            attachEvent: function (vertex) {
                vertex.watch('generated', this._draw, this);
                vertex.on('updateCoordinate', this._draw, this);
            },
            detachEvent: function (vertex) {
                vertex.unwatch('generated', this._draw, this);
                vertex.off('updateCoordinate', this._draw, this);
            },
            getNodes: function () {
                var nodes = [];
                var topo = this.topology();
                nx.each(this.vertices(), function (vertex) {
                    if (vertex.generated()) {
                        var node = topo.getNode(vertex.id());
                        if (node) {
                            nodes.push(node);
                        }
                    }
                });
                return nodes;
            },
            addNode: function (value) {
                var vertex;
                var topo = this.topology();
                var graph = topo.graph();
                var vertices = this.vertices();

                if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                    vertex = value.model();
                } else if (graph.getVertex(value)) {
                    vertex = graph.getVertex(value);
                }

                if (vertex && vertices.indexOf(vertex) == -1) {
                    vertices.push(vertex);
                    this.attachEvent(vertex);
                    this.draw();
                }

            },
            removeNode: function (value) {
                var vertex;
                var topo = this.topology();
                var graph = topo.graph();
                var vertices = this.vertices();
                var nodes = this.nodes();

                if (nx.is(value, nx.graphic.Topology.AbstractNode)) {
                    vertex = value.model();
                } else if (graph.getVertex(value)) {
                    vertex = graph.getVertex(value);
                }

                if (vertex && vertices.indexOf(vertex) != -1) {
                    vertices.splice(vertices.indexOf(vertex), 1);
                    this.detachEvent(vertex);
                    if (nx.is(nodes, Array)) {
                        var id = vertex.id();
                        var node = topo.getNode(id);
                        if (nodes.indexOf(id) !== -1) {
                            nodes.splice(nodes.indexOf(id), 1);
                        } else if (node && nodes.indexOf(node) !== -1) {
                            nodes.splice(nodes.indexOf(node), 1);
                        } else {
                            //todo throw error
                        }

                    }

                    this.draw();

                }


            },
            _draw: function () {
                if (!this.blockDrawing()) {
                    this.draw();
                }
            },
            draw: function () {
                if (this.getNodes().length === 0) {
                    this.hide();
                } else {
                    this.show();
                }
            },
            updateNodesPosition: function (x, y) {
                var stageScale = this.topology().stageScale();
                nx.each(this.getNodes(), function (node) {
                    node.move(x * stageScale, y * stageScale);
                });
            },
            clear: function () {
                nx.each(this.vertices(), function (vertex) {
                    this.detachEvent(vertex);
                }, this);
                this.vertices([]);
                this.nodes([]);
            },
            dispose: function () {
                this.clear();
                this.inherited();
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    /**
     * Rectangle shape group class
     * @class nx.graphic.Topology.RectGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */


    nx.define('nx.graphic.Topology.RectGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group'
            },
            content: [
                {
                    name: 'shape',
                    type: 'nx.graphic.Rect',
                    props: {
                        'class': 'bg'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
                {
                    name: 'text',
                    type: 'nx.graphic.Group',
                    content: {
                        name: 'label',
                        type: 'nx.graphic.Text',
                        props: {
                            'class': 'groupLabel',
                            text: '{#label}'
                        },
                        events: {
                            'click': '{#_clickLabel}'
                        }
                    }
                }
            ]
        },
        properties: {
        },
        methods: {

            draw: function () {
                this.inherited();
                this.setTransform(0, 0);

                var topo = this.topology();
                var stageScale = topo.stageScale();
                var revisionScale = topo.revisionScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };
                var bound = topo.getBoundByNodes(this.getNodes());
                if (bound == null) {
                    return;
                }
                bound.left -= translate.x;
                bound.top -= translate.y;
                var shape = this.view('shape');
                shape.sets({
                    x: bound.left,
                    y: bound.top,
                    width: bound.width,
                    height: bound.height,
                    fill: this.color(),
                    stroke: this.color(),
                    scale: topo.stageScale()
                });


                var text = this.view('text');


                text.setTransform((bound.left + bound.width / 2) * stageScale, (bound.top - 12) * stageScale, stageScale);
                text.view().dom().setStyle('fill', this.color());

                this.view('label').view().dom().setStyle('font-size', 11);
            },
            _clickLabel: function (sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function (sender, event) {
                event.captureDrag(this.view('shape'),this.topology().stage());
            },
            _dragstart: function (sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragGroup', event);
            },
            _dragend: function (sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    /**
     * Circle shape group class
     * @class nx.graphic.Topology.CircleGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */
    nx.define('nx.graphic.Topology.CircleGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group'
            },
            content: [
                {
                    name: 'shape',
                    type: 'nx.graphic.Circle',
                    props: {
                        'class': 'bg'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
                {
                    name: 'text',
                    type: 'nx.graphic.Group',
                    content: {
                        name: 'label',
                        type: 'nx.graphic.Text',
                        props: {
                            'class': 'groupLabel',
                            text: '{#label}'
                        },
                        events: {
                            'click': '{#_clickLabel}'
                        }
                    }
                }
            ]
        },
        methods: {

            draw: function () {


                this.inherited();
                this.setTransform(0, 0);

                var topo = this.topology();
                var revisionScale = topo.revisionScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };
                var bound = topo.getBoundByNodes(this.getNodes());
                if (bound == null) {
                    return;
                }
                var radius = Math.sqrt(Math.pow(bound.width / 2, 2) + Math.pow(bound.height / 2, 2));

                var shape = this.view('shape');
                shape.sets({
                    cx: bound.left - translate.x + bound.width / 2,
                    cy: bound.top - translate.y + bound.height / 2,
                    r: radius,
                    fill: this.color(),
                    stroke: this.color(),
                    scale: topo.stageScale()
                });


                var text = this.view('text');
                var stageScale = topo.stageScale();
                bound.left -= translate.x;
                bound.top -= translate.y;

                text.setTransform((bound.left + bound.width / 2) * stageScale, (bound.top + bound.height / 2 - radius - 12) * stageScale, stageScale);
                text.view().dom().setStyle('fill', this.color());

                this.view('label').view().dom().setStyle('font-size', 11);


                this.setTransform(0, 0);
            },
            _clickLabel: function (sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function (sender, event) {
                event.captureDrag(this.view('shape'), this.topology().stage());
            },
            _dragstart: function (sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragGroup', event);
            },
            _dragend: function (sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {


    /**
     * Polygon shape group class
     * @class nx.graphic.Topology.PolygonGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */

    nx.define('nx.graphic.Topology.PolygonGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group'
            },
            content: [
                {
                    name: 'shape',
                    type: 'nx.graphic.Polygon',
                    props: {
                        'class': 'bg'
                    },
                    events: {
                        'mousedown': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
                {
                    name: 'text',
                    type: 'nx.graphic.Group',
                    content: {
                        name: 'label',
                        type: 'nx.graphic.Text',
                        props: {
                            'class': 'nodeSetGroupLabel',
                            text: '{#label}',
                            style: {
                                'alignment-baseline': 'central',
                                'text-anchor': 'middle',
                                'font-size': 12
                            }
                        },
                        events: {
                            'click': '{#_clickLabel}'
                        }
                    }
                }
            ],
            events: {
                'mouseenter': '{#_mouseenter}',
                'mouseleave': '{#_mouseleave}'
            }
        },
        properties: {
            shape: {
                get: function () {
                    return this.view('shape');
                }
            }
        },
        methods: {

            draw: function () {

                this.inherited();
                this.setTransform(0, 0);


                var topo = this.topology();
                var stageScale = topo.stageScale();
                var revisionScale = topo.revisionScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };
                var vectorArray = [];
                nx.each(this.getNodes(), function (node) {
                    if (node.visible()) {
                        vectorArray.push({x: node.model().x(), y: node.model().y()});
                    }
                });
                var shape = this.view('shape');

                shape.sets({
                    fill: this.color()
                });
                shape.dom().setStyle('stroke', this.color());
                shape.dom().setStyle('stroke-width', 60 * stageScale * revisionScale);
                shape.nodes(vectorArray);


                var bound = topo.getInsideBound(shape.getBound());
                bound.left -= translate.x;
                bound.top -= translate.y;
                bound.left *= stageScale;
                bound.top *= stageScale;
                bound.width *= stageScale;
                bound.height *= stageScale;


                var text = this.view('text');
                text.setTransform(bound.left + bound.width / 2, bound.top - 40 * stageScale * revisionScale, stageScale);

                this.view('label').view().dom().setStyle('font-size', 11);

                text.view().dom().setStyle('fill', this.color());
            },
            _clickLabel: function (sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function (sender, event) {
                event.captureDrag(this.view('shape'),this.topology().stage());
            },
            _dragstart: function (sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragGroup', event);
            },
            _dragend: function (sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {


    /**
     * Polygon shape group class
     * @class nx.graphic.Topology.PolygonGroup
     * @extend nx.graphic.Topology.GroupItem
     * @module nx.graphic.Topology.Group
     *
     */

    nx.define('nx.graphic.Topology.NodeSetPolygonGroup', nx.graphic.Topology.GroupItem, {
        events: ['dragGroupStart', 'dragGroup', 'dragGroupEnd', 'clickGroupLabel', 'enterGroup', 'leaveGroup', 'collapseNodeSetGroup'],
        view: {
            type: 'nx.graphic.Group',
            props: {
                'class': 'group aggregationGroup'
            },
            content: [
                {
                    name: 'shape',
                    type: 'nx.graphic.Polygon',
                    props: {
                        'class': 'bg'
                    }
                },
                {
                    name: 'icons',
                    type: 'nx.graphic.Group',
                    content: [
                        {
                            name: 'minus',
                            type: 'nx.graphic.Group',
                            content: {
                                name: 'minusIcon',
                                type: 'nx.graphic.Icon',
                                props: {
                                    iconType: 'collapse'
                                }
                            },
                            events: {
                                'click': '{#_collapse}'
                            }
                        },
                        {
                            name: 'nodeIcon',
                            type: 'nx.graphic.Group',
                            content: {
                                name: 'nodeIconImg',
                                type: 'nx.graphic.Icon',
                                props: {
                                    iconType: 'nodeSet',
                                    scale: 1
                                }
                            }
                        },
                        {
                            name: 'labelContainer',
                            type: 'nx.graphic.Group',
                            content: {
                                name: 'label',
                                type: 'nx.graphic.Text',
                                props: {
                                    'class': 'nodeSetGroupLabel',
                                    text: '{#label}',
                                    style: {
                                        'alignment-baseline': 'central',
                                        'text-anchor': 'start',
                                        'font-size': 12
                                    },
                                    visible: false
                                },
                                events: {
                                    'click': '{#_clickLabel}'
                                }
                            },
                            events: {

                            }
                        }
                    ],
                    events: {
                        'mouseenter': '{#_mouseenter}',
                        'mouseleave': '{#_mouseleave}',
                        'mousedown': '{#_mousedown}',
                        'dragstart': '{#_dragstart}',
                        'dragmove': '{#_drag}',
                        'dragend': '{#_dragend}'
                    }
                },
//                {
//                    name: 'bg',
//                    type: 'nx.graphic.Rect',
//                    props: {
//                        fill: '#f00',
//                        'opacity': '0.1'
//                    }
//                }

            ]
        },
        properties: {
            nodeSet: {},
            topology: {},
            opacity: {
                set: function (value) {
                    var opacity = Math.max(value, 0.1);
//                    this.view('shape').dom().setStyle('opacity', opacity);
//                    this.view('minus').dom().setStyle('opacity', opacity);
//                    this.view('nodeIcon').dom().setStyle('opacity', opacity);
//                    this.view('labelContainer').dom().setStyle('opacity', opacity);
                    this._opacity = value;
                }
            },
            shape: {
                get: function () {
                    return this.view('shape');
                }
            }
//            color: {
//                set: function (value) {
//                    var text = this.view('labelContainer');
//                    text.view().dom().setStyle('fill', value);
//                    var shape = this.view('shape');
//                    shape.sets({
//                        fill: value
//                    });
//                    shape.dom().setStyle('stroke', value);
//                    this._color = value;
//                }
//            }
        },
        methods: {
            draw: function () {
                this.inherited();
                this.setTransform(0, 0);

                var topo = this.topology();
                var stageScale = topo.stageScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };


                var vectorArray = [];
                nx.each(this.getNodes(), function (node) {
                    if (node.visible()) {
                        vectorArray.push({x: node.model().x(), y: node.model().y()});
                    }
                });
                var shape = this.view('shape');
//                shape.sets({
//                    fill: this.color()
//                });
//                shape.dom().setStyle('stroke', this.color());
                //
                shape.nodes(vectorArray);

                var bound = topo.getInsideBound(shape.getBound());
                bound.left -= translate.x;
                bound.top -= translate.y;
                bound.left *= stageScale;
                bound.top *= stageScale;
                bound.width *= stageScale;
                bound.height *= stageScale;

//                this.view('bg').sets({
//                    x: bound.left,
//                    y: bound.top,
//                    width: bound.width,
//                    height: bound.height
//                });

                var minus = this.view('minus');
                var label = this.view('label');
                var nodeIcon = this.view('nodeIcon');
                var nodeIconImg = this.view('nodeIconImg');
                var labelContainer = this.view('labelContainer');


                if (topo.showIcon() && topo.revisionScale() > 0.6) {

                    shape.dom().setStyle('stroke-width', 60 * stageScale);


                    nodeIconImg.set('iconType', this.nodeSet().iconType());
//                    nodeIconImg.set('color', this.color());

                    var iconSize = nodeIconImg.size();

                    nodeIcon.visible(true);

                    if (nx.util.isFirefox()) {
                        minus.setTransform(bound.left + bound.width / 2, bound.top - iconSize.height * stageScale / 2 + 8 * stageScale, 1 * stageScale);
                        nodeIcon.setTransform(bound.left + bound.width / 2 + 3 * stageScale + iconSize.width * stageScale / 2, bound.top - iconSize.height * stageScale / 2 - 0 * stageScale, 0.5 * stageScale);


                    }else{
                        minus.setTransform(bound.left + bound.width / 2, bound.top - iconSize.height * stageScale / 2 - 22 * stageScale, 1 * stageScale);
                        nodeIcon.setTransform(bound.left + bound.width / 2 + 3 * stageScale + iconSize.width * stageScale / 2, bound.top - iconSize.height * stageScale / 2 - 22 * stageScale, 0.5 * stageScale);
                    }




                    label.sets({
                        x: bound.left + bound.width / 2 - 3 * stageScale + iconSize.width * stageScale,
                        y: bound.top - iconSize.height * stageScale / 2 - 22 * stageScale
                    });
                    label.view().dom().setStyle('font-size', 16 * stageScale);
//                    labelContainer.view().dom().setStyle('fill', this.color());

                } else {

                    shape.dom().setStyle('stroke-width', 30 * stageScale);

                    if (nx.util.isFirefox()) {
                        minus.setTransform(bound.left + bound.width / 2, bound.top - 29 * stageScale / 2, stageScale);
                    }else{
                        minus.setTransform(bound.left + bound.width / 2, bound.top - 45 * stageScale / 2, stageScale);
                    }

                    nodeIcon.visible(false);

                    label.sets({
                        x: bound.left + bound.width / 2 + 12 * stageScale,
                        y: bound.top - 45 * stageScale / 2
                    });
                    label.view().dom().setStyle('font-size', 16 * stageScale);

                }


//                this.view('minusIcon').color(this.color());

            },
            _clickLabel: function (sender, event) {
                this.fire('clickGroupLabel');
            },
            _mousedown: function (sender, event) {
                event.captureDrag(this.view('icons'),this.topology().stage());
            },
            _dragstart: function (sender, event) {
                this.blockDrawing(true);
                this.fire('dragGroupStart', event);
            },
            _drag: function (sender, event) {
                this.fire('dragGroup', event);
            },
            _dragend: function (sender, event) {
                this.blockDrawing(false);
                this.fire('dragGroupEnd', event);

            },
            _collapse: function () {
                this.fire('collapseNodeSetGroup', event);
            },
            _mouseenter: function (sender, event) {
                this.fire('enterGroup');
            },
            _mouseleave: function (sender, event) {
                this.fire('leaveGroup');
            }
        }
    });


})(nx, nx.global);







(function (nx, global) {

    var Vector = nx.geometry.Vector;
    var Line = nx.geometry.Line;
    var colorIndex = 0;
    var colorTable = ['#b2e47f', '#e4e47f', '#bec2f9', '#b6def7', '#89f0de'];
    /**
     * A nextTopology path class
     Path's background colors : ['#b2e47f', '#e4e47f', '#bec2f9', '#b6def7', '#89f0de']
     * @class nx.graphic.Topology.Path
     * @extend nx.graphic.Component
     * @module nx.graphic.Topology
     */

    nx.define("nx.graphic.Topology.Path", nx.graphic.Component, {
        view: {
            type: 'nx.graphic.Group',
            content: {
                name: 'path',
                type: 'nx.graphic.Path'
            }
        },
        properties: {
            /**
             * get/set links's style ,default value is
             value: {
                    'stroke': '#666',
                    'stroke-width': '1px'
                }

             * @property pathStyle
             */
            pathStyle: {
                value: {
                    'stroke': '#666',
                    'stroke-width': '0px'
                }
            },
            /**
             * Get/set a path's width
             * @property pathWidth
             */
            pathWidth: {
                value: "auto"
            },
            /**
             * Get/set a path's offset
             * @property pathGutter
             */
            pathGutter: {
                value: 13
            },
            /**
             * Get/set a path's padding to a node
             * @property pathPadding
             */
            pathPadding: {
                value: "auto"
            },
            /**
             * Get/set path arrow type , 'none'/'cap'/'full'/'end'
             * @property
             */
            arrow: {
                value: 'none'
            },
            /**
             * Get/set links to draw a path pver it
             * @property links
             */
            links: {
                value: [],
                set: function (value) {
                    this._links = value;
                    this.edgeIdCollection().clear();
                    var edges = [];
                    if (nx.is(value, "Array") || nx.is(value, nx.data.Collection)) {
                        nx.each(value, function (item) {
                            edges.push(item.model().id());
                        }.bind(this));
                        this.edgeIdCollection().addRange(edges);
                    }
                    this.draw();
                }
            },
            edgeIdCollection: {
                value: function () {
                    var allEdges, collection = new nx.data.ObservableCollection();
                    var watcher = function (pname, pvalue) {
                        this.draw();
                    }.bind(this);
                    collection.on("change", function (sender, evt) {
                        var waitForTopology = function (pname, pvalue) {
                            if (!pvalue) {
                                return;
                            }
                            this.unwatch("topology", waitForTopology);
                            allEdges = allEdges || nx.path(this, "topology.graph.edges");
                            verticesIdCollection = this.verticesIdCollection();
                            var diff = [];
                            if (evt.action === "add") {
                                nx.each(evt.items, function (item) {
                                    var edge = allEdges.getItem(item);
                                    edge.watch("generated", watcher);
                                    diff.push(edge.sourceID());
                                    diff.push(edge.targetID());
                                }.bind(this));
                                // update vertices
                                nx.each(diff, function (id) {
                                    if (!verticesIdCollection.contains(id)) {
                                        verticesIdCollection.add(id);
                                    }
                                });
                            } else {
                                nx.each(evt.items, function (item) {
                                    var edge = allEdges.getItem(item);
                                    edge.unwatch("generated", watcher);
                                }.bind(this));
                                // update vertices
                                // TODO improve this algorithm
                                verticesIdCollection.clear();
                                nx.each(collection, function (id) {
                                    var edge = allEdges.getItem(id);
                                    if (verticesIdCollection.contains(edge.sourceID())) {
                                        verticesIdCollection.add(edge.sourceID());
                                    }
                                    if (verticesIdCollection.contains(edge.targetID())) {
                                        verticesIdCollection.add(edge.targetID());
                                    }
                                }.bind(this));
                            }
                        }.bind(this);
                        if (!this.topology()) {
                            this.watch("topology", waitForTopology);
                        } else {
                            waitForTopology("topology", this.topology());
                        }
                    }.bind(this));
                    return collection;
                }
            },
            verticesIdCollection: {
                value: function () {
                    var allVertices, collection = new nx.data.ObservableCollection();
                    var watcher = function (pname, pvalue) {
                        this.draw();
                    }.bind(this);
                    collection.on("change", function (sender, evt) {
                        allVertices = allVertices || nx.path(this, "topology.graph.vertices");
                        if (evt.action === "add") {
                            nx.each(evt.items, function (item) {
                                var vertex = allVertices.getItem(item);
                                vertex.watch("position", watcher);
                            }.bind(this));
                        } else {
                            nx.each(evt.items, function (item) {
                                var vertex = allVertices.getItem(item);
                                vertex.unwatch("position", watcher);
                            }.bind(this));
                        }
                    }.bind(this));
                    return collection;
                }
            },
            /**
             * Reverse path direction
             * @property reverse
             */
            reverse: {
                value: false
            },
            owner: {

            },
            topology: {}
        },
        methods: {
            init: function (props) {
                this.inherited(props);
                var pathStyle = this.pathStyle();
                this.view("path").sets(pathStyle);

                if (!pathStyle.fill) {
                    this.view("path").setStyle("fill", colorTable[colorIndex++ % 5]);
                }

            },
            /**
             * Draw a path,internal
             * @method draw
             */
            draw: function () {
                if (!this.topology()) {
                    return;
                }
                var generated = true,
                    topo = this.topology(),
                    allEdges = nx.path(this, "topology.graph.edges"),
                    allVertices = nx.path(this, "topology.graph.vertices");
                nx.each(this.verticesIdCollection(), function (id) {
                    var item = allVertices.getItem(id);
                    if (!item.generated()) {
                        generated = false;
                        return false;
                    }
                }.bind(this));
                nx.each(this.edgeIdCollection(), function (id) {
                    var item = allEdges.getItem(id);
                    if (!item.generated()) {
                        generated = false;
                        return false;
                    }
                }.bind(this));
                if (!generated) {
                    this.view("path").set('d', "M0 0");
                    return;
                }

                var link, line1, line2, pt, d1 = [],
                    d2 = [];
                var stageScale = this.topology().stageScale();
                var pathWidth = this.pathWidth();
                var pathPadding = this.pathPadding();
                var paddingStart, paddingEnd;
                var arrow = this.arrow();
                var v1, v2;


                var edgeIds = this.edgeIdCollection();
                var links = [];
                nx.each(edgeIds, function (id) {
                    links.push(topo.getLink(id));
                });
                var linksSequentialArray = this._serializeLinks(links);
                var count = links.length;

                //first
                var firstLink = links[0];

                var offset = firstLink.getOffset();
                if (firstLink.reverse()) {
                    offset *= -1;
                }

                offset = new Vector(0, this.reverse() ? offset * -1 : offset);

                line1 = linksSequentialArray[0].translate(offset);


                if (pathPadding === "auto") {
                    paddingStart = Math.min(firstLink.sourceNode().showIcon() ? 24 : 4, line1.length() / 4 / stageScale);
                    paddingEnd = Math.min(firstLink.targetNode().showIcon() ? 24 : 4, line1.length() / 4 / stageScale);
                } else if (nx.is(pathPadding, 'Array')) {
                    paddingStart = pathPadding[0];
                    paddingEnd = pathPadding[1];
                } else {
                    paddingStart = paddingEnd = pathPadding;
                }
                if (typeof paddingStart == 'string' && paddingStart.indexOf('%') > 0) {
                    paddingStart = line1.length() * stageScale * parseInt(paddingStart, 10) / 100 / stageScale;
                }

                if (pathWidth === "auto") {
                    pathWidth = Math.min(10, Math.max(3, Math.round(3 / stageScale))); //3/stageScale
                }
                v1 = new Vector(0, pathWidth / 2 * stageScale);
                v2 = new Vector(0, -pathWidth / 2 * stageScale);

                paddingStart *= stageScale;

                pt = line1.translate(v1).pad(paddingStart, 0).start;
                d1.push('M', pt.x, pt.y);
                pt = line1.translate(v2).pad(paddingStart, 0).start;
                d2.unshift('L', pt.x, pt.y, 'Z');

                if (links.length > 1) {
                    for (var i = 1; i < count; i++) {
                        link = links[i];
                        line2 = linksSequentialArray[i].translate(new Vector(0, link.getOffset()));
                        pt = line1.translate(v1).intersection(line2.translate(v1));

                        if (isFinite(pt.x) && isFinite(pt.y)) {
                            d1.push('L', pt.x, pt.y);
                        }
                        pt = line1.translate(v2).intersection(line2.translate(v2));
                        if (isFinite(pt.x) && isFinite(pt.y)) {
                            d2.unshift('L', pt.x, pt.y);
                        }
                        line1 = line2;
                    }
                } else {
                    line2 = line1;
                }

                if (typeof paddingEnd == 'string' && paddingEnd.indexOf('%') > 0) {
                    paddingEnd = line2.length() * parseInt(paddingEnd, 10) / 100 / stageScale;
                }

                paddingEnd *= stageScale;

                if (arrow == 'cap') {
                    pt = line2.translate(v1).pad(0, 2.5 * pathWidth + paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                    pt = pt.add(line2.normal().multiply(pathWidth / 2));
                    d1.push('L', pt.x, pt.y);

                    pt = line2.translate(v2).pad(0, 2.5 * pathWidth + paddingEnd).end;
                    d2.unshift('L', pt.x, pt.y);
                    pt = pt.add(line2.normal().multiply(-pathWidth / 2));
                    d2.unshift('L', pt.x, pt.y);

                    pt = line2.pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                } else if (arrow == 'end') {
                    pt = line2.translate(v1).pad(0, 2 * pathWidth + paddingEnd).end;
                    d1.push('L', pt.x, pt.y);

                    pt = line2.translate(v2).pad(0, 2 * pathWidth + paddingEnd).end;
                    d2.unshift('L', pt.x, pt.y);

                    pt = line2.pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                } else if (arrow == 'full') {
                    pt = line2.pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                } else {
                    pt = line2.translate(v1).pad(0, paddingEnd).end;
                    d1.push('L', pt.x, pt.y);
                    pt = line2.translate(v2).pad(0, paddingEnd).end;
                    d2.unshift('L', pt.x, pt.y);
                }

                this.view("path").set('d', d1.concat(d2).join(' '));
                //this.view("path").setTransform(null, null, this.nextTopology().stageScale());

                //todo
                //                if (links.length == 1) {
                //                    firstLink.view().watch("opacity", function (prop, value) {
                //                        if (this.$ && this.view("path") && this.view("path").opacity) {
                //                            this.view("path").opacity(value);
                //                        }
                //                    }, this);
                //                }
            },

            _serializeLinks: function (links) {
                var linksSequentialArray = [];
                var len = links.length;

                if (this.reverse()) {
                    linksSequentialArray.push(new Line(links[0].targetVector(), links[0].sourceVector()));
                } else {
                    linksSequentialArray.push(new Line(links[0].sourceVector(), links[0].targetVector()));
                }

                for (var i = 1; i < len; i++) {
                    var firstLink = links[i - 1];
                    var secondLink = links[i];
                    var firstLinkSourceVector = firstLink.sourceVector();
                    var firstLinkTargetVector = firstLink.targetVector();
                    var secondLinkSourceVector = secondLink.sourceVector();
                    var secondLinkTargetVector = secondLink.targetVector();

                    if (firstLink.targetNodeID() == secondLink.sourceNodeID()) {
                        linksSequentialArray.push(new Line(secondLinkSourceVector, secondLinkTargetVector));
                    } else if (firstLink.targetNodeID() == secondLink.targetNodeID()) {
                        linksSequentialArray.push(new Line(secondLinkTargetVector, secondLinkSourceVector));
                    } else if (firstLink.sourceNodeID() == secondLink.sourceNodeID()) {
                        linksSequentialArray.pop();
                        linksSequentialArray.push(new Line(firstLinkTargetVector, firstLinkSourceVector));
                        linksSequentialArray.push(new Line(secondLinkSourceVector, secondLinkTargetVector));
                    } else {
                        linksSequentialArray.pop();
                        linksSequentialArray.push(new Line(firstLinkTargetVector, firstLinkSourceVector));
                        linksSequentialArray.push(new Line(secondLinkTargetVector, secondLinkSourceVector));
                    }
                }

                if (this.reverse()) {
                    linksSequentialArray.reverse();
                }

                return linksSequentialArray;
            },
            isEqual: function (pos1, pos2) {
                return pos1.x == pos2.x && pos1.y == pos2.y;
            },
            dispose: function () {
                nx.each(this.nodes, function (node) {
                    node.off('updateNodeCoordinate', this.draw, this);
                }, this);
                this.inherited();
            }
        }
    });
})(nx, nx.global);

(function (nx, global) {

    nx.define("nx.graphic.Topology.BasePath", nx.graphic.Component, {
        events: [],
        properties: {
            nodes: {},
            pathGenerator: {
                value: function () {
                    return function () {

                    };
                }
            },
            pathStyle: {
                value: function () {
                    return {
                        'stroke': '#666',
                        'stroke-width': 2,
                        fill: 'none'
                    };
                }
            },
            topology: {}
        },
        view: {
            type: 'nx.graphic.Group',
            content: {
                name: 'path',
                type: 'nx.graphic.Path',
                props: {

                }
            }
        },
        methods: {
            attach: function (parent) {
                this.inherited(parent);
                var watcher = this._nodesWatcher = new nx.graphic.Topology.NodeWatcher();
                watcher.observePosition(true);
                watcher.topology(this.topology());
                watcher.updater(this._draw.bind(this));
                watcher.nodes(this.nodes());

                //watcher
                this.view("path").dom().setStyles(this.pathStyle());
            },
            _draw: function () {
                var pathEL = this.view('path');
                var nodes = this._nodesWatcher.getNodes();
                if (nodes.length == this.nodes().length) {
                    var topo = this.topology();
                    var pathStyle = this.pathStyle();
                    var d = this.pathGenerator().call(this);
                    if (d) {
                        pathEL.set('d', d);
                        pathEL.visible(true);
                        var strokeWidth = parseInt(pathStyle['stroke-width'], 10) || 1;
                        pathEL.dom().setStyle('stroke-width', strokeWidth * topo.stageScale());
                    }
                } else {
                    pathEL.visible(false);
                }


            },
            draw: function () {
                this._draw();
            }
        }
    });
})(nx, nx.global);
(function (nx, global) {
    var util = nx.util;
    /**
     * Path layer class
     Could use topo.getLayer("pathLayer") get this
     * @class nx.graphic.Topology.PathLayer
     * @extend nx.graphic.Topology.Layer
     * @module nx.graphic.Topology
     */
    nx.define("nx.graphic.Topology.PathLayer", nx.graphic.Topology.Layer, {
        properties: {

            /**
             * Path array
             * @property paths
             */
            paths: {
                value: function () {
                    return [];
                }
            }
        },
        methods: {
            attach: function (args) {
                this.attach.__super__.apply(this, arguments);
                var topo = this.topology();
                topo.on('zoomend', this._draw, this);
                topo.watch('revisionScale', this._draw, this);

            },
            _draw: function () {
                nx.each(this.paths(), function (path) {
                    path.draw();
                });
            },
            /**
             * Add a path to nextTopology
             * @param path {nx.graphic.Topology.Path}
             * @method addPath
             */
            addPath: function (path) {
                this.paths().push(path);
                path.topology(this.topology());
                path.attach(this);
                path.draw();
            },
            /**
             * Remove a path
             * @method removePath
             * @param path
             */
            removePath: function (path) {
                this.paths().splice(this.paths().indexOf(path), 1);
                path.dispose();
            },
            clear: function () {
                nx.each(this.paths(), function (path) {
                    path.dispose();
                });
                this.paths([]);
                this.inherited();
            },
            dispose: function () {
                this.clear();
                var topo = this.topology();
                topo.off('zoomend', this._draw, this);
                topo.unwatch('revisionScale', this._draw, this);
                this.inherited();
            }
        }
    });


})(nx, nx.global);

(function (nx, global) {


    nx.define("nx.graphic.Topology.Nav", nx.ui.Component, {
        properties: {
            topology: {
                get: function () {
                    return this.owner();
                }
            },
            scale: {},
            showIcon: {
                value: false
            },
            visible: {
                get: function () {
                    return this._visible !== undefined ? this._visible : true;
                },
                set: function (value) {
                    this.view().dom().setStyle("display", value ? "" : "none");
                    this.view().dom().setStyle("pointer-events", value ? "all" : "none");
                    this._visible = value;
                }
            }
        },

        view: {
            props: {
                'class': 'n-topology-nav'
            },
            content: [
                {
                    name:'icons',
                    tag: "ul",
                    content: [
                        {
                            tag: 'li',
                            content: {
                                name: 'mode',
                                tag: 'ul',
                                props: {
                                    'class': 'n-topology-nav-mode'
                                },
                                content: [
                                    {
                                        name: 'selectionMode',
                                        tag: 'li',
                                        content: {
                                            props: {
                                                'class': 'n-icon-selectnode',
                                                title: "Select node mode"
                                            },
                                            tag: 'span'
                                        },
                                        events: {
                                            'mousedown': '{#_switchSelectionMode}',
                                            'touchstart': '{#_switchSelectionMode}'
                                        }

                                    },
                                    {
                                        name: 'moveMode',
                                        tag: 'li',
                                        props: {
                                            'class': 'n-topology-nav-mode-selected'
                                        },
                                        content: {
                                            props: {
                                                'class': 'n-icon-movemode',
                                                title: "Move mode"

                                            },
                                            tag: 'span'
                                        },
                                        events: {
                                            'mousedown': '{#_switchMoveMode}',
                                            'touchstart': '{#_switchMoveMode}'
                                        }

                                    }
                                ]
                            }
                        },
                        {
                            tag: 'li',
                            props: {
                                'class': 'n-topology-nav-zoom'
                            },
                            content: [
                                {
                                    name: 'zoomin',
                                    tag: 'span',
                                    props: {
                                        'class': 'n-topology-nav-zoom-in n-icon-zoomin-plus',
                                        title: "Zoom out"
                                    },
                                    events: {
                                        'click': '{#_in}'
                                    }
                                },
                                {
                                    name: 'zoomout',
                                    tag: 'span',
                                    props: {
                                        'class': 'n-topology-nav-zoom-out n-icon-zoomout-minus',
                                        title: "Zoom in"
                                    },
                                    events: {
                                        'click': '{#_out}'
                                    }
                                }

                            ]
                        },
                        {
                            tag: 'li',
                            name: 'zoomselection',
                            props: {
                                'class': 'n-topology-nav-zoom-selection n-icon-zoombyselection',
                                title: "Zoom by selection"
                            },
                            events: {
                                'click': '{#_zoombyselection}'
                            }
                        },
                        {
                            tag: 'li',
                            name: 'fit',
                            props: {
                                'class': 'n-topology-nav-fit n-icon-fitstage',
                                title: "Fit stage"
                            },
                            events: {
                                'click': '{#_fit}'
                            }
                        },
//                        {
//                            tag: 'li',
//                            name: 'agr',
//                            props: {
//                                'class': 'n-topology-nav-agr',
//                                title: "Aggregation"
//                            },
//                            content: [
//                                {
//                                    tag: 'span',
//                                    props: {
//                                        'class': 'glyphicon glyphicon-certificate   agr-icon'
//                                    }
//                                },
//                                {
//                                    tag: 'span',
//                                    content: 'A',
//                                    props: {
//                                        'class': 'agr-text'
//                                    }
//                                }
//                            ],
//                            events: {
//                                'click': '{#_agr}'
//                            }
//                        },



                        {
                            tag: 'li',
                            name: 'agr',
                            props: {
                                'class': 'n-topology-nav-agr n-icon-aggregation',
                                title: 'Aggregation'
                            },
                            events: {
                                'click': '{#_agr}'
                            }
                        },
                        {
                            tag: 'li',
                            name: 'fullscreen',
                            props: {
                                'class': 'n-topology-nav-full n-icon-fullscreen',
                                title: 'Enter full screen mode'
                            },
                            events: {
                                'click': '{#_full}'
                            }
                        },
                        {
                            tag: 'li',
                            name: 'setting',
                            content: [
                                {
                                    name: 'icon',
                                    tag: 'span',
                                    props: {
                                        'class': 'n-topology-nav-setting-icon n-icon-viewsetting'
                                    },
                                    events: {
                                        mouseenter: "{#_openPopover}",
                                        mouseleave: "{#_closePopover}"
                                    }
                                },
                                {
                                    name: 'settingPopover',
                                    type: 'nx.ui.Popover',
                                    props: {
                                        title: 'Topology Setting',
                                        direction: "right",
                                        lazyClose: true
                                    },
                                    content: [
                                        {
                                            tag: 'h5',
                                            content: "Display icons as dots :"
                                        },
                                        {
                                            tag: 'label',
                                            content: [
                                                {
                                                    tag: 'input',
                                                    props: {
                                                        type: 'radio',
                                                        checked: '{#showIcon,converter=inverted,direction=<>}'
                                                    }
                                                },
                                                {
                                                    tag: 'span',
                                                    content: "Always"
                                                }
                                            ],
                                            props: {
                                                'class': 'radio-inline'
                                            }
                                        },
                                        {
                                            tag: 'label',
                                            content: [
                                                {
                                                    tag: 'input',
                                                    props: {
                                                        type: 'radio',
                                                        checked: '{#showIcon,direction=<>}'
                                                    }
                                                },
                                                {
                                                    tag: 'span',
                                                    content: "Auto-resize"
                                                }
                                            ],
                                            props: {
                                                'class': 'radio-inline'
                                            }
                                        },
                                        {
                                            name: 'displayLabelSetting',
                                            tag: 'h5',
                                            content: [
                                                {
                                                    tag: 'span',
                                                    content: 'Display Label : '
                                                },
                                                {
                                                    tag: 'input',
                                                    props: {
                                                        'class': 'toggleLabelCheckBox',
                                                        type: 'checkbox',
                                                        checked: true
                                                    },
                                                    events: {
                                                        click: '{#_toggleNodeLabel}'
                                                    }
                                                }
                                            ]
                                        },
                                        {
                                            tag: 'h5',
                                            content: "Theme :"
                                        },
                                        {

                                            props: {
                                                'class': 'btn-group'
                                            },
                                            content: [
                                                {
                                                    tag: 'button',
                                                    props: {
                                                        'class': 'btn btn-default',
                                                        value: 'blue'
                                                    },
                                                    content: "Blue"
                                                },
                                                {
                                                    tag: 'button',
                                                    props: {
                                                        'class': 'btn btn-default',
                                                        value: 'green'
                                                    },
                                                    content: "Green"
                                                },
                                                {
                                                    tag: 'button',
                                                    props: {
                                                        'class': 'btn btn-default',
                                                        value: 'dark'
                                                    },
                                                    content: "Dark"
                                                },
                                                {
                                                    tag: 'button',
                                                    props: {
                                                        'class': 'btn btn-default',
                                                        value: 'slate'
                                                    },
                                                    content: "Slate"
                                                },
                                                {
                                                    tag: 'button',
                                                    props: {
                                                        'class': 'btn btn-default',
                                                        value: 'yellow'
                                                    },
                                                    content: "Yellow"
                                                }

                                            ],
                                            events: {
                                                'click': '{#_switchTheme}'
                                            }
                                        },
                                        {
                                            name: 'customize'
                                        }
                                    ],
                                    events: {
                                        'open': '{#_openSettingPanel}',
                                        'close': '{#_closeSettingPanel}'
                                    }
                                }
                            ],
                            props: {
                                'class': 'n-topology-nav-setting'
                            }
                        }
                    ]
                }
            ]
        },
        methods: {
            init: function (args) {
                this.inherited(args);


                this.view('settingPopover').view().dom().addClass('n-topology-setting-panel');


                if (window.top.frames.length) {
                    this.view("fullscreen").style().set("display", 'none');
                }
            },
            attach: function (args) {
                this.inherited(args);
                var topo = this.topology();
                topo.watch('scale', function (prop, scale) {
                    var maxScale = topo.maxScale();
                    var minScale = topo.minScale();
                    var navBall = this.view("zoomball").view();
                    var step = 65 / (maxScale - minScale);
                    navBall.setStyles({
                        top: 72 - (scale - minScale) * step + 14
                    });
                }, this);

                topo.selectedNodes().watch('count', function (prop, value) {
                    this.view('agr').dom().setStyle('display', value > 1 ? 'block' : 'none');
                }, this);

                topo.watch('currentSceneName', function (prop, currentSceneName) {
                    if (currentSceneName == 'selection') {
                        this.view("selectionMode").dom().addClass("n-topology-nav-mode-selected");
                        this.view("moveMode").dom().removeClass("n-topology-nav-mode-selected");
                    } else {
                        this.view("selectionMode").dom().removeClass("n-topology-nav-mode-selected");
                        this.view("moveMode").dom().addClass("n-topology-nav-mode-selected");
                    }
                }, this);


                this.view('agr').dom().setStyle('display', 'none');

            },
            _switchSelectionMode: function (sender, event) {
                var topo = this.topology();
                var currentSceneName = topo.currentSceneName();
                if (currentSceneName != 'selection') {
                    topo.activateScene('selection');
                    this._prevSceneName = currentSceneName;
                }
            },
            _switchMoveMode: function (sender, event) {
                var topo = this.topology();
                var currentSceneName = topo.currentSceneName();
                if (currentSceneName == 'selection') {
                    topo.activateScene(this._prevSceneName || 'default');
                    this._prevSceneName = null;
                }
            },
            _fit: function (sender, event) {
                if (!this._fitTimer) {
                    this.topology().fit();

                    sender.dom().setStyle('opacity', '0.1');
                    this._fitTimer = true;
                    setTimeout(function () {
                        sender.dom().setStyle('opacity', '1');
                        this._fitTimer = false;
                    }.bind(this), 1200);
                }
            },
            _zoombyselection: function (sender, event) {
                var icon = sender;
                var topo = this.topology();
                var currentSceneName = topo.currentSceneName();

                if (currentSceneName == 'zoomBySelection') {
                    icon.dom().removeClass('n-topology-nav-zoom-selection-selected');
                    topo.activateScene('default');
                } else {
                    var scene = topo.activateScene('zoomBySelection');
                    scene.upon('finish', function fn(sender, bound) {
                        if (bound) {
                            topo.zoomByBound(topo.getInsideBound(bound));
                        }
                        topo.activateScene(currentSceneName);
                        icon.dom().removeClass('n-topology-nav-zoom-selection-selected');
                        scene.off('finish', fn, this);
                    }, this);
                    icon.dom().addClass('n-topology-nav-zoom-selection-selected');
                }
            },
            _in: function (sender, event) {
                var topo = this.topology();
                topo.stage().zoom(1.2, topo.adjustLayout, topo);
                event.preventDefault();
            },
            _out: function (sender, event) {
                var topo = this.topology();
                topo.stage().zoom(0.8, topo.adjustLayout, topo);
                event.preventDefault();
            },
            _full: function (sender,event) {
                this.toggleFull(event.target);
            },
            _enterSetting: function (event) {
                this.view("setting").addClass("n-topology-nav-setting-open");
            },
            _leaveSetting: function (event) {
                this.view("setting").removeClass("n-topology-nav-setting-open");
            },
            cancelFullScreen: function (el) {
                var requestMethod = el.cancelFullScreen || el.webkitCancelFullScreen || el.mozCancelFullScreen || el.exitFullscreen;
                if (requestMethod) { // cancel full screen.
                    requestMethod.call(el);
                } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
                    var wscript = new ActiveXObject("WScript.Shell");
                    if (wscript !== null) {
                        wscript.SendKeys("{F11}");
                    }
                }
            },
            requestFullScreen: function (el) {
                document.body.webkitRequestFullscreen.call(document.body);
                return false;
            },
            toggleFull: function (el) {
                var elem = document.body; // Make the body go full screen.
                var isInFullScreen = (document.fullScreenElement && document.fullScreenElement !== null) || (document.mozFullScreen || document.webkitIsFullScreen);

                if (isInFullScreen) {
                    this.cancelFullScreen(document);
                    this.fire("leaveFullScreen");
                } else {
                    this.requestFullScreen(elem);
                    this.fire("enterFullScreen");
                }
                return false;
            },

            _openPopover: function (sender, event) {
                this.view("settingPopover").open({
                    target: sender.dom(),
                    offsetY: 3
                });
                this.view('icon').dom().addClass('n-topology-nav-setting-icon-selected');
            },
            _closePopover: function () {
                this.view("settingPopover").close();
            },
            _closeSettingPanel: function () {
                this.view('icon').dom().removeClass('n-topology-nav-setting-icon-selected');
            },
            _switchTheme: function (sender, event) {
                this.topology().theme(event.target.value);
            },
            _toggleNodeLabel: function (sender, events) {
                var checked = sender.get('checked');
                this.topology().eachNode(function (node) {
                    node.labelVisibility(checked);
                });
            },
            _agr: function () {
                var topo = this.topology();
                var nodes = topo.selectedNodes().toArray();
                topo.selectedNodes().clear();
                topo.aggregationNodes(nodes);
            }
        }
    });


})(nx, nx.global);
(function (nx, global) {
    var d = 500;

    /**
     * Thumbnail for nextTopology
     * @class nx.graphic.Topology.Thumbnail
     * @extend nx.ui.Component
     */

    nx.define("nx.graphic.Topology.Thumbnail", nx.ui.Component, {
        events: [],
        view: {
            props: {
                'class': 'n-topology-thumbnail'
            },
            content: {
                props: {
                    'class': 'n-topology-container'
                },
                content: [
                    {
                        name: 'win',
                        props: {
                            'class': 'n-topology-thumbnail-win'
                        }
                    },
                    {
                        name: 'canvas',
                        tag: 'canvas',
                        props: {
                            'class': 'n-topology-thumbnail-canvas'
                        }
                    }
                ]
            }

        },
        properties: {
            topology: {},
            width: {
                set: function (value) {
                    this.view().dom().setStyles({
                        width: value * 0.2,
                        left: value * 0.8
                    });

                    this.view('canvas').dom().setStyle('width', value * 0.2);
                    this._drawWin();
                }
            },
            height: {
                set: function (value) {
                    this.view().dom().setStyles({
                        height: value * 0.2,
                        top: value * 0.8
                    });

                    this.view('canvas').dom().setStyle('height', value * 0.2);
                    this._drawWin();
                }
            }
        },
        methods: {
            attach: function (parent, index) {
                this.inherited(parent, index);
                var topo = parent.owner();
                this.topology(topo);


                topo.on('dragStage', this._drawWin, this);
//                topo.on('dragStage', this._drawTopo, this);
                topo.stage().watch('zoomLevel', this._drawWin, this);


                topo.on('topologyGenerated', function () {
                    var graph = topo.graph();
                    graph.on('addVertex', this._drawTopo, this);
                    graph.on('removeVertex', this._drawTopo, this);
                    graph.on('updateVertexCoordinate', this._drawTopo, this);

                    this._drawTopo();
                }, this);


            },
            _drawWin: function () {
                var topo = this.topology();
                if (!topo) {
                    return;
                }


                var width = topo.width() * 0.2;
                var height = topo.height() * 0.2;
                var zoomLevel = topo.stage().zoomLevel();
                var stageBound = topo.stage().scalingLayer().getBound();
                this.view('win').dom().setStyles({
                    width: width / zoomLevel,
                    height: height / zoomLevel,
                    top: (stageBound.top - (topo.height() - stageBound.height) / 2) * 0.2,
                    left: (stageBound.left - (topo.width() - stageBound.width) / 2) * 0.2
                });


                if (zoomLevel >= 1) {

                }

            },
            _drawTopo: function () {
                var topo = this.topology();
                if (!topo) {
                    return;
                }


                var width = topo.width() * 0.2;
                var height = topo.height() * 0.2;
                var translateX = 0;
                var translateY = 0;
                var canvas = this.view('canvas').dom().$dom;
                var ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, width * 2, height * 2);

                topo.eachNode(function (node) {
                    ctx.fillStyle = '#26A1C5';
                    ctx.fillRect(node.x() * 0.2 + translateX, node.y() * 0.2 + translateY, 3, 3);
                });


            }
        }
    });


})(nx, nx.global);
(function (nx, global) {

    var OptimizeLabel = nx.define({
        events: [],
        properties: {
        },
        methods: {
            init: function () {
                console.log();
            },
            optimizeLabel: function (sender, args) {

                if (console) {
                    console.time('optimizeLabel');
                }


                var topo = this;
                var stageScale = topo.stageScale();
                var translate = {
                    x: topo.matrix().x(),
                    y: topo.matrix().y()
                };

                topo.eachNode(function (node) {
                    node.enableSmartLabel(true);
                    node.calcLabelPosition(true);
                });


                var boundCollection = {};
                topo.eachNode(function (node, id) {
                    if (node.view().visible()) {
                        var bound = topo.getInsideBound(node.getBound());
                        var nodeBound = {
                            left: bound.left * stageScale - translate.x * stageScale,
                            top: bound.top * stageScale - translate.y * stageScale,
                            width: bound.width * stageScale,
                            height: bound.height * stageScale
                        };
                        boundCollection[id] = nodeBound;

                        //test
//                        var rect = new nx.graphic.Rect(nodeBound);
//                        rect.sets({
//                            stroke: '#f00',
//                            fill: 'none',
//                            x: nodeBound.left,
//                            y: nodeBound.top
//                        });
//
//                        rect.attach(topo.stage());
                    }

                });

                var boundHitTest = nx.util.boundHitTest;

                topo.eachNode(function (node) {
                    if (node.view().visible()) {
                        var bound = topo.getInsideBound(node.view('label').getBound());
                        var labelBound = {
                            left: bound.left * stageScale - translate.x * stageScale,
                            top: bound.top * stageScale - translate.y * stageScale,
                            width: bound.width * stageScale,
                            height: bound.height * stageScale
                        };

//                        var labelrect = new nx.graphic.Rect(labelBound);
//                        labelrect.sets({
//                            stroke: '#f50',
//                            fill: 'none',
//                            x: labelBound.left,
//                            y: labelBound.top
//                        });
//                        labelrect.attach(topo.stage());


                        var labelOverlap = false;
                        nx.each(boundCollection, function (nodeBound, id) {
                            if (id == node.id()) {
                                return;
                            }
//                            if (rect) {
//                                rect.dispose();
//                            }
//                            var rect = new nx.graphic.Rect(nodeBound);
//                            rect.sets({
//                                stroke: '#f00',
//                                fill: 'none',
//                                x: nodeBound.left,
//                                y: nodeBound.top
//                            });
//
//                            rect.attach(topo.stage());
                            if (boundHitTest(labelBound, nodeBound)) {
                                labelOverlap = true;
                            }
//                            console.log(boundHitTest(labelBound, nodeBound), node.label());
                        });

                        if (labelOverlap) {
                            node.labelAngle(90);
                            node.enableSmartLabel(false);
                            node.calcLabelPosition(true);
                        }
                    }

                });


                if (console) {
                    console.timeEnd('optimizeLabel');
                }

            }
        }
    });


    nx.graphic.Topology.registerExtension(OptimizeLabel);


})(nx, nx.global);
(function (nx, global) {

    var FillStage = nx.define({
        methods: {
            fillStage: function () {
                this.fit(null, null, false);

                var width = this.width();
                var height = this.height();
                var padding = this.padding() / 3;
                var graphicBound = this.getBoundByNodes();

                //scale
                var xRate = (width - padding * 2) / graphicBound.width;
                var yRate = (height - padding * 2) / graphicBound.height;


                var topoMatrix = this.matrix();
                var stageScale = topoMatrix.scale();


                this.graph().vertexSets().each(function (item) {
                    var vs = item.value();
                    if (vs.generated() && vs.activated()) {
                        var position = vs.position();
                        var absolutePosition = {
                            x: position.x * stageScale + topoMatrix.x(),
                            y: position.y * stageScale + topoMatrix.y()
                        };

                        vs.position({
                            x: ((absolutePosition.x - graphicBound.left) * xRate + padding - topoMatrix.x()) / stageScale,
                            y: ((absolutePosition.y - graphicBound.top) * yRate + padding - topoMatrix.y()) / stageScale
                        });
                    }
                });


                this.graph().vertices().each(function (item) {
                    var vertex = item.value();
                    if (vertex.parentVertexSet() == null || !(vertex.parentVertexSet().generated() && vertex.parentVertexSet().activated())) {
                        var position = vertex.position();
                        var absolutePosition = {
                            x: position.x * stageScale + topoMatrix.x(),
                            y: position.y * stageScale + topoMatrix.y()
                        };

                        vertex.position({
                            x: ((absolutePosition.x - graphicBound.left) * xRate + padding - topoMatrix.x()) / stageScale,
                            y: ((absolutePosition.y - graphicBound.top) * yRate + padding - topoMatrix.y()) / stageScale
                        });
                    }
                });


                this.fit(null, null, false);

            }
        }
    });


    nx.graphic.Topology.registerExtension(FillStage);


})(nx, nx.global);
