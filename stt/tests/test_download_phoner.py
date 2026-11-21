import json

import pytest

from stt import download_phoner
from stt.download_phoner import main


def test_refuses_without_license_flag(tmp_path, capsys):
    with pytest.raises(SystemExit) as e:
        main(['--dir', str(tmp_path)])
    assert e.value.code == 2
    out = capsys.readouterr().out
    assert 'nghiên cứu hoặc giáo dục' in out and 'không phân phối lại' in out
    assert list(tmp_path.iterdir()) == []


def test_rejects_checksum_mismatch(tmp_path, monkeypatch):
    monkeypatch.setattr(download_phoner, 'fetch', lambda url: b'sai')
    with pytest.raises(RuntimeError, match='checksum'):
        main(['--dir', str(tmp_path), '--dong-y-giay-phep'])
    assert not any(p.suffix == '.json' for p in tmp_path.iterdir())


def test_writes_files_and_provenance(tmp_path, monkeypatch):
    fake = {name: name.encode() for name in download_phoner.FILES}
    monkeypatch.setattr(download_phoner, 'FILES', {name: download_phoner.sha256(data) for name, data in fake.items()})
    monkeypatch.setattr(download_phoner, 'fetch', lambda url: fake[url.rsplit('/', 1)[1]])
    main(['--dir', str(tmp_path), '--dong-y-giay-phep'])
    assert sorted(p.name for p in tmp_path.iterdir()) == ['dev_word.json', 'nguon.json', 'test_word.json', 'train_word.json']
    nguon = json.loads((tmp_path / 'nguon.json').read_text(encoding='utf-8'))
    assert nguon['commit'] == download_phoner.COMMIT and set(nguon['sha256']) == set(fake)
