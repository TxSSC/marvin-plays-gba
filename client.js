var _xmlHttp = null,
    _url = "http://gba.txssc.com/",
    _debug = true;

window.onload = function () {
  addEventListener('keydown', keyDown);
  addEventListener('keyup', keyUp);
  addEventListener('keypress', keyPress);
}

function sendRequest (push) {
  var _push = null,
      _times = 1;

  _push = push.toUpperCase();

  _xmlHttp = new XMLHttpRequest();
  _xmlHttp.onreadystatechange = processResponse;
  _xmlHttp.open( 'POST', _url, true );
  _xmlHttp.send( 'push='+_push+'&times='+_times );

  return;
}

function processResponse () {
  // DEBUG: SHOW RESPONSE
  if ( _debug )
    console.log( 'RESPONSE STATUS:',_xmlHttp.status );
}

function keyDown (e) {
  var _key = e.charCode || e.keyCode;

  _keymap = {
    38:'UP',
    40:'DOWN',
    37:'LEFT',
    39:'RIGHT',
    88:'A',
    90:'B',
    65:'L',
    83:'R',
    13:'START',
    220:'SELECT',
  }

  if ( _key in _keymap ) {
    sendRequest( _keymap[_key] );
    
    // DEBUG: SHOW KEYCODE
    if ( _debug )
      console.log( _key );
  }
}

function keyUp (e) {
  // Prevent default behaviour of keypresses
  try {
    e.preventDefault();
  }
  catch ( err ) { }
}

function keyPress (e) {
  // Prevent default behaviour of keypresses
  try {
    e.preventDefault();
  }
  catch ( err ) { }
}