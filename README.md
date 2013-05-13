jquery.reversible
=================

A jQuery plugin that assists in the creation of reversible animations. Animations created using .addAnimation can 
be reverted using .animateBack.


###Example usage:

    $.addAnimation('animRounded', 'borderRadius', 4);
    $.addAnimation('animStretch', 'padding', '+=3px');
    $.addAnimation('animStretch', 'borderWidth', '+=3px');
    $.addAnimation('animStretch', 'borderStyle', 'solid');
    $.addAnimation('animColor', 'borderColor', bColor); // Supported by jQuery.color only.

    $(document).on('mouseenter', 'a', function () {
        $(this).stop(false, true)
               .animate('animColor', 350)
               .animate('animStretch, animRounded', 150);
    }).on('mouseleave', selector, function () {
        $(this).stop(true, false)
               .animateBack('animStretch, animColor, animRounded', 350);
    });
