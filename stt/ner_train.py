"""Fine-tune PhoBERT trên PhoNER_COVID19 (bản theo từ) cho lớp NER che PII, xuất ONNX int8.

Chạy trong .venv-ner-train (có torch), không phải .venv-stt:

    npm run ner:train -- --probe-steps 50      # đo thời gian dự kiến rồi thoát
    npm run ner:train                          # huấn luyện thật (1–4 giờ, cắm sạc, ~4 GB RAM trống)
    npm run ner:train -- --resume              # chạy tiếp từ checkpoint gần nhất

Dữ liệu và trọng số chỉ nằm trong models/ner/ (gitignore), không phát hành ra ngoài (giấy phép PhoNER).
Phần chuẩn bị dữ liệu không cần torch để test được trong .venv-stt.
"""
import argparse
import datetime
import hashlib
import json
import os
import sys
import time
from pathlib import Path
from typing import Callable

from stt.ner_text import bio_spans, load_ho_viet, relabel_full_names, resegment, stt_style

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KEPT = {'NAME', 'LOCATION', 'ORGANIZATION', 'PATIENT_ID'}
THRESHOLDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]


# ---------- Chuẩn bị dữ liệu (không cần torch) ----------

def build_examples(rows: list[dict], ho: set[str], segment: Callable[[str], list[str]] | None) -> tuple[list[dict], list[dict]]:
    """Trả (bản gốc đã gắn lại NAME, bản kiểu STT: viết thường, bỏ dấu câu, tách từ lại như lúc chạy)."""
    goc, stt = [], []
    for row in rows:
        tags = relabel_full_names(row['words'], row['tags'], ho)
        goc.append({'words': row['words'], 'tags': tags})
        words, stt_tags = stt_style(row['words'], tags)
        again = resegment(words, stt_tags, segment) if segment and words else None
        if again:
            words, stt_tags = again
        if words:
            stt.append({'words': words, 'tags': stt_tags})
    return goc, stt


def collect_labels(examples: list[dict]) -> list[str]:
    seen = []
    for example in examples:
        for tag in example['tags']:
            if tag not in seen:
                seen.append(tag)
    return ['O'] + [t for t in seen if t != 'O']


def word_pieces(words: list[str], label_ids: list[int], encode: Callable[[str], list[int]], bos: int, eos: int,
                max_len: int) -> tuple[list[int], list[int], list[int]]:
    """Ghép subword: chỉ subword đầu của mỗi từ mang nhãn, còn lại -100. Cắt khi vượt max_len. Trả thêm vị trí subword đầu."""
    ids, labels, first = [bos], [-100], []
    for word, label in zip(words, label_ids):
        pieces = encode(word)
        if len(ids) + len(pieces) + 1 > max_len:
            break
        first.append(len(ids))
        ids += pieces
        labels += [label] + [-100] * (len(pieces) - 1)
    return ids + [eos], labels + [-100], first


def _kept(spans):
    return {(s, e, k) for s, e, k, *_ in spans if k in KEPT}


def entity_pr(gold: list[list[tuple]], pred: list[list[tuple]], threshold: float) -> tuple[float, float]:
    """Precision/recall theo thực thể, chỉ tính 4 loại được dùng; đoạn dự đoán có điểm < ngưỡng bị bỏ."""
    tp = n_pred = n_gold = 0
    for g, p in zip(gold, pred):
        gs = _kept(g)
        ps = _kept([x for x in p if x[3] >= threshold])
        tp += len(gs & ps)
        n_pred += len(ps)
        n_gold += len(gs)
    return (tp / n_pred if n_pred else 1.0), (tp / n_gold if n_gold else 1.0)


def pick_threshold(gold, pred, min_precision: float = 0.85) -> float:
    for threshold in THRESHOLDS:
        if entity_pr(gold, pred, threshold)[0] >= min_precision:
            return threshold
    return 0.5


# ---------- Huấn luyện (cần torch) ----------

def _read(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def _giu_may_thuc() -> None:
    """Windows: không cho máy tự ngủ khi đang huấn luyện (SetThreadExecutionState). Không đổi cài đặt nguồn;
    tự hết khi tiến trình kết thúc. Gập nắp hay chọn Sleep thì máy vẫn ngủ."""
    if sys.platform == 'win32':
        import ctypes
        ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)


