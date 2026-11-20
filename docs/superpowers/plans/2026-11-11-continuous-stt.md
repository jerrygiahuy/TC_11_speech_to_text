# Continuous clinical STT session

User requests recording until manually ended, plus explanation of terminology and speaker support. Prior authorization remains autonomous, in this checkout, review afterwards.

- [x] Replace capped MediaRecorder recording with continuous AudioWorklet PCM capture adapted from P-018. Segment at silence or 5 seconds without reopening the microphone; keep API/upload limits per segment.
- [x] Test a session beyond 30 seconds, exact PCM preservation, final partial segment, ordered bounded inference, finish while requests remain, and explicit handling of failed segments.
- [x] Append recognized text while recording; show elapsed session time and pending work, stop microphone immediately on finish, drain queued work, retain completed transcript on errors/unmount cleanup.
- [x] Add editable local hotwords JSON and enable decoder biasing without training. Validate configuration and test forwarding to the actual adapter boundary.
- [x] Run tests/lint/build and real-model hotword inference. Document that no speaker diarization or role labels are present.

Design choice: segment WAVs rather than send a whole unlimited recording. This bounds audio RAM and allows incremental results. Use the existing pinned offline model. Speech crossing a forced segment boundary may be less accurate; no claim of streaming token recognition. Session has no time cap, but device sleep, tab close or capture/network failure can interrupt it. No diarization integration in this change.

User steering: requires near-real-time partial results, so use 5-second maximum segments and early submission after ~600ms silence, once at least 1s has accumulated. A fresh streaming model was not introduced. There is no automatic duration cap; queue overload stops capture explicitly and drains retained audio in order.

Verification: 35 Python + 11 TS tests passed, including 75s PCM preservation and actual backlog auto-stop/flush/overflow ordering. Lint and Next build passed. Native pinned model recognized all 3 upstream samples with medical hotwords enabled; this is an integration check, not terminology accuracy evaluation. Independent reviewer found no important defect and requested the backlog test, which was added and passed.
