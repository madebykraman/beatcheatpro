// BeatCheat Pro — deterministic, non-destructive cut planning.
// This module produces a cut plan only. Premiere mutations belong in main.js
// after explicit user confirmation and after target-track validation.

const {buildCutPlan} = require("./events.js");

function buildTimelineCutPlan(events, mapping, options = {}) {
  const sequenceEvents = events.map(event => ({
    ...event,
    sequenceTime: mapping
      ? mapping.sequenceStartSeconds +
        (event.time - mapping.sourceInSeconds) / mapping.speed
      : event.time
  }));

  const plan = buildCutPlan(
    sequenceEvents.map(event => ({
      ...event,
      time: event.sequenceTime
    })),
    options
  );

  return plan.map(item => ({
    ...item,
    sourceTime: events.find(e => Math.abs(e.time - (
      mapping
        ? mapping.sourceInSeconds +
          (item.time - mapping.sequenceStartSeconds) * mapping.speed
        : item.time
    )) < 1e-6)?.time ?? null,
    sequenceTime: item.time
  }));
}

function buildSegments(cutPlan, clipStartSeconds, clipEndSeconds) {
  if (!Number.isFinite(clipStartSeconds) ||
      !Number.isFinite(clipEndSeconds) ||
      clipEndSeconds <= clipStartSeconds) {
    return [];
  }

  const cuts = [...new Set(
    cutPlan
      .map(item => item.sequenceTime)
      .filter(time =>
        Number.isFinite(time) &&
        time > clipStartSeconds &&
        time < clipEndSeconds
      )
  )].sort((a, b) => a - b);

  const boundaries = [clipStartSeconds, ...cuts, clipEndSeconds];
  const segments = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    segments.push({
      index: i,
      start: boundaries[i],
      end: boundaries[i + 1],
      duration: boundaries[i + 1] - boundaries[i],
      cutAtStart: i > 0,
      cutAtEnd: i < boundaries.length - 2
    });
  }

  return segments;
}

module.exports = {buildTimelineCutPlan, buildSegments};
