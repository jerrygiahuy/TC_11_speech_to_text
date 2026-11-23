"""Download the pinned official standalone Windows CPU DeepFilterNet3 runtime.

This setup command uses the network; normal enhancement is entirely local.
"""

import argparse
import hashlib
import os
from pathlib import Path
import platform
import tempfile
import urllib.request


VERSION = "0.5.6"
URL = (
    "https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/"
    "deep-filter-0.5.6-x86_64-pc-windows-msvc.exe"
)
SHA256 = "75e11fa16445f560cb6b021521ddb89e89270d13b83089705d98776f58fd7915"
DEFAULT_TARGET = Path(__file__).resolve().parent.parent / "models" / "denoise" / "deep-filter.exe"


def download(target: Path = DEFAULT_TARGET) -> Path:
    if platform.system() != "Windows" or platform.machine().lower() not in {"amd64", "x86_64"}:
        raise RuntimeError("DENOISE_UNSUPPORTED_PLATFORM")
    target = target.resolve()
    if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == SHA256:
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        digest = hashlib.sha256()
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix=".download-", suffix=".tmp", delete=False) as temporary:
            temporary_path = Path(temporary.name)
            with urllib.request.urlopen(URL, timeout=60) as response:
                while block := response.read(1024 * 1024):
                    digest.update(block)
                    temporary.write(block)
        if digest.hexdigest() != SHA256:
            raise RuntimeError("DENOISE_DOWNLOAD_CHECKSUM_MISMATCH")
        os.replace(temporary_path, target)
        return target
    except RuntimeError:
        raise
    except OSError:
        raise RuntimeError("DENOISE_DOWNLOAD_FAILED") from None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    args = parser.parse_args()
    try:
        target = download(args.target)
    except RuntimeError as error:
        parser.exit(1, f"{error}\n")
    print(f"DeepFilterNet3 CPU v{VERSION} ready: {target}")


if __name__ == "__main__":
    main()
