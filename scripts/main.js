function hangPunctuation() {
  var $this = $(this);
  if ($this.text().match(/^("|“|”)/)) {
    $this.addClass('is-hanging');
  }
}

function rescueOrphans() {
  var $this = $(this);
  var html  = $this.html();
  var words = html.split(' ').length;
  if (words < 5) { return; }
  html = html.replace(/(\S*)\s(\S*)$/, '$1&nbsp;$2');
  $this.html(html);
}

$('p').each(hangPunctuation);
$('h1,h2,h3,p').each(rescueOrphans);
