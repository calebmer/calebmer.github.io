var $body = $('html, body');
var $container = $('#container');
var durationMs = parseInt('{{ site.transition.duration }}');

$container.smoothState({ prefetch: true });
