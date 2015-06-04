var durationMs = parseFloat($('.scene-element').css('animation-duration')) * 1000;

var content = $('#container').smoothState({
  prefetch: true,
  onStart: {
    duration: durationMs,
    render: function (url) {
      content.toggleAnimationClass('is-exiting');
      $('html, body').scrollTop(0);
    }
  }
}).data('smoothState');
