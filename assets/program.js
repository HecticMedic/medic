// The training program. Plain rules, no AI: each day's session comes from the
// shift rotation, the profile (level, goals, equipment) and what's been done.
//
// Day types:
//   on shift     -> "Between calls": a short, interruptible station workout
//   day after    -> "Post-shift recovery": walk, mobility, sleep reset
//   other days   -> the next session in the rotation, until the week's target
//                   is met, then an optional easy day

const LEVELS = {
  base: { label: 'Getting back into it', target: 3 },
  build: { label: 'Training now and then', target: 4 },
  push: { label: 'Already training regularly', target: 5 },
};

const GOALS = {
  general: 'General fitness and energy on shift',
  weight: 'Lose weight',
  job: 'Job-specific strength (stairs, drags, carries, lifts)',
  cardio: 'Conditioning: work in gear without gassing out',
};

const EQUIPMENT = {
  station: 'Station gym (on shift)',
  gym: 'Commercial gym',
  home: 'Dumbbells, kettlebell or bands at home',
  none: 'Bodyweight only',
  outdoors: 'Outdoors: running, stairs, rucking',
};

// Each movement in three versions: full gym, dumbbell/kettlebell, bodyweight.
const MOVES = {
  squat: { gym: 'Back squat', db: 'Goblet squat', bw: 'Bodyweight squat, 3 seconds down' },
  hinge: { gym: 'Trap-bar deadlift', db: 'Dumbbell Romanian deadlift', bw: 'Single-leg hip bridge' },
  push: { gym: 'Bench press', db: 'Dumbbell bench or floor press', bw: 'Push-ups (hands on a bench if needed)' },
  row: { gym: 'Seated cable row', db: 'One-arm dumbbell row', bw: 'Inverted row under a sturdy table, or band row' },
  lunge: { gym: 'Reverse lunge, barbell or dumbbells', db: 'Dumbbell reverse lunge', bw: 'Reverse lunge' },
  press: { gym: 'Standing overhead press', db: 'Dumbbell overhead press', bw: 'Pike push-up' },
  pull: { gym: 'Pull-ups or lat pulldown', db: 'Chin-ups, or band pulldown', bw: 'Towel door row, or band pulldown' },
  carry: { gym: 'Heavy farmer carry', db: 'Dumbbell farmer carry', bw: 'Loaded backpack or water-jug carry' },
  step: { gym: 'Weighted step-ups (vest or dumbbells)', db: 'Dumbbell step-ups', bw: 'Step-ups on a stair or bench' },
  drag: { gym: 'Sled drag or rope pull', db: 'Towel drag of a loaded bag', bw: 'Bear crawl' },
  plank: { gym: 'Front plank', db: 'Front plank', bw: 'Front plank' },
  deadbug: { gym: 'Dead bug', db: 'Dead bug', bw: 'Dead bug' },
  side: { gym: 'Side plank, each side', db: 'Side plank, each side', bw: 'Side plank, each side' },
  pallof: { gym: 'Cable Pallof press, each side', db: 'Band Pallof press, each side', bw: 'Bird dog, each side' },
};

const DOSE = {
  main: { base: [2, '10 reps'], build: [3, '8 reps'], push: [4, '6 reps'] },
  acc: { base: [2, '10 reps'], build: [3, '10 reps'], push: [3, '12 reps'] },
  core: { base: [2, '20 sec'], build: [3, '30 sec'], push: [3, '45 sec'] },
  carry: { base: [3, '30 m'], build: [4, '40 m'], push: [5, '40 m'] },
};

const MOBILITY = [
  'Couch stretch (hip flexors), 1 min each side',
  'Open book (upper back), 8 each side',
  'World\'s greatest stretch, 5 each side',
  'Calf stretch on a step, 45 sec each side',
  'Child\'s pose with long breaths, 1 min',
];

const SESSION_TYPES = {
  strengthA: { title: 'Strength A: legs and push', emoji: '🏋️', main: true },
  strengthB: { title: 'Strength B: single leg and pull', emoji: '🏋️', main: true },
  engine: { title: 'Engine: intervals', emoji: '🫀', main: true },
  fireground: { title: 'Fireground circuit', emoji: '🔥', main: true },
  station: { title: 'Between calls (20 min)', emoji: '🚒', main: false },
  recovery: { title: 'Post-shift recovery', emoji: '😮‍💨', main: false },
  easy: { title: 'Easy day: walk and mobility', emoji: '🚶', main: false },
};

