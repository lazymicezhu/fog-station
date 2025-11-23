// 简单的游戏时间系统，支持订阅 tick 与跨天事件。
export function createTimeSystem({ onTick, onDayChange } = {}) {
  const gameTime = { day: 1, minutes: 0 }; // 1 秒现实 = 2 分钟游戏
  let timer = null;

  const pad = num => num.toString().padStart(2, "0");

  function format({ day, minutes } = gameTime) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `第 ${day} 天 · ${pad(hours)}:${pad(mins)}`;
  }

  function emitTick() {
    if (onTick) onTick({ ...gameTime });
  }

  function emitDayChange() {
    if (onDayChange) onDayChange({ ...gameTime });
  }

  function advance(minutes = 1) {
    gameTime.minutes += minutes;
    let dayChanged = false;
    while (gameTime.minutes >= 1440) {
      gameTime.minutes -= 1440;
      gameTime.day += 1;
      dayChanged = true;
    }
    emitTick();
    if (dayChanged) emitDayChange();
  }

  function nextDay() {
    gameTime.day += 1;
    gameTime.minutes = 0;
    emitTick();
    emitDayChange();
  }

  function start() {
    stop();
    emitTick();
    timer = setInterval(() => advance(2), 1000);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function getTime() {
    return { ...gameTime };
  }

  return {
    start,
    stop,
    advance,
    nextDay,
    getTime,
    format: () => format()
  };
}
