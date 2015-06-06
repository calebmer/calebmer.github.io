var $body = $('html, body');
var $container = $('#container');
var durationMs = parseFloat($('.scene-element').css('animation-duration')) * 1000;

$container.smoothState({
  prefetch: true,
  onStart: {
    render: function (url) {

      $content.addClass('is-exiting');
      setTimeout(function () { $content.removeClass('is-exiting'); }, durationMs);

      $body.scrollTop(0);
    }
  }
});
