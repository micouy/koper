export const COUNTER_BUTTON_EXAMPLE = `p.setup = () => {
  p.createCanvas(500, 500);

  const player = state.getPlayer();

  if (player.get('count') == null) {
    player.set('count', 0);
  }

  if (state.get('totalSum') == null) {
    state.set('totalSum', 0);
  }

  const btn = p.createButton('Increment My Count');
  btn.position(10, 510);
  btn.mousePressed(() => {
    const myCount = player.get('count') || 0;
    const totalSum = state.get('totalSum') || 0;

    player.set('count', myCount + 1);
    state.set('totalSum', totalSum + 1);
  });
};

p.draw = () => {
  p.background(240);
  p.textSize(25);

  const allPlayers = state.getPlayers();
  const totalSum = state.get('totalSum') || 0;
  const playerIds = Object.keys(allPlayers);

  p.fill(0);
  p.text('Total: ' + totalSum, 10, 30);

  if (playerIds[0]) {
    const count1 = allPlayers[playerIds[0]].count || 0;
    p.text('Player 1: ' + count1, 10, 60);
  }

  if (playerIds[1]) {
    const count2 = allPlayers[playerIds[1]].count || 0;
    p.text('Player 2: ' + count2, 10, 90);
  }
};`;
