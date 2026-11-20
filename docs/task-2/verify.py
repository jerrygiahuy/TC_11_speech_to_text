"""Validate design examples locally; this is not the application's runtime validator.

Run: python docs/task-2/verify.py
Requires: jsonschema >= 4 (already available in the research environment).
"""

import copy
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource


BASE = Path(__file__).resolve().parent
SCHEMAS = BASE.parents[1] / "config" / "clinical"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


schema_docs = {path.name: read(path) for path in SCHEMAS.glob("*.json")}
registry = Registry().with_resources(
    ((SCHEMAS / name).as_uri(), Resource.from_contents(schema))
    for name, schema in schema_docs.items()
)


def validator(name):
    schema = copy.deepcopy(schema_docs[name])
    schema["$id"] = (SCHEMAS / name).as_uri()
    return Draft202012Validator(
        schema, registry=registry, format_checker=FormatChecker()
    )


def pointer(document, path):
    value = document
    for part in path.split("/")[1:]:
        key = part.replace("~1", "/").replace("~0", "~")
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    for name, schema in schema_docs.items():
        Draft202012Validator.check_schema(schema)
    files = list((BASE / "examples").glob("*.json"))
    for path in files:
        kind = path.name.split(".")[0]
        if kind.startswith("ai-output"):
            kind = "ai-output"
        elif kind.startswith("transcript"):
            kind = "transcript"
        elif kind.startswith("encounter"):
            kind = "encounter"
        validator(f"{kind}.schema.json").validate(read(path))

    # Reject model attempts to smuggle server-owned or patient identity fields.
    ai = read(BASE / "examples/ai-output.example.json")
    invalid = []
    for key, value in [("patient_id", "real-patient"), ("approved_by", "doctor")]:
        bad = copy.deepcopy(ai)
        bad[key] = value
        invalid.append(bad)
    # Prescription fields are outside tasks 2/3/4, including empty placeholders.
    for key, value in [("don_thuoc", {"items": []}), ("ke_don", [])]:
        bad = copy.deepcopy(ai)
        bad[key] = value
        invalid.append(bad)
    bad = copy.deepcopy(ai)
    bad["phieu_kham"]["don_thuoc"] = {"items": []}
    invalid.append(bad)
    bad = copy.deepcopy(ai)
    bad["phieu_kham"]["di_ung"]["trang_thai"] = "khong_chac_nhung_coi_la_khong"
    invalid.append(bad)
    bad = copy.deepcopy(ai)
    bad["phieu_kham"]["co_thuoc_dang_dung"] = "khong"
    invalid.append(bad)
    bad = copy.deepcopy(ai)
    del bad["phieu_kham"]["benh_su"]
    invalid.append(bad)
    ai_validator = validator("ai-output.schema.json")
    for index, bad in enumerate(invalid):
        require(not ai_validator.is_valid(bad), f"Invalid payload {index} accepted")

    # Evidence points to existing fields and exact input segments in each example.
    for suffix in ["", "-unknown-speaker", "-service"]:
        output = read(BASE / f"examples/ai-output{suffix}.example.json")
        transcript = read(BASE / f"examples/transcript{suffix}.example.json")
        serialized = json.dumps(output, ensure_ascii=False).casefold()
        for excluded in ["thuốc mẫu a", "thuốc mẫu c", '"don_thuoc"', '"phac_do"']:
            require(excluded not in serialized, f"Prescription leaked into AI example: {excluded}")
        segments = {item["id"]: item for item in transcript["segments"]}
        for evidence in output["bang_chung"]:
            pointer(output, evidence["field_path"])
            text = " ".join(segments[s]["text"] for s in evidence["segment_ids"])
            normalize = lambda value: " ".join(value.casefold().split())
            require(
                normalize(evidence["trich_doan"]) in normalize(text),
                f"Evidence quote missing: {evidence['field_path']}",
            )
            require(
                all(segments[s]["vai_tro"] == evidence["vai_tro"] for s in evidence["segment_ids"]),
                f"Evidence role mismatch: {evidence['field_path']}",
            )
        for issue in output["can_xem_lai"]:
            pointer(output, issue["field_path"])
            require(all(s in segments for s in issue["segment_ids"]), "Unknown segment")

    encounter = read(BASE / "examples/encounter.example.json")
    run_ids = {run["id"] for run in encounter["ai_runs"]}
    for source in encounter["nguon_du_lieu"]:
        pointer(encounter, source["field_path"])
        require(source["ai_run_id"] in run_ids, "Missing AI run")
        for index in source["evidence_indexes"]:
            require(0 <= index < len(ai["bang_chung"]), "Missing evidence index")
    require("chan_doan" not in encounter["phieu_kham"], "Duplicated canonical diagnoses")
    require(encounter["audit"]["approved_by"] is None, "Example must remain unapproved")
    require("don_thuoc" not in ai and "don_thuoc" not in encounter, "Prescription out of scope")
    bad_encounter = copy.deepcopy(encounter)
    bad_encounter["don_thuoc"] = {"items": []}
    require(not validator("encounter.schema.json").is_valid(bad_encounter), "Storage accepted prescription")
    for value in [0, -1.5]:
        quantity_schema = {"$ref": (SCHEMAS / "common.schema.json").as_uri() + "#/$defs/quantity"}
        Draft202012Validator(quantity_schema, registry=registry).validate({"value": value, "unit": "example"})
    service_encounter = read(BASE / "examples/encounter-service.example.json")
    group_ids = {group["id"] for group in service_encounter["chi_dinh"]["groups"]}
    for order in service_encounter["chi_dinh"]["items"]:
        require(order["group_id"] in group_ids, "Missing service group")
    require(service_encounter["chi_dinh"]["items"][0]["danh_muc"]["code"] is None, "No invented service code")
    for document in [encounter, service_encounter]:
        runs = {run["id"]: run for run in document["ai_runs"]}
        for source in document["nguon_du_lieu"]:
            pointer(document, source["field_path"])
            run = runs[source["ai_run_id"]]
            artifact = read(BASE / "examples" / run["output_artifact_id"])
            for index in source["evidence_indexes"]:
                require(0 <= index < len(artifact["bang_chung"]), "Missing artifact evidence")
    # Medication history and allergies remain part of the clinical note.
    history = copy.deepcopy(ai)
    history["phieu_kham"].update(co_thuoc_dang_dung=True, thuoc_dang_dung=[
        {"ten": "Thuoc da dung", "ham_luong": None, "cach_dung": None, "trang_thai": "dang_dung"}
    ])
    ai_validator.validate(history)
    print(f"PASS: {len(schema_docs)} schemas, {len(files)} examples, {len(invalid) + 1} rejection cases; evidence, references and prescription exclusion checked.")
    print("Scope: design validation only; no runtime privacy filter, model accuracy or clinical validation is exercised.")


if __name__ == "__main__":
    main()
