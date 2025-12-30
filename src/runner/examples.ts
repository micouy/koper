export const COUNTER_BUTTON_EXAMPLE = `p.setup = () => {
  p.createCanvas(500, 500);

  // Initialize counter if not set
  if (state.get('count') == null) {
    state.set('count', 0);
  }

  // Create increment button
  const btn = p.createButton('Increment');
  btn.position(10, 510);
  btn.mousePressed(() => {
    const current = state.get('count') || 0;
    state.set('count', current + 1);
  });
};

p.draw = () => {
  p.background(240);

  // Display the counter
  const count = state.get('count') || 0;
  p.fill(0);
  p.textSize(16);
  p.text('count: ' + count, 10, 20);
};`;
