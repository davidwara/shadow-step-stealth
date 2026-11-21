// Shadow Step — keyboard + mouse input.
export function makeInput(canvas) {
  const keys = new Set();
  let mouse = { x: 0, y: 0, clicked: false };
  const pressed = new Set(); // edge-triggered keys, consumed by main loop

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
    KeyC: 'crouch',
    Space: 'throw',
    KeyE: 'interact',
    KeyR: 'restart',
    KeyM: 'mute',
    Escape: 'pause',
    Enter: 'confirm',
  };

  function onKeyDown(e) {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (['up', 'down', 'left', 'right', 'throw'].includes(action)) e.preventDefault();
    if (!keys.has(action)) pressed.add(action);
    keys.add(action);
  }
  function onKeyUp(e) {
    const action = KEYMAP[e.code];
    if (action) keys.delete(action);
  }
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  }
  function onMouseDown(e) {
    onMouseMove(e);
    mouse.clicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    get up() { return keys.has('up'); },
    get down() { return keys.has('down'); },
    get left() { return keys.has('left'); },
    get right() { return keys.has('right'); },
    get run() { return keys.has('run'); },
    get crouchHeld() { return keys.has('crouch'); },
    get mouse() { return mouse; },
    // True once per physical press; main loop calls this every frame.
    wasPressed(action) {
      if (pressed.has(action)) { pressed.delete(action); return true; }
      return false;
    },
    consumeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
    clearPressed() { pressed.clear(); },
  };
}
