class AllSpeech:
    def ready(self): return True
    def speech_spans(self, samples): return [(0, len(samples))]
