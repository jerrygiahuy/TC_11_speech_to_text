# Timestamped two-speaker STT

User requests local speaker separation while retaining near-real-time output; chunks 5s + 3s from the same speaker must become one continuous turn, including words at the processing boundary. Autonomous implementation/review-later authorization persists.

Approach: use sherpa-onnx pyannote segmentation + NeMo speaker embeddings on a bounded rolling PCM window, map local clusters to two session-level acoustic profiles, decode Zipformer with token timestamps, associate words by time, and revise provisional trailing words rather than blindly appending chunk text. Client groups adjacent same-speaker words into turns. Stable text remains on the client; server retains only bounded audio, profiles and a revision cursor. No identity enrollment, role inference or transcript cloud service.

- [x] Provision and pin official ONNX segmentation/embedding artifacts and upstream multi-speaker smoke audio, keeping licenses and git-ignore.
- [x] Test token-to-word times, same-speaker 5+3 revision, mid-chunk A/B/A, stable IDs when local cluster numbers swap, unknown/overlap handling, isolation/order/expiry and rolling memory bounds.
- [x] Add session API lifecycle (opaque UUID, ordered chunks, retry/idempotency), bounded state, shared model lock, and cleanup. Keep single-file STT functional; add diarized file support.
- [x] Integrate session lifecycle into continuous capture without changing the 5s submission schedule; replace provisional trailing words by timestamps, display speaker turns, preserve gaps on failed chunks and clean up on stop/unmount.
- [x] Run full tests/lint/build, real two-speaker/model smoke, live API and browser checks; document estimated timing, provisional correction and limitations for short/overlapping/noisy speech.

Constraints: no promise of perfect speaker/word alignment; neutral person 1/2 labels, unknown/overlap explicit. Session audio remains RAM only and expires. Maximum two confident speaker profiles; uncertain additional voices stay unassigned. Medical accuracy and Vietnamese speaker accuracy require real evaluation.

Verification: 49 Python +15 TS tests passed. Native Vietnamese 5+3 produces exactly one-pass8s transcript and speaker1; acoustic A/B/A yields1/2/1. Live Next session API5+3 and browser17.54s upload show expected joined turns. Review findings for timestamp-cutoff loss/duplication and collapsed unknown overlap were reproduced and fixed using bounded text/time alignment and local acoustic cluster IDs. Build passed after clearing verified project-local Turbopack build cache. Dev server restarted to replace stale HMR exports before successful API checks.
