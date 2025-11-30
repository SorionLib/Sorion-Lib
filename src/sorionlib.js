(function(global) {
    'use strict';
    
    const VERSION = '0.1.0';
    
    function SorionLib(selector) {
        if (!(this instanceof SorionLib)) {
            return new SorionLib(selector);
        }
        
        this.elements = [];
        
        if (typeof selector === 'string') {
            const nodeList = document.querySelectorAll(selector);
            this.elements = Array.from(nodeList);
        } else if (selector instanceof Element) {
            this.elements = [selector];
        } else if (selector instanceof NodeList || Array.isArray(selector)) {
            this.elements = Array.from(selector);
        }
        
        this.length = this.elements.length;
        return this;
    }
    
    // Core Methods
    SorionLib.prototype = {
        version: function() {
            return VERSION;
        },
        
        each: function(callback) {
            this.elements.forEach((element, index) => {
                callback.call(element, index, element);
            });
            return this;
        },
        
        addClass: function(className) {
            return this.each(function() {
                this.classList.add(className);
            });
        },
        
        removeClass: function(className) {
            return this.each(function() {
                this.classList.remove(className);
            });
        },
        
        html: function(content) {
            if (content === undefined) {
                return this.elements[0] ? this.elements[0].innerHTML : null;
            }
            return this.each(function() {
                this.innerHTML = content;
            });
        },
        
        on: function(event, handler) {
            return this.each(function() {
                this.addEventListener(event, handler);
            });
        }
    };
    
    // Global exposure
    global.SorionLib = SorionLib;
    
})(window);