// Off-day order. Extra conditioning for weight loss or conditioning goals,
// job-specific work up front when that's the goal.
function rotationFor(profile) {
  const goals = new Set(profile.goals || []);
  const order = ['strengthA', 'engine', 'strengthB', 'fireground'];
  if (goals.has('weight') || goals.has('cardio')) order.splice(3, 0, 'engine');
  if (goals.has('job') && !goals.has('weight') && !goals.has('cardio')) {
    return ['strengthA', 'fireground', 'strengthB', 'engine'];
  }
  return order;
}

// Which equipment version to use today.
function tierFor(profile, onShift) {
  const eq = new Set(profile.equipment || []);
  if (onShift) return eq.has('station') ? 'gym' : 'bw';
  if (eq.has('gym')) return 'gym';
  if (eq.has('home')) return 'db';
  return 'bw';
}

function move(key, tier, doseKey, level) {
  const [sets, reps] = DOSE[doseKey][level];
  return { key, name: MOVES[key][tier], sets, reps };
}

function cardioMode(profile, onShift) {
  const eq = new Set(profile.equipment || []);
  if (onShift) return eq.has('station') ? 'treadmill, bike, rower or stair machine' : 'stairs in the station, or a brisk walk';
  if (eq.has('gym')) return 'rower, bike, stair machine or treadmill';
  if (eq.has('outdoors')) return 'run, or hill/stair repeats';
  return 'brisk walk or jog, or stairs';
}

/** Builds a session: { type, title, emoji, intro, blocks: [{ title, items }] }. */
function buildSession(type, profile, { onShift = false } = {}) {
  const level = LEVELS[profile.level] ? profile.level : 'base';
  const tier = tierFor(profile, onShift);
  const t = SESSION_TYPES[type];
  const warmup = { title: 'Warm-up (5 min)', items: [
    { key: 'warm', name: 'Easy cardio, then 10 squats, 10 push-ups, 10 hip hinges', sets: 1, reps: '5 min' },
  ] };
  const out = { type, title: t.title, emoji: t.emoji, intro: '', blocks: [] };

  if (type === 'strengthA') {
    out.intro = 'Pick a weight you could lift 2 more times at the end of each set. Rest 90 sec on the main lifts.';
    out.blocks = [warmup,
      { title: 'Main lifts', items: [move('squat', tier, 'main', level), move('push', tier, 'main', level)] },
      { title: 'Accessories', items: [move('hinge', tier, 'acc', level), move('row', tier, 'acc', level)] },
      { title: 'Core', items: [move('plank', tier, 'core', level), move('deadbug', tier, 'core', level)] }];
  } else if (type === 'strengthB') {
    out.intro = 'Single-leg and pulling work protect your back for patient lifts and stair chairs.';
    out.blocks = [warmup,
      { title: 'Main lifts', items: [move('lunge', tier, 'main', level), move('pull', tier, 'main', level)] },
      { title: 'Accessories', items: [move('press', tier, 'acc', level), move('carry', tier, 'carry', level)] },
      { title: 'Core', items: [move('side', tier, 'core', level), move('pallof', tier, 'core', level)] }];
  } else if (type === 'engine') {
    const plan = {
      base: [10, '1 min brisk or jog, then 2 min easy'],
      build: [8, '1 min hard, then 90 sec easy'],
      push: [6, '3 min hard, then 90 sec easy'],
    }[level];
    out.intro = `Mode: ${cardioMode(profile, onShift)}. "Hard" means you can only say a few words. Finish with 5 min easy.`;
    out.blocks = [warmup,
      { title: 'Intervals', items: [{ key: 'intervals', name: plan[1], sets: plan[0], reps: 'round' }] },
      { title: 'Cool-down', items: [{ key: 'cool', name: 'Easy pace, then stretch calves and hips', sets: 1, reps: '5 min' }] }];
  } else if (type === 'fireground') {
    const rounds = { base: 3, build: 4, push: 5 }[level];
    out.intro = `${rounds} rounds. Work 40 sec on each exercise, move straight to the next, then rest 90 sec between rounds. Smooth beats fast.`;
    out.blocks = [warmup,
      { title: 'Circuit', items: [
        { ...move('step', tier, 'acc', level), sets: rounds, reps: '40 sec' },
        { ...move('drag', tier, 'acc', level), sets: rounds, reps: '40 sec' },
        { ...move('carry', tier, 'acc', level), sets: rounds, reps: '40 sec' },
        { ...move('press', tier, 'acc', level), sets: rounds, reps: '40 sec' },
        { key: 'burpee', name: 'Get-ups: lie down, stand up, repeat', sets: rounds, reps: '40 sec' },
      ] }];
  } else if (type === 'station') {
    const n = { base: [6, 10], build: [10, 15], push: [15, 20] }[level];
    out.intro = 'Every minute on the minute for 20 min. Odd minutes push, even minutes legs. If the tones drop, it still counts.';
    out.blocks = [
      { title: 'EMOM', items: [
        { key: 'emom-push', name: `${n[0]} push-ups`, sets: 10, reps: 'odd min' },
        { key: 'emom-squat', name: `${n[1]} air squats`, sets: 10, reps: 'even min' },
      ] },
      { title: 'Finish', items: [move('plank', 'bw', 'core', level)] }];
  } else if (type === 'recovery') {
    out.intro = 'You\'re running on a short night. Today is about resetting, not training. Hard sessions after a 24 add injury risk for little gain.';
    out.blocks = [
      { title: 'Reset', items: [
        { key: 'walk', name: 'Easy walk outside, in daylight if you can', sets: 1, reps: '20–30 min' },
        { key: 'nap', name: 'Nap 90 min or less, finished by early afternoon', sets: 1, reps: 'optional' },
        { key: 'fuel', name: 'Protein with each meal and 2–3 L of water', sets: 1, reps: 'all day' },
        { key: 'bed', name: 'Normal bedtime tonight, no late caffeine', sets: 1, reps: 'tonight' },
      ] },
      { title: 'Mobility (10 min)', items: MOBILITY.map((name, i) => ({ key: 'mob' + i, name, sets: 1, reps: '' })) }];
  } else if (type === 'easy') {
    out.intro = 'You\'ve hit this week\'s target. Move a little and save it for next week, or train anyway if you feel great.';
    out.blocks = [
      { title: 'Easy', items: [{ key: 'walk', name: 'Walk, easy bike or swim', sets: 1, reps: '30 min' }] },
      { title: 'Mobility (10 min)', items: MOBILITY.map((name, i) => ({ key: 'mob' + i, name, sets: 1, reps: '' })) }];
  }
  return out;
}

