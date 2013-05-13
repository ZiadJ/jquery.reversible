(function ($) {

    var animationStore = {};

    $.addAnimation = function (key, property, value, options, condition) {
        ///<summary>Creates an animation with a specific key that can be applied using the 
        /// animate funtion or undone using the animateBack function. 
        /// Usage examples:
        ///     .addAnimation('animStretch', 'padding', '+=5')
        ///     .addAnimation('animStretch', 'width', ['+=5', '+=10'], { delay: 'after', animationTime: 100 })
        ///     .addAnimation('animBorder', 'borderRadius', '5,10,15,20', { delay: 100 }) // animationTime automatically fits animation time when not specified.
        ///     .addAnimation('animBorder', 'borderStyle', 'solid', function() { return $(this).css('borderStyle') == ''; })
        ///     .addAnimation('animBorder', 'borderWidth', 1) // a number is ok but a string without the 'px' is not.
        ///     .addAnimation('animBg', 'backgroundColor', '#00AA55') // requires the jQuery.color plugin.
        ///</summary>  
        addAnimation(key, property, value, options, condition, false);
        return this;
    }

    $.fn.addAnimation = function (key, property, value, options, condition) {
        ///<summary>Adds an animation with a specific key to an object that can be applied using the 
        /// animate funtion or undone using the animateBack function. 
        /// Usage examples:
        ///    var prop = {};
        ///    $(prop)
        ///     .addAnimation('animStretch', 'padding', '+=5')
        ///     .addAnimation('animStretch', 'width', ['+=5', '+=10'], { delay: 'after', animationTime: 100 })
        ///     .addAnimation('animBorder', 'borderRadius', '5,10,15,20', { delay: 100 }) // animationTime automatically fits animation time when not specified.
        ///     .addAnimation('animBorder', 'borderStyle', 'solid', function() { return $(this).css('borderStyle') == ''; })
        ///     .addAnimation('animBorder', 'borderWidth', 1) // never use '1' without the 'px';
        ///     .addAnimation('animBg', 'backgroundColor', '#00AA55') // requires the jQuery.color plugin.
        ///</summary>        
        addAnimation(key, property, value, options, condition, false, this);
        return this;
    }

    var rgxUpperCaseOnly = RegExp('([A-Z])');

    var addAnimation = function (key, property, value, options, condition, disableAutoBoxing, target) {

        if ($.isFunction(options)) {
            target = condition;
            condition = options;
            options = {};
        }
        else {
            options = options || {};
        }

        if (disableAutoBoxing !== true) {

            var boxProperties = property.replace(rgxUpperCaseOnly, '-$1').split('-');
            if (boxProperties.length < 2)
                boxProperties.push('');

            // Box properties like margin, border and padding cannot be reliably retrieved or modified when they are not corner specific.
            // To get around this their corner specific counterparts are used instead.
            if (['margin', 'padding', 'border'].indexOf(boxProperties[0].toLowerCase()) > -1) {

                var values = typeof value === 'string'
                    ? value.split(',')
                    : value instanceof Array
                        ? value
                        : [value];

                boxPropSuffix = boxProperties[1].toLowerCase() === 'radius'
                    ? ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft']
                    : ['Top', 'Right', 'Bottom', 'Left'];

                if (values.length < 4) {
                    values.push(values[0]);
                    values.push(values[1]);
                    if (values.length < 4)
                        values.push(values[0]);
                }

                for (var i = 0; i < boxPropSuffix.length; i++)
                    addAnimation(key, boxProperties[0] + boxPropSuffix[i] + (boxProperties[1] || ''), values[i], options, condition, true, target);

                return this;
            }
        }

        var anim = {
            value: value,
            options: options || {},
            condition: condition
        }

        if (target) {
            if (target.data) {
                var targetData = $(target).data(key) || {};
                targetData[property] = anim;
                $(target).data(key, targetData);
            } else {
                if (target[key] === undefined)
                    target[key] = {};
                target[key][property] = anim;
            }
        } else {
            if (animationStore[key] === undefined)
                animationStore[key] = {};
            animationStore[key][property] = anim;
        }

        return this;
    }

    var rgxHasWordWithNoDigit = RegExp('\s[A-z]+\s');

    $.fn._animate = $.fn.animate;

    $.fn.animate = function (propOrKey, animationTime, easing, callBack) {
        ///<summary>Usage example: 
        ///     $('a').animate('someAnimationKey1, someAnimationKey2', 200)
        ///           .animate({ width: 100 }, 200);
        ///</summary>
        if (typeof propOrKey !== 'string')
            return this._animate(propOrKey, animationTime, easing, callBack);


        var keys = propOrKey.split(',');

        return this.each(function () {
            var animations = {}, delayedAnimations = {}, fixedAnimations = {};
            var textualCssBeforeAnimation = {}, numericCssBeforeAnimation = {};

            var $this = $(this);
            var anims, anim;

            for (var i = 0; i < keys.length; i++) {

                anims = $this.data(keys[i].trim()) || animationStore[keys[i].trim()];

                // Create ojects containing syncronously/asynchronously started animations including non 
                // animatable properties after backing up the inital css properties.
                for (var prop in anims) {
                    var value = $this.css(prop), anim = anims[prop];

                    if (anim.condition)
                        if (!anim.condition.call(this, value))
                            break;

                    // Only numerical values with durations more than zero are set using $.animate().
                    if (!rgxHasWordWithNoDigit.test(' ' + anim.value.toString() + ' ')
                        && (anim.options.animationTime === undefined || anim.options.animationTime > 0)) {

                        numericCssBeforeAnimation[prop] = value; // Backup animatable value.

                        if (anim.options.animationTime || anim.options.delay)
                            delayedAnimations[prop] = anim; // Add to delayed animations object.
                        else
                            animations[prop] = anim.value; // Add to synchronous animations object.

                    } else {
                        textualCssBeforeAnimation[prop] = value; // Backup css value.
                        fixedAnimations[prop] = anim; // Add to css properties object.
                    }
                }

                $this.data('beforeAnim_' + keys[i].trim(), {
                    textual: textualCssBeforeAnimation,
                    numeric: numericCssBeforeAnimation
                })
            }

            // Set css values.
            for (var prop in fixedAnimations) {
                var anim = fixedAnimations[prop]
                if (anim.options.delay) {
                    // Set value.
                    setTimeout(function () {
                        $this.css(prop, anim.value);
                    }, anim.options.delay == 'after' ? animationTime : anim.options.delay);
                } else {
                    // Set value synchronously.
                    $this.css(prop, anim.value);
                }
            }

            // Set css via animations.
            $this._animate(animations, animationTime, easing, callBack);

            // Set css via animations with delay.
            for (var prop in delayedAnimations) {
                var anim = delayedAnimations[prop];
                setTimeout(function () {
                    $this._animate(
                        { prop: anim.value },
                        anim.options.animationTime ? anim.options.animationTime : animationTime - anim.options.delay,
                        easing,
                        callBack);
                }, anim.options.delay == 'after' ? animationTime : anim.options.delay);
            }
        });
    }

    $.fn.animateBack = function (key, animationTime, easing, callBack) {
        ///<summary>Usage example: 
        ///     $('a').animateBack('someAnimationKey', 100);
        ///</summary>

        return this.each(function () {
            var $this = $(this);
            var anims, cssBackupKey;
            var keys = key.split(',');

            for (var i = 0; i < keys.length; i++) {
                cssBackupKey = 'beforeAnim_' + keys[i].trim();
                anims = $.extend(true, anims, $this.data(cssBackupKey));
                $this.data(cssBackupKey, '');
            }

            if (anims) {
                for (var prop in anims.textual)
                    $this.css(prop, anims.textual[prop]);

                return $this._animate(anims.numeric, animationTime, easing, callBack);
            }
        });
    }

})(jQuery);
