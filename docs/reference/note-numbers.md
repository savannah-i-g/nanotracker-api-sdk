# Note numbers

nanoTracker uses tracker note numbers in pattern cells. They map to
MIDI notes by a constant offset.

## Formula

```
tracker_note = midi_note - 11
midi_note    = tracker_note + 11
```

- tracker 1   = C-0  = MIDI 12  =  16.35 Hz
- tracker 49  = C-4  = MIDI 60  = 261.63 Hz   (middle C)
- tracker 96  = B-7  = MIDI 107 = 3951.07 Hz
- tracker 97  = NOTE OFF (special — kills the channel)
- tracker 0   = empty cell

## Octave table

| Octave | C   | C#  | D   | D#  | E   | F   | F#  | G   | G#  | A   | A#  | B   |
|--------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 0      |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |  9  | 10  | 11  | 12  |
| 1      | 13  | 14  | 15  | 16  | 17  | 18  | 19  | 20  | 21  | 22  | 23  | 24  |
| 2      | 25  | 26  | 27  | 28  | 29  | 30  | 31  | 32  | 33  | 34  | 35  | 36  |
| 3      | 37  | 38  | 39  | 40  | 41  | 42  | 43  | 44  | 45  | 46  | 47  | 48  |
| 4      | 49  | 50  | 51  | 52  | 53  | 54  | 55  | 56  | 57  | 58  | 59  | 60  |
| 5      | 61  | 62  | 63  | 64  | 65  | 66  | 67  | 68  | 69  | 70  | 71  | 72  |
| 6      | 73  | 74  | 75  | 76  | 77  | 78  | 79  | 80  | 81  | 82  | 83  | 84  |
| 7      | 85  | 86  | 87  | 88  | 89  | 90  | 91  | 92  | 93  | 94  | 95  | 96  |

## Common drum mappings

When kicked off the standard GM drum kit (MIDI ch10), use:

| Drum             | MIDI | Tracker |
|------------------|------|---------|
| Acoustic Bass    |  35  |  24     |
| Bass Drum 1      |  36  |  25     |
| Side Stick       |  37  |  26     |
| Acoustic Snare   |  38  |  27     |
| Hand Clap        |  39  |  28     |
| Electric Snare   |  40  |  29     |
| Closed Hi-Hat    |  42  |  31     |
| Open Hi-Hat      |  46  |  35     |
| Crash Cymbal 1   |  49  |  38     |
| Ride Cymbal 1    |  51  |  40     |

These only matter if the sample's `baseNote` is left at the default 60 —
otherwise the tracker note triggers the sample at its natural pitch.

## Sequence-layer (piano roll) pitches

The `SequenceNote.pitch` field uses **MIDI** numbering directly
(0..127) — not tracker numbering. Same number space as anywhere else
in MIDI land.
