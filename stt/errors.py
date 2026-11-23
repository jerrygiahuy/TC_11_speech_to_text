class VoiceError(Exception):
    def __init__(self, reason_code: str):
        self.reason_code = reason_code
        super().__init__(reason_code)


class VoiceAudioValidationError(VoiceError):
    pass


class VoicePayloadTooLargeError(VoiceAudioValidationError):
    pass


class VoiceNoSpeechError(VoiceError):
    def __init__(self, reason_code: str = "NO_SPEECH_DETECTED"):
        super().__init__(reason_code)
