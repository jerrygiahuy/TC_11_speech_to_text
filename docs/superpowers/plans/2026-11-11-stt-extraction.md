# STT extraction implementation plan

**Goal:** Extract only the Vietnamese Zipformer STT path from local P-018 into this checkout and leave a runnable local experiment.

**Architecture:** Keep the original CPU sherpa-onnx adapter and canonical WAV validation. Replace P-018 application contracts, artifact registry and command hotwords with small STT-only modules. Add a loopback FastAPI service and a Next.js `/stt` experiment screen, proxying audio through the existing Next server.

**Scope authority:** User explicitly requested autonomous implementation in the current folder and review afterwards. Work in this checkout, preserve existing features, skip approval questions and separate worktrees. No source folder changes, commits, deployments, or unrelated P-018 features.

**Tech stack:** Existing Next/React/TypeScript; Python 3.12+, FastAPI, numpy, soundfile, sherpa-onnx, sentencepiece, huggingface-hub. No torch, TTS, LLM, vehicle or messaging dependencies.

## Tasks

- [x] Extract adapter/audio utilities and source license; add isolated result/error/model constants and empty default hotwords. Test WAV validation, transcription normalization and caller-supplied hotwords.
- [x] Add bounded raw-WAV API, health endpoint, pinned model downloader and CLI smoke test. Test malformed/oversized/silent audio, missing model, no speech and successful inference responses.
- [x] Read installed Next.js guides, clone frontend audio canonicalization and add microphone/file experiment UI plus same-origin API proxy. Test WAV encoding/conversion and proxy failures; lint, typecheck, build.
- [x] Add Windows setup/start scripts, provenance and Vietnamese run instructions. Download only pinned STT artifacts, run real model/sample inference, verify browser and API integration.

## Review focus

Microphone permission/cleanup; double start/stop and unmount; stereo or non-16kHz uploads; bounded recording/upload size; backend unavailable/model absent; silence and concurrent inference. No automatic browser speech recognition fallback.

## Execution ledger

- Source contains code and pinned manifest, but no STT weights. Original model: `csukuangfj/sherpa-onnx-zipformer-vi-int8-2025-04-20`, revision `b2745a435379992ad3f299635468db0c34918e1e`.
- Existing app microphone uses browser Web Speech API; the separate experiment will explicitly use local Zipformer.
- Environment setup: initial Python ensurepip failed due sandbox temporary-directory access. Retrying with workspace-local temp; npm install requires network-enabled execution.
- Completed 28 Python and 4 TypeScript tests; lint/build and existing mock eval passed. Model inference succeeded on all three upstream WAVs; real browser upload through both services produced the expected text.
- Ruling: keep source Web Speech microphone intact and provide `/stt` for this experiment, because user requested isolated STT testing and no unrelated feature changes.
- Ruling: use a pinned Python requirements lock for repeatable Windows setup; preserve broad source requirements separately for maintenance.
- Independent review found no critical/important defects; requested README STT instructions were added. Physical microphone capture remains for the user to try; file recognition was verified end-to-end.
