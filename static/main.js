var sock = new WebSocket("ws://" + window.location.hostname + ":" + window.location.port + "/control");


//var GAMEPADS = {};

var MODE_TREADS = 0;
var MODE_DIRECTIONAL = 1;

var STEER_CONF = {
    mode: MODE_TREADS,
    invert: true,
    horizontal: 0,
    vertical: 1,
    left: 1,
    right: 3,
};

var lastLeft = 0, lastRight = 0;

sock.onopen = function() {
}

var KEYS = [false, false, false, false];
var UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3;

sock.onmessage = function(message) {
    console.log(message);
    document.getElementById("output").value += '< ' + message.data;
    document.getElementById("output").scrollTop = document.getElementById("output").scrollHeight;
}

function cmd(value) {
    sock.send(value + "\n");
    document.getElementById("output").value += "> " + value + "\n";
    document.getElementById("output").scrollTop = document.getElementById("output").scrollHeight;
}

function doGuiCmd() {
    cmd(document.getElementById("command-text").value);
    document.getElementById("command-text").value = "";
}

var haveEvents = 'ongamepadconnected' in window;
var controllers = {};

function connecthandler(e) {
  addgamepad(e.gamepad);
}

function addgamepad(gamepad) {
  controllers[gamepad.index] = gamepad;
  requestAnimationFrame(updateStatus);
}

function disconnecthandler(e) {
  removegamepad(e.gamepad);
}

function removegamepad(gamepad) {
  var d = document.getElementById("controller" + gamepad.index);
  document.body.removeChild(d);
  delete controllers[gamepad.index];
}

function getSpeed() {
    return 300;
}

function setMotors(left, right, speed) {
    if (left == 0) {
        cmd("setmotor LWheelDisable");
    }

    if (right == 0) {
        cmd("setmotor RWheelDisable");
    }
    cmd("setmotor " + (left * 100) + " " + (right * 100) + " " + speed + " 60");
}

function doSteering(axes) {
    var curMode = STEER_CONF.mode;

    var right = 0;
    var left = 0;

    if (curMode == MODE_TREADS) {
        left = axes[STEER_CONF.left];
        right = axes[STEER_CONF.right];

        if (STEER_CONF.invert) {
            left = -left;
            right = -right;
        }
    } else if (curMode == MODE_DIRECTIONAL) {
        var x = axes[STEER_CONF.horizontal];
        var y = axes[STEER_CONF.vertical];

        if (STEER_CONF.invert) {
            y = -y;
        }

        console.log("x", x, "y", y);

        if (y == 0) {
            // Straight turning, no forward momentum

            if (x < 0) {
                // turning counterclockwise
                left = -1;
                right = 1;
            } else if (x > 0) {
                // turning clockwise
                left = 1;
                right = -1;
            }
        } else {
            // some forward momentum
            // initially, move in whatever direction we're going
            left = y;
            right = y;

            if (x > 0) {
                // We want to turn to the right
                // reduce the speed of the right tread proportional to
                // how far right the joystick is moved
                right *= (1-Math.abs(x));
            } else if (x < 0) {
                // if going to the left, do the same for the left motor
                left *= (1-Math.abs(x));
            }
        }
    }

    setMotors(left, right, getSpeed() * Math.max(Math.abs(left), Math.abs(right)));
}

function doKeySteering() {
    var x = 0, y = 0;
    var left = 0, right = 0;

    if (KEYS[UP]) y = 1;
    if (KEYS[DOWN]) y = -1;
    if (KEYS[LEFT]) x = -1;
    if (KEYS[RIGHT]) x = 1;

    if (y == 0) {
        if (x < 0) {
            left = -1;
            right = 1;
        } else if (x > 0) {
            left = 1;
            right = -1;
        }
    } else {
        left = y;
        right = y;

        if (x < 0) {
            left *= .5;
        } else if (x > 0) {
            right *= .5;
        }
    }

    setMotors(left, right, getSpeed());
}


function updateStatus() {
  if (!haveEvents) {
    scangamepads();
  }

  var i = 0;
  var j;

  for (j in controllers) {
    var controller = controllers[j];
    /*var d = document.getElementById("controller" + j);
    var buttons = d.getElementsByClassName("button");

    for (i = 0; i < controller.buttons.length; i++) {
      var b = buttons[i];
      var val = controller.buttons[i];
      var pressed = val == 1.0;
      if (typeof(val) == "object") {
        pressed = val.pressed;
        val = val.value;
      }

      var pct = Math.round(val * 100) + "%";
      b.style.backgroundSize = pct + " " + pct;

      if (pressed) {
        b.className = "button pressed";
      } else {
        b.className = "button";
      }
    }

    var axes = d.getElementsByClassName("axis");
    for (i = 0; i < controller.axes.length; i++) {
      var a = axes[i];
      a.innerHTML = i + ": " + controller.axes[i].toFixed(4);
      a.setAttribute("value", controller.axes[i] + 1);
    }*/

      //var left = controller.axes[getLeftAxis()];
      //var right = controller.axes[getRightAxis()];
      doSteering(controller.axes);
  }

  requestAnimationFrame(updateStatus);
}

function scangamepads() {
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
  for (var i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) {
      if (gamepads[i].index in controllers) {
        controllers[gamepads[i].index] = gamepads[i];
      } else {
        addgamepad(gamepads[i]);
      }
    }
  }
}


window.addEventListener("gamepadconnected", connecthandler);
window.addEventListener("gamepaddisconnected", disconnecthandler);

window.onkeydown = function(e) {
    var key = e.keyCode ? e.keyCode : e.which;

    if (key == 38) {
        KEYS[UP] = true;
    } else if (key == 40) {
        KEYS[DOWN] = true;
    } else if (key == 37) {
        KEYS[LEFT] = true;
    } else if (key == 39) {
        KEYS[RIGHT] = true;
    } else {
        return;
    }

    doKeySteering();
};

window.onkeyup = function(e) {
    var key = e.keyCode ? e.keyCode : e.which;

    if (key == 38) {
        KEYS[UP] = false;
    } else if (key == 40) {
        KEYS[DOWN] = false;
    } else if (key == 37) {
        KEYS[LEFT] = false;
    } else if (key == 39) {
        KEYS[RIGHT] = false;
    } else {
        return;
    }

    doKeySteering();
};

if (!haveEvents) {
  setInterval(scangamepads, 500);
}