def main(argv: list[str] | None = None) -> None:
    from stt.download_phoner import data_dir
    parser = argparse.ArgumentParser(description='Fine-tune PhoBERT trên PhoNER_COVID19.')
    parser.add_argument('--base-model', default='vinai/phobert-base')
    parser.add_argument('--epochs', type=float, default=5)
    parser.add_argument('--batch', type=int, default=16)
    parser.add_argument('--lr', type=float, default=5e-5)
    parser.add_argument('--max-len', type=int, default=256)
    parser.add_argument('--stride', type=int, default=64)
    parser.add_argument('--probe-steps', type=int, default=0)
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--max-train', type=int, default=0)
    parser.add_argument('--max-eval', type=int, default=0)
    parser.add_argument('--no-resegment', action='store_true')
    parser.add_argument('--out', type=Path, default=PROJECT_ROOT / 'models' / 'ner' / 'phobert-phoner')
    args = parser.parse_args(argv)
    _giu_may_thuc()

    import numpy as np
    import torch
    from huggingface_hub import hf_hub_download
    from seqeval.metrics import f1_score
    from tokenizers import Tokenizer
    from transformers import AutoModelForTokenClassification, Trainer, TrainingArguments

    torch.set_num_threads(os.cpu_count() or 4)
    data = data_dir()
    ho = load_ho_viet()
    segment = None
    if not args.no_resegment:
        from stt.ner_segment import download, make_segmenter
        download()
        segment = make_segmenter()
    rows = {name: _read(data / f'{name}_word.json') for name in ('train', 'dev', 'test')}
    if args.max_train:
        rows['train'] = rows['train'][:args.max_train]
    if args.max_eval:
        rows['dev'], rows['test'] = rows['dev'][:args.max_eval], rows['test'][:args.max_eval]
    train_goc, train_stt = build_examples(rows['train'], ho, segment)
    dev_goc, dev_stt = build_examples(rows['dev'], ho, segment)
    test_goc, test_stt = build_examples(rows['test'], ho, segment)
    labels = collect_labels(train_goc + train_stt + dev_goc + test_goc)
    label_id = {label: i for i, label in enumerate(labels)}

    tokenizer_file = hf_hub_download(args.base_model, 'tokenizer.json')
    tokenizer = Tokenizer.from_file(tokenizer_file)
    bos, eos, pad, unk = (tokenizer.token_to_id(t) for t in ('<s>', '</s>', '<pad>', '<unk>'))
    # tokenizer.json của vinai/phobert-base có 66.119 token, mô hình chỉ có vocab_size (64.001): id vượt thì là <unk>.
    # Đã đối chiếu: sau khi đổi, khớp PhobertTokenizer gốc (vocab.txt + bpe.codes) trên mọi từ của PhoNER_COVID19.
    from transformers import AutoConfig
    vocab_size = AutoConfig.from_pretrained(args.base_model).vocab_size
    cache: dict[str, list[int]] = {}

    def encode(word: str) -> list[int]:
        if word not in cache:
            ids = tokenizer.encode(word, add_special_tokens=False).ids or [unk]
            cache[word] = [i if i < vocab_size else unk for i in ids]
        return cache[word]

    def to_features(examples):
        out = []
        for example in examples:
            ids, word_labels, first = word_pieces(example['words'], [label_id.get(t, 0) for t in example['tags']],
                                                  encode, bos, eos, args.max_len)
            out.append({'input_ids': ids, 'labels': word_labels, 'first': first, 'tags': example['tags'][:len(first)]})
        return out

    class Features(torch.utils.data.Dataset):
        def __init__(self, items):
            self.items = items
        def __len__(self):
            return len(self.items)
        def __getitem__(self, i):
            return {'input_ids': self.items[i]['input_ids'], 'labels': self.items[i]['labels']}

    def collate(batch):
        width = max(len(b['input_ids']) for b in batch)
        ids = torch.full((len(batch), width), pad, dtype=torch.long)
        lab = torch.full((len(batch), width), -100, dtype=torch.long)
        mask = torch.zeros((len(batch), width), dtype=torch.long)
        for i, b in enumerate(batch):
            n = len(b['input_ids'])
            ids[i, :n] = torch.tensor(b['input_ids'])
            lab[i, :n] = torch.tensor(b['labels'])
            mask[i, :n] = 1
        return {'input_ids': ids, 'attention_mask': mask, 'labels': lab}

    feats = {'train': to_features(train_goc + train_stt), 'goc': to_features(dev_goc), 'stt': to_features(dev_stt)}

    def compute_metrics(prediction):
        logits, gold = prediction
        best = np.argmax(logits, axis=-1)
        y_true, y_pred = [], []
        for row_pred, row_gold in zip(best, gold):
            keep = row_gold != -100
            y_true.append([labels[i] for i in row_gold[keep]])
            y_pred.append([labels[i] for i in row_pred[keep]])
        return {'f1': f1_score(y_true, y_pred)}

    model = AutoModelForTokenClassification.from_pretrained(
        args.base_model, num_labels=len(labels), id2label=dict(enumerate(labels)), label2id=label_id)
    checkpoints = args.out.parent / 'checkpoints'
    steps_per_epoch = -(-len(feats['train']) // args.batch)
    training = TrainingArguments(
        output_dir=str(checkpoints), per_device_train_batch_size=args.batch, per_device_eval_batch_size=32,
        learning_rate=args.lr, num_train_epochs=args.epochs, weight_decay=0.01, warmup_steps=0.1,
        eval_strategy='no' if args.probe_steps else 'epoch', save_strategy='no' if args.probe_steps else 'epoch',
        save_total_limit=2, load_best_model_at_end=not args.probe_steps, metric_for_best_model='eval_stt_f1',
        greater_is_better=True, logging_steps=50, report_to=[], dataloader_num_workers=0, use_cpu=True,
        max_steps=args.probe_steps or -1, remove_unused_columns=False)
    trainer = Trainer(model=model, args=training, train_dataset=Features(feats['train']),
                      eval_dataset={'goc': Features(feats['goc']), 'stt': Features(feats['stt'])},
                      data_collator=collate, compute_metrics=compute_metrics)
    started = time.time()
    resume = args.resume and checkpoints.is_dir() and any(checkpoints.glob('checkpoint-*'))
    trainer.train(resume_from_checkpoint=True if resume else None)
    if args.probe_steps:
        per_step = (time.time() - started) / args.probe_steps
        total = per_step * steps_per_epoch * args.epochs
        print(f'{per_step:.2f} giây/bước, {steps_per_epoch} bước/epoch, {args.epochs:g} epoch '
              f'→ dự kiến {total / 3600:.1f} giờ (chưa tính thời gian đánh giá mỗi epoch).')
        return

    # Dự đoán theo từ để chọn ngưỡng (dev-stt) và báo F1 (test gốc, test-stt).
    model = trainer.model.eval()

    def predict(items):
        gold, pred = [], []
        for start in range(0, len(items), 32):
            chunk = items[start:start + 32]
            batch = collate([{'input_ids': c['input_ids'], 'labels': c['labels']} for c in chunk])
            with torch.no_grad():
                probs = torch.softmax(model(input_ids=batch['input_ids'], attention_mask=batch['attention_mask']).logits, -1)
            for c, p in zip(chunk, probs):
                word_probs = p[c['first']]
                score, best = word_probs.max(-1)
                tags = [labels[i] for i in best.tolist()]
                gold.append(bio_spans(c['tags'], [1.0] * len(c['tags'])))
                pred.append(bio_spans(tags, score.tolist()))
        return gold, pred

    threshold = pick_threshold(*predict(feats['stt']))
    test_feats = {'test': to_features(test_goc), 'test_stt': to_features(test_stt)}
    f1 = {}
    for name, items in test_feats.items():
        precision, recall = entity_pr(*predict(items), threshold)
        f1[name] = round(2 * precision * recall / (precision + recall), 4) if precision + recall else 0.0

    args.out.mkdir(parents=True, exist_ok=True)
    fp32 = args.out / 'model.fp32.onnx'
    int8 = args.out / 'model.int8.onnx'
    sample = collate([feats['goc'][0]])
    torch.onnx.export(model, (sample['input_ids'], sample['attention_mask']), str(fp32),
                      input_names=['input_ids', 'attention_mask'], output_names=['logits'], opset_version=17,
                      dynamic_axes={'input_ids': {0: 'batch', 1: 'seq'}, 'attention_mask': {0: 'batch', 1: 'seq'},
                                    'logits': {0: 'batch', 1: 'seq'}}, dynamo=False)
    from onnxruntime.quantization import QuantType, quantize_dynamic
    quantize_dynamic(str(fp32), str(int8), weight_type=QuantType.QInt8)
    fp32.unlink()
    (args.out / 'tokenizer.json').write_bytes(Path(tokenizer_file).read_bytes())
    (args.out / 'labels.json').write_text(json.dumps(labels, ensure_ascii=False), encoding='utf-8')
    precision_dev = entity_pr(*predict(feats['stt']), threshold)[0]
    nguon = json.loads((data / 'nguon.json').read_text(encoding='utf-8'))
    meta = {'base_model': args.base_model, 'data_commit': nguon['commit'],
            'trained_at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
            'model_sha256': hashlib.sha256(int8.read_bytes()).hexdigest(), 'max_len': args.max_len, 'vocab_size': vocab_size,
            'stride': args.stride, 'nguong': threshold, 'f1': {'test': f1['test'], 'test_stt': f1['test_stt']},
            'precision_at_nguong_dev_stt': round(precision_dev, 4), 'loai_dung': sorted(KEPT),
            'ghi_chu': 'F1 theo thực thể, chỉ 4 loại được dùng, nhãn NAME đã gắn lại cho tên đầy đủ; tính bằng mô hình fp32.',
            'thoi_gian_giay': round(time.time() - started)}
    (args.out / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
