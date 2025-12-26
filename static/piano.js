/**
  Copyright 2012 Michael Morris-Pearce

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

(function () {
  "use strict";
  /* Piano keyboard pitches. Names match sound files by ID attribute. */

  const keys = [
    "A2",
    "Bb2",
    "B2",
    "C3",
    "Db3",
    "D3",
    "Eb3",
    "E3",
    "F3",
    "Gb3",
    "G3",
    "Ab3",
    "A3",
    "Bb3",
    "B3",
    "C4",
    "Db4",
    "D4",
    "Eb4",
    "E4",
    "F4",
    "Gb4",
    "G4",
    "Ab4",
    "A4",
    "Bb4",
    "B4",
    "C5",
  ];

  const notes = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];

  /* Corresponding keyboard keycodes, in order w/ 'keys'. */
  /* QWERTY layout:
  /*   upper register: Q -> P, with 1-0 as black keys. */
  /*   lower register: Z -> M, , with A-L as black keys. */

  const codes = [
    90,
    83,
    88,
    67,
    70,
    86,
    71,
    66,
    78,
    74,
    77,
    75,
    81,
    50,
    87,
    69,
    52,
    82,
    53,
    84,
    89,
    55,
    85,
    56,
    73,
    57,
    79,
    80,
  ];

  // generate melody in middle octave
  const melodyCodes = [49, 50, 51, 52, 53, 54, 55, 56, 57, 48];

  const pedal = 32; /* Keycode for sustain pedal. */
  const tonic = "A2"; /* Lowest pitch. */

  /* Piano state. */

  const state = {
    intervals: {},
    depressed: {},
    sustaining: false,
    melody: null,
    key: null,
    type: null,
    melodyTimer: null,
    notePools: {},
    notePoolIndex: {},
    activeAudio: {},
  };

  /* Selectors */

  function pianoClass(name) {
    return ".piano-" + name;
  }

  function soundId(id) {
    return "sound-" + id;
  }

  function sound(id) {
    const it = document.getElementById(soundId(id));
    return it;
  }

  function getNoteVoice(id) {
    const base = sound(id);
    if (!base) {
      return null;
    }

    if (!state.notePools[id]) {
      const pool = [base];
      for (let i = 0; i < 2; i += 1) {
        const clone = base.cloneNode(true);
        clone.removeAttribute("id");
        pool.push(clone);
      }
      state.notePools[id] = pool;
      state.notePoolIndex[id] = 0;
    }

    const pool = state.notePools[id];
    const index = state.notePoolIndex[id];
    state.notePoolIndex[id] = (index + 1) % pool.length;
    return pool[index];
  }

  function playAudioForKey(key) {
    const audio = getNoteVoice(key);
    if (!audio) {
      return null;
    }

    audio.pause();
    audio.volume = 1.0;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
    state.activeAudio[key] = audio;
    return audio;
  }

  /* Virtual piano keyboard events. */

  function keyup(code) {
    const offset = codes.indexOf(code);
    let k;
    if (offset >= 0) {
      k = keys.indexOf(tonic) + offset;
      return keys[k];
    }
    return null;
  }

  function keydown(code) {
    return keyup(code);
  }

  function playNote(key) {
    const audio = playAudioForKey(key);
    $(pianoClass(key)).animate({
      "backgroundColor": "#88FFAA",
    }, 0);
    return audio;
  }

  function press(key) {
    if (state.depressed[key]) {
      return;
    }
    state.depressed[key] = true;
    clearInterval(state.intervals[key]);
    playNote(key);
  }

  function getActiveAudio(key) {
    return state.activeAudio[key] || sound(key);
  }

  /* Manually diminish the volume when the key is not sustained. */
  /* These values are hand-selected for a pleasant fade-out quality. */

  function fade(key) {
    const audio = getActiveAudio(key);
    const stepfade = function () {
      if (audio) {
        if (audio.volume < 0.03) {
          kill(key)();
        } else {
          if (audio.volume > 0.2) {
            audio.volume = audio.volume * 0.95;
          } else {
            audio.volume = audio.volume - 0.01;
          }
        }
      }
    };
    return function () {
      clearInterval(state.intervals[key]);
      state.intervals[key] = setInterval(stepfade, 5);
    };
  }

  /* Bring a key to an immediate halt. */

  function kill(key) {
    const audio = getActiveAudio(key);
    return function () {
      clearInterval(state.intervals[key]);
      if (audio) {
        audio.pause();
      }
      if (key.length > 2) {
        $(pianoClass(key)).animate(
          {
            "backgroundColor": "black",
          },
          300,
          "easeOutExpo",
        );
      } else {
        $(pianoClass(key)).animate(
          {
            "backgroundColor": "white",
          },
          300,
          "easeOutExpo",
        );
      }
    };
  }

  /* Simulate a gentle release, as opposed to hard stop. */

  const fadeout = true;

  /* Sustain pedal, toggled by user. */

  /* Register mouse event callbacks. */

  keys.forEach(function (key) {
    $(pianoClass(key)).mousedown(function () {
      $(pianoClass(key)).animate({
        "backgroundColor": "#88FFAA",
      }, 0);
      press(key);
    });
    if (fadeout) {
      $(pianoClass(key)).mouseup(function () {
        state.depressed[key] = false;
        if (!state.sustaining) {
          fade(key)();
        }
      });
    } else {
      $(pianoClass(key)).mouseup(function () {
        state.depressed[key] = false;
        if (!state.sustaining) {
          kill(key)();
        }
      });
    }
  });

  /* Register keyboard event callbacks. */

  $(document).keydown(function (event) {
    if (event.which === pedal) {
      state.sustaining = true;
      $(pianoClass("pedal")).addClass("piano-sustain");
    }
    const pressedKey = keydown(event.which);
    if (pressedKey) {
      press(pressedKey);
    }
    if (event.which !== pedal && !pressedKey) {
      const index = melodyCodes.indexOf(event.which);
      if (index !== -1 && state.melody) {
        const note = state.melody[index];
        playMelody([note]);
      }
    }
  });

  $(document).keyup(function (event) {
    if (event.which === pedal) {
      state.sustaining = false;
      $(pianoClass("pedal")).removeClass("piano-sustain");
      Object.keys(state.depressed).forEach(function (key) {
        if (!state.depressed[key]) {
          if (fadeout) {
            fade(key)();
          } else {
            kill(key)();
          }
        }
      });
    }
    const releasedKey = keyup(event.which);
    if (releasedKey) {
      state.depressed[releasedKey] = false;
      if (!state.sustaining) {
        if (fadeout) {
          fade(releasedKey)();
        } else {
          kill(releasedKey)();
        }
      }
    }
  });

  $("#new-melody-button").click(function () {
    let key = $("#keys option:selected").text();
    if (key == "random") {
      key = notes[getRandomNumber(11)];
    }

    let type = $("#scale option:selected").text();
    if (type == "random") {
      const i = getRandomNumber(100);
      if (i < 50) {
        type = "min";
      } else {
        type = "maj";
      }
    }

    const number = $("#number_of_notes option:selected").text();
    state.key = key;
    state.type = type;
    state.melody = generateMelody(key + "3", type, Number.parseInt(number));
    if ($("#show-key").is(":checked")) {
      printKey(key, type);
    }
    printMelody([]);
    playMelody(state.melody.slice());
  });

  const getRandomNumber = function (max) {
    max = Math.floor(max);
    return Math.floor(Math.random() * max);
  };

  $("#play-melody-button").click(function () {
    if (!state.melody) {
      return;
    }

    playMelody(state.melody.slice());
  });

  $("#play-scale-button").click(function () {
    if (!state.key || !state.type) {
      return;
    }
    // start with octave in the middle, not too high
    const scale = getKeyNotes(state.key + "3", state.type);

    playMelody(scale);
  });

  $("#show-melody").click(function () {
    if (!state.melody || !state.key) {
      return;
    }
    printMelody(state.melody);
    printKey(state.key, state.type);
  });

  const printMelody = function (melody) {
    const text = melody.join(" ");
    $("#notes").text("Notes: " + text);
  };

  const printKey = function (key, type) {
    const text = key + " " + type;
    $("#key").text("Key: " + text);
  };

  const playMelody = function (melody) {
    if (!melody || melody.length === 0) {
      return;
    }

    if (state.melodyTimer) {
      clearTimeout(state.melodyTimer);
      state.melodyTimer = null;
    }

    const noteDurationMs = 800;
    const releaseDelayMs = 650;
    let index = 0;

    const step = function () {
      const note = melody[index];
      playNote(note);
      if (!state.sustaining) {
        setTimeout(function () {
          if (fadeout) {
            fade(note)();
          } else {
            kill(note)();
          }
        }, releaseDelayMs);
      }
      index += 1;
      if (index < melody.length) {
        state.melodyTimer = setTimeout(step, noteDurationMs);
      }
    };

    step();
  };

  const generateMelody = function (key, type, length) {
    const melody_notes = getKeyNotes(key, type);
    const positions = getRandomPositions(length - 1);
    const m = [key];
    positions.forEach((pos) => {
      m.push(melody_notes[pos]);
    });
    $("#play-melody-button").focus();
    return m;
  };

  const getKeyNotes = function (key, type) {
    let scheme = [];
    if (type === "maj") {
      scheme = [2, 2, 1, 2, 2, 2, 1];
    } else if (type === "min") {
      scheme = [2, 1, 2, 2, 1, 2, 2];
    }
    return getNotesByPattern(key, scheme);
  };

  const getNotesByPattern = function (key, pattern) {
    let index = keys.indexOf(key);
    const scale_notes = [key];
    pattern.forEach((step) => {
      index = index + step;
      scale_notes.push(keys[index]);
    });
    return scale_notes;
  };

  const getRandomPositions = function (count) {
    const min = Math.ceil(2);
    const max = Math.floor(7);

    const numbers = [];
    while (numbers.length < count) {
      const i = Math.floor(Math.random() * (max - min) + min);
      if (numbers.indexOf(i) == -1) {
        numbers.push(i);
      }
    }
    return numbers;
  };

  notes.forEach((note) => {
    $("<option>").val(note).text(note).appendTo("#keys");
  });
})();