// Monday of the week holding `date`.
function weekStartOf(date) {
  return addDays(date, -((parseDate(date).getDay() + 6) % 7));
}

function mainSessionsInWeek(log, date) {
  const start = weekStartOf(date);
  const end = addDays(start, 6);
  return log.filter(s => s.date >= start && s.date <= end && (SESSION_TYPES[s.type]?.main || s.type === 'station')).length;
}

// Main sessions run in a fixed order. Missed days don't skip ahead: the next
// one is whatever comes after the number already completed.
function nextMainType(profile, log) {
  const order = rotationFor(profile);
  const done = log.filter(s => SESSION_TYPES[s.type]?.main).length;
  return order[done % order.length];
}

/**
 * What today calls for. Returns { type, reason, onShift, alternatives }.
 * `shifts` is the rotation (or null), `log` the completed sessions.
 */
function planFor(date, profile, log, shifts) {
  const onShift = shiftStatus(date, shifts) === 'on';
  const postShift = !onShift && shiftStatus(addDays(date, -1), shifts) === 'on' && (shifts?.hours || 24) >= 20;
  const level = LEVELS[profile.level] ? profile.level : 'base';
  const done = mainSessionsInWeek(log, date);
  const target = LEVELS[level].target;
  const next = nextMainType(profile, log);

  if (onShift) return { type: 'station', onShift, reason: 'On shift today', alternatives: [next, 'easy'] };
  if (postShift) return { type: 'recovery', onShift, reason: 'Coming off a shift', alternatives: [next, 'easy'] };
  if (done >= target) return { type: 'easy', onShift, reason: `${done} of ${target} sessions done this week`, alternatives: [next] };
  return { type: next, onShift, reason: `Session ${done + 1} of ${target} this week`, alternatives: ['easy'] };
}

// For testing under Node.
if (typeof module !== 'undefined') module.exports = { LEVELS, GOALS, EQUIPMENT, SESSION_TYPES, rotationFor, buildSession, planFor, nextMainType, mainSessionsInWeek, weekStartOf };
